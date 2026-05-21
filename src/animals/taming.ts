import type { AnimalType } from './types.js';

export interface TamableAnimal {
  type: AnimalType;
  requiredItem: string;
  tameScore: number;
}

export const TAMABLE_ANIMALS: Record<AnimalType, TamableAnimal | null> = {
  rabbit: null,
  fox: {
    type: 'fox',
    requiredItem: 'rope',
    tameScore: 10,
  },
  wolf: {
    type: 'wolf',
    requiredItem: 'lead',
    tameScore: 25,
  },
  fish: null,
  bird: null,
  deer: {
    type: 'deer',
    requiredItem: 'rope',
    tameScore: 15,
  },
  bear: null,
  snake: null,
  eagle: null,
  jackalope: {
    type: 'jackalope',
    requiredItem: 'rope',
    tameScore: 12,
  },
  raccoon: null,
  coyote: {
    type: 'coyote',
    requiredItem: 'lead',
    tameScore: 22,
  },
  bison: null,
  bass: null,
  possum: null,
  armadillo: null,
};

export function canTameAnimal(animalType: AnimalType): boolean {
  return TAMABLE_ANIMALS[animalType] !== null;
}

export function getTameInfo(animalType: AnimalType): TamableAnimal | null {
  return TAMABLE_ANIMALS[animalType];
}
