import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { buildHouseNpcProfile } from '../npcs/profiles.js';
import type { Vector2Like } from '../core/math.js';
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

function randomTenguName(rng: RandomGenerator): string {
  return TENGU_NAMES[Math.floor(rng() * TENGU_NAMES.length)]!;
}

export function tryPlaceTenguCamp(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: TenguCampPlacementOptions = {},
): NonNullable<RoomSnapshot['tenguCamp']> | null {
  if (grid.cols < 24 || grid.rows < 18) {
    return null;
  }

  const margin = options.margin ?? TENGU_MARGIN;
  const coreWidth = 8;
  const coreHeight = 4;
  const footprintWidth = coreWidth + SAFE_AREA_PADDING * 2;
  const footprintHeight = coreHeight + SAFE_AREA_PADDING * 2;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = grid.cols - footprintWidth - margin;
  const maxTop = grid.rows - footprintHeight - margin;

  if (maxLeft < minLeft || maxTop < minTop) {
    return null;
  }

  let camp: { left: number; top: number; width: number; height: number } | null = null;
  for (let attempt = 0; attempt < TENGU_ATTEMPTS; attempt += 1) {
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

  const feathers: Vector2Like[] = [];

  tents.forEach((tent, _index) => {
    setChar(layout, tent.x + 1, tent.y, 'M');
    fillRect(layout, tent.x, tent.y + 1, 3, 2, 'M');
    setChar(layout, tent.x + 1, tent.y + 2, '.');
    feathers.push({ x: tent.x + 1, y: tent.y - 1 });
  });

  const fires = [
    { x: center.x - 1, y: center.y },
    { x: center.x + 2, y: center.y + 1 },
  ];
  fires.forEach((fire) => setChar(layout, fire.x, fire.y, 'L'));

  const chieftainSpot = { x: center.x, y: center.y - 1 };
  setChar(layout, chieftainSpot.x, chieftainSpot.y, 'G');
  const guardSpots = [
    { x: center.x - 3, y: center.y + 1 },
    { x: center.x + 4, y: center.y - 1 },
  ];
  guardSpots.forEach((spot) => setChar(layout, spot.x, spot.y, 'G'));

  const chieftainName = randomTenguName(rng);

  return {
    chieftain: {
      ...buildHouseNpcProfile(`${chieftainName} the Elder`, 'sage-2'),
      x: chieftainSpot.x,
      y: chieftainSpot.y,
    },
    feathers,
  };
}
