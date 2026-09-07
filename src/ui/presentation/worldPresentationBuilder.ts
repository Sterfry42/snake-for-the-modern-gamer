import type { AppleSnapshot } from '../../apples/types.js';
import type { AnimalInstance } from '../../animals/types.js';
import type { GridConfig } from '../../config/gameConfig.js';
import type { Vector2Like } from '../../core/math.js';
import type { ClientRoomSnapshot } from '../../session/GameSnapshot.js';
import type { EnemyInstance } from '../../systems/enemies.js';
import type { ResolvedAtmosphereView } from '../../world/atmosphereTypes.js';
import type { RoomSnapshot, WorldHumanoidSpawn } from '../../world/types.js';
import {
  localRenderPoint,
  normalizeRenderPoint,
  type RenderRoomPlacement,
} from './renderCoordinates.js';
import { resolveRenderTile } from './tileVisualResolver.js';
import type { RenderRoom, RenderSprite, WorldRenderScene } from './worldRenderScene.js';
import type { WorldVisualAssetResolver } from './worldVisualAssets.js';

export interface PresentationRoomInput {
  room: ClientRoomSnapshot;
  offset?: Vector2Like;
  apple?: AppleSnapshot | null;
  enemies?: readonly EnemyInstance[];
  followers?: readonly EnemyInstance[];
  animals?: readonly AnimalInstance[];
  runtimeNpcs?: readonly RuntimeNpcPresentation[];
}

export interface RuntimeNpcPresentation {
  id: string;
  x: number;
  y: number;
}

export interface BuildWorldPresentationOptions {
  rooms: readonly PresentationRoomInput[];
  currentRoomId: string;
  grid: GridConfig;
  snakeBody: readonly Vector2Like[];
  direction: Vector2Like;
  assets: WorldVisualAssetResolver;
  atmosphere?: ResolvedAtmosphereView;
}

export function buildWorldPresentationScene(
  options: BuildWorldPresentationOptions,
): WorldRenderScene {
  const placements = new Map<string, RenderRoomPlacement>();
  const rooms = options.rooms.map((entry) => {
    const room = entry.room.room;
    const width = room.layout[0]?.length ?? options.grid.cols;
    const height = room.layout.length || options.grid.rows;
    const placement: RenderRoomPlacement = {
      roomId: entry.room.id,
      offsetX: entry.offset?.x ?? 0,
      offsetY: entry.offset?.y ?? 0,
      width,
      height,
    };
    placements.set(entry.room.id, placement);
    return buildRenderRoom(room, placement);
  });
  const currentPlacement =
    placements.get(options.currentRoomId) ??
    ({
      roomId: options.currentRoomId,
      offsetX: 0,
      offsetY: 0,
      width: options.grid.cols,
      height: options.grid.rows,
    } satisfies RenderRoomPlacement);
  const sprites: RenderSprite[] = [];
  pushSnakeSprites(
    sprites,
    options.snakeBody,
    currentPlacement,
    options.grid,
    options.direction,
    options.assets,
  );
  for (const entry of options.rooms) {
    const placement = placements.get(entry.room.id);
    if (!placement) continue;
    pushRoomSprites(sprites, entry, placement, options.assets);
  }
  return { rooms, sprites, effects: [], atmosphere: options.atmosphere };
}

function buildRenderRoom(room: RoomSnapshot, placement: RenderRoomPlacement): RenderRoom {
  const tiles = room.layout.flatMap((row, y) =>
    [...row].map((tile, x) =>
      resolveRenderTile(room, tile, x + placement.offsetX, y + placement.offsetY),
    ),
  );
  return {
    id: placement.roomId,
    offsetX: placement.offsetX,
    offsetY: placement.offsetY,
    width: placement.width,
    height: placement.height,
    backgroundColor: room.backgroundColor,
    wallColor: room.wallColor,
    tiles,
  };
}

function pushSnakeSprites(
  sprites: RenderSprite[],
  snakeBody: readonly Vector2Like[],
  placement: RenderRoomPlacement,
  grid: GridConfig,
  direction: Vector2Like,
  assets: WorldVisualAssetResolver,
): void {
  snakeBody.forEach((segment, index) => {
    const position = normalizeRenderPoint(segment, placement, grid);
    sprites.push({
      id: `snake:${index}`,
      kind: 'snake',
      x: position.x + 0.5,
      y: position.y + 0.5,
      width: index === 0 ? 0.82 : 0.68,
      height: index === 0 ? 0.82 : 0.64,
      anchorY: index === 0 ? 0.5 : 0.92,
      color: 0x4ecdc4,
      visual: assets.getSnakeTexture(index, direction),
      roomId: placement.roomId,
      facing: direction,
      segmentIndex: index,
    });
  });
}

function pushRoomSprites(
  sprites: RenderSprite[],
  entry: PresentationRoomInput,
  placement: RenderRoomPlacement,
  assets: WorldVisualAssetResolver,
): void {
  const activeApple = entry.apple ?? entry.room.apples ?? null;
  if (activeApple && activeApple.roomId === entry.room.id) {
    const position = localRenderPoint(activeApple.position, placement);
    sprites.push({
      id: `apple:${entry.room.id}:${activeApple.position.x},${activeApple.position.y}`,
      kind: 'apple',
      x: position.x + 0.5,
      y: position.y + 0.5,
      width: 0.62,
      height: 0.78,
      anchorY: 1,
      color: activeApple.color,
      visual: assets.getAppleTexture(activeApple),
      roomId: entry.room.id,
    });
  }
  for (const enemy of [
    ...(entry.enemies ?? entry.room.enemies ?? []),
    ...(entry.followers ?? entry.room.followers ?? []),
  ]) {
    const body = enemy.body?.length ? enemy.body : [enemy.position];
    body.forEach((segment, index) => {
      const position = localRenderPoint(segment, placement);
      const snakeLike =
        enemy.encounterKind === 'rival-snake' || enemy.encounterKind === 'roaming-snake';
      sprites.push({
        id: `enemy:${enemy.id}:${index}`,
        kind: 'enemy',
        x: position.x + 0.5,
        y: position.y + 0.5,
        width: snakeLike ? 0.66 : 0.72,
        height: snakeLike ? 0.64 : 0.92,
        anchorY: 1,
        color: enemy.encounterKind === 'goblin' ? 0x4f8a32 : 0xa82d3d,
        visual: assets.getEnemyTexture(enemy, index),
        roomId: enemy.roomId,
        facing: enemy.aimDirection,
        segmentIndex: index,
      });
    });
  }
  for (const animal of entry.animals ?? entry.room.animals ?? []) {
    const position = localRenderPoint(animal.position, placement);
    sprites.push({
      id: `animal:${animal.id}`,
      kind: 'animal',
      x: position.x + 0.5,
      y: position.y + 0.5,
      width: 0.58,
      height: 0.58,
      anchorY: 1,
      color: 0xd7b98c,
      visual: assets.getAnimalTexture(animal),
      roomId: animal.roomId,
      facing: animal.direction,
    });
  }
  for (const vegetation of entry.room.room.vegetation ?? []) {
    sprites.push({
      id: `vegetation:${entry.room.id}:${vegetation.variant}:${vegetation.x},${vegetation.y}`,
      kind: 'vegetation',
      x: placement.offsetX + vegetation.x + 0.5,
      y: placement.offsetY + vegetation.y + 0.5,
      width: 0.74,
      height: 1.1,
      anchorY: 1,
      color: 0x2f9e44,
      visual: assets.getVegetationTexture(vegetation, entry.room.room.backgroundColor),
      roomId: entry.room.id,
    });
  }
  pushAuthoredNpcs(sprites, entry.room.room, placement, assets);
  for (const npc of entry.runtimeNpcs ?? []) {
    sprites.push({
      id: `actor-npc:${npc.id}`,
      kind: 'npc',
      x: placement.offsetX + npc.x + 0.5,
      y: placement.offsetY + npc.y + 0.5,
      width: 0.64,
      height: 1,
      anchorY: 1,
      color: 0xf6bd60,
      visual: assets.getNpcTexture(),
      roomId: entry.room.id,
    });
  }
}

function pushAuthoredNpcs(
  sprites: RenderSprite[],
  room: RoomSnapshot,
  placement: RenderRoomPlacement,
  assets: WorldVisualAssetResolver,
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
    sprites.push({
      id: `npc:${room.id}:${index}:${npc.x},${npc.y}`,
      kind: 'npc',
      x: placement.offsetX + npc.x + 0.5,
      y: placement.offsetY + npc.y + 0.5,
      width: 0.64,
      height: 1,
      anchorY: 1,
      color: 0xf6bd60,
      visual: assets.getNpcTexture(),
      roomId: room.id,
    });
  });
}
