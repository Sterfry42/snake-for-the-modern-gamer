export interface SkillEffectTickDelayScalar {
  type: 'tickDelayScalar';
  factor: number;
  sourceId?: string;
}

export interface SkillEffectExtraLife {
  type: 'extraLifeCharge';
  count: number;
}

export interface SkillEffectScoreMultiplier {
  type: 'scoreMultiplier';
  multiplier: number;
}

export interface SkillEffectScoreMultiplierBonus {
  type: 'scoreMultiplierBonus';
  bonus: number;
}

export interface SkillEffectSetFlag {
  type: 'setFlag';
  key: string;
  value: unknown;
  resetValue?: unknown;
}

export interface SkillEffectInstantGrow {
  type: 'instantGrow';
  segments: number;
}

export interface SkillEffectManaEnable {
  type: 'manaEnable';
  max: number;
  regen: number;
}

export interface SkillEffectManaUpgrade {
  type: 'manaUpgrade';
  maxBonus: number;
  regenBonus: number;
}

export interface SkillEffectUnlockArcanePulse {
  type: 'unlockArcanePulse';
}

export interface SkillEffectUnlockArcaneVeil {
  type: 'unlockArcaneVeil';
}

export interface SkillEffectRegisterSpell {
  type: 'registerSpell';
  spellId: string;
}

export interface SkillEffectStatModifier {
  type: 'statModifier';
  stat: string;
  value: number;
}

export interface SkillEffectDerivedStatModifier {
  type: 'derivedStatModifier';
  sourceId: string;
  stat: import('../stats/derivedStats.js').DerivedStatId;
  operation: 'add' | 'multiply';
  value: number;
}

export interface SkillEffectUnlockMechanic {
  type: 'unlockMechanic';
  mechanic: string;
  note?: string;
}

export interface SkillEffectPlaceholder {
  type: 'placeholder';
  note: string;
}

export type SkillEffect =
  | SkillEffectTickDelayScalar
  | SkillEffectExtraLife
  | SkillEffectScoreMultiplier
  | SkillEffectScoreMultiplierBonus
  | SkillEffectSetFlag
  | SkillEffectInstantGrow
  | SkillEffectManaEnable
  | SkillEffectManaUpgrade
  | SkillEffectUnlockArcanePulse
  | SkillEffectUnlockArcaneVeil
  | SkillEffectRegisterSpell
  | SkillEffectStatModifier
  | SkillEffectDerivedStatModifier
  | SkillEffectUnlockMechanic
  | SkillEffectPlaceholder;

export type SkillBranchId =
  | 'momentum'
  | 'survival'
  | 'arcane'
  | 'growth'
  | 'predator'
  | 'fellowship';

export type SkillNodeKind = 'entry' | 'core' | 'route' | 'capstone' | 'combo' | 'utility';

export type SkillOwnershipSource =
  | { type: 'purchase' }
  | { type: 'class'; classId: string }
  | { type: 'faith'; faithId: string }
  | { type: 'migration'; oldPerkId: string }
  | { type: 'debug' };

export interface OwnedSkillState {
  rank: number;
  sources: readonly SkillOwnershipSource[];
}

export interface SkillPerkDefinition {
  readonly id: string;
  readonly title: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly branch: string;
  readonly rankDescriptions: readonly string[];
  readonly costByRank: readonly number[];
  readonly position: { x: number; y: number };
  readonly requires?: readonly string[];
  readonly effectsByRank: readonly (readonly SkillEffect[])[];
  readonly branchId?: SkillBranchId;
  readonly secondaryBranch?: SkillBranchId;
  readonly kind?: SkillNodeKind;
  readonly route?: string;
  readonly tags?: readonly string[];
  readonly grantableAtStart?: boolean;
  readonly migrationAliases?: readonly string[];
  readonly usageHint?: string;
}

export type SkillPerkStatus = 'available' | 'locked' | 'unaffordable' | 'maxed';

export interface SkillPerkState {
  definition: SkillPerkDefinition;
  status: SkillPerkStatus;
  rank: number;
  cost?: number;
  missing?: readonly string[];
}

export interface SkillTreeRuntime {
  getScore(): number;
  addScore(amount: number): void;
  setActionStepIntervalMs(intervalMs: number): void;
  setTickDelay(delay: number): void;
  growSnake(extraSegments: number): void;
  notifyScoreMultiplierChanged(multiplier: number): void;
  notifyExtraLifeGained(): void;
  notifyExtraLifeConsumed(): void;
  notifyExtraLifeReset(): void;
  notifyManaChanged(current: number, max: number, regen: number): void;
  notifyManaUnlocked(): void;
  notifyArcanePulseUnlocked(): void;
  notifyArcaneVeilUnlocked(): void;
  onArcanePulseCast(): void;
  onArcaneVeilTriggered(): void;
  spendSafeSnakeLength?(segments: number): number;
  onAstralNova?(): void;
  setFlag(key: string, value: unknown): void;
}

export interface SkillTreeStats {
  extraLives: number;
  scoreMultiplier: number;
  speedRank: number;
  growthRank: number;
  mana: number;
  manaMax: number;
  manaRegen: number;
  arcanePulseUnlocked: boolean;
  arcaneVeilUnlocked: boolean;
}

export interface SkillPerkContext {
  readonly runtime: SkillTreeRuntime;
  readonly system: SkillTreeSystemApi;
  readonly previousRank: number;
  readonly currentRank: number;
}

// Forward declaration to avoid circular dependency types. Implemented in skillTree.ts

export interface SkillTreeSystemApi {
  getBaseActionStepIntervalMs(): number;
  getBaseTickDelay(): number;
  addExtraLives(count: number): void;
  enableMana(config: { max: number; regen: number }): void;
  upgradeMana(config: { maxBonus: number; regenBonus: number }): void;
  setScoreMultiplier(multiplier: number): void;
  addScoreMultiplierBonus(bonus: number): void;
  applyActionStepIntervalScalar(factor: number, sourceId?: string): void;
  applyTickDelayScalar(factor: number, sourceId?: string): void;
  applyFlagEffect(effect: SkillEffectSetFlag): void;
  applyDerivedStatModifier(effect: SkillEffectDerivedStatModifier): void;
  unlockArcanePulse(): void;
  unlockArcaneVeil(): void;
  modifyScoreGain(amount: number): number;
  consumeExtraLife(): boolean;
  tryCastArcanePulse(): boolean;
  getArcanePulseCost(): number;
  getArcaneVeilCost(): number;
  getStats(): SkillTreeStats;
  getDefinition(perkId: string): SkillPerkDefinition | undefined;
}

export interface SkillEffectContext {
  runtime: SkillTreeRuntime;
  system: SkillTreeSystemApi;
}
