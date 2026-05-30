// Protector companion behavior — intercepts hazards based on damageMitigation trait.
// Called when the player encounters a hazard that would cause damage.

import type { CompanionInstance, CompanionDefinition } from '../companionTypes.js';
import { getCompanionDefinition } from '../companionRegistry.js';

export type HazardType = 'wall' | 'water' | 'boss' | 'temperature';

/**
 * Protector companion intervention: intercept a hazard based on the companion's
 * `damageMitigation` trait.
 *
 * The `damageMitigation` trait is expressed as a tick interval: the protector
 * intercepts one hit every `damageMitigation` ticks. For example, a value of
 * 30 means the protector blocks one hit every 30 ticks.
 *
 * @param instance - The tamed protector companion instance.
 * @param definition - The static definition for this creature type.
 * @param hazardType - The type of hazard being intercepted.
 * @param currentTick - The current game tick counter.
 * @returns True if the protector successfully intercepted the hazard.
 */
export function tryProtectorIntervene(
  instance: CompanionInstance,
  definition: CompanionDefinition,
  hazardType: HazardType,
  currentTick: number,
): boolean {
  const damageMitigation = getTraitValue(definition.traits, 'damageMitigation');
  if (damageMitigation <= 0) {
    return false;
  }

  // Check if the protector has an active cooldown (shield from ability usage)
  const shieldFlag = instance.flags?.['shellShieldActive'] as number | undefined;
  if (shieldFlag && currentTick < shieldFlag) {
    // Shield is still active — block this hazard
    instance.totalDangersSurvived += 1;
    return true;
  }

  // Calculate tick interval between protections
  // damageMitigation = 30 means protect every 30 ticks
  const interval = Math.max(1, Math.floor(damageMitigation));
  const lastProtectionTick = instance.flags?.['lastProtectionTick'] as number | undefined;

  // Check if enough time has passed since the last protection
  if (lastProtectionTick !== undefined) {
    const ticksSinceProtection = currentTick - lastProtectionTick;
    if (ticksSinceProtection < interval) {
      return false;
    }
  }

  // Protector successfully intercepts the hazard
  instance.flags['lastProtectionTick'] = currentTick;
  instance.totalDangersSurvived += 1;

  // Update mood to protective on successful intercept
  instance.mood = 'protective' as CompanionInstance['mood'];

  return true;
}

/**
 * Get the effective damage mitigation from all protector companions.
 * Returns the minimum tick interval (i.e., the most protective companion).
 */
export function getDamageMitigation(
  activeProtectors: CompanionInstance[],
): number {
  let minInterval = Infinity;

  for (const instance of activeProtectors) {
    const def = getCompanionDefinition(instance.definitionId);
    if (!def) continue;

    const mitigation = getTraitValue(def.traits, 'damageMitigation');
    if (mitigation > 0) {
      minInterval = Math.min(minInterval, mitigation);
    }
  }

  return minInterval === Infinity ? 0 : minInterval;
}

/**
 * Calculate the shield expiration tick based on the protector's abilities.
 * Returns the tick at which the shield expires (or 0 if no shield ability).
 */
export function getShieldExpiration(
  instance: CompanionInstance,
  currentTick: number,
): number {
  // Check for active shield flag
  const shieldFlag = instance.flags?.['shellShieldActive'] as number | undefined;
  if (shieldFlag) {
    return shieldFlag;
  }
  return 0;
}

/**
 * Get a trait value from a list of traits.
 */
function getTraitValue(traits: Array<{ traitId: string; value: number }>, traitId: string): number {
  const trait = traits.find((t) => t.traitId === traitId);
  return trait?.value ?? 0;
}
