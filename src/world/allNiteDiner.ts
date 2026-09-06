import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import { createHumanoidIdentity } from './humanoidSpawn.js';
import {
  fillRect,
  findRandomRectPlacement,
  pickOne,
  setTile,
} from './structurePlacement.js';
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

const DINER_NPC_NAMES = [
  'Earl',
  'Tammy',
  'Sue',
  'Hank',
  'Jolene',
  'Bobby-Joe',
  'Marlene',
  'Dale',
] as const;
const WAITRESS_NAMES = ['Jolene', 'Counter Sue', 'Tammy Two-Trays', 'Marlene Mugful'] as const;
const REGULAR_NAMES = [
  'Dale at Booth 4',
  'Hank Who Nods',
  'Bobby-Joe Hashbrown',
  'Earl the Regular',
] as const;
const DINER_ATTEMPTS = 28;

interface PlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
}

export function tryPlaceAllNiteDiner(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: PlacementOptions = {},
): NonNullable<RoomSnapshot['allNiteDiner']> | null {
  if (grid.cols < 22 || grid.rows < 16) return null;

  const width = 14;
  const height = 8;
  const area = findRandomRectPlacement(layout, grid, rng, {
    width,
    height,
    margin: options.margin ?? 5,
    attempts: DINER_ATTEMPTS,
    forbiddenCells: options.forbiddenCells,
  });
  if (!area) return null;

  fillRect(layout, area.left, area.top, width, height, 'E');
  fillRect(layout, area.left + 1, area.top + 1, width - 2, 1, 'N');
  fillRect(layout, area.left + 2, area.top + 2, width - 4, 4, 'W');
  fillRect(layout, area.left + 3, area.top + 2, width - 6, 1, 'A');
  for (let x = area.left + 3; x < area.left + width - 3; x += 2) {
    setTile(layout, x, area.top + 6, 'P');
  }
  setTile(layout, area.left + Math.floor(width / 2), area.top + 1, 'N');
  setTile(layout, area.left + 1, area.top + 3, 'L');
  setTile(layout, area.left + width - 2, area.top + 3, 'L');
  setTile(layout, area.left + 4, area.top + 5, 'R');
  setTile(layout, area.left + width - 5, area.top + 5, 'R');
  setTile(layout, area.left + 2, area.top + 6, 'F');
  setTile(layout, area.left + width - 3, area.top + 6, 'F');

  const cookX = area.left + Math.floor(width / 2);
  const cookY = area.top + 3;
  const waitressX = area.left + 4;
  const waitressY = area.top + 4;
  const regularX = area.left + width - 5;
  const regularY = area.top + 4;
  setTile(layout, cookX, cookY, 'G');
  setTile(layout, waitressX, waitressY, 'G');
  setTile(layout, regularX, regularY, 'G');

  return {
    cook: {
      ...createHumanoidIdentity(pickOne(DINER_NPC_NAMES, rng), 'sage-2'),
      x: cookX,
      y: cookY,
    },
    waitress: {
      ...createHumanoidIdentity(pickOne(WAITRESS_NAMES, rng), 'sage-1'),
      x: waitressX,
      y: waitressY,
    },
    regular: {
      ...createHumanoidIdentity(pickOne(REGULAR_NAMES, rng), 'sage-1'),
      x: regularX,
      y: regularY,
    },
    sellsFood: true,
    dinerName: pickOne(DINER_NAMES, rng),
  };
}
