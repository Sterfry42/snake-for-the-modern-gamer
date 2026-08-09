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

export type CarBoundarySide = 'west' | 'east' | 'north' | 'south';

export interface CarRoomResolution<T extends CarPhysicsState> {
  car: T;
  transitioned: boolean;
  boundarySides: CarBoundarySide[];
  occupiedCellsBefore: Vector2Like[];
  occupiedCellsAfter: Vector2Like[];
}

export interface CarControlInput {
  throttle: number;
  steering: number;
}

export interface CarControlState extends CarControlInput {
  steeringVelocity: number;
}

export interface ArcadeCarMotionResult<T extends CarPhysicsState & { speed: number }> {
  car: T;
  controls: CarControlState;
}

export const CAR_MAX_FORWARD_SPEED = 10.5;
export const CAR_MAX_REVERSE_SPEED = 3.6;
export const CAR_WALL_DAMAGE_SPEED = CAR_MAX_FORWARD_SPEED * 0.23;
export const CAR_WALL_DAMAGE_COOLDOWN_MS = 650;

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
): CarRoomResolution<T> {
  const parsed = parseCoordinateRoomId(current.roomId);
  const occupiedCellsBefore = getCarCollisionCells(next);
  if (!parsed) {
    return {
      car: next,
      transitioned: false,
      boundarySides: [],
      occupiedCellsBefore,
      occupiedCellsAfter: occupiedCellsBefore,
    };
  }
  let roomX = parsed.x;
  let roomY = parsed.y;
  let x = next.x;
  let y = next.y;
  const bounds = getCarBounds(next);
  const boundarySides: CarBoundarySide[] = [];
  if (bounds.minX < 0) {
    roomX -= 1;
    boundarySides.push('west');
  } else if (bounds.maxX > grid.cols) {
    roomX += 1;
    boundarySides.push('east');
  }
  if (bounds.minY < 0) {
    roomY -= 1;
    boundarySides.push('north');
  } else if (bounds.maxY > grid.rows) {
    roomY += 1;
    boundarySides.push('south');
  }
  if (boundarySides.includes('west')) {
    x += grid.cols;
  } else if (boundarySides.includes('east')) {
    x -= grid.cols;
  }
  if (boundarySides.includes('north')) {
    y += grid.rows;
  } else if (boundarySides.includes('south')) {
    y -= grid.rows;
  }
  const roomId = `${roomX},${roomY},${parsed.z}`;
  const contained = containCarPoseInRoom({ ...next, roomId, x, y }, grid);
  return {
    car: contained,
    transitioned: roomId !== current.roomId,
    boundarySides,
    occupiedCellsBefore,
    occupiedCellsAfter: getCarCollisionCells(contained),
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

export function getCarBounds(car: Pick<CarPhysicsState, 'x' | 'y' | 'angle'>): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
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
  return {
    minX: Math.min(...corners.map((corner) => corner.x)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    minY: Math.min(...corners.map((corner) => corner.y)),
    maxY: Math.max(...corners.map((corner) => corner.y)),
  };
}

export function updateArcadeCarMotion<T extends CarPhysicsState & { speed: number }>(
  car: T,
  controls: CarControlState,
  input: CarControlInput,
  dt: number,
): ArcadeCarMotionResult<T> {
  const targetThrottle = clamp(input.throttle, -1, 1);
  const targetSteering = clamp(input.steering, -1, 1);
  const nextThrottle = approach(controls.throttle, targetThrottle, 8.5 * dt);
  const nextSteering = approach(controls.steering, targetSteering, 6.8 * dt);
  const acceleration =
    nextThrottle > 0.03 ? 11.5 * nextThrottle : nextThrottle < -0.03 ? 8.5 * nextThrottle : 0;
  const drag = Math.abs(nextThrottle) < 0.03 ? 7.2 : 2.4;
  let speed = car.speed + acceleration * dt;
  if (Math.abs(nextThrottle) < 0.03) {
    speed = approach(speed, 0, drag * dt);
  }
  speed = clamp(speed, -CAR_MAX_REVERSE_SPEED, CAR_MAX_FORWARD_SPEED);
  const speedRatio = Math.min(1, Math.abs(speed) / CAR_MAX_FORWARD_SPEED);
  const lowSpeedAuthority = smoothstep(0.08, 0.32, speedRatio);
  const highSpeedEase = 1 - Math.max(0, speedRatio - 0.72) * 0.42;
  const turnRate = 2.25 * lowSpeedAuthority * highSpeedEase;
  const reverseFactor = speed >= 0 ? 1 : -1;
  const angle = car.angle + nextSteering * turnRate * dt * reverseFactor;
  return {
    car: { ...car, speed, angle },
    controls: {
      throttle: nextThrottle,
      steering: nextSteering,
      steeringVelocity: nextSteering,
    },
  };
}

export function shouldDamageCarWallImpact(
  impactSpeed: number,
  nowMs: number,
  lastWallImpactAtMs: number,
): boolean {
  return (
    impactSpeed >= CAR_WALL_DAMAGE_SPEED && nowMs - lastWallImpactAtMs > CAR_WALL_DAMAGE_COOLDOWN_MS
  );
}

function containCarPoseInRoom<T extends CarPhysicsState>(
  car: T,
  grid: Pick<GridConfig, 'cols' | 'rows'>,
): T {
  let x = car.x;
  let y = car.y;
  let bounds = getCarBounds({ ...car, x, y });
  if (bounds.minX < 0) {
    x += -bounds.minX;
  } else if (bounds.maxX > grid.cols) {
    x -= bounds.maxX - grid.cols;
  }
  bounds = getCarBounds({ ...car, x, y });
  if (bounds.minY < 0) {
    y += -bounds.minY;
  } else if (bounds.maxY > grid.rows) {
    y -= bounds.maxY - grid.rows;
  }
  return { ...car, x, y };
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

function approach(value: number, target: number, amount: number): number {
  if (value < target) return Math.min(target, value + amount);
  if (value > target) return Math.max(target, value - amount);
  return target;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
