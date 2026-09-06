import type { AppleSnapshot } from '../../apples/types.js';
import type { GridConfig } from '../../config/gameConfig.js';
import type { Vector2Like } from '../../core/math.js';
import type { ClientRoomSnapshot } from '../../session/GameSnapshot.js';
import type { EnemyInstance } from '../../systems/enemies.js';
import type { RoomSnapshot, VegetationInstance, WorldHumanoidSpawn } from '../../world/types.js';
import { isSolidTile } from '../../world/tiles.js';
import type {
  FirstPersonBillboard,
  FirstPersonMaterial,
  FirstPersonWorldView,
} from './firstPersonTypes.js';

const OPEN_MATERIAL: FirstPersonMaterial = {
  id: 'open',
  occludesVision: false,
  wallHeight: 0,
  wallColor: 0,
};

export interface CreateFirstPersonWorldViewOptions {
  room: ClientRoomSnapshot;
  snakeBody: readonly Vector2Like[];
  grid: GridConfig;
  apple?: AppleSnapshot | null;
  textureKeys?: FirstPersonTextureKeys;
  runtimeNpcs?: readonly FirstPersonRuntimeNpc[];
}

export interface FirstPersonTextureKeys {
  apple?: string;
  snakeBody?: string;
  enemy?: string;
  npc?: string;
  animalByType?: Readonly<Record<string, string | undefined>>;
  vegetationByVariant?: Readonly<Record<string, string | undefined>>;
}

export interface FirstPersonRuntimeNpc {
  id: string;
  x: number;
  y: number;
}

export function createFirstPersonWorldView(
  options: CreateFirstPersonWorldViewOptions,
): FirstPersonWorldView {
  const roomSnapshot = options.room.room;
  const width = roomSnapshot.layout[0]?.length ?? 0;
  const height = roomSnapshot.layout.length;
  const wallColor = options.room.wallColor ?? roomSnapshot.wallColor;
  const backgroundColor = options.room.backgroundColor ?? roomSnapshot.backgroundColor;
  const transform = createRoomLocalTransform(options.room.id, options.grid, width, height);
  const billboards = buildBillboards(
    options.room,
    options.snakeBody.map(transform),
    transform,
    options.apple ? { ...options.apple, position: transform(options.apple.position) } : null,
    options.textureKeys ?? {},
    options.runtimeNpcs ?? [],
  );

  return {
    width,
    height,
    roomId: options.room.id,
    skyColor: mixColor(backgroundColor, 0x111a2f, 0.42),
    floorColor: mixColor(backgroundColor, 0x1d1712, 0.35),
    fogColor: mixColor(backgroundColor, wallColor, 0.28),
    getCell(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      const tile = roomSnapshot.layout[y]?.[x];
      const material = resolveMaterial(tile, wallColor);
      return { x, y, tile, material };
    },
    getBillboards() {
      return billboards;
    },
  };
}

function resolveMaterial(tile: string | undefined, wallColor: number): FirstPersonMaterial {
  if (!isSolidTile(tile)) return OPEN_MATERIAL;
  return {
    id: `tile:${tile ?? 'unknown'}`,
    occludesVision: true,
    wallHeight: 1,
    wallColor,
  };
}

function buildBillboards(
  room: ClientRoomSnapshot,
  snakeBody: readonly Vector2Like[],
  transform: (position: Vector2Like) => Vector2Like,
  apple?: AppleSnapshot | null,
  textureKeys: FirstPersonTextureKeys = {},
  runtimeNpcs: readonly FirstPersonRuntimeNpc[] = [],
): FirstPersonBillboard[] {
  const result: FirstPersonBillboard[] = [];
  const roomSnapshot = room.room;
  const activeApple = apple ?? room.apples ?? null;
  if (activeApple && activeApple.roomId === room.id) {
    result.push({
      id: `apple:${activeApple.position.x},${activeApple.position.y}`,
      kind: 'apple',
      x: activeApple.position.x + 0.5,
      y: activeApple.position.y + 0.5,
      width: 0.62,
      height: 0.78,
      anchorY: 1,
      color: activeApple.color,
      textureKey: textureKeys.apple,
      roomId: room.id,
    });
  }

  snakeBody.slice(1).forEach((segment, index) => {
    result.push({
      id: `snake-body:${index + 1}`,
      kind: 'snake-body',
      x: segment.x + 0.5,
      y: segment.y + 0.5,
      width: 0.68,
      height: 0.64,
      anchorY: 0.92,
      color: 0x4ecdc4,
      textureKey: textureKeys.snakeBody,
      roomId: room.id,
    });
  });

  for (const enemy of [...(room.enemies ?? []), ...(room.followers ?? [])]) {
    pushEnemyBillboards(result, enemy, transform, textureKeys.enemy);
  }
  for (const animal of room.animals ?? []) {
    const position = transform(animal.position);
    result.push({
      id: `animal:${animal.id}`,
      kind: 'animal',
      x: position.x + 0.5,
      y: position.y + 0.5,
      width: 0.58,
      height: 0.58,
      anchorY: 1,
      color: 0xd7b98c,
      textureKey: textureKeys.animalByType?.[animal.type],
      roomId: animal.roomId,
      facing: animal.direction,
    });
  }
  for (const prop of roomSnapshot.vegetation ?? []) {
    pushVegetationBillboard(result, prop, textureKeys.vegetationByVariant?.[prop.variant]);
  }
  for (const npc of runtimeNpcs) {
    result.push({
      id: `actor-npc:${npc.id}`,
      kind: 'npc',
      x: npc.x + 0.5,
      y: npc.y + 0.5,
      width: 0.64,
      height: 1,
      anchorY: 1,
      color: 0xf6bd60,
      textureKey: textureKeys.npc,
      roomId: room.id,
    });
  }
  pushNpcBillboards(result, roomSnapshot, textureKeys.npc);
  return result;
}

function pushEnemyBillboards(
  result: FirstPersonBillboard[],
  enemy: EnemyInstance,
  transform: (position: Vector2Like) => Vector2Like,
  textureKey?: string,
): void {
  const body = enemy.body?.length ? enemy.body : [enemy.position];
  body.forEach((position, index) => {
    const localPosition = transform(position);
    result.push({
      id: `enemy:${enemy.id}:${index}`,
      kind: 'enemy',
      x: localPosition.x + 0.5,
      y: localPosition.y + 0.5,
      width:
        enemy.encounterKind === 'rival-snake' || enemy.encounterKind === 'roaming-snake'
          ? 0.66
          : 0.72,
      height:
        enemy.encounterKind === 'rival-snake' || enemy.encounterKind === 'roaming-snake'
          ? 0.64
          : 0.92,
      anchorY: 1,
      color: enemy.encounterKind === 'goblin' ? 0x4f8a32 : 0xa82d3d,
      textureKey,
      roomId: enemy.roomId,
      facing: enemy.aimDirection,
    });
  });
}

function pushVegetationBillboard(
  result: FirstPersonBillboard[],
  prop: VegetationInstance,
  textureKey?: string,
): void {
  result.push({
    id: `vegetation:${prop.variant}:${prop.x},${prop.y}`,
    kind: 'prop',
    x: prop.x + 0.5,
    y: prop.y + 0.5,
    width: 0.74,
    height: 1.1,
    anchorY: 1,
    color: 0x2f9e44,
    textureKey,
  });
}

function pushNpcBillboards(
  result: FirstPersonBillboard[],
  room: RoomSnapshot,
  textureKey?: string,
): void {
  const candidates: WorldHumanoidSpawn[] = [
    room.questGiver,
    room.village?.shopkeeper,
    ...(room.village?.residents ?? []),
    room.goblinCamp?.shopkeeper,
    ...(room.goblinCamp?.guards ?? []),
    room.shrine?.maiden,
    room.ramenStand?.chef,
  ].filter((value): value is WorldHumanoidSpawn => Boolean(value));
  candidates.forEach((npc, index) => {
    result.push({
      id: `npc:${index}:${npc.x},${npc.y}`,
      kind: 'npc',
      x: npc.x + 0.5,
      y: npc.y + 0.5,
      width: 0.64,
      height: 1,
      anchorY: 1,
      color: 0xf6bd60,
      textureKey,
    });
  });
}

export function normalizeFirstPersonRoomPoint(
  position: Vector2Like,
  roomId: string,
  grid: Pick<GridConfig, 'cols' | 'rows'>,
  roomWidth = grid.cols,
  roomHeight = grid.rows,
): Vector2Like {
  const coordinateRoom = parseCoordinateRoomId(roomId);
  if (!coordinateRoom) return { x: position.x, y: position.y };
  const x = position.x - coordinateRoom.x * roomWidth;
  const y = position.y - coordinateRoom.y * roomHeight;
  if (x >= 0 && x < roomWidth && y >= 0 && y < roomHeight) {
    return { x, y };
  }
  return { x: position.x, y: position.y };
}

function createRoomLocalTransform(
  roomId: string,
  grid: Pick<GridConfig, 'cols' | 'rows'>,
  roomWidth: number,
  roomHeight: number,
): (position: Vector2Like) => Vector2Like {
  return (position) => normalizeFirstPersonRoomPoint(position, roomId, grid, roomWidth, roomHeight);
}

function parseCoordinateRoomId(roomId: string): { x: number; y: number; z: number } | null {
  const match = /^(-?\d+),(-?\d+),(-?\d+)$/.exec(roomId);
  if (!match) return null;
  return {
    x: Number(match[1]),
    y: Number(match[2]),
    z: Number(match[3]),
  };
}

function mixColor(a: number, b: number, amount: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * amount);
  const g = Math.round(ag + (bg - ag) * amount);
  const blue = Math.round(ab + (bb - ab) * amount);
  return (r << 16) | (g << 8) | blue;
}
