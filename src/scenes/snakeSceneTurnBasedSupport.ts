import type { Rect } from '../core/math.js';

interface TurnBasedGridSize {
  cols: number;
  rows: number;
}

export function getTownTurnBasedBounds(grid: TurnBasedGridSize): Rect {
  return {
    left: 0,
    top: 0,
    width: grid.cols,
    height: grid.rows,
  };
}
