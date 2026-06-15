import { describe, expect, it } from 'vitest';
import { AchievementZoomTracker } from './achievementZoomTracker.js';

describe('AchievementZoomTracker', () => {
  it('completes after reaching both zoom extremes three times', () => {
    const tracker = new AchievementZoomTracker();
    const extremes = ['max', 'min', 'max', 'min', 'max', 'min'] as const;
    expect(extremes.map((extreme, index) => tracker.record(extreme, index * 1_000))).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
  });

  it('ignores duplicate extremes and resets after a five-second gap', () => {
    const tracker = new AchievementZoomTracker();
    expect(tracker.record('max', 0)).toBe(false);
    expect(tracker.record('max', 100)).toBe(false);
    expect(tracker.record('min', 1_000)).toBe(false);
    expect(tracker.record('max', 2_000)).toBe(false);
    expect(tracker.record('min', 3_000)).toBe(false);
    expect(tracker.record('max', 4_000)).toBe(false);
    expect(tracker.record('min', 5_000)).toBe(true);

    expect(tracker.record('max', 10_000)).toBe(false);
    expect(tracker.record('min', 15_001)).toBe(false);
  });
});
