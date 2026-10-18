/**
 * Kami Blessing Feature
 */
import Phaser from 'phaser';
import { Feature } from '../feature.js';
import type SnakeScene from '../../scenes/snakeScene.js';
import { pickRandom } from '../../core/math.js';

interface BlessingState {
  shrineTimerMs: number;
  lastUpdateMs: number | null;
  shrineCooldownMs: number;
  buffSpeedUntilMs: number;
  buffWallSenseUntilMs: number;
  buffHungerUntilMs: number;
}

const SHRINE_COOLDOWN_MS = 1000;
const BLESSING_LABEL = 'Shrine Blessing';

const BLESSING_TYPES = [
  {
    name: 'Swift Winds',
    durationMs: 2000,
    description: 'Speed +2s',
    apply: (state: BlessingState, nowMs: number) => {
      state.buffSpeedUntilMs = nowMs + 2000;
    },
  },
  {
    name: 'Mist Veil',
    durationMs: 1000 / 6,
    description: 'Wall sense +1 briefly',
    apply: (state: BlessingState, nowMs: number) => {
      state.buffWallSenseUntilMs = nowMs + 1000 / 6;
    },
  },
  {
    name: 'Sacred Nourishment',
    durationMs: 5000,
    description: 'Hunger resistance +5s',
    apply: (state: BlessingState, nowMs: number) => {
      state.buffHungerUntilMs = nowMs + 5000;
    },
  },
];

class KamiBlessingFeature extends Feature {
  private state: BlessingState = {
    shrineTimerMs: 0,
    lastUpdateMs: null,
    shrineCooldownMs: SHRINE_COOLDOWN_MS,
    buffSpeedUntilMs: 0,
    buffWallSenseUntilMs: 0,
    buffHungerUntilMs: 0,
  };
  private callout?: Phaser.GameObjects.Text;

  constructor() {
    super('kamiBlessing', 'Kami Blessings');
  }

  override onRegister(scene: SnakeScene): void {
    void scene;
    this.state = {
      shrineTimerMs: 0,
      lastUpdateMs: null,
      shrineCooldownMs: SHRINE_COOLDOWN_MS,
      buffSpeedUntilMs: 0,
      buffWallSenseUntilMs: 0,
      buffHungerUntilMs: 0,
    };
  }

  override onActionStep(scene: SnakeScene): void {
    if (!this.hasShrineBlessing(scene)) {
      return;
    }

    const nowMs = Number(scene.getFlag<number>('timeMs') ?? 0);
    const elapsedMs = Math.max(0, nowMs - (this.state.lastUpdateMs ?? nowMs));
    this.state.lastUpdateMs = nowMs;
    let changed = false;

    changed ||= expireBuff(nowMs, this.state.buffSpeedUntilMs, (value) => {
      this.state.buffSpeedUntilMs = value;
    });
    changed ||= expireBuff(nowMs, this.state.buffWallSenseUntilMs, (value) => {
      this.state.buffWallSenseUntilMs = value;
    });
    changed ||= expireBuff(nowMs, this.state.buffHungerUntilMs, (value) => {
      this.state.buffHungerUntilMs = value;
    });

    this.state.shrineTimerMs += elapsedMs;
    if (this.state.shrineTimerMs >= this.state.shrineCooldownMs) {
      this.state.shrineTimerMs %= this.state.shrineCooldownMs;
      this.grantBlessing(scene, nowMs);
      changed = true;
    }

    if (changed) {
      this.applyBuffs(scene);
    }
  }

  override onGameOver(scene: SnakeScene): void {
    if (this.hasShrineBlessing(scene)) {
      this.state.buffSpeedUntilMs = 0;
      this.state.buffWallSenseUntilMs = 0;
      this.state.buffHungerUntilMs = 0;
      this.applyBuffs(scene);
    }
    this.destroyCallout(scene);
  }

  private hasShrineBlessing(scene: SnakeScene): boolean {
    const mods = (scene as unknown as { religionMods: Record<string, unknown> }).religionMods;
    return !!mods?.shrineBlessing;
  }

  private grantBlessing(scene: SnakeScene, nowMs: number): void {
    const rng = scene.random?.bind(scene) ?? Math.random;
    const blessing = pickRandom(rng, BLESSING_TYPES);

    blessing.apply(this.state, nowMs);

    this.spawnCallout(scene, `${BLESSING_LABEL}: ${blessing.name}`, blessing.description);
  }

  private applyBuffs(scene: SnakeScene): void {
    const baseWallSense = scene.getFlag<number>('equipment.wallSenseRadiusBonus') ?? 0;
    const baseSpeed = scene.getFlag<number>('kami.speedBuff') ?? 0;
    const baseHunger = scene.getFlag<number>('kami.hungerBuff') ?? 0;

    let newWallSense = baseWallSense;
    let newSpeed = baseSpeed;
    let newHunger = baseHunger;

    const nowMs = Number(scene.getFlag<number>('timeMs') ?? 0);

    if (this.state.buffWallSenseUntilMs > nowMs) {
      newWallSense += 1;
    }
    if (this.state.buffSpeedUntilMs > nowMs) {
      newSpeed += 2;
    }
    if (this.state.buffHungerUntilMs > nowMs) {
      newHunger += 5;
    }

    scene.setFlag('equipment.wallSenseRadiusBonus', newWallSense > 0 ? newWallSense : undefined);
    scene.setFlag('kami.speedBuff', newSpeed > 0 ? newSpeed : undefined);
    scene.setFlag('kami.hungerBuff', newHunger > 0 ? newHunger : undefined);
  }

  private spawnCallout(scene: SnakeScene, title: string, subtitle: string): void {
    this.destroyCallout(scene);

    const width = scene.grid.cols * scene.grid.cell;
    const text = scene.add
      .text(width / 2, 60, `${title}\n${subtitle}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffd700',
        stroke: '#05060a',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setAlpha(0.98);

    this.callout = text;

    scene.tweens.add({
      targets: text,
      y: 50,
      alpha: 0,
      duration: 2000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (text.active) {
          text.destroy();
        }
        if (this.callout === text) {
          this.callout = undefined;
        }
      },
    });
  }

  private destroyCallout(_scene?: SnakeScene): void {
    void _scene;
    if (this.callout) {
      this.callout.destroy();
      this.callout = undefined;
    }
  }
}

function expireBuff(nowMs: number, untilMs: number, setUntilMs: (value: number) => void): boolean {
  if (untilMs <= 0 || untilMs > nowMs) {
    return false;
  }
  setUntilMs(0);
  return true;
}

export default new KamiBlessingFeature();
