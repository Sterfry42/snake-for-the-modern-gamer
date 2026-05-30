// Companion type definitions — pure TypeScript, no Phaser dependencies.
// All types used across the companion & creature system are defined here.

export type CompanionKind = 'follower' | 'protector' | 'scout' | 'forager' | 'fighter' | 'mount';

export type CompanionRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type CompanionTraitId =
  | 'fireResistance'
  | 'coldResistance'
  | 'movementSpeed'
  | 'wallSenseRadius'
  | 'appleScoreBonus'
  | 'appleSpawnBonus'
  | 'waterSafe'
  | 'damageMitigation'
  | 'bulletDodgeChance'
  | 'bossPullReduction'
  | 'shopDiscount'
  | 'mapReveal'
  | 'hazardDetection'
  | 'cooldownReduction'
  | 'companionDamageBonus';

/** Definition of a passive trait a companion provides. */
export interface CompanionTrait {
  traitId: CompanionTraitId;
  value: number;
  description: string;
}

export type AbilityEffectType = 'heal' | 'shield' | 'dash' | 'reveal' | 'buff' | 'attack' | 'summon' | 'mount';

/** Active ability that a companion can use. */
export interface CompanionAbility {
  abilityId: string;
  name: string;
  description: string;
  requiresBondLevel: number;
  cooldownRooms: number;
  cooldownTicks?: number;
  effect: AbilityEffectType;
  parameters: Record<string, number>;
  soundEffectId?: string;
}

/** Food items required for taming a creature. */
export interface TameCost {
  foodItems: Array<{ itemId: string; count: number }>;
  minimumBondLevel: number;
  conditions?: {
    requiredQuestCompleted?: string;
    minRoomsVisited?: number;
    requiresReligion?: string;
    onlyAtNight?: boolean;
    onlyInBiome?: string;
    onlyDuringEvent?: string;
  };
}

/** Entry in a spawn table defining when/where a creature appears. */
export interface SpawnTableEntry {
  biomeId: string;
  roomCondition: 'any' | 'structure' | 'dangerous' | 'water';
  minRoomsVisited: number;
  baseWeight: number;
  scoreWeight?: number;
  timeOfDayBias?: 'day' | 'night' | 'any';
  eventBias?: string;
}

/** Static, read-only definition for a creature type. */
export interface CompanionDefinition {
  id: string;
  name: string;
  species: string;
  kind: CompanionKind;
  rarity: CompanionRarity;
  portraitId: string;
  spriteRecipeId: string;
  size: number;
  followOffset: { x: number; y: number };
  maxBonds: number;
  traits: CompanionTrait[];
  abilities: CompanionAbility[];
  spawnTable: SpawnTableEntry[];
  tameCost: TameCost;
  description: string;
  lore?: string;
  minRoomsVisited?: number;
}

/** Mood state of a companion instance. */
export type CompanionMood = 'happy' | 'neutral' | 'sad' | 'excited' | 'protective';

/** Runtime instance of a tamed or wild companion. */
export interface CompanionInstance {
  id: string;
  definitionId: string;
  bondLevel: number;
  bondProgress: number;
  currentRoomId: string;
  gridX: number;
  gridY: number;
  lastFedRoom: number;
  feedCountThisDay: number;
  lastInteractionRoom: number;
  abilitiesUsed: Map<string, number>;
  totalApplesEatenTogether: number;
  totalDangersSurvived: number;
  mood: CompanionMood;
  flags: Record<string, unknown>;
  /** Whether this instance has been tamed (vs wild). */
  isTamed: boolean;
}

/** Render data for a companion sprite on the grid. */
export interface CompanionRenderData {
  companionId: string;
  sprite: Phaser.GameObjects.Sprite;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  followIndex: number;
  mood: CompanionInstance['mood'];
  isMount: boolean;
}

/** Serialized save data for the companion system (version 1). */
export interface CompanionSaveData {
  version: number;
  instances: Record<string, CompanionInstance>;
  compendium: CompendiumSaveData;
  settings: {
    mountAutoEnabled: boolean;
    followerLimit: number;
  };
}

/** Serialized compendium discovery data. */
export interface CompendiumSaveData {
  discovered: string[];
  maxBondReached: Record<string, number>;
  totalEncounters: Record<string, number>;
  totalBred: number;
}

/** Result of a taming attempt. */
export interface TameResult {
  success: boolean;
  companionId: string;
  message: string;
  failedReason?: 'insufficientFood' | 'bondTooLow' | 'conditionsNotMet' | 'tamingFailed';
  nextEncounterRoom?: number;
}

/** Result of feeding a companion. */
export interface FeedResult {
  success: boolean;
  bondGain: number;
  feedsRemainingToday: number;
  message: string;
  failedReason?: 'noFood' | 'dailyLimitReached' | 'notPreferred' | 'companionNotFound';
}

/** Result of using a companion ability. */
export interface AbilityResult {
  success: boolean;
  abilityId: string;
  cooldownRemaining?: number;
  message: string;
  failedReason?:
    | 'onCooldown'
    | 'bondTooLow'
    | 'companionNotFound'
    | 'invalidAbility';
}

/** A single entry in the compendium UI view. */
export interface CompendiumEntry {
  companionId: string;
  discovered: boolean;
  tamed: boolean;
  bondLevel?: number;
  definition: CompanionDefinition;
  maxBondReached?: number;
  totalEncounters: number;
}
