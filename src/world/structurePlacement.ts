import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';

export interface StructureBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RandomRectPlacementOptions {
  width: number;
  height: number;
  margin: number;
  attempts: number;
  forbiddenCells?: ReadonlySet<string>;
}

export function setTile(layout: string[][], x: number, y: number, ch: string): void {
  const row = layout[y];
  if (!row || x < 0 || x >= row.length) return;
  row[x] = ch;
}

export function fillRect(layout: string[][], bounds: StructureBounds, ch: string): void {
  for (let y = bounds.top; y < bounds.top + bounds.height; y += 1) {
    for (let x = bounds.left; x < bounds.left + bounds.width; x += 1) {
      setTile(layout, x, y, ch);
    }
  }
}

export function canPlaceRect(
  layout: string[][],
  bounds: StructureBounds,
  forbiddenCells?: ReadonlySet<string>,
): boolean {
  for (let y = bounds.top; y < bounds.top + bounds.height; y += 1) {
    for (let x = bounds.left; x < bounds.left + bounds.width; x += 1) {
      if (layout[y]?.[x] !== '.') return false;
      if (forbiddenCells?.has(vectorKey({ x, y }))) return false;
    }
  }
  return true;
}

export function findRandomRectPlacement(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: RandomRectPlacementOptions,
): StructureBounds | null {
  const minLeft = options.margin;
  const minTop = options.margin;
  const maxLeft = grid.cols - options.width - options.margin;
  const maxTop = grid.rows - options.height - options.margin;
  if (maxLeft < minLeft || maxTop < minTop) return null;

  for (let attempt = 0; attempt < options.attempts; attempt += 1) {
    const left = minLeft + Math.floor(rng() * (maxLeft - minLeft + 1));
    const top = minTop + Math.floor(rng() * (maxTop - minTop + 1));
    const bounds = { left, top, width: options.width, height: options.height };
    if (canPlaceRect(layout, bounds, options.forbiddenCells)) return bounds;
  }

  return null;
}

export function pickOne<T>(values: readonly T[], rng: RandomGenerator): T {
  return values[Math.floor(rng() * values.length)] ?? values[0]!;
}
