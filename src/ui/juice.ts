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