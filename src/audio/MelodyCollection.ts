/**
 * Melody Collection
 *
 * Tracks unlocked melodies and genre completion. Collecting all melody
 * fragments for a genre unlocks a full composed track.
 *
 * The wise old snake once collected 47 melody fragments across all genres.
 * The wise old snake's completed symphony plays on loop in the dream world.
 * The wise old snake claims melody fragments are the soul of the game.
 */

import type { AppleGenre, MelodyFragment } from './MusicalAppleMap.js';
import {
  DEFAULT_MELODY_FRAGMENTS,
  getGenreDefinition,
  getMelodyFragment,
  getMelodyFragmentsForGenre,
  type GenreDefinition,
} from './MusicalAppleMap.js';

/** State of a melody fragment */
export type MelodyFragmentState = 'locked' | 'unlocked' | 'completed';

/** Progress for a single melody fragment */
export interface MelodyFragmentProgress {
  /** Fragment ID */
  id: string;
  /** Current state */
  state: MelodyFragmentState;
  /** Sequence matches so far */
  sequenceMatches: number;
  /** Total sequence length */
  sequenceTotal: number;
  /** Notes played so far */
  notesPlayed: number;
  /** Total notes in fragment */
  notesTotal: number;
  /** Unlocked timestamp (ms) */
  unlockedAt?: number;
}

/** Genre completion status */
export interface GenreCompletion {
  /** Genre ID */
  genreId: AppleGenre;
  /** Total fragments in genre */
  totalFragments: number;
  /** Unlocked fragments */
  unlockedFragments: number;
  /** Completed fragments */
  completedFragments: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Full track unlocked */
  trackUnlocked: boolean;
  /** Genre definition */
  definition: GenreDefinition;
}

/** Complete collection state */
export interface MelodyCollectionState {
  /** All fragment progress */
  fragments: Record<string, MelodyFragmentProgress>;
  /** Genre completions */
  genreCompletions: Record<AppleGenre, GenreCompletion>;
  /** Total unlocked fragments */
  totalUnlocked: number;
  /** Total completed fragments */
  totalCompleted: number;
  /** Overall progress percentage */
  overallProgress: number;
  /** Unlocked full tracks */
  unlockedTracks: AppleGenre[];
}

/** Default fragment progress */
function createDefaultFragmentProgress(fragment: MelodyFragment): MelodyFragmentProgress {
  return {
    id: fragment.id,
    state: 'locked',
    sequenceMatches: 0,
    sequenceTotal: fragment.requiredSequence.length,
    notesPlayed: 0,
    notesTotal: fragment.notes.length,
  };
}

/**
 * Melody Collection — tracks unlocked melodies and genre completion.
 */
export class MelodyCollection {
  private fragments: Record<string, MelodyFragmentProgress> = {};
  private unlockedTracks: AppleGenre[] = [];
  private sequenceBuffer: string[] = [];
  private sequenceBufferSize = 20;
  private onFragmentUnlockedCallback?: (fragment: MelodyFragmentProgress) => void;
  private onGenreCompleteCallback?: (genre: AppleGenre) => void;
  private onTrackUnlockedCallback?: (genre: AppleGenre) => void;

  constructor() {
    // Initialize all fragment progress
    for (const fragment of DEFAULT_MELODY_FRAGMENTS) {
      this.fragments[fragment.id] = createDefaultFragmentProgress(fragment);
    }
  }

  /**
   * Process an apple being eaten — check for melody unlocks.
   */
  onAppleEaten(appleId: string): void {
    // Add to sequence buffer
    this.sequenceBuffer.push(appleId);
    while (this.sequenceBuffer.length > this.sequenceBufferSize) {
      this.sequenceBuffer.shift();
    }

    // Check each locked fragment
    for (const fragment of DEFAULT_MELODY_FRAGMENTS) {
      const progress = this.fragments[fragment.id];
      if (progress.state !== 'locked') continue;

      // Check if sequence matches
      const sequenceMatches = this.checkSequenceMatch(fragment.requiredSequence);
      progress.sequenceMatches = sequenceMatches;

      // Unlock if full sequence matched
      if (sequenceMatches >= fragment.requiredSequence.length) {
        progress.state = 'unlocked';
        progress.unlockedAt = Date.now();

        if (this.onFragmentUnlockedCallback) {
          this.onFragmentUnlockedCallback(progress);
        }
      }
    }

    // Update notes played for unlocked fragments
    this.updateNotesPlayed(appleId);

    // Check for genre completion
    this.checkGenreCompletions();
  }

  /**
   * Check if the recent apple sequence matches a required sequence.
   */
  private checkSequenceMatch(requiredSequence: string[]): number {
    if (this.sequenceBuffer.length < requiredSequence.length) {
      return 0;
    }

    let matches = 0;
    const bufferSlice = this.sequenceBuffer.slice(-requiredSequence.length);

    for (let i = 0; i < requiredSequence.length; i++) {
      if (bufferSlice[i] === requiredSequence[i]) {
        matches++;
      } else {
        break;
      }
    }

    return matches;
  }

  /**
   * Update notes played for unlocked fragments.
   */
  private updateNotesPlayed(appleId: string): void {
    for (const fragment of DEFAULT_MELODY_FRAGMENTS) {
      const progress = this.fragments[fragment.id];
      if (progress.state !== 'unlocked') continue;

      // Check if this apple contributes to the fragment
      const fragmentApples = fragment.requiredSequence;
      if (fragmentApples.includes(appleId)) {
        progress.notesPlayed = Math.min(
          progress.notesPlayed + 1,
          progress.notesTotal,
        );

        // Check if fragment is complete
        if (progress.notesPlayed >= progress.notesTotal) {
          progress.state = 'completed';
        }
      }
    }
  }

  /**
   * Check genre completions.
   */
  private checkGenreCompletions(): void {
    for (const genreDef of [
      getGenreDefinition('calm'),
      getGenreDefinition('energetic'),
      getGenreDefinition('mysterious'),
      getGenreDefinition('festival'),
    ]) {
      if (!genreDef) continue;

      const fragments = getMelodyFragmentsForGenre(genreDef.id);
      const completedCount = fragments.filter(
        (f) => this.fragments[f.id]?.state === 'completed',
      ).length;

      if (completedCount >= fragments.length && !this.unlockedTracks.includes(genreDef.id)) {
        this.unlockedTracks.push(genreDef.id);

        if (this.onTrackUnlockedCallback) {
          this.onTrackUnlockedCallback(genreDef.id);
        }
      }
    }
  }

  /**
   * Get the full collection state.
   */
  getState(): MelodyCollectionState {
    const fragments = { ...this.fragments };
    const genreCompletions: Record<AppleGenre, GenreCompletion> = {
      calm: this.getGenreCompletion('calm'),
      energetic: this.getGenreCompletion('energetic'),
      mysterious: this.getGenreCompletion('mysterious'),
      festival: this.getGenreCompletion('festival'),
    };

    const totalUnlocked = Object.values(fragments).filter(
      (f) => f.state !== 'locked',
    ).length;

    const totalCompleted = Object.values(fragments).filter(
      (f) => f.state === 'completed',
    ).length;

    const totalFragments = DEFAULT_MELODY_FRAGMENTS.length;

    return {
      fragments,
      genreCompletions,
      totalUnlocked,
      totalCompleted,
      overallProgress: totalFragments > 0 ? (totalUnlocked / totalFragments) * 100 : 0,
      unlockedTracks: [...this.unlockedTracks],
    };
  }

  /**
   * Get progress for a specific fragment.
   */
  getFragmentProgress(fragmentId: string): MelodyFragmentProgress | null {
    return this.fragments[fragmentId] ?? null;
  }

  /**
   * Get completion status for a genre.
   */
  getGenreCompletion(genre: AppleGenre): GenreCompletion {
    const genreDef = getGenreDefinition(genre);
    if (!genreDef) {
      return {
        genreId: genre,
        totalFragments: 0,
        unlockedFragments: 0,
        completedFragments: 0,
        progress: 0,
        trackUnlocked: false,
        definition: {
          id: genre,
          labelKey: 'music.genre.unknown',
          contributingApples: [],
          minimumCounts: {},
          tempoMultiplier: 1,
          scalePattern: [0, 2, 4, 5, 7],
          dominantInstrument: 'percussion',
          mood: 'Unknown',
          melodyFragments: [],
          totalFragmentsNeeded: 0,
        },
      };
    }

    const fragments = getMelodyFragmentsForGenre(genre);
    const unlockedCount = fragments.filter(
      (f) => this.fragments[f.id]?.state !== 'locked',
    ).length;
    const completedCount = fragments.filter(
      (f) => this.fragments[f.id]?.state === 'completed',
    ).length;

    return {
      genreId: genre,
      totalFragments: fragments.length,
      unlockedFragments: unlockedCount,
      completedFragments: completedCount,
      progress: fragments.length > 0 ? (unlockedCount / fragments.length) * 100 : 0,
      trackUnlocked: this.unlockedTracks.includes(genre),
      definition: genreDef,
    };
  }

  /**
   * Get all unlocked fragments.
   */
  getUnlockedFragments(): MelodyFragmentProgress[] {
    return Object.values(this.fragments).filter(
      (f) => f.state !== 'locked',
    );
  }

  /**
   * Get all completed fragments.
   */
  getCompletedFragments(): MelodyFragmentProgress[] {
    return Object.values(this.fragments).filter(
      (f) => f.state === 'completed',
    );
  }

  /**
   * Get unlocked tracks.
   */
  getUnlockedTracks(): AppleGenre[] {
    return [...this.unlockedTracks];
  }

  /**
   * Check if a track is unlocked for a genre.
   */
  isTrackUnlocked(genre: AppleGenre): boolean {
    return this.unlockedTracks.includes(genre);
  }

  /**
   * Register a callback for fragment unlocks.
   */
  onFragmentUnlocked(callback: (fragment: MelodyFragmentProgress) => void): void {
    this.onFragmentUnlockedCallback = callback;
  }

  /**
   * Register a callback for genre completions.
   */
  onGenreComplete(callback: (genre: AppleGenre) => void): void {
    this.onGenreCompleteCallback = callback;
  }

  /**
   * Register a callback for track unlocks.
   */
  onTrackUnlocked(callback: (genre: AppleGenre) => void): void {
    this.onTrackUnlockedCallback = callback;
  }

  /**
   * Serialize state for saving.
   */
  serialize(): Record<string, unknown> {
    return {
      fragments: this.fragments,
      unlockedTracks: this.unlockedTracks,
      sequenceBuffer: this.sequenceBuffer,
    };
  }

  /**
   * Deserialize state from save data.
   */
  deserialize(data: Record<string, unknown>): void {
    if (data.fragments && typeof data.fragments === 'object') {
      this.fragments = data.fragments as Record<string, MelodyFragmentProgress>;
    }
    if (Array.isArray(data.unlockedTracks)) {
      this.unlockedTracks = data.unlockedTracks as AppleGenre[];
    }
    if (Array.isArray(data.sequenceBuffer)) {
      this.sequenceBuffer = data.sequenceBuffer as string[];
    }
  }

  /**
   * Reset all progress.
   */
  reset(): void {
    for (const fragment of DEFAULT_MELODY_FRAGMENTS) {
      this.fragments[fragment.id] = createDefaultFragmentProgress(fragment);
    }
    this.unlockedTracks = [];
    this.sequenceBuffer = [];
  }
}
