import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey, type Vector2Like } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { findRandomRectPlacement, setTile } from './structurePlacement.js';
import type { RoomSnapshot } from './types.js';

interface KoiPondPlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
}

export function tryPlaceKoiPond(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: KoiPondPlacementOptions = {},
): NonNullable<RoomSnapshot['koiPond']> | null {
  if (grid.cols < 14 || grid.rows < 12) return null;

  const radiusX = 3 + Math.floor(rng() * 2);
  const radiusY = 2 + Math.floor(rng());
  const footprintWidth = radiusX * 2 + 2;
  const footprintHeight = radiusY * 2 + 2;
  const pond = findRandomRectPlacement(layout, grid, rng, {
    width: footprintWidth,
    height: footprintHeight,
    margin: options.margin ?? 4,
    attempts: 24,
    forbiddenCells: options.forbiddenCells,
  });
  if (!pond) return null;

  const centerX = pond.left + radiusX;
  const centerY = pond.top + radiusY;
  const waterTiles: Vector2Like[] = [];

  for (let y = pond.top; y < pond.top + footprintHeight; y += 1) {
    for (let x = pond.left; x < pond.left + footprintWidth; x += 1) {
      if (options.forbiddenCells?.has(vectorKey({ x, y }))) continue;
      const nx = (x - centerX) / Math.max(1, radiusX);
      const ny = (y - centerY) / Math.max(1, radiusY);
      const edgeNoise = rng() * 0.15;
      if (nx * nx + ny * ny <= 1 + edgeNoise && layout[y]?.[x] === '.') {
        waterTiles.push({ x, y });
      }
    }
  }

  if (waterTiles.length < 4) return null;

  for (const tile of waterTiles) setTile(layout, tile.x, tile.y, '~');

  const koiCount = Math.min(3, Math.max(1, Math.floor(waterTiles.length / 3)));
  const usedKeys = new Set(waterTiles.map((tile) => vectorKey(tile)));
  for (let i = 0; i < koiCount; i += 1) {
    const shuffled = [...waterTiles].sort(() => rng() - 0.5);
    for (const tile of shuffled) {
      if (!usedKeys.has(vectorKey(tile))) {
        setTile(layout, tile.x, tile.y, 'K');
        break;
      }
    }
  }

  for (let y = pond.top - 1; y <= pond.top + footprintHeight; y += 1) {
    for (let x = pond.left - 1; x <= pond.left + footprintWidth; x += 1) {
      if (layout[y]?.[x] !== '.') continue;
      const adjacentToWater = waterTiles.some((waterTile) => {
        const dx = waterTile.x - x;
        const dy = waterTile.y - y;
        return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
      });
      if (adjacentToWater) setTile(layout, x, y, 'L');
    }
  }

  return {
    center: { x: centerX, y: centerY },
    waterTiles,
  };
}
