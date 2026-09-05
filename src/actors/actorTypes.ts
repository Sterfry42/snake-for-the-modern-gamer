/**
 * Actor Types
 */
import type { AnimalType } from '../animals/types.js';
import type { FactionId } from '../factions/factions.js';
import type {
  RelationshipPersonality,
  RelationshipSpecies,
  RelationshipStage,
} from '../relationships/relationshipTypes.js';
import type { TownResidentRole } from '../world/townRoles.js';
import type { DayPhase } from '../world/atmosphereTypes.js';

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
  | 'mapper'
  | 'wizard'
  | 'innkeeper'
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
  | 'moleman'
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
  weapons?: ActorWeaponEntry[];
  activeWeaponId?: string;
  slashCooldown?: number;
  surrenderChance?: number;
}

export interface ActorWeaponEntry {
  id: string;
  kind: 'firearm' | 'sword';
  label: string;
  damage: number;
  range: number;
  cooldownRooms: number;
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

export type ActorScheduledBehavior =
  | 'idle'
  | 'emerge'
  | 'forage'
  | 'graze'
  | 'seekDen'
  | 'sleep'
  | 'hide'
  | 'hunt'
  | 'roam'
  | 'scout'
  | 'camp'
  | 'patrol'
  | 'raid'
  | 'ambush'
  | 'work'
  | 'goHome'
  | 'guardPost'
  | 'socialize';

export type ActorScheduleRoomTarget =
  | 'current'
  | 'home'
  | 'work'
  | 'sleep'
  | 'fixedPost'
  | 'firstPatrol';

export interface ActorScheduleRoutine {
  behavior: ActorScheduledBehavior;
  goalKind: ActorGoalKind;
  priority: number;
  roomTarget?: ActorScheduleRoomTarget;
}

export interface ActorSchedule {
  policyId?: string;
  routines?: Partial<Record<DayPhase, ActorScheduleRoutine>>;
  homeRoomId?: string;
  workRoomId?: string;
  sleepRoomId?: string;
  homePosition?: { x: number; y: number };
  workPosition?: { x: number; y: number };
  sleepPosition?: { x: number; y: number };
  patrolRoomIds?: string[];
  fixedPostRoomId?: string;
  fixedPostPosition?: { x: number; y: number };
  permanentDuty?: boolean;
}

export type ActorActivityKind =
  | 'idle'
  | 'walking'
  | 'merchant'
  | 'drinking'
  | 'dealing-cards'
  | 'mapping'
  | 'alchemy'
  | 'cooking'
  | 'training'
  | 'repairing'
  | 'talking'
  | 'combat-melee'
  | 'combat-ranged'
  | 'guarding'
  | 'fishing'
  | 'observing-sky'
  | 'fleeing'
  | 'sheltering'
  | 'sleeping'
  | 'dead';

export interface ActorActivity {
  kind: ActorActivityKind;
  source: 'brain' | 'schedule' | 'combat' | 'social' | 'system';
  targetActorId?: string;
  label?: string;
  startedAtRoomNumber?: number;
  endsAtRoomNumber?: number;
}

export type ActorGoalKind =
  | 'idle'
  | 'wander'
  | 'seekPlayer'
  | 'travelToRoom'
  | 'work'
  | 'goHome'
  | 'socialize'
  | 'attackActor'
  | 'defendArea'
  | 'flee'
  | 'sleep';

export interface ActorGoal {
  kind: ActorGoalKind;
  priority: number;
  roomId?: string;
  targetActorId?: string;
  targetPosition?: { x: number; y: number };
  reason?: string;
}

export interface ActorTargetThreat {
  targetActorId: string;
  source: 'faction' | 'personal' | 'crime' | 'script' | 'combat' | 'system';
  reason: string;
  startedAtRoomNumber?: number;
}

export interface ActorPlayerHostility {
  state: Exclude<ActorHostilityState, 'dead'>;
  reason: string;
  startedAtRoomNumber?: number;
}

export interface ActorPresence {
  roomId: string;
  position: { x: number; y: number };
  materialized: boolean;
  anchor?: { x: number; y: number };
  wanderRadius?: number;
  stationary?: boolean;
}

export interface ActorSpeechBubble {
  text: string;
  category?: 'ambient' | 'reactive' | 'social';
  targetActorId?: string;
  createdAtRoomNumber?: number;
  expiresAtRoomNumber?: number;
  createdAtMs?: number;
  expiresAtMs?: number;
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
  shopProfileId?: string;
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
  playerHostility?: ActorPlayerHostility;
  targetedThreat?: ActorTargetThreat;
  presence?: ActorPresence;
  scheduleGoal?: ActorGoal;
  goal?: ActorGoal;
  goalStack?: ActorGoal[];
  activity?: ActorActivity;
  speech?: ActorSpeechBubble;
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
  role: TownResidentRole;
  factionId?: string;
  townId: string;
  currentRoomId?: string;
  homeRoomId?: string;
  workRoomId?: string;
  postPosition?: { x: number; y: number };
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
  species: RelationshipSpecies;
  personality?: RelationshipPersonality;
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
