import type { GridConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { createHumanoidSpawn } from './humanoidSpawn.js';
import {
  fillRect,
  findRandomRectPlacement,
  pickOne,
  setTile,
} from './structurePlacement.js';
import type { RoomSnapshot } from './types.js';

const TENGU_NAMES = [
  'Karasu',
  'Tengu no Yashiro',
  'Soba',
  'Kuro',
  'Beni',
  'Yamabiko',
  'Kamui',
] as const;
const TENGU_ATTEMPTS = 32;
const TENGU_MARGIN = 5;
const SAFE_AREA_PADDING = 5;

interface TenguCampPlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
}

export function tryPlaceTenguCamp(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: TenguCampPlacementOptions = {},
): NonNullable<RoomSnapshot['tenguCamp']> | null {
  if (grid.cols < 24 || grid.rows < 18) return null;

  const coreWidth = 8;
  const coreHeight = 4;
  const footprintWidth = coreWidth + SAFE_AREA_PADDING * 2;
  const footprintHeight = coreHeight + SAFE_AREA_PADDING * 2;
  const camp = findRandomRectPlacement(layout, grid, rng, {
    width: footprintWidth,
    height: footprintHeight,
    margin: options.margin ?? TENGU_MARGIN,
    attempts: TENGU_ATTEMPTS,
    forbiddenCells: options.forbiddenCells,
  });
  if (!camp) return null;

  const center = {
    x: camp.left + Math.floor(camp.width / 2),
    y: camp.top + Math.floor(camp.height / 2),
  };

  fillRect(layout, camp.left, camp.top, camp.width, camp.height, 'E');

  const coreLeft = camp.left + SAFE_AREA_PADDING;
  const coreTop = camp.top + SAFE_AREA_PADDING;
  fillRect(layout, coreLeft, coreTop, coreWidth, coreHeight, 'E');

  const tents = [
    { x: camp.left + 1, y: camp.top + 1 },
    { x: camp.left + camp.width - 4, y: camp.top + 1 },
    { x: camp.left + 2, y: camp.top + camp.height - 4 },
  ];

  const feathers: Vector2Like[] = [];
  tents.forEach((tent) => {
    setTile(layout, tent.x + 1, tent.y, 'M');
    fillRect(layout, tent.x, tent.y + 1, 3, 2, 'M');
    setTile(layout, tent.x + 1, tent.y + 2, '.');
    feathers.push({ x: tent.x + 1, y: tent.y - 1 });
  });

  [
    { x: center.x - 1, y: center.y },
    { x: center.x + 2, y: center.y + 1 },
  ].forEach((fire) => setTile(layout, fire.x, fire.y, 'L'));

  const chieftainSpot = { x: center.x, y: center.y - 1 };
  setTile(layout, chieftainSpot.x, chieftainSpot.y, 'G');
  const guardSpots = [
    { x: center.x - 3, y: center.y + 1 },
    { x: center.x + 4, y: center.y - 1 },
  ];
  guardSpots.forEach((spot) => setTile(layout, spot.x, spot.y, 'G'));

  return {
    chieftain: createHumanoidSpawn(
      `${pickOne(TENGU_NAMES, rng)} the Elder`,
      chieftainSpot.x,
      chieftainSpot.y,
      'sage-2',
    ),
    feathers,
  };
}
