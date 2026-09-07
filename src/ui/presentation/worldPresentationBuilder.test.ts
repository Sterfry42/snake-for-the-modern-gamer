import { describe, expect, it } from 'vitest';
import type { ClientRoomSnapshot } from '../../session/GameSnapshot.js';
import type { EnemyInstance } from '../../systems/enemies.js';
import type { RoomSnapshot } from '../../world/types.js';
import { createFirstPersonSpatialView } from './renderSceneSpatialIndex.js';
import { buildWorldPresentationScene } from './worldPresentationBuilder.js';
import type { WorldVisualAssetResolver } from './worldVisualAssets.js';

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
    getNpcTexture: () => ({ defaultTextureKey: 'npc', firstPersonTextureKey: 'npc' }),
    getAnimalTexture: () => ({ defaultTextureKey: 'animal', firstPersonTextureKey: 'animal' }),
    getVegetationTexture: () => ({
      defaultTextureKey: 'vegetation',
      firstPersonTextureKey: 'vegetation',
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
  };
}

describe('world presentation builder', () => {
  it('uses one apple sprite identity for every projection', () => {
    const room = createRoomSnapshot('0,0,0', ['................................']);
    const scene = buildWorldPresentationScene({
      rooms: [{ room, apple: room.apples }],
      currentRoomId: room.id,
      grid,
      snakeBody: [{ x: 2, y: 0 }],
      direction: { x: 1, y: 0 },
      assets: createAssets(),
    });
    const apple = scene.sprites.find((sprite) => sprite.kind === 'apple');
    const firstPersonApple = createFirstPersonSpatialView(scene, room.id)
      .getBillboards()
      .find((billboard) => billboard.kind === 'apple');

    expect(apple?.visual.defaultTextureKey).toBe('apple-normal');
    expect(firstPersonApple?.textureKey).toBe(apple?.visual.firstPersonTextureKey);
  });

  it('keeps cross-room snake segments in coherent render coordinates', () => {
    const room = createRoomSnapshot('1,0,0', ['................................']);
    const scene = buildWorldPresentationScene({
      rooms: [{ room }],
      currentRoomId: room.id,
      grid,
      snakeBody: [
        { x: 32, y: 2 },
        { x: 31, y: 2 },
      ],
      direction: { x: 1, y: 0 },
      assets: createAssets(),
    });

    expect(scene.sprites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'snake:0', x: 0.5, y: 2.5 }),
        expect.objectContaining({ id: 'snake:1', x: -0.5, y: 2.5 }),
      ]),
    );
  });

  it('keeps room-authored actors and objects in local room coordinates', () => {
    const room = createRoomSnapshot('1,0,0', ['................................']);
    const enemy: EnemyInstance = {
      id: 'enemy-local',
      roomId: room.id,
      position: { x: 12, y: 8 },
      fireCooldown: 0,
      moveCooldown: 0,
      aimDirection: { x: -1, y: 0 },
      flashTicks: 0,
    };
    const scene = buildWorldPresentationScene({
      rooms: [{ room, apple: room.apples, enemies: [enemy] }],
      currentRoomId: room.id,
      grid,
      snakeBody: [{ x: 32, y: 2 }],
      direction: { x: 1, y: 0 },
      assets: createAssets(),
    });

    expect(scene.sprites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'apple:1,0,0:10,8', x: 10.5, y: 8.5 }),
        expect.objectContaining({ id: 'enemy:enemy-local:0', x: 12.5, y: 8.5 }),
      ]),
    );
  });

  it('keeps snake topology for projection-specific body visibility', () => {
    const room = createRoomSnapshot('0,0,0', ['................................']);
    const scene = buildWorldPresentationScene({
      rooms: [{ room }],
      currentRoomId: room.id,
      grid,
      snakeBody: [
        { x: 5, y: 1 },
        { x: 4, y: 1 },
        { x: 3, y: 1 },
        { x: 8, y: 1 },
      ],
      direction: { x: 1, y: 0 },
      assets: createAssets(),
    });
    const body = createFirstPersonSpatialView(scene, room.id)
      .getBillboards()
      .filter((billboard) => billboard.kind === 'snake-body');

    expect(body.map((billboard) => billboard.segmentIndex)).toEqual([1, 2, 3]);
  });
});
