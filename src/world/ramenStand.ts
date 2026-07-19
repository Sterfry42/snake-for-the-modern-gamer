import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { buildHouseNpcProfile } from '../npcs/profiles.js';
import type { RoomSnapshot } from './types.js';

const STAND_NAMES = [
  'Drifting Steam Ramen',
  'Flickering Lantern Eats',
  'Whispering Bowl Ramen',
  'Moonlight Ramen Stall',
  'Silent Chopsticks Ramen',
  'Spiral Broth Ramen',
] as const;

const CHEF_NAMES = ['Goro', 'Tetsu', 'Shin', 'Katsu', 'Ryu', 'Hiro', 'Kenji'] as const;
const RAMEN_STAND_ATTEMPTS = 24;
const RAMEN_STAND_MARGIN = 5;
const SAFE_AREA_PADDING = 4;

interface RamenStandPlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
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

function randomChefName(rng: RandomGenerator): string {
  return CHEF_NAMES[Math.floor(rng() * CHEF_NAMES.length)]!;
}

export function tryPlaceRamenStand(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: RamenStandPlacementOptions = {},
): NonNullable<RoomSnapshot['ramenStand']> | null {
  if (grid.cols < 16 || grid.rows < 14) {
    return null;
  }

  const margin = options.margin ?? RAMEN_STAND_MARGIN;
  const standWidth = 4;
  const standHeight = 3;
  const footprintWidth = standWidth + SAFE_AREA_PADDING * 2;
  const footprintHeight = standHeight + SAFE_AREA_PADDING * 2;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = grid.cols - footprintWidth - margin;
  const maxTop = grid.rows - footprintHeight - margin;

  if (maxLeft < minLeft || maxTop < minTop) {
    return null;
  }

  let stand: { left: number; top: number; width: number; height: number } | null = null;
  for (let attempt = 0; attempt < RAMEN_STAND_ATTEMPTS; attempt += 1) {
    const left = minLeft + Math.floor(rng() * (maxLeft - minLeft + 1));
    const top = minTop + Math.floor(rng() * (maxTop - minTop + 1));
    if (!canPlaceRect(layout, left, top, footprintWidth, footprintHeight, options.forbiddenCells)) {
      continue;
    }
    stand = { left, top, width: footprintWidth, height: footprintHeight };
    break;
  }

  if (!stand) {
    return null;
  }

  ({
    x: stand.left + Math.floor(stand.width / 2),
    y: stand.top + Math.floor(stand.height / 2),
  });

  const safeArea = {
    left: stand.left,
    top: stand.top,
    width: stand.width,
    height: stand.height,
  };
  fillRect(layout, safeArea.left, safeArea.top, safeArea.width, safeArea.height, 'E');

  const standLeft = stand.left + SAFE_AREA_PADDING;
  const standTop = stand.top + SAFE_AREA_PADDING;

  fillRect(layout, standLeft, standTop, standWidth, standHeight, '#');

  for (let y = standTop + 1; y < standTop + 2; y += 1) {
    for (let x = standLeft + 1; x < standLeft + standWidth - 1; x += 1) {
      if (layout[y]?.[x] === '#') {
        layout[y][x] = '.';
      }
    }
  }

  setChar(layout, standLeft + 1, standTop, 'R');
  setChar(layout, standLeft + 2, standTop, 'R');
  setChar(layout, standLeft, standTop + 1, 'R');
  setChar(layout, standLeft + 3, standTop + 1, 'R');

  const poolX = standLeft + standWidth + 1;
  const poolY = standTop + 1;
  fillRect(layout, poolX, poolY, 2, 2, '~');

  const chefX = standLeft + standWidth + 1;
  const chefY = standTop + 2;
  setChar(layout, chefX, chefY, 'G');

  STAND_NAMES[Math.floor(rng() * STAND_NAMES.length)]!;

  return {
    chef: {
      ...buildHouseNpcProfile(randomChefName(rng), 'sage-2'),
      x: chefX,
      y: chefY,
    },
    sellsRamen: true,
  };
}
