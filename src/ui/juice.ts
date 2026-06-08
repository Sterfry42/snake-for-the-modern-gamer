import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';

type ToneOptions = {
  frequency: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  frequencyEnd?: number;
};

type BossMusicResult = {
  sources: OscillatorNode[];
  cleanup: AudioNode[];
  onBuild?: (gain: GainNode) => void;
};

type BossMusicBuilder = (now: number, gain: GainNode) => BossMusicResult | undefined;

type BossMusicDefinition = {
  build: BossMusicBuilder;
};

const BOSS_MUSIC_REGISTRY: Record<string, BossMusicDefinition> = {
  'jason-statham': {
    build(now: number, gain: GainNode): BossMusicResult {
      const sources: OscillatorNode[] = [];
      const cleanup: AudioNode[] = [];

      const bass = gain.context.createGain();
      bass.gain.value = 0.55;
      const bassOsc = gain.context.createOscillator();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.value = 82;
      bassOsc.connect(bass);
      bass.connect(gain);
      sources.push(bassOsc);
      cleanup.push(bass);

      const mid = gain.context.createGain();
      mid.gain.value = 0.2;
      const midOsc1 = gain.context.createOscillator();
      midOsc1.type = 'sawtooth';
      midOsc1.frequency.value = 82.5;
      midOsc1.connect(mid);
      const midOsc2 = gain.context.createOscillator();
      midOsc2.type = 'square';
      midOsc2.frequency.value = 81.8;
      midOsc2.connect(mid);
      mid.connect(gain);
      sources.push(midOsc1, midOsc2);
      cleanup.push(mid);

      const sub = gain.context.createGain();
      sub.gain.value = 0.35;
      const subOsc = gain.context.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.value = 41;
      subOsc.connect(sub);
      sub.connect(gain);
      sources.push(subOsc);
      cleanup.push(sub);

      const lead = gain.context.createGain();
      lead.gain.value = 0.12;
      const leadOsc = gain.context.createOscillator();
      leadOsc.type = 'triangle';
      leadOsc.frequency.value = 330;
      leadOsc.connect(lead);
      lead.connect(gain);
      sources.push(leadOsc);
      cleanup.push(lead);

      const lfo = gain.context.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 1.8;
      const lfoGain = gain.context.createGain();
      lfoGain.gain.value = 6;
      lfo.connect(lfoGain);
      lfoGain.connect(bassOsc.frequency);
      lfoGain.connect(midOsc1.frequency);
      sources.push(lfo);
      cleanup.push(lfoGain);

      const rhythmLfo = gain.context.createOscillator();
      rhythmLfo.type = 'sawtooth';
      rhythmLfo.frequency.value = 3.5;
      const rhythmGain = gain.context.createGain();
      rhythmGain.gain.value = 0.4;
      rhythmGain.connect(mid.gain);
      sources.push(rhythmLfo);
      cleanup.push(rhythmGain);

      const leadVibrato = gain.context.createOscillator();
      leadVibrato.type = 'sine';
      leadVibrato.frequency.value = 5.2;
      const vibratoGain = gain.context.createGain();
      vibratoGain.gain.value = 8;
      leadVibrato.connect(vibratoGain);
      vibratoGain.connect(leadOsc.frequency);
      sources.push(leadVibrato);
      cleanup.push(vibratoGain);

      return {
        sources,
        cleanup,
        onBuild: (g: GainNode) => {
          g.gain.setValueAtTime(0.28, now + 0.6);
        },
      };
    },
  },
};

function buildGenericBossMusic(now: number, gain: GainNode): BossMusicResult {
  const sources: OscillatorNode[] = [];
  const cleanup: AudioNode[] = [];

  const primary = gain.context.createOscillator();
  primary.type = 'sawtooth';
  primary.frequency.value = 58;
  const primaryGain = gain.context.createGain();
  primaryGain.gain.value = 0.5;
  primary.connect(primaryGain);
  primaryGain.connect(gain);

  const secondary = gain.context.createOscillator();
  secondary.type = 'triangle';
  secondary.frequency.value = 93;
  const secondaryGain = gain.context.createGain();
  secondaryGain.gain.value = 0.35;
  secondary.connect(secondaryGain);
  secondaryGain.connect(gain);

  const sub = gain.context.createOscillator();
  sub.type = 'square';
  sub.frequency.value = 32;
  const subGain = gain.context.createGain();
  subGain.gain.value = 0.25;
  sub.connect(subGain);
  subGain.connect(gain);

  const lfo = gain.context.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.35;
  const lfoGain = gain.context.createGain();
  lfoGain.gain.value = 14;
  lfo.connect(lfoGain);
  lfoGain.connect(primary.frequency);

  sources.push(primary, secondary, sub, lfo);
  cleanup.push(primaryGain, secondaryGain, subGain, lfoGain);

  return { sources, cleanup };
}

export class JuiceManager {
  private readonly ctx: AudioContext;
  private readonly masterGain: GainNode;
  private readonly particleLayer: Phaser.GameObjects.Layer;
  private readonly overlayLayer: Phaser.GameObjects.Layer;
  private movementNoiseMultiplier = 1;
  private cowbellEnabled = false;
  private bossMusic?: {
    kind: string;
    gain: GainNode;
    sources: OscillatorNode[];
    cleanup: AudioNode[];
  };
  private powerupMusic?: { gain: GainNode; sources: OscillatorNode[]; cleanup: AudioNode[] };
  private houseMusic?: { gain: GainNode; sources: OscillatorNode[]; cleanup: AudioNode[] };
  private townMusic?: { gain: GainNode; sources: OscillatorNode[]; cleanup: AudioNode[] };
  private heavenMusic?: { gain: GainNode; sources: OscillatorNode[]; cleanup: AudioNode[] };
  private hellMusic?: { gain: GainNode; sources: OscillatorNode[]; cleanup: AudioNode[] };
  private titleMusic?: { gain: GainNode; sources: OscillatorNode[]; cleanup: AudioNode[] };
  private titleMusicTimer?: Phaser.Time.TimerEvent;
  private cardMusic?: { gain: GainNode; sources: OscillatorNode[]; cleanup: AudioNode[] };
  private cardMusicTimer?: Phaser.Time.TimerEvent;
  private archaeologyMusic?: { gain: GainNode; sources: OscillatorNode[]; cleanup: AudioNode[] };
  private archaeologyMusicTimer?: Phaser.Time.TimerEvent;
  private zoomBackTimer?: Phaser.Time.TimerEvent;

  constructor(private readonly scene: SnakeScene) {
    this.ctx = this.scene.sys.game.config.audio?.context;
    if (!this.ctx) {
      throw new Error('AudioContext not available');
    }
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;
    this.masterGain.connect(this.ctx.destination);

    this.particleLayer = this.scene.add.layer().setDepth(25);
    this.overlayLayer = this.scene.add.layer().setDepth(30);
  }

  appleChomp(worldX: number, worldY: number, violenceLevel = 0) {
    const level = Math.max(0, Math.min(3, Math.floor(violenceLevel)));
    const volume = 0.18 + level * 0.04;
    const shake = 0.01 + level * 0.006;
    const burstCount = 6 + level * 5;
    this.playTone({
      frequency: 420 - level * 35,
      frequencyEnd: 300 - level * 28,
      duration: 0.18 + level * 0.03,
      type: level > 1 ? 'sawtooth' : 'square',
      volume,
    });
    if (level > 0) {
      this.playTone({
        frequency: 95 + level * 18,
        frequencyEnd: 55,
        duration: 0.12 + level * 0.03,
        type: 'sawtooth',
        volume: 0.05 + level * 0.025,
      });
    }
    this.kickCamera(shake, 60 + level * 35);
    this.spawnBurst(worldX, worldY, {
      colors: [0xfff3a8, 0xffc25f, 0xff5f57],
      count: burstCount,
      radius: 14 + level * 7,
    });
    this.ringPulse(
      worldX,
      worldY,
      level > 1 ? 0xff5f57 : 0xffc25f,
      10 + level * 5,
      2 + level,
      180 + level * 45,
    );
  }

  scoreDelta(worldX: number, worldY: number, amount: number) {
    if (amount === 0) {
      return;
    }
    const gain = amount > 0;
    const magnitude = Math.min(40, Math.abs(amount));
    const colors = gain ? [0xfff3a8, 0xffd166, 0x5dd6a2] : [0xff6b6b, 0xff8f8f, 0xffc2c2];
    const color = gain ? 0xfff3a8 : 0xff6b6b;
    this.playTone({
      frequency: gain ? 440 + magnitude * 8 : 240,
      frequencyEnd: gain ? 620 + magnitude * 10 : 120,
      duration: 0.12 + Math.min(0.18, magnitude * 0.006),
      type: gain ? 'triangle' : 'sawtooth',
      volume: 0.08 + Math.min(0.08, magnitude * 0.004),
    });
    if (Math.abs(amount) >= 5) {
      this.spawnBurst(worldX, worldY, {
        colors,
        count: 8 + Math.floor(magnitude * 0.55),
        radius: 16 + magnitude * 0.45,
      });
      this.ringPulse(
        worldX,
        worldY,
        color,
        8 + Math.min(12, magnitude * 0.35),
        2,
        180 + magnitude * 4,
      );
    }
    if (Math.abs(amount) >= 20) {
      this.scene.cameras.main.flash(90, gain ? 255 : 255, gain ? 230 : 90, gain ? 120 : 90, true);
      this.punchZoom(1.025, 120);
    }
  }

  lengthGain(worldX: number, worldY: number, amount: number) {
    if (amount <= 0) {
      return;
    }
    const magnitude = Math.min(12, amount);
    this.playTone({
      frequency: 300,
      frequencyEnd: 360 + magnitude * 36,
      duration: 0.18,
      type: 'sine',
      volume: 0.08,
    });
    this.ringPulse(worldX, worldY, 0x5dd6a2, 10 + magnitude * 2, 2, 240);
    this.spawnBurst(worldX, worldY, {
      colors: [0x5dd6a2, 0xc8ffe1, 0x9ad1ff],
      count: 5 + magnitude * 2,
      radius: 14 + magnitude * 2,
    });
  }

  appleStreak(worldX: number, worldY: number, streak: number) {
    if (streak < 2) {
      return;
    }
    const capped = Math.min(12, streak);
    const hot = streak >= 5;
    this.playTone({
      frequency: 520 + capped * 28,
      frequencyEnd: 720 + capped * 42,
      duration: 0.16,
      type: hot ? 'square' : 'triangle',
      volume: 0.09 + capped * 0.008,
    });
    if (hot) {
      this.playTone({
        frequency: 130,
        frequencyEnd: 72,
        duration: 0.18,
        type: 'sawtooth',
        volume: 0.08,
      });
      this.kickCamera(0.01 + capped * 0.0015, 90 + capped * 8);
    }
    this.blastWave(
      worldX,
      worldY,
      hot ? [0xff8450, 0xffc857, 0xfff3a8] : [0x5dd6a2, 0xfff3a8],
      14 + capped * 2,
    );
    this.floatingLabel(
      worldX,
      worldY - 18,
      `x${streak}`,
      hot ? '#ffcf5a' : '#c8ffe1',
      18 + Math.min(8, capped),
    );
  }

  skillTreeOpened() {
    this.playTone({ frequency: 240, duration: 0.14, type: 'triangle', volume: 0.06 });
  }

  skillTreeClosed() {
    this.playTone({ frequency: 180, duration: 0.1, type: 'sine', volume: 0.05 });
  }

  perkPurchased() {
    this.playTone({
      frequency: 540,
      frequencyEnd: 780,
      duration: 0.22,
      type: 'sine',
      volume: 0.14,
    });
    this.scene.cameras.main.flash(130, 130, 255, 160, true);
    this.punchZoom(1.02, 100);
  }

  perkPurchaseFailed() {
    this.playTone({ frequency: 160, duration: 0.16, type: 'sawtooth', volume: 0.08 });
  }

  extraLifeGained() {
    this.playTone({
      frequency: 440,
      frequencyEnd: 660,
      duration: 0.3,
      type: 'triangle',
      volume: 0.16,
    });
    this.scene.cameras.main.flash(180, 90, 255, 150, false);
    const cam = this.scene.cameras.main;
    this.ringPulse(cam.midPoint.x, cam.midPoint.y, 0x5dd6a2, 14, 3, 260);
  }

  extraLifeSpent() {
    this.playTone({
      frequency: 260,
      frequencyEnd: 140,
      duration: 0.26,
      type: 'square',
      volume: 0.12,
    });
    this.kickCamera(0.02, 140);
  }

  raccoonPopup(kind: 'stash' | 'sad') {
    const cam = this.scene.cameras.main;
    const x = cam.midPoint.x;
    const y = cam.midPoint.y;
    const triumphant = kind === 'stash';
    const colors = triumphant ? [0xfff3a8, 0x5dd6a2, 0x9ad1ff] : [0xff6b6b, 0xffb3a8, 0xfff3a8];

    if (triumphant) {
      this.playTone({ frequency: 392, duration: 0.14, type: 'triangle', volume: 0.14 });
      globalThis.setTimeout(
        () => this.playTone({ frequency: 523.25, duration: 0.16, type: 'triangle', volume: 0.15 }),
        70,
      );
      globalThis.setTimeout(
        () => this.playTone({ frequency: 783.99, duration: 0.28, type: 'sine', volume: 0.16 }),
        150,
      );
      this.scene.cameras.main.flash(170, 255, 243, 168, true);
    } else {
      this.playTone({ frequency: 220, duration: 0.16, type: 'square', volume: 0.13 });
      globalThis.setTimeout(
        () => this.playTone({ frequency: 164.81, duration: 0.22, type: 'sawtooth', volume: 0.11 }),
        90,
      );
      this.scene.cameras.main.flash(150, 255, 110, 110, true);
    }

    this.kickCamera(triumphant ? 0.048 : 0.04, triumphant ? 300 : 240);
    this.punchZoom(triumphant ? 1.095 : 1.07, triumphant ? 240 : 200);
    this.blastWave(x, y, colors, triumphant ? 52 : 40);
    this.spawnBurst(x, y, { colors, count: triumphant ? 54 : 36, radius: triumphant ? 58 : 42 });
    this.ringPulse(x, y, triumphant ? 0xfff3a8 : 0xff6b6b, triumphant ? 34 : 28, 3, 330);
  }

  raccoonForagePickup(worldX: number, worldY: number, label: string, tierChanged = false) {
    const colors = tierChanged ? [0xfff3a8, 0x5dd6a2, 0x9ad1ff] : [0x5dd6a2, 0xc8ffe1];
    this.playTone({
      frequency: tierChanged ? 620 : 420,
      frequencyEnd: tierChanged ? 820 : 540,
      duration: tierChanged ? 0.2 : 0.12,
      type: tierChanged ? 'triangle' : 'sine',
      volume: tierChanged ? 0.12 : 0.08,
    });
    this.floatingLabel(worldX, worldY - 16, label, tierChanged ? '#fff3a8' : '#c8ffe1', 15);
    this.spawnBurst(worldX, worldY, {
      colors,
      count: tierChanged ? 14 : 7,
      radius: tierChanged ? 22 : 12,
    });
    this.ringPulse(worldX, worldY, tierChanged ? 0xfff3a8 : 0x5dd6a2, tierChanged ? 12 : 7, 2, 190);
  }

  raccoonWeightThreshold() {
    const cam = this.scene.cameras.main;
    this.playTone({
      frequency: 72,
      frequencyEnd: 58,
      duration: 1.35,
      type: 'sawtooth',
      volume: 0.2,
    });
    this.playTone({
      frequency: 148,
      frequencyEnd: 132,
      duration: 1.25,
      type: 'triangle',
      volume: 0.13,
    });
    globalThis.setTimeout(
      () =>
        this.playTone({
          frequency: 96,
          frequencyEnd: 92,
          duration: 1.05,
          type: 'sawtooth',
          volume: 0.1,
        }),
      140,
    );
    globalThis.setTimeout(
      () =>
        this.playTone({
          frequency: 48,
          frequencyEnd: 52,
          duration: 0.82,
          type: 'square',
          volume: 0.08,
        }),
      360,
    );
    this.kickCamera(0.04, 460);
    this.punchZoom(1.06, 240);
    this.scene.cameras.main.flash(110, 230, 230, 210, true);
    this.ringPulse(cam.midPoint.x, cam.midPoint.y, 0xfff3a8, 42, 3, 360);
  }

  babyCry() {
    const cries = [
      { delayMs: 0, start: 760, end: 420, duration: 0.42, volume: 0.095 },
      { delayMs: 520, start: 820, end: 460, duration: 0.44, volume: 0.1 },
      { delayMs: 1120, start: 900, end: 390, duration: 0.62, volume: 0.12 },
    ];
    for (const cry of cries) {
      globalThis.setTimeout(() => {
        this.playTone({
          frequency: cry.start,
          frequencyEnd: cry.end,
          duration: cry.duration,
          type: 'sawtooth',
          volume: cry.volume,
        });
        this.playTone({
          frequency: cry.start * 1.018,
          frequencyEnd: cry.end * 0.96,
          duration: cry.duration,
          type: 'triangle',
          volume: cry.volume * 0.45,
        });
      }, cry.delayMs);
    }
  }

  toiletFlush() {
    this.playTone({
      frequency: 200,
      frequencyEnd: 400,
      duration: 0.15,
      type: 'sine',
      volume: 0.12,
    });
    this.playTone({
      frequency: 150,
      frequencyEnd: 50,
      duration: 0.4,
      type: 'sawtooth',
      volume: 0.08,
    });
    this.playTone({
      frequency: 300,
      frequencyEnd: 100,
      duration: 0.12,
      type: 'triangle',
      volume: 0.1,
    });
  }

  scoreMultiplierBoost(multiplier: number) {
    const base = 520;
    this.playTone({ frequency: base, duration: 0.14, type: 'sine', volume: 0.1 });
    this.playTone({
      frequency: base * Math.min(multiplier, 2.5),
      duration: 0.22,
      type: 'square',
      volume: 0.1,
    });
    this.scene.cameras.main.flash(110, 110, 210, 255, true);
    this.punchZoom(1.03 + Math.min(0.02, multiplier * 0.01), 120);
  }

  startTitleMusic(): void {
    if (this.titleMusic) {
      return;
    }

    if (!this.scene.sound.locked && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    this.stopBossMusic();
    this.stopPowerupMusic();
    this.stopHeavenMusic();

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.masterGain);

    const root = this.ctx.createOscillator();
    root.type = 'sawtooth';
    root.frequency.setValueAtTime(65.41, now);
    const rootGain = this.ctx.createGain();
    rootGain.gain.value = 0.32;
    root.connect(rootGain);
    rootGain.connect(gain);

    const fifth = this.ctx.createOscillator();
    fifth.type = 'sine';
    fifth.frequency.setValueAtTime(98.0, now);
    const fifthGain = this.ctx.createGain();
    fifthGain.gain.value = 0.2;
    fifth.connect(fifthGain);
    fifthGain.connect(gain);

    const brass = this.ctx.createOscillator();
    brass.type = 'sawtooth';
    brass.frequency.setValueAtTime(130.81, now);
    const brassGain = this.ctx.createGain();
    brassGain.gain.value = 0.14;
    brass.connect(brassGain);
    brassGain.connect(gain);

    const pulse = this.ctx.createOscillator();
    pulse.type = 'sine';
    pulse.frequency.setValueAtTime(0.16, now);
    const pulseGain = this.ctx.createGain();
    pulseGain.gain.value = 0.08;
    pulse.connect(pulseGain);
    pulseGain.connect(gain.gain);

    const shimmer = this.ctx.createOscillator();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(261.63, now);
    const shimmerGain = this.ctx.createGain();
    shimmerGain.gain.value = 0.06;
    shimmer.connect(shimmerGain);
    shimmerGain.connect(gain);

    root.start(now);
    fifth.start(now);
    brass.start(now);
    pulse.start(now);
    shimmer.start(now);
    gain.gain.exponentialRampToValueAtTime(0.24, now + 1.2);

    this.titleMusic = {
      gain,
      sources: [root, fifth, brass, pulse, shimmer],
      cleanup: [rootGain, fifthGain, brassGain, pulseGain, shimmerGain],
    };

    const fanfare = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
    fanfare.forEach((frequency, index) => {
      globalThis.setTimeout(() => {
        if (this.titleMusic) {
          this.playTone({
            frequency,
            duration: 0.34,
            type: index % 2 === 0 ? 'triangle' : 'square',
            volume: 0.13,
          });
        }
      }, 180 * index);
    });

    let step = 0;
    const melody = [
      261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 659.25, 523.25, 392.0, 493.88, 587.33, 783.99,
    ];
    const harmony = [
      392.0, 493.88, 587.33, 659.25, 783.99, 1046.5, 783.99, 659.25, 587.33, 659.25, 783.99, 987.77,
    ];
    const bass = [65.41, 65.41, 98.0, 98.0, 73.42, 73.42, 110.0, 110.0, 65.41, 82.41, 98.0, 123.47];
    this.titleMusicTimer?.remove(false);
    this.titleMusicTimer = this.scene.time.addEvent({
      delay: 135,
      loop: true,
      callback: () => {
        if (!this.titleMusic) {
          return;
        }
        const index = step % melody.length;
        this.playTone({
          frequency: melody[index],
          duration: 0.13,
          type: index % 2 === 0 ? 'square' : 'triangle',
          volume: 0.095,
        });
        if (step % 3 === 0) {
          this.playTone({
            frequency: harmony[index],
            duration: 0.12,
            type: 'triangle',
            volume: 0.06,
          });
        }
        if (step % 2 === 0) {
          this.playTone({
            frequency: bass[index],
            frequencyEnd: bass[index] * 0.68,
            duration: 0.18,
            type: 'sawtooth',
            volume: 0.13,
          });
        }
        if (step % 12 === 0) {
          this.playTone({
            frequency: 49.0,
            frequencyEnd: 24,
            duration: 0.24,
            type: 'square',
            volume: 0.16,
          });
        }
        if (step % 6 === 3) {
          this.playTone({
            frequency: 196.0,
            frequencyEnd: 110,
            duration: 0.09,
            type: 'triangle',
            volume: 0.1,
          });
        }
        if (step % 12 === 10) {
          this.playTone({
            frequency: 1046.5,
            frequencyEnd: 1567.98,
            duration: 0.18,
            type: 'sine',
            volume: 0.055,
          });
        }
        step += 1;
      },
    });
  }

  stopTitleMusic(): void {
    if (!this.titleMusic) {
      return;
    }

    this.titleMusicTimer?.remove(false);
    this.titleMusicTimer = undefined;

    const { gain, sources, cleanup } = this.titleMusic;
    const now = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    for (const source of sources) {
      try {
        source.stop(now + 0.6);
      } catch {
        // ignore stopped sources
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
    }, 700);

    this.titleMusic = undefined;
  }

  startCardMusic(): void {
    if (this.cardMusic) {
      return;
    }
    if (!this.scene.sound.locked && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.stopTitleMusic();

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.masterGain);

    const bass = this.ctx.createOscillator();
    bass.type = 'triangle';
    bass.frequency.setValueAtTime(130.81, now);
    const bassGain = this.ctx.createGain();
    bassGain.gain.value = 0.1;
    bass.connect(bassGain);
    bassGain.connect(gain);

    const shimmer = this.ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(523.25, now);
    const shimmerGain = this.ctx.createGain();
    shimmerGain.gain.value = 0.035;
    shimmer.connect(shimmerGain);
    shimmerGain.connect(gain);

    bass.start(now);
    shimmer.start(now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.35);
    this.cardMusic = { gain, sources: [bass, shimmer], cleanup: [bassGain, shimmerGain] };

    let step = 0;
    const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];
    const bassline = [130.81, 130.81, 196.0, 196.0, 146.83, 146.83, 220.0, 220.0];
    this.cardMusicTimer?.remove(false);
    this.cardMusicTimer = this.scene.time.addEvent({
      delay: 170,
      loop: true,
      callback: () => {
        if (!this.cardMusic) {
          return;
        }
        const index = step % melody.length;
        this.playTone({
          frequency: melody[index],
          duration: 0.09,
          type: step % 2 === 0 ? 'square' : 'triangle',
          volume: 0.055,
        });
        if (step % 2 === 0) {
          this.playTone({
            frequency: bassline[index],
            duration: 0.12,
            type: 'triangle',
            volume: 0.055,
          });
        }
        if (step % 4 === 3) {
          this.playTone({
            frequency: 1046.5,
            frequencyEnd: 1318.51,
            duration: 0.12,
            type: 'sine',
            volume: 0.035,
          });
        }
        step += 1;
      },
    });
  }

  stopCardMusic(): void {
    if (!this.cardMusic) {
      return;
    }
    this.cardMusicTimer?.remove(false);
    this.cardMusicTimer = undefined;
    const { gain, sources, cleanup } = this.cardMusic;
    const now = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    for (const source of sources) {
      try {
        source.stop(now + 0.35);
      } catch {}
    }
    globalThis.setTimeout(() => {
      for (const source of sources) {
        try {
          source.disconnect();
        } catch {}
      }
      for (const node of cleanup) {
        try {
          node.disconnect();
        } catch {}
      }
      try {
        gain.disconnect();
      } catch {}
    }, 420);
    this.cardMusic = undefined;
  }

  startArchaeologyMusic(): void {
    if (this.archaeologyMusic) {
      return;
    }
    if (!this.scene.sound.locked && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.stopTitleMusic();
    this.stopCardMusic();

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.masterGain);

    const bass = this.ctx.createOscillator();
    bass.type = 'triangle';
    bass.frequency.setValueAtTime(110, now);
    const bassGain = this.ctx.createGain();
    bassGain.gain.value = 0.095;
    bass.connect(bassGain);
    bassGain.connect(gain);

    const bell = this.ctx.createOscillator();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(880, now);
    const bellGain = this.ctx.createGain();
    bellGain.gain.value = 0.025;
    bell.connect(bellGain);
    bellGain.connect(gain);

    bass.start(now);
    bell.start(now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.32);
    this.archaeologyMusic = { gain, sources: [bass, bell], cleanup: [bassGain, bellGain] };

    let step = 0;
    const melody = [440, 523.25, 659.25, 587.33, 523.25, 659.25, 783.99, 659.25];
    const bassline = [110, 110, 164.81, 164.81, 98, 98, 146.83, 146.83];
    this.archaeologyMusicTimer?.remove(false);
    this.archaeologyMusicTimer = this.scene.time.addEvent({
      delay: 145,
      loop: true,
      callback: () => {
        if (!this.archaeologyMusic) return;
        const index = step % melody.length;
        this.playTone({
          frequency: melody[index]!,
          duration: 0.08,
          type: step % 2 === 0 ? 'square' : 'triangle',
          volume: 0.05,
        });
        if (step % 2 === 0) {
          this.playTone({
            frequency: bassline[index]!,
            frequencyEnd: bassline[index]! * 0.72,
            duration: 0.13,
            type: 'sawtooth',
            volume: 0.055,
          });
        }
        if (step % 8 === 7) {
          this.playTone({ frequency: 1046.5, duration: 0.1, type: 'sine', volume: 0.035 });
        }
        step += 1;
      },
    });
  }

  stopArchaeologyMusic(): void {
    if (!this.archaeologyMusic) {
      return;
    }
    this.archaeologyMusicTimer?.remove(false);
    this.archaeologyMusicTimer = undefined;
    const { gain, sources, cleanup } = this.archaeologyMusic;
    const now = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    for (const source of sources) {
      try {
        source.stop(now + 0.32);
      } catch {}
    }
    globalThis.setTimeout(() => {
      for (const source of sources) {
        try {
          source.disconnect();
        } catch {}
      }
      for (const node of cleanup) {
        try {
          node.disconnect();
        } catch {}
      }
      try {
        gain.disconnect();
      } catch {}
    }, 380);
    this.archaeologyMusic = undefined;
  }

  archaeologySwap(): void {
    this.playTone({
      frequency: 360,
      frequencyEnd: 520,
      duration: 0.08,
      type: 'square',
      volume: 0.08,
    });
  }

  archaeologyMatch(chain: number, count: number): void {
    const cappedChain = Math.min(8, Math.max(1, chain));
    this.playTone({
      frequency: 520 + cappedChain * 45,
      frequencyEnd: 700 + cappedChain * 55,
      duration: 0.16,
      type: 'triangle',
      volume: 0.09 + Math.min(0.04, count * 0.004),
    });
    this.scene.cameras.main.flash(70, 255, 243, 168, true);
    this.kickCamera(0.006 + Math.min(0.014, cappedChain * 0.002), 70);
    if (chain > 1) {
      this.playTone({
        frequency: 880 + cappedChain * 35,
        duration: 0.18,
        type: 'sine',
        volume: 0.08,
      });
      this.punchZoom(1.015 + cappedChain * 0.003, 100);
    }
  }

  archaeologyPop(index: number, total: number): void {
    this.playTone({
      frequency: 460 + index * 34,
      frequencyEnd: 620 + index * 24,
      duration: 0.055,
      type: 'square',
      volume: 0.055,
    });
    if (index === total - 1) {
      this.kickCamera(0.006 + Math.min(0.01, total * 0.001), 70);
      this.scene.cameras.main.flash(50, 255, 255, 255, true);
    }
  }

  archaeologyGravity(moveCount: number): void {
    if (moveCount <= 0) return;
    this.playTone({
      frequency: 180 + Math.min(180, moveCount * 8),
      frequencyEnd: 120,
      duration: 0.13,
      type: 'sawtooth',
      volume: 0.06,
    });
    this.kickCamera(0.004 + Math.min(0.012, moveCount * 0.0008), 90);
  }

  archaeologyRaise(depth: number): void {
    this.playTone({
      frequency: 150 + Math.min(180, depth * 4),
      frequencyEnd: 190 + Math.min(220, depth * 5),
      duration: 0.1,
      type: 'triangle',
      volume: 0.055,
    });
  }

  archaeologyCache(): void {
    this.playTone({ frequency: 660, duration: 0.1, type: 'triangle', volume: 0.08 });
    this.playTone({ frequency: 990, duration: 0.16, type: 'sine', volume: 0.07 });
    this.scene.cameras.main.flash(90, 183, 132, 255, true);
  }

  setArchaeologyTension(level: number): void {
    const tension = Phaser.Math.Clamp(level, 0, 1);
    if (this.archaeologyMusicTimer) {
      this.archaeologyMusicTimer.timeScale = 1 + tension * 1.35;
    }
  }

  archaeologyTension(level: number): void {
    const tension = Phaser.Math.Clamp(level, 0, 1);
    this.setArchaeologyTension(tension);
    this.playTone({
      frequency: 240 + tension * 220,
      frequencyEnd: 180 + tension * 180,
      duration: 0.07,
      type: 'square',
      volume: 0.045 + tension * 0.035,
    });
    this.kickCamera(0.003 + tension * 0.01, 60 + tension * 70);
  }

  archaeologyBlocked(): void {
    this.playTone({
      frequency: 180,
      frequencyEnd: 120,
      duration: 0.06,
      type: 'square',
      volume: 0.055,
    });
  }

  cardScoreTick(value: number): void {
    this.playTone({
      frequency: 360 + Math.min(600, value * 14),
      frequencyEnd: 520 + Math.min(760, value * 18),
      duration: 0.12,
      type: 'square',
      volume: 0.08,
    });
    this.punchZoom(1.012, 80);
  }

  cardPurchased(worldX: number, worldY: number, rarity: 'common' | 'uncommon' | 'rare'): void {
    const rare = rarity === 'rare';
    const uncommon = rarity === 'uncommon';
    const colors = rare
      ? [0xffd166, 0xfff3a8, 0xc77dff]
      : uncommon
        ? [0x9ad1ff, 0xcfe5ff, 0x5dd6a2]
        : [0x5dd6a2, 0xc8ffe1, 0xfff3a8];
    this.playTone({
      frequency: rare ? 520 : uncommon ? 440 : 360,
      frequencyEnd: rare ? 980 : uncommon ? 720 : 560,
      duration: rare ? 0.24 : 0.16,
      type: 'triangle',
      volume: rare ? 0.13 : 0.09,
    });
    if (rare) {
      this.playTone({ frequency: 1174.66, duration: 0.18, type: 'sine', volume: 0.08 });
      this.scene.cameras.main.flash(120, 255, 220, 120, true);
    }
    this.spawnBurst(worldX, worldY, {
      colors,
      count: rare ? 24 : uncommon ? 16 : 10,
      radius: rare ? 30 : uncommon ? 22 : 16,
    });
    this.ringPulse(worldX, worldY, colors[0]!, rare ? 16 : 10, 2, rare ? 280 : 210);
    this.floatingLabel(
      worldX,
      worldY - 10,
      rare ? 'RARE CARD' : uncommon ? 'UNCOMMON CARD' : '+CARD',
      rare ? '#ffd166' : '#c8ffe1',
      rare ? 18 : 14,
    );
  }

  cardSuitSpark(worldX: number, worldY: number, suit: string): void {
    const color =
      suit === 'moss'
        ? 0x5dd66f
        : suit === 'teeth'
          ? 0xff6b6b
          : suit === 'lanterns'
            ? 0xffd166
            : suit === 'moons'
              ? 0x9ad1ff
              : suit === 'smoke'
                ? 0xc77dff
                : 0xfff3a8;
    this.ringPulse(worldX, worldY, color, 5, 1, 140);
    this.spawnBurst(worldX, worldY, { colors: [color, 0xfff3a8], count: 4, radius: 9 });
  }

  cardModifierTick(multiplier: number): void {
    this.playTone({
      frequency: 660,
      frequencyEnd: 660 * Math.max(1.1, Math.min(2.5, multiplier)),
      duration: 0.18,
      type: 'triangle',
      volume: 0.1,
    });
    this.scene.cameras.main.flash(80, 255, 230, 120, true);
    this.punchZoom(1.025, 110);
  }

  cardRuleTrigger(worldX: number, worldY: number, detail: string, index: number): void {
    const text = detail.toLowerCase();
    const harmful = text.includes('cost') || text.includes('worse') || text.includes('narrows');
    const color = text.includes('moss')
      ? 0x5dd66f
      : text.includes('smoke')
        ? 0xc77dff
        : text.includes('angel') || text.includes('moon')
          ? 0x9ad1ff
          : text.includes('market') || text.includes('accountant')
            ? 0xffd166
            : harmful
              ? 0xff6b6b
              : 0xfff3a8;
    this.playTone({
      frequency: harmful ? 220 : 540 + index * 42,
      frequencyEnd: harmful ? 110 : 740 + index * 38,
      duration: harmful ? 0.16 : 0.14,
      type: harmful ? 'sawtooth' : 'triangle',
      volume: 0.07,
    });
    this.ringPulse(worldX, worldY, color, 8 + index * 2, 1, 190);
    this.spawnBurst(worldX, worldY, {
      colors: [color, harmful ? 0xff6b6b : 0xfff3a8],
      count: harmful ? 8 : 6,
      radius: 14 + index * 2,
    });
  }

  cardRoundResult(won: boolean): void {
    if (won) {
      this.playTone({ frequency: 523.25, duration: 0.12, type: 'triangle', volume: 0.11 });
      this.playTone({ frequency: 783.99, duration: 0.2, type: 'sine', volume: 0.1 });
      this.scene.cameras.main.flash(130, 255, 190, 120, true);
    } else {
      this.playTone({
        frequency: 220,
        frequencyEnd: 110,
        duration: 0.22,
        type: 'sawtooth',
        volume: 0.09,
      });
      this.scene.cameras.main.shake(100, 0.006);
    }
  }

  cardWager(amount: number): void {
    const size = Math.min(36, Math.max(4, amount));
    this.playTone({
      frequency: 240,
      frequencyEnd: 160,
      duration: 0.12,
      type: 'triangle',
      volume: 0.08,
    });
    this.playTone({ frequency: 420 + size * 4, duration: 0.1, type: 'square', volume: 0.07 });
    const cam = this.scene.cameras.main;
    this.ringPulse(cam.midPoint.x, cam.midPoint.y, 0xffd166, 12 + size * 0.35, 2, 220);
  }

  cardHandDealt(worldX: number, worldY: number, count: number): void {
    const safeCount = Math.max(1, count);
    this.playTone({
      frequency: 320,
      frequencyEnd: 520,
      duration: 0.16,
      type: 'triangle',
      volume: 0.07,
    });
    for (let i = 0; i < safeCount; i += 1) {
      globalThis.setTimeout(() => {
        this.playTone({ frequency: 420 + i * 42, duration: 0.055, type: 'square', volume: 0.045 });
        this.spawnBurst(worldX + (i - safeCount / 2) * 22, worldY, {
          colors: [0xfff3a8, 0xcfa77a, 0x9ad1ff],
          count: 3,
          radius: 8,
        });
      }, i * 45);
    }
  }

  cardSelect(
    worldX: number,
    worldY: number,
    selected: boolean,
    rarity: 'common' | 'uncommon' | 'rare',
  ): void {
    const rare = rarity === 'rare';
    const uncommon = rarity === 'uncommon';
    const color = rare ? 0xffd166 : uncommon ? 0x9ad1ff : 0x5dd6a2;
    this.playTone({
      frequency: selected ? (rare ? 680 : uncommon ? 560 : 460) : 260,
      frequencyEnd: selected ? (rare ? 920 : uncommon ? 700 : 560) : 190,
      duration: selected ? 0.12 : 0.08,
      type: selected ? 'triangle' : 'sine',
      volume: rare && selected ? 0.09 : 0.055,
    });
    this.ringPulse(worldX, worldY, color, selected ? 8 : 5, selected ? 2 : 1, 160);
    if (selected || rare) {
      this.spawnBurst(worldX, worldY, {
        colors: [color, 0xfff3a8],
        count: rare ? 10 : 5,
        radius: rare ? 16 : 10,
      });
    }
  }

  cardScoreCommit(worldX: number, worldY: number, selectedCount: number): void {
    const count = Math.max(0, selectedCount);
    if (count === 0) {
      this.playTone({
        frequency: 180,
        frequencyEnd: 120,
        duration: 0.12,
        type: 'sawtooth',
        volume: 0.07,
      });
      this.kickCamera(0.004, 70);
      return;
    }
    this.playTone({
      frequency: 360,
      frequencyEnd: 560 + count * 70,
      duration: 0.18,
      type: 'square',
      volume: 0.09,
    });
    this.punchZoom(1.018 + Math.min(0.02, count * 0.004), 110);
    this.blastWave(worldX, worldY, [0xfff3a8, 0x9ad1ff], 16 + count * 3);
  }

  cardBust(worldX: number, worldY: number, reason: 'empty' | 'low' | 'high'): void {
    const label = reason === 'empty' ? 'EMPTY' : reason === 'low' ? 'TOO LOW' : 'TOO HIGH';
    this.playTone({
      frequency: reason === 'high' ? 260 : 190,
      frequencyEnd: reason === 'high' ? 80 : 120,
      duration: 0.2,
      type: 'sawtooth',
      volume: 0.085,
    });
    this.kickCamera(reason === 'empty' ? 0.006 : 0.011, 110);
    this.ringPulse(worldX, worldY, 0xff6b6b, 14, 2, 230);
    this.spawnBurst(worldX, worldY, {
      colors: [0xff6b6b, 0xffb3a8],
      count: reason === 'empty' ? 6 : 12,
      radius: reason === 'empty' ? 13 : 20,
    });
    this.floatingLabel(worldX, worldY - 8, label, '#ffb3a8', 16);
  }

  cardMatchResult(won: boolean, payout = 0): void {
    const cam = this.scene.cameras.main;
    if (won) {
      this.playTone({ frequency: 392, duration: 0.1, type: 'triangle', volume: 0.11 });
      this.playTone({ frequency: 587.33, duration: 0.14, type: 'triangle', volume: 0.1 });
      this.playTone({ frequency: 783.99, duration: 0.22, type: 'sine', volume: 0.11 });
      this.scene.cameras.main.flash(170, 255, 220, 120, true);
      this.punchZoom(1.06, 200);
      this.blastWave(cam.midPoint.x, cam.midPoint.y, [0x5dd6a2, 0xfff3a8, 0xffd166], 38);
      this.floatingLabel(
        cam.midPoint.x,
        76,
        payout > 0 ? `+${payout} SCORE` : 'MATCH WON',
        '#fff3a8',
        18,
      );
    } else {
      this.playTone({
        frequency: 240,
        frequencyEnd: 80,
        duration: 0.34,
        type: 'sawtooth',
        volume: 0.1,
      });
      this.scene.cameras.main.flash(120, 255, 80, 80, true);
      this.kickCamera(0.014, 180);
      this.ringPulse(cam.midPoint.x, cam.midPoint.y, 0xff6b6b, 28, 2, 280);
      this.floatingLabel(cam.midPoint.x, 76, 'MATCH LOST', '#ffb3a8', 18);
    }
  }

  manaUnlocked() {
    this.playTone({ frequency: 320, duration: 0.18, type: 'sine', volume: 0.08 });
    this.playTone({ frequency: 520, duration: 0.28, type: 'triangle', volume: 0.07 });
  }

  arcaneSpellUnlocked() {
    this.playTone({
      frequency: 420,
      frequencyEnd: 680,
      duration: 0.24,
      type: 'sine',
      volume: 0.12,
    });
    this.scene.cameras.main.flash(140, 160, 110, 255, true);
  }

  arcaneVeilPrimed() {
    this.playTone({ frequency: 360, duration: 0.2, type: 'triangle', volume: 0.09 });
    this.playTone({ frequency: 180, duration: 0.3, type: 'sine', volume: 0.05 });
  }

  arcanePulse(worldX: number, worldY: number) {
    this.playTone({
      frequency: 600,
      frequencyEnd: 820,
      duration: 0.28,
      type: 'sine',
      volume: 0.16,
    });
    this.spawnBurst(worldX, worldY, {
      colors: [0xc27dff, 0x7ad1ff, 0x4dfbff],
      count: 12,
      radius: 24,
    });
    this.kickCamera(0.018, 110);
    this.ringPulse(worldX, worldY, 0x7ad1ff, 12, 2, 220);
  }

  arcaneVeilBurst() {
    this.playTone({
      frequency: 500,
      frequencyEnd: 220,
      duration: 0.4,
      type: 'sawtooth',
      volume: 0.18,
    });
    this.scene.cameras.main.flash(220, 140, 255, 210, true);
    this.kickCamera(0.028, 160);
  }

  predationFrenzy(worldX: number, worldY: number) {
    this.playTone({
      frequency: 540,
      frequencyEnd: 780,
      duration: 0.26,
      type: 'square',
      volume: 0.16,
    });
    this.spawnBurst(worldX, worldY, {
      colors: [0xff8450, 0xffc857, 0xfff3a8],
      count: 18,
      radius: 28,
    });
    this.kickCamera(0.02, 140);
  }

  predationRend(worldX: number, worldY: number) {
    this.playTone({
      frequency: 320,
      frequencyEnd: 180,
      duration: 0.18,
      type: 'sawtooth',
      volume: 0.12,
    });
    this.spawnBurst(worldX, worldY, { colors: [0xff6b6b, 0xffa36c], count: 10, radius: 18 });
  }

  enemyEaten(worldX: number, worldY: number) {
    this.playTone({
      frequency: 260,
      frequencyEnd: 120,
      duration: 0.16,
      type: 'sawtooth',
      volume: 0.11,
    });
    this.playTone({
      frequency: 520,
      frequencyEnd: 720,
      duration: 0.12,
      type: 'square',
      volume: 0.08,
    });
    this.kickCamera(0.016, 90);
    this.spawnBurst(worldX, worldY, {
      colors: [0xff6b6b, 0xffcf8a, 0xfff3a8],
      count: 18,
      radius: 24,
    });
    this.ringPulse(worldX, worldY, 0xff8f5a, 12, 2, 190);
  }

  // Big apex moment: shockwave + zoom punch + particles
  predationApex(worldX: number, worldY: number) {
    this.playTone({ frequency: 360, duration: 0.2, type: 'triangle', volume: 0.14 });
    this.playTone({ frequency: 720, duration: 0.24, type: 'sine', volume: 0.16 });
    this.scene.cameras.main.flash(140, 255, 160, 80, true);
    this.kickCamera(0.026, 160);
    this.punchZoom(1.06, 140);
    this.blastWave(worldX, worldY, [0xff8450, 0xfff3a8], 42);
    this.spawnBurst(worldX, worldY, {
      colors: [0xff8450, 0xffc857, 0xfff3a8],
      count: 24,
      radius: 34,
    });
  }

  bossHit(worldX: number, worldY: number) {
    this.playTone({ frequency: 180, duration: 0.12, type: 'square', volume: 0.12 });
    this.kickCamera(0.02, 110);
    this.ringPulse(worldX, worldY, 0xff6b6b, 16, 2, 200);
    this.spawnBurst(worldX, worldY, { colors: [0xff6b6b, 0xc27dff], count: 12, radius: 22 });
  }

  /** Jason Statham vulnerability pulse */
  stathamVulnerable(worldX: number, worldY: number) {
    // Red warning pulse for vulnerability
    this.playTone({
      frequency: 220,
      frequencyEnd: 440,
      duration: 0.28,
      type: 'triangle',
      volume: 0.14,
    });
    this.kickCamera(0.018, 180);
    this.scene.cameras.main.flash(160, 255, 80, 80, true);
    this.ringPulse(worldX, worldY, 0xff2d2d, 20, 3, 300);
    this.spawnBurst(worldX, worldY, {
      colors: [0xff2d2d, 0xff8c42, 0xfff3a8],
      count: 20,
      radius: 30,
    });
    this.blastWave(worldX, worldY, [0xff2d2d, 0xff8c42], 28);
  }

  /** Jason Statham attack charge warning */
  stathamAttackCharge(worldX: number, worldY: number) {
    // Warning rumble
    this.playTone({
      frequency: 120,
      frequencyEnd: 80,
      duration: 0.4,
      type: 'sawtooth',
      volume: 0.15,
    });
    this.kickCamera(0.022, 200);
    this.scene.cameras.main.flash(100, 255, 50, 50, true);
    this.ringPulse(worldX, worldY, 0xffd166, 12, 2, 240);
    this.spawnBurst(worldX, worldY, {
      colors: [0xffd166, 0xff8c42, 0xff2d2d],
      count: 14,
      radius: 24,
    });
  }

  /** Jason Statham defeat: massive explosion + calm */
  stathamDefeated(worldX: number, worldY: number) {
    // Big boom then sudden silence
    this.playTone({
      frequency: 100,
      frequencyEnd: 30,
      duration: 0.8,
      type: 'sawtooth',
      volume: 0.24,
    });
    this.playTone({
      frequency: 320,
      frequencyEnd: 80,
      duration: 0.6,
      type: 'square',
      volume: 0.16,
    });
    this.kickCamera(0.05, 400);
    this.scene.cameras.main.shake(340, 0.035);
    this.scene.cameras.main.flash(260, 255, 255, 255, true);
    this.blastWave(worldX, worldY, [0xff2d2d, 0xff8c42, 0xffd166, 0xfff3a8], 48);
    this.spawnBurst(worldX, worldY, {
      colors: [0xff2d2d, 0xff8c42, 0xffd166, 0xfff3a8, 0xc27dff],
      count: 40,
      radius: 52,
    });
    this.ringPulse(worldX, worldY, 0xffd166, 18, 4, 400);
    globalThis.setTimeout(() => {
      this.ringPulse(worldX, worldY, 0xfff3a8, 12, 2, 320);
    }, 120);
    globalThis.setTimeout(() => {
      this.ringPulse(worldX, worldY, 0xc27dff, 8, 1, 280);
    }, 240);
  }

  startBossMusic(bossKind: string) {
    const existing = this.bossMusic;
    if (existing?.kind === bossKind) {
      return;
    }
    this.stopBossMusic();

    if (!this.scene.sound.locked && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.masterGain);

    const definition = BOSS_MUSIC_REGISTRY[bossKind];
    const result = definition?.build(now, gain) ?? buildGenericBossMusic(now, gain);
    if (!result) {
      return;
    }
    const { sources, cleanup, onBuild } = result;
    sources.forEach((src) => src.start(now));
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.6);
    onBuild?.(gain);

    this.bossMusic = {
      kind: bossKind,
      gain,
      sources,
      cleanup,
    };
  }

  itemPickup(worldX: number, worldY: number) {
    // Short uplifting jingle (Zelda-like) + sparkles
    const notes = [660, 880, 1175]; // E5, A5, D6-ish
    const durations = [0.12, 0.12, 0.16];
    const types: OscillatorType[] = ['triangle', 'sine', 'triangle'];
    let delay = 0;
    notes.forEach((freq, i) => {
      globalThis.setTimeout(
        () =>
          this.playTone({ frequency: freq, duration: durations[i], type: types[i], volume: 0.14 }),
        delay * 1000,
      );
      delay += durations[i] * 0.7; // slight overlap
    });
    this.spawnBurst(worldX, worldY, {
      colors: [0x9ad1ff, 0x5dd6a2, 0xfff3a8],
      count: 14,
      radius: 22,
    });
    this.ringPulse(worldX, worldY, 0x9ad1ff, 18, 2, 220);
    this.spawnTreasureChest(worldX, worldY);
  }

  private spawnTreasureChest(worldX: number, worldY: number): void {
    const g = this.scene.add.graphics().setDepth(31);
    this.overlayLayer.add(g);
    const drawChest = (x: number, y: number, scale: number, alpha: number) => {
      g.clear();
      g.setAlpha(alpha);
      g.lineStyle(2, 0x3b2112, 1);
      g.fillStyle(0x7a4a24, 1);
      g.fillRoundedRect(x - 12 * scale, y - 7 * scale, 24 * scale, 15 * scale, 2 * scale);
      g.fillStyle(0xb87532, 1);
      g.fillRoundedRect(x - 12 * scale, y - 13 * scale, 24 * scale, 12 * scale, 5 * scale);
      g.fillStyle(0xffd166, 1);
      g.fillRect(x - 2 * scale, y - 13 * scale, 4 * scale, 21 * scale);
      g.fillRect(x - 12 * scale, y - 2 * scale, 24 * scale, 3 * scale);
      g.fillStyle(0xfff3a8, 1);
      g.fillRect(x - 3 * scale, y - 3 * scale, 6 * scale, 6 * scale);
      g.strokeRoundedRect(x - 12 * scale, y - 13 * scale, 24 * scale, 21 * scale, 3 * scale);
    };
    const state = { y: worldY, scale: 1, alpha: 1 };
    drawChest(worldX, state.y, state.scale, state.alpha);
    this.scene.tweens.add({
      targets: state,
      y: worldY - 34,
      scale: 1.2,
      alpha: 0,
      duration: 720,
      ease: 'Cubic.easeOut',
      onUpdate: () => drawChest(worldX, state.y, state.scale, state.alpha),
      onComplete: () => g.destroy(),
    });
  }

  equipmentEquip() {
    // Soft confirm: quick rising interval
    this.playTone({ frequency: 420, duration: 0.08, type: 'triangle', volume: 0.08 });
    globalThis.setTimeout(
      () => this.playTone({ frequency: 560, duration: 0.1, type: 'sine', volume: 0.08 }),
      60,
    );
  }

  equipmentUnequip() {
    // Soft release: gentle falling tone
    this.playTone({
      frequency: 320,
      frequencyEnd: 200,
      duration: 0.12,
      type: 'sine',
      volume: 0.07,
    });
  }

  uiTabSwitch() {
    // Gentle whoosh for tab transitions
    this.playTone({
      frequency: 260,
      frequencyEnd: 420,
      duration: 0.12,
      type: 'triangle',
      volume: 0.06,
    });
  }

  uiSparkle(worldX: number, worldY: number) {
    this.spawnBurst(worldX, worldY, {
      colors: [0x4da3ff, 0x9ad1ff, 0xcfe5ff],
      count: 12,
      radius: 28,
    });
  }

  notice(worldX: number, worldY: number, color: number, urgent = false) {
    this.playTone({
      frequency: urgent ? 220 : 460,
      frequencyEnd: urgent ? 160 : 620,
      duration: urgent ? 0.14 : 0.12,
      type: urgent ? 'sawtooth' : 'triangle',
      volume: urgent ? 0.08 : 0.055,
    });
    this.ringPulse(worldX, worldY, color, urgent ? 10 : 7, 1, 190);
    this.spawnBurst(worldX, worldY, {
      colors: [color, urgent ? 0xff6b6b : 0xfff3a8, 0x9ad1ff],
      count: urgent ? 10 : 6,
      radius: urgent ? 18 : 12,
    });
  }

  setMovementNoiseMultiplier(multiplier: number) {
    this.movementNoiseMultiplier = Math.max(0, multiplier);
  }

  setCowbellEnabled(enabled: boolean) {
    this.cowbellEnabled = enabled;
  }

  playCowbell() {
    // Bright metallic cowbell: fast attack, short decay, slight shimmer
    this.playTone({
      frequency: 3920,
      duration: 0.08,
      type: 'square',
      volume: 0.06,
    });
    this.playTone({
      frequency: 5880,
      duration: 0.05,
      type: 'triangle',
      volume: 0.03,
    });
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
      const circle = this.scene.add.circle(
        cx,
        cy,
        Phaser.Math.Between(2, 3),
        Phaser.Utils.Array.GetRandom(colors),
      );
      circle.setDepth(21).setAlpha(0.9);
      this.particleLayer.add(circle);
      this.scene.tweens.add({
        targets: circle,
        y: cy - Phaser.Math.Between(2, 4),
        alpha: 0,
        duration: Phaser.Math.Between(260, 380),
        ease: 'Cubic.easeOut',
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
      const circle = this.scene.add.circle(
        cx,
        cy,
        Phaser.Math.Between(2, 3),
        Phaser.Utils.Array.GetRandom(colors),
      );
      circle.setDepth(21).setAlpha(0.95);
      this.particleLayer.add(circle);
      this.scene.tweens.add({
        targets: circle,
        y: cy - Phaser.Math.Between(2, 4),
        alpha: 0,
        duration: Phaser.Math.Between(240, 360),
        ease: 'Cubic.easeOut',
        onComplete: () => circle.destroy(),
      });
    }
  }

  // Treasure pickup burst
  treasurePickup(worldX: number, worldY: number) {
    this.playTone({ frequency: 740, duration: 0.14, type: 'triangle', volume: 0.14 });
    this.playTone({ frequency: 980, duration: 0.16, type: 'sine', volume: 0.12 });
    this.spawnBurst(worldX, worldY, {
      colors: [0xffd700, 0xffe58a, 0xfff3a8],
      count: 18,
      radius: 26,
    });
    this.ringPulse(worldX, worldY, 0xffd700, 10, 2, 240);
    globalThis.setTimeout(() => this.ringPulse(worldX, worldY, 0xfff3a8, 14, 2, 220), 60);
    this.punchZoom(1.015, 120);
  }

  // Powerup pickup: heavy juice
  powerupPickup(worldX: number, worldY: number, kind: 'phase' | 'smite' | 'gun') {
    const colors = kind === 'gun' ? [0xf6bd60, 0xffe0a3, 0xff8c42] : [0x9b5de5, 0xc77dff, 0x7ad1ff];
    this.playTone({
      frequency: kind === 'gun' ? 420 : 560,
      frequencyEnd: kind === 'gun' ? 680 : 920,
      duration: 0.34,
      type: kind === 'gun' ? 'square' : 'sine',
      volume: 0.24,
    });
    this.spawnBurst(worldX, worldY, { colors, count: 36, radius: 40 });
    this.kickCamera(0.038, 220);
    this.punchZoom(1.085, 220);
    this.scene.cameras.main.flash(
      200,
      kind === 'gun' ? 246 : 155,
      kind === 'gun' ? 189 : 110,
      kind === 'gun' ? 96 : 255,
      true,
    );
    this.blastWave(worldX, worldY, colors, 42);
    this.ringPulse(worldX, worldY, kind === 'gun' ? 0xf6bd60 : 0x9b5de5, 16, 2, 300);
    globalThis.setTimeout(
      () => this.ringPulse(worldX, worldY, kind === 'gun' ? 0xffe0a3 : 0xc77dff, 20, 2, 280),
      100,
    );
  }

  powerupTick(worldX: number, worldY: number, kind: string, remaining: number, total: number) {
    const safeTotal = Math.max(1, total);
    const progress = Phaser.Math.Clamp(remaining / safeTotal, 0, 1);
    const ending = progress < 0.22;
    const colors =
      kind === 'gun'
        ? [0xf6bd60, 0xffe0a3, 0xff8c42]
        : kind === 'smite'
          ? [0xff6b6b, 0xd7263d, 0xffd166]
          : [0x9b5de5, 0xc77dff, 0x7ad1ff];
    const mote = this.scene.add.circle(
      worldX + Phaser.Math.Between(-8, 8),
      worldY + Phaser.Math.Between(-8, 8),
      Phaser.Math.Between(2, ending ? 4 : 3),
      Phaser.Utils.Array.GetRandom(colors),
      ending ? 0.9 : 0.58,
    );
    mote.setDepth(27).setBlendMode(Phaser.BlendModes.ADD);
    this.overlayLayer.add(mote);
    this.scene.tweens.add({
      targets: mote,
      x: mote.x + Phaser.Math.Between(-8, 8),
      y: mote.y - Phaser.Math.Between(10, 22),
      alpha: 0,
      scale: ending ? 0.25 : 0.45,
      duration: ending ? 260 : 420,
      ease: 'Cubic.easeOut',
      onComplete: () => mote.destroy(),
    });
    if (ending) {
      this.playTone({
        frequency: 760,
        frequencyEnd: 420,
        duration: 0.08,
        type: 'triangle',
        volume: 0.035,
      });
    }
  }

  wandererReveal(worldX: number, worldY: number) {
    this.playTone({ frequency: 240, duration: 0.18, type: 'triangle', volume: 0.11 });
    this.playTone({ frequency: 480, duration: 0.24, type: 'sine', volume: 0.09 });
    this.scene.cameras.main.flash(140, 185, 130, 255, true);
    this.kickCamera(0.016, 130);
    this.spawnBurst(worldX, worldY, {
      colors: [0x8c6fff, 0xcfb8ff, 0x90e0ff],
      count: 18,
      radius: 24,
    });
    this.ringPulse(worldX, worldY, 0xcfb8ff, 12, 2, 260);
  }

  wandererApproach(worldX: number, worldY: number) {
    this.playTone({
      frequency: 300,
      frequencyEnd: 220,
      duration: 0.22,
      type: 'sawtooth',
      volume: 0.1,
    });
    this.blastWave(worldX, worldY, [0xb89cff, 0xe8ddff], 20);
    this.punchZoom(1.025, 140);
  }

  wandererAura(worldX: number, worldY: number, colorCss: string) {
    const circle = this.scene.add.circle(
      worldX,
      worldY,
      Phaser.Math.Between(2, 3),
      Phaser.Display.Color.HexStringToColor(colorCss).color,
    );
    circle.setDepth(26).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
    this.particleLayer.add(circle);
    this.scene.tweens.add({
      targets: circle,
      y: worldY - Phaser.Math.Between(10, 16),
      alpha: 0,
      scale: 0.4,
      duration: Phaser.Math.Between(420, 680),
      ease: 'Cubic.easeOut',
      onComplete: () => circle.destroy(),
    });
  }

  duelAccepted(worldX: number, worldY: number) {
    this.playTone({ frequency: 220, duration: 0.14, type: 'square', volume: 0.12 });
    this.playTone({ frequency: 440, duration: 0.18, type: 'sawtooth', volume: 0.16 });
    this.playTone({ frequency: 660, duration: 0.24, type: 'triangle', volume: 0.12 });
    this.kickCamera(0.028, 180);
    this.punchZoom(1.06, 180);
    this.scene.cameras.main.flash(160, 255, 90, 90, true);
    this.spawnBurst(worldX, worldY, {
      colors: [0xff6b6b, 0xffd166, 0xfff3a8],
      count: 24,
      radius: 28,
    });
    this.blastWave(worldX, worldY, [0xff6b6b, 0xffd166], 24);
  }

  villageReveal(worldX: number, worldY: number) {
    this.playTone({ frequency: 196, duration: 0.24, type: 'triangle', volume: 0.1 });
    globalThis.setTimeout(
      () => this.playTone({ frequency: 293, duration: 0.3, type: 'sine', volume: 0.08 }),
      90,
    );
    globalThis.setTimeout(
      () => this.playTone({ frequency: 392, duration: 0.36, type: 'triangle', volume: 0.08 }),
      180,
    );
    this.scene.cameras.main.flash(220, 246, 214, 164, true);
    this.kickCamera(0.02, 180);
    this.punchZoom(1.05, 200);
    this.spawnBurst(worldX, worldY, {
      colors: [0xffe8b6, 0xf6bd60, 0xcde7ff],
      count: 28,
      radius: 34,
    });
    this.blastWave(worldX, worldY, [0xffe8b6, 0xf6bd60, 0xcde7ff], 34);
    this.fillPulse(worldX, worldY, 10, 72, 0xf6e7c1, 0.12, 500);
  }

  biomeReveal(worldX: number, worldY: number, color: number) {
    this.playTone({ frequency: 164, duration: 0.24, type: 'triangle', volume: 0.08 });
    globalThis.setTimeout(
      () => this.playTone({ frequency: 246, duration: 0.28, type: 'sine', volume: 0.07 }),
      80,
    );
    globalThis.setTimeout(
      () => this.playTone({ frequency: 328, duration: 0.34, type: 'triangle', volume: 0.07 }),
      160,
    );
    this.kickCamera(0.014, 150);
    this.punchZoom(1.04, 180);
    this.fillPulse(worldX, worldY, 10, 86, color, 0.12, 520);
    this.ringPulse(worldX, worldY, color, 16, 2, 320);
    this.spawnBurst(worldX, worldY, { colors: [color, 0xf6e7c1, 0xcfe5ff], count: 20, radius: 28 });
  }

  villageLantern(worldX: number, worldY: number) {
    const colors = [0xffe8b6, 0xffc857, 0xfff4d6];
    const count = 3;
    for (let i = 0; i < count; i++) {
      const cx = worldX + Phaser.Math.Between(-3, 3);
      const cy = worldY - Phaser.Math.Between(6, 10);
      const dot = this.scene.add.circle(
        cx,
        cy,
        Phaser.Math.Between(2, 3),
        Phaser.Utils.Array.GetRandom(colors),
      );
      dot.setDepth(27).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD);
      this.overlayLayer.add(dot);
      this.scene.tweens.add({
        targets: dot,
        y: cy - Phaser.Math.Between(10, 18),
        alpha: 0,
        scale: 0.5,
        duration: Phaser.Math.Between(900, 1400),
        ease: 'Sine.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
    if (Math.random() < 0.18) {
      this.ringPulse(worldX, worldY, 0xffe8b6, 4, 1, 320);
    }
  }

  villageBreath(worldX: number, worldY: number) {
    const ring = this.scene.add.circle(worldX, worldY, 8, 0xf6e7c1, 0.08);
    ring.setDepth(26).setBlendMode(Phaser.BlendModes.ADD);
    this.overlayLayer.add(ring);
    this.scene.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
    this.fillPulse(worldX, worldY, 10, 56, 0xf6e7c1, 0.06, 1000);
    for (let i = 0; i < 4; i++) {
      const mote = this.scene.add.circle(
        worldX + Phaser.Math.Between(-10, 10),
        worldY + Phaser.Math.Between(-8, 8),
        Phaser.Math.Between(2, 3),
        Phaser.Utils.Array.GetRandom([0xffe8b6, 0xcde7ff, 0xf6bd60]),
        0.35,
      );
      mote.setDepth(26).setBlendMode(Phaser.BlendModes.ADD);
      this.overlayLayer.add(mote);
      this.scene.tweens.add({
        targets: mote,
        y: mote.y - Phaser.Math.Between(14, 24),
        alpha: 0,
        scale: 0.4,
        duration: 900 + Math.random() * 300,
        ease: 'Sine.easeOut',
        onComplete: () => mote.destroy(),
      });
    }
  }

  playerShot(worldX: number, worldY: number, dx: number, dy: number) {
    this.playTone({
      frequency: 520,
      frequencyEnd: 240,
      duration: 0.08,
      type: 'square',
      volume: 0.13,
    });
    this.playTone({
      frequency: 96,
      frequencyEnd: 52,
      duration: 0.1,
      type: 'sawtooth',
      volume: 0.065,
    });
    const muzzleX = worldX + dx * 10;
    const muzzleY = worldY + dy * 10;
    this.spawnBurst(muzzleX, muzzleY, {
      colors: [0xfff3a8, 0xffc857, 0xff8c42],
      count: 12,
      radius: 16,
    });
    this.ringPulse(muzzleX, muzzleY, 0xffc857, 6, 1, 120);
    this.flashLine(muzzleX, muzzleY, muzzleX + dx * 34, muzzleY + dy * 34, 0xffd166, 3, 90);
    this.flashLine(
      muzzleX - dy * 2,
      muzzleY + dx * 2,
      muzzleX + dx * 22 - dy * 2,
      muzzleY + dy * 22 + dx * 2,
      0xfff3a8,
      1,
      120,
    );
    this.kickCamera(0.009, 60);
    const casing = this.scene.add.rectangle(
      worldX - dx * 3 - dy * 5,
      worldY - dy * 3 + dx * 5,
      3,
      2,
      0xffd166,
      0.9,
    );
    casing.setDepth(27).setBlendMode(Phaser.BlendModes.ADD);
    this.overlayLayer.add(casing);
    this.scene.tweens.add({
      targets: casing,
      x: casing.x - dx * Phaser.Math.Between(4, 8) - dy * Phaser.Math.Between(8, 14),
      y: casing.y - dy * Phaser.Math.Between(4, 8) + dx * Phaser.Math.Between(8, 14),
      alpha: 0,
      angle: Phaser.Math.Between(-160, 160),
      duration: 320,
      ease: 'Cubic.easeOut',
      onComplete: () => casing.destroy(),
    });
  }

  footballShot(worldX: number, worldY: number, dx: number, dy: number) {
    this.playTone({
      frequency: 180,
      frequencyEnd: 420,
      duration: 0.18,
      type: 'triangle',
      volume: 0.1,
    });
    const startX = worldX + dx * 10;
    const startY = worldY + dy * 10;
    const ball = this.scene.add.ellipse(startX, startY, 12, 8, 0x8b4a24, 1).setDepth(31);
    ball.setStrokeStyle(2, 0xf3eee2, 0.9);
    this.overlayLayer.add(ball);
    this.scene.tweens.add({
      targets: ball,
      x: startX + dx * 92,
      y: startY + dy * 92 - 20,
      scaleX: 1.9,
      scaleY: 1.9,
      angle: 540,
      duration: 280,
      ease: 'Cubic.easeOut',
      yoyo: true,
      onComplete: () => ball.destroy(),
    });
    this.spawnBurst(startX, startY, { colors: [0xf3eee2, 0x74b8ff], count: 8, radius: 14 });
    this.flashLine(startX, startY, startX + dx * 48, startY + dy * 48 - 10, 0xf3eee2, 2, 140);
  }

  footballPass(fromX: number, fromY: number, toX: number, toY: number) {
    this.playTone({
      frequency: 220,
      frequencyEnd: 520,
      duration: 0.2,
      type: 'triangle',
      volume: 0.08,
    });
    this.gridironCrowdRoar(toX, toY);
    const ball = this.scene.add.ellipse(fromX, fromY, 10, 7, 0x8b4a24, 1).setDepth(32);
    ball.setStrokeStyle(2, 0xf3eee2, 0.9);
    this.overlayLayer.add(ball);
    const state = { t: 0 };
    this.scene.tweens.add({
      targets: state,
      t: 1,
      duration: 720,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const t = state.t;
        const arc = Math.sin(Math.PI * t);
        ball.setPosition(
          Phaser.Math.Linear(fromX, toX, t),
          Phaser.Math.Linear(fromY, toY, t) - arc * 96,
        );
        ball.setScale(1 + arc * 1.75);
        ball.setAngle(t * 720);
      },
      onComplete: () => {
        this.spawnBurst(toX, toY, {
          colors: [0xf3eee2, 0x74b8ff, 0xb5362f],
          count: 14,
          radius: 18,
        });
        ball.destroy();
      },
    });
  }

  footballCatch(worldX: number, worldY: number) {
    this.playTone({
      frequency: 330,
      frequencyEnd: 660,
      duration: 0.14,
      type: 'triangle',
      volume: 0.08,
    });
    this.ringPulse(worldX, worldY, 0xf3eee2, 8, 2, 220);
    this.spawnBurst(worldX, worldY, {
      colors: [0x8b4a24, 0xf3eee2, 0x244f87],
      count: 10,
      radius: 16,
    });
  }

  footballFumble(worldX: number, worldY: number) {
    this.playTone({
      frequency: 180,
      frequencyEnd: 120,
      duration: 0.12,
      type: 'sawtooth',
      volume: 0.045,
    });
    this.ringPulse(worldX, worldY, 0x8b4a24, 5, 1, 180);
    this.spawnBurst(worldX, worldY, { colors: [0x8b4a24, 0xd9b18c], count: 5, radius: 10 });
  }

  playerHit(
    worldX: number,
    worldY: number,
    health: number,
    maxHealth: number,
    source?: 'enemy' | 'npc-hostile' | 'duelist' | 'freak-joey' | 'player',
  ) {
    const colors =
      source === 'npc-hostile'
        ? [0xff8e7a, 0xa82d3d]
        : source === 'freak-joey'
          ? [0xffd27d, 0x7a2430]
          : source === 'duelist'
            ? [0xe2c8ff, 0x5d3d7d]
            : [0xff6b6b, 0xff9e7a];
    this.playTone({
      frequency: 180,
      frequencyEnd: 90,
      duration: 0.18,
      type: 'sawtooth',
      volume: 0.12,
    });
    this.scene.cameras.main.flash(120, 255, 70, 70, true);
    this.kickCamera(0.024, 150);
    this.spawnBurst(worldX, worldY, { colors, count: 14, radius: 18 });
    this.ringPulse(worldX, worldY, colors[0], 10, 2, 180);
    if (health <= Math.ceil(maxHealth / 3)) {
      this.punchZoom(1.045, 170);
    }
  }

  dangerPulse(worldX: number, worldY: number, intensity: number) {
    const level = Phaser.Math.Clamp(intensity, 0, 1);
    if (level <= 0) {
      return;
    }
    this.playTone({
      frequency: 90 + level * 50,
      frequencyEnd: 60,
      duration: 0.16,
      type: 'sine',
      volume: 0.035 + level * 0.045,
    });
    this.ringPulse(worldX, worldY, 0xff3b3b, 8 + level * 10, 1 + Math.round(level), 220);
    if (level > 0.65) {
      this.kickCamera(0.006 + level * 0.006, 70);
    }
  }

  startPowerupMusic(durationMs: number) {
    if (!this.scene.sound.locked && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.stopPowerupMusic();
    const now = this.ctx.currentTime;
    const total = Math.max(0.2, durationMs / 1000);

    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.masterGain);

    const tri = this.ctx.createOscillator();
    tri.type = 'triangle';
    tri.frequency.setValueAtTime(180, now);
    tri.frequency.exponentialRampToValueAtTime(520, now + total);
    const triGain = this.ctx.createGain();
    triGain.gain.value = 0.18;
    tri.connect(triGain);
    triGain.connect(gain);

    const sq = this.ctx.createOscillator();
    sq.type = 'square';
    sq.frequency.setValueAtTime(90, now);
    sq.frequency.exponentialRampToValueAtTime(220, now + total);
    const sqGain = this.ctx.createGain();
    sqGain.gain.value = 0.12;
    sq.connect(sqGain);
    sqGain.connect(gain);

    // Gentle tremolo that speeds up
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
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
      try {
        src.stop(now + 0.28);
      } catch {}
    }
    globalThis.setTimeout(() => {
      for (const src of sources) {
        try {
          src.disconnect();
        } catch {}
      }
      for (const node of cleanup) {
        try {
          node.disconnect();
        } catch {}
      }
      try {
        gain.disconnect();
      } catch {}
    }, 340);
    this.powerupMusic = undefined;
  }

  // Gentle house ambience
  startHouseAmbience(): void {
    if (!this.scene.sound.locked && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.stopHouseAmbience();
    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.masterGain);

    const s1 = this.ctx.createOscillator();
    s1.type = 'sine';
    s1.frequency.value = 196; // G3
    const g1 = this.ctx.createGain();
    g1.gain.value = 0.06;
    s1.connect(g1);
    g1.connect(gain);

    const s2 = this.ctx.createOscillator();
    s2.type = 'triangle';
    s2.frequency.value = 261.63; // C4
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.05;
    s2.connect(g2);
    g2.connect(gain);

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.2;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(g1.gain);

    const lfo2 = this.ctx.createOscillator();
    lfo2.type = 'sine';
    lfo2.frequency.value = 0.13;
    const lfoGain2 = this.ctx.createGain();
    lfoGain2.gain.value = 0.05;
    lfo2.connect(lfoGain2);
    lfoGain2.connect(g2.gain);

    s1.start(now);
    s2.start(now);
    lfo.start(now);
    lfo2.start(now);
    try {
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.25);
    } catch {}

    this.houseMusic = { gain, sources: [s1, s2, lfo, lfo2], cleanup: [g1, g2, lfoGain, lfoGain2] };
  }

  stopHouseAmbience(): void {
    if (!this.houseMusic) return;
    const { gain, sources, cleanup } = this.houseMusic;
    const now = this.ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    } catch {}
    for (const s of sources) {
      try {
        s.stop(now + 0.28);
      } catch {}
    }
    globalThis.setTimeout(() => {
      for (const s of sources) {
        try {
          s.disconnect();
        } catch {}
      }
      for (const n of cleanup) {
        try {
          n.disconnect();
        } catch {}
      }
      try {
        gain.disconnect();
      } catch {}
    }, 340);
    this.houseMusic = undefined;
  }

  startTownMusic(): void {
    if (!this.scene.sound.locked && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (this.townMusic) return;
    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.masterGain);
    const root = this.ctx.createOscillator();
    root.type = 'triangle';
    root.frequency.value = 392.0;
    const fifth = this.ctx.createOscillator();
    fifth.type = 'triangle';
    fifth.frequency.value = 587.33;
    const lilt = this.ctx.createOscillator();
    lilt.type = 'square';
    lilt.frequency.value = 7.2;
    const bounce = this.ctx.createOscillator();
    bounce.type = 'sine';
    bounce.frequency.value = 3.6;
    const counter = this.ctx.createOscillator();
    counter.type = 'sine';
    counter.frequency.value = 523.25;
    const bell = this.ctx.createOscillator();
    bell.type = 'triangle';
    bell.frequency.value = 783.99;
    const rootGain = this.ctx.createGain();
    rootGain.gain.value = 0.028;
    const fifthGain = this.ctx.createGain();
    fifthGain.gain.value = 0.024;
    const liltGain = this.ctx.createGain();
    liltGain.gain.value = 0.016;
    const bounceGain = this.ctx.createGain();
    bounceGain.gain.value = 0.012;
    const counterGain = this.ctx.createGain();
    counterGain.gain.value = 0.018;
    const bellGain = this.ctx.createGain();
    bellGain.gain.value = 0.014;
    root.connect(rootGain);
    fifth.connect(fifthGain);
    bounce.connect(bounceGain);
    counter.connect(counterGain);
    lilt.connect(liltGain);
    bell.connect(bellGain);
    rootGain.connect(gain);
    fifthGain.connect(gain);
    counterGain.connect(gain);
    bellGain.connect(gain);
    bounceGain.connect(rootGain.gain);
    liltGain.connect(fifthGain.gain);
    liltGain.connect(bellGain.gain);
    root.start(now);
    fifth.start(now);
    bounce.start(now);
    counter.start(now);
    lilt.start(now);
    bell.start(now);
    try {
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.28);
    } catch {}
    this.townMusic = {
      gain,
      sources: [root, fifth, bounce, counter, lilt, bell],
      cleanup: [rootGain, fifthGain, bounceGain, counterGain, liltGain, bellGain],
    };
  }

  stopTownMusic(): void {
    if (!this.townMusic) return;
    const { gain, sources, cleanup } = this.townMusic;
    const now = this.ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    } catch {}
    for (const source of sources) {
      try {
        source.stop(now + 0.28);
      } catch {}
    }
    globalThis.setTimeout(() => {
      for (const source of sources) {
        try {
          source.disconnect();
        } catch {}
      }
      for (const node of cleanup) {
        try {
          node.disconnect();
        } catch {}
      }
      try {
        gain.disconnect();
      } catch {}
    }, 340);
    this.townMusic = undefined;
  }

  startHeavenMusic(): void {
    if (!this.scene.sound.locked && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    this.stopBossMusic();
    this.stopPowerupMusic();
    this.stopHeavenMusic();

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.masterGain);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2400;
    filter.Q.value = 0.45;
    filter.connect(gain);

    const chord: Array<{ frequency: number; type: OscillatorType; volume: number; drift: number }> =
      [
        { frequency: 261.63, type: 'sine', volume: 0.08, drift: 0.08 },
        { frequency: 329.63, type: 'triangle', volume: 0.055, drift: 0.06 },
        { frequency: 392.0, type: 'sine', volume: 0.05, drift: 0.045 },
        { frequency: 523.25, type: 'sine', volume: 0.035, drift: 0.035 },
      ];

    const sources: OscillatorNode[] = [];
    const cleanup: AudioNode[] = [filter];

    for (const note of chord) {
      const osc = this.ctx.createOscillator();
      osc.type = note.type;
      osc.frequency.setValueAtTime(note.frequency, now);

      const noteGain = this.ctx.createGain();
      noteGain.gain.value = note.volume;
      osc.connect(noteGain);
      noteGain.connect(filter);

      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = note.drift;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = note.frequency * 0.006;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      osc.start(now);
      lfo.start(now);
      sources.push(osc, lfo);
      cleanup.push(noteGain, lfoGain);
    }

    const shimmer = this.ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = 1046.5;
    const shimmerGain = this.ctx.createGain();
    shimmerGain.gain.value = 0.018;
    const shimmerLfo = this.ctx.createOscillator();
    shimmerLfo.type = 'sine';
    shimmerLfo.frequency.value = 0.11;
    const shimmerLfoGain = this.ctx.createGain();
    shimmerLfoGain.gain.value = 0.014;
    shimmerLfo.connect(shimmerLfoGain);
    shimmerLfoGain.connect(shimmerGain.gain);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(filter);
    shimmer.start(now);
    shimmerLfo.start(now);
    sources.push(shimmer, shimmerLfo);
    cleanup.push(shimmerGain, shimmerLfoGain);

    try {
      gain.gain.exponentialRampToValueAtTime(0.32, now + 1.2);
    } catch {}

    this.heavenMusic = { gain, sources, cleanup };
  }

  stopHeavenMusic(): void {
    if (!this.heavenMusic) return;
    const { gain, sources, cleanup } = this.heavenMusic;
    const now = this.ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    } catch {}
    for (const source of sources) {
      try {
        source.stop(now + 0.55);
      } catch {}
    }
    globalThis.setTimeout(() => {
      for (const source of sources) {
        try {
          source.disconnect();
        } catch {}
      }
      for (const node of cleanup) {
        try {
          node.disconnect();
        } catch {}
      }
      try {
        gain.disconnect();
      } catch {}
    }, 650);
    this.heavenMusic = undefined;
  }

  startHellMusic(): void {
    if (!this.scene.sound.locked && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    this.stopBossMusic();
    this.stopPowerupMusic();
    this.stopHeavenMusic();
    this.stopHellMusic();

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.masterGain);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.Q.value = 1.2;
    filter.connect(gain);

    const chord = [
      { frequency: 82.41, type: 'sawtooth' as OscillatorType, volume: 0.14 },
      { frequency: 87.31, type: 'sawtooth' as OscillatorType, volume: 0.12 },
      { frequency: 110.0, type: 'square' as OscillatorType, volume: 0.06 },
    ];

    const sources: OscillatorNode[] = [];
    const cleanup: AudioNode[] = [filter];

    for (const note of chord) {
      const osc = this.ctx.createOscillator();
      osc.type = note.type;
      osc.frequency.setValueAtTime(note.frequency, now);
      const noteGain = this.ctx.createGain();
      noteGain.gain.value = note.volume;
      osc.connect(noteGain);
      noteGain.connect(filter);

      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine' as OscillatorType;
      lfo.frequency.value = 0.12 + Math.random() * 0.15;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = note.frequency * 0.015;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfoGain.gain.setValueAtTime(0, now);
      lfoGain.gain.linearRampToValueAtTime(note.frequency * 0.015, now + 1.5);

      osc.start(now);
      lfo.start(now);
      sources.push(osc, lfo);
      cleanup.push(noteGain, lfoGain);
    }

    // Heartbeat kick: low sub pulse
    const sub = this.ctx.createOscillator();
    sub.type = 'sine' as OscillatorType;
    sub.frequency.setValueAtTime(42, now);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.0001, now);
    sub.connect(subGain);
    subGain.connect(filter);
    sub.start(now);
    sources.push(sub);
    cleanup.push(subGain);

    const pulseLfo = this.ctx.createOscillator();
    pulseLfo.type = 'sine' as OscillatorType;
    pulseLfo.frequency.value = 0.8;
    const pulseLfoGain = this.ctx.createGain();
    pulseLfoGain.gain.setValueAtTime(0, now);
    pulseLfo.connect(pulseLfoGain);
    pulseLfoGain.connect(subGain.gain);
    pulseLfoGain.gain.setValueAtTime(0.12, now);
    pulseLfo.start(now);
    sources.push(pulseLfo);
    cleanup.push(pulseLfoGain);

    try {
      gain.gain.exponentialRampToValueAtTime(0.35, now + 2);
    } catch {}

    this.hellMusic = { gain, sources, cleanup };
  }

  stopHellMusic(): void {
    if (!this.hellMusic) return;
    const { gain, sources, cleanup } = this.hellMusic;
    const now = this.ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    } catch {}
    for (const source of sources) {
      try {
        source.stop(now + 0.55);
      } catch {}
    }
    globalThis.setTimeout(() => {
      for (const source of sources) {
        try {
          source.disconnect();
        } catch {}
      }
      for (const node of cleanup) {
        try {
          node.disconnect();
        } catch {}
      }
      try {
        gain.disconnect();
      } catch {}
    }, 650);
    this.hellMusic = undefined;
  }

  // Soft glow pulse to indicate restful tick
  houseRestPulse(x: number, y: number): void {
    const c = 0xffe2b0;
    this.ringPulse(x, y, c, 18, 2, 320);
    this.spawnBurst(x, y, { colors: [0xfff3a8, 0xffe2b0], count: 8, radius: 18 });
    this.fillPulse(x, y, 8, 34, 0xffe2b0, 0.12, 300);
    this.punchZoom(1.02, 140);
  }

  // Ambient mote drifting upward
  houseMote(x: number, y: number): void {
    const rect = this.scene.add.rectangle(x, y, 2, 2, 0xfff3a8, 0.6);
    rect.setDepth(27).setBlendMode(Phaser.BlendModes.ADD);
    this.overlayLayer.add(rect);
    const dx = (Math.random() - 0.5) * 10;
    const dy = -20 - Math.random() * 20;
    this.scene.tweens.add({
      targets: rect,
      x: x + dx,
      y: y + dy,
      alpha: 0,
      duration: 1600 + Math.random() * 900,
      ease: 'Sine.easeOut',
      onComplete: () => rect.destroy(),
    });
    if (Math.random() < 0.35) {
      const ember = this.scene.add.circle(
        x + Phaser.Math.Between(-3, 3),
        y + Phaser.Math.Between(-3, 3),
        Phaser.Math.Between(2, 3),
        0xffd79a,
        0.35,
      );
      ember.setDepth(27).setBlendMode(Phaser.BlendModes.ADD);
      this.overlayLayer.add(ember);
      this.scene.tweens.add({
        targets: ember,
        y: ember.y - Phaser.Math.Between(8, 14),
        alpha: 0,
        scale: 0.4,
        duration: 900 + Math.random() * 400,
        ease: 'Sine.easeOut',
        onComplete: () => ember.destroy(),
      });
    }
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
      ease: 'Cubic.easeOut',
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
    this.playTone({ frequency: 140, duration: 0.12, type: 'triangle', volume: 0.06 });
  }

  announce(message: string, color: string, duration: number = 1500): void {
    const overlay = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      60,
      this.scene.scale.width,
      40,
      0x000000,
      0.85,
    );
    overlay.setDepth(32).setOrigin(0, 0);
    this.overlayLayer.add(overlay);

    const text = this.scene.add
      .text(this.scene.scale.width / 2, 60, message, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: color,
        align: 'center',
      })
      .setDepth(33)
      .setOrigin(0.5, 0.5);
    this.overlayLayer.add(text);

    const state = { opacity: 1, y: 60 };

    const fadeOut = () => {
      text.setAlpha(state.opacity);
      text.setY(state.y);
    };

    this.scene.tweens.add({
      targets: state,
      opacity: 0,
      y: 50,
      duration: duration * 0.3,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        overlay.destroy();
        text.destroy();
      },
    });
  }
  questOffered() {
    this.playTone({ frequency: 660, duration: 0.16, type: 'triangle', volume: 0.12 });
    this.scene.cameras.main.flash(120, 80, 130, 255, true);
  }

  questAccepted() {
    this.playTone({
      frequency: 550,
      frequencyEnd: 880,
      duration: 0.22,
      type: 'sine',
      volume: 0.14,
    });
  }

  questRejected() {
    this.playTone({ frequency: 220, duration: 0.16, type: 'sawtooth', volume: 0.1 });
  }

  questCompleted() {
    this.playTone({ frequency: 520, duration: 0.18, volume: 0.2 });
    this.playTone({ frequency: 780, duration: 0.22, volume: 0.15 });
    this.scene.cameras.main.flash(160, 120, 200, 255, true);
    const cam = this.scene.cameras.main;
    this.punchZoom(1.055, 180);
    this.blastWave(cam.midPoint.x, cam.midPoint.y, [0x5dd6a2, 0xfff3a8, 0x9ad1ff], 32);
    this.floatingLabel(cam.midPoint.x, 74, 'QUEST COMPLETE', '#fff3a8', 18);
  }

  relationshipChoice(tier: 'loved' | 'liked' | 'neutral' | 'disliked' | 'hated') {
    const cam = this.scene.cameras.main;
    if (tier === 'loved') {
      this.playTone({
        frequency: 520,
        frequencyEnd: 760,
        duration: 0.18,
        type: 'sine',
        volume: 0.16,
      });
      this.playTone({ frequency: 880, duration: 0.12, type: 'triangle', volume: 0.09 });
      this.punchZoom(1.035, 130);
      this.scene.cameras.main.flash(90, 255, 190, 235, true);
      this.blastWave(cam.midPoint.x, cam.midPoint.y, [0xffbdfd, 0xfff3a8, 0x9ad1ff], 24);
      return;
    }
    if (tier === 'liked') {
      this.playTone({
        frequency: 420,
        frequencyEnd: 560,
        duration: 0.14,
        type: 'triangle',
        volume: 0.1,
      });
      this.ringPulse(cam.midPoint.x, cam.midPoint.y, 0xffbdfd, 22, 2, 220);
      return;
    }
    if (tier === 'disliked') {
      this.playTone({
        frequency: 220,
        frequencyEnd: 140,
        duration: 0.16,
        type: 'sawtooth',
        volume: 0.1,
      });
      this.kickCamera(0.006, 110);
      return;
    }
    if (tier === 'hated') {
      this.playTone({
        frequency: 180,
        frequencyEnd: 52,
        duration: 0.28,
        type: 'sawtooth',
        volume: 0.16,
      });
      this.playTone({
        frequency: 72,
        frequencyEnd: 40,
        duration: 0.18,
        type: 'square',
        volume: 0.08,
      });
      this.scene.cameras.main.shake(280, 0.018);
      this.scene.cameras.main.flash(140, 255, 70, 70, true);
      return;
    }
    this.playTone({ frequency: 300, duration: 0.08, type: 'sine', volume: 0.045 });
  }

  gameOver() {
    this.stopBossMusic();
    this.playTone({
      frequency: 200,
      frequencyEnd: 40,
      duration: 0.6,
      type: 'sawtooth',
      volume: 0.18,
    });
    this.scene.cameras.main.shake(260, 0.02);
    this.scene.cameras.main.flash(180, 255, 50, 50, true);
  }
  private playTone({
    frequency,
    duration = 0.15,
    type = 'sine',
    volume = 0.1,
    frequencyEnd,
  }: ToneOptions) {
    if (!this.scene.sound.locked && this.ctx.state === 'suspended') {
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
    cam.zoomTo(targetZoom, upDur, 'Cubic.easeOut', true);

    // Ensure any previous reset timer is cleared so we don't stack
    if (this.zoomBackTimer) {
      this.zoomBackTimer.remove(false);
      this.zoomBackTimer = undefined;
    }
    // Always return to exactly 1.0 zoom to avoid drift
    this.zoomBackTimer = this.scene.time.delayedCall(upDur, () => {
      cam.zoomTo(1, downDur, 'Cubic.easeInOut', true);
      // Hard-set to 1 at the end in case of tween rounding
      this.zoomBackTimer = this.scene.time.delayedCall(downDur + 40, () => {
        cam.setZoom(1);
        this.zoomBackTimer = undefined;
      });
    });
  }

  private spawnBurst(
    worldX: number,
    worldY: number,
    { colors, count, radius }: { colors: number[]; count: number; radius: number },
  ) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const dist = Phaser.Math.Between(radius * 0.4, radius);
      const offsetX = Math.cos(angle) * dist;
      const offsetY = Math.sin(angle) * dist;
      const circle = this.scene.add.circle(
        worldX + offsetX,
        worldY + offsetY,
        Phaser.Math.Between(3, 5),
        Phaser.Utils.Array.GetRandom(colors),
      );
      circle.setDepth(22);
      this.particleLayer.add(circle);

      this.scene.tweens.add({
        targets: circle,
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(180, 260),
        ease: 'Cubic.easeOut',
        onComplete: () => circle.destroy(),
      });
    }
  }

  private floatingLabel(
    worldX: number,
    worldY: number,
    label: string,
    color: string,
    fontSize: number,
  ) {
    const text = this.scene.add
      .text(worldX, worldY, label, {
        fontFamily: 'monospace',
        fontSize: `${fontSize}px`,
        color,
        stroke: '#1b1f2a',
        strokeThickness: 3,
      })
      .setDepth(33)
      .setOrigin(0.5, 1)
      .setAlpha(0.98);
    this.overlayLayer.add(text);
    this.scene.tweens.add({
      targets: text,
      y: worldY - 34,
      alpha: 0,
      scale: 1.22,
      duration: 620,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  // Expanding ring pulse
  private ringPulse(
    x: number,
    y: number,
    color: number,
    startRadius: number,
    lineWidth: number,
    duration: number,
  ) {
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
      ease: 'Cubic.easeOut',
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
      globalThis.setTimeout(
        () => this.ringPulse(x, y, color, baseRadius + i * 6, 2, 260 + i * 40),
        delay,
      );
    }
  }

  // Optional subtle trail at the snake head position if provided
  movementTick(worldX?: number, worldY?: number) {
    if (this.cowbellEnabled) {
      this.playCowbell();
    } else {
      this.playTone({
        frequency: 60,
        duration: 0.05,
        type: 'square',
        volume: 0.04 * this.movementNoiseMultiplier,
      });
    }

    if (worldX !== undefined && worldY !== undefined) {
      // Spawn a tiny fading dot and occasional spark to suggest momentum.
      const dot = this.scene.add
        .circle(worldX, worldY, Phaser.Math.Between(2, 3), 0x5dd6a2)
        .setAlpha(0.9);
      dot.setDepth(21);
      this.particleLayer.add(dot);
      this.scene.tweens.add({
        targets: dot,
        x: worldX + Phaser.Math.Between(-4, 4),
        y: worldY + Phaser.Math.Between(-4, 4),
        alpha: 0,
        scale: 0.6,
        duration: 220,
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
      if (Math.random() < 0.45) {
        const spark = this.scene.add
          .circle(
            worldX + Phaser.Math.Between(-5, 5),
            worldY + Phaser.Math.Between(-5, 5),
            Phaser.Math.Between(1, 2),
            Phaser.Utils.Array.GetRandom([0xc8ffe1, 0x9ad1ff, 0x5dd6a2]),
          )
          .setAlpha(0.65);
        spark.setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
        this.particleLayer.add(spark);
        this.scene.tweens.add({
          targets: spark,
          y: spark.y - Phaser.Math.Between(4, 8),
          alpha: 0,
          scale: 0.4,
          duration: 160,
          ease: 'Cubic.easeOut',
          onComplete: () => spark.destroy(),
        });
      }
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
    duration: number,
  ) {
    const g = this.scene.add.graphics().setDepth(28);
    this.overlayLayer.add(g);
    const state = { r: startRadius, a: startAlpha } as any;
    // Radius tween (full duration)
    this.scene.tweens.add({
      targets: state,
      r: endRadius,
      duration,
      ease: 'Cubic.easeOut',
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
        ease: 'Cubic.easeIn',
      });
    });
  }

  // Geometry: seismic pulse feedback
  seismicPulse(worldX: number, worldY: number, radius: number) {
    this.playTone({ frequency: 180, duration: 0.12, type: 'triangle', volume: 0.1 });
    this.kickCamera(0.012, 90);
    this.ringPulse(worldX, worldY, 0x9ad1ff, Math.max(8, radius * 2), 2, 240);
    globalThis.setTimeout(
      () => this.ringPulse(worldX, worldY, 0xcfe5ff, Math.max(10, radius * 3), 2, 200),
      60,
    );
    this.spawnBurst(worldX, worldY, { colors: [0x9ad1ff, 0xcfe5ff], count: 10, radius: 16 });
  }

  // Geometry: collapse control (building walls) feedback
  collapseControl(worldX: number, worldY: number) {
    this.playTone({ frequency: 220, duration: 0.08, type: 'square', volume: 0.08 });
    this.spawnBurst(worldX, worldY, {
      colors: [0xb8865e, 0x8a6b4c, 0xd8c3a5],
      count: 8,
      radius: 14,
    });
  }

  caveEjection(
    worldX: number,
    worldY: number,
    collapsed: boolean,
    reason: 'manual' | 'timer' | 'reward',
  ) {
    const urgent = collapsed || reason === 'timer';
    const colors = urgent
      ? [0x7b5f8f, 0xb8865e, 0xffd166, 0xff6b6b]
      : [0x5dd6a2, 0x9ad1ff, 0xd8c3a5];
    this.playTone({
      frequency: urgent ? 120 : 180,
      frequencyEnd: urgent ? 58 : 92,
      duration: urgent ? 0.36 : 0.22,
      type: 'sawtooth',
      volume: urgent ? 0.16 : 0.1,
    });
    if (!urgent) {
      this.playTone({
        frequency: 420,
        frequencyEnd: 260,
        duration: 0.16,
        type: 'triangle',
        volume: 0.06,
      });
    }
    this.spawnBurst(worldX, worldY, {
      colors,
      count: urgent ? 28 : 16,
      radius: urgent ? 36 : 24,
    });
    this.ringPulse(
      worldX,
      worldY,
      urgent ? 0xffd166 : 0x9ad1ff,
      urgent ? 16 : 10,
      urgent ? 3 : 2,
      260,
    );
    globalThis.setTimeout(
      () => this.ringPulse(worldX, worldY, urgent ? 0xff6b6b : 0x5dd6a2, urgent ? 24 : 16, 2, 240),
      70,
    );
    this.kickCamera(urgent ? 0.034 : 0.018, urgent ? 230 : 120);
    this.punchZoom(urgent ? 1.045 : 1.02, urgent ? 180 : 110);
    this.scene.cameras.main.flash(
      urgent ? 160 : 80,
      urgent ? 255 : 120,
      urgent ? 210 : 190,
      urgent ? 120 : 255,
      true,
    );
  }

  // Geometry: wall chomp debris burst
  wallChomp(worldX: number, worldY: number) {
    this.playTone({ frequency: 140, duration: 0.1, type: 'sawtooth', volume: 0.08 });
    this.kickCamera(0.014, 80);
    this.spawnBurst(worldX, worldY, {
      colors: [0x7b8fa1, 0x9aa6b2, 0xcad2e2],
      count: 12,
      radius: 18,
    });
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
      ease: 'Cubic.easeOut',
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
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
    this.playTone({ frequency: 240, duration: 0.06, type: 'triangle', volume: 0.05 });
  }

  // Wall graze sparks on near-miss
  wallGraze(worldX: number, worldY: number, nx: number, ny: number) {
    const originX = worldX + nx * 8;
    const originY = worldY + ny * 8;
    const colors = [0xffe58a, 0xfff3a8];
    this.spawnBurst(originX, originY, { colors, count: 6, radius: 10 });
    this.playTone({ frequency: 320, duration: 0.04, type: 'sine', volume: 0.05 });
  }

  // Item rarity jingle based on id mapping
  itemRarityJingle(itemId?: string) {
    const rare = new Set(['amulet-phoenix', 'weapon-revolver']);
    const uncommon = new Set(['helm-seer', 'ring-seismic', 'cloak-veil', 'belt-regenerator']);
    let tier: 'common' | 'uncommon' | 'rare' = 'common';
    if (itemId && rare.has(itemId)) tier = 'rare';
    else if (itemId && uncommon.has(itemId)) tier = 'uncommon';
    const seq =
      tier === 'rare' ? [740, 980, 1240] : tier === 'uncommon' ? [620, 820, 980] : [520, 660];
    const vols =
      tier === 'rare' ? [0.16, 0.14, 0.12] : tier === 'uncommon' ? [0.14, 0.12, 0.1] : [0.12, 0.1];
    let delay = 0;
    seq.forEach((f, i) => {
      const d = 0.1 + i * 0.02;
      globalThis.setTimeout(
        () =>
          this.playTone({ frequency: f, duration: d, type: 'triangle', volume: vols[i] ?? 0.1 }),
        delay * 1000,
      );
      delay += d * 0.7;
    });
  }

  // Danger vignette (edge darkening) with photosafe cap
  private vignette?: {
    top: Phaser.GameObjects.Rectangle;
    bottom: Phaser.GameObjects.Rectangle;
    left: Phaser.GameObjects.Rectangle;
    right: Phaser.GameObjects.Rectangle;
  };
  private photosafe = false;
  setPhotosafe(flag: boolean) {
    this.photosafe = flag;
  }
  private ensureVignette() {
    if (this.vignette) return;
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const pad = 6;
    const makeRect = (x: number, y: number, w: number, h: number) =>
      this.scene.add.rectangle(x, y, w, h, 0x000000, 0).setDepth(31).setOrigin(0, 0);
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
    const parts = [
      this.vignette.top,
      this.vignette.bottom,
      this.vignette.left,
      this.vignette.right,
    ];
    for (const r of parts) r.setAlpha(a);
  }

  // Room transition pulse
  roomTransition(worldX: number, worldY: number) {
    this.playTone({ frequency: 300, duration: 0.12, type: 'sine', volume: 0.08 });
    this.kickCamera(0.01, 90);
    this.fillPulse(worldX, worldY, 8, 40, 0x4da3ff, 0.12, 240);
    this.spawnBurst(worldX, worldY, {
      colors: [0x4da3ff, 0x9ad1ff, 0xcfe5ff],
      count: 10,
      radius: 16,
    });
    // Small ring highlight from entry side
    this.ringPulse(worldX, worldY, 0x4da3ff, 12, 2, 240);
    // Subtle echo ring for style
    globalThis.setTimeout(() => this.ringPulse(worldX, worldY, 0x9ad1ff, 8, 2, 220), 60);
    globalThis.setTimeout(() => this.ringPulse(worldX, worldY, 0xcfe5ff, 18, 1, 220), 100);
    this.punchZoom(1.02, 120);
  }

  interiorPulse(worldX: number, worldY: number) {
    const mote = this.scene.add.circle(
      worldX,
      worldY,
      Phaser.Math.Between(2, 3),
      Phaser.Utils.Array.GetRandom([0xffe8b6, 0xffd79a, 0xf6e7c1]),
      0.32,
    );
    mote.setDepth(26).setBlendMode(Phaser.BlendModes.ADD);
    this.overlayLayer.add(mote);
    this.scene.tweens.add({
      targets: mote,
      y: worldY - Phaser.Math.Between(10, 18),
      alpha: 0,
      scale: 0.4,
      duration: 800 + Math.random() * 400,
      ease: 'Sine.easeOut',
      onComplete: () => mote.destroy(),
    });
  }

  villageResidentMurmur(worldX: number, worldY: number, color: number) {
    this.ringPulse(worldX, worldY, color, 4, 1, 260);
    this.fillPulse(worldX, worldY, 4, 18, color, 0.08, 260);
  }

  snowDrift(worldX: number, worldY: number) {
    const flake = this.scene.add.circle(
      worldX,
      worldY,
      Phaser.Math.Between(1, 2),
      Phaser.Utils.Array.GetRandom([0xe8f4ff, 0xcfe5ff, 0xffffff]),
      0.8,
    );
    flake.setDepth(26).setBlendMode(Phaser.BlendModes.ADD);
    this.overlayLayer.add(flake);
    this.scene.tweens.add({
      targets: flake,
      x: worldX + Phaser.Math.Between(-12, 12),
      y: worldY + Phaser.Math.Between(12, 24),
      alpha: 0,
      duration: 1000 + Math.random() * 700,
      ease: 'Sine.easeInOut',
      onComplete: () => flake.destroy(),
    });
  }

  heatHaze(worldX: number, worldY: number) {
    const haze = this.scene.add.ellipse(
      worldX,
      worldY,
      Phaser.Math.Between(8, 14),
      Phaser.Math.Between(14, 22),
      0xffb36b,
      0.14,
    );
    haze.setDepth(26).setBlendMode(Phaser.BlendModes.ADD);
    this.overlayLayer.add(haze);
    this.scene.tweens.add({
      targets: haze,
      y: worldY - Phaser.Math.Between(10, 18),
      x: worldX + Phaser.Math.Between(-6, 6),
      alpha: 0,
      scaleX: 1.3,
      scaleY: 0.7,
      duration: 700 + Math.random() * 400,
      ease: 'Sine.easeOut',
      onComplete: () => haze.destroy(),
    });
  }

  eagleFlyover() {
    const h = this.scene.scale.height;
    const w = this.scene.scale.width;
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -32 : w + 32;
    const endX = fromLeft ? w + 32 : -32;
    const y = Phaser.Math.Between(36, Math.max(64, Math.floor(h * 0.35)));
    const eagle = this.scene.add
      .text(startX, y, 'V', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#f2f0df',
        stroke: '#3a2414',
        strokeThickness: 2,
      })
      .setDepth(27)
      .setAlpha(0.82)
      .setOrigin(0.5);
    eagle.setRotation(fromLeft ? 0.35 : -0.35);
    this.particleLayer.add(eagle);
    this.playTone({
      frequency: 880,
      frequencyEnd: 660,
      duration: 0.18,
      type: 'triangle',
      volume: 0.045,
    });
    this.scene.tweens.add({
      targets: eagle,
      x: endX,
      y: y + Phaser.Math.Between(-12, 18),
      alpha: 0,
      duration: 2600,
      ease: 'Sine.easeInOut',
      onComplete: () => eagle.destroy(),
    });
  }

  dustDevil(worldX: number, worldY: number) {
    for (let i = 0; i < 9; i += 1) {
      const dot = this.scene.add.circle(
        worldX + Phaser.Math.Between(-8, 8),
        worldY + Phaser.Math.Between(-10, 10),
        Phaser.Math.Between(1, 3),
        Phaser.Utils.Array.GetRandom([0xb75a3c, 0xc99b6b, 0xe4d0b0]),
        0.22,
      );
      dot.setDepth(24);
      this.particleLayer.add(dot);
      this.scene.tweens.add({
        targets: dot,
        x: worldX + Phaser.Math.Between(-18, 18),
        y: worldY - Phaser.Math.Between(12, 32),
        alpha: 0,
        scale: 0.5,
        duration: 900 + Math.random() * 500,
        ease: 'Sine.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  tumbleweed() {
    const h = this.scene.scale.height;
    const w = this.scene.scale.width;
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -20 : w + 20;
    const endX = fromLeft ? w + 20 : -20;
    const y = Phaser.Math.Between(Math.floor(h * 0.42), h - 28);
    const weed = this.scene.add.circle(startX, y, 8, 0xb8865e, 0.35).setDepth(24);
    weed.setStrokeStyle(2, 0x6f4628, 0.45);
    this.particleLayer.add(weed);
    this.scene.tweens.add({
      targets: weed,
      x: endX,
      y: y + Phaser.Math.Between(-12, 12),
      angle: fromLeft ? 720 : -720,
      alpha: 0,
      duration: 2600,
      ease: 'Sine.easeInOut',
      onComplete: () => weed.destroy(),
    });
  }

  libertyHeatShimmer(worldX: number, worldY: number) {
    const haze = this.scene.add.ellipse(worldX, worldY, 18, 8, 0xe8d0a8, 0.1);
    haze.setDepth(24).setBlendMode(Phaser.BlendModes.ADD);
    this.particleLayer.add(haze);
    this.scene.tweens.add({
      targets: haze,
      x: worldX + Phaser.Math.Between(-10, 10),
      y: worldY - Phaser.Math.Between(4, 12),
      alpha: 0,
      scaleX: 1.8,
      duration: 760 + Math.random() * 320,
      ease: 'Sine.easeOut',
      onComplete: () => haze.destroy(),
    });
  }

  neonFlicker(worldX: number, worldY: number) {
    this.playTone({
      frequency: 620,
      frequencyEnd: 700,
      duration: 0.07,
      type: 'sine',
      volume: 0.025,
    });
    this.ringPulse(worldX, worldY, 0x8fd8ff, 5, 1, 150);
    const glow = this.scene.add.rectangle(worldX, worldY, 22, 8, 0x5f8fbf, 0.28).setDepth(26);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    this.particleLayer.add(glow);
    this.scene.tweens.add({
      targets: glow,
      alpha: 0,
      duration: 130,
      ease: 'Sine.easeOut',
      onComplete: () => glow.destroy(),
    });
  }

  fireworkPop(worldX: number, worldY: number) {
    this.playTone({
      frequency: 520,
      frequencyEnd: 920,
      duration: 0.12,
      type: 'triangle',
      volume: 0.055,
    });
    this.spawnBurst(worldX, worldY, {
      colors: [0xb5362f, 0xf3eee2, 0x5f8fbf],
      count: 12,
      radius: 20,
    });
  }

  monumentSparkle(worldX: number, worldY: number) {
    this.playTone({ frequency: 1046.5, duration: 0.08, type: 'sine', volume: 0.035 });
    this.ringPulse(worldX, worldY, 0xf3eee2, 4, 1, 180);
    this.spawnBurst(worldX, worldY, { colors: [0xf3eee2, 0x9ad1ff], count: 5, radius: 10 });
  }

  gridironCrowdRoar(worldX: number, worldY: number) {
    this.playTone({
      frequency: 110,
      frequencyEnd: 82,
      duration: 0.22,
      type: 'sawtooth',
      volume: 0.07,
    });
    this.playTone({
      frequency: 220,
      frequencyEnd: 180,
      duration: 0.18,
      type: 'triangle',
      volume: 0.035,
    });
    this.ringPulse(worldX, worldY, 0xf3eee2, 12, 2, 240);
  }

  temperatureReliefPulse(worldX: number, worldY: number, kind: 'warm' | 'cool') {
    const color = kind === 'warm' ? 0xffc27a : 0x8fd8ff;
    this.ringPulse(worldX, worldY, color, 6, 1, 220);
    this.fillPulse(worldX, worldY, 4, 18, color, 0.08, 240);
  }

  private flashLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number,
    width: number,
    duration: number,
  ) {
    const g = this.scene.add.graphics().setDepth(28);
    this.overlayLayer.add(g);
    g.lineStyle(width, color, 0.95);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  // ─── Minecraft Juice ─────────────────────────────────────────────────────

  blockBreak(worldX: number, worldY: number) {
    this.playTone({
      frequency: 200,
      frequencyEnd: 80,
      duration: 0.12,
      type: 'sawtooth',
      volume: 0.1,
    });
    this.kickCamera(0.012, 70);
    this.spawnBurst(worldX, worldY, {
      colors: [0x8b6914, 0x6b5a3c, 0xa0926b],
      count: 10,
      radius: 16,
    });
    this.ringPulse(worldX, worldY, 0x8b6914, 6, 2, 180);
  }

  blockPlace(worldX: number, worldY: number) {
    this.playTone({ frequency: 340, duration: 0.08, type: 'triangle', volume: 0.08 });
    this.ringPulse(worldX, worldY, 0x9ad1ff, 8, 2, 160);
    this.spawnBurst(worldX, worldY, {
      colors: [0x9ad1ff, 0xcfe5ff, 0x5dd6a2],
      count: 6,
      radius: 12,
    });
  }

  mobHit(worldX: number, worldY: number) {
    this.playTone({
      frequency: 260,
      frequencyEnd: 120,
      duration: 0.14,
      type: 'sawtooth',
      volume: 0.09,
    });
    this.kickCamera(0.014, 90);
    this.spawnBurst(worldX, worldY, {
      colors: [0xff6b6b, 0xffa36c, 0xfff3a8],
      count: 8,
      radius: 14,
    });
    this.ringPulse(worldX, worldY, 0xff8f5a, 10, 2, 180);
  }
}
