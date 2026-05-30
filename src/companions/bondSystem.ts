// Bond system — manages bond levels, progression, neglect decay, and passive trait evaluation.
// Bond levels determine when abilities unlock and how strong a companion's effects are.

import type { CompanionDefinition, CompanionInstance } from './companionTypes.js';
import { getCompanionDefinition } from './companionRegistry.js';

// ---- Constants ----

/** Total number of bond levels (1-5). */
export const BOND_LEVELS = 5;

/** Progress points needed per bond level (0-100). */
export const BONDS_PER_LEVEL = 100;

/** Maximum times per day a companion can be fed for bond gain. */
export const MAX_DAILY_FEEDS = 3;

/** Number of rooms without interaction before bond decay begins. */
export const NEGLECT_DECAY_ROOMS = 50;

/** Amount of bond lost per decay cycle. */
export const NEGLECT_DECAY_AMOUNT = 1;

/** Maximum consecutive decay cycles before a companion leaves. */
export const MAX_NEGLECT_DECAY = 3;

// ---- Bond Level Descriptions ----

export interface BondLevelInfo {
  level: number;
  hearts: string;
  name: string;
  description: string;
}

export const BOND_LEVEL_DESCRIPTIONS: BondLevelInfo[] = [
  { level: 1, hearts: '\u{1F494}', name: 'Fledgling', description: 'Just tamed. Doesn\'t fully trust you.' },
  { level: 2, hearts: '\u{1F9E8}', name: 'Trusted', description: 'Follows reliably. First ability unlocked.' },
  { level: 3, hearts: '\u2764\uFE0F', name: 'Devoted', description: 'Strong bond. Second ability unlocked.' },
  { level: 4, hearts: '\u{1F496}', name: 'Kindred', description: 'Deep connection. Third ability unlocked.' },
  { level: 5, hearts: '\u{1F49D}', name: 'Legendary', description: 'Unbreakable bond. All abilities + unique passive.' },
];

// ---- Trait Stacking Caps ----

/** Maximum combined value for each trait type across all companions. */
const TRAIT_CAPS: Record<string, number> = {
  fireResistance: 0.5,
  coldResistance: 0.5,
  movementSpeed: 5,
  wallSenseRadius: 256,
  appleScoreBonus: 1.0,
  appleSpawnBonus: 0.5,
  waterSafe: 1,
  damageMitigation: 1,
  bulletDodgeChance: 0.4,
  bossPullReduction: 0.5,
  shopDiscount: 0.3,
  mapReveal: 1,
  hazardDetection: 1,
  cooldownReduction: 0.5,
  companionDamageBonus: 3,
};

// ---- Public Functions ----

/**
 * Calculate the bond level from progress within a level (0-100).
 * Progress 0-100 = bond level 1. When all levels are maxed, stays at BOND_LEVELS.
 */
export function getBondLevel(bondProgress: number): number {
  // bondProgress is always 0-100 within the current level
  if (bondProgress >= BONDS_PER_LEVEL) {
    return 1;
  }
  return 1;
}

/**
 * Check if a companion should leave due to neglect.
 * After NEGLECT_DECAY_ROOMS without interaction, bond starts decaying.
 * After MAX_NEGLECT_DECAY cycles, the companion leaves.
 */
export function checkNeglectDecay(
  instance: CompanionInstance,
  currentRoomNumber: number,
  flags: Record<string, unknown>,
): { shouldLeave: boolean; bondLost: number } {
  if (instance.isTamed === false) {
    return { shouldLeave: false, bondLost: 0 };
  }

  const roomsSinceInteraction = currentRoomNumber - (instance.lastInteractionRoom ?? currentRoomNumber);

  if (roomsSinceInteraction < NEGLECT_DECAY_ROOMS) {
    return { shouldLeave: false, bondLost: 0 };
  }

  // Track decay cycles in flags
  const decayKey = `companions.neglectDecay.${instance.id}`;
  const currentDecay = Number(flags[decayKey] ?? 0);

  if (currentDecay >= MAX_NEGLECT_DECAY) {
    return { shouldLeave: true, bondLost: NEGLECT_DECAY_AMOUNT };
  }

  // Increment decay cycle
  flags[decayKey] = currentDecay + 1;

  const bondLost = NEGLECT_DECAY_AMOUNT;

  // Reduce bond progress
  instance.bondProgress = Math.max(0, (instance.bondProgress ?? 0) - bondLost);

  // If bond drops below zero at level 1, the companion leaves
  if (instance.bondLevel <= 1 && instance.bondProgress <= 0) {
    return { shouldLeave: true, bondLost };
  }

  // Update mood to sad when neglected
  instance.mood = 'sad' as CompanionInstance['mood'];

  return { shouldLeave: false, bondLost };
}

/**
 * Apply bond increase with daily feed limits and caps.
 * Returns new progress, whether a level-up occurred, and the new level.
 */
export function applyBondIncrease(
  instance: CompanionInstance,
  amount: number,
  currentRoomNumber: number,
  flags: Record<string, unknown>,
  equipmentBondMultiplier: number = 1.0,
): { newProgress: number; levelUp: boolean; newLevel: number } {
  // Reset decay when interacting
  const decayKey = `companions.neglectDecay.${instance.id}`;
  if (flags[decayKey] !== undefined) {
    flags[decayKey] = 0;
  }

  const def = getCompanionDefinitionForInstanceId(instance);
  const maxLevel = def?.maxBonds ?? BOND_LEVELS;
  let levelUp = false;
  let newProgress = instance.bondProgress ?? 0;

  while (instance.bondLevel < maxLevel) {
    newProgress += Math.round(amount * equipmentBondMultiplier);
    if (newProgress >= BONDS_PER_LEVEL) {
      instance.bondLevel += 1;
      newProgress = newProgress - BONDS_PER_LEVEL;
      levelUp = true;
      instance.mood = instance.bondLevel >= 3 ? 'excited' : instance.mood === 'sad' ? 'neutral' : 'happy' as CompanionInstance['mood'];
    } else {
      break;
    }
  }

  // Clamp progress to max
  if (instance.bondLevel >= maxLevel) {
    newProgress = Math.min(BONDS_PER_LEVEL, newProgress);
  }

  instance.bondProgress = newProgress;
  instance.lastInteractionRoom = currentRoomNumber;

  return { newProgress, levelUp, newLevel: instance.bondLevel };
}

/**
 * Evaluate passive traits from all active companions, resolving stacking rules.
 * Traits stack additively but are capped per trait type.
 */
export function evaluatePassiveTraits(
  instances: CompanionInstance[],
  definitions: Map<string, CompanionDefinition>,
): TraitEvaluation[] {
  // Aggregate raw trait values by traitId
  const rawTraits = new Map<string, Array<{ companionId: string; value: number }>>();

  for (const instance of instances) {
    if (!instance.isTamed) continue;
    const def = definitions.get(instance.definitionId);
    if (!def) continue;

    for (const trait of def.traits) {
      const existing = rawTraits.get(trait.traitId) ?? [];
      existing.push({ companionId: instance.id, value: trait.value });
      rawTraits.set(trait.traitId, existing);
    }
  }

  // Calculate totals and apply caps
  const evaluations: TraitEvaluation[] = [];

  for (const [traitId, sources] of rawTraits) {
    let totalValue = 0;
    for (const source of sources) {
      totalValue += source.value;
    }

    const cap = TRAIT_CAPS[traitId];
    if (cap !== undefined) {
      totalValue = Math.min(totalValue, cap);
    }

    evaluations.push({
      traitId,
      totalValue,
      sources,
    });
  }

  return evaluations;
}

/**
 * Get the bond level info for a specific bond level.
 */
export function getBondLevelInfo(level: number): BondLevelInfo | undefined {
  return BOND_LEVEL_DESCRIPTIONS.find((bl) => bl.level === level);
}

/**
 * Get the bond hearts string for a given bond level.
 */
export function getBondHearts(level: number): string {
  const info = BOND_LEVEL_DESCRIPTIONS.find((bl) => bl.level === level);
  return info?.hearts ?? '\u{1F494}';
}

/**
 * Check if a companion has reached max bond level.
 */
export function isMaxBonded(instance: CompanionInstance): boolean {
  const def = getCompanionDefinitionForInstanceId(instance);
  return instance.bondLevel >= (def?.maxBonds ?? BOND_LEVELS);
}

// ---- Trait Evaluation Type ----

export interface TraitEvaluation {
  traitId: string;
  totalValue: number;
  sources: Array<{ companionId: string; value: number }>;
}

// ---- Helper to get companion definition by instance ----

/**
 * Resolve a companion definition from the instance's definitionId.
 */
function getCompanionDefinitionForInstanceId(instance: CompanionInstance): CompanionDefinition | undefined {
  return getCompanionDefinition(instance.definitionId);
}
