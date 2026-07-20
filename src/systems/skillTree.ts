import { applySkillEffect } from './skillEffects.js';
import { SKILL_DEFINITIONS } from './skillCatalog.js';
import { migrateSkillRanks, type SkillMigrationResult } from './skillMigration.js';
import { assertValidSkillDefinitions } from './skillValidation.js';
import {
  DerivedStatResolver,
  type DerivedStatBreakdown,
  type DerivedStatId,
  type DerivedStatModifier,
  type DerivedStatSource,
} from '../stats/derivedStats.js';
import type {
  SkillEffectSetFlag,
  SkillPerkDefinition,
  SkillPerkState,
  SkillTreeRuntime,
  SkillTreeStats,
  SkillEffectContext,
  SkillTreeSystemApi,
  OwnedSkillState,
  SkillOwnershipSource,
  SkillEffectDerivedStatModifier,
} from './skillTypes.js';

export type {
  SkillPerkDefinition,
  SkillPerkState,
  SkillPerkStatus,
  SkillTreeRuntime,
  SkillTreeStats,
  SkillPerkContext,
} from './skillTypes.js';

// consumed by gameplay systems. Only the redesigned catalog is exposed to players.
const PERK_DEFINITIONS: readonly SkillPerkDefinition[] = SKILL_DEFINITIONS;
assertValidSkillDefinitions(PERK_DEFINITIONS);

const MOMENTUM_PERKS = [
  'swiftScales',
  'corneringInstinct',
  'slipstream',
  'windShear',
  'phaseStride',
  'endlessRoad',
  'overclock',
  'kineticRelease',
] as const;

const HARVEST_PERKS = [
  'controlledShedding',
  'reserveNutrition',
  'digestiveChoice',
  'overgrown',
  'rootedColossus',
  'tooBigToFail',
  'livingDecoy',
  'rapidRegrowth',
  'ouroboros',
] as const;
export class SkillTreeSystem implements SkillTreeSystemApi {
  private readonly perkLookup = new Map<string, SkillPerkDefinition>();
  private readonly perkRanks = new Map<string, number>();
  private readonly perkOwnership = new Map<string, OwnedSkillState>();
  private readonly actionStepIntervalSources = new Map<string, number>();
  private readonly flagEffects = new Map<string, SkillEffectSetFlag>();
  private readonly derivedStats = new DerivedStatResolver();
  private readonly derivedModifierSources = new Map<string, DerivedStatSource>();

  private extraLifeCharges = 0;
  private scoreMultiplier = 1;
  private scoreMultiplierBase = 1;
  private scoreMultiplierBonus = 1;

  private manaEnabled = false;
  private manaMax = 0;
  private manaCurrent = 0;
  private manaRegen = 0;
  private arcanePulseUnlocked = false;
  private arcaneVeilUnlocked = false;

  private readonly arcanePulseCost = 20;
  private spellweaverSequence = 0;
  private readonly arcaneVeilCost = 30;
  private lastMigration: SkillMigrationResult | null = null;

  constructor(
    private readonly runtime: SkillTreeRuntime,
    private readonly baseActionStepIntervalMs: number,
  ) {
    for (const definition of PERK_DEFINITIONS) {
      this.perkLookup.set(definition.id, definition);
    }
  }

  getBaseActionStepIntervalMs(): number {
    return this.baseActionStepIntervalMs;
  }

  getBaseTickDelay(): number {
    return this.getBaseActionStepIntervalMs();
  }

  getPerks(): SkillPerkDefinition[] {
    return [...PERK_DEFINITIONS];
  }

  getDefinition(perkId: string): SkillPerkDefinition | undefined {
    return this.perkLookup.get(perkId);
  }

  getArcanePulseCost(): number {
    return this.arcanePulseCost;
  }

  getArcaneVeilCost(): number {
    return this.arcaneVeilCost;
  }

  getRank(perkId: string): number {
    return this.perkRanks.get(perkId) ?? 0;
  }

  hasPerk(perkId: string): boolean {
    return this.getRank(perkId) > 0;
  }

  exportRanks(): Record<string, number> {
    return Object.fromEntries(this.perkRanks.entries());
  }

  exportOwnership(): Record<string, OwnedSkillState> {
    return Object.fromEntries(
      [...this.perkOwnership].map(([id, state]) => [
        id,
        { rank: state.rank, sources: state.sources.map((source) => ({ ...source })) },
      ]),
    );
  }

  restoreOwnership(ownership: Record<string, OwnedSkillState>): void {
    for (const [perkId, saved] of Object.entries(ownership)) {
      const rank = this.getRank(perkId);
      if (rank <= 0 || !saved || !Array.isArray(saved.sources)) continue;
      const sources = saved.sources.filter((source): source is SkillOwnershipSource => {
        if (!source || typeof source !== 'object' || typeof source.type !== 'string') return false;
        if (source.type === 'purchase' || source.type === 'debug') return true;
        if (source.type === 'class') return typeof source.classId === 'string';
        if (source.type === 'faith') return typeof source.faithId === 'string';
        return source.type === 'migration' && typeof source.oldPerkId === 'string';
      });
      if (sources.length > 0) this.perkOwnership.set(perkId, { rank, sources });
    }
  }

  getOwnership(perkId: string): OwnedSkillState | undefined {
    const state = this.perkOwnership.get(perkId);
    return state
      ? { rank: state.rank, sources: state.sources.map((source) => ({ ...source })) }
      : undefined;
  }

  getLastMigration(): SkillMigrationResult | null {
    return this.lastMigration
      ? { ...this.lastMigration, ranks: { ...this.lastMigration.ranks } }
      : null;
  }

  getDerivedStat(stat: DerivedStatId): number {
    return this.derivedStats.resolve(stat);
  }

  getDerivedStatBreakdown(stat: DerivedStatId): DerivedStatBreakdown {
    return this.derivedStats.getBreakdown(stat);
  }

  setDerivedStatSource(source: DerivedStatSource): void {
    this.derivedModifierSources.set(source.id, source);
    this.derivedStats.setSource(source);
    this.syncDerivedStats();
  }

  restoreRanks(ranks: Record<string, number>): void {
    this.perkRanks.clear();
    this.perkOwnership.clear();
    const migration = migrateSkillRanks(ranks, PERK_DEFINITIONS);
    this.lastMigration = migration;
    if (migration.refundedScore > 0) this.runtime.addScore(migration.refundedScore);
    for (const [perkId, rawRank] of Object.entries(migration.ranks)) {
      const definition = this.perkLookup.get(perkId);
      if (!definition) {
        continue;
      }
      const maxRank = definition.costByRank.length;
      const rank = Math.max(0, Math.min(maxRank, Math.floor(Number(rawRank))));
      if (rank <= 0) {
        continue;
      }
      this.perkRanks.set(perkId, rank);
      const sourceId =
        Object.keys(ranks).find(
          (id) => id === perkId || definition.migrationAliases?.includes(id),
        ) ?? perkId;
      this.perkOwnership.set(perkId, {
        rank,
        sources:
          sourceId === perkId
            ? [{ type: 'purchase' }]
            : [{ type: 'migration', oldPerkId: sourceId }],
      });
      const effectContext: SkillEffectContext = { runtime: this.runtime, system: this };
      for (let i = 0; i < rank; i += 1) {
        const rankEffects = definition.effectsByRank[i] ?? [];
        for (const effect of rankEffects) {
          applySkillEffect(effect, effectContext);
        }
      }
    }
  }

  getPurchaseState(perkId: string): SkillPerkState {
    const definition = this.perkLookup.get(perkId);
    if (!definition) {
      throw new Error(`Unknown perk: ${perkId}`);
    }

    const rank = this.getRank(perkId);
    const maxRank = definition.costByRank.length;

    if (rank >= maxRank) {
      return { definition, rank, status: 'maxed' };
    }

    const missing = (definition.requires ?? []).filter((reqId) => this.getRank(reqId) <= 0);
    if (missing.length > 0) {
      return { definition, rank, status: 'locked', missing };
    }

    const cost = definition.costByRank[rank];
    if (this.runtime.getScore() < cost) {
      return { definition, rank, status: 'unaffordable', cost };
    }

    return { definition, rank, status: 'available', cost };
  }

  canPurchase(perkId: string): boolean {
    try {
      return this.getPurchaseState(perkId).status === 'available';
    } catch {
      return false;
    }
  }

  purchase(perkId: string): { rank: number; cost: number } | null {
    const state = this.getPurchaseState(perkId);
    if (state.status !== 'available' || state.cost === undefined) {
      return null;
    }

    this.runtime.addScore(-state.cost);

    const newRank = state.rank + 1;
    this.perkRanks.set(perkId, newRank);
    const currentOwnership = this.perkOwnership.get(perkId);
    const sources = currentOwnership?.sources ?? [];
    if (!sources.some((source) => source.type === 'purchase')) {
      this.perkOwnership.set(perkId, {
        rank: newRank,
        sources: [...sources, { type: 'purchase' }],
      });
    } else {
      this.perkOwnership.set(perkId, { rank: newRank, sources });
    }

    const definition = state.definition;
    const rankEffects = definition.effectsByRank[newRank - 1] ?? [];
    const effectContext: SkillEffectContext = { runtime: this.runtime, system: this };

    for (const effect of rankEffects) {
      applySkillEffect(effect, effectContext);
    }

    return { rank: newRank, cost: state.cost };
  }

  grantPerk(perkId: string, source: SkillOwnershipSource): boolean {
    const definition = this.perkLookup.get(perkId);
    if (!definition || !definition.grantableAtStart) return false;
    const current = this.perkOwnership.get(perkId);
    const sourceKey = JSON.stringify(source);
    if (current?.sources.some((entry) => JSON.stringify(entry) === sourceKey)) return true;
    const alreadyApplied = this.getRank(perkId) > 0;
    const sources = [...(current?.sources ?? []), source];
    this.perkRanks.set(perkId, Math.max(1, current?.rank ?? 0));
    this.perkOwnership.set(perkId, { rank: 1, sources });
    if (!alreadyApplied) {
      const context: SkillEffectContext = { runtime: this.runtime, system: this };
      for (const effect of definition.effectsByRank[0] ?? []) applySkillEffect(effect, context);
    }
    return true;
  }

  addExtraLives(count: number): void {
    this.extraLifeCharges += count;
  }

  setExtraLives(count: number): void {
    this.extraLifeCharges = Math.max(0, Math.floor(Number(count) || 0));
    this.runtime.notifyExtraLifeReset();
  }

  consumeExtraLife(): boolean {
    if (this.arcaneVeilUnlocked && this.trySpendMana(this.arcaneVeilCost)) {
      this.runtime.onArcaneVeilTriggered();
      return true;
    }

    if (this.extraLifeCharges > 0) {
      this.extraLifeCharges -= 1;
      this.runtime.notifyExtraLifeConsumed();
      return true;
    }

    return false;
  }

  applyFlagEffect(effect: SkillEffectSetFlag): void {
    const stored = this.cloneFlagEffect(effect);
    this.flagEffects.set(effect.key, stored);
    this.runtime.setFlag(effect.key, this.cloneEffectValue(effect.value));
  }

  applyDerivedStatModifier(effect: SkillEffectDerivedStatModifier): void {
    const current = this.derivedModifierSources.get(effect.sourceId);
    const modifiers: DerivedStatModifier[] = [
      ...(current?.modifiers.filter((modifier) => modifier.stat !== effect.stat) ?? []),
      { stat: effect.stat, operation: effect.operation, value: effect.value },
    ];
    this.setDerivedStatSource({
      id: effect.sourceId,
      category: 'perk',
      modifiers,
    });
  }

  private syncDerivedStats(): void {
    const previousMax = this.manaMax;
    this.manaMax = this.derivedStats.resolve('manaMax');
    this.manaRegen = this.derivedStats.resolve('manaRegen');
    if (this.manaEnabled) {
      this.manaCurrent =
        previousMax <= 0
          ? this.manaMax
          : Math.min(this.manaMax, this.manaCurrent + Math.max(0, this.manaMax - previousMax));
      this.runtime.notifyManaChanged(this.manaCurrent, this.manaMax, this.manaRegen);
    }
    for (const stat of [
      'maxHealth',
      'spellSlotCapacity',
      'extraLifeCapacity',
      'nutritionCapacity',
      'wardDuration',
      'storedVitalityCapacity',
      'shopPriceScalar',
      'pickupRadius',
      'companionCapacity',
    ] as const) {
      this.runtime.setFlag(`derived.${stat}`, this.derivedStats.resolve(stat));
    }
  }

  setScoreMultiplier(multiplier: number): void {
    if (!Number.isFinite(multiplier)) {
      return;
    }
    this.scoreMultiplierBase = Math.max(1, multiplier);
    this.updateScoreMultiplier();
  }

  addScoreMultiplierBonus(bonus: number): void {
    if (!Number.isFinite(bonus) || bonus <= 0) {
      return;
    }
    this.scoreMultiplierBonus *= Math.max(1, bonus);
    this.updateScoreMultiplier();
  }

  private updateScoreMultiplier(): void {
    this.scoreMultiplier = Math.max(1, this.scoreMultiplierBase * this.scoreMultiplierBonus);
    this.runtime.notifyScoreMultiplierChanged(this.scoreMultiplier);
  }

  private cloneFlagEffect(effect: SkillEffectSetFlag): SkillEffectSetFlag {
    return {
      ...effect,
      value: this.cloneEffectValue(effect.value),
      resetValue: this.cloneEffectValue(effect.resetValue),
    };
  }

  private cloneEffectValue<T>(value: T): T {
    if (value === undefined || value === null) {
      return value;
    }
    if (typeof value === 'object') {
      try {
        return JSON.parse(JSON.stringify(value)) as T;
      } catch {
        return value;
      }
    }
    return value;
  }

  modifyScoreGain(amount: number): number {
    if (amount <= 0) {
      return amount;
    }
    return Math.max(1, Math.ceil(amount * this.scoreMultiplier));
  }

  enableMana({ max, regen }: { max: number; regen: number }): void {
    const wasEnabled = this.manaEnabled;
    this.manaEnabled = true;
    if (max > 0 || regen > 0) {
      this.setDerivedStatSource({
        id: 'legacy.manaEnable',
        category: 'perk',
        modifiers: [
          { stat: 'manaMax', operation: 'add', value: max },
          { stat: 'manaRegen', operation: 'add', value: regen },
        ],
      });
    }
    this.manaCurrent = this.manaMax;
    this.runtime.notifyManaChanged(this.manaCurrent, this.manaMax, this.manaRegen);
    if (!wasEnabled) {
      this.runtime.notifyManaUnlocked();
    }
  }

  upgradeMana({ maxBonus, regenBonus }: { maxBonus: number; regenBonus: number }): void {
    if (!this.manaEnabled) {
      return;
    }
    this.setDerivedStatSource({
      id: `legacy.manaUpgrade.${maxBonus}.${regenBonus}`,
      category: 'perk',
      modifiers: [
        { stat: 'manaMax', operation: 'add', value: maxBonus },
        { stat: 'manaRegen', operation: 'add', value: regenBonus },
      ],
    });
  }

  unlockArcanePulse(): void {
    this.arcanePulseUnlocked = true;
    if (!this.manaEnabled) {
      this.enableMana({ max: 50, regen: 1 });
    }
    this.runtime.notifyArcanePulseUnlocked();
  }

  unlockArcaneVeil(): void {
    this.arcaneVeilUnlocked = true;
    this.runtime.notifyArcaneVeilUnlocked();
  }

  applyActionStepIntervalScalar(
    factor: number,
    sourceId = `scalar:${this.actionStepIntervalSources.size}`,
  ): void {
    if (!Number.isFinite(factor) || factor <= 0) {
      return;
    }
    const clamped = Math.max(0.2, Math.min(factor, 3));
    this.actionStepIntervalSources.set(sourceId, clamped);
    this.recalculateActionStepInterval();
  }

  applyTickDelayScalar(factor: number, sourceId?: string): void {
    this.applyActionStepIntervalScalar(factor, sourceId);
  }

  tryCastArcanePulse(): boolean {
    if (!this.arcanePulseUnlocked) {
      return false;
    }
    let overcastSegments = 0;
    if (!this.trySpendMana(this.arcanePulseCost)) {
      if (this.getRank('overcast') <= 0) return false;
      const missingMana = Math.max(0, this.arcanePulseCost - this.manaCurrent);
      const requiredSegments = Math.max(1, Math.ceil(missingMana / 10));
      const removed = this.runtime.spendSafeSnakeLength?.(requiredSegments) ?? 0;
      if (removed < requiredSegments) return false;
      overcastSegments = removed;
      this.manaCurrent = 0;
      this.runtime.notifyManaChanged(this.manaCurrent, this.manaMax, this.manaRegen);
      this.runtime.setFlag('ui.overcast', { segments: removed, missingMana });
    }
    this.runtime.onArcanePulseCast();
    if (this.getRank('spellweaver') > 0) {
      this.spellweaverSequence += 1;
      if (this.spellweaverSequence >= 3) {
        this.spellweaverSequence = 0;
        this.manaCurrent = Math.min(this.manaMax, this.manaCurrent + 10);
        this.runtime.setFlag('fortitude.invulnerabilityTicks', 2);
        this.runtime.setFlag('ui.spellweaver', { manaRefund: 10, wardTicks: 2 });
        this.runtime.notifyManaChanged(this.manaCurrent, this.manaMax, this.manaRegen);
      }
    }
    if (overcastSegments >= 2 && this.getRank('astralNova') > 0) {
      this.runtime.onAstralNova?.();
      this.runtime.setFlag('ui.astralNova', { segments: overcastSegments });
    }
    return true;
  }

  tick(): void {
    if (!this.manaEnabled || this.manaRegen <= 0) {
      return;
    }
    const before = this.manaCurrent;
    this.manaCurrent = Math.min(this.manaMax, this.manaCurrent + this.manaRegen);
    if (Math.abs(this.manaCurrent - before) >= 0.01) {
      this.runtime.notifyManaChanged(this.manaCurrent, this.manaMax, this.manaRegen);
    }
  }

  getStats(): SkillTreeStats {
    return {
      extraLives: this.extraLifeCharges,
      scoreMultiplier: this.scoreMultiplier,
      speedRank: this.countRanks(MOMENTUM_PERKS),
      growthRank: this.countRanks(HARVEST_PERKS),
      mana: this.manaCurrent,
      manaMax: this.manaMax,
      manaRegen: this.manaRegen,
      arcanePulseUnlocked: this.arcanePulseUnlocked,
      arcaneVeilUnlocked: this.arcaneVeilUnlocked,
    };
  }

  getManaState(): { mana: number; max: number; regen: number; enabled: boolean } {
    return {
      mana: this.manaCurrent,
      max: this.manaMax,
      regen: this.manaRegen,
      enabled: this.manaEnabled,
    };
  }

  reset(): void {
    for (const effect of this.flagEffects.values()) {
      if (Object.prototype.hasOwnProperty.call(effect, 'resetValue')) {
        this.runtime.setFlag(effect.key, this.cloneEffectValue(effect.resetValue));
      } else {
        this.runtime.setFlag(effect.key, undefined);
      }
    }
    this.flagEffects.clear();
    this.derivedStats.clear();
    this.derivedModifierSources.clear();
    this.perkRanks.clear();
    this.perkOwnership.clear();
    this.lastMigration = null;
    this.actionStepIntervalSources.clear();
    this.extraLifeCharges = 0;
    this.scoreMultiplierBase = 1;
    this.scoreMultiplierBonus = 1;
    this.scoreMultiplier = 1;

    this.manaEnabled = false;
    this.manaMax = 0;
    this.manaCurrent = 0;
    this.manaRegen = 0;
    this.arcanePulseUnlocked = false;
    this.arcaneVeilUnlocked = false;
    this.spellweaverSequence = 0;

    this.runtime.setActionStepIntervalMs(this.baseActionStepIntervalMs);
    this.runtime.notifyExtraLifeReset();
    this.updateScoreMultiplier();
    this.runtime.notifyManaChanged(0, 0, 0);
    this.syncDerivedStats();
  }

  isPerkAvailable(perkId: string): boolean {
    try {
      return this.getPurchaseState(perkId).status !== 'locked';
    } catch {
      return false;
    }
  }

  private recalculateActionStepInterval(): void {
    const combined = Array.from(this.actionStepIntervalSources.values()).reduce(
      (acc, value) => acc * value,
      1,
    );
    const intervalMs = Math.max(30, Math.round(this.baseActionStepIntervalMs * combined));
    this.runtime.setActionStepIntervalMs(intervalMs);
  }

  private countRanks(ids: readonly string[]): number {
    let total = 0;
    for (const id of ids) {
      total += this.getRank(id);
    }
    return total;
  }

  private trySpendMana(amount: number): boolean {
    if (!this.manaEnabled || this.manaCurrent < amount) {
      return false;
    }
    this.manaCurrent -= amount;
    this.runtime.notifyManaChanged(this.manaCurrent, this.manaMax, this.manaRegen);
    return true;
  }
}
