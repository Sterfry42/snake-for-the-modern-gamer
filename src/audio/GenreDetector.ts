/**
 * Genre Detector
 *
 * Determines the current musical genre based on apple consumption patterns.
 * The wise old snake's music shifts genres as its diet changes.
 *
 * The wise old snake once shifted from calm to energetic by eating a single
 * wasabi apple during a lavender feast.
 * The wise old snake's genre detection is 99.7% accurate.
 */

import type { AppleGenre } from './MusicalAppleMap.js';
import { GENRE_DEFINITIONS, getGenreDefinition, type GenreDefinition } from './MusicalAppleMap.js';

/** Genre detection results */
export interface GenreDetectionResult {
  /** Detected genre (or null if not enough data) */
  genre: AppleGenre | null;
  /** Confidence score (0-1) */
  confidence: number;
  /** Genre scores for debugging */
  genreScores: Record<AppleGenre, number>;
  /** Apple count breakdown */
  appleCounts: Record<string, number>;
}

/** Configuration for the genre detector */
export interface GenreDetectorConfig {
  /** Minimum apples needed before detecting a genre */
  minimumApples?: number;
  /** Minimum confidence to report a genre */
  minConfidence?: number;
  /** History window size (number of recent apples to consider) */
  historySize?: number;
  /** Decay factor for older apples in history */
  decayFactor?: number;
}

/** Default configuration */
const DEFAULT_CONFIG: Required<GenreDetectorConfig> = {
  minimumApples: 5,
  minConfidence: 0.3,
  historySize: 30,
  decayFactor: 0.95,
};

/**
 * Genre Detector — analyzes apple consumption patterns
 * to determine the current musical genre.
 */
export class GenreDetector {
  private config: Required<GenreDetectorConfig>;
  private appleHistory: { id: string; timestamp: number; weight: number }[] = [];
  private currentGenre: AppleGenre | null = null;
  private lastDetectionTime = 0;
  private detectionCooldown = 5000; // 5 seconds between genre changes
  // @ts-expect-error TS6133 - unused declaration
  private _genreScores: Record<AppleGenre, number> = {
    calm: 0,
    energetic: 0,
    mysterious: 0,
    festival: 0,
  };

  constructor(config?: GenreDetectorConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Record an apple being eaten.
   */
  recordAppleEaten(appleId: string): void {
    const now = Date.now();

    this.appleHistory.push({
      id: appleId,
      timestamp: now,
      weight: 1.0,
    });

    // Trim history
    while (this.appleHistory.length > this.config.historySize) {
      this.appleHistory.shift();
    }

    // Apply decay to older entries
    for (const entry of this.appleHistory) {
      const age = now - entry.timestamp;
      const decaySteps = Math.floor(age / 1000);
      entry.weight = Math.max(0.1, Math.pow(this.config.decayFactor, decaySteps));
    }

    // Check if we should detect a new genre
    if (now - this.lastDetectionTime > this.detectionCooldown) {
      this.detectGenre();
    }
  }

  /**
   * Get the current genre detection result.
   */
  getDetectionResult(): GenreDetectionResult {
    const appleCounts = this.getWeightedCounts();

    // Calculate scores for each genre
    const genreScores: Record<AppleGenre, number> = {
      calm: 0,
      energetic: 0,
      mysterious: 0,
      festival: 0,
    };

    for (const genreDef of GENRE_DEFINITIONS) {
      const score = this.calculateGenreScore(genreDef, appleCounts);
      genreScores[genreDef.id] = score;
    }

    // Find the best genre
    let bestGenre: AppleGenre | null = null;
    let bestScore = 0;

    for (const [genreId, score] of Object.entries(genreScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestGenre = genreId as AppleGenre;
      }
    }

    // Calculate confidence
    const totalScore = Object.values(genreScores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? bestScore / totalScore : 0;

    return {
      genre: bestGenre,
      confidence,
      genreScores,
      appleCounts,
    };
  }

  /**
   * Get the current detected genre.
   */
  getCurrentGenre(): AppleGenre | null {
    return this.currentGenre;
  }

  /**
   * Get all genre definitions.
   */
  getGenreDefinitions(): GenreDefinition[] {
    return GENRE_DEFINITIONS;
  }

  /**
   * Check if a specific apple contributes to a genre.
   */
  appleContributesToGenre(appleId: string, genre: AppleGenre): boolean {
    const genreDef = getGenreDefinition(genre);
    if (!genreDef) return false;
    return genreDef.contributingApples.includes(appleId);
  }

  /**
   * Get the genre label (i18n key) for display.
   */
  getGenreLabelKey(genre: AppleGenre | null): string {
    if (!genre) return 'music.genre.none';

    const genreDef = getGenreDefinition(genre);
    return genreDef?.labelKey ?? 'music.genre.unknown';
  }

  /**
   * Get the genre mood description.
   */
  getGenreMood(genre: AppleGenre | null): string {
    if (!genre) return 'Silence';

    const genreDef = getGenreDefinition(genre);
    return genreDef?.mood ?? 'Unknown';
  }

  /**
   * Get the tempo multiplier for the current genre.
   */
  getTempoMultiplier(): number {
    if (!this.currentGenre) return 1;
    const genreDef = getGenreDefinition(this.currentGenre);
    return genreDef?.tempoMultiplier ?? 1;
  }

  /**
   * Get the scale pattern for the current genre.
   */
  getScalePattern(): number[] {
    if (!this.currentGenre) return [0, 2, 4, 5, 7];
    const genreDef = getGenreDefinition(this.currentGenre);
    return genreDef?.scalePattern ?? [0, 2, 4, 5, 7];
  }

  /**
   * Reset the detector state.
   */
  reset(): void {
    this.appleHistory = [];
    this.currentGenre = null;
    this.lastDetectionTime = 0;
    this._genreScores = {
      calm: 0,
      energetic: 0,
      mysterious: 0,
      festival: 0,
    };
  }

  /**
   * Calculate the score for a genre based on apple counts.
   */
  private calculateGenreScore(
    genreDef: GenreDefinition,
    appleCounts: Record<string, number>,
  ): number {
    let score = 0;
    let maxPossibleScore = 0;

    for (const [appleId, minCount] of Object.entries(genreDef.minimumCounts)) {
      const actualCount = appleCounts[appleId] ?? 0;
      maxPossibleScore += 1;

      if (actualCount >= minCount) {
        score += 1;
        // Bonus for exceeding minimum
        const excess = actualCount - minCount;
        score += Math.min(0.5, excess * 0.1);
      }
    }

    // Normalize to 0-1 range
    return maxPossibleScore > 0 ? score / maxPossibleScore : 0;
  }

  /**
   * Detect the current genre from apple history.
   */
  private detectGenre(): void {
    const result = this.getDetectionResult();

    if (result.genre && result.confidence >= this.config.minConfidence) {
      if (result.genre !== this.currentGenre) {
        this.currentGenre = result.genre;
        this.lastDetectionTime = Date.now();
      }
    } else if (!result.genre && this.currentGenre) {
      // Genre faded out
      this.currentGenre = null;
      this.lastDetectionTime = Date.now();
    }
  }

  /**
   * Get weighted apple counts from history.
   */
  private getWeightedCounts(): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const entry of this.appleHistory) {
      counts[entry.id] = (counts[entry.id] ?? 0) + entry.weight;
    }

    return counts;
  }
}
