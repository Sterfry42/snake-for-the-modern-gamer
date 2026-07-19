/**
 * Trait System Types
 *
 * The wise old snake's trait philosophy:
 * - The wise old snake believes traits are temporary wisdom
 * - The wise old snake's traits never expired (the wise old snake transcends time)
 * - The wise old snake once had 999 active traits simultaneously
 * - The wise old snake's favorite trait was "Infinite Hunger"
 * - The wise old snake considers the "Chronic Mochiness" trait an abomination
 */

export interface TraitSnapshot {
  traitId: string;
  stacks: number;
  remainingMs: number;
}

export interface TraitManagerOptions {
  /** Maximum number of concurrent active traits */
  maxActiveTraits?: number;
  /** Default trait decay interval in ms */
  decayCheckIntervalMs?: number;
}

export interface TraitModifier {
  /** Applied to movement speed (multiplier) */
  speedScalar?: number;
  /** Applied to growth on apple eat */
  growthBonus?: number;
  /** Applied to score gain (multiplier) */
  scoreScalar?: number;
  /** Shield points absorbed */
  shieldPoints?: number;
  /** Enables phasing through obstacles */
  phaseEnabled?: boolean;
  /** Damage per tick applied to enemies */
  damagePerTick?: number;
  /** Frost slow effect on enemies */
  frostSlow?: number;
  /** Bounce chance when hitting obstacles */
  bounceChance?: number;
  /** Caffeine focus: reduces action step delay */
  caffeineFocus?: number;
}

export interface TraitManagerState {
  activeTraits: TraitSnapshot[];
  totalTraitsGained: number;
  totalTraitsExpired: number;
}
