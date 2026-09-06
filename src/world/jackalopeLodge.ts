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

const JACKALOPE_LODGE_NAMES = [
  'Horned Hare Lodge',
  'Jackalope Rest',
  'Tall Tale Camp',
  'Antler Rabbit Society',
  'Bigfoot Picnic Ground',
  "The Witnesses' Circle",
  'The Lodge of Unverified Events',
] as const;

const JACKALOPE_NPC_NAMES = [
  'Tall-Tale Terry',
  'Marlene the Witness',
  'Buck the Lesser',
  'Dale Who Saw It',
  'The Lodge Elder',
  'Connie of the Antler',
  'Ranger Maybe',
] as const;

interface PlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
}

export function tryPlaceJackalopeLodge(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: PlacementOptions = {},
): NonNullable<RoomSnapshot['jackalopeLodge']> | null {
  if (grid.cols < 24 || grid.rows < 18) return null;

  const width = 16;
  const height = 10;
  const area = findRandomRectPlacement(layout, grid, rng, {
    width,
    height,
    margin: options.margin ?? 5,
    attempts: 32,
    forbiddenCells: options.forbiddenCells,
  });
  if (!area) return null;

  fillRect(layout, area.left, area.top, width, height, 'E');
  fillRect(layout, area.left + 1, area.top + 1, width - 2, 1, 'N');
  fillRect(layout, area.left + 2, area.top + 2, 4, 3, 'M');
  fillRect(layout, area.left + width - 6, area.top + 2, 4, 3, 'M');
  fillRect(layout, area.left + 4, area.top + height - 4, 6, 2, 'F');
  setTile(layout, area.left + Math.floor(width / 2), area.top + 1, 'N');
  setTile(layout, area.left + Math.floor(width / 2), area.top + Math.floor(height / 2), 'L');
  setTile(layout, area.left + Math.floor(width / 2) - 2, area.top + Math.floor(height / 2), 'P');
  setTile(layout, area.left + Math.floor(width / 2) + 2, area.top + Math.floor(height / 2), 'P');

  const elderX = area.left + Math.floor(width / 2);
  const elderY = area.top + Math.floor(height / 2) - 2;
  const witnessSpots = [
    { x: elderX - 4, y: elderY + 4 },
    { x: elderX + 4, y: elderY + 4 },
  ];
  setTile(layout, elderX, elderY, 'G');
  witnessSpots.forEach((spot) => setTile(layout, spot.x, spot.y, 'G'));

  return {
    elder: {
      ...createHumanoidIdentity(pickOne(JACKALOPE_NPC_NAMES, rng), 'sage-2'),
      x: elderX,
      y: elderY,
    },
    witnesses: witnessSpots.map((spot) => ({
      ...createHumanoidIdentity(pickOne(JACKALOPE_NPC_NAMES, rng), 'sage-1'),
      x: spot.x,
      y: spot.y,
    })),
    lodgeName: pickOne(JACKALOPE_LODGE_NAMES, rng),
  };
}
