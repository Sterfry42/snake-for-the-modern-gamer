export interface CoordinateRoomAddress {
  kind: 'coordinate';
  roomId: string;
  x: number;
  y: number;
  z: number;
}

const COORDINATE_ROOM_PATTERN = /^-?\d+,-?\d+,-?\d+$/;

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
