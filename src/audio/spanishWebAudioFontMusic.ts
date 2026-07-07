export type SpanishWebAudioFontState =
  | 'mosaic-coast-base'
  | 'mosaic-coast-sun'
  | 'mosaic-coast-shade'
  | 'mosaic-coast-cooling'
  | 'tapas-minigame'
  | 'el-drac-boss-phase-1'
  | 'el-drac-boss-phase-2'
  | 'el-drac-boss-critical';

type QueueWaveTable = (
  context: AudioContext,
  destination: AudioNode,
  preset: unknown,
  when: number,
  pitch: number,
  duration: number,
  volume?: number,
) => void;

interface WebAudioFontPlayerLike {
  loader?: {
    decodeAfterLoading?: (context: AudioContext, variableName: string) => void;
  };
  queueWaveTable?: QueueWaveTable;
}

type WebAudioFontCtor = new () => WebAudioFontPlayerLike;

declare global {
  interface Window {
    WebAudioFontPlayer?: WebAudioFontCtor;
    _tone_0240_JCLive_sf2_file?: unknown;
    _tone_0260_JCLive_sf2_file?: unknown;
    _tone_0320_JCLive_sf2_file?: unknown;
  }
}

const STATE_PATTERNS: Readonly<Record<SpanishWebAudioFontState, readonly number[]>> = {
  'mosaic-coast-base': [52, 55, 59, 64, 62, 59, 55, 57],
  'mosaic-coast-sun': [52, 53, 59, 64, 65, 64, 59, 53],
  'mosaic-coast-shade': [52, 55, 59, 62, 59, 55, 52, 50],
  'mosaic-coast-cooling': [55, 59, 62, 67, 71, 67, 62, 59],
  'tapas-minigame': [64, 62, 59, 55, 57, 59, 62, 55],
  'el-drac-boss-phase-1': [40, 47, 52, 55, 54, 52, 47, 43],
  'el-drac-boss-phase-2': [40, 43, 47, 52, 55, 56, 55, 47],
  'el-drac-boss-critical': [40, 41, 47, 52, 53, 52, 47, 41],
};

const BOSS_STATES = new Set<SpanishWebAudioFontState>([
  'el-drac-boss-phase-1',
  'el-drac-boss-phase-2',
  'el-drac-boss-critical',
]);

export class SpanishWebAudioFontMusic {
  private player: WebAudioFontPlayerLike | null = null;
  private gain: GainNode | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private step = 0;
  private activeState: SpanishWebAudioFontState | null = null;

  constructor(private readonly context: AudioContext) {}

  start(state: SpanishWebAudioFontState): void {
    if (this.activeState === state && this.timer !== undefined) {
      return;
    }
    this.stop();
    this.activeState = state;
    // WebAudioFont is intentionally scoped to Mosaic Coast, tapas, and El Drac only.
    // Other biome and boss music paths keep using the existing bit/procedural audio.
    const PlayerCtor = globalThis.window?.WebAudioFontPlayer;
    if (!PlayerCtor) {
      return;
    }
    this.player = new PlayerCtor();
    const gain = this.context.createGain();
    gain.gain.value = BOSS_STATES.has(state) ? 0.16 : state === 'tapas-minigame' ? 0.13 : 0.1;
    gain.connect(this.context.destination);
    this.gain = gain;
    this.tick();
  }

  stop(): void {
    if (this.timer !== undefined) {
      globalThis.clearTimeout(this.timer);
    }
    this.timer = undefined;
    this.activeState = null;
    this.gain?.disconnect();
    this.gain = null;
    this.player = null;
    this.step = 0;
  }

  private tick(): void {
    if (!this.activeState || !this.player?.queueWaveTable || !this.gain) {
      return;
    }
    const notes = STATE_PATTERNS[this.activeState];
    const preset =
      globalThis.window?._tone_0240_JCLive_sf2_file ??
      globalThis.window?._tone_0260_JCLive_sf2_file ??
      globalThis.window?._tone_0320_JCLive_sf2_file ??
      {};
    const now = this.context.currentTime;
    const note = notes[this.step % notes.length] ?? notes[0];
    const boss = BOSS_STATES.has(this.activeState);
    const harmony = note + (boss ? 7 : 12);
    this.player.queueWaveTable(this.context, this.gain, preset, now, note, 0.42, 0.5);
    this.player.queueWaveTable(this.context, this.gain, preset, now + 0.02, harmony, 0.32, 0.22);
    if (this.activeState === 'mosaic-coast-sun' || boss) {
      this.player.queueWaveTable(this.context, this.gain, preset, now + 0.11, note + 24, 0.06, 0.16);
    }
    this.step += 1;
    const delay = boss ? 280 : this.activeState === 'mosaic-coast-shade' ? 520 : 360;
    this.timer = globalThis.setTimeout(() => this.tick(), delay);
  }
}
