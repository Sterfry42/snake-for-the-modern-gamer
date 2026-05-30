import type { GridConfig, WorldConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import { createRng } from '../core/rng.js';
import type { RoomSnapshot } from '../world/types.js';
import type { CaveEntrance } from './caveTypes.js';
import { CAVE_ENTRANCE_TILE } from './caveTypes.js';
import { pickWeightedCaveTemplate } from './caveTemplates.js';

const BASE_CAVE_CHANCE = 0.265;
const CARDINALS: Vector2Like[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

interface CaveEntranceCandidate {
  x: number;
  y: number;
  score: number;
  returnPosition: Vector2Like;
}

export function maybePlaceCaveEntrance(args: {
  room: RoomSnapshot;
  grid: GridConfig;
  worldConfig: WorldConfig;
  worldSeed: string;
}): CaveEntrance | null {
  const { room, grid, worldConfig, worldSeed } = args;
  if (!isRoomEligibleForCave(room, worldConfig)) {
    return null;
  }

  const rng = createRng(`${worldSeed}:cave-entrance:${room.id}`);
  if (rng() >= BASE_CAVE_CHANCE) {
    return null;
  }

  const candidates = findCaveEntranceCandidates(room, grid, worldConfig.spawnGuard.safeCells);
  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
  const top = candidates.slice(0, Math.min(6, candidates.length));
  const picked = top[Math.floor(rng() * top.length)] ?? top[0]!;
  const templateId = pickWeightedCaveTemplate(rng());
  const caveId = createCaveId(room.id, 0);
  const entrance: CaveEntrance = {
    id: `${caveId}:entrance`,
    caveId,
    x: picked.x,
    y: picked.y,
    templateId,
    collapsed: false,
  };
  replaceTile(room.layout, picked.x, picked.y, CAVE_ENTRANCE_TILE);
  room.caveEntrances = [entrance];
  return entrance;
}

export function findCaveEntranceCandidates(
  room: Pick<RoomSnapshot, 'id' | 'layout' | 'portals'>,
  grid: GridConfig,
  spawnSafeCells: readonly Vector2Like[] = [],
): CaveEntranceCandidate[] {
  const reachable = computeReachableWalkable(room.layout, spawnSafeCells, grid);
  const spawnGuard = new Set(spawnSafeCells.map(keyOf));
  const candidates: CaveEntranceCandidate[] = [];

  for (let y = 1; y < grid.rows - 1; y += 1) {
    for (let x = 1; x < grid.cols - 1; x += 1) {
      if (room.layout[y]?.[x] !== '#') {
        continue;
      }
      if (spawnGuard.has(keyOf({ x, y }))) {
        continue;
      }
      if (room.portals.some((portal) => Math.abs(portal.x - x) + Math.abs(portal.y - y) <= 2)) {
        continue;
      }
      const walkableNeighbors = CARDINALS.map((dir) => ({ x: x + dir.x, y: y + dir.y })).filter(
        (pos) => isWalkable(room.layout[pos.y]?.[pos.x]),
      );
      if (walkableNeighbors.length === 0) {
        continue;
      }
      const reachableNeighbor = walkableNeighbors.find((pos) => reachable.has(keyOf(pos)));
      if (!reachableNeighbor) {
        continue;
      }
      const wallNeighbors = CARDINALS.filter(
        (dir) => room.layout[y + dir.y]?.[x + dir.x] === '#',
      ).length;
      const distanceFromSpawn = Math.min(
        ...spawnSafeCells.map((cell) => Math.abs(cell.x - x) + Math.abs(cell.y - y)),
      );
      const score =
        (walkableNeighbors.length <= 2 ? 8 : 3) +
        wallNeighbors * 3 +
        Math.min(8, distanceFromSpawn) -
        edgePenalty(x, y, grid);
      candidates.push({ x, y, score, returnPosition: reachableNeighbor });
    }
  }

  return candidates;
}

export function createCaveId(parentRoomId: string, index: number): string {
  return `cave:${parentRoomId}:${index}`;
}

function isRoomEligibleForCave(room: RoomSnapshot, worldConfig: WorldConfig): boolean {
  if (room.id === worldConfig.originRoomId) {
    return false;
  }
  const [x = 0, y = 0] = room.id.split(',').map(Number);
  if (Math.abs(x) + Math.abs(y) < 2) {
    return false;
  }
  if (room.biomeId === 'sunken-ocean') {
    return false;
  }
  return !(
    room.town ||
    room.townPerimeter ||
    room.village ||
    room.goblinCamp ||
    room.snakeMcDonalds ||
    room.shrine ||
    room.ramenStand ||
    room.koiPond ||
    room.motelPool ||
    room.tenguCamp ||
    room.roadsideMonument ||
    room.allNiteDiner ||
    room.fireworkStand ||
    room.jackalopeLodge ||
    room.gridironYard
  );
}

function computeReachableWalkable(
  layout: string[],
  starts: readonly Vector2Like[],
  grid: GridConfig,
): Set<string> {
  const queue = starts.filter((cell) => isWalkable(layout[cell.y]?.[cell.x]));
  if (queue.length === 0) {
    const fallback = findFirstWalkable(layout, grid);
    if (fallback) {
      queue.push(fallback);
    }
  }
  const seen = new Set<string>();
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    const key = keyOf(current);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    for (const dir of CARDINALS) {
      const next = { x: current.x + dir.x, y: current.y + dir.y };
      if (
        next.x < 0 ||
        next.y < 0 ||
        next.x >= grid.cols ||
        next.y >= grid.rows ||
        seen.has(keyOf(next)) ||
        !isWalkable(layout[next.y]?.[next.x])
      ) {
        continue;
      }
      queue.push(next);
    }
  }
  return seen;
}

function findFirstWalkable(layout: string[], grid: GridConfig): Vector2Like | null {
  for (let y = 0; y < grid.rows; y += 1) {
    for (let x = 0; x < grid.cols; x += 1) {
      if (isWalkable(layout[y]?.[x])) {
        return { x, y };
      }
    }
  }
  return null;
}

function isWalkable(tile?: string): boolean {
  return Boolean(tile && tile !== '#' && tile !== '~');
}

function replaceTile(layout: string[], x: number, y: number, tile: string): void {
  const row = layout[y];
  if (!row) {
    return;
  }
  layout[y] = `${row.slice(0, x)}${tile}${row.slice(x + 1)}`;
}

function edgePenalty(x: number, y: number, grid: GridConfig): number {
  return x <= 1 || y <= 1 || x >= grid.cols - 2 || y >= grid.rows - 2 ? 8 : 0;
}

function keyOf(pos: Vector2Like): string {
  return `${pos.x},${pos.y}`;
}
