export interface CoordinateRoomAddress {
  kind: 'coordinate';
  roomId: string;
  x: number;
  y: number;
  z: number;
}

export interface SpecialRoomAddress {
  kind: 'cave' | 'town' | 'interior' | 'layer' | 'special';
  roomId: string;
  parentRoomId?: string;
}

export type RoomAddress = CoordinateRoomAddress | SpecialRoomAddress;

const COORDINATE_ROOM_PATTERN = /^-?\d+,-?\d+,-?\d+$/;

export function parseRoomAddress(roomId: string): RoomAddress {
  if (COORDINATE_ROOM_PATTERN.test(roomId)) {
    const [x, y, z] = roomId.split(',').map(Number);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      return { kind: 'coordinate', roomId, x: x!, y: y!, z: z! };
    }
  }

  if (roomId.startsWith('cave:')) {
    const parts = roomId.split(':');
    const parentRoomId = parts[1];
    return {
      kind: 'cave',
      roomId,
      parentRoomId: parentRoomId && isCoordinateRoomId(parentRoomId) ? parentRoomId : undefined,
    };
  }

  if (roomId.startsWith('town:')) return { kind: 'town', roomId };
  if (roomId.startsWith('interior:')) return { kind: 'interior', roomId };
  if (roomId.startsWith('layer:')) return { kind: 'layer', roomId };
  return { kind: 'special', roomId };
}

export function isCoordinateRoomId(roomId: string): boolean {
  return parseRoomAddress(roomId).kind === 'coordinate';
}

export function parseCoordinateRoomId(roomId: string): CoordinateRoomAddress | null {
  const parsed = parseRoomAddress(roomId);
  return parsed.kind === 'coordinate' ? parsed : null;
}

export function assertValidRoomId(roomId: string): void {
  if (roomId.includes('NaN')) {
    throw new Error(`Invalid room id contains NaN: ${roomId}`);
  }
}
