import { describe, expect, it } from 'vitest';
import type { ClientRoomSnapshot } from '../../session/GameSnapshot.js';
import type { RoomSnapshot } from '../../world/types.js';
import {
  createFirstPersonWorldView,
  normalizeFirstPersonRoomPoint,
} from './firstPersonWorldView.js';

const grid = { cols: 32, rows: 24, cell: 24 };

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
    const world = createFirstPersonWorldView({
      room,
      grid,
      snakeBody: [
        { x: 37, y: 1 },
        { x: 36, y: 1 },
      ],
      apple: room.apples,
    });

    expect(normalizeFirstPersonRoomPoint({ x: 37, y: 1 }, '1,0,0', grid)).toEqual({
      x: 5,
      y: 1,
    });
    expect(world.getCell(5, 1)?.material.occludesVision).toBe(true);
    expect(world.getBillboards()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'snake-body:1', x: 4.5, y: 1.5 }),
        expect.objectContaining({ id: 'apple:10,8', x: 10.5, y: 8.5 }),
        expect.objectContaining({ id: 'enemy:enemy-1:0', x: 12.5, y: 8.5 }),
      ]),
    );
  });

  it('includes runtime actor-backed npcs as first-person billboards', () => {
    const room = createRoomSnapshot('0,0,0', [
      '................................',
      '................................',
    ]);
    const world = createFirstPersonWorldView({
      room,
      grid,
      snakeBody: [{ x: 2, y: 1 }],
      runtimeNpcs: [{ id: 'town:actor:pickpocket-target', x: 6, y: 1 }],
      textureKeys: { npc: 'npc-texture' },
    });

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
