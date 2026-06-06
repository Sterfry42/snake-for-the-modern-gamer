import type { Vector2Like } from '../core/math.js';
import type { RoomSnapshot } from '../world/types.js';

/**
 * Check if a position is within the room bounds.
 */
function isInRoom(x: number, y: number, room: RoomSnapshot): boolean {
  const layout = room.layout;
  if (!layout || layout.length === 0) return false;
  if (y < 0 || y >= layout.length) return false;
  const row = layout[y];
  if (!row || x < 0 || x >= row.length) return false;
  return true;
}

/**
 * Check if a tile at position is a water tile ('~').
 * 4-directional only.
 */
export function hasAdjacentWater(
  x: number,
  y: number,
  room: RoomSnapshot,
): boolean {
  const layout = room.layout;
  if (!layout || layout.length === 0) return false;

  // Check all 4 cardinal directions
  const directions: Vector2Like[] = [
    { x: 0, y: -1 }, // up
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }, // left
    { x: 1, y: 0 },  // right
  ];

  for (const dir of directions) {
    const nx = x + dir.x;
    const ny = y + dir.y;

    if (!isInRoom(nx, ny, room)) continue;

    const row = layout[ny];
    if (!row) continue;

    if (row[nx] === '~') {
      return true;
    }
  }

  return false;
}

/**
 * Check if a room has ANY water tiles at all.
 * Used as a fast pre-check before per-position checks.
 */
export function roomHasWater(room: RoomSnapshot): boolean {
  return room.layout.some((row) => row.includes('~'));
}

/**
 * Get all water tile positions in a room.
 */
export function getWaterTiles(room: RoomSnapshot): Vector2Like[] {
  const tiles: Vector2Like[] = [];
  for (let y = 0; y < room.layout.length; y++) {
    const row = room.layout[y];
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '~') {
        tiles.push({ x, y });
      }
    }
  }
  return tiles;
}
