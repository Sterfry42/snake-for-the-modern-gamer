import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { buildHouseNpcProfile } from '../npcs/profiles.js';
import type { RoomSnapshot } from './types.js';

const CAMP_NAMES = [
  'Ledgerbite Camp',
  'The Bad Contract',
  'Muckstamp Hollow',
  'Needletooth Rest',
  'The Green Notary',
] as const;

const GOBLIN_NAMES = ['Grib', 'Nackle', 'Mott', 'Scrip', 'Vellum-Fang', 'Dreg Penny'] as const;
const CAMP_ATTEMPTS = 32;
const CAMP_MARGIN = 5;

interface GoblinCampPlacementOptions {
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

function drawTent(layout: string[][], left: number, top: number): void {
  setChar(layout, left + 1, top, 'T');
  fillRect(layout, left, top + 1, 3, 2, 'S');
  setChar(layout, left + 1, top + 2, '.');
}

function randomName(rng: RandomGenerator): string {
  return GOBLIN_NAMES[Math.floor(rng() * GOBLIN_NAMES.length)]!;
}

export function tryPlaceGoblinCamp(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: GoblinCampPlacementOptions = {},
): NonNullable<RoomSnapshot['goblinCamp']> | null {
  if (grid.cols < 24 || grid.rows < 18) {
    return null;
  }

  const margin = options.margin ?? CAMP_MARGIN;
  const footprintWidth = 16;
  const footprintHeight = 10;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = grid.cols - footprintWidth - margin;
  const maxTop = grid.rows - footprintHeight - margin;

  if (maxLeft < minLeft || maxTop < minTop) {
    return null;
  }

  let camp: { left: number; top: number; width: number; height: number } | null = null;
  for (let attempt = 0; attempt < CAMP_ATTEMPTS; attempt += 1) {
    const left = minLeft + Math.floor(rng() * (maxLeft - minLeft + 1));
    const top = minTop + Math.floor(rng() * (maxTop - minTop + 1));
    if (!canPlaceRect(layout, left, top, footprintWidth, footprintHeight, options.forbiddenCells)) {
      continue;
    }
    camp = { left, top, width: footprintWidth, height: footprintHeight };
    break;
  }

  if (!camp) {
    return null;
  }

  const center = {
    x: camp.left + Math.floor(camp.width / 2),
    y: camp.top + Math.floor(camp.height / 2),
  };

  fillRect(layout, camp.left + 4, camp.top + 3, 8, 4, 'E');

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
  fires.forEach((fire) => setChar(layout, fire.x, fire.y, 'L'));

  const shopSpot = { x: center.x, y: center.y - 1 };
  setChar(layout, shopSpot.x, shopSpot.y, 'G');
  const guardSpots = [
    { x: center.x - 3, y: center.y + 1 },
    { x: center.x + 4, y: center.y - 1 },
  ];
  guardSpots.forEach((spot) => setChar(layout, spot.x, spot.y, 'G'));

  const campName = CAMP_NAMES[Math.floor(rng() * CAMP_NAMES.length)]!;
  return {
    id: `goblin-camp:${camp.left},${camp.top}`,
    name: campName,
    center,
    tents,
    fires,
    guards: guardSpots.map((spot) => ({
      ...buildHouseNpcProfile(randomName(rng), 'sage-2'),
      x: spot.x,
      y: spot.y,
    })),
    shopkeeper: {
      ...buildHouseNpcProfile(`${randomName(rng)} the Clerk`, 'sage-1'),
      x: shopSpot.x,
      y: shopSpot.y,
    },
  };
}
