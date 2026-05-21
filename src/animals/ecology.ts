import type { AnimalType } from './types.js';

export interface PredatorPreyRelation {
  predator: AnimalType;
  prey: AnimalType;
  huntRange: number;
}

export interface EcologySystem {
  relations: PredatorPreyRelation[];
}

const PREDATOR_PREY_RELATIONS: PredatorPreyRelation[] = [
  { predator: 'wolf', prey: 'rabbit', huntRange: 5 },
  { predator: 'wolf', prey: 'deer', huntRange: 4 },
  { predator: 'fox', prey: 'rabbit', huntRange: 4 },
  { predator: 'bear', prey: 'rabbit', huntRange: 3 },
  { predator: 'snake', prey: 'rabbit', huntRange: 3 },
  { predator: 'snake', prey: 'snake', huntRange: 2 },
  { predator: 'eagle', prey: 'jackalope', huntRange: 4 },
  { predator: 'coyote', prey: 'jackalope', huntRange: 4 },
  { predator: 'coyote', prey: 'possum', huntRange: 3 },
  { predator: 'snake', prey: 'possum', huntRange: 2 },
];

export function createEcologySystem(): EcologySystem {
  return { relations: PREDATOR_PREY_RELATIONS };
}

export function findPredatorPreyRelations(
  ecology: EcologySystem,
  animalType: AnimalType,
): { predators: AnimalType[]; prey: AnimalType[] } {
  const predators: AnimalType[] = [];
  const prey: AnimalType[] = [];

  for (const relation of ecology.relations) {
    if (relation.predator === animalType) {
      prey.push(relation.prey);
    }
    if (relation.prey === animalType) {
      predators.push(relation.predator);
    }
  }

  return { predators, prey };
}

export function getHuntRange(
  ecology: EcologySystem,
  predator: AnimalType,
  prey: AnimalType,
): number | null {
  for (const relation of ecology.relations) {
    if (relation.predator === predator && relation.prey === prey) {
      return relation.huntRange;
    }
  }
  return null;
}

export function shouldFlee(
  animalType: AnimalType,
  nearbyAnimalType: AnimalType,
  distance: number,
): boolean {
  const { predators } = findPredatorPreyRelations(
    createEcologySystem(),
    animalType,
  );

  if (predators.includes(nearbyAnimalType)) {
    const range = getHuntRange(createEcologySystem(), nearbyAnimalType, animalType);
    if (range && distance < range) {
      return true;
    }
  }

  return false;
}

export function getAnimalRole(animalType: AnimalType): 'predator' | 'prey' | 'neutral' {
  const ecology = createEcologySystem();
  const { predators: myPredators, prey: myPrey } = findPredatorPreyRelations(ecology, animalType);

  if (myPredators.length > 0 && myPrey.length === 0) {
    return 'prey';
  }
  if (myPrey.length > 0 && myPredators.length === 0) {
    return 'predator';
  }
  if (myPrey.length > 0 && myPredators.length > 0) {
    return 'neutral';
  }
  return 'neutral';
}
