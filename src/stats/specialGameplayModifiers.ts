import { SPECIAL_BASELINE, getStatDelta, normalizeSpecialStats } from './specialStats.js';
import type { SpecialStats } from './specialTypes.js';

export interface SpecialGameplayModifiers {
  movementTickDelayScalar: number;
  turnBufferTicks: number;
  maxHeartBonus: number;
  invulnerabilityTickBonus: number;
  hazardDamageScalar: number;
  hazardTimerScalar: number;
  meleeDamageBonus: number;
  meleeCritChance: number;
  weaponCooldownScalar: number;
  lockOnRangeBonus: number;
  lockOnTimeScalar: number;
  projectileCritChance: number;
  shopPriceScalar: number;
  fineScalar: number;
  rareLootScalar: number;
  weirdOutcomeChanceBonus: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function enduranceHearts(endurance: number): number {
  if (endurance >= 10) return 7;
  if (endurance >= 8) return 5;
  if (endurance >= 6) return 4;
  if (endurance >= 4) return 3;
  if (endurance >= 2) return 2;
  return 1;
}

export function getSpecialGameplayModifiers(input: SpecialStats): SpecialGameplayModifiers {
  const stats = normalizeSpecialStats(input);
  const strengthDelta = getStatDelta(stats, 'strength');
  const perceptionDelta = getStatDelta(stats, 'perception');
  const enduranceDelta = getStatDelta(stats, 'endurance');
  const charismaDelta = getStatDelta(stats, 'charisma');
  const intelligenceDelta = getStatDelta(stats, 'intelligence');
  const agilityDelta = getStatDelta(stats, 'agility');
  const luckDelta = getStatDelta(stats, 'luck');

  const agilitySpeedMultiplier = stats.agility >= SPECIAL_BASELINE
    ? 1 + agilityDelta * 0.1
    : 1 + agilityDelta * 0.0875;
  const weaponCooldownFromInt =
    intelligenceDelta >= 0 ? 1 - intelligenceDelta * 0.06 : 1 - intelligenceDelta * 0.075;
  const weaponCooldownFromAgi =
    agilityDelta >= 0 ? 1 - agilityDelta * 0.05 : 1 - agilityDelta * 0.0625;
  const enduranceHeartBonus = enduranceHearts(stats.endurance) - enduranceHearts(SPECIAL_BASELINE);

  return {
    movementTickDelayScalar: clamp(1 / agilitySpeedMultiplier, 0.5, 1.8),
    turnBufferTicks: stats.agility >= 10 ? 4 : stats.agility >= 8 ? 2 : stats.agility <= 2 ? -1 : 0,
    maxHeartBonus: enduranceHeartBonus,
    invulnerabilityTickBonus: Math.max(0, enduranceDelta * 6),
    hazardDamageScalar: clamp(1 - enduranceDelta * 0.09, 0.5, 1.45),
    hazardTimerScalar: clamp(1 + enduranceDelta * 0.1, 0.6, 1.5),
    meleeDamageBonus: Math.trunc(strengthDelta),
    meleeCritChance: clamp01(strengthDelta * 0.04 + Math.max(0, luckDelta) * 0.015),
    weaponCooldownScalar: clamp(weaponCooldownFromInt * weaponCooldownFromAgi, 0.5, 1.8),
    lockOnRangeBonus: clamp(perceptionDelta * 2, -8, 10),
    lockOnTimeScalar: clamp(1 - intelligenceDelta * 0.1, 0.5, 1.4),
    projectileCritChance: clamp01(Math.max(0, luckDelta) * 0.04),
    shopPriceScalar: clamp(1 - charismaDelta * 0.1, 0.5, 1.6),
    fineScalar: clamp(1 - charismaDelta * 0.12, 0.4, 1.75),
    rareLootScalar: clamp(1 + luckDelta * 0.2, 0.5, 2),
    weirdOutcomeChanceBonus: luckDelta * 0.03,
  };
}
