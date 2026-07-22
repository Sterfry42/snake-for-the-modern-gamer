import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import { SkillTreeSystem, type SkillPerkState, type SkillTreeRuntime } from './skillTree.js';
import { SkillTreeOverlay } from '../ui/skillTreeOverlay.js';
import type { SkillTreeStats } from './skillTypes.js';
import type { OwnedSkillState, SkillOwnershipSource } from './skillTypes.js';
import { ActionSlotController } from './actionSlots.js';
import type { SpecialStatId } from '../stats/specialTypes.js';
import {
  getPrimaryBindingLabelForDisplay,
  isKeyboardInputForAction,
} from '../input/controlActions.js';

import { JuiceManager } from '../ui/juice.js';
import { i18n } from '../i18n/i18nManager.js';
import {
  AchievementZoomTracker,
  type AchievementZoomExtreme,
} from '../achievements/achievementZoomTracker.js';
import type { ControllerNavCommand } from '../input/controllerNavigation.js';
import type { InputModeId } from '../input/controlActions.js';
import { usePrimaryAbility as dispatchPrimaryAbility } from './primaryAbility.js';
import type { SpecialGameplayModifiers } from '../stats/specialGameplayModifiers.js';
import type {
  DerivedStatBreakdown,
  DerivedStatId,
  DerivedStatSource,
} from '../stats/derivedStats.js';

export interface SkillTreeManagerOptions {
  baseActionStepIntervalMs: number;
}

export class SkillTreeManager implements SkillTreeRuntime {
  private readonly system: SkillTreeSystem;
  private readonly overlay: SkillTreeOverlay;
  private readonly actionSlots: ActionSlotController;
  private readonly achievementZoomTracker = new AchievementZoomTracker();

  constructor(
    private readonly scene: SnakeScene,
    private readonly juice: JuiceManager,
    options: SkillTreeManagerOptions,
  ) {
    this.system = new SkillTreeSystem(this, options.baseActionStepIntervalMs);
    this.actionSlots = new ActionSlotController({
      getStats: () => this.system.getStats(),
      getFlag: (key) => this.scene.getFlag(key),
      setFlag: (key, value) => this.scene.setFlag(key, value),
      tryCastArcanePulse: () => this.system.tryCastArcanePulse(),
      getArcanePulseCost: () => this.system.getArcanePulseCost(),
      tryActivateManualSurge: () => this.scene.snakeGame.tryActivateManualSurge(),
      hasFollowers: () => this.scene.hasFollowers(),
      commandFollowers: () => this.scene.commandFollowers(),
      recallFollowers: () => this.scene.recallFollowers(),
    });
    this.overlay = new SkillTreeOverlay(this.scene, this.system, {
      onRequestPurchase: (perkId, state) => this.handlePerkInteraction(perkId, state),
      getSpellSlotView: () => this.actionSlots.getAbilityViews(),
      onBindSpellSlot: (abilityId) => this.bindQSlot(abilityId),
      getDatingView: () => this.scene.getDatingCandidateViews(),
      getPeopleView: () => this.scene.getPeopleJournalView(),
      getAnimalCompanionView: () => this.scene.getAnimalCompanionViews(),
      onFeedAnimalCompanion: (companionId) => this.scene.feedAnimalCompanion(companionId),
      onReleaseAnimalCompanion: (companionId) => this.scene.releaseAnimalCompanion(companionId),
      getDestinyView: () => this.scene.getStarforgedPauseMenuLines(),
      getAtmosphereView: () => this.scene.getAtmospherePauseMenuView(),
      getArtifactView: () => this.scene.getArtifactViews(),
      getSpecialView: () => this.scene.getSpecialStatsView(),
      onPreviewSpecialChange: (statId: SpecialStatId, delta: number) =>
        this.scene.previewSpecialStatChange(statId, delta),
      onApplySpecialChanges: () => this.scene.applySpecialStatPreview(),
      onResetSpecialPreview: () => this.scene.resetSpecialStatPreview(),
      getManeuverState: () => this.scene.getManeuverState(),
      onEquipManeuver: (id) => this.scene.equipManeuver(id),
      getAchievementManager: () => this.scene.getAchievementManager(),
      onAchievementZoomExtreme: (extreme) => this.handleAchievementZoomExtreme(extreme),
    });
    this.overlay.hide();
  }

  private handleAchievementZoomExtreme(extreme: AchievementZoomExtreme): void {
    if (!this.achievementZoomTracker.record(extreme, this.scene.time.now)) return;
    this.scene.recordAchievementEvent({ type: 'ui:achievementZoomFlurry' });
  }

  reset(startPaused: boolean): void {
    this.system.reset();
    this.achievementZoomTracker.reset();
    if (!startPaused) {
      this.overlay.hide();
    }
    this.overlay.refresh();
  }

  exportRanks(): Record<string, number> {
    return this.system.exportRanks();
  }

  exportOwnership(): Record<string, OwnedSkillState> {
    return this.system.exportOwnership();
  }

  restoreRanks(ranks: Record<string, number>, ownership?: Record<string, OwnedSkillState>): void {
    this.system.restoreRanks(ranks);
    if (ownership) this.system.restoreOwnership(ownership);
    this.scene.refreshProgressionDerivedStats();
    const migration = this.system.getLastMigration();
    if (migration && (migration.mappedPerks > 0 || migration.removedPurchases > 0)) {
      this.scene.setFlag('skills.migration.v2', {
        complete: true,
        mappedPerks: migration.mappedPerks,
        refundedPurchases: migration.removedPurchases,
        refundedScore: migration.refundedScore,
      });
      this.overlay.announce(
        `Your skill tree was rebuilt: ${migration.mappedPerks} mapped, ${migration.refundedScore} score refunded.`,
        '#9ad1ff',
        4200,
      );
    }
    this.actionSlots.ensureDefaultBinding();
    this.overlay.refresh();
  }

  grantStartingPerk(perkId: string, source: SkillOwnershipSource): boolean {
    const granted = this.system.grantPerk(perkId, source);
    if (granted) {
      this.scene.setFlag('skills.ranks', this.system.exportRanks());
      this.scene.setFlag('skills.ownership', this.system.exportOwnership());
      this.scene.refreshProgressionDerivedStats();
      this.overlay.refresh();
    }
    return granted;
  }

  getPerkOwnership(perkId: string): OwnedSkillState | undefined {
    return this.system.getOwnership(perkId);
  }

  tick(): void {
    this.system.tick();
  }

  toggleOverlay(force?: boolean): void {
    this.overlay.toggle(force);
  }

  hideOverlay(): void {
    this.overlay.hide();
  }

  isOverlayVisible(): boolean {
    return this.overlay.isVisible();
  }

  setInputMode(mode: InputModeId): void {
    this.overlay.setInputMode(mode);
  }

  handleKeyDown(key: string, paused: boolean): boolean {
    if (key === 'i') {
      if (!this.overlay.isVisible()) {
        return false;
      }

      if (this.overlay.isInventoryTabActive()) {
        if (!this.overlay.showInventoryDetailsAtPointer()) {
          // If not over a valid item, clear details
        }
        return true;
      }

      const hovered = this.overlay.getHoveredPerkId();
      if (!hovered) {
        this.overlay.announce(i18n.getFeatureString('skillTreeHoverSkill'), '#9ad1ff', 2000);
        return true;
      }

      if (!this.overlay.showPerkDetails(hovered)) {
        this.overlay.announce(i18n.getFeatureString('skillTreeUnableToDisplay'), '#ff6b6b', 2000);
      }
      return true;
    }

    if (key === 'u') {
      return this.overlay.useSelectedInventoryItem();
    }

    if (key === 'e') {
      return this.overlay.toggleSelectedEquipment();
    }

    if (key === 'c') {
      return this.overlay.cookSelectedInventoryItem();
    }

    if (!isKeyboardInputForAction(key, 'ability.primary')) {
      return false;
    }

    return this.usePrimaryAbility(paused);
  }

  tryConsumeExtraLife(): boolean {
    const consumed = this.system.consumeExtraLife();
    if (consumed) {
      this.overlay.show();
      this.juice.skillTreeOpened();
    }
    return consumed;
  }

  modifyScoreGain(amount: number): number {
    return this.system.modifyScoreGain(amount);
  }

  addExtraLifeCharge(count: number): void {
    this.system.addExtraLives(count);
  }

  setExtraLifeCharges(count: number): void {
    this.system.setExtraLives(count);
  }

  handleTextInput(event: KeyboardEvent): boolean {
    return this.overlay.handleCheatKeyDown(event);
  }

  handleControllerCommand(command: ControllerNavCommand, paused: boolean): boolean {
    if (command === 'primary') {
      return this.usePrimaryAbility(paused);
    }
    return this.overlay.handleControllerCommand(command);
  }

  captureControllerBinding(label: string): boolean {
    return this.overlay.captureControllerBinding(label);
  }

  private usePrimaryAbility(paused: boolean): boolean {
    return dispatchPrimaryAbility(
      {
        useActionSlot: () => this.actionSlots.use('q'),
        onFailure: (reason) => {
          this.juice.spellFailed();
          if (this.overlay.isVisible()) {
            this.overlay.announce(reason, '#ff6b6b', 2200);
          }
        },
      },
      paused,
    );
  }

  clearExtraLifeCharges(): void {
    (this.system as any).extraLifeCharges = 0;
  }

  adjustBonusScore(baseValue: number): number {
    return this.system.modifyScoreGain(baseValue);
  }

  setFlag(key: string, value: unknown): void {
    this.scene.setFlag(key, value);
  }

  getStats(): SkillTreeStats {
    return this.system.getStats();
  }

  refreshSpecialDerivedStats(special: SpecialGameplayModifiers): void {
    this.system.setDerivedStatSource({
      id: 'special.core',
      category: 'special',
      modifiers: [
        { stat: 'maxHealth', operation: 'add', value: special.maxHeartBonus },
        {
          stat: 'actionStepIntervalScalar',
          operation: 'multiply',
          value: special.movementTickDelayScalar,
        },
        {
          stat: 'wardDuration',
          operation: 'add',
          value: special.invulnerabilityTickBonus,
        },
        { stat: 'manaMax', operation: 'add', value: special.manaCapacityBonus },
        { stat: 'manaRegen', operation: 'add', value: special.manaRegenBonus },
        { stat: 'spellSlotCapacity', operation: 'add', value: special.spellSlotBonus },
        {
          stat: 'nutritionCapacity',
          operation: 'add',
          value: special.nutritionCapacityBonus,
        },
        { stat: 'pickupRadius', operation: 'add', value: special.pickupRadiusBonus },
        {
          stat: 'companionCapacity',
          operation: 'add',
          value: special.companionCapacityBonus,
        },
      ],
    });
  }

  setDerivedStatSource(source: DerivedStatSource): void {
    this.system.setDerivedStatSource(source);
  }

  getDerivedStat(stat: DerivedStatId): number {
    return this.system.getDerivedStat(stat);
  }

  getDerivedStatBreakdown(stat: DerivedStatId): DerivedStatBreakdown {
    return this.system.getDerivedStatBreakdown(stat);
  }

  getCompletedBranchIds(): string[] {
    const perks = this.system.getPerks().filter((perk) => perk.kind !== 'combo');
    const branches = new Map<string, typeof perks>();
    for (const perk of perks) {
      branches.set(perk.branch, [...(branches.get(perk.branch) ?? []), perk]);
    }
    return [...branches.entries()]
      .filter(([, branchPerks]) =>
        branchPerks.every((perk) => this.system.getRank(perk.id) >= perk.costByRank.length),
      )
      .map(([branch]) => branch);
  }

  getBranchCount(): number {
    return new Set(
      this.system
        .getPerks()
        .filter((perk) => perk.kind !== 'combo')
        .map((perk) => perk.branchId),
    ).size;
  }

  getOverlay(): SkillTreeOverlay {
    return this.overlay;
  }

  // SkillTreeRuntime implementation
  getScore(): number {
    return this.scene.score;
  }

  addScore(amount: number): void {
    this.scene.addScoreDirect(amount);
  }

  setTickDelay(delay: number): void {
    this.setActionStepIntervalMs(delay);
  }

  setActionStepIntervalMs(intervalMs: number): void {
    this.scene.setActionStepIntervalMs(intervalMs);
  }

  growSnake(extraSegments: number): void {
    this.scene.growSnake(extraSegments);
  }

  notifyScoreMultiplierChanged(multiplier: number): void {
    if (multiplier > 1) {
      this.juice.scoreMultiplierBoost(multiplier);
    }
    this.overlay.refresh();
  }

  notifyExtraLifeGained(): void {
    this.juice.extraLifeGained();
    this.scene.recordAchievementEvent({ type: 'extraLife:gained', amount: 1 });
    this.overlay.refresh();
  }

  notifyExtraLifeConsumed(): void {
    this.juice.extraLifeSpent();
    this.overlay.refresh();
  }

  notifyExtraLifeReset(): void {
    this.overlay.refresh();
  }

  notifyManaChanged(current: number, max: number, regen: number): void {
    void current;
    void max;
    void regen;
    this.overlay.refresh();
  }

  notifyManaUnlocked(): void {
    this.juice.manaUnlocked();
    this.overlay.refresh();
    this.overlay.announce('Mana unlocked - arcana is now in play.', '#9ad1ff', 2600);
  }

  notifyArcanePulseUnlocked(): void {
    this.actionSlots.ensureDefaultBinding();
    this.juice.arcaneSpellUnlocked();
    this.overlay.refresh();
    this.overlay.announce(
      `Arcane Pulse unlocked and bound to ${getPrimaryBindingLabelForDisplay('ability.primary')}.`,
      '#ffbdfd',
      2800,
    );
  }

  notifyArcaneVeilUnlocked(): void {
    this.juice.arcaneVeilPrimed();
    this.overlay.refresh();
    this.overlay.announce('Starlight Veil primed - it will absorb one fatal hit.', '#ffbdfd', 3200);
  }

  onArcanePulseCast(): void {
    const head = this.scene.snakeGame.getSnakeBody()[0];
    const cell = this.scene.grid.cell;
    const worldX = head ? head.x * cell + cell / 2 : (this.scene.grid.cols * cell) / 2;
    const worldY = head ? head.y * cell + cell / 2 : (this.scene.grid.rows * cell) / 2;

    this.scene.addScore(4);
    this.scene.growSnake(2);

    this.juice.arcanePulse(worldX, worldY);

    const pulse = this.scene.add
      .circle(worldX, worldY, 14, 0xffbdfd, 0.4)
      .setDepth(26)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: pulse,
      scale: 2.4,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => pulse.destroy(),
    });

    if (this.overlay.isVisible()) {
      this.overlay.announce('Arcane Pulse surges through the serpent!', '#ffbdfd', 2000);
    }
  }

  onArcaneVeilTriggered(): void {
    this.juice.arcaneVeilBurst();

    const head = this.scene.snakeGame.getSnakeBody()[0];
    const cell = this.scene.grid.cell;
    const worldX = head ? head.x * cell + cell / 2 : (this.scene.grid.cols * cell) / 2;
    const worldY = head ? head.y * cell + cell / 2 : (this.scene.grid.rows * cell) / 2;

    const veil = this.scene.add
      .circle(worldX, worldY, 18, 0xffffff, 0.25)
      .setStrokeStyle(2, 0xffbdfd)
      .setDepth(26)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: veil,
      scale: 2.6,
      alpha: 0,
      duration: 320,
      ease: 'Cubic.easeOut',
      onComplete: () => veil.destroy(),
    });

    if (this.overlay.isVisible()) {
      this.overlay.announce('Starlight Veil absorbed the blow!', '#ffbdfd', 2600);
    }
  }

  spendSafeSnakeLength(segments: number): number {
    return this.scene.snakeGame.spendSafeSnakeLengthForProgression(segments);
  }

  onAstralNova(): void {
    this.scene.snakeGame.triggerProgressionShockwave(5, 6);
    this.juice.arcaneVeilBurst();
  }

  // internal helpers
  private handlePerkInteraction(perkId: string, state: SkillPerkState): void {
    if (!this.system) {
      return;
    }

    if (state.status !== 'available') {
      let message: string;
      let color = '#ff6b6b';

      switch (state.status) {
        case 'locked': {
          const missingTitles = (state.missing ?? []).map(
            (id) => this.system.getDefinition(id)?.title ?? id,
          );
          message =
            missingTitles.length > 0
              ? 'Unlock ' + missingTitles.join(', ') + ' first.'
              : 'This branch is still sealed.';
          break;
        }
        case 'unaffordable': {
          const cost = state.cost ?? 0;
          const needed = Math.max(0, cost - this.scene.score);
          message =
            needed > 0
              ? cost + ' score required - need ' + needed + ' more.'
              : cost + ' score required.';
          break;
        }
        case 'maxed': {
          message = state.definition.title + ' is already maxed out.';
          color = '#9ad1ff';
          break;
        }
        default: {
          message = 'That perk is unavailable right now.';
          break;
        }
      }

      this.juice.perkPurchaseFailed();
      this.overlay.announce(message, color);
      this.overlay.refresh();
      return;
    }

    const purchase = this.system.purchase(perkId);
    if (!purchase) {
      this.juice.perkPurchaseFailed();
      this.overlay.announce('Could not invest in that perk right now.', '#ff6b6b');
      this.overlay.refresh();
      return;
    }

    this.juice.perkPurchased();
    this.scene.setFlag('skills.ranks', this.system.exportRanks());
    this.scene.setFlag('skills.ownership', this.system.exportOwnership());
    this.scene.refreshProgressionDerivedStats();
    this.overlay.refresh();
    this.overlay.pulsePerk(perkId);
    this.overlay.announce(
      state.definition.usageHint
        ? `${state.definition.title}: ${state.definition.usageHint}`
        : state.definition.title + ' - Rank ' + purchase.rank + ' unlocked!',
      '#5dd6a2',
      state.definition.usageHint ? 2800 : 1800,
    );
  }

  private bindQSlot(abilityId: string): void {
    const result = this.actionSlots.bind('q', abilityId);
    if (result.ok === false) {
      this.juice.spellFailed();
      this.overlay.announce(result.reason, '#ff6b6b', 2200);
      this.overlay.refresh();
      return;
    }
    this.juice.arcaneSpellUnlocked();
    this.overlay.announce(
      `${result.label} bound to ${getPrimaryBindingLabelForDisplay('ability.primary')}.`,
      '#ffbdfd',
      2000,
    );
    this.overlay.refresh();
  }

  // External helpers
  applyActionStepIntervalScalar(factor: number, sourceId: string): void {
    // Pass through to the underlying system so other modules (e.g., equipment)
    // can contribute to the action interval calculation as named sources.
    this.system.applyActionStepIntervalScalar(factor, sourceId);
  }

  applyTickDelayScalar(factor: number, sourceId: string): void {
    this.applyActionStepIntervalScalar(factor, sourceId);
  }
}
