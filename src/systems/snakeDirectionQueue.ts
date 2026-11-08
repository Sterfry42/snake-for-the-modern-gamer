import type { Vector2Like } from '../core/math.js';

export interface SnakeDirectionQueue {
  direction: Vector2Like;
  nextDirection: Vector2Like;
  bufferedDirection: Vector2Like | null;
}

const same = (a: Vector2Like, b: Vector2Like | null) => a.x === b?.x && a.y === b.y;
const opposite = (a: Vector2Like, b: Vector2Like) => a.x === -b.x && a.y === -b.y;

/** The same two-turn queue is used by authority and temporary client presentation. */
export function queueSnakeDirection(state: SnakeDirectionQueue, candidate: Vector2Like): boolean {
  if (same(candidate, state.nextDirection) || opposite(candidate, state.nextDirection))
    return false;
  if (same(state.nextDirection, state.direction)) {
    state.nextDirection = { ...candidate };
    state.bufferedDirection = null;
  } else {
    if (same(candidate, state.bufferedDirection)) return false;
    state.bufferedDirection = { ...candidate };
  }
  return true;
}

export function finishSnakeDirectionStep(state: SnakeDirectionQueue): void {
  state.nextDirection =
    state.bufferedDirection && !opposite(state.bufferedDirection, state.direction)
      ? { ...state.bufferedDirection }
      : { ...state.direction };
  state.bufferedDirection = null;
}
