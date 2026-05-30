import type { GridConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import { createRng } from '../core/rng.js';
import type { RoomSnapshot } from '../world/types.js';
import {
  CAVE_EXIT_TILE,
  CAVE_ZONE_ORIGIN_ID,
  type CaveGenerationResult,
  type CaveInstance,
  type CaveInstanceSaveData,
  type CaveTemplateId,
} from './caveTypes.js';
import { CAVE_STRUCTURE_TABLE, getCaveTemplate } from './caveTemplates.js';

const CAVE_BACKGROUND = 0x17141d;
const CAVE_WALL = 0x40384f;
const CAVE_WALL_OUTLINE = 0x0d0b12;

export function generateCave(args: {
  caveId: string;
  parentRoomId: string;
  templateId: CaveTemplateId;
  grid: GridConfig;
  worldSeed: string;
  returnPosition: Vector2Like;
  save?: CaveInstanceSaveData;
}): CaveGenerationResult {
  const { caveId, parentRoomId, templateId, grid, worldSeed, returnPosition, save } = args;
  const seed = hash(`${worldSeed}:${caveId}:${templateId}`);
  const rng = createRng(`${seed}`);
  const template = getCaveTemplate(templateId);
  const layout = createBaseCaveLayout(grid);
  const spawn = { x: Math.floor(grid.cols / 2), y: grid.rows - 3 };
  const exit = { x: Math.floor(grid.cols / 2), y: grid.rows - 2 };
  clearAround(layout, spawn, 2);
  clearAround(layout, exit, 1);
  setTile(layout, exit.x, exit.y, CAVE_EXIT_TILE);

  const room: RoomSnapshot = {
    id: caveId,
    layout: rows(layout),
    portals: [],
    biomeId: 'verdigris-basin',
    biomeTitle: template.label,
    backgroundColor: CAVE_BACKGROUND,
    wallColor: CAVE_WALL,
    wallOutlineColor: CAVE_WALL_OUTLINE,
    cave: {
      id: caveId,
      parentRoomId,
      templateId,
      zoneId: CAVE_ZONE_ORIGIN_ID,
      exit,
      spawn,
      boundaryMode: template.boundaryMode,
      state: save?.state ?? 'available',
    },
  };

  if (templateId === 'lakeTreasure') {
    stampLakeTreasure(room, layout, save);
  } else if (templateId === 'simpleTreasure') {
    room.treasure = save?.rewardClaimed ? undefined : { x: Math.floor(grid.cols / 2), y: 8 };
  } else if (templateId === 'caveDweller') {
    stampCaveDweller(room, layout, save);
  } else if (templateId === 'monsterDen') {
    room.treasure = save?.rewardClaimed ? undefined : { x: Math.floor(grid.cols / 2), y: 6 };
    room.cave!.lockedReward = !save?.rewardClaimed;
    room.cave!.enemyCount = 3 + Math.floor(rng() * 3);
    stampPillars(layout, grid);
  } else if (templateId === 'randomStructureRoom') {
    stampRandomStructureRoom(room, layout, rng);
  } else {
    stampAppleRush(layout, grid, rng);
  }

  room.layout = rows(layout);
  const instance: CaveInstance = {
    id: caveId,
    parentRoomId,
    seed,
    templateId,
    state: save?.state ?? 'available',
    returnPosition,
    zones: {
      [CAVE_ZONE_ORIGIN_ID]: {
        id: CAVE_ZONE_ORIGIN_ID,
        localCoord: { x: 0, y: 0, z: 0 },
        templateId,
        completed: save?.state === 'completed' || save?.state === 'collapsed',
        exits: {},
      },
    },
  };
  return { instance, room, spawn, exit };
}

export function isCaveRoomId(roomId: string): boolean {
  return roomId.startsWith('cave:');
}

export function getCaveRoomOrigin(_roomId: string): Vector2Like {
  return { x: 0, y: 0 };
}

export function createDefaultCaveSave(
  caveId: string,
  parentRoomId: string,
  templateId: CaveTemplateId,
): CaveInstanceSaveData {
  return {
    id: caveId,
    parentRoomId,
    templateId,
    state: 'available',
    collectedItemIds: [],
    openedChestIds: [],
    killedEnemyIds: [],
    rewardClaimed: false,
    discoveredZones: [CAVE_ZONE_ORIGIN_ID],
  };
}

function createBaseCaveLayout(grid: GridConfig): string[][] {
  return Array.from({ length: grid.rows }, (_, y) =>
    Array.from({ length: grid.cols }, (_, x) =>
      x === 0 || y === 0 || x === grid.cols - 1 || y === grid.rows - 1 ? '#' : '.',
    ),
  );
}

function stampAppleRush(layout: string[][], grid: GridConfig, rng: () => number): void {
  for (let i = 0; i < 26; i += 1) {
    const x = 3 + Math.floor(rng() * (grid.cols - 6));
    const y = 3 + Math.floor(rng() * (grid.rows - 9));
    if (Math.abs(x - Math.floor(grid.cols / 2)) <= 2 && y > grid.rows - 8) {
      continue;
    }
    setTile(layout, x, y, i % 4 === 0 ? '#' : '.');
  }
}

function stampLakeTreasure(
  room: RoomSnapshot,
  layout: string[][],
  save?: CaveInstanceSaveData,
): void {
  const collected = new Set(save?.collectedItemIds ?? []);
  const centerX = Math.floor(layout[0]!.length / 2);
  for (let y = 5; y <= 13; y += 1) {
    const half = y === 5 || y === 13 ? 5 : y === 6 || y === 12 ? 7 : 8;
    for (let x = centerX - half; x <= centerX + half; x += 1) {
      setTile(layout, x, y, '~');
    }
  }
  const items = [
    { id: 'lake-0', x: centerX - 4, y: 8 },
    { id: 'lake-1', x: centerX + 4, y: 8 },
    { id: 'lake-2', x: centerX - 4, y: 11 },
    { id: 'lake-3', x: centerX + 4, y: 11 },
  ].filter((item) => !collected.has(item.id));
  room.cave!.lakeRewards = items;
}

function stampCaveDweller(
  room: RoomSnapshot,
  layout: string[][],
  save?: CaveInstanceSaveData,
): void {
  const x = Math.floor(layout[0]!.length / 2);
  const y = 8;
  setTile(layout, x, y, 'G');
  room.questGiver = {
    id: `cave-dweller:${room.id}`,
    name: 'Cave Dweller',
    role: 'wanderer',
    encounterType: 'flavor',
    stats: { str: 2, dex: 3, con: 4, int: 8, wis: 9, cha: 5 },
    maxHearts: 4,
    x,
    y,
  };
  room.cave!.dwellerRewardClaimed = Boolean(save?.rewardClaimed);
}

function stampRandomStructureRoom(room: RoomSnapshot, layout: string[][], rng: () => number): void {
  const selected = pickStructure(rng);
  const left = 8;
  const top = 5;
  const width = 16;
  const height = 9;
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      const border = x === left || y === top || x === left + width - 1 || y === top + height - 1;
      setTile(layout, x, y, border ? '#' : 'W');
    }
  }
  setTile(layout, left + Math.floor(width / 2), top + height - 1, '.');
  setTile(layout, left + Math.floor(width / 2), top + height - 2, 'E');
  setTile(layout, left + 3, top + 3, 'G');
  setTile(layout, left + width - 4, top + 3, 'L');
  room.cave!.forcedStructureId = selected;
}

function stampPillars(layout: string[][], grid: GridConfig): void {
  const points = [
    { x: 8, y: 7 },
    { x: grid.cols - 9, y: 7 },
    { x: 8, y: 14 },
    { x: grid.cols - 9, y: 14 },
  ];
  for (const point of points) {
    setTile(layout, point.x, point.y, '#');
  }
}

function pickStructure(rng: () => number): string {
  const total = CAVE_STRUCTURE_TABLE.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = rng() * total;
  for (const entry of CAVE_STRUCTURE_TABLE) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry.structureId;
    }
  }
  return 'shrine';
}

function clearAround(layout: string[][], center: Vector2Like, radius: number): void {
  for (let y = center.y - radius; y <= center.y + radius; y += 1) {
    for (let x = center.x - radius; x <= center.x + radius; x += 1) {
      if (layout[y]?.[x] && x > 0 && y > 0 && y < layout.length - 1 && x < layout[y]!.length - 1) {
        setTile(layout, x, y, '.');
      }
    }
  }
}

function rows(layout: string[][]): string[] {
  return layout.map((row) => row.join(''));
}

function setTile(layout: string[][], x: number, y: number, tile: string): void {
  if (!layout[y]?.[x]) {
    return;
  }
  layout[y]![x] = tile;
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  }
  return result >>> 0;
}
