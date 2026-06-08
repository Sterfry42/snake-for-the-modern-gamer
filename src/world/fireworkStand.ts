import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { buildHouseNpcProfile } from '../npcs/profiles.js';
import type { RoomSnapshot } from './types.js';

const FIREWORK_STAND_NAMES = [
  'Big Boom Barn',
  'Liberty Sparks',
  "Dale's Discount Explosions",
  'Bottle Rocket Chapel',
  'The Responsible Pyromancer',
  'Roman Candle Ranch',
] as const;

const FIREWORK_VENDOR_NAMES = [
  'Firework Dale',
  'Roman Candle Randy',
  'Boom-Boom Marlene',
  'Legal Terry',
  'Sparkler Sue',
  'Bottle Rocket Bobby',
] as const;
const FIREWORK_INSPECTOR_NAMES = [
  'Inspector June',
  'Clipboard Carl',
  'Safety Marlene',
  'Permit Hank',
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

export function tryPlaceFireworkStand(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: PlacementOptions = {},
): NonNullable<RoomSnapshot['fireworkStand']> | null {
  if (grid.cols < 18 || grid.rows < 14) {
    return null;
  }
  const margin = options.margin ?? 5;
  const width = 12;
  const height = 7;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = grid.cols - width - margin;
  const maxTop = grid.rows - height - margin;
  if (maxLeft < minLeft || maxTop < minTop) {
    return null;
  }

  let area: { left: number; top: number } | null = null;
  for (let attempt = 0; attempt < 24; attempt += 1) {
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
  fillRect(layout, area.left + 2, area.top + 2, 6, 3, 'F');
  fillRect(layout, area.left + 2, area.top + 5, 3, 1, 'P');
  fillRect(layout, area.left + 5, area.top + 5, 3, 1, 'W');
  setChar(layout, area.left + 3, area.top + 1, 'N');
  setChar(layout, area.left + 9, area.top + 2, 'L');
  setChar(layout, area.left + 9, area.top + 4, 'P');
  setChar(layout, area.left + 10, area.top + 5, 'L');
  const vendorX = area.left + 8;
  const vendorY = area.top + 4;
  const inspectorX = area.left + 10;
  const inspectorY = area.top + 3;
  setChar(layout, vendorX, vendorY, 'G');
  setChar(layout, inspectorX, inspectorY, 'G');

  return {
    vendor: {
      ...buildHouseNpcProfile(pick(FIREWORK_VENDOR_NAMES, rng), 'sage-1'),
      x: vendorX,
      y: vendorY,
    },
    inspector: {
      ...buildHouseNpcProfile(pick(FIREWORK_INSPECTOR_NAMES, rng), 'sage-2'),
      x: inspectorX,
      y: inspectorY,
    },
    sellsFireworks: true,
    standName: pick(FIREWORK_STAND_NAMES, rng),
  };
}
