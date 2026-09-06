import type { Vector2Like } from '../../core/math.js';
import type { FirstPersonCamera } from './firstPersonTypes.js';

const TAU = Math.PI * 2;

export function directionToYaw(direction: Vector2Like): number {
  if (direction.x > 0) return 0;
  if (direction.y > 0) return Math.PI / 2;
  if (direction.x < 0) return Math.PI;
  return Math.PI * 1.5;
}

export function createCameraFromHead(head: Vector2Like, direction: Vector2Like): FirstPersonCamera {
  return {
    x: head.x + 0.5,
    y: head.y + 0.5,
    yaw: directionToYaw(direction),
  };
}

export function approachCamera(
  current: FirstPersonCamera,
  target: FirstPersonCamera,
  deltaMs: number,
): FirstPersonCamera {
  const moveAlpha = clamp01(deltaMs / 95);
  const turnAlpha = clamp01(deltaMs / 120);
  return {
    x: lerp(current.x, target.x, moveAlpha),
    y: lerp(current.y, target.y, moveAlpha),
    yaw: current.yaw + shortestAngleDelta(current.yaw, target.yaw) * turnAlpha,
  };
}

export function shortestAngleDelta(from: number, to: number): number {
  return ((((to - from) % TAU) + Math.PI * 3) % TAU) - Math.PI;
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
