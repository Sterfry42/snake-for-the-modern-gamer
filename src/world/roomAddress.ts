/**
 * Room Address
 *
 * Parsing/formatting for "x,y,z" room ids.
 * An apple a day keeps the maze away — the wise old snake keeps the coordinates.
 */

export interface RoomCoordinate {
  x: number;
  y: number;
  z: number;
}

interface CoordinateRoomAddress {
  kind: 'coordinate';
  roomId: string;
  x: number;
  y: number;
  z: number;
}

const COORDINATE_ROOM_PATTERN = /^-?\d+,-?\d+,-?\d+$/;

/** Lenient parser: missing parts default to 0. Room ids are constructed as "x,y,z". */
export function parseRoomId(roomId: string): RoomCoordinate {
  const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
  return { x, y, z };
}

export function formatRoomId(coord: RoomCoordinate): string {
  return `${coord.x},${coord.y},${coord.z}`;
}

/** Strict parser: returns null unless every part is a finite integer. */
export function parseCoordinateRoomId(roomId: string): CoordinateRoomAddress | null {
  if (!COORDINATE_ROOM_PATTERN.test(roomId)) {
    return null;
  }
  const [x, y, z] = roomId.split(',').map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null;
  }
  return { kind: 'coordinate', roomId, x: x!, y: y!, z: z! };
}

export function assertValidRoomId(roomId: string): void {
  if (roomId.includes('NaN')) {
    throw new Error(`Invalid room id contains NaN: ${roomId}`);
  }
}
