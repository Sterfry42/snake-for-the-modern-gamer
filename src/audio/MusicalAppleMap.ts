/**
 * Musical Apple Map
 *
 * Maps each apple type to its musical role, instrument family, pitch range,
 * and timing parameters. The wise old snake's soundtrack grows with every bite.
 *
 * The wise old snake once said: "Every apple is a note in the grand symphony."
 * The wise old snake's favorite melody was composed from 42 wasabi apples.
 * The wise old snake claims the gold apple sounds like angels singing.
 * The wise old snake's playlist has 999 tracks, all self-composed.
 * The wise old snake once danced to a mochi apple waltz for three hours.
 */

/** Instrument families available in the musical apple system */
export type InstrumentFamily =
  | 'percussion'
  | 'synth'
  | 'pad'
  | 'strings'
  | 'marimba'
  | 'brass'
  | 'choir'
  | 'water'
  | 'bass'
  | 'erratic'
  | 'melody'
  | 'harmony';

/** Musical role an apple plays in the soundtrack */
export type AppleMusicalRole =
  | 'drumBeat'
  | 'tempoSynth'
  | 'etherealPad'
  | 'warmString'
  | 'softMarimba'
  | 'sharpBrass'
  | 'choirHarmony'
  | 'erraticPerc'
  | 'flowingWater'
  | 'deepBass'
  | 'erraticMelody'
  | 'harmonyLayer';

/** Base note assignments (MIDI note numbers) for each apple type */
export interface AppleNoteAssignment {
  /** Base MIDI note (C-1 to G9 range: 12-108) */
  baseNote: number;
  /** Note duration in beats (1 = quarter note) */
  duration: number;
  /** Velocity (0-127, mapped to volume) */
  velocity: number;
  /** Octave offset for variety */
  octaveVariation: number;
}

/** Musical mapping for a single apple type */
export interface AppleMusicalMapping {
  /** Apple behavior type ID */
  appleBehavior: string;
  /** Apple ID (more specific than behavior) */
  appleId: string;
  /** Instrument family this apple represents */
  instrumentFamily: InstrumentFamily;
  /** Musical role in the soundtrack */
  musicalRole: AppleMusicalRole;
  /** Note assignments — may have multiple for complex apples */
  noteAssignments: AppleNoteAssignment[];
  /** Scale degree this apple belongs to (0=tonic, 7=octave) */
  scaleDegree: number;
  /** Whether this apple triggers a genre shift */
  triggersGenreShift: boolean;
  /** Genre genres this apple contributes to */
  genreContributions: AppleGenre[];
  /** Melody fragment this apple may unlock */
  melodyFragmentId?: string;
  /** Sound synthesis parameters */
  synthParams: AppleSynthParams;
}

/** Synthesis parameters for generating apple sounds procedurally */
export interface AppleSynthParams {
  /** Waveform type for the primary oscillator */
  waveform: OscillatorType;
  /** Secondary waveform (for richer sounds) */
  secondaryWaveform?: OscillatorType;
  /** Filter type */
  filterType: BiquadFilterType;
  /** Filter cutoff frequency (Hz) */
  filterCutoff: number;
  /** Filter Q/resonance */
  filterQ: number;
  /** Attack time (seconds) */
  attack: number;
  /** Decay time (seconds) */
  decay: number;
  /** Sustain level (0-1) */
  sustain: number;
  /** Release time (seconds) */
  release: number;
  /** Reverb mix amount (0-1) */
  reverbMix: number;
  /** Delay feedback amount (0-1) */
  delayFeedback: number;
}

/** Genres the soundtrack can shift into */
export type AppleGenre = 'calm' | 'energetic' | 'mysterious' | 'festival';

/** Genre definitions with trigger conditions */
export interface AppleGenreDefinition {
  /** Genre ID */
  id: AppleGenre;
  /** Display label (i18n key) */
  labelKey: string;
  /** Apple behaviors that contribute to this genre */
  contributingApples: string[];
  /** Minimum count of each contributing apple to activate */
  minimumCounts: Record<string, number>;
  /** Tempo multiplier when this genre is active */
  tempoMultiplier: number;
  /** Default scale pattern for this genre */
  scalePattern: number[];
  /** Dominant instrument family */
  dominantInstrument: InstrumentFamily;
  /** Mood description */
  mood: string;
}

/** A melody fragment that can be unlocked */
export interface MelodyFragment {
  /** Unique fragment ID */
  id: string;
  /** Apple sequence required to unlock */
  requiredSequence: string[];
  /** Notes in the fragment (MIDI note numbers) */
  notes: number[];
  /** Durations in beats */
  durations: number[];
  /** Genre this fragment belongs to */
  genre: AppleGenre;
  /** Difficulty tier (1-5) */
  difficulty: number;
  /** Description (i18n key) */
  descriptionKey: string;
}

/** Complete genre definition with all fragments */
export interface GenreDefinition {
  /** Genre ID */
  id: AppleGenre;
  /** Display label (i18n key) */
  labelKey: string;
  /** Apple behaviors that contribute */
  contributingApples: string[];
  /** Minimum counts for activation */
  minimumCounts: Record<string, number>;
  /** Tempo multiplier */
  tempoMultiplier: number;
  /** Scale pattern */
  scalePattern: number[];
  /** Dominant instrument */
  dominantInstrument: InstrumentFamily;
  /** Mood */
  mood: string;
  /** Melody fragments in this genre */
  melodyFragments: MelodyFragment[];
  /** Total fragments needed for full track unlock */
  totalFragmentsNeeded: number;
}

/** Default mapping for the standard apple types */
export const DEFAULT_MUSICAL_MAPPINGS: AppleMusicalMapping[] = [
  // Normal apple = percussion (drum beat)
  {
    appleBehavior: 'normal',
    appleId: 'normal',
    instrumentFamily: 'percussion',
    musicalRole: 'drumBeat',
    noteAssignments: [
      { baseNote: 36, duration: 0.5, velocity: 100, octaveVariation: 0 },
    ],
    scaleDegree: 0,
    triggersGenreShift: false,
    genreContributions: [],
    synthParams: {
      waveform: 'square',
      filterType: 'lowpass',
      filterCutoff: 800,
      filterQ: 2,
      attack: 0.001,
      decay: 0.1,
      sustain: 0,
      release: 0.05,
      reverbMix: 0.1,
      delayFeedback: 0,
    },
  },
  // Caffeinated apple = fast tempo synth
  {
    appleBehavior: 'caffeinated',
    appleId: 'caffeinated',
    instrumentFamily: 'synth',
    musicalRole: 'tempoSynth',
    noteAssignments: [
      { baseNote: 60, duration: 0.25, velocity: 90, octaveVariation: 1 },
      { baseNote: 64, duration: 0.25, velocity: 70, octaveVariation: 1 },
    ],
    scaleDegree: 0,
    triggersGenreShift: true,
    genreContributions: ['energetic'],
    synthParams: {
      waveform: 'sawtooth',
      secondaryWaveform: 'square',
      filterType: 'bandpass',
      filterCutoff: 3000,
      filterQ: 5,
      attack: 0.005,
      decay: 0.08,
      sustain: 0.3,
      release: 0.03,
      reverbMix: 0.15,
      delayFeedback: 0.3,
    },
  },
  // Lavender apple = ethereal pads
  {
    appleBehavior: 'lavender',
    appleId: 'lavender',
    instrumentFamily: 'pad',
    musicalRole: 'etherealPad',
    noteAssignments: [
      { baseNote: 55, duration: 2, velocity: 60, octaveVariation: 0 },
      { baseNote: 59, duration: 2, velocity: 50, octaveVariation: 0 },
      { baseNote: 62, duration: 2, velocity: 45, octaveVariation: 0 },
    ],
    scaleDegree: 4,
    triggersGenreShift: true,
    genreContributions: ['calm'],
    synthParams: {
      waveform: 'sine',
      secondaryWaveform: 'triangle',
      filterType: 'lowpass',
      filterCutoff: 1200,
      filterQ: 1,
      attack: 0.3,
      decay: 0.5,
      sustain: 0.7,
      release: 0.8,
      reverbMix: 0.6,
      delayFeedback: 0.2,
    },
  },
  // Love apple = warm strings
  {
    appleBehavior: 'love',
    appleId: 'love',
    instrumentFamily: 'strings',
    musicalRole: 'warmString',
    noteAssignments: [
      { baseNote: 57, duration: 1, velocity: 75, octaveVariation: 0 },
      { baseNote: 61, duration: 1, velocity: 65, octaveVariation: 0 },
    ],
    scaleDegree: 2,
    triggersGenreShift: true,
    genreContributions: ['calm'],
    synthParams: {
      waveform: 'sawtooth',
      filterType: 'lowpass',
      filterCutoff: 2000,
      filterQ: 1.5,
      attack: 0.15,
      decay: 0.2,
      sustain: 0.6,
      release: 0.4,
      reverbMix: 0.4,
      delayFeedback: 0.1,
    },
  },
  // Mochi apple = soft marimba
  {
    appleBehavior: 'mochi',
    appleId: 'mochi',
    instrumentFamily: 'marimba',
    musicalRole: 'softMarimba',
    noteAssignments: [
      { baseNote: 67, duration: 0.75, velocity: 85, octaveVariation: 0 },
    ],
    scaleDegree: 5,
    triggersGenreShift: false,
    genreContributions: ['calm'],
    synthParams: {
      waveform: 'sine',
      filterType: 'lowpass',
      filterCutoff: 2500,
      filterQ: 3,
      attack: 0.002,
      decay: 0.3,
      sustain: 0.1,
      release: 0.15,
      reverbMix: 0.3,
      delayFeedback: 0,
    },
  },
  // Wasabi apple = sharp brass stabs
  {
    appleBehavior: 'wasabi',
    appleId: 'wasabi',
    instrumentFamily: 'brass',
    musicalRole: 'sharpBrass',
    noteAssignments: [
      { baseNote: 52, duration: 0.3, velocity: 110, octaveVariation: 0 },
    ],
    scaleDegree: 7,
    triggersGenreShift: true,
    genreContributions: ['energetic', 'mysterious'],
    synthParams: {
      waveform: 'sawtooth',
      secondaryWaveform: 'square',
      filterType: 'highpass',
      filterCutoff: 400,
      filterQ: 4,
      attack: 0.005,
      decay: 0.06,
      sustain: 0.4,
      release: 0.04,
      reverbMix: 0.2,
      delayFeedback: 0.15,
    },
  },
  // Gold apple = choir/harmony
  {
    appleBehavior: 'gold',
    appleId: 'gold',
    instrumentFamily: 'choir',
    musicalRole: 'choirHarmony',
    noteAssignments: [
      { baseNote: 60, duration: 1.5, velocity: 70, octaveVariation: 0 },
      { baseNote: 64, duration: 1.5, velocity: 60, octaveVariation: 0 },
      { baseNote: 67, duration: 1.5, velocity: 55, octaveVariation: 0 },
    ],
    scaleDegree: 0,
    triggersGenreShift: true,
    genreContributions: ['mysterious', 'festival'],
    synthParams: {
      waveform: 'sine',
      secondaryWaveform: 'triangle',
      filterType: 'lowpass',
      filterCutoff: 1800,
      filterQ: 1,
      attack: 0.2,
      decay: 0.3,
      sustain: 0.8,
      release: 0.5,
      reverbMix: 0.7,
      delayFeedback: 0.1,
    },
  },
  // Skittish apple = erratic percussion
  {
    appleBehavior: 'skittish',
    appleId: 'skittish',
    instrumentFamily: 'erratic',
    musicalRole: 'erraticPerc',
    noteAssignments: [
      { baseNote: 38 + Math.floor(Math.random() * 24), duration: 0.15, velocity: 95, octaveVariation: 0 },
    ],
    scaleDegree: 0,
    triggersGenreShift: true,
    genreContributions: ['energetic'],
    synthParams: {
      waveform: 'square',
      filterType: 'highpass',
      filterCutoff: 600,
      filterQ: 6,
      attack: 0.001,
      decay: 0.05,
      sustain: 0,
      release: 0.02,
      reverbMix: 0.05,
      delayFeedback: 0.4,
    },
  },
  // Koi apple = flowing water sounds
  {
    appleBehavior: 'koi',
    appleId: 'koi',
    instrumentFamily: 'water',
    musicalRole: 'flowingWater',
    noteAssignments: [
      { baseNote: 72, duration: 1.5, velocity: 55, octaveVariation: 1 },
      { baseNote: 76, duration: 1.2, velocity: 50, octaveVariation: 1 },
    ],
    scaleDegree: 3,
    triggersGenreShift: true,
    genreContributions: ['mysterious'],
    synthParams: {
      waveform: 'sine',
      secondaryWaveform: 'sine',
      filterType: 'bandpass',
      filterCutoff: 4000,
      filterQ: 8,
      attack: 0.05,
      decay: 0.4,
      sustain: 0.5,
      release: 0.6,
      reverbMix: 0.5,
      delayFeedback: 0.25,
    },
  },
  // Cold Beer apple = deep bass
  {
    appleBehavior: 'coldBeer',
    appleId: 'coldBeer',
    instrumentFamily: 'bass',
    musicalRole: 'deepBass',
    noteAssignments: [
      { baseNote: 28, duration: 2, velocity: 100, octaveVariation: 0 },
    ],
    scaleDegree: 0,
    triggersGenreShift: false,
    genreContributions: [],
    synthParams: {
      waveform: 'sine',
      filterType: 'lowpass',
      filterCutoff: 300,
      filterQ: 2,
      attack: 0.02,
      decay: 0.3,
      sustain: 0.8,
      release: 0.2,
      reverbMix: 0.3,
      delayFeedback: 0,
    },
  },
  // Treat apple = melody (bonus instrument)
  {
    appleBehavior: 'treat',
    appleId: 'treat',
    instrumentFamily: 'melody',
    musicalRole: 'erraticMelody',
    noteAssignments: [
      { baseNote: 72, duration: 0.5, velocity: 80, octaveVariation: 1 },
    ],
    scaleDegree: 7,
    triggersGenreShift: false,
    genreContributions: ['festival'],
    synthParams: {
      waveform: 'triangle',
      filterType: 'lowpass',
      filterCutoff: 3000,
      filterQ: 2,
      attack: 0.01,
      decay: 0.15,
      sustain: 0.4,
      release: 0.1,
      reverbMix: 0.2,
      delayFeedback: 0.1,
    },
  },
  // Yuzu apple = harmony layer
  {
    appleBehavior: 'yuzu',
    appleId: 'yuzu',
    instrumentFamily: 'harmony',
    musicalRole: 'harmonyLayer',
    noteAssignments: [
      { baseNote: 64, duration: 1, velocity: 65, octaveVariation: 0 },
    ],
    scaleDegree: 2,
    triggersGenreShift: false,
    genreContributions: ['festival'],
    synthParams: {
      waveform: 'sine',
      secondaryWaveform: 'triangle',
      filterType: 'lowpass',
      filterCutoff: 2200,
      filterQ: 1.5,
      attack: 0.08,
      decay: 0.2,
      sustain: 0.5,
      release: 0.3,
      reverbMix: 0.35,
      delayFeedback: 0.15,
    },
  },
  // Amacha apple = soft percussion
  {
    appleBehavior: 'amacha',
    appleId: 'amacha',
    instrumentFamily: 'percussion',
    musicalRole: 'drumBeat',
    noteAssignments: [
      { baseNote: 40, duration: 0.5, velocity: 70, octaveVariation: 0 },
    ],
    scaleDegree: 0,
    triggersGenreShift: false,
    genreContributions: [],
    synthParams: {
      waveform: 'triangle',
      filterType: 'lowpass',
      filterCutoff: 600,
      filterQ: 1.5,
      attack: 0.001,
      decay: 0.15,
      sustain: 0,
      release: 0.08,
      reverbMix: 0.15,
      delayFeedback: 0,
    },
  },
  // Shielded apple = muted percussion
  {
    appleBehavior: 'shielded',
    appleId: 'shielded',
    instrumentFamily: 'percussion',
    musicalRole: 'drumBeat',
    noteAssignments: [
      { baseNote: 36, duration: 0.5, velocity: 60, octaveVariation: 0 },
    ],
    scaleDegree: 0,
    triggersGenreShift: false,
    genreContributions: [],
    synthParams: {
      waveform: 'square',
      filterType: 'lowpass',
      filterCutoff: 400,
      filterQ: 3,
      attack: 0.002,
      decay: 0.12,
      sustain: 0,
      release: 0.06,
      reverbMix: 0.08,
      delayFeedback: 0,
    },
  },
  // Frost apple = crystalline tones
  {
    appleBehavior: 'frost',
    appleId: 'frost',
    instrumentFamily: 'synth',
    musicalRole: 'tempoSynth',
    noteAssignments: [
      { baseNote: 84, duration: 0.5, velocity: 75, octaveVariation: 2 },
    ],
    scaleDegree: 4,
    triggersGenreShift: false,
    genreContributions: [],
    synthParams: {
      waveform: 'sine',
      secondaryWaveform: 'triangle',
      filterType: 'bandpass',
      filterCutoff: 5000,
      filterQ: 6,
      attack: 0.005,
      decay: 0.2,
      sustain: 0.2,
      release: 0.1,
      reverbMix: 0.4,
      delayFeedback: 0.2,
    },
  },
  // Winterberry apple = deep pad
  {
    appleBehavior: 'winterberry',
    appleId: 'winterberry',
    instrumentFamily: 'pad',
    musicalRole: 'etherealPad',
    noteAssignments: [
      { baseNote: 48, duration: 2, velocity: 50, octaveVariation: 0 },
    ],
    scaleDegree: 6,
    triggersGenreShift: false,
    genreContributions: [],
    synthParams: {
      waveform: 'sine',
      filterType: 'lowpass',
      filterCutoff: 800,
      filterQ: 1,
      attack: 0.4,
      decay: 0.6,
      sustain: 0.6,
      release: 1.0,
      reverbMix: 0.5,
      delayFeedback: 0.15,
    },
  },
  // Heatwave apple = distorted synth
  {
    appleBehavior: 'heatwave',
    appleId: 'heatwave',
    instrumentFamily: 'synth',
    musicalRole: 'tempoSynth',
    noteAssignments: [
      { baseNote: 56, duration: 0.3, velocity: 100, octaveVariation: 0 },
    ],
    scaleDegree: 1,
    triggersGenreShift: true,
    genreContributions: ['energetic'],
    synthParams: {
      waveform: 'sawtooth',
      filterType: 'highpass',
      filterCutoff: 200,
      filterQ: 8,
      attack: 0.003,
      decay: 0.05,
      sustain: 0.5,
      release: 0.03,
      reverbMix: 0.1,
      delayFeedback: 0.35,
    },
  },
];

/** Genre definitions */
export const GENRE_DEFINITIONS: GenreDefinition[] = [
  {
    id: 'calm',
    labelKey: 'music.genre.calm',
    contributingApples: ['lavender', 'love', 'mochi', 'coldBeer'],
    minimumCounts: { lavender: 3, love: 2, mochi: 2 },
    tempoMultiplier: 0.7,
    scalePattern: [0, 2, 4, 5, 7],
    dominantInstrument: 'pad',
    mood: 'ambient/chill',
    melodyFragments: [],
    totalFragmentsNeeded: 0,
  },
  {
    id: 'energetic',
    labelKey: 'music.genre.energetic',
    contributingApples: ['caffeinated', 'wasabi', 'skittish', 'heatwave'],
    minimumCounts: { caffeinated: 3, wasabi: 2, skittish: 2 },
    tempoMultiplier: 1.5,
    scalePattern: [0, 1, 3, 5, 6],
    dominantInstrument: 'synth',
    mood: 'electronic/rock',
    melodyFragments: [],
    totalFragmentsNeeded: 0,
  },
  {
    id: 'mysterious',
    labelKey: 'music.genre.mysterious',
    contributingApples: ['koi', 'wasabi', 'gold', 'frost'],
    minimumCounts: { koi: 3, wasabi: 2, gold: 1 },
    tempoMultiplier: 0.85,
    scalePattern: [0, 1, 4, 5, 7],
    dominantInstrument: 'choir',
    mood: 'cinematic/orchestral',
    melodyFragments: [],
    totalFragmentsNeeded: 0,
  },
  {
    id: 'festival',
    labelKey: 'music.genre.festival',
    contributingApples: [
      'caffeinated', 'wasabi', 'skittish', 'gold', 'treat', 'yuzu',
      'lavender', 'love', 'mochi', 'koi', 'coldBeer', 'normal',
    ],
    minimumCounts: { gold: 2, treat: 2, yuzu: 2, caffeinated: 1, wasabi: 1 },
    tempoMultiplier: 1.2,
    scalePattern: [0, 2, 3, 5, 7],
    dominantInstrument: 'choir',
    mood: 'celebratory medley',
    melodyFragments: [],
    totalFragmentsNeeded: 0,
  },
];

/** Default melody fragments for each genre */
export const DEFAULT_MELODY_FRAGMENTS: MelodyFragment[] = [
  // Calm genre fragments
  {
    id: 'calm-fragment-1',
    requiredSequence: ['lavender', 'love', 'mochi'],
    notes: [55, 59, 62, 64, 59, 55, 52],
    durations: [1, 1, 0.75, 0.5, 0.75, 1, 2],
    genre: 'calm',
    difficulty: 1,
    descriptionKey: 'music.melody.calm.lavender_waltz',
  },
  {
    id: 'calm-fragment-2',
    requiredSequence: ['love', 'mochi', 'coldBeer'],
    notes: [57, 61, 64, 61, 57, 55, 52, 48],
    durations: [0.75, 0.75, 1, 0.75, 0.75, 1, 1, 2],
    genre: 'calm',
    difficulty: 2,
    descriptionKey: 'music.melody.calm.deep_lullaby',
  },
  {
    id: 'calm-fragment-3',
    requiredSequence: ['lavender', 'mochi', 'love', 'coldBeer'],
    notes: [55, 59, 55, 52, 48, 52, 55, 59, 62, 55],
    durations: [0.5, 0.5, 0.75, 0.75, 1, 0.75, 0.75, 0.5, 0.5, 2],
    genre: 'calm',
    difficulty: 3,
    descriptionKey: 'music.melody.calm.gentle_stream',
  },
  // Energetic genre fragments
  {
    id: 'energetic-fragment-1',
    requiredSequence: ['caffeinated', 'wasabi', 'skittish'],
    notes: [60, 64, 67, 64, 60, 56, 60, 64],
    durations: [0.25, 0.25, 0.5, 0.25, 0.25, 0.5, 0.5, 1],
    genre: 'energetic',
    difficulty: 1,
    descriptionKey: 'music.melody.energetic.digital_dash',
  },
  {
    id: 'energetic-fragment-2',
    requiredSequence: ['caffeinated', 'heatwave', 'wasabi'],
    notes: [56, 60, 64, 67, 72, 67, 64, 60, 56],
    durations: [0.25, 0.25, 0.25, 0.25, 0.5, 0.25, 0.25, 0.25, 1],
    genre: 'energetic',
    difficulty: 2,
    descriptionKey: 'music.melody.energetic.heat_wave_rush',
  },
  {
    id: 'energetic-fragment-3',
    requiredSequence: ['caffeinated', 'wasabi', 'skittish', 'heatwave'],
    notes: [60, 64, 67, 72, 67, 64, 60, 56, 52, 56, 60, 64, 67, 72],
    durations: [0.25, 0.25, 0.25, 0.25, 0.5, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.5, 1],
    genre: 'energetic',
    difficulty: 3,
    descriptionKey: 'music.melody.energetic.neon_highway',
  },
  // Mysterious genre fragments
  {
    id: 'mysterious-fragment-1',
    requiredSequence: ['koi', 'gold', 'wasabi'],
    notes: [72, 76, 79, 76, 72, 67, 72, 76],
    durations: [1, 0.75, 0.75, 1, 0.75, 0.75, 1, 2],
    genre: 'mysterious',
    difficulty: 1,
    descriptionKey: 'music.melody.mysterious.koi_dream',
  },
  {
    id: 'mysterious-fragment-2',
    requiredSequence: ['koi', 'frost', 'gold'],
    notes: [72, 76, 79, 84, 79, 76, 72, 67],
    durations: [0.75, 0.75, 1, 0.75, 0.75, 1, 0.75, 2],
    genre: 'mysterious',
    difficulty: 2,
    descriptionKey: 'music.melody.mysterious.crystal_caves',
  },
  {
    id: 'mysterious-fragment-3',
    requiredSequence: ['koi', 'gold', 'wasabi', 'frost'],
    notes: [72, 76, 79, 84, 79, 76, 72, 67, 72, 76, 79, 84, 79, 76, 72],
    durations: [0.5, 0.5, 0.5, 0.5, 0.75, 0.75, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.75, 0.75, 2],
    genre: 'mysterious',
    difficulty: 3,
    descriptionKey: 'music.melody.mysterious.ancient_echo',
  },
  // Festival genre fragments
  {
    id: 'festival-fragment-1',
    requiredSequence: ['gold', 'treat', 'yuzu'],
    notes: [60, 64, 67, 72, 67, 64, 60, 64, 67, 72, 76, 72, 67, 64, 60],
    durations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 2],
    genre: 'festival',
    difficulty: 1,
    descriptionKey: 'music.melody.festival.harvest_fiesta',
  },
  {
    id: 'festival-fragment-2',
    requiredSequence: ['gold', 'treat', 'caffeinated', 'wasabi'],
    notes: [60, 64, 67, 72, 76, 72, 67, 64, 60, 56, 60, 64, 67, 72, 67, 64, 60],
    durations: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.5, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 2],
    genre: 'festival',
    difficulty: 2,
    descriptionKey: 'music.melody.festival.serpent_samba',
  },
  {
    id: 'festival-fragment-3',
    requiredSequence: ['gold', 'treat', 'yuzu', 'caffeinated', 'wasabi', 'koi'],
    notes: [60, 64, 67, 72, 76, 79, 84, 79, 76, 72, 67, 64, 60, 56, 60, 64, 67, 72, 76, 72, 67, 64, 60],
    durations: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.5, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 2],
    genre: 'festival',
    difficulty: 3,
    descriptionKey: 'music.melody.festival.grand_finale',
  },
];

/**
 * Get the musical mapping for a given apple type.
 * Returns the primary mapping (first match by appleId).
 */
export function getAppleMusicalMapping(appleId: string): AppleMusicalMapping | null {
  return DEFAULT_MUSICAL_MAPPINGS.find(
    (mapping) => mapping.appleId === appleId,
  ) ?? null;
}

/**
 * Get all mappings that contribute to a specific genre.
 */
export function getGenreContributingMappings(genre: AppleGenre): AppleMusicalMapping[] {
  return DEFAULT_MUSICAL_MAPPINGS.filter(
    (mapping) => mapping.genreContributions.includes(genre),
  );
}

/**
 * Get the genre definition by ID.
 */
export function getGenreDefinition(genreId: AppleGenre): GenreDefinition | null {
  return GENRE_DEFINITIONS.find((g) => g.id === genreId) ?? null;
}

/**
 * Get melody fragments for a specific genre.
 */
export function getMelodyFragmentsForGenre(genre: AppleGenre): MelodyFragment[] {
  return DEFAULT_MELODY_FRAGMENTS.filter((f) => f.genre === genre);
}

/**
 * Get the melody fragment by ID.
 */
export function getMelodyFragment(fragmentId: string): MelodyFragment | null {
  return DEFAULT_MELODY_FRAGMENTS.find((f) => f.id === fragmentId) ?? null;
}

/**
 * Convert MIDI note number to frequency in Hz.
 */
export function midiNoteToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Get the scale note for a given scale degree and base note.
 */
export function getScaleNote(baseNote: number, scaleDegree: number, scalePattern: number[]): number {
  return baseNote + scalePattern[scaleDegree % scalePattern.length];
}
