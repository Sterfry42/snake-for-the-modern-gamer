import type { Vector2Like } from '../core/math.js';

export interface CarHeldInputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export interface CarInputUpdate {
  held: CarHeldInputState;
  throttle: number;
  steering: number;
  changed: boolean;
}

export function createCarHeldInputState(): CarHeldInputState {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };
}

export function resetCarHeldInputState(state: CarHeldInputState): CarInputUpdate {
  return applyCarHeldInput(state, createCarHeldInputState());
}

export function updateCarHeldInputFromDirection(
  state: CarHeldInputState,
  direction: Vector2Like,
  held: boolean,
): CarInputUpdate {
  const next = { ...state };
  if (direction.y < 0) next.forward = held;
  if (direction.y > 0) next.backward = held;
  if (direction.x < 0) next.left = held;
  if (direction.x > 0) next.right = held;
  return applyCarHeldInput(state, next);
}

export function updateCarHeldInputFromKey(
  state: CarHeldInputState,
  key: string,
  held: boolean,
): CarInputUpdate {
  const next = { ...state };
  if (key === 'w' || key === 'arrowup') next.forward = held;
  if (key === 's' || key === 'arrowdown') next.backward = held;
  if (key === 'a' || key === 'arrowleft') next.left = held;
  if (key === 'd' || key === 'arrowright') next.right = held;
  return applyCarHeldInput(state, next);
}

export function deriveCarInputTargets(held: CarHeldInputState): {
  throttle: number;
  steering: number;
} {
  return {
    throttle: (held.forward ? 1 : 0) + (held.backward ? -1 : 0),
    steering: (held.right ? 1 : 0) + (held.left ? -1 : 0),
  };
}

function applyCarHeldInput(previous: CarHeldInputState, next: CarHeldInputState): CarInputUpdate {
  const changed =
    previous.forward !== next.forward ||
    previous.backward !== next.backward ||
    previous.left !== next.left ||
    previous.right !== next.right;
  return {
    held: next,
    ...deriveCarInputTargets(next),
    changed,
  };
}
