import type { GridConfig } from '../../config/gameConfig.js';
import { vectorKey } from '../../core/math.js';

export type EdgeSide = 'north' | 'south' | 'east' | 'west';

export interface EdgeAccessPlan {
  side: EdgeSide;
  open: boolean;
  openingCenter: number;
  openingWidth: number;
  runupDepth: number;
  reason:
    | 'normalExit'
    | 'townGate'
    | 'townExit'
    | 'townInteriorStreet'
    | 'riverBridge'
    | 'forestMouth'
    | 'structureDoor';
}

export function cellsForEdgeRunup(grid: GridConfig, plan: EdgeAccessPlan): ReadonlySet<string> {
  const cells = new Set<string>();
  if (!plan.open) {
    return cells;
  }
  const half = Math.floor(plan.openingWidth / 2);
  const start = plan.openingCenter - half;
  const end = start + plan.openingWidth - 1;
  for (let offset = 0; offset < plan.runupDepth; offset += 1) {
    for (let along = start; along <= end; along += 1) {
      const x =
        plan.side === 'west' ? offset : plan.side === 'east' ? grid.cols - 1 - offset : along;
      const y =
        plan.side === 'north' ? offset : plan.side === 'south' ? grid.rows - 1 - offset : along;
      if (x >= 0 && y >= 0 && x < grid.cols && y < grid.rows) {
        cells.add(vectorKey({ x, y }));
      }
    }
  }
  return cells;
}

export function mergeProtectedCells(
  ...sets: Array<ReadonlySet<string> | undefined>
): ReadonlySet<string> {
  const merged = new Set<string>();
  for (const set of sets) {
    set?.forEach((key) => merged.add(key));
  }
  return merged;
}

export function carveEdgeOpening(
  layout: string[][],
  grid: GridConfig,
  plan: EdgeAccessPlan,
  tile = '.',
): void {
  if (!plan.open) {
    return;
  }
  for (const key of cellsForEdgeRunup(grid, plan)) {
    const [x = 0, y = 0] = key.split(',').map(Number);
    if (layout[y]?.[x] === '#' || layout[y]?.[x] === '~' || layout[y]?.[x] === 'S') {
      layout[y][x] = tile;
    }
  }
}

export function assertEdgeRunupClear(
  layout: string[][],
  grid: GridConfig,
  plan: EdgeAccessPlan,
): boolean {
  for (const key of cellsForEdgeRunup(grid, plan)) {
    const [x = 0, y = 0] = key.split(',').map(Number);
    const tile = layout[y]?.[x];
    if (tile === undefined || tile === '#' || tile === '~' || tile === 'S') {
      return false;
    }
  }
  return true;
}
