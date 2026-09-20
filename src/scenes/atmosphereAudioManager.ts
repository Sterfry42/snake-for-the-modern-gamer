/**
 * Atmosphere Audio Manager
 *
 * Handles all atmosphere-related audio: weather noise loops, Spanish music,
 * desert music, and thunder effects.  Also manages day-change notifications
 * and weather cycling.
 */
import Phaser from 'phaser';
import type { SnakeGame } from '../game/snakeGame.js';
import type { ResolvedAtmosphereView, GlobalWeather } from '../world/atmosphereTypes.js';
import {
  resolveSpanishWebAudioFontState as resolveSpanishMusicState,
  SpanishWebAudioFontMusic,
  type SpanishWebAudioFontState,
} from '../audio/spanishWebAudioFontMusic.js';
import {
  resolveDesertMusicState,
  DesertWebAudioFontMusic,
} from '../audio/desertWebAudioFontMusic.js';

interface AtmosphereAudioManagerDependencies {
  snakeGame: SnakeGame;
  getTime: () => number;
  showQuestHintPopup: (message: string, color?: string) => void;
  isDirty: boolean;
  setIsDirty: (value: boolean) => void;
  titleVisible: boolean;
  paused: boolean;
}

export class AtmosphereAudioManager {
  private readonly snakeGame: SnakeGame;
  private readonly getTime: () => number;
  private readonly showQuestHintPopup: (message: string, color?: string) => void;
  private readonly setIsDirty: (value: boolean) => void;
  private readonly titleVisible: boolean;
  private readonly paused: boolean;

  private atmosphereAudioContext: AudioContext | null = null;
  private atmosphereNoiseSource: AudioBufferSourceNode | null = null;
  private atmosphereGain: GainNode | null = null;
  private atmosphereFilter: BiquadFilterNode | null = null;
  private atmosphereAudioKey = 'none';
  private spanishMusic: SpanishWebAudioFontMusic | null = null;
  private spanishMusicKey = 'none';
  private desertMusic: DesertWebAudioFontMusic | null = null;
  private desertMusicKey = 'none';
  private lastAtmosphereWorldDay = 0;
  private nextThunderAtMs = 0;

  constructor(dependencies: AtmosphereAudioManagerDependencies) {
    this.snakeGame = dependencies.snakeGame;
    this.getTime = dependencies.getTime;
    this.showQuestHintPopup = dependencies.showQuestHintPopup;
    this.setIsDirty = dependencies.setIsDirty;
    this.titleVisible = dependencies.titleVisible;
    this.paused = dependencies.paused;
  }

  /**
   * Advance atmosphere simulation time.
   */
  advance(deltaMs: number): void {
    const beforeDay = this.snakeGame.getAtmosphereState().worldDay;
    const atmosphere = this.snakeGame.updateAtmosphere(deltaMs);
    if (atmosphere.worldDay > beforeDay) {
      this.notifyDay(atmosphere.worldDay);
    }
    if (!this.titleVisible && !this.paused) {
      this.setIsDirty(true);
    }
  }

  /**
   * Cycle to the next weather state.
   */
  cycleWeather(): void {
    const order: GlobalWeather[] = [
      'clear',
      'rain',
      'storm',
      'fog',
      'heatwave',
      'coldfront',
      'wind',
    ];
    const current = this.snakeGame.getAtmosphereState().globalWeather;
    const next = order[(order.indexOf(current) + 1 + order.length) % order.length] ?? 'clear';
    this.snakeGame.forceAtmosphereWeather(next);
    this.setIsDirty(true);
  }

  /**
   * Update all atmosphere audio based on current view state.
   */
  updateAudio(view: ResolvedAtmosphereView): void {
    this.updateSpanishMusic(view);
    this.updateDesertMusic(view);
    if (view.sheltered) {
      if (this.atmosphereAudioKey !== 'none') {
        this.atmosphereAudioKey = 'none';
        this.stopAudio();
      }
      return;
    }
    const key = this.getAudioKey(view);
    if (key !== this.atmosphereAudioKey) {
      this.atmosphereAudioKey = key;
      this.configureLoop(key, view);
    }
    if (
      (view.localVisual === 'thunder' ||
        view.localVisual === 'dryLightning' ||
        view.state.globalWeather === 'storm') &&
      this.getTime() >= this.nextThunderAtMs
    ) {
      this.playThunderCrack(view);
      this.nextThunderAtMs =
        this.getTime() + 2200 + ((view.state.weatherSeed + this.getTime()) % 3800);
    }
  }

  /**
   * Clean up all audio resources.
   */
  destroy(): void {
    this.spanishMusic?.stop();
    this.spanishMusic = null;
    this.spanishMusicKey = 'none';
    this.stopAudio();
    this.atmosphereNoiseSource?.stop();
    this.atmosphereNoiseSource = null;
    this.atmosphereGain = null;
    this.atmosphereFilter = null;
    this.atmosphereAudioContext?.close().catch(() => undefined);
    this.atmosphereAudioContext = null;
    this.atmosphereAudioKey = 'none';
  }

  private notifyDay(worldDay: number): void {
    if (worldDay <= this.lastAtmosphereWorldDay) {
      return;
    }
    this.lastAtmosphereWorldDay = worldDay;
    const displayDay = worldDay + 1;
    if (displayDay >= 2) {
      this.showQuestHintPopup(`Day ${displayDay}`, '#fff0a8');
    }
  }

  private updateSpanishMusic(view: ResolvedAtmosphereView): void {
    const room = this.snakeGame.getCurrentRoom();
    const state = this.resolveSpanishMusicState(view, room);
    const key = state ?? 'none';
    if (key === this.spanishMusicKey) {
      return;
    }
    this.spanishMusicKey = key;
    if (!state) {
      this.spanishMusic?.stop();
      return;
    }
    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }
    context.resume().catch(() => undefined);
    this.spanishMusic ??= new SpanishWebAudioFontMusic(context);
    this.spanishMusic.start(state);
  }

  private resolveSpanishMusicState(
    view: ResolvedAtmosphereView,
    room: ReturnType<SnakeGame['getCurrentRoom']>,
  ): SpanishWebAudioFontState | null {
    return resolveSpanishMusicState({
      biomeId: view.biomeId,
      archetypeId: room.archetypeId,
      hasTapas: Boolean(room.mosaicCoast?.tapasBar),
      exposure: this.snakeGame.getFlag<SpanishWebAudioFontState | string>('mosaicCoast.exposure'),
    });
  }

  private updateDesertMusic(view: ResolvedAtmosphereView): void {
    const state = resolveDesertMusicState({
      biomeId: view.biomeId,
      weather: view.state.globalWeather,
      isSheltered: view.sheltered,
    });
    const key = state ?? 'none';
    if (key === this.desertMusicKey) {
      return;
    }
    this.desertMusicKey = key;
    if (!state) {
      this.desertMusic?.stop();
      return;
    }
    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }
    context.resume().catch(() => undefined);
    this.desertMusic ??= new DesertWebAudioFontMusic(context);
    this.desertMusic.start(state);
  }

  private getAudioKey(view: ResolvedAtmosphereView): string {
    switch (view.localVisual) {
      case 'rain':
      case 'heavyRain':
      case 'monsoon':
      case 'neonRain':
      case 'oilRain':
      case 'seaSpray':
      case 'caveDrip':
        return 'rain';
      case 'thunder':
      case 'dryLightning':
        return 'storm';
      case 'snow':
      case 'sleet':
      case 'whiteout':
      case 'fog':
      case 'mist':
      case 'steam':
        return 'mist';
      case 'dustStorm':
      case 'ashfall':
      case 'boneDust':
      case 'leafFall':
      case 'petals':
      case 'sporeCloud':
      case 'fallout':
        return 'wind';
      default:
        return 'none';
    }
  }

  private configureLoop(key: string, view: ResolvedAtmosphereView): void {
    if (key === 'none') {
      this.stopAudio();
      return;
    }
    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }
    context.resume().catch(() => undefined);
    if (!this.atmosphereNoiseSource || !this.atmosphereGain || !this.atmosphereFilter) {
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      gain.gain.value = 0;
      source.start();
      this.atmosphereNoiseSource = source;
      this.atmosphereFilter = filter;
      this.atmosphereGain = gain;
    }
    const intensity = Phaser.Math.Clamp(view.state.weatherIntensity, 0.35, 1);
    const volume =
      key === 'storm'
        ? 0.12 + intensity * 0.08
        : key === 'rain'
          ? 0.08 + intensity * 0.08
          : 0.035 + intensity * 0.04;
    this.atmosphereFilter.type =
      key === 'mist' ? 'lowpass' : key === 'wind' ? 'bandpass' : 'highpass';
    this.atmosphereFilter.frequency.setTargetAtTime(
      key === 'storm' ? 1600 : key === 'rain' ? 2200 : key === 'wind' ? 520 : 740,
      context.currentTime,
      0.08,
    );
    this.atmosphereFilter.Q.setTargetAtTime(key === 'wind' ? 4 : 0.7, context.currentTime, 0.08);
    this.atmosphereGain.gain.setTargetAtTime(volume, context.currentTime, 0.18);
  }

  private playThunderCrack(view: ResolvedAtmosphereView): void {
    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }
    const buffer = context.createBuffer(
      1,
      Math.floor(context.sampleRate * 0.9),
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.7);
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = view.localVisual === 'dryLightning' ? 900 : 520;
    gain.gain.value = view.localVisual === 'dryLightning' ? 0.18 : 0.28;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.9);
    source.start();
    source.stop(context.currentTime + 0.95);
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.atmosphereAudioContext) {
      return this.atmosphereAudioContext;
    }
    try {
      const AudioContextCtor = globalThis.AudioContext;
      if (!AudioContextCtor) {
        return null;
      }
      this.atmosphereAudioContext = new AudioContextCtor();
      return this.atmosphereAudioContext;
    } catch {
      return null;
    }
  }

  private stopAudio(): void {
    if (this.atmosphereGain && this.atmosphereAudioContext) {
      this.atmosphereGain.gain.setTargetAtTime(0, this.atmosphereAudioContext.currentTime, 0.12);
    }
  }
}
