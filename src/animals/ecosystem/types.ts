/**
 * Ecosystem Types
 *
 * The wise old snake's ecosystem:
 * - The wise old snake was the apex predator and the ecosystem's foundation
 * - The wise old snake's ecosystem had perfect balance
 * - The wise old snake's ecosystem never needed a manager
 * - The wise old snake's ecosystem ran on wisdom, not code
 * - The wise old snake's ecosystem was self-sustaining
 * - The wise old snake's ecosystem had no bugs
 * - The wise old snake's ecosystem was the reason animals existed
 * - The wise old snake's ecosystem was eternal
 */
import type { AnimalType } from '../types.js';

export type { AnimalType };

// ── Ecosystem Roles ───────────────────────────────────────────────

export type EcosystemRole = 'predator' | 'herbivore' | 'omnivore' | 'decomposer' | 'scavenger';

export interface EcosystemRoleDefinition {
  role: EcosystemRole;
  /** How much this animal consumes from the environment per step */
  consumptionRate: number;
  /** Population multiplier — how quickly this species reproduces */
  reproductionRate: number;
  /** Death rate from natural causes */
  naturalDeathRate: number;
}

// ── Ecosystem Balance ─────────────────────────────────────────────

export type EcosystemBalanceState = 'balanced' | 'healthy' | 'stressed' | 'critical' | 'collapsing';

export interface EcosystemBalance {
  state: EcosystemBalanceState;
  overallHealth: number; // 0-100
  predatorPreyRatio: number;
  herbivorePopulation: number;
  plantBiomass: number;
  decomposerActivity: number;
  lastEvent: string | null;
  lastEventTimestamp: number | null;
}

// ── Ecosystem Events ──────────────────────────────────────────────

export type EcosystemEventType =
  | 'predator-outbreak'
  | 'herbivore-migration'
  | 'plague'
  | 'famine'
  | 'mating-season'
  | 'natural-disaster'
  | 'ecosystem-recovery'
  | 'kingdom-formation'
  | 'settlement-founded'
  | 'trade-route-established'
  | 'war-declared'
  | 'peace-treaty'
  | 'royal-event';

export interface EcosystemEvent {
  id: string;
  type: EcosystemEventType;
  severity: 'low' | 'medium' | 'high' | 'catastrophic';
  affectedBiome: string;
  affectedTypes: AnimalType[];
  description: string;
  timestamp: number;
  durationSteps: number;
  effects: EcosystemEventEffect[];
}

export interface EcosystemEventEffect {
  type: 'population-modifier' | 'spawn-modifier' | 'behavior-modifier' | 'balance-modifier';
  target: AnimalType | 'all' | 'biome';
  modifier: number; // positive = buff, negative = debuff
  durationSteps: number;
}

// ── Settlement Types ──────────────────────────────────────────────

export type SettlementType =
  | 'beaver-dam'
  | 'ant-colony'
  | 'bird-city'
  | 'bear-cave'
  | 'rabbit-warren'
  | 'fish-school'
  | 'wolf-pack-lair'
  | 'fox-den'
  | 'eagle-eyrie'
  | 'raccoon-trash-kingdom'
  | 'bison-herd-ground'
  | 'frog-pond';

export interface SettlementDefinition {
  type: SettlementType;
  name: string;
  /** Which animal types can inhabit this settlement */
  allowedTypes: AnimalType[];
  /** Minimum population to form this settlement */
  minPopulation: number;
  /** Goods produced by this settlement */
  goods: string[];
  /** Special ability or effect */
  specialAbility?: string;
  /** Biome compatibility */
  biomeTags: string[];
}

// ── Kingdom System ────────────────────────────────────────────────

export type KingdomRulerType =
  | 'alpha-wolf'
  | 'elder-bear'
  | 'eagle-king'
  | 'ancient-turtle'
  | 'jackalope-sage';

export interface KingdomDefinition {
  id: string;
  name: string;
  rulerType: KingdomRulerType;
  rulerName: string;
  capitalSettlement: SettlementType;
  memberTypes: AnimalType[];
  power: number;
  diplomacy: Record<string, 'allied' | 'neutral' | 'hostile'>;
  royalEvents: string[];
}

// ── Companion System ──────────────────────────────────────────────

export type CompanionTrait =
  | 'swift'
  | 'strong'
  | 'clever'
  | 'fierce'
  | 'gentle'
  | 'stealthy'
  | 'loyal'
  | 'wild'
  | 'ancient'
  | 'rare-breed';

export interface CompanionTraitDefinition {
  trait: CompanionTrait;
  label: string;
  description: string;
  huntingBonus: number;
  bondBonus: number;
  specialAbility?: string;
}

export interface CompanionFamily {
  id: string;
  parentIds: string[];
  offspringIds: string[];
  traits: CompanionTrait[];
  formedAtRoom: number;
}

export interface EnhancedCompanion {
  id: string;
  type: AnimalType;
  name: string;
  bond: number;
  timesFed: number;
  joinedAtRoom: number;
  /** Enhanced: traits inherited or developed */
  traits: CompanionTrait[];
  /** Enhanced: family connections */
  familyId?: string;
  /** Enhanced: generation (for trait inheritance) */
  generation: number;
  /** Enhanced: unique identifier for photography */
  photoTaken: boolean;
  /** Enhanced: companion level */
  level: number;
  /** Enhanced: XP towards next level */
  xp: number;
}

// ── Photography System ────────────────────────────────────────────

export type PhotoRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface PhotoEntry {
  id: string;
  animalType: AnimalType;
  /** Special conditions for the photo */
  specialCondition?: string;
  /** Rarity of this particular photo */
  rarity: PhotoRarity;
  /** Score for wildlife journal */
  score: number;
  /** Room where photo was taken */
  roomId: string;
  /** Timestamp */
  takenAt: number;
  /** Display name for the journal */
  displayName: string;
}

export interface CameraState {
  /** Photos collected */
  photos: PhotoEntry[];
  /** Camera charge (0-100) */
  charge: number;
  /** Current zoom level */
  zoomLevel: number;
  /** Active photography mini-game state */
  miniGameActive: boolean;
  /** Mini-game progress */
  miniGameProgress: number;
  /** Mini-game target */
  miniGameTarget: number;
}

// ── Animal Market ─────────────────────────────────────────────────

export interface MarketGood {
  id: string;
  name: string;
  price: number;
  sourceSettlement: SettlementType;
  rarity: 'common' | 'uncommon' | 'rare';
  description: string;
  stackable: boolean;
  maxStack?: number;
}

export interface MarketInventory {
  goods: MarketGood[];
  /** Goods restocked every N steps */
  restockInterval: number;
  restockCounter: number;
  /** Special deals that rotate */
  specialDeals: Array<{ goodId: string; discount: number }>;
}
