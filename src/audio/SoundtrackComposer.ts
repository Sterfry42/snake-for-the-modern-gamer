/**
 * Soundtrack Composer
 *
 * Real-time music composition engine that generates procedural music
 * from apple consumption. The wise old snake composes its own soundtrack,
 * note by note, bite by bite.
 *
 * The wise old snake's symphony grows with every apple eaten.
 * The wise old snake once composed a 47-part concerto from wasabi apples.
 * The wise old snake's music plays even in silence.
 */

import type {
  AppleMusicalMapping,
  AppleGenre,
  AppleNoteAssignment,
  GenreDefinition,
} from './MusicalAppleMap.js';
import {
  getAppleMusicalMapping,
  midiNoteToFrequency,
  getGenreDefinition,
} from './MusicalAppleMap.js';

/** State of the composition engine */
export type ComposerState = 'idle' | 'playing' | 'paused';

/** Current genre and its tempo information */
export interface GenreState {
  genre: AppleGenre | null;
  tempoMultiplier: number;
  baseBpm: number;
  scalePattern: number[];
  dominantInstrument: string;
}

/** A single note event in the composition */
export interface NoteEvent {
  /** MIDI note number */
  note: number;
  /** Duration in beats */
  duration: number;
  /** Velocity (0-127) */
  velocity: number;
  /** Time offset from start (seconds) */
  timeOffset: number;
  /** Apple type that triggered this note */
  appleId: string;
  /** Instrument family */
  instrumentFamily: string;
  /** Whether this is a rhythm beat (percussion) */
  isPercussion: boolean;
}

/** Audio nodes for the composition engine */
interface AudioNodes {
  context: AudioContext;
  masterGain: GainNode;
  compressor: DynamicsCompressorNode;
  analyser: AnalyserNode;
  reverbGain: GainNode;
  reverbDry: GainNode;
  delayNode: DelayNode;
  delayFeedback: GainNode;
}

/** Configuration for the composer */
export interface SoundtrackComposerConfig {
  /** Base BPM (beats per minute) */
  baseBpm?: number;
  /** Master volume (0-1) */
  masterVolume?: number;
  /** Reverb mix amount (0-1) */
  reverbMix?: number;
  /** Delay feedback amount (0-1) */
  delayFeedback?: number;
  /** Whether to enable the analyser for visualizer */
  enableAnalyser?: boolean;
  /** Analyser FFT size */
  analyserFftSize?: number;
}

/** Default configuration */
const DEFAULT_CONFIG: Required<SoundtrackComposerConfig> = {
  baseBpm: 120,
  masterVolume: 0.5,
  reverbMix: 0.25,
  delayFeedback: 0.15,
  enableAnalyser: true,
  analyserFftSize: 256,
};

/**
 * Soundtrack Composer — generates and plays procedural music
 * from apple consumption events.
 */
export class SoundtrackComposer {
  private state: ComposerState = 'idle';
  private config: Required<SoundtrackComposerConfig>;
  private audioNodes: AudioNodes | null = null;
  private noteQueue: NoteEvent[] = [];
  private scheduledUntil = 0;
  private nextNoteTime = 0;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private currentGenre: GenreState = {
    genre: null,
    tempoMultiplier: 1,
    baseBpm: 120,
    scalePattern: [0, 2, 4, 5, 7],
    dominantInstrument: 'percussion',
  };
  private beatCounter = 0;
  private lastAppleId = '';
  private appleSequence: string[] = [];
  private sequenceBuffer: string[] = [];
  private sequenceBufferSize = 20;
  private isRhythmMode = false;
  private rhythmTargetSequence: string[] = [];
  private rhythmProgress = 0;
  private rhythmScore = 0;
  private onNotePlayedCallback?: (event: NoteEvent) => void;
  private onGenreChangeCallback?: (genre: AppleGenre | null) => void;
  private onRhythmUpdateCallback?: (progress: number, score: number) => void;

  constructor(config?: SoundtrackComposerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the audio context and nodes.
   * Must be called from a user gesture handler.
   */
  initialize(): boolean {
    try {
      const AudioContextCtor = globalThis.AudioContext;
      if (!AudioContextCtor) {
        return false;
      }

      const context = new AudioContextCtor();
      const masterGain = context.createGain();
      masterGain.gain.value = this.config.masterVolume;

      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      const analyser = context.createAnalyser();
      analyser.fftSize = this.config.analyserFftSize ?? 256;
      analyser.smoothingTimeConstant = 0.8;

      const reverbDry = context.createGain();
      reverbDry.gain.value = 1 - this.config.reverbMix;

      const reverbGain = context.createGain();
      reverbGain.gain.value = this.config.reverbMix;

      // Create simple convolution reverb
      const reverbBuffer = this.createReverbBuffer(context);
      const reverbConvolver = context.createConvolver();
      reverbConvolver.buffer = reverbBuffer;

      const delayNode = context.createDelay(2.0);
      delayNode.delayTime.value = 0.3;
      const delayFeedback = context.createGain();
      delayFeedback.gain.value = this.config.delayFeedback;

      // Routing
      masterGain.connect(compressor);
      compressor.connect(reverbDry);
      compressor.connect(reverbConvolver);
      reverbConvolver.connect(reverbGain);
      reverbDry.connect(context.destination);
      reverbGain.connect(context.destination);

      // Delay loop
      compressor.connect(delayNode);
      delayNode.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayNode.connect(reverbDry);

      this.audioNodes = {
        context,
        masterGain,
        compressor,
        analyser,
        reverbGain,
        reverbDry,
        delayNode,
        delayFeedback,
      };

      this.state = 'idle';
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a simple reverb impulse response.
   */
  private createReverbBuffer(context: AudioContext): AudioBuffer {
    const length = context.sampleRate * 2;
    const buffer = context.createBuffer(2, length, context.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / context.sampleRate;
        const decay = Math.exp(-t * 3);
        data[i] = (Math.random() * 2 - 1) * decay;
      }
    }

    return buffer;
  }

  /**
   * Start the composition engine.
   */
  start(): void {
    if (!this.audioNodes) {
      if (!this.initialize()) {
        return;
      }
    }

    if (this.state === 'playing') {
      return;
    }

    const context = this.audioNodes!.context;
    if (context.state === 'suspended') {
      context.resume().catch(() => undefined);
    }

    this.state = 'playing';
    this.nextNoteTime = context.currentTime;
    this.scheduledUntil = 0;
    this.scheduleLoop();
  }

  /**
   * Stop the composition engine.
   */
  stop(): void {
    this.state = 'idle';
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.noteQueue = [];
  }

  /**
   * Pause the composition.
   */
  pause(): void {
    if (this.state !== 'playing') {
      return;
    }
    this.state = 'paused';
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Resume from pause.
   */
  resume(): void {
    if (this.state !== 'paused') {
      return;
    }
    this.state = 'playing';
    if (this.audioNodes) {
      this.nextNoteTime = this.audioNodes.context.currentTime;
    }
    this.scheduleLoop();
  }

  /**
   * Set the master volume.
   */
  setVolume(volume: number): void {
    if (!this.audioNodes) return;
    const clamped = Math.max(0, Math.min(1, volume));
    this.audioNodes.masterGain.gain.setTargetAtTime(
      clamped,
      this.audioNodes.context.currentTime,
      0.05,
    );
  }

  /**
   * Get the current state.
   */
  getState(): ComposerState {
    return this.state;
  }

  /**
   * Get the current genre state.
   */
  getGenreState(): GenreState {
    return { ...this.currentGenre };
  }

  /**
   * Get the analyser node for visualizer data.
   */
  getAnalyser(): AnalyserNode | null {
    return this.audioNodes?.analyser ?? null;
  }

  /**
   * Get frequency data for visualizer.
   */
  getFrequencyData(): Uint8Array | null {
    const analyser = this.getAnalyser();
    if (!analyser) return null;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    return data;
  }

  /**
   * Get time domain data for waveform visualization.
   */
  getTimeDomainData(): Uint8Array | null {
    const analyser = this.getAnalyser();
    if (!analyser) return null;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    return data;
  }

  /**
   * Register a callback for when a note is played.
   */
  onNotePlayed(callback: (event: NoteEvent) => void): void {
    this.onNotePlayedCallback = callback;
  }

  /**
   * Register a callback for genre changes.
   */
  onGenreChange(callback: (genre: AppleGenre | null) => void): void {
    this.onGenreChangeCallback = callback;
  }

  /**
   * Register a callback for rhythm mini-game updates.
   */
  onRhythmUpdate(callback: (progress: number, score: number) => void): void {
    this.onRhythmUpdateCallback = callback;
  }

  /**
   * Process an apple being eaten — adds a note to the composition.
   */
  onAppleEaten(appleId: string): void {
    if (this.state !== 'playing' || !this.audioNodes) {
      return;
    }

    // Track the apple sequence
    this.appleSequence.push(appleId);
    this.sequenceBuffer.push(appleId);
    if (this.sequenceBuffer.length > this.sequenceBufferSize) {
      this.sequenceBuffer.shift();
    }

    // Check for genre change
    this.updateGenre();

    // Check for rhythm mini-game progress
    if (this.isRhythmMode) {
      this.checkRhythmInput(appleId);
      return;
    }

    // Get the musical mapping
    const mapping = getAppleMusicalMapping(appleId);
    if (!mapping) {
      // Default to normal percussion
      this.playDefaultPercussion(appleId);
      return;
    }

    // Play the note(s) for this apple
    this.playAppleNotes(mapping, appleId);
  }

  /**
   * Start rhythm mini-game mode.
   */
  startRhythmMode(targetSequence: string[]): void {
    this.isRhythmMode = true;
    this.rhythmTargetSequence = targetSequence;
    this.rhythmProgress = 0;
    this.rhythmScore = 0;
  }

  /**
   * End rhythm mini-game mode.
   */
  endRhythmMode(): void {
    this.isRhythmMode = false;
    this.rhythmTargetSequence = [];
  }

  /**
   * Check if the current input matches the rhythm target.
   */
  private checkRhythmInput(appleId: string): void {
    if (this.rhythmProgress >= this.rhythmTargetSequence.length) {
      return;
    }

    const expected = this.rhythmTargetSequence[this.rhythmProgress];
    if (appleId === expected) {
      this.rhythmProgress++;
      this.rhythmScore += 10;

      // Play a success sound
      if (this.audioNodes) {
        this.playSuccessTone(this.audioNodes.context.currentTime);
      }

      if (this.onRhythmUpdateCallback) {
        const progress = this.rhythmProgress / this.rhythmTargetSequence.length;
        this.onRhythmUpdateCallback(progress, this.rhythmScore);
      }

      if (this.rhythmProgress >= this.rhythmTargetSequence.length) {
        // Rhythm mini-game complete!
        if (this.onRhythmUpdateCallback) {
          this.onRhythmUpdateCallback(1, this.rhythmScore);
        }
      }
    } else {
      // Wrong note - play a failure sound
      if (this.audioNodes) {
        this.playFailTone(this.audioNodes.context.currentTime);
      }
      this.rhythmScore = Math.max(0, this.rhythmScore - 5);
      if (this.onRhythmUpdateCallback) {
        const progress = this.rhythmProgress / this.rhythmTargetSequence.length;
        this.onRhythmUpdateCallback(progress, this.rhythmScore);
      }
    }
  }

  /**
   * Update the current genre based on recent apple consumption.
   */
  private updateGenre(): void {
    const recentApples = this.sequenceBuffer;
    if (recentApples.length < 5) {
      return;
    }

    // Count apples by type in recent sequence
    const counts: Record<string, number> = {};
    for (const appleId of recentApples) {
      counts[appleId] = (counts[appleId] ?? 0) + 1;
    }

    let bestGenre: AppleGenre | null = null;
    let bestScore = 0;

    for (const genreDef of [
      getGenreDefinition('calm'),
      getGenreDefinition('energetic'),
      getGenreDefinition('mysterious'),
      getGenreDefinition('festival'),
    ]) {
      if (!genreDef) continue;

      let score = 0;
      for (const [appleId, minCount] of Object.entries(genreDef.minimumCounts)) {
        const actualCount = counts[appleId] ?? 0;
        if (actualCount >= minCount) {
          score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestGenre = genreDef.id;
      }
    }

    // Only change genre if we have enough evidence
    if (bestGenre && bestScore >= 2 && bestGenre !== this.currentGenre.genre) {
      const previousGenre = this.currentGenre.genre;
      this.currentGenre = {
        genre: bestGenre,
        tempoMultiplier: bestGenre
          ? (getGenreDefinition(bestGenre)?.tempoMultiplier ?? 1)
          : 1,
        baseBpm: this.config.baseBpm * (bestGenre
          ? (getGenreDefinition(bestGenre)?.tempoMultiplier ?? 1)
          : 1),
        scalePattern: bestGenre
          ? (getGenreDefinition(bestGenre)?.scalePattern ?? [0, 2, 4, 5, 7])
          : [0, 2, 4, 5, 7],
        dominantInstrument: bestGenre
          ? (getGenreDefinition(bestGenre)?.dominantInstrument ?? 'percussion')
          : 'percussion',
      };

      if (this.onGenreChangeCallback && previousGenre !== bestGenre) {
        this.onGenreChangeCallback(bestGenre);
      }
    }
  }

  /**
   * Play notes for a given apple mapping.
   */
  private playAppleNotes(mapping: AppleMusicalMapping, appleId: string): void {
    if (!this.audioNodes) return;

    const context = this.audioNodes.context;
    const now = context.currentTime;
    const beatDuration = 60 / this.currentGenre.baseBpm;

    for (const noteAssign of mapping.noteAssignments) {
      // Apply octave variation for variety
      const octaveOffset = Math.floor(this.beatCounter / 4) % (mapping.noteAssignments.length + 1);
      const finalNote = noteAssign.baseNote + (noteAssign.octaveVariation + octaveOffset) * 12;
      const frequency = midiNoteToFrequency(finalNote);

      // Apply genre scale
      const scaleNote = this.applyScale(finalNote, mapping.scaleDegree);

      // Schedule the sound
      this.scheduleNote(
        context,
        now + (this.beatCounter * beatDuration),
        frequency,
        noteAssign.duration * beatDuration * this.currentGenre.tempoMultiplier,
        (noteAssign.velocity / 127) * 0.6,
        mapping,
        appleId,
      );
    }

    this.beatCounter++;
  }

  /**
   * Apply the current genre scale to a note.
   */
  private applyScale(note: number, scaleDegree: number): number {
    const scale = this.currentGenre.scalePattern;
    const baseNote = Math.floor(note / 12) * 12; // Find the octave base
    const degreeInOctave = scaleDegree % scale.length;
    return baseNote + scale[degreeInOctave];
  }

  /**
   * Schedule a single note event.
   */
  private scheduleNote(
    context: AudioContext,
    time: number,
    frequency: number,
    duration: number,
    velocity: number,
    mapping: AppleMusicalMapping,
    appleId: string,
  ): void {
    const isPercussion = mapping.instrumentFamily === 'percussion' ||
      mapping.instrumentFamily === 'erratic';

    // Create oscillators based on instrument family
    const primaryOsc = context.createOscillator();
    primaryOsc.type = mapping.synthParams.waveform;
    primaryOsc.frequency.value = frequency;

    let secondaryOsc: OscillatorNode | null = null;
    if (mapping.synthParams.secondaryWaveform) {
      secondaryOsc = context.createOscillator();
      secondaryOsc.type = mapping.synthParams.secondaryWaveform;
      secondaryOsc.frequency.value = frequency * 1.002; // Slight detune
    }

    // Create filter
    const filter = context.createBiquadFilter();
    filter.type = mapping.synthParams.filterType;
    filter.frequency.value = mapping.synthParams.filterCutoff;
    filter.Q.value = mapping.synthParams.filterQ;

    // Create ADSR envelope
    const envelope = context.createGain();
    const now = time;
    const { attack, decay, sustain, release } = mapping.synthParams;
    const peakVolume = velocity;

    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(peakVolume, now + attack);
    envelope.gain.linearRampToValueAtTime(peakVolume * sustain, now + attack + decay);
    envelope.gain.setValueAtTime(peakVolume * sustain, now + duration - release);
    envelope.gain.linearRampToValueAtTime(0, now + duration);

    // Connect graph
    primaryOsc.connect(filter);
    if (secondaryOsc) {
      secondaryOsc.connect(filter);
    }
    filter.connect(envelope);
    envelope.connect(this.audioNodes!.masterGain);

    // Start and stop
    primaryOsc.start(now);
    primaryOsc.stop(now + duration + 0.01);
    if (secondaryOsc) {
      secondaryOsc.start(now);
      secondaryOsc.stop(now + duration + 0.01);
    }

    // Create note event for callbacks
    const noteEvent: NoteEvent = {
      note: Math.round(frequency / 440 * 12 + 69),
      duration,
      velocity: Math.round(velocity * 127),
      timeOffset: time - context.currentTime,
      appleId,
      instrumentFamily: mapping.instrumentFamily,
      isPercussion,
    };

    // Schedule callback
    const delay = Math.max(0, (time - context.currentTime) * 1000);
    setTimeout(() => {
      if (this.onNotePlayedCallback) {
        this.onNotePlayedCallback(noteEvent);
      }
    }, delay);
  }

  /**
   * Play default percussion when no mapping exists.
   */
  private playDefaultPercussion(appleId: string): void {
    if (!this.audioNodes) return;

    const context = this.audioNodes.context;
    const now = context.currentTime;
    const beatDuration = 60 / this.currentGenre.baseBpm;

    // Simple drum hit
    const osc = context.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.4, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    osc.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.audioNodes.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);

    this.beatCounter++;
  }

  /**
   * Play a success tone for rhythm mini-game.
   */
  private playSuccessTone(time: number): void {
    if (!this.audioNodes) return;
    const context = this.audioNodes.context;

    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, time); // C5
    osc.frequency.setValueAtTime(659, time + 0.08); // E5
    osc.frequency.setValueAtTime(784, time + 0.16); // G5

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.3, time);
    envelope.gain.setValueAtTime(0.3, time + 0.2);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(envelope);
    envelope.connect(this.audioNodes.masterGain);

    osc.start(time);
    osc.stop(time + 0.35);
  }

  /**
   * Play a fail tone for rhythm mini-game.
   */
  private playFailTone(time: number): void {
    if (!this.audioNodes) return;
    const context = this.audioNodes.context;

    const osc = context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.linearRampToValueAtTime(150, time + 0.15);

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.2, time);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    osc.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.audioNodes.masterGain);

    osc.start(time);
    osc.stop(time + 0.25);
  }

  /**
   * Main scheduling loop — keeps notes flowing.
   */
  private scheduleLoop(): void {
    if (this.state !== 'playing' || !this.audioNodes) {
      return;
    }

    const context = this.audioNodes.context;
    const lookAhead = 0.5; // seconds to look ahead
    const scheduleInterval = 50; // ms between schedule calls

    while (this.nextNoteTime < context.currentTime + lookAhead) {
      // Add background notes if idle (no recent apples)
      if (this.appleSequence.length === 0) {
        this.playBackgroundNote(context, this.nextNoteTime);
      }

      this.nextNoteTime += 60 / this.currentGenre.baseBpm;
    }

    this.timerId = setTimeout(() => this.scheduleLoop(), scheduleInterval);
  }

  /**
   * Play ambient background note when no apples have been eaten.
   */
  private playBackgroundNote(context: AudioContext, time: number): void {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = midiNoteToFrequency(48 + (this.beatCounter % 5) * 3);

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(0.05, time + 0.5);
    envelope.gain.linearRampToValueAtTime(0.05, time + 2);
    envelope.gain.linearRampToValueAtTime(0, time + 2.5);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    osc.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.audioNodes!.masterGain);

    osc.start(time);
    osc.stop(time + 2.6);

    this.beatCounter++;
  }

  /**
   * Destroy all audio resources.
   */
  destroy(): void {
    this.stop();
    if (this.audioNodes) {
      this.audioNodes.context.close().catch(() => undefined);
      this.audioNodes = null;
    }
  }
}
