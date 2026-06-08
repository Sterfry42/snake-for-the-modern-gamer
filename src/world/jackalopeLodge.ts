import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { buildHouseNpcProfile } from '../npcs/profiles.js';
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

function pick<T>(values: readonly T[], rng: RandomGenerator): T {
  return values[Math.floor(rng() * values.length)] ?? values[0]!;
}

export function tryPlaceJackalopeLodge(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: PlacementOptions = {},
): NonNullable<RoomSnapshot['jackalopeLodge']> | null {
  if (grid.cols < 24 || grid.rows < 18) {
    return null;
  }
  const margin = options.margin ?? 5;
  const width = 16;
  const height = 10;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = grid.cols - width - margin;
  const maxTop = grid.rows - height - margin;
  if (maxLeft < minLeft || maxTop < minTop) {
    return null;
  }

  let area: { left: number; top: number } | null = null;
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const left = minLeft + Math.floor(rng() * (maxLeft - minLeft + 1));
    const top = minTop + Math.floor(rng() * (maxTop - minTop + 1));
    if (canPlaceRect(layout, left, top, width, height, options.forbiddenCells)) {
      area = { left, top };
      break;
    }
  }
  if (!area) {
    return null;
  }

  fillRect(layout, area.left, area.top, width, height, 'E');
  fillRect(layout, area.left + 1, area.top + 1, width - 2, 1, 'N');
  fillRect(layout, area.left + 2, area.top + 2, 4, 3, 'M');
  fillRect(layout, area.left + width - 6, area.top + 2, 4, 3, 'M');
  fillRect(layout, area.left + 4, area.top + height - 4, 6, 2, 'F');
  setChar(layout, area.left + Math.floor(width / 2), area.top + 1, 'N');
  setChar(layout, area.left + Math.floor(width / 2), area.top + Math.floor(height / 2), 'L');
  setChar(layout, area.left + Math.floor(width / 2) - 2, area.top + Math.floor(height / 2), 'P');
  setChar(layout, area.left + Math.floor(width / 2) + 2, area.top + Math.floor(height / 2), 'P');

  const elderX = area.left + Math.floor(width / 2);
  const elderY = area.top + Math.floor(height / 2) - 2;
  const witnessSpots = [
    { x: elderX - 4, y: elderY + 4 },
    { x: elderX + 4, y: elderY + 4 },
  ];
  setChar(layout, elderX, elderY, 'G');
  witnessSpots.forEach((spot) => setChar(layout, spot.x, spot.y, 'G'));

  return {
    elder: {
      ...buildHouseNpcProfile(pick(JACKALOPE_NPC_NAMES, rng), 'sage-2'),
      x: elderX,
      y: elderY,
    },
    witnesses: witnessSpots.map((spot) => ({
      ...buildHouseNpcProfile(pick(JACKALOPE_NPC_NAMES, rng), 'sage-1'),
      x: spot.x,
      y: spot.y,
    })),
    lodgeName: pick(JACKALOPE_LODGE_NAMES, rng),
  };
}
