import { describe, expect, it } from 'vitest';
import { resolveSwipeDirection } from '../mobileControls.js';

describe('resolveSwipeDirection', () => {
  it('returns null when movement is below the threshold', () => {
    expect(resolveSwipeDirection({ x: 0, y: 0 }, { x: 12, y: 8 }, 32)).toBeNull();
  });

  it('resolves a right swipe', () => {
    expect(resolveSwipeDirection({ x: 0, y: 0 }, { x: 40, y: 4 })).toEqual({ x: 1, y: 0 });
  });

  it('resolves a left swipe', () => {
    expect(resolveSwipeDirection({ x: 50, y: 0 }, { x: 5, y: 2 })).toEqual({ x: -1, y: 0 });
  });

  it('resolves an up swipe', () => {
    expect(resolveSwipeDirection({ x: 0, y: 60 }, { x: 2, y: 12 })).toEqual({ x: 0, y: -1 });
  });

  it('resolves a down swipe', () => {
    expect(resolveSwipeDirection({ x: 0, y: 0 }, { x: 4, y: 44 })).toEqual({ x: 0, y: 1 });
  });

  it('chooses the dominant horizontal axis for diagonal swipes', () => {
    expect(resolveSwipeDirection({ x: 0, y: 0 }, { x: 60, y: 38 })).toEqual({ x: 1, y: 0 });
  });

  it('chooses the dominant vertical axis for diagonal swipes', () => {
    expect(resolveSwipeDirection({ x: 0, y: 0 }, { x: -34, y: -70 })).toEqual({ x: 0, y: -1 });
  });
});
