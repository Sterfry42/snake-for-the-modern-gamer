import type { SnakeGame } from '../game/snakeGame.js';
import { SkillTreeSystem } from '../systems/skillTree.js';
import type { SkillTreeRuntime } from '../systems/skillTypes.js';
import {
  applyRuntimeModifierSource,
  createRuntimeModifierTotals,
} from '../stats/gameplayModifierAccumulator.js';
import type { EquipmentModifiers } from '../inventory/item.js';
import { getItem } from '../inventory/itemRegistry.js';
import type { SkillTreeClientState } from '../systems/skillTree.js';
import type { OwnedSkillState } from '../systems/skillTypes.js';
import { ActionSlotController } from '../systems/actionSlots.js';
import { getAlchemyDerivedStatSource } from '../alchemy/potionEffects.js';
import type { CharacterCreationMods } from '../features/characterCreationDefinitions.js';

/** The existing skill system with gameplay callbacks and no Phaser dependency. */
export class AuthoritativeProgression implements SkillTreeRuntime {
  readonly skills = new SkillTreeSystem(this, 100);
  intervalMs = 100;
  readonly actions: ActionSlotController;
  private modifierSignature = '';
  constructor(private readonly game: SnakeGame) {
    const ownership = game.getFlag<Record<string, OwnedSkillState>>('skills.ownership');
    const state = game.getFlag<SkillTreeClientState>('skills.clientState');
    const extraLives = game.getFlag<number>('skills.extraLifeCharges');
    this.skills.restoreRanks(game.getFlag<Record<string, number>>('skills.ranks') ?? {});
    if (ownership) this.skills.restoreOwnership(ownership);
    if (state) this.skills.hydrateClientState(state);
    else if (extraLives !== undefined) this.skills.setExtraLives(extraLives);
    this.refreshEquipment();
    this.actions = new ActionSlotController({
      getStats: () => this.skills.getStats(),
      getFlag: (key) => this.game.getFlag(key),
      setFlag: (key, value) => this.game.setFlag(key, value),
      knowsSpell: (id) => this.skills.knowsSpell(id),
      isSpellLoaded: (id) => this.skills.isSpellLoaded(id),
      getFirstLoadedSpellId: () => this.skills.getFirstLoadedSpellId(),
      tryCastSpell: (id) => this.skills.tryCastSpell(id),
      tryCastArcanePulse: () => this.skills.tryCastArcanePulse(),
      getArcanePulseCost: () => this.skills.getArcanePulseCost(),
      tryActivateManualSurge: () => this.game.tryActivateManualSurge(),
      hasRatFamiliar: () => this.game.hasRatFamiliar(),
      getSummonFamiliarCost: () => this.skills.getSummonFamiliarCost(),
      tryCastSummonFamiliar: () => this.skills.tryCastSummonFamiliar(),
      hasFollowers: () => this.game.hasFollowers(),
      commandFollowers: () => this.game.commandFollowers(),
      recallFollowers: () => this.game.recallFollowers(),
    });
  }
  getScore() {
    return this.game.getScore();
  }
  addScore(amount: number) {
    this.game.addScore(amount);
  }
  setActionStepIntervalMs(value: number) {
    this.intervalMs = value;
  }
  setTickDelay(value: number) {
    this.setActionStepIntervalMs(value);
  }
  growSnake(value: number) {
    this.game.growSnake(value);
  }
  getFlag<T = unknown>(key: string): T | undefined {
    return this.game.getFlag<T>(key);
  }
  setFlag(key: string, value: unknown) {
    this.game.setFlag(key, value);
  }
  notifyScoreMultiplierChanged(value: number) {
    this.setFlag('skills.scoreMultiplier', value);
  }
  notifyExtraLifeGained() {
    this.persist();
  }
  notifyExtraLifeConsumed() {
    this.persist();
  }
  notifyExtraLifeReset() {
    this.persist();
  }
  notifyManaChanged() {
    this.persist();
  }
  notifyManaUnlocked() {
    this.persist();
  }
  notifyArcanePulseUnlocked() {
    this.persist();
  }
  notifyArcaneVeilUnlocked() {
    this.persist();
  }
  onArcanePulseCast() {
    this.game.addScore(4);
    this.game.growSnake(2);
  }
  onArcaneVeilTriggered() {
    this.persist();
  }
  spendSafeSnakeLength(segments: number) {
    return this.game.spendSafeSnakeLengthForProgression(segments);
  }
  onAstralNova() {
    this.game.triggerProgressionShockwave(5, 6);
  }
  onSummonFamiliarCast() {
    this.game.summonRatFamiliar(90);
  }
  hasRatFamiliar() {
    return this.game.hasRatFamiliar();
  }

  persist(): void {
    // Constructor callbacks can run before the SkillTreeSystem field has been assigned.
    if (!this.skills) return;
    this.setFlag('skills.ranks', this.skills.exportRanks());
    this.setFlag('skills.ownership', this.skills.exportOwnership());
    this.setFlag('skills.clientState', this.skills.exportClientState());
    this.setFlag('skills.extraLifeCharges', this.skills.getStats().extraLives);
  }

  refreshEquipment(): void {
    this.modifierSignature = this.getModifierSignature();
    const totals = createRuntimeModifierTotals();
    for (const kind of ['faith', 'background', 'class'] as const) {
      const prefix = kind === 'faith' ? 'religion' : kind;
      this.skills.setDerivedStatSource({
        id: `creation.${kind}`,
        category: kind,
        modifiers: this.getFlag<CharacterCreationMods>(`${prefix}.mods`)?.derivedModifiers ?? [],
      });
    }
    for (const [, id] of this.game.getInventory().getAllEquipped()) {
      const item = getItem(id);
      applyRuntimeModifierSource(totals, item?.kind === 'equipment' ? item.modifiers : undefined, {
        countPhoenixAsItem: true,
      });
    }
    for (const key of ['religion.mods', 'class.mods', 'background.mods'])
      applyRuntimeModifierSource(totals, this.getFlag<EquipmentModifiers>(key));
    const special = this.game.getSpecialGameplayModifiers();
    this.skills.setDerivedStatSource({
      id: 'equipment.loadout',
      category: 'equipment',
      modifiers: [
        { stat: 'actionStepIntervalScalar', operation: 'multiply', value: totals.tickDelayScalar },
        { stat: 'wardDuration', operation: 'add', value: totals.invulnerabilityBonus },
      ],
    });
    this.skills.setDerivedStatSource({
      id: 'status.orangeJuice',
      category: 'status',
      modifiers: [
        {
          stat: 'actionStepIntervalScalar',
          operation: 'multiply',
          value: (this.getFlag<number>('status.orangeJuiceSpeedBoostTicks') ?? 0) > 0 ? 0.75 : 1,
        },
      ],
    });
    this.skills.setDerivedStatSource(
      getAlchemyDerivedStatSource(this.game.getAlchemyState().activeEffects),
    );
    this.skills.setDerivedStatSource({
      id: 'special.core',
      category: 'special',
      modifiers: [
        { stat: 'maxHealth', operation: 'add', value: special.maxHeartBonus },
        {
          stat: 'actionStepIntervalScalar',
          operation: 'multiply',
          value: special.movementTickDelayScalar,
        },
        { stat: 'wardDuration', operation: 'add', value: special.invulnerabilityTickBonus },
        { stat: 'manaMax', operation: 'add', value: special.manaCapacityBonus },
        { stat: 'manaRegen', operation: 'add', value: special.manaRegenBonus },
        { stat: 'spellSlotCapacity', operation: 'add', value: special.spellSlotBonus },
        { stat: 'nutritionCapacity', operation: 'add', value: special.nutritionCapacityBonus },
        { stat: 'pickupRadius', operation: 'add', value: special.pickupRadiusBonus },
        { stat: 'companionCapacity', operation: 'add', value: special.companionCapacityBonus },
      ],
    });
    const flags: Record<string, unknown> = {
      'equipment.wallSenseRadiusBonus': totals.wallSenseBonus,
      'equipment.seismicPulseRadiusBonus': totals.seismicPulseBonus,
      'equipment.masonryEnabled': totals.masonryEnabled,
      'equipment.invulnerabilityBonus':
        totals.invulnerabilityBonus + special.invulnerabilityTickBonus,
      'equipment.regenerator': totals.regenerator,
      'equipment.phoenixCharges': totals.phoenixCharges,
      'equipment.itemPhoenixCharges': totals.itemPhoenixCharges,
      'equipment.gunEnabled': totals.gunEnabled,
      'equipment.activeTool': totals.activeTool,
      'equipment.wallSmiteEnabled': totals.wallSmiteEnabled,
      'equipment.heatResistance': Math.min(0.9, totals.heatResistance),
      'equipment.coldResistance': Math.min(0.9, totals.coldResistance),
      'equipment.swimmingEnabled': totals.swimmingEnabled,
      'equipment.refundEveryRooms': totals.refundEveryRooms,
      'equipment.appleScorePenalty': totals.appleScorePenalty,
      'equipment.hazardMapSense': totals.hazardMapSense,
      'equipment.lightRadiusTiles': totals.lightRadiusTiles,
      'equipment.firstPersonView': totals.firstPersonView,
      'equipment.radiationTimerScalar': totals.radiationTimerScalar * special.hazardTimerScalar,
      'special.maxHeartBonus': special.maxHeartBonus,
      'special.weaponCooldownScalar': special.weaponCooldownScalar,
      'special.lockOnRangeBonus': special.lockOnRangeBonus,
      'special.lockOnTimeScalar': special.lockOnTimeScalar,
      'special.projectileCritChance': special.projectileCritChance,
      'special.rareLootScalar': special.rareLootScalar,
      'special.weirdOutcomeChanceBonus': special.weirdOutcomeChanceBonus,
    };
    for (const [key, value] of Object.entries(flags)) this.setFlag(key, value);
    const previousMax = this.game.getPlayerHealth().max;
    const health = this.game.getPlayerHealth().current;
    const maximum = Math.max(1, this.skills.getDerivedStat('maxHealth'));
    this.setFlag('player.maxHealth', maximum);
    this.setFlag('player.health', health >= previousMax ? maximum : Math.min(maximum, health));
    this.intervalMs = 100 * this.skills.getDerivedStat('actionStepIntervalScalar');
    this.persist();
  }

  refreshIfNeeded(): void {
    if (this.modifierSignature !== this.getModifierSignature()) this.refreshEquipment();
  }
  private getModifierSignature(): string {
    return JSON.stringify([
      this.game.getInventory().getAllEquipped(),
      this.game.getSpecialGameplayModifiers(),
      this.game.getAlchemyState().activeEffects,
      (this.getFlag<number>('status.orangeJuiceSpeedBoostTicks') ?? 0) > 0,
      ...['religion.mods', 'class.mods', 'background.mods'].map((key) => this.getFlag(key)),
    ]);
  }
}
