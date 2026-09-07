import type { GridConfig } from '../../config/gameConfig.js';
import type { Vector2Like } from '../../core/math.js';

export interface RenderRoomPlacement {
  roomId: string;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export function normalizeRenderPoint(
  position: Vector2Like,
  placement: RenderRoomPlacement,
  grid: Pick<GridConfig, 'cols' | 'rows'>,
): Vector2Like {
  const coordinateRoom = parseCoordinateRoomId(placement.roomId);
  const roomWidth = placement.width || grid.cols;
  const roomHeight = placement.height || grid.rows;
  const local = coordinateRoom
    ? {
        x: position.x - coordinateRoom.x * roomWidth,
        y: position.y - coordinateRoom.y * roomHeight,
      }
    : { x: position.x, y: position.y };
  return {
    x: local.x + placement.offsetX,
    y: local.y + placement.offsetY,
  };
}

export function localRenderPoint(
  position: Vector2Like,
  placement: RenderRoomPlacement,
): Vector2Like {
  return {
    x: position.x + placement.offsetX,
    y: position.y + placement.offsetY,
  };
}

export function parseCoordinateRoomId(roomId: string): { x: number; y: number; z: number } | null {
  const match = /^(-?\d+),(-?\d+),(-?\d+)$/.exec(roomId);
  if (!match) return null;
  return {
    x: Number(match[1]),
    y: Number(match[2]),
    z: Number(match[3]),
  };
}
