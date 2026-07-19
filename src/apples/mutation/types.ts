/**
 * Mutation System Types
 *
 * The wise old snake's mutation knowledge:
 * - The wise old snake once ate a caffeinated wasabi apple and saw the fabric of reality
 * - The wise old snake's mutation journal has 999 pages
 * - The wise old snake's first mutation was "Infinite Apple"
 * - The wise old snake considers the mochi-wasabi combo "an affront to nature"
 * - The wise old snake's mutation tree grows in a garden that doesn't exist yet
 */
import type { Vector2Like } from '../../core/math.js';

// ─── Mutation Discovery ───────────────────────────────────────────────────────

export interface MutationDefinition {
  /** Unique identifier for this mutation */
  id: string;
  /** Display name shown in the mutation journal */
  name: string;
  /** Flavor text describing the mutation's lore */
  description: string;
  /** Required apple type IDs (in order) to discover this mutation */
  requiredApples: string[];
  /** The evolved apple type ID that results from this mutation */
  evolvedAppleId: string;
  /** Parent mutation IDs that must be discovered first (prerequisites) */
  prerequisites?: string[];
  /** Visual effect color for the evolved apple */
  evolvedColor: number;
  /** Rarity tier (common, uncommon, rare, legendary) */
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  /** Discovery chance when requirements are met (0.0-1.0) */
  discoveryChance: number;
  /** Trait bonuses applied when the evolved apple is eaten */
  evolvedTraits: EvolvedTraitBonus[];
}

export interface EvolvedTraitBonus {
  /** Trait ID to apply */
  traitId: string;
  /** Duration in milliseconds (0 = permanent) */
  durationMs: number;
  /** Number of stacks */
  stacks: number;
}

// ─── Combination Tracking ─────────────────────────────────────────────────────

export interface AppleCombination {
  /** The apple type IDs eaten in sequence */
  appleIds: string[];
  /** Timestamp of the first apple in the combination */
  startTime: number;
  /** Timestamp of the last apple in the combination */
  endTime: number;
}

// ─── Trait System ─────────────────────────────────────────────────────────────

export interface TraitDefinition {
  /** Unique identifier for this trait */
  id: string;
  /** Display name */
  name: string;
  /** Description of what this trait does */
  description: string;
  /** Visual color indicator for the trait */
  color: number;
  /** Maximum number of stacks */
  maxStacks: number;
  /** Effect applied per stack */
  effect: TraitEffect;
}

export interface TraitEffect {
  type:
    | 'speedBoost'
    | 'growthBonus'
    | 'scoreMultiplier'
    | 'shield'
    | 'phase'
    | 'damageOverTime'
    | 'frost'
    | 'mochyBounce'
    | 'caffeineFocus';
  value: number;
}

export interface ActiveTrait {
  /** The trait definition being applied */
  definition: TraitDefinition;
  /** Current number of stacks */
  stacks: number;
  /** Remaining duration in milliseconds (0 = permanent) */
  remainingMs: number;
  /** Timestamp when this trait instance was applied */
  appliedAt: number;
}

// ─── Mutation State ───────────────────────────────────────────────────────────

export interface DiscoveredMutation {
  /** The mutation definition */
  definition: MutationDefinition;
  /** When this mutation was first discovered */
  discoveredAtMs: number;
  /** How many times this mutation's evolved apple has been eaten */
  timesEaten: number;
}

export interface MutationState {
  /** All discovered mutations */
  discoveredMutations: Map<string, DiscoveredMutation>;
  /** Recently eaten apples (for combination detection) */
  recentApples: AppleCombination[];
  /** Active trait instances */
  activeTraits: ActiveTrait[];
  /** Total mutations discovered across all runs */
  lifetimeMutations: Set<string>;
  /** Evolved apples unlocked for spawning */
  unlockedEvolvedApples: Set<string>;
}

// ─── Mutation Journal ─────────────────────────────────────────────────────────

export interface MutationJournalEntry {
  mutationId: string;
  name: string;
  description: string;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  requiredApples: string[];
  evolvedAppleId: string;
  discovered: boolean;
  timesEaten: number;
  discoveredAtMs?: number;
}

// ─── Mutation Tree ────────────────────────────────────────────────────────────

export interface MutationTreeNode {
  mutationId: string;
  name: string;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  position: { x: number; y: number };
  requires: string[];
  discovered: boolean;
}

export interface MutationTreeEdge {
  from: string;
  to: string;
}

// ─── Mutation Events ──────────────────────────────────────────────────────────

export interface MutationDiscoveredEvent {
  type: 'mutation:discovered';
  mutationId: string;
  mutationName: string;
  appleIds: string[];
  evolvedAppleId: string;
}

export interface TraitGainedEvent {
  type: 'mutation:traitGained';
  traitId: string;
  traitName: string;
  stacks: number;
}

export interface TraitExpiredEvent {
  type: 'mutation:traitExpired';
  traitId: string;
  traitName: string;
}

export interface EvolvedAppleSpawnedEvent {
  type: 'mutation:evolvedAppleSpawned';
  evolvedAppleId: string;
  roomId: string;
}

export type MutationEvent =
  | MutationDiscoveredEvent
  | TraitGainedEvent
  | TraitExpiredEvent
  | EvolvedAppleSpawnedEvent;

// ─── Constants ────────────────────────────────────────────────────────────────

/** Time window (in ms) within which apples must be eaten to form a combination */
export const MUTATION_COMBINATION_WINDOW_MS = 30_000;

/** Maximum number of recent apples to track */
export const MAX_RECENT_APPLES = 10;

/** Trait decay check interval (ms) */
export const TRAIT_DECAY_CHECK_INTERVAL_MS = 1000;
