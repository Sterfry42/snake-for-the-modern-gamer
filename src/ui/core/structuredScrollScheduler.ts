/**
 * Coalesces high-frequency scroll-offset updates into at most one content
 * rebuild per rendered frame.
 *
 * Touch screens report pointer samples at 120-240 Hz, so a scrollable menu
 * that rebuilds its content on every event ends up doing several full
 * rebuilds per frame. The scheduler lets scroll events only *record* the
 * latest target offset; the caller checks `consume()` once per frame and
 * rebuilds at most once. Offsets that moved less than `minMovementPx` since
 * the last build are kept pending until the drift crosses the threshold, so
 * sub-pixel drift and clamped end-of-list drags cost nothing.
 */
export class StructuredScrollScheduler {
  private pendingOffset: number | null = null;
  private lastBuiltOffset: number;
  private readonly minMovementPx: number;

  constructor(lastBuiltOffset = 0, minMovementPx = 1) {
    this.lastBuiltOffset = lastBuiltOffset;
    this.minMovementPx = minMovementPx;
  }

  /** Record the latest target offset from a scroll event. */
  queue(offset: number): void {
    this.pendingOffset = offset;
  }

  /**
   * Call once per rendered frame. Returns the offset a rebuild is due at, or
   * null when nothing is due yet (no event arrived, or the offset moved
   * less than the minimum). A kept-pending offset may still be returned by a
   * later frame once drift crosses the threshold.
   */
  consume(): number | null {
    if (this.pendingOffset === null) {
      return null;
    }
    if (Math.abs(this.pendingOffset - this.lastBuiltOffset) < this.minMovementPx) {
      return null;
    }
    const offset = this.pendingOffset;
    this.pendingOffset = null;
    this.lastBuiltOffset = offset;
    return offset;
  }

  /** Content was rebuilt outside the scroll path (tab switch, data change). */
  markBuilt(offset: number): void {
    this.pendingOffset = null;
    this.lastBuiltOffset = offset;
  }

  get lastBuilt(): number {
    return this.lastBuiltOffset;
  }
}
