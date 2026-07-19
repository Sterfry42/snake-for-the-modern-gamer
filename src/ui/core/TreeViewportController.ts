export interface TreePoint {
  x: number;
  y: number;
}

export interface TreeViewportControllerOptions {
  width: number;
  height: number;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  padding?: number;
  dragThreshold?: number;
}

/** Framework-agnostic pan/zoom state shared by every large node-map UI. */
export class TreeViewportController {
  readonly pan: TreePoint = { x: 0, y: 0 };
  zoom: number;
  private readonly minZoom: number;
  private readonly maxZoom: number;
  private readonly padding: number;
  private readonly dragThresholdSquared: number;
  private worldPoints: readonly TreePoint[] = [{ x: 0, y: 0 }];
  private drag: { start: TreePoint; pan: TreePoint; moved: boolean } | null = null;

  constructor(private readonly options: TreeViewportControllerOptions) {
    this.minZoom = options.minZoom ?? 0.3;
    this.maxZoom = options.maxZoom ?? 1.65;
    this.zoom = this.clamp(options.initialZoom ?? 1, this.minZoom, this.maxZoom);
    this.padding = options.padding ?? 90;
    const threshold = options.dragThreshold ?? 6;
    this.dragThresholdSquared = threshold * threshold;
  }

  setWorldPoints(points: readonly TreePoint[]): void {
    this.worldPoints = points.length > 0 ? points.map((point) => ({ ...point })) : [{ x: 0, y: 0 }];
    this.setPan(this.pan);
  }

  setPan(next: TreePoint): boolean {
    const xs = this.worldPoints.map((point) => point.x * this.zoom);
    const ys = this.worldPoints.map((point) => point.y * this.zoom);
    const minX = this.options.width - this.padding - Math.max(...xs);
    const maxX = this.padding - Math.min(...xs);
    const minY = this.options.height - this.padding - Math.max(...ys);
    const maxY = this.padding - Math.min(...ys);
    const x = this.clamp(next.x, Math.min(minX, maxX), Math.max(minX, maxX));
    const y = this.clamp(next.y, Math.min(minY, maxY), Math.max(minY, maxY));
    const changed = Math.abs(x - this.pan.x) > 0.001 || Math.abs(y - this.pan.y) > 0.001;
    this.pan.x = x;
    this.pan.y = y;
    return changed;
  }

  panBy(deltaX: number, deltaY: number): boolean {
    return this.setPan({ x: this.pan.x + deltaX, y: this.pan.y + deltaY });
  }

  zoomAround(rawZoom: number, anchor: TreePoint): boolean {
    const nextZoom = this.clamp(rawZoom, this.minZoom, this.maxZoom);
    if (Math.abs(nextZoom - this.zoom) < 0.001) return false;
    const worldX = (anchor.x - this.pan.x) / this.zoom;
    const worldY = (anchor.y - this.pan.y) / this.zoom;
    this.zoom = nextZoom;
    this.setPan({ x: anchor.x - worldX * nextZoom, y: anchor.y - worldY * nextZoom });
    return true;
  }

  centerOn(point: TreePoint): boolean {
    return this.setPan({
      x: this.options.width / 2 - point.x * this.zoom,
      y: this.options.height / 2 - point.y * this.zoom,
    });
  }

  worldToViewport(point: TreePoint): TreePoint {
    return { x: this.pan.x + point.x * this.zoom, y: this.pan.y + point.y * this.zoom };
  }

  beginDrag(pointer: TreePoint): void {
    this.drag = { start: { ...pointer }, pan: { ...this.pan }, moved: false };
  }

  moveDrag(pointer: TreePoint): boolean {
    if (!this.drag) return false;
    const dx = pointer.x - this.drag.start.x;
    const dy = pointer.y - this.drag.start.y;
    this.drag.moved ||= dx * dx + dy * dy >= this.dragThresholdSquared;
    if (!this.drag.moved) return false;
    this.setPan({ x: this.drag.pan.x + dx, y: this.drag.pan.y + dy });
    return true;
  }

  endDrag(): boolean {
    const moved = this.drag?.moved ?? false;
    this.drag = null;
    return moved;
  }

  didDrag(): boolean {
    return this.drag?.moved ?? false;
  }

  private clamp(value: number, minimum: number, maximum: number): number {
    return Math.max(minimum, Math.min(maximum, value));
  }
}
