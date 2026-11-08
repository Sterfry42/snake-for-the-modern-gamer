import type { RoomCoordinate } from '../world/roomAddress.js';
import type { Vector2Like } from '../core/math.js';

export const WORLD_MAP_ROOM_SIZE = 40;

export interface WorldMapView {
  pan: Vector2Like;
  zoom: number;
}

export function roomToMapPoint(room: Pick<RoomCoordinate, 'x' | 'y'>): Vector2Like {
  return {
    x: (room.x + 0.5) * WORLD_MAP_ROOM_SIZE,
    y: (room.y + 0.5) * WORLD_MAP_ROOM_SIZE,
  };
}

export function mapPointToRoom(point: Vector2Like, view: WorldMapView, z: number): RoomCoordinate {
  const roomSize = WORLD_MAP_ROOM_SIZE * view.zoom;
  return {
    x: Math.floor((point.x - view.pan.x) / roomSize),
    y: Math.floor((point.y - view.pan.y) / roomSize),
    z,
  };
}

export function visibleMapRooms(
  width: number,
  height: number,
  view: WorldMapView,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const topLeft = mapPointToRoom({ x: 0, y: 0 }, view, 0);
  const bottomRight = mapPointToRoom({ x: width, y: height }, view, 0);
  return {
    minX: topLeft.x - 1,
    maxX: bottomRight.x + 1,
    minY: topLeft.y - 1,
    maxY: bottomRight.y + 1,
  };
}
