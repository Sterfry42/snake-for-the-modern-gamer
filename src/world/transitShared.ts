/**
 * Transit Shared
 *
 * Primitives common to every transit station kind (bullet train, roller
 * coaster, future lines): floor-block detection, edge tiling, station id
 * scheme, and the candidate-seed hash. Content (flavor, themes, tracks)
 * stays with each transit kind.
 */
import type { Vector2Like } from '../core/math.js';

export interface TransitFloorBlock {
  tiles: Vector2Like[];
  count: number;
}

/** Find contiguous open-floor blocks of at least `minSize` tiles; `entranceTile` counts as floor. */
export function findContiguousFloorBlocks(
  layout: string[][],
  minSize: number,
  entranceTile: string,
): TransitFloorBlock[] {
  const visited = new Set<string>();
  const blocks: TransitFloorBlock[] = [];

  function floodFill(startX: number, startY: number): Vector2Like[] {
    const tiles: Vector2Like[] = [];
    const queue: Vector2Like[] = [{ x: startX, y: startY }];
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      tiles.push({ x, y });

      const neighbors = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
      ];

      for (const n of neighbors) {
        if (n.x < 0 || n.y < 0 || n.y >= layout.length || n.x >= layout[0].length) continue;
        const nk = `${n.x},${n.y}`;
        if (visited.has(nk)) continue;
        const tile = layout[n.y]?.[n.x];
        if (tile !== '.' && tile !== entranceTile) continue;
        visited.add(nk);
        queue.push(n);
      }
    }
    return tiles;
  }

  for (let y = 0; y < layout.length; y += 1) {
    for (let x = 0; x < layout[y].length; x += 1) {
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      const tile = layout[y][x];
      if (tile !== '.' && tile !== entranceTile) continue;
      const tiles = floodFill(x, y);
      if (tiles.length >= minSize) {
        blocks.push({ tiles, count: tiles.length });
      }
    }
  }
  return blocks;
}

/** Find tiles near a room edge (within maxDistance tiles of a wall); `entranceTile` counts as floor. */
export function findEdgeTiles(
  layout: string[][],
  maxDistance: number,
  entranceTile: string,
): Vector2Like[] {
  const tiles: Vector2Like[] = [];
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const tile = layout[y][x];
      if (tile !== '.' && tile !== entranceTile) continue;

      const distToEdge = Math.min(x, y, cols - 1 - x, rows - 1 - y);
      if (distToEdge <= maxDistance) {
        tiles.push({ x, y });
      }
    }
  }
  return tiles;
}

/** Generate a unique station ID from a transit kind and room ID. */
export function generateTransitStationId(kind: string, roomId: string): string {
  return `${kind}:${roomId}`;
}

/** Deterministic candidate-seed hash shared by transit resolvers. */
export function hashTransitCoordinate(seed: string, regionKey: string, index: number): number {
  let hash = 0;
  const combined = `${seed}:${regionKey}:${index}`;
  for (let i = 0; i < combined.length; i += 1) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}
