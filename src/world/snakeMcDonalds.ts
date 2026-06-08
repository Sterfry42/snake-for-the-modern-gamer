import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';

export interface McDonaldsData {
  cashier: {
    name: string;
    x: number;
    y: number;
  };
  toilet: {
    x: number;
    y: number;
  };
  bounds: { left: number; top: number; width: number; height: number };
}

const CASHIER_NAMES = [
  'McSlither',
  'Hamburgula',
  'The Fry Knight',
  'Sir Scales-a-Lot',
  'Burgerbeast',
] as const;

const MC_BUILDING_WIDTH = 16;
const MC_BUILDING_HEIGHT = 12;
const MC_MARGIN = 3;
const MC_ATTEMPTS = 20;

function setChar(layout: string[][], x: number, y: number, ch: string): void {
  if (y < 0 || y >= layout.length) return;
  if (x < 0 || y >= layout[y].length) return;
  layout[y][x] = ch;
}

function canPlaceRect(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  forbiddenCells?: ReadonlySet<string>,
): boolean {
  for (let y = top; y < top + height; y++) {
    for (let x = left; x < left + width; x++) {
      if (layout[y]?.[x] !== '.') return false;
      if (forbiddenCells?.has(vectorKey({ x, y }))) return false;
    }
  }
  return true;
}

export function tryPlaceSnakeMcDonalds(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: { forbiddenCells?: ReadonlySet<string>; margin?: number } = {},
): McDonaldsData | null {
  const margin = options.margin ?? MC_MARGIN;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = grid.cols - MC_BUILDING_WIDTH - margin;
  const maxTop = grid.rows - MC_BUILDING_HEIGHT - margin;

  if (maxLeft < minLeft || maxTop < minTop) return null;

  for (let attempt = 0; attempt < MC_ATTEMPTS; attempt++) {
    const left = minLeft + Math.floor(rng() * (maxLeft - minLeft + 1));
    const top = minTop + Math.floor(rng() * (maxTop - minTop + 1));

    if (
      !canPlaceRect(
        layout,
        left,
        top,
        MC_BUILDING_WIDTH,
        MC_BUILDING_HEIGHT,
        options.forbiddenCells,
      )
    ) {
      continue;
    }

    const right = left + MC_BUILDING_WIDTH - 1;
    const bottom = top + MC_BUILDING_HEIGHT - 1;

    // Outer walls
    for (let y = top; y <= bottom; y++) {
      setChar(layout, left, y, '#');
      setChar(layout, right, y, '#');
    }
    for (let x = left; x <= right; x++) {
      setChar(layout, x, top, '#');
      setChar(layout, x, bottom, '#');
    }

    // Interior walls (mark all interior cells including bottom row)
    for (let y = top + 1; y < bottom; y++) {
      for (let x = left + 1; x < right; x++) {
        setChar(layout, x, y, 'W');
      }
    }

    // Floor (uniform throughout entire building interior)
    for (let y = top + 1; y < bottom; y++) {
      for (let x = left + 1; x < right; x++) {
        setChar(layout, x, y, 'E');
      }
    }

    // Sign
    const signY = top + 1;
    const signLeft = left + 2;
    for (let i = 0; i < 5; i++) {
      setChar(layout, signLeft + i, signY, 'M');
    }

    // Counter (north side of main area)
    const counterY = top + 3;
    const counterXStart = left + 1;
    const counterXEnd = left + 6;
    for (let x = counterXStart; x <= counterXEnd; x++) {
      setChar(layout, x, counterY, '#');
      setChar(layout, x, counterY + 1, '#');
    }

    // Cashier position (behind counter, one step up)
    const cashierX = Math.floor((counterXStart + counterXEnd) / 2);
    const cashierY = counterY - 1;
    setChar(layout, cashierX, cashierY, 'C');

    // Dedicated bathroom room (bottom-right corner)
    // Interior: 4 wide x 3 tall, bounded by building outer walls on right and bottom
    // Interior x: right-4 to right-1, y: bottom-3 to bottom-2

    // Left wall (separates bathroom from main area)
    for (let y = bottom - 4; y <= bottom - 2; y++) {
      setChar(layout, right - 5, y, '#');
    }
    // Top wall
    for (let x = right - 5; x <= right - 1; x++) {
      setChar(layout, x, bottom - 4, '#');
    }

    // Bathroom door (opening in left wall)
    setChar(layout, right - 5, bottom - 3, '.');

    // Toilet position (inside bathroom)
    const toiletX = right - 2;
    const toiletY = bottom - 2;
    setChar(layout, toiletX, toiletY, 'R');

    // South entrance door
    const doorX = left + Math.floor(MC_BUILDING_WIDTH / 2);
    setChar(layout, doorX, bottom, '.');
    setChar(layout, doorX, bottom - 1, 'T');

    const name = CASHIER_NAMES[Math.floor(rng() * CASHIER_NAMES.length)]!;

    return {
      cashier: { name, x: cashierX, y: cashierY },
      toilet: { x: toiletX, y: toiletY },
      bounds: { left, top, width: MC_BUILDING_WIDTH, height: MC_BUILDING_HEIGHT },
    };
  }

  return null;
}
