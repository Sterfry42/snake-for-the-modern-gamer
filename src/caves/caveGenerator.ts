import type { GridConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import { createRng } from '../core/rng.js';
import { tryPlaceGoblinCamp } from '../world/goblinCamp.js';
import { tryPlaceQuestHouse } from '../world/questHouse.js';
import { tryPlaceShrine } from '../world/shrine.js';
import { tryPlaceSnakeMcDonalds } from '../world/snakeMcDonalds.js';
import type { RoomSnapshot } from '../world/types.js';
import { tryPlaceVillage } from '../world/village.js';
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
  } else if (templateId === 'targetingGallery') {
    stampTargetingGallery(room, layout, grid, save);
  } else if (templateId === 'echoMaze') {
    stampEchoMaze(room, layout, grid, save);
  } else if (templateId === 'floodedTreasury') {
    stampFloodedTreasury(room, layout, save);
  } else if (templateId === 'shrineOfBadProbability') {
    stampShrineOfBadProbability(room, layout, grid, rng, save);
  } else if (templateId === 'fossilDigSite') {
    stampFossilDigSite(room, layout, grid, save);
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
  const attempts = [
    selected,
    ...CAVE_STRUCTURE_TABLE.map((entry) => entry.structureId).filter((id) => id !== selected),
  ];
  const forbiddenCells = createCaveStructureForbiddenCells(room);

  for (const structureId of attempts) {
    if (tryStampCaveStructure(room, layout, structureId, rng, forbiddenCells)) {
      room.cave!.forcedStructureId = structureId;
      return;
    }
  }

  room.treasure = { x: Math.floor(layout[0]!.length / 2), y: 8 };
  room.cave!.forcedStructureId = 'fallbackTreasure';
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

function stampTargetingGallery(
  room: RoomSnapshot,
  layout: string[][],
  grid: GridConfig,
  save?: CaveInstanceSaveData,
): void {
  const centerX = Math.floor(grid.cols / 2);
  for (let y = 4; y <= grid.rows - 7; y += 3) {
    for (const x of [centerX - 8, centerX - 4, centerX + 4, centerX + 8]) {
      setTile(layout, x, y, '#');
    }
  }
  for (let y = 3; y <= grid.rows - 8; y += 4) {
    setTile(layout, centerX - 1, y, '#');
    setTile(layout, centerX + 1, y, '#');
  }
  room.treasure = save?.rewardClaimed ? undefined : { x: centerX, y: 5 };
}

function stampEchoMaze(
  room: RoomSnapshot,
  layout: string[][],
  grid: GridConfig,
  save?: CaveInstanceSaveData,
): void {
  const centerX = Math.floor(grid.cols / 2);
  for (let y = 4; y <= grid.rows - 7; y += 2) {
    const gap = y % 4 === 0 ? 4 : grid.cols - 5;
    for (let x = 3; x <= grid.cols - 4; x += 1) {
      if (x === gap || x === centerX) continue;
      setTile(layout, x, y, '#');
    }
  }
  for (let y = 5; y <= grid.rows - 8; y += 4) {
    setTile(layout, centerX - 3, y, '#');
    setTile(layout, centerX + 3, y, '#');
  }
  room.treasure = save?.rewardClaimed ? undefined : { x: centerX, y: 3 };
}

function stampFloodedTreasury(
  room: RoomSnapshot,
  layout: string[][],
  save?: CaveInstanceSaveData,
): void {
  const collected = new Set(save?.collectedItemIds ?? []);
  const centerX = Math.floor(layout[0]!.length / 2);
  for (let y = 4; y <= 14; y += 1) {
    for (let x = centerX - 9; x <= centerX + 9; x += 1) {
      if (x === centerX || (y >= 9 && y <= 11 && Math.abs(x - centerX) <= 3)) {
        continue;
      }
      if ((x + y) % 3 !== 0) {
        setTile(layout, x, y, '~');
      }
    }
  }
  room.cave!.lakeRewards = [
    { id: 'flood-0', x: centerX - 7, y: 6 },
    { id: 'flood-1', x: centerX + 7, y: 6 },
    { id: 'flood-2', x: centerX - 6, y: 12 },
    { id: 'flood-3', x: centerX + 6, y: 12 },
  ].filter((item) => !collected.has(item.id));
  room.treasure = save?.rewardClaimed ? undefined : { x: centerX, y: 9 };
}

function stampShrineOfBadProbability(
  room: RoomSnapshot,
  layout: string[][],
  grid: GridConfig,
  rng: () => number,
  save?: CaveInstanceSaveData,
): void {
  const centerX = Math.floor(grid.cols / 2);
  const centerY = 7;
  const placed = tryStampCaveStructure(
    room,
    layout,
    'shrine',
    rng,
    createCaveStructureForbiddenCells(room),
  );
  if (placed) {
    room.cave!.forcedStructureId = 'shrine';
  } else {
    setTile(layout, centerX, centerY, 'S');
  }
  for (const point of [
    { x: centerX - 6, y: centerY + 4 },
    { x: centerX + 6, y: centerY + 4 },
    { x: centerX - 8, y: centerY - 2 },
    { x: centerX + 8, y: centerY - 2 },
  ]) {
    setTile(layout, point.x, point.y, '#');
  }
  room.treasure = save?.rewardClaimed ? undefined : { x: centerX, y: 4 };
}

function stampFossilDigSite(
  room: RoomSnapshot,
  layout: string[][],
  grid: GridConfig,
  save?: CaveInstanceSaveData,
): void {
  const centerX = Math.floor(grid.cols / 2);
  for (let y = 5; y <= 14; y += 1) {
    const left = centerX - 10 + (y % 3);
    const right = centerX + 10 - (y % 3);
    setTile(layout, left, y, '#');
    setTile(layout, right, y, '#');
    if (y % 2 === 0) {
      setTile(layout, centerX - 2, y, '#');
      setTile(layout, centerX + 2, y, '#');
    }
  }
  room.treasure = save?.rewardClaimed ? undefined : { x: centerX, y: 6 };
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

function tryStampCaveStructure(
  room: RoomSnapshot,
  layout: string[][],
  structureId: string,
  rng: () => number,
  forbiddenCells: ReadonlySet<string>,
): boolean {
  const grid = { cols: layout[0]?.length ?? 0, rows: layout.length, cell: 24 };
  const options = { forbiddenCells, margin: 2 };
  switch (structureId) {
    case 'snakeMcDonalds': {
      const placement = tryPlaceSnakeMcDonalds(layout, grid, rng, options);
      if (!placement) return false;
      room.snakeMcDonalds = placement;
      return true;
    }
    case 'goblinCamp': {
      const placement = tryPlaceGoblinCamp(layout, grid, rng, options);
      if (!placement) return false;
      room.goblinCamp = placement;
      return true;
    }
    case 'shrine': {
      const placement = tryPlaceShrine(layout, grid, rng, options);
      if (!placement) return false;
      room.shrine = placement;
      room.questGiver = placement.maiden;
      return true;
    }
    case 'questHouse': {
      const placement = tryPlaceQuestHouse(layout, grid, rng, options);
      if (!placement) return false;
      room.questGiver = placement.questGiver;
      return true;
    }
    case 'villageShop': {
      const placement = tryPlaceVillage(layout, grid, rng, 'verdigris-basin', options);
      if (!placement) return false;
      room.questGiver = placement.questGiver;
      room.village = placement.village;
      return true;
    }
    default:
      return false;
  }
}

function createCaveStructureForbiddenCells(room: RoomSnapshot): ReadonlySet<string> {
  const cells = new Set<string>();
  const spawn = room.cave?.spawn;
  const exit = room.cave?.exit;
  if (spawn) {
    addForbiddenRadius(cells, spawn, 3);
  }
  if (exit) {
    addForbiddenRadius(cells, exit, 3);
  }
  if (spawn && exit) {
    const minY = Math.min(spawn.y, exit.y);
    const maxY = Math.max(spawn.y, exit.y);
    for (let y = minY - 1; y <= maxY + 1; y += 1) {
      for (let x = spawn.x - 2; x <= spawn.x + 2; x += 1) {
        cells.add(`${x},${y}`);
      }
    }
  }
  return cells;
}

function addForbiddenRadius(cells: Set<string>, center: Vector2Like, radius: number): void {
  for (let y = center.y - radius; y <= center.y + radius; y += 1) {
    for (let x = center.x - radius; x <= center.x + radius; x += 1) {
      cells.add(`${x},${y}`);
    }
  }
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
