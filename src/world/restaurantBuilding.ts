import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';

export interface RestaurantBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RestaurantBuildingPlacement {
  bounds: RestaurantBounds;
  right: number;
  bottom: number;
}

export interface RestaurantBuildingOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
}

export const DEFAULT_RESTAURANT_BUILDING = {
  width: 16,
  height: 12,
  margin: 3,
  attempts: 20,
} as const;

export function setRestaurantTile(layout: string[][], x: number, y: number, ch: string): void {
  if (y < 0 || y >= layout.length) return;
  if (x < 0 || x >= layout[y].length) return;
  layout[y][x] = ch;
}

export function canPlaceRestaurantRect(
  layout: string[][],
  bounds: RestaurantBounds,
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

export function findRestaurantBuildingPlacement(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: RestaurantBuildingOptions = {},
): RestaurantBuildingPlacement | null {
  const width = DEFAULT_RESTAURANT_BUILDING.width;
  const height = DEFAULT_RESTAURANT_BUILDING.height;
  const margin = options.margin ?? DEFAULT_RESTAURANT_BUILDING.margin;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = grid.cols - width - margin;
  const maxTop = grid.rows - height - margin;

  if (maxLeft < minLeft || maxTop < minTop) return null;

  for (let attempt = 0; attempt < DEFAULT_RESTAURANT_BUILDING.attempts; attempt += 1) {
    const left = minLeft + Math.floor(rng() * (maxLeft - minLeft + 1));
    const top = minTop + Math.floor(rng() * (maxTop - minTop + 1));
    const bounds = { left, top, width, height };
    if (!canPlaceRestaurantRect(layout, bounds, options.forbiddenCells)) {
      continue;
    }
    return {
      bounds,
      right: left + width - 1,
      bottom: top + height - 1,
    };
  }

  return null;
}

export function drawRestaurantShell(
  layout: string[][],
  placement: RestaurantBuildingPlacement,
): void {
  const { bounds, right, bottom } = placement;
  const { left, top } = bounds;

  for (let y = top; y <= bottom; y += 1) {
    setRestaurantTile(layout, left, y, '#');
    setRestaurantTile(layout, right, y, '#');
  }
  for (let x = left; x <= right; x += 1) {
    setRestaurantTile(layout, x, top, '#');
    setRestaurantTile(layout, x, bottom, '#');
  }

  for (let y = top + 1; y < bottom; y += 1) {
    for (let x = left + 1; x < right; x += 1) {
      setRestaurantTile(layout, x, y, 'E');
    }
  }
}

export function drawRestaurantSign(
  layout: string[][],
  placement: RestaurantBuildingPlacement,
  symbol: string,
  length = 5,
): void {
  const signY = placement.bounds.top + 1;
  const signLeft = placement.bounds.left + 2;
  for (let i = 0; i < length; i += 1) {
    setRestaurantTile(layout, signLeft + i, signY, symbol);
  }
}

export function drawRestaurantCounter(
  layout: string[][],
  placement: RestaurantBuildingPlacement,
  cashierSymbol: string,
): { x: number; y: number } {
  const counterY = placement.bounds.top + 3;
  const counterXStart = placement.bounds.left + 1;
  const counterXEnd = placement.bounds.left + 6;
  for (let x = counterXStart; x <= counterXEnd; x += 1) {
    setRestaurantTile(layout, x, counterY, '#');
    setRestaurantTile(layout, x, counterY + 1, '#');
  }

  const cashier = {
    x: Math.floor((counterXStart + counterXEnd) / 2),
    y: counterY - 1,
  };
  setRestaurantTile(layout, cashier.x, cashier.y, cashierSymbol);
  return cashier;
}

export function drawRestaurantSouthEntrance(
  layout: string[][],
  placement: RestaurantBuildingPlacement,
): void {
  const doorX = placement.bounds.left + Math.floor(placement.bounds.width / 2);
  setRestaurantTile(layout, doorX, placement.bottom, '.');
  setRestaurantTile(layout, doorX, placement.bottom - 1, 'T');
}
