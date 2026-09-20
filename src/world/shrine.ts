import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import { createHumanoidSpawn } from './humanoidSpawn.js';
import { fillRect, findRandomRectPlacement, pickOne, setTile } from './structurePlacement.js';
import type { RoomSnapshot } from './types.js';

const MIKO_NAMES = ['Hana', 'Saki', 'Yuki', 'Ren', 'Mio', 'Aoi', 'Kiri'] as const;
const SHRINE_ATTEMPTS = 32;
const SHRINE_MARGIN = 5;
const SAFE_AREA_PADDING = 5;

interface ShrinePlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
}

function drawToriiGate(layout: string[][], left: number, top: number): void {
  setTile(layout, left, top, 'T');
  setTile(layout, left + 2, top, 'T');
  setTile(layout, left + 1, top + 1, 'T');
}

export function tryPlaceShrine(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: ShrinePlacementOptions = {},
): NonNullable<RoomSnapshot['shrine']> | null {
  if (grid.cols < 20 || grid.rows < 16) return null;

  const coreWidth = 6;
  const coreHeight = 4;
  const courtyardWidth = 12;
  const courtyardHeight = 8;
  const footprintWidth = courtyardWidth + SAFE_AREA_PADDING;
  const footprintHeight = courtyardHeight + SAFE_AREA_PADDING;
  const shrine = findRandomRectPlacement(layout, grid, rng, {
    width: footprintWidth,
    height: footprintHeight,
    margin: options.margin ?? SHRINE_MARGIN,
    attempts: SHRINE_ATTEMPTS,
    forbiddenCells: options.forbiddenCells,
  });
  if (!shrine) return null;

  fillRect(layout, shrine.left, shrine.top, shrine.width, shrine.height, 'E');

  const shrineLeft = shrine.left + 4;
  const shrineTop = shrine.top + SAFE_AREA_PADDING + 1;
  fillRect(layout, shrineLeft, shrineTop, coreWidth, coreHeight, '#');

  const courtyardEnd = shrine.top + SAFE_AREA_PADDING - 1;
  for (let y = shrine.top; y <= courtyardEnd; y += 1) {
    for (let x = shrine.left; x < shrine.left + shrine.width; x += 1) {
      if (layout[y]?.[x] !== '#') setTile(layout, x, y, 'E');
    }
  }

  const toriiX = Math.floor(shrine.left + shrine.width / 2) - 1;
  drawToriiGate(layout, toriiX, courtyardEnd);

  const offeringBoxX = shrineLeft + coreWidth + 1;
  const offeringBoxY = shrineTop + 1;
  setTile(layout, offeringBoxX, offeringBoxY, 'F');

  const shimenawaTiles: { x: number; y: number }[] = [
    { x: shrineLeft - 1, y: shrineTop },
    { x: shrineLeft - 1, y: shrineTop + 1 },
    { x: shrineLeft - 1, y: shrineTop + 2 },
    { x: shrineLeft, y: shrineTop - 1 },
    { x: shrineLeft + coreWidth - 1, y: shrineTop - 1 },
    { x: shrineLeft + coreWidth, y: shrineTop },
    { x: shrineLeft + coreWidth, y: shrineTop + 1 },
    { x: shrineLeft + coreWidth, y: shrineTop + 2 },
  ];

  shimenawaTiles.forEach((tile) => {
    if (layout[tile.y]?.[tile.x] === '.' || layout[tile.y]?.[tile.x] === 'E') {
      setTile(layout, tile.x, tile.y, 'S');
    }
  });

  const maidenX = offeringBoxX;
  const maidenY = offeringBoxY + 1;
  setTile(layout, maidenX, maidenY, 'G');

  return {
    maiden: createHumanoidSpawn(pickOne(MIKO_NAMES, rng), maidenX, maidenY, 'sage-1'),
    hasBlessings: false,
  };
}
