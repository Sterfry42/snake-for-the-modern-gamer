import { describe, expect, it } from 'vitest';
import type { FirstPersonBillboard } from './firstPersonTypes.js';
import { shouldHideFirstPersonSelfBodyBillboard } from './firstPersonBodyVisibility.js';

function snakeSegment(segmentIndex: number): FirstPersonBillboard {
  return {
    id: `snake:${segmentIndex}`,
    kind: 'snake-body',
    x: segmentIndex + 0.5,
    y: 0.5,
    width: 0.68,
    height: 0.64,
    anchorY: 0.92,
    color: 0x4ecdc4,
    segmentIndex,
  };
}

describe('first-person self-body visibility', () => {
  it('hides only the immediate neck/body while leaving farther body visible', () => {
    expect(shouldHideFirstPersonSelfBodyBillboard(snakeSegment(1))).toBe(true);
    expect(shouldHideFirstPersonSelfBodyBillboard(snakeSegment(2))).toBe(true);
    expect(shouldHideFirstPersonSelfBodyBillboard(snakeSegment(3))).toBe(false);
    expect(shouldHideFirstPersonSelfBodyBillboard(snakeSegment(8))).toBe(false);
  });

  it('does not hide unrelated billboards', () => {
    expect(
      shouldHideFirstPersonSelfBodyBillboard({
        ...snakeSegment(1),
        id: 'enemy:1',
        kind: 'enemy',
      }),
    ).toBe(false);
  });
});
