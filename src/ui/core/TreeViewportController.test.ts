import { describe, expect, it } from 'vitest';
import { TreeViewportController } from './TreeViewportController.js';

describe('TreeViewportController', () => {
  it('pans in both axes and clamps the world to the viewport padding', () => {
    const viewport = new TreeViewportController({ width: 400, height: 300, padding: 40 });
    viewport.setWorldPoints([
      { x: 0, y: 0 },
      { x: 800, y: 600 },
    ]);
    viewport.setPan({ x: -10_000, y: -10_000 });
    expect(viewport.pan).toEqual({ x: -440, y: -340 });
    viewport.setPan({ x: 10_000, y: 10_000 });
    expect(viewport.pan).toEqual({ x: 40, y: 40 });
  });

  it('keeps the world point beneath the cursor fixed while zooming', () => {
    const viewport = new TreeViewportController({ width: 400, height: 300 });
    viewport.setWorldPoints([
      { x: -500, y: -500 },
      { x: 500, y: 500 },
    ]);
    viewport.setPan({ x: 80, y: 60 });
    const anchor = { x: 230, y: 170 };
    const before = {
      x: (anchor.x - viewport.pan.x) / viewport.zoom,
      y: (anchor.y - viewport.pan.y) / viewport.zoom,
    };
    expect(viewport.zoomAround(1.5, anchor)).toBe(true);
    expect((anchor.x - viewport.pan.x) / viewport.zoom).toBeCloseTo(before.x);
    expect((anchor.y - viewport.pan.y) / viewport.zoom).toBeCloseTo(before.y);
  });

  it('distinguishes a click from a drag', () => {
    const viewport = new TreeViewportController({ width: 400, height: 300, dragThreshold: 6 });
    viewport.beginDrag({ x: 10, y: 10 });
    expect(viewport.moveDrag({ x: 13, y: 13 })).toBe(false);
    expect(viewport.didDrag()).toBe(false);
    viewport.moveDrag({ x: 30, y: 10 });
    expect(viewport.endDrag()).toBe(true);
  });
});
