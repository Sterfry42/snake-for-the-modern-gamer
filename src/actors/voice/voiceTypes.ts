import type { BiomeId } from '../../world/biomes.js';
import type { WorldEventType } from '../../events/worldEventTypes.js';
import type { RelationshipStage } from '../../relationships/relationshipTypes.js';
import type {
  Actor,
  ActorHostilityState,
  ActorKind,
  ActorPersonalityTag,
  ActorRole,
  ActorSocialLink,
  ActorSoulRevealKey,
  ActorSpecies,
} from '../actorTypes.js';

export type ActorConversationBucket = 'talk' | 'ask-around' | 'ask-personal';

export type ActorVoiceTopic =
  | 'talk.player.length'
  | 'talk.player.health'
  | 'talk.player.death'
  | 'talk.player.revival'
  | 'talk.player.hunt'
  | 'talk.player.humanoidEaten'
  | 'talk.player.wanted'
  | 'talk.introduction'
  | 'talk.local.biome'
  | 'talk.local.town'
  | 'talk.generic'
  | 'around.rumor'
  | 'around.currentEvent'
  | 'around.factionTension'
  | 'around.banditThreat'
  | 'around.goblinHuman'
  | 'around.actorGossip'
  | 'around.shopEconomy'
  | 'around.questLead'
  | 'personal.family'
  | 'personal.socialLink'
  | 'personal.insecurity'
  | 'personal.wound'
  | 'personal.longing'
  | 'personal.contradiction'
  | 'personal.secret'
  | 'personal.king'
  | 'personal.relationship';

export type SnakeLengthBand = 'tiny' | 'normal' | 'long' | 'veryLong' | 'absurd' | 'legendary';
export type PlayerHealthBand = 'critical' | 'low' | 'steady';
export type ActorVoiceSource =
  | 'memory'
  | 'rumor'
  | 'faction'
  | 'soul'
  | 'lore'
  | 'social'
  | 'fallback';
export type FactionRelationState =
  | 'allied'
  | 'friendly'
  | 'neutral'
  | 'tense'
  | 'truce'
  | 'skirmishing'
  | 'hostile'
  | 'war';

export interface ActorConversationRumor {
  id: string;
  summary: string;
  tags: string[];
  severity: number;
  townId?: string;
  factionIds?: string[];
}

export interface ActorFactionConversationState {
  relation: FactionRelationState;
  factionIds: string[];
  townId?: string;
  severity: number;
  tags: string[];
  summary: string;
}

export interface ActorConversationContext {
  actor: Actor;
  bucket: ActorConversationBucket;
  biomeId: BiomeId;
  dangerLevel: number;
  playerHealth: number;
  playerMaxHealth: number;
  snakeLength: number;
  roomsVisited: number;
  flags: Record<string, unknown>;
  recentEvents: string[];
  rumors: ActorConversationRumor[];
  factionEvents: ActorFactionConversationState[];
  town?: {
    id: string;
    name: string;
    wantedLevel?: number;
    suspicion?: number;
    reputation?: number;
  };
  relationship?: {
    stage: RelationshipStage;
    affection: number;
    trust: number;
    resentment: number;
    jealousy: number;
    fear: number;
  };
  socialTargetName?: string;
  socialLink?: ActorSocialLink;
  random?(): number;
}

export interface ActorVoiceEntry {
  id: string;
  bucket: ActorConversationBucket;
  topic: ActorVoiceTopic;
  beat?: string;
  text: string;
  priority: number;
  roles?: ActorRole[];
  kinds?: ActorKind[];
  species?: ActorSpecies[];
  biomeIds?: BiomeId[];
  minDangerLevel?: number;
  maxDangerLevel?: number;
  factions?: string[];
  personalityTags?: ActorPersonalityTag[];
  attitudes?: Array<'friendly' | 'wary' | 'afraid' | 'angry' | 'fond' | 'resentful' | 'hostile'>;
  hostility?: ActorHostilityState[];
  relationshipStages?: RelationshipStage[];
  snakeLengthBands?: SnakeLengthBand[];
  healthBands?: PlayerHealthBand[];
  memoryTags?: string[];
  worldEventTypes?: WorldEventType[];
  factionStates?: FactionRelationState[];
  townMoodTags?: string[];
  minFocus?: number;
  maxFocus?: number;
  requiresSoul?: ActorSoulRevealKey | 'any';
  revealsSoul?: ActorSoulRevealKey;
  requiresLore?: 'king' | 'goblinReligion' | 'faction' | 'any';
  socialLinkKinds?: ActorSocialLink['relationship'][];
  oncePerActor?: boolean;
  tags: string[];
  source?: ActorVoiceSource;
}

export interface ActorConversationResult {
  id: string;
  bucket: ActorConversationBucket;
  topic: ActorVoiceTopic;
  source: ActorVoiceSource;
  rumorId?: string;
  beat?: string;
  line: string;
  knownFact?: string;
  revealsSoul?: ActorSoulRevealKey;
  socialLinkActorId?: string;
  tags: string[];
}
