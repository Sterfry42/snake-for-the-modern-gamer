import { describe, expect, it } from 'vitest';
import {
  centerPanOn,
  clampPan,
  exceededDragThreshold,
  treeToScreen,
} from './achievementTreeLayout.js';

describe('achievement tree layout', () => {
  it('transforms and centers tree points', () => {
    expect(treeToScreen({ x: 10, y: 20 }, { x: 3, y: 4 }, { x: 100, y: 200 })).toEqual({
      x: 113,
      y: 224,
    });
    expect(centerPanOn({ x: 10, y: 20 }, { width: 200, height: 100 })).toEqual({ x: 90, y: 30 });
  });

  it('clamps and detects dragging', () => {
    expect(
      clampPan(
        { x: 999, y: 999 },
        { minX: 0, minY: 0, maxX: 500, maxY: 500 },
        { width: 200, height: 200 },
        20,
      ),
    ).toEqual({ x: 20, y: 20 });
    expect(exceededDragThreshold({ x: 0, y: 0 }, { x: 3, y: 2 })).toBe(false);
    expect(exceededDragThreshold({ x: 0, y: 0 }, { x: 4, y: 3 })).toBe(true);
  });
});
