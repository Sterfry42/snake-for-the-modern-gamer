import type { AppleSystemConfig, AppleTypeConfig } from '../config/gameConfig.js';
import type { SpecialStats } from './specialTypes.js';
import { getStatDelta } from './specialStats.js';

const SPECIAL_APPLES = new Set([
  'shielded',
  'gold',
  'skittish',
  'mochi',
  'wasabi',
  'yuzu',
  'caffeinated',
  'amacha',
  'koi',
]);

const RARE_APPLES = new Set(['gold', 'mochi', 'wasabi', 'yuzu', 'caffeinated', 'amacha', 'koi']);

export interface AppleChanceContext {
  score: number;
  waterOnly?: boolean;
}

export interface AppleChanceSummary {
  specialAppleChance: number;
  rareAppleChance: number;
  eligibleCount: number;
}

export function getAppleWeightScalar(typeId: string, stats: SpecialStats): number {
  const luckDelta = getStatDelta(stats, 'luck');
  const perceptionDelta = getStatDelta(stats, 'perception');
  let scalar = 1;
  if (SPECIAL_APPLES.has(typeId)) {
    scalar += luckDelta * 0.06;
  }
  if (RARE_APPLES.has(typeId)) {
    scalar += luckDelta * 0.05 + perceptionDelta * 0.015;
  }
  return Math.max(0.1, scalar);
}

export function getEligibleAppleWeights(
  config: AppleSystemConfig,
  stats: SpecialStats,
  context: AppleChanceContext,
): Array<{ type: AppleTypeConfig; weight: number }> {
  if (context.waterOnly) {
    return config.types
      .filter((type) => type.id === 'pearl' || type.id === 'gold' || type.id === 'normal')
      .map((type) => ({ type, weight: Math.max(0, type.spawn.base) }));
  }

  return config.types
    .filter((type) => type.id !== 'pearl' && (type.spawn.scoreThreshold ?? 0) <= context.score)
    .map((type) => ({
      type,
      weight: Math.max(0, type.spawn.base * getAppleWeightScalar(type.id, stats)),
    }))
    .filter((entry) => entry.weight > 0);
}

export function getAppleChanceSummary(
  config: AppleSystemConfig,
  stats: SpecialStats,
  context: AppleChanceContext,
): AppleChanceSummary {
  const eligible = getEligibleAppleWeights(config, stats, context);
  const totalWeight = eligible.reduce((total, entry) => total + entry.weight, 0);
  if (totalWeight <= 0) {
    return { specialAppleChance: 0, rareAppleChance: 0, eligibleCount: eligible.length };
  }

  const specialWeight = eligible
    .filter((entry) => SPECIAL_APPLES.has(entry.type.id))
    .reduce((total, entry) => total + entry.weight, 0);
  const rareWeight = eligible
    .filter((entry) => RARE_APPLES.has(entry.type.id))
    .reduce((total, entry) => total + entry.weight, 0);

  return {
    specialAppleChance: specialWeight / totalWeight,
    rareAppleChance: rareWeight / totalWeight,
    eligibleCount: eligible.length,
  };
}
