export type SpanishWebAudioFontMood = 'explore' | 'boss';

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

const EXPLORE_NOTES = [52, 55, 59, 64, 62, 59, 55, 57] as const;
const BOSS_NOTES = [40, 47, 52, 55, 54, 52, 47, 43] as const;

export class SpanishWebAudioFontMusic {
  private player: WebAudioFontPlayerLike | null = null;
  private gain: GainNode | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private step = 0;
  private activeMood: SpanishWebAudioFontMood | null = null;

  constructor(private readonly context: AudioContext) {}

  start(mood: SpanishWebAudioFontMood): void {
    if (this.activeMood === mood && this.timer !== undefined) {
      return;
    }
    this.stop();
    this.activeMood = mood;
    const PlayerCtor = globalThis.window?.WebAudioFontPlayer;
    if (!PlayerCtor) {
      return;
    }
    this.player = new PlayerCtor();
    const gain = this.context.createGain();
    gain.gain.value = mood === 'boss' ? 0.16 : 0.1;
    gain.connect(this.context.destination);
    this.gain = gain;
    this.tick();
  }

  stop(): void {
    if (this.timer !== undefined) {
      globalThis.clearTimeout(this.timer);
    }
    this.timer = undefined;
    this.activeMood = null;
    this.gain?.disconnect();
    this.gain = null;
    this.player = null;
    this.step = 0;
  }

  private tick(): void {
    if (!this.activeMood || !this.player?.queueWaveTable || !this.gain) {
      return;
    }
    const notes = this.activeMood === 'boss' ? BOSS_NOTES : EXPLORE_NOTES;
    const preset =
      globalThis.window?._tone_0240_JCLive_sf2_file ??
      globalThis.window?._tone_0260_JCLive_sf2_file ??
      globalThis.window?._tone_0320_JCLive_sf2_file ??
      {};
    const now = this.context.currentTime;
    const note = notes[this.step % notes.length] ?? notes[0];
    const harmony = note + (this.activeMood === 'boss' ? 7 : 12);
    this.player.queueWaveTable(this.context, this.gain, preset, now, note, 0.42, 0.5);
    this.player.queueWaveTable(this.context, this.gain, preset, now + 0.02, harmony, 0.32, 0.22);
    this.step += 1;
    this.timer = globalThis.setTimeout(() => this.tick(), this.activeMood === 'boss' ? 280 : 360);
  }
}
