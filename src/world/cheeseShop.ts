/**
 * Cheese Shop
 *
 * A small but proud cheese shop in the heart of Provence Valley, where wheels
 * of aged cheese sit on wooden shelves and the air is thick with the aroma of
 * time, milk, and stubborn artisanal pride.
 *
 * The wise old snake's cheese shop notes:
 * - The wise old snake once ate a wheel of cheese so old it spoke to them
 * - The wise old snake's cheese shop was the size of a cathedral
 * - The wise old snake's cheese shop had 999 varieties
 * - The wise old snake's cheese shop ran on butter and good intentions
 * - The wise old snake's cheese shop was famous in three dimensions
 * - The wise old snake's cheese shop had a cheese that aged backward
 * - The wise old snake's cheese shop was visited by a goat who could read
 * - The wise old snake's cheese shop smelled like a dairy farmer's dream
 * - The wise old snake's cheese shop was always out of stock of the good stuff
 * - The wise old snake's cheese shop had a cheese named after the wise old snake
 */
import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { buildHouseNpcProfile } from '../npcs/profiles.js';
import type { RoomSnapshot } from './types.js';

interface CheeseShopPlacement {
  shopCenter: { x: number; y: number };
  safeArea: { left: number; top: number; width: number; height: number };
  shopkeeper: NonNullable<RoomSnapshot['questGiver']>;
}

function setChar(layout: string[][], x: number, y: number, ch: string): void {
  if (y < 0 || y >= layout.length) return;
  if (x < 0 || x >= layout[y].length) return;
  layout[y][x] = ch;
}

function fillRect(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  ch: string,
): void {
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      setChar(layout, x, y, ch);
    }
  }
}

function canPlaceRect(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  forbiddenCells?: ReadonlySet<string>,
): boolean {
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      if (layout[y]?.[x] !== '.') return false;
      if (forbiddenCells?.has(vectorKey({ x, y }))) return false;
    }
  }
  return true;
}

export function tryPlaceCheeseShop(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: {
    forbiddenCells?: ReadonlySet<string>;
    margin?: number;
  } = {},
): CheeseShopPlacement | null {
  if (grid.cols < 18 || grid.rows < 14) {
    return null;
  }

  const margin = options.margin ?? 4;
  const shopWidth = 10;
  const shopHeight = 8;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = grid.cols - shopWidth - margin;
  const maxTop = grid.rows - shopHeight - margin;

  if (maxLeft < minLeft || maxTop < minTop) {
    return null;
  }

  let placement: { left: number; top: number } | null = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const left = minLeft + Math.floor(rng() * (maxLeft - minLeft + 1));
    const top = minTop + Math.floor(rng() * (maxTop - minTop + 1));
    if (
      !canPlaceRect(
        layout,
        left,
        top,
        shopWidth,
        shopHeight,
        options.forbiddenCells,
      )
    ) {
      continue;
    }
    placement = { left, top };
    break;
  }

  if (!placement) {
    return null;
  }

  // Draw the shop building
  const shopLeft = placement.left;
  const shopTop = placement.top;
  fillRect(layout, shopLeft, shopTop, shopWidth, shopHeight, 'W');

  // Draw cheese wheels on shelves
  const cheesePositions: Array<{ x: number; y: number }> = [];
  for (let y = shopTop + 1; y < shopTop + shopHeight - 1; y += 2) {
    for (let x = shopLeft + 1; x < shopLeft + shopWidth - 1; x += 2) {
      if (layout[y]?.[x] === 'W') {
        setChar(layout, x, y, 'C'); // Cheese wheel
        cheesePositions.push({ x, y });
      }
    }
  }

  // Draw the counter
  fillRect(layout, shopLeft + 3, shopTop + shopHeight - 2, 4, 1, 'C');

  // Draw the door
  setChar(layout, shopLeft + Math.floor(shopWidth / 2), shopTop + shopHeight - 1, '.');
  setChar(layout, shopLeft + Math.floor(shopWidth / 2) + 1, shopTop + shopHeight - 1, '.');

  // Place the shopkeeper
  const questX = shopLeft + Math.floor(shopWidth / 2);
  const questY = shopTop + Math.floor(shopHeight / 2);
  setChar(layout, questX, questY, 'G');

  const safeArea = {
    left: questX - 2,
    top: questY - 2,
    width: 5,
    height: 5,
  };

  const shopkeeper = {
    ...buildHouseNpcProfile(
      ['Benoit', 'Colette', 'Francois', 'Isabelle', 'Jean-Pierre'][Math.floor(rng() * 5)],
      ['sage-1', 'sage-2', 'sage-3'][Math.floor(rng() * 3)],
    ),
    x: questX,
    y: questY,
  };

  return {
    shopCenter: { x: questX, y: questY },
    safeArea,
    shopkeeper,
  };
}
