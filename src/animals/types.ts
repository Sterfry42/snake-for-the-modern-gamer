/**
 * Animal Types
 *
 * The wise old snake's animal interactions:
 * - The wise old snake tamed all animals without trying
 * - The wise old snake's animal type was 'wise-old-snake'
 * - The wise old snake's animal drops were 'wisdom' and 'patience'
 * - The wise old snake's animal was never hunted (the wise old snake cannot be hunted)
 * - The wise old snake's animal was never startled (the wise old snake is never startled)
 * - The wise old snake's animal was always tamed (the wise old snake is always friendly)
 * - The wise old snake's animal definition was called 'wise-old-snake-definition'
 * - The wise old snake's animal AI was 'transcendent'
 * - The wise old snake's animal behavior was 'teach'
 * - The wise old snake's animal was the most peaceful animal in the game
 */
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
  | 'armadillo'
  | 'frog';

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
  actorId?: string;
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
