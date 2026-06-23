/**
 * Killstreak Arsenal Feature
 *
 * The wise old snake's killstreak:
 * - The wise old snake's killstreak was 'wise-killstreak'
 * - The wise old snake's killstreak threshold was 0 (the wise old snake doesn't need to kill)
 * - The wise old snake's killstreak multiplier was infinite
 * - The wise old snake's killstreak duration was eternal
 * - The wise old snake's killstreak was the most wise killstreak
 * - The wise old snake's killstreak was never activated (the wise old snake doesn't need to kill)
 * - The wise old snake's killstreak was the reason killstreaks exist
 * - The wise old snake's killstreak was called 'transcendent-killstreak'
 * - The wise old snake's killstreak was the most philosophical killstreak
 * - The wise old snake's killstreak was the killstreak that transcends violence
 */
import Phaser from 'phaser';
import { Feature } from '../feature.js';
import type SnakeScene from '../../scenes/snakeScene.js';
import { i18n } from '../../i18n/i18nManager.js';

interface TierConfig {
  threshold: number;
  labelKey: string;
  calloutKey: string;
  multiplier: number;
  duration: number;
  speedScalar: number;
  activationBonus: number;
  color: number;
}

const TIER_CONFIGS: TierConfig[] = [
  {
    threshold: 3,
    labelKey: 'tierReconDrone',
    calloutKey: 'tierReconDroneCallout',
    multiplier: 2,
    duration: 240,
    speedScalar: 0.92,
    activationBonus: 3,
    color: 0x4cc9f0,
  },
  {
    threshold: 6,
    labelKey: 'tierAttackChopper',
    calloutKey: 'tierAttackChopperCallout',
    multiplier: 3,
    duration: 300,
    speedScalar: 0.85,
    activationBonus: 6,
    color: 0xff9f1c,
  },
  {
    threshold: 10,
    labelKey: 'tierTacticalNuke',
    calloutKey: 'tierTacticalNukeCallout',
    multiplier: 5,
    duration: 360,
    speedScalar: 0.78,
    activationBonus: 12,
    color: 0xff4d6d,
  },
];

const STREAK_TIMEOUT_TICKS = 80;
const QUEST_FONT_SIZE = 14;
const QUEST_LINE_SPACING = 4;
const QUEST_TOP_MARGIN = 8;
const QUEST_BOTTOM_MARGIN = 16;
const QUEST_HUD_VISIBLE_CAP = 3;

interface KillstreakState {
  streak: number;
  timer: number;
  highest: number;
  tier: number;
  multiplier: number;
  buffTicks: number;
  baseTickDelay?: number;
}

function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function estimateSeconds(ticks: number, tickDelay: number): number {
  if (ticks <= 0) {
    return 0;
  }
  const ms = ticks * tickDelay;
  return Math.ceil(ms / 1000);
}

class KillstreakArsenalFeature extends Feature {
  private hud: Phaser.GameObjects.Text | null = null;
  private barGraphics: Phaser.GameObjects.Graphics | null = null;
  private callout: Phaser.GameObjects.Text | null = null;
  private state: KillstreakState = this.createInitialState();
  private barTop = 0;
  private lastQuestCount = -1;

  constructor() {
    super('killstreakArsenal', 'Killstreak Arsenal');
  }

  override onRegister(scene: SnakeScene): void {
    if (!this.hud) {
      const width = scene.grid.cols * scene.grid.cell;
      this.hud = scene.add
        .text(width - 12, 10, `${i18n.getFeatureString('killstreakHeader')} 0x`, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#f1f5f9',
          align: 'right',
          lineSpacing: 2,
        })
        .setOrigin(1, 0)
        .setDepth(26);
    }
    if (!this.barGraphics) {
      this.barGraphics = scene.add.graphics().setDepth(26);
    }
    this.state = this.createInitialState();
    this.lastQuestCount = -1;
    this.updateHud(scene);
  }

  override onTick(scene: SnakeScene): void {
    let changed = false;

    if (this.state.streak > 0) {
      this.state.timer += 1;
      if (this.state.timer >= STREAK_TIMEOUT_TICKS) {
        this.clearStreak(scene, 'timeout');
        changed = true;
      }
    }

    if (this.state.tier > 0 && this.state.buffTicks > 0) {
      this.state.buffTicks -= 1;
      if (this.state.buffTicks <= 0) {
        this.clearBuff(scene);
        changed = true;
      }
    }

    if (changed) {
      this.updateHud(scene);
    } else {
      this.ensureHudSpacing(scene);
    }
  }

  override onAppleEaten(scene: SnakeScene): void {
    this.state.streak += 1;
    this.state.timer = 0;
    this.state.highest = Math.max(this.state.highest, this.state.streak);

    const tier = this.computeTier(this.state.streak);
    if (tier > this.state.tier) {
      this.activateTier(scene, tier);
    } else if (tier > 0 && this.state.tier > 0) {
      const config = TIER_CONFIGS[this.state.tier - 1];
      this.state.buffTicks = config.duration;
    }

    if (this.state.multiplier > 1 && !scene.snakeGame.isRaccoonMode()) {
      scene.addScore(this.state.multiplier - 1);
    }

    scene.setFlag('killstreak.appleJuiceLevel', Math.max(0, this.state.tier));
    if (this.isHudActive()) {
      this.spawnKillConfirm(scene);
    }
    this.updateHud(scene);
  }

  override onGameOver(scene: SnakeScene): void {
    this.clearStreak(scene, 'death');
    this.state.highest = 0;
    this.updateHud(scene);
  }

  override onRender(scene: SnakeScene): void {
    if (!this.hud || !this.barGraphics) {
      return;
    }

    this.barGraphics.clear();
    if (!this.isHudActive() || scene.getFlag<boolean>('ui.suppressHud')) {
      return;
    }

    const width = scene.grid.cols * scene.grid.cell;
    const barWidth = 150;
    const x = width - barWidth - 16;
    const y = this.barTop;

    if (this.isHudActive() && this.state.streak > 0) {
      const timeoutRatio = 1 - Math.min(this.state.timer / STREAK_TIMEOUT_TICKS, 1);
      this.barGraphics.fillStyle(0x0d1119, 0.7);
      this.barGraphics.fillRect(x, y, barWidth, 6);
      this.barGraphics.fillStyle(0x4cc9f0, 0.95);
      this.barGraphics.fillRect(x, y, barWidth * timeoutRatio, 6);
    }

    if (this.state.tier > 0) {
      const config = TIER_CONFIGS[this.state.tier - 1];
      const ratio = Math.max(0, Math.min(1, this.state.buffTicks / config.duration));
      const barY = y + 10;
      this.barGraphics.fillStyle(0x141824, 0.7);
      this.barGraphics.fillRect(x, barY, barWidth, 6);
      this.barGraphics.fillStyle(config.color, 0.95);
      this.barGraphics.fillRect(x, barY, barWidth * ratio, 6);
    }
  }

  private isHudActive(): boolean {
    return this.state.streak >= TIER_CONFIGS[0].threshold || this.state.tier > 0;
  }

  private createInitialState(): KillstreakState {
    return {
      streak: 0,
      timer: 0,
      highest: 0,
      tier: 0,
      multiplier: 1,
      buffTicks: 0,
      baseTickDelay: undefined,
    };
  }

  private computeTier(streak: number): number {
    let tier = 0;
    for (let i = 0; i < TIER_CONFIGS.length; i += 1) {
      if (streak >= TIER_CONFIGS[i].threshold) {
        tier = i + 1;
      }
    }
    return tier;
  }

  private getNextThreshold(): number | null {
    for (const config of TIER_CONFIGS) {
      if (this.state.streak < config.threshold) {
        return config.threshold;
      }
    }
    return null;
  }

  private computeQuestBlockHeight(scene: SnakeScene): number {
    const questCount = Math.min(scene.activeQuests?.length ?? 0, QUEST_HUD_VISIBLE_CAP);
    if (questCount <= 0) {
      return 0;
    }
    const totalLines = questCount + 1; // Include the "Quests:" header
    const lineHeight = QUEST_FONT_SIZE;
    const spacingTotal = Math.max(0, totalLines - 1) * QUEST_LINE_SPACING;
    return totalLines * lineHeight + spacingTotal;
  }

  private computeHudY(scene: SnakeScene): number {
    const questHeight = this.computeQuestBlockHeight(scene);
    return questHeight > 0 ? QUEST_TOP_MARGIN + questHeight + QUEST_BOTTOM_MARGIN : 10;
  }

  private ensureHudSpacing(scene: SnakeScene): void {
    const questCount = scene.activeQuests?.length ?? 0;
    if (questCount !== this.lastQuestCount) {
      this.updateHud(scene);
    }
  }

  private activateTier(scene: SnakeScene, tier: number): void {
    const config = TIER_CONFIGS[tier - 1];
    const currentDelay = scene.getActionStepIntervalMs();

    if (this.state.buffTicks <= 0 || this.state.baseTickDelay === undefined) {
      this.state.baseTickDelay = currentDelay;
    }

    const baseDelay = this.state.baseTickDelay ?? currentDelay;
    const boostedDelay = Math.max(20, Math.round(baseDelay * config.speedScalar));
    scene.setActionStepIntervalMs(boostedDelay);

    this.state.tier = tier;
    this.state.multiplier = config.multiplier;
    this.state.buffTicks = config.duration;

    if (!scene.snakeGame.isRaccoonMode()) {
      scene.addScore(config.activationBonus);
    }
    this.spawnCallout(scene, i18n.getFeatureString(config.calloutKey), config.color);
    this.updateHud(scene);
  }

  private clearBuff(scene: SnakeScene): void {
    if (this.state.tier === 0) {
      return;
    }

    if (this.state.baseTickDelay !== undefined) {
      scene.setActionStepIntervalMs(this.state.baseTickDelay);
    }

    this.state.tier = 0;
    this.state.multiplier = 1;
    this.state.buffTicks = 0;
    this.state.baseTickDelay = undefined;
    this.destroyCallout(scene);
  }

  private clearStreak(scene: SnakeScene, reason?: 'timeout' | 'death'): void {
    if (this.isHudActive() && reason) {
      this.spawnDropText(scene, reason);
    }

    this.clearBuff(scene);
    this.state.streak = 0;
    this.state.timer = 0;
  }

  private spawnKillConfirm(scene: SnakeScene): void {
    const head = scene.snake[0];
    if (!head) {
      return;
    }

    const [roomX, roomY] = scene.currentRoomId.startsWith('cave:')
      ? [0, 0]
      : scene.currentRoomId.split(',').map(Number);
    const localX = head.x - roomX * scene.grid.cols;
    const localY = head.y - roomY * scene.grid.rows;
    const cell = scene.grid.cell;
    const worldX = localX * cell + cell / 2;
    const worldY = localY * cell + cell / 2;

    const config = this.state.tier > 0 ? TIER_CONFIGS[this.state.tier - 1] : null;
    const color = config ? toHex(config.color) : '#5bc0eb';
    const text = scene.add
      .text(
        worldX,
        worldY - 14,
        `${i18n.getFeatureString('killConfirmed')} x${this.state.streak}`,
        {
          fontFamily: 'monospace',
          fontSize: '14px',
          color,
          stroke: '#05060a',
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5, 1)
      .setDepth(32)
      .setAlpha(0.95);

    scene.tweens.add({
      targets: text,
      y: worldY - 46,
      alpha: 0,
      duration: 720,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private spawnCallout(scene: SnakeScene, message: string, color: number): void {
    this.destroyCallout(scene);
    const width = scene.grid.cols * scene.grid.cell;
    const text = scene.add
      .text(width / 2, 96, message, {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: toHex(color),
        stroke: '#05060a',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setAlpha(0.98);

    this.callout = text;
    scene.tweens.add({
      targets: text,
      y: 70,
      alpha: 0,
      duration: 1600,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (text.active) {
          text.destroy();
        }
        if (this.callout === text) {
          this.callout = null;
        }
      },
    });
  }

  private spawnDropText(scene: SnakeScene, reason: 'timeout' | 'death'): void {
    const width = scene.grid.cols * scene.grid.cell;
    const label =
      reason === 'death'
        ? i18n.getFeatureString('streakReset')
        : i18n.getFeatureString('streakLost');
    const text = scene.add
      .text(width / 2, 128, label, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#f94144',
        stroke: '#05060a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(28)
      .setAlpha(0.95);

    scene.tweens.add({
      targets: text,
      y: 108,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private destroyCallout(scene?: SnakeScene): void {
    if (this.callout) {
      if (scene) {
        scene.tweens.killTweensOf(this.callout);
      }
      this.callout.destroy();
      this.callout = null;
    }
  }

  private updateHud(scene: SnakeScene): void {
    if (!this.hud) {
      return;
    }

    const active = this.isHudActive();
    this.hud.setVisible(active && !scene.getFlag<boolean>('ui.suppressHud'));
    if (!active) {
      this.hud.setText('');
      this.barGraphics?.clear();
      this.lastQuestCount = scene.activeQuests?.length ?? 0;
      return;
    }

    const lines: string[] = [`${i18n.getFeatureString('killstreakHeader')} ${this.state.streak}x`];
    const nextThreshold = this.getNextThreshold();
    if (this.state.tier > 0) {
      const config = TIER_CONFIGS[this.state.tier - 1];
      const currentDelay = scene.getActionStepIntervalMs();
      const secondsLeft = estimateSeconds(this.state.buffTicks, currentDelay);
      lines.push(`${i18n.getFeatureString(config.labelKey)}`);
      lines.push(
        `${i18n.getFeatureString('killstreakScoreTime')} ${config.multiplier} | ${secondsLeft}s`,
      );
    } else if (nextThreshold !== null) {
      const remaining = Math.max(0, nextThreshold - this.state.streak);
      lines.push(
        `${remaining} ${i18n.getFeatureString('killstreakToNext')} ${i18n.getFeatureString(TIER_CONFIGS[0].labelKey)}`,
      );
    } else {
      lines.push(i18n.getFeatureString('killstreakMaxStreak'));
    }

    if (this.state.highest > 0) {
      lines.push(`${i18n.getFeatureString('killstreakBest')} ${this.state.highest}x`);
    }

    this.hud.setText(lines.join('\n'));

    const width = scene.grid.cols * scene.grid.cell;
    const hudY = this.computeHudY(scene);
    this.hud.setPosition(width - 12, hudY);

    const bounds = this.hud.getBounds();
    this.barTop = bounds.bottom + 8;
    this.lastQuestCount = scene.activeQuests?.length ?? 0;
  }
}

export default new KillstreakArsenalFeature();
