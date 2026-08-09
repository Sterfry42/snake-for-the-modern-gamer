import type { GridConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import { parseCoordinateRoomId } from '../world/roomAddress.js';
import { CAR_HEIGHT_TILES, CAR_WIDTH_TILES } from './car.js';

export interface CarPhysicsState {
  roomId: string;
  x: number;
  y: number;
  angle: number;
}

export function carForwardVector(angle: number): Vector2Like {
  return { x: Math.sin(angle), y: -Math.cos(angle) };
}

export function carRightVector(angle: number): Vector2Like {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function resolveCarRoomPosition<T extends CarPhysicsState>(
  current: T,
  next: T,
  grid: Pick<GridConfig, 'cols' | 'rows'>,
): { car: T; transitioned: boolean } {
  const parsed = parseCoordinateRoomId(current.roomId);
  if (!parsed) {
    return { car: next, transitioned: false };
  }
  let roomX = parsed.x;
  let roomY = parsed.y;
  let x = next.x;
  let y = next.y;
  if (x < 0) {
    roomX -= 1;
    x = grid.cols - CAR_WIDTH_TILES;
  } else if (x + CAR_WIDTH_TILES > grid.cols) {
    roomX += 1;
    x = 0;
  }
  if (y < 0) {
    roomY -= 1;
    y = grid.rows - CAR_HEIGHT_TILES;
  } else if (y + CAR_HEIGHT_TILES > grid.rows) {
    roomY += 1;
    y = 0;
  }
  const roomId = `${roomX},${roomY},${parsed.z}`;
  return {
    car: { ...next, roomId, x, y },
    transitioned: roomId !== current.roomId,
  };
}

export function getCarCollisionCells(
  car: Pick<CarPhysicsState, 'x' | 'y' | 'angle'>,
): Vector2Like[] {
  const center = {
    x: car.x + CAR_WIDTH_TILES / 2,
    y: car.y + CAR_HEIGHT_TILES / 2,
  };
  const forward = carForwardVector(car.angle);
  const right = carRightVector(car.angle);
  const halfWidth = CAR_WIDTH_TILES / 2;
  const halfHeight = CAR_HEIGHT_TILES / 2;
  const corners = [
    {
      x: center.x + right.x * halfWidth + forward.x * halfHeight,
      y: center.y + right.y * halfWidth + forward.y * halfHeight,
    },
    {
      x: center.x - right.x * halfWidth + forward.x * halfHeight,
      y: center.y - right.y * halfWidth + forward.y * halfHeight,
    },
    {
      x: center.x + right.x * halfWidth - forward.x * halfHeight,
      y: center.y + right.y * halfWidth - forward.y * halfHeight,
    },
    {
      x: center.x - right.x * halfWidth - forward.x * halfHeight,
      y: center.y - right.y * halfWidth - forward.y * halfHeight,
    },
  ];
  const minX = Math.floor(Math.min(...corners.map((corner) => corner.x)));
  const maxX = Math.floor(Math.max(...corners.map((corner) => corner.x)));
  const minY = Math.floor(Math.min(...corners.map((corner) => corner.y)));
  const maxY = Math.floor(Math.max(...corners.map((corner) => corner.y)));
  const cells: Vector2Like[] = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (carIntersectsTile(center, right, forward, halfWidth, halfHeight, { x, y })) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
}

function carIntersectsTile(
  center: Vector2Like,
  right: Vector2Like,
  forward: Vector2Like,
  halfWidth: number,
  halfHeight: number,
  tile: Vector2Like,
): boolean {
  const tileCenter = { x: tile.x + 0.5, y: tile.y + 0.5 };
  const delta = { x: tileCenter.x - center.x, y: tileCenter.y - center.y };
  const tileHalf = 0.5;
  const carX = Math.abs(dot(delta, right));
  const carY = Math.abs(dot(delta, forward));
  const tileProjectedOnRight = tileHalf * Math.abs(right.x) + tileHalf * Math.abs(right.y);
  const tileProjectedOnForward = tileHalf * Math.abs(forward.x) + tileHalf * Math.abs(forward.y);
  if (carX >= halfWidth + tileProjectedOnRight) return false;
  if (carY >= halfHeight + tileProjectedOnForward) return false;
  const worldXProjection = halfWidth * Math.abs(right.x) + halfHeight * Math.abs(forward.x);
  const worldYProjection = halfWidth * Math.abs(right.y) + halfHeight * Math.abs(forward.y);
  if (Math.abs(delta.x) >= tileHalf + worldXProjection) return false;
  if (Math.abs(delta.y) >= tileHalf + worldYProjection) return false;
  return true;
}

function dot(a: Vector2Like, b: Vector2Like): number {
  return a.x * b.x + a.y * b.y;
}
