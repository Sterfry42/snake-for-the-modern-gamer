/**
 * Cheese Shop
 */
import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import { createHumanoidIdentity } from './humanoidSpawn.js';
import { fillRect, findRandomRectPlacement, pickOne, setTile } from './structurePlacement.js';
import type { RoomSnapshot } from './types.js';

interface CheeseShopPlacement {
  shopCenter: { x: number; y: number };
  safeArea: { left: number; top: number; width: number; height: number };
  shopkeeper: NonNullable<RoomSnapshot['questGiver']>;
}

const CHEESE_SHOPKEEPER_NAMES = [
  'Benoit',
  'Colette',
  'Francois',
  'Isabelle',
  'Jean-Pierre',
] as const;
const CHEESE_SHOPKEEPER_PORTRAITS = ['sage-1', 'sage-2', 'sage-3'] as const;

export function tryPlaceCheeseShop(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: {
    forbiddenCells?: ReadonlySet<string>;
    margin?: number;
  } = {},
): CheeseShopPlacement | null {
  if (grid.cols < 18 || grid.rows < 14) return null;

  const shopWidth = 10;
  const shopHeight = 8;
  const placement = findRandomRectPlacement(layout, grid, rng, {
    width: shopWidth,
    height: shopHeight,
    margin: options.margin ?? 4,
    attempts: 20,
    forbiddenCells: options.forbiddenCells,
  });
  if (!placement) return null;

  const shopLeft = placement.left;
  const shopTop = placement.top;
  fillRect(layout, shopLeft, shopTop, shopWidth, shopHeight, 'W');

  for (let y = shopTop + 1; y < shopTop + shopHeight - 1; y += 2) {
    for (let x = shopLeft + 1; x < shopLeft + shopWidth - 1; x += 2) {
      if (layout[y]?.[x] === 'W') setTile(layout, x, y, 'C');
    }
  }

  fillRect(layout, shopLeft + 3, shopTop + shopHeight - 2, 4, 1, 'C');

  const doorX = shopLeft + Math.floor(shopWidth / 2);
  setTile(layout, doorX, shopTop + shopHeight - 1, '.');
  setTile(layout, doorX + 1, shopTop + shopHeight - 1, '.');

  const questX = shopLeft + Math.floor(shopWidth / 2);
  const questY = shopTop + Math.floor(shopHeight / 2);
  setTile(layout, questX, questY, 'G');

  return {
    shopCenter: { x: questX, y: questY },
    safeArea: {
      left: questX - 2,
      top: questY - 2,
      width: 5,
      height: 5,
    },
    shopkeeper: {
      ...createHumanoidIdentity(
        pickOne(CHEESE_SHOPKEEPER_NAMES, rng),
        pickOne(CHEESE_SHOPKEEPER_PORTRAITS, rng),
      ),
      x: questX,
      y: questY,
    },
  };
}
