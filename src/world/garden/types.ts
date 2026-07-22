/**
 * Garden Types
 */
import type { Vector2Like } from '../../core/math.js';

/** Growth stages of a plant in the garden. */
export type PlantStage = 'seed' | 'sprout' | 'budding' | 'flowering' | 'ripe';

/** Weather conditions that affect garden growth. */
export type GardenWeather =
  | 'clear'
  | 'rain'
  | 'fog'
  | 'storm'
  | 'heatwave'
  | 'coldfront'
  | 'snow'
  | 'wind';

/** Season affecting garden growth rates. */
export type GardenSeason = 'spring' | 'summer' | 'autumn' | 'winter';

/** Types of pests that can attack garden plants. */
export type PestType = 'aphid' | 'caterpillar' | 'snail' | 'mole' | 'locust';

/** A single garden plot. */
export interface GardenPlot {
  /** Unique plot identifier. */
  id: string;
  /** Grid position of the plot. */
  position: Vector2Like;
  /** Current plant growing in this plot, or null if empty. */
  plant: GardenPlant | null;
  /** Whether this plot has been watered today. */
  wateredToday: boolean;
  /** Current pest infestation level (0 = none, 1-3 = increasing severity). */
  pestLevel: number;
  /** Whether companion planting bonus is active. */
  companionBonus: boolean;
  /** Growth progress as a fraction (0.0 to 1.0). */
  growthProgress: number;
}

/** A plant entity growing in a garden plot. */
export interface GardenPlant {
  /** The seed type that was planted. */
  seedTypeId: string;
  /** Current growth stage. */
  stage: PlantStage;
  /** Stage progress as a fraction (0.0 to 1.0) within the current stage. */
  stageProgress: number;
  /** Total time in ticks needed to reach the ripe stage. */
  totalGrowthTime: number;
  /** Elapsed growth ticks (adjusted for weather, companions, etc.). */
  elapsedGrowthTicks: number;
  /** Whether this plant is healthy (false if pests have done too much damage). */
  healthy: boolean;
  /** Yield amount — how many apples this plant produces when harvested. */
  yieldAmount: number;
  /** Rarity tier of the apple this plant produces. */
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  /** Timestamp when this plant was first planted. */
  plantedAt: number;
}

/** A pest entity in the garden. */
export interface GardenPest {
  /** Unique pest identifier. */
  id: string;
  /** The type of pest. */
  type: PestType;
  /** Which plot the pest is currently attacking. */
  plotId: string;
  /** Current health of the pest. */
  health: number;
  /** Maximum health of this pest type. */
  maxHealth: number;
  /** Damage per tick this pest deals to the plant. */
  damagePerTick: number;
  /** How many ticks until the pest reproduces (if applicable). */
  reproductionTimer: number;
  /** Whether this pest has been defeated. */
  defeated: boolean;
}

/** Seed type definition. */
export interface SeedDefinition {
  /** Unique seed type ID. */
  id: string;
  /** Display name of the seed. */
  name: string;
  /** Apple type this seed grows into. */
  appleTypeId: string;
  /** Base growth time in ticks. */
  baseGrowthTime: number;
  /** How many apples this plant yields when ripe. */
  yieldAmount: number;
  /** Rarity of the resulting apple. */
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  /** Drop rate when eating this apple type (0.0 to 1.0). */
  dropRate: number;
  /** Whether this seed can be purchased from the garden shop. */
  shopAvailable: boolean;
  /** Shop price for this seed. */
  shopPrice?: number;
  /** Preferred companion seed types (grows better next to these). */
  preferredCompanions: string[];
  /** Weather this seed thrives in. */
  preferredWeather?: GardenWeather;
  /** Season this seed grows best in. */
  preferredSeason?: GardenSeason;
  /** Whether this seed can produce hybrid apples when planted next to certain types. */
  hybridPotential?: { withSeedId: string; hybridType: string };
}

/** Companion planting bonus definitions. */
export interface CompanionBonus {
  /** First seed type. */
  seedA: string;
  /** Second seed type. */
  seedB: string;
  /** Yield multiplier when planted together. */
  yieldMultiplier: number;
  /** Growth speed multiplier. */
  speedMultiplier: number;
  /** Bonus apple type produced (optional). */
  bonusAppleType?: string;
  /** Description of the bonus. */
  description: string;
}

/** Garden configuration. */
export interface GardenConfig {
  /** Maximum number of garden plots available. */
  maxPlots: number;
  /** Initial number of plots unlocked. */
  initialPlots: number;
  /** Water consumption per plot per tick. */
  waterPerPlot: number;
  /** Total water capacity of the garden. */
  waterCapacity: number;
  /** Current water level in the garden. */
  currentWater: number;
  /** Rate at which water refills (from rain collection, etc.). */
  waterRefillRate: number;
  /** Pests spawn every N ticks (0 = disabled). */
  pestSpawnInterval: number;
  /** Maximum number of active pests. */
  maxActivePests: number;
  /** Garden unlock requirements. */
  unlockRequirements: GardenUnlockRequirements;
}

/** Requirements to unlock the garden. */
export interface GardenUnlockRequirements {
  /** Minimum snake length required. */
  minLength: number;
  /** Minimum score required. */
  minScore: number;
  /** Quest that must be completed. */
  requiredQuest?: string;
  /** Item that must be in inventory. */
  requiredItem?: string;
}

/** Garden state snapshot for save/load. */
export interface GardenSnapshot {
  /** All garden plots. */
  plots: Array<{
    id: string;
    position: Vector2Like;
    plant: GardenPlant | null;
    wateredToday: boolean;
    pestLevel: number;
    companionBonus: boolean;
    growthProgress: number;
  }>;
  /** Current water level. */
  currentWater: number;
  /** Active pests. */
  pests: Array<{
    id: string;
    type: PestType;
    plotId: string;
    health: number;
    maxHealth: number;
    damagePerTick: number;
    reproductionTimer: number;
    defeated: boolean;
  }>;
  /** Total growth ticks elapsed for the garden. */
  totalGrowthTicks: number;
  /** Current weather. */
  weather: GardenWeather;
  /** Current season. */
  season: GardenSeason;
  /** Whether the garden is unlocked. */
  unlocked: boolean;
}

/** Events that can occur in the garden. */
export type GardenEventType =
  | 'plantGrowing'
  | 'plantRipe'
  | 'plantWithered'
  | 'pestSpawned'
  | 'pestDefeated'
  | 'plotUnlocked'
  | 'waterDepleted'
  | 'companionBonusApplied'
  | 'hybridAppleProduced'
  | 'seasonChange'
  | 'weatherChange';

/** A garden event for the event log. */
export interface GardenEvent {
  /** Event type. */
  type: GardenEventType;
  /** Human-readable message. */
  message: string;
  /** Timestamp of the event. */
  timestamp: number;
  /** Associated plot ID (optional). */
  plotId?: string;
  /** Associated pest ID (optional). */
  pestId?: string;
}
