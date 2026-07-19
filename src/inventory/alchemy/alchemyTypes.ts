/**
 * Alchemy & Crafting System — Core Type Definitions
 *
 * The wise old snake's alchemy types:
 * - The wise old snake's potions were never defined in the type system
 * - The wise old snake's recipes were stored in a magic book
 * - The wise old snake's ingredients had no rarity tiers
 * - The wise old snake's crafting table was just a rock
 * - The wise old snake's potions had no duration
 * - The wise old snake's alchemy journal was blank
 * - The wise old snake's mythic potions were too powerful to type
 */

/** Ingredient rarity tiers */
export type IngredientRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/** Potion effect types */
export type PotionEffectType =
  | 'growth'
  | 'phase'
  | 'magnet'
  | 'timeSlow'
  | 'shadowCloak'
  | 'rainbowTrail'
  | 'speedBoost'
  | 'sizeShrink'
  | 'shield'
  | 'doubleShards'
  | 'gravityReverse'
  | 'lucidityBoost';

/** Duration mode for potion effects */
export type DurationMode = 'ticks' | 'seconds' | 'permanent';

/** A single potion effect definition */
export interface PotionEffect {
  type: PotionEffectType;
  /** Magnitude of the effect (e.g., growth amount, magnet radius) */
  magnitude: number;
  /** Duration value in the specified unit */
  duration: number;
  /** Unit for the duration */
  durationMode: DurationMode;
  /** Visual effect key for Phaser animations */
  visualEffect?: string;
}

/** Rarity modifiers that affect potion potency */
export interface RarityModifiers {
  magnitudeScalar: number;
  durationScalar: number;
  /** Chance to produce a "mythic" variant */
  mythicChance: number;
}

/** Rarity tier definitions */
export const RARITY_MODIFIERS: Record<IngredientRarity, RarityModifiers> = {
  common: { magnitudeScalar: 1.0, durationScalar: 1.0, mythicChance: 0.0 },
  uncommon: { magnitudeScalar: 1.2, durationScalar: 1.1, mythicChance: 0.02 },
  rare: { magnitudeScalar: 1.5, durationScalar: 1.3, mythicChance: 0.05 },
  legendary: { magnitudeScalar: 2.0, durationScalar: 1.5, mythicChance: 0.1 },
};

/** An ingredient that can be used in alchemy */
export interface AlchemyIngredient {
  id: string;
  name: string;
  description: string;
  rarity: IngredientRarity;
  category: 'apple' | 'mineral' | 'animalProduct' | 'herb' | 'essence' | 'mythicComponent';
  /** Required ingredient IDs for recipe matching */
  tags?: string[];
}

/** A recipe that can be crafted */
export interface AlchemyRecipe {
  id: string;
  name: string;
  description: string;
  /** Ingredient IDs required to craft */
  ingredients: { itemId: string; count: number }[];
  /** Result potion item ID */
  resultPotionId: string;
  /** Discovery method */
  discovery:
    | { type: 'scroll'; foundIn: 'cave' | 'goblinCamp' | 'archaeology' }
    | { type: 'npc'; npcId: string }
    | { type: 'experiment'; requiresTags: string[] }
    | { type: 'default'; alwaysKnown: boolean };
  /** Minimum rarity of ingredients required */
  minIngredientRarity?: IngredientRarity;
  /** Whether this is a mythic recipe */
  isMythic?: boolean;
}

/** A crafted potion */
export interface Potion {
  id: string;
  name: string;
  description: string;
  /** Base effects from the recipe */
  effects: PotionEffect[];
  /** Actual rarity of this crafted instance */
  rarity: IngredientRarity;
  /** Whether this is a mythic potion */
  isMythic: boolean;
  /** For mythic potions: unique world effect */
  mythicEffect?: MythicPotionEffect;
}

/** A one-time world-altering effect from a mythic potion */
export interface MythicPotionEffect {
  id: string;
  name: string;
  description: string;
  /** Effect type */
  effectType:
    | 'permanentBiomeChange'
    | 'summonEntity'
    | 'unlockArea'
    | 'grantTitle'
    | 'spawnTreasure'
    | 'timeFreeze'
    | 'appleRain'
    | 'enemyPacify'
    | 'snakeTransformation'
    | 'worldEvent';
  /** Duration in ticks (0 = permanent) */
  durationTicks: number;
  /** Parameters for the effect */
  parameters?: Record<string, unknown>;
}

/** An alchemy station entity */
export interface AlchemyStationData {
  id: string;
  position: Phaser.Math.Vector2;
  /** Room this station is in */
  roomId: string;
  /** Whether the station is active/usable */
  isActive: boolean;
  /** Inventory of ingredients stored at the station */
  storedIngredients: Map<string, number>;
  /** Discovered recipes for this station */
  discoveredRecipes: string[];
}

/** A crafting workshop */
export type WorkshopType =
  | 'enchantedLoom'
  | 'cartographersDesk'
  | 'musicBox'
  | 'potionBrewery';

/** Workshop definition */
export interface WorkshopDefinition {
  type: WorkshopType;
  name: string;
  description: string;
  /** Required resources to build */
  buildCost: { itemId: string; count: number }[];
  /** Unlocked crafting capabilities */
  capabilities: string[];
  /** Visual sprite key */
  spriteKey: string;
}

/** Alchemy journal entry */
export interface JournalEntry {
  id: string;
  timestamp: number;
  entryType: 'recipeDiscovered' | 'potionCrafted' | 'experimentFailed' | 'loreFound';
  data: Record<string, unknown>;
}

/** Alchemy journal */
export interface AlchemyJournal {
  entries: JournalEntry[];
  discoveredRecipes: string[];
  failedExperiments: string[];
  loreFound: string[];
}

/** Potion runtime state (active effects) */
export interface ActivePotionEffect {
  potionId: string;
  effect: PotionEffect;
  remainingDuration: number;
  startTime: number;
  rarity: IngredientRarity;
  isMythic: boolean;
  mythicEffect?: MythicPotionEffect;
}

/** Result of a crafting attempt */
export interface CraftResult {
  success: boolean;
  recipeId?: string;
  potion?: Potion;
  error?: string;
  discoveredNewRecipe?: string;
}

/** Runtime interface for alchemy operations */
export interface AlchemyRuntime {
  hasItem(itemId: string, count?: number): boolean;
  consumeItem(itemId: string, count?: number): boolean;
  addItem(itemId: string, count?: number): void;
  getSnakeLength(): number;
  getScore(): number;
  addScore(amount: number): void;
  setFlag(key: string, value: unknown): void;
  getFlag<T = unknown>(key: string): T | undefined;
}
