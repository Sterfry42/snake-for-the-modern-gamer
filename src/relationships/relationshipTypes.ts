import type { FactionId } from '../factions/factions.js';

export type RelationshipSpecies = 'human' | 'goblin' | 'angel' | 'goblin-angel';

export type RelationshipStage =
  | 'stranger'
  | 'acquaintance'
  | 'friendly'
  | 'crush'
  | 'dating'
  | 'lover'
  | 'estranged'
  | 'hostile'
  | 'murderous';

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
}

export interface RelationshipEventResult {
  ok: boolean;
  title: string;
  message: string;
  color: string;
  state?: RelationshipState;
  rewardItemId?: string;
  rewardScore?: number;
  becameHostile?: boolean;
}

export type RelationshipChoice =
  | 'talk'
  | 'flirt'
  | 'ask-out'
  | 'date'
  | 'apologize'
  | 'boundary'
  | 'mean'
  | 'break-up';

export interface RelationshipTalkResult {
  title: string;
  line: string;
  color: string;
  state: RelationshipState;
}

export interface RelationshipCandidateProfile {
  id: string;
  displayName: string;
  species: RelationshipSpecies;
  portraitId?: string;
  homeRoomId?: string;
  factionId?: FactionId;
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
