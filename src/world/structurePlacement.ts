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
  clearance?: number;
}

export function setTile(layout: string[][], x: number, y: number, ch: string): void {
  const row = layout[y];
  if (!row || x < 0 || x >= row.length) return;
  row[x] = ch;
}

export function fillRect(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  ch: string,
): void {
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      setTile(layout, x, y, ch);
    }
  }
}

export function canPlaceRect(
  layout: string[][],
  bounds: StructureBounds,
  forbiddenCells?: ReadonlySet<string>,
  clearance = 0,
): boolean {
  for (let y = bounds.top - clearance; y < bounds.top + bounds.height + clearance; y += 1) {
    for (let x = bounds.left - clearance; x < bounds.left + bounds.width + clearance; x += 1) {
      if (layout[y]?.[x] !== '.') return false;
      if (forbiddenCells?.has(vectorKey({ x, y }))) return false;
    }
  }
  return true;
}

export function clearRect(
  layout: string[][],
  bounds: StructureBounds,
  clearance = 0,
  ch = '.',
): void {
  for (let y = bounds.top - clearance; y < bounds.top + bounds.height + clearance; y += 1) {
    for (let x = bounds.left - clearance; x < bounds.left + bounds.width + clearance; x += 1) {
      setTile(layout, x, y, ch);
    }
  }
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
    if (canPlaceRect(layout, bounds, options.forbiddenCells, options.clearance)) return bounds;
  }

  return null;
}

export function findFallbackRectPlacement(
  layout: string[][],
  grid: GridConfig,
  width: number,
  height: number,
  forbiddenCells?: ReadonlySet<string>,
): StructureBounds | null {
  const candidates = [
    {
      left: Math.floor((grid.cols - width) / 2),
      top: Math.floor((grid.rows - height) / 2),
    },
    { left: 3, top: 3 },
    { left: grid.cols - width - 4, top: 3 },
    { left: 3, top: grid.rows - height - 4 },
    { left: grid.cols - width - 4, top: grid.rows - height - 4 },
  ];

  for (const candidate of candidates) {
    const bounds = {
      left: clampInt(candidate.left, 1, grid.cols - width - 1),
      top: clampInt(candidate.top, 1, grid.rows - height - 1),
      width,
      height,
    };
    if (canClearRect(layout, bounds, forbiddenCells)) return bounds;
  }

  return null;
}

export function pickOne<T>(values: readonly T[], rng: RandomGenerator): T {
  return values[Math.floor(rng() * values.length)] ?? values[0]!;
}

export function randomIntInRange(
  rng: RandomGenerator,
  minInclusive: number,
  maxExclusive: number,
): number {
  return minInclusive + Math.floor(rng() * Math.max(1, maxExclusive - minInclusive));
}

function canClearRect(
  layout: string[][],
  bounds: StructureBounds,
  forbiddenCells?: ReadonlySet<string>,
): boolean {
  for (let y = bounds.top - 1; y < bounds.top + bounds.height + 1; y += 1) {
    for (let x = bounds.left - 1; x < bounds.left + bounds.width + 1; x += 1) {
      if (layout[y]?.[x] === undefined || forbiddenCells?.has(vectorKey({ x, y }))) return false;
    }
  }
  return true;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
