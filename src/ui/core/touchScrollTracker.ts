/**
 * Minimal single-pointer drag tracker for touch-scrolling menu content.
 *
 * A gesture is only treated as a scroll after the pointer has moved far
 * enough that it cannot be a tap, so plain taps keep reaching the
 * underlying buttons and rows untouched.
 */
export interface TouchScrollTrackerOptions {
  dragStartThresholdPx?: number;
}

export class TouchScrollTracker {
  private readonly thresholdPx: number;
  private trackedPointerId: number | null = null;
  private startPointerY = 0;
  private lastPointerY = 0;
  private dragging = false;

  constructor(options: TouchScrollTrackerOptions = {}) {
    this.thresholdPx = options.dragStartThresholdPx ?? 10;
  }

  /** True while a pointer is being tracked, even before the drag activates. */
  get isTracking(): boolean {
    return this.trackedPointerId !== null;
  }

  /** True once the gesture crossed the threshold and scrolls are flowing. */
  get isDragging(): boolean {
    return this.dragging;
  }

  /** Start tracking a pointer. Ignored while another pointer is tracked. */
  begin(pointerId: number, pointerY: number): void {
    if (this.trackedPointerId !== null) {
      return;
    }
    this.trackedPointerId = pointerId;
    this.startPointerY = pointerY;
    this.lastPointerY = pointerY;
    this.dragging = false;
  }

  /**
   * Feed the tracked pointer's new position. Returns the vertical delta to
   * apply since the previous event once the gesture is an active drag, or
   * null while idle (pre-threshold movement, other pointers, or released).
   */
  update(pointerId: number, pointerY: number, pressed: boolean): number | null {
    if (this.trackedPointerId !== pointerId) {
      return null;
    }
    if (!pressed) {
      this.end();
      return null;
    }
    const delta = pointerY - this.lastPointerY;
    this.lastPointerY = pointerY;
    if (!this.dragging) {
      if (Math.abs(pointerY - this.startPointerY) < this.thresholdPx) {
        return null;
      }
      this.dragging = true;
    }
    return delta;
  }

  /** Release the tracked pointer, if any. */
  end(): void {
    this.trackedPointerId = null;
    this.dragging = false;
  }
}
