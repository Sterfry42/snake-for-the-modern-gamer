import { describe, expect, it } from 'vitest';
import { CAR_HEIGHT_TILES, CAR_WIDTH_TILES } from './car.js';
import {
  CAR_WALL_DAMAGE_SPEED,
  carForwardVector,
  getCarBounds,
  getCarCollisionCells,
  resolveCarRoomPosition,
  shouldDamageCarWallImpact,
  updateArcadeCarMotion,
} from './carPhysics.js';

describe('car physics helpers', () => {
  const grid = { cols: 60, rows: 34 };

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

    const near = resolveCarRoomPosition(
      { roomId: '0,0,0', x: 10, y: 1.75, angle: 0 },
      { roomId: '0,0,0', x: 10, y: 1.5, angle: 0 },
      grid,
    );
    expect(near.transitioned).toBe(false);
    expect(near.car.roomId).toBe('0,0,0');
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
});
