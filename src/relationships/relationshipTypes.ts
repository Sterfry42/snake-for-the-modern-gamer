import type { FactionId } from '../factions/factions.js';

export type RelationshipSpecies = 'human' | 'goblin' | 'angel' | 'goblin-angel' | 'moleman';

export type RelationshipStage =
  | 'stranger'
  | 'acquaintance'
  | 'friendly'
  | 'crush'
  | 'dating'
  | 'lover'
  | 'married'
  | 'heartbroken'
  | 'vengeful'
  | 'estranged'
  | 'hostile'
  | 'murderous'
  | 'dead';

export type RelationshipPersonality = 'poetic' | 'deadpan' | 'hungry' | 'regal' | 'sharp';

export type RelationshipTag =
  | 'bravery'
  | 'recklessness'
  | 'selfPreserving'
  | 'protective'
  | 'selfless'
  | 'pragmatic'
  | 'honesty'
  | 'avoidance'
  | 'loyalty'
  | 'betrayal'
  | 'competence'
  | 'neediness'
  | 'restraint'
  | 'violence'
  | 'mercy'
  | 'ambition'
  | 'humility'
  | 'transaction'
  | 'ritual'
  | 'deathDefiance'
  | 'deathAcceptance'
  | 'publicAffection'
  | 'privateAffection'
  | 'giftGiving'
  | 'giftSpamming'
  | 'neglect'
  | 'rivalAttention'
  | 'secrecy'
  | 'commitment'
  | 'premature'
  | 'dramatic'
  | 'clever'
  | 'food'
  | 'comfort'
  | 'danger'
  | 'contract'
  | 'ledger'
  | 'holy'
  | 'goblin'
  | 'camp'
  | 'marriage'
  | 'family'
  | 'divorce'
  | 'relationship'
  | 'rival'
  | 'murder'
  | 'death'
  | 'trauma';

export type RelationshipOutcomeTier = 'loved' | 'liked' | 'neutral' | 'disliked' | 'hated';

export type ConflictStyle =
  | 'heartbroken'
  | 'withdrawn'
  | 'vengeful'
  | 'murderous'
  | 'petty'
  | 'formalDuel'
  | 'contractual'
  | 'forgiving';

export type ExclusivityPreference =
  | 'open'
  | 'tolerant'
  | 'jealous'
  | 'possessive'
  | 'monogamous'
  | 'territorial'
  | 'transactional'
  | 'devotional';

export type NeglectTier = 0 | 1 | 2 | 3 | 4;

export interface RelationshipMemory {
  id: string;
  relationshipId: string;
  roomsVisited: number;
  kind:
    | 'talk'
    | 'gift'
    | 'flirt'
    | 'date'
    | 'proposal'
    | 'proposalRejected'
    | 'marriage'
    | 'child'
    | 'childHug'
    | 'divorce'
    | 'neglect'
    | 'apology'
    | 'betrayal'
    | 'breakup'
    | 'confession'
    | 'hurt'
    | 'hostility'
    | 'quest'
    | 'rivalConflict'
    | 'rivalMurder'
    | 'death'
    | 'deathScene';
  tags: RelationshipTag[];
  intensity: number;
  tone: 'positive' | 'neutral' | 'negative' | 'traumatic';
  summary: string;
  targetRelationshipId?: string;
  itemId?: string;
  questId?: string;
  uniqueKey?: string;
}

export interface RelationshipChild {
  id: string;
  parentRelationshipId: string;
  name: string;
  type: 'egg' | 'snakelet' | 'adoptedGoblin' | 'cosmic' | 'legalUnit';
  createdRoom: number;
  memories: RelationshipMemory[];
}

export type RelationshipReward =
  | { kind: 'item'; itemId: string; count: number }
  | { kind: 'card'; cardId: string | 'random' }
  | { kind: 'perk'; perkId: string }
  | { kind: 'temporaryBuff'; buffId: string; durationRooms: number }
  | { kind: 'shopDiscount'; factionId?: string; rooms: number }
  | { kind: 'mapHint'; roomId: string }
  | { kind: 'rescueChance'; percent: number }
  | { kind: 'cosmetic'; cosmeticId: string }
  | { kind: 'score'; amount: number };

export interface RelationshipSocialContext {
  spouseId?: string;
  lovers: string[];
  dating: string[];
  crushes: string[];
  exes: string[];
  deadRomances: string[];
}

export interface RelationshipCutscene {
  id: string;
  relationshipId: string;
  trigger:
    | 'onEnterRomanceScreen'
    | 'afterChoice'
    | 'afterRoomChange'
    | 'afterGift'
    | 'afterDate'
    | 'afterProposal'
    | 'afterMarriage'
    | 'afterDivorce'
    | 'afterNeglectTier'
    | 'afterRelationshipGraphEvent';
  priority: number;
  once: boolean;
  pages: string[];
  outcome?: RelationshipChoice;
}

export interface RelationshipPreferenceProfile {
  likedItemTags: string[];
  lovedItemTags: string[];
  dislikedItemTags: string[];
  hatedItemTags: string[];
  favoriteItemIds?: string[];
  tabooItemIds?: string[];
  personalityTags: string[];
}

export interface RelationshipState {
  id: string;
  actorId?: string;
  displayName: string;
  species: RelationshipSpecies;
  homeRoomId?: string;
  factionId?: FactionId;
  portraitId: string;
  stage: RelationshipStage;
  affection: number;
  trust: number;
  jealousy: number;
  resentment: number;
  fear: number;
  fascination: number;
  lastSeenRoomsVisited: number;
  lastGiftRoomsVisited?: number;
  acceptedDates: number;
  rejectedDates: number;
  ignoredEncounters: number;
  romanceOptIn: boolean;
  conflictStyle: ConflictStyle;
  exclusivityPreference: ExclusivityPreference;
  memories: RelationshipMemory[];
  children: RelationshipChild[];
  flags: Record<string, unknown>;
}

export interface DatingCandidateView {
  id: string;
  displayName: string;
  species: RelationshipSpecies;
  factionLabel: string;
  stage: RelationshipStage;
  affection: number;
  trust: number;
  jealousy: number;
  resentment: number;
  fear: number;
  fascination: number;
  lastSeenRoomsAgo: number;
  likes: string[];
  personality?: string;
  personalityDescription?: string;
  warning?: string;
  memories?: RelationshipMemory[];
  spouseId?: string;
}

export interface RelationshipEventResult {
  ok: boolean;
  title: string;
  message: string;
  color: string;
  state?: RelationshipState;
  rewardItemId?: string;
  rewardScore?: number;
  reward?: RelationshipReward;
  becameHostile?: boolean;
  questId?: string;
}

export type RelationshipChoice =
  | 'talk'
  | 'flirt'
  | 'ask-out'
  | 'date'
  | 'apologize'
  | 'boundary'
  | 'mean'
  | 'break-up'
  | 'propose'
  | 'family'
  | 'discuss-arrangement'
  | 'divorce'
  | 'reassure'
  | 'explain'
  | 'plead'
  | 'fight'
  | 'run'
  | 'child-hug';

export interface DatingBranchChoice {
  id: string;
  label: string;
  line: string;
  tags: RelationshipTag[];
  targetTier?: RelationshipOutcomeTier;
  outcomeLines?: Partial<Record<RelationshipOutcomeTier, string>>;
}

export interface RelationshipTalkResult {
  title: string;
  line: string;
  color: string;
  state: RelationshipState;
}

export interface RelationshipCandidateProfile {
  id: string;
  actorId?: string;
  displayName: string;
  species: RelationshipSpecies;
  portraitId?: string;
  homeRoomId?: string;
  factionId?: FactionId;
  personality?: RelationshipPersonality;
  conflictStyle?: ConflictStyle;
  exclusivityPreference?: ExclusivityPreference;
}

export interface RelationshipEncounter {
  relationshipId: string;
  kind: 'gift' | 'longing' | 'jealous' | 'hostile';
  title: string;
  pages: string[];
  acceptLabel: string;
  rejectLabel: string;
  rewardScore?: number;
  rewardItemId?: string;
}
