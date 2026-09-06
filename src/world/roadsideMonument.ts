import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import { createHumanoidIdentity } from './humanoidSpawn.js';
import { fillRect, findRandomRectPlacement, pickOne, setTile } from './structurePlacement.js';
import type { RoomSnapshot } from './types.js';

const MONUMENT_NAMES = [
  "Eagle's Rest Monument",
  "Founders' Boulder",
  'The Great Bell That Never Rang',
  'Old Glory Stone',
  'The Big Plaque',
  'Liberty Teeth Memorial',
  'Monument to the Unknown Shopper',
  'Sunset Civic Rock',
  'The Eternal Grill',
] as const;

const DOCENT_NAMES = ['Walt', 'Marlene', 'Pastor Dale', 'Ranger Buck', 'Tammy', 'Earl'] as const;
const RANGER_NAMES = ['Ranger Buck', 'Volunteer Connie', 'Plaque Tammy', 'Docent Dale'] as const;
const MONUMENT_ATTEMPTS = 32;
const MONUMENT_MARGIN = 5;

interface PlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
}

export function tryPlaceRoadsideMonument(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: PlacementOptions = {},
): NonNullable<RoomSnapshot['roadsideMonument']> | null {
  if (grid.cols < 24 || grid.rows < 18) return null;

  const width = 16;
  const height = 10;
  const area = findRandomRectPlacement(layout, grid, rng, {
    width,
    height,
    margin: options.margin ?? MONUMENT_MARGIN,
    attempts: MONUMENT_ATTEMPTS,
    forbiddenCells: options.forbiddenCells,
  });
  if (!area) return null;

  fillRect(layout, area.left, area.top, width, height, 'E');
  const centerX = area.left + Math.floor(width / 2);
  const monumentTop = area.top + 2;
  fillRect(layout, area.left + 2, area.top + 1, width - 4, 1, 'W');
  fillRect(layout, centerX - 2, monumentTop, 5, 3, '#');
  fillRect(layout, centerX - 1, monumentTop - 1, 3, 1, 'M');
  setTile(layout, centerX, monumentTop - 2, 'L');
  setTile(layout, centerX + 4, monumentTop + 2, 'N');
  setTile(layout, centerX - 4, monumentTop + 2, 'N');
  setTile(layout, centerX - 5, monumentTop + 3, 'L');
  setTile(layout, centerX + 5, monumentTop + 4, 'L');
  setTile(layout, centerX - 6, monumentTop + 5, 'P');
  setTile(layout, centerX + 6, monumentTop + 5, 'P');
  for (let y = monumentTop + 4; y < area.top + height; y += 1) {
    setTile(layout, centerX, y, 'W');
  }

  const docentX = centerX + 3;
  const docentY = monumentTop + 4;
  const rangerX = centerX - 3;
  const rangerY = monumentTop + 4;
  setTile(layout, docentX, docentY, 'G');
  setTile(layout, rangerX, rangerY, 'G');

  return {
    docent: {
      ...createHumanoidIdentity(pickOne(DOCENT_NAMES, rng), 'sage-1'),
      x: docentX,
      y: docentY,
    },
    ranger: {
      ...createHumanoidIdentity(pickOne(RANGER_NAMES, rng), 'sage-2'),
      x: rangerX,
      y: rangerY,
    },
    hasBlessings: true,
    monumentName: pickOne(MONUMENT_NAMES, rng),
  };
}
