import type { AppleSnapshot } from '../../apples/types.js';
import type { AnimalInstance } from '../../animals/types.js';
import type { GridConfig } from '../../config/gameConfig.js';
import type { Vector2Like } from '../../core/math.js';
import type { BombInstance, FootballInstance } from '../../game/snakeGame.js';
import type { PlacedStructure } from '../../building/constructionState.js';
import type { ClientRoomSnapshot } from '../../session/GameSnapshot.js';
import type { Boss } from '../../systems/boss.js';
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

const FREAKER_RAINBOW = [0xff4fd8, 0xff7b54, 0xffd166, 0x6eff95, 0x5fd7ff, 0xb46cff] as const;

export interface PresentationRoomInput {
  room: ClientRoomSnapshot;
  offset?: Vector2Like;
  apple?: AppleSnapshot | null;
  enemies?: readonly EnemyInstance[];
  followers?: readonly EnemyInstance[];
  bosses?: readonly Boss[];
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
    return buildRenderRoom(room, placement, placedStructuresForRoom(entry.room.structures));
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
    pushRoomSprites(sprites, entry, placement, options.grid, options.assets);
  }
  return { rooms, sprites, effects: [], atmosphere: options.atmosphere };
}

function buildRenderRoom(
  room: RoomSnapshot,
  placement: RenderRoomPlacement,
  structures: readonly PlacedStructure[],
): RenderRoom {
  const solidStructureCells = new Map<string, string>();
  for (const structure of structures) {
    for (const cell of structure.cells) {
      if (cell.solid) {
        solidStructureCells.set(`${cell.localX},${cell.localY}`, cell.tile);
      }
    }
  }
  const tiles = room.layout.flatMap((row, y) =>
    [...row].map((tile, x) => {
      const effectiveTile = solidStructureCells.get(`${x},${y}`) ?? tile;
      return resolveRenderTile(room, effectiveTile, x + placement.offsetX, y + placement.offsetY);
    }),
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
  grid: GridConfig,
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
  pushBossSprites(sprites, entry, placement, grid);
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
  pushPlacedStructureSprites(sprites, entry, placement);
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

function pushPlacedStructureSprites(
  sprites: RenderSprite[],
  entry: PresentationRoomInput,
  placement: RenderRoomPlacement,
): void {
  for (const structure of placedStructuresForRoom(entry.room.structures)) {
    for (const cell of structure.cells) {
      if (cell.solid) continue;
      const position = localRenderPoint({ x: cell.localX, y: cell.localY }, placement);
      sprites.push({
        id: `structure:${structure.id}:${cell.kind}:${cell.localX},${cell.localY}`,
        kind: 'prop',
        x: position.x + 0.5,
        y: position.y + 0.5,
        width: cell.kind === 'door' ? 0.9 : 0.72,
        height: cell.kind === 'door' ? 0.35 : 0.82,
        anchorY: 1,
        color: cell.kind === 'light' ? 0xffdf7e : cell.kind === 'door' ? 0x9a5b2e : 0x8f5a67,
        visual: { defaultTextureKey: '' },
        roomId: entry.room.id,
      });
    }
  }
}

function placedStructuresForRoom(value: unknown): readonly PlacedStructure[] {
  return Array.isArray(value) ? (value as PlacedStructure[]) : [];
}

function pushBossSprites(
  sprites: RenderSprite[],
  entry: PresentationRoomInput,
  placement: RenderRoomPlacement,
  grid: GridConfig,
): void {
  for (const boss of entry.bosses ?? entry.room.bosses ?? []) {
    boss.body.forEach((segment, index) => {
      const position = normalizeRenderPoint(segment, placement, grid);
      if (
        position.x < placement.offsetX ||
        position.x >= placement.offsetX + placement.width ||
        position.y < placement.offsetY ||
        position.y >= placement.offsetY + placement.height
      ) {
        return;
      }

      const isHead = boss.kind === 'freak-you' ? index < 3 : index === 0;
      const size = bossFirstPersonSize(boss, isHead);
      const color = bossPresentationColor(boss, index, isHead);
      sprites.push({
        id: `boss:${boss.id}:${index}`,
        kind: 'boss',
        x: position.x + 0.5,
        y: position.y + 0.5,
        width: 1,
        height: 1,
        anchorY: 1,
        color,
        // Bosses are still authored as colored multi-cell bodies in the top-down renderer.
        // First-person preserves that identity as giant old-school billboard slabs until
        // dedicated boss sprite recipes exist.
        visual: { defaultTextureKey: '' },
        firstPersonPresentation: {
          width: size.width,
          height: size.height,
          anchorY: 1,
          color,
        },
        roomId: entry.room.id,
        facing: boss.direction,
        segmentIndex: index,
      });
    });
  }
}

function bossFirstPersonSize(boss: Boss, isHead: boolean): { width: number; height: number } {
  if (boss.kind === 'freak-you') {
    return isHead ? { width: 1.55, height: 2.8 } : { width: 1.2, height: 2 };
  }
  if (!isHead) {
    return { width: 1.4, height: 2.2 };
  }
  switch (boss.kind) {
    case 'angel':
      return { width: 2.45, height: 4.2 };
    case 'jason-statham':
      return { width: 2.35, height: 3.8 };
    case 'freaker-dennis':
      return { width: 2.25, height: 3.7 };
    default:
      return { width: 2.15, height: 3.5 };
  }
}

function bossPresentationColor(boss: Boss, index: number, isHead: boolean): number {
  if (boss.kind === 'angel') return 0xfff2a8;
  if (boss.kind === 'freak-you') return isHead ? 0xff7a8f : 0xff2d55;
  if (boss.kind === 'freaker-dennis' && boss.rainbowPalette) {
    return FREAKER_RAINBOW[index % FREAKER_RAINBOW.length] ?? 0xff00ff;
  }
  if (boss.kind === 'jason-statham') {
    switch (boss.jasonPhase) {
      case 'vulnerable':
        return 0xff2d2d;
      case 'attacking':
        return 0xcc0000;
      case 'calm':
        return 0x881111;
      case 'defeated':
        return 0x333333;
      default:
        return 0xaa1111;
    }
  }
  return boss.kind === 'revenant' ? 0x7f39b8 : 0xff00ff;
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
