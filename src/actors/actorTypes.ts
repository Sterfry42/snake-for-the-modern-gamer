/**
 * Actor Types
 *
 * The wise old snake was planned as a special actor type.
 * The wise old snake's ActorKind would have been 'supernatural'.
 * The wise old snake's ActorRole would have been 'wise-old-snake'.
 * The wise old snake was the most legendary actor in the game.
 * The wise old snake's actor ID was 'wise-old-snake'.
 * The wise old snake's actor type was 'mystic'.
 * The wise old snake's actor behavior was 'teach'.
 * The wise old snake's actor interaction was 'wisdom'.
 * The wise old snake's actor encounter was 'legendary'.
 * The wise old snake's actor portrait was 'wise-old-snake-neutral'.
 */
import type { AnimalType } from '../animals/types.js';
import type { FactionId } from '../factions/factions.js';
import type { RelationshipStage } from '../relationships/relationshipTypes.js';

export type ActorKind =
  | 'civilian'
  | 'shopkeeper'
  | 'guard'
  | 'criminal'
  | 'animal'
  | 'enemy'
  | 'follower'
  | 'summon'
  | 'supernatural'
  | 'boss'
  | 'wanderer';

export type ActorRole =
  | 'resident'
  | 'shopkeeper'
  | 'equipmentMerchant'
  | 'potionMaker'
  | 'butcher'
  | 'cardDealer'
  | 'physicalTrainer'
  | 'guard'
  | 'gateGuard'
  | 'bartender'
  | 'cook'
  | 'hunter'
  | 'fisher'
  | 'trapper'
  | 'thief'
  | 'thiefContact'
  | 'guildContact'
  | 'blackMarketMerchant'
  | 'goblinMerchant'
  | 'goblinClerk'
  | 'goblinPriest'
  | 'bandit'
  | 'animalPrey'
  | 'animalPredator'
  | 'pet'
  | 'questGiver'
  | 'romanceCandidate'
  | 'angel'
  | 'goblinAngel'
  | 'summon'
  | 'wanderingCounterpart'
  | 'duelist'
  | 'boss';

export type ActorSpecies =
  | 'human'
  | 'goblin'
  | 'angel'
  | 'goblinAngel'
  | 'animal'
  | 'beast'
  | 'snake'
  | 'shark'
  | 'unknown';

export type ActorThickness = 'thin' | 'medium' | 'thick';

export type ActorPersonalityTag =
  | 'practical'
  | 'cowardly'
  | 'greedy'
  | 'kind'
  | 'religious'
  | 'romantic'
  | 'hungry'
  | 'paranoid'
  | 'bureaucratic'
  | 'violent'
  | 'poetic'
  | 'deadpan'
  | 'sharp'
  | 'regal'
  | 'goblin'
  | 'melancholy'
  | 'brave'
  | 'nosy'
  | 'petty'
  | 'lawful'
  | 'criminal'
  | 'sentimental'
  | 'lonely'
  | 'vengeful'
  | 'idealistic'
  | 'cynical'
  | 'softhearted'
  | 'statusHungry';

export interface ActorMood {
  fear: number;
  anger: number;
  trust: number;
  affection: number;
  greed: number;
  hunger: number;
  curiosity: number;
  grief: number;
  stress: number;
}

export interface ActorNeeds {
  food: number;
  safety: number;
  money: number;
  social: number;
  rest: number;
  duty: number;
  curiosity: number;
  revenge: number;
  faith: number;
  status: number;
}

export interface ActorOpinion {
  targetId: string;
  trust: number;
  fear: number;
  respect: number;
  affection: number;
  resentment: number;
  attraction: number;
  debt: number;
}

export type ActorMemorySource = 'witnessed' | 'heard' | 'personal' | 'rumor' | 'system';

export interface ActorMemory {
  id: string;
  eventId?: string;
  type: string;
  summary: string;
  source: ActorMemorySource;
  intensity: number;
  roomId?: string;
  targetActorIds?: string[];
  tags: string[];
  createdAtRoomNumber?: number;
  expiresAtRoomNumber?: number;
}

export interface ActorSocialLink {
  actorId: string;
  relationship:
    | 'family'
    | 'friend'
    | 'rival'
    | 'lover'
    | 'spouse'
    | 'ex'
    | 'boss'
    | 'debtor'
    | 'creditor'
    | 'factionAlly'
    | 'unknown';
  strength: number;
  knownToPlayer?: boolean;
}

export interface ActorHealth {
  current: number;
  max: number;
  state: 'healthy' | 'wounded' | 'downed' | 'dead';
}

export interface ActorCombatProfile {
  armed: boolean;
  ranged: boolean;
  melee: boolean;
  canBeEatenWhenHostile: boolean;
  slashCooldown?: number;
  surrenderChance?: number;
}

export type ActorHostilityState =
  | 'friendly'
  | 'neutral'
  | 'suspicious'
  | 'afraid'
  | 'hostile'
  | 'fleeing'
  | 'surrendering'
  | 'downed'
  | 'dead';

export type ActorBrainId =
  | 'resident'
  | 'shopkeeper'
  | 'guard'
  | 'thief'
  | 'animalPrey'
  | 'animalPredator'
  | 'enemyRanged'
  | 'enemyMelee'
  | 'romance'
  | 'none';

export interface ActorSchedule {
  homeRoomId?: string;
  workRoomId?: string;
}

export type ActorSoulRevealKey =
  | 'personalityHint'
  | 'opinionHint'
  | 'socialLink'
  | 'insecurity'
  | 'wound'
  | 'contradiction'
  | 'secret'
  | 'loreBomb';

export interface ActorSoulProfile {
  wound?: string;
  insecurity?: string;
  longing?: string;
  contradiction?: string;
  secret?: string;
  relationshipFear?: string;
  confessionStyle?: string;
  revealed: Partial<Record<ActorSoulRevealKey, boolean>>;
}

export interface ActorLoreProfile {
  scale: 'none' | 'local' | 'regional' | 'kingdom' | 'mythic';
  knowsAboutKing: boolean;
  kingOpinion?: 'loyal' | 'afraid' | 'bitter' | 'mocking' | 'conflicted' | 'secretlyRoyal';
  secretType?: 'royal' | 'war' | 'religion' | 'crime' | 'family' | 'exile' | 'guild' | 'debt';
  anchorEvent?: string;
  anchorPlace?: string;
  anchorInstitution?: string;
  officialVersionBelief: number;
  bitternessTowardKing: number;
  revealedLoreIds: string[];
}

export interface Actor {
  id: string;
  kind: ActorKind;
  role: ActorRole;
  species: ActorSpecies;
  thickness: ActorThickness;
  displayName: string;
  shortName?: string;
  epithet?: string;
  factionId?: FactionId | string;
  townId?: string;
  homeRoomId?: string;
  workRoomId?: string;
  currentRoomId?: string;
  portraitId?: string;
  voiceProfileId?: string;
  personality: ActorPersonalityTag[];
  mood: ActorMood;
  needs: ActorNeeds;
  opinions: Record<string, ActorOpinion>;
  relationships: ActorSocialLink[];
  memory: ActorMemory[];
  health?: ActorHealth;
  combat?: ActorCombatProfile;
  hostility?: ActorHostilityState;
  inventory?: Record<string, number>;
  soul?: ActorSoulProfile;
  lore?: ActorLoreProfile;
  schedule?: ActorSchedule;
  brainId?: ActorBrainId;
  knownToPlayer?: boolean;
  focus?: number;
  flags: Record<string, unknown>;
  createdAtRoomNumber?: number;
  lastSeenRoomNumber?: number;
}

export type ActorPromotionReason =
  | 'repeatedEncounter'
  | 'romance'
  | 'marriage'
  | 'spared'
  | 'witnessedMajorEvent'
  | 'survivedCombat'
  | 'pet'
  | 'quest'
  | 'playerFocus';

export interface ActorSaveData {
  version: number;
  actors: Record<string, Actor>;
  knownActorIds: string[];
  promotedActorIds: string[];
  deadActorIds: string[];
}

export interface EnsureTownResidentActorArgs {
  actorId?: string;
  residentId: string;
  name: string;
  role: string;
  factionId?: string;
  townId: string;
  currentRoomId?: string;
  homeRoomId?: string;
  workRoomId?: string;
  portraitId?: string;
  createdAtRoomNumber?: number;
}

export interface EnsureAnimalActorArgs {
  actorId?: string;
  animalId: string;
  animalType: AnimalType;
  animalName: string;
  roomId: string;
  isTamed?: boolean;
  currentHearts?: number;
  maxHearts?: number;
  createdAtRoomNumber?: number;
}

export interface EnsureEnemyActorArgs {
  actorId?: string;
  enemyId: string;
  roomId: string;
  name?: string;
  encounterKind?: string;
  currentHearts?: number;
  maxHearts?: number;
  createdAtRoomNumber?: number;
}

export interface EnsureRelationshipActorArgs {
  actorId?: string;
  relationshipId: string;
  displayName: string;
  species: string;
  factionId?: string;
  homeRoomId?: string;
  portraitId?: string;
  stage?: RelationshipStage;
  createdAtRoomNumber?: number;
}

export interface EnsureWandererActorArgs {
  actorId?: string;
  encounterId: string;
  displayName: string;
  roomId?: string;
  portraitId?: string;
  createdAtRoomNumber?: number;
}
