/**
 * Humans
 */
import type { Vector2Like } from '../core/math.js';
import type { BiomeId } from '../world/biomes.js';

// === HUMAN TYPES ===

export type HumanType =
  | 'resident'
  | 'guard'
  | 'merchant'
  | 'cook'
  | 'scribe'
  | 'thief'
  | 'mystic'
  | 'wanderer'
  | 'hunter'
  | 'fisher'
  | 'hermit'
  | 'goblin';

export type HumanDisposition = 'friendly' | 'neutral' | 'suspicious' | 'hostile';

export type HumanRole =
  | 'house'
  | 'shopkeeper'
  | 'quest-giver'
  | 'vendor'
  | 'guard'
  | 'romance'
  | 'wanderer'
  | 'specialist'
  | 'gossip'
  | 'trainer';

// === HUMAN DEFINITIONS ===

export interface HumanDropEntry {
  itemId: string;
  chance: number;
  minCount?: number;
  maxCount?: number;
}

export interface HumanDefinition {
  type: HumanType;
  name: string;
  biomeIds: BiomeId[];
  spawnWeight: number;
  maxPerRoom: number;
  disposition: HumanDisposition;
  role: HumanRole;
  dialogueTopics: string[];
  drops?: HumanDropEntry[];
  portraitId?: string;
  maxHearts?: number;
  behavior?: 'idle' | 'patrol' | 'trade' | 'flee' | 'fight';
  minRoomsVisited?: number;
  shopId?: string;
  duelDifficulty?: 'easy' | 'normal' | 'hard' | 'legendary';
}

// === HUMAN INSTANCES ===

export interface HumanInstance {
  id: string;
  type: HumanType;
  roomId: string;
  position: Vector2Like;
  direction: Vector2Like;
  disposition: HumanDisposition;
  isHostile: boolean;
  currentHearts?: number;
  tradeInventory?: string[];
  flags: Record<string, unknown>;
  relationshipScore: number;
  lastSeenByPlayer: number;
  flashTicks: number;
}

// === HUMAN STATS ===

export interface HumanStats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

// === HUMAN PROFILES ===

export interface HumanProfile {
  id: string;
  name: string;
  type: HumanType;
  role: HumanRole;
  disposition: HumanDisposition;
  portraitId?: string;
  stats: HumanStats;
  maxHearts: number;
  biography: string;
  biomeIds: BiomeId[];
  dialogueTopics: string[];
}

// === HUMAN ENCOUNTERS ===

export type HumanEncounterKind = 'shop' | 'quest' | 'duel' | 'gossip' | 'romance' | 'trivia';

export interface HumanEncounter {
  id: string;
  name: string;
  type: HumanType;
  kind: HumanEncounterKind;
  weight: number;
  minRoomsVisited: number;
  oneShot?: boolean;
  biomeIds?: BiomeId[];
  portraitId?: string;
  pages: string[];
  repeatPages?: string[];
  acceptLabel?: string;
  rejectLabel?: string;
  questId?: string;
  rewardScore?: number;
  rewardItemId?: string;
  shopId?: string;
  romanceId?: string;
  duelDifficulty?: 'easy' | 'normal' | 'hard' | 'legendary';
}

// === HUMAN RELATIONSHIPS ===

export interface HumanRelationship {
  humanId: string;
  humanName: string;
  humanType: HumanType;
  score: number; // -100 to 100
  status: 'stranger' | 'acquaintance' | 'friend' | 'close-friend' | 'rival' | 'enemy' | 'romance';
  lastInteraction: number;
  interactions: number;
  giftsGiven: number;
  questsCompleted: number;
  betrayals: number;
}

// === HUMAN NAMES ===

export interface HumanNamePool {
  type: HumanType;
  names: string[];
  genderBias?: 'male' | 'female' | 'neutral';
}

// === HUMAN BIOME SPECIALIZATION ===

export interface HumanBiomeSpecialization {
  biomeId: BiomeId;
  specializedTypes: HumanType[];
  bonusSpawnWeight: number;
  exclusiveTypes: HumanType[];
}
