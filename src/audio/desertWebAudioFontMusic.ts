/**
 * Desert WebAudioFont Music
 *
 * Procedural desert-themed music for the Amber Dunes biome.
 * Features a droning oud-like melody with desert percussion and
 * a haunting ney-flute lead, evoking the vast golden sands.
 *
 * The wise old snake's desert wisdom:
 * - The wise old snake once got lost in the Amber Dunes. It was a long story.
 * - The wise old snake says the desert music sounds like sand dancing.
 * - The wise old snake prefers the desert at sunset.
 */

export type DesertMusicState =
  | 'amber-dunes-base'
  | 'amber-dunes-sunset'
  | 'amber-dunes-storm'
  | 'amber-dunes-oasis';

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
type WebAudioFontPreset = { zones: Array<Record<string, unknown>> };

declare global {
  interface Window {
    WebAudioFontPlayer?: WebAudioFontCtor;
  }
}

/**
 * Desert melody patterns in MIDI note numbers.
 * Based on Hijaz/Phrygian dominant scale feel (E-F-G#-A-B-C-D-E).
 */
const STATE_PATTERNS: Readonly<Record<DesertMusicState, readonly number[]>> = {
  'amber-dunes-base': [
    77, 80, 84, 87, 84, 80, 77, 75, 72, 75, 77, 80, 84, 87, 91, 87, 84, 80, 77, 75, 72, 70, 67, 70,
    72, 75, 77, 80, 84, 80, 77, 75,
  ],
  'amber-dunes-sunset': [
    77, 80, 84, 87, 91, 87, 84, 80, 77, 75, 72, 70, 67, 70, 72, 75, 77, 80, 84, 87, 84, 80, 77, 75,
    72, 70, 67, 65, 67, 70, 72, 75,
  ],
  'amber-dunes-storm': [
    65, 67, 70, 72, 70, 67, 65, 62, 60, 62, 65, 67, 70, 72, 75, 72, 70, 67, 65, 62, 60, 58, 55, 58,
    60, 62, 65, 67, 70, 67, 65, 62,
  ],
  'amber-dunes-oasis': [
    79, 82, 86, 89, 92, 89, 86, 82, 79, 77, 74, 77, 79, 82, 86, 89, 92, 89, 86, 82, 79, 77, 74, 72,
    70, 72, 74, 77, 79, 82, 86, 82,
  ],
};

const STORM_STATES = new Set<DesertMusicState>(['amber-dunes-storm']);

let cachedCtor: WebAudioFontCtor | null | undefined;

/**
 * Resolve the desert music state based on current biome conditions.
 */
export function resolveDesertMusicState(args: {
  biomeId: string;
  weather?: string;
  isSheltered?: boolean;
}): DesertMusicState | null {
  if (args.biomeId !== 'amber-dunes') {
    return null;
  }
  if (args.isSheltered) {
    return 'amber-dunes-oasis';
  }
  if (args.weather === 'storm') {
    return 'amber-dunes-storm';
  }
  // Sunset is simulated by lower energy state
  return 'amber-dunes-base';
}

/**
 * Desert WebAudioFont Music player.
 * Uses procedural synthesis to create an oud/ney desert soundscape.
 */
export class DesertWebAudioFontMusic {
  private player: WebAudioFontPlayerLike | null = null;
  private gain: GainNode | null = null;
  private preset: WebAudioFontPreset | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private step = 0;
  private activeState: DesertMusicState | null = null;
  private warnedUnavailable = false;

  constructor(private readonly context: AudioContext) {}

  start(state: DesertMusicState): void {
    if (this.activeState === state && this.timer !== undefined) {
      return;
    }
    this.stop();
    this.activeState = state;
    const PlayerCtor = this.resolvePlayerCtor();
    if (!PlayerCtor) {
      this.warnUnavailable('WebAudioFontPlayer could not be loaded; desert music is silent.');
      return;
    }
    this.player = new PlayerCtor();
    this.preset = this.createLocalPreset();
    const gain = this.context.createGain();
    gain.gain.value = STORM_STATES.has(state) ? 0.14 : 0.09;
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
    this.preset = null;
    this.step = 0;
  }

  private resolvePlayerCtor(): WebAudioFontCtor | null {
    if (cachedCtor !== undefined) {
      return cachedCtor;
    }
    if (globalThis.window?.WebAudioFontPlayer) {
      cachedCtor = globalThis.window.WebAudioFontPlayer;
      return cachedCtor;
    }
    try {
      // Lazy-load the WebAudioFont player
      const script = document.createElement('script');
      script.src = '/webaudiofont/WebAudioFontPlayer.js';
      script.onload = () => {
        if (globalThis.window?.WebAudioFontPlayer) {
          cachedCtor = globalThis.window.WebAudioFontPlayer;
        }
      };
      document.head.appendChild(script);
    } catch {
      cachedCtor = null;
    }
    return null;
  }

  private createLocalPreset(): WebAudioFontPreset {
    const sampleRate = this.context.sampleRate || 44100;
    const length = Math.floor(sampleRate * 0.38);
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 5.8);
      // Oud-like pluck: fundamental + harmonics with fast decay
      data[i] =
        (Math.sin(2 * Math.PI * 196 * t) * 0.55 +
          Math.sin(2 * Math.PI * 392 * t) * 0.28 +
          Math.sin(2 * Math.PI * 588 * t) * 0.12 +
          Math.sin(2 * Math.PI * 784 * t) * 0.05) *
        decay;
    }
    return {
      zones: [
        {
          keyRangeLow: 0,
          keyRangeHigh: 127,
          originalPitch: 6000,
          coarseTune: 0,
          fineTune: 0,
          loopStart: 0,
          loopEnd: 0,
          buffer,
          ahdsr: [
            { duration: 0.008, volume: 0 },
            { duration: 0.025, volume: 1 },
            { duration: 0.15, volume: 0.5 },
            { duration: 0.2, volume: 0 },
          ],
        },
      ],
    };
  }

  private warnUnavailable(message: string): void {
    if (this.warnedUnavailable) {
      return;
    }
    this.warnedUnavailable = true;
    console.warn(`[DesertMusic] ${message}`);
  }

  private tick(): void {
    if (!this.activeState || !this.player?.queueWaveTable || !this.gain || !this.preset) {
      return;
    }
    const notes = STATE_PATTERNS[this.activeState];
    const now = this.context.currentTime;
    const note = notes[this.step % notes.length] ?? notes[0];
    const isStorm = STORM_STATES.has(this.activeState);

    // Main melody (oud-like)
    this.player.queueWaveTable(this.context, this.gain, this.preset, now, note, 0.38, 0.45);

    // Harmony fifth above (sparse)
    if (!isStorm && this.step % 4 === 0) {
      this.player.queueWaveTable(
        this.context,
        this.gain,
        this.preset,
        now + 0.01,
        note + 7,
        0.38,
        0.2,
      );
    }

    // Bass drone (persistent)
    if (this.step % 8 === 0) {
      this.player.queueWaveTable(this.context, this.gain, this.preset, now, note - 12, 0.5, 0.25);
    }

    // Storm: add dissonant low rumble
    if (isStorm) {
      this.player.queueWaveTable(this.context, this.gain, this.preset, now, note - 19, 0.45, 0.35);
    }

    this.step += 1;
    const delay = isStorm ? 220 : this.activeState === 'amber-dunes-oasis' ? 500 : 340;
    this.timer = globalThis.setTimeout(() => this.tick(), delay);
  }
}
