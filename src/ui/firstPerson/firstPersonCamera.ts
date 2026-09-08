import type { Vector2Like } from '../../core/math.js';
import type { FirstPersonCamera } from './firstPersonTypes.js';

const TAU = Math.PI * 2;
const CAMERA_EPSILON = 0.0001;

export interface FirstPersonCameraTransition {
  from: FirstPersonCamera;
  to: FirstPersonCamera;
  startedAtMs: number;
  durationMs: number;
}

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

export function createCameraTransition(
  from: FirstPersonCamera,
  to: FirstPersonCamera,
  startedAtMs: number,
  durationMs: number,
): FirstPersonCameraTransition {
  return {
    from: { ...from },
    to: { ...to },
    startedAtMs,
    durationMs: Math.max(1, durationMs),
  };
}

export function sampleCameraTransition(
  transition: FirstPersonCameraTransition,
  nowMs: number,
): FirstPersonCamera {
  const phase = clamp01((nowMs - transition.startedAtMs) / transition.durationMs);
  return interpolateCamera(transition.from, transition.to, phase);
}

export function interpolateCamera(
  from: FirstPersonCamera,
  to: FirstPersonCamera,
  phase: number,
): FirstPersonCamera {
  const t = clamp01(phase);
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    yaw: from.yaw + shortestAngleDelta(from.yaw, to.yaw) * t,
  };
}

export function isSameCameraTarget(a: FirstPersonCamera, b: FirstPersonCamera): boolean {
  return (
    Math.abs(a.x - b.x) <= CAMERA_EPSILON &&
    Math.abs(a.y - b.y) <= CAMERA_EPSILON &&
    Math.abs(shortestAngleDelta(a.yaw, b.yaw)) <= CAMERA_EPSILON
  );
}

export function cameraTargetDistance(a: FirstPersonCamera, b: FirstPersonCamera): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
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
