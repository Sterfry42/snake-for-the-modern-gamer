import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { CAR_HEIGHT_TILES, CAR_WIDTH_TILES, type GarageStructure } from '../vehicles/car.js';

interface PlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
}

const GARAGE_NAMES = ['Piston Saint Garage', 'Curbside Crown Auto', 'Two-Tile Motors'] as const;
const MECHANIC_NAMES = ['Rita Ratchet', 'Sal Bolt', 'Mina Clutch', 'Frankie Fuel'] as const;

export function tryPlaceGarage(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: PlacementOptions = {},
): GarageStructure | null {
  const width = 12;
  const height = 8;
  const margin = options.margin ?? 5;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const left = randomIntInRange(rng, margin, Math.max(margin + 1, grid.cols - width - margin));
    const top = randomIntInRange(rng, margin, Math.max(margin + 1, grid.rows - height - margin));
    if (!canPlace(layout, left, top, width, height, options.forbiddenCells)) {
      continue;
    }
    stampGarage(layout, left, top, width, height);
    const mechanic = {
      id: `garage-mechanic-${left}-${top}`,
      name: MECHANIC_NAMES[Math.floor(rng() * MECHANIC_NAMES.length)]!,
      x: left + 2,
      y: top + height - 3,
    };
    return {
      id: `garage:${left},${top}`,
      name: GARAGE_NAMES[Math.floor(rng() * GARAGE_NAMES.length)]!,
      bounds: { left, top, width, height },
      mechanic,
      carSpawn: { x: left + width - 5, y: top + height - 5 },
    };
  }
  const fallback = clearedFallbackBounds(layout, grid, width, height, options.forbiddenCells);
  if (!fallback) {
    return null;
  }
  clearBounds(layout, fallback.left, fallback.top, width, height);
  stampGarage(layout, fallback.left, fallback.top, width, height);
  const mechanic = {
    id: `garage-mechanic-${fallback.left}-${fallback.top}`,
    name: MECHANIC_NAMES[Math.floor(rng() * MECHANIC_NAMES.length)]!,
    x: fallback.left + 2,
    y: fallback.top + height - 3,
  };
  return {
    id: `garage:${fallback.left},${fallback.top}`,
    name: GARAGE_NAMES[Math.floor(rng() * GARAGE_NAMES.length)]!,
    bounds: { left: fallback.left, top: fallback.top, width, height },
    mechanic,
    carSpawn: { x: fallback.left + width - 5, y: fallback.top + height - 5 },
  };
}

function canPlace(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  forbiddenCells?: ReadonlySet<string>,
): boolean {
  for (let y = top - 1; y <= top + height; y += 1) {
    for (let x = left - 1; x <= left + width; x += 1) {
      if (forbiddenCells?.has(vectorKey({ x, y }))) return false;
      const tile = layout[y]?.[x];
      if (tile === undefined || tile !== '.') return false;
    }
  }
  return true;
}

function stampGarage(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
): void {
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      const edge = y === top || y === top + height - 1 || x === left || x === left + width - 1;
      layout[y]![x] = edge ? '#' : 'E';
    }
  }

  const doorY = top + height - 1;
  for (let x = left + width - 5; x <= left + width - 2; x += 1) {
    layout[doorY]![x] = '.';
    layout[doorY - 1]![x] = 'E';
  }

  layout[top + 1]![left + 2] = 'T';
  layout[top + 1]![left + 3] = 'T';
  layout[top + 2]![left + 1] = 'C';
  layout[top + 3]![left + 1] = 'K';
  layout[top + height - 3]![left + 2] = 'G';
  for (let y = top + height - 5; y < top + height - 5 + CAR_HEIGHT_TILES; y += 1) {
    for (let x = left + width - 5; x < left + width - 5 + CAR_WIDTH_TILES; x += 1) {
      layout[y]![x] = 'E';
    }
  }
}

function clearedFallbackBounds(
  layout: string[][],
  grid: GridConfig,
  width: number,
  height: number,
  forbiddenCells?: ReadonlySet<string>,
): { left: number; top: number } | null {
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
  return (
    candidates
      .map((candidate) => ({
        left: clampInt(candidate.left, 1, grid.cols - width - 1),
        top: clampInt(candidate.top, 1, grid.rows - height - 1),
      }))
      .find((candidate) =>
        canClearFallback(layout, candidate.left, candidate.top, width, height, forbiddenCells),
      ) ?? null
  );
}

function canClearFallback(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  forbiddenCells?: ReadonlySet<string>,
): boolean {
  for (let y = top - 1; y <= top + height; y += 1) {
    for (let x = left - 1; x <= left + width; x += 1) {
      if (layout[y]?.[x] === undefined || forbiddenCells?.has(vectorKey({ x, y }))) {
        return false;
      }
    }
  }
  return true;
}

function clearBounds(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
): void {
  for (let y = top - 1; y <= top + height; y += 1) {
    for (let x = left - 1; x <= left + width; x += 1) {
      layout[y]![x] = '.';
    }
  }
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomIntInRange(
  rng: RandomGenerator,
  minInclusive: number,
  maxExclusive: number,
): number {
  return minInclusive + Math.floor(rng() * Math.max(1, maxExclusive - minInclusive));
}
