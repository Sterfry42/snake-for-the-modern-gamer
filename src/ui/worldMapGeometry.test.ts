import { describe, expect, it } from 'vitest';
import {
  WORLD_MAP_ROOM_SIZE,
  mapPointToRoom,
  roomToMapPoint,
  visibleMapRooms,
} from './worldMapGeometry.js';

describe('world map geometry', () => {
  it('round trips positive and negative room coordinates with pan and zoom', () => {
    const view = { pan: { x: 173, y: -68 }, zoom: 1.75 };
    for (const room of [
      { x: 0, y: 0, z: 0 },
      { x: -3, y: -9, z: -5 },
      { x: 42, y: 21, z: 7 },
    ]) {
      const point = roomToMapPoint(room);
      expect(
        mapPointToRoom(
          { x: point.x * view.zoom + view.pan.x, y: point.y * view.zoom + view.pan.y },
          view,
          room.z,
        ),
      ).toEqual(room);
    }
  });

  it('floors correctly at negative coordinate boundaries', () => {
    expect(
      mapPointToRoom({ x: -1, y: -WORLD_MAP_ROOM_SIZE }, { pan: { x: 0, y: 0 }, zoom: 1 }, 3),
    ).toEqual({ x: -1, y: -1, z: 3 });
  });

  it('renders only rooms near the screen rather than every explored room', () => {
    expect(
      visibleMapRooms(400, 320, { pan: { x: 0, y: 0 }, zoom: 1 }),
    ).toEqual({ minX: -1, maxX: 11, minY: -1, maxY: 9 });
  });
});
