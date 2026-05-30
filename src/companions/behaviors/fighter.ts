// Fighter companion behavior — applies damage to enemies or reduces boss pull strength.
// Called during combat encounters when a tamed fighter companion is active.

import type { CompanionInstance, CompanionDefinition } from '../companionTypes.js';
import { getCompanionDefinition } from '../companionRegistry.js';

export interface Enemy {
  id: string;
  position: { x: number; y: number };
  currentHearts: number;
  maxHearts: number;
  encounterKind?: string;
}

export interface SnakeState {
  currentRoomId: string;
  gridX: number;
  gridY: number;
}

/**
 * Fighter companion effect: apply damage to enemies or reduce boss pull strength.
 *
 * Fighter companions deal damage to enemies based on their `companionDamageBonus`
 * trait and the companion's bond level. They also passively reduce boss pull
 * strength via the `bossPullReduction` trait.
 *
 * @param instance - The tamed fighter companion instance.
 * @param definition - The static definition for this creature type.
 * @param snakeState - The current state of the player's snake.
 * @param enemies - The list of enemies in the current room to potentially damage.
 */
export function applyFighterEffect(
  instance: CompanionInstance,
  definition: CompanionDefinition,
  snakeState: SnakeState,
  enemies: Enemy[],
): void {
  if (enemies.length === 0) {
    return;
  }

  // Calculate fighter damage from traits
  const damageBonus = getTraitValue(definition.traits, 'companionDamageBonus');
  const bossReduction = getTraitValue(definition.traits, 'bossPullReduction');

  // Base damage scales with bond level
  const baseDamage = 1 + instance.bondLevel;

  // Apply damage to all enemies (fighter attacks all nearby enemies)
  for (const enemy of enemies) {
    // Scale damage by damageBonus trait (each point = +1 damage)
    const totalDamage = baseDamage + Math.floor(damageBonus);

    // Apply damage — reduce enemy health
    enemy.currentHearts = Math.max(0, enemy.currentHearts - totalDamage);

    // Track danger survived
    instance.totalDangersSurvived += 1;
  }

  // Boss pull reduction is passive — applied when boss abilities target the player
  if (bossReduction > 0) {
    // This flag is read by the boss system to reduce pull strength
    const flagKey = `companions.fighter.bossPullReduction.${instance.id}`;
    (snakeState as unknown as Record<string, unknown>)[flagKey] = bossReduction;
  }
}

/**
 * Get the effective boss pull reduction from all fighter companions.
 */
export function getBossPullReduction(
  activeFighters: CompanionInstance[],
): number {
  let totalReduction = 0;

  for (const instance of activeFighters) {
    const def = getCompanionDefinition(instance.definitionId);
    if (!def) continue;

    const reduction = getTraitValue(def.traits, 'bossPullReduction');
    totalReduction += reduction;
  }

  // Cap total boss pull reduction at 50%
  return Math.min(0.5, totalReduction);
}

/**
 * Get the effective companion damage from all fighter companions.
 */
export function getCompanionDamage(
  activeFighters: CompanionInstance[],
): number {
  let totalDamage = 0;

  for (const instance of activeFighters) {
    const def = getCompanionDefinition(instance.definitionId);
    if (!def) continue;

    const damageBonus = getTraitValue(def.traits, 'companionDamageBonus');
    const baseDamage = 1 + instance.bondLevel;
    totalDamage += baseDamage + Math.floor(damageBonus);
  }

  return totalDamage;
}

/**
 * Get a trait value from a list of traits.
 */
function getTraitValue(traits: Array<{ traitId: string; value: number }>, traitId: string): number {
  const trait = traits.find((t) => t.traitId === traitId);
  return trait?.value ?? 0;
}
