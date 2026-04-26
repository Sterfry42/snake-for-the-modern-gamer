import type { GridConfig } from "../config/gameConfig.js";
import type { RandomGenerator } from "../core/rng.js";
import { buildHouseNpcProfile, type NpcProfile } from "../npcs/profiles.js";

export interface QuestGiverInfo extends NpcProfile {
  x: number;
  y: number;
}

export interface QuestHouseResult {
  questGiver: QuestGiverInfo;
  bounds: { left: number; top: number; width: number; height: number };
}

const SAFE_INTERIOR_TILES = new Set(["W", "E", "T"]);
const SAGE_NAMES = ["Aurex", "Belisar", "Cyrene", "Thalestra", "Ozym", "Ilyra", "Ryan"] as const;
const SAGE_PORTRAITS = ["sage-1", "sage-2", "sage-3"] as const;

function setChar(layout: string[][], x: number, y: number, ch: string): void {
  if (y < 0 || y >= layout.length) return;
  if (x < 0 || x >= layout[y].length) return;
  layout[y][x] = ch;
}

function drawHouseCube(layout: string[][], left: number, top: number, width: number, height: number) {
  const right = left + width - 1;
  const bottom = top + height - 1;
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const isBorder = x === left || x === right || y === top || y === bottom;
      setChar(layout, x, y, isBorder ? "#" : "W");
    }
  }
}

function carveHouseDoor(layout: string[][], left: number, top: number, width: number, height: number) {
  const bottom = top + height - 1;
  const cx = Math.floor(left + width / 2);
  const doorHalf = Math.max(1, Math.floor(Math.min(3, Math.floor(width / 6)) / 2));
  for (let x = cx - doorHalf; x <= cx + doorHalf; x++) {
    setChar(layout, x, bottom, ".");
    if (bottom - 1 > top) setChar(layout, x, bottom - 1, "E");
  }
  const trimY = Math.max(top + 1, bottom - 2);
  for (let x = cx - doorHalf; x <= cx + doorHalf; x++) {
    setChar(layout, x, trimY, "T");
  }
}

export function tryPlaceQuestHouse(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator
): QuestHouseResult | null {
  const attempts = 24;
  const margin = 2;
  const minWidth = 8;
  const maxWidth = Math.min(12, grid.cols - margin * 2);
  const minHeight = 6;
  const maxHeight = Math.min(9, grid.rows - margin * 2);

  if (maxWidth < minWidth || maxHeight < minHeight) {
    return null;
  }

  for (let i = 0; i < attempts; i++) {
    const width = minWidth + Math.floor(rng() * (maxWidth - minWidth + 1));
    const height = minHeight + Math.floor(rng() * (maxHeight - minHeight + 1));
    const left = margin + Math.floor(rng() * Math.max(1, grid.cols - width - margin * 2 + 1));
    const top = margin + Math.floor(rng() * Math.max(1, grid.rows - height - margin * 2 + 1));

    // Carve out the space to guarantee the house fits.
    for (let y = top; y < top + height; y++) {
      for (let x = left; x < left + width; x++) {
        setChar(layout, x, y, ".");
      }
    }

    drawHouseCube(layout, left, top, width, height);
    carveHouseDoor(layout, left, top, width, height);

    const centerX = Math.floor(left + width / 2);
    const centerY = Math.floor(top + height / 2);
    if (!SAFE_INTERIOR_TILES.has(layout[centerY]?.[centerX] ?? "")) {
      continue;
    }
    setChar(layout, centerX, centerY, "G");

    const name = SAGE_NAMES[Math.floor(rng() * SAGE_NAMES.length)];
    const portraitId = SAGE_PORTRAITS[Math.floor(rng() * SAGE_PORTRAITS.length)];

    return {
      questGiver: {
        ...buildHouseNpcProfile(name, portraitId),
        x: centerX,
        y: centerY,
      },
      bounds: { left, top, width, height },
    };
  }

  return null;
}
