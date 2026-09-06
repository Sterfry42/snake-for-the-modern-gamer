import type { Vector2Like } from '../../core/math.js';
import type { ControlActionId } from '../../input/controlActions.js';

export function mapFirstPersonMoveAction(
  actionId: ControlActionId,
  facing: Vector2Like,
): Vector2Like | null {
  switch (actionId) {
    case 'move.up':
      return normalizeCardinal(facing);
    case 'move.left':
      return cleanDirection({ x: facing.y, y: -facing.x });
    case 'move.right':
      return cleanDirection({ x: -facing.y, y: facing.x });
    case 'move.down':
      return null;
    default:
      return null;
  }
}

export function directionToMoveAction(direction: Vector2Like): ControlActionId | null {
  if (direction.y < 0) return 'move.up';
  if (direction.y > 0) return 'move.down';
  if (direction.x < 0) return 'move.left';
  if (direction.x > 0) return 'move.right';
  return null;
}

function normalizeCardinal(direction: Vector2Like): Vector2Like {
  if (Math.abs(direction.x) >= Math.abs(direction.y)) {
    return { x: direction.x >= 0 ? 1 : -1, y: 0 };
  }
  return { x: 0, y: direction.y >= 0 ? 1 : -1 };
}

function cleanDirection(direction: Vector2Like): Vector2Like {
  return {
    x: Object.is(direction.x, -0) ? 0 : direction.x,
    y: Object.is(direction.y, -0) ? 0 : direction.y,
  };
}
