import { SPECIAL_BASELINE, getStatDelta, normalizeSpecialStats } from './specialStats.js';
import type { SpecialStats } from './specialTypes.js';
import { resolveNumericModifier, type ModifierAtom } from './modifierResolver.js';
import { clamp, clamp01 } from '../core/math.js';

export type SpecialGameplayModifierTarget =
  | 'movement.tickDelayScalar'
  | 'movement.turnBufferTicks'
  | 'player.maxHearts'
  | 'player.invulnerabilityTicks'
  | 'hazard.damageScalar'
  | 'hazard.timerScalar'
  | 'combat.meleeDamage'
  | 'combat.meleeCritChance'
  | 'weapon.cooldownScalar'
  | 'weapon.lockOnRange'
  | 'weapon.lockOnTimeScalar'
  | 'weapon.projectileCritChance'
  | 'economy.shopPriceScalar'
  | 'economy.fineScalar'
  | 'loot.rareScalar'
  | 'weird.outcomeChanceBonus'
  | 'arcane.manaCapacity'
  | 'arcane.manaRegen'
  | 'arcane.spellSlots'
  | 'growth.nutritionCapacity'
  | 'exploration.pickupRadius'
  | 'social.companionCapacity';

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
  manaCapacityBonus: number;
  manaRegenBonus: number;
  spellSlotBonus: number;
  nutritionCapacityBonus: number;
  pickupRadiusBonus: number;
  companionCapacityBonus: number;
}

function enduranceHearts(endurance: number): number {
  if (endurance >= 10) return 7;
  if (endurance >= 8) return 5;
  if (endurance >= 6) return 4;
  if (endurance >= 4) return 3;
  if (endurance >= 2) return 2;
  return 1;
}

export function getSpecialGameplayModifierAtoms(
  input: SpecialStats,
): Array<ModifierAtom<SpecialGameplayModifierTarget>> {
  const stats = normalizeSpecialStats(input);
  const strengthDelta = getStatDelta(stats, 'strength');
  const perceptionDelta = getStatDelta(stats, 'perception');
  const enduranceDelta = getStatDelta(stats, 'endurance');
  const charismaDelta = getStatDelta(stats, 'charisma');
  const intelligenceDelta = getStatDelta(stats, 'intelligence');
  const agilityDelta = getStatDelta(stats, 'agility');
  const luckDelta = getStatDelta(stats, 'luck');

  const agilitySpeedMultiplier =
    stats.agility >= SPECIAL_BASELINE ? 1 + agilityDelta * 0.1 : 1 + agilityDelta * 0.0875;
  const weaponCooldownFromInt =
    intelligenceDelta >= 0 ? 1 - intelligenceDelta * 0.06 : 1 - intelligenceDelta * 0.075;
  const weaponCooldownFromAgi =
    agilityDelta >= 0 ? 1 - agilityDelta * 0.05 : 1 - agilityDelta * 0.0625;
  const enduranceHeartBonus = enduranceHearts(stats.endurance) - enduranceHearts(SPECIAL_BASELINE);

  const set = (
    target: SpecialGameplayModifierTarget,
    value: number,
  ): ModifierAtom<SpecialGameplayModifierTarget> => ({
    id: `special:${target}`,
    sourceId: 'special',
    sourceKind: 'special',
    target,
    op: 'set',
    value,
  });

  return [
    set('movement.tickDelayScalar', clamp(1 / agilitySpeedMultiplier, 0.5, 1.8)),
    set(
      'movement.turnBufferTicks',
      stats.agility >= 10 ? 4 : stats.agility >= 8 ? 2 : stats.agility <= 2 ? -1 : 0,
    ),
    set('player.maxHearts', enduranceHeartBonus),
    set('player.invulnerabilityTicks', Math.max(0, enduranceDelta * 6)),
    set('hazard.damageScalar', clamp(1 - enduranceDelta * 0.09, 0.5, 1.45)),
    set('hazard.timerScalar', clamp(1 + enduranceDelta * 0.1, 0.6, 1.5)),
    set('combat.meleeDamage', Math.trunc(strengthDelta)),
    set('combat.meleeCritChance', clamp01(strengthDelta * 0.04 + Math.max(0, luckDelta) * 0.015)),
    set('weapon.cooldownScalar', clamp(weaponCooldownFromInt * weaponCooldownFromAgi, 0.5, 1.8)),
    set('weapon.lockOnRange', clamp(perceptionDelta * 2, -8, 10)),
    set('weapon.lockOnTimeScalar', clamp(1 - intelligenceDelta * 0.1, 0.5, 1.4)),
    set('weapon.projectileCritChance', clamp01(Math.max(0, luckDelta) * 0.04)),
    set('economy.shopPriceScalar', clamp(1 - charismaDelta * 0.1, 0.5, 1.6)),
    set('economy.fineScalar', clamp(1 - charismaDelta * 0.12, 0.4, 1.75)),
    set('loot.rareScalar', clamp(1 + luckDelta * 0.2, 0.5, 2)),
    set('weird.outcomeChanceBonus', luckDelta * 0.03),
    set('arcane.manaCapacity', intelligenceDelta * 8),
    set('arcane.manaRegen', intelligenceDelta * 0.12),
    set('arcane.spellSlots', Math.trunc(intelligenceDelta / 3)),
    set('growth.nutritionCapacity', Math.trunc(enduranceDelta / 2)),
    set('exploration.pickupRadius', perceptionDelta * 0.15),
    set('social.companionCapacity', Math.trunc(charismaDelta / 3)),
  ];
}

export function resolveSpecialGameplayModifiers(
  atoms: readonly ModifierAtom<SpecialGameplayModifierTarget>[],
): SpecialGameplayModifiers {
  return {
    movementTickDelayScalar: resolveNumericModifier(atoms, 'movement.tickDelayScalar', { base: 1 }),
    turnBufferTicks: resolveNumericModifier(atoms, 'movement.turnBufferTicks', { base: 0 }),
    maxHeartBonus: resolveNumericModifier(atoms, 'player.maxHearts', { base: 0 }),
    invulnerabilityTickBonus: resolveNumericModifier(atoms, 'player.invulnerabilityTicks', {
      base: 0,
    }),
    hazardDamageScalar: resolveNumericModifier(atoms, 'hazard.damageScalar', { base: 1 }),
    hazardTimerScalar: resolveNumericModifier(atoms, 'hazard.timerScalar', { base: 1 }),
    meleeDamageBonus: resolveNumericModifier(atoms, 'combat.meleeDamage', { base: 0 }),
    meleeCritChance: resolveNumericModifier(atoms, 'combat.meleeCritChance', {
      base: 0,
      min: 0,
      max: 1,
    }),
    weaponCooldownScalar: resolveNumericModifier(atoms, 'weapon.cooldownScalar', { base: 1 }),
    lockOnRangeBonus: resolveNumericModifier(atoms, 'weapon.lockOnRange', { base: 0 }),
    lockOnTimeScalar: resolveNumericModifier(atoms, 'weapon.lockOnTimeScalar', { base: 1 }),
    projectileCritChance: resolveNumericModifier(atoms, 'weapon.projectileCritChance', {
      base: 0,
      min: 0,
      max: 1,
    }),
    shopPriceScalar: resolveNumericModifier(atoms, 'economy.shopPriceScalar', { base: 1 }),
    fineScalar: resolveNumericModifier(atoms, 'economy.fineScalar', { base: 1 }),
    rareLootScalar: resolveNumericModifier(atoms, 'loot.rareScalar', { base: 1 }),
    weirdOutcomeChanceBonus: resolveNumericModifier(atoms, 'weird.outcomeChanceBonus', { base: 0 }),
    manaCapacityBonus: resolveNumericModifier(atoms, 'arcane.manaCapacity', { base: 0 }),
    manaRegenBonus: resolveNumericModifier(atoms, 'arcane.manaRegen', { base: 0 }),
    spellSlotBonus: resolveNumericModifier(atoms, 'arcane.spellSlots', { base: 0 }),
    nutritionCapacityBonus: resolveNumericModifier(atoms, 'growth.nutritionCapacity', { base: 0 }),
    pickupRadiusBonus: resolveNumericModifier(atoms, 'exploration.pickupRadius', { base: 0 }),
    companionCapacityBonus: resolveNumericModifier(atoms, 'social.companionCapacity', { base: 0 }),
  };
}

export function getSpecialGameplayModifiers(input: SpecialStats): SpecialGameplayModifiers {
  return resolveSpecialGameplayModifiers(getSpecialGameplayModifierAtoms(input));
}
