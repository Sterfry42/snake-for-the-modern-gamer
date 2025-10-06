import Phaser from "phaser";
import type SnakeScene from "../scenes/snakeScene.js";
import { SkillTreeSystem, type SkillPerkState, type SkillTreeRuntime } from "./skillTree.js";
import { SkillTreeOverlay } from "../ui/skillTreeOverlay.js";

import { JuiceManager } from "../ui/juice.js";

export interface SkillTreeManagerOptions {
  baseTickDelay: number;
}

export class SkillTreeManager implements SkillTreeRuntime {
  private readonly system: SkillTreeSystem;
  private readonly overlay: SkillTreeOverlay;

  constructor(
    private readonly scene: SnakeScene,
    private readonly juice: JuiceManager,
    options: SkillTreeManagerOptions
  ) {
    this.system = new SkillTreeSystem(this, options.baseTickDelay);
    this.overlay = new SkillTreeOverlay(this.scene, this.system, {
      onRequestPurchase: (perkId, state) => this.handlePerkInteraction(perkId, state),
    });
    this.overlay.hide();
  }

  reset(startPaused: boolean): void {
    this.system.reset();
    if (!startPaused) {
      this.overlay.hide();
    }
    this.overlay.refresh();
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

  handleKeyDown(key: string, paused: boolean): boolean {
    if (key !== "q") {
      return false;
    }

    if (paused) {
      return true;
    }

    const stats = this.system.getStats();
    if (!stats.arcanePulseUnlocked) {
      this.juice.spellFailed();
      if (this.overlay.isVisible()) {
        this.overlay.announce("Unlock Arcane Pulse in the skill tree to cast.", "#9ad1ff", 2200);
      }
      return true;
    }

    const pulseCost = this.system.getArcanePulseCost();
    if (stats.mana < pulseCost) {
      this.juice.spellFailed();
      if (this.overlay.isVisible()) {
        const missing = Math.max(1, Math.ceil(pulseCost - stats.mana));
        this.overlay.announce("Arcane Pulse needs " + pulseCost + " mana - missing " + missing + ".", "#ff6b6b", 2200);
      }
      return true;
    }

    if (!this.system.tryCastArcanePulse()) {
      this.juice.spellFailed();
    }
    return true;
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

  adjustBonusScore(baseValue: number): number {
    return this.system.modifyScoreGain(baseValue);
  }

  getStats(): SkillTreeStats {
    return this.system.getStats();
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
    this.scene.setTickDelay(delay);
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
    this.overlay.announce("Mana unlocked - arcana is now in play.", "#9ad1ff", 2600);
  }

  notifyArcanePulseUnlocked(): void {
    this.juice.arcaneSpellUnlocked();
    this.overlay.refresh();
    this.overlay.announce("Arcane Pulse unlocked - press Q to cast!", "#ffbdfd", 2800);
  }

  notifyArcaneVeilUnlocked(): void {
    this.juice.arcaneVeilPrimed();
    this.overlay.refresh();
    this.overlay.announce("Starlight Veil primed - it will absorb one fatal hit.", "#ffbdfd", 3200);
  }

  onArcanePulseCast(): void {
    const head = this.scene.game.getSnakeBody()[0];
    const cell = this.scene.grid.cell;
    const worldX = head ? head.x * cell + cell / 2 : (this.scene.grid.cols * cell) / 2;
    const worldY = head ? head.y * cell + cell / 2 : (this.scene.grid.rows * cell) / 2;

    this.scene.addScore(4);
    this.scene.growSnake(2);

    this.juice.arcanePulse(worldX, worldY);

    const pulse = this.scene.add.circle(worldX, worldY, 14, 0xffbdfd, 0.4)
      .setDepth(26)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: pulse,
      scale: 2.4,
      alpha: 0,
      duration: 260,
      ease: "Cubic.easeOut",
      onComplete: () => pulse.destroy(),
    });

    if (this.overlay.isVisible()) {
      this.overlay.announce("Arcane Pulse surges through the serpent!", "#ffbdfd", 2000);
    }
  }

  onArcaneVeilTriggered(): void {
    this.juice.arcaneVeilBurst();

    const head = this.scene.game.getSnakeBody()[0];
    const cell = this.scene.grid.cell;
    const worldX = head ? head.x * cell + cell / 2 : (this.scene.grid.cols * cell) / 2;
    const worldY = head ? head.y * cell + cell / 2 : (this.scene.grid.rows * cell) / 2;

    const veil = this.scene.add.circle(worldX, worldY, 18, 0xffffff, 0.25)
      .setStrokeStyle(2, 0xffbdfd)
      .setDepth(26)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: veil,
      scale: 2.6,
      alpha: 0,
      duration: 320,
      ease: "Cubic.easeOut",
      onComplete: () => veil.destroy(),
    });

    if (this.overlay.isVisible()) {
      this.overlay.announce("Starlight Veil absorbed the blow!", "#ffbdfd", 2600);
    }
  }

  // internal helpers
  private handlePerkInteraction(perkId: string, state: SkillPerkState): void {
    if (!this.system) {
      return;
    }

    if (state.status !== "available") {
      let message: string;
      let color = "#ff6b6b";

      switch (state.status) {
        case "locked": {
          const missingTitles = (state.missing ?? []).map((id) => this.system.getDefinition(id)?.title ?? id);
          message = missingTitles.length > 0 ? "Unlock " + missingTitles.join(", ") + " first." : "This branch is still sealed.";
          break;
        }
        case "unaffordable": {
          const cost = state.cost ?? 0;
          const needed = Math.max(0, cost - this.scene.score);
          message = needed > 0 ? cost + " score required - need " + needed + " more." : cost + " score required.";
          break;
        }
        case "maxed": {
          message = state.definition.title + " is already maxed out.";
          color = "#9ad1ff";
          break;
        }
        default: {
          message = "That perk is unavailable right now.";
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
      this.overlay.announce("Could not invest in that perk right now.", "#ff6b6b");
      this.overlay.refresh();
      return;
    }

    this.juice.perkPurchased();
    this.overlay.refresh();
    this.overlay.announce(state.definition.title + " - Rank " + purchase.rank + " unlocked!", "#5dd6a2");
  }
}

