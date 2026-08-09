import type { Vector2Like } from '../core/math.js';

export const GARAGE_CAR_PRICE_SCORE = 2000;
export const CAR_MAX_HEARTS = 5;
export const CAR_COLLISION_DAMAGE_HEARTS = 1;
export const CAR_IMPACT_DAMAGE_HEARTS = 2;
export const CAR_WIDTH_TILES = 2;
export const CAR_HEIGHT_TILES = 3;

export interface ParkedCar {
  id: string;
  x: number;
  y: number;
  angle: number;
  health: number;
}

export interface GarageMechanic {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface GarageStructure {
  id: string;
  name: string;
  bounds: { left: number; top: number; width: number; height: number };
  mechanic: GarageMechanic;
  carSpawn: Vector2Like;
}

export interface DrivingCarState extends ParkedCar {
  roomId: string;
  speed: number;
}

export function createParkedCar(id: string, position: Vector2Like, angle = 0): ParkedCar {
  return {
    id,
    x: position.x,
    y: position.y,
    angle,
    health: CAR_MAX_HEARTS,
  };
}
