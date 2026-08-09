import { describe, expect, it } from 'vitest';
import { CAR_HEIGHT_TILES, CAR_WIDTH_TILES } from './car.js';
import { carForwardVector, getCarCollisionCells, resolveCarRoomPosition } from './carPhysics.js';

describe('car physics helpers', () => {
  const grid = { cols: 60, rows: 34 };

  it('hands cars to neighboring coordinate rooms without leaving negative local positions', () => {
    const right = resolveCarRoomPosition(
      { roomId: '0,0,0', x: 58.5, y: 10, angle: Math.PI / 2 },
      { roomId: '0,0,0', x: 58.5 + CAR_WIDTH_TILES, y: 10, angle: Math.PI / 2 },
      grid,
    );
    expect(right.transitioned).toBe(true);
    expect(right.car.roomId).toBe('1,0,0');
    expect(right.car.x).toBe(0);
    expect(right.car.y).toBe(10);

    const up = resolveCarRoomPosition(
      { roomId: '0,0,0', x: 20, y: 0.25, angle: 0 },
      { roomId: '0,0,0', x: 20, y: -0.1, angle: 0 },
      grid,
    );
    expect(up.car.roomId).toBe('0,-1,0');
    expect(up.car.x).toBe(20);
    expect(up.car.y).toBe(grid.rows - CAR_HEIGHT_TILES);
  });

  it('keeps a traditional car footprint two wide and three tall when facing up', () => {
    expect(CAR_WIDTH_TILES).toBe(2);
    expect(CAR_HEIGHT_TILES).toBe(3);
    expect(carForwardVector(0)).toEqual({ x: 0, y: -1 });
    expect(getCarCollisionCells({ x: 10, y: 10, angle: 0 })).toEqual([
      { x: 10, y: 10 },
      { x: 11, y: 10 },
      { x: 10, y: 11 },
      { x: 11, y: 11 },
      { x: 10, y: 12 },
      { x: 11, y: 12 },
    ]);
  });

  it('uses rotated rectangle cells so diagonal object collisions cover swept corners', () => {
    const cells = getCarCollisionCells({ x: 10, y: 10, angle: Math.PI / 4 });
    expect(cells).toContainEqual({ x: 10, y: 10 });
    expect(cells).toContainEqual({ x: 12, y: 11 });
    expect(cells).toContainEqual({ x: 9, y: 12 });
  });
});
