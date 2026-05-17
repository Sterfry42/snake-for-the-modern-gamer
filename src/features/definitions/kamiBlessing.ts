import Phaser from 'phaser';
import { Feature } from '../feature.js';
import type SnakeScene from '../../scenes/snakeScene.js';

interface BlessingState {
  shrineTimer: number;
  shrineCooldown: number;
  buffSpeedTicks: number;
  buffWallSenseTicks: number;
  buffHungerTicks: number;
}

const SHRINE_COOLDOWN_TICKS = 60;
const BLESSING_LABEL = 'Shrine Blessing';

const BLESSING_TYPES = [
  {
    name: 'Swift Winds',
    durationTicks: 120,
    description: 'Speed +2s',
    apply: (state: BlessingState) => {
      state.buffSpeedTicks = 120;
    },
  },
  {
    name: 'Mist Veil',
    durationTicks: 10,
    description: 'Wall sense +1 for 10 ticks',
    apply: (state: BlessingState) => {
      state.buffWallSenseTicks = 10;
    },
  },
  {
    name: 'Sacred Nourishment',
    durationTicks: 300,
    description: 'Hunger resistance +5s',
    apply: (state: BlessingState) => {
      state.buffHungerTicks = 300;
    },
  },
];

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

class KamiBlessingFeature extends Feature {
  private state: BlessingState = {
    shrineTimer: 0,
    shrineCooldown: SHRINE_COOLDOWN_TICKS,
    buffSpeedTicks: 0,
    buffWallSenseTicks: 0,
    buffHungerTicks: 0,
  };
  private callout?: Phaser.GameObjects.Text;

  constructor() {
    super('kamiBlessing', 'Kami Blessings');
  }

  override onRegister(scene: SnakeScene): void {
    this.state = {
      shrineTimer: 0,
      shrineCooldown: SHRINE_COOLDOWN_TICKS,
      buffSpeedTicks: 0,
      buffWallSenseTicks: 0,
      buffHungerTicks: 0,
    };
  }

  override onTick(scene: SnakeScene): void {
    if (!this.hasShrineBlessing(scene)) {
      return;
    }

    let changed = false;

    if (this.state.buffSpeedTicks > 0) {
      this.state.buffSpeedTicks -= 1;
      if (this.state.buffSpeedTicks <= 0) changed = true;
    }

    if (this.state.buffWallSenseTicks > 0) {
      this.state.buffWallSenseTicks -= 1;
      if (this.state.buffWallSenseTicks <= 0) changed = true;
    }

    if (this.state.buffHungerTicks > 0) {
      this.state.buffHungerTicks -= 1;
      if (this.state.buffHungerTicks <= 0) changed = true;
    }

    if (this.state.buffSpeedTicks > 0 || this.state.buffWallSenseTicks > 0 || this.state.buffHungerTicks > 0) {
      this.state.shrineTimer += 1;
      if (this.state.shrineTimer >= this.state.shrineCooldown) {
        this.state.shrineTimer = 0;
        this.grantBlessing(scene);
        changed = true;
      }
    }

    if (changed) {
      this.applyBuffs(scene);
    }
  }

  override onGameOver(scene: SnakeScene): void {
    if (this.hasShrineBlessing(scene)) {
      this.state.buffSpeedTicks = 0;
      this.state.buffWallSenseTicks = 0;
      this.state.buffHungerTicks = 0;
      this.applyBuffs(scene);
    }
    this.destroyCallout(scene);
  }

  private hasShrineBlessing(scene: SnakeScene): boolean {
    const mods = (scene as any).religionMods;
    return !!mods?.shrineBlessing;
  }

  private grantBlessing(scene: SnakeScene): void {
    const rng = scene.random?.bind(scene) ?? Math.random;
    const blessing = pickRandom(BLESSING_TYPES, rng);

    blessing.apply(this.state);

    this.spawnCallout(scene, `${BLESSING_LABEL}: ${blessing.name}`, blessing.description);
  }

  private applyBuffs(scene: SnakeScene): void {
    const baseWallSense = scene.getFlag<number>('equipment.wallSenseRadiusBonus') ?? 0;
    const baseSpeed = scene.getFlag<number>('kami.speedBuff') ?? 0;
    const baseHunger = scene.getFlag<number>('kami.hungerBuff') ?? 0;

    let newWallSense = baseWallSense;
    let newSpeed = baseSpeed;
    let newHunger = baseHunger;

    if (this.state.buffWallSenseTicks > 0) {
      newWallSense += 1;
    }
    if (this.state.buffSpeedTicks > 0) {
      newSpeed += 2;
    }
    if (this.state.buffHungerTicks > 0) {
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
    if (this.callout) {
      this.callout.destroy();
      this.callout = undefined;
    }
  }
}

export default new KamiBlessingFeature();
