import { describe, expect, it } from 'vitest';
import { mapFirstPersonMoveAction } from './firstPersonInput.js';

describe('first-person input mapping', () => {
  const cases = [
    [{ x: 0, y: -1 }, 'move.left', { x: -1, y: 0 }],
    [{ x: 0, y: -1 }, 'move.right', { x: 1, y: 0 }],
    [{ x: 1, y: 0 }, 'move.left', { x: 0, y: -1 }],
    [{ x: 1, y: 0 }, 'move.right', { x: 0, y: 1 }],
    [{ x: 0, y: 1 }, 'move.left', { x: 1, y: 0 }],
    [{ x: 0, y: 1 }, 'move.right', { x: -1, y: 0 }],
    [{ x: -1, y: 0 }, 'move.left', { x: 0, y: 1 }],
    [{ x: -1, y: 0 }, 'move.right', { x: 0, y: -1 }],
  ] as const;

  it.each(cases)('%j + %s maps to %j', (facing, action, expected) => {
    expect(mapFirstPersonMoveAction(action, facing)).toEqual(expected);
  });

  it('keeps move.up pointed at the current facing and ignores move.down', () => {
    expect(mapFirstPersonMoveAction('move.up', { x: 0, y: -1 })).toEqual({ x: 0, y: -1 });
    expect(mapFirstPersonMoveAction('move.down', { x: 0, y: -1 })).toBeNull();
  });
});
