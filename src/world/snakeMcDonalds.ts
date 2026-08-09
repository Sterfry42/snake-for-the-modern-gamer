import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import {
  DEFAULT_RESTAURANT_BUILDING,
  drawRestaurantCounter,
  drawRestaurantShell,
  drawRestaurantSign,
  drawRestaurantSouthEntrance,
  findRestaurantBuildingPlacement,
  setRestaurantTile,
} from './restaurantBuilding.js';

export interface McDonaldsData {
  cashier: {
    name: string;
    x: number;
    y: number;
  };
  toilet: {
    x: number;
    y: number;
  };
  arcade: {
    x: number;
    y: number;
  };
  bounds: { left: number; top: number; width: number; height: number };
}

const CASHIER_NAMES = [
  'McSlither',
  'Hamburgula',
  'The Fry Knight',
  'Sir Scales-a-Lot',
  'Burgerbeast',
] as const;

export function tryPlaceSnakeMcDonalds(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: { forbiddenCells?: ReadonlySet<string>; margin?: number } = {},
): McDonaldsData | null {
  const placement = findRestaurantBuildingPlacement(layout, grid, rng, {
    ...options,
    margin: options.margin ?? DEFAULT_RESTAURANT_BUILDING.margin,
  });
  if (!placement) return null;

  drawRestaurantShell(layout, placement);
  drawRestaurantSign(layout, placement, 'M');
  const cashier = drawRestaurantCounter(layout, placement, 'C');

  const { right, bottom } = placement;
  for (let y = bottom - 4; y <= bottom - 2; y += 1) {
    setRestaurantTile(layout, right - 5, y, '#');
  }
  for (let x = right - 5; x <= right - 1; x += 1) {
    setRestaurantTile(layout, x, bottom - 4, '#');
  }

  setRestaurantTile(layout, right - 5, bottom - 3, '.');

  const toilet = { x: right - 2, y: bottom - 2 };
  setRestaurantTile(layout, toilet.x, toilet.y, 'R');

  const arcade = { x: right - 3, y: placement.bounds.top + 2 };
  setRestaurantTile(layout, arcade.x, arcade.y, 'Z');

  drawRestaurantSouthEntrance(layout, placement);

  const name = CASHIER_NAMES[Math.floor(rng() * CASHIER_NAMES.length)]!;

  return {
    cashier: { name, ...cashier },
    toilet,
    arcade,
    bounds: placement.bounds,
  };
}
