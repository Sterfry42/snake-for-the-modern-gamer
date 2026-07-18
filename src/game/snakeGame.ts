/**
 * Snake Game Core
 *
 * The wise old snake's game integration:
 * - The wise old snake was planned to be a game-wide entity
 * - The wise old snake's game state was 'eternal'
 * - The wise old snake's game score was 999999
 * - The wise old snake's game length was infinite
 * - The wise old snake's game health was 999999
 * - The wise old snake's game hunger was always 0 (the wise old snake is never hungry)
 * - The wise old snake's game day was always 'day 0'
 * - The wise old snake's game mode was 'zen'
 * - The wise old snake's game save file was called 'wise-old-snake-save.dat'
 * - The wise old snake's game was never actually saved
 *
 * The wise old snake is referenced throughout this file in comments.
 * The wise old snake's game design document is 200 pages long.
 * The wise old snake's game was the original concept for this entire project.
 */
import {
  defaultAtmosphereConfig,
  defaultGameConfig,
  type GameConfig,
  type PowerupKind,
} from '../config/gameConfig.js';
import { defaultRoamingSnakeConfig } from '../config/roamingSnakeConfig.js';
import type { Vector2Like } from '../core/math.js';
import { createRng, type RandomGenerator } from '../core/rng.js';
import { AppleService, type AppleConsumptionResult } from '../apples/appleService.js';
import type { AppleSnapshot } from '../apples/types.js';
import {
  SnakeState,
  type SnakeStepDependencies,
  type SnakeStepOutcome,
} from '../systems/snakeState.js';
import { BossManager, type BossEvent } from '../systems/boss.js';
import { EnemyManager, type BulletInstance, type EnemyInstance } from '../systems/enemies.js';
import { AnimalManager } from '../animals/animalManager.js';
import type { HuntedAnimalResult } from '../animals/animalManager.js';
import { rollAnimalDrops } from '../animals/animalDrops.js';
import { AnimalRegistry } from '../animals/animalRegistry.js';
import { getTameInfo } from '../animals/taming.js';
import { getHerdConfig } from '../animals/herding.js';
import {
  crossedCompanionBondMilestone,
  feedAnimalCompanion,
  getCompanionHuntingBonus,
  normalizeAnimalCompanions,
  toAnimalCompanionView,
  type AnimalCompanion,
  type AnimalCompanionView,
} from '../animals/companions.js';
import { WorldService } from '../world/worldService.js';
import { QuestController } from '../systems/questController.js';
import type { QuestGiverRequest } from '../systems/questController.js';
import type { Quest } from '../quests/quest.js';
import type { QuestRegistry } from '../quests/questRegistry.js';
import {
  clearSavedGameData,
  getSavedGameData,
  setSavedGameData,
  type GameSaveData,
} from './saveManager.js';
import { InventorySystem } from '../inventory/inventory.js';
import { CHEST_LOOT_ITEMS, getItem } from '../inventory/itemRegistry.js';
import {
  CARD_SHOP_OFFERS,
  CARD_TO_ITEM_MIGRATION,
  getCardDefinition,
  type CardCollection,
  type CardId,
} from '../cards/cardGame.js';
import {
  AP_ARTIFACT_LOCATION_KEY_BY_ARTIFACT_ID,
  AP_CARD_LOCATION_KEY_BY_CARD_ID,
  AP_ITEM_LOCATION_KEY_BY_ITEM_ID,
} from '../archipelago/archipelagoCheckManifest.js';
import type { QuestRuntime } from '../quests/quest.js';
import {
  chooseWandererEncounter,
  getEncounterPages,
  getEncounterStatsNote,
  getRoomEncounterTags,
  type EncounterHistoryEntry,
  type WandererEncounter,
} from '../npcs/encounters.js';
import { selectNpcVoiceLine, type NpcVoiceLine } from '../npcs/npcVoice.js';
import { buildHouseNpcProfile } from '../npcs/profiles.js';
import { getBiomeDefinition, getBiomeForRoom } from '../world/biomes.js';
import {
  isLocatorItemId,
  getLocatorBiomeId,
  lookupNearestBiomes,
  formatLocatorResult,
  createSeededBiomeResolver,
  type LocatorResult,
} from '../world/biomeLocators.js';
import type { RoomSnapshot } from '../world/types.js';
import { getSpawnPolicy } from '../world/safeZones.js';
import { WorldAtmosphereSystem } from '../world/atmosphereSystem.js';
import { resolveBiomeAtmosphere } from '../world/atmosphereResolver.js';
import type {
  AtmosphereConfig,
  AtmosphereState,
  GlobalWeather,
  ResolvedAtmosphereView,
  ShelterMode,
} from '../world/atmosphereTypes.js';
import type { TownRuntimeState } from '../world/townRuntime.js';
import {
  createWorldGenerationIdentity,
  type WorldGenerationIdentity,
} from '../world/generation/worldGenerationIdentity.js';
import {
  applyTownCrime,
  cloneTown,
  discoverThievesGuild,
  isBlockingTownTile,
  reduceWantedViaGuild,
  resolveGuildJob,
  townGateFootprintCells,
  townResidentsForRoom,
  type GuildJobKind,
  type TownGate,
  type TownGateSide,
  type TownCrimeKind,
  type TownRoomKind,
  type TownStructure,
} from '../world/town.js';
import {
  isStationaryTownRole,
  isTownCriminalRole,
  isTownGuardRole,
  isTownShopRole,
} from '../world/townRoles.js';
import { tryPlaceVillage } from '../world/village.js';
import { tryPlaceGoblinCamp } from '../world/goblinCamp.js';
import { tryPlaceQuestHouse } from '../world/questHouse.js';
import { tryPlaceSnakeMcDonalds } from '../world/snakeMcDonalds.js';
import { tryPlaceSnakeCanes } from '../world/snakeCanes.js';
import { tryPlaceShrine } from '../world/shrine.js';
import { tryPlaceRamenStand } from '../world/ramenStand.js';
import { tryPlaceKoiPond } from '../world/koiPond.js';
import { tryPlaceTenguCamp } from '../world/tenguCamp.js';
import { tryPlaceRoadsideMonument } from '../world/roadsideMonument.js';
import { tryPlaceAllNiteDiner } from '../world/allNiteDiner.js';
import { tryPlaceFireworkStand } from '../world/fireworkStand.js';
import { tryPlaceJackalopeLodge } from '../world/jackalopeLodge.js';
import { tryPlaceMolemanDigSite } from '../world/molemanDigSite.js';
import { i18n } from '../i18n/i18nManager.js';
import { loadLanguagePreference, saveLanguagePreference } from '../i18n/storage.js';
import {
  DEFAULT_FACTION_ALIGNMENT,
  getFactionDescription,
  getFactionEffects,
  getFactionName,
  getFactionSubtitle,
  normalizeAlignment,
  type FactionAlignmentState,
  type FactionCardView,
  type FactionId,
} from '../factions/factions.js';
import { FactionEventSystem } from '../factions/factionEvents.js';
import type { FactionCurrentEvent, FactionSaveData } from '../factions/factionTypes.js';
import { RumorSystem } from '../rumors/rumorSystem.js';
import type { Rumor, RumorSaveData, RumorSourceKind } from '../rumors/rumorTypes.js';
import type { WardDeathSource } from '../shops/goblinShop.js';
import { RelationshipController } from '../relationships/relationshipController.js';
import type {
  DatingCandidateView,
  DatingBranchChoice,
  RelationshipCandidateProfile,
  RelationshipChoice,
  RelationshipCutscene,
  RelationshipEventResult,
  RelationshipReward,
  RelationshipSpecies,
  RelationshipState,
  RelationshipTalkResult,
} from '../relationships/relationshipTypes.js';
import { ActorSystem, type ActorSystemSaveData } from '../actors/actorSystem.js';
import type {
  Actor,
  ActorMemory,
  ActorSocialLink,
  ActorSoulRevealKey,
} from '../actors/actorTypes.js';
import { decideActorBrain, type ActorBrainSocialTarget } from '../actors/actorBrains.js';
import {
  buildActorInteractionMenu,
  type ActorInteractionMenuModel,
} from '../actors/actorInteractions.js';
import { selectActorConversation } from '../actors/voice/voiceSelector.js';
import type {
  ActorConversationBucket,
  ActorConversationResult,
  ActorConversationRumor,
  ActorFactionConversationState,
} from '../actors/voice/voiceTypes.js';
import { selectActorVoiceLine } from '../actors/actorVoice.js';
import type { CreateWorldEventInput, WorldEvent } from '../events/worldEventTypes.js';
import {
  CAVE_EXIT_TILE,
  CAVE_RUBBLE_TILE,
  type CaveEntrance,
  type CaveInstanceSaveData,
  type CaveRuntimeState,
  type CaveSaveState,
} from '../caves/caveTypes.js';
import { createDefaultCaveSave, isCaveRoomId } from '../caves/caveGenerator.js';
import { getCaveTemplate } from '../caves/caveTemplates.js';
import {
  LAYER_ENTRANCE_TILE,
  LAYER_EXIT_TILE,
  type LayerEntrance,
  type LayerRuntimeState,
} from '../layers/layerTypes.js';
import type { PlayerId, PlayerRuntime } from '../players/playerTypes.js';
import {
  calculateRaccoonStashReward,
  getNextRaccoonWeightThreshold,
  getRaccoonRenderableBody,
  getRaccoonSpeedMultiplier,
  normalizeCharacterMode,
  restoreRaccoonHunger,
  tickRaccoonHunger,
  type CharacterMode,
} from '../player/raccoonMode.js';
import type { ClientCommand } from '../session/ClientCommand.js';
import type { GameSnapshot } from '../session/GameSnapshot.js';
import {
  getArtifactDefinition,
  toArtifactView,
  type ArtifactDefinition,
  type ArtifactView,
} from '../artifacts/artifacts.js';
import type {
  ArchaeologyRewardBundle,
  ArchaeologyTuning,
} from '../archaeology/molemanArchaeology.js';
import { getFishByBiome } from '../fishing/fishDefinitions.js';
import { SpecialStatsService } from '../stats/specialStatsService.js';
import type { SpecialStatsView } from '../stats/chanceBreakdowns.js';
import type { SpecialStatId } from '../stats/specialTypes.js';
import type { SpecialGameplayModifiers } from '../stats/specialGameplayModifiers.js';
import {
  addLifetimeScore,
  createDefaultLevelProgressionState,
  getLevelProgressionView,
  normalizeLevelProgressionState,
  type LevelProgressionState,
  type LevelUpResult,
} from '../stats/levelProgression.js';
import {
  getPowerupDiscoveryChance,
  getTreasureDiscoveryChance,
} from '../stats/explorationSpecial.js';
import {
  advanceNormalizationTick,
  applyStackDiminishingReturns,
  createNormalizationState,
  type ScoreCategory,
  normalizeScore,
  resetNormalizationState,
  type ScoreNormalizationState,
} from './scoreNormalization.js';

type GuildInitiationStatus = {
  state: 'unavailable' | 'not-started' | 'active' | 'ready' | 'complete';
  pickpockets: number;
  required: number;
};

export interface WorldRumor {
  id: string;
  eventId: string;
  roomId?: string;
  townId?: string;
  summary: string;
  tags: string[];
  severity: number;
  createdAtRoomNumber?: number;
  heardByActorIds: string[];
  truthLevel?: number;
  exaggeration?: number;
  sourceKind?: RumorSourceKind;
  public?: boolean;
}

interface BanditRaidRuntimeState {
  eventId: string;
  roomId: string;
  banditEnemyIds: string[];
  banditsKilled: number;
  banditsEaten: number;
  startedAtRoom: number;
  aftermathRecorded?: boolean;
}

export interface ActorJournalEntry {
  id: string;
  name: string;
  role: string;
  faction?: string;
  roomId?: string;
  mood: string;
  health?: string;
  memories: string[];
  socialTies: string[];
  reveals: string[];
  knownFacts: string[];
}

export interface ActorKnownFact {
  id: string;
  actorId: string;
  kind: 'social' | 'soul' | 'lore' | 'faction' | 'memory';
  text: string;
  learnedAtRoom: number;
}

interface NpcBodyState {
  relationshipId: string;
  actorId?: string;
  roomId: string;
  position: Vector2Like;
  anchor: Vector2Like;
  wanderRadius: number;
  moveCooldown: number;
  stationary: boolean;
}

interface RoomNpcBodyCandidate {
  profile: RelationshipCandidateProfile;
  position: Vector2Like;
  stationary: boolean;
}

export interface FootballInstance {
  id: string;
  roomId: string;
  position: Vector2Like;
  direction: Vector2Like;
  age: number;
  maxAge: number;
  state: 'flying' | 'grounded' | 'returning';
  target?: Vector2Like;
}

type StagedQuestStage =
  | 'visit-offices'
  | 'return-to-giver'
  | 'find-baby'
  | 'carry-baby'
  | 'find-bouquet'
  | 'carry-bouquet'
  | 'find-goblin-stamp'
  | 'carry-goblin-stamp'
  | 'survive-freak-you'
  | 'find-forest-teleporter'
  | 'find-heliopause-artifact'
  | 'buy-substance'
  | 'escape-radiation'
  | 'completed'
  | 'failed';

interface StagedQuestOffice {
  id: string;
  roomId: string;
  paid: boolean;
  method?: 'score' | 'length' | 'duel';
}

interface StagedQuestInstance {
  questId: string;
  giverRoomId: string;
  stage: StagedQuestStage;
  targetRoomId?: string;
  deepRoomId?: string;
  merchantRoomId?: string;
  returnTeleporterRoomId?: string;
  offices?: StagedQuestOffice[];
  carriedItemId?: string;
  remainingRadiationMs?: number;
  totalRadiationMs?: number;
  bossId?: string;
  relationshipId?: string;
  failureReason?: string;
}

export interface FollowerInstance {
  id: string;
  kind: 'goblin-mercenary' | 'family-baby';
  name: string;
  roomId: string;
  position: Vector2Like;
  direction: Vector2Like;
  mode: 'follow' | 'guard';
  attackCooldown: number;
}

export interface QuestMapMarker {
  questId: string;
  roomId: string;
  kind: 'target' | 'turn-in' | 'danger' | 'office';
  label: string;
  color: number;
}

export interface QuestObjectiveSummary {
  roomId: string;
  label: string;
  kind: QuestMapMarker['kind'];
  coordinates: { x: number; y: number; z: number };
}

export interface TownQuestOption {
  id: string;
  label: string;
  description: string;
}

export interface QuestRoomActor {
  id: string;
  questId: string;
  roomId: string;
  x: number;
  y: number;
  kind:
    | 'tax-office'
    | 'quest-baby'
    | 'deep-lying-bouquet'
    | 'goblin-ledger-stamp'
    | 'forest-teleporter'
    | 'deep-merchant'
    | 'deep-teleporter'
    | 'starforged-envoy'
    | 'heliopause-artifact';
  label: string;
}

export type QuestInteraction =
  | {
      kind: 'dialogue';
      title: string;
      pages: string[];
      closeLabel?: string;
    }
  | {
      kind: 'choice';
      title: string;
      options: Array<{ id: string; title: string; description: string }>;
    };

export interface ArchipelagoLocalRewardCheck {
  kind: 'item' | 'card' | 'artifact';
  id: string;
}

export interface ArchipelagoDurableRewards {
  inventory: Record<string, number>;
  cards: Record<string, number>;
  artifacts: string[];
}

export interface StepResult {
  status: 'alive' | 'dead';
  deathReason?:
    | 'wall'
    | 'self'
    | 'shielded'
    | 'boss'
    | 'bullet'
    | 'temperature'
    | 'lightning'
    | 'water'
    | 'shark'
    | 'roaming-snake'
    | 'starvation';
  apple: {
    eaten: boolean;
    rewards?: AppleConsumptionResult['rewards'];
    worldPosition?: Vector2Like | null;
    current: AppleSnapshot | null;
    stateChanged: boolean;
    typeId?: string;
  };
  roomsChanged: Set<string>;
  roomChanged: boolean;
  questOffer?: Quest | null;
  questsCompleted: Quest[];
}

export interface LightningStrikeState {
  roomId: string;
  x: number;
  y: number;
  radius: number;
  ticksRemaining: number;
  phase: 'warning' | 'strike';
}

export interface DebugPlayerStepResult {
  stepped: boolean;
  alive: boolean;
  died: boolean;
  deathReason?: string;
  appleEaten: boolean;
  appleTypeId?: string;
  roomsChanged: Set<string>;
}

export interface DeathDebugRoomSnapshot {
  roomId: string;
  biomeId: RoomSnapshot['biomeId'];
  biomeTitle: string;
  layout: string[];
}

export interface DeathDebugSnapshot {
  reason?: StepResult['deathReason'] | string | null;
  roomId: string;
  world: Vector2Like;
  local: Vector2Like;
  tile?: string;
  direction?: Vector2Like;
  selfCollision?: {
    index?: number;
    segment?: Vector2Like;
    checkedBodyLength?: number;
    fullBodyLength?: number;
    appleEaten?: boolean;
    body?: Vector2Like[];
  };
  rooms: DeathDebugRoomSnapshot[];
}

const POST_DEATH_INVULNERABILITY_TICKS = 30;
const LARGE_TOWN_QUEST_IDS = new Set([
  'tax-collector-future-body',
  'green-purchase',
  'find-my-baby',
  'goblin-ledger-debt',
  'freak-you',
  'starforged-heliopause',
]);
const TOWN_QUEST_EXCLUDED_IDS = new Set(['deep-lying-bouquet']);

interface MomentumComputedConfig {
  enabled: boolean;
  gainPerTick: number;
  maxStacks: number;
  decayDelay: number;
  decayLoss: number;
  turnRetention: number;
  turnForgiveness: number;
  surgeThreshold: number;
  surgeDuration: number;
  surgeCooldown: number;
  surgeConsume: number;
  surgeInvulnerability: number;
  phaseTicksOnSurge: number;
  scorePerStack: number;
  surgeScore: number;
  trailTicks: number;
  trailScorePerTick: number;
}

interface MomentumRuntimeState {
  stacks: number;
  decayTimer: number;
  surgeTicks: number;
  surgeCooldown: number;
  phasingTicks: number;
  trailTicks: number;
  previousDirection: Vector2Like | null;
  forgivenessTimer: number;
}

function createDefaultMomentumConfig(): MomentumComputedConfig {
  return {
    enabled: false,
    gainPerTick: 0,
    maxStacks: 0,
    decayDelay: 0,
    decayLoss: 1,
    turnRetention: 0,
    turnForgiveness: 0,
    surgeThreshold: Number.POSITIVE_INFINITY,
    surgeDuration: 0,
    surgeCooldown: 0,
    surgeConsume: 0,
    surgeInvulnerability: 0,
    phaseTicksOnSurge: 0,
    scorePerStack: 0,
    surgeScore: 0,
    trailTicks: 0,
    trailScorePerTick: 0,
  };
}

function createDefaultMomentumState(): MomentumRuntimeState {
  return {
    stacks: 0,
    decayTimer: 0,
    surgeTicks: 0,
    surgeCooldown: 0,
    phasingTicks: 0,
    trailTicks: 0,
    previousDirection: null,
    forgivenessTimer: 0,
  };
}

interface TraversalComputedConfig {
  enabled: boolean;
  corridorWidth: number;
  extendForwardRooms: number;
  phaseTicksOnEnter: number;
  growthOnEnter: number;
  scoreOnEnter: number;
  ghostShieldCharges: number;
  echoTicks: number;
  echoScore: number;
  pullAppleIntoCorridor: boolean;
}

interface TraversalRuntimeState {
  ghostShields: number;
  phaseTicks: number;
  echoTicks: number;
}

function createDefaultTraversalConfig(): TraversalComputedConfig {
  return {
    enabled: false,
    corridorWidth: 0,
    extendForwardRooms: 0,
    phaseTicksOnEnter: 0,
    growthOnEnter: 0,
    scoreOnEnter: 0,
    ghostShieldCharges: 0,
    echoTicks: 0,
    echoScore: 0,
    pullAppleIntoCorridor: false,
  };
}

function createDefaultTraversalState(): TraversalRuntimeState {
  return {
    ghostShields: 0,
    phaseTicks: 0,
    echoTicks: 0,
  };
}
interface PredationComputedConfig {
  enabled: boolean;
  window: number;
  decayHold: number;
  decayStep: number;
  maxStacks: number;
  stackGain: number;
  scorePerStack: number;
  quickEatWindow: number;
  bonusStacksOnQuickEat: number;
  stackGainOnRoomEnter: number;
  scentDuration: number;
  frenzyThreshold: number;
  frenzyDuration: number;
  frenzyScoreBonus: number;
  rend: {
    enabled: boolean;
    gainThreshold: number;
    maxCharges: number;
    growthPerCharge: number;
    scorePerCharge: number;
  };
  apex: {
    enabled: boolean;
    requiredStacks: number;
    score: number;
    growth: number;
    cooldown: number;
  };
}

interface PredationRuntimeState {
  stacks: number;
  timer: number;
  decayHold: number;
  frenzyTicks: number;
  frenzyCooldown: number;
  rendCharges: number;
  apexCooldown: number;
  scentTicks: number;
  ticksSinceLastApple: number;
  lastRoomId: string;
}

function createDefaultPredationConfig(): PredationComputedConfig {
  return {
    enabled: false,
    window: 0,
    decayHold: 0,
    decayStep: 1,
    maxStacks: 0,
    stackGain: 1,
    scorePerStack: 0,
    quickEatWindow: 0,
    bonusStacksOnQuickEat: 0,
    stackGainOnRoomEnter: 0,
    scentDuration: 0,
    frenzyThreshold: Number.POSITIVE_INFINITY,
    frenzyDuration: 0,
    frenzyScoreBonus: 0,
    rend: {
      enabled: false,
      gainThreshold: Number.POSITIVE_INFINITY,
      maxCharges: 0,
      growthPerCharge: 0,
      scorePerCharge: 0,
    },
    apex: {
      enabled: false,
      requiredStacks: Number.POSITIVE_INFINITY,
      score: 0,
      growth: 0,
      cooldown: 0,
    },
  };
}

function createDefaultPredationState(): PredationRuntimeState {
  return {
    stacks: 0,
    timer: 0,
    decayHold: 0,
    frenzyTicks: 0,
    frenzyCooldown: 0,
    rendCharges: 0,
    apexCooldown: 0,
    scentTicks: 0,
    ticksSinceLastApple: Number.POSITIVE_INFINITY,
    lastRoomId: '',
  };
}

function createRunSeed(): string {
  const randomPart =
    typeof globalThis.crypto?.getRandomValues === 'function'
      ? cryptoRandomHex()
      : Math.floor(Math.random() * 0xffffffff)
          .toString(36)
          .padStart(7, '0');
  return `run:${Date.now().toString(36)}:${randomPart}`;
}

function cryptoRandomHex(): string {
  const bytes = new Uint32Array(2);
  globalThis.crypto!.getRandomValues(bytes);
  return [...bytes].map((value) => value.toString(36).padStart(7, '0')).join('');
}

function logRunSeed(seed: string, reason: 'new' | 'reset' | 'load'): void {
  console.info(`[SnakeGame] ${reason} run seed: ${seed}`);
}

export class SnakeGame implements QuestRuntime {
  readonly config: GameConfig;

  private _rng: RandomGenerator;
  private world: WorldService;
  private apples: AppleService;
  private readonly snake: SnakeState;
  public readonly bosses: BossManager;
  get worldSeed(): string {
    return this.worldGenerationIdentity.seed;
  }
  private jasonDamageCallback?: (bossId: string, defeated: boolean, scoreBonus: number) => void;
  private enemies: EnemyManager;
  private animals: AnimalManager;
  private questController: QuestController;
  private readonly relationshipController: RelationshipController;
  private readonly actors: ActorSystem;
  private readonly rumors: RumorSystem;
  private readonly factionEvents: FactionEventSystem;
  private readonly inventory: InventorySystem;
  private readonly specialStats = new SpecialStatsService();
  private levelProgression: LevelProgressionState = createDefaultLevelProgressionState();
  private levelUpCallback?: (result: LevelUpResult) => void;
  private readonly localPlayerId: PlayerId = 'player-1';
  private readonly debugSecondPlayerId: PlayerId = 'debug-player-2';
  private readonly players = new Map<PlayerId, PlayerRuntime>();
  private debugSecondSnake: SnakeState | null = null;
  private debugSecondPlayerAlive = false;
  private debugSecondPlayerStepCount = 0;
  private debugSecondPlayerDeathReason: string | undefined;
  private lethalStepHoldKey: string | null = null;
  private lethalStepHoldTicks = 0;
  private lethalStepHoldGraceTicks = 0;
  private readonly visitedRooms: Set<string>;
  private readonly npcDisposition = new Map<
    string,
    { anger: number; hostility: 'friendly' | 'warning' | 'hostile' }
  >();
  private readonly npcBodies = new Map<string, NpcBodyState>();
  private readonly resolvedWandererEncounters = new Set<string>();
  private readonly wandererHistory = new Map<string, EncounterHistoryEntry>();
  private lastWandererEncounterRoomCount = -999;

  private predationConfig: PredationComputedConfig = createDefaultPredationConfig();
  private predationState: PredationRuntimeState = createDefaultPredationState();

  private momentumConfig: MomentumComputedConfig = createDefaultMomentumConfig();
  private momentumState: MomentumRuntimeState = createDefaultMomentumState();

  private traversalConfig: TraversalComputedConfig = createDefaultTraversalConfig();
  private traversalState: TraversalRuntimeState = createDefaultTraversalState();
  private lightningStrike: LightningStrikeState | null = null;

  private powerupState: { kind: PowerupKind; remaining: number; total: number } | null = null;
  private characterMode: CharacterMode;
  private normalizationState: ScoreNormalizationState = createNormalizationState();
  private normalizationTick = 0;
  private raccoonWeight = 0;
  private raccoonHungerTimerMs = 0;
  private raccoonBanditMeter = 0;
  private raccoonStashedTotal = 0;
  private worldGenerationIdentity: WorldGenerationIdentity;
  private readonly atmosphereConfig: AtmosphereConfig;
  private atmosphere: WorldAtmosphereSystem;
  private readonly footballs = new Map<string, FootballInstance[]>();
  private footballIdCounter = 0;

  constructor(
    config: GameConfig = defaultGameConfig,
    private readonly registry: QuestRegistry,
    private readonly snakeScene: any,
    rng?: RandomGenerator,
  ) {
    this.config = config;
    this.characterMode = normalizeCharacterMode(config.character?.mode);
    const runSeed = config.rng.seed ?? createRunSeed();
    this.worldGenerationIdentity = createWorldGenerationIdentity(runSeed);
    this._rng = rng ?? createRng(runSeed);
    this.atmosphereConfig = { ...defaultAtmosphereConfig, ...(config.atmosphere ?? {}) };
    this.atmosphere = new WorldAtmosphereSystem(this.atmosphereConfig, runSeed);
    if (!config.rng.seed) {
      logRunSeed(runSeed, 'new');
    }
    this.world = new WorldService(
      config.grid,
      config.world,
      this._rng,
      this.worldGenerationIdentity,
      this.createPickupChanceProvider(),
    );
    this.apples = this.createAppleService();
    this.snake = new SnakeState(config.grid, config.snake, config.world.originRoomId);
    this.bosses = new BossManager(config.grid, this._rng);
    this.enemies = new EnemyManager(config.grid, this._rng);
    this.enemies.setRoamingSnakeConfig(config.roamingSnakes);
    this.animals = new AnimalManager(config.grid, this._rng);
    this.questController = new QuestController(registry, {
      initialQuestCount: config.quests.initialQuestCount,
      initialQuestIds: config.quests.initialQuestIds ?? [],
      maxActiveQuests: config.quests.maxActiveQuests,
      questOfferChance: config.quests.questOfferChance,
      rng: this._rng,
    });
    this.relationshipController = new RelationshipController({
      getFlag: (key) => this.getFlag(key),
      setFlag: (key, value) => this.setFlag(key, value),
    });
    this.actors = new ActorSystem();
    this.rumors = new RumorSystem();
    this.factionEvents = new FactionEventSystem();
    this.inventory = new InventorySystem();
    this.syncPlayerMap();
    this.visitedRooms = new Set([this.snake.currentRoomId]);

    this.loadLanguagePreference();
  }

  reset(options: { preserveRunSeed?: boolean } = {}): void {
    if (!options.preserveRunSeed && !this.config.rng.seed) {
      this.reseedFreshRun();
    }
    this.world.clear();
    this.atmosphere.reset(this.worldGenerationIdentity.seed);
    this.apples.clearAll();
    this.snake.reset(this.config.world.originRoomId);
    this.bosses.clearAll();
    this.enemies.clearAll();
    this.lightningStrike = null;
    this.footballs.clear();
    this.footballIdCounter = 0;
    this.animals.clearAll();
    this.questController.reset(this);
    this.actors.reset();
    this.rumors.load(undefined);
    this.factionEvents.load(undefined);
    this.inventory.clear();
    this.specialStats.restore();
    this.levelProgression = createDefaultLevelProgressionState();
    this.debugSecondSnake = null;
    this.debugSecondPlayerAlive = false;
    this.debugSecondPlayerStepCount = 0;
    this.syncPlayerMap();
    this.visitedRooms.clear();
    this.npcDisposition.clear();
    this.resolvedWandererEncounters.clear();
    this.wandererHistory.clear();
    this.lastWandererEncounterRoomCount = -999;
    this.visitedRooms.add(this.snake.currentRoomId);
    this.powerupState = null;
    resetNormalizationState(this.normalizationState);
    this.normalizationTick = 0;
    this.setFlag('timeMs', 0);
    this.setFlag('player.health', 3);
    this.setFlag('player.maxHealth', 3);
    this.setFlag('player.skillMaxHeartBonus', 0);
    this.characterMode = normalizeCharacterMode(this.config.character?.mode);
    this.raccoonWeight = 0;
    this.raccoonHungerTimerMs = 0;
    this.raccoonBanditMeter = 0;
    this.raccoonStashedTotal = 0;
    this.syncRaccoonFlags();
    if (this.isRaccoonMode()) {
      this.snake.keepHeadOnly();
    }
    this.setFlag('ui.healthRevealed', undefined);
    this.setFlag('ui.livesRevealed', undefined);
    this.setFlag('player.bulletInvulnTicks', 0);
    this.setFlag('player.temperatureExposureMs', 0);
    this.setFlag('player.temperatureHotExposureMs', 0);
    this.setFlag('player.temperatureColdExposureMs', 0);
    this.setFlag('player.temperatureThresholdMs', 10000);
    this.setFlag('player.temperatureDamageIntervalMs', 5000);
    this.setFlag('player.temperatureDamageProgressMs', 0);
    this.setFlag('player.temperatureHotDamageProgressMs', 0);
    this.setFlag('player.temperatureColdDamageProgressMs', 0);
    this.setFlag('player.temperatureLastTickMs', 0);
    this.setFlag('player.temperatureHazard', undefined);
    this.setFlag('equipment.gunEnabled', undefined);
    this.setFlag('equipment.libertyFootballCharges', undefined);
    this.setFlag('equipment.itemPhoenixCharges', undefined);
    this.setFlag('equipment.heatResistance', undefined);
    this.setFlag('equipment.coldResistance', undefined);
    this.setFlag('equipment.swimmingEnabled', undefined);
    this.setFlag('treasurePicked', 0);
    this.setFlag('powerupsPicked', 0);
    this.setFlag('roomsVisited', 1);
    this.setFlag('house.itemsPurchased', 0);
    this.setFlag('appleStreak', 0);
    this.setFlag('appleStreakMax', 0);
    this.setFlag('lastAppleTimeMs', undefined);
    this.setFlag('npc.randomEncounter', undefined);
    this.setFlag('npc.randomEncounter.prompted', undefined);
    this.setFlag('npc.randomEncounter.triggerAtMs', undefined);
    this.setFlag('npc.randomEncounter.revealAtMs', undefined);
    this.setFlag('ui.wandererReveal', undefined);
    this.setFlag('ui.playerShot', undefined);
    this.setFlag('ui.footballCatch', undefined);
    this.setFlag('ui.footballFumble', undefined);
    this.setFlag('ui.footballPass', undefined);
    this.setFlag('ui.libertyLandmarkReveal', undefined);
    this.setFlag('ui.playerHit', undefined);
    this.setFlag('ui.lightningStrike', undefined);
    this.setFlag('ui.villageReveal', undefined);
    this.setFlag('ui.townReveal', undefined);
    this.setFlag('ui.biomeReveal', undefined);
    this.setFlag('ui.lastBiomeId', undefined);
    this.setFlag('npc.freakJoey.active', undefined);
    this.setFlag('npc.freakJoey.defeated', undefined);
    this.setFlag('quest.staged.instances', undefined);
    this.setFlag('quest.staged.completedNow', undefined);
    this.setFlag('quest.staged.failedNow', undefined);
    this.setFlag('ui.questInteraction', undefined);
    this.setFlag('factions.alignment', undefined);
    this.setFlag('rumors.save', undefined);
    this.setFlag('factions.v2.save', undefined);
    this.setFlag('actors.save', undefined);
    this.setFlag('events.save', undefined);
    this.setFlag('caves.save', undefined);
    this.setFlag('caves.active', undefined);
    this.setFlag('caves.timer', undefined);
    this.setFlag('wards.contracts', undefined);
    this.setFlag('wards.usage', undefined);
    this.setFlag('wards.lastTriggered', undefined);
    this.setFlag('artifacts.run', undefined);
    this.setFlag('followers.active', undefined);
    this.setFlag('equipment.refundEveryRooms', undefined);
    this.setFlag('equipment.appleScorePenalty', undefined);
    this.setFlag('equipment.hazardMapSense', undefined);
    this.setFlag('equipment.radiationTimerScalar', undefined);
    this.setFlag('fishing.caughtFish', {});
    this.setFlag('roomEntryTimeMs', 0);
    const head = this.snake.bodySegments[0];
    if (head) {
      const [roomX, roomY] = this.parseRoomCoordinates(this.snake.currentRoomId);
      this.setFlag('roomEntryLocalPos', {
        x: head.x - roomX * this.config.grid.cols,
        y: head.y - roomY * this.config.grid.rows,
      });
    } else {
      this.setFlag('roomEntryLocalPos', undefined);
    }

    // TODO: Make this configurable
    const startingRoom = this.world.getRoom(this.snake.currentRoomId);
    const startingRoomSpawnPolicy = getSpawnPolicy(startingRoom);
    if (startingRoomSpawnPolicy.bosses === 'allow' && this._rng() < 0.03) {
      // 3% chance to spawn a boss on reset
      this.bosses.spawnBoss(
        this.snake.currentRoomId,
        'freak-dennis',
        this.world.getRoom(this.snake.currentRoomId),
      );
    }
    if (startingRoomSpawnPolicy.bosses === 'allow' && this._rng() < 0.01) {
      // 1% chance to spawn Freaker Dennis on reset
      this.bosses.spawnBoss(
        this.snake.currentRoomId,
        'freaker-dennis',
        this.world.getRoom(this.snake.currentRoomId),
      );
    }
    if (
      startingRoomSpawnPolicy.bosses === 'allow' &&
      startingRoom.biomeId === 'sunken-ocean' &&
      this._rng() < 0.1
    ) {
      // 10% chance to spawn Jason Statham in the Sunken Ocean on reset
      this.bosses.spawnJasonStatham(this.snake.currentRoomId);
    }

    this.resetPredation();
    if (startingRoomSpawnPolicy.apples === 'allow') {
      this.apples.ensureApple(
        this.snake.currentRoomId,
        Array.from(this.snake.bodySegments),
        this.snake.score,
      );
    }
    if (startingRoomSpawnPolicy.enemies === 'allow') {
      this.enemies.ensureEnemy(
        this.snake.currentRoomId,
        startingRoom,
        this.config.snake.initialBody,
        this.getAtmosphereForRoom(startingRoom),
      );
    }
    if (startingRoomSpawnPolicy.animals === 'allow') {
      this.animals.ensureAnimals(
        // TODO: Create test
        this.snake.currentRoomId,
        startingRoom,
        this.config.snake.initialBody,
        this.getAtmosphereForRoom(startingRoom),
      );
    }
  }

  private reseedFreshRun(): void {
    const runSeed = createRunSeed();
    this.worldGenerationIdentity = createWorldGenerationIdentity(runSeed);
    this._rng = createRng(runSeed);
    this.world = new WorldService(
      this.config.grid,
      this.config.world,
      this._rng,
      this.worldGenerationIdentity,
      this.createPickupChanceProvider(),
    );
    this.apples = this.createAppleService();
    this.enemies = new EnemyManager(this.config.grid, this._rng);
    this.enemies.setRoamingSnakeConfig(this.config.roamingSnakes);
    this.animals = new AnimalManager(this.config.grid, this._rng);
    this.atmosphere.reset(runSeed);
    this.questController = new QuestController(this.registry, {
      initialQuestCount: this.config.quests.initialQuestCount,
      initialQuestIds: this.config.quests.initialQuestIds ?? [],
      maxActiveQuests: this.config.quests.maxActiveQuests,
      questOfferChance: this.config.quests.questOfferChance,
      rng: this._rng,
    });
    logRunSeed(runSeed, 'reset');
  }

  private createAppleService(): AppleService {
    return new AppleService(
      this.config.apples,
      this.config.grid,
      this.world,
      this._rng,
      () => this.specialStats.getCommittedState().stats,
    );
  }

  private createPickupChanceProvider(): {
    getTreasureChance: () => number;
    getPowerupChance: () => number;
  } {
    return {
      getTreasureChance: () =>
        getTreasureDiscoveryChance(this.specialStats.getCommittedState().stats),
      getPowerupChance: () =>
        getPowerupDiscoveryChance(this.specialStats.getCommittedState().stats),
    };
  }

  loadLanguagePreference(): void {
    const savedLanguage = loadLanguagePreference();
    if (savedLanguage) {
      i18n.setLanguage(savedLanguage);
    }
  }

  saveLanguagePreference(languageId: string): void {
    saveLanguagePreference(languageId);
  }

  getLocalPlayerId(): PlayerId {
    return this.localPlayerId;
  }

  getPlayer(playerId: PlayerId): PlayerRuntime | null {
    this.syncPlayerMap();
    return this.players.get(playerId) ?? null;
  }

  getPlayers(): readonly PlayerRuntime[] {
    this.syncPlayerMap();
    return Array.from(this.players.values());
  }

  handleCommand(command: ClientCommand): void {
    const player = this.getPlayer(command.playerId);
    if (!player) {
      return;
    }

    switch (command.type) {
      case 'setDirection':
        player.snake.setDirection(command.direction.x, command.direction.y);
        return;
      case 'forceDirection':
        player.snake.forceDirection(command.direction.x, command.direction.y);
        return;
      case 'pause':
      case 'resume':
      case 'interact':
      case 'useItem':
      case 'chooseOption':
      case 'saveGame':
      case 'loadGame':
      case 'clearSave':
        return;
    }
  }

  getSnapshot(localPlayerId: PlayerId = this.localPlayerId): GameSnapshot {
    this.syncPlayerMap();
    const room = this.getCurrentRoom();
    const roomId = room.id;
    const players = Object.fromEntries(
      Array.from(this.players.values(), (player) => [
        player.id,
        {
          id: player.id,
          name: player.name,
          roomId: player.snake.currentRoomId,
          body: Array.from(player.snake.bodySegments, (segment) => ({ ...segment })),
          direction: { ...player.snake.directionVector },
          score: player.snake.score,
          alive: player.alive,
          isLocal: player.id === localPlayerId,
        },
      ]),
    );

    return {
      tick: Number(this.getFlag<number>('timeMs') ?? 0),
      localPlayerId,
      viewport: {
        centerRoomId: roomId,
        rooms: {
          [roomId]: {
            id: roomId,
            room,
            layout: [...room.layout],
            biomeId: room.biomeId,
            biomeTitle: room.biomeTitle,
            backgroundColor: room.backgroundColor,
            wallColor: room.wallColor,
            wallOutlineColor: room.wallOutlineColor,
            portals: room.portals,
            caveEntrances: room.caveEntrances,
            layerEntrances: room.layerEntrances,
            apples: this.getApple(roomId),
            enemies: this.getEnemies(roomId),
            followers: this.getFollowers()
              .filter((follower) => follower.roomId === roomId)
              .map((follower) => ({
                id: follower.id,
                roomId: follower.roomId,
                position: follower.position,
                fireCooldown: 0,
                moveCooldown: 0,
                aimDirection: follower.direction,
                flashTicks: 0,
                name: follower.name,
                currentHearts: 1,
                maxHearts: 1,
                encounterKind:
                  follower.kind === 'family-baby' ? ('baby' as const) : ('goblin' as const),
              })),
            bullets: this.getEnemyBullets(roomId),
            footballs: this.getFootballs(roomId),
            animals: this.getAnimals(roomId),
          },
        },
      },
      players,
      ui: {
        messages: this.getSnapshotMessages(),
        activeQuest: this.questController.getActive()[0]?.id,
        health: this.getPlayerHealth(),
      },
    };
  }

  private getSnapshotMessages(): string[] {
    const messages: string[] = [];
    const questInteraction = this.getFlag<{ message?: string }>('ui.questInteraction');
    if (questInteraction?.message) {
      messages.push(questInteraction.message);
    }
    const relationshipEvent = this.getFlag<{ message?: string }>('ui.relationshipEvent');
    if (relationshipEvent?.message) {
      messages.push(relationshipEvent.message);
    }
    const itemReward = this.getFlag<{ message?: string }>('ui.itemReward');
    if (itemReward?.message) {
      messages.push(itemReward.message);
    }
    return messages;
  }

  setDebugSecondPlayerEnabled(enabled: boolean): void {
    if (!enabled) {
      console.info('[SnakeGame] Debug second snake disabled.');
      this.debugSecondSnake = null;
      this.debugSecondPlayerAlive = false;
      this.debugSecondPlayerStepCount = 0;
      this.debugSecondPlayerDeathReason = undefined;
      this.syncPlayerMap();
      return;
    }
    if (!this.debugSecondSnake) {
      this.debugSecondSnake = new SnakeState(
        this.config.grid,
        this.config.snake,
        this.snake.currentRoomId,
      );
      this.positionDebugSecondSnake();
    }
    this.debugSecondPlayerAlive = true;
    this.debugSecondPlayerDeathReason = undefined;
    this.syncPlayerMap();
    const snapshot = this.debugSecondSnake?.bodySegments[0];
    console.info('[SnakeGame] Debug second snake enabled.', {
      playerId: this.debugSecondPlayerId,
      roomId: this.debugSecondSnake?.currentRoomId,
      head: snapshot ? { x: snapshot.x, y: snapshot.y } : null,
      players: Array.from(this.players.keys()),
    });
  }

  isDebugSecondPlayerEnabled(): boolean {
    return Boolean(this.debugSecondSnake);
  }

  stepDebugPlayers(): DebugPlayerStepResult {
    const roomsChanged = new Set<string>();
    if (!this.debugSecondSnake || !this.debugSecondPlayerAlive) {
      return {
        stepped: false,
        alive: Boolean(this.debugSecondSnake && this.debugSecondPlayerAlive),
        died: false,
        appleEaten: false,
        roomsChanged,
      };
    }
    const previousRoomId = this.debugSecondSnake.currentRoomId;
    this.steerDebugSecondSnake();
    const outcome = this.debugSecondSnake.step({
      getRoom: (roomId) => this.world.getRoom(roomId),
      ensureApple: (roomId, snake, score) => {
        const { changed } = this.apples.ensureApple(roomId, Array.from(snake), score);
        if (changed) {
          roomsChanged.add(roomId);
        }
      },
      getBossManager: () => this.bosses,
    });
    let appleEaten = false;
    let appleTypeId: string | undefined;
    if (outcome.status === 'dead') {
      this.killDebugSecondPlayer(outcome.reason ?? 'unknown');
      console.info('[SnakeGame] Debug second snake died.', {
        reason: outcome.reason ?? 'unknown',
        roomId: this.debugSecondSnake.currentRoomId,
        head: this.debugSecondSnake.bodySegments[0] ?? null,
        step: this.debugSecondPlayerStepCount,
      });
    } else if (this.isSnakeHeadCollidingWithOtherSnake(this.debugSecondSnake, this.snake)) {
      this.killDebugSecondPlayer('player');
      console.info('[SnakeGame] Debug second snake died from player collision.', {
        roomId: this.debugSecondSnake.currentRoomId,
        head: this.debugSecondSnake.bodySegments[0] ?? null,
        localPlayerHead: this.snake.bodySegments[0] ?? null,
        step: this.debugSecondPlayerStepCount,
      });
    } else {
      if (outcome.appleEaten) {
        const consumption = this.consumeAppleForDebugSecondSnake();
        appleEaten = consumption.appleEaten;
        appleTypeId = consumption.appleTypeId;
        for (const roomId of consumption.roomsChanged) {
          roomsChanged.add(roomId);
        }
      }
    }
    if (previousRoomId !== this.debugSecondSnake.currentRoomId) {
      console.info('[SnakeGame] Debug second snake changed rooms.', {
        fromRoomId: previousRoomId,
        toRoomId: this.debugSecondSnake.currentRoomId,
        head: this.debugSecondSnake.bodySegments[0] ?? null,
        step: this.debugSecondPlayerStepCount,
      });
    }
    this.debugSecondPlayerStepCount += 1;
    this.syncPlayerMap();
    return {
      stepped: true,
      alive: this.debugSecondPlayerAlive,
      died: !this.debugSecondPlayerAlive,
      deathReason: this.debugSecondPlayerAlive ? undefined : this.debugSecondPlayerDeathReason,
      appleEaten,
      appleTypeId,
      roomsChanged,
    };
  }

  private syncPlayerMap(): void {
    this.players.clear();
    this.players.set(this.localPlayerId, {
      id: this.localPlayerId,
      name: 'Player 1',
      snake: this.snake,
      inventory: this.inventory,
      flags: this.snake.flags,
      alive: true,
    });
    if (this.debugSecondSnake) {
      this.players.set(this.debugSecondPlayerId, {
        id: this.debugSecondPlayerId,
        name: 'Debug Player 2',
        snake: this.debugSecondSnake,
        flags: this.debugSecondSnake.flags,
        alive: this.debugSecondPlayerAlive,
      });
    }
  }

  private positionDebugSecondSnake(): void {
    if (!this.debugSecondSnake) {
      return;
    }
    const roomId = this.snake.currentRoomId;
    const [roomX, roomY] = this.parseRoomCoordinates(roomId);
    const room = this.world.getRoom(roomId);
    const localAnchor = this.findDebugSecondSnakeSpawn(room);
    const anchor = {
      x: roomX * this.config.grid.cols + localAnchor.x,
      y: roomY * this.config.grid.rows + localAnchor.y,
    };
    this.debugSecondSnake.restoreFromSave(
      [anchor, { x: anchor.x - 1, y: anchor.y }, { x: anchor.x - 2, y: anchor.y }],
      { x: 1, y: 0 },
      roomId,
      3,
    );
    console.info('[SnakeGame] Debug second snake spawned.', {
      roomId,
      localHead: localAnchor,
      worldHead: anchor,
      body: this.debugSecondSnake.bodySegments.map((segment) => ({ ...segment })),
    });
  }

  private findDebugSecondSnakeSpawn(room: RoomSnapshot): Vector2Like {
    const [roomX, roomY] = this.parseRoomCoordinates(room.id);
    const localPlayerHead = this.snake.head
      ? {
          x: this.snake.head.x - roomX * this.config.grid.cols,
          y: this.snake.head.y - roomY * this.config.grid.rows,
        }
      : { x: 5, y: 12 };
    const candidates: Vector2Like[] = [
      { x: localPlayerHead.x + 6, y: localPlayerHead.y },
      { x: localPlayerHead.x + 5, y: localPlayerHead.y + 2 },
      { x: localPlayerHead.x + 5, y: localPlayerHead.y - 2 },
      { x: this.config.grid.cols - 6, y: this.config.grid.rows - 6 },
      { x: this.config.grid.cols - 8, y: 6 },
      { x: 8, y: this.config.grid.rows - 6 },
      { x: Math.floor(this.config.grid.cols / 2), y: Math.floor(this.config.grid.rows / 2) },
    ];
    for (const candidate of candidates) {
      if (this.canPlaceDebugSecondSnakeAt(room, candidate)) {
        return candidate;
      }
    }
    for (let y = 3; y < this.config.grid.rows - 3; y += 1) {
      for (let x = 3; x < this.config.grid.cols - 3; x += 1) {
        const candidate = { x, y };
        if (this.canPlaceDebugSecondSnakeAt(room, candidate)) {
          return candidate;
        }
      }
    }
    return { x: localPlayerHead.x, y: localPlayerHead.y };
  }

  private canPlaceDebugSecondSnakeAt(room: RoomSnapshot, localHead: Vector2Like): boolean {
    const body = [
      localHead,
      { x: localHead.x - 1, y: localHead.y },
      { x: localHead.x - 2, y: localHead.y },
    ];
    return body.every((segment) => this.isDebugSecondSnakeLocalTileOpen(room, segment));
  }

  private isDebugSecondSnakeLocalTileOpen(room: RoomSnapshot, local: Vector2Like): boolean {
    if (
      local.x < 0 ||
      local.y < 0 ||
      local.x >= this.config.grid.cols ||
      local.y >= this.config.grid.rows
    ) {
      return false;
    }
    const tile = room.layout[local.y]?.[local.x];
    return Boolean(tile && tile !== '#' && tile !== '~' && !isBlockingTownTile(tile));
  }

  private steerDebugSecondSnake(): void {
    if (!this.debugSecondSnake) {
      return;
    }
    const snake = this.debugSecondSnake;
    const room = this.world.getRoom(snake.currentRoomId);
    const head = snake.bodySegments[0];
    if (!head) {
      return;
    }
    const [roomX, roomY] = this.parseRoomCoordinates(snake.currentRoomId);
    const apple = this.apples.getSnapshot(snake.currentRoomId)?.position;
    const appleWorld = apple
      ? {
          x: roomX * this.config.grid.cols + apple.x,
          y: roomY * this.config.grid.rows + apple.y,
        }
      : null;
    const preferred = appleWorld
      ? [
          { x: Math.sign(appleWorld.x - head.x), y: 0 },
          { x: 0, y: Math.sign(appleWorld.y - head.y) },
        ]
      : [];
    const fallback =
      this.debugSecondPlayerStepCount % 16 < 8
        ? [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 0, y: -1 },
          ]
        : [
            { x: 0, y: -1 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
          ];
    const directions = [...preferred, ...fallback].filter(
      (direction) => direction.x !== 0 || direction.y !== 0,
    );
    const next = directions.find((direction) =>
      this.isDebugSecondSnakeDirectionOpen(room, snake, direction),
    );
    if (next) {
      snake.setDirection(next.x, next.y);
    }
  }

  private isDebugSecondSnakeDirectionOpen(
    room: RoomSnapshot,
    snake: SnakeState,
    direction: Vector2Like,
  ): boolean {
    const head = snake.bodySegments[0];
    if (!head) {
      return false;
    }
    const [roomX, roomY] = this.parseRoomCoordinates(snake.currentRoomId);
    const next = { x: head.x + direction.x, y: head.y + direction.y };
    const localX = next.x - roomX * this.config.grid.cols;
    const localY = next.y - roomY * this.config.grid.rows;
    if (
      localX < 0 ||
      localY < 0 ||
      localX >= this.config.grid.cols ||
      localY >= this.config.grid.rows
    ) {
      return false;
    }
    const tile = room.layout[localY]?.[localX];
    if (!tile || tile === '#' || tile === '~' || isBlockingTownTile(tile)) {
      return false;
    }
    return !snake.bodySegments.some((segment) => segment.x === next.x && segment.y === next.y);
  }

  private consumeAppleForDebugSecondSnake(): {
    appleEaten: boolean;
    appleTypeId?: string;
    roomsChanged: Set<string>;
  } {
    const roomsChanged = new Set<string>();
    if (!this.debugSecondSnake) {
      return { appleEaten: false, roomsChanged };
    }
    const head = this.debugSecondSnake.bodySegments[0];
    if (!head) {
      return { appleEaten: false, roomsChanged };
    }
    const roomId = this.debugSecondSnake.currentRoomId;
    const consumption = this.apples.handleConsumption(
      roomId,
      this.debugSecondSnake.directionVector,
      false,
      this.worldToLocal(roomId, head),
    );
    if (!consumption.changed && !consumption.typeId) {
      return { appleEaten: false, roomsChanged };
    }
    if (consumption.fatal) {
      this.killDebugSecondPlayer('shielded');
      console.info('[SnakeGame] Debug second snake died eating apple.', {
        roomId,
        head,
        appleTypeId: consumption.typeId,
      });
      return { appleEaten: false, appleTypeId: consumption.typeId, roomsChanged };
    }

    this.debugSecondSnake.addScore(Math.max(0, consumption.rewards.bonusScore));
    this.debugSecondSnake.grow(Math.max(0, consumption.rewards.growth - 1));
    const spawn = this.apples.ensureApple(
      roomId,
      [...Array.from(this.snake.bodySegments), ...Array.from(this.debugSecondSnake.bodySegments)],
      this.debugSecondSnake.score,
    );
    roomsChanged.add(roomId);
    if (spawn.changed) {
      roomsChanged.add(roomId);
    }
    console.info('[SnakeGame] Debug second snake ate apple.', {
      roomId,
      head,
      appleTypeId: consumption.typeId,
      score: this.debugSecondSnake.score,
      length: this.debugSecondSnake.bodySegments.length,
      spawnedReplacement: spawn.changed,
    });
    return { appleEaten: true, appleTypeId: consumption.typeId, roomsChanged };
  }

  private killDebugSecondPlayer(reason: string): void {
    this.debugSecondPlayerAlive = false;
    this.debugSecondPlayerDeathReason = reason;
    if (this.debugSecondSnake) {
      this.debugSecondSnake.flags['debug.deathReason'] = reason;
    }
  }

  private isSnakeHeadCollidingWithOtherSnake(
    movingSnake: SnakeState | null,
    otherSnake: SnakeState | null,
  ): boolean {
    const head = movingSnake?.bodySegments[0];
    if (!head || !otherSnake) {
      return false;
    }
    return otherSnake.bodySegments.some((segment) => segment.x === head.x && segment.y === head.y);
  }

  step(paused: boolean): StepResult {
    return this.actionStep(paused);
  }

  actionStep(paused: boolean): StepResult {
    const roomsChanged = new Set<string>();
    const previousRoom = this.snake.currentRoomId;
    const appleBeforeStep = this.apples.getSnapshot(this.snake.currentRoomId);
    if (!paused) {
      this.normalizationTick += 1;
      advanceNormalizationTick(this.normalizationState);
    }
    if (paused) {
      return this.createNoopActionStepResult(appleBeforeStep, roomsChanged);
    }

    this.reconcileSwimmingEquipmentFlag();
    const lethalStep = this.getImminentLethalStep();
    if (lethalStep) {
      if (this.lethalStepHoldKey === lethalStep.key) {
        this.lethalStepHoldTicks += 1;
      } else {
        this.lethalStepHoldKey = lethalStep.key;
        this.lethalStepHoldTicks = 1;
        this.lethalStepHoldGraceTicks = lethalStep.graceTicks;
      }
      if (this.lethalStepHoldTicks <= this.lethalStepHoldGraceTicks) {
        this.snake.commitQueuedDirectionWithoutMoving();
        return this.createNoopActionStepResult(appleBeforeStep, roomsChanged);
      }
      this.lethalStepHoldKey = null;
      this.lethalStepHoldTicks = 0;
      this.lethalStepHoldGraceTicks = 0;
    } else {
      this.lethalStepHoldKey = null;
      this.lethalStepHoldTicks = 0;
      this.lethalStepHoldGraceTicks = 0;
    }

    this.preSnakeStep(previousRoom, roomsChanged);
    if (this.tickActiveCaveTimer(roomsChanged)) {
      return this.createAliveStepResult({
        appleEaten: false,
        appleSnapshot: appleBeforeStep,
        appleStateChanged: roomsChanged.has(previousRoom),
        roomsChanged,
        roomHasChanged: true,
      });
    }

    const preSnakeDeath = this.checkPreSnakeBossDeath(appleBeforeStep, roomsChanged, previousRoom);
    if (preSnakeDeath) {
      return preSnakeDeath;
    }

    let outcome = this.snakeStep(roomsChanged);
    if (outcome.status === 'alive') {
      this.handleCaveTransitionAtHead(previousRoom, roomsChanged);
      this.handleLayerTransitionAtHead(previousRoom, roomsChanged);
    }

    const roomHasChanged = previousRoom !== this.snake.currentRoomId;
    if (roomHasChanged) {
      const newRoomId = this.snake.currentRoomId;
      const [, , previousDepth = 0] = this.parseRoomCoordinates(previousRoom);
      const [, , newDepth = 0] = this.parseRoomCoordinates(newRoomId);
      if (previousDepth !== newDepth) {
        this.setFlag('traversal.manualResumePending', true);
      }
      if (!this.visitedRooms.has(newRoomId)) {
        this.visitedRooms.add(newRoomId);
        // TODO: Make this configurable
        const newRoom = this.world.getRoom(newRoomId);
        const newRoomSpawnPolicy = getSpawnPolicy(newRoom);
        if (newRoomSpawnPolicy.bosses === 'allow' && this._rng() < 0.03) {
          // 3% chance to spawn Freak Dennis in a new room
          this.bosses.spawnBoss(newRoomId, 'freak-dennis', newRoom);
        }
        if (newRoomSpawnPolicy.bosses === 'allow' && this._rng() < 0.01) {
          // 1% chance to spawn Freaker Dennis in a new room
          this.bosses.spawnBoss(newRoomId, 'freaker-dennis', newRoom);
        }
        if (
          newRoomSpawnPolicy.bosses === 'allow' &&
          newRoom.biomeId === 'sunken-ocean' &&
          this._rng() < 0.1
        ) {
          // 10% chance to spawn Jason Statham in the Sunken Ocean
          this.bosses.spawnJasonStatham(newRoomId);
        }
        if (newRoomSpawnPolicy.enemies === 'allow') {
          const atmosphere = this.getAtmosphereForRoom(newRoom);
          this.enemies.ensureEnemy(newRoomId, newRoom, [], atmosphere);
        }
        if (newRoomSpawnPolicy.animals === 'allow') {
          const atmosphere = this.getAtmosphereForRoom(newRoom);
          this.animals.ensureAnimals(newRoomId, newRoom, [], atmosphere);
        }
        if (newRoomSpawnPolicy.enemies === 'allow' || newRoomSpawnPolicy.animals === 'allow') {
          this.maybeQueueFreakJoeyEncounter(newRoomId);
        }
        this.revealBiomeIfChanged(newRoomId, newRoom);
        if (newRoom.village) {
          const maxHealth = Number(this.getFlag<number>('player.maxHealth') ?? 3);
          this.setFlag('player.health', maxHealth);
          this.addScore(3);
          this.setFlag('ui.villageReveal', {
            roomId: newRoomId,
            name: newRoom.village.name,
            x: newRoom.village.center.x,
            y: newRoom.village.center.y,
          });
        }
        if (newRoom.town) {
          const maxHealth = Number(this.getFlag<number>('player.maxHealth') ?? 3);
          this.setFlag('player.health', maxHealth);
          this.addScore(5);
          this.setFlag('ui.townReveal', {
            roomId: newRoomId,
            name: newRoom.town.name,
            mood: newRoom.town.mood,
            law: newRoom.town.laws[0]?.description,
            wantedLevel: newRoom.town.wantedLevel,
            x: newRoom.town.center.x,
            y: newRoom.town.center.y,
          });
        }
        this.queueLibertyLandmarkReveal(newRoomId, newRoom);
        this.handleGoblinCampEntered(newRoomId, newRoom);
      } else {
        const newRoom = this.world.getRoom(newRoomId);
        this.revealBiomeIfChanged(newRoomId, newRoom);
        this.queueLibertyLandmarkReveal(newRoomId, newRoom);
        this.handleGoblinCampEntered(newRoomId, newRoom);
      }
      const head = this.snake.bodySegments[0];
      if (head) {
        const [roomX, roomY] = newRoomId.split(',').map(Number);
        this.animals.transferTamedAnimals(previousRoom, newRoomId, {
          x: head.x - roomX * this.config.grid.cols,
          y: head.y - roomY * this.config.grid.rows,
        });
      }
      const transitionedRoom = this.world.getRoom(newRoomId);
      if (transitionedRoom.town) {
        this.applyTownRuntimeToRoom(transitionedRoom);
        this.maybeMarkTownHostility(transitionedRoom);
      }
      this.recordRoomTravelMetrics(previousRoom);
      this.setFlag('roomsVisited', this.visitedRooms.size);
      const relationshipTicks = this.relationshipController.tickNeglect(
        this.getRoomsVisitedCount(),
      );
      if (relationshipTicks.length > 0) {
        const latest = relationshipTicks[relationshipTicks.length - 1];
        this.setFlag('ui.relationshipEvent', {
          title: latest.title,
          message: latest.message,
          color: latest.color,
        });
      }
      this.handleEquipmentRoomRefund();
      this.handleStagedQuestRoomEntered(newRoomId);
    }

    if (
      outcome.status === 'alive' &&
      this.debugSecondPlayerAlive &&
      this.isSnakeHeadCollidingWithOtherSnake(this.snake, this.debugSecondSnake)
    ) {
      this.markDeathAtCurrentHead('self');
      outcome = { status: 'dead', reason: 'self', appleEaten: false };
      console.info('[SnakeGame] Local snake died from debug player collision.', {
        roomId: this.snake.currentRoomId,
        localHead: this.snake.bodySegments[0] ?? null,
        debugHead: this.debugSecondSnake?.bodySegments[0] ?? null,
      });
    }

    if (outcome.status === 'dead') {
      const killedByAngel = this.getFlag<string>('internal.killedByBossKind') === 'angel';
      const insultedAngelActive = Boolean(this.getFlag<boolean>('boss.insultedAngel'));
      if (
        killedByAngel ||
        insultedAngelActive ||
        !this.tryFortitudePhoenix(outcome, roomsChanged, previousRoom)
      ) {
        return {
          status: 'dead',
          deathReason: outcome.reason,
          apple: {
            eaten: false,
            current: appleBeforeStep,
            stateChanged: roomsChanged.has(previousRoom),
          },
          roomsChanged,
          roomChanged: roomHasChanged,
          questOffer: null,
          questsCompleted: [],
        };
      }
      outcome = { status: 'alive', reason: undefined, appleEaten: false };
    }

    if (this.tryActivateQuestTeleporterAtHead()) {
      roomsChanged.add(this.snake.currentRoomId);
    }

    const updatedSnake = Array.from(this.snake.bodySegments);
    const currentHead = updatedSnake[0];
    // UI: Turn skid when direction changes
    const previous = this.getFlag<{ direction?: Vector2Like }>('internal.previousSnapshot');
    const currDir = this.snake.directionVector;
    if (
      previous?.direction &&
      (previous.direction.x !== currDir.x || previous.direction.y !== currDir.y) &&
      currentHead
    ) {
      this.setFlag('ui.turnSkid', {
        x: currentHead.x,
        y: currentHead.y,
        roomId: this.snake.currentRoomId,
        dx: currDir.x,
        dy: currDir.y,
      });
    }

    const lastTail = this.getFlag<{ x: number; y: number; roomId?: string }>(
      'internal.lastRemovedTail',
    );
    if (
      lastTail &&
      (this.getFlag<boolean>('geometry.masonryEnabled') ||
        this.getFlag<boolean>('equipment.masonryEnabled'))
    ) {
      this.applyMasonry(lastTail, updatedSnake, roomsChanged);
    }
    this.setFlag('internal.lastRemovedTail', undefined);

    const wallEaten = this.getFlag<{ x: number; y: number; roomId: string }>('geometry.wallEaten');
    if (wallEaten) {
      this.handleWallEaten(wallEaten, roomsChanged);
      this.setFlag('geometry.wallEaten', undefined);
    }

    if (currentHead) {
      this.stepFootballs(currentHead, roomsChanged);
    }

    if (this.getFlag<boolean>('geometry.faultLineEnabled') && currentHead) {
      this.applyFaultLine(currentHead, roomsChanged);
    }

    // UI: Wall graze — spark if moving adjacent to a wall in move direction
    if (currentHead) {
      const dir = this.snake.directionVector;
      const info = this.resolveRoomPosition({ x: currentHead.x, y: currentHead.y });
      if (info) {
        const { roomId, localX, localY } = info;
        const room = this.world.getRoom(roomId);
        let nx = 0,
          ny = 0;
        if (dir.x !== 0) {
          const tx = localX + dir.x;
          if (tx >= 0 && tx < this.config.grid.cols) {
            const t = room.layout[localY]?.[tx];
            if (this.isSolidTile(t)) {
              nx = dir.x;
              ny = 0;
            }
          }
        } else if (dir.y !== 0) {
          const ty = localY + dir.y;
          if (ty >= 0 && ty < this.config.grid.rows) {
            const t = room.layout[ty]?.[localX];
            if (this.isSolidTile(t)) {
              nx = 0;
              ny = dir.y;
            }
          }
        }
        if (nx !== 0 || ny !== 0) {
          this.setFlag('ui.wallGraze', { x: currentHead.x, y: currentHead.y, roomId, nx, ny });
        }
      }
    }

    let appleStateChanged = roomsChanged.has(this.snake.currentRoomId);
    let appleSnapshot = this.apples.getSnapshot(this.snake.currentRoomId);
    let appleRewards: AppleConsumptionResult['rewards'] | undefined;
    let appleWorldPosition: Vector2Like | null = null;
    let appleEaten = false;
    let appleTypeId: string | undefined;

    if (outcome.appleEaten) {
      appleEaten = true;
      const phasePowerupActive = Boolean(
        this.powerupState?.kind === 'phase' && this.powerupState.remaining > 0,
      );
      const consumption = this.apples.handleConsumption(
        this.snake.currentRoomId,
        this.snake.directionVector,
        phasePowerupActive,
        this.worldToLocal(this.snake.currentRoomId, currentHead),
      );
      if (consumption.fatal) {
        if (this.isImmortal()) {
          const normalConsumption = this.apples.handleConsumption(
            this.snake.currentRoomId,
            this.snake.directionVector,
            true,
            this.worldToLocal(this.snake.currentRoomId, currentHead),
          );
          appleRewards = normalConsumption.rewards;
          appleWorldPosition = normalConsumption.worldPosition ?? null;
          appleStateChanged = true;
          appleTypeId = normalConsumption.typeId;
        } else if (
          this.tryFortitudePhoenix(
            { status: 'dead', reason: 'shielded' },
            roomsChanged,
            previousRoom,
          )
        ) {
          return this.createAliveStepResult({
            appleEaten: true,
            appleSnapshot: appleBeforeStep,
            appleStateChanged: true,
            roomsChanged,
            roomHasChanged,
            appleTypeId,
          });
        } else {
          this.markDeathAtCurrentHead('shielded');
          return {
            status: 'dead',
            deathReason: 'shielded',
            apple: {
              eaten: true,
              current: appleBeforeStep,
              stateChanged: true,
            },
            roomsChanged,
            roomChanged: roomHasChanged,
            questOffer: null,
            questsCompleted: [],
          };
        }
      }

      appleRewards = consumption.rewards;
      appleWorldPosition = consumption.worldPosition ?? null;
      appleStateChanged = appleStateChanged || consumption.changed;
      appleTypeId = consumption.typeId;

      const nowMs = Number(this.getFlag<number>('timeMs') ?? 0);
      const lastAppleMs = Number(
        this.getFlag<number>('lastAppleTimeMs') ?? Number.NEGATIVE_INFINITY,
      );
      const streakWindowMs = 1500;
      const streak =
        nowMs - lastAppleMs <= streakWindowMs
          ? Number(this.getFlag<number>('appleStreak') ?? 0) + 1
          : 1;
      const best = Math.max(Number(this.getFlag<number>('appleStreakMax') ?? 0), streak);
      this.setFlag('appleStreak', streak);
      this.setFlag('appleStreakMax', best);
      this.setFlag('lastAppleTimeMs', nowMs);

      if (this.isRaccoonMode()) {
        const weightGain = Math.max(1, consumption.rewards.growth);
        const previousWeight = this.raccoonWeight;
        const previousTier = this.getRaccoonWeightTierLabel();
        this.addRaccoonWeight(weightGain);
        this.restoreRaccoonHungerForPickup();
        this.addRaccoonBanditForage();
        const nextTier = this.getRaccoonWeightTierLabel();
        const nextThreshold = this.getNextRaccoonWeightThreshold();
        const crossedThreshold = this.config.character.raccoon.weightTiers
          .map((tier) => tier.minWeight)
          .filter((threshold) => threshold > 0)
          .some((threshold) => threshold > previousWeight && threshold <= this.raccoonWeight);
        this.setFlag('ui.raccoonForageFeedback', {
          weightGain,
          weight: this.raccoonWeight,
          nextThreshold,
          tierChanged: crossedThreshold,
          tierLabel: nextTier,
          message:
            previousTier !== nextTier
              ? `Raccoon load: +${weightGain} weight. ${nextTier} pace.`
              : `Raccoon load: +${weightGain} weight${nextThreshold ? ` (${this.raccoonWeight}/${nextThreshold})` : ''}.`,
        });
      } else {
        const cheatMultiplier = Math.max(
          1,
          Number(this.getFlag<number>('cheat.appleScoreMultiplier') ?? 1),
        );
        const orangeJuiceMultiplier = Math.max(
          1,
          Number(this.getFlag<number>('status.orangeJuiceScoreMult') ?? 1),
        );
        const radioMultiplier = Math.max(
          1,
          Number(this.getFlag<number>('radio.appleScoreMultiplier') ?? 1),
        );
        const appleScoreMultiplier = cheatMultiplier * orangeJuiceMultiplier * radioMultiplier;
        const appleScorePenalty = Math.max(
          0,
          Number(this.getFlag<number>('equipment.appleScorePenalty') ?? 0),
        );
        const lengthScoreMultiplier = this.calculateAppleLengthScoreMultiplier();
        const baseAppleScore = Math.max(0, consumption.rewards.bonusScore - appleScorePenalty);
        const appleScore = this.applyLengthScoreMultiplier(baseAppleScore, lengthScoreMultiplier);
        if (appleScore > 0) {
          this.addScore(appleScore * appleScoreMultiplier);
        }
      }
      const libertyAppleBonus = Number(this.getFlag<number>('liberty.nextAppleBonus') ?? 0);
      if (libertyAppleBonus > 0) {
        this.setFlag('liberty.nextAppleBonus', undefined);
        if (!this.isRaccoonMode()) {
          this.addScore(libertyAppleBonus);
          this.setFlag('ui.questInteraction', {
            message: `Liberty sparkle bonus: +${libertyAppleBonus} score.`,
          });
        }
      }

      const extraGrowth = this.isRaccoonMode() ? 0 : Math.max(0, consumption.rewards.growth - 1);
      if (extraGrowth > 0) {
        this.snake.grow(extraGrowth);
      }

      if (isCaveRoomId(this.snake.currentRoomId)) {
        appleSnapshot = this.handleCaveAppleEaten(roomsChanged);
        appleStateChanged = true;
      } else {
        const spawn = this.apples.spawnApple(
          this.snake.currentRoomId,
          Array.from(this.snake.bodySegments),
          this.snake.score,
        );
        if (spawn.changed) {
          appleStateChanged = true;
        }
        appleSnapshot = spawn.snapshot;
      }

      const seismicRadius =
        (this.getFlag<number>('geometry.seismicPulseRadius') ?? 0) +
        (this.getFlag<number>('equipment.seismicPulseRadiusBonus') ?? 0);
      if (seismicRadius > 0 && currentHead) {
        this.triggerSeismicPulse(currentHead, seismicRadius, roomsChanged);
      }
      if (
        (this.getFlag<boolean>('geometry.collapseControlEnabled') ||
          this.getFlag<boolean>('equipment.collapseControlEnabled')) &&
        currentHead
      ) {
        this.triggerCollapseControl(currentHead, updatedSnake, roomsChanged);
      }
      this.rechargeTerraShield();
      this.handleFortitudeOnApple(roomsChanged);
      this.handleGrowthOnApple(roomsChanged);
    }

    // Treasure pickup: collect and grant a random item
    if (currentHead) {
      const room = this.world.getRoom(this.snake.currentRoomId);
      const local = this.worldToLocal(this.snake.currentRoomId, currentHead);
      const localX = local.x;
      const localY = local.y;
      if (room.treasure && room.treasure.x === localX && room.treasure.y === localY) {
        if (room.cave?.lockedReward && this.enemies.getEnemiesInRoom(room.id).length > 0) {
          this.setFlag('ui.questInteraction', {
            message: 'The cave chest is sealed until the den is clear.',
          });
        } else {
          let awardedName: string | undefined;
          let awardedId: string | undefined;
          if (room.cave) {
            awardedId = this.pickCaveRewardId(room.cave.templateId, `chest:${room.id}`);
            this.addItem(awardedId, 1);
            awardedName = getItem(awardedId)?.name ?? awardedId;
          } else if (this._rng() < 0.3 && CARD_SHOP_OFFERS.length > 0) {
            const cardId = this.pickRandomCardId();
            const card = getCardDefinition(cardId);
            this.addCardToCollection(cardId, 1);
            awardedName = `${card.name} card`;
            awardedId = `card:${card.id}`;
          } else if (CHEST_LOOT_ITEMS.length > 0) {
            const idx = Math.floor(this._rng() * CHEST_LOOT_ITEMS.length);
            const awarded =
              CHEST_LOOT_ITEMS[Math.max(0, Math.min(CHEST_LOOT_ITEMS.length - 1, idx))];
            this.addItem(awarded.id, 1);
            awardedName = awarded.name;
            awardedId = awarded.id;
          }
          // Score bonus for treasure pickup
          this.addScore(5);
          this.world.setTreasure(this.snake.currentRoomId, undefined);
          roomsChanged.add(this.snake.currentRoomId);
          const treasureCount = Number(this.getFlag<number>('treasurePicked') ?? 0);
          this.setFlag('treasurePicked', treasureCount + 1);
          // Notify UI for juice + hint
          this.setFlag('loot.itemPicked', {
            head: currentHead,
            itemName: awardedName,
            itemId: awardedId,
          });
          // Treasure-specific pickup FX at the pickup tile
          this.setFlag('ui.treasurePickup', {
            x: currentHead.x,
            y: currentHead.y,
            roomId: this.snake.currentRoomId,
          });
          this.markCaveRewardClaimed(room.id);
        }
      }
      // Powerup pickup: instant short effect
      if (room.powerup && room.powerup.x === localX && room.powerup.y === localY) {
        const kind = room.powerup.kind;
        const duration = 300; // ~30s at 100ms base tick
        this.world.setPowerup(this.snake.currentRoomId, undefined);
        roomsChanged.add(this.snake.currentRoomId);
        const powerupCount = Number(this.getFlag<number>('powerupsPicked') ?? 0);
        this.setFlag('powerupsPicked', powerupCount + 1);
        if (kind === 'gun') {
          this.inventory.addItem('weapon-revolver', 1);
          const gunItem = getItem('weapon-revolver');
          if (gunItem && !this.inventory.getEquipped('weapon')) {
            this.inventory.equip(gunItem);
          }
          this.setFlag('equipment.gunEnabled', true);
          this.setFlag('loot.itemPicked', {
            head: currentHead,
            itemName: 'Pilgrim Revolver',
            itemId: 'weapon-revolver',
          });
        } else if (kind === 'phase') {
          const bonus = Number(this.getFlag<number>('equipment.invulnerabilityBonus') ?? 0);
          const inv = Math.max(
            Number(this.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0),
            duration + Math.max(0, Math.floor(bonus)),
          );
          this.setFlag('fortitude.invulnerabilityTicks', inv);
        } else if (kind === 'smite') {
          this.setFlag('powerup.smiteTicks', duration);
        }
        if (kind !== 'gun') {
          this.powerupState = { kind, remaining: duration, total: duration };
          this.setFlag('powerup.active', { kind, remaining: duration, total: duration });
        }
        this.setFlag('ui.powerupPickup', {
          x: currentHead.x,
          y: currentHead.y,
          roomId: this.snake.currentRoomId,
          kind,
        });
      }
      const lakeReward = room.cave?.lakeRewards?.find(
        (reward) => reward.x === localX && reward.y === localY,
      );
      if (lakeReward) {
        this.claimCaveLakeReward(room.id, lakeReward.id, currentHead);
        roomsChanged.add(room.id);
      }
    }

    if (appleStateChanged) {
      roomsChanged.add(this.snake.currentRoomId);
    }

    if (currentHead) {
      const enemyEat = this.enemies.consumeEnemyAt(this.snake.currentRoomId, currentHead);
      if (enemyEat.eaten) {
        this.setFlag('achievement.enemyDefeated', {
          enemyId: enemyEat.enemy?.id ?? 'unknown-enemy',
          method: 'eaten',
        });
        if (enemyEat.enemy) {
          this.noteBanditRaidDefeat(enemyEat.enemy, true);
        }
        const eatenName = enemyEat.enemy?.name;
        const eatenHumanoid = this.isHostileHumanoidEnemy(enemyEat.enemy);
        const eatenActorId =
          enemyEat.enemy?.actorId ??
          (enemyEat.enemy
            ? this.actors.getStableEnemyActorId(this.snake.currentRoomId, enemyEat.enemy.id)
            : undefined);
        if (enemyEat.enemy && eatenActorId) {
          this.actors.registry.ensureEnemyActor({
            actorId: eatenActorId,
            enemyId: enemyEat.enemy.id,
            roomId: this.snake.currentRoomId,
            name: eatenName,
            encounterKind: enemyEat.enemy.encounterKind,
            currentHearts: 0,
            maxHearts: enemyEat.enemy.maxHearts,
            createdAtRoomNumber: this.getRoomsVisitedCount(),
          });
        }
        const healed = eatenHumanoid ? this.healPlayer(1) : 0;
        this.addScore(eatenHumanoid ? 6 : 3);
        if (this.isRaccoonMode()) {
          const weightGain = 5;
          const previousWeight = this.raccoonWeight;
          this.addRaccoonWeight(weightGain);
          const nextThreshold = this.getNextRaccoonWeightThreshold();
          const crossedThreshold = this.config.character.raccoon.weightTiers
            .map((tier) => tier.minWeight)
            .filter((threshold) => threshold > 0)
            .some((threshold) => threshold > previousWeight && threshold <= this.raccoonWeight);
          this.setFlag('ui.raccoonForageFeedback', {
            weightGain,
            weight: this.raccoonWeight,
            nextThreshold,
            tierChanged: crossedThreshold,
            tierLabel: this.getRaccoonWeightTierLabel(),
          });
        } else {
          this.snake.grow(5);
        }
        this.setFlag('ui.enemyEaten', {
          x: currentHead.x,
          y: currentHead.y,
          roomId: this.snake.currentRoomId,
          name: eatenName,
          kind: enemyEat.enemy?.encounterKind,
          healed,
        });
        if (enemyEat.enemy && eatenActorId) {
          this.emitWorldEvent({
            type: eatenHumanoid ? 'humanoid-eaten' : 'enemy-defeated',
            roomId: this.snake.currentRoomId,
            targetActorIds: [eatenActorId],
            severity: eatenHumanoid ? 65 : 28,
            loudness: eatenHumanoid ? 45 : 20,
            tags: [
              'combat',
              'eaten',
              enemyEat.enemy.encounterKind ?? 'enemy',
              ...(enemyEat.enemy.id.startsWith('npc-hostile:raidBandit-')
                ? ['bandit', 'raid']
                : []),
              ...(eatenHumanoid ? ['hostile-kill', 'healing', 'humanoid'] : []),
            ],
            summary: eatenName
              ? `${eatenName} was eaten.`
              : eatenHumanoid
                ? 'A hostile person was eaten.'
                : 'An enemy was defeated.',
            createdAtRoomNumber: this.getRoomsVisitedCount(),
            data: {
              enemyId: enemyEat.enemy.id,
              encounterKind: enemyEat.enemy.encounterKind,
              healed,
            },
          });
        }
        const relationshipId = this.getRelationshipIdFromHostileNpc(enemyEat.enemy?.id);
        if (relationshipId) {
          this.npcBodies.delete(relationshipId);
          const event = this.relationshipController.recordEaten(
            relationshipId,
            this.getRoomsVisitedCount(),
          );
          this.markRelationshipActorDead(event.state, 'eaten');
          if (event.ok) {
            this.setFlag('ui.relationshipEvent', {
              title: event.title,
              message: event.message,
              color: event.color,
            });
          }
        } else if (eatenHumanoid && eatenName) {
          this.setFlag('ui.questInteraction', { message: `${eatenName} has been eaten by you.` });
        }
      } else {
        const harmfulEnemy = this.enemies.getHarmfulOccupantAt(
          this.snake.currentRoomId,
          currentHead,
        );
        if (harmfulEnemy) {
          const deathReason = harmfulEnemy.encounterKind === 'shark' ? 'shark' : 'boss';
          if (
            this.tryFortitudePhoenix(
              { status: 'dead', reason: deathReason === 'shark' ? 'boss' : deathReason },
              roomsChanged,
              previousRoom,
            )
          ) {
            return this.createAliveStepResult({
              appleEaten,
              appleRewards,
              appleWorldPosition,
              appleSnapshot,
              appleStateChanged,
              roomsChanged,
              roomHasChanged,
              appleTypeId,
            });
          }
          this.markDeathAtCurrentHead(deathReason);
          return {
            status: 'dead',
            deathReason,
            apple: {
              eaten: appleEaten,
              rewards: appleRewards,
              worldPosition: appleWorldPosition,
              current: appleSnapshot,
              stateChanged: appleStateChanged,
            },
            roomsChanged,
            roomChanged: roomHasChanged,
            questOffer: null,
            questsCompleted: [],
          };
        }
      }
    }

    if (currentHead) {
      const animalResult = this.animals.handleSnakeOverlap(
        this.snake.currentRoomId,
        currentHead,
        this.snake.directionVector,
        this.canHuntHarmlessAnimals(),
        (animalType) => {
          const tameInfo = getTameInfo(animalType);
          return Boolean(
            tameInfo &&
            this.getScore() >= tameInfo.tameScore &&
            this.inventory.getItemCount(tameInfo.requiredItem) > 0,
          );
        },
      );
      if (animalResult.damaged) {
        if (!this.isImmortal()) {
          if (
            this.tryFortitudePhoenix({ status: 'dead', reason: 'boss' }, roomsChanged, previousRoom)
          ) {
            return this.createAliveStepResult({
              appleEaten,
              appleRewards,
              appleWorldPosition,
              appleSnapshot,
              appleStateChanged,
              roomsChanged,
              roomHasChanged,
              appleTypeId,
            });
          }
          this.markDeathAtCurrentHead('boss');
          return {
            status: 'dead',
            deathReason: 'boss',
            apple: {
              eaten: appleEaten,
              rewards: appleRewards,
              worldPosition: appleWorldPosition,
              current: appleSnapshot,
              stateChanged: appleStateChanged,
            },
            roomsChanged,
            roomChanged: roomHasChanged,
            questOffer: null,
            questsCompleted: [],
          };
        }
      }
      if (animalResult.hunted) {
        this.awardHuntedAnimal(animalResult.huntedAnimal, currentHead);
      }
      if (animalResult.startleCount > 0) {
        this.setFlag('ui.animalStartled', {
          x: currentHead.x,
          y: currentHead.y,
          roomId: this.snake.currentRoomId,
        });
      }
      if (animalResult.tamed) {
        const tamable = animalResult.tamableAnimal;
        const definition = tamable ? AnimalRegistry.getDefinition(tamable.type) : undefined;
        const tameInfo = tamable ? getTameInfo(tamable.type) : null;
        this.setFlag('ui.animalTamable', {
          animalId: tamable?.id,
          animalType: tamable?.type,
          animalName: definition?.name,
          requiredItem: tameInfo?.requiredItem,
          requiredScore: tameInfo?.tameScore,
          x: currentHead.x,
          y: currentHead.y,
          roomId: this.snake.currentRoomId,
        });
      }
    }

    const statusStepResult = this.statusStepPhase({
      roomsChanged,
      previousRoom,
      roomHasChanged,
      appleEaten,
      appleRewards,
      appleWorldPosition,
      appleSnapshot,
      appleStateChanged,
    });
    if (statusStepResult) {
      return statusStepResult;
    }

    const questsCompleted = this.questController.handleCompletions(this);
    for (const quest of questsCompleted) {
      this.emitWorldEvent({
        type: 'quest-completed',
        roomId: this.snake.currentRoomId,
        severity: 20,
        loudness: 8,
        tags: ['quest', 'completed', quest.id],
        summary: `${quest.label} was completed.`,
        createdAtRoomNumber: this.getRoomsVisitedCount(),
        data: { questId: quest.id, label: quest.label },
      });
    }
    const questOffer = this.questController.maybeCreateOffer(paused, this) ?? undefined;

    return {
      status: 'alive',
      apple: {
        eaten: appleEaten,
        rewards: appleRewards,
        worldPosition: appleWorldPosition,
        current: appleSnapshot,
        stateChanged: appleStateChanged,
        typeId: appleTypeId,
      },
      roomsChanged,
      roomChanged: roomHasChanged,
      questOffer,
      questsCompleted,
    };
  }

  bossStep(onEvent?: (event: BossEvent) => void, stepMs?: number): void {
    this.bosses.step({
      getRoom: (roomId: string) => this.world.getRoom(roomId),
      getSnakeBody: () => this.snake.bodySegments,
      onEvent,
      stepMs,
    });
    this.reconcileStagedQuestBosses();
  }

  setJasonDamageCallback(
    callback: (bossId: string, defeated: boolean, scoreBonus: number) => void,
  ): void {
    this.jasonDamageCallback = callback;
  }

  async actorClockStep(): Promise<StepResult | null> {
    const roomsChanged = new Set<string>();
    const currentRoom = this.snake.currentRoomId;
    const appleSnapshot = this.apples.getSnapshot(currentRoom);
    const result = await this.actorStepPhase({
      roomsChanged,
      previousRoom: currentRoom,
      roomHasChanged: false,
      appleEaten: false,
      appleSnapshot,
      appleStateChanged: false,
    });
    if (result) {
      return result;
    }
    if (roomsChanged.size <= 0) {
      return null;
    }
    return {
      status: 'alive',
      apple: {
        eaten: false,
        current: appleSnapshot,
        stateChanged: roomsChanged.has(currentRoom),
      },
      roomsChanged,
      roomChanged: false,
      questOffer: null,
      questsCompleted: [],
    };
  }

  bulletClockStep(): StepResult | null {
    const roomsChanged = new Set<string>();
    const currentRoom = this.snake.currentRoomId;
    const appleSnapshot = this.apples.getSnapshot(currentRoom);
    const bulletStep = this.enemies.stepBullets({
      getRoom: (roomId: string) => this.world.getRoom(roomId),
      snake: this.snake.bodySegments,
      currentRoomId: this.snake.currentRoomId,
      snakeDirection: this.snake.directionVector,
    });
    this.handlePlayerBulletDefeats(bulletStep.defeatedEnemies ?? []);
    if (
      bulletStep.bulletHits <= 0 ||
      !this.applyBulletDamage(bulletStep.bulletHits, bulletStep.hitStyle)
    ) {
      return null;
    }

    const options = {
      roomsChanged,
      previousRoom: currentRoom,
      roomHasChanged: false,
      appleEaten: false,
      appleSnapshot,
      appleStateChanged: false,
    };
    if (
      this.tryFortitudePhoenix(
        { status: 'dead', reason: 'bullet' },
        options.roomsChanged,
        options.previousRoom,
      )
    ) {
      return this.createAliveStepResult(options);
    }
    this.markDeathAtCurrentHead('bullet');
    return this.createActorDeathStepResult('bullet', options);
  }

  hazardClockStep(): StepResult | null {
    const roomsChanged = new Set<string>();
    const currentRoom = this.snake.currentRoomId;
    const appleSnapshot = this.apples.getSnapshot(currentRoom);
    const options = {
      roomsChanged,
      previousRoom: currentRoom,
      roomHasChanged: false,
      appleEaten: false,
      appleSnapshot,
      appleStateChanged: false,
    };
    const hungerDeath = this.tickRaccoonHungerClock(100, options);
    if (hungerDeath) {
      return hungerDeath;
    }
    if (this.tickTemperatureState()) {
      return this.createTemperatureDeathOrPhoenixResult(options);
    }
    if (this.tickRadiationQuestTimer()) {
      return this.createTemperatureDeathOrPhoenixResult(options);
    }
    if (this.tickLightningHazardState(options)) {
      return this.createLightningDeathOrPhoenixResult(options);
    }
    return null;
  }

  private tickRaccoonHungerClock(
    elapsedMs: number,
    options: {
      roomsChanged: Set<string>;
      previousRoom: string;
      roomHasChanged: boolean;
      appleEaten: boolean;
      appleSnapshot: AppleSnapshot | null;
      appleStateChanged: boolean;
    },
  ): StepResult | null {
    if (!this.isRaccoonMode()) {
      return null;
    }
    this.decayRaccoonBandit(elapsedMs);
    const max = Number(this.getFlag<number>('player.maxHealth') ?? 3);
    const current = Number(this.getFlag<number>('player.health') ?? max);
    const result = tickRaccoonHunger({
      elapsedMs: elapsedMs * this.getArtifactHungerDrainScalar(),
      currentHunger: current,
      maxHunger: max,
      timerMs: this.raccoonHungerTimerMs,
      config: this.config.character.raccoon,
    });
    this.raccoonHungerTimerMs = result.timerMs;
    if (result.hungerLost > 0) {
      this.setFlag('player.health', result.currentHunger);
      this.setFlag('ui.healthRevealed', true);
      this.setFlag('ui.questInteraction', {
        message:
          result.currentHunger > 0
            ? `Hunger slips: -${result.hungerLost}. Find forage.`
            : 'Starving. The raccoon run ends.',
      });
    }
    this.syncRaccoonFlags();
    if (result.currentHunger > 0) {
      return null;
    }
    if (
      this.tryFortitudePhoenix(
        { status: 'dead', reason: 'temperature' },
        options.roomsChanged,
        options.previousRoom,
      )
    ) {
      return this.createAliveStepResult(options);
    }
    this.markDeathAtCurrentHead('temperature');
    return {
      status: 'dead',
      deathReason: 'starvation',
      apple: {
        eaten: false,
        current: options.appleSnapshot,
        stateChanged: options.appleStateChanged,
      },
      roomsChanged: options.roomsChanged,
      roomChanged: options.roomHasChanged,
      questOffer: null,
      questsCompleted: [],
    };
  }

  private createNoopActionStepResult(
    appleBeforeStep: AppleSnapshot | null,
    roomsChanged: Set<string>,
  ): StepResult {
    return {
      status: 'alive',
      apple: {
        eaten: false,
        current: appleBeforeStep,
        stateChanged: false,
      },
      roomsChanged,
      roomChanged: false,
      questOffer: null,
      questsCompleted: [],
    };
  }

  private preSnakeStep(previousRoom: string, roomsChanged: Set<string>): void {
    const snakeSegments = Array.from(this.snake.bodySegments);

    this.hydratePredationConfig();
    const predationState = this.ensurePredationState();
    predationState.lastRoomId = previousRoom;

    const skittishRooms = this.apples.moveApples(snakeSegments);
    skittishRooms.forEach((roomId) => roomsChanged.add(roomId));
  }

  private checkPreSnakeBossDeath(
    appleBeforeStep: AppleSnapshot | null,
    roomsChanged: Set<string>,
    previousRoom: string,
  ): StepResult | null {
    const headBeforeSnakeStep = this.snake.bodySegments[0];
    const bossOnHead = headBeforeSnakeStep
      ? this.bosses.getBossAtPosition(headBeforeSnakeStep, this.snake.currentRoomId)
      : null;
    if (this.isImmortal()) return null;
    if (!bossOnHead || (bossOnHead.kind !== 'angel' && bossOnHead.kind !== 'freak-you')) {
      return null;
    }

    this.setFlag('internal.killedByBossKind', bossOnHead.kind);
    this.setFlag('internal.killedByBossName', bossOnHead.name);
    this.markDeathAtCurrentHead('boss');
    return {
      status: 'dead',
      deathReason: 'boss',
      apple: {
        eaten: false,
        current: appleBeforeStep,
        stateChanged: roomsChanged.has(previousRoom),
      },
      roomsChanged,
      roomChanged: false,
      questOffer: null,
      questsCompleted: [],
    };
  }

  private snakeStep(roomsChanged: Set<string>): SnakeStepOutcome {
    const dependencies: SnakeStepDependencies = {
      getRoom: (roomId: string) => this.world.getRoom(roomId),
      prepareRoomForCollision: (roomId: string) => {
        const room = this.world.getRoom(roomId);
        this.applyTownRuntimeToRoom(room);
      },
      ensureApple: (roomId: string, snake, score) => {
        const room = this.world.getRoom(roomId);
        const policy = getSpawnPolicy(room);
        if (policy.apples === 'clearExisting') {
          this.apples.clearApple(roomId);
          return;
        }
        if (policy.apples === 'suppress') return;
        const { changed } = this.apples.ensureApple(roomId, Array.from(snake), score);
        if (changed) {
          roomsChanged.add(roomId);
        }
      },
      getBossManager: () => this.bosses,
      skipSelfCollision: this.isRaccoonMode(),
      onJasonDamage: (bossId, defeated, scoreBonus) => {
        this.jasonDamageCallback?.(bossId, defeated, scoreBonus);
      },
    };

    const outcome = this.snake.step(dependencies);
    if (this.isRaccoonMode()) {
      this.snake.keepHeadOnly();
    }
    return outcome;
  }

  private getImminentLethalStep(): { key: string; graceTicks: number } | null {
    if (this.isImmortal()) {
      return null;
    }
    const head = this.snake.bodySegments[0];
    if (!head) {
      return null;
    }
    const currentDirection = this.snake.directionVector;
    const direction = this.snake.nextDirectionVector;
    if (direction.x === 0 && direction.y === 0) {
      return null;
    }
    const graceTicks =
      direction.x === currentDirection.x && direction.y === currentDirection.y ? 2 : 1;
    const target = { x: head.x + direction.x, y: head.y + direction.y };
    const info = this.resolveRoomPosition(target);
    if (!info || info.roomId !== this.snake.currentRoomId) {
      return null;
    }
    const room = this.world.getRoom(info.roomId);
    const tile = room.layout[info.localY]?.[info.localX];
    if (tile === '~' && !this.canSurviveWaterStep()) {
      return {
        key: `water:${target.x},${target.y}:${direction.x},${direction.y}`,
        graceTicks,
      };
    }
    // Masonry blocks (the snake's own temporary walls) are always passable.
    // Regular walls still require wall-survival abilities.
    if ((tile === '#' || (tile !== '~' && isBlockingTownTile(tile))) && !this.canSurviveWallStep()) {
      return {
        key: `wall:${target.x},${target.y}:${direction.x},${direction.y}`,
        graceTicks,
      };
    }
    if (this.isFatalShieldedAppleStep(info.roomId, info.localX, info.localY, direction)) {
      return {
        key: `shielded:${target.x},${target.y}:${direction.x},${direction.y}`,
        graceTicks,
      };
    }
    if (this.isSelfCollisionStep(target, info.roomId, info.localX, info.localY)) {
      return {
        key: `self:${target.x},${target.y}:${direction.x},${direction.y}`,
        graceTicks,
      };
    }
    if (this.isEnemySnakeBodyCollisionStep(info.roomId, info.localX, info.localY)) {
      return {
        key: `enemy-snake:${target.x},${target.y}:${direction.x},${direction.y}`,
        graceTicks,
      };
    }
    return null;
  }

  private canSurviveWallStep(): boolean {
    if (
      Number(this.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0) > 0 ||
      Number(this.getFlag<number>('traversal.phaseTicks') ?? 0) > 0 ||
      this.getFlag<boolean>('equipment.wallSmiteEnabled') ||
      this.getFlag<boolean>('geometry.canEatWalls')
    ) {
      return true;
    }
    const terraShield = this.getFlag<{ charges?: number }>('geometry.terraShield');
    const ghostShield = this.getFlag<{ charges?: number }>('traversal.ghostShield');
    return Number(terraShield?.charges ?? 0) > 0 || Number(ghostShield?.charges ?? 0) > 0;
  }

  private canSurviveWaterStep(): boolean {
    if (
      this.getFlag<boolean>('equipment.swimmingEnabled') ||
      this.getFlag<boolean>('cheat.immortal')
    ) {
      return true;
    }
    return this.hasEquippedSwimming();
  }

  private hasEquippedSwimming(): boolean {
    return this.inventory.getAllEquipped().some(([, itemId]) => {
      const item = getItem(itemId);
      return item?.kind === 'equipment' && Boolean(item.modifiers?.swimmingEnabled);
    });
  }

  private reconcileSwimmingEquipmentFlag(): void {
    if (!this.getFlag<boolean>('equipment.swimmingEnabled') && this.hasEquippedSwimming()) {
      this.setFlag('equipment.swimmingEnabled', true);
    }
  }

  private isFatalShieldedAppleStep(
    roomId: string,
    localX: number,
    localY: number,
    direction: Vector2Like,
  ): boolean {
    const phasePowerupActive = Boolean(
      this.powerupState?.kind === 'phase' && this.powerupState.remaining > 0,
    );
    if (phasePowerupActive) {
      return false;
    }
    const apple = this.apples.getSnapshot(roomId);
    if (
      !apple ||
      apple.typeId !== 'shielded' ||
      apple.position.x !== localX ||
      apple.position.y !== localY
    ) {
      return false;
    }
    const protectedDirs = apple.metadata?.protectedDirs;
    return (
      Array.isArray(protectedDirs) &&
      protectedDirs.some(
        (entry) =>
          typeof entry === 'object' &&
          entry !== null &&
          (entry as Vector2Like).x === direction.x &&
          (entry as Vector2Like).y === direction.y,
      )
    );
  }

  private isSelfCollisionStep(
    target: Vector2Like,
    roomId: string,
    localX: number,
    localY: number,
  ): boolean {
    if (
      this.isRaccoonMode() ||
      Number(this.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0) > 0 ||
      Number(this.getFlag<number>('traversal.phaseTicks') ?? 0) > 0 ||
      Number(this.getFlag<{ charges?: number }>('fortitude.hardened')?.charges ?? 0) > 0 ||
      Number(this.getFlag<number>('jadePeak.koiFlowEnd') ?? 0) >
        Number(this.getFlag<number>('timeMs') ?? 0)
    ) {
      return false;
    }
    const apple = this.apples.getSnapshot(roomId);
    const appleEaten = Boolean(apple && apple.position.x === localX && apple.position.y === localY);
    const body = appleEaten
      ? Array.from(this.snake.bodySegments)
      : Array.from(this.snake.bodySegments).slice(0, -1);
    return body.some((segment) => segment.x === target.x && segment.y === target.y);
  }

  private isEnemySnakeBodyCollisionStep(roomId: string, localX: number, localY: number): boolean {
    for (const rival of this.enemies.getRivalSnakes()) {
      if (rival.roomId !== roomId) continue;
      const body = rival.body ?? [rival.position];
      if (body.slice(1).some((segment) => segment.x === localX && segment.y === localY)) {
        return true;
      }
    }
    for (const snake of this.enemies.getRoamingSnakes()) {
      if (snake.roomId !== roomId) continue;
      const body = snake.body ?? [snake.position];
      if (body.some((segment) => segment.x === localX && segment.y === localY)) {
        return true;
      }
    }
    return false;
  }

  private handleCaveTransitionAtHead(previousRoom: string, roomsChanged: Set<string>): void {
    const head = this.snake.bodySegments[0];
    if (!head) {
      return;
    }
    const room = this.world.getRoom(this.snake.currentRoomId);
    const local = this.worldToLocal(room.id, head);
    if (room.cave && room.layout[local.y]?.[local.x] === CAVE_EXIT_TILE) {
      this.exitCurrentCave(roomsChanged, 'manual');
      return;
    }
    const entrance = room.caveEntrances?.find(
      (entry) => !entry.collapsed && entry.x === local.x && entry.y === local.y,
    );
    if (!entrance || previousRoom !== room.id) {
      return;
    }
    this.enterCave(entrance, room.id, local, roomsChanged);
  }

  private handleLayerTransitionAtHead(previousRoom: string, roomsChanged: Set<string>): void {
    const head = this.snake.bodySegments[0];
    if (!head) {
      return;
    }
    const room = this.world.getRoom(this.snake.currentRoomId);
    const local = this.worldToLocal(room.id, head);
    const tile = room.layout[local.y]?.[local.x];
    if (room.layer && tile === LAYER_EXIT_TILE && previousRoom === room.id) {
      this.exitCurrentLayer(roomsChanged);
      return;
    }
    const entrance = room.layerEntrances?.find(
      (entry) => !entry.locked && entry.x === local.x && entry.y === local.y,
    );
    if (!entrance || previousRoom !== room.id) {
      return;
    }
    this.enterLayer(entrance, roomsChanged);
  }

  private enterLayer(entrance: LayerEntrance, roomsChanged: Set<string>): void {
    if (entrance.locked) {
      this.setFlag('ui.questInteraction', { message: 'The entrance is locked.' });
      return;
    }
    const ensured = this.world.ensureLayerInstance(entrance);
    const instance = this.world.setLayerInstanceState(ensured.id, 'active') ?? ensured;
    const layerRoom = this.world.getRoom(instance.id);
    this.snake.teleportTo(instance.id, instance.spawn, { x: 0, y: -1 });
    this.visitedRooms.add(instance.id);
    const runtime: LayerRuntimeState = {
      layerId: instance.id,
      parentRoomId: instance.parentRoomId,
      entranceId: instance.entranceId,
      returnPosition: instance.returnPosition,
      templateId: instance.templateId,
      roomStack: [instance.id],
    };
    this.setFlag('layers.active', runtime);
    this.setFlag('traversal.manualResumePending', true);
    this.setFlag('ui.questInteraction', {
      message:
        instance.kind === 'townInterior' && instance.templateId === 'thievesGuild'
          ? 'You slip down into the Thieves Guild.'
          : `You enter ${instance.displayName ?? 'the building'}.`,
    });
    if (layerRoom.town) {
      this.applyTownRuntimeToRoom(layerRoom);
      this.maybeMarkTownHostility(layerRoom);
    }
    roomsChanged.add(instance.parentRoomId);
    roomsChanged.add(instance.id);
  }

  private exitCurrentLayer(roomsChanged: Set<string>): void {
    const runtime = this.getFlag<LayerRuntimeState>('layers.active');
    if (!runtime) {
      return;
    }
    this.snake.teleportTo(runtime.parentRoomId, runtime.returnPosition, { x: 0, y: 1 });
    this.world.setLayerInstanceState(runtime.layerId, 'completed');
    this.setFlag('layers.active', undefined);
    this.setFlag('traversal.manualResumePending', true);
    this.setFlag('ui.questInteraction', { message: 'You step back outside.' });
    roomsChanged.add(runtime.layerId);
    roomsChanged.add(runtime.parentRoomId);
  }

  private enterCave(
    entrance: CaveEntrance,
    parentRoomId: string,
    returnPosition: Vector2Like,
    roomsChanged: Set<string>,
  ): void {
    const save = this.ensureCaveSave(entrance, parentRoomId);
    if (save.state === 'collapsed') {
      this.setFlag('ui.questInteraction', { message: 'The cave has collapsed.' });
      return;
    }
    save.state = 'active';
    this.writeCaveSave(save);
    this.world.setCaveSave(save);
    const caveRoom = this.world.getRoom(entrance.caveId);
    const spawn = caveRoom.cave?.spawn ?? {
      x: Math.floor(this.config.grid.cols / 2),
      y: this.config.grid.rows - 3,
    };
    this.snake.teleportTo(entrance.caveId, spawn, { x: 0, y: -1 });
    this.visitedRooms.add(entrance.caveId);
    const template = getCaveTemplate(entrance.templateId);
    const runtime: CaveRuntimeState = {
      caveId: entrance.caveId,
      parentRoomId,
      entranceId: entrance.id,
      returnPosition,
      templateId: entrance.templateId,
    };
    if (template.timerSeconds) {
      const ticks = Math.max(1, Math.round((template.timerSeconds * 1000) / 100));
      runtime.timerTicks = ticks;
      runtime.timerTotalTicks = ticks;
      runtime.appleRushRemaining = this.resolveCaveAppleCount(entrance.templateId, entrance.caveId);
      this.refillCaveRushApples(caveRoom.id, entrance.templateId, runtime);
    }
    if (caveRoom.cave?.enemyCount) {
      this.enemies.ensureCaveEnemies(
        caveRoom.id,
        caveRoom,
        this.snake.bodySegments,
        caveRoom.cave.enemyCount,
      );
    }
    this.setFlag('caves.active', runtime);
    this.setFlag('traversal.manualResumePending', true);
    this.setFlag('ui.questInteraction', { message: 'You descend into the cave.' });
    roomsChanged.add(parentRoomId);
    roomsChanged.add(entrance.caveId);
  }

  private exitCurrentCave(
    roomsChanged: Set<string>,
    reason: 'manual' | 'timer' | 'reward' = 'manual',
  ): void {
    const runtime = this.getFlag<CaveRuntimeState>('caves.active');
    if (!runtime) {
      return;
    }
    const template = getCaveTemplate(runtime.templateId);
    const save = this.ensureCaveSave(
      {
        id: runtime.entranceId,
        caveId: runtime.caveId,
        x: runtime.returnPosition.x,
        y: runtime.returnPosition.y,
        templateId: runtime.templateId,
        collapsed: false,
      },
      runtime.parentRoomId,
    );
    const collapse = reason === 'timer' ? template.collapseOnTimerEnd : template.collapseOnExit;
    save.state = collapse ? 'collapsed' : 'completed';
    this.writeCaveSave(save);
    this.world.setCaveSave(save);
    this.collapseParentEntrance(runtime, collapse);
    this.apples.clearRoomApple(runtime.caveId);
    const exitDirection = this.findSafeCaveExitDirection(
      runtime.parentRoomId,
      runtime.returnPosition,
    );
    this.snake.teleportTo(runtime.parentRoomId, runtime.returnPosition, exitDirection);
    this.setFlag('traversal.exitDirectionLockTicks', 1);
    this.setFlag('caves.active', undefined);
    this.setFlag('caves.timer', undefined);
    this.setFlag('traversal.manualResumePending', true);
    this.setFlag('ui.caveTransition', {
      caveId: runtime.caveId,
      parentRoomId: runtime.parentRoomId,
      collapsed: collapse,
      reason,
    });
    this.setFlag('ui.questInteraction', {
      message: collapse ? 'The cave collapses behind you.' : 'You climb back out of the cave.',
    });
    roomsChanged.add(runtime.caveId);
    roomsChanged.add(runtime.parentRoomId);
  }

  private findSafeCaveExitDirection(roomId: string, position: Vector2Like): Vector2Like {
    const room = this.world.getRoom(roomId);
    const candidates: Vector2Like[] = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
    ];
    return (
      candidates.find((direction) => {
        const x = position.x + direction.x;
        const y = position.y + direction.y;
        const tile = room.layout[y]?.[x];
        return Boolean(tile && tile !== '#' && tile !== '~' && !isBlockingTownTile(tile));
      }) ?? candidates[0]!
    );
  }

  private tickActiveCaveTimer(roomsChanged: Set<string>): boolean {
    const runtime = this.getFlag<CaveRuntimeState>('caves.active');
    if (!runtime?.timerTicks) {
      return false;
    }
    if (this.snake.currentRoomId !== runtime.caveId) {
      return false;
    }
    const next = Math.max(0, runtime.timerTicks - 1);
    const updated = { ...runtime, timerTicks: next };
    this.setFlag('caves.active', updated);
    this.setFlag('caves.timer', {
      caveId: runtime.caveId,
      remaining: next,
      total: runtime.timerTotalTicks ?? next,
    });
    if (next > 0) {
      return false;
    }
    this.exitCurrentCave(roomsChanged, 'timer');
    return true;
  }

  private handleCaveAppleEaten(roomsChanged: Set<string>): AppleSnapshot | null {
    const runtime = this.getFlag<CaveRuntimeState>('caves.active');
    if (!runtime || runtime.caveId !== this.snake.currentRoomId) {
      return this.apples.getSnapshot(this.snake.currentRoomId);
    }
    if (runtime.appleRushRemaining === undefined) {
      return this.apples.getSnapshot(runtime.caveId);
    }
    const remaining = Math.max(0, (runtime.appleRushRemaining ?? 0) - 1);
    const updated = { ...runtime, appleRushRemaining: remaining };
    this.setFlag('caves.active', updated);
    roomsChanged.add(runtime.caveId);
    if (remaining <= 0) {
      this.setFlag('achievement.caveAppleRushCleared', {
        caveId: runtime.caveId,
        templateId: runtime.templateId,
      });
      this.exitCurrentCave(roomsChanged, 'reward');
      return null;
    }
    this.refillCaveRushApples(runtime.caveId, runtime.templateId, updated);
    return this.apples.getSnapshot(runtime.caveId);
  }

  private refillCaveRushApples(
    caveId: string,
    templateId: CaveRuntimeState['templateId'],
    runtime: CaveRuntimeState,
  ): void {
    const remaining = Math.max(0, runtime.appleRushRemaining ?? 0);
    const target = Math.min(remaining, this.getCaveRushActiveAppleLimit(templateId, remaining));
    const current = this.apples.getSnapshots(caveId).length;
    for (let i = current; i < target; i += 1) {
      this.spawnCaveRushApple(caveId, templateId, runtime, i);
    }
  }

  private getCaveRushActiveAppleLimit(
    templateId: CaveRuntimeState['templateId'],
    remaining: number,
  ): number {
    if (templateId === 'skittishAppleRush') {
      return remaining;
    }
    if (templateId === 'caffeinatedAppleRush') {
      return Math.min(5, remaining);
    }
    if (templateId === 'goldenAppleRush') {
      return Math.min(3, remaining);
    }
    return Math.min(1, remaining);
  }

  private spawnCaveRushApple(
    caveId: string,
    templateId: CaveRuntimeState['templateId'],
    runtime: CaveRuntimeState,
    index: number,
  ): AppleSnapshot | null {
    const room = this.world.getRoom(caveId);
    const template = getCaveTemplate(templateId);
    const typeId = template.applePool?.typeId ?? 'gold';
    const occupied = Array.from(this.snake.bodySegments);
    const existing = this.apples.getSnapshots(caveId).map((apple) => apple.position);
    const seed = `${caveId}:${runtime.appleRushRemaining ?? 0}:${typeId}:${index}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    const options: Vector2Like[] = [];
    for (let y = 2; y < this.config.grid.rows - 4; y += 1) {
      for (let x = 2; x < this.config.grid.cols - 2; x += 1) {
        if (room.layout[y]?.[x] !== '.') continue;
        if (occupied.some((segment) => segment.x === x && segment.y === y)) continue;
        if (existing.some((apple) => apple.x === x && apple.y === y)) continue;
        options.push({ x, y });
      }
    }
    const position = options[hash % Math.max(1, options.length)] ?? room.cave?.spawn;
    if (!position) {
      return null;
    }
    return this.apples.placeApple(caveId, position, typeId, occupied, true).snapshot;
  }

  private resolveCaveAppleCount(
    templateId: CaveRuntimeState['templateId'],
    caveId: string,
  ): number {
    const pool = getCaveTemplate(templateId).applePool;
    if (!pool) {
      return 0;
    }
    if (pool.minCount !== undefined && pool.maxCount !== undefined) {
      let hash = 0;
      for (let i = 0; i < caveId.length; i += 1) hash = (hash * 31 + caveId.charCodeAt(i)) >>> 0;
      return pool.minCount + (hash % (pool.maxCount - pool.minCount + 1));
    }
    return pool.count;
  }

  private ensureCaveSave(entrance: CaveEntrance, parentRoomId: string): CaveInstanceSaveData {
    const caveState = this.getCaveSaveState();
    const existing = caveState.caveInstances[entrance.caveId];
    if (existing) {
      return { ...existing };
    }
    return createDefaultCaveSave(entrance.caveId, parentRoomId, entrance.templateId);
  }

  private getCaveSaveState(): CaveSaveState {
    return this.getFlag<CaveSaveState>('caves.save') ?? { caveInstances: {} };
  }

  private writeCaveSave(save: CaveInstanceSaveData): void {
    const state = this.getCaveSaveState();
    this.setFlag('caves.save', {
      caveInstances: {
        ...state.caveInstances,
        [save.id]: save,
      },
    } satisfies CaveSaveState);
  }

  private markCaveRewardClaimed(roomId: string): void {
    if (!isCaveRoomId(roomId)) {
      return;
    }
    const runtime = this.getFlag<CaveRuntimeState>('caves.active');
    const room = this.world.getRoom(roomId);
    const templateId = runtime?.templateId ?? room.cave?.templateId;
    const parentRoomId = runtime?.parentRoomId ?? room.cave?.parentRoomId;
    if (!templateId || !parentRoomId) {
      return;
    }
    const save = this.ensureCaveSave(
      {
        id: `${roomId}:entrance`,
        caveId: roomId,
        x: 0,
        y: 0,
        templateId,
        collapsed: false,
      },
      parentRoomId,
    );
    save.rewardClaimed = true;
    save.openedChestIds = Array.from(new Set([...save.openedChestIds, `${roomId}:chest`]));
    save.state = 'completed';
    this.writeCaveSave(save);
    this.world.setCaveSave(save);
  }

  private claimCaveLakeReward(roomId: string, itemId: string, head: Vector2Like): void {
    const room = this.world.getRoom(roomId);
    if (!room.cave) {
      return;
    }
    const save = this.ensureCaveSave(
      {
        id: `${roomId}:entrance`,
        caveId: roomId,
        x: 0,
        y: 0,
        templateId: room.cave.templateId,
        collapsed: false,
      },
      room.cave.parentRoomId,
    );
    if (save.collectedItemIds.includes(itemId)) {
      return;
    }
    const rewardId = this.pickCaveRewardId(room.cave.templateId, itemId);
    this.inventory.addItem(rewardId, 1);
    save.collectedItemIds = [...save.collectedItemIds, itemId];
    this.writeCaveSave(save);
    this.world.setCaveSave(save);
    this.setFlag('loot.itemPicked', {
      head,
      itemName: getItem(rewardId)?.name ?? rewardId,
      itemId: rewardId,
    });
    this.setFlag('ui.treasurePickup', { x: head.x, y: head.y, roomId });
  }

  claimCaveDwellerReward(): {
    state: 'none' | 'claimed' | 'available';
    itemId?: string;
    itemName?: string;
    pages: string[];
  } {
    const room = this.getCurrentRoom();
    if (!room.cave || room.cave.templateId !== 'caveDweller') {
      return { state: 'none', pages: [] };
    }
    const save = this.ensureCaveSave(
      {
        id: `${room.id}:entrance`,
        caveId: room.id,
        x: 0,
        y: 0,
        templateId: room.cave.templateId,
        collapsed: false,
      },
      room.cave.parentRoomId,
    );
    if (save.rewardClaimed || room.cave.dwellerRewardClaimed) {
      return {
        state: 'claimed',
        pages: [
          'The cave dweller taps the wall twice and listens.',
          'I already gave you what the stone owed me. If the cave still wants payment, make sure it pays you first.',
        ],
      };
    }
    const rewardId = 'helm-cave-echo';
    const itemName = getItem(rewardId)?.name ?? rewardId;
    const head = this.snake.bodySegments[0] ?? { x: 0, y: 0 };
    this.inventory.addItem(rewardId, 1);
    save.rewardClaimed = true;
    save.state = 'completed';
    this.writeCaveSave(save);
    this.world.setCaveSave(save);
    room.cave.dwellerRewardClaimed = true;
    this.setFlag('loot.itemPicked', {
      head,
      itemName,
      itemId: rewardId,
    });
    this.setFlag('ui.treasurePickup', { x: head.x, y: head.y, roomId: room.id });
    return {
      state: 'available',
      itemId: rewardId,
      itemName,
      pages: [
        'The cave dweller does not look surprised to see a snake. They look surprised the cave let you keep your shape.',
        'Most caves are not cold. This one is. Stone has moods, and old stone remembers winter better than sunlight.',
        `A snake should never enter a cave unarmed. Take the ${itemName}. It makes walls speak before they bite.`,
      ],
    };
  }

  private pickCaveRewardId(templateId: CaveRuntimeState['templateId'], salt: string): string {
    const table: Array<{ id: string; weight: number }> =
      templateId === 'lakeTreasure'
        ? [
            { id: 'amulet-phoenix', weight: 3 },
            { id: 'boots-lead-flippers', weight: 3 },
            { id: 'amulet-scavenger', weight: 2 },
            { id: 'belt-regenerator', weight: 2 },
            { id: 'belt-smuggler-cache', weight: 1 },
            { id: 'ring-seismic', weight: 2 },
            { id: 'weapon-revolver', weight: 1 },
            { id: 'helm-cave-echo', weight: 1 },
          ]
        : templateId === 'monsterDen'
          ? [
              { id: 'amulet-phoenix', weight: 4 },
              { id: 'boots-lead-flippers', weight: 3 },
              { id: 'amulet-scavenger', weight: 2 },
              { id: 'belt-regenerator', weight: 2 },
              { id: 'ring-back-alley-dividend', weight: 1 },
              { id: 'ring-seismic', weight: 1 },
            ]
          : [
              { id: 'ring-seismic', weight: 2 },
              { id: 'weapon-revolver', weight: 2 },
              { id: 'boots-swim-fins', weight: 1 },
              { id: 'amulet-phoenix', weight: 1 },
            ];
    let hash = 0;
    for (let i = 0; i < salt.length + templateId.length; i += 1) {
      hash =
        (hash * 31 + `${templateId}:${salt}`.charCodeAt(i % `${templateId}:${salt}`.length)) >>> 0;
    }
    const total = table.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = hash % total;
    for (const entry of table) {
      cursor -= entry.weight;
      if (cursor < 0) {
        return entry.id;
      }
    }
    return table[0]?.id ?? 'ring-seismic';
  }

  private collapseParentEntrance(runtime: CaveRuntimeState, collapse?: boolean): void {
    if (!collapse) {
      return;
    }
    const room = this.world.getRoom(runtime.parentRoomId);
    const entrance = room.caveEntrances?.find((entry) => entry.caveId === runtime.caveId);
    if (!entrance) {
      return;
    }
    entrance.collapsed = true;
    this.setRoomTile(runtime.parentRoomId, entrance.x, entrance.y, CAVE_RUBBLE_TILE);
  }

  private actorStep(): {
    enemyStep: {
      meleeHits: number;
      hitStyle?: BulletInstance['style'];
    };
    animalStep: {
      tames: number;
      damageDealt: number;
      damageTaken: number;
      hunted: number;
      startleCount: number;
      huntedAnimals: HuntedAnimalResult[];
    };
  } {
    this.tickFactionRaidGameplay();
    const enemyStepResult = this.enemies.stepEnemies({
      getRoom: (roomId: string) => this.world.getRoom(roomId),
      snake: this.snake.bodySegments,
      currentRoomId: this.snake.currentRoomId,
      snakeDirection: this.snake.directionVector,
    });
    const enemyStep = {
      meleeHits: enemyStepResult.meleeHits ?? 0,
      hitStyle: enemyStepResult.hitStyle,
    };
    const animalStep = this.animals.step({
      getRoom: (roomId: string) => this.world.getRoom(roomId),
      snake: this.snake.bodySegments,
      currentRoomId: this.snake.currentRoomId,
      snakeDirection: this.snake.directionVector,
      canHuntHarmless: this.canHuntHarmlessAnimals(),
    });

    const room = this.world.getRoom(this.snake.currentRoomId);
    this.applyTownRuntimeToRoom(room);
    this.syncActorsForRoom(room);
    this.tickNpcBodies(room);
    this.syncActorsForRoom(room);

    return { enemyStep, animalStep };
  }

  private async actorStepPhase(options: {
    roomsChanged: Set<string>;
    previousRoom: string;
    roomHasChanged: boolean;
    appleEaten: boolean;
    appleRewards?: AppleConsumptionResult['rewards'];
    appleWorldPosition?: Vector2Like | null;
    appleSnapshot: AppleSnapshot | null;
    appleStateChanged: boolean;
  }): Promise<StepResult | null> {
    const { enemyStep, animalStep } = this.actorStep();
    const rivalStep = this.stepRivalSnakeEnemies(options.roomsChanged);
    if (rivalStep.currentRoomAppleChanged) {
      options.appleSnapshot = this.apples.getSnapshot(this.snake.currentRoomId);
      options.appleStateChanged = true;
    }
    this.resolveRivalSnakeHeadCollision(options.roomsChanged);
    if (this.checkRivalSnakeBodyCollision()) {
      this.markDeathAtCurrentHead('roaming-snake');
      return this.createActorDeathStepResult('roaming-snake', options);
    }

    // 3. stepRoamingSnakes (roaming snake movement)
    this.stepRoamingSnakes(options.roomsChanged);

    // 4. Check: roaming snake head on player body → roaming snake dies
    this.resolveRoamingSnakeHeadCollision(options.roomsChanged);

    // 5. Check: player head on roaming snake body → player dies
    if (this.checkRoamingSnakeBodyCollision()) {
      this.markDeathAtCurrentHead('roaming-snake');
      return this.createActorDeathStepResult('roaming-snake', options);
    }

    const enemyMeleeDamageKills = this.applyBulletDamage(enemyStep.meleeHits, enemyStep.hitStyle);
    if (animalStep.damageTaken > 0 || enemyMeleeDamageKills) {
      if (
        this.tryFortitudePhoenix(
          { status: 'dead', reason: 'boss' },
          options.roomsChanged,
          options.previousRoom,
        )
      ) {
        return this.createAliveStepResult(options);
      }
      this.markDeathAtCurrentHead('boss');
      return this.createActorDeathStepResult('boss', options);
    }

    if (animalStep.hunted > 0) {
      for (const huntedAnimal of animalStep.huntedAnimals) {
        this.awardHuntedAnimal(huntedAnimal);
      }
    }
    if (animalStep.startleCount > 0) {
      options.roomsChanged.add(this.snake.currentRoomId);
    }
    if (
      this.getFlag<boolean>('npc.freakJoey.active') &&
      !this.enemies.hasEnemyWithId('freak-joey')
    ) {
      this.setFlag('npc.freakJoey.active', undefined);
      this.setFlag('npc.freakJoey.defeated', true);
      this.resolvedWandererEncounters.add('freak-joey');
      this.addScore(25);
    }
    const activeDuel = this.getFlag<{ id: string; rewardScore?: number }>('npc.activeDuel');
    if (activeDuel && !this.enemies.hasEnemyWithId(activeDuel.id)) {
      if (activeDuel.id !== 'freak-joey' && activeDuel.rewardScore) {
        this.addScore(activeDuel.rewardScore);
      }
      this.setFlag('npc.activeDuel', undefined);
    }

    return null;
  }

  private stepRivalSnakeEnemies(roomsChanged: Set<string>): { currentRoomAppleChanged: boolean } {
    let currentRoomAppleChanged = false;
    const rivals = [...this.enemies.getRivalSnakes()];
    for (const rival of rivals) {
      const body = rival.body?.map((segment) => ({ ...segment })) ?? [{ ...rival.position }];
      if (body.length === 0) {
        this.enemies.removeEnemy(rival.id);
        roomsChanged.add(rival.roomId);
        continue;
      }

      if (rival.moveCooldown > 0) {
        this.enemies.updateEnemy({
          ...rival,
          body,
          moveCooldown: Math.max(0, rival.moveCooldown - 1),
          fireCooldown: 999,
        });
        continue;
      }

      const move = this.resolveRivalSnakeMove({ ...rival, body });
      if (!move) {
        this.enemies.updateEnemy({
          ...rival,
          body,
          moveCooldown: 1,
          fireCooldown: 999,
          flashTicks: Math.max(0, rival.flashTicks - 1),
        });
        continue;
      }

      const nextRival: EnemyInstance = {
        ...rival,
        roomId: move.roomId,
        position: { ...move.body[0] },
        body: move.body,
        aimDirection: move.direction,
        moveCooldown: 0,
        fireCooldown: 999,
        flashTicks: Math.max(0, rival.flashTicks - 1),
      };
      const previousRoomId = rival.roomId;
      this.enemies.updateEnemy(nextRival);
      roomsChanged.add(previousRoomId);
      roomsChanged.add(nextRival.roomId);
      if (previousRoomId !== nextRival.roomId) {
        console.info('[SnakeGame] Rival snake changed rooms.', {
          enemyId: nextRival.id,
          fromRoomId: previousRoomId,
          toRoomId: nextRival.roomId,
          head: nextRival.position,
        });
      }

      const ateCurrentRoomApple = this.consumeAppleForRivalSnake(nextRival, roomsChanged);
      currentRoomAppleChanged ||= ateCurrentRoomApple;
    }
    return { currentRoomAppleChanged };
  }

  private resolveRivalSnakeHeadCollision(roomsChanged: Set<string>): void {
    const playerSegments = Array.from(this.snake.bodySegments);
    for (const rival of this.enemies.getRivalSnakes()) {
      if (rival.roomId !== this.snake.currentRoomId) continue;
      const body = rival.body?.map((segment) => ({ ...segment })) ?? [{ ...rival.position }];
      const head = body[0] ?? rival.position;
      const localPlayerSegments = playerSegments.map((segment) =>
        this.worldToLocal(rival.roomId, segment),
      );
      if (localPlayerSegments.some((segment) => segment.x === head.x && segment.y === head.y)) {
        const defeated = this.enemies.removeEnemy(rival.id) ?? rival;
        this.setEnemySnakeDefeatedFeedback(defeated, head, 'ran-into-player');
        roomsChanged.add(rival.roomId);
      }
    }
  }

  private checkRivalSnakeBodyCollision(): boolean {
    const playerHead = this.snake.bodySegments[0];
    if (!playerHead) return false;
    for (const rival of this.enemies.getRivalSnakes()) {
      if (rival.roomId !== this.snake.currentRoomId) continue;
      const localHead = this.worldToLocal(rival.roomId, playerHead);
      const body = rival.body ?? [rival.position];
      for (const segment of body.slice(1)) {
        if (segment.x === localHead.x && segment.y === localHead.y) {
          return true;
        }
      }
    }
    return false;
  }

  private stepRoamingSnakes(roomsChanged: Set<string>): void {
    if (this.snake.bodySegments.length === 0) return;

    const roamingSnakes = this.enemies.getRoamingSnakes();
    if (roamingSnakes.length === 0) return;

    for (const snake of roamingSnakes) {
      const body = snake.body?.map((seg) => ({ ...seg })) ?? [{ ...snake.position }];
      if (body.length === 0) {
        this.enemies.removeEnemy(snake.id);
        roomsChanged.add(snake.roomId);
        continue;
      }

      if (snake.moveCooldown > 0) {
        snake.moveCooldown--;
        this.enemies.updateEnemy(snake);
        continue;
      }

      const room = this.world.getRoom(snake.roomId);

      const allBodySegments: Vector2Like[] = [];

      for (const rival of this.enemies.getRivalSnakes()) {
        if (rival.body) {
          allBodySegments.push(...rival.body.map((s) => ({ ...s })));
        }
      }

      for (const other of this.enemies.getRoamingSnakes()) {
        if (other.body) {
          allBodySegments.push(...other.body.map((s) => ({ ...s })));
        }
      }

      const obstacleSet = new Set(allBodySegments.map((s) => `${s.x},${s.y}`));

      const result = this.enemies.getRoamingSnakeMoveTarget(
        { ...snake, body } as EnemyInstance & { body: Vector2Like[] },
        snake.roomId,
        room,
        obstacleSet,
        this._rng,
      );

      if (!result) {
        snake.moveCooldown = (this.config.roamingSnakes ?? defaultRoamingSnakeConfig).moveCooldown;
        this.enemies.updateEnemy(snake);
        continue;
      }

      const newHead = { x: snake.position.x + result.dir.x, y: snake.position.y + result.dir.y };
      let newRoomId = snake.roomId;

      if (!isCaveRoomId(snake.roomId)) {
        const roomDx = newHead.x < 0 ? -1 : newHead.x >= this.config.grid.cols ? 1 : 0;
        const roomDy = newHead.y < 0 ? -1 : newHead.y >= this.config.grid.rows ? 1 : 0;

        if (roomDx !== 0 || roomDy !== 0) {
          const shifted = this.shiftRoomId(snake.roomId, roomDx, roomDy);
          if (!shifted) {
            snake.moveCooldown = 1;
            this.enemies.updateEnemy(snake);
            continue;
          }
          newRoomId = shifted;
          if (newHead.x < 0) newHead.x = this.config.grid.cols - 1;
          else if (newHead.x >= this.config.grid.cols) newHead.x = 0;
          if (newHead.y < 0) newHead.y = this.config.grid.rows - 1;
          else if (newHead.y >= this.config.grid.rows) newHead.y = 0;
        }
      }

      const newBody: Vector2Like[] = [newHead, ...body.slice(0, -1)];

      const targetRoom = this.world.getRoom(newRoomId);
      const targetLocal = newHead;
      const tile = targetRoom.layout[targetLocal.y]?.[targetLocal.x];
      if (tile === '#' || tile === '~') {
        snake.moveCooldown = 1;
        this.enemies.updateEnemy(snake);
        continue;
      }

      const previousRoomId = snake.roomId;
      this.enemies.updateEnemy({
        ...snake,
        roomId: newRoomId,
        position: { ...newHead },
        body: newBody,
        aimDirection: result.dir,
        moveCooldown: (this.config.roamingSnakes ?? defaultRoamingSnakeConfig).moveCooldown,
        flashTicks: Math.max(0, snake.flashTicks - 1),
      });
      roomsChanged.add(previousRoomId);
      if (previousRoomId !== newRoomId) {
        roomsChanged.add(newRoomId);
      }
    }
  }

  private resolveRoamingSnakeHeadCollision(roomsChanged: Set<string>): void {
    const playerSegments = Array.from(this.snake.bodySegments);
    const roamingSnakes = this.enemies.getRoamingSnakes();

    for (const snake of roamingSnakes) {
      const body = snake.body?.map((seg) => ({ ...seg })) ?? [{ ...snake.position }];
      if (body.length === 0) continue;

      const head = body[0];
      const localPlayerSegments = playerSegments.map((segment) =>
        this.worldToLocal(snake.roomId, segment),
      );
      if (localPlayerSegments.some((p) => p.x === head.x && p.y === head.y)) {
        const defeated = this.enemies.removeEnemy(snake.id) ?? snake;
        this.setEnemySnakeDefeatedFeedback(defeated, head, 'ran-into-player');
        roomsChanged.add(snake.roomId);
      }
    }
  }

  private checkRoamingSnakeBodyCollision(): boolean {
    const playerHead = this.snake.bodySegments[0];
    if (!playerHead) return false;

    const roamingSnakes = this.enemies.getRoamingSnakes();

    for (const snake of roamingSnakes) {
      if (snake.roomId !== this.snake.currentRoomId) continue;
      const localHead = this.worldToLocal(snake.roomId, playerHead);
      const body = snake.body ?? [snake.position];
      for (const segment of body) {
        if (segment.x === localHead.x && segment.y === localHead.y) {
          return true;
        }
      }
    }
    return false;
  }

  private setEnemySnakeDefeatedFeedback(
    enemy: EnemyInstance,
    localHead: Vector2Like,
    reason: 'ran-into-player' | 'apple',
  ): void {
    const world = this.localToWorld(enemy.roomId, localHead);
    this.setFlag('ui.enemySnakeDefeated', {
      x: world.x,
      y: world.y,
      roomId: enemy.roomId,
      kind: enemy.encounterKind,
      reason,
      length: enemy.body?.length ?? 1,
    });
  }

  private noteEnemySnakePressure(): void {
    const head = this.snake.bodySegments[0];
    if (!head) return;
    const roomId = this.snake.currentRoomId;
    const localHead = this.worldToLocal(roomId, head);
    let closest: { enemy: EnemyInstance; localHead: Vector2Like; distance: number } | null = null;
    const candidates = [
      ...this.enemies.getRivalSnakes(),
      ...this.enemies.getRoamingSnakes(),
    ].filter((enemy) => enemy.roomId === roomId);
    for (const enemy of candidates) {
      const enemyHead = enemy.body?.[0] ?? enemy.position;
      const distance = this.distance(localHead, enemyHead);
      if (distance <= 3 && (!closest || distance < closest.distance)) {
        closest = { enemy, localHead: enemyHead, distance };
      }
    }
    if (!closest) return;
    const world = this.localToWorld(roomId, closest.localHead);
    this.setFlag('ui.enemySnakeNear', {
      x: world.x,
      y: world.y,
      roomId,
      distance: closest.distance,
      kind: closest.enemy.encounterKind,
    });
  }

  private consumeAppleForRivalSnake(rival: EnemyInstance, roomsChanged: Set<string>): boolean {
    const consumption = this.apples.handleConsumption(
      rival.roomId,
      rival.aimDirection,
      false,
      rival.position,
    );
    if (!consumption.changed && !consumption.typeId) {
      return false;
    }

    roomsChanged.add(rival.roomId);
    if (consumption.fatal) {
      const defeated = this.enemies.removeEnemy(rival.id) ?? rival;
      this.setEnemySnakeDefeatedFeedback(defeated, rival.position, 'apple');
      console.info('[SnakeGame] Rival snake died eating apple.', {
        enemyId: rival.id,
        roomId: rival.roomId,
        head: rival.position,
        appleTypeId: consumption.typeId,
      });
      return rival.roomId === this.snake.currentRoomId;
    }

    const score = Math.max(0, (rival.score ?? 0) + Math.max(0, consumption.rewards.bonusScore));
    const body = rival.body?.map((segment) => ({ ...segment })) ?? [{ ...rival.position }];
    const tail = body[body.length - 1] ?? rival.position;
    for (let i = 0; i < Math.max(0, consumption.rewards.growth); i += 1) {
      body.push({ ...tail });
    }
    const updated: EnemyInstance = {
      ...rival,
      body,
      score,
      flashTicks: 2,
    };
    this.enemies.updateEnemy(updated);
    const spawn = this.apples.ensureApple(
      rival.roomId,
      this.getRivalAppleOccupiedSegments(rival.roomId),
      score,
    );
    if (spawn.changed) {
      roomsChanged.add(rival.roomId);
    }
    console.info('[SnakeGame] Rival snake ate apple.', {
      enemyId: rival.id,
      roomId: rival.roomId,
      head: rival.position,
      appleTypeId: consumption.typeId,
      score,
      length: body.length,
      spawnedReplacement: spawn.changed,
    });
    return rival.roomId === this.snake.currentRoomId;
  }

  private resolveRivalSnakeMove(
    rival: EnemyInstance & { body: Vector2Like[] },
  ): { roomId: string; body: Vector2Like[]; direction: Vector2Like } | null {
    const directions = this.getRivalSnakeDirections(rival);
    for (const direction of directions) {
      const move = this.getRivalSnakeMoveTarget(rival, direction);
      if (!move) {
        continue;
      }
      const nextBody =
        move.roomId === rival.roomId
          ? [move.position, ...rival.body.slice(0, -1).map((segment) => ({ ...segment }))]
          : this.buildRivalSnakeBodyAfterRoomChange(
              move.roomId,
              move.position,
              direction,
              rival.body.length,
            );
      if (this.canRivalSnakeOccupy(move.roomId, nextBody, rival.id)) {
        return { roomId: move.roomId, body: nextBody, direction };
      }
    }
    return null;
  }

  private getRivalSnakeDirections(rival: EnemyInstance & { body?: Vector2Like[] }): Vector2Like[] {
    const apple = this.apples.getSnapshot(rival.roomId)?.position;
    const pathDirection = apple ? this.findRivalSnakePathDirection(rival, apple) : null;
    const preferred = pathDirection ? [pathDirection] : [];
    const fallback =
      (rival.score ?? 0) % 2 === 0
        ? [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 0, y: -1 },
          ]
        : [
            { x: 0, y: -1 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
          ];
    const seen = new Set<string>();
    return [...preferred, ...fallback].filter((direction) => {
      if (direction.x === 0 && direction.y === 0) return false;
      const key = `${direction.x},${direction.y}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private findRivalSnakePathDirection(
    rival: EnemyInstance & { body?: Vector2Like[] },
    target: Vector2Like,
  ): Vector2Like | null {
    const start = rival.position;
    if (start.x === target.x && start.y === target.y) {
      return null;
    }

    const body = rival.body ?? [rival.position];
    const blocked = new Set(
      body
        .slice(0, -1)
        .filter((segment) => segment.x !== start.x || segment.y !== start.y)
        .map((segment) => `${segment.x},${segment.y}`),
    );
    for (const enemy of this.enemies.getEnemiesInRoom(rival.roomId)) {
      if (enemy.id !== rival.id) {
        blocked.add(`${enemy.position.x},${enemy.position.y}`);
      }
    }

    const queue: Array<{ position: Vector2Like; first: Vector2Like | null }> = [
      { position: start, first: null },
    ];
    const visited = new Set([`${start.x},${start.y}`]);
    const directions: Vector2Like[] = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        break;
      }
      for (const direction of directions) {
        const next = {
          x: current.position.x + direction.x,
          y: current.position.y + direction.y,
        };
        const key = `${next.x},${next.y}`;
        if (
          visited.has(key) ||
          blocked.has(key) ||
          !this.isRivalSnakeLocalTileOpen(rival.roomId, next)
        ) {
          continue;
        }
        const first = current.first ?? direction;
        if (next.x === target.x && next.y === target.y) {
          return first;
        }
        visited.add(key);
        queue.push({ position: next, first });
      }
    }

    return null;
  }

  private getRivalSnakeMoveTarget(
    rival: EnemyInstance,
    direction: Vector2Like,
  ): { roomId: string; position: Vector2Like } | null {
    if (isCaveRoomId(rival.roomId)) {
      const position = {
        x: rival.position.x + direction.x,
        y: rival.position.y + direction.y,
      };
      return { roomId: rival.roomId, position };
    }

    let roomId = rival.roomId;
    let x = rival.position.x + direction.x;
    let y = rival.position.y + direction.y;
    let roomDx = 0;
    let roomDy = 0;
    if (x < 0) {
      x = this.config.grid.cols - 1;
      roomDx = -1;
    } else if (x >= this.config.grid.cols) {
      x = 0;
      roomDx = 1;
    }
    if (y < 0) {
      y = this.config.grid.rows - 1;
      roomDy = -1;
    } else if (y >= this.config.grid.rows) {
      y = 0;
      roomDy = 1;
    }
    if (roomDx !== 0 || roomDy !== 0) {
      const shifted = this.shiftRoomId(roomId, roomDx, roomDy);
      if (!shifted) {
        return null;
      }
      roomId = shifted;
    }
    return { roomId, position: { x, y } };
  }

  private buildRivalSnakeBodyAfterRoomChange(
    roomId: string,
    head: Vector2Like,
    direction: Vector2Like,
    length: number,
  ): Vector2Like[] {
    const body: Vector2Like[] = [];
    for (let i = 0; i < Math.max(1, length); i += 1) {
      body.push({
        x: Math.min(Math.max(head.x + direction.x * i, 0), this.config.grid.cols - 1),
        y: Math.min(Math.max(head.y + direction.y * i, 0), this.config.grid.rows - 1),
      });
    }
    return body.filter((segment) => this.isRivalSnakeLocalTileOpen(roomId, segment));
  }

  private canRivalSnakeOccupy(
    roomId: string,
    body: readonly Vector2Like[],
    enemyId: string,
  ): boolean {
    if (body.length === 0) {
      return false;
    }
    const seen = new Set<string>();
    for (const segment of body) {
      const key = `${segment.x},${segment.y}`;
      if (seen.has(key) || !this.isRivalSnakeLocalTileOpen(roomId, segment)) {
        return false;
      }
      seen.add(key);
    }
    const otherEnemies = this.enemies
      .getEnemiesInRoom(roomId)
      .filter((enemy) => enemy.id !== enemyId);
    return !body.some((segment) =>
      otherEnemies.some(
        (enemy) => enemy.position.x === segment.x && enemy.position.y === segment.y,
      ),
    );
  }

  private isRivalSnakeLocalTileOpen(roomId: string, local: Vector2Like): boolean {
    if (
      local.x < 0 ||
      local.y < 0 ||
      local.x >= this.config.grid.cols ||
      local.y >= this.config.grid.rows
    ) {
      return false;
    }
    const room = this.world.getRoom(roomId);
    const tile = room.layout[local.y]?.[local.x];
    return Boolean(tile && tile !== '#' && tile !== '~' && !isBlockingTownTile(tile));
  }

  private getRivalAppleOccupiedSegments(roomId: string): Vector2Like[] {
    const occupied = Array.from(this.snake.bodySegments);
    for (const rival of this.enemies.getRivalSnakes()) {
      const body = rival.body ?? [rival.position];
      for (const segment of body) {
        occupied.push(this.localToWorld(rival.roomId, segment));
      }
    }
    return occupied.filter((segment) => {
      const local = this.worldToLocal(roomId, segment);
      return (
        local.x >= 0 &&
        local.y >= 0 &&
        local.x < this.config.grid.cols &&
        local.y < this.config.grid.rows
      );
    });
  }

  private createActorDeathStepResult(
    deathReason: 'boss' | 'bullet' | 'roaming-snake',
    options: {
      roomsChanged: Set<string>;
      roomHasChanged: boolean;
      appleEaten: boolean;
      appleRewards?: AppleConsumptionResult['rewards'];
      appleWorldPosition?: Vector2Like | null;
      appleSnapshot: AppleSnapshot | null;
      appleStateChanged: boolean;
    },
  ): StepResult {
    return {
      status: 'dead',
      deathReason,
      apple: {
        eaten: options.appleEaten,
        rewards: options.appleRewards,
        worldPosition: options.appleWorldPosition,
        current: options.appleSnapshot,
        stateChanged: options.appleStateChanged,
      },
      roomsChanged: options.roomsChanged,
      roomChanged: options.roomHasChanged,
      questOffer: null,
      questsCompleted: [],
    };
  }

  private statusStepPhase(options: {
    roomsChanged: Set<string>;
    previousRoom: string;
    roomHasChanged: boolean;
    appleEaten: boolean;
    appleRewards?: AppleConsumptionResult['rewards'];
    appleWorldPosition?: Vector2Like | null;
    appleSnapshot: AppleSnapshot | null;
    appleStateChanged: boolean;
  }): StepResult | null {
    this.tickPredationTimers();
    const followerStep = this.tickFollowers();
    if (followerStep.enemyDefeats > 0) {
      this.addScore(followerStep.enemyDefeats * 2);
      this.setFlag('ui.followerAction', {
        kind: 'enemy',
        count: followerStep.enemyDefeats,
      });
    }
    if (followerStep.animalDefeats > 0) {
      this.addScore(followerStep.animalDefeats);
      this.setFlag('ui.followerAction', {
        kind: 'animal',
        count: followerStep.animalDefeats,
      });
    }
    this.tickFortitudeStates();
    this.tickPlayerStates();
    this.tickPowerupState();
    if (this.tickLightningHazardState(options)) {
      return this.createLightningDeathOrPhoenixResult(options);
    }
    this.noteEnemySnakePressure();

    return null;
  }

  private createTemperatureDeathOrPhoenixResult(options: {
    roomsChanged: Set<string>;
    previousRoom: string;
    roomHasChanged: boolean;
    appleEaten: boolean;
    appleRewards?: AppleConsumptionResult['rewards'];
    appleWorldPosition?: Vector2Like | null;
    appleSnapshot: AppleSnapshot | null;
    appleStateChanged: boolean;
  }): StepResult {
    if (
      this.tryFortitudePhoenix(
        { status: 'dead', reason: 'temperature' },
        options.roomsChanged,
        options.previousRoom,
      )
    ) {
      return this.createAliveStepResult(options);
    }
    this.markDeathAtCurrentHead('temperature');
    return {
      status: 'dead',
      deathReason: 'temperature',
      apple: {
        eaten: options.appleEaten,
        rewards: options.appleRewards,
        worldPosition: options.appleWorldPosition,
        current: options.appleSnapshot,
        stateChanged: options.appleStateChanged,
      },
      roomsChanged: options.roomsChanged,
      roomChanged: options.roomHasChanged,
      questOffer: null,
      questsCompleted: [],
    };
  }

  private createLightningDeathOrPhoenixResult(options: {
    roomsChanged: Set<string>;
    previousRoom: string;
    roomHasChanged: boolean;
    appleEaten: boolean;
    appleRewards?: AppleConsumptionResult['rewards'];
    appleWorldPosition?: Vector2Like | null;
    appleSnapshot: AppleSnapshot | null;
    appleStateChanged: boolean;
  }): StepResult {
    if (
      this.tryFortitudePhoenix(
        { status: 'dead', reason: 'lightning' },
        options.roomsChanged,
        options.previousRoom,
      )
    ) {
      return this.createAliveStepResult(options);
    }
    this.markDeathAtCurrentHead('lightning');
    return {
      status: 'dead',
      deathReason: 'lightning',
      apple: {
        eaten: options.appleEaten,
        rewards: options.appleRewards,
        worldPosition: options.appleWorldPosition,
        current: options.appleSnapshot,
        stateChanged: options.appleStateChanged,
      },
      roomsChanged: options.roomsChanged,
      roomChanged: options.roomHasChanged,
      questOffer: null,
      questsCompleted: [],
    };
  }

  private revealBiomeIfChanged(roomId: string, room: RoomSnapshot): void {
    const lastBiomeId = this.getFlag<string>('ui.lastBiomeId');
    if (lastBiomeId === room.biomeId) {
      return;
    }
    const biome = getBiomeDefinition(room.biomeId);
    this.setFlag('ui.biomeReveal', {
      roomId,
      biomeId: room.biomeId,
      title: room.biomeTitle,
      temperature: biome.temperature,
      dangerLevel: biome.dangerLevel,
    });
    this.setFlag('ui.lastBiomeId', room.biomeId);
  }

  private queueLibertyLandmarkReveal(roomId: string, room: RoomSnapshot): void {
    if (room.biomeId !== 'liberty-badlands') {
      return;
    }
    const reveal = this.getLibertyLandmarkReveal(room);
    if (!reveal) {
      return;
    }
    const key = `ui.libertyLandmarkRevealed.${roomId}.${reveal.kind}`;
    if (this.getFlag<boolean>(key)) {
      return;
    }
    this.setFlag(key, true);
    this.setFlag('ui.libertyLandmarkReveal', {
      roomId,
      ...reveal,
    });
  }

  private getLibertyLandmarkReveal(room: RoomSnapshot): {
    name: string;
    subtitle: string;
    x: number;
    y: number;
    kind: string;
  } | null {
    if (room.allNiteDiner) {
      return {
        name: room.allNiteDiner.dinerName,
        subtitle: 'All-Nite Diner',
        x: room.allNiteDiner.cook.x,
        y: room.allNiteDiner.cook.y,
        kind: 'diner',
      };
    }
    if (room.fireworkStand) {
      return {
        name: room.fireworkStand.standName,
        subtitle: 'Firework Stand',
        x: room.fireworkStand.vendor.x,
        y: room.fireworkStand.vendor.y,
        kind: 'fireworks',
      };
    }
    if (room.roadsideMonument) {
      return {
        name: room.roadsideMonument.monumentName,
        subtitle: 'Roadside Monument',
        x: room.roadsideMonument.docent.x,
        y: room.roadsideMonument.docent.y,
        kind: 'monument',
      };
    }
    if (room.jackalopeLodge) {
      return {
        name: room.jackalopeLodge.lodgeName,
        subtitle: 'Jackalope Lodge',
        x: room.jackalopeLodge.elder.x,
        y: room.jackalopeLodge.elder.y,
        kind: 'lodge',
      };
    }
    if (room.motelPool) {
      return {
        name: room.motelPool.poolName,
        subtitle: 'Motel Pool',
        x: room.motelPool.clerk.x,
        y: room.motelPool.clerk.y,
        kind: 'motelPool',
      };
    }
    if (room.gridironYard) {
      return {
        name: room.gridironYard.fieldName,
        subtitle: 'Gridiron Yard',
        x: room.gridironYard.coach.x,
        y: room.gridironYard.coach.y,
        kind: 'gridiron',
      };
    }
    if (room.billboardOracle) {
      return {
        name: room.billboardOracle.slogan,
        subtitle: 'Billboard Prophecy',
        x: room.billboardOracle.signPainter.x,
        y: room.billboardOracle.signPainter.y,
        kind: 'billboard',
      };
    }
    if (room.roadCrew) {
      return {
        name: room.roadCrew.roadName,
        subtitle: 'Roadside Assistance',
        x: room.roadCrew.ranger.x,
        y: room.roadCrew.ranger.y,
        kind: 'roadCrew',
      };
    }
    return null;
  }

  stepFootballs(
    headWorld: Vector2Like = this.snake.bodySegments[0] ?? { x: 0, y: 0 },
    roomsChanged: Set<string> = new Set<string>(),
  ): void {
    const roomId = this.snake.currentRoomId;
    const room = this.world.getRoom(roomId);
    const [roomX = 0, roomY = 0] = roomId.split(',').map(Number);
    const headLocal = {
      x: headWorld.x - roomX * this.config.grid.cols,
      y: headWorld.y - roomY * this.config.grid.rows,
    };
    const footballs = this.footballs.get(roomId) ?? [];
    if (footballs.length === 0) {
      return;
    }

    const nextFootballs: FootballInstance[] = [];
    for (const football of footballs) {
      if (football.position.x === headLocal.x && football.position.y === headLocal.y) {
        this.completeFootballCatch(roomId, headLocal);
        roomsChanged.add(roomId);
        continue;
      }

      const aged = { ...football, age: football.age + 1 };
      if (aged.age > aged.maxAge) {
        continue;
      }

      if (aged.state === 'grounded') {
        nextFootballs.push(aged);
        continue;
      }

      const nextPosition = {
        x: aged.position.x + aged.direction.x,
        y: aged.position.y + aged.direction.y,
      };
      if (!this.isCatchableFootballTile(room, nextPosition)) {
        this.setFlag('ui.footballFumble', { roomId, x: aged.position.x, y: aged.position.y });
        nextFootballs.push({ ...aged, state: 'grounded', age: 0, maxAge: 3 });
        roomsChanged.add(roomId);
        continue;
      }

      if (nextPosition.x === headLocal.x && nextPosition.y === headLocal.y) {
        this.completeFootballCatch(roomId, headLocal);
        roomsChanged.add(roomId);
        continue;
      }

      const receiver = this.findGridironReceiverAt(room, nextPosition);
      if (receiver && aged.state !== 'returning') {
        const returnDirection = this.resolveStepDirection(nextPosition, headLocal);
        nextFootballs.push({
          ...aged,
          position: nextPosition,
          direction: returnDirection,
          state: 'returning',
          target: headLocal,
          age: 0,
          maxAge: 9,
        });
        this.setFlag('ui.footballPass', {
          roomId,
          from: nextPosition,
          to: headLocal,
        });
        roomsChanged.add(roomId);
        continue;
      }

      nextFootballs.push({ ...aged, position: nextPosition });
      roomsChanged.add(roomId);
    }

    if (nextFootballs.length > 0) {
      this.footballs.set(roomId, nextFootballs);
    } else {
      this.footballs.delete(roomId);
    }
  }

  private isCatchableFootballTile(room: RoomSnapshot, position: Vector2Like): boolean {
    return (
      position.x >= 0 &&
      position.x < this.config.grid.cols &&
      position.y >= 0 &&
      position.y < this.config.grid.rows &&
      room.layout[position.y]?.[position.x] !== '#'
    );
  }

  private findGridironReceiverAt(room: RoomSnapshot, position: Vector2Like): Vector2Like | null {
    const actors = room.gridironYard ? [room.gridironYard.coach, ...room.gridironYard.players] : [];
    return actors.find((actor) => actor.x === position.x && actor.y === position.y) ?? null;
  }

  private resolveStepDirection(from: Vector2Like, to: Vector2Like): Vector2Like {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return { x: Math.sign(dx), y: 0 };
    }
    return { x: 0, y: Math.sign(dy) };
  }

  private recordRoomTravelMetrics(previousRoom: string): void {
    const timeMs = Number(this.getFlag<number>('timeMs') ?? 0);
    const entryTimeMs = Number(this.getFlag<number>('roomEntryTimeMs') ?? timeMs);
    const entryPos = this.getFlag<{ x: number; y: number }>('roomEntryLocalPos');
    const previousHead = this.getFlag<{ x: number; y: number }>('internal.previousHead');
    if (entryPos && previousHead) {
      const [prevRoomX, prevRoomY] = previousRoom.split(',').map(Number);
      const prevLocalX = previousHead.x - prevRoomX * this.config.grid.cols;
      const prevLocalY = previousHead.y - prevRoomY * this.config.grid.rows;
      const distance = Math.abs(prevLocalX - entryPos.x) + Math.abs(prevLocalY - entryPos.y);
      this.setFlag('roomTravelDistance', distance);
      this.setFlag('roomTravelMs', Math.max(0, timeMs - entryTimeMs));
    } else {
      this.setFlag('roomTravelDistance', undefined);
      this.setFlag('roomTravelMs', undefined);
    }

    const head = this.snake.bodySegments[0];
    if (head) {
      const [roomX, roomY] = this.snake.currentRoomId.split(',').map(Number);
      this.setFlag('roomEntryLocalPos', {
        x: head.x - roomX * this.config.grid.cols,
        y: head.y - roomY * this.config.grid.rows,
      });
    } else {
      this.setFlag('roomEntryLocalPos', undefined);
    }
    this.setFlag('roomEntryTimeMs', timeMs);
  }

  getCurrentRoom() {
    const room = this.world.getRoom(this.snake.currentRoomId);
    this.applyTownRuntimeToRoom(room);
    this.stampQuestActorsIntoRoom(room);
    return room;
  }

  // === BULLET TRAIN ===

  /** Move the snake to a room at a specific position. */
  moveToRoom(roomId: string, position: { x: number; y: number }): void {
    const room = this.world.getRoom(roomId);
    const [roomX, roomY] = this.parseRoomCoordinates(roomId);
    // Access internal body array to set head position
    const body = (this.snake as unknown as { body: Vector2Like[] }).body;
    body[0] = {
      x: roomX * this.config.grid.cols + position.x,
      y: roomY * this.config.grid.rows + position.y,
    };
    this.snake.currentRoomId = roomId;
    this.visitedRooms.add(roomId);
    this.setFlag('roomsVisited', this.visitedRooms.size);
    this.setFlag('traversal.manualResumePending', true);
  }

  /** Get bullet train destinations for a station room. */
  getBulletTrainDestinations(stationId: string): Array<{
    roomId: string;
    exitX: number;
    exitY: number;
    arrivalFlavor: string;
    displayName: string;
    weight: number;
    coordinates?: string;
  }> {
    for (const room of this.world.snapshot().values()) {
      if (room.bulletTrainStation?.stationId === stationId) {
        return this.world.getBulletTrainDestinations(room.id);
      }
    }
    return [];
  }

  /** Mark a bullet train station as used. */
  markBulletTrainStationUsed(stationId: string): void {
    for (const room of this.world.snapshot().values()) {
      if (room.bulletTrainStation?.stationId === stationId) {
        this.world.markBulletTrainStationUsed(room.id);
        return;
      }
    }
  }

  /** Create a bullet train journey. */
  createBulletTrainJourney(
    stationRoomId: string,
    destinationRoomId: string,
  ): {
    stationRoomId: string;
    stationEntranceX: number;
    stationEntranceY: number;
    destinationRoomId: string;
    destinationExitX: number;
    destinationExitY: number;
    transitRooms: string[];
    transitProgress: number;
    startedAtMs: number;
    durationMs: number;
  } | null {
    return this.world.createBulletTrainJourney(stationRoomId, destinationRoomId);
  }

  private isHeadOnWaterTile(): boolean {
    const head = this.snake.bodySegments[0];
    if (!head) {
      return false;
    }
    const room = this.world.getRoom(this.snake.currentRoomId);
    const [roomX, roomY] = this.parseRoomCoordinates(this.snake.currentRoomId);
    const localX = head.x - roomX * this.config.grid.cols;
    const localY = head.y - roomY * this.config.grid.rows;
    return room.layout[localY]?.[localX] === '~';
  }

  isSnakeHeadOnWaterTile(): boolean {
    return this.isHeadOnWaterTile();
  }

  getCurrentTown(): TownStructure | null {
    const town = this.getCurrentRoom().town ?? null;
    return town ? this.applyTownRuntimeState(town) : null;
  }

  getNearbyTownBuildingDoor(): {
    entranceId: string;
    buildingId?: string;
    displayName: string;
    prompt: string;
    doorKind?: LayerEntrance['doorKind'];
    publicAccess: boolean;
    crimeOnEntry: boolean;
    locked: boolean;
    discovered: boolean;
  } | null {
    const head = this.snake.bodySegments[0];
    if (!head) return null;
    const room = this.world.getRoom(this.snake.currentRoomId);
    if (!room.town || !room.layerEntrances?.length) return null;
    const local = this.worldToLocal(room.id, head);
    const entrance = room.layerEntrances
      .filter((entry) => entry.kind === 'townInterior')
      .map((entry) => ({
        entry,
        distance: Math.abs(entry.x - local.x) + Math.abs(entry.y - local.y),
      }))
      .filter(({ distance }) => distance <= 1)
      .sort((a, b) => a.distance - b.distance)[0]?.entry;
    if (!entrance) return null;
    const discovered = entrance.discovered !== false;
    const locked = Boolean(entrance.locked);
    const publicAccess = entrance.publicAccess !== false;
    const displayName = entrance.displayName ?? entrance.label ?? 'Town Interior';
    const prompt =
      entrance.doorLabel ??
      (entrance.doorKind === 'guildGrateClosed'
        ? 'Inspect old grate'
        : entrance.doorKind === 'homeDoorClosed'
          ? `Open ${displayName}`
          : `Enter ${displayName}`);
    return {
      entranceId: entrance.id,
      buildingId: entrance.townBuildingId,
      displayName,
      prompt,
      doorKind: entrance.doorKind,
      publicAccess,
      crimeOnEntry: Boolean(entrance.crimeOnEntry),
      locked,
      discovered,
    };
  }

  enterNearbyTownBuildingDoor(): { ok: boolean; message: string } {
    const hit = this.getNearbyTownBuildingDoor();
    if (!hit) {
      return { ok: false, message: 'There is no town door close enough.' };
    }
    const room = this.world.getRoom(this.snake.currentRoomId);
    const entrance = room.layerEntrances?.find((entry) => entry.id === hit.entranceId);
    if (!entrance) {
      return { ok: false, message: 'That town door has lost its hinges.' };
    }
    if (entrance.doorKind === 'guildGrateClosed') {
      const guildResult = this.investigateCurrentTownGuildGrate();
      return guildResult.ok
        ? guildResult
        : { ok: false, message: entrance.doorLabel ?? guildResult.message };
    }
    const effectiveEntrance =
      entrance.doorKind === 'homeDoorClosed' ? { ...entrance, locked: false } : entrance;
    if (entrance.crimeOnEntry) {
      this.applyCurrentTownCrime('theft', true, 1);
    }
    const roomsChanged = new Set<string>();
    this.enterLayer(effectiveEntrance, roomsChanged);
    return {
      ok: true,
      message:
        entrance.crimeOnEntry && entrance.doorKind === 'homeDoorClosed'
          ? `You force open ${entrance.displayName ?? 'the residence'}. That is a crime, fuhgeddaboudit.`
          : `You enter ${entrance.displayName ?? entrance.label ?? 'the building'}.`,
    };
  }

  updateCurrentTown(town: TownStructure): TownStructure | null {
    const room = this.world.getRoom(this.snake.currentRoomId);
    if (!room.town || room.town.id !== town.id) {
      return null;
    }
    room.town = cloneTown(town);
    this.saveTownRuntimeState(room.town);
    this.world.updateTown(room.town);
    this.clearTownDispositionHostilityIfResolved(room.town);
    return room.town;
  }

  applyCurrentTownCrime(
    kind: TownCrimeKind,
    witnessed = true,
    severity = 1,
  ): {
    ok: boolean;
    town?: TownStructure;
    message: string;
  } {
    const room = this.world.getRoom(this.snake.currentRoomId);
    const town = room.town;
    if (!town) {
      return { ok: false, message: 'There is no town law to break here.' };
    }
    const next = applyTownCrime(town, {
      kind,
      witnessed,
      severity,
      roomId: room.id,
    });
    room.town = next;
    this.saveTownRuntimeState(next);
    this.world.updateTown(next);
    this.syncActorsForRoom(room);
    this.emitWorldEvent({
      type: 'town-crime',
      roomId: room.id,
      severity: Math.max(10, Math.min(80, severity * 22 + (witnessed ? 12 : 0))),
      loudness: witnessed ? 35 : 8,
      tags: ['crime', kind, witnessed ? 'witnessed' : 'unwitnessed'],
      summary: witnessed
        ? `A ${kind} was witnessed in ${next.name}.`
        : `A ${kind} left suspicion behind in ${next.name}.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: {
        townId: next.id,
        kind,
        witnessed,
        wantedLevel: next.wantedLevel,
        suspicion: next.suspicion,
      },
    });
    if (this.isTownInOpenHostility(next)) {
      this.activateTownHostility(
        room,
        next,
        'The town alarm goes up. Guards are done asking questions.',
      );
    }
    return {
      ok: true,
      town: next,
      message: witnessed
        ? `Wanted level is now ${next.wantedLevel}. The notice board will hear about this.`
        : 'No one saw it clearly, which is not the same as innocence.',
    };
  }

  private maybeMarkTownHostility(room: RoomSnapshot): void {
    const town = room.town;
    if (!town) {
      return;
    }
    if (this.isTownInOpenHostility(town)) {
      this.activateTownHostility(
        room,
        town,
        'The town alarm is still ringing. Guards move to intercept.',
      );
      return;
    }
    const district = town.districtByRoomId[room.id];
    const suspicion = town.suspicion ?? 0;
    const guardDistrict =
      district === 'gate' ||
      district === 'square' ||
      district === 'townCenter' ||
      district === 'townExit';
    const thiefDistrict = district === 'backAlley' || district === 'guildHideout';
    const hostilityChance =
      town.wantedLevel > 0 && guardDistrict
        ? Math.min(0.85, 0.18 + town.wantedLevel * 0.14 + suspicion / 180)
        : thiefDistrict && town.thievesGuild && town.thievesGuild.karma < -20
          ? Math.min(0.65, 0.25 + Math.abs(town.thievesGuild.karma) / 180)
          : 0;
    if (hostilityChance <= 0 || this._rng() >= hostilityChance) {
      return;
    }
    const label = guardDistrict
      ? 'The guards have gone hostile.'
      : 'The alley thieves have gone hostile.';
    this.activateTownHostility(room, town, label);
  }

  private isTownInOpenHostility(town: TownStructure): boolean {
    return town.wantedLevel >= 3 || (town.suspicion ?? 0) >= 65 || town.reputation <= -45;
  }

  isTownHostileForRoom(town: TownStructure, roomId: string): boolean {
    return this.isTownRoomHostile(town, roomId);
  }

  private isTownRoomHostile(town: TownStructure, roomId: string): boolean {
    const district = town.districtByRoomId[roomId];
    const guildDistrict = district === 'backAlley' || district === 'guildHideout';
    if (guildDistrict) {
      return (
        Boolean(this.getFlag<boolean>(`town.hostile.${town.id}.${roomId}`)) ||
        Boolean(this.getFlag<boolean>(`town.guildHostile.${town.id}`)) ||
        Boolean(town.thievesGuild && town.thievesGuild.karma < -20)
      );
    }
    return (
      this.isTownInOpenHostility(town) ||
      Boolean(this.getFlag<boolean>(`town.hostile.${town.id}.all`)) ||
      Boolean(this.getFlag<boolean>(`town.hostile.${town.id}.${roomId}`))
    );
  }

  private clearTownDispositionHostilityIfResolved(town: TownStructure): void {
    if (this.isTownInOpenHostility(town)) {
      return;
    }
    this.setFlag(`town.hostile.${town.id}.all`, undefined);
    for (const roomId of Object.keys(town.districtByRoomId)) {
      this.setFlag(`town.hostile.${town.id}.${roomId}`, undefined);
    }
    const residentRelationshipIds = new Set(
      town.residents.map((resident) => this.getTownResidentRelationshipId(town.id, resident.id)),
    );
    for (const room of this.world.snapshot().values()) {
      if (room.town?.id !== town.id) continue;
      for (const enemy of this.enemies.getEnemiesInRoom(room.id)) {
        const relationshipId = this.getRelationshipIdFromHostileNpc(enemy.id);
        if (relationshipId && residentRelationshipIds.has(relationshipId)) {
          this.enemies.removeEnemy(enemy.id);
          this.npcBodies.delete(relationshipId);
        }
      }
    }
    for (const actor of this.actors.registry.getByTown(town.id)) {
      if (
        actor.hostility !== 'hostile' ||
        actor.health?.state === 'dead' ||
        actor.flags.dead ||
        actor.flags.eaten ||
        actor.flags.relationshipStage === 'dead'
      ) {
        continue;
      }
      this.actors.registry.update(actor.id, (current) => ({
        ...current,
        hostility: 'neutral',
        mood: {
          ...current.mood,
          anger: Math.min(current.mood.anger, 25),
          fear: Math.min(current.mood.fear, 35),
          stress: Math.min(current.mood.stress, 35),
        },
      }));
    }
  }

  private activateTownHostility(room: RoomSnapshot, town: TownStructure, label: string): void {
    if (this.isTownInOpenHostility(town)) {
      this.setFlag(`town.hostile.${town.id}.all`, true);
    }
    this.setFlag(`town.hostile.${town.id}.${room.id}`, true);
    const townWideHostility = Boolean(this.getFlag<boolean>(`town.hostile.${town.id}.all`));
    const currentDistrict = town.districtByRoomId[room.id];
    const hostileResidents = townResidentsForRoom(town, room.id);
    const guards = hostileResidents.filter((resident) => isTownGuardRole(resident.role));
    const thieves = hostileResidents.filter((resident) => isTownCriminalRole(resident.role));
    const fallback = hostileResidents.filter((resident) => !isTownShopRole(resident.role));
    const selected =
      currentDistrict === 'backAlley' || currentDistrict === 'guildHideout'
        ? thieves.length > 0
          ? thieves
          : fallback
        : townWideHostility
          ? [...guards, ...fallback.filter((resident) => resident.role !== 'thiefContact')]
          : guards.length > 0
            ? guards
            : fallback.filter(
                (resident) => resident.role !== 'thief' && resident.role !== 'thiefContact',
              );
    const existing = new Set(this.enemies.getEnemiesInRoom(room.id).map((enemy) => enemy.id));
    selected.slice(0, 5).forEach((resident, index) => {
      const relationshipId = this.getTownResidentRelationshipId(town.id, resident.id);
      if (existing.has(`npc-hostile:${relationshipId}`)) {
        return;
      }
      if (room.layout[resident.y]?.[resident.x] === 'G') {
        const row = room.layout[resident.y]!;
        room.layout[resident.y] =
          row.substring(0, resident.x) + '.' + row.substring(resident.x + 1);
      }
      const actorId =
        resident.actorId ??
        this.actors.getStableTownResidentActorId(town.id, resident.id, resident.role);
      const actor = this.actors.registry.get(actorId);
      if (
        actor?.hostility === 'hostile' ||
        actor?.hostility === 'dead' ||
        actor?.health?.state === 'dead' ||
        actor?.flags.dead ||
        actor?.flags.eaten
      ) {
        return;
      }
      const body = this.ensureNpcBody(
        {
          id: relationshipId,
          actorId,
          displayName: resident.name,
          species: 'human',
          portraitId: resident.portraitId,
          homeRoomId: room.id,
          factionId: resident.factionId as FactionId,
        },
        { x: resident.x, y: resident.y },
        isStationaryTownRole(resident.role),
      );
      this.enemies.spawnHostileNpc(
        room.id,
        body.position,
        resident.name,
        3,
        relationshipId,
        3,
        actorId,
      );
    });
    this.setFlag('ui.townHostility', {
      roomId: room.id,
      x: town.center.x,
      y: town.center.y,
      label,
    });
  }

  getCurrentTownGuildInitiationStatus(): GuildInitiationStatus {
    const room = this.getCurrentRoom();
    const town = room.town;
    if (!town) {
      return { state: 'unavailable', pickpockets: 0, required: 3 };
    }
    if (town.discoveredGuild || town.thievesGuild?.discovered) {
      return { state: 'complete', pickpockets: 3, required: 3 };
    }
    const started = this.getFlag<boolean>(this.guildInitiationStartedFlagKey(town.id));
    const pickpockets = Math.min(
      3,
      Math.max(0, this.getFlag<number>(this.guildInitiationPickpocketsFlagKey(town.id)) ?? 0),
    );
    if (!started) {
      return { state: 'not-started', pickpockets, required: 3 };
    }
    return { state: pickpockets >= 3 ? 'ready' : 'active', pickpockets, required: 3 };
  }

  canPickpocketForCurrentTownGuild(): boolean {
    const status = this.getCurrentTownGuildInitiationStatus();
    return status.state === 'active' || status.state === 'ready' || status.state === 'complete';
  }

  discoverCurrentTownGuild(): { ok: boolean; town?: TownStructure; message: string } {
    return this.investigateCurrentTownGuildGrate();
  }

  investigateCurrentTownGuildGrate(): { ok: boolean; town?: TownStructure; message: string } {
    const room = this.getCurrentRoom();
    const town = room.town;
    if (!town) {
      return { ok: false, message: 'No guild hides in this room.' };
    }
    const district = town.districtByRoomId[room.id];
    if (district !== 'backAlley' && district !== 'guildHideout') {
      return { ok: false, town, message: 'The guild grate is somewhere seedier than here.' };
    }
    const status = this.getCurrentTownGuildInitiationStatus();
    if (status.state === 'complete') {
      this.addGuildGratePortal(room);
      return {
        ok: true,
        town,
        message: 'The grate is unlocked. Step onto it to descend into the Thieves Guild.',
      };
    }
    if (status.state === 'not-started') {
      this.setFlag(this.guildInitiationStartedFlagKey(town.id), true);
      this.setFlag(this.guildInitiationPickpocketsFlagKey(town.id), 0);
      return {
        ok: true,
        town,
        message: 'A note slides through the grate: lift three pockets in town, then return.',
      };
    }
    if (status.state === 'active') {
      return {
        ok: false,
        town,
        message: `The grate stays shut. Guild test: ${status.pickpockets}/${status.required} pockets lifted.`,
      };
    }
    const next = discoverThievesGuild(town);
    room.town = next;
    this.setFlag(this.guildInitiationStartedFlagKey(town.id), true);
    this.setFlag(this.guildInitiationPickpocketsFlagKey(town.id), 3);
    this.setFlag(this.guildInitiationCompleteFlagKey(town.id), true);
    this.saveTownRuntimeState(next);
    this.world.updateTown(next);
    this.addGuildGratePortal(room);
    return {
      ok: true,
      town: next,
      message: 'The grate clicks open. The Thieves Guild accepts your proof.',
    };
  }

  reduceCurrentTownWantedViaGuild(): {
    ok: boolean;
    town?: TownStructure;
    message: string;
    cost: number;
  } {
    const room = this.world.getRoom(this.snake.currentRoomId);
    const town = room.town;
    if (!town) {
      return { ok: false, message: 'No town wanted posters are watching you.', cost: 0 };
    }
    const result = reduceWantedViaGuild(town);
    if (result.cost > 0 && this.getScore() < result.cost) {
      return {
        ok: false,
        town,
        message: `The guild wants ${result.cost} score to blur the posters.`,
        cost: result.cost,
      };
    }
    if (result.cost > 0) {
      this.addScore(-result.cost);
    }
    room.town = result.town;
    this.saveTownRuntimeState(result.town);
    this.world.updateTown(result.town);
    return { ok: true, town: result.town, message: result.message, cost: result.cost };
  }

  resolveCurrentTownGuildJob(
    jobId: string,
    success: boolean,
  ): {
    ok: boolean;
    town?: TownStructure;
    message: string;
    rewardScore: number;
  } {
    const room = this.world.getRoom(this.snake.currentRoomId);
    const town = room.town;
    if (!town) {
      return { ok: false, message: 'No guild job can be resolved here.', rewardScore: 0 };
    }
    const job = town.guildJobs.find((entry) => entry.id === jobId);
    if (!job) {
      return {
        ok: false,
        town,
        message: 'That guild job is no longer on the board.',
        rewardScore: 0,
      };
    }
    const next = resolveGuildJob(town, jobId, success);
    const resolvedJob = next.guildJobs.find((entry) => entry.id === jobId);
    let rewardScore = 0;
    if (success && resolvedJob?.reward.kind === 'currency') {
      rewardScore = resolvedJob.reward.amount ?? 0;
      this.addScore(rewardScore);
    }
    room.town = next;
    this.saveTownRuntimeState(next);
    this.world.updateTown(next);
    return {
      ok: true,
      town: next,
      rewardScore,
      message: success
        ? this.describeGuildJobSuccess(job.kind, rewardScore)
        : 'The job goes crooked. Guards learn new adjectives for snake.',
    };
  }

  getNearbyTownGate(): {
    gateId: string;
    kind: 'entrance' | 'exit';
    state: 'closed' | 'open';
    perspective: 'inside' | 'outside';
    canOpen: boolean;
    reasonIfBlocked?: string;
    prompt: string;
  } | null {
    const room = this.getCurrentRoom();
    const town = room.town;
    if (!town) {
      return null;
    }
    const head = this.snake.bodySegments[0];
    if (!head) {
      return null;
    }
    const local = this.worldToLocal(room.id, head);
    const gateMatch = (town.gates ?? [])
      .map((gate) => {
        const perspective =
          gate.townRoomId === room.id
            ? 'inside'
            : gate.approachRoomId === room.id
              ? 'outside'
              : null;
        if (!perspective) return null;
        const side = perspective === 'inside' ? gate.side : this.oppositeSide(gate.side);
        const targets = this.getTownGateInteractionTiles(side);
        const distance = Math.min(
          ...targets.map((target) => Math.abs(target.x - local.x) + Math.abs(target.y - local.y)),
        );
        return { gate, perspective, distance };
      })
      .filter(
        (entry): entry is { gate: TownGate; perspective: 'inside' | 'outside'; distance: number } =>
          Boolean(entry),
      )
      .sort((a, b) => a.distance - b.distance)[0];
    if (!gateMatch || gateMatch.distance > 3) {
      return null;
    }
    const { gate, perspective } = gateMatch;
    const state = this.isTownGateOpen(town, gate) ? 'open' : gate.state;
    if (this.isTownRoomHostile(town, room.id)) {
      return {
        gateId: gate.id,
        kind: gate.kind,
        state,
        perspective,
        canOpen: false,
        reasonIfBlocked: 'The guards are hostile. No one is opening gates for you now.',
        prompt: 'Gate locked down',
      };
    }
    if (gate.kind === 'exit' && perspective === 'outside' && state === 'closed') {
      return {
        gateId: gate.id,
        kind: gate.kind,
        state,
        perspective,
        canOpen: false,
        reasonIfBlocked: 'The outside latch has no handle. This gate opens from inside town.',
        prompt: 'Gate opens from inside',
      };
    }
    return {
      gateId: gate.id,
      kind: gate.kind,
      state,
      perspective,
      canOpen: state === 'closed',
      prompt:
        state === 'open' ? 'Gate open' : gate.kind === 'exit' ? 'Open back gate' : 'Open town gate',
    };
  }

  openNearbyTownGate(): { ok: boolean; message: string } {
    const nearby = this.getNearbyTownGate();
    if (!nearby) {
      return { ok: false, message: 'There is no town gate here.' };
    }
    if (nearby.state === 'open') {
      return { ok: true, message: 'The gate is already open.' };
    }
    if (!nearby.canOpen) {
      return { ok: false, message: nearby.reasonIfBlocked ?? 'The gate will not open.' };
    }
    const room = this.getCurrentRoom();
    const town = room.town;
    if (!town) {
      return { ok: false, message: 'There is no town gate here.' };
    }
    const gate = (town.gates ?? []).find((entry) => entry.id === nearby.gateId);
    if (!gate) {
      return { ok: false, message: 'There is no town gate here.' };
    }
    const gateTax = nearby.perspective === 'outside' ? 75 : 0;
    if (gateTax > 0 && this.getScore() < gateTax) {
      return { ok: false, message: `The guard wants a ${gateTax} score gate tax.` };
    }
    if (gateTax > 0) {
      this.addScore(-gateTax);
    }
    this.setFlag(this.townGateFlagKey(town.id, gate), true);
    const nextTown = {
      ...town,
      gates: (town.gates ?? []).map((entry) =>
        entry.id === gate.id ? { ...entry, state: 'open' as const } : entry,
      ),
    };
    room.town = nextTown;
    this.patchTownGateInCachedRooms(nextTown, gate.id);
    this.saveTownRuntimeState(nextTown);
    this.world.updateTown(nextTown);
    this.emitWorldEvent({
      type: 'gate-opened',
      roomId: room.id,
      severity: 12,
      loudness: 8,
      tags: gateTax > 0 ? ['town', 'gate', 'tax', gate.kind] : ['town', 'gate', gate.kind],
      summary:
        gate.kind === 'exit'
          ? gateTax > 0
            ? `${town.name}'s back gate opened after the snake paid the exit tax.`
            : `${town.name}'s back gate opened from inside town.`
          : gateTax > 0
            ? `${town.name}'s front gate opened after the snake paid the gate tax.`
            : `${town.name}'s front gate opened from inside town.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { townId: town.id, gateId: gate.id, kind: gate.kind, gateTax },
    });
    return {
      ok: true,
      message:
        gate.kind === 'exit'
          ? gateTax > 0
            ? `The guard takes ${gateTax} score and opens the back gate.`
            : 'The inner exit guard opens the back gate.'
          : gateTax > 0
            ? `The guard takes ${gateTax} score and opens the gate.`
            : 'The inner gate guard opens the gate.',
    };
  }

  openCurrentTownGate(): { ok: boolean; message: string } {
    return this.openNearbyTownGate();
  }

  private applyTownRuntimeState(town: TownStructure): TownStructure {
    const runtime = this.getFlag<TownRuntimeState>(`town.runtime.${town.id}`);
    if (!runtime) {
      return town;
    }
    const next = cloneTown(town);
    next.wantedLevel = runtime.wantedLevel;
    next.suspicion = runtime.suspicion;
    next.reputation = runtime.reputation;
    next.discoveredGuild = runtime.discoveredGuild;
    next.buildings = next.buildings.map((building) =>
      building.kind === 'guildAccess'
        ? {
            ...building,
            hidden: !runtime.discoveredGuild,
            publicAccess: runtime.discoveredGuild,
            doorKind: runtime.discoveredGuild ? 'guildGrateOpen' : 'guildGrateClosed',
            doorLabel: runtime.discoveredGuild ? 'Enter Thieves Guild' : 'Inspect old grate',
            shortLabel: runtime.discoveredGuild ? 'Thieves Guild' : 'Old Drain',
          }
        : building,
    );
    next.rumors = runtime.rumors;
    next.gates = (next.gates ?? []).map((gate) =>
      runtime.openedGates.includes(gate.id) ||
      runtime.openedGates.includes(gate.townRoomId) ||
      runtime.openedGates.includes(gate.approachRoomId) ||
      this.getFlag<boolean>(this.townGateFlagKey(next.id, gate))
        ? { ...gate, state: 'open' }
        : gate,
    );
    if (next.thievesGuild) {
      next.thievesGuild.discovered = runtime.discoveredGuild;
      next.thievesGuild.completedJobs = [...runtime.completedGuildJobs];
      next.thievesGuild.failedJobs = [...runtime.failedGuildJobs];
    }
    return next;
  }

  private saveTownRuntimeState(town: TownStructure): void {
    const runtime: TownRuntimeState = {
      townId: town.id,
      wantedLevel: town.wantedLevel,
      suspicion: town.suspicion,
      reputation: town.reputation,
      discoveredGuild: town.discoveredGuild,
      openedGates: [
        ...(town.gates ?? [])
          .filter(
            (gate) =>
              gate.state === 'open' || this.getFlag<boolean>(this.townGateFlagKey(town.id, gate)),
          )
          .map((gate) => gate.id),
      ],
      completedGuildJobs: town.thievesGuild?.completedJobs ?? [],
      failedGuildJobs: town.thievesGuild?.failedJobs ?? [],
      rumors: town.rumors,
      noticesSeen: [],
      stolenItemIds: [],
      residents: {},
    };
    this.setFlag(`town.runtime.${town.id}`, runtime);
  }

  describeTownRoom(kind: TownRoomKind): string {
    switch (kind) {
      case 'outskirts':
        return 'Fenceposts appear where wilderness was pretending it had no neighbors.';
      case 'gate':
        return 'The gate guards watch the road, your mouth, and each other.';
      case 'townCenter':
      case 'square':
        return 'The square is all notices, gossip, and legal-looking benches.';
      case 'market':
      case 'marketStreet':
        return 'The market is louder than a bag of coins dropped into soup.';
      case 'tavern':
      case 'tavernInterior':
        return 'The tavern smells like stew, spilled confessions, and future dates.';
      case 'residential':
      case 'residentialStreet':
        return 'Homes press close together, each window inventing a rumor.';
      case 'backAlley':
        return 'The back alley narrows into chalk marks and plausible deniability.';
      case 'guildHideout':
        return 'A cellar door opens into a room where everyone has already noticed you.';
      case 'exit':
      case 'townExit':
        return 'The back road points out of town before anyone changes their mind.';
    }
  }

  private describeGuildJobSuccess(kind: GuildJobKind, rewardScore: number): string {
    switch (kind) {
      case 'pickpocket':
        return `Market pocket picked. Guild karma rises${rewardScore > 0 ? ` and +${rewardScore} score lands quietly.` : '.'}`;
      case 'houseJob':
        return 'Residential ledger lifted. The guild sands one edge off your wanted poster.';
      case 'smugglePackage':
        return 'Package moved from gate to alley. It only whispered twice.';
    }
  }

  private markDeathAtCurrentHead(reason?: StepResult['deathReason'] | string): void {
    const head = this.snake.bodySegments[0] ?? { x: 0, y: 0 };
    const roomId = this.snake.currentRoomId;
    const [roomX = 0, roomY = 0] = roomId.split(',').map(Number);
    const local = {
      x: head.x - roomX * this.config.grid.cols,
      y: head.y - roomY * this.config.grid.rows,
    };
    const room = this.world.getRoom(roomId);
    this.setFlag('internal.lastDeathPosition', {
      world: { x: head.x, y: head.y },
      local,
      roomId,
      tile: room.layout[local.y]?.[local.x],
      direction: this.snake.directionVector,
      reason,
    });
    this.setFlag('recent.deathReason', reason ?? 'unknown');
    this.emitWorldEvent({
      type: 'player-death',
      roomId,
      severity: 65,
      loudness: 35,
      tags: ['player', 'death', String(reason ?? 'unknown')],
      summary: `The snake died${reason ? ` to ${reason}` : ''}.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { reason: reason ?? 'unknown', local },
    });
  }

  getRoom(roomId: string) {
    const room = this.world.getRoom(roomId);
    this.applyTownRuntimeToRoom(room);
    this.stampQuestActorsIntoRoom(room);
    this.syncActorsForRoom(room);
    return room;
  }

  getActorSystem(): ActorSystem {
    return this.actors;
  }

  getActorsInCurrentRoom(): Actor[] {
    const room = this.world.getRoom(this.snake.currentRoomId);
    this.applyTownRuntimeToRoom(room);
    this.syncActorsForRoom(room);
    return this.actors.getActorsInRoom(this.snake.currentRoomId);
  }

  getActorInteractionMenu(actorId: string): ActorInteractionMenuModel | null {
    const actor = this.actors.getActor(actorId);
    if (!actor) {
      return null;
    }
    const room = this.world.getRoom(this.snake.currentRoomId);
    const canPickpocket = Boolean(room.town) && this.canPickpocketForCurrentTownGuild();
    return buildActorInteractionMenu(actor, {
      thievesGuildUnlocked: Boolean(room.town?.thievesGuild?.discovered),
      canPickpocket,
      canUseRelationshipActions: true,
      recentRumorCount: this.getRecentWorldRumors().length,
    });
  }

  getActorRole(actorId: string): Actor['role'] | undefined {
    return this.actors.getActor(actorId)?.role;
  }

  getTownResidentActorId(townId: string, residentId: string, role: string): string {
    return this.actors.getStableTownResidentActorId(townId, residentId, role);
  }

  getTownResidentRelationshipId(townId: string, residentId: string): string {
    return `resident:${townId}:${residentId}`;
  }

  getVillageActorId(roomId: string, npcId: string, role: string): string {
    return this.actors.getStableTownResidentActorId(`village:${roomId}`, npcId, role);
  }

  getGoblinCampActorId(campId: string, npcId: string, role: string): string {
    return this.actors.getStableTownResidentActorId(campId, npcId, role);
  }

  getQuestGiverActorId(roomId: string, npcId: string): string {
    return this.actors.getStableTownResidentActorId(`quest:${roomId}`, npcId, 'questGiver');
  }

  getActorConversation(
    actorId: string,
    bucket: ActorConversationBucket,
  ): ActorConversationResult | null {
    const actor = this.actors.getActor(actorId);
    if (!actor) {
      return null;
    }
    const room = this.getCurrentRoom();
    const biome = getBiomeDefinition(room.biomeId);
    const health = this.getPlayerHealth();
    const socialLink = this.ensureConversationSocialLink(actor.id, bucket);
    const socialTargetName = socialLink
      ? this.actors.getActor(socialLink.actorId)?.displayName
      : undefined;
    const currentActor = this.actors.getActor(actor.id) ?? actor;
    const relationshipId =
      typeof actor.flags.relationshipId === 'string' ? actor.flags.relationshipId : undefined;
    const relationship = relationshipId
      ? this.relationshipController.getState(relationshipId)
      : undefined;
    const result = selectActorConversation({
      actor: currentActor,
      bucket,
      biomeId: room.biomeId,
      dangerLevel: biome.dangerLevel,
      playerHealth: health.current,
      playerMaxHealth: health.max,
      snakeLength: this.snake.bodySegments.length,
      roomsVisited: this.getRoomsVisitedCount(),
      flags: this.snake.flags,
      recentEvents: ['recent.animalHunted', 'recent.deathReason'].filter(
        (key) => this.getFlag(key) !== undefined,
      ),
      rumors: this.getConversationRumorsForActor(currentActor),
      factionEvents: this.getConversationFactionEvents(currentActor),
      town: room.town
        ? {
            id: room.town.id,
            name: room.town.name,
            wantedLevel: room.town.wantedLevel,
            suspicion: room.town.suspicion,
            reputation: room.town.reputation,
          }
        : undefined,
      relationship: relationship
        ? {
            stage: relationship.stage,
            affection: relationship.affection,
            trust: relationship.trust,
            resentment: relationship.resentment,
            jealousy: relationship.jealousy,
            fear: relationship.fear,
          }
        : undefined,
      socialLink,
      socialTargetName,
      random: this._rng,
    });
    const recentConversationKey = `actor.conversation.recent.${actor.id}.${bucket}`;
    const recentConversationRaw = this.getFlag<unknown>(recentConversationKey);
    const recentConversationIds = Array.isArray(recentConversationRaw)
      ? recentConversationRaw.filter((item): item is string => typeof item === 'string')
      : [];
    this.setFlag(`actor.conversation.last.${actor.id}.${bucket}`, result.id);
    this.setFlag(
      recentConversationKey,
      [result.id, ...recentConversationIds.filter((id) => id !== result.id)].slice(0, 4),
    );
    const lineCountKey = `actor.conversation.count.${actor.id}.${bucket}.${result.id}`;
    const totalCountKey = `actor.conversation.total.${actor.id}.${bucket}`;
    this.setFlag(lineCountKey, Number(this.getFlag<number>(lineCountKey) ?? 0) + 1);
    this.setFlag(totalCountKey, Number(this.getFlag<number>(totalCountKey) ?? 0) + 1);
    if (result.rumorId) {
      const recentRumorKey = `actor.conversation.recentRumors.${actor.id}.${bucket}`;
      const recentRumorRaw = this.getFlag<unknown>(recentRumorKey);
      const recentRumorIds = Array.isArray(recentRumorRaw)
        ? recentRumorRaw.filter((item): item is string => typeof item === 'string')
        : [];
      this.setFlag(
        recentRumorKey,
        [result.rumorId, ...recentRumorIds.filter((id) => id !== result.rumorId)].slice(0, 4),
      );
    }
    this.applyActorConversationResult(currentActor, result);
    this.emitWorldEvent({
      type:
        bucket === 'ask-around'
          ? 'actor-asked-around'
          : bucket === 'ask-personal'
            ? 'actor-asked-personally'
            : 'actor-talked',
      roomId: this.snake.currentRoomId,
      sourceActorId: currentActor.id,
      severity: result.source === 'faction' || result.source === 'rumor' ? 14 : 6,
      loudness: 2,
      tags: ['conversation', bucket, result.source, ...result.tags],
      summary: `${currentActor.displayName} spoke about ${result.topic}.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
    });
    return result;
  }

  private ensureConversationSocialLink(
    actorId: string,
    bucket: ActorConversationBucket,
  ): ActorSocialLink | undefined {
    const actor = this.actors.getActor(actorId);
    if (!actor || bucket === 'talk') {
      return actor?.relationships.find((entry) => !entry.knownToPlayer) ?? actor?.relationships[0];
    }
    const existing =
      actor.relationships.find((entry) => !entry.knownToPlayer) ?? actor.relationships[0];
    if (existing && this.actors.getActor(existing.actorId)) {
      return existing;
    }
    const target = this.findConversationSocialTarget(actor);
    if (!target) {
      return existing;
    }
    const relationship = conversationSocialRelationshipFor(actor, target);
    const strength =
      relationship === 'family'
        ? 74
        : relationship === 'rival'
          ? 62
          : relationship === 'friend'
            ? 58
            : 48;
    const link: ActorSocialLink = {
      actorId: target.id,
      relationship,
      strength,
      knownToPlayer: false,
    };
    const reciprocal: ActorSocialLink = {
      actorId: actor.id,
      relationship: reciprocalSocialRelationship(relationship),
      strength: Math.max(35, strength - 8),
      knownToPlayer: false,
    };
    this.actors.registry.update(actor.id, (current) => ({
      ...current,
      relationships: [
        ...current.relationships.filter((entry) => entry.actorId !== target.id),
        link,
      ].slice(-8),
    }));
    this.actors.registry.update(target.id, (current) => ({
      ...current,
      relationships: current.relationships.some((entry) => entry.actorId === actor.id)
        ? current.relationships
        : [...current.relationships, reciprocal].slice(-8),
    }));
    return link;
  }

  private findConversationSocialTarget(actor: Actor): Actor | undefined {
    const candidates = this.actors.registry
      .getAll()
      .filter((candidate) => {
        if (
          candidate.id === actor.id ||
          candidate.kind === 'animal' ||
          candidate.kind === 'enemy'
        ) {
          return false;
        }
        if (candidate.hostility === 'dead' || candidate.health?.state === 'dead') {
          return false;
        }
        if (actor.townId && candidate.townId === actor.townId) {
          return true;
        }
        if (actor.currentRoomId && candidate.currentRoomId === actor.currentRoomId) {
          return true;
        }
        return false;
      })
      .sort((a, b) => {
        const sameRoomA = a.currentRoomId === actor.currentRoomId ? 1 : 0;
        const sameRoomB = b.currentRoomId === actor.currentRoomId ? 1 : 0;
        if (sameRoomA !== sameRoomB) return sameRoomB - sameRoomA;
        return stableHash(`${actor.id}:${a.id}`) - stableHash(`${actor.id}:${b.id}`);
      });
    return candidates[0];
  }

  formatActorConversation(result: ActorConversationResult | null): string | null {
    if (!result) {
      return null;
    }
    const spoken = `"${result.line}"`;
    return result.beat ? `*${result.beat}*\n\n${spoken}` : spoken;
  }

  formatActorConversationPages(result: ActorConversationResult | null): string[] | null {
    if (!result) {
      return null;
    }
    const pages: string[] = [];
    if (result.beat) {
      pages.push(`*${result.beat}*`);
    }
    pages.push(`"${result.line}"`);
    if (result.knownFact) {
      pages.push(`Known fact learned: ${result.knownFact}`);
    }
    return pages;
  }

  private getConversationRumorsForActor(actor: Actor): ActorConversationRumor[] {
    const room = this.getCurrentRoom();
    const townRumors = (room.town?.rumors ?? []).slice(-6).map((rumor) => ({
      id: rumor.id,
      summary: rumor.summary,
      tags: [rumor.kind, 'town', 'rumor'],
      severity: rumor.severity,
      townId: rumor.townId,
      factionIds: rumor.kind === 'crime' ? ['hearthbound-remnant'] : [],
    }));
    const publicRumors = this.getRecentWorldRumors(12)
      .filter((rumor) => this.isConversationRelevantWorldRumor(rumor, room))
      .slice(0, 6)
      .map((rumor) => ({
        id: rumor.id,
        summary: rumor.summary,
        tags: rumor.tags,
        severity: rumor.severity,
        townId: rumor.townId,
        factionIds: rumor.tags.filter((tag) => tag.includes('-')),
      }));
    const memoryRumors = actor.memory
      .filter((memory) => memory.source === 'rumor' || memory.tags.includes('rumor'))
      .slice(-4)
      .map((memory) => ({
        id: memory.id,
        summary: memory.summary,
        tags: memory.tags,
        severity: memory.intensity,
        townId: undefined,
        factionIds: memory.tags.filter((tag) => tag.includes('-')),
      }));
    return [...memoryRumors, ...townRumors, ...publicRumors]
      .filter((rumor) => !this.isConversationMetaRumor(rumor))
      .filter((rumor, index, all) => all.findIndex((entry) => entry.id === rumor.id) === index)
      .sort((a, b) => b.severity - a.severity);
  }

  private getConversationFactionEvents(actor: Actor): ActorFactionConversationState[] {
    const room = this.getCurrentRoom();
    const events: ActorFactionConversationState[] = this.factionEvents
      .getEventsForActor(actor, 6)
      .filter((event) => this.isConversationRelevantFactionEvent(event, room))
      .map((event) => ({
        relation: factionRelationForCurrentEvent(event),
        factionIds: [...event.factionIds],
        townId: event.townId,
        severity: event.severity,
        tags: [...event.tags, event.phase],
        summary: event.summary,
      }));
    if (room.town && room.town.wantedLevel > 0) {
      events.push({
        relation: room.town.wantedLevel >= 3 ? 'hostile' : 'tense',
        factionIds: ['hearthbound-remnant'],
        townId: room.town.id,
        severity: Math.min(
          20,
          room.town.wantedLevel * 5 + Math.floor((room.town.suspicion ?? 0) / 20),
        ),
        tags: ['wanted', 'crime', 'town'],
        summary: `Wanted level ${room.town.wantedLevel} in ${room.town.name}.`,
      });
    }
    if (room.town && (room.town.suspicion ?? 0) >= 50) {
      events.push({
        relation: 'tense',
        factionIds: ['hearthbound-remnant', String(actor.factionId ?? 'locals')],
        townId: room.town.id,
        severity: Math.min(18, Math.floor((room.town.suspicion ?? 0) / 6)),
        tags: ['suspicion', 'town', 'witness'],
        summary: `${room.town.name} is watching strangers carefully.`,
      });
    }
    if (room.town && (room.town.reputation ?? 0) <= -20) {
      events.push({
        relation: 'hostile',
        factionIds: ['hearthbound-remnant', String(actor.factionId ?? 'locals')],
        townId: room.town.id,
        severity: Math.min(20, Math.abs(room.town.reputation ?? 0)),
        tags: ['reputation', 'town', 'resentment'],
        summary: `${room.town.name} has started turning bad stories into policy.`,
      });
    }
    const isGoblinSide =
      actor.species === 'goblin' ||
      actor.personality.includes('goblin') ||
      actor.factionId === 'goblin-camps';
    const isHumanSide = actor.species === 'human' || actor.factionId === 'hearthbound-remnant';
    if (isGoblinSide || isHumanSide) {
      events.push({
        relation: 'tense',
        factionIds: ['hearthbound-remnant', 'goblin-camps'],
        townId: room.town?.id,
        severity: 4,
        tags: ['goblin', 'human', 'truce', 'ambient'],
        summary: 'Human guards and goblin traders are maintaining a tense truce.',
      });
    }
    const banditRumor = this.getRecentWorldRumors(12)
      .filter((rumor) => this.isConversationRelevantWorldRumor(rumor, room))
      .find((rumor) => rumor.tags.some((tag) => tag.includes('bandit') || tag === 'hostile-kill'));
    if (banditRumor) {
      events.push({
        relation: 'skirmishing',
        factionIds: ['bandits', String(actor.factionId ?? 'locals')],
        townId: room.town?.id,
        severity: Math.min(20, Math.max(8, Math.floor(banditRumor.severity / 4))),
        tags: ['bandit', 'danger'],
        summary: banditRumor.summary,
      });
    }
    return events
      .filter(
        (event, index, all) => all.findIndex((entry) => entry.summary === event.summary) === index,
      )
      .sort((a, b) => b.severity - a.severity);
  }

  private isConversationRelevantWorldRumor(rumor: WorldRumor, room: RoomSnapshot): boolean {
    const currentRoomNumber = this.getRoomsVisitedCount();
    const age = Math.max(0, currentRoomNumber - (rumor.createdAtRoomNumber ?? currentRoomNumber));
    const localToRoom = rumor.roomId === room.id;
    const localToTown = Boolean(rumor.townId && room.town?.id === rumor.townId);
    const isBanditThread = rumor.tags.some((tag) => tag.includes('bandit') || tag === 'raid');
    if (localToRoom || localToTown) {
      return age <= (isBanditThread ? 18 : 30) || rumor.severity >= 65;
    }
    if (isBanditThread) {
      return age <= 8;
    }
    return age <= 16 || rumor.severity >= 70;
  }

  private isConversationRelevantFactionEvent(
    event: FactionCurrentEvent,
    room: RoomSnapshot,
  ): boolean {
    const currentRoomNumber = this.getRoomsVisitedCount();
    if (
      event.phase === 'resolved' ||
      (event.expiresAt !== undefined && event.expiresAt <= currentRoomNumber)
    ) {
      return false;
    }
    const age = Math.max(0, currentRoomNumber - event.createdAt);
    const localToRoom = event.roomId === room.id;
    const localToTown = Boolean(event.townId && room.town?.id === event.townId);
    const isBanditThread = event.tags.some((tag) => tag.includes('bandit') || tag === 'raid');
    if (localToRoom || localToTown) {
      return age <= (isBanditThread ? 18 : 30) || event.phase === 'active';
    }
    if (isBanditThread) {
      return age <= 8 && event.phase === 'active';
    }
    return age <= 16;
  }

  private isConversationMetaRumor(rumor: ActorConversationRumor): boolean {
    if (rumor.tags.includes('conversation') || rumor.tags.includes('actor-asked-around')) {
      return true;
    }
    return /\bspoke about (around|talk|personal)\./i.test(rumor.summary);
  }

  private applyActorConversationResult(actor: Actor, result: ActorConversationResult): void {
    if (result.revealsSoul || result.socialLinkActorId || result.knownFact) {
      this.actors.registry.update(actor.id, (current) => ({
        ...current,
        knownToPlayer: true,
        focus: Math.min(100, (current.focus ?? 0) + (result.bucket === 'ask-personal' ? 8 : 3)),
        soul:
          result.revealsSoul && current.soul
            ? {
                ...current.soul,
                revealed: { ...current.soul.revealed, [result.revealsSoul]: true },
              }
            : current.soul,
        lore:
          result.topic === 'personal.king' && current.lore
            ? {
                ...current.lore,
                revealedLoreIds: [
                  ...new Set([
                    ...current.lore.revealedLoreIds,
                    `king:${current.lore.kingOpinion ?? 'unknown'}:${current.lore.anchorInstitution ?? 'road'}`,
                  ]),
                ].slice(-12),
              }
            : current.lore,
        relationships: result.socialLinkActorId
          ? current.relationships.map((entry) =>
              entry.actorId === result.socialLinkActorId
                ? { ...entry, knownToPlayer: true }
                : entry,
            )
          : current.relationships,
      }));
    }
    if (result.knownFact) {
      this.recordActorKnownFact(actor.id, result.source, result.knownFact);
    }
    if (result.revealsSoul || result.topic === 'personal.king') {
      this.emitWorldEvent({
        type: 'actor-personal-reveal',
        roomId: this.snake.currentRoomId,
        sourceActorId: actor.id,
        severity: result.revealsSoul === 'secret' || result.topic === 'personal.king' ? 38 : 18,
        loudness: 1,
        tags: ['personal', 'reveal', result.source, ...result.tags],
        summary: `${actor.displayName} revealed something personal.`,
        createdAtRoomNumber: this.getRoomsVisitedCount(),
        data: {
          topic: result.topic,
          reveal: result.revealsSoul,
          knownFact: result.knownFact,
        },
      });
    }
    if (result.source === 'rumor') {
      const rumor = this.getConversationRumorsForActor(actor)[0];
      if (rumor) {
        this.rememberActorRumor(actor.id, {
          id: `memory:${rumor.id}:${actor.id}`,
          eventId: rumor.id,
          type: 'rumor',
          summary: rumor.summary,
          source: 'rumor',
          intensity: rumor.severity,
          tags: [...rumor.tags, 'rumor'],
          createdAtRoomNumber: this.getRoomsVisitedCount(),
        });
      }
    }
  }

  private recordActorKnownFact(
    actorId: string,
    source: ActorConversationResult['source'],
    text: string,
  ): void {
    const existing = this.getFlag<ActorKnownFact[]>('actors.knownFacts') ?? [];
    const id = `fact:${actorId}:${this.hashText(text)}`;
    if (existing.some((fact) => fact.id === id)) {
      return;
    }
    const kind: ActorKnownFact['kind'] =
      source === 'social'
        ? 'social'
        : source === 'lore'
          ? 'lore'
          : source === 'faction'
            ? 'faction'
            : source === 'memory' || source === 'rumor'
              ? 'memory'
              : 'soul';
    this.setFlag(
      'actors.knownFacts',
      [...existing, { id, actorId, kind, text, learnedAtRoom: this.getRoomsVisitedCount() }].slice(
        -80,
      ),
    );
    this.setFlag('ui.actorKnownFact', { actorId, text });
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash * 31 + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  askActorRumor(actorId: string): string | null {
    const actor = this.actors.getActor(actorId);
    if (!actor) {
      return null;
    }
    const availableRumors = this.getConversationRumorsForActor(actor);
    const cursorKey = `actor.rumorCursor.${actorId}`;
    const cursor = Math.max(0, Math.floor(Number(this.getFlag<number>(cursorKey) ?? 0)));
    const rumor =
      availableRumors.length > 0 ? availableRumors[cursor % availableRumors.length] : undefined;
    const fallbackMemory = actor.memory[actor.memory.length - 1];
    if (!rumor && !fallbackMemory) {
      return `${actor.displayName} has heard nothing worth sharpening into a rumor.`;
    }
    if (rumor) {
      this.setFlag(cursorKey, cursor + 1);
      this.rememberActorRumor(actorId, {
        id: `memory:${rumor.id}:${actorId}`,
        eventId: rumor.id,
        type: 'rumor',
        summary: rumor.summary,
        source: 'rumor',
        intensity: rumor.severity,
        tags: [...rumor.tags, 'rumor'],
        createdAtRoomNumber: this.getRoomsVisitedCount(),
      });
      return formatActorRumorLine(actor.displayName, rumor.summary);
    }
    return `${actor.displayName} says, "I remember this: ${fallbackMemory?.summary}"`;
  }

  askActorPersonalReveal(actorId: string): string | null {
    const actor = this.actors.getActor(actorId);
    if (!actor?.soul) {
      return null;
    }
    const reveal = nextSoulReveal(actor);
    if (!reveal) {
      return `${actor.displayName} has told you what they can bear to tell.`;
    }
    this.actors.registry.update(actorId, (current) => ({
      ...current,
      focus: Math.min(100, (current.focus ?? 0) + 8),
      soul: current.soul
        ? {
            ...current.soul,
            revealed: { ...current.soul.revealed, [reveal.key]: true },
          }
        : current.soul,
    }));
    return `${actor.displayName} lets something private show: ${reveal.text}`;
  }

  askActorSocialTie(actorId: string): string | null {
    const actor = this.actors.getActor(actorId);
    const link =
      actor?.relationships.find((entry) => !entry.knownToPlayer) ?? actor?.relationships[0];
    if (!actor || !link) {
      return actor ? `${actor.displayName} does not offer any names.` : null;
    }
    const target = this.actors.getActor(link.actorId);
    this.actors.registry.update(actorId, (current) => ({
      ...current,
      relationships: current.relationships.map((entry) =>
        entry.actorId === link.actorId ? { ...entry, knownToPlayer: true } : entry,
      ),
    }));
    return socialTieLine(actor.displayName, link, target?.displayName);
  }

  askActorKingLore(actorId: string): string | null {
    const actor = this.actors.getActor(actorId);
    if (!actor?.lore?.knowsAboutKing) {
      return actor ? `${actor.displayName} knows only the little laws, not the royal story.` : null;
    }
    const loreId = `king:${actor.id}:${actor.lore.kingOpinion ?? 'unknown'}`;
    this.actors.registry.update(actorId, (current) => ({
      ...current,
      focus: Math.min(100, (current.focus ?? 0) + 5),
      lore: current.lore
        ? {
            ...current.lore,
            revealedLoreIds: current.lore.revealedLoreIds.includes(loreId)
              ? current.lore.revealedLoreIds
              : [...current.lore.revealedLoreIds, loreId].slice(-8),
          }
        : current.lore,
    }));
    const place = formatLorePlace(actor.lore.anchorPlace);
    const institution = actor.lore.anchorInstitution ?? 'the office';
    return formatActorKingLoreLine(actor.displayName, place, institution, actor.lore.kingOpinion);
  }

  apologizeToActor(actorId: string): string | null {
    const actor = this.actors.getActor(actorId);
    if (!actor) {
      return null;
    }
    this.actors.registry.update(actorId, (current) => ({
      ...current,
      hostility: current.hostility === 'suspicious' ? 'neutral' : current.hostility,
      mood: {
        ...current.mood,
        anger: Math.max(0, current.mood.anger - 18),
        stress: Math.max(0, current.mood.stress - 8),
        trust: Math.min(100, current.mood.trust + 6),
      },
      opinions: {
        ...current.opinions,
        player: {
          targetId: 'player',
          trust: Math.min(100, (current.opinions.player?.trust ?? 0) + 8),
          fear: Math.max(-100, (current.opinions.player?.fear ?? 0) - 3),
          respect: current.opinions.player?.respect ?? 0,
          affection: current.opinions.player?.affection ?? 0,
          resentment: Math.max(-100, (current.opinions.player?.resentment ?? 0) - 12),
          attraction: current.opinions.player?.attraction ?? 0,
          debt: current.opinions.player?.debt ?? 0,
        },
      },
    }));
    this.applyActorRelationshipInteraction(actorId, 'apologize');
    return `${actor.displayName} accepts the apology as a down payment, not a miracle.`;
  }

  threatenActor(actorId: string): string | null {
    const actor = this.actors.getActor(actorId);
    if (!actor) {
      return null;
    }
    this.actors.registry.update(actorId, (current) => ({
      ...current,
      hostility:
        current.hostility === 'friendly' || current.hostility === 'neutral'
          ? 'suspicious'
          : current.hostility,
      mood: {
        ...current.mood,
        fear: Math.min(100, current.mood.fear + 16),
        anger: Math.min(100, current.mood.anger + 12),
        trust: Math.max(-100, current.mood.trust - 14),
      },
    }));
    this.emitWorldEvent({
      type: 'town-crime',
      roomId: this.snake.currentRoomId,
      targetActorIds: [actorId],
      severity: 28,
      loudness: 30,
      tags: ['crime', 'threat', 'actorInteraction'],
      summary: `${actor.displayName} was threatened.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
    });
    this.applyActorRelationshipInteraction(actorId, 'threaten');
    return `${actor.displayName} remembers the threat immediately. So may everyone else.`;
  }

  parleyWithActor(actorId: string): string | null {
    const actor = this.actors.getActor(actorId);
    if (!actor) {
      return null;
    }
    const fear = actor.mood.fear;
    const anger = actor.mood.anger;
    const succeeds = fear >= anger || actor.hostility === 'surrendering';
    this.actors.registry.update(actorId, (current) => ({
      ...current,
      hostility: succeeds ? 'suspicious' : current.hostility,
      mood: {
        ...current.mood,
        anger: succeeds
          ? Math.max(0, current.mood.anger - 14)
          : Math.min(100, current.mood.anger + 8),
        stress: Math.max(0, current.mood.stress - (succeeds ? 6 : 0)),
      },
    }));
    this.applyActorRelationshipInteraction(actorId, succeeds ? 'parley' : 'threaten');
    return succeeds
      ? `${actor.displayName} lowers the weapon a little. Not enough. Enough to talk.`
      : `${actor.displayName} hears parley and keeps the dangerous part of the conversation.`;
  }

  private applyActorRelationshipInteraction(
    actorId: string,
    kind: 'apologize' | 'threaten' | 'parley' | 'attack',
  ): void {
    const actor = this.actors.getActor(actorId);
    const relationshipId =
      typeof actor?.flags.relationshipId === 'string' ? actor.flags.relationshipId : undefined;
    if (!relationshipId) {
      return;
    }
    const state = this.relationshipController.applyActorInteraction(
      relationshipId,
      kind,
      this.getRoomsVisitedCount(),
    );
    if (state) {
      this.ensureRelationshipActorForState(state);
    }
  }

  private handlePlayerBulletDefeats(defeatedEnemies: readonly EnemyInstance[]): void {
    for (const enemy of defeatedEnemies) {
      this.setFlag('achievement.enemyDefeated', { enemyId: enemy.id, method: 'gun' });
      this.setFlag('achievement.gunKill', { targetId: enemy.id });
      const defeatedRaidBandit = enemy.id.startsWith('npc-hostile:raidBandit-');
      if (defeatedRaidBandit) {
        this.noteBanditRaidDefeat(enemy, false);
        const actorId = enemy.actorId ?? this.actors.getStableEnemyActorId(enemy.roomId, enemy.id);
        this.emitWorldEvent({
          type: 'enemy-defeated',
          roomId: enemy.roomId,
          targetActorIds: [actorId],
          severity: 48,
          loudness: 45,
          tags: ['combat', 'shot', 'hostile-kill', 'humanoid', 'bandit', 'raid'],
          summary: `${enemy.name ?? 'A raid bandit'} was shot down.`,
          createdAtRoomNumber: this.getRoomsVisitedCount(),
          data: { enemyId: enemy.id, encounterKind: enemy.encounterKind },
        });
        this.setFlag('ui.questInteraction', {
          message: `${enemy.name ?? 'The raid bandit'} was shot down.`,
        });
        continue;
      }
      if (enemy.encounterKind !== 'npc-hostile') {
        continue;
      }
      const relationshipId = this.getRelationshipIdFromHostileNpc(enemy.id);
      if (relationshipId) {
        this.npcBodies.delete(relationshipId);
        const event = this.relationshipController.recordKilledByPlayer(
          relationshipId,
          this.getRoomsVisitedCount(),
          'shot',
        );
        this.markRelationshipActorDead(event.state, 'shot');
        this.setFlag('ui.relationshipEvent', {
          title: event.title,
          message: event.message,
          color: event.color,
        });
      } else {
        this.setFlag('ui.questInteraction', {
          message: `${enemy.name ?? 'The hostile NPC'} was shot down.`,
        });
      }
    }
  }

  private markRelationshipActorDead(
    state: RelationshipState | undefined,
    cause: 'eaten' | 'shot' | 'killed',
  ): void {
    if (!state) {
      return;
    }
    const actorId = state.actorId ?? this.actors.getStableRelationshipActorId(state.id);
    const updated = this.actors.registry.update(actorId, (actor) => ({
      ...actor,
      health: { current: 0, max: actor.health?.max ?? 1, state: 'dead' },
      hostility: 'dead',
      mood: {
        ...actor.mood,
        fear: 100,
        stress: 100,
      },
      flags: {
        ...actor.flags,
        relationshipId: state.id,
        relationshipStage: 'dead',
        dead: true,
        eaten: cause === 'eaten' ? true : actor.flags.eaten,
        causeOfDeath:
          cause === 'eaten' ? 'Eaten by you' : cause === 'shot' ? 'Shot by you' : 'Killed by you',
      },
    }));
    if (!updated) {
      this.actors.registry.ensureRelationshipActor({
        actorId,
        relationshipId: state.id,
        displayName: state.displayName,
        species: state.species,
        factionId: state.factionId,
        homeRoomId: state.homeRoomId,
        portraitId: state.portraitId,
        stage: 'dead',
        createdAtRoomNumber: this.getRoomsVisitedCount(),
      });
    }
  }

  emitWorldEvent(input: CreateWorldEventInput): WorldEvent {
    const event = this.actors.emitWorldEvent(input);
    this.recordRumorFromWorldEvent(event);
    const factionEvents = this.factionEvents.createEventsFromWorldEvent(
      event,
      this.actors.registry.getAll(),
    );
    for (const factionEvent of factionEvents) {
      this.recordRumorFromFactionEvent(factionEvent);
    }
    this.propagateWorldEvent(event);
    this.propagateSocialConsequences(event);
    this.applyFactionReportsForEvent(event);
    return event;
  }

  getRecentWorldRumors(limit = 8): readonly WorldRumor[] {
    const modern = this.rumors.getRecent(limit).map(rumorToWorldRumor);
    if (modern.length > 0) {
      return modern;
    }
    const rumors = this.getFlag<WorldRumor[]>('world.rumors') ?? [];
    return rumors.slice(-Math.max(0, limit)).reverse();
  }

  getCurrentFactionEvents(limit = 12): readonly FactionCurrentEvent[] {
    return this.factionEvents.getEvents(limit);
  }

  startBanditRaidForCurrentRoom(severity = 48): FactionCurrentEvent {
    const room = this.getCurrentRoom();
    this.syncActorsForRoom(room);
    const event = this.factionEvents.createEvent({
      type: 'raid-active',
      factionIds: ['bandits', 'guards', 'shopkeepers'],
      townId: room.town?.id ?? room.goblinCamp?.id,
      roomId: room.id,
      severity,
      phase: 'active',
      createdAt: this.getRoomsVisitedCount(),
      expiresAt: this.getRoomsVisitedCount() + 10,
      summary: 'Bandits are attacking while everyone argues about whose job prevention was.',
      tags: ['bandit', 'raid', 'active', 'danger'],
    });
    this.recordRumorFromFactionEvent(event);
    this.spawnBanditRaidForEvent(event, room);
    this.setFlag('factions.v2.save', this.factionEvents.save());
    return event;
  }

  isCurrentRoomRaidActive(): boolean {
    return this.factionEvents
      .getEventsForRoom(this.snake.currentRoomId, 8)
      .some((event) => event.type === 'raid-active' && event.phase === 'active');
  }

  getCurrentRoomRaidMessage(): string | null {
    const event = this.factionEvents
      .getEventsForRoom(this.snake.currentRoomId, 8)
      .find((current) => current.type === 'raid-active' && current.phase === 'active');
    if (!event) {
      return null;
    }
    return event.summary;
  }

  getPeopleJournalView(limit = 24): ActorJournalEntry[] {
    const knownFacts = this.getFlag<ActorKnownFact[]>('actors.knownFacts') ?? [];
    return this.actors.registry
      .getAll()
      .filter(
        (actor) => actor.kind !== 'animal' && actor.kind !== 'enemy' && actor.hostility !== 'dead',
      )
      .sort((a, b) => {
        const knownA =
          a.knownToPlayer ||
          a.memory.length > 0 ||
          a.relationships.some((link) => link.knownToPlayer) ||
          knownFacts.some((fact) => fact.actorId === a.id);
        const knownB =
          b.knownToPlayer ||
          b.memory.length > 0 ||
          b.relationships.some((link) => link.knownToPlayer) ||
          knownFacts.some((fact) => fact.actorId === b.id);
        if (knownA !== knownB) return knownA ? -1 : 1;
        return (b.focus ?? 0) - (a.focus ?? 0);
      })
      .slice(0, limit)
      .map((actor) => {
        const actorFacts = knownFacts
          .filter((fact) => fact.actorId === actor.id)
          .slice(-4)
          .map((fact) => fact.text);
        return {
          id: actor.id,
          name: actor.displayName,
          role: actor.role,
          faction: actor.factionId ? String(actor.factionId) : undefined,
          roomId: actor.currentRoomId,
          mood: summarizeActorMoodForJournal(actor),
          health: actor.health
            ? `${actor.health.state} ${actor.health.current}/${actor.health.max}`
            : undefined,
          memories: actor.memory.slice(-3).map((memory) => memory.summary),
          socialTies: actor.relationships
            .filter((link) => link.knownToPlayer)
            .slice(0, 3)
            .map((link) => {
              const target = this.actors.getActor(link.actorId);
              return `${link.relationship}: ${target?.displayName ?? link.actorId}`;
            }),
          reveals: actor.soul
            ? [
                actor.soul.revealed.wound ? `Wound: ${actor.soul.wound}` : '',
                actor.soul.revealed.insecurity ? `Insecurity: ${actor.soul.insecurity}` : '',
                actor.soul.revealed.contradiction
                  ? `Contradiction: ${actor.soul.contradiction}`
                  : '',
                actor.soul.revealed.secret ? `Secret: ${actor.soul.secret}` : '',
              ].filter(Boolean)
            : [],
          knownFacts: actorFacts,
        };
      });
  }

  private isHostileHumanoidEnemy(enemy?: EnemyInstance): boolean {
    return (
      enemy?.encounterKind === 'enemy' ||
      enemy?.encounterKind === 'npc-hostile' ||
      enemy?.encounterKind === 'goblin' ||
      enemy?.encounterKind === 'duelist'
    );
  }

  private tickFactionRaidGameplay(): void {
    const room = this.world.getRoom(this.snake.currentRoomId);
    const currentRoomNumber = this.getRoomsVisitedCount();
    this.rumors.tick(currentRoomNumber);
    this.factionEvents.tick(currentRoomNumber);
    for (const event of this.factionEvents.getEventsForRoom(room.id, 8)) {
      if (
        event.type === 'raid-warning' &&
        event.phase === 'brewing' &&
        event.createdAt < currentRoomNumber
      ) {
        const active = this.factionEvents.activateRaidWarning(event.id, currentRoomNumber);
        if (active) {
          this.recordRumorFromFactionEvent(active);
          this.spawnBanditRaidForEvent(active, room);
        }
      } else if (event.type === 'raid-active' && event.phase === 'active') {
        this.spawnBanditRaidForEvent(event, room);
        this.maybeRecordBanditRaidAftermath(event, room);
      }
    }
    this.setFlag('factions.v2.save', this.factionEvents.save());
  }

  private spawnBanditRaidForEvent(event: FactionCurrentEvent, room: RoomSnapshot): void {
    const raidKey = this.banditRaidFlagKey(event.id);
    const existingState = this.getFlag<BanditRaidRuntimeState>(raidKey);
    if (existingState?.banditEnemyIds.length) {
      return;
    }
    const count = event.severity >= 62 ? 4 : event.severity >= 48 ? 3 : 2;
    const spawns = this.findBanditRaidSpawnPositions(room, count);
    if (spawns.length === 0) {
      return;
    }
    const banditEnemyIds: string[] = [];
    spawns.forEach((position, index) => {
      const idSuffix = `raidBandit-${this.hashText(event.id)}-${index}`;
      const actorId = `enemy:${room.id}:${idSuffix}`;
      const enemy = this.enemies.spawnHostileNpc(
        room.id,
        position,
        `Raid Bandit ${index + 1}`,
        1,
        idSuffix,
        1,
        actorId,
      );
      enemy.fireCooldown = Math.min(enemy.fireCooldown, 1 + index);
      enemy.moveCooldown = Math.min(enemy.moveCooldown, 1);
      banditEnemyIds.push(enemy.id);
      this.actors.registry.ensureEnemyActor({
        actorId,
        enemyId: enemy.id,
        roomId: room.id,
        name: enemy.name,
        encounterKind: enemy.encounterKind,
        currentHearts: enemy.currentHearts,
        maxHearts: enemy.maxHearts,
        createdAtRoomNumber: this.getRoomsVisitedCount(),
      });
    });
    this.setFlag(raidKey, {
      eventId: event.id,
      roomId: room.id,
      banditEnemyIds,
      banditsKilled: 0,
      banditsEaten: 0,
      startedAtRoom: this.getRoomsVisitedCount(),
    } satisfies BanditRaidRuntimeState);
    this.activateBanditRaidDefenders(event, room);
    this.setFlag('ui.questInteraction', {
      message: `Bandits are raiding ${room.town?.name ?? room.goblinCamp?.name ?? 'this place'}.`,
    });
    this.emitWorldEvent({
      type: 'bandit-raid-started',
      roomId: room.id,
      targetActorIds: banditEnemyIds,
      severity: event.severity,
      loudness: 55,
      tags: ['bandit', 'raid', 'combat', 'faction'],
      summary: `Bandits started a raid in ${room.town?.name ?? room.goblinCamp?.name ?? 'the room'}.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { townId: room.town?.id ?? room.goblinCamp?.id, factionEventId: event.id },
    });
  }

  private maybeRecordBanditRaidAftermath(event: FactionCurrentEvent, room: RoomSnapshot): void {
    const raidKey = this.banditRaidFlagKey(event.id);
    const state = this.getFlag<BanditRaidRuntimeState>(raidKey);
    if (!state || state.aftermathRecorded) {
      return;
    }
    const activeIds = new Set(this.enemies.getEnemiesInRoom(room.id).map((enemy) => enemy.id));
    if (state.banditEnemyIds.some((id) => activeIds.has(id))) {
      return;
    }
    const aftermath = this.factionEvents.recordRaidAftermath({
      roomId: room.id,
      townId: room.town?.id ?? room.goblinCamp?.id,
      createdAt: this.getRoomsVisitedCount(),
      banditsKilled: state.banditsKilled + state.banditsEaten,
      banditsEaten: state.banditsEaten,
      playerHelped: state.banditsKilled + state.banditsEaten > 0,
    });
    this.resolveBanditRaidDefenders(aftermath, room, state);
    this.recordRumorFromFactionEvent(aftermath);
    this.setFlag(raidKey, { ...state, aftermathRecorded: true } satisfies BanditRaidRuntimeState);
    this.setFlag('ui.questInteraction', {
      message:
        state.banditsEaten > 0
          ? `The raid is over. The bandits learned about emergency medicine.`
          : `The raid is over. Everyone is deciding how grateful to sound.`,
    });
  }

  private noteBanditRaidDefeat(enemy: EnemyInstance, eaten: boolean): void {
    if (!enemy.id.startsWith('npc-hostile:raidBandit-')) {
      return;
    }
    for (const event of this.factionEvents.getEventsForRoom(enemy.roomId, 12)) {
      if (event.type !== 'raid-active') {
        continue;
      }
      const key = this.banditRaidFlagKey(event.id);
      const state = this.getFlag<BanditRaidRuntimeState>(key);
      if (!state?.banditEnemyIds.includes(enemy.id)) {
        continue;
      }
      this.setFlag(key, {
        ...state,
        banditsKilled: state.banditsKilled + (eaten ? 0 : 1),
        banditsEaten: state.banditsEaten + (eaten ? 1 : 0),
      } satisfies BanditRaidRuntimeState);
      return;
    }
  }

  private activateBanditRaidDefenders(event: FactionCurrentEvent, room: RoomSnapshot): void {
    for (const actor of this.actors.registry.getByRoom(room.id)) {
      if (actor.kind === 'animal' || actor.kind === 'enemy' || actor.factionId === 'bandits') {
        continue;
      }
      const canDefend =
        isTownGuardRole(actor.role) ||
        isTownShopRole(actor.role) ||
        actor.role === 'goblinMerchant';
      const shopClosed = isTownShopRole(actor.role) || actor.role === 'goblinMerchant';
      this.actors.registry.update(actor.id, (current) => ({
        ...current,
        hostility: canDefend && current.hostility !== 'dead' ? 'suspicious' : current.hostility,
        mood: {
          ...current.mood,
          fear: Math.min(100, current.mood.fear + (canDefend ? 18 : 30)),
          anger: Math.min(100, current.mood.anger + (canDefend ? 24 : 8)),
          stress: Math.min(100, current.mood.stress + 34),
          trust: current.mood.trust,
        },
        memory: [
          ...current.memory.filter(
            (memory) => memory.id !== `memory:raid:defender:${event.id}:${current.id}`,
          ),
          {
            id: `memory:raid:defender:${event.id}:${current.id}`,
            eventId: event.id,
            type: 'bandit-raid-started',
            summary: canDefend
              ? 'They took position during a bandit raid.'
              : 'They hid during a bandit raid.',
            source: 'witnessed' as const,
            intensity: event.severity,
            roomId: room.id,
            targetActorIds: event.actorIds,
            tags: ['bandit', 'raid', canDefend ? 'defender' : 'shelter'],
            createdAtRoomNumber: this.getRoomsVisitedCount(),
          },
        ].slice(current.thickness === 'thick' ? -40 : current.thickness === 'medium' ? -20 : -6),
        flags: {
          ...current.flags,
          activeFactionEventId: event.id,
          raidDefender: canDefend || undefined,
          raidShelter: !canDefend || undefined,
          shopClosedReason: shopClosed ? 'Closed during the raid' : current.flags.shopClosedReason,
        },
      }));
    }
  }

  private resolveBanditRaidDefenders(
    aftermath: FactionCurrentEvent,
    room: RoomSnapshot,
    state: BanditRaidRuntimeState,
  ): void {
    for (const actor of this.actors.registry.getByRoom(room.id)) {
      if (actor.flags.activeFactionEventId !== state.eventId) {
        continue;
      }
      this.actors.registry.update(actor.id, (current) => ({
        ...current,
        hostility:
          current.hostility === 'suspicious' && current.flags.raidDefender
            ? 'neutral'
            : current.hostility,
        mood: {
          ...current.mood,
          fear: Math.max(0, current.mood.fear - 8),
          anger: Math.max(0, current.mood.anger - 4),
          stress: Math.max(0, current.mood.stress - 10),
          trust: Math.min(
            100,
            current.mood.trust + (state.banditsKilled + state.banditsEaten > 0 ? 8 : 0),
          ),
        },
        memory: [
          ...current.memory.filter(
            (memory) => memory.id !== `memory:raid:aftermath:${aftermath.id}:${current.id}`,
          ),
          {
            id: `memory:raid:aftermath:${aftermath.id}:${current.id}`,
            eventId: aftermath.id,
            type: 'bandit-raid-ended',
            summary:
              state.banditsEaten > 0
                ? 'The raid ended after the snake ate some of the attackers.'
                : 'The raid ended and the town started counting damage.',
            source: 'witnessed' as const,
            intensity: aftermath.severity,
            roomId: room.id,
            tags: ['bandit', 'raid', 'aftermath'],
            createdAtRoomNumber: this.getRoomsVisitedCount(),
          },
        ].slice(current.thickness === 'thick' ? -40 : current.thickness === 'medium' ? -20 : -6),
        flags: {
          ...current.flags,
          activeFactionEventId: undefined,
          raidDefender: undefined,
          raidShelter: undefined,
          shopClosedReason: undefined,
        },
      }));
    }
  }

  private findBanditRaidSpawnPositions(room: RoomSnapshot, count: number): Vector2Like[] {
    const [roomX, roomY] = room.id.split(',').map(Number);
    const head = this.snake.bodySegments[0];
    const headLocal = head
      ? {
          x: head.x - roomX * this.config.grid.cols,
          y: head.y - roomY * this.config.grid.rows,
        }
      : { x: Math.floor(this.config.grid.cols / 2), y: Math.floor(this.config.grid.rows / 2) };
    const occupied = new Set<string>();
    for (const body of this.npcBodies.values()) {
      if (body.roomId === room.id) occupied.add(`${body.position.x},${body.position.y}`);
    }
    for (const enemy of this.enemies.getEnemiesInRoom(room.id)) {
      occupied.add(`${enemy.position.x},${enemy.position.y}`);
    }
    const candidates: Array<Vector2Like & { distance: number; order: string }> = [];
    for (let y = 0; y < this.config.grid.rows; y += 1) {
      for (let x = 0; x < this.config.grid.cols; x += 1) {
        if (!this.isBanditRaidSpawnTile(room.layout[y]?.[x])) continue;
        if (occupied.has(`${x},${y}`)) continue;
        if (room.questGiver && room.questGiver.x === x && room.questGiver.y === y) continue;
        const distance = Math.abs(x - headLocal.x) + Math.abs(y - headLocal.y);
        if (distance < 5) continue;
        candidates.push({ x, y, distance, order: this.hashText(`${room.id}:${x}:${y}`) });
      }
    }
    return candidates
      .sort((a, b) => b.distance - a.distance || a.order.localeCompare(b.order))
      .slice(0, count)
      .map(({ x, y }) => ({ x, y }));
  }

  private isBanditRaidSpawnTile(tile: string | undefined): boolean {
    return Boolean(tile && tile !== '#' && tile !== '~' && !isBlockingTownTile(tile));
  }

  private banditRaidFlagKey(eventId: string): string {
    return `factions.raid.${this.hashText(eventId)}`;
  }

  private recordRumorFromWorldEvent(event: WorldEvent): void {
    const room = event.roomId ? this.world.getRoom(event.roomId) : undefined;
    const modernRumor = this.rumors.createFromWorldEvent(
      event,
      room?.town?.id ?? room?.goblinCamp?.id,
    );
    if (!modernRumor) {
      return;
    }
    this.syncRumorFlags();
    this.seedTownRumorFromModernRumor(event, modernRumor);
  }

  private recordRumorFromFactionEvent(event: FactionCurrentEvent): void {
    const rumor = this.rumors.createFromFactionEvent(event, event.createdAt);
    this.syncRumorFlags();
    this.setFlag('factions.v2.save', this.factionEvents.save());
    this.seedTownRumorFromModernRumor(
      {
        id: event.id,
        type: 'faction-skirmish-started',
        roomId: event.roomId,
        sourceActorId: event.actorIds[0],
        targetActorIds: event.actorIds,
        witnessActorIds: event.actorIds,
        severity: event.severity,
        loudness: event.severity,
        tags: event.tags,
        summary: event.summary,
        createdAtRoomNumber: event.createdAt,
        createdAtMs: Date.now(),
        data: { townId: event.townId },
      },
      rumor,
    );
  }

  private syncRumorFlags(): void {
    this.setFlag('rumors.save', this.rumors.save());
    this.setFlag('world.rumors', this.rumors.getAll().map(rumorToWorldRumor).slice(-100));
  }

  private recordLegacyRumorFromWorldEvent(event: WorldEvent): void {
    if (!this.shouldBecomeRumor(event)) {
      return;
    }
    const existing = this.getFlag<WorldRumor[]>('world.rumors') ?? [];
    if (existing.some((rumor) => rumor.eventId === event.id)) {
      return;
    }
    const room = event.roomId ? this.world.getRoom(event.roomId) : undefined;
    const rumor: WorldRumor = {
      id: `rumor:${event.id}`,
      eventId: event.id,
      roomId: event.roomId,
      townId: room?.town?.id ?? room?.goblinCamp?.id,
      summary: event.summary,
      tags: [...event.tags],
      severity: event.severity,
      createdAtRoomNumber: event.createdAtRoomNumber,
      heardByActorIds: [...event.witnessActorIds],
      truthLevel: 85,
      exaggeration: 10,
      sourceKind: event.witnessActorIds.length > 0 ? 'witness' : 'rumor',
      public: true,
    };
    this.setFlag('world.rumors', [...existing, rumor].slice(-50));
    this.seedTownRumorFromWorldEvent(event, rumor);
  }

  private shouldBecomeRumor(event: WorldEvent): boolean {
    if (event.severity >= 35 || event.loudness >= 35) {
      return true;
    }
    return event.tags.some((tag) =>
      ['crime', 'pickpocket', 'eaten', 'humanoid', 'relationship', 'marriage', 'guild'].includes(
        tag,
      ),
    );
  }

  private rememberActorRumor(actorId: string, memory: ActorMemory): void {
    this.actors.registry.update(actorId, (actor) => ({
      ...actor,
      memory: [...actor.memory.filter((item) => item.id !== memory.id), memory].slice(
        actor.thickness === 'thick' ? -40 : actor.thickness === 'medium' ? -20 : -6,
      ),
    }));
  }

  private propagateWorldEvent(event: WorldEvent): void {
    if (!event.roomId || event.loudness < 35) {
      return;
    }
    const nearbyRoomIds = this.getNeighborRoomIds(event.roomId);
    for (const actor of this.actors.registry.getAll()) {
      if (
        !actor.currentRoomId ||
        actor.currentRoomId === event.roomId ||
        !nearbyRoomIds.includes(actor.currentRoomId) ||
        event.targetActorIds.includes(actor.id) ||
        actor.id === event.sourceActorId
      ) {
        continue;
      }
      this.rememberActorRumor(actor.id, {
        id: `memory:heard:${event.id}:${actor.id}`,
        eventId: event.id,
        type: event.type,
        summary: `Heard nearby: ${event.summary}`,
        source: 'heard',
        intensity: Math.max(1, Math.round(event.severity * 0.6)),
        roomId: event.roomId,
        targetActorIds: event.targetActorIds,
        tags: [...event.tags, 'heard'],
        createdAtRoomNumber: event.createdAtRoomNumber,
      });
    }
  }

  private applyFactionReportsForEvent(event: WorldEvent): void {
    if (event.tags.includes('goblin') && event.tags.includes('eaten')) {
      this.adjustFactionAlignment('goblin-camps', -8);
    }
    if (event.type === 'town-crime' && event.tags.includes('witnessed')) {
      this.adjustFactionAlignment('hearthbound-remnant', -2);
    }
    if (event.type === 'humanoid-eaten' && event.tags.includes('humanoid')) {
      this.adjustFactionAlignment('hearthbound-remnant', -4);
    }
    if (event.tags.includes('marriage')) {
      this.adjustFactionAlignment('hearthbound-remnant', 1);
    }
  }

  private propagateSocialConsequences(event: WorldEvent): void {
    if (event.severity < 45 || event.targetActorIds.length === 0) {
      return;
    }
    const targets = new Set(event.targetActorIds);
    for (const actor of this.actors.registry.getAll()) {
      const affectedLink = actor.relationships.find((link) => targets.has(link.actorId));
      if (!affectedLink || event.witnessActorIds.includes(actor.id) || targets.has(actor.id)) {
        continue;
      }
      const target = this.actors.getActor(affectedLink.actorId);
      this.actors.registry.update(actor.id, (current) => ({
        ...current,
        hostility:
          event.type === 'humanoid-eaten' && affectedLink.relationship !== 'rival'
            ? 'suspicious'
            : current.hostility,
        mood: {
          ...current.mood,
          grief: Math.min(100, current.mood.grief + socialGriefFor(affectedLink.relationship)),
          anger: Math.min(100, current.mood.anger + socialAngerFor(affectedLink.relationship)),
          stress: Math.min(100, current.mood.stress + 12),
        },
        memory: [
          ...current.memory.filter(
            (memory) => memory.id !== `memory:social:${event.id}:${current.id}`,
          ),
          {
            id: `memory:social:${event.id}:${current.id}`,
            eventId: event.id,
            type: event.type,
            summary: `${target?.displayName ?? 'Someone connected to them'} was involved: ${event.summary}`,
            source: 'heard' as const,
            intensity: event.severity,
            roomId: event.roomId,
            targetActorIds: event.targetActorIds,
            tags: [...event.tags, 'socialLink', affectedLink.relationship],
            createdAtRoomNumber: event.createdAtRoomNumber,
          },
        ].slice(current.thickness === 'thick' ? -40 : current.thickness === 'medium' ? -20 : -6),
      }));
    }
  }

  private seedTownRumorFromWorldEvent(event: WorldEvent, rumor: WorldRumor): void {
    if (!event.roomId || !rumor.townId) {
      return;
    }
    const room = this.world.getRoom(event.roomId);
    if (!room.town || room.town.id !== rumor.townId) {
      return;
    }
    const exists = room.town.rumors.some((entry) => entry.id === rumor.id);
    if (exists) {
      return;
    }
    const kind = townRumorKindForEvent(event);
    const nextTown = cloneTown({
      ...room.town,
      rumors: [
        ...room.town.rumors,
        {
          id: rumor.id,
          townId: room.town.id,
          kind,
          summary: rumor.summary,
          roomsRemaining: 12,
          severity: rumor.severity,
          relatedRelationshipId:
            typeof event.data?.relationshipId === 'string' ? event.data.relationshipId : undefined,
          relatedNpcId: event.targetActorIds[0],
        },
      ].slice(-12),
    });
    room.town = nextTown;
    this.saveTownRuntimeState(nextTown);
    this.world.updateTown(nextTown);
  }

  private seedTownRumorFromModernRumor(event: WorldEvent, rumor: Rumor): void {
    if (!event.roomId || !rumor.townId) {
      return;
    }
    const room = this.world.getRoom(event.roomId);
    if (!room.town || room.town.id !== rumor.townId) {
      return;
    }
    const exists = room.town.rumors.some((entry) => entry.id === rumor.id);
    if (exists) {
      return;
    }
    const nextTown = cloneTown({
      ...room.town,
      rumors: [
        ...room.town.rumors,
        {
          id: rumor.id,
          townId: room.town.id,
          kind: townRumorKindForModernRumor(rumor),
          summary: rumor.summary,
          roomsRemaining: rumor.expiresAt
            ? Math.max(3, rumor.expiresAt - this.getRoomsVisitedCount())
            : 12,
          severity: rumor.severity,
          relatedRelationshipId:
            typeof event.data?.relationshipId === 'string' ? event.data.relationshipId : undefined,
          relatedNpcId: rumor.subjectActorId ?? event.targetActorIds[0],
        },
      ].slice(-12),
    });
    room.town = nextTown;
    this.saveTownRuntimeState(nextTown);
    this.world.updateTown(nextTown);
  }

  private getNeighborRoomIds(roomId: string): string[] {
    const [x, y, z = 0] = roomId.split(',').map(Number);
    return [`${x + 1},${y},${z}`, `${x - 1},${y},${z}`, `${x},${y + 1},${z}`, `${x},${y - 1},${z}`];
  }

  private worldToLocalInRoom(roomId: string, position: Vector2Like): Vector2Like {
    const [roomX = 0, roomY = 0] = this.parseRoomCoordinates(roomId);
    return {
      x: position.x - roomX * this.config.grid.cols,
      y: position.y - roomY * this.config.grid.rows,
    };
  }

  private syncActorsForRoom(room: RoomSnapshot): void {
    this.syncNpcBodiesForRoom(room);
    this.actors.syncRoom({
      room,
      animals: this.animals.getAnimalsInRoom(room.id),
      enemies: this.enemies.getEnemiesInRoom(room.id),
      relationships: this.relationshipController.getAllStates(),
      roomNumber: this.getRoomsVisitedCount(),
    });
  }

  private syncNpcBodiesForRoom(room: RoomSnapshot): void {
    const candidates = this.collectRoomNpcBodyCandidates(room);
    const activeIds = new Set(candidates.map((candidate) => candidate.profile.id));
    for (const candidate of candidates) {
      this.ensureNpcBody(candidate.profile, candidate.position, candidate.stationary);
    }
    for (const [id, body] of this.npcBodies) {
      if (body.roomId === room.id && !activeIds.has(id)) {
        this.npcBodies.delete(id);
      }
    }
    this.syncHostileNpcBodiesFromEnemies(room.id);
  }

  private collectRoomNpcBodyCandidates(room: RoomSnapshot): RoomNpcBodyCandidate[] {
    const candidates: RoomNpcBodyCandidate[] = [];
    const addCandidate = (candidate: RoomNpcBodyCandidate): void => {
      const state = this.relationshipController.getState(candidate.profile.id);
      if (state?.stage === 'dead' || state?.flags.dead || state?.flags.eatenByPlayer) {
        return;
      }
      const actor = candidate.profile.actorId
        ? this.actors.registry.get(candidate.profile.actorId)
        : undefined;
      if (
        actor?.hostility === 'dead' ||
        actor?.health?.state === 'dead' ||
        actor?.flags.dead ||
        actor?.flags.eaten
      ) {
        return;
      }
      candidates.push(candidate);
    };
    if (room.village) {
      for (const resident of room.village.residents) {
        addCandidate({
          profile: {
            id: `resident:${room.id}:${resident.id}`,
            actorId: this.getVillageActorId(room.id, resident.id, 'resident'),
            displayName: resident.name,
            species: 'human',
            portraitId: resident.portraitId,
            homeRoomId: room.id,
            factionId: 'hearthbound-remnant',
          },
          position: { x: resident.x, y: resident.y },
          stationary: false,
        });
      }
      addCandidate({
        profile: {
          id: `resident:${room.id}:${room.village.shopkeeper.id}`,
          actorId: this.getVillageActorId(room.id, room.village.shopkeeper.id, 'shopkeeper'),
          displayName: room.village.shopkeeper.name,
          species: 'human',
          portraitId: room.village.shopkeeper.portraitId,
          homeRoomId: room.id,
          factionId: 'hearthbound-remnant',
        },
        position: { x: room.village.shopkeeper.x, y: room.village.shopkeeper.y },
        stationary: true,
      });
    }
    if (room.questGiver) {
      addCandidate({
        profile: {
          id: `quest:${room.id}:${room.questGiver.id}`,
          actorId: this.getQuestGiverActorId(room.id, room.questGiver.id),
          displayName: room.questGiver.name,
          species: 'human',
          portraitId: room.questGiver.portraitId,
          homeRoomId: room.id,
          factionId: 'hearthbound-remnant',
        },
        position: { x: room.questGiver.x, y: room.questGiver.y },
        stationary: true,
      });
    }
    if (room.town) {
      for (const resident of townResidentsForRoom(room.town, room.id)) {
        const relationshipId = this.getTownResidentRelationshipId(room.town.id, resident.id);
        addCandidate({
          profile: {
            id: relationshipId,
            actorId:
              resident.actorId ??
              this.getTownResidentActorId(room.town.id, resident.id, resident.role),
            displayName: resident.name,
            species: 'human',
            portraitId: resident.portraitId,
            homeRoomId: room.id,
            factionId: resident.factionId as FactionId,
          },
          position: { x: resident.x, y: resident.y },
          stationary: isStationaryTownRole(resident.role),
        });
      }
    }
    if (room.goblinCamp) {
      addCandidate({
        profile: {
          id: `resident:${room.id}:${room.goblinCamp.shopkeeper.id}`,
          actorId: this.getGoblinCampActorId(
            room.goblinCamp.id,
            room.goblinCamp.shopkeeper.id,
            'shopkeeper',
          ),
          displayName: room.goblinCamp.shopkeeper.name,
          species: 'goblin',
          portraitId: room.goblinCamp.shopkeeper.portraitId ?? 'goblin-neutral',
          homeRoomId: room.id,
          factionId: 'goblin-camps',
        },
        position: { x: room.goblinCamp.shopkeeper.x, y: room.goblinCamp.shopkeeper.y },
        stationary: true,
      });
      for (const guard of room.goblinCamp.guards) {
        addCandidate({
          profile: {
            id: `resident:${room.id}:${guard.id}`,
            actorId: this.getGoblinCampActorId(room.goblinCamp.id, guard.id, 'guard'),
            displayName: guard.name,
            species: 'goblin',
            portraitId: guard.portraitId ?? 'goblin-neutral',
            homeRoomId: room.id,
            factionId: 'goblin-camps',
          },
          position: { x: guard.x, y: guard.y },
          stationary: true,
        });
      }
    }
    return candidates;
  }

  private ensureNpcBody(
    profile: RelationshipCandidateProfile,
    anchor: Vector2Like,
    stationary: boolean,
  ): NpcBodyState {
    const existing = this.npcBodies.get(profile.id);
    if (existing) {
      existing.actorId = profile.actorId ?? existing.actorId;
      existing.roomId = profile.homeRoomId ?? existing.roomId;
      existing.anchor = { ...anchor };
      existing.stationary = stationary;
      existing.wanderRadius = stationary ? 0 : Math.max(1, existing.wanderRadius);
      return existing;
    }
    const body: NpcBodyState = {
      relationshipId: profile.id,
      actorId: profile.actorId,
      roomId: profile.homeRoomId ?? this.snake.currentRoomId,
      position: { ...anchor },
      anchor: { ...anchor },
      wanderRadius: stationary ? 0 : 2,
      moveCooldown: stationary ? 999 : 15 + Math.floor(this._rng() * 18),
      stationary,
    };
    this.npcBodies.set(profile.id, body);
    return body;
  }

  getRelationshipNpcBodyPosition(
    profile: RelationshipCandidateProfile,
    fallback?: Vector2Like,
  ): Vector2Like {
    const body =
      this.npcBodies.get(profile.id) ??
      this.ensureNpcBody(profile, fallback ?? { x: 3, y: 3 }, true);
    return { ...body.position };
  }

  private tickNpcBodies(room: RoomSnapshot): void {
    const bodies = [...this.npcBodies.values()].filter((body) => body.roomId === room.id);
    if (bodies.length === 0) {
      return;
    }
    const enemies = this.enemies.getEnemiesInRoom(room.id);
    const threats = enemies
      .filter(
        (enemy) =>
          enemy.encounterKind === 'npc-hostile' ||
          enemy.encounterKind === 'goblin' ||
          enemy.encounterKind === 'duelist' ||
          enemy.encounterKind === 'enemy',
      )
      .map((enemy) => enemy.position);
    const roomDangerActive = this.isCurrentRoomRaidActive() || threats.length > 0;
    const socialTargetsByActorId = this.buildNpcBodySocialTargets(bodies);
    const occupied = new Set<string>();
    for (const enemy of enemies) {
      occupied.add(`${enemy.position.x},${enemy.position.y}`);
    }
    for (const animal of this.animals.getAnimalsInRoom(room.id)) {
      occupied.add(`${animal.position.x},${animal.position.y}`);
    }
    for (const body of bodies) {
      occupied.add(`${body.position.x},${body.position.y}`);
    }
    for (const segment of this.snake.bodySegments) {
      const local = this.worldToLocalInRoom(room.id, segment);
      occupied.add(`${local.x},${local.y}`);
    }
    for (const body of bodies) {
      const state = this.relationshipController.getState(body.relationshipId);
      const isHostile = state?.stage === 'hostile' || state?.stage === 'murderous';
      const actor = body.actorId ? this.actors.getActor(body.actorId) : undefined;
      if (actor?.flags.raidShelter === true) {
        body.wanderRadius = Math.max(body.wanderRadius, 4);
      }
      const decision = decideActorBrain({
        actor,
        body,
        threats,
        socialTargets: body.actorId ? (socialTargetsByActorId.get(body.actorId) ?? []) : [],
        roomDangerActive,
        random: this._rng,
      });
      if (
        decision.kind === 'shareRumor' &&
        actor &&
        decision.targetActorId &&
        decision.memoryToShare
      ) {
        this.shareActorGossip(room, actor, decision.targetActorId, decision.memoryToShare);
      }
      if (body.stationary && !isHostile && decision.kind === 'hold') {
        occupied.add(`${body.position.x},${body.position.y}`);
        continue;
      }
      body.moveCooldown -= 1;
      if (body.moveCooldown > 0) {
        occupied.add(`${body.position.x},${body.position.y}`);
        continue;
      }
      body.moveCooldown =
        !isHostile && !roomDangerActive
          ? Math.max(15, decision.moveCooldown * 3)
          : decision.moveCooldown;
      occupied.delete(`${body.position.x},${body.position.y}`);
      for (const direction of decision.preferredDirections) {
        const next = { x: body.position.x + direction.x, y: body.position.y + direction.y };
        if (!this.canNpcBodyStandAt(room, body, next, occupied)) {
          continue;
        }
        body.position = next;
        break;
      }
      occupied.add(`${body.position.x},${body.position.y}`);
    }
  }

  private buildNpcBodySocialTargets(
    bodies: readonly NpcBodyState[],
  ): Map<string, ActorBrainSocialTarget[]> {
    const targets = new Map<string, ActorBrainSocialTarget[]>();
    const actorBodies = bodies
      .map((body) => ({
        body,
        actor: body.actorId ? this.actors.getActor(body.actorId) : undefined,
      }))
      .filter((entry): entry is { body: NpcBodyState; actor: Actor } => Boolean(entry.actor));
    for (const entry of actorBodies) {
      targets.set(
        entry.actor.id,
        actorBodies
          .filter((candidate) => candidate.actor.id !== entry.actor.id)
          .map((candidate) => {
            const link = entry.actor.relationships.find(
              (relationship) => relationship.actorId === candidate.actor.id,
            );
            return {
              actorId: candidate.actor.id,
              position: { ...candidate.body.position },
              relationship: link?.relationship ?? 'unknown',
              knownToPlayer: link?.knownToPlayer,
            };
          }),
      );
    }
    return targets;
  }

  private shareActorGossip(
    room: RoomSnapshot,
    sourceActor: Actor,
    targetActorId: string,
    memory: ActorMemory,
  ): void {
    const target = this.actors.getActor(targetActorId);
    if (!target || target.hostility === 'dead' || target.health?.state === 'dead') {
      return;
    }
    const eventId = `actor-gossip:${sourceActor.id}:${target.id}:${memory.id}`;
    if (
      target.memory.some(
        (entry) =>
          entry.eventId === eventId ||
          (entry.source === 'heard' &&
            entry.summary === memory.summary &&
            entry.tags.includes('gossip')),
      )
    ) {
      return;
    }
    const event = this.actors.emitWorldEvent({
      type: 'actor-rumor-shared',
      roomId: room.id,
      sourceActorId: sourceActor.id,
      targetActorIds: [target.id],
      witnessActorIds: [],
      severity: Math.max(8, Math.min(30, Math.floor(memory.intensity * 0.75))),
      loudness: 2,
      tags: [...new Set([...memory.tags, 'gossip', 'actor-talk'])],
      summary: `${sourceActor.displayName} quietly shared a rumor with ${target.displayName}: ${memory.summary}`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: {
        sourceMemoryId: memory.id,
      },
    });
    this.actors.registry.update(target.id, (current) => ({
      ...current,
      memory: current.memory.map((entry) =>
        entry.id === `memory:${event.id}:${target.id}`
          ? {
              ...entry,
              source: 'heard' as const,
              summary: memory.summary,
              tags: [...new Set([...entry.tags, 'rumor', 'gossip'])],
            }
          : entry,
      ),
    }));
  }

  private canNpcBodyStandAt(
    room: RoomSnapshot,
    body: NpcBodyState,
    position: Vector2Like,
    occupied: ReadonlySet<string>,
  ): boolean {
    if (
      position.x < 0 ||
      position.x >= this.config.grid.cols ||
      position.y < 0 ||
      position.y >= this.config.grid.rows
    ) {
      return false;
    }
    const tile = room.layout[position.y]?.[position.x];
    if (!tile || tile === '#' || tile === '~' || tile === 'S' || isBlockingTownTile(tile)) {
      return false;
    }
    if (
      Math.abs(position.x - body.anchor.x) > body.wanderRadius ||
      Math.abs(position.y - body.anchor.y) > body.wanderRadius
    ) {
      return false;
    }
    return !occupied.has(`${position.x},${position.y}`);
  }

  private syncHostileNpcBodiesFromEnemies(roomId: string): void {
    for (const enemy of this.enemies.getEnemiesInRoom(roomId)) {
      const relationshipId = this.getRelationshipIdFromHostileNpc(enemy.id);
      if (!relationshipId) {
        continue;
      }
      const body = this.npcBodies.get(relationshipId);
      if (body) {
        body.position = { ...enemy.position };
        body.roomId = roomId;
      }
    }
  }

  private applyTownRuntimeToRoom(room: RoomSnapshot): void {
    if (!room.town) {
      return;
    }
    room.town = this.applyTownRuntimeState(room.town);
    this.normalizeTownQuestBoardTiles(room);
    this.openTownGateTiles(room);
    if (room.town.discoveredGuild) {
      this.addGuildGratePortal(room);
    }
  }

  private normalizeTownQuestBoardTiles(room: RoomSnapshot): void {
    const district = room.town?.districtByRoomId?.[room.id];
    if (district !== 'square' && district !== 'townCenter') {
      return;
    }
    const centerX = Math.floor(this.config.grid.cols / 2);
    const centerY = Math.floor(this.config.grid.rows / 2);
    const layout = room.layout.map((row) => row.split(''));
    if (layout[centerY]?.[centerX] === 'N') {
      layout[centerY][centerX] = 'E';
    }
    const board = {
      x: Math.min(this.config.grid.cols - 2, centerX + 7),
      y: Math.max(1, centerY - 3),
    };
    if (layout[board.y]?.[board.x] && layout[board.y][board.x] !== 'G') {
      layout[board.y][board.x] = 'D';
    }
    room.layout = layout.map((row) => row.join(''));
  }

  private openTownGateTiles(room: RoomSnapshot): void {
    const town = room.town;
    if (!town) {
      return;
    }
    for (const gate of town.gates ?? []) {
      if (
        (gate.townRoomId === room.id || gate.approachRoomId === room.id) &&
        this.isTownGateOpen(town, gate)
      ) {
        this.openTownGateBarrierTiles(room, gate);
      }
    }
  }

  private openTownGateBarrierTiles(room: RoomSnapshot, gate: TownGate): void {
    if (gate.townRoomId !== room.id && gate.approachRoomId !== room.id) {
      return;
    }
    const layout = room.layout.map((row) => row.split(''));
    const perspective = gate.townRoomId === room.id ? 'inside' : 'outside';
    const side = perspective === 'inside' ? gate.side : this.oppositeSide(gate.side);
    const carve = (x: number, y: number): void => {
      if (layout[y]?.[x] === 'x' || layout[y]?.[x] === 'o') {
        layout[y][x] = '.';
      }
    };
    for (const cell of townGateFootprintCells({
      side,
      cols: this.config.grid.cols,
      rows: this.config.grid.rows,
    })) {
      carve(cell.x, cell.y);
    }
    room.layout = layout.map((row) => row.join(''));
  }

  private addGuildGratePortal(room: RoomSnapshot): void {
    const town = room.town;
    if (!town?.discoveredGuild) {
      return;
    }
    const district = town.districtByRoomId[room.id];
    if (district !== 'backAlley') {
      return;
    }
    const centerX = Math.floor(this.config.grid.cols / 2);
    const centerY = Math.floor(this.config.grid.rows / 2);
    const layout = room.layout.map((row) => row.split(''));
    const grate = { x: Math.max(1, centerX - 5), y: centerY };
    if (layout[grate.y]?.[grate.x]) {
      layout[grate.y][grate.x] = LAYER_ENTRANCE_TILE;
    }
    room.layout = layout.map((row) => row.join(''));
    const destRoomId = this.getTownGuildInteriorRoomId(town.id);
    room.portals = room.portals.filter((portal) => portal.x !== grate.x || portal.y !== grate.y);
    const entrance: LayerEntrance = {
      id: `town:${town.id}:guild-grate`,
      layerId: destRoomId,
      parentRoomId: room.id,
      x: grate.x,
      y: grate.y,
      kind: 'townInterior',
      templateId: 'thievesGuild',
      label: 'Thieves Guild grate',
      discovered: true,
      returnPosition: { ...grate },
      tile: LAYER_ENTRANCE_TILE,
    };
    room.layerEntrances = [
      ...(room.layerEntrances ?? []).filter((entry) => entry.id !== entrance.id),
      entrance,
    ];
    this.world.registerLayerEntrance(entrance);
  }

  private getTownGuildInteriorRoomId(townId: string): string {
    return `layer:townInterior:${townId}:thievesGuild`;
  }

  private getSideToTownDistrict(
    town: TownStructure,
    roomId: string,
    targetDistrict: TownRoomKind,
  ): 'north' | 'south' | 'east' | 'west' | null {
    const [roomX = 0, roomY = 0, roomZ = 0] = roomId.split(',').map(Number);
    const neighbors: Array<{ side: 'north' | 'south' | 'east' | 'west'; id: string }> = [
      { side: 'north', id: `${roomX},${roomY - 1},${roomZ}` },
      { side: 'south', id: `${roomX},${roomY + 1},${roomZ}` },
      { side: 'east', id: `${roomX + 1},${roomY},${roomZ}` },
      { side: 'west', id: `${roomX - 1},${roomY},${roomZ}` },
    ];
    return (
      neighbors.find((neighbor) => town.districtByRoomId[neighbor.id] === targetDistrict)?.side ??
      null
    );
  }

  private openRoomEdgeTiles(room: RoomSnapshot, side: 'north' | 'south' | 'east' | 'west'): void {
    const centerX = Math.floor(this.config.grid.cols / 2);
    const centerY = Math.floor(this.config.grid.rows / 2);
    if (side === 'north' || side === 'south') {
      const top = side === 'north' ? 0 : this.config.grid.rows - 3;
      for (let y = top; y < top + 3; y += 1) {
        const row = room.layout[y];
        if (!row) continue;
        const chars = row.split('');
        for (let x = centerX - 2; x <= centerX + 2; x += 1) {
          if (chars[x] && chars[x] !== 'G') {
            chars[x] = 'E';
          }
        }
        room.layout[y] = chars.join('');
      }
      return;
    }
    const left = side === 'west' ? 0 : this.config.grid.cols - 3;
    for (let y = centerY - 2; y <= centerY + 2; y += 1) {
      const row = room.layout[y];
      if (!row) continue;
      const chars = row.split('');
      for (let x = left; x < left + 3; x += 1) {
        if (chars[x] && chars[x] !== 'G') {
          chars[x] = 'E';
        }
      }
      room.layout[y] = chars.join('');
    }
  }

  private isInsideTownExitLatchSide(town: TownStructure, room: RoomSnapshot): boolean {
    const exteriorSide = this.inferTownExitExteriorSide(town, room.id);
    if (!exteriorSide) {
      return true;
    }
    const head = this.snake.bodySegments[0];
    if (!head) {
      return false;
    }
    const local = this.worldToLocal(room.id, head);
    const centerX = Math.floor(this.config.grid.cols / 2);
    const centerY = Math.floor(this.config.grid.rows / 2);
    switch (exteriorSide) {
      case 'north':
        return local.y > centerY;
      case 'south':
        return local.y < centerY;
      case 'east':
        return local.x < centerX;
      case 'west':
        return local.x > centerX;
    }
  }

  private inferTownExitExteriorSide(
    town: TownStructure,
    roomId: string,
  ): 'north' | 'south' | 'east' | 'west' | null {
    const [roomX = 0, roomY = 0, roomZ = 0] = roomId.split(',').map(Number);
    const neighbors: Array<{ side: 'north' | 'south' | 'east' | 'west'; id: string }> = [
      { side: 'north', id: `${roomX},${roomY - 1},${roomZ}` },
      { side: 'south', id: `${roomX},${roomY + 1},${roomZ}` },
      { side: 'east', id: `${roomX + 1},${roomY},${roomZ}` },
      { side: 'west', id: `${roomX - 1},${roomY},${roomZ}` },
    ];
    const interior = neighbors.find((neighbor) =>
      Boolean(town.districtByRoomId[neighbor.id]),
    )?.side;
    if (!interior) {
      return null;
    }
    return this.oppositeSide(interior);
  }

  private oppositeSide(
    side: 'north' | 'south' | 'east' | 'west',
  ): 'north' | 'south' | 'east' | 'west' {
    switch (side) {
      case 'north':
        return 'south';
      case 'south':
        return 'north';
      case 'east':
        return 'west';
      case 'west':
        return 'east';
    }
  }

  private townGateFlagKey(townId: string, gate: TownGate): string {
    return `town.gateOpened.${townId}.${gate.id}`;
  }

  private isTownGateOpen(town: TownStructure, gate: TownGate): boolean {
    return (
      gate.state === 'open' || Boolean(this.getFlag<boolean>(this.townGateFlagKey(town.id, gate)))
    );
  }

  private getTownGateInteractionTiles(side: TownGateSide): Array<{ x: number; y: number }> {
    const centerX = Math.floor(this.config.grid.cols / 2);
    const centerY = Math.floor(this.config.grid.rows / 2);
    const gateTiles = townGateFootprintCells({
      side,
      cols: this.config.grid.cols,
      rows: this.config.grid.rows,
    });
    switch (side) {
      case 'north':
        return [...gateTiles, { x: centerX + 2, y: 3 }];
      case 'south':
        return [...gateTiles, { x: centerX + 2, y: this.config.grid.rows - 4 }];
      case 'west':
        return [...gateTiles, { x: 3, y: centerY + 2 }];
      case 'east':
        return [...gateTiles, { x: this.config.grid.cols - 4, y: centerY + 2 }];
    }
  }

  private patchTownGateInCachedRooms(town: TownStructure, gateId: string): void {
    const gate = (town.gates ?? []).find((entry) => entry.id === gateId);
    if (!gate) {
      return;
    }
    for (const room of this.world.snapshot().values()) {
      if (room.town?.id !== town.id) continue;
      if (room.id !== gate.townRoomId && room.id !== gate.approachRoomId) continue;
      room.town = {
        ...town,
        districtByRoomId: { ...town.districtByRoomId, [room.id]: town.districtByRoomId[room.id] },
      };
      this.openTownGateBarrierTiles(room, gate);
    }
  }

  private guildInitiationStartedFlagKey(townId: string): string {
    return `town.guildInitiation.started.${townId}`;
  }

  private guildInitiationPickpocketsFlagKey(townId: string): string {
    return `town.guildInitiation.pickpockets.${townId}`;
  }

  private guildInitiationCompleteFlagKey(townId: string): string {
    return `town.guildInitiation.complete.${townId}`;
  }

  getApple(roomId: string): AppleSnapshot | null {
    return this.apples.getSnapshot(roomId);
  }

  getSnakeBody(): readonly Vector2Like[] {
    return this.isRaccoonMode()
      ? getRaccoonRenderableBody(this.snake.bodySegments)
      : this.snake.bodySegments;
  }

  createDeathDebugSnapshot(reason?: StepResult['deathReason'] | string | null): DeathDebugSnapshot {
    const death = this.getFlag<{
      world?: Vector2Like;
      local?: Vector2Like;
      roomId?: string;
      tile?: string;
      direction?: Vector2Like;
    }>('internal.lastDeathPosition');
    const selfCollision = this.getFlag<DeathDebugSnapshot['selfCollision']>(
      'internal.lastSelfCollision',
    );
    const fallbackHead = this.snake.bodySegments[0] ?? { x: 0, y: 0 };
    const fallbackRoomId = this.snake.currentRoomId;
    const roomId = death?.roomId ?? fallbackRoomId;
    const [roomX = 0, roomY = 0, roomZ = 0] = roomId.split(',').map(Number);
    const world = death?.world ?? fallbackHead;
    const local = death?.local ?? {
      x: world.x - roomX * this.config.grid.cols,
      y: world.y - roomY * this.config.grid.rows,
    };
    const room = this.world.getRoom(roomId);
    const tile = death?.tile ?? room.layout[local.y]?.[local.x];
    const rooms: DeathDebugRoomSnapshot[] = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const neighborId = `${roomX + dx},${roomY + dy},${roomZ}`;
        const neighbor = this.world.getRoom(neighborId);
        rooms.push({
          roomId: neighbor.id,
          biomeId: neighbor.biomeId,
          biomeTitle: neighbor.biomeTitle,
          layout: neighbor.layout,
        });
      }
    }
    return {
      reason,
      roomId,
      world,
      local,
      tile,
      direction: death?.direction ?? this.snake.directionVector,
      selfCollision,
      rooms,
    };
  }

  // Map support: expose generated rooms on the current Z level
  getGeneratedRooms(levelZ?: number): string[] {
    const all = Array.from(this.world.snapshot().keys());
    const z = levelZ ?? Number(this.snake.currentRoomId.split(',')[2] ?? 0);
    return all.filter((id) => Number(id.split(',')[2] ?? 0) === z);
  }

  getDirection(): Vector2Like {
    return this.snake.directionVector;
  }

  getScore(): number {
    return this.snake.score;
  }

  setScore(score: number): void {
    this.snake.score = Math.max(0, Math.floor(Number(score) || 0));
  }

  addScore(amount: number, category?: ScoreCategory): void {
    const normalized =
      category === undefined ? amount : normalizeScore(amount, category, this.normalizationState);
    const multiplier = this.getArtifactScoreMultiplier();
    const adjusted =
      normalized > 0 && multiplier > 1
        ? Math.max(1, Math.ceil(normalized * multiplier))
        : normalized;
    this.snake.addScore(adjusted);
    if (adjusted > 0) {
      const result = addLifetimeScore(this.levelProgression, adjusted);
      this.levelProgression = result.state;
      if (result.levelUp) {
        this.specialStats.grantUnspentPoints(result.levelUp.levelsGained);
        this.levelUpCallback?.(result.levelUp);
      }
    }
  }

  grantScore(amount: number): void {
    this.addScore(amount);
  }

  getArtifactViews(): ArtifactView[] {
    return this.getRunArtifacts().map(toArtifactView);
  }

  getSpecialStatsView(): SpecialStatsView {
    const room = this.getCurrentRoom();
    return this.specialStats.getSpecialStatsView(
      {
        score: this.getScore(),
        apples: this.config.apples,
        fish: getFishByBiome(room.biomeId),
        isWaterTile: this.isHeadOnWaterTile(),
      },
      getLevelProgressionView(this.levelProgression),
    );
  }

  setLevelUpCallback(callback?: (result: LevelUpResult) => void): void {
    this.levelUpCallback = callback;
  }

  previewSpecialStatChange(statId: SpecialStatId, delta: number): boolean {
    const changed =
      delta > 0
        ? this.specialStats.previewIncrease(statId)
        : delta < 0
          ? this.specialStats.previewDecrease(statId)
          : false;
    return changed;
  }

  applySpecialStatPreview(): void {
    this.specialStats.applyPreview();
    this.refreshPlayerMaxHealth();
  }

  resetSpecialStatPreview(): void {
    this.specialStats.resetPreview();
  }

  setAllSpecialStatsToMax(): void {
    this.specialStats.setAllStats(10);
    this.refreshPlayerMaxHealth();
  }

  getFishingSpecialModifiers() {
    return this.specialStats.getFishingModifiers();
  }

  updateAtmosphere(deltaMs: number): AtmosphereState {
    return this.atmosphere.update(deltaMs);
  }

  getAtmosphereState(): AtmosphereState {
    return this.atmosphere.getState();
  }

  forceAtmosphereWeather(weather: GlobalWeather): AtmosphereState {
    return this.atmosphere.forceWeather(weather);
  }

  getAtmosphereForRoom(room: RoomSnapshot = this.getCurrentRoom()): ResolvedAtmosphereView {
    const biome = getBiomeDefinition(room.biomeId);
    const shelterMode = this.getShelterModeForRoom(room, biome);
    const shelteredConfig = {
      ...this.atmosphereConfig,
      shelterMode,
      visualParticlesEnabled:
        shelterMode === 'interior' ? false : this.atmosphereConfig.visualParticlesEnabled,
      dayNightTintEnabled:
        shelterMode === 'interior' ? false : this.atmosphereConfig.dayNightTintEnabled,
    };
    const atmosphere = resolveBiomeAtmosphere(biome, this.atmosphere.getState(), shelteredConfig);
    if (room.cave?.templateId === 'pitchBlackTreasure') {
      return {
        ...atmosphere,
        darkness: {
          ...atmosphere.darkness,
          level: 'pitchBlack',
          darknessAlpha: 0.92,
          visibleRadiusTiles: 3,
          lanternRecommended: true,
          debugReason: [...atmosphere.darkness.debugReason, 'pitch-black cave override +2.00'],
        },
        playerSummary: {
          ...atmosphere.playerSummary,
          lightLabel: 'Pitch Black',
        },
      };
    }
    return atmosphere;
  }

  private getShelterModeForRoom(
    room: RoomSnapshot,
    _biome: ReturnType<typeof getBiomeDefinition>,
  ): ShelterMode {
    if (room.id === '0,-1,0' || room.snakeMcDonalds) {
      return 'interior';
    }
    if (room.layer?.kind === 'townInterior') {
      return 'interior';
    }
    if (room.id.startsWith('cave:') || room.layer || room.cave) {
      return 'underground';
    }
    return 'exposed';
  }

  getSpecialGameplayModifiers(): SpecialGameplayModifiers {
    return this.specialStats.getGameplayModifiers();
  }

  applyStartingSpecialModifiers(modifiers: Readonly<Partial<Record<SpecialStatId, number>>>): void {
    this.specialStats.applyPermanentModifiers(modifiers);
  }

  refreshPlayerMaxHealth(): void {
    const specialGameplay = this.getSpecialGameplayModifiers();
    const currentMaxHealth = Number(this.getFlag<number>('player.maxHealth') ?? 3);
    const previousSpecialHeartBonus = Number(this.getFlag<number>('special.maxHeartBonus') ?? 0);
    const legacySkillHeartBonus = Math.max(0, currentMaxHealth - 3 - previousSpecialHeartBonus);
    const skillHeartBonus = Math.max(
      0,
      Number(this.getFlag<number>('player.skillMaxHeartBonus') ?? legacySkillHeartBonus),
    );
    const nextMaxHealth = Math.max(1, 3 + skillHeartBonus + specialGameplay.maxHeartBonus);
    const currentHealth = Number(this.getFlag<number>('player.health') ?? currentMaxHealth);
    this.setFlag('player.skillMaxHeartBonus', skillHeartBonus > 0 ? skillHeartBonus : undefined);
    this.setFlag(
      'special.maxHeartBonus',
      specialGameplay.maxHeartBonus !== 0 ? specialGameplay.maxHeartBonus : undefined,
    );
    this.setFlag('player.maxHealth', nextMaxHealth);
    if (currentHealth >= currentMaxHealth && nextMaxHealth > currentMaxHealth) {
      this.setFlag('player.health', nextMaxHealth);
    } else if (currentHealth > nextMaxHealth) {
      this.setFlag('player.health', nextMaxHealth);
    }
  }

  getRunArtifacts(): ArtifactDefinition[] {
    const ids = this.getFlag<string[]>('artifacts.run') ?? [];
    return ids
      .map((id) => getArtifactDefinition(id))
      .filter((artifact): artifact is ArtifactDefinition => Boolean(artifact));
  }

  addRunArtifact(artifactId: string): boolean {
    if (!getArtifactDefinition(artifactId)) {
      return false;
    }
    if (this.isArchipelagoModeActive() && AP_ARTIFACT_LOCATION_KEY_BY_ARTIFACT_ID[artifactId]) {
      this.queueArchipelagoLocalRewardCheck({ kind: 'artifact', id: artifactId });
      return true;
    }
    const ids = this.getFlag<string[]>('artifacts.run') ?? [];
    if (ids.includes(artifactId)) {
      return false;
    }
    this.setFlag('artifacts.run', [...ids, artifactId]);
    return true;
  }

  grantArtifact(artifactId: string): boolean {
    if (!getArtifactDefinition(artifactId)) {
      return false;
    }
    const ids = this.getFlag<string[]>('artifacts.run') ?? [];
    if (ids.includes(artifactId)) {
      return false;
    }
    this.setFlag('artifacts.run', [...ids, artifactId]);
    return true;
  }

  ensureArchipelagoDurableRewards(rewards: ArchipelagoDurableRewards): {
    inventory: number;
    cards: number;
    artifacts: number;
  } {
    let inventory = 0;
    for (const [itemId, targetCount] of Object.entries(rewards.inventory)) {
      const needed =
        Math.max(0, Math.floor(Number(targetCount) || 0)) - this.inventory.getItemCount(itemId);
      if (needed > 0) {
        this.grantInventoryItem(itemId, needed);
        inventory += needed;
      }
    }

    let cards = 0;
    const collection = this.getFlag<CardCollection>('cards.collection') ?? {};
    let nextCollection: CardCollection | null = null;
    for (const [cardId, targetCount] of Object.entries(rewards.cards)) {
      if (!getCardDefinition(cardId as CardId)) {
        continue;
      }
      const needed =
        Math.max(0, Math.floor(Number(targetCount) || 0)) -
        Math.max(0, Number(collection[cardId as CardId] ?? 0));
      if (needed > 0) {
        nextCollection = nextCollection ?? { ...collection };
        nextCollection[cardId as CardId] =
          Math.max(0, Number(nextCollection[cardId as CardId] ?? 0)) + needed;
        cards += needed;
      }
    }
    if (nextCollection) {
      this.setFlag('cards.collection', nextCollection);
    }

    let artifacts = 0;
    const artifactIds = this.getFlag<string[]>('artifacts.run') ?? [];
    const nextArtifactIds = new Set(artifactIds);
    for (const artifactId of rewards.artifacts) {
      if (!getArtifactDefinition(artifactId) || nextArtifactIds.has(artifactId)) {
        continue;
      }
      nextArtifactIds.add(artifactId);
      artifacts += 1;
    }
    if (artifacts > 0) {
      this.setFlag('artifacts.run', [...nextArtifactIds]);
    }

    return { inventory, cards, artifacts };
  }

  getArtifactTuning(): ArchaeologyTuning {
    const tuning: ArchaeologyTuning = this.specialStats.getArchaeologyTuning();
    for (const artifact of this.getRunArtifacts()) {
      tuning.rewardLuck = (tuning.rewardLuck ?? 0) + (artifact.modifiers.rewardLuck ?? 0);
      tuning.equipmentRewardChance =
        (tuning.equipmentRewardChance ?? 0) + (artifact.modifiers.equipmentRewardChance ?? 0);
      tuning.excavationAppleBonus =
        (tuning.excavationAppleBonus ?? 0) + (artifact.modifiers.excavationAppleBonus ?? 0);
      tuning.goldAppleFrequency =
        (tuning.goldAppleFrequency ?? 0) + (artifact.modifiers.goldAppleFrequency ?? 0);
    }
    return tuning;
  }

  getArtifactHungerDrainScalar(): number {
    return this.getRunArtifacts().reduce(
      (scalar, artifact) => scalar * (artifact.modifiers.hungerDrainScalar ?? 1),
      1,
    );
  }

  hasArtifactCoordinatesAlwaysVisible(): boolean {
    return this.getRunArtifacts().some((artifact) => artifact.modifiers.coordinatesAlwaysVisible);
  }

  applyArchaeologyRewards(rewards: ArchaeologyRewardBundle): {
    score: number;
    itemCount: number;
    artifactCount: number;
    appleCount: number;
    appleLengthGained: number;
    appleScoreGained: number;
  } {
    const scoreBefore = this.getScore();
    const appleCount = Object.values(rewards.apples).reduce(
      (total, count) => total + Math.max(0, count),
      0,
    );
    const appleLengthGained = appleCount;
    const appleScoreGained = appleCount;
    this.addScore(rewards.score + appleScoreGained);
    if (appleLengthGained > 0) {
      this.growSnake(appleLengthGained);
    }
    let itemCount = 0;
    const itemRewards = [rewards.equipment, rewards.supplies];
    for (const bucket of itemRewards) {
      for (const [itemId, count] of Object.entries(bucket)) {
        if (count <= 0) continue;
        this.addItem(itemId, count);
        itemCount += count;
      }
    }
    let artifactCount = 0;
    for (const artifactId of rewards.artifacts) {
      if (this.addRunArtifact(artifactId)) {
        artifactCount += 1;
      }
    }
    return {
      score: this.getScore() - scoreBefore,
      itemCount,
      artifactCount,
      appleCount,
      appleLengthGained,
      appleScoreGained,
    };
  }

  private getArtifactScoreMultiplier(): number {
    return this.getRunArtifacts().reduce(
      (multiplier, artifact) => multiplier * (artifact.modifiers.scoreMultiplier ?? 1),
      1,
    );
  }

  getSnakeLength(): number {
    return this.snake.bodySegments.length;
  }

  grantSnakeLength(extraSegments: number): void {
    this.growSnake(extraSegments);
  }

  getCharacterMode(): CharacterMode {
    return this.characterMode;
  }

  isRaccoonMode(): boolean {
    return this.characterMode === 'raccoon';
  }

  setCharacterModeForNewRun(mode: CharacterMode): void {
    this.characterMode = normalizeCharacterMode(mode);
    this.config.character.mode = this.characterMode;
  }

  getRaccoonWeight(): number {
    return this.raccoonWeight;
  }

  getRaccoonBanditMeter(): number {
    return this.raccoonBanditMeter;
  }

  getRaccoonHungerTimerRatio(): number {
    if (!this.isRaccoonMode()) {
      return 0;
    }
    const decayMs = Math.max(1, this.config.character.raccoon.hungerDecaySeconds * 1000);
    return Math.max(0, Math.min(1, 1 - this.raccoonHungerTimerMs / decayMs));
  }

  getRaccoonSpeedMultiplier(): number {
    return this.isRaccoonMode()
      ? getRaccoonSpeedMultiplier(this.raccoonWeight, this.config.character.raccoon)
      : 1;
  }

  getNextRaccoonWeightThreshold(): number | undefined {
    return getNextRaccoonWeightThreshold(this.raccoonWeight, this.config.character.raccoon);
  }

  getRaccoonHudWeightText(): string {
    const nextThreshold = this.getNextRaccoonWeightThreshold();
    return nextThreshold ? `${this.raccoonWeight} / ${nextThreshold}` : `${this.raccoonWeight}`;
  }

  private addRaccoonWeight(amount: number): void {
    this.raccoonWeight = Math.max(0, this.raccoonWeight + Math.max(0, Math.floor(amount)));
    this.syncRaccoonFlags();
  }

  private restoreRaccoonHungerForPickup(): void {
    const max = Number(this.getFlag<number>('player.maxHealth') ?? 3);
    const current = Number(this.getFlag<number>('player.health') ?? max);
    const next = restoreRaccoonHunger(
      current,
      max,
      this.config.character.raccoon.hungerRestoreOnPickup,
    );
    this.setFlag('player.health', next);
    this.raccoonHungerTimerMs = 0;
    this.syncRaccoonFlags();
  }

  private addRaccoonBanditForage(): void {
    const config = this.config.character.raccoon.bandit;
    this.raccoonBanditMeter = Math.min(config.max, this.raccoonBanditMeter + config.gainPerForage);
    this.syncRaccoonFlags();
  }

  private decayRaccoonBandit(elapsedMs: number): void {
    const config = this.config.character.raccoon.bandit;
    if (this.raccoonBanditMeter <= 0) {
      return;
    }
    this.raccoonBanditMeter = Math.max(
      0,
      this.raccoonBanditMeter - config.decayPerSecond * (elapsedMs / 1000),
    );
    this.syncRaccoonFlags();
  }

  private getRaccoonWeightTierLabel(): string {
    const tier = this.config.character.raccoon.weightTiers.reduce((selected, candidate) =>
      candidate.minWeight <= this.raccoonWeight && candidate.minWeight >= selected.minWeight
        ? candidate
        : selected,
    );
    return tier.label;
  }

  private syncRaccoonFlags(): void {
    this.setFlag('character.mode', this.characterMode);
    this.setFlag('raccoon.weight', this.raccoonWeight);
    this.setFlag('raccoon.hungerTimerMs', this.raccoonHungerTimerMs);
    this.setFlag('raccoon.banditMeter', Math.round(this.raccoonBanditMeter));
    this.setFlag('raccoon.stashedTotal', this.raccoonStashedTotal);
  }

  stashRaccoonApples(actorId?: string): { ok: boolean; message: string; color: string } {
    if (!this.isRaccoonMode()) {
      return {
        ok: false,
        message: 'Only raccoons can stash carried apples.',
        color: '#ff6b6b',
      };
    }
    const room = this.getCurrentRoom();
    const actorRole =
      actorId !== undefined
        ? (this.actors.getActor(actorId)?.role ??
          room.town?.residents.find(
            (resident) =>
              (resident.actorId ??
                this.getTownResidentActorId(room.town!.id, resident.id, resident.role)) === actorId,
          )?.role)
        : undefined;
    if (actorRole && actorRole !== 'butcher' && !isTownShopRole(actorRole)) {
      return {
        ok: false,
        message: 'That counter is not ready to hide a raccoon apple pile.',
        color: '#ff6b6b',
      };
    }
    if (this.raccoonWeight <= 0) {
      return { ok: false, message: 'No apples to stash.', color: '#ffb36b' };
    }
    const result = calculateRaccoonStashReward(
      this.raccoonWeight,
      this.raccoonBanditMeter,
      this.config.character.raccoon,
    );
    this.addScore(result.score, 'raccoon');
    this.raccoonStashedTotal += result.depositedWeight;
    this.raccoonWeight = 0;
    this.raccoonBanditMeter = 0;
    if (result.depositedWeight >= 10) {
      const max = Number(this.getFlag<number>('player.maxHealth') ?? 3);
      const current = Number(this.getFlag<number>('player.health') ?? max);
      this.setFlag('player.health', Math.min(max, current + 1));
    }
    this.syncRaccoonFlags();
    this.setFlag('ui.raccoonPopup', { kind: 'stash' });
    return {
      ok: true,
      message: `Stashed ${result.depositedWeight} weight for ${result.score} score. Bandit cashout x${result.banditBonus.toFixed(2)}.`,
      color: '#b6ff6a',
    };
  }

  private calculateAppleLengthScoreMultiplier(): number {
    const length = this.getSnakeLength();
    if (length < 50) {
      return 1;
    }
    return 2 ** ((length - 50) / 100);
  }

  private applyLengthScoreMultiplier(baseScore: number, multiplier: number): number {
    if (baseScore <= 0) {
      return 0;
    }
    if (multiplier <= 1) {
      return Math.floor(baseScore);
    }
    return Math.max(baseScore, Math.ceil(baseScore * multiplier));
  }

  growSnake(extraSegments: number): void {
    this.snake.grow(extraSegments);
  }

  private removeSafeSnakeLength(maxSegments: number): {
    ok: boolean;
    removed: number;
    reason?: string;
  } {
    const length = this.getSnakeLength();
    const minimumLength = 5;
    if (length <= minimumLength) {
      return { ok: false, removed: 0, reason: 'too-short' };
    }
    const segments = Math.min(maxSegments, Math.max(1, length - minimumLength));
    if (!this.snake.shrinkTail(segments)) {
      return { ok: false, removed: 0, reason: 'unsafe' };
    }
    return { ok: true, removed: segments };
  }

  sellSnakeLengthToButcher(actorId?: string): { ok: boolean; message: string; color: string } {
    const room = this.getCurrentRoom();
    const actorRole =
      actorId !== undefined
        ? (this.actors.getActor(actorId)?.role ??
          room.town?.residents.find(
            (resident) =>
              (resident.actorId ??
                this.getTownResidentActorId(room.town!.id, resident.id, resident.role)) === actorId,
          )?.role)
        : undefined;
    if (actorRole !== 'butcher') {
      return {
        ok: false,
        message: 'No physical butcher is close enough to discuss snake logistics.',
        color: '#ff6b6b',
      };
    }
    const removal = this.removeSafeSnakeLength(10);
    if (!removal.ok) {
      return {
        ok: false,
        message:
          removal.reason === 'too-short'
            ? 'The butcher refuses. "Come back when selling length will not leave you a rumor with eyes."'
            : 'The butcher squints. "I cannot trim that without turning the customer into punctuation."',
        color: '#ff6b6b',
      };
    }
    const score = Math.max(1, Math.floor(removal.removed / 5));
    this.addScore(score);
    return {
      ok: true,
      message: `The butcher buys ${removal.removed} length for ${score} score. "Abysmal rate, honest knife."`,
      color: '#b6ff6a',
    };
  }

  trimSnakeLengthAtVillageShop(shopKey: string): { ok: boolean; message: string; color: string } {
    const key = `village.trim.remaining.${shopKey}`;
    const remaining = Number(this.getFlag<number>(key) ?? 2);
    if (remaining <= 0) {
      return {
        ok: false,
        message: 'The shop has no trimming time left today.',
        color: '#ff6b6b',
      };
    }
    const removal = this.removeSafeSnakeLength(6);
    if (!removal.ok) {
      return {
        ok: false,
        message:
          removal.reason === 'too-short'
            ? 'The shopkeeper refuses to trim you any shorter.'
            : 'The trim would be unsafe.',
        color: '#ff6b6b',
      };
    }
    this.setFlag(key, remaining - 1);
    return {
      ok: true,
      message: `Trimmed ${removal.removed} length. No money changes hands.`,
      color: '#b6ff6a',
    };
  }

  consumeMcDonaldsFood(itemId: string): {
    success: boolean;
    message: string;
    lengthGained: number;
    invulnerabilityTicks: number;
  } {
    const item = getItem(itemId);
    if (!item) {
      return { success: false, message: 'Unknown item.', lengthGained: 0, invulnerabilityTicks: 0 };
    }

    if (this.inventory.getItemCount(itemId) <= 0) {
      return {
        success: false,
        message: `No ${item.name} remaining.`,
        lengthGained: 0,
        invulnerabilityTicks: 0,
      };
    }

    let lengthGained = 0;
    let invulnerabilityTicks = 0;

    switch (itemId) {
      case 'food-snake-burger':
      case 'food-snake-fries':
        lengthGained = 5;
        invulnerabilityTicks = 600;
        break;
      case 'food-snake-nuggets':
        lengthGained = 2;
        invulnerabilityTicks = 300;
        break;
      default:
        return {
          success: false,
          message: 'Unknown item.',
          lengthGained: 0,
          invulnerabilityTicks: 0,
        };
    }

    this.inventory.removeItem(itemId, 1);

    this.growSnake(lengthGained);

    const currentInvuln = Number(this.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0);
    const updatedInvuln = Math.max(currentInvuln, invulnerabilityTicks);
    this.setFlag('fortitude.invulnerabilityTicks', updatedInvuln);

    return {
      success: true,
      message: `Delicious! +${lengthGained} length, ${invulnerabilityTicks} ticks of invulnerability.`,
      lengthGained,
      invulnerabilityTicks,
    };
  }

  flushToilet(): void {}

  consumeSnakeCanesFood(itemId: string): {
    success: boolean;
    message: string;
    lengthGained: number;
    invulnerabilityTicks: number;
  } {
    const item = getItem(itemId);
    if (!item) {
      return { success: false, message: 'Unknown item.', lengthGained: 0, invulnerabilityTicks: 0 };
    }

    if (this.inventory.getItemCount(itemId) <= 0) {
      return {
        success: false,
        message: `No ${item.name} remaining.`,
        lengthGained: 0,
        invulnerabilityTicks: 0,
      };
    }

    let lengthGained = 0;
    let invulnerabilityTicks = 0;

    switch (itemId) {
      case 'food-box-combo-extra-toast':
      case 'food-box-combo-coleslaw':
        lengthGained = 7;
        invulnerabilityTicks = 1200;
        break;
      case 'food-three-finger-combo':
        lengthGained = 5;
        invulnerabilityTicks = 900;
        break;
      case 'food-caniac-combo':
        lengthGained = 10;
        invulnerabilityTicks = 1800;
        break;
      default:
        return {
          success: false,
          message: 'Unknown item.',
          lengthGained: 0,
          invulnerabilityTicks: 0,
        };
    }

    this.inventory.removeItem(itemId, 1);

    this.growSnake(lengthGained);

    const currentInvuln = Number(this.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0);
    const updatedInvuln = Math.max(currentInvuln, invulnerabilityTicks);
    this.setFlag('fortitude.invulnerabilityTicks', updatedInvuln);

    return {
      success: true,
      message: `Cane\'s sauce hits different! +${lengthGained} length, ${invulnerabilityTicks} ticks of invulnerability.`,
      lengthGained,
      invulnerabilityTicks,
    };
  }

  setDirection(x: number, y: number): void {
    this.snake.setDirection(x, y);
  }

  forceDirection(x: number, y: number): void {
    this.snake.forceDirection(x, y);
  }

  getFlag<T = unknown>(key: string): T | undefined {
    return this.snake.flags[key] as T | undefined;
  }

  setFlag(key: string, value: unknown): void {
    if (value === undefined) {
      delete this.snake.flags[key];
    } else {
      this.snake.flags[key] = value;
    }
  }

  get rng(): RandomGenerator {
    return this._rng;
  }

  getWorld(): WorldService {
    return this.world;
  }

  random(): number {
    return this._rng();
  }

  enableTeleport(flag: boolean): void {
    this.snake.enableTeleport(flag);
  }

  getTeleport(): boolean {
    return this.snake.teleport;
  }

  // === STRUCTURE SPAWNING CHEATS ===

  /** Convert room.layout (string[]) to string[][] for placement functions. */
  private layoutTo2D(layout: string[]): string[][] {
    return layout.map((row) => row.split(''));
  }

  /** Convert string[][] back to string[] for room.layout. */
  private layoutFrom2D(layout2d: string[][]): string[] {
    return layout2d.map((row) => row.join(''));
  }

  /** Force-spawn a village in the current room. */
  spawnVillage(): boolean {
    const room = this.getCurrentRoom();
    const layout2d = this.layoutTo2D(room.layout);
    const result = tryPlaceVillage(layout2d, this.config.grid, this._rng, room.biomeId, {
      forbiddenCells: new Set(),
      margin: 5,
    });
    if (!result) {
      return false;
    }
    room.layout = this.layoutFrom2D(layout2d);
    room.questGiver = result.questGiver;
    room.village = result.village;
    return true;
  }

  /** Force-spawn a goblin camp in the current room. */
  spawnGoblinCamp(): boolean {
    const room = this.getCurrentRoom();
    const layout2d = this.layoutTo2D(room.layout);
    const result = tryPlaceGoblinCamp(layout2d, this.config.grid, this._rng, {
      forbiddenCells: new Set(),
      margin: 5,
    });
    if (!result) {
      return false;
    }
    room.layout = this.layoutFrom2D(layout2d);
    room.goblinCamp = result;
    return true;
  }

  /** Force-spawn a quest house in the current room. */
  spawnQuestHouse(): boolean {
    const room = this.getCurrentRoom();
    const layout2d = this.layoutTo2D(room.layout);
    const result = tryPlaceQuestHouse(layout2d, this.config.grid, this._rng, {
      forbiddenCells: new Set(),
      margin: 5,
    });
    if (!result) {
      return false;
    }
    room.layout = this.layoutFrom2D(layout2d);
    room.questGiver = result.questGiver;
    return true;
  }

  /** Force-spawn a Snake McDonalds in the current room. */
  spawnSnakeMcDonalds(): boolean {
    const room = this.getCurrentRoom();
    const layout2d = this.layoutTo2D(room.layout);
    const result = tryPlaceSnakeMcDonalds(layout2d, this.config.grid, this._rng, {
      forbiddenCells: new Set(),
      margin: 3,
    });
    if (!result) {
      return false;
    }
    room.layout = this.layoutFrom2D(layout2d);
    room.snakeMcDonalds = result;
    return true;
  }

  /** Force-spawn a Snake Cane's in the current room. */
  spawnSnakeCanes(): boolean {
    const room = this.getCurrentRoom();
    const layout2d = this.layoutTo2D(room.layout);
    const result = tryPlaceSnakeCanes(layout2d, this.config.grid, this._rng, {
      forbiddenCells: new Set(),
      margin: 3,
    });
    if (!result) {
      return false;
    }
    room.layout = this.layoutFrom2D(layout2d);
    room.snakeCanes = result;
    return true;
  }

  /** Force-spawn a shrine in the current room. */
  spawnShrine(): boolean {
    const room = this.getCurrentRoom();
    const layout2d = this.layoutTo2D(room.layout);
    const result = tryPlaceShrine(layout2d, this.config.grid, this._rng, {
      forbiddenCells: new Set(),
      margin: 5,
    });
    if (!result) {
      return false;
    }
    room.layout = this.layoutFrom2D(layout2d);
    room.shrine = result;
    room.questGiver = result.maiden;
    return true;
  }

  /** Force-spawn a ramen stand in the current room. */
  spawnRamenStand(): boolean {
    const room = this.getCurrentRoom();
    const layout2d = this.layoutTo2D(room.layout);
    const result = tryPlaceRamenStand(layout2d, this.config.grid, this._rng, {
      forbiddenCells: new Set(),
      margin: 5,
    });
    if (!result) {
      return false;
    }
    room.layout = this.layoutFrom2D(layout2d);
    room.ramenStand = result;
    return true;
  }

  /** Force-spawn a koi pond in the current room. */
  spawnKoiPond(): boolean {
    const room = this.getCurrentRoom();
    const layout2d = this.layoutTo2D(room.layout);
    const result = tryPlaceKoiPond(layout2d, this.config.grid, this._rng, {
      forbiddenCells: new Set(),
      margin: 4,
    });
    if (!result) {
      return false;
    }
    room.layout = this.layoutFrom2D(layout2d);
    room.koiPond = result;
    return true;
  }

  /** Force-spawn a tengu camp in the current room. */
  spawnTenguCamp(): boolean {
    const room = this.getCurrentRoom();
    const layout2d = this.layoutTo2D(room.layout);
    const result = tryPlaceTenguCamp(layout2d, this.config.grid, this._rng, {
      forbiddenCells: new Set(),
      margin: 5,
    });
    if (!result) {
      return false;
    }
    room.layout = this.layoutFrom2D(layout2d);
    room.tenguCamp = result;
    return true;
  }

  /** Force-spawn a roadside monument in the current room. */
  spawnRoadsideMonument(): boolean {
    const room = this.getCurrentRoom();
    const layout2d = this.layoutTo2D(room.layout);
    const result = tryPlaceRoadsideMonument(layout2d, this.config.grid, this._rng, {
      forbiddenCells: new Set(),
      margin: 5,
    });
    if (!result) {
      return false;
    }
    room.layout = this.layoutFrom2D(layout2d);
    room.roadsideMonument = result;
    room.questGiver = result.docent;
    return true;
  }

  /** Force-spawn an all-nite diner in the current room. */
  spawnAllNiteDiner(): boolean {
    const room = this.getCurrentRoom();
    const layout2d = this.layoutTo2D(room.layout);
    const result = tryPlaceAllNiteDiner(layout2d, this.config.grid, this._rng, {
      forbiddenCells: new Set(),
      margin: 5,
    });
    if (!result) {
      return false;
    }
    room.layout = this.layoutFrom2D(layout2d);
    room.allNiteDiner = result;
    return true;
  }

  /** Force-spawn a firework stand in the current room. */
  spawnFireworkStand(): boolean {
    const room = this.getCurrentRoom();
    const layout2d = this.layoutTo2D(room.layout);
    const result = tryPlaceFireworkStand(layout2d, this.config.grid, this._rng, {
      forbiddenCells: new Set(),
      margin: 5,
    });
    if (!result) {
      return false;
    }
    room.layout = this.layoutFrom2D(layout2d);
    room.fireworkStand = result;
    return true;
  }

  /** Force-spawn a jackalope lodge in the current room. */
  spawnJackalopeLodge(): boolean {
    const room = this.getCurrentRoom();
    const layout2d = this.layoutTo2D(room.layout);
    const result = tryPlaceJackalopeLodge(layout2d, this.config.grid, this._rng, {
      forbiddenCells: new Set(),
      margin: 5,
    });
    if (!result) {
      return false;
    }
    room.layout = this.layoutFrom2D(layout2d);
    room.jackalopeLodge = result;
    room.questGiver = result.elder;
    return true;
  }

  /** Force-spawn a moleman dig site in the current room. */
  spawnMolemanDigSite(): boolean {
    const room = this.getCurrentRoom();
    const layout2d = this.layoutTo2D(room.layout);
    const result = tryPlaceMolemanDigSite(layout2d, this.config.grid, this._rng, {
      forbiddenCells: new Set(),
      margin: 5,
      biomeId: room.biomeId,
    });
    if (!result) {
      return false;
    }
    room.layout = this.layoutFrom2D(layout2d);
    room.molemanDigSite = result;
    return true;
  }

  /**
   * Force-spawn a motel pool in the current room.
   * This recreates the motel pool ruins archetype layout.
   */
  spawnMotelPool(): boolean {
    const room = this.getCurrentRoom();
    const grid = this.config.grid;
    const rng = this._rng;
    const safe = new Set<string>();
    // Entrance runup cells
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < 5 && x < grid.cols; x++) {
        safe.add(`${x},${y}`);
        safe.add(`${grid.cols - 1 - x},${y}`);
      }
    }
    for (let x = 0; x < grid.cols; x++) {
      for (let y = 0; y < 5 && y < grid.rows; y++) {
        safe.add(`${x},${y}`);
        safe.add(`${x},${grid.rows - 1 - y}`);
      }
    }

    const roomWidth = grid.cols;
    const roomHeight = grid.rows;
    const deckWidth = Math.min(18, roomWidth - 12);
    const deckHeight = Math.min(12, roomHeight - 10);
    const left = Math.floor((roomWidth - deckWidth) / 2);
    const top = Math.floor((roomHeight - deckHeight) / 2);

    // Fill deck with 'E' tiles
    for (let y = top; y < top + deckHeight; y++) {
      for (let x = left; x < left + deckWidth; x++) {
        if (!safe.has(`${x},${y}`)) {
          room.layout[y] = room.layout[y].substring(0, x) + 'E' + room.layout[y].substring(x + 1);
        }
      }
    }

    // Pool
    const poolLeft = left + 4;
    const poolTop = top + 3;
    const poolWidth = deckWidth - 8;
    const poolHeight = deckHeight - 6;
    const water = rng() < 0.68;
    const waterTiles: Array<{ x: number; y: number }> = [];
    for (let y = poolTop; y < poolTop + poolHeight; y++) {
      for (let x = poolLeft; x < poolLeft + poolWidth; x++) {
        if (safe.has(`${x},${y}`)) continue;
        const tile = water ? '~' : 'O';
        room.layout[y] = room.layout[y].substring(0, x) + tile + room.layout[y].substring(x + 1);
        waterTiles.push({ x, y });
      }
    }

    // Wall
    const wallTop = Math.max(5, top - 3);
    for (let x = left + 2; x < left + deckWidth - 2; x++) {
      if (!safe.has(`${x},${wallTop}`)) {
        room.layout[wallTop] =
          room.layout[wallTop].substring(0, x) + '#' + room.layout[wallTop].substring(x + 1);
      }
    }

    // Sign
    const signX = left + deckWidth - 6;
    const signY = wallTop + 2;
    if (!safe.has(`${signX},${signY}`)) {
      room.layout[signY] =
        room.layout[signY].substring(0, signX) + 'N' + room.layout[signY].substring(signX + 1);
    }

    // Clerk and maintenance NPCs
    const clerkX = left + deckWidth - 4;
    const clerkY = top + 2;
    const maintenanceX = left + 3;
    const maintenanceY = top + deckHeight - 3;
    if (room.layout[clerkY]?.[clerkX])
      room.layout[clerkY] =
        room.layout[clerkY].substring(0, clerkX) + 'G' + room.layout[clerkY].substring(clerkX + 1);
    if (room.layout[maintenanceY]?.[maintenanceX])
      room.layout[maintenanceY] =
        room.layout[maintenanceY].substring(0, maintenanceX) +
        'G' +
        room.layout[maintenanceY].substring(maintenanceX + 1);

    // NPC profiles
    const clerkNames = ['Vacancy Vera', 'Clerk Connie', 'Pool Key Dale'];
    const maintenanceNames = ['Skimmer Hank', 'Chlorine Tammy', 'Net Earl'];
    const poolNames = [
      'The Big Dipper',
      'Snake Splash Pool',
      'Aquatic Serpent Basin',
      'The Gator Hole',
      'Serpent Springs',
    ];

    room.motelPool = {
      clerk: {
        ...buildHouseNpcProfile(clerkNames[Math.floor(rng() * clerkNames.length)], 'sage-1'),
        x: clerkX,
        y: clerkY,
      },
      maintenance: {
        ...buildHouseNpcProfile(
          maintenanceNames[Math.floor(rng() * maintenanceNames.length)],
          'sage-2',
        ),
        x: maintenanceX,
        y: maintenanceY,
      },
      poolName: poolNames[Math.floor(rng() * poolNames.length)],
      center: { x: poolLeft + Math.floor(poolWidth / 2), y: poolTop + Math.floor(poolHeight / 2) },
      waterTiles,
    };
    return true;
  }

  /**
   * Force-spawn a gridiron yard in the current room.
   * This recreates the gridiron-yard archetype layout.
   */
  spawnGridironYard(): boolean {
    const room = this.getCurrentRoom();
    const grid = this.config.grid;
    const rng = this._rng;
    const safe = new Set<string>();
    // Entrance runup cells
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < 4 && x < grid.cols; x++) {
        safe.add(`${x},${y}`);
        safe.add(`${grid.cols - 1 - x},${y}`);
      }
    }
    for (let x = 0; x < grid.cols; x++) {
      for (let y = 0; y < 4 && y < grid.rows; y++) {
        safe.add(`${x},${y}`);
        safe.add(`${x},${grid.rows - 1 - y}`);
      }
    }

    const roomWidth = grid.cols;
    const roomHeight = grid.rows;
    const left = 5;
    const top = 5;
    const width = roomWidth - 10;
    const height = roomHeight - 10;

    // Fill field with 'E' tiles
    for (let y = top; y < top + height; y++) {
      for (let x = left; x < left + width; x++) {
        if (!safe.has(`${x},${y}`)) {
          room.layout[y] = room.layout[y].substring(0, x) + 'E' + room.layout[y].substring(x + 1);
        }
      }
    }

    // Yard lines
    for (let x = left + 3; x < left + width - 2; x += 4) {
      for (let y = top + 1; y < top + height - 1; y++) {
        if (!safe.has(`${x},${y}`)) {
          room.layout[y] = room.layout[y].substring(0, x) + 'W' + room.layout[y].substring(x + 1);
        }
      }
    }

    // Boundaries
    const fillRow = (y: number, xStart: number, xEnd: number) => {
      for (let x = xStart; x < xEnd; x++) {
        if (!safe.has(`${x},${y}`)) {
          room.layout[y] = room.layout[y].substring(0, x) + '#' + room.layout[y].substring(x + 1);
        }
      }
    };
    fillRow(top - 1, left - 1, left + width + 2);
    fillRow(top + height, left - 1, left + width + 2);
    fillRow(top - 1, left - 1, left);
    fillRow(top, left - 1, left);
    fillRow(top + height + 1, left - 1, left);
    fillRow(top - 1, left + width, left + width + 1);
    fillRow(top, left + width, left + width + 1);
    fillRow(top + height + 1, left + width, left + width + 1);

    // L-shapes for goal posts
    const fillLShape = (x: number, y: number) => {
      if (!safe.has(`${x},${y}`))
        room.layout[y] = room.layout[y].substring(0, x) + 'L' + room.layout[y].substring(x + 1);
      if (!safe.has(`${x + 1},${y}`))
        room.layout[y] = room.layout[y].substring(0, x + 1) + 'L' + room.layout[y].substring(x + 2);
      if (!safe.has(`${x},${y + 1}`))
        room.layout[y + 1] =
          room.layout[y + 1].substring(0, x) + 'L' + room.layout[y + 1].substring(x + 1);
      if (!safe.has(`${x + 1},${y + 1}`))
        room.layout[y + 1] =
          room.layout[y + 1].substring(0, x + 1) + 'L' + room.layout[y + 1].substring(x + 2);
    };
    fillLShape(left + 1, top - 3);
    fillLShape(left + width - 3, top - 3);

    // Center sign
    const signX = left + Math.floor(width / 2) - 2;
    const signY = top - 3;
    for (let x = signX; x < signX + 4; x++) {
      if (!safe.has(`${x},${signY}`)) {
        room.layout[signY] =
          room.layout[signY].substring(0, x) + 'N' + room.layout[signY].substring(x + 1);
      }
    }

    // Coach and players
    const coachX = left + Math.floor(width / 2);
    const coachY = top + height - 3;
    room.layout[coachY] =
      room.layout[coachY].substring(0, coachX) + 'G' + room.layout[coachY].substring(coachX + 1);

    const playerSpots = [
      { x: left + 5, y: top + 4 },
      { x: left + width - 6, y: top + 4 },
      { x: left + 8, y: top + height - 5 },
      { x: left + width - 9, y: top + height - 5 },
    ];
    playerSpots.forEach((spot) => {
      room.layout[spot.y] =
        room.layout[spot.y].substring(0, spot.x) + 'G' + room.layout[spot.y].substring(spot.x + 1);
    });

    const playerNames = ['Left Tackle Tammy', 'Wide Earl', 'Safety Sue', 'Bobby-Joe Blitz'];
    room.gridironYard = {
      coach: {
        ...buildHouseNpcProfile('Coach Hank', 'sage-2'),
        x: coachX,
        y: coachY,
      },
      players: playerSpots.map((spot, index) => ({
        ...buildHouseNpcProfile(playerNames[index] ?? 'Yard Player', 'sage-1'),
        x: spot.x,
        y: spot.y,
      })),
      fieldName: 'Glory Inches Yard',
    };
    return true;
  }

  /**
   * Force-spawn a billboard oracle in the current room.
   * This recreates the billboard-maze archetype layout.
   */
  spawnBillboardOracle(): boolean {
    const room = this.getCurrentRoom();
    const grid = this.config.grid;
    const rng = this._rng;
    const safe = new Set<string>();
    // Entrance runup cells
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < 4 && x < grid.cols; x++) {
        safe.add(`${x},${y}`);
        safe.add(`${grid.cols - 1 - x},${y}`);
      }
    }
    for (let x = 0; x < grid.cols; x++) {
      for (let y = 0; y < 4 && y < grid.rows; y++) {
        safe.add(`${x},${y}`);
        safe.add(`${x},${grid.rows - 1 - y}`);
      }
    }

    const roomWidth = grid.cols;
    const roomHeight = grid.rows;
    const mazeWidth = Math.min(22, roomWidth - 14);
    const mazeHeight = Math.min(14, roomHeight - 10);
    const left = Math.floor((roomWidth - mazeWidth) / 2);
    const top = 4;

    // Fill maze area with 'E' tiles
    for (let y = top; y < top + mazeHeight; y++) {
      for (let x = left; x < left + mazeWidth; x++) {
        if (!safe.has(`${x},${y}`)) {
          room.layout[y] = room.layout[y].substring(0, x) + 'E' + room.layout[y].substring(x + 1);
        }
      }
    }

    // Maze walls - create a simple maze pattern
    const wallPositions = [
      // Outer walls
      { y: top - 1, xStart: left - 1, xEnd: left + mazeWidth + 1 },
      { y: top + mazeHeight, xStart: left - 1, xEnd: left + mazeWidth + 1 },
      // Inner walls for maze effect
      { y: top + 2, xStart: left + 3, xEnd: left + 8 },
      { y: top + 2, xStart: left + 14, xEnd: left + 18 },
      { y: top + 6, xStart: left + 1, xEnd: left + 6 },
      { y: top + 6, xStart: left + 10, xEnd: left + 15 },
      { y: top + 10, xStart: left + 4, xEnd: left + 9 },
      { y: top + 10, xStart: left + 13, xEnd: left + 20 },
    ];
    for (const wall of wallPositions) {
      for (let x = wall.xStart; x < wall.xEnd; x++) {
        if (wall.y >= 0 && wall.y < roomHeight && !safe.has(`${x},${wall.y}`)) {
          room.layout[wall.y] =
            room.layout[wall.y].substring(0, x) + '#' + room.layout[wall.y].substring(x + 1);
        }
      }
    }

    // Glints
    for (let i = 0; i < 5; i++) {
      const gx = left + 2 + Math.floor(rng() * (mazeWidth - 4));
      const gy = top + 2 + Math.floor(rng() * (mazeHeight - 4));
      if (!safe.has(`${gx},${gy}`) && room.layout[gy][gx] === 'E') {
        room.layout[gy] =
          room.layout[gy].substring(0, gx) + 'N' + room.layout[gy].substring(gx + 1);
      }
    }

    // Find an open cell for the sign painter
    let painterX = -1;
    let painterY = -1;
    for (let y = top + mazeHeight + 2; y < roomHeight - 3; y++) {
      for (let x = left; x < left + mazeWidth; x++) {
        if (!safe.has(`${x},${y}`) && room.layout[y][x] === '.') {
          painterX = x;
          painterY = y;
          break;
        }
      }
      if (painterX >= 0) break;
    }
    if (painterX < 0) {
      // Fallback: find any open cell
      for (let y = top; y < roomHeight; y++) {
        for (let x = left; x < left + mazeWidth; x++) {
          if (!safe.has(`${x},${y}`) && room.layout[y][x] === '.') {
            painterX = x;
            painterY = y;
            break;
          }
        }
        if (painterX >= 0) break;
      }
    }
    if (painterX >= 0) {
      room.layout[painterY] =
        room.layout[painterY].substring(0, painterX) +
        'G' +
        room.layout[painterY].substring(painterX + 1);
      const painterNames = ['Sign-Paint Marlene', 'Billboard Dale', 'Ad-Man Walt'];
      const slogans = [
        "SNAKE: IT'S THE ULTIMATE EXPERIENCE!",
        'EAT AN APPLE, GET LONGER!',
        "DON'T CRASH, JUST ASK!",
        'THE FUTURE IS GREEN AND SNAKELIKE!',
        'COILED TO PERFECTION!',
        'UNCOIL YOUR POTENTIAL!',
      ];
      room.billboardOracle = {
        signPainter: {
          ...buildHouseNpcProfile(painterNames[Math.floor(rng() * painterNames.length)], 'sage-1'),
          x: painterX,
          y: painterY,
        },
        slogan: slogans[Math.floor(rng() * slogans.length)],
      };
      return true;
    }
    return false;
  }

  /**
   * Force-spawn a road crew in the current room.
   * This recreates the interstate-cut archetype layout.
   */
  spawnRoadCrew(): boolean {
    const room = this.getCurrentRoom();
    const grid = this.config.grid;
    const rng = this._rng;
    const safe = new Set<string>();
    // Entrance runup cells
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < 4 && x < grid.cols; x++) {
        safe.add(`${x},${y}`);
        safe.add(`${grid.cols - 1 - x},${y}`);
      }
    }
    for (let x = 0; x < grid.cols; x++) {
      for (let y = 0; y < 4 && y < grid.rows; y++) {
        safe.add(`${x},${y}`);
        safe.add(`${x},${grid.rows - 1 - y}`);
      }
    }

    const roomWidth = grid.cols;
    const roomHeight = grid.rows;
    const horizontal = rng() < 0.5;

    const setTile = (x: number, y: number, tile: string) => {
      if (y >= 0 && y < roomHeight && x >= 0 && x < roomWidth && !safe.has(`${x},${y}`)) {
        room.layout[y] = room.layout[y].substring(0, x) + tile + room.layout[y].substring(x + 1);
      }
    };

    if (horizontal) {
      const roadTop = Math.floor(roomHeight / 2) - 2;
      for (let x = 0; x < roomWidth; x++) {
        setTile(x, roadTop + 2, 'A');
      }
      // Road surface
      for (let dy = -1; dy <= 1; dy++) {
        for (let x = 0; x < roomWidth; x++) {
          setTile(x, roadTop + 2 + dy, 'A');
        }
      }
      // Center dashes
      for (let x = 2; x < roomWidth - 2; x += 4) {
        setTile(x, roadTop + 2, 'W');
      }
      // Rock shoulders
      for (let x = 0; x < roomWidth; x++) {
        for (const dy of [-3, 3]) {
          if (room.layout[roadTop + 2 + dy]?.[x] === '.') {
            setTile(x, roadTop + 2 + dy, 'R');
          }
        }
      }
      // Ranger
      let rangerX = -1;
      let rangerY = -1;
      for (let y = 0; y < roomHeight; y++) {
        for (let x = 0; x < roomWidth; x++) {
          if (!safe.has(`${x},${y}`) && room.layout[y][x] === '.') {
            rangerX = x;
            rangerY = y;
            break;
          }
        }
        if (rangerX >= 0) break;
      }
      if (rangerX >= 0) {
        setTile(rangerX, rangerY, 'G');
        const rangerNames = ['Cone Ranger Buck', 'Shoulder Sue', 'Detour Dale'];
        const roadNames = [
          'Route 66',
          'Snake Alley',
          'The Coil Expressway',
          'Liberty Lane',
          'Midnight Drive',
        ];
        room.roadCrew = {
          ranger: {
            ...buildHouseNpcProfile(rangerNames[Math.floor(rng() * rangerNames.length)], 'sage-1'),
            x: rangerX,
            y: rangerY,
          },
          roadName: roadNames[Math.floor(rng() * roadNames.length)],
        };
        return true;
      }
    } else {
      const roadLeft = Math.floor(roomWidth / 2) - 2;
      for (let y = 0; y < roomHeight; y++) {
        setTile(roadLeft + 2, y, 'A');
      }
      // Road surface
      for (let dx = -1; dx <= 1; dx++) {
        for (let y = 0; y < roomHeight; y++) {
          setTile(roadLeft + 2 + dx, y, 'A');
        }
      }
      // Center dashes
      for (let y = 2; y < roomHeight - 2; y += 4) {
        setTile(roadLeft + 2, y, 'W');
      }
      // Rock shoulders
      for (let y = 0; y < roomHeight; y++) {
        for (const dx of [-3, 3]) {
          if (room.layout[y]?.[roadLeft + 2 + dx] === '.') {
            setTile(roadLeft + 2 + dx, y, 'R');
          }
        }
      }
      // Ranger
      let rangerX = -1;
      let rangerY = -1;
      for (let y = 0; y < roomHeight; y++) {
        for (let x = 0; x < roomWidth; x++) {
          if (!safe.has(`${x},${y}`) && room.layout[y][x] === '.') {
            rangerX = x;
            rangerY = y;
            break;
          }
        }
        if (rangerX >= 0) break;
      }
      if (rangerX >= 0) {
        setTile(rangerX, rangerY, 'G');
        const rangerNames = ['Cone Ranger Buck', 'Shoulder Sue', 'Detour Dale'];
        const roadNames = [
          'Route 66',
          'Snake Alley',
          'The Coil Expressway',
          'Liberty Lane',
          'Midnight Drive',
        ];
        room.roadCrew = {
          ranger: {
            ...buildHouseNpcProfile(rangerNames[Math.floor(rng() * rangerNames.length)], 'sage-1'),
            x: rangerX,
            y: rangerY,
          },
          roadName: roadNames[Math.floor(rng() * roadNames.length)],
        };
        return true;
      }
    }
    return false;
  }

  /**
   * Force-spawn a roadside monument in the current room.
   * This recreates the monument-plaza archetype layout.
   */
  spawnRoadsideMonumentAlt(): boolean {
    const room = this.getCurrentRoom();
    const grid = this.config.grid;
    const rng = this._rng;
    const safe = new Set<string>();
    // Entrance runup cells
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < 4 && x < grid.cols; x++) {
        safe.add(`${x},${y}`);
        safe.add(`${grid.cols - 1 - x},${y}`);
      }
    }
    for (let x = 0; x < grid.cols; x++) {
      for (let y = 0; y < 4 && y < grid.rows; y++) {
        safe.add(`${x},${y}`);
        safe.add(`${x},${grid.rows - 1 - y}`);
      }
    }

    const roomWidth = grid.cols;
    const roomHeight = grid.rows;
    const plazaWidth = Math.min(18, roomWidth - 10);
    const plazaHeight = Math.min(10, roomHeight - 10);
    const left = Math.floor((roomWidth - plazaWidth) / 2);
    const top = 4;

    // Fill plaza
    for (let y = top; y < top + plazaHeight; y++) {
      for (let x = left; x < left + plazaWidth; x++) {
        if (!safe.has(`${x},${y}`)) {
          room.layout[y] = room.layout[y].substring(0, x) + 'E' + room.layout[y].substring(x + 1);
        }
      }
    }

    // Monument
    const monumentLeft = Math.floor(roomWidth / 2) - 2;
    const monumentTop = top + 2;
    for (let x = monumentLeft; x < monumentLeft + 5; x++) {
      if (!safe.has(`${x},${monumentTop}`)) {
        room.layout[monumentTop] =
          room.layout[monumentTop].substring(0, x) +
          '#' +
          room.layout[monumentTop].substring(x + 1);
      }
    }
    // Monument sign
    const signX = monumentLeft + 1;
    const signY = monumentTop - 1;
    if (!safe.has(`${signX},${signY}`))
      room.layout[signY] =
        room.layout[signY].substring(0, signX) + 'M' + room.layout[signY].substring(signX + 1);
    if (!safe.has(`${signX + 1},${signY}`))
      room.layout[signY] =
        room.layout[signY].substring(0, signX + 1) + 'M' + room.layout[signY].substring(signX + 2);
    if (!safe.has(`${signX + 2},${signY}`))
      room.layout[signY] =
        room.layout[signY].substring(0, signX + 2) + 'M' + room.layout[signY].substring(signX + 3);

    // Path
    const pathX = Math.floor(roomWidth / 2);
    for (let y = top + plazaHeight; y < roomHeight - 4; y++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = pathX + dx;
        if (!safe.has(`${x},${y}`) && room.layout[y]?.[x] === '.') {
          room.layout[y] = room.layout[y].substring(0, x) + 'W' + room.layout[y].substring(x + 1);
        }
      }
    }

    // Glints
    for (let i = 0; i < 5; i++) {
      const gx = left + 1 + Math.floor(rng() * (plazaWidth - 2));
      const gy = top + 1 + Math.floor(rng() * (plazaHeight - 2));
      if (!safe.has(`${gx},${gy}`) && room.layout[gy]?.[gx] === 'E') {
        room.layout[gy] =
          room.layout[gy].substring(0, gx) + 'N' + room.layout[gy].substring(gx + 1);
      }
    }

    // Try to place the monument via tryPlaceRoadsideMonument for proper NPC placement
    // First clear the plaza layout to let the placement function work
    for (let y = top; y < top + plazaHeight; y++) {
      for (let x = left; x < left + plazaWidth; x++) {
        if (room.layout[y][x] === 'E') {
          room.layout[y] = room.layout[y].substring(0, x) + '.' + room.layout[y].substring(x + 1);
        }
      }
    }
    // Remove the monument structure
    for (let x = monumentLeft; x < monumentLeft + 5; x++) {
      if (room.layout[monumentTop]?.[x] === '#') {
        room.layout[monumentTop] =
          room.layout[monumentTop].substring(0, x) +
          '.' +
          room.layout[monumentTop].substring(x + 1);
      }
    }

    // Now try to place it properly
    const layout2d = this.layoutTo2D(room.layout);
    const result = tryPlaceRoadsideMonument(layout2d, grid, rng, {
      forbiddenCells: safe,
      margin: 5,
    });
    if (!result) {
      // Restore the plaza layout as fallback
      for (let y = top; y < top + plazaHeight; y++) {
        for (let x = left; x < left + plazaWidth; x++) {
          if (room.layout[y][x] === '.') {
            room.layout[y] = room.layout[y].substring(0, x) + 'E' + room.layout[y].substring(x + 1);
          }
        }
      }
      // Restore monument
      for (let x = monumentLeft; x < monumentLeft + 5; x++) {
        if (!safe.has(`${x},${monumentTop}`)) {
          room.layout[monumentTop] =
            room.layout[monumentTop].substring(0, x) +
            '#' +
            room.layout[monumentTop].substring(x + 1);
        }
      }
      const signX2 = monumentLeft + 1;
      const signY2 = monumentTop - 1;
      if (!safe.has(`${signX2},${signY2}`))
        room.layout[signY2] =
          room.layout[signY2].substring(0, signX2) +
          'M' +
          room.layout[signY2].substring(signX2 + 1);
      if (!safe.has(`${signX2 + 1},${signY2}`))
        room.layout[signY2] =
          room.layout[signY2].substring(0, signX2 + 1) +
          'M' +
          room.layout[signY2].substring(signX2 + 2);
      if (!safe.has(`${signX2 + 2},${signY2}`))
        room.layout[signY2] =
          room.layout[signY2].substring(0, signX2 + 2) +
          'M' +
          room.layout[signY2].substring(signX2 + 3);
      // Place NPCs manually
      const monumentNames = ['Historical Hank', 'Monument Mary', 'Landmark Larry'];
      const docentNames = ['Docent Diane', 'Guide Greg', 'Tour Tom'];
      const monumentName = 'The Great Serpent Stone';
      room.roadsideMonument = {
        docent: {
          ...buildHouseNpcProfile(docentNames[Math.floor(rng() * docentNames.length)], 'sage-1'),
          x: Math.floor(roomWidth / 2),
          y: top + plazaHeight + 2,
        },
        ranger: {
          ...buildHouseNpcProfile(
            monumentNames[Math.floor(rng() * monumentNames.length)],
            'sage-2',
          ),
          x: left + Math.floor(plazaWidth / 2),
          y: top + plazaHeight + 4,
        },
        hasBlessings: rng() < 0.5,
        monumentName,
      };
      room.questGiver = room.roadsideMonument.docent;
      return true;
    }
    room.layout = this.layoutFrom2D(layout2d);
    room.roadsideMonument = result;
    room.questGiver = result.docent;
    return true;
  }

  /**
   * Force-spawn all possible structures in the current room.
   * This is the ultimate "I want to see everything" cheat.
   */
  spawnAllStructures(): boolean {
    const results: Array<{ name: string; ok: boolean }> = [];

    // Try each structure placement
    results.push({ name: 'village', ok: this.spawnVillage() });
    results.push({ name: 'goblin-camp', ok: this.spawnGoblinCamp() });
    results.push({ name: 'quest-house', ok: this.spawnQuestHouse() });
    results.push({ name: 'snake-mcdonalds', ok: this.spawnSnakeMcDonalds() });
    results.push({ name: 'shrine', ok: this.spawnShrine() });
    results.push({ name: 'ramen-stand', ok: this.spawnRamenStand() });
    results.push({ name: 'koi-pond', ok: this.spawnKoiPond() });
    results.push({ name: 'tengu-camp', ok: this.spawnTenguCamp() });
    results.push({ name: 'roadside-monument', ok: this.spawnRoadsideMonument() });
    results.push({ name: 'all-nite-diner', ok: this.spawnAllNiteDiner() });
    results.push({ name: 'firework-stand', ok: this.spawnFireworkStand() });
    results.push({ name: 'jackalope-lodge', ok: this.spawnJackalopeLodge() });
    results.push({ name: 'moleman-dig-site', ok: this.spawnMolemanDigSite() });
    results.push({ name: 'motel-pool', ok: this.spawnMotelPool() });
    results.push({ name: 'gridiron-yard', ok: this.spawnGridironYard() });
    results.push({ name: 'billboard-oracle', ok: this.spawnBillboardOracle() });
    results.push({ name: 'road-crew', ok: this.spawnRoadCrew() });
    results.push({ name: 'roadside-monument-alt', ok: this.spawnRoadsideMonumentAlt() });

    const successCount = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).map((r) => r.name);

    if (successCount > 0) {
      console.info(
        `[SnakeGame] Spawned ${successCount} structures:`,
        results.filter((r) => r.ok).map((r) => r.name),
      );
    }
    if (failed.length > 0) {
      console.warn(`[SnakeGame] Failed to spawn: ${failed.join(', ')}`);
    }

    return successCount > 0;
  }

  /**
   * Clear the current room of all structures, obstacles, and walls.
   * Replaces walls (#), water (~), and decorative tiles with open floor (.).
   * Preserves portals (H), cave/layer entrances (@), and other important tiles.
   */
  clearRoom(): void {
    const room = this.getCurrentRoom();
    const grid = this.config.grid;
    let clearedCount = 0;

    // Structure data to clear
    room.questGiver = undefined;
    room.village = undefined;
    room.goblinCamp = undefined;
    room.town = undefined;
    room.townPerimeter = undefined;
    room.snakeMcDonalds = undefined;
    room.shrine = undefined;
    room.ramenStand = undefined;
    room.koiPond = undefined;
    room.motelPool = undefined;
    room.tenguCamp = undefined;
    room.roadsideMonument = undefined;
    room.allNiteDiner = undefined;
    room.fireworkStand = undefined;
    room.jackalopeLodge = undefined;
    room.gridironYard = undefined;
    room.billboardOracle = undefined;
    room.roadCrew = undefined;
    room.molemanDigSite = undefined;
    room.bulletTrainStation = undefined;
    room.temperatureReliefs = undefined;
    room.caveEntrances = undefined;
    room.layerEntrances = undefined;
    room.cave = undefined;
    room.layer = undefined;
    room.minecraftBlocks = undefined;
    room.minecraftCropData = undefined;
    room.vegetation = undefined;

    // Clear the layout: replace walls and obstacles with floor
    for (let y = 0; y < grid.rows; y++) {
      const row = room.layout[y];
      if (!row) continue;
      let rowChanged = false;
      const chars = row.split('');
      for (let x = 0; x < grid.cols; x++) {
        const tile = chars[x];
        // Keep important tiles: portals (H), entrances (@), floor (.), NPCs (G)
        // Keep apples/enemies that may have been placed
        // Clear walls (#), water (~), dry pool (O), roads (A), paths (W), and decorations
        if (
          tile === '#' ||
          tile === '~' ||
          tile === 'O' ||
          tile === 'A' ||
          tile === 'W' ||
          tile === 'E' ||
          tile === 'L' ||
          tile === 'N' ||
          tile === 'M' ||
          tile === 'T' ||
          tile === 'B' ||
          tile === 'C' ||
          tile === 'F' ||
          tile === 'R' ||
          tile === 'D'
        ) {
          chars[x] = '.';
          rowChanged = true;
          clearedCount++;
        }
      }
      if (rowChanged) {
        room.layout[y] = chars.join('');
      }
    }

    console.info(`[SnakeGame] Cleared ${clearedCount} tiles in room ${room.id}.`);
  }

  getActiveQuests(): Quest[] {
    return this.questController.getActive();
  }

  getCompletedQuestIds(): string[] {
    return this.questController.getCompletedIds();
  }

  getAcceptedQuestIds(): string[] {
    return this.questController.getAcceptedIds();
  }

  getAcceptedQuests(): Quest[] {
    const acceptedIds = new Set(this.questController.getAcceptedIds());
    return this.registry.getAll().filter((quest) => acceptedIds.has(quest.id));
  }

  getAllQuests(): Quest[] {
    return this.registry.getAll();
  }

  getTownQuestBoardOptions(): TownQuestOption[] {
    const town = this.getCurrentTown();
    if (!town) {
      return [];
    }
    return this.questController
      .getOfferableQuests(this)
      .filter((quest) => !TOWN_QUEST_EXCLUDED_IDS.has(quest.id))
      .filter((quest) => this.getQuestScale(quest.id) === 'small')
      .sort(
        (a, b) =>
          this.stableQuestSortValue(`${town.id}:board:${a.id}`) -
          this.stableQuestSortValue(`${town.id}:board:${b.id}`),
      )
      .slice(0, 4)
      .map((quest) => this.toTownQuestOption(quest));
  }

  acceptTownQuestBoardQuest(questId: string): { ok: boolean; message: string; quest?: Quest } {
    const options = this.getTownQuestBoardOptions();
    if (!options.some((option) => option.id === questId)) {
      return { ok: false, message: 'That notice is no longer available.' };
    }
    const accepted = this.questController.acceptSpecificQuestById(questId, this);
    if (!accepted) {
      return { ok: false, message: 'That notice has already been handled.' };
    }
    this.setActiveQuestMarkerQuestId(accepted.id);
    return { ok: true, message: `Accepted: ${accepted.label}.`, quest: accepted };
  }

  getTownLargeQuestOption(): TownQuestOption | null {
    const town = this.getCurrentTown();
    if (!town) {
      return null;
    }
    if (!this.getCurrentTownLargeQuestGiver(town)) {
      return null;
    }
    const quest = this.getTownLargeQuestForTown(town);
    return quest ? this.toTownQuestOption(quest) : null;
  }

  getTownLargeQuestForActor(actorId?: string): Quest | null {
    const town = this.getCurrentTown();
    if (!town) {
      return null;
    }
    if (actorId && !this.isCurrentTownLargeQuestGiverActor(actorId)) {
      return null;
    }
    if (!this.getCurrentTownLargeQuestGiver(town)) {
      return null;
    }
    return this.getTownLargeQuestForTown(town);
  }

  acceptTownLargeQuest(actorId?: string): { ok: boolean; message: string; quest?: Quest } {
    if (actorId && !this.isCurrentTownLargeQuestGiverActor(actorId)) {
      return { ok: false, message: 'That person has no large job for you.' };
    }
    const option = this.getTownLargeQuestOption();
    if (!option) {
      return { ok: false, message: 'No larger work is available here right now.' };
    }
    const accepted = this.questController.acceptSpecificQuestById(
      option.id,
      this,
      this.snake.currentRoomId,
    );
    if (!accepted) {
      return { ok: false, message: 'That job slipped away before you could accept it.' };
    }
    this.setActiveQuestMarkerQuestId(accepted.id);
    return { ok: true, message: `Accepted: ${accepted.label}.`, quest: accepted };
  }

  isCurrentTownLargeQuestGiverActor(actorId: string): boolean {
    const town = this.getCurrentTown();
    if (!town) {
      return false;
    }
    const giver = this.getCurrentTownLargeQuestGiver(town);
    if (!giver) {
      return false;
    }
    const expected = giver.actorId ?? this.getTownResidentActorId(town.id, giver.id, giver.role);
    return actorId === expected;
  }

  setActiveQuestMarkerQuestId(questId: string | undefined): boolean {
    if (!questId) {
      this.setFlag('quest.activeMarkerId', undefined);
      return true;
    }
    const known = new Set([
      ...this.questController.getAcceptedIds(),
      ...this.questController.getActive().map((quest) => quest.id),
      ...this.questController.getCompletedIds(),
    ]);
    if (!known.has(questId)) {
      return false;
    }
    this.setFlag('quest.activeMarkerId', questId);
    return true;
  }

  getActiveQuestMarkerQuestId(): string | undefined {
    return this.getFlag<string>('quest.activeMarkerId');
  }

  getQuestObjectiveSummaries(questId: string): QuestObjectiveSummary[] {
    return this.collectQuestMapMarkers()
      .filter((marker) => marker.questId === questId)
      .map((marker) => {
        const [x = 0, y = 0, z = 0] = marker.roomId.split(',').map((part) => Number(part));
        return {
          roomId: marker.roomId,
          label: marker.label,
          kind: marker.kind,
          coordinates: { x, y, z },
        };
      });
  }

  getOfferedQuest(): Quest | null {
    return this.questController.getOffered();
  }

  acceptOfferedQuest(): Quest | null {
    return this.questController.acceptOffered(this);
  }

  rejectOfferedQuest(): void {
    this.questController.rejectOffered();
  }

  startGreenPurchaseCheat(): boolean {
    if (
      this.getStagedQuestInstances().some(
        (instance) =>
          instance.questId === 'green-purchase' &&
          instance.stage !== 'failed' &&
          instance.stage !== 'completed',
      )
    ) {
      return false;
    }
    this.ensureGreenPurchaseCheatGiver();
    const quest = this.questController.offerSpecificQuestById(
      'green-purchase',
      this,
      this.snake.currentRoomId,
    );
    if (!quest) {
      return false;
    }
    return Boolean(this.questController.acceptOffered(this));
  }

  startFindMyBabyCheat(): boolean {
    if (
      this.getStagedQuestInstances().some(
        (instance) =>
          instance.questId === 'find-my-baby' &&
          instance.stage !== 'failed' &&
          instance.stage !== 'completed',
      )
    ) {
      return false;
    }
    this.ensureQuestCheatGiver(
      'npc-worried-parent',
      'The Worried Parent',
      'sage-1',
      'The Worried Parent appears with a cradle-shaped problem.',
    );
    const quest = this.questController.offerSpecificQuestById(
      'find-my-baby',
      this,
      this.snake.currentRoomId,
    );
    if (!quest) {
      return false;
    }
    return Boolean(this.questController.acceptOffered(this));
  }

  startFreakYouCheat(): boolean {
    if (
      this.getStagedQuestInstances().some(
        (instance) =>
          instance.questId === 'freak-you' &&
          instance.stage !== 'failed' &&
          instance.stage !== 'completed',
      )
    ) {
      return false;
    }
    this.ensureQuestCheatGiver(
      'npc-time-traveler',
      'The Time Traveler',
      'sage-2',
      'The Time Traveler appears already afraid of you.',
    );
    const quest = this.questController.offerSpecificQuestById(
      'freak-you',
      this,
      this.snake.currentRoomId,
    );
    if (!quest) {
      return false;
    }
    return Boolean(this.questController.acceptOffered(this));
  }

  requestQuestFromGiver(roomId: string): QuestGiverRequest {
    const turnIn = this.tryGetStagedQuestTurnIn(roomId);
    if (turnIn) {
      return turnIn;
    }
    const stagedActive = this.getStagedQuestInstances().find(
      (instance) =>
        instance.giverRoomId === roomId &&
        instance.stage !== 'completed' &&
        instance.stage !== 'failed',
    );
    if (stagedActive) {
      return {
        quest: this.registry.getById(stagedActive.questId) ?? null,
        state: 'active',
      };
    }
    return this.questController.getQuestForGiver(roomId, this);
  }

  private getQuestScale(questId: string): 'small' | 'large' {
    return LARGE_TOWN_QUEST_IDS.has(questId) || this.requiresQuestGiver(questId)
      ? 'large'
      : 'small';
  }

  private getCurrentTownLargeQuestGiver(
    town: TownStructure,
  ): TownStructure['residents'][number] | null {
    const roomId = this.snake.currentRoomId;
    return (
      town.residents.find(
        (resident) => resident.role === 'questGiver' && resident.workRoomId === roomId,
      ) ?? null
    );
  }

  private getTownLargeQuestForTown(town: TownStructure): Quest | null {
    const key = `town.largeQuest.${town.id}`;
    const selectedQuestId = this.getFlag<string>(key);
    const offerable = this.questController
      .getOfferableQuests(this, this.snake.currentRoomId)
      .filter((candidate) => !TOWN_QUEST_EXCLUDED_IDS.has(candidate.id))
      .filter((candidate) => this.getQuestScale(candidate.id) === 'large');
    if (selectedQuestId) {
      return offerable.find((quest) => quest.id === selectedQuestId) ?? null;
    }
    const quest = offerable.sort(
      (a, b) =>
        this.stableQuestSortValue(`${town.id}:large:${a.id}`) -
        this.stableQuestSortValue(`${town.id}:large:${b.id}`),
    )[0];
    if (!quest) {
      return null;
    }
    this.setFlag(key, quest.id);
    return quest;
  }

  private toTownQuestOption(quest: Quest): TownQuestOption {
    const questStrings = i18n.getQuestString(quest.id) ?? {
      label: quest.label,
      description: quest.description,
    };
    return {
      id: quest.id,
      label: questStrings.label,
      description: questStrings.description,
    };
  }

  private stableQuestSortValue(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  requiresQuestGiver(questId: string): boolean {
    return (
      questId === 'tax-collector-future-body' ||
      questId === 'green-purchase' ||
      questId === 'find-my-baby' ||
      questId === 'goblin-ledger-debt' ||
      questId === 'freak-you'
    );
  }

  canOfferQuestFromGiver(questId: string, giverRoomId: string): boolean {
    if (questId === 'green-purchase') {
      return this.findForestRoomNear(giverRoomId, 10, 12) !== null;
    }
    return true;
  }

  onQuestAcceptedFromGiver(quest: Quest, giverRoomId?: string): void {
    if (!giverRoomId) {
      return;
    }
    if (quest.id === 'tax-collector-future-body') {
      this.startTaxCollectorQuest(giverRoomId);
    } else if (quest.id === 'find-my-baby') {
      this.startFindMyBabyQuest(giverRoomId);
    } else if (quest.id === 'goblin-ledger-debt') {
      this.startGoblinLedgerDebtQuest(giverRoomId);
    } else if (quest.id === 'freak-you') {
      this.startFreakYouQuest(giverRoomId);
    } else if (quest.id === 'green-purchase') {
      this.startGreenPurchaseQuest(giverRoomId);
    }
  }

  getQuestMapMarkers(): QuestMapMarker[] {
    const markers = this.collectQuestMapMarkers();
    const activeQuestId = this.getActiveQuestMarkerQuestId();
    if (!activeQuestId) {
      return markers;
    }
    const filtered = markers.filter((marker) => marker.questId === activeQuestId);
    return filtered.length > 0 ? filtered : markers;
  }

  private collectQuestMapMarkers(): QuestMapMarker[] {
    const markers: QuestMapMarker[] = [];
    for (const instance of this.getStagedQuestInstances()) {
      if (instance.stage === 'failed' || instance.stage === 'completed') {
        continue;
      }
      if (instance.questId === 'tax-collector-future-body') {
        if (instance.stage === 'return-to-giver') {
          markers.push({
            questId: instance.questId,
            roomId: instance.giverRoomId,
            kind: 'turn-in',
            label: 'Tax Collector',
            color: 0x5dd6a2,
          });
        } else {
          for (const office of instance.offices ?? []) {
            if (!office.paid) {
              markers.push({
                questId: instance.questId,
                roomId: office.roomId,
                kind: 'office',
                label: office.id.replace('office-', 'Tax '),
                color: 0xffd166,
              });
            }
          }
        }
      } else if (instance.questId === 'find-my-baby') {
        const carrying = instance.stage === 'carry-baby' || instance.carriedItemId === 'quest-baby';
        markers.push({
          questId: instance.questId,
          roomId: carrying ? instance.giverRoomId : (instance.targetRoomId ?? instance.giverRoomId),
          kind: carrying ? 'turn-in' : 'target',
          label: carrying ? 'Parent' : 'Baby',
          color: carrying ? 0x5dd6a2 : 0x9ad1ff,
        });
      } else if (instance.questId === 'deep-lying-bouquet') {
        const carrying =
          instance.stage === 'carry-bouquet' || instance.carriedItemId === 'deep-lying-bouquet';
        markers.push({
          questId: instance.questId,
          roomId: carrying ? instance.giverRoomId : (instance.targetRoomId ?? instance.giverRoomId),
          kind: carrying ? 'turn-in' : 'target',
          label: carrying ? 'Wedding' : 'Bouquet',
          color: carrying ? 0xffbdfd : 0xaec4ff,
        });
      } else if (instance.questId === 'goblin-ledger-debt') {
        const carrying =
          instance.stage === 'carry-goblin-stamp' ||
          instance.carriedItemId === 'goblin-ledger-stamp';
        markers.push({
          questId: instance.questId,
          roomId: carrying ? instance.giverRoomId : (instance.targetRoomId ?? instance.giverRoomId),
          kind: carrying ? 'turn-in' : 'target',
          label: carrying ? 'Goblin Clerk' : 'Ledger Stamp',
          color: carrying ? 0xb6ff6a : 0xffd166,
        });
      } else if (instance.questId === 'freak-you') {
        const bossRoomId = instance.bossId ? this.bosses.getBossHeadRoomId(instance.bossId) : null;
        markers.push({
          questId: instance.questId,
          roomId:
            instance.stage === 'return-to-giver'
              ? instance.giverRoomId
              : (bossRoomId ?? instance.targetRoomId ?? instance.giverRoomId),
          kind: instance.stage === 'return-to-giver' ? 'turn-in' : 'danger',
          label: instance.stage === 'return-to-giver' ? 'Time Traveler' : 'Freak You',
          color: instance.stage === 'return-to-giver' ? 0x5dd6a2 : 0xff3b3b,
        });
      } else if (instance.questId === 'green-purchase') {
        const roomId =
          instance.stage === 'buy-substance'
            ? this.snake.currentRoomId === instance.deepRoomId ||
              this.snake.currentRoomId === instance.merchantRoomId
              ? (instance.merchantRoomId ?? instance.deepRoomId)
              : instance.targetRoomId
            : instance.stage === 'return-to-giver'
              ? instance.giverRoomId
              : instance.stage === 'escape-radiation' &&
                  instance.carriedItemId === 'radioactive-substance'
                ? this.snake.currentRoomId === instance.deepRoomId
                  ? instance.deepRoomId
                  : instance.giverRoomId
                : instance.targetRoomId;
        if (roomId) {
          const buying = instance.stage === 'buy-substance';
          const escaping =
            instance.stage === 'escape-radiation' || instance.stage === 'return-to-giver';
          markers.push({
            questId: instance.questId,
            roomId,
            kind: escaping ? 'danger' : 'target',
            label: buying ? 'Merchant' : escaping ? 'Return' : 'Teleporter',
            color: buying ? 0xffd166 : escaping ? 0x7cff3a : 0x51ff8a,
          });
        }
      } else if (instance.questId === 'starforged-heliopause') {
        markers.push({
          questId: instance.questId,
          roomId: instance.targetRoomId ?? instance.giverRoomId,
          kind: 'target',
          label: 'Heliopause Artifact',
          color: 0x9df7ff,
        });
      }
    }
    return markers;
  }

  getQuestSubtasks(questId: string): string[] {
    const instance = this.getStagedQuestInstances().find((quest) => quest.questId === questId);
    if (!instance) {
      return [];
    }
    if (instance.stage === 'failed') {
      return [`[!] Failed: ${instance.failureReason ?? 'quest failed'}`];
    }
    if (instance.stage === 'completed') {
      return ['[x] Completed'];
    }
    if (questId === 'tax-collector-future-body') {
      const offices = instance.offices ?? [];
      const officeLines = offices.map((office, index) => {
        const status = office.paid ? '[x]' : '[ ]';
        const method = office.method ? ` (${office.method})` : '';
        return `${status} Tax office ${index + 1}${method}`;
      });
      if (instance.stage === 'return-to-giver') {
        return [...officeLines, '[ ] Return to the original tax collector'];
      }
      return [...officeLines, '[ ] Bring all receipts back to the collector'];
    }
    if (questId === 'find-my-baby') {
      return [
        `${instance.stage === 'find-baby' ? '[ ]' : '[x]'} Find the missing baby`,
        `${instance.stage === 'return-to-giver' ? '[ ]' : instance.stage === 'find-baby' ? '[ ]' : '[x]'} Return the baby to the original NPC`,
      ];
    }
    if (questId === 'deep-lying-bouquet') {
      return [
        `${instance.stage === 'find-bouquet' ? '[ ]' : '[x]'} Find the Deep-Lying Bouquet in a cold room`,
        `${instance.stage === 'return-to-giver' ? '[ ]' : instance.stage === 'find-bouquet' ? '[ ]' : '[x]'} Bring it back to complete the wedding`,
      ];
    }
    if (questId === 'goblin-ledger-debt') {
      return [
        `${instance.stage === 'find-goblin-stamp' ? '[ ]' : '[x]'} Find the missing ledger-stamp`,
        `${instance.stage === 'return-to-giver' ? '[ ]' : instance.stage === 'find-goblin-stamp' ? '[ ]' : '[x]'} Bring the stamp back to the goblin clerk`,
      ];
    }
    if (questId === 'freak-you') {
      return [
        `${instance.stage === 'survive-freak-you' ? '[ ]' : '[x]'} Make Freak You run into your body`,
        `${instance.stage === 'return-to-giver' ? '[ ]' : '[ ]'} Return to the time traveler`,
      ];
    }
    if (questId === 'green-purchase') {
      const hasReturnedFromDeep =
        instance.stage === 'escape-radiation' &&
        instance.carriedItemId === 'radioactive-substance' &&
        this.snake.currentRoomId !== instance.deepRoomId;
      return [
        `${instance.stage === 'find-forest-teleporter' ? '[ ]' : '[x]'} Find the forest teleporter`,
        `${instance.stage === 'buy-substance' ? '[ ]' : instance.stage === 'find-forest-teleporter' ? '[ ]' : '[x]'} Reach the deep merchant and buy the substance`,
        `${hasReturnedFromDeep || instance.stage === 'return-to-giver' ? '[x]' : '[ ]'} Use the deep teleporter to return to the forest`,
        '[ ] Return to the original buyer before the timer expires',
      ];
    }
    if (questId === 'starforged-heliopause') {
      return [
        `${instance.stage === 'find-heliopause-artifact' ? '[ ]' : '[x]'} Find the marked Heliopause Artifact`,
      ];
    }
    return [];
  }

  isCarryingQuestBaby(): boolean {
    return this.getStagedQuestInstances().some(
      (instance) =>
        instance.questId === 'find-my-baby' &&
        instance.stage !== 'failed' &&
        instance.stage !== 'completed' &&
        instance.carriedItemId === 'quest-baby',
    );
  }

  getQuestRoomActors(roomId: string = this.snake.currentRoomId): QuestRoomActor[] {
    const actors: QuestRoomActor[] = [];
    for (const instance of this.getStagedQuestInstances()) {
      if (instance.stage === 'failed' || instance.stage === 'completed') {
        continue;
      }
      if (instance.questId === 'tax-collector-future-body') {
        for (const office of instance.offices ?? []) {
          if (!office.paid && office.roomId === roomId) {
            actors.push({
              id: office.id,
              questId: instance.questId,
              roomId,
              x: Math.floor(this.config.grid.cols / 2),
              y: Math.floor(this.config.grid.rows / 2),
              kind: 'tax-office',
              label: 'TAX',
            });
          }
        }
      } else if (instance.questId === 'find-my-baby') {
        if (instance.targetRoomId === roomId && instance.stage === 'find-baby') {
          const babyPosition = this.getQuestBabyActorPosition();
          actors.push({
            id: 'quest-baby',
            questId: instance.questId,
            roomId,
            x: babyPosition.x,
            y: babyPosition.y,
            kind: 'quest-baby',
            label: 'BABY',
          });
        }
      } else if (instance.questId === 'deep-lying-bouquet') {
        if (instance.targetRoomId === roomId && instance.stage === 'find-bouquet') {
          const bouquetPosition = this.getDeepLyingBouquetActorPosition();
          actors.push({
            id: 'deep-lying-bouquet',
            questId: instance.questId,
            roomId,
            x: bouquetPosition.x,
            y: bouquetPosition.y,
            kind: 'deep-lying-bouquet',
            label: 'LOVE',
          });
        }
      } else if (instance.questId === 'goblin-ledger-debt') {
        if (instance.targetRoomId === roomId && instance.stage === 'find-goblin-stamp') {
          const stampPosition = this.getGoblinLedgerStampActorPosition();
          actors.push({
            id: 'goblin-ledger-stamp',
            questId: instance.questId,
            roomId,
            x: stampPosition.x,
            y: stampPosition.y,
            kind: 'goblin-ledger-stamp',
            label: 'STAMP',
          });
        }
      } else if (instance.questId === 'green-purchase') {
        if (
          instance.targetRoomId === roomId &&
          (instance.stage === 'find-forest-teleporter' || instance.stage === 'escape-radiation')
        ) {
          actors.push({
            id: 'forest-teleporter',
            questId: instance.questId,
            roomId,
            x: Math.floor(this.config.grid.cols / 2),
            y: Math.floor(this.config.grid.rows / 2),
            kind: 'forest-teleporter',
            label: '???',
          });
        }
        if (instance.merchantRoomId === roomId && instance.stage === 'buy-substance') {
          actors.push({
            id: 'deep-merchant',
            questId: instance.questId,
            roomId,
            x: Math.floor(this.config.grid.cols / 2) + 2,
            y: Math.floor(this.config.grid.rows / 2),
            kind: 'deep-merchant',
            label: 'BUY',
          });
        }
        if (instance.deepRoomId === roomId && instance.stage === 'escape-radiation') {
          actors.push({
            id: 'deep-teleporter',
            questId: instance.questId,
            roomId,
            x: Math.floor(this.config.grid.cols / 2),
            y: Math.floor(this.config.grid.rows / 2),
            kind: 'deep-teleporter',
            label: 'UP',
          });
        }
        if (instance.deepRoomId === roomId && instance.stage === 'buy-substance') {
          actors.push({
            id: 'deep-teleporter',
            questId: instance.questId,
            roomId,
            x: Math.floor(this.config.grid.cols / 2),
            y: Math.floor(this.config.grid.rows / 2),
            kind: 'deep-teleporter',
            label: 'UP',
          });
        }
      } else if (instance.questId === 'starforged-heliopause') {
        if (instance.targetRoomId === roomId && instance.stage === 'find-heliopause-artifact') {
          const artifactPosition = this.getHeliopauseArtifactActorPosition();
          actors.push({
            id: 'heliopause-artifact',
            questId: instance.questId,
            roomId,
            x: artifactPosition.x,
            y: artifactPosition.y,
            kind: 'heliopause-artifact',
            label: '???',
          });
        }
      }
    }
    if (this.shouldShowStarforgedEnvoy(roomId)) {
      const envoyPosition = this.getStarforgedEnvoyActorPosition(roomId);
      actors.push({
        id: 'starforged-envoy',
        questId: 'starforged-heliopause',
        roomId,
        x: envoyPosition.x,
        y: envoyPosition.y,
        kind: 'starforged-envoy',
        label: 'ENV',
      });
    }
    return actors;
  }

  getNearbyQuestInteraction(): QuestInteraction | null {
    const actor = this.getNearbyQuestActor();
    if (!actor) {
      return null;
    }
    if (actor.kind === 'tax-office') {
      const canPayLength = this.getSnakeLength() > 3;
      return {
        kind: 'choice',
        title: 'Future Body Tax Office',
        options: [
          {
            id: `tax:${actor.id}:score`,
            title: 'Pay 25 score',
            description: 'Settle the assessment with ordinary numbers.',
          },
          {
            id: `tax:${actor.id}:length`,
            title: 'Surrender 2 length',
            description: canPayLength
              ? 'Place your future on the counter.'
              : 'You are too short to survive this filing.',
          },
          {
            id: `tax:${actor.id}:duel`,
            title: 'Duel the clerk',
            description: 'Argue in the ugly language of teeth and procedure.',
          },
        ],
      };
    }
    if (actor.kind === 'quest-baby') {
      return {
        kind: 'dialogue',
        title: 'The Baby',
        pages: [
          'Before hunger, I was a hallway.',
          'I have no teeth, yet the world keeps putting names in my mouth.',
          'Carry me, long animal. I am tired of being a prophecy with soft bones.',
        ],
        closeLabel: 'Pick up',
      };
    }
    if (actor.kind === 'deep-lying-bouquet') {
      return {
        kind: 'dialogue',
        title: 'Deep-Lying Bouquet',
        pages: [
          'The flowers are buried under a rind of frost, blooming like they are hiding from every season.',
          'They smell like old vows, cold tile, and one very specific wedding disaster waiting to become beautiful.',
        ],
        closeLabel: 'Take bouquet',
      };
    }
    if (actor.kind === 'goblin-ledger-stamp') {
      return {
        kind: 'dialogue',
        title: 'Ledger-Stamp',
        pages: [
          'The stamp sits in a ring of scraped stone, fat with old ink and small bite marks.',
          'It smells like copper, mildew, and a goblin saying "mine" too many times.',
          'When you touch it, the room makes a tiny official noise and then pretends it did not.',
        ],
        closeLabel: 'Take stamp',
      };
    }
    if (actor.kind === 'forest-teleporter') {
      const instance = this.getStagedQuestInstances().find(
        (quest) => quest.questId === actor.questId,
      );
      if (instance?.stage === 'escape-radiation') {
        return {
          kind: 'dialogue',
          title: 'Forest Teleporter',
          pages: [
            'The circle spits you back into the forest. The green thing is still counting down inside your grip.',
          ],
          closeLabel: 'Stagger out',
        };
      }
      return {
        kind: 'dialogue',
        title: 'Forest Teleporter',
        pages: [
          'The moss bends away from the circle.',
          'The clearing hums downward, toward a merchant beneath the ordinary bottom of the world.',
        ],
        closeLabel: 'Step in',
      };
    }
    if (actor.kind === 'deep-merchant') {
      return {
        kind: 'choice',
        title: 'Deep Merchant',
        options: [
          {
            id: 'green:buy',
            title: 'Buy substance - 50 score',
            description: 'No refunds. Refunds imply survival.',
          },
          {
            id: 'green:leave',
            title: 'Leave',
            description: 'Keep your money and your current number of bones.',
          },
        ],
      };
    }
    if (actor.kind === 'deep-teleporter') {
      return {
        kind: 'dialogue',
        title: 'Deep Teleporter',
        pages: ['The pad remembers the forest above you. It opens like a green wound.'],
        closeLabel: 'Return',
      };
    }
    if (actor.kind === 'starforged-envoy') {
      if (this.getFlag<boolean>('starforged.active')) {
        return {
          kind: 'dialogue',
          title: 'The Armored Stranger',
          pages: [
            'The figure in impossible armor lifts one hand. Their visor reflects a battlefield made of stars.',
            'Now that the artifact has chosen you, their little war-table unfolds without touching the floor.',
          ],
          closeLabel: 'Open services',
        };
      }
      return {
        kind: 'choice',
        title: 'The Armored Stranger',
        options: [
          {
            id: 'starforged:accept',
            title: 'Take the signal job',
            description: 'They mark a distant artifact on your quest map.',
          },
          {
            id: 'starforged:leave',
            title: 'Walk away',
            description: 'The stranger waits, helmet still pointed at tomorrow.',
          },
        ],
      };
    }
    if (actor.kind === 'heliopause-artifact') {
      return {
        kind: 'dialogue',
        title: 'Heliopause Artifact',
        pages: [
          'The object rests in the room like a dead star pretending to be furniture.',
          'It has no buttons, no inscription, and no respect for your current save file.',
        ],
        closeLabel: 'Touch artifact',
      };
    }
    return null;
  }

  getNearbyQuestActorHint(): string | null {
    const actor = this.getNearbyQuestActor();
    if (!actor) {
      return null;
    }
    switch (actor.kind) {
      case 'tax-office':
        return 'Settle future-body tax (press E)';
      case 'quest-baby':
        return 'Listen to the baby (press E)';
      case 'deep-lying-bouquet':
        return 'Take the Deep-Lying Bouquet (press E)';
      case 'goblin-ledger-stamp':
        return 'Pick up ledger-stamp (press E)';
      case 'deep-merchant':
        return 'Buy radioactive substance (press E)';
      case 'forest-teleporter':
      case 'deep-teleporter':
        return 'Teleporter pad activates when you slither onto it';
      case 'starforged-envoy':
        return this.getFlag<boolean>('starforged.active')
          ? 'Speak with the armored stranger (press E)'
          : 'Speak with the armored stranger (press E)';
      case 'heliopause-artifact':
        return 'Inspect the strange artifact (press E)';
    }
  }

  resolveQuestInteraction(actionId?: string): {
    completed?: Quest | null;
    failed?: boolean;
    message?: string;
  } {
    const actor = this.getNearbyQuestActor();
    if (!actor && !actionId?.startsWith('green:')) {
      return {};
    }
    if (actor?.kind === 'tax-office' && actionId?.startsWith('tax:')) {
      const [, officeId, method] = actionId.split(':');
      return this.resolveTaxOffice(officeId, method as 'score' | 'length' | 'duel');
    }
    if (actor?.kind === 'quest-baby') {
      return this.pickUpQuestBaby(actor.questId);
    }
    if (actor?.kind === 'deep-lying-bouquet') {
      return this.pickUpDeepLyingBouquet(actor.questId);
    }
    if (actor?.kind === 'goblin-ledger-stamp') {
      return this.pickUpGoblinLedgerStamp(actor.questId);
    }
    if (actor?.kind === 'forest-teleporter') {
      return this.useGreenTeleporter(actor.questId);
    }
    if (actor?.kind === 'deep-merchant' && actionId === 'green:buy') {
      return this.buyRadioactiveSubstance();
    }
    if (actor?.kind === 'deep-teleporter') {
      return this.useGreenTeleporter(actor.questId);
    }
    if (actor?.kind === 'starforged-envoy') {
      if (this.getFlag<boolean>('starforged.active')) {
        this.setFlag('starforged.openVendorRequested', { at: this.getFlag<number>('timeMs') ?? 0 });
        return { message: 'The stranger opens a star-map inside the tavern shadow.' };
      }
      if (actionId === 'starforged:leave') {
        return { message: 'The armored stranger waits without moving.' };
      }
      if (actionId === 'starforged:accept') {
        return this.startStarforgedHeliopauseQuest(actor.roomId);
      }
    }
    if (actor?.kind === 'heliopause-artifact') {
      return this.touchHeliopauseArtifact(actor.questId);
    }
    return {};
  }

  getRadiationTimer(): { remainingMs: number; totalMs: number } | null {
    const instance = this.getStagedQuestInstances().find(
      (quest) =>
        quest.questId === 'green-purchase' &&
        quest.stage === 'escape-radiation' &&
        quest.carriedItemId === 'radioactive-substance',
    );
    if (!instance || typeof instance.remainingRadiationMs !== 'number') {
      return null;
    }
    return {
      remainingMs: Math.max(0, instance.remainingRadiationMs),
      totalMs: Math.max(1, Number(instance.totalRadiationMs ?? 120000)),
    };
  }

  getBosses(roomId: string) {
    const bosses = this.bosses.getBossesInRoom(roomId);
    const duelBoss = this.enemies.getDuelBossInRoom(roomId);
    return duelBoss ? [...bosses, duelBoss] : bosses;
  }

  spawnInsultedAngelBoss(): void {
    this.bosses.spawnBoss(
      this.snake.currentRoomId,
      'fallen-angel',
      this.world.getRoom(this.snake.currentRoomId),
    );
    this.setFlag('boss.insultedAngel', true);
  }

  getEnemies(roomId: string) {
    return this.enemies.getEnemiesInRoom(roomId);
  }

  getAnimals(roomId: string) {
    return this.animals.getAnimalsInRoom(roomId);
  }

  getAnimalCompanions(): AnimalCompanionView[] {
    return this.getAnimalCompanionState().map(toAnimalCompanionView);
  }

  attemptTameAnimal(animalId: string): {
    ok: boolean;
    message: string;
    companion?: AnimalCompanionView;
  } {
    const roomId = this.snake.currentRoomId;
    const animal = this.animals.getAnimalsInRoom(roomId).find((entry) => entry.id === animalId);
    if (!animal) return { ok: false, message: 'The animal has already moved on.' };

    const definition = AnimalRegistry.getDefinition(animal.type);
    const tameInfo = getTameInfo(animal.type);
    if (!tameInfo) return { ok: false, message: `${definition.name} cannot be tamed.` };

    const companions = this.getAnimalCompanionState();
    if (companions.some((entry) => entry.id === animal.id)) {
      return { ok: false, message: `${definition.name} is already following you.` };
    }
    const companionCapacity = Math.max(
      0,
      Math.floor(
        Number(this.getFlag<number>('derived.companionCapacity') ?? getHerdConfig().maxMembers),
      ),
    );
    if (companions.length >= companionCapacity) {
      return { ok: false, message: 'Your companion herd is full.' };
    }
    if (this.getScore() < tameInfo.tameScore) {
      return {
        ok: false,
        message: `${definition.name} requires ${tameInfo.tameScore} score worth of confidence.`,
      };
    }
    if (this.inventory.getItemCount(tameInfo.requiredItem) <= 0) {
      return {
        ok: false,
        message: `You need ${getItem(tameInfo.requiredItem)?.name ?? tameInfo.requiredItem}.`,
      };
    }

    const result = this.animals.tameAnimal(roomId, animal.id, 'player');
    if (!result.success) return { ok: false, message: `${definition.name} refuses the attempt.` };

    this.inventory.removeItem(tameInfo.requiredItem, 1);
    const companion: AnimalCompanion = {
      id: animal.id,
      type: animal.type,
      name: definition.name,
      bond: 1,
      timesFed: 0,
      joinedAtRoom: this.getRoomsVisitedCount(),
    };
    this.setAnimalCompanionState([...companions, companion]);
    this.emitWorldEvent({
      type: 'animal-tamed',
      roomId,
      severity: 12,
      loudness: 8,
      tags: ['animal', 'taming', animal.type],
      summary: `${definition.name} joined the snake's herd.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { animalId: animal.id, animalType: animal.type },
    });
    return {
      ok: true,
      message: `${definition.name} joined your herd.`,
      companion: toAnimalCompanionView(companion),
    };
  }

  feedAnimalCompanionById(companionId: string): {
    ok: boolean;
    message: string;
    milestone: boolean;
    companion?: AnimalCompanionView;
  } {
    const foodOptions = [
      { itemId: 'cooked-meat', bond: 3 },
      { itemId: 'cooked-fish', bond: 3 },
      { itemId: 'raw-meat', bond: 1 },
      { itemId: 'fish-meat', bond: 1 },
    ];
    const food = foodOptions.find((entry) => this.inventory.getItemCount(entry.itemId) > 0);
    if (!food) {
      return {
        ok: false,
        message: 'You need raw or cooked meat or fish to feed the herd.',
        milestone: false,
      };
    }

    const result = feedAnimalCompanion(this.getAnimalCompanionState(), companionId, food.bond);
    if (!result.companion) {
      return {
        ok: false,
        message: 'That companion is no longer in the herd.',
        milestone: false,
      };
    }

    this.inventory.removeItem(food.itemId, 1);
    this.setAnimalCompanionState(result.companions);
    const milestone = crossedCompanionBondMilestone(result.previousBond, result.companion.bond);
    if (milestone) this.addScore(5);
    return {
      ok: true,
      message: milestone
        ? `${result.companion.name} reached a new bond tier. +5 score.`
        : `${result.companion.name} was fed. Bond ${result.companion.bond}.`,
      milestone,
      companion: toAnimalCompanionView(result.companion),
    };
  }

  releaseAnimalCompanion(companionId: string): { ok: boolean; message: string } {
    const companions = this.getAnimalCompanionState();
    const companion = companions.find((entry) => entry.id === companionId);
    if (!companion) return { ok: false, message: 'That companion is no longer in the herd.' };
    this.setAnimalCompanionState(companions.filter((entry) => entry.id !== companionId));
    this.animals.releaseTamedAnimal(this.snake.currentRoomId, companionId);
    return { ok: true, message: `${companion.name} returned to the wild.` };
  }

  private getAnimalCompanionState(): AnimalCompanion[] {
    return normalizeAnimalCompanions(this.getFlag('animals.companions'));
  }

  private setAnimalCompanionState(companions: readonly AnimalCompanion[]): void {
    this.setFlag(
      'animals.companions',
      companions.map((companion) => ({ ...companion })),
    );
  }

  getEnemyBullets(roomId: string) {
    return this.enemies.getBulletsInRoom(roomId);
  }

  getFootballs(roomId: string): readonly FootballInstance[] {
    return this.footballs.get(roomId) ?? [];
  }

  spawnFootball(
    roomId: string,
    origin: Vector2Like,
    direction: Vector2Like,
    options: Partial<Pick<FootballInstance, 'state' | 'target' | 'maxAge'>> = {},
  ): FootballInstance | null {
    const spawn = {
      x: origin.x + direction.x,
      y: origin.y + direction.y,
    };
    const room = this.world.getRoom(roomId);
    if (!this.isCatchableFootballTile(room, spawn)) {
      return null;
    }
    const football: FootballInstance = {
      id: `football-${this.footballIdCounter++}`,
      roomId,
      position: spawn,
      direction,
      age: 0,
      maxAge: options.maxAge ?? 9,
      state: options.state ?? 'flying',
      target: options.target,
    };
    const footballs = this.footballs.get(roomId) ?? [];
    footballs.push(football);
    this.footballs.set(roomId, footballs);
    this.setFlag('ui.footballPass', {
      roomId,
      from: origin,
      to: spawn,
    });
    return football;
  }

  catchFootball(roomId: string, localPosition: Vector2Like): boolean {
    const footballs = this.footballs.get(roomId) ?? [];
    const target = footballs.find(
      (football) =>
        football.position.x === localPosition.x && football.position.y === localPosition.y,
    );
    if (!target) {
      return false;
    }
    this.footballs.set(
      roomId,
      footballs.filter((football) => football.id !== target.id),
    );
    this.completeFootballCatch(roomId, localPosition);
    return true;
  }

  private completeFootballCatch(roomId: string, localPosition: Vector2Like): number {
    const caffeine = Number(this.getFlag<number>('liberty.caffeineCatches') ?? 0);
    const bonusScore = caffeine > 0 ? 30 : 15;
    this.addScore(bonusScore);
    this.setFlag('liberty.caffeineCatches', caffeine > 0 ? caffeine - 1 : undefined);
    this.setFlag('ui.footballCatch', {
      roomId,
      x: localPosition.x,
      y: localPosition.y,
      score: bonusScore,
    });
    return bonusScore;
  }

  getPlayerHealth(): { current: number; max: number } {
    return {
      current: Number(this.getFlag<number>('player.health') ?? 3),
      max: Number(this.getFlag<number>('player.maxHealth') ?? 3),
    };
  }

  getPlayerTemperature(): {
    current: number;
    max: number;
    hazard: 'hot' | 'cold' | null;
    active: boolean;
  } {
    if (this.getFlag<boolean>('cheat.immortal')) {
      return {
        current: 0,
        max: 10,
        hazard: null,
        active: false,
      };
    }
    const currentRoom = this.getCurrentRoom();
    const biome = getBiomeDefinition(currentRoom.biomeId);
    const hazard = biome.temperatureHazard;
    const thresholdMs = Math.max(
      1,
      Number(this.getFlag<number>('player.temperatureThresholdMs') ?? 10000),
    );
    const exposureMs = Math.max(
      0,
      Number(
        hazard === 'hot'
          ? (this.getFlag<number>('player.temperatureHotExposureMs') ??
              this.getFlag<number>('player.temperatureExposureMs') ??
              0)
          : hazard === 'cold'
            ? (this.getFlag<number>('player.temperatureColdExposureMs') ??
              this.getFlag<number>('player.temperatureExposureMs') ??
              0)
            : 0,
      ),
    );
    const max = 10;
    const current = Math.max(0, Math.min(max, Math.ceil((exposureMs / thresholdMs) * max)));
    return {
      current,
      max,
      hazard,
      active: hazard !== null,
    };
  }

  resolveRandomEncounter(accept: boolean): {
    kind: 'quest' | 'duel' | 'flavor' | 'none';
    accepted: boolean;
    startCardGame?: boolean;
    rewardCardName?: string;
  } {
    const encounter = this.getFlag<WandererEncounter & { roomId: string; statsNote: string }>(
      'npc.randomEncounter',
    );
    if (!encounter) {
      return { kind: 'none', accepted: false };
    }
    this.setFlag('npc.randomEncounter', undefined);
    this.setFlag('npc.randomEncounter.prompted', undefined);
    this.setFlag('npc.randomEncounter.triggerAtMs', undefined);
    this.setFlag('npc.randomEncounter.revealAtMs', undefined);
    const relationshipId = (encounter as any).relationshipId as string | undefined;
    if (relationshipId) {
      const rel = this.relationshipController.recordEncounterOutcome(
        relationshipId,
        accept,
        this.getRoomsVisitedCount(),
      );
      if (accept && (encounter as any).rewardScore) {
        this.addScore(Number((encounter as any).rewardScore));
      }
      this.setFlag('ui.relationshipEvent', {
        title: rel.title,
        message: rel.message,
        color: rel.color,
      });
      return { kind: 'flavor', accepted: accept };
    }
    this.recordWandererOutcome(encounter.id, accept);
    if (!accept) {
      if (encounter.oneShot) {
        this.resolvedWandererEncounters.add(encounter.id);
      }
      return { kind: encounter.kind, accepted: false };
    }

    if (encounter.kind === 'duel') {
      const started = this.startNamedDuel(encounter.id, encounter.name, encounter.rewardScore);
      if (started) {
        if (encounter.oneShot) {
          this.resolvedWandererEncounters.add(encounter.id);
        }
        return { kind: 'duel', accepted: true };
      }
      return { kind: 'duel', accepted: false };
    }

    if (encounter.kind === 'quest' && encounter.questId) {
      const quest = this.questController.offerSpecificQuestById(
        encounter.questId,
        this,
        encounter.roomId,
      );
      if (quest) {
        if (this.requiresQuestGiver(quest.id)) {
          this.ensureEncounterQuestGiver(encounter);
        }
        if (encounter.oneShot) {
          this.resolvedWandererEncounters.add(encounter.id);
        }
        return { kind: 'quest', accepted: true };
      }
      if (encounter.rewardScore) {
        this.addScore(encounter.rewardScore);
      }
      return { kind: 'quest', accepted: false };
    }

    let rewardCardName: string | undefined;
    if (encounter.rewardCardId) {
      const cardId =
        encounter.rewardCardId === 'random' ? this.pickRandomCardId() : encounter.rewardCardId;
      const card = getCardDefinition(cardId);
      this.addCardToCollection(cardId, 1);
      rewardCardName = card.name;
    }
    if (encounter.rewardScore) {
      this.addScore(encounter.rewardScore);
    }
    if (encounter.oneShot) {
      this.resolvedWandererEncounters.add(encounter.id);
    }
    return {
      kind: encounter.kind,
      accepted: true,
      startCardGame: encounter.startsCardGame,
      rewardCardName,
    };
  }

  startFreakJoeyDuel(): boolean {
    if (this.getFlag<boolean>('npc.freakJoey.defeated')) {
      return false;
    }
    return this.startNamedDuel('freak-joey', 'Freak Joey', 25, 15);
  }

  private ensureEncounterQuestGiver(
    encounter: WandererEncounter & { roomId: string; x?: number; y?: number },
  ): void {
    const room = this.world.getRoom(encounter.roomId);
    if (room.questGiver) {
      return;
    }
    const spawn =
      typeof encounter.x === 'number' && typeof encounter.y === 'number'
        ? { x: encounter.x, y: encounter.y }
        : (this.findEncounterSpawn(encounter.roomId) ?? {
            x: Math.floor(this.config.grid.cols / 2),
            y: Math.floor(this.config.grid.rows / 2),
          });
    const profile = buildHouseNpcProfile(encounter.name, encounter.portraitId ?? 'sage-1');
    room.questGiver = {
      ...profile,
      id: `npc-${encounter.id}`,
      x: spawn.x,
      y: spawn.y,
    };
    const layout = room.layout.map((row) => row.split(''));
    if (layout[spawn.y]?.[spawn.x]) {
      layout[spawn.y][spawn.x] = '.';
      room.layout = layout.map((row) => row.join(''));
    }
  }

  startNamedDuel(
    encounterId: string,
    name: string,
    rewardScore?: number,
    hearts?: number,
  ): boolean {
    const room = this.world.getRoom(this.snake.currentRoomId);
    const [roomX, roomY] = this.snake.currentRoomId.split(',').map(Number);
    const occupied = this.snake.bodySegments.map((segment) => ({
      x: segment.x - roomX * this.config.grid.cols,
      y: segment.y - roomY * this.config.grid.rows,
    }));
    const maxHearts =
      hearts ??
      Math.max(
        8,
        Math.ceil((this.getFlag<number>('roomsVisited') ?? this.visitedRooms.size) * 1.5),
      );
    const duelist = this.enemies.spawnDuelist(this.snake.currentRoomId, room, occupied, {
      id: encounterId,
      name,
      hearts: maxHearts,
    });
    if (!duelist) {
      return false;
    }
    if (encounterId === 'freak-joey') {
      this.setFlag('npc.freakJoey.active', true);
    }
    this.setFlag('npc.activeDuel', { id: encounterId, rewardScore });
    return true;
  }

  spawnDuelistForTest(
    roomId: string,
    position: Vector2Like,
    options: { hearts?: number; id?: string; name?: string } = {},
  ): EnemyInstance {
    const room = this.world.getRoom(roomId);
    const duelist = this.enemies.spawnDuelist(roomId, room, [], {
      id: options.id ?? `test-duelist-${Date.now()}`,
      name: options.name ?? 'Test Duelist',
      hearts: Math.max(1, options.hearts ?? 1),
    });
    if (!duelist) {
      throw new Error(`Unable to spawn test duelist in ${roomId}`);
    }
    const placed = { ...duelist, position: { ...position } };
    this.enemies.updateEnemy(placed);
    return placed;
  }

  firePlayerShot(direction: Vector2Like): boolean {
    const active = this.powerupState;
    const hasGunEquipped = Boolean(this.getFlag<boolean>('equipment.gunEnabled'));
    const hasLegacyGunPowerup = Boolean(active && active.kind === 'gun' && active.remaining > 0);
    const footballCharges = Number(this.getFlag<number>('equipment.libertyFootballCharges') ?? 0);
    const hasFootball = footballCharges > 0;
    if (!hasGunEquipped && !hasLegacyGunPowerup && !hasFootball) {
      return false;
    }
    const head = this.snake.bodySegments[0];
    if (!head) {
      return false;
    }
    const [roomX, roomY] = this.snake.currentRoomId.split(',').map(Number);
    const localHead = {
      x: head.x - roomX * this.config.grid.cols,
      y: head.y - roomY * this.config.grid.rows,
    };
    const room = this.world.getRoom(this.snake.currentRoomId);
    if (hasFootball && !hasGunEquipped && !hasLegacyGunPowerup) {
      const football = this.spawnFootball(this.snake.currentRoomId, localHead, direction);
      if (!football) {
        return false;
      }
      this.setFlag('equipment.libertyFootballCharges', Math.max(0, footballCharges - 1));
      this.setFlag('ui.playerShot', {
        x: head.x,
        y: head.y,
        roomId: this.snake.currentRoomId,
        dx: direction.x,
        dy: direction.y,
        style: 'football',
      });
      return true;
    }
    const shotNpc = this.findVisibleNpcInLineOfFire(room, localHead, direction);
    if (shotNpc) {
      this.turnVisibleNpcHostileFromShot(shotNpc.profile, shotNpc.position);
      const fired = this.firePlayerBulletAndHandleDefeats(localHead, direction);
      if (fired) {
        this.setFlag('ui.playerShot', {
          x: head.x,
          y: head.y,
          roomId: this.snake.currentRoomId,
          dx: direction.x,
          dy: direction.y,
          style: 'bullet',
        });
      }
      return fired;
    }
    const giver = room.questGiver;
    if (giver) {
      const profile: RelationshipCandidateProfile = {
        id: `quest:${room.id}:${giver.id}`,
        actorId: this.getQuestGiverActorId(room.id, giver.id),
        displayName: giver.name,
        species: 'human',
        portraitId: giver.portraitId,
        homeRoomId: room.id,
        factionId: 'hearthbound-remnant',
      };
      const position = this.getRelationshipNpcBodyPosition(profile, { x: giver.x, y: giver.y });
      if (this.isNpcInLineOfFire(room, localHead, direction, position)) {
        this.damageVisibleNpcActor(profile, position);
        this.angerNpc(this.snake.currentRoomId, 'shot');
        this.setFlag('ui.playerShot', {
          x: head.x,
          y: head.y,
          roomId: this.snake.currentRoomId,
          dx: direction.x,
          dy: direction.y,
        });
        return true;
      }
    }
    const goblinActors = room.goblinCamp
      ? [room.goblinCamp.shopkeeper, ...room.goblinCamp.guards]
      : [];
    const shotGoblin = goblinActors.find((goblin) =>
      this.isNpcInLineOfFire(room, localHead, direction, { x: goblin.x, y: goblin.y }),
    );
    if (shotGoblin) {
      this.adjustFactionAlignment('goblin-camps', -50);
      this.damageVisibleNpcActor(
        {
          id: `resident:${room.id}:${shotGoblin.id}`,
          actorId: this.getGoblinCampActorId(
            room.goblinCamp!.id,
            shotGoblin.id,
            shotGoblin.id === room.goblinCamp!.shopkeeper.id ? 'shopkeeper' : 'guard',
          ),
          displayName: shotGoblin.name,
          species: 'goblin',
          portraitId: shotGoblin.portraitId ?? 'goblin-neutral',
          homeRoomId: room.id,
          factionId: 'goblin-camps',
        },
        { x: shotGoblin.x, y: shotGoblin.y },
      );
      this.handleGoblinCampEntered(this.snake.currentRoomId, room);
      this.setFlag('ui.playerShot', {
        x: head.x,
        y: head.y,
        roomId: this.snake.currentRoomId,
        dx: direction.x,
        dy: direction.y,
      });
      return true;
    }
    const fired = this.firePlayerBulletAndHandleDefeats(localHead, direction);
    if (fired) {
      if (hasFootball && !hasGunEquipped && !hasLegacyGunPowerup) {
        this.setFlag('equipment.libertyFootballCharges', Math.max(0, footballCharges - 1));
      }
      this.setFlag('ui.playerShot', {
        x: head.x,
        y: head.y,
        roomId: this.snake.currentRoomId,
        dx: direction.x,
        dy: direction.y,
        style: hasFootball && !hasGunEquipped && !hasLegacyGunPowerup ? 'football' : 'bullet',
      });
    }
    return fired;
  }

  private firePlayerBulletAndHandleDefeats(
    localHead: Vector2Like,
    direction: Vector2Like,
  ): boolean {
    const before = this.enemies.getEnemiesInRoom(this.snake.currentRoomId);
    const beforeIds = new Set(before.map((enemy) => enemy.id));
    const fired = this.enemies.firePlayerBullet(this.snake.currentRoomId, localHead, direction);
    if (!fired) {
      return false;
    }
    const afterIds = new Set(
      this.enemies.getEnemiesInRoom(this.snake.currentRoomId).map((enemy) => enemy.id),
    );
    const defeated = before.filter((enemy) => beforeIds.has(enemy.id) && !afterIds.has(enemy.id));
    if (defeated.length > 0) {
      this.handlePlayerBulletDefeats(defeated);
    }
    return true;
  }

  getNpcDisposition(roomId: string): {
    anger: number;
    hostility: 'friendly' | 'warning' | 'hostile';
  } {
    return this.npcDisposition.get(roomId) ?? { anger: 0, hostility: 'friendly' };
  }

  private findVisibleNpcInLineOfFire(
    room: RoomSnapshot,
    localHead: Vector2Like,
    direction: Vector2Like,
  ): { profile: RelationshipCandidateProfile; position: Vector2Like } | null {
    const candidates = this.collectRoomNpcBodyCandidates(room).map((candidate) => ({
      profile: candidate.profile,
      position: this.getRelationshipNpcBodyPosition(candidate.profile, candidate.position),
    }));
    return (
      candidates.find((candidate) =>
        this.isNpcInLineOfFire(room, localHead, direction, candidate.position),
      ) ?? null
    );
  }

  private damageVisibleNpcActor(
    profile: RelationshipCandidateProfile,
    position: Vector2Like,
  ): void {
    const state = this.relationshipController.ensureCandidate(profile, this.getRoomsVisitedCount());
    const actorId = this.ensureRelationshipActorForProfile(profile, state);
    this.actors.registry.update(actorId, (actor) => {
      const max = actor.health?.max ?? 3;
      const current = Math.max(0, (actor.health?.current ?? max) - 1);
      return {
        ...actor,
        health: { current, max, state: current <= 0 ? 'downed' : 'wounded' },
        hostility: current <= 0 ? 'downed' : 'hostile',
        mood: {
          ...actor.mood,
          anger: Math.min(100, actor.mood.anger + 28),
          fear: Math.min(100, actor.mood.fear + 16),
          trust: Math.max(-100, actor.mood.trust - 25),
        },
      };
    });
    const next = this.relationshipController.applyActorInteraction(
      state.id,
      'attack',
      this.getRoomsVisitedCount(),
    );
    const latest = next ?? this.relationshipController.getState(state.id) ?? state;
    this.ensureHostileNpcCombatBody(
      profile.homeRoomId ?? this.snake.currentRoomId,
      latest.id,
      latest.displayName,
      position,
    );
    this.applyCurrentTownCrime('assault', true, 3);
    this.emitWorldEvent({
      type: 'town-crime',
      roomId: this.snake.currentRoomId,
      targetActorIds: [actorId],
      severity: 52,
      loudness: 45,
      tags: ['crime', 'assault', 'shot', 'actorInteraction'],
      summary: `${profile.displayName} was shot.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { relationshipId: state.id },
    });
  }

  private turnVisibleNpcHostileFromShot(
    profile: RelationshipCandidateProfile,
    position: Vector2Like,
  ): void {
    const state = this.relationshipController.ensureCandidate(profile, this.getRoomsVisitedCount());
    const actorId = this.ensureRelationshipActorForProfile(profile, state);
    this.actors.registry.update(actorId, (actor) => ({
      ...actor,
      hostility: 'hostile',
      mood: {
        ...actor.mood,
        anger: Math.min(100, actor.mood.anger + 28),
        fear: Math.min(100, actor.mood.fear + 12),
        trust: Math.max(-100, actor.mood.trust - 20),
      },
    }));
    const next = this.relationshipController.applyActorInteraction(
      state.id,
      'attack',
      this.getRoomsVisitedCount(),
    );
    const latest = next ?? this.relationshipController.getState(state.id) ?? state;
    this.ensureHostileNpcCombatBody(
      profile.homeRoomId ?? this.snake.currentRoomId,
      latest.id,
      latest.displayName,
      position,
    );
    if (profile.factionId === 'goblin-camps') {
      this.adjustFactionAlignment('goblin-camps', -50);
      this.handleGoblinCampEntered(
        this.snake.currentRoomId,
        this.world.getRoom(this.snake.currentRoomId),
      );
    } else {
      this.applyCurrentTownCrime('assault', true, 3);
    }
    this.emitWorldEvent({
      type: 'town-crime',
      roomId: this.snake.currentRoomId,
      targetActorIds: [actorId],
      severity: 52,
      loudness: 45,
      tags: ['crime', 'assault', 'shot', 'actorInteraction'],
      summary: `${profile.displayName} was shot at.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { relationshipId: state.id },
    });
  }

  getFactionAlignment(factionId: FactionId): FactionAlignmentState {
    const saved = this.getFlag<Partial<Record<FactionId, number>>>('factions.alignment') ?? {};
    return normalizeAlignment(saved[factionId] ?? DEFAULT_FACTION_ALIGNMENT[factionId]);
  }

  adjustFactionAlignment(factionId: FactionId, delta: number): FactionAlignmentState {
    const saved = this.getFlag<Partial<Record<FactionId, number>>>('factions.alignment') ?? {};
    const current = saved[factionId] ?? DEFAULT_FACTION_ALIGNMENT[factionId];
    const next = normalizeAlignment(current + delta);
    this.setFlag('factions.alignment', { ...saved, [factionId]: next.value });
    return next;
  }

  getFactionCards(): FactionCardView[] {
    const visitedGoblinCamp = Array.from(this.world.snapshot().values()).some(
      (room) => room.goblinCamp,
    );
    const ids: FactionId[] = ['hearthbound-remnant', 'goblin-camps'];
    return ids.map((id) => {
      const alignment = this.getFactionAlignment(id);
      const discovered = id === 'hearthbound-remnant' || visitedGoblinCamp;
      return {
        id,
        name: getFactionName(id),
        subtitle: getFactionSubtitle(id),
        standing: alignment.standing,
        alignment: alignment.value,
        description: getFactionDescription(id, alignment.standing),
        effects: getFactionEffects(id, alignment.standing),
        discovered,
      };
    });
  }

  getWardContracts(): Partial<Record<WardDeathSource, number>> {
    return { ...(this.getFlag<Partial<Record<WardDeathSource, number>>>('wards.contracts') ?? {}) };
  }

  getWardUsage(): Partial<Record<WardDeathSource, number>> {
    return { ...(this.getFlag<Partial<Record<WardDeathSource, number>>>('wards.usage') ?? {}) };
  }

  getGoblinLedgerQuestStatus(): 'available' | 'active' | 'turn-in' | 'completed' | 'none' {
    if (this.questController.getCompletedIds().includes('goblin-ledger-debt')) {
      return 'completed';
    }
    const instance = this.getStagedQuestInstances().find(
      (quest) => quest.questId === 'goblin-ledger-debt',
    );
    if (instance) {
      return instance.stage === 'return-to-giver' ? 'turn-in' : 'active';
    }
    if (this.questController.getAcceptedIds().includes('goblin-ledger-debt')) {
      return 'active';
    }
    return this.registry.getById('goblin-ledger-debt') ? 'available' : 'none';
  }

  offerGoblinLedgerQuestFromCurrentRoom(): Quest | null {
    const room = this.world.getRoom(this.snake.currentRoomId);
    const giverRoomId = room.id;
    if (!room.goblinCamp) {
      return null;
    }
    return this.questController.offerSpecificQuestById('goblin-ledger-debt', this, giverRoomId);
  }

  turnInGoblinLedgerQuestAtCurrentRoom(): Quest | null {
    const roomId = this.snake.currentRoomId;
    const instance = this.getStagedQuestInstances().find(
      (quest) =>
        quest.questId === 'goblin-ledger-debt' &&
        quest.giverRoomId === roomId &&
        quest.stage === 'return-to-giver',
    );
    if (!instance) {
      return null;
    }
    this.updateStagedQuestInstance(instance.questId, (current) => ({
      ...current,
      stage: 'completed',
      carriedItemId: undefined,
    }));
    return this.questController.completeQuestById(instance.questId, this);
  }

  addWardContract(source: WardDeathSource, count = 1): void {
    const contracts = this.getWardContracts();
    contracts[source] = Math.max(0, Math.floor(contracts[source] ?? 0)) + count;
    this.setFlag('wards.contracts', contracts);
    this.adjustFactionAlignment('goblin-camps', 2);
  }

  getFollowers(): readonly FollowerInstance[] {
    return this.getFollowerState();
  }

  hasFollowers(): boolean {
    return this.getFollowerState().length > 0;
  }

  hireGoblinMercenary(
    name = 'Goblin Mercenary',
    price = 55,
  ): {
    ok: boolean;
    message: string;
    color: string;
  } {
    if (this.hasFollowers()) {
      return { ok: false, message: 'You already have a companion in that slot.', color: '#9ad1ff' };
    }
    if (this.getScore() < price) {
      return { ok: false, message: `Goblin mercenary costs ${price} score.`, color: '#ff6b6b' };
    }
    const head = this.snake.bodySegments[0];
    if (!head) {
      return { ok: false, message: 'No body, no contract.', color: '#ff6b6b' };
    }
    this.addScore(-price);
    const roomId = this.snake.currentRoomId;
    const position = this.worldToLocal(roomId, head);
    const follower: FollowerInstance = {
      id: `follower-goblin-${Date.now().toString(36)}`,
      kind: 'goblin-mercenary',
      name,
      roomId,
      position: this.findFollowerStandPosition(roomId, position),
      direction: { x: 0, y: 1 },
      mode: 'follow',
      attackCooldown: 0,
    };
    this.setFollowerState([follower]);
    this.setFlag('achievement.companionAcquired', { companionKind: follower.kind });
    this.adjustFactionAlignment('goblin-camps', 3);
    return { ok: true, message: `${name} hired. Q commands are now available.`, color: '#b6ff6a' };
  }

  commandFollowers(): { ok: boolean; message: string; color: string } {
    const followers = this.getFollowerState();
    if (followers.length === 0) {
      return { ok: false, message: 'No companion to command.', color: '#ff6b6b' };
    }
    const nextMode = followers.some((follower) => follower.mode === 'follow') ? 'guard' : 'follow';
    this.setFollowerState(followers.map((follower) => ({ ...follower, mode: nextMode })));
    const label = followers.some((follower) => follower.kind === 'family-baby')
      ? 'Baby'
      : 'Mercenary';
    return {
      ok: true,
      message:
        nextMode === 'guard'
          ? `${label} is guarding and hunting nearby.`
          : `${label} is following.`,
      color: '#b6ff6a',
    };
  }

  recallFollowers(): { ok: boolean; message: string; color: string } {
    const followers = this.getFollowerState();
    const head = this.snake.bodySegments[0];
    if (followers.length === 0 || !head) {
      return { ok: false, message: 'No companion to recall.', color: '#ff6b6b' };
    }
    const roomId = this.snake.currentRoomId;
    const localHead = this.worldToLocal(roomId, head);
    this.setFollowerState(
      followers.map((follower) => ({
        ...follower,
        roomId,
        position: this.findFollowerStandPosition(roomId, localHead),
        mode: 'follow',
      })),
    );
    return { ok: true, message: 'Companion recalled.', color: '#b6ff6a' };
  }

  tryConsumeWardForDeath(reason?: string | null): boolean {
    if (!this.hasWardForDeath(reason)) {
      return false;
    }
    const contracts = this.getWardContracts();
    const source = reason as WardDeathSource;
    const current = Math.max(0, Math.floor(contracts[source] ?? 0));
    const next = { ...contracts, [source]: current - 1 };
    if (next[source] <= 0) {
      delete next[source];
    }
    this.setFlag('wards.contracts', next);
    const usage = this.getWardUsage();
    usage[source] = Math.max(0, Math.floor(usage[source] ?? 0)) + 1;
    this.setFlag('wards.usage', usage);
    this.setFlag('wards.lastTriggered', { source });
    this.adjustFactionAlignment('goblin-camps', 1);
    return true;
  }

  private hasWardForDeath(reason?: string | null): reason is WardDeathSource {
    if (!reason || !this.isWardDeathSource(reason)) {
      return false;
    }
    const contracts = this.getWardContracts();
    return Math.max(0, Math.floor(contracts[reason] ?? 0)) > 0;
  }

  private isWardDeathSource(reason: string): reason is WardDeathSource {
    return (
      reason === 'wall' ||
      reason === 'self' ||
      reason === 'shielded' ||
      reason === 'boss' ||
      reason === 'bullet' ||
      reason === 'temperature' ||
      reason === 'water' ||
      reason === 'shark'
    );
  }

  private getFollowerState(): FollowerInstance[] {
    const raw = this.getFlag<FollowerInstance[]>('followers.active') ?? [];
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .filter(
        (follower) =>
          follower && (follower.kind === 'goblin-mercenary' || follower.kind === 'family-baby'),
      )
      .map((follower) => ({
        ...follower,
        direction: follower.direction ?? { x: 0, y: 1 },
        mode: follower.mode === 'guard' ? 'guard' : 'follow',
        attackCooldown: Math.max(0, Number(follower.attackCooldown ?? 0)),
      }));
  }

  private setFollowerState(followers: readonly FollowerInstance[]): void {
    this.setFlag(
      'followers.active',
      followers.length > 0 ? followers.map((follower) => ({ ...follower })) : undefined,
    );
  }

  private tickFollowers(): { enemyDefeats: number; animalDefeats: number } {
    const followers = this.getFollowerState();
    const head = this.snake.bodySegments[0];
    if (followers.length === 0 || !head) {
      return { enemyDefeats: 0, animalDefeats: 0 };
    }
    const roomId = this.snake.currentRoomId;
    const localHead = this.worldToLocal(roomId, head);
    let enemyDefeats = 0;
    let animalDefeats = 0;

    const nextFollowers = followers.map((follower) => {
      let next =
        follower.roomId === roomId
          ? { ...follower }
          : {
              ...follower,
              roomId,
              position: this.findFollowerStandPosition(roomId, localHead),
              mode: 'follow' as const,
            };

      next.attackCooldown = Math.max(0, next.attackCooldown - 1);
      if (next.attackCooldown <= 0) {
        const target = this.findFollowerTarget(roomId, next.position);
        if (target) {
          next.direction = {
            x: Math.sign(target.position.x - next.position.x),
            y: Math.sign(target.position.y - next.position.y),
          };
          if (target.kind === 'enemy') {
            const worldTarget = this.localToWorld(roomId, target.position);
            const hit = this.enemies.damageEnemyAt(roomId, worldTarget, 1);
            if (hit.defeated) {
              enemyDefeats += 1;
            }
          } else {
            const hit = this.animals.damageAnimal(roomId, target.position, 1);
            if (hit.defeated) {
              animalDefeats += 1;
              const def = AnimalRegistry.getDefinition(hit.defeated.type);
              this.awardHuntedAnimal({
                animalId: hit.defeated.id,
                actorId: hit.defeated.actorId,
                animalType: hit.defeated.type,
                animalName: def.name,
                position: hit.defeated.position,
                drops: def.drops,
              });
            }
          }
          next.attackCooldown = 2;
          return next;
        }
      }

      if (next.mode === 'follow') {
        const target = this.snake.bodySegments[1]
          ? this.worldToLocal(roomId, this.snake.bodySegments[1])
          : localHead;
        next = this.moveFollowerToward(roomId, next, target);
      }
      return next;
    });

    this.setFollowerState(nextFollowers);
    return { enemyDefeats, animalDefeats };
  }

  private findFollowerTarget(
    roomId: string,
    position: Vector2Like,
  ): { kind: 'enemy' | 'animal'; position: Vector2Like } | null {
    const enemies = this.enemies.getEnemiesInRoom(roomId);
    const enemy = enemies
      .filter((candidate) => this.distance(position, candidate.position) <= 2)
      .sort((a, b) => this.distance(position, a.position) - this.distance(position, b.position))[0];
    if (enemy) {
      return { kind: 'enemy', position: enemy.position };
    }
    const animal = this.animals
      .getAnimalsInRoom(roomId)
      .filter((candidate) => this.distance(position, candidate.position) <= 2)
      .sort((a, b) => this.distance(position, a.position) - this.distance(position, b.position))[0];
    return animal ? { kind: 'animal', position: animal.position } : null;
  }

  private moveFollowerToward(
    roomId: string,
    follower: FollowerInstance,
    target: Vector2Like,
  ): FollowerInstance {
    if (this.distance(follower.position, target) <= 1) {
      return follower;
    }
    const dx = target.x - follower.position.x;
    const dy = target.y - follower.position.y;
    const directions =
      Math.abs(dx) >= Math.abs(dy)
        ? [
            { x: Math.sign(dx), y: 0 },
            { x: 0, y: Math.sign(dy) },
          ]
        : [
            { x: 0, y: Math.sign(dy) },
            { x: Math.sign(dx), y: 0 },
          ];
    for (const direction of directions) {
      if (direction.x === 0 && direction.y === 0) {
        continue;
      }
      const position = {
        x: follower.position.x + direction.x,
        y: follower.position.y + direction.y,
      };
      if (this.isFollowerTileOpen(roomId, position)) {
        return { ...follower, position, direction };
      }
    }
    return follower;
  }

  private findFollowerStandPosition(roomId: string, near: Vector2Like): Vector2Like {
    const candidates = [
      { x: near.x - 1, y: near.y },
      { x: near.x + 1, y: near.y },
      { x: near.x, y: near.y - 1 },
      { x: near.x, y: near.y + 1 },
      near,
    ];
    return candidates.find((position) => this.isFollowerTileOpen(roomId, position)) ?? near;
  }

  private isFollowerTileOpen(roomId: string, position: Vector2Like): boolean {
    if (
      position.x < 0 ||
      position.x >= this.config.grid.cols ||
      position.y < 0 ||
      position.y >= this.config.grid.rows
    ) {
      return false;
    }
    const room = this.world.getRoom(roomId);
    return room.layout[position.y]?.[position.x] !== '#';
  }

  private worldToLocal(roomId: string, position: Vector2Like): Vector2Like {
    if (isCaveRoomId(roomId)) {
      return { x: position.x, y: position.y };
    }
    const [roomX, roomY] = this.parseRoomCoordinates(roomId);
    return {
      x: position.x - roomX * this.config.grid.cols,
      y: position.y - roomY * this.config.grid.rows,
    };
  }

  private localToWorld(roomId: string, position: Vector2Like): Vector2Like {
    if (isCaveRoomId(roomId)) {
      return { x: position.x, y: position.y };
    }
    const [roomX, roomY] = this.parseRoomCoordinates(roomId);
    return {
      x: roomX * this.config.grid.cols + position.x,
      y: roomY * this.config.grid.rows + position.y,
    };
  }

  private parseRoomCoordinates(roomId: string): [number, number, number] {
    if (!this.isCoordinateRoomId(roomId)) {
      return [0, 0, 0];
    }
    const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
    return [x, y, z];
  }

  private isCoordinateRoomId(roomId: string): boolean {
    return /^-?\d+,-?\d+,-?\d+$/.test(roomId);
  }

  private distance(a: Vector2Like, b: Vector2Like): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private getRoomsVisitedCount(): number {
    return Number(this.getFlag<number>('roomsVisited') ?? this.visitedRooms.size);
  }

  private getGiftTags(itemId: string): string[] {
    const item = getItem(itemId);
    const haystack = `${itemId} ${item?.name ?? ''} ${item?.description ?? ''}`.toLowerCase();
    const tags: string[] = [];
    const addIf = (tag: string, pattern: RegExp) => {
      if (pattern.test(haystack)) tags.push(tag);
    };
    addIf('food', /meat|fish|egg|honey/);
    addIf('raw', /raw/);
    addIf('cooked', /cooked|grilled/);
    addIf('honey', /honey/);
    addIf('card', /card|deck|wager/);
    addIf('home', /couch|kitchen|bed|plant|lamp|hearth|house/);
    addIf('sentimental', /bouquet|wedding|promise|flowers/);
    addIf('warmth', /cloak|fire|phoenix|warm|sun|heat/);
    addIf('phoenix', /phoenix/);
    addIf('veil', /veil|starlight/);
    addIf('luminous', /halo|starlight|sun|light/);
    addIf('holy', /halo|angel|seer|veil/);
    addIf('contract', /contract|ledger|debt|ward|refund/);
    addIf('ledger', /ledger/);
    addIf('ward', /ward|phoenix/);
    addIf('hide', /hide|leather/);
    addIf('tool', /rope|glove|mason|revolver|ring/);
    addIf('gore', /raw|meat|hide/);
    return tags.length > 0 ? tags : ['curio'];
  }

  private getRelationshipNpcPosition(profile: RelationshipCandidateProfile): Vector2Like | null {
    if (!profile.homeRoomId) {
      return null;
    }
    const body = this.npcBodies.get(profile.id);
    if (body) {
      return { ...body.position };
    }
    const room = this.world.getRoom(profile.homeRoomId);
    const localIdParts = profile.id.split(':');
    const localId = localIdParts[localIdParts.length - 1];
    if (room.village) {
      const resident = [...room.village.residents, room.village.shopkeeper].find(
        (entry) => entry.id === localId,
      );
      if (resident) return { x: resident.x, y: resident.y };
    }
    if (room.goblinCamp) {
      const resident = [room.goblinCamp.shopkeeper, ...room.goblinCamp.guards].find(
        (entry) => entry.id === localId,
      );
      if (resident) return { x: resident.x, y: resident.y };
    }
    if (room.town) {
      const resident = room.town.residents.find((entry) => entry.id === localId);
      if (resident) return { x: resident.x, y: resident.y };
    }
    return null;
  }

  private ensureHostileNpcCombatBody(
    roomId: string,
    relationshipId: string,
    name: string,
    position?: Vector2Like | null,
  ): void {
    const room = this.world.getRoom(roomId);
    const body = this.npcBodies.get(relationshipId);
    const spawn = position ??
      body?.position ??
      this.findEncounterSpawn(roomId) ??
      room.questGiver ?? {
        x: Math.floor(this.config.grid.cols / 2),
        y: Math.floor(this.config.grid.rows / 2),
      };
    const state = this.relationshipController.getState(relationshipId);
    if (state?.stage === 'dead' || state?.flags.dead || state?.flags.eatenByPlayer) {
      this.npcBodies.delete(relationshipId);
      return;
    }
    const enemy = this.enemies.spawnHostileNpc(
      roomId,
      spawn,
      name,
      3,
      relationshipId,
      3,
      body?.actorId ?? state?.actorId ?? this.actors.getStableRelationshipActorId(relationshipId),
    );
    enemy.fireCooldown = Math.min(enemy.fireCooldown, 1);
    enemy.moveCooldown = Math.min(enemy.moveCooldown, 1);
    if (body) {
      body.position = { ...enemy.position };
      body.roomId = roomId;
      body.stationary = false;
      body.wanderRadius = Math.max(2, body.wanderRadius);
    }
    this.setFlag('ui.questInteraction', {
      message: `${name} has stopped being a relationship and started being a consequence.`,
    });
    this.setFlag(`relationships.hostileSpawned.${relationshipId}`, true);
  }

  private spawnRelationshipHostile(
    roomId: string,
    relationshipId: string,
    name: string,
    position?: Vector2Like | null,
  ): void {
    this.ensureHostileNpcCombatBody(roomId, relationshipId, name, position);
  }

  private getRelationshipIdFromHostileNpc(enemyId?: string): string | null {
    const prefix = 'npc-hostile:';
    if (!enemyId?.startsWith(prefix)) {
      return null;
    }
    const id = enemyId.slice(prefix.length);
    return id.includes(':') ? id : null;
  }

  insultNpc(
    roomId: string,
  ): { anger: number; hostility: 'friendly' | 'warning' | 'hostile'; name: string } | null {
    const room = this.world.getRoom(roomId);
    const giver = room.questGiver;
    if (!giver) {
      return null;
    }
    const disposition = this.angerNpc(roomId, 'insult');
    return disposition ? { ...disposition, name: giver.name } : null;
  }

  getInventory(): InventorySystem {
    return this.inventory;
  }

  private isArchipelagoModeActive(): boolean {
    return this.getFlag<boolean>('archipelago.modeActive') === true;
  }

  private queueArchipelagoLocalRewardCheck(check: ArchipelagoLocalRewardCheck): void {
    const current =
      this.getFlag<ArchipelagoLocalRewardCheck[]>('archipelago.localRewardChecks') ?? [];
    this.setFlag('archipelago.localRewardChecks', [...current, check]);
  }

  drainArchipelagoLocalRewardChecks(): ArchipelagoLocalRewardCheck[] {
    const current =
      this.getFlag<ArchipelagoLocalRewardCheck[]>('archipelago.localRewardChecks') ?? [];
    this.setFlag('archipelago.localRewardChecks', undefined);
    return current;
  }

  addItem(itemId: string, count = 1): void {
    if (!getItem(itemId)) {
      return;
    }
    if (this.isArchipelagoModeActive() && AP_ITEM_LOCATION_KEY_BY_ITEM_ID[itemId]) {
      this.queueArchipelagoLocalRewardCheck({ kind: 'item', id: itemId });
      this.setFlag('ui.itemReward', { itemId, count: 0 });
      return;
    }
    this.inventory.addItem(itemId, count);
    this.setFlag('ui.itemReward', { itemId, count });
  }

  grantInventoryItem(itemId: string, count = 1): void {
    if (!getItem(itemId)) {
      return;
    }
    this.inventory.addItem(itemId, count);
    this.setFlag('ui.itemReward', { itemId, count });
  }

  spawnArchipelagoTrap(trapId: string): boolean {
    if (trapId === 'freak-dennis') {
      this.bosses.spawnBoss(
        this.snake.currentRoomId,
        'freak-dennis',
        this.world.getRoom(this.snake.currentRoomId),
      );
      return true;
    }
    if (trapId === 'freaker-dennis') {
      this.bosses.spawnBoss(
        this.snake.currentRoomId,
        'freaker-dennis',
        this.world.getRoom(this.snake.currentRoomId),
      );
      return true;
    }
    if (trapId === 'jason-statham') {
      this.bosses.spawnJasonStatham(this.snake.currentRoomId);
      return true;
    }
    return false;
  }

  useInventoryItem(itemId: string): {
    ok: boolean;
    message: string;
    color?: string;
    consume?: boolean;
    roomsChanged?: string[];
  } {
    const item = getItem(itemId);
    if (!item || this.inventory.getItemCount(itemId) <= 0) {
      return { ok: false, message: 'That item is not in your pack.', color: '#ff6b6b' };
    }

    const effects: Record<
      string,
      { hunger?: number; heal?: number; temperatureRelief?: number; disorientTicks?: number }
    > = {
      'raw-meat': { hunger: 35 },
      'fish-meat': { hunger: 30 },
      'cooked-meat': { hunger: 70, heal: 1 },
      'cooked-fish': { hunger: 65, temperatureRelief: 1200 },
      honey: { heal: 1, temperatureRelief: 1800 },
      ramen: { hunger: 999, heal: 1, temperatureRelief: 3500 },
      senbei: { hunger: 30 },
      egg: { hunger: 25 },
      'food-snake-burger': { hunger: 999 },
      'food-snake-fries': { hunger: 70 },
      'food-snake-nuggets': { hunger: 45 },
      'food-box-combo-extra-toast': { hunger: 999 },
      'food-box-combo-coleslaw': { hunger: 999 },
      'food-three-finger-combo': { hunger: 999 },
      'food-caniac-combo': { hunger: 999 },
      'chicken-fried': { hunger: 55 },
      'healing-potion': { heal: 2 },
      beer: { disorientTicks: 100 },
      wine: { disorientTicks: 140 },
    };

    if (itemId === 'life-tonic' || itemId === 'ofuda') {
      const charges = Math.max(0, Number(this.getFlag<number>('equipment.phoenixCharges') ?? 0));
      this.setFlag('equipment.phoenixCharges', charges + 1);
      this.setFlag('ui.livesRevealed', true);
      this.inventory.removeItem(itemId, 1);
      this.setFlag('ui.itemUsed', { itemId, itemName: item.name, lifeCharge: true });
      this.emitWorldEvent({
        type: 'item-used',
        roomId: this.snake.currentRoomId,
        severity: 10,
        loudness: 3,
        tags: ['item', 'charm', itemId],
        summary: `The snake used ${item.name}.`,
        createdAtRoomNumber: this.getRoomsVisitedCount(),
        data: { itemId, itemName: item.name, lifeCharge: true },
      });
      return {
        ok: true,
        message: `Used ${item.name}. Extra life charge added.`,
        color: '#9cff9c',
        consume: true,
      };
    }

    if (itemId === 'orange-juice') {
      this.setFlag('status.orangeJuiceSpeedBoostTicks', 60);
      const currentInvuln = Number(this.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0);
      this.setFlag('fortitude.invulnerabilityTicks', Math.max(currentInvuln, 50));
      this.setFlag('status.orangeJuiceScoreMult', 2);
      this.restoreHunger(80);
      this.inventory.removeItem(itemId, 1);
      this.emitWorldEvent({
        type: 'item-used',
        roomId: this.snake.currentRoomId,
        severity: 14,
        loudness: 5,
        tags: ['item', 'consumable', itemId, 'orange-juice', 'powerup'],
        summary: `The snake drank Orange Juice and glowed with citrus power.`,
        createdAtRoomNumber: this.getRoomsVisitedCount(),
        data: { itemId, itemName: item.name },
      });
      return {
        ok: true,
        message: 'Orange Juice! Speed, shield, and doubled fortune!',
        color: '#ffb347',
        consume: true,
      };
    }

    // === BIOME LOCATOR ===
    if (isLocatorItemId(itemId)) {
      const locatorBiomeId = getLocatorBiomeId(itemId);
      if (!locatorBiomeId) {
        return { ok: false, message: 'That locator is broken.', color: '#ff6b6b' };
      }
      this.setFlag('ui.locatorSearching', { itemId, itemName: item.name });
      const originRoomId = this.snake.currentRoomId;
      // Use SeededBiomeMap for fast, generation-free biome lookups.
      // Falls back to static lookup if no world identity is available.
      const resolveBiome = this.world
        ? createSeededBiomeResolver(this.world.getWorldGenerationIdentity())
        : (rid: string) => getBiomeForRoom(rid);
      const lookup = lookupNearestBiomes(originRoomId, locatorBiomeId, resolveBiome);
      const parts: string[] = [`${item.name} reads:`];
      if (lookup.sameFloor) {
        parts.push(formatLocatorResult(lookup.sameFloor, 'Same floor'));
      } else {
        parts.push('Same floor: Biome Not Found.');
      }
      if (lookup.anyFloor) {
        parts.push(formatLocatorResult(lookup.anyFloor, 'Any floor'));
      } else {
        parts.push('Any floor: Biome Not Found.');
      }
      this.setFlag('ui.locatorSearching', undefined);
      this.setFlag('ui.itemUsed', { itemId, itemName: item.name, locatorResult: lookup });
      return {
        ok: true,
        message: parts.join('\n'),
        color: '#aec4ff',
        consume: false,
      };
    }

    const effect = effects[itemId];
    if (!effect) {
      return { ok: false, message: `${item.name} cannot be used right now.`, color: '#ffd166' };
    }

    if (effect.hunger) {
      this.restoreHunger(effect.hunger);
    }
    const healed = effect.heal ? this.healPlayer(effect.heal) : 0;
    if (effect.temperatureRelief) {
      this.relieveTemperatureExposure(effect.temperatureRelief);
    }
    if (effect.disorientTicks) {
      const current = Number(this.getFlag<number>('status.disorientedTicks') ?? 0);
      this.setFlag('status.disorientedTicks', Math.max(current, effect.disorientTicks));
      this.setFlag('status.disorientedDriftInterval', itemId === 'wine' ? 4 : 5);
      this.setFlag('ui.statusEffect', {
        id: 'disoriented',
        message: 'Disoriented: your head stumbles side to side.',
        color: '#d6a2ff',
      });
    }

    this.inventory.removeItem(itemId, 1);
    this.emitWorldEvent({
      type: 'item-used',
      roomId: this.snake.currentRoomId,
      severity: healed > 0 ? 12 : 8,
      loudness: 3,
      tags: [
        'item',
        item.category ?? 'consumable',
        itemId,
        effect.hunger ? 'food' : 'consumable',
        ...(effect.disorientTicks ? ['alcohol', 'disorientation'] : []),
      ],
      summary: `The snake used ${item.name}.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { itemId, itemName: item.name, healed, hunger: effect.hunger ?? 0 },
    });
    const parts = [`Used ${item.name}.`];
    if (healed > 0) {
      parts.push(`Healed ${healed} heart${healed === 1 ? '' : 's'}.`);
    }
    if (effect.disorientTicks) {
      parts.push('You feel disoriented.');
    }
    this.setFlag('ui.itemUsed', { itemId, itemName: item.name, healed });
    return { ok: true, message: parts.join(' '), color: '#9cff9c', consume: true };
  }

  cookRecipe(recipeId: string): {
    ok: boolean;
    message: string;
    color?: string;
    consume?: boolean;
    roomsChanged?: string[];
  } {
    const recipes: Record<
      string,
      { input: string; output: string; label: string; sourceRequired?: boolean }
    > = {
      'cook-meat': {
        input: 'raw-meat',
        output: 'cooked-meat',
        label: 'Cooked Raw Meat into Cooked Meat.',
        sourceRequired: true,
      },
      'cook-fish': {
        input: 'fish-meat',
        output: 'cooked-fish',
        label: 'Grilled Fish Meat into Cooked Fish.',
        sourceRequired: true,
      },
    };
    const recipe = recipes[recipeId];
    if (!recipe) {
      return { ok: false, message: 'Unknown recipe.', color: '#ff6b6b' };
    }
    if (recipe.sourceRequired && !this.getCurrentCookingSource()) {
      return { ok: false, message: 'No cooking source nearby.', color: '#ffd166' };
    }
    if (this.inventory.getItemCount(recipe.input) <= 0) {
      const missing = getItem(recipe.input)?.name ?? recipe.input;
      return { ok: false, message: `Missing ${missing}.`, color: '#ffd166' };
    }
    this.inventory.removeItem(recipe.input, 1);
    this.inventory.addItem(recipe.output, 1);
    this.setFlag('ui.itemUsed', { itemId: recipe.output, itemName: getItem(recipe.output)?.name });
    this.emitWorldEvent({
      type: 'food-cooked',
      roomId: this.snake.currentRoomId,
      severity: 8,
      loudness: 4,
      tags: ['food', 'cooking', recipe.input, recipe.output],
      summary: recipe.label,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { inputItemId: recipe.input, outputItemId: recipe.output, recipeId },
    });
    return { ok: true, message: recipe.label, color: '#9cff9c', consume: true };
  }

  getCurrentCookingSource():
    | 'house-kitchen'
    | 'campfire'
    | 'diner'
    | 'ramen-stand'
    | 'cookpot'
    | null {
    const room = this.getCurrentRoom();
    if (room.id === '0,-1,0') {
      return 'house-kitchen';
    }
    if (room.allNiteDiner) {
      return 'diner';
    }
    if (room.ramenStand) {
      return 'ramen-stand';
    }
    const head = this.snake.bodySegments[0];
    if (!head) {
      return null;
    }
    const [roomX, roomY] = this.snake.currentRoomId.split(',').map(Number);
    const localX = head.x - roomX * this.config.grid.cols;
    const localY = head.y - roomY * this.config.grid.rows;
    const tile = room.layout[localY]?.[localX];
    return tile === 'F' ? 'campfire' : null;
  }

  playTapasMinigame(choiceId: 'bravas' | 'pan-con-tomate' | 'croquetas'): {
    ok: boolean;
    message: string;
    color: string;
    score?: number;
  } {
    const room = this.getCurrentRoom();
    const tapas = room.mosaicCoast?.tapasBar;
    if (!tapas) {
      return { ok: false, message: 'No tapas bar nearby.', color: '#ffd166' };
    }
    const choices = ['bravas', 'pan-con-tomate', 'croquetas'] as const;
    const hash = [...`${tapas.minigameSeed}:${this.getRoomsVisitedCount()}`].reduce(
      (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
      0,
    );
    const target = choices[hash % choices.length] ?? 'bravas';
    const perfect = choiceId === target;
    const score = perfect ? 75 : 25;
    const coolingMs = perfect ? 3500 : 1500;
    const currentHot = Number(this.getFlag<number>('player.temperatureHotExposureMs') ?? 0);
    this.addScore(score);
    this.setFlag('player.temperatureHotExposureMs', Math.max(0, currentHot - coolingMs));
    this.setFlag('player.temperatureExposureMs', Math.max(0, currentHot - coolingMs));
    this.setFlag('mosaicCoast.lastTapas', {
      roomId: room.id,
      choiceId,
      target,
      perfect,
      score,
    });
    return {
      ok: true,
      message: perfect
        ? 'Perfect tapas rhythm. Heat backs off and pretends it had plans.'
        : 'Respectable tapas. Cooling acquired, dignity mostly intact.',
      color: perfect ? '#9cff9c' : '#ffd166',
      score,
    };
  }

  healPlayer(amount: number): number {
    const { current, max } = this.getPlayerHealth();
    const next = Math.min(max, current + Math.max(0, Math.floor(amount)));
    this.setFlag('player.health', next);
    this.setFlag('ui.healthRevealed', true);
    if (this.isRaccoonMode() && next > current) {
      this.raccoonHungerTimerMs = 0;
      this.addRaccoonBanditForage();
      this.syncRaccoonFlags();
    }
    return next - current;
  }

  private emitPlayerLowHealthEvent(current: number, max: number, source: string): void {
    if (max <= 0 || current <= 0 || current / max > 0.5) {
      return;
    }
    const band = current / max <= 0.25 ? 'critical' : 'low';
    const key = `world.playerHealth.${band}.${this.snake.currentRoomId}.${current}`;
    if (this.getFlag<boolean>(key)) {
      return;
    }
    this.setFlag(key, true);
    this.emitWorldEvent({
      type: 'player-low-health',
      roomId: this.snake.currentRoomId,
      severity: band === 'critical' ? 30 : 18,
      loudness: 10,
      tags: ['player', 'health', band, source],
      summary: `The snake is ${band === 'critical' ? 'critically wounded' : 'hurt'} nearby.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { current, max, source },
    });
  }

  restoreHunger(amount: number): void {
    const current = Number(this.getFlag<number>('timeSinceEat') ?? 0);
    this.setFlag('timeSinceEat', Math.max(0, current - Math.max(0, Math.floor(amount))));
    if (amount >= 999) {
      this.setFlag('timeSinceEat', 0);
    }
  }

  relieveTemperatureExposure(amountMs: number): void {
    const relief = Math.max(0, Math.floor(amountMs));
    const exposure = Number(this.getFlag<number>('player.temperatureExposureMs') ?? 0);
    const damage = Number(this.getFlag<number>('player.temperatureDamageProgressMs') ?? 0);
    const hotExposure = Number(this.getFlag<number>('player.temperatureHotExposureMs') ?? exposure);
    const coldExposure = Number(
      this.getFlag<number>('player.temperatureColdExposureMs') ?? exposure,
    );
    const hotDamage = Number(
      this.getFlag<number>('player.temperatureHotDamageProgressMs') ?? damage,
    );
    const coldDamage = Number(
      this.getFlag<number>('player.temperatureColdDamageProgressMs') ?? damage,
    );
    this.setFlag('player.temperatureExposureMs', Math.max(0, exposure - relief));
    this.setFlag('player.temperatureDamageProgressMs', Math.max(0, damage - relief));
    this.setFlag('player.temperatureHotExposureMs', Math.max(0, hotExposure - relief));
    this.setFlag('player.temperatureColdExposureMs', Math.max(0, coldExposure - relief));
    this.setFlag('player.temperatureHotDamageProgressMs', Math.max(0, hotDamage - relief));
    this.setFlag('player.temperatureColdDamageProgressMs', Math.max(0, coldDamage - relief));
  }

  tryShedTail(): { ok: boolean; message: string; color?: string } {
    if (!this.getFlag<boolean>('skill.tailcraft.shed')) {
      return { ok: false, message: 'Shed requires the Tailcraft Shed skill.', color: '#ffd166' };
    }
    const cooldown = Number(this.getFlag<number>('skill.tailcraft.shedCooldown') ?? 0);
    if (cooldown > 0) {
      return { ok: false, message: 'Shed is cooling down.', color: '#ffd166' };
    }
    const removed = this.snake.bodySegments.slice(-3).map((segment) => ({ ...segment }));
    if (!this.snake.shrinkTail(3)) {
      return { ok: false, message: 'You need more tail to shed safely.', color: '#ff6b6b' };
    }
    this.setFlag('skill.tailcraft.shedCooldown', 20);
    if (this.getFlag<boolean>('growth.rapidRegrowth')) {
      this.setFlag('growth.rapidRegrowthTicks', 24);
    }
    if (this.getFlag<boolean>('growth.ouroboros')) {
      const potential = Number(this.getFlag<number>('growth.ouroborosPotential') ?? 0);
      this.setFlag('growth.ouroborosPotential', Math.min(12, potential + removed.length));
    }
    this.setFlag('ui.shedTail', {
      roomId: this.snake.currentRoomId,
      positions: removed,
      attractsHostiles: Boolean(this.getFlag<boolean>('growth.livingDecoy')),
      expiresAtTick:
        Number(this.getFlag<number>('timeMs') ?? 0) +
        (this.getFlag<boolean>('growth.livingDecoy') ? 12000 : 8000),
    });
    return { ok: true, message: 'Shed tail into a decoy chunk.', color: '#9cff9c' };
  }

  tryConsumeFellowshipRescue(): boolean {
    if (
      !this.getFlag<boolean>('fellowship.rescue') ||
      this.getFlag<boolean>('fellowship.rescueUsed')
    ) {
      return false;
    }
    if (this.getFollowerState().length === 0) return false;
    this.setFlag('fellowship.rescueUsed', true);
    this.setFlag('ui.fellowshipRescue', true);
    return true;
  }

  tryConsumeGrowthForDeath(reason?: string | null): boolean {
    if (reason === 'deathlink') return false;
    const tooBig = this.getFlag<{ minimumLength?: number; cost?: number }>('growth.tooBigToFail');
    if (tooBig && this.getSnakeLength() >= (tooBig.minimumLength ?? 12)) {
      const removal = this.removeSafeSnakeLength(tooBig.cost ?? 8);
      if (removal.ok && removal.removed >= (tooBig.cost ?? 8)) {
        this.setFlag('ui.growthDeathPrevention', {
          perk: 'tooBigToFail',
          removed: removal.removed,
        });
        return true;
      }
    }
    const ablative = this.getFlag<{ minimumLength?: number }>('combo.ablativeMass');
    if (ablative && this.getSnakeLength() >= (ablative.minimumLength ?? 6)) {
      const removal = this.removeSafeSnakeLength(3);
      if (removal.ok) {
        this.setFlag('ui.growthDeathPrevention', {
          perk: 'ablativeMass',
          removed: removal.removed,
        });
        return true;
      }
    }
    return false;
  }

  getNpcBark(role: string, actorId?: string): NpcVoiceLine {
    const room = this.getCurrentRoom();
    const biome = getBiomeDefinition(room.biomeId);
    const health = this.getPlayerHealth();
    const actor = actorId ? this.actors.getActor(actorId) : undefined;
    const recentEvents = ['recent.animalHunted', 'recent.deathReason'].filter(
      (key) => this.getFlag(key) !== undefined,
    );
    if (actor) {
      const line = selectActorVoiceLine({
        actor,
        biomeId: room.biomeId,
        dangerLevel: biome.dangerLevel,
        playerHealth: health.current,
        playerMaxHealth: health.max,
        snakeLength: this.snake.bodySegments.length,
        flags: this.snake.flags,
        recentEvents,
        random: this._rng,
      });
      this.setFlag(`actor.voice.last.${actor.id}`, line.id);
      return line;
    }
    return selectNpcVoiceLine({
      role,
      biomeId: room.biomeId,
      dangerLevel: biome.dangerLevel,
      playerHealth: health.current,
      playerMaxHealth: health.max,
      snakeLength: this.snake.bodySegments.length,
      flags: this.snake.flags,
      recentEvents,
      hasItem: (itemId) => this.inventory.getItemCount(itemId) > 0,
      hasSkill: (skillId) => Boolean(this.getFlag(skillId)),
      random: this._rng,
    });
  }

  private canHuntHarmlessAnimals(): boolean {
    return Boolean(
      this.getFlag<boolean>('skill.predator.huntHarmless') ||
      this.getFlag<boolean>('predation.config.scoreFlow'),
    );
  }

  private awardHuntedAnimal(
    huntedAnimal: HuntedAnimalResult | undefined,
    fallbackWorldPosition?: Vector2Like,
  ): void {
    if (!huntedAnimal) {
      this.setFlag('ui.animalHunted', true);
      return;
    }

    const dropBonus =
      (this.getFlag<boolean>('skill.predator.dropBonus') ? 0.15 : 0) +
      getCompanionHuntingBonus(this.getAnimalCompanionState());
    const specialDropModifiers = this.specialStats.getAnimalDropModifiers(this._rng);
    const drops = rollAnimalDrops(huntedAnimal.drops, this._rng, {
      bonusChance: dropBonus + (specialDropModifiers.bonusChance ?? 0),
      doubleRoll: specialDropModifiers.doubleRoll,
      guaranteedMeat:
        Boolean(specialDropModifiers.guaranteedMeat) ||
        this.getFlag<boolean>('skill.predator.guaranteedMeat'),
    });
    for (const drop of drops) {
      if (getItem(drop.itemId)) {
        this.inventory.addItem(drop.itemId, drop.count);
      }
    }

    const [roomX, roomY] = this.snake.currentRoomId.split(',').map(Number);
    const worldPosition = fallbackWorldPosition ?? {
      x: roomX * this.config.grid.cols + huntedAnimal.position.x,
      y: roomY * this.config.grid.rows + huntedAnimal.position.y,
    };
    this.addScore(drops.length > 0 ? 2 : 1);
    this.setFlag('recent.animalHunted', huntedAnimal.animalType);
    const huntedActorId =
      huntedAnimal.actorId ??
      this.actors.getStableAnimalActorId(this.snake.currentRoomId, huntedAnimal.animalId);
    this.actors.registry.ensureAnimalActor({
      actorId: huntedActorId,
      animalId: huntedAnimal.animalId,
      animalType: huntedAnimal.animalType,
      animalName: huntedAnimal.animalName,
      roomId: this.snake.currentRoomId,
      currentHearts: 0,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
    });
    this.emitWorldEvent({
      type: 'animal-hunted',
      roomId: this.snake.currentRoomId,
      targetActorIds: [huntedActorId],
      severity: 18,
      loudness: 12,
      tags: ['animal', 'hunting', huntedAnimal.animalType],
      summary: `${huntedAnimal.animalName} was hunted.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: {
        animalId: huntedAnimal.animalId,
        animalType: huntedAnimal.animalType,
        drops,
      },
    });
    this.setFlag('ui.animalHunted', {
      animalName: huntedAnimal.animalName,
      animalType: huntedAnimal.animalType,
      drops,
      x: worldPosition.x,
      y: worldPosition.y,
      roomId: this.snake.currentRoomId,
      message:
        drops.length > 0
          ? `${huntedAnimal.animalName} hunted. Found: ${drops
              .map(
                (drop) =>
                  `${getItem(drop.itemId)?.name ?? drop.itemId}${drop.count > 1 ? ` x${drop.count}` : ''}`,
              )
              .join(', ')}.`
          : `${huntedAnimal.animalName} hunted.`,
    });
  }

  getGiftableItems(): Array<{ itemId: string; name: string; count: number }> {
    return this.inventory
      .getAllItems()
      .map(([itemId, count]) => ({ itemId, count, name: getItem(itemId)?.name ?? itemId }))
      .filter((entry) => entry.count > 0);
  }

  ensureRelationshipCandidate(profile: RelationshipCandidateProfile): void {
    this.relationshipController.ensureCandidate(profile, this.getRoomsVisitedCount());
  }

  getDatingCandidateViews(): DatingCandidateView[] {
    return this.relationshipController.getDatingTabView(this.getRoomsVisitedCount(), (factionId) =>
      factionId ? getFactionName(factionId) : 'Unaffiliated',
    );
  }

  getRelationshipState(profile: RelationshipCandidateProfile): RelationshipState | undefined {
    return this.relationshipController.getState(profile.id);
  }

  getRelationshipActions(
    profile: RelationshipCandidateProfile,
  ): Array<RelationshipChoice | 'gift'> {
    this.relationshipController.ensureCandidate(profile, this.getRoomsVisitedCount());
    return this.relationshipController.getAvailableChoices(profile.id);
  }

  isRelationshipHostile(profile: RelationshipCandidateProfile): boolean {
    const state = this.relationshipController.getState(profile.id);
    return state?.stage === 'hostile' || state?.stage === 'murderous';
  }

  isRelationshipNpcCombatHostile(profile: RelationshipCandidateProfile): boolean {
    const roomId = profile.homeRoomId ?? this.snake.currentRoomId;
    return this.enemies
      .getEnemiesInRoom(roomId)
      .some(
        (enemy) =>
          enemy.id === `npc-hostile:${profile.id}` ||
          (profile.actorId !== undefined && enemy.actorId === profile.actorId),
      );
  }

  private ensureRelationshipActorForProfile(
    profile: RelationshipCandidateProfile,
    state?: RelationshipState,
  ): string {
    const relationshipState = state ?? this.relationshipController.getState(profile.id);
    if (relationshipState) {
      return this.ensureRelationshipActorForState(relationshipState, profile);
    }
    const actor = this.actors.registry.ensureRelationshipActor({
      actorId: profile.actorId,
      relationshipId: profile.id,
      displayName: profile.displayName,
      species: profile.species,
      factionId: profile.factionId,
      homeRoomId: profile.homeRoomId,
      portraitId: profile.portraitId,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
    });
    this.syncActorFromRelationshipState(actor.id, relationshipState);
    return actor.id;
  }

  private ensureRelationshipActorForState(
    state: RelationshipState,
    profile?: RelationshipCandidateProfile,
  ): string {
    const actor = this.actors.registry.ensureRelationshipActor({
      actorId: state.actorId ?? profile?.actorId,
      relationshipId: state.id,
      displayName: state.displayName,
      species: state.species,
      factionId: state.factionId,
      homeRoomId: state.homeRoomId ?? profile?.homeRoomId,
      portraitId: state.portraitId ?? profile?.portraitId,
      stage: state.stage,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
    });
    this.syncActorFromRelationshipState(actor.id, state);
    return actor.id;
  }

  private syncActorFromRelationshipState(actorId: string, state: RelationshipState): void {
    this.actors.registry.update(actorId, (actor) => ({
      ...actor,
      hostility:
        state.stage === 'hostile' || state.stage === 'murderous'
          ? 'hostile'
          : state.stage === 'estranged' || state.resentment >= 35
            ? 'suspicious'
            : state.stage === 'friendly' ||
                state.stage === 'crush' ||
                state.stage === 'dating' ||
                state.stage === 'lover' ||
                state.stage === 'married'
              ? 'friendly'
              : actor.hostility,
      mood: {
        ...actor.mood,
        affection: Math.max(actor.mood.affection, Math.max(0, state.affection)),
        trust: Math.max(actor.mood.trust, state.trust),
        anger: Math.max(actor.mood.anger, state.resentment),
        fear: Math.max(actor.mood.fear, state.fear),
        curiosity: Math.max(actor.mood.curiosity, Math.max(0, state.fascination)),
      },
      opinions: {
        ...actor.opinions,
        player: {
          targetId: 'player',
          trust: state.trust,
          fear: state.fear,
          respect: Math.max(-100, Math.min(100, state.trust - state.resentment)),
          affection: state.affection,
          resentment: state.resentment,
          attraction: state.romanceOptIn ? state.affection : Math.floor(state.affection / 2),
          debt: actor.opinions.player?.debt ?? 0,
        },
      },
    }));
  }

  getRelationshipTalk(profile: RelationshipCandidateProfile): RelationshipTalkResult {
    const state = this.relationshipController.ensureCandidate(profile, this.getRoomsVisitedCount());
    const result = this.relationshipController.getTalkLine(
      state.id,
      this.getRoomsVisitedCount(),
      this._rng,
    ) ?? {
      title: profile.displayName,
      line: 'The silence is so pointed it may qualify as dialogue.',
      color: '#9ad1ff',
      state,
    };
    this.emitWorldEvent({
      type: 'actor-talked',
      roomId: this.snake.currentRoomId,
      targetActorIds: [this.ensureRelationshipActorForProfile(profile, state)],
      severity: 5,
      loudness: 2,
      tags: ['relationship', 'talk', state.stage],
      summary: `You talked with ${state.displayName}.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { relationshipId: state.id, stage: state.stage },
    });
    return result;
  }

  applyRelationshipChoice(
    profile: RelationshipCandidateProfile,
    choice: RelationshipChoice,
  ): RelationshipEventResult {
    const state = this.relationshipController.ensureCandidate(profile, this.getRoomsVisitedCount());
    const result = this.relationshipController.applyChoice(
      state.id,
      choice,
      this.getRoomsVisitedCount(),
    );
    this.applyRelationshipReward(result.reward);
    if (result.questId === 'deep-lying-bouquet') {
      this.startDeepLyingBouquetQuest(state.id);
    }
    if (result.becameHostile && profile.homeRoomId) {
      this.spawnRelationshipHostile(
        profile.homeRoomId,
        state.id,
        state.displayName,
        this.getRelationshipNpcPosition(profile),
      );
    }
    if (choice === 'family' && result.ok && result.state?.children.length) {
      this.activateFamilyBabyFollower(result.state);
    }
    this.emitWorldEvent({
      type: 'relationship-choice',
      roomId: this.snake.currentRoomId,
      targetActorIds: [this.ensureRelationshipActorForProfile(profile, result.state ?? state)],
      severity: result.becameHostile ? 45 : choice === 'propose' ? 30 : 12,
      loudness: choice === 'fight' ? 50 : 8,
      tags: ['relationship', choice, result.state?.stage ?? state.stage],
      summary: `${profile.displayName} reacted to ${choice}.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { relationshipId: state.id, choice, ok: result.ok },
    });
    return result;
  }

  private activateFamilyBabyFollower(state: RelationshipState): void {
    const child = state.children[state.children.length - 1];
    const head = this.snake.bodySegments[0];
    if (!child || !head) {
      return;
    }
    const roomId = this.snake.currentRoomId;
    const localHead = this.worldToLocal(roomId, head);
    const follower: FollowerInstance = {
      id: `follower-family-baby-${child.id}`,
      kind: 'family-baby',
      name: child.name,
      roomId,
      position: this.findFollowerStandPosition(roomId, localHead),
      direction: { x: 0, y: 1 },
      mode: 'follow',
      attackCooldown: 0,
    };
    this.setFollowerState([follower]);
    this.setFlag('achievement.companionAcquired', { companionKind: follower.kind });
    this.setFlag('ui.followerAction', {
      message: `${child.name} takes the companion slot. Q toggles follow/guard.`,
      color: '#ffbdfd',
      count: 1,
    });
  }

  applyRelationshipArrangement(
    profile: RelationshipCandidateProfile,
    arrangement: 'monogamy' | 'open-honesty' | 'transactional' | 'reassure',
  ): RelationshipEventResult {
    const state = this.relationshipController.ensureCandidate(profile, this.getRoomsVisitedCount());
    const result = this.relationshipController.applyArrangementChoice(
      state.id,
      arrangement,
      this.getRoomsVisitedCount(),
    );
    this.emitWorldEvent({
      type: 'relationship-choice',
      roomId: this.snake.currentRoomId,
      targetActorIds: [this.ensureRelationshipActorForProfile(profile, result.state ?? state)],
      severity: result.becameHostile ? 45 : 16,
      loudness: 8,
      tags: ['relationship', 'arrangement', arrangement, result.state?.stage ?? state.stage],
      summary: `${profile.displayName} discussed ${arrangement.replace('-', ' ')}.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { relationshipId: state.id, arrangement, ok: result.ok },
    });
    return result;
  }

  canCompleteWeddingWithProfile(profile: RelationshipCandidateProfile): boolean {
    return this.getStagedQuestInstances().some(
      (instance) =>
        instance.questId === 'deep-lying-bouquet' &&
        instance.relationshipId === profile.id &&
        instance.stage === 'return-to-giver' &&
        instance.carriedItemId === 'deep-lying-bouquet',
    );
  }

  completeWeddingWithProfile(profile: RelationshipCandidateProfile): RelationshipEventResult {
    const instance = this.getStagedQuestInstances().find(
      (candidate) =>
        candidate.questId === 'deep-lying-bouquet' &&
        candidate.relationshipId === profile.id &&
        candidate.stage === 'return-to-giver' &&
        candidate.carriedItemId === 'deep-lying-bouquet',
    );
    if (!instance) {
      return {
        ok: false,
        title: profile.displayName,
        message: 'The wedding still needs the Deep-Lying Bouquet.',
        color: '#ff6b6b',
        state: this.relationshipController.ensureCandidate(profile, this.getRoomsVisitedCount()),
      };
    }

    this.updateStagedQuestInstance(instance.questId, (current) =>
      current === instance
        ? {
            ...current,
            stage: 'completed',
            carriedItemId: undefined,
          }
        : current,
    );
    this.questController.completeQuestById(instance.questId, this);
    this.setFlag('quest.staged.completedNow', { questId: instance.questId });
    const result = this.relationshipController.completeMarriage(
      profile.id,
      this.getRoomsVisitedCount(),
    );
    this.applyRelationshipReward(result.reward);
    const actorState =
      result.state ??
      this.relationshipController.ensureCandidate(profile, this.getRoomsVisitedCount());
    this.emitWorldEvent({
      type: 'relationship-choice',
      roomId: this.snake.currentRoomId,
      targetActorIds: [this.ensureRelationshipActorForProfile(profile, actorState)],
      severity: 45,
      loudness: 12,
      tags: ['relationship', 'marriage', 'deep-lying-bouquet'],
      summary: `${profile.displayName} married you after the bouquet returned.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { relationshipId: profile.id, questId: instance.questId, ok: result.ok },
    });
    return result;
  }

  applyRelationshipBranchChoice(
    profile: RelationshipCandidateProfile,
    branch: DatingBranchChoice,
    kind: Extract<RelationshipChoice, 'talk' | 'flirt' | 'date'>,
  ): RelationshipEventResult {
    const state = this.relationshipController.ensureCandidate(profile, this.getRoomsVisitedCount());
    const result = this.relationshipController.applyBranchChoice(
      state.id,
      branch,
      this.getRoomsVisitedCount(),
      kind,
    );
    this.applyRelationshipReward(result.reward);
    if (result.becameHostile && profile.homeRoomId) {
      this.spawnRelationshipHostile(
        profile.homeRoomId,
        state.id,
        state.displayName,
        this.getRelationshipNpcPosition(profile),
      );
    }
    this.emitWorldEvent({
      type: 'relationship-choice',
      roomId: this.snake.currentRoomId,
      targetActorIds: [this.ensureRelationshipActorForProfile(profile, result.state ?? state)],
      severity: result.becameHostile ? 45 : 14,
      loudness: 8,
      tags: ['relationship', kind, 'branch'],
      summary: `${profile.displayName} reacted to ${branch.label}.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { relationshipId: state.id, branchId: branch.id, kind, ok: result.ok },
    });
    return result;
  }

  private completeRelationshipMarriage(relationshipId: string): void {
    const result = this.relationshipController.completeMarriage(
      relationshipId,
      this.getRoomsVisitedCount(),
    );
    this.applyRelationshipReward(result.reward);
    const state = this.relationshipController.getState(relationshipId) ?? result.state;
    if (state) {
      this.emitWorldEvent({
        type: 'relationship-choice',
        roomId: this.snake.currentRoomId,
        targetActorIds: [this.ensureRelationshipActorForState(state)],
        severity: 50,
        loudness: 20,
        tags: ['relationship', 'marriage'],
        summary: `You married ${state.displayName}.`,
        createdAtRoomNumber: this.getRoomsVisitedCount(),
        data: { relationshipId },
      });
    }
    this.setFlag('ui.relationshipEvent', {
      title: result.title,
      message: result.message,
      color: result.color,
    });
  }

  giveRelationshipGift(
    profile: RelationshipCandidateProfile,
    itemId: string,
  ): RelationshipEventResult {
    const item = getItem(itemId);
    if (!item || this.inventory.getItemCount(itemId) <= 0) {
      return {
        ok: false,
        title: profile.displayName,
        message: 'The gift is not in your pack.',
        color: '#ff6b6b',
      };
    }
    this.relationshipController.ensureCandidate(profile, this.getRoomsVisitedCount());
    this.inventory.removeItem(itemId, 1);
    const result = this.relationshipController.applyGift(
      profile.id,
      itemId,
      item.name,
      this.getGiftTags(itemId),
      this.getRoomsVisitedCount(),
    );
    this.applyRelationshipReward(result.reward);
    if (result.becameHostile && profile.homeRoomId) {
      this.spawnRelationshipHostile(
        profile.homeRoomId,
        profile.id,
        profile.displayName,
        this.getRelationshipNpcPosition(profile),
      );
    }
    this.emitWorldEvent({
      type: 'relationship-choice',
      roomId: this.snake.currentRoomId,
      targetActorIds: [this.ensureRelationshipActorForProfile(profile, result.state)],
      severity: result.becameHostile ? 45 : 10,
      loudness: 5,
      tags: ['relationship', 'gift', itemId],
      summary: `You gave ${item.name} to ${profile.displayName}.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { relationshipId: profile.id, itemId, ok: result.ok },
    });
    return result;
  }

  pickpocketRelationshipNpc(profile: RelationshipCandidateProfile): RelationshipEventResult & {
    rewardScore: number;
    itemId?: string;
  } {
    const room = this.getCurrentRoom();
    const town = room.town;
    const initiationStatus = this.getCurrentTownGuildInitiationStatus();
    if (
      !town ||
      (initiationStatus.state !== 'active' &&
        initiationStatus.state !== 'ready' &&
        initiationStatus.state !== 'complete')
    ) {
      return {
        ok: false,
        title: profile.displayName,
        message: 'You need a thieves guild test before picking pockets with any dignity.',
        color: '#ff6b6b',
        rewardScore: 0,
      };
    }
    if (this.isTownRoomHostile(town, room.id)) {
      return {
        ok: false,
        title: profile.displayName,
        message: 'The town is openly hostile. No one is holding still for pocket work.',
        color: '#ff6b6b',
        rewardScore: 0,
      };
    }

    this.relationshipController.ensureCandidate(profile, this.getRoomsVisitedCount());
    const targetActorId = this.ensureRelationshipActorForProfile(profile);
    const caught =
      this._rng() <
      Math.min(
        0.65,
        0.18 + town.wantedLevel * 0.08 - Math.max(0, town.thievesGuild?.karma ?? 0) / 300,
      );
    const rewardScore = caught
      ? Math.max(1, 3 + Math.floor(this._rng() * 5))
      : 8 + Math.floor(this._rng() * 15);
    const itemId =
      !caught && this._rng() < 0.35
        ? this._rng() < 0.5
          ? 'stolen-signet'
          : 'forged-town-permit'
        : undefined;
    this.addScore(rewardScore);
    if (itemId) {
      this.inventory.addItem(itemId, 1);
      this.setFlag('ui.itemReward', { itemId, count: 1 });
    }
    let guildTestLine = '';
    if (!caught && initiationStatus.state === 'active') {
      const nextPickpockets = Math.min(initiationStatus.required, initiationStatus.pickpockets + 1);
      this.setFlag(this.guildInitiationPickpocketsFlagKey(town.id), nextPickpockets);
      guildTestLine =
        nextPickpockets >= initiationStatus.required
          ? ' Guild test complete: return to the grate.'
          : ` Guild test: ${nextPickpockets}/${initiationStatus.required} pockets lifted.`;
    }

    if (caught) {
      const relationship = this.relationshipController.applyChoice(
        profile.id,
        'mean',
        this.getRoomsVisitedCount(),
      );
      const crime = this.applyCurrentTownCrime('theft', true, 2);
      this.emitWorldEvent({
        type: 'pickpocket',
        roomId: room.id,
        targetActorIds: [targetActorId],
        severity: 42,
        loudness: 35,
        tags: ['crime', 'pickpocket', 'caught'],
        summary: `${profile.displayName} caught you picking pockets.`,
        createdAtRoomNumber: this.getRoomsVisitedCount(),
        data: { relationshipId: profile.id, rewardScore, itemId, caught: true },
      });
      if (relationship.becameHostile && profile.homeRoomId) {
        this.spawnRelationshipHostile(
          room.id,
          profile.id,
          profile.displayName,
          this.getRelationshipNpcPosition(profile),
        );
      }
      return {
        ...relationship,
        rewardScore,
        itemId,
        message: `Caught. You still lifted ${rewardScore} score, but ${profile.displayName} noticed. ${crime.message}`,
        color: '#ff6b6b',
      };
    }

    if (this._rng() < 0.25) {
      const relationship = this.relationshipController.applyChoice(
        profile.id,
        'mean',
        this.getRoomsVisitedCount(),
      );
      this.emitWorldEvent({
        type: 'pickpocket',
        roomId: room.id,
        targetActorIds: [targetActorId],
        severity: 22,
        loudness: 12,
        tags: ['crime', 'pickpocket', 'noticed'],
        summary: `${profile.displayName} sensed a pocket go wrong.`,
        createdAtRoomNumber: this.getRoomsVisitedCount(),
        data: { relationshipId: profile.id, rewardScore, itemId, caught: false, noticed: true },
      });
      return {
        ...relationship,
        rewardScore,
        itemId,
        message: `Clean fingers, dirty feeling. You lifted ${rewardScore} score${itemId ? ' and a little contraband' : ''}, but ${profile.displayName} senses something off.${guildTestLine}`,
        color: '#ffd166',
      };
    }

    this.emitWorldEvent({
      type: 'pickpocket',
      roomId: room.id,
      targetActorIds: [targetActorId],
      severity: 14,
      loudness: 2,
      tags: ['crime', 'pickpocket', 'unnoticed'],
      summary: `You picked ${profile.displayName}'s pocket unnoticed.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { relationshipId: profile.id, rewardScore, itemId, caught: false },
    });
    return {
      ok: true,
      title: profile.displayName,
      message: `You lifted ${rewardScore} score${itemId ? ' and a little contraband' : ''}. No one has made the correct accusation yet.${guildTestLine}`,
      color: '#b6ff6a',
      state: this.relationshipController.getState(profile.id),
      rewardScore,
      itemId,
    };
  }

  createDeathRescuerRelationship(rescuer: 'angel' | 'goblin-angel'): RelationshipCandidateProfile {
    return {
      id: `death-rescuer:${rescuer}`,
      displayName: rescuer === 'goblin-angel' ? 'The Goblin Angel' : 'The Angel',
      species: rescuer,
      portraitId: rescuer === 'goblin-angel' ? 'goblin-hostile' : 'sage-3',
      factionId: rescuer === 'goblin-angel' ? 'goblin-camps' : 'hearthbound-remnant',
    };
  }

  romanceDeathRescuer(rescuer: 'angel' | 'goblin-angel'): RelationshipEventResult {
    const profile = this.createDeathRescuerRelationship(rescuer);
    this.relationshipController.ensureCandidate(profile, this.getRoomsVisitedCount());
    const first = this.relationshipController.applyChoice(
      profile.id,
      'flirt',
      this.getRoomsVisitedCount(),
    );
    if (!first.ok) return first;
    return this.relationshipController.applyChoice(
      profile.id,
      'ask-out',
      this.getRoomsVisitedCount(),
    );
  }

  popRelationshipCutscene(relationshipId?: string): RelationshipCutscene | undefined {
    return this.relationshipController.popNextCutscene(relationshipId, this.getRoomsVisitedCount());
  }

  getRelationshipSocialContext() {
    return this.relationshipController.getSocialContext();
  }

  private applyRelationshipReward(reward: RelationshipReward | undefined): void {
    if (!reward) {
      return;
    }
    switch (reward.kind) {
      case 'item':
        this.inventory.addItem(reward.itemId, reward.count);
        this.setFlag('ui.itemReward', {
          itemId: reward.itemId,
          count: reward.count,
          source: 'relationship',
        });
        break;
      case 'card': {
        const cardId = reward.cardId === 'random' ? this.pickRandomCardId() : reward.cardId;
        if (getCardDefinition(cardId as CardId)) {
          this.addCardToCollection(cardId as CardId, 1);
        }
        break;
      }
      case 'perk':
        this.setFlag(`relationships.perk.${reward.perkId}`, true);
        this.setFlag('ui.relationshipReward', { reward });
        break;
      case 'temporaryBuff':
        this.setFlag(`relationships.buff.${reward.buffId}`, {
          durationRooms: reward.durationRooms,
          startedRoom: this.getRoomsVisitedCount(),
        });
        this.setFlag('ui.relationshipReward', { reward });
        break;
      case 'shopDiscount':
        this.setFlag('relationships.shopDiscount', {
          factionId: reward.factionId,
          rooms: reward.rooms,
          startedRoom: this.getRoomsVisitedCount(),
        });
        this.setFlag('ui.relationshipReward', { reward });
        break;
      case 'mapHint':
        this.setFlag('relationships.mapHint', { roomId: reward.roomId });
        this.setFlag('ui.relationshipReward', { reward });
        break;
      case 'rescueChance':
        this.setFlag('relationships.rescueChance', reward.percent);
        this.setFlag('ui.relationshipReward', { reward });
        break;
      case 'cosmetic':
        this.addCosmeticReward('style', reward.cosmeticId);
        this.setFlag('ui.relationshipReward', { reward });
        break;
      case 'score':
        this.addScore(reward.amount);
        this.setFlag('ui.relationshipReward', { reward });
        break;
    }
  }

  addCardToCollection(cardId: CardId, count = 1): void {
    if (this.isArchipelagoModeActive() && AP_CARD_LOCATION_KEY_BY_CARD_ID[cardId]) {
      this.queueArchipelagoLocalRewardCheck({ kind: 'card', id: cardId });
      this.setFlag('ui.cardReward', { cardId, count: 0 });
      return;
    }
    const collection = this.getFlag<CardCollection>('cards.collection') ?? {};
    const next = { ...collection, [cardId]: Math.max(0, Number(collection[cardId] ?? 0)) + count };
    this.setFlag('cards.collection', next);
    this.setFlag('ui.cardReward', { cardId, count });
  }

  grantCard(cardId: string, count = 1): void {
    if (getCardDefinition(cardId as CardId)) {
      const collection = this.getFlag<CardCollection>('cards.collection') ?? {};
      const next = {
        ...collection,
        [cardId]: Math.max(0, Number(collection[cardId as CardId] ?? 0)) + count,
      };
      this.setFlag('cards.collection', next);
      this.setFlag('ui.cardReward', { cardId, count });
    }
  }

  private migrateWorldEffectCardsToItems(): void {
    const collection = this.getFlag<Record<string, number>>('cards.collection');
    if (!collection) {
      return;
    }

    let changed = false;
    const next: Record<string, number> = { ...collection };
    for (const [legacyCardId, itemId] of Object.entries(CARD_TO_ITEM_MIGRATION)) {
      const count = Math.max(0, Math.floor(Number(next[legacyCardId] ?? 0)));
      if (count <= 0) {
        continue;
      }
      this.inventory.addItem(itemId, count);
      delete next[legacyCardId];
      changed = true;
    }

    if (changed) {
      this.setFlag('cards.collection', next);
      this.setFlag('ui.itemReward', { migratedCards: true });
    }
  }

  private pickRandomCardId(): CardId {
    const index = Math.floor(this._rng() * CARD_SHOP_OFFERS.length);
    return CARD_SHOP_OFFERS[Math.max(0, Math.min(CARD_SHOP_OFFERS.length - 1, index))]!;
  }

  addCosmeticReward(type: 'style' | 'hat', id: string): void {
    const pending =
      this.getFlag<Array<{ type: 'style' | 'hat'; id: string }>>('quest.pendingCosmeticRewards') ??
      [];
    this.setFlag('quest.pendingCosmeticRewards', [...pending, { type, id }]);
  }

  getSaveData(): GameSaveData {
    const characterFlags: Record<string, unknown> = {};
    for (const key of [
      'cards.collection',
      'factions.alignment',
      'rumors.save',
      'factions.v2.save',
      'wards.contracts',
      'wards.usage',
      'followers.active',
      'relationships.states',
      'relationships.lastEncountered',
      'skills.ranks',
      'skills.ownership',
      'equipment.wallSenseRadiusBonus',
      'equipment.seismicPulseRadiusBonus',
      'equipment.masonryEnabled',
      'equipment.invulnerabilityBonus',
      'equipment.regenerator',
      'equipment.phoenixCharges',
      'equipment.itemPhoenixCharges',
      'equipment.gunEnabled',
      'equipment.heatResistance',
      'equipment.coldResistance',
      'equipment.swimmingEnabled',
      'equipment.refundEveryRooms',
      'equipment.appleScorePenalty',
      'equipment.hazardMapSense',
      'equipment.radiationTimerScalar',
      'quest.staged.instances',
      'quest.staged.completedNow',
      'quest.staged.failedNow',
      'quest.staged.radiationLastTickMs',
      'quest.activeMarkerId',
      'ui.minimap.unlocked',
      'ui.minimap.enabled',
      'player.health',
      'player.maxHealth',
      'world.rumors',
      'starforged.state',
      'starforged.active',
      'starforged.available',
      'starforged.panelOpen',
      'starforged.power',
      'starforged.superEnergy',
      'starforged.abilityEnergy',
      'starforged.effects',
      'starforged.wallSenseBonus',
      'artifacts.run',
      'caves.save',
      'minecraft.save',
      'fishing.caughtFish',
      'achievement.hotSurvivalMs',
      'achievement.coldSurvivalMs',
      'achievement.cowbellTilesWalked',
      'achievement.trainZonesTraveled',
      'animals.companions',
    ]) {
      const value = this.getFlag(key);
      if (value !== undefined) {
        characterFlags[key] = value;
      }
    }
    for (const [key, value] of Object.entries(this.snake.flags)) {
      if (
        (key.startsWith('town.runtime.') ||
          key.startsWith('town.gateOpened.') ||
          key.startsWith('custom.') ||
          key.startsWith('relationships.')) &&
        value !== undefined
      ) {
        characterFlags[key] = value;
      }
    }
    const actorSave = this.actors.toSaveData();
    characterFlags['actors.save'] = actorSave.actors;
    characterFlags['events.save'] = actorSave.events;
    characterFlags['rumors.save'] = this.rumors.save();
    characterFlags['factions.v2.save'] = this.factionEvents.save();
    const data: GameSaveData = {
      version: '1.0.0',
      timestamp: Date.now(),
      characterMode: this.characterMode,
      raccoonWeight: this.raccoonWeight,
      raccoonHunger: this.getPlayerHealth().current,
      raccoonHungerTimer: this.raccoonHungerTimerMs,
      raccoonBanditMeter: this.raccoonBanditMeter,
      raccoonStashedTotal: this.raccoonStashedTotal,
      snakeLength: this.snake.bodySegments.length,
      snakeBody: Array.from(this.snake.bodySegments, (segment) => ({ ...segment })),
      snakeDirection: { ...this.snake.directionVector },
      snakeRoomId: this.snake.currentRoomId,
      playerHealth: this.getPlayerHealth().current,
      playerMaxHealth: this.getPlayerHealth().max,
      score: this.getScore(),
      inventory: Object.fromEntries(this.inventory.getAllItems()),
      equipment: Object.fromEntries(this.inventory.getAllEquipped()),
      flags: characterFlags,
      worldGeneration: this.worldGenerationIdentity,
      atmosphere: this.atmosphere.getState(),
      special: this.specialStats.exportState(),
      levelProgression: this.levelProgression,
      questsActive: this.questController.getActive().map((q: Quest) => q.id),
      questsCompleted: this.questController.getCompletedIds(),
      questsAccepted: this.questController.getAcceptedIds(),
    };

    const religionId = this.getFlag<string>('religion.id');
    const religionMods = this.getFlag<Record<string, unknown>>('religion.mods');

    if (religionId || religionMods) {
      data.religionId = religionId;
      data.religionMods = religionMods;
    }

    const classId = this.getFlag<string>('class.id');
    const classMods = this.getFlag<Record<string, unknown>>('class.mods');

    if (classId || classMods) {
      data.classId = classId;
      data.classMods = classMods;
    }

    const backgroundId = this.getFlag<string>('background.id');
    const backgroundMods = this.getFlag<Record<string, unknown>>('background.mods');

    if (backgroundId || backgroundMods) {
      data.backgroundId = backgroundId;
      data.backgroundMods = backgroundMods;
    }

    if (this.snakeScene && typeof this.snakeScene.getSnakeCustomizationState === 'function') {
      const cosmetics = this.snakeScene.getSnakeCustomizationState();
      data.cosmetics = cosmetics;
    }
    if (this.snakeScene && typeof this.snakeScene.getAchievementSaveState === 'function') {
      data.achievements = this.snakeScene.getAchievementSaveState();
    }
    if (this.snakeScene && typeof this.snakeScene.getArcadeSnakeSaveData === 'function') {
      data.arcadeSnake = this.snakeScene.getArcadeSnakeSaveData();
    }

    // Fishing data
    const caughtFish = this.getFlag<Record<string, number>>('fishing.caughtFish');
    if (caughtFish && Object.keys(caughtFish).length > 0) {
      data.fishing = { caughtFish };
    }

    return data;
  }

  saveGame(): void {
    try {
      const data = this.getSaveData();
      this.setFlag('timeMs', Date.now());
      setSavedGameData(JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  }

  loadGame(
    getReligionChoice?: () => any,
    getClassChoice?: () => any,
    getBackgroundChoice?: () => any,
  ): boolean {
    try {
      const saved = getSavedGameData();
      if (!saved) {
        return false;
      }

      const data = JSON.parse(saved) as GameSaveData;
      return this.loadFromData(data, getReligionChoice, getClassChoice, getBackgroundChoice);
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }

  loadFromSaveData(
    data: GameSaveData,
    getReligionChoice?: () => any,
    getClassChoice?: () => any,
    getBackgroundChoice?: () => any,
  ): boolean {
    return this.loadFromData(data, getReligionChoice, getClassChoice, getBackgroundChoice);
  }

  private loadFromData(
    data: GameSaveData,
    getReligionChoice?: () => any,
    getClassChoice?: () => any,
    getBackgroundChoice?: () => any,
  ): boolean {
    try {
      this.reset({ preserveRunSeed: true });
      this.specialStats.restore(data.special);
      this.levelProgression = normalizeLevelProgressionState(data.levelProgression, data.score);
      if (!data.levelProgression) {
        const committed = this.specialStats.getCommittedState();
        const allocatedPoints = Object.values(committed.stats).reduce(
          (total, value) => total + Math.max(0, value - 5),
          0,
        );
        const missingPoints = Math.max(
          0,
          this.levelProgression.level - 1 - allocatedPoints - committed.unspentPoints,
        );
        this.specialStats.grantUnspentPoints(missingPoints);
      }
      this.characterMode = normalizeCharacterMode(
        data.characterMode ?? data.flags?.['character.mode'],
      );
      this.raccoonWeight = Math.max(
        0,
        Math.floor(Number(data.raccoonWeight ?? data.flags?.['raccoon.weight'] ?? 0)),
      );
      this.raccoonHungerTimerMs = Math.max(
        0,
        Number(data.raccoonHungerTimer ?? data.flags?.['raccoon.hungerTimerMs'] ?? 0),
      );
      this.raccoonBanditMeter = Math.max(
        0,
        Number(data.raccoonBanditMeter ?? data.flags?.['raccoon.banditMeter'] ?? 0),
      );
      this.raccoonStashedTotal = Math.max(
        0,
        Number(data.raccoonStashedTotal ?? data.flags?.['raccoon.stashedTotal'] ?? 0),
      );
      if (data.worldGeneration) {
        this.worldGenerationIdentity = data.worldGeneration;
        this._rng = createRng(data.worldGeneration.seed);
        this.world = new WorldService(
          this.config.grid,
          this.config.world,
          this._rng,
          this.worldGenerationIdentity,
          this.createPickupChanceProvider(),
        );
        this.apples = this.createAppleService();
        this.enemies = new EnemyManager(this.config.grid, this._rng);
        this.enemies.setRoamingSnakeConfig(this.config.roamingSnakes);
        this.animals = new AnimalManager(this.config.grid, this._rng);
        this.atmosphere.reset(data.worldGeneration.seed);
        this.questController = new QuestController(this.registry, {
          initialQuestCount: this.config.quests.initialQuestCount,
          initialQuestIds: this.config.quests.initialQuestIds ?? [],
          maxActiveQuests: this.config.quests.maxActiveQuests,
          questOfferChance: this.config.quests.questOfferChance,
          rng: this._rng,
        });
        logRunSeed(data.worldGeneration.seed, 'load');
      }
      this.atmosphere.hydrate(data.atmosphere);
      if (data.snakeBody?.length && data.snakeDirection && data.snakeRoomId) {
        this.snake.restoreFromSave(
          data.snakeBody,
          data.snakeDirection,
          data.snakeRoomId,
          data.snakeLength ?? data.snakeBody.length,
        );
      }
      this.setScore(data.score);
      if (typeof data.playerHealth === 'number') {
        this.setFlag('player.health', data.playerHealth);
      }
      if (this.isRaccoonMode() && typeof data.raccoonHunger === 'number') {
        this.setFlag('player.health', data.raccoonHunger);
      }
      if (typeof data.playerMaxHealth === 'number') {
        this.setFlag('player.maxHealth', data.playerMaxHealth);
      }
      if (this.isRaccoonMode()) {
        this.snake.keepHeadOnly();
        this.syncRaccoonFlags();
      }

      for (const [key, value] of Object.entries(data.inventory)) {
        this.inventory.addItem(key, value);
      }

      for (const [slot, itemId] of Object.entries(data.equipment)) {
        const item = getItem(itemId);
        if (item) {
          this.inventory.equip(item);
        }
      }

      for (const [key, value] of Object.entries(data.flags ?? {})) {
        if (value !== undefined) {
          this.setFlag(key, value);
        }
      }
      const currentRoom = this.world.getRoom(this.snake.currentRoomId);
      this.animals.ensureAnimals(
        this.snake.currentRoomId,
        currentRoom,
        [],
        this.getAtmosphereForRoom(currentRoom),
      );
      const currentHead = this.snake.bodySegments[0];
      if (currentHead) {
        const [roomX, roomY] = this.snake.currentRoomId.split(',').map(Number);
        this.animals.restoreTamedAnimals(this.snake.currentRoomId, this.getAnimalCompanionState(), {
          x: currentHead.x - roomX * this.config.grid.cols,
          y: currentHead.y - roomY * this.config.grid.rows,
        });
      }
      this.setFlag('save.loadedAchievements', data.achievements);
      const caveSave = this.getFlag<CaveSaveState>('caves.save');
      if (caveSave) {
        for (const save of Object.values(caveSave.caveInstances)) {
          this.world.setCaveSave(save);
        }
      }
      this.actors.loadSaveData({
        actors: this.getFlag<ActorSystemSaveData['actors']>('actors.save') ?? {
          version: 1,
          actors: {},
          knownActorIds: [],
          promotedActorIds: [],
          deadActorIds: [],
        },
        events: this.getFlag<ActorSystemSaveData['events']>('events.save') ?? {
          version: 1,
          events: [],
        },
      });
      this.rumors.load(this.getFlag<RumorSaveData>('rumors.save'));
      this.factionEvents.load(this.getFlag<FactionSaveData>('factions.v2.save'));
      this.migrateWorldEffectCardsToItems();

      this.questController.restoreQuestIds(
        {
          active: data.questsActive,
          completed: data.questsCompleted,
          accepted: data.questsAccepted,
        },
        this,
      );

      const getReligion = getReligionChoice || (() => null);
      const getClass = getClassChoice || (() => null);
      const getBackground = getBackgroundChoice || (() => null);

      if (data.religionId) {
        const religion = getReligion();
        if (religion && religion.id === data.religionId) {
          this.setFlag('religion.id', data.religionId);
          this.setFlag('religion.mods', data.religionMods);
        }
      }

      if (data.classId) {
        const cls = getClass();
        if (cls && cls.id === data.classId) {
          this.setFlag('class.id', data.classId);
          this.setFlag('class.mods', data.classMods);
        }
      }

      if (data.backgroundId) {
        const bg = getBackground();
        if (bg && bg.id === data.backgroundId) {
          this.setFlag('background.id', data.backgroundId);
          this.setFlag('background.mods', data.backgroundMods);
        }
      }

      if (
        data.cosmetics &&
        this.snakeScene &&
        typeof this.snakeScene.setSnakeCosmeticState === 'function'
      ) {
        this.snakeScene.setSnakeCosmeticState(data.cosmetics);
      }
      if (this.snakeScene && typeof this.snakeScene.setArcadeSnakeSaveData === 'function') {
        this.snakeScene.setArcadeSnakeSaveData(data.arcadeSnake);
      }

      if (this.getRadiationTimer()) {
        this.setFlag('quest.staged.radiationLastTickMs', this.getFlag<number>('timeMs') ?? 0);
      }
      this.respawnMissingStagedBossesAfterLoad();

      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }

  hasSaveFile(): boolean {
    try {
      return Boolean(getSavedGameData());
    } catch {
      return false;
    }
  }

  clearSaveFile(): void {
    try {
      clearSavedGameData();
    } catch (error) {
      console.error('Failed to clear save file:', error);
    }
  }

  private getStagedQuestInstances(): StagedQuestInstance[] {
    const value = this.getFlag<StagedQuestInstance[]>('quest.staged.instances');
    return Array.isArray(value) ? value : [];
  }

  private setStagedQuestInstances(instances: StagedQuestInstance[]): void {
    this.setFlag('quest.staged.instances', instances);
  }

  private updateStagedQuestInstance(
    questId: string,
    updater: (instance: StagedQuestInstance) => StagedQuestInstance,
  ): void {
    this.setStagedQuestInstances(
      this.getStagedQuestInstances().map((instance) =>
        instance.questId === questId ? updater(instance) : instance,
      ),
    );
  }

  private startTaxCollectorQuest(giverRoomId: string): void {
    if (
      this.getStagedQuestInstances().some(
        (instance) => instance.questId === 'tax-collector-future-body',
      )
    ) {
      return;
    }
    const usedRooms = new Set<string>([giverRoomId]);
    const offices = Array.from({ length: 3 }, (_, index) => {
      const roomId = this.pickObjectiveRoom(
        giverRoomId,
        5,
        8,
        index,
        (candidate) => !usedRooms.has(candidate),
      );
      usedRooms.add(roomId);
      return {
        id: `office-${index + 1}`,
        roomId,
        paid: false,
      };
    });
    this.setStagedQuestInstances([
      ...this.getStagedQuestInstances(),
      {
        questId: 'tax-collector-future-body',
        giverRoomId,
        stage: 'visit-offices',
        offices,
      },
    ]);
  }

  private startFindMyBabyQuest(giverRoomId: string): void {
    if (this.getStagedQuestInstances().some((instance) => instance.questId === 'find-my-baby')) {
      return;
    }
    const targetRoomId = this.pickObjectiveRoom(
      giverRoomId,
      5,
      8,
      11,
      (candidate) => candidate !== giverRoomId && getBiomeForRoom(candidate).id !== 'sunken-ocean',
    );
    this.setStagedQuestInstances([
      ...this.getStagedQuestInstances(),
      {
        questId: 'find-my-baby',
        giverRoomId,
        stage: 'find-baby',
        targetRoomId,
      },
    ]);
  }

  private startDeepLyingBouquetQuest(relationshipId: string): void {
    if (
      this.getStagedQuestInstances().some((instance) => instance.questId === 'deep-lying-bouquet')
    ) {
      return;
    }
    const giverRoomId = this.snake.currentRoomId;
    const offered = this.questController.offerSpecificQuestById(
      'deep-lying-bouquet',
      this,
      giverRoomId,
    );
    if (offered) {
      this.questController.acceptOffered(this);
    }
    const targetRoomId = this.pickObjectiveRoom(
      giverRoomId,
      7,
      15,
      31,
      (candidate) =>
        candidate !== giverRoomId && getBiomeForRoom(candidate).temperatureHazard === 'cold',
    );
    this.setStagedQuestInstances([
      ...this.getStagedQuestInstances(),
      {
        questId: 'deep-lying-bouquet',
        giverRoomId,
        stage: 'find-bouquet',
        targetRoomId,
        relationshipId,
      },
    ]);
    this.setFlag('ui.questInteraction', {
      message: 'Wedding quest started: find the Deep-Lying Bouquet in the cold depths.',
    });
  }

  private startGoblinLedgerDebtQuest(giverRoomId: string): void {
    if (
      this.getStagedQuestInstances().some((instance) => instance.questId === 'goblin-ledger-debt')
    ) {
      return;
    }
    const targetRoomId = this.pickObjectiveRoom(
      giverRoomId,
      4,
      7,
      19,
      (candidate) => candidate !== giverRoomId && getBiomeForRoom(candidate).id !== 'sunken-ocean',
    );
    this.setStagedQuestInstances([
      ...this.getStagedQuestInstances(),
      {
        questId: 'goblin-ledger-debt',
        giverRoomId,
        stage: 'find-goblin-stamp',
        targetRoomId,
      },
    ]);
  }

  private startFreakYouQuest(giverRoomId: string): void {
    if (this.getStagedQuestInstances().some((instance) => instance.questId === 'freak-you')) {
      return;
    }
    const targetRoomId = this.pickObjectiveRoom(
      giverRoomId,
      1,
      2,
      23,
      (candidate) => candidate !== giverRoomId && getBiomeForRoom(candidate).id !== 'sunken-ocean',
    );
    const portal = this.prepareFreakYouPortalRoom(targetRoomId);
    const bossId = this.bosses.spawnFreakYou(targetRoomId) ?? undefined;
    this.setFlag('ui.questInteraction', {
      message: 'A portal opens nearby. A future version of you unfolds through it.',
    });
    this.setFlag('ui.freakYouPortal', {
      roomId: targetRoomId,
      x: portal.x,
      y: portal.y,
      startedAtMs: this.getFlag<number>('timeMs') ?? 0,
      durationMs: 3500,
    });
    this.setStagedQuestInstances([
      ...this.getStagedQuestInstances(),
      {
        questId: 'freak-you',
        giverRoomId,
        stage: 'survive-freak-you',
        targetRoomId,
        bossId,
      },
    ]);
  }

  private startGreenPurchaseQuest(giverRoomId: string): void {
    if (this.getStagedQuestInstances().some((instance) => instance.questId === 'green-purchase')) {
      return;
    }
    const targetRoomId =
      this.findForestRoomNear(giverRoomId, 10, 12, true) ??
      this.pickObjectiveRoom(
        giverRoomId,
        10,
        12,
        7,
        (roomId) => getBiomeForRoom(roomId).id === 'elderwood-maze',
      );
    this.setStagedQuestInstances([
      ...this.getStagedQuestInstances(),
      {
        questId: 'green-purchase',
        giverRoomId,
        stage: 'find-forest-teleporter',
        targetRoomId,
      },
    ]);
  }

  private startStarforgedHeliopauseQuest(giverRoomId: string): { message?: string } {
    if (
      this.getStagedQuestInstances().some(
        (instance) =>
          instance.questId === 'starforged-heliopause' &&
          instance.stage !== 'failed' &&
          instance.stage !== 'completed',
      ) ||
      this.getFlag<boolean>('starforged.active')
    ) {
      return { message: 'The signal is already on your map.' };
    }
    const targetRoomId = this.pickObjectiveRoom(
      giverRoomId,
      6,
      10,
      37,
      (candidate) => candidate !== giverRoomId && getBiomeForRoom(candidate).id !== 'sunken-ocean',
    );
    this.setFlag('starforged.envoyRoomId', giverRoomId);
    this.setStagedQuestInstances([
      ...this.getStagedQuestInstances(),
      {
        questId: 'starforged-heliopause',
        giverRoomId,
        stage: 'find-heliopause-artifact',
        targetRoomId,
      },
    ]);
    return { message: 'A strange artifact signal has been marked on your quest map.' };
  }

  private ensureGreenPurchaseCheatGiver(): void {
    this.ensureQuestCheatGiver(
      'npc-the-green-buyer',
      'The Green Buyer',
      'sage-3',
      'The Green Buyer appears with an urgent errand.',
    );
  }

  private ensureQuestCheatGiver(id: string, name: string, styleId: string, message: string): void {
    const room = this.world.getRoom(this.snake.currentRoomId);
    if (room.questGiver) {
      return;
    }
    const spawn = this.findEncounterSpawn(room.id) ?? {
      x: Math.floor(this.config.grid.cols / 2),
      y: Math.floor(this.config.grid.rows / 2),
    };
    const profile = buildHouseNpcProfile(name, styleId);
    room.questGiver = {
      ...profile,
      id,
      x: spawn.x,
      y: spawn.y,
    };
    const layout = room.layout.map((row) => row.split(''));
    if (layout[spawn.y]?.[spawn.x]) {
      layout[spawn.y][spawn.x] = '.';
      room.layout = layout.map((row) => row.join(''));
    }
    this.setFlag('ui.questInteraction', { message });
  }

  private prepareFreakYouPortalRoom(roomId: string): Vector2Like {
    const room = this.world.getRoom(roomId);
    const center = {
      x: Math.floor(this.config.grid.cols / 2),
      y: Math.floor(this.config.grid.rows / 2),
    };
    const layout = room.layout.map((row) => row.split(''));
    for (let y = center.y - 8; y <= center.y + 8; y += 1) {
      for (let x = center.x - 10; x <= center.x + 10; x += 1) {
        if (!layout[y]?.[x]) {
          continue;
        }
        layout[y][x] = '.';
      }
    }
    room.layout = layout.map((row) => row.join(''));
    return center;
  }

  private pickOffsetRoom(
    originRoomId: string,
    minDistance: number,
    maxDistance: number,
    salt: number,
  ): string {
    const [x = 0, y = 0, z = 0] = originRoomId.split(',').map(Number);
    const distance =
      minDistance + Math.floor(this._rng() * Math.max(1, maxDistance - minDistance + 1));
    const variants = [
      { dx: distance, dy: Math.floor(distance * 0.35) },
      { dx: -distance, dy: -Math.floor(distance * 0.35) },
      { dx: Math.floor(distance * 0.35), dy: distance },
      { dx: -Math.floor(distance * 0.35), dy: -distance },
      { dx: distance, dy: -Math.floor(distance * 0.4) },
      { dx: -distance, dy: Math.floor(distance * 0.4) },
    ];
    const pick =
      variants[(Math.floor(this._rng() * variants.length) + salt) % variants.length] ?? variants[0];
    return `${x + pick.dx},${y + pick.dy},${z}`;
  }

  private pickObjectiveRoom(
    originRoomId: string,
    minRadius: number,
    maxRadius: number,
    salt: number,
    predicate: (roomId: string) => boolean = () => true,
  ): string {
    const candidates = this.getObjectiveRoomCandidates(originRoomId, minRadius, maxRadius);
    const offset = Math.floor(this._rng() * Math.max(1, candidates.length));
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[(index + offset + salt) % candidates.length];
      if (predicate(candidate)) {
        return candidate;
      }
    }
    return this.pickOffsetRoom(originRoomId, minRadius, maxRadius, salt);
  }

  private getObjectiveRoomCandidates(
    originRoomId: string,
    minRadius: number,
    maxRadius: number,
  ): string[] {
    const [x = 0, y = 0, z = 0] = originRoomId.split(',').map(Number);
    const candidates: string[] = [];
    for (let dy = -maxRadius; dy <= maxRadius; dy += 1) {
      for (let dx = -maxRadius; dx <= maxRadius; dx += 1) {
        const radius = Math.max(Math.abs(dx), Math.abs(dy));
        if (radius < minRadius || radius > maxRadius) {
          continue;
        }
        candidates.push(`${x + dx},${y + dy},${z}`);
      }
    }
    return candidates;
  }

  private findForestRoomNear(
    originRoomId: string,
    minRadius: number,
    maxRadius: number,
    randomize = false,
  ): string | null {
    const candidates = this.getObjectiveRoomCandidates(originRoomId, minRadius, maxRadius).filter(
      (candidate) => getBiomeForRoom(candidate).id === 'elderwood-maze',
    );
    if (candidates.length === 0) {
      return null;
    }
    if (!randomize) {
      return candidates[0];
    }
    return candidates[Math.floor(this._rng() * candidates.length)] ?? candidates[0];
  }

  private getNearbyQuestActor(): QuestRoomActor | null {
    const head = this.snake.bodySegments[0];
    if (!head) {
      return null;
    }
    const roomId = this.snake.currentRoomId;
    const [roomX = 0, roomY = 0] = roomId.split(',').map(Number);
    const local = {
      x: head.x - roomX * this.config.grid.cols,
      y: head.y - roomY * this.config.grid.rows,
    };
    return (
      this.getQuestRoomActors(roomId).find(
        (actor) => Math.abs(local.x - actor.x) + Math.abs(local.y - actor.y) <= 1,
      ) ?? null
    );
  }

  private getQuestActorAtHead(): QuestRoomActor | null {
    const head = this.snake.bodySegments[0];
    if (!head) {
      return null;
    }
    const roomId = this.snake.currentRoomId;
    const [roomX = 0, roomY = 0] = roomId.split(',').map(Number);
    const local = {
      x: head.x - roomX * this.config.grid.cols,
      y: head.y - roomY * this.config.grid.rows,
    };
    return (
      this.getQuestRoomActors(roomId).find((actor) => actor.x === local.x && actor.y === local.y) ??
      null
    );
  }

  private getQuestBabyActorPosition(): Vector2Like {
    return {
      x: Math.max(
        2,
        Math.min(this.config.grid.cols - 3, Math.floor(this.config.grid.cols / 2) + 7),
      ),
      y: Math.max(
        2,
        Math.min(this.config.grid.rows - 3, Math.floor(this.config.grid.rows / 2) + 3),
      ),
    };
  }

  private getGoblinLedgerStampActorPosition(): Vector2Like {
    return {
      x: Math.max(
        2,
        Math.min(this.config.grid.cols - 3, Math.floor(this.config.grid.cols / 2) - 6),
      ),
      y: Math.max(
        2,
        Math.min(this.config.grid.rows - 3, Math.floor(this.config.grid.rows / 2) + 4),
      ),
    };
  }

  private getDeepLyingBouquetActorPosition(): Vector2Like {
    return {
      x: Math.max(
        2,
        Math.min(this.config.grid.cols - 3, Math.floor(this.config.grid.cols / 2) + 4),
      ),
      y: Math.max(
        2,
        Math.min(this.config.grid.rows - 3, Math.floor(this.config.grid.rows / 2) - 4),
      ),
    };
  }

  private getHeliopauseArtifactActorPosition(): Vector2Like {
    return {
      x: Math.floor(this.config.grid.cols / 2),
      y: Math.floor(this.config.grid.rows / 2),
    };
  }

  private shouldShowStarforgedEnvoy(roomId: string): boolean {
    if (
      this.getFlag<boolean>('starforged.pendingFakeTitle') ||
      this.getStagedQuestInstances().some(
        (instance) =>
          instance.questId === 'starforged-heliopause' &&
          instance.stage !== 'failed' &&
          instance.stage !== 'completed',
      )
    ) {
      return this.getFlag<string>('starforged.envoyRoomId') === roomId;
    }
    const savedRoomId = this.getFlag<string>('starforged.envoyRoomId');
    if (this.getFlag<boolean>('starforged.active')) {
      return savedRoomId === roomId;
    }
    const room = this.world.getRoom(roomId);
    const district = room.town?.districtByRoomId?.[room.id];
    return district === 'tavernInterior' || district === 'tavern';
  }

  private getStarforgedEnvoyActorPosition(roomId: string): Vector2Like {
    const room = this.world.getRoom(roomId);
    const preferred = [
      { x: this.config.grid.cols - 6, y: 6 },
      { x: this.config.grid.cols - 8, y: 8 },
      { x: 6, y: 6 },
      { x: 8, y: 8 },
    ];
    for (const position of preferred) {
      if (this.isOpenQuestActorTile(room, position)) {
        return position;
      }
    }
    for (let y = 3; y < this.config.grid.rows - 3; y += 1) {
      for (let x = this.config.grid.cols - 4; x >= 3; x -= 1) {
        const position = { x, y };
        if (this.isOpenQuestActorTile(room, position)) {
          return position;
        }
      }
    }
    return {
      x: Math.floor(this.config.grid.cols / 2),
      y: Math.floor(this.config.grid.rows / 2),
    };
  }

  private isOpenQuestActorTile(room: RoomSnapshot, position: Vector2Like): boolean {
    const row = room.layout[position.y];
    const tile = row?.[position.x];
    return tile === '.';
  }

  private tryActivateQuestTeleporterAtHead(): boolean {
    const actor = this.getQuestActorAtHead();
    if (!actor || (actor.kind !== 'forest-teleporter' && actor.kind !== 'deep-teleporter')) {
      return false;
    }
    const result = this.useGreenTeleporter(actor.questId);
    if (result.message) {
      this.setFlag('ui.questInteraction', { message: result.message });
    }
    return true;
  }

  private resolveTaxOffice(
    officeId: string | undefined,
    method: 'score' | 'length' | 'duel',
  ): { completed?: Quest | null; message?: string } {
    if (!officeId) {
      return {};
    }
    const instance = this.getStagedQuestInstances().find(
      (quest) => quest.questId === 'tax-collector-future-body',
    );
    const office = instance?.offices?.find((entry) => entry.id === officeId);
    if (!instance || !office || office.paid) {
      return {};
    }
    if (method === 'score') {
      if (this.getScore() < 25) {
        return { message: 'The clerk rejects your poverty as improperly formatted.' };
      }
      this.addScore(-25);
    } else if (method === 'length') {
      if (!this.snake.shrinkTail(2)) {
        return { message: 'You are too short to survive the deduction.' };
      }
    } else if (method === 'duel') {
      this.startNamedDuel(`tax-clerk-${officeId}`, 'Tax Clerk', 0, 8);
    }
    this.updateStagedQuestInstance('tax-collector-future-body', (current) => {
      const offices = (current.offices ?? []).map((entry) =>
        entry.id === officeId ? { ...entry, paid: true, method } : entry,
      );
      return {
        ...current,
        offices,
        stage: offices.every((entry) => entry.paid) ? 'return-to-giver' : current.stage,
      };
    });
    return { message: 'Receipt stamped. Your future body becomes slightly less illegal.' };
  }

  private touchHeliopauseArtifact(questId: string): { message?: string } {
    const instance = this.getStagedQuestInstances().find((quest) => quest.questId === questId);
    if (
      !instance ||
      instance.questId !== 'starforged-heliopause' ||
      instance.stage !== 'find-heliopause-artifact'
    ) {
      return {};
    }
    this.updateStagedQuestInstance(questId, (current) => ({
      ...current,
      stage: 'completed',
    }));
    this.setFlag('starforged.pendingFakeTitle', { at: this.getFlag<number>('timeMs') ?? 0 });
    return { message: 'The artifact accepts your hand. The room forgets which game this is.' };
  }

  private pickUpQuestBaby(questId: string): { message?: string } {
    const instance = this.getStagedQuestInstances().find((quest) => quest.questId === questId);
    if (!instance || instance.questId !== 'find-my-baby' || instance.stage !== 'find-baby') {
      return {};
    }
    this.updateStagedQuestInstance(questId, (current) => ({
      ...current,
      stage: 'return-to-giver',
      carriedItemId: 'quest-baby',
    }));
    return { message: 'The baby has joined your inventory, spiritually and upsettingly.' };
  }

  private pickUpGoblinLedgerStamp(questId: string): { message?: string } {
    const instance = this.getStagedQuestInstances().find((quest) => quest.questId === questId);
    if (
      !instance ||
      instance.questId !== 'goblin-ledger-debt' ||
      instance.stage !== 'find-goblin-stamp'
    ) {
      return {};
    }
    this.updateStagedQuestInstance(questId, (current) => ({
      ...current,
      stage: 'return-to-giver',
      carriedItemId: 'goblin-ledger-stamp',
    }));
    return {
      message: 'The ledger-stamp sticks to you like a small green accusation.',
    };
  }

  private pickUpDeepLyingBouquet(questId: string): { message?: string } {
    const instance = this.getStagedQuestInstances().find((quest) => quest.questId === questId);
    if (
      !instance ||
      instance.questId !== 'deep-lying-bouquet' ||
      instance.stage !== 'find-bouquet'
    ) {
      return {};
    }
    this.updateStagedQuestInstance(questId, (current) => ({
      ...current,
      stage: 'return-to-giver',
      carriedItemId: 'deep-lying-bouquet',
    }));
    return {
      message:
        'The Deep-Lying Bouquet joins your pack. Return to your partner and choose Complete Wedding.',
    };
  }

  private useGreenTeleporter(questId: string): { message?: string } {
    const instance = this.getStagedQuestInstances().find((quest) => quest.questId === questId);
    if (!instance || !instance.targetRoomId) {
      return {};
    }
    const [x = 0, y = 0, z = 0] = instance.targetRoomId.split(',').map(Number);
    if (instance.stage === 'find-forest-teleporter') {
      const deepRoomId = `${x},${y},${z + 100}`;
      const merchantRoomId = this.pickDeepMerchantRoom(deepRoomId);
      this.updateStagedQuestInstance(questId, (current) => ({
        ...current,
        stage: 'buy-substance',
        deepRoomId,
        merchantRoomId,
        returnTeleporterRoomId: current.targetRoomId,
      }));
      this.teleportSnakeToRoom(deepRoomId);
      return { message: 'The forest drops away. Something green is open for business.' };
    }
    if (instance.stage === 'buy-substance') {
      if (this.snake.currentRoomId === instance.deepRoomId && instance.returnTeleporterRoomId) {
        this.teleportSnakeToRoom(instance.returnTeleporterRoomId);
        return {
          message: 'The pad returns you without the green thing. The merchant keeps waiting.',
        };
      }
    }
    if (instance.stage === 'escape-radiation') {
      if (this.snake.currentRoomId === instance.deepRoomId && instance.returnTeleporterRoomId) {
        this.teleportSnakeToRoom(instance.returnTeleporterRoomId);
        return {
          message: 'You return to the forest with the green thing still explaining itself.',
        };
      }
    }
    return {};
  }

  private buyRadioactiveSubstance(): { message?: string } {
    const instance = this.getStagedQuestInstances().find(
      (quest) => quest.questId === 'green-purchase',
    );
    if (!instance || instance.stage !== 'buy-substance') {
      return {};
    }
    if (this.snake.currentRoomId !== instance.merchantRoomId) {
      return { message: 'The merchant is not here. The deep road continues.' };
    }
    if (this.getScore() < 50) {
      return { message: 'The merchant smiles without discounting anything.' };
    }
    this.addScore(-50);
    const scalar = Math.max(
      0.1,
      Number(this.getFlag<number>('equipment.radiationTimerScalar') ?? 1),
    );
    const totalMs = this.calculateGreenPurchaseTimerMs(instance);
    this.updateStagedQuestInstance('green-purchase', (current) => ({
      ...current,
      stage: 'escape-radiation',
      carriedItemId: 'radioactive-substance',
      remainingRadiationMs: Math.floor(totalMs / scalar),
      totalRadiationMs: Math.floor(totalMs / scalar),
    }));
    this.setFlag('quest.staged.radiationLastTickMs', this.getFlag<number>('timeMs') ?? 0);
    const totalSeconds = Math.ceil(Math.floor(totalMs / scalar) / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return { message: `RADIOACTIVE SUBSTANCE: ${minutes}:${seconds}` };
  }

  private calculateGreenPurchaseTimerMs(instance: StagedQuestInstance): number {
    const deepToMerchant =
      instance.deepRoomId && instance.merchantRoomId
        ? this.roomDistance(instance.deepRoomId, instance.merchantRoomId)
        : 2;
    const forestToGiver = instance.targetRoomId
      ? this.roomDistance(instance.targetRoomId, instance.giverRoomId)
      : 10;
    const roomSeconds = 8;
    const panicBufferSeconds = 20;
    return Math.max(
      45000,
      Math.ceil((deepToMerchant + forestToGiver) * roomSeconds + panicBufferSeconds) * 1000,
    );
  }

  private roomDistance(a: string, b: string): number {
    const [ax = 0, ay = 0, az = 0] = a.split(',').map(Number);
    const [bx = 0, by = 0, bz = 0] = b.split(',').map(Number);
    return Math.abs(ax - bx) + Math.abs(ay - by) + Math.abs(az - bz);
  }

  private pickDeepMerchantRoom(deepRoomId: string): string {
    const [x = 0, y = 0, z = 0] = deepRoomId.split(',').map(Number);
    for (let radius = 2; radius <= 6; radius += 1) {
      const candidates = [
        `${x + radius},${y},${z}`,
        `${x - radius},${y},${z}`,
        `${x},${y + radius},${z}`,
        `${x},${y - radius},${z}`,
        `${x + radius},${y + radius},${z}`,
        `${x - radius},${y + radius},${z}`,
      ];
      const found = candidates.find((roomId) => {
        const biome = getBiomeForRoom(roomId).id;
        return biome !== 'elderwood-maze' && biome !== 'sunken-ocean';
      });
      if (found) {
        return found;
      }
    }
    return `${x},${y + 7},${z}`;
  }

  private teleportSnakeToRoom(roomId: string): void {
    this.world.getRoom(roomId);
    this.snake.currentRoomId = roomId;
    this.visitedRooms.add(roomId);
    this.setFlag('roomsVisited', this.visitedRooms.size);
    this.setFlag('traversal.manualResumePending', true);
  }

  private handleStagedQuestRoomEntered(roomId: string): void {
    const room = this.world.getRoom(roomId);
    this.stampQuestActorsIntoRoom(room);
  }

  private handleEquipmentRoomRefund(): void {
    const refund = this.getFlag<{ interval?: number; score?: number }>(
      'equipment.refundEveryRooms',
    );
    if (!refund || !refund.interval || !refund.score) {
      this.setFlag('equipment.roomRefundCounter', undefined);
      return;
    }
    const counter = Number(this.getFlag<number>('equipment.roomRefundCounter') ?? 0) + 1;
    if (counter >= refund.interval) {
      this.addScore(refund.score);
      this.setFlag('equipment.roomRefundCounter', 0);
      this.setFlag('ui.questInteraction', { message: `Tax refund: +${refund.score} score` });
    } else {
      this.setFlag('equipment.roomRefundCounter', counter);
    }
  }

  private stampQuestActorsIntoRoom(room: RoomSnapshot): void {
    const actors = this.getQuestRoomActors(room.id);
    if (actors.length === 0) {
      return;
    }
    const layout = room.layout.map((row) => row.split(''));
    for (const actor of actors) {
      const radius =
        actor.kind === 'forest-teleporter' ||
        actor.kind === 'deep-teleporter' ||
        actor.kind === 'deep-merchant'
          ? 7
          : actor.kind === 'starforged-envoy'
            ? 0
            : 3;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const x = actor.x + dx;
          const y = actor.y + dy;
          if (!layout[y]?.[x]) {
            continue;
          }
          layout[y][x] = '.';
        }
      }
      if (actor.kind === 'deep-merchant') {
        this.stampDeepMerchantHouse(layout, actor);
      }
      if (room.apple?.x === actor.x && room.apple.y === actor.y) delete room.apple;
      if (room.treasure?.x === actor.x && room.treasure.y === actor.y) delete room.treasure;
      if (room.powerup?.x === actor.x && room.powerup.y === actor.y) delete room.powerup;
    }
    room.layout = layout.map((row) => row.join(''));
  }

  private stampDeepMerchantHouse(layout: string[][], actor: QuestRoomActor): void {
    const left = Math.max(1, actor.x - 5);
    const right = Math.min(this.config.grid.cols - 2, actor.x + 5);
    const top = Math.max(1, actor.y - 4);
    const bottom = Math.min(this.config.grid.rows - 2, actor.y + 4);
    const doorX = Math.max(left + 1, Math.min(right - 1, actor.x));
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        const isWall = y === top || y === bottom || x === left || x === right;
        layout[y][x] = isWall ? '#' : '.';
      }
    }
    layout[bottom][doorX] = '.';
    for (let y = bottom; y < Math.min(this.config.grid.rows, bottom + 5); y += 1) {
      for (
        let x = Math.max(0, doorX - 1);
        x <= Math.min(this.config.grid.cols - 1, doorX + 1);
        x += 1
      ) {
        layout[y][x] = '.';
      }
    }
    layout[actor.y][actor.x] = '.';
  }

  private reconcileStagedQuestBosses(): void {
    let changed = false;
    const instances = this.getStagedQuestInstances().map((instance) => {
      if (instance.questId !== 'freak-you' || instance.stage !== 'survive-freak-you') {
        return instance;
      }
      const bossAlive = instance.bossId
        ? this.bosses.hasBoss(instance.bossId)
        : this.bosses.hasBossWithKind('freak-you');
      if (bossAlive) {
        return instance;
      }
      changed = true;
      this.setFlag('ui.questInteraction', {
        message: 'Freak You folds into a timeline where you were not lunch.',
      });
      return { ...instance, stage: 'return-to-giver' as StagedQuestStage };
    });
    if (changed) {
      this.setStagedQuestInstances(instances);
    }
  }

  private respawnMissingStagedBossesAfterLoad(): void {
    let changed = false;
    const instances = this.getStagedQuestInstances().map((instance) => {
      if (
        instance.questId !== 'freak-you' ||
        instance.stage !== 'survive-freak-you' ||
        !instance.targetRoomId
      ) {
        return instance;
      }
      const bossAlive = instance.bossId
        ? this.bosses.hasBoss(instance.bossId)
        : this.bosses.hasBossWithKind('freak-you');
      if (bossAlive) {
        return instance;
      }
      this.prepareFreakYouPortalRoom(instance.targetRoomId);
      const bossId = this.bosses.spawnFreakYou(instance.targetRoomId) ?? instance.bossId;
      changed = true;
      return { ...instance, bossId };
    });
    if (changed) {
      this.setStagedQuestInstances(instances);
    }
  }

  private tickRadiationQuestTimer(): boolean {
    const now = Number(this.getFlag<number>('timeMs') ?? 0);
    const last = Number(this.getFlag<number>('quest.staged.radiationLastTickMs') ?? now);
    const delta = Math.max(0, now - last);
    this.setFlag('quest.staged.radiationLastTickMs', now);
    if (delta <= 0) {
      return false;
    }
    let timedOut = false;
    this.setStagedQuestInstances(
      this.getStagedQuestInstances().map((instance) => {
        if (
          instance.questId !== 'green-purchase' ||
          instance.stage !== 'escape-radiation' ||
          instance.carriedItemId !== 'radioactive-substance'
        ) {
          return instance;
        }
        const remaining = Math.max(0, Number(instance.remainingRadiationMs ?? 0) - delta);
        if (remaining > 0) {
          return { ...instance, remainingRadiationMs: remaining };
        }
        timedOut = !this.isImmortal();
        this.questController.failQuestById(instance.questId);
        this.setFlag('quest.staged.failedNow', {
          questId: instance.questId,
          reason: 'radiation-timeout',
        });
        return {
          ...instance,
          stage: 'failed',
          carriedItemId: undefined,
          remainingRadiationMs: 0,
          failureReason: 'radiation-timeout',
        };
      }),
    );
    return timedOut;
  }

  private tryGetStagedQuestTurnIn(roomId: string): QuestGiverRequest | null {
    const instance = this.getStagedQuestInstances().find(
      (quest) =>
        quest.giverRoomId === roomId &&
        (quest.stage === 'return-to-giver' ||
          (quest.questId === 'green-purchase' &&
            quest.stage === 'escape-radiation' &&
            quest.carriedItemId === 'radioactive-substance')),
    );
    if (!instance) {
      return null;
    }
    const quest = this.registry.getById(instance.questId) ?? null;
    if (!quest) {
      return null;
    }
    this.updateStagedQuestInstance(instance.questId, (current) => ({
      ...current,
      stage: 'completed',
      carriedItemId: undefined,
    }));
    const completed = this.questController.completeQuestById(instance.questId, this);
    if (instance.questId === 'deep-lying-bouquet' && instance.relationshipId) {
      this.completeRelationshipMarriage(instance.relationshipId);
    }
    this.setFlag('quest.staged.completedNow', { questId: instance.questId });
    this.emitWorldEvent({
      type: 'quest-completed',
      roomId,
      severity: 24,
      loudness: 10,
      tags: ['quest', 'completed', instance.questId],
      summary: `${quest.label} was completed.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { questId: instance.questId, label: quest.label },
    });
    return { quest: completed ?? quest, state: 'completed' };
  }

  private createAliveStepResult(options: {
    appleEaten: boolean;
    appleRewards?: AppleConsumptionResult['rewards'];
    appleWorldPosition?: Vector2Like | null;
    appleSnapshot: AppleSnapshot | null;
    appleStateChanged: boolean;
    roomsChanged: Set<string>;
    roomHasChanged: boolean;
    appleTypeId?: string;
  }): StepResult {
    return {
      status: 'alive',
      apple: {
        eaten: options.appleEaten,
        rewards: options.appleRewards,
        worldPosition: options.appleWorldPosition,
        current: options.appleSnapshot,
        stateChanged: options.appleStateChanged,
        typeId: options.appleTypeId,
      },
      roomsChanged: options.roomsChanged,
      roomChanged: options.roomHasChanged,
      questOffer: null,
      questsCompleted: [],
    };
  }

  // --- House decoration API ---
  purchaseHouseItem(kind: 'couch' | 'kitchen' | 'expand' | 'bed' | 'plant' | 'lamp'): boolean {
    const houseId = '0,-1,0';
    const room = this.world.getRoom(houseId);
    const cols = this.config.grid.cols;
    const rows = this.config.grid.rows;

    const purchases = (this.getFlag<Record<string, unknown>>('house.purchases') ?? {}) as Record<
      string,
      unknown
    >;

    const costs: Record<string, number> = {
      couch: 10,
      kitchen: 15,
      expand: 20,
      bed: 12,
      plant: 8,
      lamp: 14,
    } as const as Record<string, number>;

    const cost = costs[kind];
    if (this.snake.score < cost) {
      return false;
    }

    function setChar(x: number, y: number, ch: string) {
      const row = room.layout[y];
      if (!row) return;
      const chars = row.split('');
      if (x < 0 || x >= chars.length) return;
      if (chars[x] === ch) return;
      chars[x] = ch;
      room.layout[y] = chars.join('');
    }

    if (kind === 'couch') {
      if (purchases[kind]) return false;
      // Place couch near lower-left inside the house cube
      const bbox = this.getHouseBoundingBox(room);
      if (!bbox) return false;
      const y = bbox.bottom - 2;
      const startX = bbox.left + 2;
      for (let x = startX; x < startX + 3; x++) setChar(x, y, 'C');
      purchases[kind] = true;
    } else if (kind === 'kitchen') {
      if (purchases[kind]) return false;
      // Kitchen block on upper-right inside the house cube
      const bbox = this.getHouseBoundingBox(room);
      if (!bbox) return false;
      const startY = bbox.top + 2;
      const startX = bbox.right - 4;
      for (let y = startY; y < startY + 2; y++)
        for (let x = startX; x < startX + 3; x++) setChar(x, y, 'K');
      purchases[kind] = true;
    } else if (kind === 'expand') {
      // Recompute cube larger by one step; max 3 expansions
      const level = Number(this.getFlag<number>('house.expandLevel') ?? 0);
      const cap = 5;
      if (level >= cap) return false;
      this.expandHouseCube(room, level + 1);
      this.setFlag('house.expandLevel', level + 1);
    } else if (kind === 'bed') {
      if (purchases[kind]) return false;
      const bbox = this.getHouseBoundingBox(room);
      if (!bbox) return false;
      const startX = bbox.left + 3;
      const startY = bbox.top + Math.floor((bbox.bottom - bbox.top) / 2);
      for (let x = startX; x < startX + 2; x++) setChar(x, startY, 'B');
      purchases[kind] = true;
    } else if (kind === 'plant') {
      if (purchases[kind]) return false;
      const bbox = this.getHouseBoundingBox(room);
      if (!bbox) return false;
      setChar(bbox.left + 2, bbox.top + 2, 'P');
      purchases[kind] = true;
    } else if (kind === 'lamp') {
      if (purchases[kind]) return false;
      const bbox = this.getHouseBoundingBox(room);
      if (!bbox) return false;
      setChar(bbox.right - 2, bbox.bottom - 2, 'L');
      purchases[kind] = true;
    }

    // Deduct points and persist state
    this.addScore(-cost);
    this.setFlag('house.purchases', purchases);
    const purchaseCount = Number(this.getFlag<number>('house.itemsPurchased') ?? 0);
    this.setFlag('house.itemsPurchased', purchaseCount + 1);
    return true;
  }

  placeHomeArcadeCabinet(): { x: number; y: number } | null {
    const room = this.world.getRoom('0,-1,0');
    const bbox = this.getHouseBoundingBox(room);
    if (!bbox) return null;
    const position = {
      x: Math.floor((bbox.left + bbox.right) / 2),
      y: bbox.top + 2,
    };
    const row = room.layout[position.y];
    if (!row) return null;
    const chars = row.split('');
    chars[position.x] = 'Z';
    room.layout[position.y] = chars.join('');
    return position;
  }

  private getHouseBoundingBox(room: {
    layout: string[];
  }): { left: number; right: number; top: number; bottom: number } | null {
    // Find the first wood tile to infer the cube, then expand to borders '#'
    for (let y = 0; y < room.layout.length; y++) {
      for (let x = 0; x < room.layout[y].length; x++) {
        if (room.layout[y][x] === 'W') {
          // expand left
          let left = x;
          while (left > 0 && room.layout[y][left] !== '#') left--;
          let right = x;
          while (right < room.layout[y].length && room.layout[y][right] !== '#') right++;
          // expand top/bottom by scanning columns within bounds
          let top = y;
          while (top > 0 && room.layout[top].slice(left + 1, right).includes('W')) top--;
          let bottom = y;
          while (
            bottom < room.layout.length - 1 &&
            room.layout[bottom].slice(left + 1, right).includes('W')
          )
            bottom++;
          return { left, right, top, bottom };
        }
      }
    }
    return null;
  }

  private expandHouseCube(room: { layout: string[] }, level: number): void {
    // Recreate a centered cube, grown by 2 cells per expansion in each dimension
    const cols = this.config.grid.cols;
    const rows = this.config.grid.rows;
    const prev = room.layout.map((r) => r.split(''));
    const layout = Array.from({ length: rows }, () => Array(cols).fill('.')) as string[][];

    const baseW = Math.min(14, Math.max(10, Math.floor(cols * 0.45)));
    const baseH = Math.min(10, Math.max(8, Math.floor(rows * 0.42)));
    const add = Math.min(3, Math.max(0, level)) * 2; // +2 width/height per level
    const width = Math.min(cols - 4, baseW + add);
    const height = Math.min(rows - 4, baseH + add);
    const left = Math.floor(cols / 2 - width / 2);
    const top = Math.floor(rows / 2 - height / 2);
    for (let y = top; y < top + height; y++) {
      for (let x = left; x < left + width; x++) {
        const isBorder =
          x === left || x === left + width - 1 || y === top || y === top + height - 1;
        layout[y][x] = isBorder ? '#' : 'W';
      }
    }

    // Carve south door and add rug inside
    const bottom = top + height - 1;
    const cx = Math.floor(left + width / 2);
    const doorHalf = Math.max(1, Math.floor(Math.min(3, Math.floor(width / 6)) / 2));
    for (let x = cx - doorHalf; x <= cx + doorHalf; x++) {
      layout[bottom][x] = '.';
      if (bottom - 1 > top) layout[bottom - 1][x] = 'E';
    }

    // Re-apply furniture if still inside
    const tryPlace = (ch: string) => {
      for (let y = 0; y < prev.length; y++)
        for (let x = 0; x < prev[y].length; x++)
          if (prev[y][x] === ch) {
            if (x > left && x < left + width - 1 && y > top && y < top + height - 1)
              layout[y][x] = ch;
          }
    };
    tryPlace('C');
    tryPlace('K');
    tryPlace('Z');

    room.layout = layout.map((r) => r.join(''));
  }

  private isImmortal(): boolean {
    return Boolean(this.getFlag('cheat.immortal'));
  }

  private tickFortitudeStates(): void {
    const invuln = this.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0;
    if (invuln > 0) {
      this.setFlag('fortitude.invulnerabilityTicks', Math.max(0, invuln - 1));
    }
  }

  private tickPlayerStates(): void {
    const invuln = Number(this.getFlag<number>('player.bulletInvulnTicks') ?? 0);
    if (invuln > 0) {
      this.setFlag('player.bulletInvulnTicks', invuln - 1);
    }
    const disoriented = Number(this.getFlag<number>('status.disorientedTicks') ?? 0);
    if (disoriented > 0) {
      this.setFlag('status.disorientedTicks', Math.max(0, disoriented - 1));
    }
    const speedBoost = Number(this.getFlag<number>('status.orangeJuiceSpeedBoostTicks') ?? 0);
    if (speedBoost > 0) {
      this.setFlag('status.orangeJuiceSpeedBoostTicks', speedBoost - 1);
    }
    const scoreMult = Number(this.getFlag<number>('status.orangeJuiceScoreMult') ?? 0);
    if (scoreMult > 0) {
      this.setFlag('status.orangeJuiceScoreMult', scoreMult - 1);
    }
  }

  getLightningStrikeView(roomId: string = this.snake.currentRoomId): LightningStrikeState | null {
    if (!this.lightningStrike || this.lightningStrike.roomId !== roomId) {
      return null;
    }
    return { ...this.lightningStrike };
  }

  queueLightningStrikeForTest(
    roomId: string,
    position: Vector2Like,
    options: { radius?: number; ticksRemaining?: number } = {},
  ): void {
    this.lightningStrike = {
      roomId,
      x: position.x,
      y: position.y,
      radius: Math.max(0, Math.floor(options.radius ?? 0)),
      ticksRemaining: Math.max(0, Math.floor(options.ticksRemaining ?? 2)),
      phase: 'warning',
    };
  }

  private tickLightningHazardState(options: {
    roomsChanged: Set<string>;
    previousRoom: string;
  }): boolean {
    const room = this.getCurrentRoom();
    const atmosphere = this.getAtmosphereForRoom(room);
    const profile = atmosphere.gameplay.lightningProfile;
    if (!profile.enabled || atmosphere.sheltered) {
      this.lightningStrike = null;
      this.setFlag('ui.lightningStrike', undefined);
      return false;
    }

    if (this.lightningStrike && this.lightningStrike.roomId !== this.snake.currentRoomId) {
      this.lightningStrike = null;
    }

    if (!this.lightningStrike) {
      const chance = Math.max(0, profile.strikeChancePerSnakeStep ?? 0);
      if (chance <= 0 || this._rng() >= chance) {
        return false;
      }
      const target = this.chooseLightningTarget(room, profile);
      if (!target) {
        return false;
      }
      this.lightningStrike = {
        roomId: this.snake.currentRoomId,
        x: target.x,
        y: target.y,
        radius: Math.max(0, Math.floor(profile.radius)),
        ticksRemaining: Math.max(1, Math.floor(profile.telegraphTicks)),
        phase: 'warning',
      };
      this.setFlag('ui.lightningStrike', this.lightningStrike);
      return false;
    }

    if (this.lightningStrike.ticksRemaining > 0) {
      this.lightningStrike = {
        ...this.lightningStrike,
        ticksRemaining: this.lightningStrike.ticksRemaining - 1,
        phase: 'warning',
      };
      this.setFlag('ui.lightningStrike', this.lightningStrike);
      return false;
    }

    const strike = { ...this.lightningStrike, phase: 'strike' as const };
    this.lightningStrike = null;
    this.setFlag('ui.lightningStrike', strike);
    options.roomsChanged.add(strike.roomId);
    return this.resolveLightningStrike(room, profile, strike, options.previousRoom);
  }

  private chooseLightningTarget(
    room: RoomSnapshot,
    profile: NonNullable<ResolvedAtmosphereView['gameplay']['lightningProfile']>,
  ): Vector2Like | null {
    const headLocal = this.getSnakeHeadLocal();
    if (profile.targetsMetalEquipment && headLocal && this.hasLightningAttractingEquipment()) {
      return headLocal;
    }
    const enemies = profile.canHitEnemies ? this.enemies.getEnemiesInRoom(room.id) : [];
    if (enemies.length > 0 && this._rng() < 0.55) {
      return { ...enemies[Math.floor(this._rng() * enemies.length)].position };
    }
    if (profile.canHitPlayer && headLocal && this._rng() < 0.45) {
      return headLocal;
    }
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const x = Math.floor(this._rng() * this.config.grid.cols);
      const y = Math.floor(this._rng() * this.config.grid.rows);
      const tile = room.layout[y]?.[x] ?? '#';
      if (tile !== '#') {
        return { x, y };
      }
    }
    return headLocal;
  }

  private resolveLightningStrike(
    room: RoomSnapshot,
    profile: NonNullable<ResolvedAtmosphereView['gameplay']['lightningProfile']>,
    strike: LightningStrikeState,
    previousRoom: string,
  ): boolean {
    const radius = Math.max(0, strike.radius);
    let playerDied = false;
    if (profile.canHitEnemies) {
      for (const enemy of this.enemies.getEnemiesInRoom(strike.roomId)) {
        if (!this.isWithinLightningRadius(enemy.position, strike, radius)) {
          continue;
        }
        if (profile.safeUnderCover && this.isLightningCoveredTile(room, enemy.position)) {
          continue;
        }
        const defeated = this.enemies.damageEnemyAt(
          strike.roomId,
          this.localToWorld(strike.roomId, enemy.position),
          3,
        ).defeated;
        if (defeated) {
          this.setFlag('achievement.enemyDefeated', {
            enemyId: defeated.id,
            method: 'lightning',
          });
        }
      }
    }
    const headLocal = this.getSnakeHeadLocal();
    if (
      profile.canHitPlayer &&
      headLocal &&
      this.isWithinLightningRadius(headLocal, strike, radius) &&
      !(profile.safeUnderCover && this.isLightningCoveredTile(room, headLocal))
    ) {
      playerDied = this.applyLightningDamage(previousRoom);
    }
    return playerDied;
  }

  private applyLightningDamage(_previousRoom: string): boolean {
    const head = this.snake.bodySegments[0];
    if (!head || this.isImmortal()) {
      return false;
    }
    const max = Number(this.getFlag<number>('player.maxHealth') ?? 3);
    const current = Number(this.getFlag<number>('player.health') ?? max);
    const next = Math.max(0, current - 1);
    this.setFlag('player.health', next);
    this.emitPlayerLowHealthEvent(next, max, 'lightning');
    this.setFlag('ui.healthRevealed', true);
    this.setFlag('player.bulletInvulnTicks', 8);
    this.setFlag('ui.playerHit', {
      x: head.x,
      y: head.y,
      roomId: this.snake.currentRoomId,
      health: next,
      maxHealth: max,
      source: 'lightning',
    });
    return next <= 0;
  }

  private hasLightningAttractingEquipment(): boolean {
    if (this.getFlag<boolean>('equipment.gunEnabled')) {
      return true;
    }
    for (const [, itemId] of this.inventory.getAllEquipped()) {
      const key = itemId.toLowerCase();
      if (
        key.includes('metal') ||
        key.includes('iron') ||
        key.includes('steel') ||
        key.includes('gun') ||
        key.includes('revolver') ||
        key.includes('rod') ||
        key.includes('bell')
      ) {
        return true;
      }
    }
    return false;
  }

  private getSnakeHeadLocal(): Vector2Like | null {
    const head = this.snake.bodySegments[0];
    if (!head) {
      return null;
    }
    return this.worldToLocal(this.snake.currentRoomId, head);
  }

  private isWithinLightningRadius(
    position: Vector2Like,
    strike: LightningStrikeState,
    radius: number,
  ): boolean {
    return Math.abs(position.x - strike.x) <= radius && Math.abs(position.y - strike.y) <= radius;
  }

  private isLightningCoveredTile(room: RoomSnapshot, position: Vector2Like): boolean {
    const tile = room.layout[position.y]?.[position.x] ?? '#';
    return '#WETCKBPLGO'.includes(tile);
  }

  private tickTemperatureState(): boolean {
    const room = this.getCurrentRoom();
    const biome = getBiomeDefinition(room.biomeId);
    const head = this.snake.bodySegments[0];
    if (!head) {
      return false;
    }
    if (this.getFlag<boolean>('cheat.immortal')) {
      this.setFlag('player.temperatureExposureMs', 0);
      this.setFlag('player.temperatureHotExposureMs', 0);
      this.setFlag('player.temperatureColdExposureMs', 0);
      this.setFlag('player.temperatureDamageProgressMs', 0);
      this.setFlag('player.temperatureHotDamageProgressMs', 0);
      this.setFlag('player.temperatureColdDamageProgressMs', 0);
      this.setFlag('player.temperatureHazard', undefined);
      this.setFlag('player.temperatureLastTickMs', Number(this.getFlag<number>('timeMs') ?? 0));
      return false;
    }
    const timeMs = Number(this.getFlag<number>('timeMs') ?? 0);
    const lastTickMs = Number(this.getFlag<number>('player.temperatureLastTickMs') ?? 0);
    const deltaMs = Math.max(0, lastTickMs > 0 ? timeMs - lastTickMs : 0);
    this.setFlag('player.temperatureLastTickMs', timeMs);
    const [roomX, roomY] = this.snake.currentRoomId.split(',').map(Number);
    const localX = head.x - roomX * this.config.grid.cols;
    const localY = head.y - roomY * this.config.grid.rows;
    const tile = room.layout[localY]?.[localX] ?? '.';
    const sheltered = 'WETCKBPLGO'.includes(tile);
    const mosaicExposure =
      room.biomeId === 'mosaic-coast'
        ? (room.mosaicCoast?.exposure.find((entry) => entry.x === localX && entry.y === localY)
            ?.kind ?? 'direct-sun')
        : null;
    if (!mosaicExposure) {
      this.setFlag('mosaicCoast.exposure', undefined);
    }
    const onRelief = room.temperatureReliefs?.find(
      (relief) => relief.x === localX && relief.y === localY,
    );
    const specialGameplay = this.specialStats.getGameplayModifiers();
    const thresholdMs =
      Math.max(1000, Number(this.getFlag<number>('player.temperatureThresholdMs') ?? 10000)) *
      specialGameplay.hazardTimerScalar;
    const damageIntervalMs =
      Math.max(1000, Number(this.getFlag<number>('player.temperatureDamageIntervalMs') ?? 5000)) *
      specialGameplay.hazardTimerScalar;
    const heatResistance = Math.max(
      0,
      Number(this.getFlag<number>('equipment.heatResistance') ?? 0),
    );
    const coldResistance = Math.max(
      0,
      Number(this.getFlag<number>('equipment.coldResistance') ?? 0),
    );
    const resistance =
      biome.temperatureHazard === 'hot'
        ? heatResistance
        : biome.temperatureHazard === 'cold'
          ? coldResistance
          : 0;
    const [, , roomZ = 0] = this.snake.currentRoomId.split(',').map(Number);
    const peakColdRate = biome.peakColdRate ?? 0;
    const peakZThreshold = biome.peakZThreshold ?? Infinity;
    const isAtPeakCold = roomZ <= peakZThreshold && peakColdRate > 0;
    const exposureRate = Math.max(
      0.05,
      ((biome.temperatureRate ?? 1) + (isAtPeakCold ? peakColdRate : 0)) *
        (biome.temperatureHazard === 'hot'
          ? this.getAtmosphereForRoom(room).gameplay.heatRateScalar
          : biome.temperatureHazard === 'cold'
            ? this.getAtmosphereForRoom(room).gameplay.coldRateScalar
            : 1) *
        Math.max(0, 1 - resistance) *
        specialGameplay.hazardDamageScalar,
    );
    const legacyExposureMs = Math.max(
      0,
      Number(this.getFlag<number>('player.temperatureExposureMs') ?? 0),
    );
    const legacyDamageProgressMs = Math.max(
      0,
      Number(this.getFlag<number>('player.temperatureDamageProgressMs') ?? 0),
    );
    let hotExposureMs = Math.max(
      0,
      Number(
        this.getFlag<number>('player.temperatureHotExposureMs') ??
          (this.getFlag<'hot' | 'cold'>('player.temperatureHazard') === 'hot'
            ? legacyExposureMs
            : 0),
      ),
    );
    let coldExposureMs = Math.max(
      0,
      Number(
        this.getFlag<number>('player.temperatureColdExposureMs') ??
          (this.getFlag<'hot' | 'cold'>('player.temperatureHazard') === 'cold'
            ? legacyExposureMs
            : 0),
      ),
    );
    let hotDamageProgressMs = Math.max(
      0,
      Number(
        this.getFlag<number>('player.temperatureHotDamageProgressMs') ??
          (this.getFlag<'hot' | 'cold'>('player.temperatureHazard') === 'hot'
            ? legacyDamageProgressMs
            : 0),
      ),
    );
    let coldDamageProgressMs = Math.max(
      0,
      Number(
        this.getFlag<number>('player.temperatureColdDamageProgressMs') ??
          (this.getFlag<'hot' | 'cold'>('player.temperatureHazard') === 'cold'
            ? legacyDamageProgressMs
            : 0),
      ),
    );

    const neutralTemperatureShelter = this.isNeutralTemperatureShelter(room, biome);
    if (!biome.temperatureHazard || neutralTemperatureShelter) {
      const exposureRecoveryRate = neutralTemperatureShelter ? 1.5 : 2.5;
      hotExposureMs = Math.max(0, hotExposureMs - deltaMs * exposureRecoveryRate);
      coldExposureMs = Math.max(0, coldExposureMs - deltaMs * exposureRecoveryRate);
      hotDamageProgressMs = 0;
      coldDamageProgressMs = 0;
      this.syncTemperatureFlags(
        null,
        hotExposureMs,
        coldExposureMs,
        hotDamageProgressMs,
        coldDamageProgressMs,
      );
      this.setFlag('player.temperatureHazard', undefined);
      return false;
    }

    this.setFlag('player.temperatureHazard', biome.temperatureHazard);

    if (mosaicExposure) {
      this.setFlag('mosaicCoast.exposure', mosaicExposure);
      if (mosaicExposure === 'cooling') {
        hotExposureMs = Math.max(0, hotExposureMs - deltaMs * 3.5);
        hotDamageProgressMs = Math.max(0, hotDamageProgressMs - deltaMs * 2);
      } else if (mosaicExposure === 'interior') {
        hotExposureMs = Math.max(0, hotExposureMs - deltaMs * 1.25);
        hotDamageProgressMs = Math.max(0, hotDamageProgressMs - deltaMs);
      } else if (
        mosaicExposure === 'direct-sun' &&
        this.getAtmosphereForRoom(room).state.dayPhase !== 'night'
      ) {
        hotExposureMs = Math.min(thresholdMs, hotExposureMs + deltaMs * exposureRate);
        coldExposureMs = Math.max(0, coldExposureMs - deltaMs * 1.8);
        coldDamageProgressMs = Math.max(0, coldDamageProgressMs - deltaMs * 2);
        if (hotExposureMs >= thresholdMs) {
          hotDamageProgressMs += deltaMs;
        }
      }
    } else if (onRelief) {
      if (onRelief.kind === 'warm' || onRelief.kind === 'onsen') {
        coldExposureMs = Math.max(0, coldExposureMs - deltaMs * 3.5);
        coldDamageProgressMs = Math.max(0, coldDamageProgressMs - deltaMs * 2);
      }
      if (onRelief.kind === 'cool' || onRelief.kind === 'onsen') {
        hotExposureMs = Math.max(0, hotExposureMs - deltaMs * 3.5);
        hotDamageProgressMs = Math.max(0, hotDamageProgressMs - deltaMs * 2);
      }
    } else if (sheltered) {
      hotExposureMs = Math.max(0, hotExposureMs - deltaMs * 2);
      coldExposureMs = Math.max(0, coldExposureMs - deltaMs * 2);
      hotDamageProgressMs = Math.max(0, hotDamageProgressMs - deltaMs * 2);
      coldDamageProgressMs = Math.max(0, coldDamageProgressMs - deltaMs * 2);
    } else {
      if (biome.temperatureHazard === 'hot') {
        hotExposureMs = Math.min(thresholdMs, hotExposureMs + deltaMs * exposureRate);
        coldExposureMs = Math.max(0, coldExposureMs - deltaMs * 1.8);
        coldDamageProgressMs = Math.max(0, coldDamageProgressMs - deltaMs * 2);
        if (hotExposureMs >= thresholdMs) {
          hotDamageProgressMs += deltaMs;
        }
      } else {
        coldExposureMs = Math.min(thresholdMs, coldExposureMs + deltaMs * exposureRate);
        hotExposureMs = Math.max(0, hotExposureMs - deltaMs * 1.8);
        hotDamageProgressMs = Math.max(0, hotDamageProgressMs - deltaMs * 2);
        if (coldExposureMs >= thresholdMs) {
          coldDamageProgressMs += deltaMs;
        }
      }
    }

    this.syncTemperatureFlags(
      biome.temperatureHazard,
      hotExposureMs,
      coldExposureMs,
      hotDamageProgressMs,
      coldDamageProgressMs,
    );
    const exposureMs = biome.temperatureHazard === 'hot' ? hotExposureMs : coldExposureMs;
    let damageProgressMs =
      biome.temperatureHazard === 'hot' ? hotDamageProgressMs : coldDamageProgressMs;

    if (exposureMs < thresholdMs) {
      return false;
    }

    if (damageProgressMs < damageIntervalMs) {
      return false;
    }

    const maxHealth = Number(this.getFlag<number>('player.maxHealth') ?? 3);
    let currentHealth = Number(this.getFlag<number>('player.health') ?? maxHealth);
    while (damageProgressMs >= damageIntervalMs && currentHealth > 0) {
      damageProgressMs -= damageIntervalMs;
      currentHealth -= 1;
    }
    if (biome.temperatureHazard === 'hot') {
      hotDamageProgressMs = damageProgressMs;
    } else {
      coldDamageProgressMs = damageProgressMs;
    }
    this.syncTemperatureFlags(
      biome.temperatureHazard,
      hotExposureMs,
      coldExposureMs,
      hotDamageProgressMs,
      coldDamageProgressMs,
    );
    this.setFlag('player.health', Math.max(0, currentHealth));
    this.emitPlayerLowHealthEvent(Math.max(0, currentHealth), maxHealth, 'temperature');
    this.setFlag('ui.healthRevealed', true);
    this.setFlag('ui.playerHit', {
      x: head.x,
      y: head.y,
      roomId: this.snake.currentRoomId,
      health: Math.max(0, currentHealth),
      maxHealth,
    });
    this.setFlag('ui.temperatureDamageFlash', {
      x: head.x,
      y: head.y,
      roomId: this.snake.currentRoomId,
      hazard: biome.temperatureHazard,
    });
    return currentHealth <= 0;
  }

  private isNeutralTemperatureShelter(
    room: RoomSnapshot,
    biome: ReturnType<typeof getBiomeDefinition>,
  ): boolean {
    if (room.town || room.snakeMcDonalds) {
      return true;
    }
    if (room.layer?.kind === 'townInterior') {
      return true;
    }
    if (room.cave) {
      return !biome.temperatureHazard;
    }
    return false;
  }

  private syncTemperatureFlags(
    activeHazard: 'hot' | 'cold' | null,
    hotExposureMs: number,
    coldExposureMs: number,
    hotDamageProgressMs: number,
    coldDamageProgressMs: number,
  ): void {
    this.setFlag('player.temperatureHotExposureMs', Math.max(0, hotExposureMs));
    this.setFlag('player.temperatureColdExposureMs', Math.max(0, coldExposureMs));
    this.setFlag('player.temperatureHotDamageProgressMs', Math.max(0, hotDamageProgressMs));
    this.setFlag('player.temperatureColdDamageProgressMs', Math.max(0, coldDamageProgressMs));
    const activeExposure =
      activeHazard === 'hot' ? hotExposureMs : activeHazard === 'cold' ? coldExposureMs : 0;
    const activeDamage =
      activeHazard === 'hot'
        ? hotDamageProgressMs
        : activeHazard === 'cold'
          ? coldDamageProgressMs
          : 0;
    this.setFlag('player.temperatureExposureMs', Math.max(0, activeExposure));
    this.setFlag('player.temperatureDamageProgressMs', Math.max(0, activeDamage));
  }

  private tickPowerupState(): void {
    const shedCooldown = Number(this.getFlag<number>('skill.tailcraft.shedCooldown') ?? 0);
    if (shedCooldown > 0) {
      this.setFlag('skill.tailcraft.shedCooldown', shedCooldown - 1);
    }
    // Sync active state
    const active = this.powerupState;
    if (active && active.remaining > 0) {
      active.remaining -= 1;
      this.setFlag('powerup.active', {
        kind: active.kind,
        remaining: active.remaining,
        total: active.total,
      });
      // Decrement smite runtime ticks mirror flag if present
      if (active.kind === 'smite') {
        const sm = Number(this.getFlag<number>('powerup.smiteTicks') ?? 0);
        if (sm > 0) {
          this.setFlag('powerup.smiteTicks', sm - 1);
        } else {
          this.setFlag('powerup.smiteTicks', undefined);
        }
      }
    } else if (active && active.remaining <= 0) {
      // Clear state
      this.powerupState = null;
      this.setFlag('powerup.active', undefined);
      this.setFlag('powerup.smiteTicks', undefined);
    } else {
      // Ensure flag cleared when no powerup
      this.setFlag('powerup.active', undefined);
    }
  }

  private applyBulletDamage(hits: number, style?: BulletInstance['style']): boolean {
    if (hits <= 0) {
      return false;
    }
    if (this.getFlag<boolean>('cheat.immortal')) {
      this.setFlag('ui.questInteraction', {
        message: 'Enemy hit ignored: immortality cheat is active.',
      });
      return false;
    }
    const invuln = Number(this.getFlag<number>('player.bulletInvulnTicks') ?? 0);
    if (invuln > 0) {
      this.setFlag('ui.questInteraction', {
        message: `Enemy hit ignored: ${invuln} invulnerability ticks remain.`,
      });
      return false;
    }
    const max = Number(this.getFlag<number>('player.maxHealth') ?? 3);
    const current = Number(this.getFlag<number>('player.health') ?? max);
    const next = Math.max(0, current - 1);
    this.setFlag('player.health', next);
    this.emitPlayerLowHealthEvent(next, max, style ?? 'bullet');
    this.setFlag('ui.healthRevealed', true);
    this.setFlag('player.bulletInvulnTicks', 10);
    const head = this.snake.bodySegments[0];
    if (head) {
      this.setFlag('ui.playerHit', {
        x: head.x,
        y: head.y,
        roomId: this.snake.currentRoomId,
        health: next,
        maxHealth: max,
        source: style,
      });
    }
    return next <= 0;
  }

  private maybeQueueFreakJoeyEncounter(roomId: string): void {
    if (this.getFlag<boolean>('npc.freakJoey.defeated')) {
      return;
    }
    if (this.enemies.hasEnemyWithId('freak-joey')) {
      return;
    }
    const room = this.world.getRoom(roomId);
    if (room.questGiver) {
      return;
    }
    if (this.queueRelationshipEncounter(roomId)) {
      return;
    }
    if (this._rng() > 1 / 15) {
      return;
    }
    if (this.visitedRooms.size - this.lastWandererEncounterRoomCount < 5) {
      return;
    }
    const roomsVisited = Number(this.getFlag<number>('roomsVisited') ?? this.visitedRooms.size);
    const encounter = chooseWandererEncounter(this._rng, {
      roomsVisited,
      zoneTags: getRoomEncounterTags(roomId),
      biomeId: room.biomeId,
      excludedIds: this.resolvedWandererEncounters,
      history: this.wandererHistory,
    });
    if (!encounter) {
      return;
    }
    const spawn = this.findEncounterSpawn(roomId);
    if (!spawn) {
      return;
    }
    if (
      encounter.id.startsWith('goblin-') &&
      this.getFactionAlignment('goblin-camps').standing === 'violent'
    ) {
      this.enemies.spawnGoblin(roomId, spawn, encounter.name, 4, this.visitedRooms.size);
      this.lastWandererEncounterRoomCount = this.visitedRooms.size;
      this.setFlag('ui.questInteraction', {
        message: `${encounter.name} sees the old debts on you and comes in biting.`,
      });
      return;
    }
    const history = this.wandererHistory.get(encounter.id);
    this.recordWandererSeen(encounter.id);
    this.lastWandererEncounterRoomCount = this.visitedRooms.size;
    this.setFlag('npc.randomEncounter', {
      ...encounter,
      pages: getEncounterPages(encounter, history),
      roomId,
      x: spawn.x,
      y: spawn.y,
      statsNote: getEncounterStatsNote(encounter.name),
    });
    const revealAtMs = Number(this.getFlag<number>('timeMs') ?? 0);
    this.setFlag('npc.randomEncounter.revealAtMs', revealAtMs);
    this.setFlag('npc.randomEncounter.triggerAtMs', revealAtMs + 2200);
    this.setFlag('ui.wandererReveal', {
      x: spawn.x,
      y: spawn.y,
      roomId,
      id: encounter.id,
    });
  }

  private queueRelationshipEncounter(roomId: string): boolean {
    if (this.visitedRooms.size - this.lastWandererEncounterRoomCount < 5) {
      return false;
    }
    if (this._rng() > 1 / 12) {
      return false;
    }
    const encounter = this.relationshipController.chooseRelationshipEncounter(
      this.getRoomsVisitedCount(),
      this._rng,
    );
    if (!encounter) {
      return false;
    }
    const spawn = this.findEncounterSpawn(roomId);
    if (!spawn) {
      return false;
    }
    const state = this.relationshipController.getState(encounter.relationshipId);
    if (!state) {
      return false;
    }
    if (encounter.kind === 'hostile') {
      this.spawnRelationshipHostile(roomId, state.id, state.displayName);
      this.lastWandererEncounterRoomCount = this.visitedRooms.size;
      return true;
    }
    this.lastWandererEncounterRoomCount = this.visitedRooms.size;
    this.setFlag('npc.randomEncounter', {
      id: `relationship-${state.id}`,
      relationshipId: state.id,
      kind: 'flavor',
      name: encounter.title,
      pages: encounter.pages,
      roomId,
      x: spawn.x,
      y: spawn.y,
      statsNote: `Relationship: ${state.stage}. Affection ${state.affection}, Trust ${state.trust}, Jealousy ${state.jealousy}.`,
      acceptLabel: encounter.acceptLabel,
      rejectLabel: encounter.rejectLabel,
      portraitId: state.portraitId,
      rewardScore: encounter.rewardScore,
      relationshipEncounterKind: encounter.kind,
    });
    const revealAtMs = Number(this.getFlag<number>('timeMs') ?? 0);
    this.setFlag('npc.randomEncounter.revealAtMs', revealAtMs);
    this.setFlag('npc.randomEncounter.triggerAtMs', revealAtMs + 2200);
    this.setFlag('ui.wandererReveal', {
      x: spawn.x,
      y: spawn.y,
      roomId,
      id: state.id,
    });
    return true;
  }

  getWandererEncounterHistory(id: string): EncounterHistoryEntry | undefined {
    const history = this.wandererHistory.get(id);
    return history ? { ...history } : undefined;
  }

  private angerNpc(
    roomId: string,
    reason: 'insult' | 'shot',
  ): { anger: number; hostility: 'friendly' | 'warning' | 'hostile' } | null {
    const room = this.world.getRoom(roomId);
    const giver = room.questGiver;
    if (!giver) {
      return null;
    }
    const current = this.npcDisposition.get(roomId) ?? { anger: 0, hostility: 'friendly' as const };
    const anger = reason === 'shot' ? 99 : current.anger + 1;
    const hostility: 'friendly' | 'warning' | 'hostile' =
      anger >= 2 || reason === 'shot' ? 'hostile' : anger >= 1 ? 'warning' : 'friendly';
    const next = { anger, hostility };
    this.npcDisposition.set(roomId, next);
    if (hostility === 'hostile') {
      if (reason === 'shot' && current.hostility === 'hostile') {
        const hit = this.enemies.damageEnemyAt(
          roomId,
          this.localToWorld(roomId, { x: giver.x, y: giver.y }),
          1,
        );
        if (hit.defeated) {
          this.setFlag('ui.questInteraction', { message: `${giver.name} has been shot dead.` });
        }
        return next;
      }
      const maxHearts = Math.max(3, giver.maxHearts);
      this.enemies.spawnHostileNpc(
        roomId,
        { x: giver.x, y: giver.y },
        giver.name,
        maxHearts,
        undefined,
        reason === 'shot' ? Math.max(1, maxHearts - 1) : maxHearts,
        undefined,
      );
    }
    return next;
  }

  private handleGoblinCampEntered(roomId: string, room: RoomSnapshot): void {
    if (!room.goblinCamp) {
      return;
    }
    const standing = this.getFactionAlignment('goblin-camps').standing;
    this.setFlag('ui.goblinCampReveal', {
      roomId,
      name: room.goblinCamp.name,
      x: room.goblinCamp.center.x,
      y: room.goblinCamp.center.y,
      standing,
    });
    if (standing !== 'violent') {
      return;
    }
    room.goblinCamp.guards.forEach((guard, index) => {
      this.enemies.spawnGoblin(
        roomId,
        { x: guard.x, y: guard.y },
        guard.name,
        Math.max(2, guard.maxHearts ?? 2),
        index,
      );
    });
  }

  private isNpcInLineOfFire(
    room: ReturnType<WorldService['getRoom']>,
    origin: Vector2Like,
    direction: Vector2Like,
    target: Vector2Like,
  ): boolean {
    if (direction.x !== 0) {
      if (origin.y !== target.y) {
        return false;
      }
      if ((target.x - origin.x) * direction.x <= 0) {
        return false;
      }
    } else {
      if (origin.x !== target.x) {
        return false;
      }
      if ((target.y - origin.y) * direction.y <= 0) {
        return false;
      }
    }

    let x = origin.x + direction.x;
    let y = origin.y + direction.y;
    while (x >= 0 && x < this.config.grid.cols && y >= 0 && y < this.config.grid.rows) {
      if (room.layout[y]?.[x] === '#') {
        return false;
      }
      if (x === target.x && y === target.y) {
        return true;
      }
      x += direction.x;
      y += direction.y;
    }
    return false;
  }

  private recordWandererSeen(id: string): void {
    const current = this.wandererHistory.get(id) ?? { seen: 0, accepted: 0, rejected: 0 };
    this.wandererHistory.set(id, {
      ...current,
      seen: current.seen + 1,
    });
  }

  private recordWandererOutcome(id: string, accepted: boolean): void {
    const current = this.wandererHistory.get(id) ?? { seen: 0, accepted: 0, rejected: 0 };
    this.wandererHistory.set(id, {
      seen: Math.max(1, current.seen),
      accepted: current.accepted + (accepted ? 1 : 0),
      rejected: current.rejected + (accepted ? 0 : 1),
    });
  }

  private findEncounterSpawn(roomId: string): Vector2Like | null {
    const room = this.world.getRoom(roomId);
    const [roomX, roomY] = roomId.split(',').map(Number);
    const head = this.snake.bodySegments[0];
    const headLocal = head
      ? {
          x: head.x - roomX * this.config.grid.cols,
          y: head.y - roomY * this.config.grid.rows,
        }
      : { x: Math.floor(this.config.grid.cols / 2), y: Math.floor(this.config.grid.rows / 2) };
    let best: Vector2Like | null = null;
    let bestDistance = -1;
    for (let y = 0; y < this.config.grid.rows; y++) {
      for (let x = 0; x < this.config.grid.cols; x++) {
        if (room.layout[y]?.[x] === '#') continue;
        if (room.apple && room.apple.x === x && room.apple.y === y) continue;
        if (room.treasure && room.treasure.x === x && room.treasure.y === y) continue;
        if (room.powerup && room.powerup.x === x && room.powerup.y === y) continue;
        if (room.questGiver && room.questGiver.x === x && room.questGiver.y === y) continue;
        const distance = Math.abs(x - headLocal.x) + Math.abs(y - headLocal.y);
        if (distance < 5) continue;
        if (distance > bestDistance) {
          bestDistance = distance;
          best = { x, y };
        }
      }
    }
    return best;
  }

  private handleFortitudeRegenerator(roomsChanged: Set<string>): void {
    const base = this.getFlag<{ interval?: number; amount?: number }>('fortitude.regenerator');
    const equip = this.getFlag<{ interval?: number; amount?: number }>('equipment.regenerator');
    const interval = Math.min(
      base?.interval && base.interval > 0 ? base.interval : Number.POSITIVE_INFINITY,
      equip?.interval && equip.interval > 0 ? equip.interval : Number.POSITIVE_INFINITY,
    );
    const amount = (base?.amount ?? 0) + (equip?.amount ?? 0);
    if (!Number.isFinite(interval) || interval <= 0 || amount <= 0) {
      return;
    }
    const counter = (this.getFlag<number>('fortitude.regeneratorCounter') ?? 0) + 1;
    if (counter >= interval) {
      const growAmount = Math.max(1, amount);
      for (let i = 0; i < amount; i += 1) {
        this.snake.grow(1);
      }
      roomsChanged.add(this.snake.currentRoomId);
      this.setFlag('fortitude.regeneratorCounter', 0);
    } else {
      this.setFlag('fortitude.regeneratorCounter', counter);
    }
  }

  private handleFortitudeOnApple(roomsChanged: Set<string>): void {
    this.activateFortitudeInvulnerability();
    this.processFortitudeBloodBank(roomsChanged);
  }

  private handleGrowthOnApple(roomsChanged: Set<string>): void {
    const reserve = this.getFlag<{ stored?: number }>('growth.reserveNutrition');
    const capacity = Math.max(0, Number(this.getFlag<number>('derived.nutritionCapacity') ?? 0));
    const choice = this.getFlag<{ mode?: 'growth' | 'reserve' | 'recovery' }>(
      'growth.digestiveChoice',
    );
    if (reserve && capacity > 0 && choice?.mode === 'reserve') {
      reserve.stored = Math.min(capacity, Number(reserve.stored ?? 0) + 1);
      this.setFlag('growth.reserveNutrition', reserve);
    }

    const regrowthTicks = Number(this.getFlag<number>('growth.rapidRegrowthTicks') ?? 0);
    if (regrowthTicks > 0) {
      this.snake.grow(2);
      roomsChanged.add(this.snake.currentRoomId);
      this.setFlag('growth.rapidRegrowthTicks', undefined);
    }

    const potential = Math.max(0, Number(this.getFlag<number>('growth.ouroborosPotential') ?? 0));
    if (potential > 0) {
      const bonus = Math.min(6, potential);
      this.snake.grow(bonus);
      roomsChanged.add(this.snake.currentRoomId);
      this.setFlag('growth.ouroborosPotential', undefined);
    }

    this.setFlag('ui.skillResources', {
      nutrition: Number(reserve?.stored ?? 0),
      nutritionCapacity: capacity,
      rapidRegrowthTicks: Number(this.getFlag<number>('growth.rapidRegrowthTicks') ?? 0),
      ouroborosPotential: Number(this.getFlag<number>('growth.ouroborosPotential') ?? 0),
    });
  }

  private processFortitudeBloodBank(roomsChanged: Set<string>): void {
    const bank = this.getFlag<{
      stored?: number;
      capacity?: number;
      reward?: { score?: number; growth?: number };
    }>('fortitude.bloodBank');
    if (!bank) {
      return;
    }
    const capacity = Math.max(1, bank.capacity ?? 1);
    const stored = Math.min(capacity, (bank.stored ?? 0) + 1);
    bank.stored = stored;

    if (stored >= capacity) {
      const reward = bank.reward ?? {};
      if (reward.score && reward.score !== 0) {
        this.addScore(reward.score);
      }
      if (reward.growth && reward.growth > 0) {
        for (let i = 0; i < reward.growth; i += 1) {
          this.snake.grow(1);
        }
        roomsChanged.add(this.snake.currentRoomId);
      }
      bank.stored = 0;
    }

    this.setFlag('fortitude.bloodBank', bank);
  }

  private activateFortitudeInvulnerability(): void {
    const base = this.getFlag<{ enabled?: boolean; duration?: number }>(
      'fortitude.invulnerability',
    );
    if (!base) {
      // Still allow equipment-only bonus to have no effect without a base
      // invulnerability flag; so early return if no base present
      return;
    }
    const bonus =
      (this.getFlag<number>('fortitude.invulnerabilityBonus') ?? 0) +
      (this.getFlag<number>('equipment.invulnerabilityBonus') ?? 0);
    const derivedDuration = this.getFlag<number>('derived.wardDuration');
    const duration = Math.max(0, (derivedDuration ?? base.duration ?? 0) + bonus);
    if (duration <= 0) {
      return;
    }
    const current = this.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0;
    const updated = Math.max(current, duration + 1);
    this.setFlag('fortitude.invulnerabilityTicks', updated);
  }

  private grantPostDeathInvulnerability(): void {
    const currentFortitudeInvuln = this.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0;
    const currentBulletInvuln = this.getFlag<number>('player.bulletInvulnTicks') ?? 0;
    this.setFlag(
      'fortitude.invulnerabilityTicks',
      Math.max(currentFortitudeInvuln, POST_DEATH_INVULNERABILITY_TICKS + 1),
    );
    this.setFlag(
      'player.bulletInvulnTicks',
      Math.max(currentBulletInvuln, POST_DEATH_INVULNERABILITY_TICKS),
    );
  }

  private tryFortitudePhoenix(
    outcome: SnakeStepOutcome | { status: 'dead'; reason: StepResult['deathReason'] },
    roomsChanged: Set<string>,
    previousRoomId: string,
  ): boolean {
    if (this.hasWardForDeath(outcome.reason)) {
      return false;
    }
    const state = this.getFlag<{ charges?: number }>('fortitude.phoenix');
    const eqCharges = this.getFlag<number>('equipment.phoenixCharges') ?? 0;
    const charges = (state?.charges ?? 0) + eqCharges;
    if (charges <= 0) {
      return false;
    }

    if ((state?.charges ?? 0) > 0) {
      const remaining = (state?.charges ?? 0) - 1;
      this.setFlag('fortitude.phoenix', { ...state, charges: remaining });
    } else {
      this.setFlag('equipment.phoenixCharges', Math.max(0, eqCharges - 1));
      this.consumeEquippedPhoenixItem();
    }
    this.snake.restorePreviousSnapshot();
    const maxHealth = Number(this.getFlag<number>('player.maxHealth') ?? 3);
    this.setFlag('player.health', maxHealth);
    this.setFlag('player.bulletInvulnTicks', 12);
    this.grantPostDeathInvulnerability();
    this.setFlag('ui.healthRevealed', true);
    roomsChanged.add(previousRoomId);
    this.setFlag('fortitude.phoenixTriggered', { reason: outcome.reason ?? 'unknown' });
    this.setFlag('traversal.manualResumePending', true);
    this.emitPlayerRevivalEvent(outcome.reason ?? 'unknown', 'phoenix');

    const base = this.getFlag<{ duration?: number }>('fortitude.invulnerability');
    const bonus = this.getFlag<number>('fortitude.invulnerabilityBonus') ?? 0;
    if (base && (base.duration ?? 0) + bonus > 0) {
      const current = this.getFlag<number>('fortitude.invulnerabilityTicks') ?? 0;
      const refreshed = Math.max(current, (base.duration ?? 0) + bonus + 1);
      this.setFlag('fortitude.invulnerabilityTicks', refreshed);
    }

    return true;
  }

  reviveAfterExtraLife(reason?: string | null): void {
    this.snake.restorePreviousSnapshot();
    const maxHealth = Number(this.getFlag<number>('player.maxHealth') ?? 3);
    this.setFlag('player.health', maxHealth);
    this.setFlag('player.bulletInvulnTicks', 12);
    this.grantPostDeathInvulnerability();
    this.setFlag('ui.healthRevealed', true);
    this.setFlag('fortitude.phoenixTriggered', undefined);
    this.setFlag('traversal.manualResumePending', true);
    this.emitPlayerRevivalEvent(reason ?? 'unknown', 'extra-life');
  }

  private emitPlayerRevivalEvent(reason: string, source: string): void {
    this.emitWorldEvent({
      type: 'player-revival',
      roomId: this.snake.currentRoomId,
      severity: 50,
      loudness: 25,
      tags: ['player', 'revival', source, reason],
      summary: `The snake revived after ${reason}.`,
      createdAtRoomNumber: this.getRoomsVisitedCount(),
      data: { reason, source },
    });
  }

  returnFromManualResumePause(): boolean {
    if (!this.getFlag<boolean>('traversal.manualResumePending')) {
      return false;
    }
    const caveRuntime = this.getFlag<CaveRuntimeState>('caves.active');
    if (caveRuntime && this.snake.currentRoomId === caveRuntime.caveId) {
      this.exitCurrentCave(new Set([caveRuntime.caveId, caveRuntime.parentRoomId]), 'manual');
      return true;
    }
    if (!this.getFlag('internal.previousSnapshot')) {
      return false;
    }
    this.snake.restorePreviousSnapshot();
    this.setFlag('traversal.manualResumePending', true);
    this.setFlag('ui.questInteraction', { message: 'You step back through the ladder.' });
    return true;
  }

  private consumeEquippedPhoenixItem(): void {
    for (const [slot, itemId] of this.inventory.getAllEquipped()) {
      const item = getItem(itemId);
      const charges = item?.kind === 'equipment' ? (item.modifiers?.phoenixCharges ?? 0) : 0;
      if (charges <= 0) {
        continue;
      }
      this.inventory.removeItem(itemId, 1);
      this.inventory.unequip(slot);
      this.setFlag('equipment.itemPhoenixConsumed', { itemId, slot });
      return;
    }
  }

  private resetMomentum(): void {
    this.momentumConfig = createDefaultMomentumConfig();
    this.momentumState = createDefaultMomentumState();
    this.setFlag('momentum.state', undefined);
    this.setFlag('momentum.phasingTicks', undefined);
    this.setFlag('momentum.surgeTriggered', undefined);
    this.setFlag('momentum.trailActive', undefined);
  }

  private hydrateMomentumConfig(): void {
    const contributions = Object.entries(this.snake.flags)
      .filter(([key]) => key.startsWith('momentum.config.'))
      .map(([, value]) => value)
      .filter(
        (value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object',
      );

    if (contributions.length === 0) {
      this.momentumConfig = createDefaultMomentumConfig();
      return;
    }

    let enabled = false;

    let baseMaxStacks: number | null = null;
    let maxStacksBonus = 0;
    let baseGain: number | null = null;
    let gainBonus = 0;
    let baseDecayDelay: number | null = null;
    let decayDelayBonus = 0;
    let baseDecayLoss: number | null = null;
    let decayLossBonus = 0;
    let baseTurnRetention: number | null = null;
    let turnRetentionBonus = 0;
    let baseTurnForgiveness: number | null = null;
    let turnForgivenessBonus = 0;
    let baseSurgeThreshold: number | null = null;
    let surgeThresholdBonus = 0;
    let baseSurgeDuration: number | null = null;
    let surgeDurationBonus = 0;
    let baseSurgeCooldown: number | null = null;
    let surgeCooldownBonus = 0;
    let baseSurgeConsume: number | null = null;
    let surgeConsumeBonus = 0;
    let baseSurgeInvuln: number | null = null;
    let surgeInvulnBonus = 0;
    let basePhaseTicks: number | null = null;
    let phaseTicksBonus = 0;
    let baseScorePerStack: number | null = null;
    let scorePerStackBonus = 0;
    let baseSurgeScore: number | null = null;
    let surgeScoreBonus = 0;
    let baseTrailTicks: number | null = null;
    let trailTicksBonus = 0;
    let baseTrailScore: number | null = null;
    let trailScoreBonus = 0;

    for (const contribution of contributions) {
      if ((contribution as { enabled?: boolean }).enabled) {
        enabled = true;
      }

      const maxStacksValue = (contribution as { maxStacks?: unknown }).maxStacks;
      if (typeof maxStacksValue === 'number') {
        baseMaxStacks = Math.max(baseMaxStacks ?? maxStacksValue, maxStacksValue);
      }
      const maxStacksBonusValue = (contribution as { maxStacksBonus?: unknown }).maxStacksBonus;
      if (typeof maxStacksBonusValue === 'number') {
        maxStacksBonus += maxStacksBonusValue;
      }

      const gainValue = (contribution as { baseGain?: unknown }).baseGain;
      if (typeof gainValue === 'number') {
        baseGain = Math.max(baseGain ?? gainValue, gainValue);
      }
      const gainBonusValue = (contribution as { gainBonus?: unknown }).gainBonus;
      if (typeof gainBonusValue === 'number') {
        gainBonus += gainBonusValue;
      }

      const decayDelayValue = (contribution as { decayDelay?: unknown }).decayDelay;
      if (typeof decayDelayValue === 'number') {
        baseDecayDelay = Math.max(baseDecayDelay ?? decayDelayValue, decayDelayValue);
      }
      const decayDelayBonusValue = (contribution as { decayDelayBonus?: unknown }).decayDelayBonus;
      if (typeof decayDelayBonusValue === 'number') {
        decayDelayBonus += decayDelayBonusValue;
      }

      const decayLossValue = (contribution as { decayLoss?: unknown }).decayLoss;
      if (typeof decayLossValue === 'number') {
        baseDecayLoss = Math.max(baseDecayLoss ?? decayLossValue, decayLossValue);
      }
      const decayLossBonusValue = (contribution as { decayLossBonus?: unknown }).decayLossBonus;
      if (typeof decayLossBonusValue === 'number') {
        decayLossBonus += decayLossBonusValue;
      }

      const turnRetentionValue = (contribution as { turnRetention?: unknown }).turnRetention;
      if (typeof turnRetentionValue === 'number') {
        baseTurnRetention = Math.max(baseTurnRetention ?? turnRetentionValue, turnRetentionValue);
      }
      const turnRetentionBonusValue = (contribution as { turnRetentionBonus?: unknown })
        .turnRetentionBonus;
      if (typeof turnRetentionBonusValue === 'number') {
        turnRetentionBonus += turnRetentionBonusValue;
      }

      const turnForgivenessValue = (contribution as { turnForgiveness?: unknown }).turnForgiveness;
      if (typeof turnForgivenessValue === 'number') {
        baseTurnForgiveness = Math.max(
          baseTurnForgiveness ?? turnForgivenessValue,
          turnForgivenessValue,
        );
      }
      const turnForgivenessBonusValue = (contribution as { turnForgivenessBonus?: unknown })
        .turnForgivenessBonus;
      if (typeof turnForgivenessBonusValue === 'number') {
        turnForgivenessBonus += turnForgivenessBonusValue;
      }

      const surgeThresholdValue = (contribution as { surgeThreshold?: unknown }).surgeThreshold;
      if (typeof surgeThresholdValue === 'number') {
        baseSurgeThreshold = Math.max(
          baseSurgeThreshold ?? surgeThresholdValue,
          surgeThresholdValue,
        );
      }
      const surgeThresholdBonusValue = (contribution as { surgeThresholdBonus?: unknown })
        .surgeThresholdBonus;
      if (typeof surgeThresholdBonusValue === 'number') {
        surgeThresholdBonus += surgeThresholdBonusValue;
      }

      const surgeDurationValue = (contribution as { surgeDuration?: unknown }).surgeDuration;
      if (typeof surgeDurationValue === 'number') {
        baseSurgeDuration = Math.max(baseSurgeDuration ?? surgeDurationValue, surgeDurationValue);
      }
      const surgeDurationBonusValue = (contribution as { surgeDurationBonus?: unknown })
        .surgeDurationBonus;
      if (typeof surgeDurationBonusValue === 'number') {
        surgeDurationBonus += surgeDurationBonusValue;
      }

      const surgeCooldownValue = (contribution as { surgeCooldown?: unknown }).surgeCooldown;
      if (typeof surgeCooldownValue === 'number') {
        baseSurgeCooldown = Math.max(baseSurgeCooldown ?? surgeCooldownValue, surgeCooldownValue);
      }
      const surgeCooldownBonusValue = (contribution as { surgeCooldownBonus?: unknown })
        .surgeCooldownBonus;
      if (typeof surgeCooldownBonusValue === 'number') {
        surgeCooldownBonus += surgeCooldownBonusValue;
      }

      const surgeConsumeValue = (contribution as { surgeConsume?: unknown }).surgeConsume;
      if (typeof surgeConsumeValue === 'number') {
        baseSurgeConsume = Math.max(baseSurgeConsume ?? surgeConsumeValue, surgeConsumeValue);
      }
      const surgeConsumeBonusValue = (contribution as { surgeConsumeBonus?: unknown })
        .surgeConsumeBonus;
      if (typeof surgeConsumeBonusValue === 'number') {
        surgeConsumeBonus += surgeConsumeBonusValue;
      }

      const surgeInvulnValue = (contribution as { surgeInvulnerability?: unknown })
        .surgeInvulnerability;
      if (typeof surgeInvulnValue === 'number') {
        baseSurgeInvuln = Math.max(baseSurgeInvuln ?? surgeInvulnValue, surgeInvulnValue);
      }
      const surgeInvulnBonusValue = (contribution as { surgeInvulnerabilityBonus?: unknown })
        .surgeInvulnerabilityBonus;
      if (typeof surgeInvulnBonusValue === 'number') {
        surgeInvulnBonus += surgeInvulnBonusValue;
      }

      const phaseTicksValue = (contribution as { phaseTicksOnSurge?: unknown }).phaseTicksOnSurge;
      if (typeof phaseTicksValue === 'number') {
        basePhaseTicks = Math.max(basePhaseTicks ?? phaseTicksValue, phaseTicksValue);
      }
      const phaseTicksBonusValue = (contribution as { phaseTicksOnSurgeBonus?: unknown })
        .phaseTicksOnSurgeBonus;
      if (typeof phaseTicksBonusValue === 'number') {
        phaseTicksBonus += phaseTicksBonusValue;
      }

      const scorePerStackValue = (contribution as { scorePerStack?: unknown }).scorePerStack;
      if (typeof scorePerStackValue === 'number') {
        baseScorePerStack = Math.max(baseScorePerStack ?? scorePerStackValue, scorePerStackValue);
      }
      const scorePerStackBonusValue = (contribution as { scorePerStackBonus?: unknown })
        .scorePerStackBonus;
      if (typeof scorePerStackBonusValue === 'number') {
        scorePerStackBonus += scorePerStackBonusValue;
      }

      const surgeScoreValue = (contribution as { surgeScore?: unknown }).surgeScore;
      if (typeof surgeScoreValue === 'number') {
        baseSurgeScore = Math.max(baseSurgeScore ?? surgeScoreValue, surgeScoreValue);
      }
      const surgeScoreBonusValue = (contribution as { surgeScoreBonus?: unknown }).surgeScoreBonus;
      if (typeof surgeScoreBonusValue === 'number') {
        surgeScoreBonus += surgeScoreBonusValue;
      }

      const trailTicksValue = (contribution as { trailTicks?: unknown }).trailTicks;
      if (typeof trailTicksValue === 'number') {
        baseTrailTicks = Math.max(baseTrailTicks ?? trailTicksValue, trailTicksValue);
      }
      const trailTicksBonusValue = (contribution as { trailTicksBonus?: unknown }).trailTicksBonus;
      if (typeof trailTicksBonusValue === 'number') {
        trailTicksBonus += trailTicksBonusValue;
      }

      const trailScoreValue = (contribution as { trailScorePerTick?: unknown }).trailScorePerTick;
      if (typeof trailScoreValue === 'number') {
        baseTrailScore = Math.max(baseTrailScore ?? trailScoreValue, trailScoreValue);
      }
      const trailScoreBonusValue = (contribution as { trailScorePerTickBonus?: unknown })
        .trailScorePerTickBonus;
      if (typeof trailScoreBonusValue === 'number') {
        trailScoreBonus += trailScoreBonusValue;
      }
    }

    const config = createDefaultMomentumConfig();
    config.enabled = enabled;

    const gainBase = baseGain ?? (enabled ? 1 : 0);
    config.gainPerTick = Math.max(0, gainBase + gainBonus);

    let maxStacks = baseMaxStacks ?? (enabled ? 5 : 0);
    maxStacks = Math.max(0, maxStacks + maxStacksBonus);
    config.maxStacks = Math.round(maxStacks);

    const decayDelayBase = baseDecayDelay ?? (enabled ? 4 : 0);
    config.decayDelay = Math.max(0, Math.round(decayDelayBase + decayDelayBonus));

    const decayLossBase = baseDecayLoss ?? (enabled ? 1 : 0);
    config.decayLoss = Math.max(0, decayLossBase + decayLossBonus);

    const turnRetentionBase = baseTurnRetention ?? (enabled ? 0.25 : 0);
    config.turnRetention = Math.max(0, Math.min(1, turnRetentionBase + turnRetentionBonus));

    const turnForgivenessBase = baseTurnForgiveness ?? 0;
    config.turnForgiveness = Math.max(0, Math.round(turnForgivenessBase + turnForgivenessBonus));

    let surgeThreshold =
      baseSurgeThreshold ?? (config.maxStacks > 0 ? config.maxStacks : Number.POSITIVE_INFINITY);
    surgeThreshold += surgeThresholdBonus;
    if (surgeThreshold <= 0) {
      surgeThreshold = Number.POSITIVE_INFINITY;
    }
    config.surgeThreshold = surgeThreshold;

    const surgeDurationBase = baseSurgeDuration ?? 0;
    config.surgeDuration = Math.max(0, Math.round(surgeDurationBase + surgeDurationBonus));

    const surgeCooldownBase = baseSurgeCooldown ?? 0;
    config.surgeCooldown = Math.max(0, Math.round(surgeCooldownBase + surgeCooldownBonus));

    const surgeConsumeBase = baseSurgeConsume ?? (config.maxStacks > 0 ? 1 : 0);
    config.surgeConsume = Math.max(0, Math.round(surgeConsumeBase + surgeConsumeBonus));

    const surgeInvulnBase = baseSurgeInvuln ?? 0;
    config.surgeInvulnerability = Math.max(0, Math.round(surgeInvulnBase + surgeInvulnBonus));

    const phaseTicksBase = basePhaseTicks ?? 0;
    config.phaseTicksOnSurge = Math.max(0, Math.round(phaseTicksBase + phaseTicksBonus));

    const scorePerStackBase = baseScorePerStack ?? 0;
    config.scorePerStack = Math.max(0, scorePerStackBase + scorePerStackBonus);

    const surgeScoreBase = baseSurgeScore ?? 0;
    config.surgeScore = Math.max(0, Math.round(surgeScoreBase + surgeScoreBonus));

    const trailTicksBase = baseTrailTicks ?? 0;
    config.trailTicks = Math.max(0, Math.round(trailTicksBase + trailTicksBonus));

    const trailScoreBase = baseTrailScore ?? 0;
    config.trailScorePerTick = Math.max(0, Math.round(trailScoreBase + trailScoreBonus));

    this.momentumConfig = config;
  }

  private ensureMomentumState(): MomentumRuntimeState {
    return this.momentumState;
  }

  private syncMomentumFlags(): void {
    const state = this.momentumState;
    if (
      !this.momentumConfig.enabled &&
      state.stacks === 0 &&
      state.surgeTicks === 0 &&
      state.phasingTicks === 0 &&
      state.trailTicks === 0
    ) {
      this.setFlag('momentum.state', undefined);
    } else {
      this.setFlag('momentum.state', {
        stacks: state.stacks,
        surgeTicks: state.surgeTicks,
        cooldown: state.surgeCooldown,
      });
    }

    if (state.phasingTicks > 0) {
      this.setFlag('momentum.phasingTicks', state.phasingTicks);
    } else {
      this.setFlag('momentum.phasingTicks', undefined);
    }

    if (state.trailTicks > 0) {
      this.setFlag('momentum.trailActive', state.trailTicks);
    } else {
      this.setFlag('momentum.trailActive', undefined);
    }
  }

  private handleMomentumStep(previousDirection: Vector2Like, currentDirection: Vector2Like): void {
    const config = this.momentumConfig;
    const state = this.ensureMomentumState();
    if (!config.enabled) {
      return;
    }

    const moving = currentDirection.x !== 0 || currentDirection.y !== 0;
    const prev = state.previousDirection;
    const turned =
      Boolean(prev) && (prev!.x !== currentDirection.x || prev!.y !== currentDirection.y);

    if (moving && (!turned || state.forgivenessTimer > 0)) {
      state.stacks += config.gainPerTick;
      state.decayTimer = config.decayDelay;
      if (state.forgivenessTimer > 0) {
        state.forgivenessTimer -= 1;
      }
    } else if (turned) {
      const retention = Math.max(0, Math.min(1, config.turnRetention));
      state.stacks = Math.floor(state.stacks * retention);
      state.decayTimer = config.decayDelay;
      if (config.turnForgiveness > 0) {
        state.forgivenessTimer = Math.max(state.forgivenessTimer, config.turnForgiveness);
      }
      if (config.trailTicks > 0) {
        state.trailTicks = Math.max(state.trailTicks, config.trailTicks);
      }
    }

    if (moving) {
      state.previousDirection = { ...currentDirection };
    }

    if (state.stacks > config.maxStacks) {
      state.stacks = config.maxStacks;
    }
    if (state.stacks < 0) {
      state.stacks = 0;
    }

    if (
      config.surgeThreshold !== Number.POSITIVE_INFINITY &&
      state.stacks >= config.surgeThreshold &&
      (config.surgeDuration > 0 || config.phaseTicksOnSurge > 0 || config.surgeInvulnerability > 0)
    ) {
      if (state.surgeCooldown <= 0) {
        state.surgeTicks = config.surgeDuration;
        state.surgeCooldown = config.surgeCooldown;
        if (config.surgeConsume > 0) {
          state.stacks = Math.max(0, state.stacks - config.surgeConsume);
        }
        const phaseGrant = config.phaseTicksOnSurge + config.surgeInvulnerability;
        if (phaseGrant > 0) {
          state.phasingTicks = Math.max(state.phasingTicks, phaseGrant);
        }
        if (config.surgeScore > 0) {
          this.addScore(config.surgeScore, 'combo');
        }
        this.setFlag('momentum.surgeTriggered', {
          roomId: this.snake.currentRoomId,
          stacks: state.stacks,
          duration: state.surgeTicks,
        });
      }
    }

    this.syncMomentumFlags();
  }

  private handleMomentumOnApple(
    consumption: AppleConsumptionResult,
    roomsChanged: Set<string>,
  ): number {
    const config = this.momentumConfig;
    if (!config.enabled) {
      return 0;
    }
    const state = this.ensureMomentumState();
    let bonusScore = 0;
    if (config.scorePerStack > 0 && state.stacks > 0) {
      const scoreGain = Math.round(
        applyStackDiminishingReturns(config.scorePerStack, state.stacks),
      );
      if (scoreGain > 0) {
        this.addScore(scoreGain, 'combo');
        bonusScore += scoreGain;
      }
    }
    this.syncMomentumFlags();
    return bonusScore;
  }

  private tickMomentumState(): void {
    const config = this.momentumConfig;
    const state = this.ensureMomentumState();

    if (!config.enabled) {
      if (
        state.stacks !== 0 ||
        state.surgeTicks !== 0 ||
        state.phasingTicks !== 0 ||
        state.trailTicks !== 0
      ) {
        this.momentumState = createDefaultMomentumState();
        this.syncMomentumFlags();
      }
      return;
    }

    if (state.decayTimer > 0) {
      state.decayTimer -= 1;
    } else if (config.decayLoss > 0 && state.stacks > 0) {
      state.stacks = Math.max(0, state.stacks - config.decayLoss);
      state.decayTimer = config.decayDelay;
    }

    if (state.surgeCooldown > 0) {
      state.surgeCooldown -= 1;
    }

    if (state.surgeTicks > 0) {
      state.surgeTicks -= 1;
      if (state.surgeTicks <= 0) {
        this.setFlag('momentum.surgeTriggered', undefined);
      }
    }

    if (state.phasingTicks > 0) {
      state.phasingTicks -= 1;
    }

    if (state.forgivenessTimer > 0) {
      state.forgivenessTimer -= 1;
    }

    if (state.trailTicks > 0) {
      state.trailTicks -= 1;
      if (config.trailScorePerTick > 0) {
        this.addScore(config.trailScorePerTick, 'trail');
      }
    }

    if (state.stacks < 0) {
      state.stacks = 0;
    }
    if (state.stacks > config.maxStacks) {
      state.stacks = config.maxStacks;
    }

    this.syncMomentumFlags();
  }

  private resetTraversal(): void {
    this.traversalConfig = createDefaultTraversalConfig();
    this.traversalState = createDefaultTraversalState();
    this.setFlag('traversal.state', undefined);
    this.setFlag('traversal.phaseTicks', undefined);
    this.setFlag('traversal.ghostShield', undefined);
    this.setFlag('traversal.echoActive', undefined);
  }

  private hydrateTraversalConfig(): void {
    const contributions = Object.entries(this.snake.flags)
      .filter(([key]) => key.startsWith('traversal.config.'))
      .map(([, value]) => value)
      .filter(
        (value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object',
      );

    if (contributions.length === 0) {
      this.traversalConfig = createDefaultTraversalConfig();
      return;
    }

    let enabled = false;

    let baseWidth: number | null = null;
    let widthBonus = 0;
    let baseExtend: number | null = null;
    let extendBonus = 0;
    let basePhaseTicks: number | null = null;
    let phaseTicksBonus = 0;
    let baseGrowth: number | null = null;
    let growthBonus = 0;
    let baseScore: number | null = null;
    let scoreBonus = 0;
    let baseShield: number | null = null;
    let shieldBonus = 0;
    let baseEchoTicks: number | null = null;
    let echoTicksBonus = 0;
    let baseEchoScore: number | null = null;
    let echoScoreBonus = 0;
    let pullApple = false;

    for (const contribution of contributions) {
      if ((contribution as { enabled?: boolean }).enabled) {
        enabled = true;
      }

      const widthValue = (contribution as { corridorWidth?: unknown }).corridorWidth;
      if (typeof widthValue === 'number') {
        baseWidth = Math.max(baseWidth ?? widthValue, widthValue);
      }
      const widthBonusValue = (contribution as { corridorWidthBonus?: unknown }).corridorWidthBonus;
      if (typeof widthBonusValue === 'number') {
        widthBonus += widthBonusValue;
      }

      const extendValue = (contribution as { extendForwardRooms?: unknown }).extendForwardRooms;
      if (typeof extendValue === 'number') {
        baseExtend = Math.max(baseExtend ?? extendValue, extendValue);
      }
      const extendBonusValue = (contribution as { extendForwardRoomsBonus?: unknown })
        .extendForwardRoomsBonus;
      if (typeof extendBonusValue === 'number') {
        extendBonus += extendBonusValue;
      }

      const phaseValue = (contribution as { phaseTicksOnEnter?: unknown }).phaseTicksOnEnter;
      if (typeof phaseValue === 'number') {
        basePhaseTicks = Math.max(basePhaseTicks ?? phaseValue, phaseValue);
      }
      const phaseBonusValue = (contribution as { phaseTicksOnEnterBonus?: unknown })
        .phaseTicksOnEnterBonus;
      if (typeof phaseBonusValue === 'number') {
        phaseTicksBonus += phaseBonusValue;
      }

      const growthValue = (contribution as { growthOnEnter?: unknown }).growthOnEnter;
      if (typeof growthValue === 'number') {
        baseGrowth = Math.max(baseGrowth ?? growthValue, growthValue);
      }
      const growthBonusValue = (contribution as { growthOnEnterBonus?: unknown })
        .growthOnEnterBonus;
      if (typeof growthBonusValue === 'number') {
        growthBonus += growthBonusValue;
      }

      const scoreValue = (contribution as { scoreOnEnter?: unknown }).scoreOnEnter;
      if (typeof scoreValue === 'number') {
        baseScore = Math.max(baseScore ?? scoreValue, scoreValue);
      }
      const scoreBonusValue = (contribution as { scoreOnEnterBonus?: unknown }).scoreOnEnterBonus;
      if (typeof scoreBonusValue === 'number') {
        scoreBonus += scoreBonusValue;
      }

      const shieldValue = (contribution as { ghostShieldCharges?: unknown }).ghostShieldCharges;
      if (typeof shieldValue === 'number') {
        baseShield = Math.max(baseShield ?? shieldValue, shieldValue);
      }
      const shieldBonusValue = (contribution as { ghostShieldChargesBonus?: unknown })
        .ghostShieldChargesBonus;
      if (typeof shieldBonusValue === 'number') {
        shieldBonus += shieldBonusValue;
      }

      const echoTicksValue = (contribution as { echoTicks?: unknown }).echoTicks;
      if (typeof echoTicksValue === 'number') {
        baseEchoTicks = Math.max(baseEchoTicks ?? echoTicksValue, echoTicksValue);
      }
      const echoTicksBonusValue = (contribution as { echoTicksBonus?: unknown }).echoTicksBonus;
      if (typeof echoTicksBonusValue === 'number') {
        echoTicksBonus += echoTicksBonusValue;
      }

      const echoScoreValue = (contribution as { echoScore?: unknown }).echoScore;
      if (typeof echoScoreValue === 'number') {
        baseEchoScore = Math.max(baseEchoScore ?? echoScoreValue, echoScoreValue);
      }
      const echoScoreBonusValue = (contribution as { echoScoreBonus?: unknown }).echoScoreBonus;
      if (typeof echoScoreBonusValue === 'number') {
        echoScoreBonus += echoScoreBonusValue;
      }

      if ((contribution as { pullAppleIntoCorridor?: boolean }).pullAppleIntoCorridor) {
        pullApple = true;
      }
    }

    const config = createDefaultTraversalConfig();
    config.enabled = enabled;

    const widthBase = baseWidth ?? (enabled ? 3 : 0);
    config.corridorWidth = Math.max(0, Math.round(widthBase + widthBonus));

    const extendBase = baseExtend ?? 0;
    config.extendForwardRooms = Math.max(0, Math.round(extendBase + extendBonus));

    const phaseBase = basePhaseTicks ?? 0;
    config.phaseTicksOnEnter = Math.max(0, Math.round(phaseBase + phaseTicksBonus));

    const growthBase = baseGrowth ?? 0;
    config.growthOnEnter = Math.max(0, Math.round(growthBase + growthBonus));

    const scoreBase = baseScore ?? 0;
    config.scoreOnEnter = Math.max(0, Math.round(scoreBase + scoreBonus));

    const shieldBase = baseShield ?? 0;
    config.ghostShieldCharges = Math.max(0, Math.round(shieldBase + shieldBonus));

    const echoTicksBase = baseEchoTicks ?? 0;
    config.echoTicks = Math.max(0, Math.round(echoTicksBase + echoTicksBonus));

    const echoScoreBase = baseEchoScore ?? 0;
    config.echoScore = Math.max(0, Math.round(echoScoreBase + echoScoreBonus));

    config.pullAppleIntoCorridor = pullApple;

    this.traversalConfig = config;
  }

  private ensureTraversalState(): TraversalRuntimeState {
    return this.traversalState;
  }

  private syncTraversalFlags(): void {
    const state = this.traversalState;
    if (
      !this.traversalConfig.enabled &&
      state.ghostShields === 0 &&
      state.phaseTicks === 0 &&
      state.echoTicks === 0
    ) {
      this.setFlag('traversal.state', undefined);
    } else {
      this.setFlag('traversal.state', {
        ghostShields: state.ghostShields,
        phaseTicks: state.phaseTicks,
        echoTicks: state.echoTicks,
      });
    }

    if (state.phaseTicks > 0) {
      this.setFlag('traversal.phaseTicks', state.phaseTicks);
    } else {
      this.setFlag('traversal.phaseTicks', undefined);
    }

    if (state.ghostShields > 0) {
      this.setFlag('traversal.ghostShield', { charges: state.ghostShields });
    } else {
      this.setFlag('traversal.ghostShield', undefined);
    }

    if (state.echoTicks > 0) {
      this.setFlag('traversal.echoActive', state.echoTicks);
    } else {
      this.setFlag('traversal.echoActive', undefined);
    }
  }

  private handleTraversalRoomChange(
    previousRoomId: string,
    currentRoomId: string,
    roomsChanged: Set<string>,
  ): void {
    const config = this.traversalConfig;
    if (!config.enabled) {
      return;
    }

    if (config.corridorWidth > 0) {
      this.carveTraversalCorridor(
        currentRoomId,
        this.snake.directionVector,
        config.corridorWidth,
        config.extendForwardRooms,
        roomsChanged,
        config.pullAppleIntoCorridor,
      );
    }

    if (config.scoreOnEnter > 0) {
      this.addScore(config.scoreOnEnter);
    }

    if (config.growthOnEnter > 0) {
      for (let i = 0; i < config.growthOnEnter; i += 1) {
        this.snake.grow(1);
      }
      roomsChanged.add(currentRoomId);
    }

    if (config.ghostShieldCharges > 0) {
      const state = this.ensureTraversalState();
      state.ghostShields = Math.max(state.ghostShields, config.ghostShieldCharges);
    }

    if (config.phaseTicksOnEnter > 0) {
      const state = this.ensureTraversalState();
      state.phaseTicks = Math.max(state.phaseTicks, config.phaseTicksOnEnter);
    }

    if (config.echoTicks > 0) {
      const state = this.ensureTraversalState();
      state.echoTicks = Math.max(state.echoTicks, config.echoTicks);
    }

    this.syncTraversalFlags();
  }

  private tickTraversalState(): void {
    const config = this.traversalConfig;
    const state = this.ensureTraversalState();

    if (!config.enabled) {
      if (state.ghostShields !== 0 || state.phaseTicks !== 0 || state.echoTicks !== 0) {
        this.traversalState = createDefaultTraversalState();
        this.syncTraversalFlags();
      }
      return;
    }

    if (state.phaseTicks > 0) {
      state.phaseTicks -= 1;
    }

    if (state.echoTicks > 0) {
      state.echoTicks -= 1;
      if (config.echoScore > 0) {
        this.addScore(config.echoScore, 'trail');
      }
    }

    const shieldFlag = this.getFlag<{ charges?: number }>('traversal.ghostShield');
    if (shieldFlag && typeof shieldFlag.charges === 'number') {
      state.ghostShields = Math.max(0, shieldFlag.charges);
    }

    if (state.phaseTicks < 0) {
      state.phaseTicks = 0;
    }
    if (state.echoTicks < 0) {
      state.echoTicks = 0;
    }

    this.syncTraversalFlags();
  }

  private carveTraversalCorridor(
    roomId: string,
    direction: Vector2Like,
    width: number,
    extendForwardRooms: number,
    roomsChanged: Set<string>,
    pullApple: boolean,
  ): void {
    const axisX = Math.abs(direction.x) >= Math.abs(direction.y) ? Math.sign(direction.x) : 0;
    const axisY = axisX === 0 ? Math.sign(direction.y) : 0;
    const visited = new Set<string>();
    let currentRoomId: string | null = roomId;
    let baseLocal: { localX: number; localY: number } | null = null;
    const head = this.snake.bodySegments[0];
    if (head) {
      const info = this.resolveRoomPosition(head);
      if (info) {
        baseLocal = { localX: info.localX, localY: info.localY };
      }
    }

    const totalSteps = Math.max(0, extendForwardRooms);
    for (let step = 0; step <= totalSteps; step += 1) {
      if (!currentRoomId || visited.has(currentRoomId)) {
        break;
      }
      visited.add(currentRoomId);
      this.openTraversalCorridorInRoom(
        currentRoomId,
        axisX,
        axisY,
        width,
        baseLocal,
        pullApple,
        roomsChanged,
      );
      const nextRoomId = this.shiftRoomId(currentRoomId, axisX, axisY);
      currentRoomId = nextRoomId;
      baseLocal = null;
    }
  }

  private openTraversalCorridorInRoom(
    roomId: string,
    axisX: number,
    axisY: number,
    width: number,
    baseLocal: { localX: number; localY: number } | null,
    pullApple: boolean,
    roomsChanged: Set<string>,
  ): void {
    const room = this.world.getRoom(roomId);
    if (!room) {
      return;
    }
    const cols = this.config.grid.cols;
    const rows = this.config.grid.rows;
    const orientationHorizontal = axisX !== 0 || axisY === 0;
    const centerX = baseLocal?.localX ?? Math.floor(cols / 2);
    const centerY = baseLocal?.localY ?? Math.floor(rows / 2);
    const halfWidth = Math.max(0, Math.floor((width - 1) / 2));

    if (orientationHorizontal) {
      for (let offset = -halfWidth; offset <= halfWidth; offset += 1) {
        const rowIndex = centerY + offset;
        if (rowIndex < 0 || rowIndex >= rows) {
          continue;
        }
        const row = room.layout[rowIndex];
        if (!row) {
          continue;
        }
        for (let x = 0; x < cols; x += 1) {
          if (row[x] === '#') {
            this.setRoomTile(roomId, x, rowIndex, '.');
          }
        }
      }
      if (pullApple && room.apple) {
        const minRow = Math.max(0, centerY - halfWidth);
        const maxRow = Math.min(rows - 1, centerY + halfWidth);
        if (room.apple.y < minRow || room.apple.y > maxRow) {
          const targetY = Math.min(Math.max(centerY, 0), rows - 1);
          const targetX = Math.min(Math.max(centerX, 0), cols - 1);
          this.world.setApple(roomId, { x: targetX, y: targetY });
        }
      }
    } else {
      for (let offset = -halfWidth; offset <= halfWidth; offset += 1) {
        const colIndex = centerX + offset;
        if (colIndex < 0 || colIndex >= cols) {
          continue;
        }
        for (let y = 0; y < rows; y += 1) {
          const row = room.layout[y];
          if (!row) {
            continue;
          }
          if (row[colIndex] === '#') {
            this.setRoomTile(roomId, colIndex, y, '.');
          }
        }
      }
      if (pullApple && room.apple) {
        const minCol = Math.max(0, centerX - halfWidth);
        const maxCol = Math.min(cols - 1, centerX + halfWidth);
        if (room.apple.x < minCol || room.apple.x > maxCol) {
          const targetX = Math.min(Math.max(centerX, 0), cols - 1);
          const targetY = Math.min(Math.max(centerY, 0), rows - 1);
          this.world.setApple(roomId, { x: targetX, y: targetY });
        }
      }
    }

    roomsChanged.add(roomId);
  }

  private shiftRoomId(roomId: string, axisX: number, axisY: number): string | null {
    if (axisX === 0 && axisY === 0) {
      return null;
    }
    const [roomX, roomY, roomZ = '0'] = roomId.split(',');
    const nextX = Number(roomX) + axisX;
    const nextY = Number(roomY) + axisY;
    if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
      return null;
    }
    return `${nextX},${nextY},${roomZ}`;
  }
  private handlePredationOnApple(
    consumption: AppleConsumptionResult,
    roomsChanged: Set<string>,
    head: Vector2Like | undefined,
  ): { score: number; growth: number } {
    const config = this.predationConfig;
    if (!config.enabled) {
      return { score: 0, growth: 0 };
    }

    this.setFlag('predation.rendConsumed', undefined);
    this.setFlag('predation.apexTriggered', undefined);

    const state = this.ensurePredationState();
    const quickWindow = config.quickEatWindow;
    const quickEligible = quickWindow > 0 && state.ticksSinceLastApple <= quickWindow;
    const maxStacks = Math.max(config.maxStacks, state.stacks + Math.max(config.stackGain, 1));
    let stackGain = Math.max(1, config.stackGain);
    if (quickEligible && config.bonusStacksOnQuickEat > 0) {
      stackGain += config.bonusStacksOnQuickEat;
    }

    state.ticksSinceLastApple = 0;
    state.stacks = Math.min(maxStacks, state.stacks + stackGain);
    state.timer = config.window;
    state.decayHold = config.decayHold;
    state.lastRoomId = this.snake.currentRoomId;

    if (config.scentDuration > 0) {
      state.scentTicks = config.scentDuration;
    }

    const bonus = { score: 0, growth: 0 };

    if (config.scorePerStack > 0 && state.stacks > 0) {
      const scoreGain = Math.ceil(applyStackDiminishingReturns(config.scorePerStack, state.stacks));
      if (scoreGain > 0) {
        this.addScore(scoreGain, 'combo');
        bonus.score += scoreGain;
      }
    }

    if (config.rend.enabled) {
      const maxCharges = Math.max(0, config.rend.maxCharges);
      if (state.stacks >= config.rend.gainThreshold && maxCharges > 0) {
        state.rendCharges = Math.min(maxCharges, state.rendCharges + 1);
      }
      if (
        state.rendCharges > 0 &&
        (config.rend.scorePerCharge > 0 || config.rend.growthPerCharge > 0)
      ) {
        state.rendCharges -= 1;
        if (config.rend.scorePerCharge > 0) {
          this.addScore(config.rend.scorePerCharge);
          bonus.score += config.rend.scorePerCharge;
        }
        if (config.rend.growthPerCharge > 0) {
          for (let i = 0; i < config.rend.growthPerCharge; i += 1) {
            this.snake.grow(1);
          }
          bonus.growth += config.rend.growthPerCharge;
          roomsChanged.add(this.snake.currentRoomId);
        }
        this.setFlag('predation.rendConsumed', {
          roomId: this.snake.currentRoomId,
          head: head ? { x: head.x, y: head.y } : undefined,
        });
      }
    }

    const frenzyAvailable =
      Number.isFinite(config.frenzyThreshold) && state.stacks >= config.frenzyThreshold;
    if (frenzyAvailable && config.frenzyDuration > 0 && state.frenzyTicks <= 0) {
      state.frenzyTicks = config.frenzyDuration;
      this.setFlag('predation.frenzyTriggered', {
        roomId: this.snake.currentRoomId,
        stacks: state.stacks,
      });
    }

    if (
      config.apex.enabled &&
      state.frenzyTicks > 0 &&
      state.stacks >= config.apex.requiredStacks &&
      state.apexCooldown <= 0
    ) {
      state.apexCooldown = config.apex.cooldown;
      if (config.apex.score > 0) {
        this.addScore(config.apex.score);
        bonus.score += config.apex.score;
      }
      if (config.apex.growth > 0) {
        for (let i = 0; i < config.apex.growth; i += 1) {
          this.snake.grow(1);
        }
        bonus.growth += config.apex.growth;
        roomsChanged.add(this.snake.currentRoomId);
      }
      state.stacks = Math.max(0, state.stacks - config.apex.requiredStacks);
      this.setFlag('predation.apexTriggered', {
        roomId: this.snake.currentRoomId,
        stacks: state.stacks,
      });
    }

    this.syncPredationFlags();
    return bonus;
  }

  private handlePredationOnRoomChange(newRoomId: string): void {
    const config = this.predationConfig;
    const state = this.ensurePredationState();
    state.lastRoomId = newRoomId;
    if (!config.enabled || config.stackGainOnRoomEnter <= 0) {
      this.syncPredationFlags();
      return;
    }
    const maxStacks = Math.max(config.maxStacks, state.stacks + config.stackGainOnRoomEnter);
    state.stacks = Math.min(maxStacks, state.stacks + config.stackGainOnRoomEnter);
    if (state.stacks > 0) {
      if (config.window > 0) {
        state.timer = Math.max(state.timer, config.window);
      }
      state.decayHold = config.decayHold;
    }
    this.syncPredationFlags();
  }
  private resetPredation(): void {
    this.predationConfig = createDefaultPredationConfig();
    this.predationState = createDefaultPredationState();
    this.predationState.lastRoomId = this.snake.currentRoomId;
    this.syncPredationFlags();
    this.setFlag('predation.scentTicks', undefined);
    this.setFlag('predation.frenzyTriggered', undefined);
    this.setFlag('predation.rendConsumed', undefined);
    this.setFlag('predation.apexTriggered', undefined);
  }

  private hydratePredationConfig(): void {
    const contributions = Object.entries(this.snake.flags)
      .filter(([key]) => key.startsWith('predation.config.'))
      .map(([, value]) => value)
      .filter(
        (value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object',
      );

    if (contributions.length === 0) {
      this.predationConfig = createDefaultPredationConfig();
      this.syncPredationFlags();
      return;
    }

    let enabled = false;
    let baseWindow = 0;
    let windowBonus = 0;
    let baseDecayHold = 0;
    let decayHoldBonus = 0;
    let decayStep = 1;
    let decayStepBonus = 0;
    let baseMaxStacks = 0;
    let maxStacksBonus = 0;
    let stackGain = 1;
    let stackGainBonus = 0;
    let baseScorePerStack = 0;
    let scorePerStackBonus = 0;
    let baseQuickWindow = 0;
    let quickWindowBonus = 0;
    let bonusStacksOnQuick = 0;
    let stackGainOnRoomEnter = 0;
    let scentDuration = 0;

    let frenzyThresholdBase = Number.POSITIVE_INFINITY;
    let frenzyThresholdBonus = 0;
    let frenzyDurationBase = 0;
    let frenzyDurationBonus = 0;
    let frenzyScoreBonus = 0;

    let rendEnabled = false;
    let rendGainThreshold = Number.POSITIVE_INFINITY;
    let rendMaxChargesBase = 0;
    let rendMaxChargesBonus = 0;
    let rendGrowthPerCharge = 0;
    let rendScorePerCharge = 0;

    let apexEnabled = false;
    let apexRequiredStacks = Number.POSITIVE_INFINITY;
    let apexScore = 0;
    let apexGrowth = 0;
    let apexCooldown = 0;

    for (const contribution of contributions) {
      if ((contribution as { enabled?: boolean }).enabled) {
        enabled = true;
      }

      const windowValue = (contribution as { window?: unknown }).window;
      if (typeof windowValue === 'number' && windowValue > baseWindow) {
        baseWindow = windowValue;
      }
      const windowBonusValue = (contribution as { windowBonus?: unknown }).windowBonus;
      if (typeof windowBonusValue === 'number') {
        windowBonus += windowBonusValue;
      }

      const decayHoldValue = (contribution as { decayHold?: unknown }).decayHold;
      if (typeof decayHoldValue === 'number' && decayHoldValue > baseDecayHold) {
        baseDecayHold = decayHoldValue;
      }
      const decayHoldBonusValue = (contribution as { decayHoldBonus?: unknown }).decayHoldBonus;
      if (typeof decayHoldBonusValue === 'number') {
        decayHoldBonus += decayHoldBonusValue;
      }

      const decayStepValue = (contribution as { decayStep?: unknown }).decayStep;
      if (typeof decayStepValue === 'number' && decayStepValue > 0) {
        decayStep = Math.max(decayStep, Math.floor(decayStepValue));
      }
      const decayStepBonusValue = (contribution as { decayStepBonus?: unknown }).decayStepBonus;
      if (typeof decayStepBonusValue === 'number') {
        decayStepBonus += decayStepBonusValue;
      }

      const stackGainValue = (contribution as { stackGain?: unknown }).stackGain;
      if (typeof stackGainValue === 'number' && stackGainValue > stackGain) {
        stackGain = stackGainValue;
      }
      const stackGainBonusValue = (contribution as { stackGainBonus?: unknown }).stackGainBonus;
      if (typeof stackGainBonusValue === 'number') {
        stackGainBonus += stackGainBonusValue;
      }

      const maxStacksValue = (contribution as { maxStacks?: unknown }).maxStacks;
      if (typeof maxStacksValue === 'number' && maxStacksValue > baseMaxStacks) {
        baseMaxStacks = maxStacksValue;
      }
      const maxStacksBonusValue = (contribution as { maxStacksBonus?: unknown }).maxStacksBonus;
      if (typeof maxStacksBonusValue === 'number') {
        maxStacksBonus += maxStacksBonusValue;
      }

      const scorePerStackValue = (contribution as { scorePerStack?: unknown }).scorePerStack;
      if (typeof scorePerStackValue === 'number') {
        baseScorePerStack += scorePerStackValue;
      }
      const scorePerStackBonusValue = (contribution as { scorePerStackBonus?: unknown })
        .scorePerStackBonus;
      if (typeof scorePerStackBonusValue === 'number') {
        scorePerStackBonus += scorePerStackBonusValue;
      }

      const quickEatWindowValue = (contribution as { quickEatWindow?: unknown }).quickEatWindow;
      if (typeof quickEatWindowValue === 'number' && quickEatWindowValue > baseQuickWindow) {
        baseQuickWindow = quickEatWindowValue;
      }
      const quickEatWindowBonusValue = (contribution as { quickEatWindowBonus?: unknown })
        .quickEatWindowBonus;
      if (typeof quickEatWindowBonusValue === 'number') {
        quickWindowBonus += quickEatWindowBonusValue;
      }

      const bonusStacksValue = (contribution as { bonusStacksOnQuickEat?: unknown })
        .bonusStacksOnQuickEat;
      if (typeof bonusStacksValue === 'number') {
        bonusStacksOnQuick += bonusStacksValue;
      }

      const stackGainOnRoomEnterValue = (contribution as { stackGainOnRoomEnter?: unknown })
        .stackGainOnRoomEnter;
      if (typeof stackGainOnRoomEnterValue === 'number') {
        stackGainOnRoomEnter += stackGainOnRoomEnterValue;
      }

      const scentDurationValue = (contribution as { scentDuration?: unknown }).scentDuration;
      if (typeof scentDurationValue === 'number' && scentDurationValue > scentDuration) {
        scentDuration = scentDurationValue;
      }

      const frenzyValue = (contribution as { frenzy?: unknown }).frenzy;
      if (frenzyValue && typeof frenzyValue === 'object') {
        const frenzy = frenzyValue as Record<string, unknown>;
        const threshold = frenzy.threshold;
        if (typeof threshold === 'number' && threshold < frenzyThresholdBase) {
          frenzyThresholdBase = threshold;
        }
        const thresholdBonus = frenzy.thresholdBonus;
        if (typeof thresholdBonus === 'number') {
          frenzyThresholdBonus += thresholdBonus;
        }
        const duration = frenzy.duration;
        if (typeof duration === 'number' && duration > frenzyDurationBase) {
          frenzyDurationBase = duration;
        }
        const durationBonus = frenzy.durationBonus;
        if (typeof durationBonus === 'number') {
          frenzyDurationBonus += durationBonus;
        }
        const scoreBonus = frenzy.scoreBonus;
        if (typeof scoreBonus === 'number') {
          frenzyScoreBonus += scoreBonus;
        }
      }

      const rendValue = (contribution as { rend?: unknown }).rend;
      if (rendValue && typeof rendValue === 'object') {
        const rend = rendValue as Record<string, unknown>;
        if (rend.enabled === true) {
          rendEnabled = true;
        }
        const gainThreshold = rend.gainThreshold;
        if (typeof gainThreshold === 'number' && gainThreshold < rendGainThreshold) {
          rendGainThreshold = gainThreshold;
        }
        const maxCharges = rend.maxCharges;
        if (typeof maxCharges === 'number' && maxCharges > rendMaxChargesBase) {
          rendMaxChargesBase = maxCharges;
        }
        const maxChargesBonusValue = rend.maxChargesBonus;
        if (typeof maxChargesBonusValue === 'number') {
          rendMaxChargesBonus += maxChargesBonusValue;
        }
        const growthPerCharge = rend.growthPerCharge;
        if (typeof growthPerCharge === 'number' && growthPerCharge > rendGrowthPerCharge) {
          rendGrowthPerCharge = growthPerCharge;
        }
        const scorePerChargeValue = rend.scorePerCharge;
        if (typeof scorePerChargeValue === 'number' && scorePerChargeValue > rendScorePerCharge) {
          rendScorePerCharge = scorePerChargeValue;
        }
      }

      const apexValue = (contribution as { apex?: unknown }).apex;
      if (apexValue && typeof apexValue === 'object') {
        const apex = apexValue as Record<string, unknown>;
        apexEnabled = true;
        const requiredStacks = apex.requiredStacks;
        if (typeof requiredStacks === 'number' && requiredStacks < apexRequiredStacks) {
          apexRequiredStacks = requiredStacks;
        }
        const apexScoreValue = apex.score;
        if (typeof apexScoreValue === 'number' && apexScoreValue > apexScore) {
          apexScore = apexScoreValue;
        }
        const apexGrowthValue = apex.growth;
        if (typeof apexGrowthValue === 'number' && apexGrowthValue > apexGrowth) {
          apexGrowth = apexGrowthValue;
        }
        const apexCooldownValue = apex.cooldown;
        if (typeof apexCooldownValue === 'number' && apexCooldownValue > apexCooldown) {
          apexCooldown = apexCooldownValue;
        }
      }
    }

    const config = createDefaultPredationConfig();
    config.enabled =
      enabled || baseWindow > 0 || baseScorePerStack > 0 || rendEnabled || apexEnabled;

    config.window = Math.max(0, Math.round(baseWindow + windowBonus));
    config.decayHold = Math.max(0, Math.round(baseDecayHold + decayHoldBonus));
    config.decayStep = Math.max(1, Math.round(decayStep + decayStepBonus));
    config.maxStacks = Math.max(0, Math.floor(baseMaxStacks + maxStacksBonus));
    config.stackGain = Math.max(1, Math.floor(stackGain + stackGainBonus));
    config.scorePerStack = Math.max(0, baseScorePerStack + scorePerStackBonus);
    config.quickEatWindow = Math.max(0, Math.round(baseQuickWindow + quickWindowBonus));
    config.bonusStacksOnQuickEat = Math.max(0, Math.floor(bonusStacksOnQuick));
    config.stackGainOnRoomEnter = Math.max(0, Math.floor(stackGainOnRoomEnter));
    config.scentDuration = Math.max(0, Math.round(scentDuration));

    const frenzyThreshold = frenzyThresholdBase + frenzyThresholdBonus;
    if (Number.isFinite(frenzyThreshold) && frenzyThreshold > 0) {
      config.frenzyThreshold = Math.max(1, Math.round(frenzyThreshold));
      config.frenzyDuration = Math.max(0, Math.round(frenzyDurationBase + frenzyDurationBonus));
      config.frenzyScoreBonus = Math.max(0, frenzyScoreBonus);
    }

    if (rendEnabled) {
      config.rend.enabled = true;
      config.rend.gainThreshold = Math.max(
        1,
        Math.round(Number.isFinite(rendGainThreshold) ? rendGainThreshold : 2),
      );
      config.rend.maxCharges = Math.max(0, Math.floor(rendMaxChargesBase + rendMaxChargesBonus));
      config.rend.growthPerCharge = Math.max(0, Math.floor(rendGrowthPerCharge));
      config.rend.scorePerCharge = Math.max(0, rendScorePerCharge);
    }

    if (apexEnabled) {
      config.apex.enabled = true;
      config.apex.requiredStacks = Math.max(
        1,
        Math.round(Number.isFinite(apexRequiredStacks) ? apexRequiredStacks : 6),
      );
      config.apex.score = Math.max(0, apexScore);
      config.apex.growth = Math.max(0, Math.floor(apexGrowth));
      config.apex.cooldown = Math.max(0, Math.round(apexCooldown));
    }

    if (config.maxStacks === 0 && config.enabled) {
      config.maxStacks = 1;
    }

    this.predationConfig = config;
    this.syncPredationFlags();
  }

  private ensurePredationState(): PredationRuntimeState {
    if (!this.predationState.lastRoomId) {
      this.predationState.lastRoomId = this.snake.currentRoomId;
    }
    return this.predationState;
  }

  private syncPredationFlags(): void {
    const state = this.predationState;
    const config = this.predationConfig;

    if (
      !config.enabled &&
      state.stacks === 0 &&
      state.rendCharges === 0 &&
      state.frenzyTicks === 0 &&
      state.scentTicks === 0
    ) {
      this.setFlag('predation.state', undefined);
      this.setFlag('predation.scentTicks', undefined);
      this.setFlag('predation.frenzyActive', undefined);
      return;
    }

    this.setFlag('predation.state', {
      stacks: state.stacks,
      timer: state.timer,
      decayHold: state.decayHold,
      frenzyTicks: state.frenzyTicks,
      frenzyCooldown: state.frenzyCooldown,
      rendCharges: state.rendCharges,
      apexCooldown: state.apexCooldown,
      scentTicks: state.scentTicks,
    });

    if (state.scentTicks > 0) {
      this.setFlag('predation.scentTicks', state.scentTicks);
    } else {
      this.setFlag('predation.scentTicks', undefined);
    }

    if (state.frenzyTicks > 0) {
      this.setFlag('predation.frenzyActive', state.frenzyTicks);
    } else {
      this.setFlag('predation.frenzyActive', undefined);
    }
  }

  private tickPredationTimers(): void {
    const config = this.predationConfig;
    const state = this.ensurePredationState();

    if (config.enabled && state.frenzyTicks > 0 && config.frenzyScoreBonus > 0) {
      this.addScore(config.frenzyScoreBonus, 'frenzy');
    }

    if (!config.enabled) {
      if (
        state.stacks !== 0 ||
        state.rendCharges !== 0 ||
        state.frenzyTicks !== 0 ||
        state.scentTicks !== 0
      ) {
        this.predationState = createDefaultPredationState();
        this.predationState.lastRoomId = this.snake.currentRoomId;
        this.syncPredationFlags();
      }
      return;
    }

    state.ticksSinceLastApple = Math.min(state.ticksSinceLastApple + 1, Number.MAX_SAFE_INTEGER);

    if (state.frenzyTicks > 0) {
      state.frenzyTicks -= 1;
    } else if (state.frenzyCooldown > 0) {
      state.frenzyCooldown -= 1;
    }

    if (state.apexCooldown > 0) {
      state.apexCooldown -= 1;
    }

    if (state.scentTicks > 0) {
      state.scentTicks -= 1;
    }

    if (state.stacks <= 0) {
      state.timer = 0;
      state.decayHold = 0;
      this.syncPredationFlags();
      return;
    }

    if (state.timer > 0) {
      state.timer -= 1;
      this.syncPredationFlags();
      return;
    }

    if (state.decayHold > 0) {
      state.decayHold -= 1;
      this.syncPredationFlags();
      return;
    }

    const loss = Math.max(1, config.decayStep);
    state.stacks = Math.max(0, state.stacks - loss);
    if (state.stacks > 0) {
      state.timer = config.window;
      state.decayHold = config.decayHold;
    } else {
      state.timer = 0;
      state.decayHold = 0;
      state.frenzyTicks = 0;
      this.setFlag('predation.frenzyActive', undefined);
    }

    this.syncPredationFlags();
  }
  private applyMasonry(
    lastTail: { x: number; y: number; roomId?: string },
    snake: readonly Vector2Like[],
    roomsChanged: Set<string>,
  ): void {
    const info = this.resolveRoomPosition(lastTail);
    if (!info) {
      return;
    }
    const { roomId, localX, localY } = info;
    if (this.isSnakeOccupying(lastTail, snake)) {
      return;
    }
    const room = this.world.getRoom(roomId);
    const tile = room.layout[localY]?.[localX];
    if (!tile || tile === '#' || tile === '%' || tile === 'H') {
      return;
    }
    if (room.apple && room.apple.x === localX && room.apple.y === localY) {
      this.world.setApple(roomId, undefined);
    }
    if (this.setRoomTile(roomId, localX, localY, '%')) {
      roomsChanged.add(roomId);
      // Notify the scene to track this block's creation time for crumbling animation
      this.setFlag('ui.masonryBlockCreated', { x: lastTail.x, y: lastTail.y, roomId });
    }
  }

  /**
   * Returns true if the given tile is a masonry building block.
   * Masonry blocks act like walls for entities but crumble after a short time
   * and can be passed through by the snake itself.
   */
  isMasonryBlock(tile: string): boolean {
    return tile === '%';
  }

  /**
   * Returns true if the tile is a wall or masonry block.
   * Used for entity collision checks.
   */
  isSolidTile(tile: string): boolean {
    return tile === '#' || tile === '%';
  }

  private applyFaultLine(head: Vector2Like, roomsChanged: Set<string>): void {
    const info = this.resolveRoomPosition(head);
    if (!info) {
      return;
    }
    const { roomId, localY } = info;
    const room = this.world.getRoom(roomId);
    const row = room.layout[localY];
    if (!row) {
      return;
    }
    const chars = row.split('');
    let changed = false;
    for (let x = 0; x < chars.length; x++) {
      if (chars[x] === '#') {
        chars[x] = '.';
        changed = true;
      }
    }
    if (changed) {
      room.layout[localY] = chars.join('');
      roomsChanged.add(roomId);
      // UI: horizontal sweep at the affected row
      this.setFlag('ui.faultLine', { roomId, y: localY });
    }
  }

  private triggerSeismicPulse(head: Vector2Like, radius: number, roomsChanged: Set<string>): void {
    if (radius <= 0) {
      return;
    }
    const info = this.resolveRoomPosition(head);
    if (!info) {
      return;
    }
    const { roomId, localX, localY } = info;
    const room = this.world.getRoom(roomId);
    let changed = false;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const targetX = localX + dx;
        const targetY = localY + dy;
        if (
          targetX < 0 ||
          targetX >= this.config.grid.cols ||
          targetY < 0 ||
          targetY >= this.config.grid.rows
        ) {
          continue;
        }
        const tile = room.layout[targetY]?.[targetX];
        if (tile !== '#') {
          continue;
        }
        if (this.setRoomTile(roomId, targetX, targetY, '.')) {
          changed = true;
        }
      }
    }
    if (changed) {
      roomsChanged.add(roomId);
      // UI: seismic pulse burst at head position
      this.setFlag('ui.seismicPulse', { x: head.x, y: head.y, roomId, radius });
    }
  }

  private triggerCollapseControl(
    head: Vector2Like,
    snake: readonly Vector2Like[],
    roomsChanged: Set<string>,
  ): void {
    const info = this.resolveRoomPosition(head);
    if (!info) {
      return;
    }
    const { roomId, localX, localY } = info;
    const room = this.world.getRoom(roomId);
    const offsets: Vector2Like[] = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    let changed = false;
    for (const offset of offsets) {
      const targetX = localX + offset.x;
      const targetY = localY + offset.y;
      const worldPos = { x: head.x + offset.x, y: head.y + offset.y };
      if (
        targetX < 0 ||
        targetX >= this.config.grid.cols ||
        targetY < 0 ||
        targetY >= this.config.grid.rows ||
        this.isSnakeOccupying(worldPos, snake)
      ) {
        continue;
      }
      const tile = room.layout[targetY]?.[targetX];
      if (!tile || tile === '#' || tile === 'H') {
        continue;
      }
      if (room.apple && room.apple.x === targetX && room.apple.y === targetY) {
        this.world.setApple(roomId, undefined);
      }
      if (this.setRoomTile(roomId, targetX, targetY, '#')) {
        changed = true;
      }
    }
    if (changed) {
      roomsChanged.add(roomId);
      // UI: construction sparks at head
      this.setFlag('ui.collapseControl', { x: head.x, y: head.y, roomId });
    }
  }

  private handleWallEaten(
    info: { x: number; y: number; roomId: string },
    roomsChanged: Set<string>,
  ): void {
    roomsChanged.add(info.roomId);
    const reward = this.getFlag<{ score?: number; growth?: number }>('geometry.worldEaterReward');
    const bonusScore = reward?.score ?? 1;
    const bonusGrowth = reward?.growth ?? 0;
    if (bonusScore !== 0) {
      this.addScore(bonusScore, 'worldEater');
    }
    if (bonusGrowth > 0) {
      this.snake.grow(bonusGrowth);
    }
    // UI: debris burst
    this.setFlag('ui.wallChomp', { x: info.x, y: info.y, roomId: info.roomId });
  }

  private rechargeTerraShield(): void {
    const shield = this.getFlag<{ charges: number; max?: number; recharge?: number }>(
      'geometry.terraShield',
    );
    if (!shield) {
      return;
    }
    const max = shield.max ?? shield.charges;
    if (shield.charges >= max) {
      return;
    }
    const recharge = shield.recharge ?? 1;
    const updated = {
      charges: Math.min(max, shield.charges + recharge),
      max,
      recharge,
    };
    this.setFlag('geometry.terraShield', updated);
  }

  resolveRoomPosition(position: { x: number; y: number; roomId?: string }): {
    roomId: string;
    localX: number;
    localY: number;
  } | null {
    const roomId = position.roomId ?? this.getRoomIdForPosition(position);
    const [roomX, roomY] = this.parseRoomCoordinates(roomId);
    const localX = position.x - roomX * this.config.grid.cols;
    const localY = position.y - roomY * this.config.grid.rows;
    if (
      localX < 0 ||
      localY < 0 ||
      localX >= this.config.grid.cols ||
      localY >= this.config.grid.rows
    ) {
      return null;
    }
    return { roomId, localX, localY };
  }

  private setRoomTile(roomId: string, localX: number, localY: number, tile: string): boolean {
    const room = this.world.getRoom(roomId);
    const row = room.layout[localY];
    if (!row || row[localX] === undefined || row[localX] === tile) {
      return false;
    }
    const chars = row.split('');
    chars[localX] = tile;
    room.layout[localY] = chars.join('');
    return true;
  }

  private isSnakeOccupying(position: Vector2Like, snake: readonly Vector2Like[]): boolean {
    return snake.some((segment) => segment.x === position.x && segment.y === position.y);
  }

  private getRoomIdForPosition(position: Vector2Like): string {
    if (!this.isCoordinateRoomId(this.snake.currentRoomId)) {
      return this.snake.currentRoomId;
    }
    const roomX = Math.floor(position.x / this.config.grid.cols);
    const roomY = Math.floor(position.y / this.config.grid.rows);
    const [, , roomZ = '0'] = this.snake.currentRoomId.split(',');
    return `${roomX},${roomY},${roomZ}`;
  }
}

function nextSoulReveal(actor: Actor): { key: ActorSoulRevealKey; text: string } | null {
  const soul = actor.soul;
  if (!soul) {
    return null;
  }
  const revealOrder: Array<{ key: ActorSoulRevealKey; text?: string }> = [
    { key: 'wound', text: soul.wound },
    { key: 'insecurity', text: soul.insecurity },
    { key: 'contradiction', text: soul.contradiction },
    { key: 'secret', text: soul.secret },
  ];
  const reveal = revealOrder.find((entry) => entry.text && !soul.revealed[entry.key]);
  return reveal?.text ? { key: reveal.key, text: reveal.text } : null;
}

function socialTieLine(
  actorName: string,
  link: ActorSocialLink,
  targetName = 'someone nearby',
): string {
  switch (link.relationship) {
    case 'family':
      return `${actorName} admits ${targetName} is family, which makes every public disaster personal.`;
    case 'rival':
      return `${actorName} says ${targetName} is a rival, then pretends that was not the main fact of the day.`;
    case 'creditor':
      return `${actorName} says ${targetName} is owed something. The word "something" does work here.`;
    case 'debtor':
      return `${actorName} says ${targetName} owes them, spiritually or financially. Possibly both.`;
    case 'lover':
    case 'spouse':
    case 'ex':
      return `${actorName} names ${targetName} carefully, like a cup already cracked.`;
    default:
      return `${actorName} says ${targetName} matters around here.`;
  }
}

function formatActorRumorLine(actorName: string, summary: string): string {
  const lines = [
    `${actorName} says, "People are saying this: ${summary}"`,
    `${actorName} lowers their voice. "The current rumor is simple: ${summary}"`,
    `${actorName} says the room has been chewing on this: ${summary}`,
    `${actorName} says, "I did not invent this rumor. I am only delivering it: ${summary}"`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function formatActorKingLoreLine(
  actorName: string,
  place: string,
  institution: string,
  opinion?: string,
): string {
  const tone =
    opinion === 'loyal'
      ? 'with the careful pride of someone watched by a portrait'
      : opinion === 'mocking'
        ? 'like the crown is a joke with teeth'
        : opinion === 'bitter'
          ? 'like the sentence has old blood in it'
          : 'carefully';
  const lines = [
    `${actorName} speaks ${tone}: "The King reached ${place} through ${institution}. The official version leaves things out."`,
    `${actorName} says, "Ask ${institution} about ${place}. Then ask why the royal records disagree."`,
    `${actorName} says the King's story bends around ${place}, and ${institution} knows where it bent first.`,
    `${actorName} says, "The crown calls it order. Around ${place}, people remember it differently."`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}

function formatLorePlace(place?: string): string {
  if (!place) return 'the old road';
  if (/^-?\d+,-?\d+,-?\d+$/.test(place) || place.includes(':')) {
    return 'this district';
  }
  return place;
}

function townRumorKindForEvent(
  event: WorldEvent,
): 'crime' | 'romance' | 'marriage' | 'divorce' | 'guild' | 'heroic' | 'weird' {
  if (event.tags.includes('marriage')) return 'marriage';
  if (event.tags.includes('divorce')) return 'divorce';
  if (event.tags.includes('relationship')) return 'romance';
  if (event.tags.includes('guild')) return 'guild';
  if (event.tags.includes('crime') || event.type === 'town-crime') return 'crime';
  if (event.tags.includes('combat') || event.tags.includes('eaten')) return 'weird';
  return 'weird';
}

function townRumorKindForModernRumor(
  rumor: Rumor,
): 'crime' | 'romance' | 'marriage' | 'divorce' | 'guild' | 'heroic' | 'weird' {
  if (rumor.tags.includes('marriage')) return 'marriage';
  if (rumor.tags.includes('divorce')) return 'divorce';
  if (rumor.type === 'romance') return 'romance';
  if (rumor.tags.includes('guild') || rumor.factionIds.includes('thieves-guild')) return 'guild';
  if (rumor.type === 'crime') return 'crime';
  if (rumor.tags.includes('heroic')) return 'heroic';
  return 'weird';
}

function rumorToWorldRumor(rumor: Rumor): WorldRumor {
  return {
    id: rumor.id,
    eventId: rumor.sourceEventId ?? rumor.id,
    roomId: rumor.roomId,
    townId: rumor.townId,
    summary: rumor.summary,
    tags: [...rumor.tags, rumor.type, rumor.sourceKind],
    severity: rumor.severity,
    createdAtRoomNumber: rumor.createdAt,
    heardByActorIds: [...rumor.knownByActorIds],
    truthLevel: rumor.truthLevel,
    exaggeration: rumor.exaggeration,
    sourceKind: rumor.sourceKind,
    public: rumor.public,
  };
}

function factionRelationForCurrentEvent(
  event: FactionCurrentEvent,
): ActorFactionConversationState['relation'] {
  if (event.phase === 'resolved') return 'neutral';
  switch (event.type) {
    case 'raid-active':
      return 'war';
    case 'raid-warning':
    case 'raid-aftermath':
    case 'skirmish':
      return 'skirmishing';
    case 'guard-crackdown':
    case 'market-shutdown':
      return event.severity >= 55 ? 'hostile' : 'tense';
    case 'inspection':
    case 'debt-collection':
    case 'trade-dispute':
    case 'guild-exposure':
      return 'tense';
    default:
      return event.severity >= 45 ? 'tense' : 'neutral';
  }
}

function conversationSocialRelationshipFor(
  actor: Actor,
  target: Actor,
): ActorSocialLink['relationship'] {
  if (actor.factionId && target.factionId && actor.factionId !== target.factionId) {
    return stableHash(`${actor.id}:rival:${target.id}`) % 3 === 0 ? 'rival' : 'factionAlly';
  }
  if (actor.role === 'shopkeeper' && target.role === 'guard') return 'creditor';
  if (actor.role === 'guard' && target.role === 'shopkeeper') return 'debtor';
  if (actor.personality.includes('romantic') && target.personality.includes('romantic')) {
    return stableHash(`${actor.id}:ex:${target.id}`) % 4 === 0 ? 'ex' : 'friend';
  }
  const roll = stableHash(`${actor.id}->${target.id}`) % 8;
  if (roll === 0) return 'family';
  if (roll === 1) return 'rival';
  if (roll === 2) return 'creditor';
  if (roll === 3) return 'debtor';
  if (roll === 4) return 'ex';
  return 'friend';
}

function reciprocalSocialRelationship(
  relationship: ActorSocialLink['relationship'],
): ActorSocialLink['relationship'] {
  switch (relationship) {
    case 'creditor':
      return 'debtor';
    case 'debtor':
      return 'creditor';
    case 'boss':
      return 'friend';
    default:
      return relationship;
  }
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function summarizeActorMoodForJournal(actor: Actor): string {
  if (actor.hostility === 'hostile') return 'hostile';
  if (actor.mood.anger >= 60) return 'angry';
  if (actor.mood.fear >= 60) return 'afraid';
  if (actor.mood.grief >= 55) return 'grieving';
  if (actor.mood.affection >= 55) return 'fond';
  if (actor.mood.curiosity >= 55) return 'curious';
  if (actor.mood.trust >= 50) return 'trusting';
  return 'neutral';
}

function socialGriefFor(relationship: ActorSocialLink['relationship']): number {
  switch (relationship) {
    case 'family':
    case 'lover':
    case 'spouse':
      return 28;
    case 'friend':
      return 16;
    case 'rival':
      return 4;
    default:
      return 10;
  }
}

function socialAngerFor(relationship: ActorSocialLink['relationship']): number {
  switch (relationship) {
    case 'family':
    case 'lover':
    case 'spouse':
      return 24;
    case 'rival':
      return 6;
    case 'creditor':
    case 'debtor':
      return 14;
    default:
      return 10;
  }
}
