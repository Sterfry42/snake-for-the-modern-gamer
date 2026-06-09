import type { RandomGenerator } from '../core/rng.js';
import type { AnimalDropModifiers } from '../animals/animalDrops.js';
import type { SpecialStats } from './specialTypes.js';
import { additivePercent } from './statModifiers.js';

export function getAnimalBonusDropChance(stats: SpecialStats): number {
  return additivePercent(stats, {
    luck: 0.02,
    strength: 0.005,
  });
}

export function getAnimalDoubleDropChance(stats: SpecialStats): number {
  return additivePercent(stats, {
    luck: 0.01,
    strength: 0.005,
  });
}

export function getMeatRecoveryChance(stats: SpecialStats): number {
  return additivePercent(stats, {
    strength: 0.02,
    endurance: 0.005,
  });
}

export function buildAnimalDropModifiers(
  stats: SpecialStats,
  rng: RandomGenerator,
): AnimalDropModifiers {
  return {
    bonusChance: getAnimalBonusDropChance(stats),
    doubleRoll: rng() < getAnimalDoubleDropChance(stats),
    guaranteedMeat: rng() < getMeatRecoveryChance(stats),
  };
}
