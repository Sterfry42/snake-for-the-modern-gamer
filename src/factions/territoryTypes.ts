/**
 * Territory Types
 *
 * Territory definitions, ownership, bonuses, and visual marker system
 * for the Faction Wars & Territory Control feature.
 */
import type { BiomeId } from '../world/biomes.js';

// ─── Territory Types ───────────────────────────────────────────────────────────

export type TerritoryType =
  | 'forest'
  | 'cave'
  | 'plains'
  | 'mountain'
  | 'ruins'
  | 'swamp'
  | 'coast'
  | 'tundra'
  | 'desert'
  | 'garden';

export type TerritoryControlStatus = 'unclaimed' | 'contested' | 'stable';

/** Strategic value of a territory (1-100). Higher = more important. */
export type StrategicValue = number;

// ─── Territory Definition ──────────────────────────────────────────────────────

export interface TerritoryDefinition {
  id: string;
  name: string;
  type: TerritoryType;
  /** Biome(s) this territory covers. */
  biomeIds: BiomeId[];
  /** Room IDs that belong to this territory. */
  roomIds: string[];
  /** Base strategic value. */
  strategicValue: StrategicValue;
  /** Passive bonuses this territory provides to its controller. */
  bonuses: TerritoryBonuses;
  /** How quickly control shifts during a battle. */
  defensible: number; // 1-10
  /** Whether this territory has special features (ancient ruins, sacred groves, etc.). */
  features: string[];
}

/** Bonuses provided by controlling a territory. */
export interface TerritoryBonuses {
  /** Apple spawn type modifiers (e.g., more plant-based apples). */
  appleSpawnModifiers: AppleSpawnModifier[];
  /** Resource drop modifiers (e.g., more mineral drops). */
  resourceModifiers: ResourceModifier[];
  /** Faction-specific stat bonuses. */
  factionBonuses?: FactionStatBonuses;
  /** Special effects (e.g., rare spawn rates, event triggers). */
  specialEffects?: SpecialEffect[];
}

export interface AppleSpawnModifier {
  /** Apple type or category to modify. */
  appleType: string;
  /** Multiplier for spawn rate (e.g., 1.5 = 50% more). */
  spawnMultiplier: number;
  /** Whether this is a bonus or penalty. */
  kind: 'bonus' | 'penalty';
}

export interface ResourceModifier {
  /** Resource category. */
  resourceType: 'mineral' | 'herb' | 'metal' | 'fabric' | 'food' | 'artifact';
  /** Drop rate modifier (e.g., 2.0 = double drops). */
  dropModifier: number;
  /** Rarity tier boost (e.g., +1 = common -> uncommon). */
  rarityBoost?: number;
}

export interface FactionStatBonuses {
  /** Bonus to faction resources. */
  resourceBonus?: number;
  /** Bonus to faction tension reduction. */
  tensionReduction?: number;
  /** Bonus to faction defense. */
  defenseBonus?: number;
  /** Bonus to faction influence spread. */
  influenceBonus?: number;
}

export interface SpecialEffect {
  id: string;
  name: string;
  description: string;
  /** Effect trigger: 'passive', 'battle', 'event'. */
  trigger: 'passive' | 'battle' | 'event';
  /** Effect parameters. */
  parameters: Record<string, number | string | boolean>;
}

// ─── Territory Ownership ───────────────────────────────────────────────────────

export interface TerritoryOwnership {
  territoryId: string;
  controllingFactionId: string | null;
  /** Secondary faction if contested. */
  contestedByFactionId: string | null;
  controlPercentage: number; // 0-100
  status: TerritoryControlStatus;
  /** Last time control changed. */
  lastControlChange: number;
  /** Battle history for this territory. */
  battleHistory: TerritoryBattleRecord[];
  /** Flags for special events. */
  flags: Record<string, unknown>;
}

export interface TerritoryBattleRecord {
  battleId: string;
  attackerFactionId: string;
  defenderFactionId: string;
  winnerFactionId: string | null;
  controlDelta: number;
  createdAt: number;
  duration: number;
  outcome: 'attack' | 'defense' | 'diplomacy' | 'sabotage';
  snakeInvolved: boolean;
  snakeRole?: 'mercenary' | 'mediator' | 'observer';
}

// ─── Territory Map ─────────────────────────────────────────────────────────────

export interface TerritoryMapState {
  version: number;
  territories: TerritoryOwnership[];
  /** Current global war event (if any). */
  activeWar?: WarEventState;
  /** Faction influence scores across the map. */
  factionInfluence: Record<string, number>;
}

export const TERRITORY_SAVE_VERSION = 1;

// ─── Territory Visual Markers ──────────────────────────────────────────────────

export interface TerritoryVisualMarker {
  territoryId: string;
  /** Phaser display object type (flag, border, etc.). */
  markerType: 'flag' | 'border' | 'overlay' | 'patrol';
  /** Color associated with controlling faction. */
  color: number;
  /** Position on the map. */
  position: { x: number; y: number };
  /** Size of the marker. */
  size: { width: number; height: number };
  /** Whether the marker is animated. */
  animated: boolean;
  /** Animation speed (ticks per frame). */
  animationSpeed?: number;
}

export interface TerritoryBorderConfig {
  /** Border line style. */
  style: 'solid' | 'dashed' | 'dotted' | 'zigzag' | 'fire';
  /** Border line color. */
  color: number;
  /** Border line width in pixels. */
  lineWidth: number;
  /** Whether border pulses. */
  pulsing: boolean;
}

// ─── Faction War Events ────────────────────────────────────────────────────────

export type WarEventType =
  | 'territory-attack'
  | 'territory-defense'
  | 'alliance-formed'
  | 'alliance-broken'
  | 'war-declared'
  | 'peace-treaty'
  | 'ceasefire'
  | 'betrayal'
  | 'mercenary-contract'
  | 'sabotage'
  | 'diplomatic-summit'
  | 'resource-crisis'
  | 'power-vacuum';

export type WarEventPhase = 'brewing' | 'active' | 'aftermath' | 'resolved';

export interface WarEventState {
  id: string;
  type: WarEventType;
  /** Faction(s) involved. */
  factionIds: string[];
  /** Territory(ies) affected. */
  territoryIds: string[];
  severity: number;
  phase: WarEventPhase;
  createdAt: number;
  expiresAt?: number;
  summary: string;
  tags: string[];
  flags: Record<string, unknown>;
}

// ─── Diplomacy ─────────────────────────────────────────────────────────────────

export type DiplomaticRelation =
  | 'allied'
  | 'non-aggression'
  | 'trade-pact'
  | 'neutral'
  | 'tense'
  | 'sanctions'
  | 'embargo'
  | 'war';

export interface DiplomaticTreaty {
  id: string;
  /** Faction(s) that signed this treaty. */
  signatoryFactionIds: string[];
  /** Treaty type. */
  treatyType: 'alliance' | 'non-aggression' | 'trade-pact' | 'mutual-defense';
  /** Current status. */
  status: 'active' | 'broken' | 'expired' | 'suspended';
  /** When it was signed. */
  signedAt: number;
  /** When it expires (undefined = permanent). */
  expiresAt?: number;
  /** Special provisions. */
  provisions: TreatyProvision[];
  /** Whether it can be broken by sabotage. */
  sabotageable: boolean;
}

export interface TreatyProvision {
  type: 'shared-intel' | 'resource-sharing' | 'joint-operations' | 'territory-sharing';
  parameters: Record<string, number | string | boolean>;
}

// ─── Player Faction (Serpent's Coil) ───────────────────────────────────────────

export type SerpentFactionId = 'serpents-coil';

export type FollowerRole =
  | 'scout'
  | 'warrior'
  | 'merchant'
  | 'guard'
  | 'messenger'
  | 'forager'
  | 'spy'
  | 'engineer';

export type FollowerStatus = 'idle' | 'on-mission' | 'resting' | 'injured' | 'captured' | 'escaped';

export interface SerpentFactionState {
  id: SerpentFactionId;
  name: string;
  /** Whether the faction has been established. */
  established: boolean;
  /** Room that serves as the faction headquarters. */
  headquartersRoomId?: string;
  /** Follower units. */
  followers: FollowerState[];
  /** Territories controlled by the faction. */
  controlledTerritoryIds: string[];
  /** Faction influence score (0-1000). */
  influence: number;
  /** Faction reputation with other factions. */
  relations: Record<string, DiplomaticRelation>;
  /** Active missions. */
  activeMissions: SerpentMission[];
  /** Mission completion queue. */
  missionQueue: string[];
  /** Whether the faction can expand. */
  canExpand: boolean;
}

export interface FollowerState {
  id: string;
  /** Animal or actor this follower is based on. */
  sourceId: string;
  /** Role in the faction. */
  role: FollowerRole;
  /** Current status. */
  status: FollowerStatus;
  /** Loyalty to the faction (0-100). */
  loyalty: number;
  /** Combat effectiveness (0-100). */
  combatPower: number;
  /** Special ability. */
  specialAbility?: string;
  /** Current mission assignment. */
  assignedMission?: string;
  /** Injuries or debuffs. */
  debuffs: string[];
  /** Experience level. */
  level: number;
  /** XP toward next level. */
  xp: number;
}

export interface SerpentMission {
  id: string;
  title: string;
  description: string;
  type: 'scout' | 'attack' | 'defense' | 'trade' | 'infiltration' | 'escort' | 'reconnaissance';
  assignedFollowerIds: string[];
  targetTerritoryId?: string;
  targetFactionId?: string;
  /** Mission objectives. */
  objectives: MissionObjective[];
  /** Mission status. */
  status: 'active' | 'completed' | 'failed' | 'abandoned';
  /** Rewards upon completion. */
  rewards: MissionRewards;
  startTime: number;
  deadline?: number;
  difficulty: number; // 1-10
}

export interface MissionObjective {
  type: 'defeat-enemies' | 'capture-territory' | 'escort-unit' | 'retrieve-item' | 'gather-resources' | 'spy-on-enemy';
  target: string;
  progress: number;
  required: number;
}

export interface MissionRewards {
  influence: number;
  resources?: number;
  xp?: number;
  loyaltyBonus?: number;
  uniqueItems?: string[];
}

// ─── Territory Bonuses Application ─────────────────────────────────────────────

export interface TerritoryBonusContext {
  territoryId: string;
  controllingFactionId: string | null;
  bonuses: TerritoryBonuses;
  /** Whether the player is currently in this territory. */
  playerPresent: boolean;
  /** Player's relation with controlling faction. */
  playerRelation: number;
}

/** Result of applying territory bonuses. */
export interface TerritoryBonusResult {
  appleSpawnModifiers: AppleSpawnModifier[];
  resourceModifiers: ResourceModifier[];
  specialEffects: SpecialEffect[];
  /** Whether player gets bonus based on relation. */
  playerEligible: boolean;
}
