export interface TurnBasedGridSize {
  cols: number;
  rows: number;
}

export interface TurnBasedZoneBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function getTownTurnBasedBounds(grid: TurnBasedGridSize): TurnBasedZoneBounds {
  return {
    left: 0,
    top: 0,
    width: grid.cols,
    height: grid.rows,
  };
}
