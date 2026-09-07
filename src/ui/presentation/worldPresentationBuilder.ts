import type { AppleSnapshot } from '../../apples/types.js';
import type { AnimalInstance } from '../../animals/types.js';
import type { GridConfig } from '../../config/gameConfig.js';
import type { Vector2Like } from '../../core/math.js';
import type { BombInstance, FootballInstance } from '../../game/snakeGame.js';
import type { ClientRoomSnapshot } from '../../session/GameSnapshot.js';
import type { BulletInstance, EnemyInstance } from '../../systems/enemies.js';
import type { ResolvedAtmosphereView } from '../../world/atmosphereTypes.js';
import type { RoomSnapshot, WorldHumanoidSpawn } from '../../world/types.js';
import {
  localRenderPoint,
  normalizeRenderPoint,
  type RenderRoomPlacement,
} from './renderCoordinates.js';
import { resolveRenderTile } from './tileVisualResolver.js';
import type { RenderRoom, RenderSprite, WorldRenderScene } from './worldRenderScene.js';
import type { NpcVisualDescriptor, WorldVisualAssetResolver } from './worldVisualAssets.js';
import type { FurnitureSpriteVariant } from '../spriteRecipes/furnitureRecipe.js';

export interface PresentationRoomInput {
  room: ClientRoomSnapshot;
  offset?: Vector2Like;
  apple?: AppleSnapshot | null;
  enemies?: readonly EnemyInstance[];
  followers?: readonly EnemyInstance[];
  animals?: readonly AnimalInstance[];
  bullets?: readonly BulletInstance[];
  footballs?: readonly FootballInstance[];
  bombs?: readonly BombInstance[];
  alchemyStation?: { roomId: string; x: number; y: number } | null;
  runtimeNpcs?: readonly RuntimeNpcPresentation[];
}

export interface RuntimeNpcPresentation {
  id: string;
  x: number;
  y: number;
  visual?: NpcVisualDescriptor;
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
  pushRoomItemSprites(sprites, entry, placement, assets);
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
      visual: assets.getNpcTexture(npc.visual),
      roomId: entry.room.id,
    });
  }
}

function pushRoomItemSprites(
  sprites: RenderSprite[],
  entry: PresentationRoomInput,
  placement: RenderRoomPlacement,
  assets: WorldVisualAssetResolver,
): void {
  const room = entry.room.room;
  pushFurnitureSprites(sprites, room, placement, assets);
  if (room.treasure) {
    pushSprite(sprites, {
      id: `treasure:${entry.room.id}:${room.treasure.x},${room.treasure.y}`,
      kind: 'treasure',
      position: localRenderPoint(room.treasure, placement),
      width: 0.72,
      height: 0.72,
      color: 0xffd166,
      visual: assets.getTreasureTexture(),
      roomId: entry.room.id,
    });
  }
  if (room.powerup) {
    pushSprite(sprites, {
      id: `powerup:${entry.room.id}:${room.powerup.kind}:${room.powerup.x},${room.powerup.y}`,
      kind: 'powerup',
      position: localRenderPoint(room.powerup, placement),
      width: 0.7,
      height: 0.7,
      color:
        room.powerup.kind === 'phase'
          ? 0x9b5de5
          : room.powerup.kind === 'smite'
            ? 0xd7263d
            : 0xf6bd60,
      visual: assets.getPowerupTexture(room.powerup.kind),
      roomId: entry.room.id,
    });
  }
  if (entry.alchemyStation && entry.alchemyStation.roomId === entry.room.id) {
    pushSprite(sprites, {
      id: `alchemy-station:${entry.room.id}:${entry.alchemyStation.x},${entry.alchemyStation.y}`,
      kind: 'prop',
      position: localRenderPoint(entry.alchemyStation, placement),
      width: 0.8,
      height: 0.8,
      color: 0x8cffd2,
      visual: assets.getAlchemyStationTexture(),
      roomId: entry.room.id,
    });
  }
  for (const bullet of entry.bullets ?? entry.room.bullets ?? []) {
    pushSprite(sprites, {
      id: `projectile:${bullet.id}`,
      kind: 'projectile',
      position: localRenderPoint(bullet.position, placement),
      width: 0.34,
      height: 0.34,
      color: bullet.owner === 'player' ? 0xffe0a3 : 0xffd166,
      visual: assets.getProjectileTexture(bullet),
      roomId: bullet.roomId,
      facing: bullet.direction,
    });
  }
  for (const football of entry.footballs ?? entry.room.footballs ?? []) {
    pushSprite(sprites, {
      id: `football:${football.id}`,
      kind: 'football',
      position: localRenderPoint(football.position, placement),
      width: 0.58,
      height: 0.42,
      color: 0x8b4a24,
      visual: assets.getFootballTexture(football),
      roomId: football.roomId,
      facing: football.direction,
    });
  }
  for (const bomb of entry.bombs ?? entry.room.bombs ?? []) {
    pushSprite(sprites, {
      id: `bomb:${bomb.id}`,
      kind: 'bomb',
      position: localRenderPoint(bomb.position, placement),
      width: 0.66,
      height: 0.66,
      color: 0x20232a,
      visual: assets.getBombTexture(bomb),
      roomId: bomb.roomId,
    });
  }
}

function pushFurnitureSprites(
  sprites: RenderSprite[],
  room: RoomSnapshot,
  placement: RenderRoomPlacement,
  assets: WorldVisualAssetResolver,
): void {
  for (let y = 0; y < room.layout.length; y += 1) {
    const row = room.layout[y] ?? '';
    for (let x = 0; x < row.length; x += 1) {
      const variant = furnitureVariantForTile(row[x] ?? '');
      if (!variant) continue;
      pushSprite(sprites, {
        id: `furniture:${room.id}:${variant}:${x},${y}`,
        kind: 'furniture',
        position: localRenderPoint({ x, y }, placement),
        width: 0.8,
        height: 0.8,
        color: 0x8f5a67,
        visual: assets.getFurnitureTexture(variant),
        roomId: room.id,
      });
    }
  }
}

function pushSprite(
  sprites: RenderSprite[],
  options: {
    id: string;
    kind: RenderSprite['kind'];
    position: Vector2Like;
    width: number;
    height: number;
    color: number;
    visual: RenderSprite['visual'];
    roomId?: string;
    facing?: Vector2Like;
  },
): void {
  sprites.push({
    id: options.id,
    kind: options.kind,
    x: options.position.x + 0.5,
    y: options.position.y + 0.5,
    width: options.width,
    height: options.height,
    anchorY: 1,
    color: options.color,
    visual: options.visual,
    roomId: options.roomId,
    facing: options.facing,
  });
}

function furnitureVariantForTile(tile: string): FurnitureSpriteVariant | null {
  switch (tile) {
    case 'C':
      return 'couch';
    case 'K':
      return 'kitchen';
    case 'B':
      return 'bed';
    case 'P':
      return 'plant';
    case 'L':
      return 'lamp';
    default:
      return null;
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
      visual: assets.getNpcTexture(npc),
      roomId: room.id,
    });
  });
}
