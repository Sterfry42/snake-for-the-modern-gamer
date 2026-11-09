import { describe, expect, it } from 'vitest';
import { TouchScrollTracker } from '../core/touchScrollTracker.js';

describe('TouchScrollTracker', () => {
  it('stays idle until the pointer moves past the threshold', () => {
    const tracker = new TouchScrollTracker();
    tracker.begin(1, 100);
    expect(tracker.isTracking).toBe(true);
    expect(tracker.isDragging).toBe(false);

    expect(tracker.update(1, 104, true)).toBeNull();
    expect(tracker.update(1, 108, true)).toBeNull();
    expect(tracker.isDragging).toBe(false);
  });

  it('reports deltas once the drag is active, including the crossing event', () => {
    const tracker = new TouchScrollTracker({ dragStartThresholdPx: 10 });
    tracker.begin(1, 100);

    expect(tracker.update(1, 105, true)).toBeNull();
    // Crosses the threshold: the full distance since the previous sample is
    // reported so no scroll distance is lost.
    expect(tracker.update(1, 111, true)).toBe(6);
    expect(tracker.isDragging).toBe(true);
    expect(tracker.update(1, 120, true)).toBe(9);
  });

  it('supports scrolling in both directions', () => {
    const tracker = new TouchScrollTracker();
    tracker.begin(1, 100);
    tracker.update(1, 89, true);
    expect(tracker.update(1, 80, true)).toBe(-9);
  });

  it('ignores pointers that were never tracked', () => {
    const tracker = new TouchScrollTracker();
    expect(tracker.update(2, 50, true)).toBeNull();
    tracker.begin(1, 100);
    expect(tracker.update(2, 150, true)).toBeNull();
  });

  it('ends the gesture when the pointer is released', () => {
    const tracker = new TouchScrollTracker();
    tracker.begin(1, 100);
    tracker.update(1, 120, true);
    expect(tracker.update(1, 130, false)).toBeNull();
    expect(tracker.isTracking).toBe(false);
    expect(tracker.isDragging).toBe(false);
  });

  it('only tracks one pointer at a time', () => {
    const tracker = new TouchScrollTracker();
    tracker.begin(1, 100);
    tracker.begin(2, 40);
    expect(tracker.update(1, 130, true)).toBe(30);
    expect(tracker.update(2, 90, true)).toBeNull();
  });

  it('resets between gestures', () => {
    const tracker = new TouchScrollTracker();
    tracker.begin(1, 100);
    tracker.update(1, 130, true);
    tracker.end();

    tracker.begin(1, 200);
    expect(tracker.update(1, 204, true)).toBeNull();
  });
});
