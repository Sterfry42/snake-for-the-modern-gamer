import type { AppleSnapshot } from '../../apples/types.js';
import type { Vector2Like } from '../../core/math.js';
import type { ClientRoomSnapshot } from '../../session/GameSnapshot.js';
import type { EnemyInstance } from '../../systems/enemies.js';
import type { RoomSnapshot, VegetationInstance } from '../../world/types.js';
import { isSolidTile } from '../../world/tiles.js';
import type {
  FirstPersonBillboard,
  FirstPersonMaterial,
  FirstPersonWorldView,
} from './firstPersonTypes.js';
import type { WorldHumanoidSpawn } from '../../world/types.js';

const OPEN_MATERIAL: FirstPersonMaterial = {
  id: 'open',
  occludesVision: false,
  wallHeight: 0,
  wallColor: 0,
};

export interface CreateFirstPersonWorldViewOptions {
  room: ClientRoomSnapshot;
  snakeBody: readonly Vector2Like[];
  apple?: AppleSnapshot | null;
}

export function createFirstPersonWorldView(
  options: CreateFirstPersonWorldViewOptions,
): FirstPersonWorldView {
  const roomSnapshot = options.room.room;
  const width = roomSnapshot.layout[0]?.length ?? 0;
  const height = roomSnapshot.layout.length;
  const wallColor = options.room.wallColor ?? roomSnapshot.wallColor;
  const backgroundColor = options.room.backgroundColor ?? roomSnapshot.backgroundColor;
  const billboards = buildBillboards(options.room, options.snakeBody, options.apple);

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
  apple?: AppleSnapshot | null,
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
      roomId: room.id,
    });
  });

  for (const enemy of [...(room.enemies ?? []), ...(room.followers ?? [])]) {
    pushEnemyBillboards(result, enemy);
  }
  for (const animal of room.animals ?? []) {
    result.push({
      id: `animal:${animal.id}`,
      kind: 'animal',
      x: animal.position.x + 0.5,
      y: animal.position.y + 0.5,
      width: 0.58,
      height: 0.58,
      anchorY: 1,
      color: 0xd7b98c,
      roomId: animal.roomId,
      facing: animal.direction,
    });
  }
  for (const prop of roomSnapshot.vegetation ?? []) {
    pushVegetationBillboard(result, prop);
  }
  pushNpcBillboards(result, roomSnapshot);
  return result;
}

function pushEnemyBillboards(result: FirstPersonBillboard[], enemy: EnemyInstance): void {
  const body = enemy.body?.length ? enemy.body : [enemy.position];
  body.forEach((position, index) => {
    result.push({
      id: `enemy:${enemy.id}:${index}`,
      kind: 'enemy',
      x: position.x + 0.5,
      y: position.y + 0.5,
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
      roomId: enemy.roomId,
      facing: enemy.aimDirection,
    });
  });
}

function pushVegetationBillboard(result: FirstPersonBillboard[], prop: VegetationInstance): void {
  result.push({
    id: `vegetation:${prop.variant}:${prop.x},${prop.y}`,
    kind: 'prop',
    x: prop.x + 0.5,
    y: prop.y + 0.5,
    width: 0.74,
    height: 1.1,
    anchorY: 1,
    color: 0x2f9e44,
  });
}

function pushNpcBillboards(result: FirstPersonBillboard[], room: RoomSnapshot): void {
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
    });
  });
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
