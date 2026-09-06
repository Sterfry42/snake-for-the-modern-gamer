/**
 * Lavender Farm
 */
import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import { createHumanoidIdentity } from './humanoidSpawn.js';
import { fillRect, findRandomRectPlacement, pickOne, setTile } from './structurePlacement.js';
import type { RoomSnapshot } from './types.js';

interface LavenderFarmPlacement {
  farmCenter: { x: number; y: number };
  safeArea: { left: number; top: number; width: number; height: number };
  farmer: NonNullable<RoomSnapshot['questGiver']>;
  rows: Array<{ x: number; y: number }>;
}

const FARMER_NAMES = ['Marcel', 'Helene', 'Pierre', 'Claire', 'Antoine'] as const;
const FARMER_PORTRAITS = ['sage-1', 'sage-2', 'sage-3'] as const;

export function tryPlaceLavenderFarm(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: {
    forbiddenCells?: ReadonlySet<string>;
    margin?: number;
  } = {},
): LavenderFarmPlacement | null {
  if (grid.cols < 22 || grid.rows < 16) return null;

  const farmWidth = 14;
  const farmHeight = 10;
  const placement = findRandomRectPlacement(layout, grid, rng, {
    width: farmWidth,
    height: farmHeight,
    margin: options.margin ?? 4,
    attempts: 20,
    forbiddenCells: options.forbiddenCells,
  });
  if (!placement) return null;

  const rows: Array<{ x: number; y: number }> = [];
  const rowYStart = placement.top + 1;
  const rowYEnd = placement.top + farmHeight - 2;
  const rowXStart = placement.left + 1;
  const rowXEnd = placement.left + farmWidth - 2;

  for (let y = rowYStart; y <= rowYEnd; y += 2) {
    for (let x = rowXStart; x <= rowXEnd; x += 1) {
      if (layout[y]?.[x] === '.') {
        setTile(layout, x, y, 'L');
        rows.push({ x, y });
      }
    }
  }

  const houseLeft = placement.left + farmWidth - 5;
  const houseTop = placement.top + 1;
  fillRect(layout, houseLeft, houseTop, 4, 3, 'W');
  setTile(layout, houseLeft + 1, houseTop + 2, '.');
  setTile(layout, houseLeft + 2, houseTop + 2, '.');

  const questX = placement.left + Math.floor(farmWidth / 2);
  const questY = placement.top + Math.floor(farmHeight / 2);
  setTile(layout, questX, questY, 'G');

  return {
    farmCenter: { x: questX, y: questY },
    safeArea: {
      left: questX - 2,
      top: questY - 2,
      width: 5,
      height: 5,
    },
    farmer: {
      ...createHumanoidIdentity(pickOne(FARMER_NAMES, rng), pickOne(FARMER_PORTRAITS, rng)),
      x: questX,
      y: questY,
    },
    rows,
  };
}
