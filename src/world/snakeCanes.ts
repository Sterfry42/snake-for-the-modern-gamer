import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';

export interface SnakeCanesData {
  cashier: {
    name: string;
    x: number;
    y: number;
  };
  bounds: { left: number; top: number; width: number; height: number };
}

const CASHIER_NAMES = [
  'Vlad',
] as const;

const CANE_BUILDING_WIDTH = 16;
const CANE_BUILDING_HEIGHT = 12;
const CANE_MARGIN = 3;
const CANE_ATTEMPTS = 20;

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
      if (forbiddenCells?.has(`${x},${y}`)) return false;
    }
  }
  return true;
}

export function tryPlaceSnakeCanes(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: { forbiddenCells?: ReadonlySet<string>; margin?: number } = {},
): SnakeCanesData | null {
  const margin = options.margin ?? CANE_MARGIN;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = grid.cols - CANE_BUILDING_WIDTH - margin;
  const maxTop = grid.rows - CANE_BUILDING_HEIGHT - margin;

  if (maxLeft < minLeft || maxTop < minTop) return null;

  for (let attempt = 0; attempt < CANE_ATTEMPTS; attempt++) {
    const left = minLeft + Math.floor(rng() * (maxLeft - minLeft + 1));
    const top = minTop + Math.floor(rng() * (maxTop - minTop + 1));

    if (
      !canPlaceRect(
        layout,
        left,
        top,
        CANE_BUILDING_WIDTH,
        CANE_BUILDING_HEIGHT,
        options.forbiddenCells,
      )
    ) {
      continue;
    }

    const right = left + CANE_BUILDING_WIDTH - 1;
    const bottom = top + CANE_BUILDING_HEIGHT - 1;

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
      setChar(layout, signLeft + i, signY, 'V');
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
    setChar(layout, cashierX, cashierY, 'V');

    // Kitchen decorations (back wall, right side)
    const kitchenStartX = right - 4;
    const kitchenY = top + 2;
    setChar(layout, kitchenStartX, kitchenY, 'K');
    setChar(layout, kitchenStartX + 1, kitchenY, 'K');

    // Dining tables (simple decor)
    setChar(layout, left + 2, top + 5, 'T');
    setChar(layout, left + 3, top + 5, 'T');
    setChar(layout, left + 2, top + 6, 'T');
    setChar(layout, left + 3, top + 6, 'T');

    setChar(layout, left + 2, top + 8, 'T');
    setChar(layout, left + 3, top + 8, 'T');
    setChar(layout, left + 2, top + 9, 'T');
    setChar(layout, left + 3, top + 9, 'T');

    // South entrance door
    const doorX = left + Math.floor(CANE_BUILDING_WIDTH / 2);
    setChar(layout, doorX, bottom, '.');
    setChar(layout, doorX, bottom - 1, 'T');

    const name = CASHIER_NAMES[Math.floor(rng() * CASHIER_NAMES.length)]!;

    return {
      cashier: { name, x: cashierX, y: cashierY },
      bounds: { left, top, width: CANE_BUILDING_WIDTH, height: CANE_BUILDING_HEIGHT },
    };
  }

  return null;
}
