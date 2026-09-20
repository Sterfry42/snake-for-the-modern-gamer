import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import { CAR_HEIGHT_TILES, CAR_WIDTH_TILES, type GarageStructure } from '../vehicles/car.js';
import {
  canPlaceRect,
  clearRect,
  fillRect,
  findFallbackRectPlacement,
  pickOne,
  randomIntInRange,
  setTile,
  type StructureBounds,
} from './structurePlacement.js';

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
  let bounds: StructureBounds | null = null;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const left = randomIntInRange(rng, margin, Math.max(margin + 1, grid.cols - width - margin));
    const top = randomIntInRange(rng, margin, Math.max(margin + 1, grid.rows - height - margin));
    const candidate = { left, top, width, height };
    if (canPlaceRect(layout, candidate, options.forbiddenCells, 1)) {
      bounds = candidate;
      break;
    }
  }

  if (!bounds) {
    bounds = findFallbackRectPlacement(layout, grid, width, height, options.forbiddenCells);
    if (!bounds) return null;
    clearRect(layout, bounds, 1);
  }

  stampGarage(layout, bounds);
  const mechanic = {
    id: `garage-mechanic-${bounds.left}-${bounds.top}`,
    name: pickOne(MECHANIC_NAMES, rng),
    x: bounds.left + 2,
    y: bounds.top + height - 3,
  };

  return {
    id: `garage:${bounds.left},${bounds.top}`,
    name: pickOne(GARAGE_NAMES, rng),
    bounds,
    mechanic,
    carSpawn: { x: bounds.left + width - 5, y: bounds.top + height - 5 },
  };
}

function stampGarage(layout: string[][], bounds: StructureBounds): void {
  const { left, top, width, height } = bounds;
  fillRect(layout, left, top, width, height, 'E');

  const right = left + width - 1;
  const bottom = top + height - 1;
  for (let y = top; y <= bottom; y += 1) {
    setTile(layout, left, y, '#');
    setTile(layout, right, y, '#');
  }
  for (let x = left; x <= right; x += 1) {
    setTile(layout, x, top, '#');
    setTile(layout, x, bottom, '#');
  }

  const doorY = bottom;
  for (let x = left + width - 5; x <= left + width - 2; x += 1) {
    setTile(layout, x, doorY, '.');
    setTile(layout, x, doorY - 1, 'E');
  }

  setTile(layout, left + 2, top + 1, 'T');
  setTile(layout, left + 3, top + 1, 'T');
  setTile(layout, left + 1, top + 2, 'C');
  setTile(layout, left + 1, top + 3, 'K');
  setTile(layout, left + 2, top + height - 3, 'G');
  fillRect(layout, left + width - 5, top + height - 5, CAR_WIDTH_TILES, CAR_HEIGHT_TILES, 'E');
}
