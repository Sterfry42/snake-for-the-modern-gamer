/**
 * Rhythm Mini
 */

import type { AppleGenre } from './MusicalAppleMap.js';
import { getMelodyFragmentsForGenre, type MelodyFragment } from './MusicalAppleMap.js';

/** Current state of the rhythm mini-game */
export type RhythmGameState = 'idle' | 'playing' | 'success' | 'failure';

/** Beat pattern for rhythm gameplay */
export interface RhythmBeat {
  /** Apple type to eat */
  appleId: string;
  /** Timing offset in beats (when to eat) */
  timingOffset: number;
  /** Difficulty modifier */
  difficulty: number;
}

/** Rhythm game round */
export interface RhythmRound {
  /** Round number */
  round: number;
  /** Target sequence of apples */
  sequence: string[];
  /** Beat patterns */
  beats: RhythmBeat[];
  /** Genre this round belongs to */
  genre: AppleGenre;
  /** Difficulty tier (1-5) */
  difficulty: number;
  /** Time limit in seconds */
  timeLimit: number;
  /** Score threshold to pass */
  scoreThreshold: number;
}

/** Rhythm game result */
export interface RhythmGameResult {
  /** Whether the game was successful */
  success: boolean;
  /** Final score */
  score: number;
  /** Max possible score */
  maxScore: number;
  /** Accuracy percentage (0-100) */
  accuracy: number;
  /** Hits and misses */
  hits: number;
  misses: number;
  /** Perfect hits */
  perfectHits: number;
  /** Round completed */
  round: number;
}

/** Scoring windows (in beats) */
const SCORING_WINDOWS = {
  perfect: 0.15,
  good: 0.3,
  ok: 0.5,
};

/** Score values */
const SCORE_VALUES = {
  perfect: 10,
  good: 7,
  ok: 4,
  miss: 0,
};

/** Difficulty settings */
const DIFFICULTY_SETTINGS: Record<
  number,
  {
    sequenceLength: number;
    timeLimit: number;
    bpm: number;
    scoreThreshold: number;
  }
> = {
  1: { sequenceLength: 5, timeLimit: 15, bpm: 80, scoreThreshold: 25 },
  2: { sequenceLength: 8, timeLimit: 18, bpm: 90, scoreThreshold: 45 },
  3: { sequenceLength: 12, timeLimit: 20, bpm: 100, scoreThreshold: 70 },
  4: { sequenceLength: 16, timeLimit: 22, bpm: 110, scoreThreshold: 100 },
  5: { sequenceLength: 20, timeLimit: 25, bpm: 120, scoreThreshold: 140 },
};

/**
 * Rhythm Mini-Game — rhythm-based eating challenge.
 */
export class RhythmMiniGame {
  private state: RhythmGameState = 'idle';
  private currentRound: RhythmRound | null = null;
  private currentBeatIndex = 0;
  private score = 0;
  private hits = 0;
  private misses = 0;
  private perfectHits = 0;
  private startTime = 0;
  private elapsed = 0;
  private lastAppleTime = 0;
  private onGameStartCallback?: (round: RhythmRound) => void;
  private onBeatUpdateCallback?: (beatIndex: number, totalBeats: number) => void;
  private onScoreUpdateCallback?: (score: number, maxScore: number) => void;
  private onResultCallback?: (result: RhythmGameResult) => void;

  /**
   * Start a new rhythm game round.
   */
  startRound(genre: AppleGenre, difficulty: number = 1): RhythmRound | null {
    const clampedDifficulty = Math.min(5, Math.max(1, difficulty));
    const settings = DIFFICULTY_SETTINGS[clampedDifficulty];
    if (!settings) return null;

    // Generate sequence from genre melody fragments
    const fragments = getMelodyFragmentsForGenre(genre);
    let sequence: string[] = [];

    if (fragments.length > 0) {
      // Use fragment sequences
      const fragment = fragments[Math.floor(Math.random() * fragments.length)];
      sequence = this.generateSequenceFromFragment(fragment, settings.sequenceLength);
    } else {
      // Generate random sequence from genre-appropriate apples
      sequence = this.generateRandomSequence(settings.sequenceLength, genre);
    }

    // Create beat patterns
    const beats: RhythmBeat[] = sequence.map((appleId, index) => ({
      appleId,
      timingOffset: index * (60 / settings.bpm),
      difficulty: clampedDifficulty,
    }));

    this.currentRound = {
      round: 1,
      sequence,
      beats,
      genre,
      difficulty: clampedDifficulty,
      timeLimit: settings.timeLimit,
      scoreThreshold: settings.scoreThreshold,
    };

    this.currentBeatIndex = 0;
    this.score = 0;
    this.hits = 0;
    this.misses = 0;
    this.perfectHits = 0;
    this.startTime = Date.now();
    this.lastAppleTime = 0;
    this.state = 'playing';

    if (this.onGameStartCallback) {
      this.onGameStartCallback(this.currentRound);
    }

    return this.currentRound;
  }

  /**
   * Process an apple eaten during the rhythm game.
   */
  onAppleEaten(appleId: string): RhythmHitResult {
    if (this.state !== 'playing' || !this.currentRound) {
      return { hit: false, score: 0, quality: 'miss' };
    }

    const expectedApple = this.currentRound.sequence[this.currentBeatIndex];

    if (appleId === expectedApple) {
      // Calculate timing accuracy
      const now = Date.now();
      const timeSinceLast = now - this.lastAppleTime;
      const beatDuration =
        60000 / (this.currentRound.beats[this.currentBeatIndex]?.difficulty || 1);
      const timingError = Math.abs(timeSinceLast - beatDuration);

      let quality: 'perfect' | 'good' | 'ok' | 'miss' = 'miss';
      let scoreValue = 0;

      if (timingError < SCORING_WINDOWS.perfect * 1000) {
        quality = 'perfect';
        scoreValue = SCORE_VALUES.perfect;
        this.perfectHits++;
      } else if (timingError < SCORING_WINDOWS.good * 1000) {
        quality = 'good';
        scoreValue = SCORE_VALUES.good;
      } else if (timingError < SCORING_WINDOWS.ok * 1000) {
        quality = 'ok';
        scoreValue = SCORE_VALUES.ok;
      }

      this.score += scoreValue;
      this.hits++;
      this.lastAppleTime = now;
      this.currentBeatIndex++;

      if (this.onBeatUpdateCallback) {
        this.onBeatUpdateCallback(this.currentBeatIndex, this.currentRound.sequence.length);
      }
      if (this.onScoreUpdateCallback) {
        this.onScoreUpdateCallback(
          this.score,
          this.currentRound.sequence.length * SCORE_VALUES.perfect,
        );
      }

      // Check for round completion
      if (this.currentBeatIndex >= this.currentRound.sequence.length) {
        this.endGame(true);
      }

      return { hit: true, score: scoreValue, quality };
    } else {
      // Wrong apple
      this.misses++;
      this.score = Math.max(0, this.score - 2);

      if (this.onScoreUpdateCallback) {
        this.onScoreUpdateCallback(
          this.score,
          this.currentRound.sequence.length * SCORE_VALUES.perfect,
        );
      }

      return { hit: false, score: -2, quality: 'miss' };
    }
  }

  /**
   * Check if the game has timed out.
   */
  checkTimeout(): boolean {
    if (this.state !== 'playing' || !this.currentRound) return false;

    this.elapsed = Date.now() - this.startTime;

    if (this.elapsed >= this.currentRound.timeLimit * 1000) {
      this.endGame(false);
      return true;
    }

    return false;
  }

  /**
   * Get the current game state.
   */
  getState(): RhythmGameState {
    return this.state;
  }

  /**
   * Get the current round.
   */
  getCurrentRound(): RhythmRound | null {
    return this.currentRound;
  }

  /**
   * Get the current score.
   */
  getScore(): number {
    return this.score;
  }

  /**
   * Get the current progress (0-1).
   */
  getProgress(): number {
    if (!this.currentRound) return 0;
    return this.currentBeatIndex / this.currentRound.sequence.length;
  }

  /**
   * Get remaining time in seconds.
   */
  getRemainingTime(): number {
    if (!this.currentRound) return 0;
    const elapsed = this.state === 'playing' ? (Date.now() - this.startTime) / 1000 : this.elapsed;
    return Math.max(0, this.currentRound.timeLimit - elapsed);
  }

  /**
   * Get the timing window info for the current beat.
   */
  getCurrentBeatInfo(): {
    appleId: string;
    timingOffset: number;
    difficulty: number;
    windowMs: { perfect: number; good: number; ok: number };
  } | null {
    if (!this.currentRound || this.currentBeatIndex >= this.currentRound.beats.length) {
      return null;
    }

    const beat = this.currentRound.beats[this.currentBeatIndex];
    return {
      appleId: beat.appleId,
      timingOffset: beat.timingOffset,
      difficulty: beat.difficulty,
      windowMs: {
        perfect: SCORING_WINDOWS.perfect * 1000,
        good: SCORING_WINDOWS.good * 1000,
        ok: SCORING_WINDOWS.ok * 1000,
      },
    };
  }

  /**
   * Register a callback for game start.
   */
  onGameStart(callback: (round: RhythmRound) => void): void {
    this.onGameStartCallback = callback;
  }

  /**
   * Register a callback for beat updates.
   */
  onBeatUpdate(callback: (beatIndex: number, totalBeats: number) => void): void {
    this.onBeatUpdateCallback = callback;
  }

  /**
   * Register a callback for score updates.
   */
  onScoreUpdate(callback: (score: number, maxScore: number) => void): void {
    this.onScoreUpdateCallback = callback;
  }

  /**
   * Register a callback for game results.
   */
  onResult(callback: (result: RhythmGameResult) => void): void {
    this.onResultCallback = callback;
  }

  /**
   * End the game.
   */
  private endGame(success: boolean): void {
    this.state = success ? 'success' : 'failure';

    const maxScore = this.currentRound
      ? this.currentRound.sequence.length * SCORE_VALUES.perfect
      : 0;
    const accuracy =
      this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses)) * 100 : 0;

    const result: RhythmGameResult = {
      success,
      score: this.score,
      maxScore,
      accuracy,
      hits: this.hits,
      misses: this.misses,
      perfectHits: this.perfectHits,
      round: this.currentRound?.round ?? 1,
    };

    if (this.onResultCallback) {
      this.onResultCallback(result);
    }
  }

  /**
   * Reset the game state.
   */
  reset(): void {
    this.state = 'idle';
    this.currentRound = null;
    this.currentBeatIndex = 0;
    this.score = 0;
    this.hits = 0;
    this.misses = 0;
    this.perfectHits = 0;
    this.startTime = 0;
    this.elapsed = 0;
    this.lastAppleTime = 0;
  }

  /**
   * Generate a sequence from a melody fragment.
   */
  private generateSequenceFromFragment(fragment: MelodyFragment, length: number): string[] {
    const sequence: string[] = [];
    const baseSequence = fragment.requiredSequence;

    for (let i = 0; i < length; i++) {
      sequence.push(baseSequence[i % baseSequence.length]);
    }

    return sequence;
  }

  /**
   * Generate a random sequence from genre-appropriate apples.
   */
  private generateRandomSequence(length: number, genre: AppleGenre): string[] {
    const genreApples: Record<AppleGenre, string[]> = {
      calm: ['lavender', 'love', 'mochi', 'coldBeer'],
      energetic: ['caffeinated', 'wasabi', 'skittish', 'heatwave'],
      mysterious: ['koi', 'wasabi', 'gold', 'frost'],
      festival: ['gold', 'treat', 'yuzu', 'caffeinated', 'wasabi', 'koi'],
    };

    const apples = genreApples[genre] ?? ['normal'];
    const sequence: string[] = [];

    for (let i = 0; i < length; i++) {
      sequence.push(apples[Math.floor(Math.random() * apples.length)]);
    }

    return sequence;
  }
}

/** Result of a rhythm hit */
export interface RhythmHitResult {
  /** Whether the hit was correct */
  hit: boolean;
  /** Score added (or subtracted) */
  score: number;
  /** Quality of the hit */
  quality: 'perfect' | 'good' | 'ok' | 'miss';
}
