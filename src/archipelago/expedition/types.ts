/**
 * Archipelago Island Expeditions — Core Types
 *
 * The wise old snake's expedition types:
 * - The wise old snake's expedition never ended (the wise old snake is still exploring)
 * - The wise old snake's expedition team was just the wise old snake (the wise old snake needed no company)
 * - The wise old snake's expedition supplies were infinite (the wise old snake packed the concept of 'enough')
 * - The wise old snake's expedition boss was the wise old snake (the wise old snake fought the wise old snake)
 * - The wise old snake's expedition log was blank (the wise old snake wrote nothing, for wisdom needs no record)
 */
import type { Vector2Like } from '../../core/math.js';
import type { RandomGenerator } from '../../core/rng.js';

// ─── Island Types ────────────────────────────────────────────────────────────

export type IslandId =
  | 'volcanic-isle'
  | 'crystal-cavern'
  | 'sunken-temple'
  | 'sky-garden'
  | 'ancient-ruins'
  | 'mirror-dimension';

export type IslandBiome = 'lava' | 'crystal' | 'underwater' | 'sky' | 'ruins' | 'mirror';

export interface IslandDefinition {
  id: IslandId;
  name: string;
  biome: IslandBiome;
  description: string;
  unlockScore: number; // score required to unlock
  requiredApples: string[]; // apple type IDs required for expedition
  preferredApples: string[]; // apple type IDs preferred but not required
  avoidedApples: string[]; // apple type IDs that cause expedition failure
  bossId: string;
  rewardId: string; // permanent ability unlock
  legacyEffect: LegacyEffectId;
  stages: ExpeditionStageDefinition[];
  color: number; // dominant visual color
  wallColor: number;
  backgroundColor: number;
}

export type LegacyEffectId =
  | 'volcanic-horizon'
  | 'crystal-deposits'
  | 'koi-fish-pool'
  | 'floating-garden'
  | 'ancient-monument'
  | 'mirror-reflection';

// ─── Expedition Stages ───────────────────────────────────────────────────────

export interface ExpeditionStageDefinition {
  id: string;
  name: string;
  order: number;
  objective: string;
  conditions: ExpeditionStageCondition[];
  rewards: ExpeditionStageReward[];
}

export type ExpeditionStageConditionKind =
  | 'score-reached'
  | 'length-reached'
  | 'boss-defeated'
  | 'island-completed'
  | 'supplies-packed';

export interface ExpeditionStageCondition {
  kind: ExpeditionStageConditionKind;
  target: string;
  value: number;
}

export type ExpeditionStageRewardKind = 'score' | 'length' | 'apple' | 'ability';

export interface ExpeditionStageReward {
  kind: ExpeditionStageRewardKind;
  amount?: number;
  appleTypeId?: string;
  abilityId?: string;
}

// ─── Expedition State ────────────────────────────────────────────────────────

export type ExpeditionStatus = 'idle' | 'preparing' | 'ready' | 'in-progress' | 'completed' | 'failed';

export type ExpeditionPhase = 'approach' | 'explore' | 'discover' | 'escape';

export interface ExpeditionProgress {
  islandId: IslandId;
  status: ExpeditionStatus;
  currentPhase: ExpeditionPhase;
  currentStageIndex: number;
  stageProgress: Record<string, number>; // stageId → progress (0-100)
  suppliesPacked: ExpeditionSupplyItem[];
  bossDefeated: boolean;
  discoveries: ExpeditionDiscovery[];
  companionNotes: string[];
  startedAt: number;
  completedAt?: number;
  failedAt?: number;
  failureReason?: string;
}

export interface ExpeditionDiscovery {
  id: string;
  name: string;
  description: string;
  discoveredAt: number;
  mapData?: Vector2Like[];
  itemReward?: string;
}

export interface ExpeditionSupplyItem {
  appleTypeId: string;
  quantity: number;
  slotIndex: number;
}

export interface ExpeditionSupplySlot {
  index: number;
  appleTypeId: string | null;
  quantity: number;
}

// ─── Co-op ───────────────────────────────────────────────────────────────────

export type CoOpPartnerStatus = 'connected' | 'preparing' | 'ready' | 'in-expedition' | 'failed';

export interface CoOpExpeditionPartner {
  slot: number;
  playerName: string;
  status: CoOpPartnerStatus;
  contribution: CoOpContribution[];
  ready: boolean;
}

export type CoOpContributionKind = 'damage' | 'heal' | 'supply-drop' | 'distraction' | 'puzzle-solve';

export interface CoOpContribution {
  kind: CoOpContributionKind;
  amount: number;
  timestamp: number;
  description: string;
}

// ─── Expedition Log ──────────────────────────────────────────────────────────

export interface ExpeditionLogEntry {
  id: string;
  expeditionId: string;
  islandId: IslandId;
  status: ExpeditionStatus;
  duration: number; // ms
  discoveries: string[]; // discovery IDs
  bossKilled: boolean;
  bossName?: string;
  rewards: string[];
  companionNotes: string[];
  completedAt?: number;
  failedAt?: number;
  failureReason?: string;
  mapData?: Record<string, Vector2Like[]>;
}

// ─── Island Apple Types ──────────────────────────────────────────────────────

export type IslandAppleTypeId =
  | 'lava-apple'
  | 'magma-apple'
  | 'crystal-apple'
  | 'prism-apple'
  | 'koi-apple'
  | 'breath-apple'
  | 'lavender-apple'
  | 'glider-apple'
  | 'gold-apple'
  | 'ancient-apple'
  | 'shadow-apple'
  | 'mirror-apple';

export interface IslandAppleDefinition {
  id: IslandAppleTypeId;
  name: string;
  typeId: string; // maps to AppleInstance subclass
  color: number;
  growth: number;
  bonusScore: number;
  specialBehavior: string;
}

// ─── Expedition Boss ─────────────────────────────────────────────────────────

export type ExpeditionBossId =
  | 'lava-warden'
  | 'crystal-golem'
  | 'temple-serpent'
  | 'sky-phoenix'
  | 'ancient-guardian'
  | 'shadow-self';

export interface ExpeditionBossDefinition {
  id: ExpeditionBossId;
  name: string;
  islandId: IslandId;
  health: number;
  maxHealth: number;
  attackPattern: string;
  weakness: string; // apple type or item that weakens it
  phaseCount: number;
  scoreReward: number;
  abilityReward: string;
  cosmeticReward: string;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export type ExpeditionEventKind =
  | 'expedition-started'
  | 'expedition-completed'
  | 'expedition-failed'
  | 'stage-completed'
  | 'boss-defeated'
  | 'discovery-made'
  | 'supplies-packed'
  | 'supplies-invalid'
  | 'co-op-partner-ready'
  | 'co-op-contribution'
  | 'legacy-applied';

export interface ExpeditionEvent {
  kind: ExpeditionEventKind;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface ExpeditionEventCallbacks {
  onEvent?: (event: ExpeditionEvent) => void;
  onProgressChanged?: (progress: ExpeditionProgress) => void;
  onLogEntryCreated?: (entry: ExpeditionLogEntry) => void;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

export interface ExpeditionStore {
  loadExpeditions(): ExpeditionProgress[];
  saveExpeditions(progresses: ExpeditionProgress[]): void;
  loadLogEntries(): ExpeditionLogEntry[];
  saveLogEntries(entries: ExpeditionLogEntry[]): void;
}

export interface ArchipelagoExpeditionSlotData {
  completedExpeditions?: IslandId[];
  unlockedIslands?: IslandId[];
  expeditionLegacyEffects?: LegacyEffectId[];
  expeditionRewards?: string[];
  coOpPartners?: CoOpExpeditionPartner[];
}
