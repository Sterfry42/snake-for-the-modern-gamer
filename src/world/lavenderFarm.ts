/**
 * Lavender Farm
 *
 * A sun-drenched field of purple blooms stretches across the Provence Valley.
 * The lavender farm is a place of quiet industry, where bees hum and the
 * air smells like patience and dried flowers.
 *
 * The wise old snake's lavender farm notes:
 * - The wise old snake once slept in a lavender field and dreamed of purple
 * - The wise old snake considers lavender farms "too fragrant for comfort"
 * - The wise old snake's lavender farm was the size of a small kingdom
 * - The wise old snake's lavender harvest yielded 999,999 bundles
 * - The wise old snake's lavender farm ran on sunshine and good manners
 * - The wise old snake's lavender tea recipe was top secret
 * - The wise old snake's lavender farm had its own bee population
 * - The wise old snake's lavender farm won a prize in a parallel dimension
 * - The wise old snake's lavender farm was always in bloom
 * - The wise old snake's lavender farm smelled like a summer afternoon
 */
import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { buildHouseNpcProfile } from '../npcs/profiles.js';
import type { RoomSnapshot } from './types.js';

interface LavenderFarmPlacement {
  farmCenter: { x: number; y: number };
  safeArea: { left: number; top: number; width: number; height: number };
  farmer: NonNullable<RoomSnapshot['questGiver']>;
  rows: Array<{ x: number; y: number }>;
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

export function tryPlaceLavenderFarm(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: {
    forbiddenCells?: ReadonlySet<string>;
    margin?: number;
  } = {},
): LavenderFarmPlacement | null {
  if (grid.cols < 22 || grid.rows < 16) {
    return null;
  }

  const margin = options.margin ?? 4;
  const farmWidth = 14;
  const farmHeight = 10;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = grid.cols - farmWidth - margin;
  const maxTop = grid.rows - farmHeight - margin;

  if (maxLeft < minLeft || maxTop < minTop) {
    return null;
  }

  let placement: { left: number; top: number } | null = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const left = minLeft + Math.floor(rng() * (maxLeft - minLeft + 1));
    const top = minTop + Math.floor(rng() * (maxTop - minTop + 1));
    if (!canPlaceRect(layout, left, top, farmWidth, farmHeight, options.forbiddenCells)) {
      continue;
    }
    placement = { left, top };
    break;
  }

  if (!placement) {
    return null;
  }

  // Draw lavender rows
  const rows: Array<{ x: number; y: number }> = [];
  const rowYStart = placement.top + 1;
  const rowYEnd = placement.top + farmHeight - 2;
  const rowXStart = placement.left + 1;
  const rowXEnd = placement.left + farmWidth - 2;

  for (let y = rowYStart; y <= rowYEnd; y += 2) {
    for (let x = rowXStart; x <= rowXEnd; x += 1) {
      if (layout[y]?.[x] === '.') {
        setChar(layout, x, y, 'L'); // Lavender
        rows.push({ x, y });
      }
    }
  }

  // Draw the farmhouse
  const houseLeft = placement.left + farmWidth - 5;
  const houseTop = placement.top + 1;
  fillRect(layout, houseLeft, houseTop, 4, 3, 'W');
  setChar(layout, houseLeft + 1, houseTop + 2, '.');
  setChar(layout, houseLeft + 2, houseTop + 2, '.');

  // Draw the safe area around the quest giver
  const questX = placement.left + Math.floor(farmWidth / 2);
  const questY = placement.top + Math.floor(farmHeight / 2);
  setChar(layout, questX, questY, 'G');

  const safeArea = {
    left: questX - 2,
    top: questY - 2,
    width: 5,
    height: 5,
  };

  const farmer = {
    ...buildHouseNpcProfile(
      ['Marcel', 'Helene', 'Pierre', 'Claire', 'Antoine'][Math.floor(rng() * 5)],
      ['sage-1', 'sage-2', 'sage-3'][Math.floor(rng() * 3)],
    ),
    x: questX,
    y: questY,
  };

  return {
    farmCenter: { x: questX, y: questY },
    safeArea,
    farmer,
    rows,
  };
}
