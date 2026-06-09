import type { SpecialStatId, SpecialStats } from './specialTypes.js';
import { getStatDelta } from './specialStats.js';

export type StatModifierMap = Partial<Record<SpecialStatId, number>>;

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function clampPercentModifier(value: number, min = -0.75, max = 0.75): number {
  return Math.max(min, Math.min(max, value));
}

export function additiveChance(
  baseChance: number,
  stats: SpecialStats,
  modifiers: StatModifierMap,
): number {
  let result = baseChance;
  for (const [stat, perPoint] of Object.entries(modifiers) as [SpecialStatId, number][]) {
    result += getStatDelta(stats, stat) * perPoint;
  }
  return clamp01(result);
}

export function additivePercent(
  stats: SpecialStats,
  modifiers: StatModifierMap,
  min = -0.75,
  max = 0.75,
): number {
  let result = 0;
  for (const [stat, perPoint] of Object.entries(modifiers) as [SpecialStatId, number][]) {
    result += getStatDelta(stats, stat) * perPoint;
  }
  return clampPercentModifier(result, min, max);
}

export function applyReduction(baseValue: number, reduction: number): number {
  return baseValue * (1 - reduction);
}

export function applyBonus(baseValue: number, bonus: number): number {
  return baseValue * (1 + bonus);
}
