import { describe, expect, it } from 'vitest';
import type { ClientRoomSnapshot } from '../../session/GameSnapshot.js';
import type { Boss } from '../../systems/boss.js';
import type { RoomSnapshot } from '../../world/types.js';
import { createFirstPersonSpatialView } from './renderSceneSpatialIndex.js';
import { buildWorldPresentationScene } from './worldPresentationBuilder.js';
import type { WorldVisualAssetResolver } from './worldVisualAssets.js';

const grid = { cols: 32, rows: 24, cell: 24 };

function createAssets(): WorldVisualAssetResolver {
  const visual = { defaultTextureKey: 'test', firstPersonTextureKey: 'test' };
  return {
    getSnakeTexture: () => visual,
    getAppleTexture: () => visual,
    getEnemyTexture: () => visual,
    getNpcTexture: () => visual,
    getAnimalTexture: () => visual,
    getVegetationTexture: () => visual,
    getFurnitureTexture: () => visual,
    getPowerupTexture: () => visual,
    getProjectileTexture: () => visual,
    getBombTexture: () => visual,
    getFootballTexture: () => visual,
    getTreasureTexture: () => visual,
    getAlchemyStationTexture: () => visual,
  };
}

function createRoomSnapshot(id: string): ClientRoomSnapshot {
  const layout = Array.from({ length: grid.rows }, () => '.'.repeat(grid.cols));
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
  };
}

describe('boss world presentation', () => {
  it('normalizes global boss cells and makes the boss huge in first person', () => {
    const room = createRoomSnapshot('1,0,0');
    const boss: Boss = {
      id: 'boss-jason-test',
      name: 'Jason Statham',
      kind: 'jason-statham',
      body: [
        { x: 40, y: 8 },
        { x: 39, y: 8 },
        { x: 41, y: 8 },
      ],
      health: 100,
      maxHealth: 100,
      roomId: room.id,
      direction: { x: 1, y: 0 },
      jasonPhase: 'attacking',
    };
    room.bosses = [boss];

    const scene = buildWorldPresentationScene({
      rooms: [{ room }],
      currentRoomId: room.id,
      grid,
      snakeBody: [{ x: 32, y: 2 }],
      direction: { x: 1, y: 0 },
      assets: createAssets(),
    });
    const bossSprites = scene.sprites.filter((sprite) => sprite.kind === 'boss');

    expect(bossSprites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'boss:boss-jason-test:0', x: 8.5, y: 8.5 }),
        expect.objectContaining({ id: 'boss:boss-jason-test:1', x: 7.5, y: 8.5 }),
        expect.objectContaining({ id: 'boss:boss-jason-test:2', x: 9.5, y: 8.5 }),
      ]),
    );

    const billboards = createFirstPersonSpatialView(scene, room.id)
      .getBillboards()
      .filter((billboard) => billboard.kind === 'boss');
    const head = billboards.find((billboard) => billboard.segmentIndex === 0);
    const body = billboards.find((billboard) => billboard.segmentIndex === 1);

    expect(billboards).toHaveLength(3);
    expect(head).toEqual(expect.objectContaining({ width: 2.35, height: 3.8, color: 0xcc0000 }));
    expect(body).toEqual(expect.objectContaining({ width: 1.4, height: 2.2 }));
  });

  it('keeps all three Freak You head cells oversized', () => {
    const room = createRoomSnapshot('0,0,0');
    const boss: Boss = {
      id: 'boss-freak-you-test',
      name: 'Freak You',
      kind: 'freak-you',
      body: [
        { x: 10, y: 7 },
        { x: 10, y: 8 },
        { x: 10, y: 9 },
        { x: 9, y: 8 },
      ],
      health: 1,
      maxHealth: 1,
      roomId: room.id,
      direction: { x: 1, y: 0 },
      headCenter: { x: 10, y: 8 },
    };
    room.bosses = [boss];

    const scene = buildWorldPresentationScene({
      rooms: [{ room }],
      currentRoomId: room.id,
      grid,
      snakeBody: [{ x: 2, y: 2 }],
      direction: { x: 1, y: 0 },
      assets: createAssets(),
    });
    const billboards = createFirstPersonSpatialView(scene, room.id)
      .getBillboards()
      .filter((billboard) => billboard.kind === 'boss');

    expect(billboards.slice(0, 3).every((billboard) => billboard.height === 2.8)).toBe(true);
    expect(billboards[3]).toEqual(expect.objectContaining({ width: 1.2, height: 2 }));
  });
});
