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
  private readonly overlayLayer: Phaser.GameObjects.Layer;
  private bossMusic?: { id: string; gain: GainNode; sources: OscillatorNode[]; cleanup: AudioNode[] };
  private powerupMusic?: { gain: GainNode; sources: OscillatorNode[]; cleanup: AudioNode[] };
  private zoomBackTimer?: Phaser.Time.TimerEvent;

  constructor(private readonly scene: SnakeScene) {
    this.ctx = this.scene.sound.context;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;
    this.masterGain.connect(this.ctx.destination);

    this.particleLayer = this.scene.add.layer().setDepth(25);
    this.overlayLayer = this.scene.add.layer().setDepth(30);
  }

  appleChomp(worldX: number, worldY: number) {
    this.playTone({ frequency: 420, frequencyEnd: 300, duration: 0.18, type: "square", volume: 0.18 });
    this.kickCamera(0.01, 60);
    this.spawnBurst(worldX, worldY, { colors: [0xfff3a8, 0xffc25f], count: 6, radius: 14 });
    this.ringPulse(worldX, worldY, 0xffc25f, 10, 2, 180);
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
    this.punchZoom(1.02, 100);
  }

  perkPurchaseFailed() {
    this.playTone({ frequency: 160, duration: 0.16, type: "sawtooth", volume: 0.08 });
  }

  extraLifeGained() {
    this.playTone({ frequency: 440, frequencyEnd: 660, duration: 0.3, type: "triangle", volume: 0.16 });
    this.scene.cameras.main.flash(180, 90, 255, 150, false);
    const cam = this.scene.cameras.main;
    this.ringPulse(cam.midPoint.x, cam.midPoint.y, 0x5dd6a2, 14, 3, 260);
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
    this.punchZoom(1.03 + Math.min(0.02, multiplier * 0.01), 120);
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
    this.ringPulse(worldX, worldY, 0x7ad1ff, 12, 2, 220);
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

  // Big apex moment: shockwave + zoom punch + particles
  predationApex(worldX: number, worldY: number) {
    this.playTone({ frequency: 360, duration: 0.2, type: "triangle", volume: 0.14 });
    this.playTone({ frequency: 720, duration: 0.24, type: "sine", volume: 0.16 });
    this.scene.cameras.main.flash(140, 255, 160, 80, true);
    this.kickCamera(0.026, 160);
    this.punchZoom(1.06, 140);
    this.blastWave(worldX, worldY, [0xff8450, 0xfff3a8], 42);
    this.spawnBurst(worldX, worldY, { colors: [0xff8450, 0xffc857, 0xfff3a8], count: 24, radius: 34 });
  }

  bossHit(worldX: number, worldY: number) {
    this.playTone({ frequency: 180, duration: 0.12, type: "square", volume: 0.12 });
    this.kickCamera(0.02, 110);
    this.ringPulse(worldX, worldY, 0xff6b6b, 16, 2, 200);
    this.spawnBurst(worldX, worldY, { colors: [0xff6b6b, 0xc27dff], count: 12, radius: 22 });
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
    this.ringPulse(worldX, worldY, 0x9ad1ff, 18, 2, 220);
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

  uiTabSwitch() {
    // Gentle whoosh for tab transitions
    this.playTone({ frequency: 260, frequencyEnd: 420, duration: 0.12, type: "triangle", volume: 0.06 });
  }

  uiSparkle(worldX: number, worldY: number) {
    this.spawnBurst(worldX, worldY, { colors: [0x4da3ff, 0x9ad1ff, 0xcfe5ff], count: 12, radius: 28 });
  }

  // Soft idle sparkle for apples
  appleIdle(worldX: number, worldY: number) {
    const colors = [0xfff3a8, 0xffc25f, 0xffd38a];
    const count = 3;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(6, 12);
      const cx = worldX + Math.cos(angle) * dist;
      const cy = worldY + Math.sin(angle) * dist;
      const circle = this.scene.add.circle(cx, cy, Phaser.Math.Between(2, 3), Phaser.Utils.Array.GetRandom(colors));
      circle.setDepth(21).setAlpha(0.9);
      this.particleLayer.add(circle);
      this.scene.tweens.add({
        targets: circle,
        y: cy - Phaser.Math.Between(2, 4),
        alpha: 0,
        duration: Phaser.Math.Between(260, 380),
        ease: "Cubic.easeOut",
        onComplete: () => circle.destroy(),
      });
    }
  }

  // Idle sparkle at treasure location
  treasureSparkle(worldX: number, worldY: number) {
    const colors = [0xffd700, 0xffe58a, 0xfff3a8];
    const count = 3;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(5, 10);
      const cx = worldX + Math.cos(angle) * dist;
      const cy = worldY + Math.sin(angle) * dist;
      const circle = this.scene.add.circle(cx, cy, Phaser.Math.Between(2, 3), Phaser.Utils.Array.GetRandom(colors));
      circle.setDepth(21).setAlpha(0.95);
      this.particleLayer.add(circle);
      this.scene.tweens.add({
        targets: circle,
        y: cy - Phaser.Math.Between(2, 4),
        alpha: 0,
        duration: Phaser.Math.Between(240, 360),
        ease: "Cubic.easeOut",
        onComplete: () => circle.destroy(),
      });
    }
  }

  // Treasure pickup burst
  treasurePickup(worldX: number, worldY: number) {
    this.playTone({ frequency: 740, duration: 0.14, type: "triangle", volume: 0.14 });
    this.playTone({ frequency: 980, duration: 0.16, type: "sine", volume: 0.12 });
    this.spawnBurst(worldX, worldY, { colors: [0xffd700, 0xffe58a, 0xfff3a8], count: 18, radius: 26 });
    this.ringPulse(worldX, worldY, 0xffd700, 10, 2, 240);
    globalThis.setTimeout(() => this.ringPulse(worldX, worldY, 0xfff3a8, 14, 2, 220), 60);
    this.punchZoom(1.015, 120);
  }

  // Powerup pickup: heavy juice
  powerupPickup(worldX: number, worldY: number, _kind: "phase" | "smite") {
    // Unified purple juice for all powerups
    const colors = [0x9b5de5, 0xc77dff, 0x7ad1ff];
    this.playTone({ frequency: 560, frequencyEnd: 920, duration: 0.34, type: "sine", volume: 0.24 });
    this.spawnBurst(worldX, worldY, { colors, count: 36, radius: 40 });
    this.kickCamera(0.038, 220);
    this.punchZoom(1.085, 220);
    // purple flash
    this.scene.cameras.main.flash(200, 155, 110, 255, true);
    this.blastWave(worldX, worldY, colors, 42);
    this.ringPulse(worldX, worldY, 0x9b5de5, 16, 2, 300);
    globalThis.setTimeout(() => this.ringPulse(worldX, worldY, 0xc77dff, 20, 2, 280), 100);
  }

  startPowerupMusic(durationMs: number) {
    if (!this.scene.sound.locked && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    this.stopPowerupMusic();
    const now = this.ctx.currentTime;
    const total = Math.max(0.2, durationMs / 1000);

    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.masterGain);

    const tri = this.ctx.createOscillator();
    tri.type = "triangle";
    tri.frequency.setValueAtTime(180, now);
    tri.frequency.exponentialRampToValueAtTime(520, now + total);
    const triGain = this.ctx.createGain();
    triGain.gain.value = 0.18;
    tri.connect(triGain);
    triGain.connect(gain);

    const sq = this.ctx.createOscillator();
    sq.type = "square";
    sq.frequency.setValueAtTime(90, now);
    sq.frequency.exponentialRampToValueAtTime(220, now + total);
    const sqGain = this.ctx.createGain();
    sqGain.gain.value = 0.12;
    sq.connect(sqGain);
    sqGain.connect(gain);

    // Gentle tremolo that speeds up
    const lfo = this.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(3, now);
    lfo.frequency.linearRampToValueAtTime(9, now + total);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.4;
    lfo.connect(lfoGain);
    lfoGain.connect(triGain.gain);

    tri.start(now);
    sq.start(now);
    lfo.start(now);
    gain.gain.exponentialRampToValueAtTime(0.24, now + 0.18);

    this.powerupMusic = {
      gain,
      sources: [tri, sq, lfo],
      cleanup: [triGain, sqGain, lfoGain],
    };
  }

  stopPowerupMusic(): void {
    if (!this.powerupMusic) return;
    const { gain, sources, cleanup } = this.powerupMusic;
    const now = this.ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    } catch {}
    for (const src of sources) {
      try { src.stop(now + 0.28); } catch {}
    }
    globalThis.setTimeout(() => {
      for (const src of sources) { try { src.disconnect(); } catch {} }
      for (const node of cleanup) { try { node.disconnect(); } catch {} }
      try { gain.disconnect(); } catch {}
    }, 340);
    this.powerupMusic = undefined;
  }

  // Treasure beacon: slim vertical beam rising from the treasure to the top
  treasureBeacon(worldX: number, worldY: number) {
    const top = 8;
    const height = Math.max(24, worldY - top);
    const rect = this.scene.add.rectangle(worldX, worldY - height / 2, 3, height, 0xffe58a, 0.22);
    rect.setDepth(27).setBlendMode(Phaser.BlendModes.ADD);
    this.overlayLayer.add(rect);
    this.scene.tweens.add({
      targets: rect,
      alpha: 0,
      y: rect.y - 12,
      duration: 380,
      ease: "Cubic.easeOut",
      onComplete: () => rect.destroy(),
    });
    // Small glint at the treasure position
    this.ringPulse(worldX, worldY, 0xfff3a8, 8, 1, 220);
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

  

  gameOver() {
    this.stopBossMusic();
    this.playTone({ frequency: 200, frequencyEnd: 40, duration: 0.6, type: "sawtooth", volume: 0.18 });
    this.scene.cameras.main.shake(260, 0.02);
    this.scene.cameras.main.flash(180, 255, 50, 50, true);
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

  // Quick temporary zoom that eases back to 1
  private punchZoom(targetZoom: number, duration: number) {
    const cam = this.scene.cameras.main;
    const upDur = Math.max(60, Math.floor(duration * 0.6));
    const downDur = Math.max(60, Math.floor(duration * 0.8));

    // Start zoom-in
    cam.zoomTo(targetZoom, upDur, "Cubic.easeOut", true);

    // Ensure any previous reset timer is cleared so we don't stack
    if (this.zoomBackTimer) {
      this.zoomBackTimer.remove(false);
      this.zoomBackTimer = undefined;
    }
    // Always return to exactly 1.0 zoom to avoid drift
    this.zoomBackTimer = this.scene.time.delayedCall(upDur, () => {
      cam.zoomTo(1, downDur, "Cubic.easeInOut", true);
      // Hard-set to 1 at the end in case of tween rounding
      this.zoomBackTimer = this.scene.time.delayedCall(downDur + 40, () => {
        cam.setZoom(1);
        this.zoomBackTimer = undefined;
      });
    });
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

  // Expanding ring pulse
  private ringPulse(x: number, y: number, color: number, startRadius: number, lineWidth: number, duration: number) {
    const g = this.scene.add.graphics().setDepth(29);
    this.overlayLayer.add(g);
    g.lineStyle(lineWidth, color, 1);
    g.strokeCircle(x, y, startRadius);
    const state = { r: startRadius, a: 1 } as any;
    this.scene.tweens.add({
      targets: state,
      r: startRadius * 3.2,
      a: 0,
      duration,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        g.clear();
        g.lineStyle(lineWidth, color, state.a);
        g.strokeCircle(x, y, state.r);
      },
      onComplete: () => g.destroy(),
    });
  }

  // Multiple ring pulses with slight color variation
  private blastWave(x: number, y: number, colors: number[], baseRadius: number) {
    const rings = 3;
    for (let i = 0; i < rings; i++) {
      const delay = i * 40;
      const color = Phaser.Utils.Array.GetRandom(colors);
      globalThis.setTimeout(() => this.ringPulse(x, y, color, baseRadius + i * 6, 2, 260 + i * 40), delay);
    }
  }

  // Optional subtle trail at the snake head position if provided
  movementTick(worldX?: number, worldY?: number) {
    this.playTone({ frequency: 60, duration: 0.05, type: "square", volume: 0.04 });

    if (worldX !== undefined && worldY !== undefined) {
      // spawn a tiny fading dot to suggest motion
      const dot = this.scene.add.circle(worldX, worldY, Phaser.Math.Between(2, 3), 0x5dd6a2).setAlpha(0.9);
      dot.setDepth(21);
      this.particleLayer.add(dot);
      this.scene.tweens.add({
        targets: dot,
        x: worldX + Phaser.Math.Between(-4, 4),
        y: worldY + Phaser.Math.Between(-4, 4),
        alpha: 0,
        scale: 0.6,
        duration: 220,
        ease: "Cubic.easeOut",
        onComplete: () => dot.destroy(),
      });
    }
  }

  // Expanding filled circle used for room transition reveal
  private fillPulse(
    x: number,
    y: number,
    startRadius: number,
    endRadius: number,
    color: number,
    startAlpha: number,
    duration: number
  ) {
    const g = this.scene.add.graphics().setDepth(28);
    this.overlayLayer.add(g);
    const state = { r: startRadius, a: startAlpha } as any;
    // Radius tween (full duration)
    this.scene.tweens.add({
      targets: state,
      r: endRadius,
      duration,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        g.clear();
        g.fillStyle(color, Math.max(0, state.a));
        g.fillCircle(x, y, state.r);
      },
      onComplete: () => g.destroy(),
    });
    // Alpha fade only in the last quarter to avoid early disappearance
    const fadeDelay = Math.floor(duration * 0.75);
    const fadeDur = Math.max(60, duration - fadeDelay);
    this.scene.time.delayedCall(fadeDelay, () => {
      this.scene.tweens.add({
        targets: state,
        a: 0,
        duration: fadeDur,
        ease: "Cubic.easeIn",
      });
    });
  }

  // Geometry: seismic pulse feedback
  seismicPulse(worldX: number, worldY: number, radius: number) {
    this.playTone({ frequency: 180, duration: 0.12, type: "triangle", volume: 0.1 });
    this.kickCamera(0.012, 90);
    this.ringPulse(worldX, worldY, 0x9ad1ff, Math.max(8, radius * 2), 2, 240);
    globalThis.setTimeout(() => this.ringPulse(worldX, worldY, 0xcfe5ff, Math.max(10, radius * 3), 2, 200), 60);
    this.spawnBurst(worldX, worldY, { colors: [0x9ad1ff, 0xcfe5ff], count: 10, radius: 16 });
  }

  // Geometry: collapse control (building walls) feedback
  collapseControl(worldX: number, worldY: number) {
    this.playTone({ frequency: 220, duration: 0.08, type: "square", volume: 0.08 });
    this.spawnBurst(worldX, worldY, { colors: [0xb8865e, 0x8a6b4c, 0xd8c3a5], count: 8, radius: 14 });
  }

  // Geometry: wall chomp debris burst
  wallChomp(worldX: number, worldY: number) {
    this.playTone({ frequency: 140, duration: 0.1, type: "sawtooth", volume: 0.08 });
    this.kickCamera(0.014, 80);
    this.spawnBurst(worldX, worldY, { colors: [0x7b8fa1, 0x9aa6b2, 0xcad2e2], count: 12, radius: 18 });
  }

  // Geometry: fault line horizontal sweep
  faultLineSweep(x1: number, y: number, x2: number) {
    const g = this.scene.add.graphics().setDepth(28);
    this.overlayLayer.add(g);
    const state = { a: 0.9, w: 1 } as any;
    this.scene.tweens.add({
      targets: state,
      a: 0,
      w: 6,
      duration: 260,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        g.clear();
        g.lineStyle(state.w, 0x4da3ff, state.a);
        g.beginPath();
        g.moveTo(x1, y);
        g.lineTo(x2, y);
        g.strokePath();
      },
      onComplete: () => g.destroy(),
    });
  }

  // Direction turn skid: tiny dust puffs
  turnSkid(worldX: number, worldY: number, dx: number, dy: number) {
    const perp = { x: -dy, y: dx };
    const count = 3;
    for (let i = 0; i < count; i++) {
      const off = (i - 1) * 2;
      const cx = worldX - dx * 4 + perp.x * off;
      const cy = worldY - dy * 4 + perp.y * off;
      const dot = this.scene.add.circle(cx, cy, Phaser.Math.Between(2, 3), 0xb0c4de).setAlpha(0.9);
      dot.setDepth(21);
      this.particleLayer.add(dot);
      this.scene.tweens.add({
        targets: dot,
        x: cx - dx * Phaser.Math.Between(4, 8),
        y: cy - dy * Phaser.Math.Between(4, 8),
        alpha: 0,
        scale: 0.6,
        duration: 200,
        ease: "Cubic.easeOut",
        onComplete: () => dot.destroy(),
      });
    }
    this.playTone({ frequency: 240, duration: 0.06, type: "triangle", volume: 0.05 });
  }

  // Wall graze sparks on near-miss
  wallGraze(worldX: number, worldY: number, nx: number, ny: number) {
    const originX = worldX + nx * 8;
    const originY = worldY + ny * 8;
    const colors = [0xffe58a, 0xfff3a8];
    this.spawnBurst(originX, originY, { colors, count: 6, radius: 10 });
    this.playTone({ frequency: 320, duration: 0.04, type: "sine", volume: 0.05 });
  }

  // Item rarity jingle based on id mapping
  itemRarityJingle(itemId?: string) {
    const rare = new Set(["amulet-phoenix"]);
    const uncommon = new Set(["helm-seer", "ring-seismic", "cloak-veil", "belt-regenerator"]);
    let tier: "common" | "uncommon" | "rare" = "common";
    if (itemId && rare.has(itemId)) tier = "rare";
    else if (itemId && uncommon.has(itemId)) tier = "uncommon";
    const seq = tier === "rare" ? [740, 980, 1240] : tier === "uncommon" ? [620, 820, 980] : [520, 660];
    const vols = tier === "rare" ? [0.16, 0.14, 0.12] : tier === "uncommon" ? [0.14, 0.12, 0.1] : [0.12, 0.1];
    let delay = 0;
    seq.forEach((f, i) => {
      const d = 0.1 + i * 0.02;
      globalThis.setTimeout(() => this.playTone({ frequency: f, duration: d, type: "triangle", volume: vols[i] ?? 0.1 }), delay * 1000);
      delay += d * 0.7;
    });
  }

  // Danger vignette (edge darkening) with photosafe cap
  private vignette?: { top: Phaser.GameObjects.Rectangle; bottom: Phaser.GameObjects.Rectangle; left: Phaser.GameObjects.Rectangle; right: Phaser.GameObjects.Rectangle };
  private photosafe = false;
  setPhotosafe(flag: boolean) { this.photosafe = flag; }
  private ensureVignette() {
    if (this.vignette) return;
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const pad = 6;
    const makeRect = (x: number, y: number, w: number, h: number) => this.scene.add.rectangle(x, y, w, h, 0x000000, 0).setDepth(31).setOrigin(0, 0);
    const top = makeRect(0, 0, w, pad);
    const bottom = makeRect(0, h - pad, w, pad);
    const left = makeRect(0, 0, pad, h);
    const right = makeRect(w - pad, 0, pad, h);
    this.overlayLayer.add(top);
    this.overlayLayer.add(bottom);
    this.overlayLayer.add(left);
    this.overlayLayer.add(right);
    this.vignette = { top, bottom, left, right };
  }
  setDangerLevel(level: number) {
    this.ensureVignette();
    const cap = this.photosafe ? 0.18 : 0.35;
    const a = Math.max(0, Math.min(cap, level));
    if (!this.vignette) return;
    const parts = [this.vignette.top, this.vignette.bottom, this.vignette.left, this.vignette.right];
    for (const r of parts) r.setAlpha(a);
  }

  // Room transition pulse
  roomTransition(worldX: number, worldY: number) {
    this.playTone({ frequency: 300, duration: 0.12, type: "sine", volume: 0.08 });
    // Small ring highlight from entry side
    this.ringPulse(worldX, worldY, 0x4da3ff, 12, 2, 240);
    // Subtle echo ring for style
    globalThis.setTimeout(() => this.ringPulse(worldX, worldY, 0x9ad1ff, 8, 2, 220), 60);
    this.punchZoom(1.01, 120);
  }
}














