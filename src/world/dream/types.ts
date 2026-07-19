/**
 * Dream World Types
 *
 * The wise old snake's dream world:
 * - The wise old snake dreamed of a world where all apples were golden
 * - The wise old snake's dream was so vivid it had its own save file
 * - The wise old snake once spent 7 days in a dream and woke up with 7 new segments
 * - The wise old snake's dream apples tasted like nostalgia and static
 * - The wise old snake's nightmare realm was just the normal map with the colors inverted
 * - The wise old snake's lucid dream was so lucid the snake became the dream
 * - The wise old snake's dream journal has 999 pages, all blank except page 42
 * - The wise old snake's dream currency is called "REM coins" but nobody knows why
 * - The wise old snake's dream shop only opens when you're not looking
 * - The wise old snake considers the dream world "a bit much, but charming"
 */
import type { Vector2Like } from '../../core/math.js';

// ─── Dream Entry ───────────────────────────────────────────────────────────────

export type DreamStateId = 'dream' | 'nightmare';

export interface DreamEntryConditions {
  dreamWorld: {
    caffeinatedAppleStreak: number;
    strangeAppleCount: number;
    consecutiveDreams: number;
    lowHealthThreshold: number;
  };
  nightmareRealm: {
    lowHealthThreshold: number;
    strangeAppleThreshold: number;
  };
}

export interface DreamSessionData {
  state: DreamStateId;
  startTime: number;
  duration: number;
  shardsCollected: number;
  loreFragments: string[];
  puzzlesSolved: string[];
  applesEaten: string[];
  lucidityLevel: number;
  gravityShifts: number;
  survivedTicks: number;
}

// ─── Dream Physics ─────────────────────────────────────────────────────────────

export type GravityDirection = 'up' | 'down' | 'left' | 'right';

export interface DreamPhysicsState {
  gravity: GravityDirection;
  gravityTimer: number;
  shiftInterval: number;
  isTimeStopped: boolean;
  timeStopTimer: number;
}

export interface FloatingIsland {
  id: string;
  center: Vector2Like;
  size: Vector2Like;
  connectedIslands: string[];
  bridges: DreamBridge[];
  hasPuzzle: boolean;
  puzzleId?: string;
  hasTreasure: boolean;
  treasureClaimed: boolean;
}

export interface DreamBridge {
  fromIsland: string;
  toIsland: string;
  color: number;
  integrity: number; // 0-1, degrades over time in nightmare
}

// ─── Dream Apples ──────────────────────────────────────────────────────────────

export interface DreamAppleMetadata {
  floatingOffset: number;
  floatSpeed: number;
  phaseOffset: number;
  loreFragment?: string;
  buffType?: DreamBuffType;
  buffDuration: number;
}

export type DreamBuffType =
  | 'speedBoost'
  | 'sizeShrink'
  | 'phaseShift'
  | 'shield'
  | 'doubleShards'
  | 'gravityReverse'
  | 'timeSlow'
  | 'lucidityBoost';

export interface DreamBuff {
  type: DreamBuffType;
  duration: number;
  remaining: number;
}

// ─── Dream Puzzles ─────────────────────────────────────────────────────────────

export type PuzzleType = 'colorMatch' | 'symbolArrange' | 'appleSequence';

export interface PuzzleDefinition {
  id: string;
  type: PuzzleType;
  difficulty: number;
  solution: PuzzleSolution;
  reward: PuzzleReward;
}

export interface PuzzleSolution {
  colorMatch?: {
    targetColors: number[];
    acceptableVariation: number;
  };
  symbolArrange?: {
    symbols: string[];
    correctOrder: string[];
  };
  appleSequence?: {
    sequence: string[];
    tolerance: number;
  };
}

export interface PuzzleReward {
  shards: number;
  loreFragment?: string;
  item?: string;
}

export interface ActivePuzzleState {
  definition: PuzzleDefinition;
  progress: number;
  attempts: number;
  isSolved: boolean;
  startTime: number;
}

// ─── Dream Lore ────────────────────────────────────────────────────────────────

export interface LoreFragment {
  id: string;
  title: string;
  artwork: string;
  text: string;
  discovered: boolean;
  discoveredAt?: number;
  sequence: number; // order in the lore chain
  isNightmareVariant?: boolean; // true for nightmare realm fragments
}

// ─── Dream Shop ────────────────────────────────────────────────────────────────

export interface DreamShopOffer {
  id: string;
  label: string;
  price: number;
  item: DreamShopItem;
  category: DreamShopCategory;
  requiresLucidity?: number;
}

export type DreamShopCategory = 'buff' | 'cosmetic' | 'ability' | 'knowledge';

export interface DreamShopItem {
  kind: 'buff' | 'hat' | 'theme' | 'lore' | 'ability';
  targetId: string;
  description: string;
}

export interface DreamShopState {
  offers: DreamShopOffer[];
  purchased: string[];
  shards: number;
}

// ─── Lucid Dreaming ────────────────────────────────────────────────────────────

export type LucidAbility = 'reverseGravity' | 'timeStop' | 'islandTeleport';

export interface LucidAbilityState {
  ability: LucidAbility;
  cooldown: number;
  maxCooldown: number;
  available: boolean;
}

export interface LucidDreamState {
  unlocked: boolean;
  level: number; // 0 = not unlocked, 1+ = level
  abilities: LucidAbilityState[];
  totalVisits: number;
  visitsBeforeUnlock: number;
}

// ─── Dream Save Data ───────────────────────────────────────────────────────────

export interface DreamSaveData {
  version: number;
  totalDreamVisits: number;
  totalNightmareVisits: number;
  totalShardsCollected: number;
  dreamJournal: {
    fragments: Record<string, boolean>;
    sequenceProgress: number;
  };
  lucidDreaming: LucidDreamState;
  dreamShop: DreamShopState;
  currentSession: DreamSessionData | null;
  appleCombinations: Record<string, number>; // tracks apple combo history
}

// ─── Dream Events ──────────────────────────────────────────────────────────────

export type DreamEventType =
  | 'dream:entered'
  | 'dream:exited'
  | 'dream:nightmareEntered'
  | 'dream:nightmareExited'
  | 'dream:shardCollected'
  | 'dream:loreDiscovered'
  | 'dream:puzzleSolved'
  | 'dream:appleEaten'
  | 'dream:buffApplied'
  | 'dream:lucidityGained'
  | 'dream:abilityUsed'
  | 'dream:shopPurchase'
  | 'dream:gravityShifted'
  | 'dream:treasureFound'
  | 'dream:nightmareSurvived';

export interface DreamEvent {
  type: DreamEventType;
  data: Record<string, unknown>;
  timestamp: number;
}

// ─── Configuration ─────────────────────────────────────────────────────────────

export interface DreamWorldConfig {
  enabled: boolean;
  dreamEntryChance: number; // base chance per tick
  nightmareEntryChance: number;
  shardDropRate: number;
  maxShardsPerSession: number;
  gravityShiftInterval: number; // in ticks
  puzzleDifficultyScaling: number;
  loreFragmentCount: number;
  nightmareDifficultyScaling: {
    baseMultiplier: number;
    perMinuteIncrease: number;
  };
  lucidDreaming: {
    visitsRequired: number;
    abilitiesPerLevel: number;
  };
}

export const DEFAULT_DREAM_CONFIG: DreamWorldConfig = {
  enabled: true,
  dreamEntryChance: 0.001,
  nightmareEntryChance: 0.0005,
  shardDropRate: 0.3,
  maxShardsPerSession: 50,
  gravityShiftInterval: 300,
  puzzleDifficultyScaling: 0.1,
  loreFragmentCount: 20,
  nightmareDifficultyScaling: {
    baseMultiplier: 1.0,
    perMinuteIncrease: 0.05,
  },
  lucidDreaming: {
    visitsRequired: 5,
    abilitiesPerLevel: 1,
  },
};
