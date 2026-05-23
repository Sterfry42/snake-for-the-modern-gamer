import type { Vector2Like } from '../core/math.js';

export type AnimalType =
  | 'rabbit'
  | 'fox'
  | 'wolf'
  | 'fish'
  | 'bird'
  | 'deer'
  | 'bear'
  | 'snake'
  | 'eagle'
  | 'jackalope'
  | 'raccoon'
  | 'coyote'
  | 'bison'
  | 'bass'
  | 'possum'
  | 'armadillo';

export interface DropEntry {
  itemId: string;
  chance: number;
  minCount?: number;
  maxCount?: number;
}

export interface AnimalDefinition {
  type: AnimalType;
  name: string;
  biomeIds: string[];
  spawnWeight: number;
  maxPerRoom: number;
  moveInterval: number;
  behavior: 'wander' | 'flee' | 'chase' | 'graze' | 'school' | 'perch';
  snakeEncounter: 'harmless' | 'dangerous' | 'tamable' | 'hunt';
  drops?: DropEntry[];
  spritePrefix: string;
  maxHearts?: number;
}

export interface AnimalInstance {
  id: string;
  type: AnimalType;
  roomId: string;
  position: Vector2Like;
  direction: Vector2Like;
  moveCooldown: number;
  isTamed: boolean;
  tameOwner?: string;
  flashTicks: number;
  currentHearts?: number;
}
