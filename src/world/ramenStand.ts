import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import { createHumanoidSpawn } from './humanoidSpawn.js';
import { fillRect, findRandomRectPlacement, pickOne, setTile } from './structurePlacement.js';
import type { RoomSnapshot } from './types.js';

const CHEF_NAMES = ['Goro', 'Tetsu', 'Shin', 'Katsu', 'Ryu', 'Hiro', 'Kenji'] as const;
const RAMEN_STAND_ATTEMPTS = 24;
const RAMEN_STAND_MARGIN = 5;
const SAFE_AREA_PADDING = 4;

interface RamenStandPlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
}

export function tryPlaceRamenStand(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: RamenStandPlacementOptions = {},
): NonNullable<RoomSnapshot['ramenStand']> | null {
  if (grid.cols < 16 || grid.rows < 14) return null;

  const standWidth = 4;
  const standHeight = 3;
  const footprintWidth = standWidth + SAFE_AREA_PADDING * 2;
  const footprintHeight = standHeight + SAFE_AREA_PADDING * 2;
  const stand = findRandomRectPlacement(layout, grid, rng, {
    width: footprintWidth,
    height: footprintHeight,
    margin: options.margin ?? RAMEN_STAND_MARGIN,
    attempts: RAMEN_STAND_ATTEMPTS,
    forbiddenCells: options.forbiddenCells,
  });
  if (!stand) return null;

  fillRect(layout, stand.left, stand.top, stand.width, stand.height, 'E');

  const standLeft = stand.left + SAFE_AREA_PADDING;
  const standTop = stand.top + SAFE_AREA_PADDING;
  fillRect(layout, standLeft, standTop, standWidth, standHeight, '#');

  for (let x = standLeft + 1; x < standLeft + standWidth - 1; x += 1) {
    if (layout[standTop + 1]?.[x] === '#') setTile(layout, x, standTop + 1, '.');
  }

  setTile(layout, standLeft + 1, standTop, 'R');
  setTile(layout, standLeft + 2, standTop, 'R');
  setTile(layout, standLeft, standTop + 1, 'R');
  setTile(layout, standLeft + 3, standTop + 1, 'R');

  const poolX = standLeft + standWidth + 1;
  const poolY = standTop + 1;
  fillRect(layout, poolX, poolY, 2, 2, '~');

  const chefX = standLeft + standWidth + 1;
  const chefY = standTop + 2;
  setTile(layout, chefX, chefY, 'G');

  return {
    chef: createHumanoidSpawn(pickOne(CHEF_NAMES, rng), chefX, chefY, 'sage-2'),
    sellsRamen: true,
  };
}
