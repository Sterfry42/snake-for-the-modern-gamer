import { describe, expect, it } from 'vitest';
import { CAR_HEIGHT_TILES, CAR_WIDTH_TILES } from './car.js';
import {
  CAR_WALL_DAMAGE_SPEED,
  findNearestValidCarPose,
  carForwardVector,
  getInvalidCarCollisionCells,
  getCarBounds,
  getCarCollisionCells,
  resolveCarRoomPosition,
  shouldDamageCarWallImpact,
  updateArcadeCarMotion,
} from './carPhysics.js';

describe('car physics helpers', () => {
  const grid = { cols: 60, rows: 34 };

  function expectCellsInsideGrid(cells: readonly { x: number; y: number }[]): void {
    for (const cell of cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.x).toBeLessThan(grid.cols);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeLessThan(grid.rows);
    }
  }

  it('hands cars to neighboring coordinate rooms using the rotated hull', () => {
    const right = resolveCarRoomPosition(
      { roomId: '0,0,0', x: 57.35, y: 10, angle: Math.PI / 2 },
      { roomId: '0,0,0', x: 57.55, y: 10, angle: Math.PI / 2 },
      grid,
    );
    expect(right.transitioned).toBe(true);
    expect(right.car.roomId).toBe('1,0,0');
    expect(right.boundarySides).toEqual(['east']);
    expect(right.car.y).toBe(10);
    expect(getCarBounds(right.car).minX).toBeGreaterThanOrEqual(0);

    const up = resolveCarRoomPosition(
      { roomId: '0,0,0', x: 20, y: 0.25, angle: 0 },
      { roomId: '0,0,0', x: 20, y: -0.1, angle: 0 },
      grid,
    );
    expect(up.car.roomId).toBe('0,-1,0');
    expect(up.car.x).toBe(20);
    expect(getCarBounds(up.car).minY).toBeGreaterThanOrEqual(0);
  });

  it('crosses every cardinal seam without leaving an out-of-room hull', () => {
    const cases = [
      {
        current: { roomId: '0,0,0', x: 18, y: 0.2, angle: 0 },
        next: { roomId: '0,0,0', x: 18, y: -0.2, angle: 0 },
        roomId: '0,-1,0',
      },
      {
        current: { roomId: '0,0,0', x: 18, y: 30.8, angle: Math.PI },
        next: { roomId: '0,0,0', x: 18, y: 31.25, angle: Math.PI },
        roomId: '0,1,0',
      },
      {
        current: { roomId: '0,0,0', x: 57.25, y: 12, angle: Math.PI / 2 },
        next: { roomId: '0,0,0', x: 57.6, y: 12, angle: Math.PI / 2 },
        roomId: '1,0,0',
      },
      {
        current: { roomId: '0,0,0', x: 0.45, y: 12, angle: -Math.PI / 2 },
        next: { roomId: '0,0,0', x: 0.05, y: 12, angle: -Math.PI / 2 },
        roomId: '-1,0,0',
      },
    ];
    for (const testCase of cases) {
      const resolved = resolveCarRoomPosition(testCase.current, testCase.next, grid);
      const bounds = getCarBounds(resolved.car);
      expect(resolved.transitioned).toBe(true);
      expect(resolved.car.roomId).toBe(testCase.roomId);
      expect(bounds.minX).toBeGreaterThanOrEqual(-0.000001);
      expect(bounds.minY).toBeGreaterThanOrEqual(-0.000001);
      expect(bounds.maxX).toBeLessThanOrEqual(grid.cols + 0.000001);
      expect(bounds.maxY).toBeLessThanOrEqual(grid.rows + 0.000001);
      expectCellsInsideGrid(resolved.occupiedCellsAfter);
    }
  });

  it('supports diagonal seam crossings and does not transition near-but-inside poses', () => {
    const diagonal = resolveCarRoomPosition(
      { roomId: '0,0,0', x: 57.2, y: -0.2, angle: Math.PI / 4 },
      { roomId: '0,0,0', x: 57.65, y: -0.65, angle: Math.PI / 4 },
      grid,
    );
    expect(diagonal.transitioned).toBe(true);
    expect(diagonal.car.roomId).toBe('1,-1,0');
    expect(diagonal.boundarySides).toEqual(['east', 'north']);
    expectCellsInsideGrid(diagonal.occupiedCellsAfter);

    const near = resolveCarRoomPosition(
      { roomId: '0,0,0', x: 10, y: 1.75, angle: 0 },
      { roomId: '0,0,0', x: 10, y: 1.5, angle: 0 },
      grid,
    );
    expect(near.transitioned).toBe(false);
    expect(near.car.roomId).toBe('0,0,0');
  });

  it('keeps rotated transition destination cells inside the destination room', () => {
    const cases = [
      { x: 19, y: 0.037, angle: 0.43, dx: 0, dy: -0.7, roomId: '1,-1,0' },
      { x: 19, y: 30.7, angle: 0.75, dx: 0, dy: 0.7, roomId: '1,1,0' },
      { x: 57.6, y: 12, angle: 1.16, dx: 0.8, dy: 0, roomId: '2,0,0' },
      { x: 0.2, y: 12, angle: 2.14, dx: -0.8, dy: 0, roomId: '0,0,0' },
      { x: 57.7, y: 0.2, angle: 0.75, dx: 0.9, dy: -0.9, roomId: '2,-1,0' },
    ];
    for (const testCase of cases) {
      const current = {
        roomId: '1,0,0',
        x: testCase.x,
        y: testCase.y,
        angle: testCase.angle,
      };
      const resolved = resolveCarRoomPosition(
        current,
        {
          ...current,
          x: current.x + testCase.dx,
          y: current.y + testCase.dy,
        },
        grid,
      );
      expect(resolved.transitioned).toBe(true);
      expect(resolved.car.roomId).toBe(testCase.roomId);
      expect(getInvalidCarCollisionCells(resolved.car, grid)).toEqual([]);
      expectCellsInsideGrid(resolved.occupiedCellsAfter);
    }
  });

  it('does not include impossible cells for exact destination edge contact', () => {
    const resolved = resolveCarRoomPosition(
      { roomId: '0,0,0', x: 19, y: 0.037, angle: 0.43 },
      { roomId: '0,0,0', x: 19, y: -0.7, angle: 0.43 },
      grid,
    );
    expect(resolved.transitioned).toBe(true);
    expect(resolved.occupiedCellsAfter).not.toContainEqual({ x: 19, y: grid.rows });
    expect(getInvalidCarCollisionCells(resolved.car, grid)).toEqual([]);
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

  it('smooths keyboard steering toward the requested arcade input', () => {
    const initial = { roomId: '0,0,0', x: 10, y: 10, angle: 0, speed: 5 };
    const first = updateArcadeCarMotion(
      initial,
      { throttle: 0, steering: 0, steeringVelocity: 0 },
      { throttle: 1, steering: 1 },
      1 / 60,
    );
    expect(first.controls.steering).toBeGreaterThan(0);
    expect(first.controls.steering).toBeLessThan(1);
    expect(first.car.angle).toBeGreaterThan(0);
    const released = updateArcadeCarMotion(
      first.car,
      first.controls,
      { throttle: 0, steering: 0 },
      1 / 60,
    );
    expect(released.controls.steering).toBeLessThan(first.controls.steering);
  });

  it('uses wall damage cooldown without depending on entity run-over checks', () => {
    expect(shouldDamageCarWallImpact(CAR_WALL_DAMAGE_SPEED + 0.1, 1000, 0)).toBe(true);
    expect(shouldDamageCarWallImpact(CAR_WALL_DAMAGE_SPEED - 0.1, 2000, 0)).toBe(false);
    expect(shouldDamageCarWallImpact(CAR_WALL_DAMAGE_SPEED + 0.1, 1200, 1000)).toBe(false);
    expect(shouldDamageCarWallImpact(CAR_WALL_DAMAGE_SPEED + 0.1, 1700, 1000)).toBe(true);
  });

  it('repairs invalid parked poses to the nearest nonblocking footprint', () => {
    const blocked = new Set(['10,10', '11,10', '10,11', '11,11']);
    const repaired = findNearestValidCarPose(
      { roomId: '0,0,0', x: 10, y: 10, angle: 0 },
      grid,
      (cell) => blocked.has(`${cell.x},${cell.y}`),
      { maxRadius: 3, step: 0.5 },
    );
    expect(repaired).not.toBeNull();
    expect(repaired!.angle).toBe(0);
    expect(getInvalidCarCollisionCells(repaired!, grid)).toEqual([]);
    expect(getCarCollisionCells(repaired!).some((cell) => blocked.has(`${cell.x},${cell.y}`))).toBe(
      false,
    );
  });
});
