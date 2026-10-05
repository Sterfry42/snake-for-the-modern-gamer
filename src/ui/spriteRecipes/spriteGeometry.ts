/**
 * Sprite Geometry
 *
 * Shared quarter-turn rotation for pixel sprite variants.
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
