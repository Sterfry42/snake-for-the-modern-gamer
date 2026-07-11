import { describe, expect, it } from 'vitest';
import { AppleService } from '../appleService.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import type { RoomSnapshot } from '../../world/types.js';
import { createDefaultSpecialStats } from '../../stats/specialStats.js';

function caveRoom(roomId = 'cave:3,0,0:0'): RoomSnapshot {
  const { rows, cols } = defaultGameConfig.grid;
  return {
    id: roomId,
    layout: Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) =>
        x === 0 || y === 0 || x === cols - 1 || y === rows - 1 ? '#' : '.',
      ).join(''),
    ),
    portals: [],
    biomeId: 'verdigris-basin',
    biomeTitle: 'Cave',
    backgroundColor: 0,
    wallColor: 0,
    wallOutlineColor: 0,
    cave: {
      id: roomId,
      parentRoomId: '3,0,0',
      templateId: 'skittishAppleRush',
      zoneId: '0,0,0',
      exit: { x: 16, y: 22 },
      spawn: { x: 16, y: 21 },
      boundaryMode: 'solidWalls',
      state: 'active',
    },
  };
}

describe('cave apples', () => {
  it('can keep multiple skittish apples in one cave room', () => {
    const room = caveRoom();
    const rooms = new Map([[room.id, room]]);
    const world = {
      getRoom: (roomId: string) => {
        const found = rooms.get(roomId);
        if (!found) {
          throw new Error(`Unexpected room request: ${roomId}`);
        }
        return found;
      },
      setApple: (roomId: string, position?: { x: number; y: number }) => {
        const found = rooms.get(roomId);
        if (!found) {
          throw new Error(`Unexpected apple room: ${roomId}`);
        }
        found.apple = position;
      },
      hasTreasureAt: () => false,
    };
    const apples = new AppleService(
      defaultGameConfig.apples,
      defaultGameConfig.grid,
      world as never,
      () => 0,
    );

    apples.placeApple(room.id, { x: 5, y: 5 }, 'skittish', [], true);
    apples.placeApple(room.id, { x: 8, y: 5 }, 'skittish', [], true);
    apples.placeApple(room.id, { x: 11, y: 5 }, 'skittish', [], true);

    expect(apples.getSnapshots(room.id)).toHaveLength(3);
    expect(room.apples).toEqual([
      { x: 5, y: 5 },
      { x: 8, y: 5 },
      { x: 11, y: 5 },
    ]);

    const result = apples.handleConsumption(room.id, { x: 1, y: 0 }, false, { x: 8, y: 5 });

    expect(result.changed).toBe(true);
    expect(apples.getSnapshots(room.id).map((apple) => apple.position)).toEqual([
      { x: 5, y: 5 },
      { x: 11, y: 5 },
    ]);
    expect(room.apples).toEqual([
      { x: 5, y: 5 },
      { x: 11, y: 5 },
    ]);
  });

  it('moves skittish apples using cave-local coordinates', () => {
    const room = caveRoom();
    const rooms = new Map([[room.id, room]]);
    const requestedRoomIds: string[] = [];
    const world = {
      getRoom: (roomId: string) => {
        requestedRoomIds.push(roomId);
        const found = rooms.get(roomId);
        if (!found) {
          throw new Error(`Unexpected room request: ${roomId}`);
        }
        return found;
      },
      setApple: (roomId: string, position?: { x: number; y: number }) => {
        const found = rooms.get(roomId);
        if (!found) {
          throw new Error(`Unexpected apple room: ${roomId}`);
        }
        found.apple = position;
      },
      hasTreasureAt: () => false,
    };
    const apples = new AppleService(
      defaultGameConfig.apples,
      defaultGameConfig.grid,
      world as never,
      () => 0,
    );

    apples.placeApple(room.id, { x: 5, y: 5 }, 'skittish');
    const affected = apples.moveApples([{ x: 5, y: 8 }]);
    const snapshot = apples.getSnapshot(room.id);

    expect([...affected]).toEqual([room.id]);
    expect(snapshot?.position).toEqual({ x: 5, y: 4 });
    expect(requestedRoomIds.every((id) => id === room.id)).toBe(true);
  });
});

describe('town perimeter apples', () => {
  it('allows normal apples in town exterior wall rooms', () => {
    const room: RoomSnapshot = {
      id: '4,4,0',
      layout: Array.from({ length: defaultGameConfig.grid.rows }, () =>
        '.'.repeat(defaultGameConfig.grid.cols),
      ),
      portals: [],
      biomeId: 'verdigris-basin',
      biomeTitle: 'Verdigris Basin',
      backgroundColor: 0,
      wallColor: 0,
      wallOutlineColor: 0,
      townPerimeter: {
        townId: 'town:test',
        sideFacingTown: 'north',
        sidesFacingTown: ['north'],
        cornersFacingTown: [],
      },
    };
    const world = {
      getRoom: () => room,
      setApple: (_roomId: string, position?: { x: number; y: number }) => {
        room.apple = position;
      },
      hasTreasureAt: () => false,
    };
    const apples = new AppleService(
      defaultGameConfig.apples,
      defaultGameConfig.grid,
      world as never,
      () => 0,
    );

    const result = apples.ensureApple(room.id, [], 0);

    expect(result.changed).toBe(true);
    expect(result.snapshot?.roomId).toBe(room.id);
    expect(room.apple).toBeDefined();
  });
});

describe('SPECIAL apple weighting', () => {
  it('uses SPECIAL-aware weights for runtime apple spawning', () => {
    const room: RoomSnapshot = {
      id: '8,8,0',
      layout: Array.from({ length: defaultGameConfig.grid.rows }, () =>
        '.'.repeat(defaultGameConfig.grid.cols),
      ),
      portals: [],
      biomeId: 'verdigris-basin',
      biomeTitle: 'Verdigris Basin',
      backgroundColor: 0,
      wallColor: 0,
      wallOutlineColor: 0,
    };
    const world = {
      getRoom: () => room,
      setApple: (_roomId: string, position?: { x: number; y: number }) => {
        room.apple = position;
      },
      hasTreasureAt: () => false,
    };
    const config = {
      ...defaultGameConfig.apples,
      types: defaultGameConfig.apples.types
        .filter((type) => type.id === 'normal' || type.id === 'gold')
        .map((type) => ({
          ...type,
          spawn: { ...type.spawn, base: type.id === 'normal' ? 100 : 10, scoreThreshold: 0 },
        })),
    };
    const luckyStats = { ...createDefaultSpecialStats(), luck: 10 };
    const apples = new AppleService(
      config,
      defaultGameConfig.grid,
      world as never,
      () => 0.88,
      () => luckyStats,
    );

    const result = apples.ensureApple(room.id, [], 0);

    expect(result.snapshot?.typeId).toBe('gold');
  });
});
