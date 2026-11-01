/**
 * Sprite Geometry
 *
 * Shared pixel-grid primitives and quarter-turn rotation for pixel sprite variants.
 */

export interface SpriteRotator {
  rotatePoint(x: number, y: number, turns: number): [number, number];
  rotatePoints(points: ReadonlyArray<readonly number[]>, turns: number): [number, number][];
}

/** Create a 90°-step rotator bound to a `size`×`size` sprite pixel grid. */
export function createSpriteRotator(size: number): SpriteRotator {
  function rotatePoint(x: number, y: number, turns: number): [number, number] {
    let px = x;
    let py = y;
    for (let i = 0; i < turns; i += 1) {
      const nextX = size - 1 - py;
      const nextY = px;
      px = nextX;
      py = nextY;
    }
    return [px, py];
  }
  return {
    rotatePoint,
    rotatePoints(points, turns) {
      return points.map((point) => rotatePoint(point[0] ?? 0, point[1] ?? 0, turns));
    },
  };
}

/** Quarter turns matching a "<type>-<direction>" sprite variant suffix. */
export function turnsForVariant(variant: string): number {
  if (variant.endsWith('right')) return 1;
  if (variant.endsWith('down')) return 2;
  if (variant.endsWith('left')) return 3;
  return 0;
}

/** Fill one pixel-grid cell of a sprite canvas. */
export function fillPixel(
  context: CanvasRenderingContext2D,
  px: number,
  py: number,
  pixelSize: number,
  color: string,
): void {
  context.fillStyle = color;
  context.fillRect(px * pixelSize, py * pixelSize, pixelSize, pixelSize);
}

/** Fill every pixel-grid cell in `points` with one color. */
export function drawPixels(
  context: CanvasRenderingContext2D,
  points: ReadonlyArray<readonly number[]>,
  pixelSize: number,
  color: string,
): void {
  for (const [x, y] of points) {
    fillPixel(context, x ?? 0, y ?? 0, pixelSize, color);
  }
}
