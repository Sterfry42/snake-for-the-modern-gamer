/**
 * Block Cell Key
 *
 * Global identity for persisted block states (bed, chest, furnace) placed
 * at a world tile within a room. Save data keys on this format, so the
 * string shape lives in exactly one place.
 */

/** Build the global key for block state at world tile (x, y) in `roomId`. */
export function blockCellKey(x: number, y: number, roomId: string): string {
  return `${x},${y},${roomId}`;
}
