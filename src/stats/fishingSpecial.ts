import type { FishDefinition, FishRarity } from '../fishing/types.js';
import type { SpecialStats } from './specialTypes.js';
import { additivePercent } from './statModifiers.js';

export interface FishingSpecialModifiers {
  fishingControl: number;
  fishingStability: number;
  fishRetention: number;
  catchProgressBonus: number;
  rareFishChance: number;
}

export function getFishingControl(stats: SpecialStats): number {
  return additivePercent(stats, {
    agility: 0.025,
    intelligence: 0.005,
  });
}

export function getFishingStability(stats: SpecialStats): number {
  return additivePercent(stats, {
    endurance: 0.025,
    agility: 0.01,
  });
}

export function getFishRetention(stats: SpecialStats): number {
  return additivePercent(stats, {
    endurance: 0.015,
    luck: 0.01,
  });
}

export function getCatchProgressBonus(stats: SpecialStats): number {
  return additivePercent(stats, {
    agility: 0.015,
    intelligence: 0.01,
  });
}

export function getRareFishChance(stats: SpecialStats): number {
  return additivePercent(stats, {
    luck: 0.02,
    perception: 0.005,
  });
}

export function getFishingSpecialModifiers(stats: SpecialStats): FishingSpecialModifiers {
  return {
    fishingControl: getFishingControl(stats),
    fishingStability: getFishingStability(stats),
    fishRetention: getFishRetention(stats),
    catchProgressBonus: getCatchProgressBonus(stats),
    rareFishChance: getRareFishChance(stats),
  };
}

const RARE_FISH_RARITIES = new Set<FishRarity>(['rare', 'legendary']);

export function getRareFishTableChance(
  fish: readonly FishDefinition[],
  rareFishChanceBonus = 0,
): number {
  const weighted = fish.map((entry) => ({
    fish: entry,
    weight: Math.max(
      0,
      RARE_FISH_RARITIES.has(entry.rarity)
        ? entry.spawnWeight * (1 + rareFishChanceBonus)
        : entry.spawnWeight,
    ),
  }));
  const totalWeight = weighted.reduce((total, entry) => total + entry.weight, 0);
  if (totalWeight <= 0) {
    return 0;
  }
  const rareWeight = weighted
    .filter((entry) => RARE_FISH_RARITIES.has(entry.fish.rarity))
    .reduce((total, entry) => total + entry.weight, 0);
  return rareWeight / totalWeight;
}
