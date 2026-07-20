import { describe, expect, it } from 'vitest';
import { SnakeState } from '../snakeState.js';
import type { GridConfig, SnakeConfig } from '../../config/gameConfig.js';
import type { RoomSnapshot } from '../../world/types.js';

const grid: GridConfig = { cols: 12, rows: 10, cell: 16 };
const snakeConfig: SnakeConfig = {
  initialBody: [
    { x: 3, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 4 },
  ],
  initialDirection: { x: 1, y: 0 },
  spawnBuffer: [],
};

const room: RoomSnapshot = {
  id: '0,0,0',
  layout: Array.from({ length: grid.rows }, () => '.'.repeat(grid.cols)),
  portals: [],
  biomeId: 'verdigris-basin',
  biomeTitle: 'Verdigris Basin',
  backgroundColor: 0,
  wallColor: 0,
  wallOutlineColor: 0,
};

const bossManager = {
  getPullFor: () => null,
  getVulnerableJasonNearby: () => null,
  getBossAtPosition: () => null,
} as any;

describe('SnakeState cave exit steering', () => {
  it('ignores buffered turns while the first cave-exit movement is locked', () => {
    const snake = new SnakeState(grid, snakeConfig, room.id);
    snake.flags['traversal.exitDirectionLockTicks'] = 1;
    snake.setDirection(0, 1);
    expect(snake.nextDirectionVector).toEqual({ x: 1, y: 0 });
    snake.forceDirection(0, -1);
    expect(snake.directionVector).toEqual({ x: 1, y: 0 });

    snake.flags['traversal.exitDirectionLockTicks'] = 0;
    snake.setDirection(0, 1);
    expect(snake.nextDirectionVector).toEqual({ x: 0, y: 1 });
  });

  it('commits one queued turn without moving and preserves the next buffered turn', () => {
    const snake = new SnakeState(grid, snakeConfig, room.id);
    const headBefore = { ...snake.head };
    snake.setDirection(0, 1);
    snake.setDirection(-1, 0);

    snake.commitQueuedDirectionWithoutMoving();

    expect(snake.head).toEqual(headBefore);
    expect(snake.directionVector).toEqual({ x: 0, y: 1 });
    expect(snake.nextDirectionVector).toEqual({ x: -1, y: 0 });
  });
});

describe('SnakeState disorientation', () => {
  it('applies lateral drift without mutating heading and expires', () => {
    const snake = new SnakeState(grid, snakeConfig, room.id);
    snake.flags['status.disorientedTicks'] = 2;
    snake.flags['status.disorientedDriftInterval'] = 2;
    snake.flags['status.disorientedStep'] = 1;

    const result = snake.step({
      getRoom: () => room,
      ensureApple: () => undefined,
      getBossManager: () =>
        ({
          getPullFor: () => null,
          getVulnerableJasonNearby: () => null,
          getBossAtPosition: () => null,
        }) as any,
    });

    expect(result.status).toBe('alive');
    expect(snake.directionVector).toEqual({ x: 1, y: 0 });
    expect(snake.nextDirectionVector).toEqual({ x: 1, y: 0 });
    expect(snake.head.x).toBe(4);
    expect(snake.head.y).not.toBe(4);
  });
});

describe('SnakeState swimming', () => {
  const waterRoom: RoomSnapshot = {
    ...room,
    layout: room.layout.map((row, y) => (y === 4 ? `${row.slice(0, 4)}~${row.slice(5)}` : row)),
  };

  it('kills the snake on water without swimming gear', () => {
    const snake = new SnakeState(grid, snakeConfig, waterRoom.id);

    const result = snake.step({
      getRoom: () => waterRoom,
      ensureApple: () => undefined,
      getBossManager: () => bossManager,
    });

    expect(result.status).toBe('dead');
    expect(result.reason).toBe('water');
    expect(snake.flags['ui.swimSplash']).toBeUndefined();
  });

  it('allows swimming gear to cross water and emits splash juice data', () => {
    const snake = new SnakeState(grid, snakeConfig, waterRoom.id);
    snake.flags['equipment.swimmingEnabled'] = true;

    const result = snake.step({
      getRoom: () => waterRoom,
      ensureApple: () => undefined,
      getBossManager: () => bossManager,
    });

    expect(result.status).toBe('alive');
    expect(snake.head).toEqual({ x: 4, y: 4 });
    expect(snake.flags['ui.swimSplash']).toMatchObject({
      x: 4,
      y: 4,
      roomId: waterRoom.id,
      localX: 4,
      localY: 4,
    });
  });
});

describe('SnakeState portals', () => {
  it('lands on explicit portal coordinates for non-coordinate room ids', () => {
    const sourceRoom: RoomSnapshot = {
      ...room,
      portals: [
        {
          x: 4,
          y: 4,
          destRoomId: 'building:test-room',
          destX: 6,
          destY: 7,
        },
      ],
    };
    const interiorRoom: RoomSnapshot = {
      ...room,
      id: 'building:test-room',
      portals: [],
    };
    const snake = new SnakeState(grid, snakeConfig, sourceRoom.id);

    const result = snake.step({
      getRoom: (roomId) => (roomId === interiorRoom.id ? interiorRoom : sourceRoom),
      ensureApple: () => undefined,
      getBossManager: () =>
        ({
          getPullFor: () => null,
          getVulnerableJasonNearby: () => null,
          getBossAtPosition: () => null,
        }) as any,
    });

    expect(result.status).toBe('alive');
    expect(snake.currentRoomId).toBe(interiorRoom.id);
    expect(snake.head).toEqual({ x: 6, y: 7 });
    expect(snake.bodySegments.every((segment) => segment.x === 6 && segment.y === 7)).toBe(true);
    expect(Number.isFinite(snake.head.x)).toBe(true);
    expect(Number.isFinite(snake.head.y)).toBe(true);
  });

  it('repairs an invalid snake body inside non-coordinate rooms', () => {
    const interiorRoom: RoomSnapshot = {
      ...room,
      id: 'layer:townInterior:test-town:thievesGuild',
      layer: {
        id: 'layer:townInterior:test-town:thievesGuild',
        kind: 'townInterior',
        parentRoomId: '0,0,0',
        entranceId: 'test-entrance',
        templateId: 'thievesGuild',
        seed: 'test',
        state: 'available',
        spawn: { x: 6, y: 7 },
        exit: { x: 6, y: 8 },
        returnPosition: { x: 4, y: 4 },
        zones: [{ id: 'test-zone', templateId: 'thievesGuild', localCoord: { x: 0, y: 0 } }],
        boundaryMode: 'solidWalls',
      },
    };
    const snake = new SnakeState(grid, snakeConfig, interiorRoom.id);
    snake.restoreFromSave(
      [
        { x: Number.NaN, y: Number.NaN },
        { x: Number.NaN, y: Number.NaN },
      ],
      { x: 1, y: 0 },
      interiorRoom.id,
      2,
    );

    const result = snake.step({
      getRoom: () => interiorRoom,
      ensureApple: () => undefined,
      getBossManager: () =>
        ({
          getPullFor: () => null,
          getVulnerableJasonNearby: () => null,
          getBossAtPosition: () => null,
        }) as any,
    });

    expect(result.status).toBe('alive');
    expect(Number.isFinite(snake.head.x)).toBe(true);
    expect(Number.isFinite(snake.head.y)).toBe(true);
    expect(snake.currentRoomId).toBe(interiorRoom.id);
  });

  it('uses layer metadata for solid local-room boundaries', () => {
    const layerRoom: RoomSnapshot = {
      ...room,
      id: 'layer:townInterior:test-town:thievesGuild',
      layer: {
        id: 'layer:townInterior:test-town:thievesGuild',
        kind: 'townInterior',
        parentRoomId: '0,0,0',
        entranceId: 'test-entrance',
        templateId: 'thievesGuild',
        seed: 'test',
        state: 'available',
        spawn: { x: 1, y: 4 },
        exit: { x: 6, y: 8 },
        returnPosition: { x: 4, y: 4 },
        zones: [{ id: 'test-zone', templateId: 'thievesGuild', localCoord: { x: 0, y: 0 } }],
        boundaryMode: 'solidWalls',
      },
    };
    const snake = new SnakeState(grid, snakeConfig, layerRoom.id);
    snake.restoreFromSave(
      [
        { x: 0, y: 4 },
        { x: 1, y: 4 },
      ],
      { x: -1, y: 0 },
      layerRoom.id,
      2,
    );

    const result = snake.step({
      getRoom: () => layerRoom,
      ensureApple: () => undefined,
      getBossManager: () =>
        ({
          getPullFor: () => null,
          getBossAtPosition: () => null,
        }) as any,
    });

    expect(result.status).toBe('dead');
    expect(result.reason).toBe('wall');
    expect(snake.currentRoomId).toBe(layerRoom.id);
  });
});
