import { describe, expect, it } from 'vitest';
import type { ClientRoomSnapshot } from '../../session/GameSnapshot.js';
import type { RoomSnapshot } from '../../world/types.js';
import { normalizeRenderPoint } from '../presentation/renderCoordinates.js';
import { createFirstPersonSpatialView } from '../presentation/renderSceneSpatialIndex.js';
import { buildWorldPresentationScene } from '../presentation/worldPresentationBuilder.js';
import type { WorldVisualAssetResolver } from '../presentation/worldVisualAssets.js';

const grid = { cols: 32, rows: 24, cell: 24 };

function createAssets(): WorldVisualAssetResolver {
  return {
    getSnakeTexture: (segmentIndex) => ({
      defaultTextureKey: `snake-${segmentIndex}`,
      firstPersonTextureKey: `snake-${segmentIndex}`,
    }),
    getAppleTexture: () => ({
      defaultTextureKey: 'apple-normal',
      firstPersonTextureKey: 'apple-normal',
    }),
    getEnemyTexture: () => ({ defaultTextureKey: 'enemy', firstPersonTextureKey: 'enemy' }),
    getNpcTexture: () => ({
      defaultTextureKey: 'npc-texture',
      firstPersonTextureKey: 'npc-texture',
    }),
    getAnimalTexture: () => ({ defaultTextureKey: 'animal', firstPersonTextureKey: 'animal' }),
    getVegetationTexture: () => ({
      defaultTextureKey: 'vegetation',
      firstPersonTextureKey: 'vegetation',
    }),
    getFurnitureTexture: (variant) => ({
      defaultTextureKey: `furniture-${variant}`,
      firstPersonTextureKey: `furniture-${variant}`,
    }),
    getPowerupTexture: (kind) => ({
      defaultTextureKey: `powerup-${kind}`,
      firstPersonTextureKey: `powerup-${kind}`,
    }),
    getProjectileTexture: () => ({
      defaultTextureKey: 'projectile',
      firstPersonTextureKey: 'projectile',
    }),
    getBombTexture: () => ({ defaultTextureKey: 'bomb', firstPersonTextureKey: 'bomb' }),
    getFootballTexture: () => ({
      defaultTextureKey: 'football',
      firstPersonTextureKey: 'football',
    }),
    getTreasureTexture: () => ({
      defaultTextureKey: 'treasure',
      firstPersonTextureKey: 'treasure',
    }),
    getAlchemyStationTexture: () => ({
      defaultTextureKey: 'alchemy',
      firstPersonTextureKey: 'alchemy',
    }),
  };
}

function createRoomSnapshot(id: string, layout: string[]): ClientRoomSnapshot {
  const room: RoomSnapshot = {
    id,
    layout,
    portals: [],
    biomeId: 'verdigris-basin',
    biomeTitle: 'Verdigris Basin',
    backgroundColor: 0x66aa66,
    wallColor: 0x335533,
    wallOutlineColor: 0x102010,
  };
  return {
    id,
    room,
    layout,
    biomeId: room.biomeId,
    biomeTitle: room.biomeTitle,
    backgroundColor: room.backgroundColor,
    wallColor: room.wallColor,
    wallOutlineColor: room.wallOutlineColor,
    apples: {
      roomId: id,
      position: { x: 10, y: 8 },
      typeId: 'normal',
      color: 0xff3333,
    },
    enemies: [
      {
        id: 'enemy-1',
        roomId: id,
        position: { x: 12, y: 8 },
        fireCooldown: 0,
        moveCooldown: 0,
        aimDirection: { x: -1, y: 0 },
        flashTicks: 0,
      },
    ],
  };
}

describe('first-person world view', () => {
  it('normalizes authoritative coordinate-room snake bodies into local render space', () => {
    const room = createRoomSnapshot('1,0,0', [
      '................................',
      '.....#..........................',
    ]);
    const placement = { roomId: room.id, offsetX: 0, offsetY: 0, width: 32, height: 2 };
    const scene = buildWorldPresentationScene({
      rooms: [{ room, apple: room.apples, enemies: room.enemies }],
      currentRoomId: room.id,
      grid,
      snakeBody: [
        { x: 37, y: 1 },
        { x: 36, y: 1 },
      ],
      direction: { x: 1, y: 0 },
      assets: createAssets(),
    });
    const world = createFirstPersonSpatialView(scene, room.id);

    expect(normalizeRenderPoint({ x: 37, y: 1 }, placement, grid)).toEqual({
      x: 5,
      y: 1,
    });
    expect(world.getCell(5, 1)?.material.occludesVision).toBe(true);
    expect(world.getBillboards()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'snake:1', x: 4.5, y: 1.5 }),
        expect.objectContaining({ id: 'apple:1,0,0:10,8', x: 10.5, y: 8.5 }),
        expect.objectContaining({ id: 'enemy:enemy-1:0', x: 12.5, y: 8.5 }),
      ]),
    );
  });

  it('includes runtime actor-backed npcs as first-person billboards', () => {
    const room = createRoomSnapshot('0,0,0', [
      '................................',
      '................................',
    ]);
    const scene = buildWorldPresentationScene({
      rooms: [{ room, runtimeNpcs: [{ id: 'town:actor:pickpocket-target', x: 6, y: 1 }] }],
      currentRoomId: room.id,
      grid,
      snakeBody: [{ x: 2, y: 1 }],
      direction: { x: 1, y: 0 },
      assets: createAssets(),
    });
    const world = createFirstPersonSpatialView(scene, room.id);

    expect(world.getBillboards()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'actor-npc:town:actor:pickpocket-target',
          kind: 'npc',
          x: 6.5,
          y: 1.5,
          textureKey: 'npc-texture',
        }),
      ]),
    );
  });
});
