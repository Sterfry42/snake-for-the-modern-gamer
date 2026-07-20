import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { buildHouseNpcProfile } from '../npcs/profiles.js';
import type { RoomSnapshot } from './types.js';

const SHRINE_NAMES = [
  'Azure Peak Shrine',
  'Windcaller Shrine',
  'Jade Summit Shrine',
  'Cloudveil Shrine',
  'Crimson Torii Shrine',
  'Suzaku Shrine',
  'Heavenly Steps Shrine',
  'Mooncrest Shrine',
] as const;

const MIKO_NAMES = ['Hana', 'Saki', 'Yuki', 'Ren', 'Mio', 'Aoi', 'Kiri'] as const;
const SHRINE_ATTEMPTS = 32;
const SHRINE_MARGIN = 5;
const SAFE_AREA_PADDING = 5;

interface ShrinePlacementOptions {
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

function drawToriiGate(layout: string[][], left: number, top: number): void {
  setChar(layout, left, top, 'T');
  setChar(layout, left + 2, top, 'T');
  setChar(layout, left + 1, top + 1, 'T');
}

function randomName(rng: RandomGenerator): string {
  return MIKO_NAMES[Math.floor(rng() * MIKO_NAMES.length)]!;
}

export function tryPlaceShrine(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: ShrinePlacementOptions = {},
): NonNullable<RoomSnapshot['shrine']> | null {
  if (grid.cols < 20 || grid.rows < 16) {
    return null;
  }

  const margin = options.margin ?? SHRINE_MARGIN;
  const coreWidth = 6;
  const coreHeight = 4;
  const courtyardWidth = 12;
  const courtyardHeight = 8;
  const footprintWidth = courtyardWidth + SAFE_AREA_PADDING;
  const footprintHeight = courtyardHeight + SAFE_AREA_PADDING;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = grid.cols - footprintWidth - margin;
  const maxTop = grid.rows - footprintHeight - margin;

  if (maxLeft < minLeft || maxTop < minTop) {
    return null;
  }

  let shrine: { left: number; top: number; width: number; height: number } | null = null;
  for (let attempt = 0; attempt < SHRINE_ATTEMPTS; attempt += 1) {
    const left = minLeft + Math.floor(rng() * (maxLeft - minLeft + 1));
    const top = minTop + Math.floor(rng() * (maxTop - minTop + 1));
    if (!canPlaceRect(layout, left, top, footprintWidth, footprintHeight, options.forbiddenCells)) {
      continue;
    }
    shrine = { left, top, width: footprintWidth, height: footprintHeight };
    break;
  }

  if (!shrine) {
    return null;
  }

  ({
    x: shrine.left + Math.floor(shrine.width / 2),
    y: shrine.top + Math.floor(shrine.height / 2),
  });

  const safeArea = {
    left: shrine.left,
    top: shrine.top,
    width: shrine.width,
    height: shrine.height,
  };
  fillRect(layout, safeArea.left, safeArea.top, safeArea.width, safeArea.height, 'E');

  const shrineLeft = shrine.left + 4;
  const shrineTop = shrine.top + SAFE_AREA_PADDING + 1;
  const shrineWidth = coreWidth;
  const shrineHeight = coreHeight;

  fillRect(layout, shrineLeft, shrineTop, shrineWidth, shrineHeight, '#');

  const courtyardStart = shrine.top;
  const courtyardEnd = shrine.top + SAFE_AREA_PADDING - 1;
  for (let y = courtyardStart; y <= courtyardEnd; y += 1) {
    for (let x = shrine.left; x < shrine.left + shrine.width; x += 1) {
      if (layout[y]?.[x] === '#') continue;
      layout[y][x] = 'E';
    }
  }

  const toriiX = Math.floor(shrine.left + shrine.width / 2) - 1;
  const toriiY = courtyardEnd;
  drawToriiGate(layout, toriiX, toriiY);

  const offeringBoxX = shrineLeft + shrineWidth + 1;
  const offeringBoxY = shrineTop + 1;
  setChar(layout, offeringBoxX, offeringBoxY, 'F');

  const shimenawaTiles: { x: number; y: number }[] = [
    { x: shrineLeft - 1, y: shrineTop },
    { x: shrineLeft - 1, y: shrineTop + 1 },
    { x: shrineLeft - 1, y: shrineTop + 2 },
    { x: shrineLeft, y: shrineTop - 1 },
    { x: shrineLeft + shrineWidth - 1, y: shrineTop - 1 },
    { x: shrineLeft + shrineWidth, y: shrineTop },
    { x: shrineLeft + shrineWidth, y: shrineTop + 1 },
    { x: shrineLeft + shrineWidth, y: shrineTop + 2 },
  ];

  shimenawaTiles.forEach((tile) => {
    if (layout[tile.y]?.[tile.x] === '.' || layout[tile.y]?.[tile.x] === 'E') {
      setChar(layout, tile.x, tile.y, 'S');
    }
  });

  const maidenX = offeringBoxX;
  const maidenY = offeringBoxY + 1;
  setChar(layout, maidenX, maidenY, 'G');

  SHRINE_NAMES[Math.floor(rng() * SHRINE_NAMES.length)]!;
  const mikoName = randomName(rng);

  return {
    maiden: {
      ...buildHouseNpcProfile(mikoName, 'sage-1'),
      x: maidenX,
      y: maidenY,
    },
    hasBlessings: false,
  };
}
