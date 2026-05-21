import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { buildHouseNpcProfile } from '../npcs/profiles.js';
import type { RoomSnapshot } from './types.js';

const DINER_NAMES = [
  'Snakebite Diner',
  'The Last Pancake',
  'Midnight Griddle',
  'Chrome Spoon Cafe',
  "Big Earl's All-Nite Eats",
  'Pie & Mercy',
  'The Bottomless Mug',
  'Blue Plate Mirage',
  'Dustfork Diner',
] as const;

const DINER_NPC_NAMES = ['Earl', 'Tammy', 'Sue', 'Hank', 'Jolene', 'Bobby-Joe', 'Marlene', 'Dale'] as const;
const WAITRESS_NAMES = ['Jolene', 'Counter Sue', 'Tammy Two-Trays', 'Marlene Mugful'] as const;
const REGULAR_NAMES = ['Dale at Booth 4', 'Hank Who Nods', 'Bobby-Joe Hashbrown', 'Earl the Regular'] as const;
const DINER_ATTEMPTS = 28;

interface PlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
}

function setChar(layout: string[][], x: number, y: number, ch: string): void {
  if (y < 0 || y >= layout.length) return;
  if (x < 0 || x >= layout[y].length) return;
  layout[y][x] = ch;
}

function fillRect(layout: string[][], left: number, top: number, width: number, height: number, ch: string): void {
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

function pick<T>(values: readonly T[], rng: RandomGenerator): T {
  return values[Math.floor(rng() * values.length)] ?? values[0]!;
}

export function tryPlaceAllNiteDiner(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: PlacementOptions = {},
): NonNullable<RoomSnapshot['allNiteDiner']> | null {
  if (grid.cols < 22 || grid.rows < 16) {
    return null;
  }
  const margin = options.margin ?? 5;
  const width = 14;
  const height = 8;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = grid.cols - width - margin;
  const maxTop = grid.rows - height - margin;
  if (maxLeft < minLeft || maxTop < minTop) {
    return null;
  }

  let area: { left: number; top: number } | null = null;
  for (let attempt = 0; attempt < DINER_ATTEMPTS; attempt += 1) {
    const left = minLeft + Math.floor(rng() * (maxLeft - minLeft + 1));
    const top = minTop + Math.floor(rng() * (maxTop - minTop + 1));
    if (canPlaceRect(layout, left, top, width, height, options.forbiddenCells)) {
      area = { left, top };
      break;
    }
  }
  if (!area) {
    return null;
  }

  fillRect(layout, area.left, area.top, width, height, 'E');
  fillRect(layout, area.left + 1, area.top + 1, width - 2, 1, 'N');
  fillRect(layout, area.left + 2, area.top + 2, width - 4, 4, 'W');
  fillRect(layout, area.left + 3, area.top + 2, width - 6, 1, 'A');
  for (let x = area.left + 3; x < area.left + width - 3; x += 2) {
    setChar(layout, x, area.top + 6, 'P');
  }
  setChar(layout, area.left + Math.floor(width / 2), area.top + 1, 'N');
  setChar(layout, area.left + 1, area.top + 3, 'L');
  setChar(layout, area.left + width - 2, area.top + 3, 'L');
  setChar(layout, area.left + 4, area.top + 5, 'R');
  setChar(layout, area.left + width - 5, area.top + 5, 'R');
  setChar(layout, area.left + 2, area.top + 6, 'F');
  setChar(layout, area.left + width - 3, area.top + 6, 'F');
  const cookX = area.left + Math.floor(width / 2);
  const cookY = area.top + 3;
  const waitressX = area.left + 4;
  const waitressY = area.top + 4;
  const regularX = area.left + width - 5;
  const regularY = area.top + 4;
  setChar(layout, cookX, cookY, 'G');
  setChar(layout, waitressX, waitressY, 'G');
  setChar(layout, regularX, regularY, 'G');

  return {
    cook: {
      ...buildHouseNpcProfile(pick(DINER_NPC_NAMES, rng), 'sage-2'),
      x: cookX,
      y: cookY,
    },
    waitress: {
      ...buildHouseNpcProfile(pick(WAITRESS_NAMES, rng), 'sage-1'),
      x: waitressX,
      y: waitressY,
    },
    regular: {
      ...buildHouseNpcProfile(pick(REGULAR_NAMES, rng), 'sage-1'),
      x: regularX,
      y: regularY,
    },
    sellsFood: true,
    dinerName: pick(DINER_NAMES, rng),
  };
}
