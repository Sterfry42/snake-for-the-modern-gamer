export type AchievementZoomExtreme = 'min' | 'max';

const REQUIRED_EXTREME_HITS = 6;
const MAX_EXTREME_GAP_MS = 5_000;

export class AchievementZoomTracker {
  private extremes: AchievementZoomExtreme[] = [];
  private lastExtremeAtMs = Number.NEGATIVE_INFINITY;

  record(extreme: AchievementZoomExtreme, nowMs: number): boolean {
    const previous = this.extremes[this.extremes.length - 1];
    if (nowMs - this.lastExtremeAtMs > MAX_EXTREME_GAP_MS) {
      this.extremes = [extreme];
    } else if (previous === extreme) {
      this.lastExtremeAtMs = nowMs;
      return false;
    } else {
      this.extremes.push(extreme);
    }
    this.lastExtremeAtMs = nowMs;
    if (this.extremes.length < REQUIRED_EXTREME_HITS) return false;
    this.reset();
    return true;
  }

  reset(): void {
    this.extremes = [];
    this.lastExtremeAtMs = Number.NEGATIVE_INFINITY;
  }
}
