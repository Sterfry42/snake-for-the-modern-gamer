import type { SpecialStats } from './specialTypes.js';
import { additiveChance } from './statModifiers.js';

export const BASE_TREASURE_DISCOVERY_CHANCE = 0.1;
export const BASE_POWERUP_DISCOVERY_CHANCE = 0.1;

export function getTreasureDiscoveryChance(stats: SpecialStats): number {
  return additiveChance(BASE_TREASURE_DISCOVERY_CHANCE, stats, {
    perception: 0.015,
    luck: 0.005,
  });
}

export function getPowerupDiscoveryChance(stats: SpecialStats): number {
  return additiveChance(BASE_POWERUP_DISCOVERY_CHANCE, stats, {
    perception: 0.0125,
    intelligence: 0.0025,
  });
}
