import Phaser from "phaser";
import type SnakeScene from "../scenes/snakeScene.js";

type ToneOptions = {
  frequency: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  frequencyEnd?: number;
};

export class JuiceManager {
  private readonly ctx: AudioContext;
  private readonly masterGain: GainNode;
  private readonly particleLayer: Phaser.GameObjects.Layer;
  private bossMusic?: { id: string; gain: GainNode; sources: OscillatorNode[]; cleanup: AudioNode[] };

  constructor(private readonly scene: SnakeScene) {
    this.ctx = this.scene.sound.context;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;
    this.masterGain.connect(this.ctx.destination);

    this.particleLayer = this.scene.add.layer().setDepth(25);
  }

  appleChomp(worldX: number, worldY: number) {
    this.playTone({ frequency: 420, frequencyEnd: 300, duration: 0.18, type: "square", volume: 0.18 });
    this.kickCamera(0.01, 60);
    this.spawnBurst(worldX, worldY, { colors: [0xfff3a8, 0xffc25f], count: 6, radius: 14 });
  }

  skillTreeOpened() {
    this.playTone({ frequency: 240, duration: 0.14, type: "triangle", volume: 0.06 });
  }

  skillTreeClosed() {
    this.playTone({ frequency: 180, duration: 0.1, type: "sine", volume: 0.05 });
  }

  perkPurchased() {
    this.playTone({ frequency: 540, frequencyEnd: 780, duration: 0.22, type: "sine", volume: 0.14 });
    this.scene.cameras.main.flash(130, 130, 255, 160, true);
  }

  perkPurchaseFailed() {
    this.playTone({ frequency: 160, duration: 0.16, type: "sawtooth", volume: 0.08 });
  }

  extraLifeGained() {
    this.playTone({ frequency: 440, frequencyEnd: 660, duration: 0.3, type: "triangle", volume: 0.16 });
    this.scene.cameras.main.flash(180, 90, 255, 150, false);
  }

  extraLifeSpent() {
    this.playTone({ frequency: 260, frequencyEnd: 140, duration: 0.26, type: "square", volume: 0.12 });
    this.kickCamera(0.02, 140);
  }

  scoreMultiplierBoost(multiplier: number) {
    const base = 520;
    this.playTone({ frequency: base, duration: 0.14, type: "sine", volume: 0.1 });
    this.playTone({ frequency: base * Math.min(multiplier, 2.5), duration: 0.22, type: "square", volume: 0.1 });
    this.scene.cameras.main.flash(110, 110, 210, 255, true);
  }

  manaUnlocked() {
    this.playTone({ frequency: 320, duration: 0.18, type: "sine", volume: 0.08 });
    this.playTone({ frequency: 520, duration: 0.28, type: "triangle", volume: 0.07 });
  }

  arcaneSpellUnlocked() {
    this.playTone({ frequency: 420, frequencyEnd: 680, duration: 0.24, type: "sine", volume: 0.12 });
    this.scene.cameras.main.flash(140, 160, 110, 255, true);
  }

  arcaneVeilPrimed() {
    this.playTone({ frequency: 360, duration: 0.2, type: "triangle", volume: 0.09 });
    this.playTone({ frequency: 180, duration: 0.3, type: "sine", volume: 0.05 });
  }

  arcanePulse(worldX: number, worldY: number) {
    this.playTone({ frequency: 600, frequencyEnd: 820, duration: 0.28, type: "sine", volume: 0.16 });
    this.spawnBurst(worldX, worldY, { colors: [0xc27dff, 0x7ad1ff, 0x4dfbff], count: 12, radius: 24 });
    this.kickCamera(0.018, 110);
  }

  arcaneVeilBurst() {
    this.playTone({ frequency: 500, frequencyEnd: 220, duration: 0.4, type: "sawtooth", volume: 0.18 });
    this.scene.cameras.main.flash(220, 140, 255, 210, true);
    this.kickCamera(0.028, 160);
  }

  predationFrenzy(worldX: number, worldY: number) {
    this.playTone({ frequency: 540, frequencyEnd: 780, duration: 0.26, type: "square", volume: 0.16 });
    this.spawnBurst(worldX, worldY, { colors: [0xff8450, 0xffc857, 0xfff3a8], count: 18, radius: 28 });
    this.kickCamera(0.02, 140);
  }

  predationRend(worldX: number, worldY: number) {
    this.playTone({ frequency: 320, frequencyEnd: 180, duration: 0.18, type: "sawtooth", volume: 0.12 });
    this.spawnBurst(worldX, worldY, { colors: [0xff6b6b, 0xffa36c], count: 10, radius: 18 });
  }


  startBossMusic(bossId: string) {
    if (this.bossMusic?.id === bossId) {
      return;
    }
    this.stopBossMusic();

    if (!this.scene.sound.locked && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.masterGain);

    const primary = this.ctx.createOscillator();
    primary.type = "sawtooth";
    primary.frequency.setValueAtTime(58, now);
    const primaryGain = this.ctx.createGain();
    primaryGain.gain.value = 0.5;
    primary.connect(primaryGain);
    primaryGain.connect(gain);

    const secondary = this.ctx.createOscillator();
    secondary.type = "triangle";
    secondary.frequency.setValueAtTime(93, now);
    const secondaryGain = this.ctx.createGain();
    secondaryGain.gain.value = 0.35;
    secondary.connect(secondaryGain);
    secondaryGain.connect(gain);

    const sub = this.ctx.createOscillator();
    sub.type = "square";
    sub.frequency.setValueAtTime(32, now);
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.25;
    sub.connect(subGain);
    subGain.connect(gain);

    const lfo = this.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.35, now);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 14;
    lfo.connect(lfoGain);
    lfoGain.connect(primary.frequency);

    primary.start(now);
    secondary.start(now);
    sub.start(now);
    lfo.start(now);

    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.6);

    this.bossMusic = {
      id: bossId,
      gain,
      sources: [primary, secondary, sub, lfo],
      cleanup: [primaryGain, secondaryGain, subGain, lfoGain],
    };
  }

  itemPickup(worldX: number, worldY: number) {
    // Short uplifting jingle (Zelda-like) + sparkles
    const notes = [660, 880, 1175]; // E5, A5, D6-ish
    const durations = [0.12, 0.12, 0.16];
    const types: OscillatorType[] = ["triangle", "sine", "triangle"];
    let delay = 0;
    notes.forEach((freq, i) => {
      globalThis.setTimeout(() => this.playTone({ frequency: freq, duration: durations[i], type: types[i], volume: 0.14 }), delay * 1000);
      delay += durations[i] * 0.7; // slight overlap
    });
    this.spawnBurst(worldX, worldY, { colors: [0x9ad1ff, 0x5dd6a2, 0xfff3a8], count: 14, radius: 22 });
  }

  equipmentEquip() {
    // Soft confirm: quick rising interval
    this.playTone({ frequency: 420, duration: 0.08, type: "triangle", volume: 0.08 });
    globalThis.setTimeout(() => this.playTone({ frequency: 560, duration: 0.1, type: "sine", volume: 0.08 }), 60);
  }

  equipmentUnequip() {
    // Soft release: gentle falling tone
    this.playTone({ frequency: 320, frequencyEnd: 200, duration: 0.12, type: "sine", volume: 0.07 });
  }

  stopBossMusic(): void {
    if (!this.bossMusic) {
      return;
    }

    const { gain, sources, cleanup } = this.bossMusic;
    const now = this.ctx.currentTime;

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    for (const source of sources) {
      try {
        source.stop(now + 0.45);
      } catch {
        // ignore
      }
    }

    globalThis.setTimeout(() => {
      for (const source of sources) {
        try {
          source.disconnect();
        } catch {
          // ignore
        }
      }
      for (const node of cleanup) {
        try {
          node.disconnect();
        } catch {
          // ignore
        }
      }
      try {
        gain.disconnect();
      } catch {
        // ignore
      }
    }, 500);

    this.bossMusic = undefined;
  }

  spellFailed() {
    this.playTone({ frequency: 140, duration: 0.12, type: "triangle", volume: 0.06 });
  }
  questOffered() {
    this.playTone({ frequency: 660, duration: 0.16, type: "triangle", volume: 0.12 });
    this.scene.cameras.main.flash(120, 80, 130, 255, true);
  }

  questAccepted() {
    this.playTone({ frequency: 550, frequencyEnd: 880, duration: 0.22, type: "sine", volume: 0.14 });
  }

  questRejected() {
    this.playTone({ frequency: 220, duration: 0.16, type: "sawtooth", volume: 0.1 });
  }

  questCompleted() {
    this.playTone({ frequency: 520, duration: 0.18, volume: 0.2 });
    this.playTone({ frequency: 780, duration: 0.22, volume: 0.15 });
    this.scene.cameras.main.flash(160, 120, 200, 255, true);
  }

  movementTick() {
    this.playTone({ frequency: 60, duration: 0.05, type: "square", volume: 0.04 });
  }

  gameOver() {
    this.stopBossMusic();
    this.playTone({ frequency: 200, frequencyEnd: 40, duration: 0.6, type: "sawtooth", volume: 0.18 });
    this.scene.cameras.main.shake(200, 0.01);
  }
  private playTone({ frequency, duration = 0.15, type = "sine", volume = 0.1, frequencyEnd }: ToneOptions) {
    if (!this.scene.sound.locked && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (frequencyEnd && frequencyEnd !== frequency) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, frequencyEnd), now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  private kickCamera(intensity: number, duration: number) {
    this.scene.cameras.main.shake(duration, intensity);
  }

  private spawnBurst(worldX: number, worldY: number, { colors, count, radius }: { colors: number[]; count: number; radius: number }) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const dist = Phaser.Math.Between(radius * 0.4, radius);
      const offsetX = Math.cos(angle) * dist;
      const offsetY = Math.sin(angle) * dist;
      const circle = this.scene.add.circle(worldX + offsetX, worldY + offsetY, Phaser.Math.Between(3, 5), Phaser.Utils.Array.GetRandom(colors));
      circle.setDepth(22);
      this.particleLayer.add(circle);

      this.scene.tweens.add({
        targets: circle,
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(180, 260),
        ease: "Cubic.easeOut",
        onComplete: () => circle.destroy(),
      });
    }
  }
}














