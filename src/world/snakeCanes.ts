import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import {
  DEFAULT_RESTAURANT_BUILDING,
  drawRestaurantCounter,
  drawRestaurantShell,
  drawRestaurantSign,
  drawRestaurantSouthEntrance,
  findRestaurantBuildingPlacement,
} from './restaurantBuilding.js';
import { pickOne, setTile } from './structurePlacement.js';

export interface SnakeCanesData {
  cashier: {
    name: string;
    x: number;
    y: number;
  };
  bounds: { left: number; top: number; width: number; height: number };
}

const CASHIER_NAMES = ['Vlad'] as const;

export function tryPlaceSnakeCanes(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: { forbiddenCells?: ReadonlySet<string>; margin?: number } = {},
): SnakeCanesData | null {
  const placement = findRestaurantBuildingPlacement(layout, grid, rng, {
    ...options,
    margin: options.margin ?? DEFAULT_RESTAURANT_BUILDING.margin,
  });
  if (!placement) return null;

  drawRestaurantShell(layout, placement);
  drawRestaurantSign(layout, placement, 'V');
  const cashier = drawRestaurantCounter(layout, placement, 'V');

  const { bounds, right } = placement;
  const kitchenY = bounds.top + 2;
  setTile(layout, right - 4, kitchenY, 'K');
  setTile(layout, right - 3, kitchenY, 'K');

  for (const tableTop of [bounds.top + 5, bounds.top + 8]) {
    setTile(layout, bounds.left + 2, tableTop, 'T');
    setTile(layout, bounds.left + 3, tableTop, 'T');
    setTile(layout, bounds.left + 2, tableTop + 1, 'T');
    setTile(layout, bounds.left + 3, tableTop + 1, 'T');
  }

  drawRestaurantSouthEntrance(layout, placement);

  return {
    cashier: { name: pickOne(CASHIER_NAMES, rng), ...cashier },
    bounds,
  };
}
