import { describe, expect, it } from 'vitest';
import {
  createCameraTransition,
  interpolateCamera,
  sampleCameraTransition,
} from './firstPersonCamera.js';

describe('first-person camera interpolation', () => {
  it('finishes a camera step exactly instead of asymptotically chasing the target', () => {
    const transition = createCameraTransition(
      { x: 0.5, y: 0.5, yaw: 0 },
      { x: 1.5, y: 0.5, yaw: 0 },
      1_000,
      100,
    );

    expect(sampleCameraTransition(transition, 1_000).x).toBe(0.5);
    expect(sampleCameraTransition(transition, 1_050).x).toBe(1);
    expect(sampleCameraTransition(transition, 1_100).x).toBe(1.5);
    expect(sampleCameraTransition(transition, 10_000).x).toBe(1.5);
  });

  it('uses the same finite interpolation at high Snake speeds', () => {
    let endpoint = { x: 0.5, y: 0.5, yaw: 0 };
    let startedAtMs = 0;

    for (let step = 1; step <= 12; step += 1) {
      const next = { x: step + 0.5, y: 0.5, yaw: 0 };
      const transition = createCameraTransition(endpoint, next, startedAtMs, 20);
      endpoint = sampleCameraTransition(transition, startedAtMs + 20);

      expect(endpoint.x).toBe(next.x);
      startedAtMs += 20;
    }
  });

  it('turns across the shortest yaw path and reaches the exact target heading', () => {
    const from = { x: 0.5, y: 0.5, yaw: Math.PI * 1.5 };
    const to = { x: 1.5, y: 0.5, yaw: 0 };

    const halfway = interpolateCamera(from, to, 0.5);
    const finished = interpolateCamera(from, to, 1);

    expect(halfway.yaw).toBeCloseTo(Math.PI * 1.75);
    expect(Math.cos(finished.yaw)).toBeCloseTo(1);
    expect(Math.sin(finished.yaw)).toBeCloseTo(0);
  });

  it('clamps interpolation phase so a delayed render cannot accumulate lag', () => {
    const transition = createCameraTransition(
      { x: 4.5, y: 8.5, yaw: 0 },
      { x: 5.5, y: 8.5, yaw: 0 },
      500,
      50,
    );

    expect(sampleCameraTransition(transition, 800)).toEqual({ x: 5.5, y: 8.5, yaw: 0 });
  });
});
