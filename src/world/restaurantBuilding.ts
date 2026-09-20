import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import {
  fillRect,
  findRandomRectPlacement,
  setTile,
  type StructureBounds,
} from './structurePlacement.js';

export type RestaurantBounds = StructureBounds;

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

export function findRestaurantBuildingPlacement(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: RestaurantBuildingOptions = {},
): RestaurantBuildingPlacement | null {
  const bounds = findRandomRectPlacement(layout, grid, rng, {
    width: DEFAULT_RESTAURANT_BUILDING.width,
    height: DEFAULT_RESTAURANT_BUILDING.height,
    margin: options.margin ?? DEFAULT_RESTAURANT_BUILDING.margin,
    attempts: DEFAULT_RESTAURANT_BUILDING.attempts,
    forbiddenCells: options.forbiddenCells,
  });
  if (!bounds) return null;

  return {
    bounds,
    right: bounds.left + bounds.width - 1,
    bottom: bounds.top + bounds.height - 1,
  };
}

export function drawRestaurantShell(
  layout: string[][],
  placement: RestaurantBuildingPlacement,
): void {
  const { bounds, right, bottom } = placement;
  const { left, top } = bounds;

  for (let y = top; y <= bottom; y += 1) {
    setTile(layout, left, y, '#');
    setTile(layout, right, y, '#');
  }
  for (let x = left; x <= right; x += 1) {
    setTile(layout, x, top, '#');
    setTile(layout, x, bottom, '#');
  }
  fillRect(layout, left + 1, top + 1, bounds.width - 2, bounds.height - 2, 'E');
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
    setTile(layout, signLeft + i, signY, symbol);
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
    setTile(layout, x, counterY, '#');
    setTile(layout, x, counterY + 1, '#');
  }

  const cashier = {
    x: Math.floor((counterXStart + counterXEnd) / 2),
    y: counterY - 1,
  };
  setTile(layout, cashier.x, cashier.y, cashierSymbol);
  return cashier;
}

export function drawRestaurantSouthEntrance(
  layout: string[][],
  placement: RestaurantBuildingPlacement,
): void {
  const doorX = placement.bounds.left + Math.floor(placement.bounds.width / 2);
  setTile(layout, doorX, placement.bottom, '.');
  setTile(layout, doorX, placement.bottom - 1, 'T');
}
