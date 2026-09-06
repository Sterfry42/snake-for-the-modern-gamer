import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { createHumanoidIdentity } from './humanoidSpawn.js';
import { canPlaceRect, pickOne, setTile } from './structurePlacement.js';
import type { WorldHumanoidSpawn } from './types.js';

export type QuestGiverInfo = WorldHumanoidSpawn;

export interface QuestHouseResult {
  questGiver: QuestGiverInfo;
  bounds: { left: number; top: number; width: number; height: number };
}

export interface QuestHousePlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
}

const SAFE_INTERIOR_TILES = new Set(['W', 'E', 'T']);
const SAGE_NAMES = ['Aurex', 'Belisar', 'Cyrene', 'Thalestra', 'Ozym', 'Ilyra', 'Ryan'] as const;
const SAGE_PORTRAITS = ['sage-1', 'sage-2', 'sage-3'] as const;

function drawHouseCube(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
): void {
  const right = left + width - 1;
  const bottom = top + height - 1;
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const isBorder = x === left || x === right || y === top || y === bottom;
      setTile(layout, x, y, isBorder ? '#' : 'W');
    }
  }
}

function carveHouseDoor(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
): void {
  const bottom = top + height - 1;
  const cx = Math.floor(left + width / 2);
  const doorHalf = Math.max(1, Math.floor(Math.min(3, Math.floor(width / 6)) / 2));
  for (let x = cx - doorHalf; x <= cx + doorHalf; x += 1) {
    setTile(layout, x, bottom, '.');
    if (bottom - 1 > top) setTile(layout, x, bottom - 1, 'E');
  }
  const trimY = Math.max(top + 1, bottom - 2);
  for (let x = cx - doorHalf; x <= cx + doorHalf; x += 1) {
    setTile(layout, x, trimY, 'T');
  }
}

function carveHouseApproach(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  forbiddenCells?: ReadonlySet<string>,
): void {
  const bottom = top + height - 1;
  const cx = Math.floor(left + width / 2);
  const doorHalf = Math.max(1, Math.floor(Math.min(3, Math.floor(width / 6)) / 2));
  for (let y = bottom + 1; y <= bottom + 4; y += 1) {
    for (let x = cx - doorHalf; x <= cx + doorHalf; x += 1) {
      if (forbiddenCells?.has(vectorKey({ x, y }))) continue;
      const tile = layout[y]?.[x];
      if (tile === '#' || tile === '~') setTile(layout, x, y, '.');
    }
  }
}

export function tryPlaceQuestHouse(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: QuestHousePlacementOptions = {},
): QuestHouseResult | null {
  const attempts = 24;
  const margin = options.margin ?? 2;
  const minWidth = 8;
  const maxWidth = Math.min(12, grid.cols - margin * 2);
  const minHeight = 6;
  const maxHeight = Math.min(9, grid.rows - margin * 2);

  if (maxWidth < minWidth || maxHeight < minHeight) return null;

  for (let i = 0; i < attempts; i += 1) {
    const width = minWidth + Math.floor(rng() * (maxWidth - minWidth + 1));
    const height = minHeight + Math.floor(rng() * (maxHeight - minHeight + 1));
    const left = margin + Math.floor(rng() * Math.max(1, grid.cols - width - margin * 2 + 1));
    const top = margin + Math.floor(rng() * Math.max(1, grid.rows - height - margin * 2 + 1));
    const bounds = { left, top, width, height };

    if (!canPlaceRect(layout, bounds, options.forbiddenCells)) continue;

    drawHouseCube(layout, left, top, width, height);
    carveHouseDoor(layout, left, top, width, height);
    carveHouseApproach(layout, left, top, width, height, options.forbiddenCells);

    const centerX = Math.floor(left + width / 2);
    const centerY = Math.floor(top + height / 2);
    if (!SAFE_INTERIOR_TILES.has(layout[centerY]?.[centerX] ?? '')) continue;
    setTile(layout, centerX, centerY, 'G');

    return {
      questGiver: {
        ...createHumanoidIdentity(pickOne(SAGE_NAMES, rng), pickOne(SAGE_PORTRAITS, rng)),
        x: centerX,
        y: centerY,
      },
      bounds,
    };
  }

  return null;
}
