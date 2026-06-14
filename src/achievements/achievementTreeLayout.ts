export interface Point { x: number; y: number }
export interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

export function treeToScreen(point: Point, pan: Point, viewportOrigin: Point): Point {
  return { x: viewportOrigin.x + point.x + pan.x, y: viewportOrigin.y + point.y + pan.y };
}

export function centerPanOn(root: Point, viewport: { width: number; height: number }): Point {
  return { x: viewport.width / 2 - root.x, y: viewport.height / 2 - root.y };
}

export function clampPan(pan: Point, content: Bounds, viewport: { width: number; height: number }, padding = 80): Point {
  const contentWidth = content.maxX - content.minX;
  const contentHeight = content.maxY - content.minY;
  const clampAxis = (value: number, min: number, max: number, size: number, viewportSize: number) => {
    if (size + padding * 2 <= viewportSize) return viewportSize / 2 - (min + max) / 2;
    return Math.min(padding - min, Math.max(viewportSize - padding - max, value));
  };
  return {
    x: clampAxis(pan.x, content.minX, content.maxX, contentWidth, viewport.width),
    y: clampAxis(pan.y, content.minY, content.maxY, contentHeight, viewport.height),
  };
}

export function exceededDragThreshold(start: Point, current: Point, threshold = 4): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) >= threshold;
}
