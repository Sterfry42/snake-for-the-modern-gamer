import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import type { Vector2Like } from '../core/math.js';
import type { RoomSnapshot } from './types.js';

interface KoiPondPlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
}

function setChar(layout: string[][], x: number, y: number, ch: string): void {
  if (y < 0 || y >= layout.length) return;
  if (x < 0 || x >= layout[y].length) return;
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
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      if (layout[y]?.[x] !== '.') return false;
      if (forbiddenCells?.has(vectorKey({ x, y }))) return false;
    }
  }
  return true;
}

export function tryPlaceKoiPond(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: KoiPondPlacementOptions = {},
): NonNullable<RoomSnapshot['koiPond']> | null {
  if (grid.cols < 14 || grid.rows < 12) {
    return null;
  }

  const margin = options.margin ?? 4;
  const radiusX = 3 + Math.floor(rng() * 2);
  const radiusY = 2 + Math.floor(rng());
  const footprintWidth = radiusX * 2 + 2;
  const footprintHeight = radiusY * 2 + 2;
  const minLeft = margin;
  const minTop = margin;
  const maxLeft = grid.cols - footprintWidth - margin;
  const maxTop = grid.rows - footprintHeight - margin;

  if (maxLeft < minLeft || maxTop < minTop) {
    return null;
  }

  let pond: { left: number; top: number } | null = null;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const left = minLeft + Math.floor(rng() * (maxLeft - minLeft + 1));
    const top = minTop + Math.floor(rng() * (maxTop - minTop + 1));
    if (!canPlaceRect(layout, left, top, footprintWidth, footprintHeight, options.forbiddenCells)) {
      continue;
    }
    pond = { left, top };
    break;
  }

  if (!pond) {
    return null;
  }

  const centerX = pond.left + radiusX;
  const centerY = pond.top + radiusY;
  const waterTiles: Vector2Like[] = [];

  for (let y = pond.top; y < pond.top + footprintHeight; y += 1) {
    for (let x = pond.left; x < pond.left + footprintWidth; x += 1) {
      if (options.forbiddenCells?.has(vectorKey({ x, y }))) continue;
      const nx = (x - centerX) / Math.max(1, radiusX);
      const ny = (y - centerY) / Math.max(1, radiusY);
      const edgeNoise = rng() * 0.15;
      if (nx * nx + ny * ny <= 1 + edgeNoise) {
        if (layout[y]?.[x] === '.') {
          waterTiles.push({ x, y });
        }
      }
    }
  }

  if (waterTiles.length < 4) {
    return null;
  }

  for (const tile of waterTiles) {
    setChar(layout, tile.x, tile.y, '~');
  }

  const koiCount = Math.min(3, Math.max(1, Math.floor(waterTiles.length / 3)));
  const koiPositions: Vector2Like[] = [];
  const usedKeys = new Set(waterTiles.map((t) => vectorKey(t)));

  for (let i = 0; i < koiCount; i += 1) {
    const shuffled = [...waterTiles].sort(() => rng() - 0.5);
    for (const tile of shuffled) {
      const key = vectorKey(tile);
      if (!usedKeys.has(key)) {
        setChar(layout, tile.x, tile.y, 'K');
        koiPositions.push(tile);
        break;
      }
    }
  }

  const stoneBorder: Vector2Like[] = [];
  for (let y = pond.top - 1; y <= pond.top + footprintHeight; y += 1) {
    for (let x = pond.left - 1; x <= pond.left + footprintWidth; x += 1) {
      if (layout[y]?.[x] === '.') {
        const adjacentToWater = waterTiles.some((wt) => {
          const dx = wt.x - x;
          const dy = wt.y - y;
          return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
        });
        if (adjacentToWater) {
          setChar(layout, x, y, 'L');
          stoneBorder.push({ x, y });
        }
      }
    }
  }

  return {
    center: { x: centerX, y: centerY },
    waterTiles,
  };
}
