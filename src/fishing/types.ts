import type { BiomeId } from '../world/biomes.js';

/** Rarity tiers for fish */
export type FishRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/** Sell price multipliers per rarity tier */
export const RARITY_MULTIPLIERS: Readonly<Record<FishRarity, number>> = {
  common: 0.5,
  uncommon: 0.7,
  rare: 1.0,
  legendary: 1.5,
};

/** A single entry in the catch journal */
export interface CatchEntry {
  /** Unique identifier for this catch event */
  id: string;
  /** The fish type that was caught */
  typeId: FishTypeId;
  /** The biome where the fish was caught */
  biomeId: BiomeId;
  /** Rarity tier of the caught fish */
  rarity: FishRarity;
  /** Weight in kilograms, rounded to 2 decimal places */
  weight: number;
  /** Timestamp in milliseconds (Date.now()) */
  timestamp: number;
}

/** Unique identifier for each fish type */
export type FishTypeId =
  // Verdigris Basin
  | 'minnow'
  | 'perch'
  // Ember Waste
  | 'desert-catfish'
  | 'fire-eel'
  // Moonlit Parish
  | 'ice-perch'
  | 'frost-trout'
  // Sable Depths
  | 'deep-minnow'
  | 'abyss-catfish'
  | 'shadow-eel'
  // Gloam Garden
  | 'garden-carp'
  | 'moon-perch'
  // Elderwood Maze
  | 'swamp-catfish'
  | 'forest-eel'
  | 'kelp-serpent'
  // Sunken Ocean
  | 'reef-fish'
  | 'ocean-bass'
  | 'blue-marlin'
  | 'kraken-baitfish'
  // Jade Peak Province
  | 'koi'
  | 'golden-koi'
  | 'dragon-carp'
  // Liberty Badlands
  | 'prairie-minnow'
  | 'badlands-bass'
  | 'jackalope-lure';

/** Tension zones partitioned as a strict mathematical partition [0..100] */
export interface TensionZones {
  criticalLow: [number, number]; // 0-7
  warningLow: [number, number]; // 8-14
  dangerLow: [number, number]; // 15-19
  safe: [number, number]; // 20-80
  dangerHigh: [number, number]; // 81-85
  warningHigh: [number, number]; // 86-91
  criticalHigh: [number, number]; // 92-100
}

/** The fishing result after a successful catch */
export interface FishCatchResult {
  fish: FishDefinition;
  weight: number;
  totalScore: number;
}

/** Current state of the active fishing minigame */
export interface FishingState {
  /** The tension value (0-100) */
  tension: number;
  /** The current fish being fought */
  fish: FishDefinition;
  /** How close to a successful catch (0-100) */
  progress: number;
  /** Total fight ticks elapsed */
  fightTicks: number;
  /** Struggle direction for the last interval (1 = right, -1 = left) */
  struggleDirection: 1 | -1;
  /** The biome this fish was caught in */
  biomeId: BiomeId;
  /** Whether the fish has escaped */
  escaped: boolean;
  /** Whether the line has broken */
  lineBroken: boolean;
  /** Whether the catch is complete */
  complete: boolean;
}

/** Definition for a single fish type */
export interface FishDefinition {
  /** Unique type id (e.g., 'minnow', 'koi') */
  typeId: FishTypeId;
  /** Display name for this fish */
  name: string;
  /** Flavor description */
  description: string;
  /** The biome this fish is found in */
  biomeId: BiomeId;
  /** Rarity tier */
  rarity: FishRarity;
  /** Base score value for catch */
  baseScore: number;
  /** Minimum weight in kg */
  minWeight: number;
  /** Maximum weight in kg */
  maxWeight: number;
  /** Difficulty of catching (1-10) */
  difficulty: number;
  /** Aggression during the fight (0.1-1.0) */
  fightAggression: number;
  /** Struggle interval in game ticks (3-12) */
  fightStruggleInterval: number;
  /** Spawn weight for weighted random selection (higher = more common) */
  spawnWeight: number;
}

/** Sell offer for a fish in shops */
export interface FishSellOffer {
  /** Shop offer id */
  id: string;
  /** Fish type id */
  typeId: FishTypeId;
  /** Item id for the fish in inventory */
  itemId: string;
  /** Shop display name */
  name: string;
  /** Calculated sell price for this fish */
  sellPrice: number;
}

/** Result of a fishing attempt (catch or escape) */
export interface FishingSessionResult {
  caught: boolean;
  result?: FishCatchResult;
  reason?: 'escape' | 'lineBroken' | 'playerAbort';
}
