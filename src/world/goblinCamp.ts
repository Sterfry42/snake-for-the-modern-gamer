import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import { pickNpcName } from '../npcs/npcNames.js';
import { createHumanoidSpawn } from './humanoidSpawn.js';
import { fillRect, findRandomRectPlacement, pickOne, setTile } from './structurePlacement.js';
import type { RoomSnapshot } from './types.js';

const CAMP_NAMES = [
  'Ledgerbite Camp',
  'The Bad Contract',
  'Muckstamp Hollow',
  'Needletooth Rest',
  'The Green Notary',
] as const;

const CAMP_ATTEMPTS = 32;
const CAMP_MARGIN = 5;
const SAFE_AREA_PADDING = 5;

interface GoblinCampPlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
}

function drawTent(layout: string[][], left: number, top: number): void {
  setTile(layout, left + 1, top, 'T');
  fillRect(layout, left, top + 1, 3, 2, 'S');
  setTile(layout, left + 1, top + 2, '.');
}

function randomName(rng: RandomGenerator): string {
  return pickNpcName('goblin', rng);
}

export function tryPlaceGoblinCamp(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: GoblinCampPlacementOptions = {},
): NonNullable<RoomSnapshot['goblinCamp']> | null {
  if (grid.cols < 24 || grid.rows < 18) return null;

  const coreWidth = 8;
  const coreHeight = 4;
  const footprintWidth = coreWidth + SAFE_AREA_PADDING * 2;
  const footprintHeight = coreHeight + SAFE_AREA_PADDING * 2;
  const camp = findRandomRectPlacement(layout, grid, rng, {
    width: footprintWidth,
    height: footprintHeight,
    margin: options.margin ?? CAMP_MARGIN,
    attempts: CAMP_ATTEMPTS,
    forbiddenCells: options.forbiddenCells,
  });
  if (!camp) return null;

  const center = {
    x: camp.left + Math.floor(camp.width / 2),
    y: camp.top + Math.floor(camp.height / 2),
  };
  const safeArea = {
    left: camp.left,
    top: camp.top,
    width: camp.width,
    height: camp.height,
  };
  fillRect(layout, safeArea.left, safeArea.top, safeArea.width, safeArea.height, 'E');

  const coreLeft = camp.left + SAFE_AREA_PADDING;
  const coreTop = camp.top + SAFE_AREA_PADDING;
  fillRect(layout, coreLeft, coreTop, coreWidth, coreHeight, 'E');

  const tents = [
    { x: camp.left + 1, y: camp.top + 1 },
    { x: camp.left + camp.width - 4, y: camp.top + 1 },
    { x: camp.left + 2, y: camp.top + camp.height - 4 },
  ];
  tents.forEach((tent) => drawTent(layout, tent.x, tent.y));

  const fires = [
    { x: center.x - 1, y: center.y },
    { x: center.x + 2, y: center.y + 1 },
  ];
  fires.forEach((fire) => setTile(layout, fire.x, fire.y, 'L'));

  const shopSpot = { x: center.x, y: center.y - 1 };
  setTile(layout, shopSpot.x, shopSpot.y, 'G');
  const guardSpots = [
    { x: center.x - 3, y: center.y + 1 },
    { x: center.x + 4, y: center.y - 1 },
  ];
  guardSpots.forEach((spot) => setTile(layout, spot.x, spot.y, 'G'));

  return {
    id: `goblin-camp:${camp.left},${camp.top}`,
    name: pickOne(CAMP_NAMES, rng),
    center,
    safeArea,
    tents,
    fires,
    guards: guardSpots.map((spot) =>
      createHumanoidSpawn(randomName(rng), spot.x, spot.y, 'sage-2'),
    ),
    shopkeeper: createHumanoidSpawn(
      `${randomName(rng)} the Clerk`,
      shopSpot.x,
      shopSpot.y,
      'sage-1',
    ),
  };
}
