import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { buildHouseNpcProfile } from '../npcs/profiles.js';
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

function setChar(layout: string[][], x: number, y: number, ch: string): void {
  if (y < 0 || y >= layout.length) return;
  if (x < 0 || x >= layout[y].length) return;
  layout[y][x] = ch;
}

function fillRect(layout: string[][], left: number, top: number, width: number, height: number, ch: string): void {
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

export function tryPlaceRoadsideMonument(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: PlacementOptions = {},
): NonNullable<RoomSnapshot['roadsideMonument']> | null {
  if (grid.cols < 24 || grid.rows < 18) {
    return null;
  }

  const margin = options.margin ?? MONUMENT_MARGIN;
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
  for (let attempt = 0; attempt < MONUMENT_ATTEMPTS; attempt += 1) {
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
  const centerX = area.left + Math.floor(width / 2);
  const monumentTop = area.top + 2;
  fillRect(layout, area.left + 2, area.top + 1, width - 4, 1, 'W');
  fillRect(layout, centerX - 2, monumentTop, 5, 3, '#');
  fillRect(layout, centerX - 1, monumentTop - 1, 3, 1, 'M');
  setChar(layout, centerX, monumentTop - 2, 'L');
  setChar(layout, centerX + 4, monumentTop + 2, 'N');
  setChar(layout, centerX - 4, monumentTop + 2, 'N');
  setChar(layout, centerX - 5, monumentTop + 3, 'L');
  setChar(layout, centerX + 5, monumentTop + 4, 'L');
  setChar(layout, centerX - 6, monumentTop + 5, 'P');
  setChar(layout, centerX + 6, monumentTop + 5, 'P');
  for (let y = monumentTop + 4; y < area.top + height; y += 1) {
    setChar(layout, centerX, y, 'W');
  }

  const docentX = centerX + 3;
  const docentY = monumentTop + 4;
  const rangerX = centerX - 3;
  const rangerY = monumentTop + 4;
  setChar(layout, docentX, docentY, 'G');
  setChar(layout, rangerX, rangerY, 'G');

  return {
    docent: {
      ...buildHouseNpcProfile(pick(DOCENT_NAMES, rng), 'sage-1'),
      x: docentX,
      y: docentY,
    },
    ranger: {
      ...buildHouseNpcProfile(pick(RANGER_NAMES, rng), 'sage-2'),
      x: rangerX,
      y: rangerY,
    },
    hasBlessings: true,
    monumentName: pick(MONUMENT_NAMES, rng),
  };
}
