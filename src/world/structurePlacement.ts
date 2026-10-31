import type { GridConfig } from '../config/gameConfig.js';
import { clamp, vectorKey, type Rect, type Vector2Like } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';

export type StructureBounds = Rect;

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

/** Join a tile-character grid into row strings for storage/comparison. */
export function rowsToStrings(layout: string[][]): string[] {
  return layout.map((row) => row.join(''));
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

/**
 * Place a rect via up to `attempts` random positions, falling back to the
 * fixed candidate positions (clearing that area) when the room is crowded.
 * Returns null when no candidate fits.
 */
export function placeRectWithFallback(
  layout: string[][],
  grid: GridConfig,
  width: number,
  height: number,
  rng: RandomGenerator,
  options: { forbiddenCells?: ReadonlySet<string>; margin?: number; attempts?: number } = {},
): StructureBounds | null {
  const margin = options.margin ?? 5;
  const attempts = options.attempts ?? 80;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const left = randomIntInRange(rng, margin, Math.max(margin + 1, grid.cols - width - margin));
    const top = randomIntInRange(rng, margin, Math.max(margin + 1, grid.rows - height - margin));
    const candidate: StructureBounds = { left, top, width, height };
    if (canPlaceRect(layout, candidate, options.forbiddenCells, 1)) {
      return candidate;
    }
  }

  const fallback = findFallbackRectPlacement(layout, grid, width, height, options.forbiddenCells);
  if (!fallback) return null;
  clearRect(layout, fallback, 1);
  return fallback;
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
      left: clamp(candidate.left, 1, grid.cols - width - 1),
      top: clamp(candidate.top, 1, grid.rows - height - 1),
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

/** Positions shared by the goblin and tengu camp skeletons. */
export interface CampScaffold {
  camp: StructureBounds;
  center: Vector2Like;
  safeArea: StructureBounds;
  tents: Vector2Like[];
  fires: Vector2Like[];
  leaderSpot: Vector2Like;
  guardSpots: Vector2Like[];
}

/**
 * Place the common camp skeleton: an 8x4 core inside a 5-tile padded safe
 * area (both filled with 'E'), three tents, two fires, a leader spot, and
 * two guard spots. Camp-specific tile art and spawns are drawn by the
 * caller using the returned positions.
 */
export function placeCampScaffold(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: { forbiddenCells?: ReadonlySet<string>; margin?: number } = {},
): CampScaffold | null {
  if (grid.cols < 24 || grid.rows < 18) return null;

  const coreWidth = 8;
  const coreHeight = 4;
  const safeAreaPadding = 5;
  const camp = findRandomRectPlacement(layout, grid, rng, {
    width: coreWidth + safeAreaPadding * 2,
    height: coreHeight + safeAreaPadding * 2,
    margin: options.margin ?? 5,
    attempts: 32,
    forbiddenCells: options.forbiddenCells,
  });
  if (!camp) return null;

  const center: Vector2Like = {
    x: camp.left + Math.floor(camp.width / 2),
    y: camp.top + Math.floor(camp.height / 2),
  };
  const safeArea: StructureBounds = {
    left: camp.left,
    top: camp.top,
    width: camp.width,
    height: camp.height,
  };

  fillRect(layout, safeArea.left, safeArea.top, safeArea.width, safeArea.height, 'E');
  fillRect(
    layout,
    camp.left + safeAreaPadding,
    camp.top + safeAreaPadding,
    coreWidth,
    coreHeight,
    'E',
  );

  const tents: Vector2Like[] = [
    { x: camp.left + 1, y: camp.top + 1 },
    { x: camp.left + camp.width - 4, y: camp.top + 1 },
    { x: camp.left + 2, y: camp.top + camp.height - 4 },
  ];
  const fires: Vector2Like[] = [
    { x: center.x - 1, y: center.y },
    { x: center.x + 2, y: center.y + 1 },
  ];
  const leaderSpot: Vector2Like = { x: center.x, y: center.y - 1 };
  const guardSpots: Vector2Like[] = [
    { x: center.x - 3, y: center.y + 1 },
    { x: center.x + 4, y: center.y - 1 },
  ];

  return { camp, center, safeArea, tents, fires, leaderSpot, guardSpots };
}
