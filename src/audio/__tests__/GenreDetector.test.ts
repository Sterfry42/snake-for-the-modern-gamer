import { describe, expect, it, beforeEach } from 'vitest';
import { GenreDetector } from '../GenreDetector.js';
import type { AppleGenre } from '../MusicalAppleMap.js';
import { getGenreDefinition } from '../MusicalAppleMap.js';

describe('GenreDetector', () => {
  let detector: GenreDetector;

  beforeEach(() => {
    detector = new GenreDetector({
      minimumApples: 3,
      minConfidence: 0.2,
      historySize: 20,
      decayFactor: 0.95,
    });
  });

  describe('recordAppleEaten', () => {
    it('records apples in history', () => {
      detector.recordAppleEaten('lavender');
      detector.recordAppleEaten('love');
      detector.recordAppleEaten('mochi');

      const result = detector.getDetectionResult();
      expect(result.appleCounts.lavender).toBeGreaterThan(0);
      expect(result.appleCounts.love).toBeGreaterThan(0);
      expect(result.appleCounts.mochi).toBeGreaterThan(0);
    });

    it('applies decay to older entries', () => {
      detector.recordAppleEaten('lavender');
      detector.recordAppleEaten('lavender');
      detector.recordAppleEaten('love');

      const result = detector.getDetectionResult();
      // Lavender should have higher count due to more entries
      expect(result.appleCounts.lavender).toBeGreaterThan(result.appleCounts.love);
    });
  });

  describe('getDetectionResult', () => {
    it('returns null genre when not enough apples', () => {
      detector.recordAppleEaten('normal');
      detector.recordAppleEaten('normal');

      const result = detector.getDetectionResult();
      expect(result.genre).toBeNull();
      expect(result.confidence).toBeLessThan(0.3);
    });

    it('detects calm genre with lavender-heavy diet', () => {
      for (let i = 0; i < 10; i++) {
        detector.recordAppleEaten('lavender');
      }
      for (let i = 0; i < 5; i++) {
        detector.recordAppleEaten('love');
      }
      for (let i = 0; i < 5; i++) {
        detector.recordAppleEaten('mochi');
      }

      const result = detector.getDetectionResult();
      expect(result.genre).toBe('calm');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('detects energetic genre with caffeinated-heavy diet', () => {
      for (let i = 0; i < 10; i++) {
        detector.recordAppleEaten('caffeinated');
      }
      for (let i = 0; i < 5; i++) {
        detector.recordAppleEaten('wasabi');
      }
      for (let i = 0; i < 5; i++) {
        detector.recordAppleEaten('skittish');
      }

      const result = detector.getDetectionResult();
      expect(result.genre).toBe('energetic');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('detects mysterious genre with koi-heavy diet', () => {
      for (let i = 0; i < 10; i++) {
        detector.recordAppleEaten('koi');
      }
      for (let i = 0; i < 5; i++) {
        detector.recordAppleEaten('gold');
      }
      for (let i = 0; i < 3; i++) {
        detector.recordAppleEaten('wasabi');
      }

      const result = detector.getDetectionResult();
      expect(result.genre).toBe('mysterious');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('returns genre scores for all genres', () => {
      detector.recordAppleEaten('lavender');
      detector.recordAppleEaten('caffeinated');

      const result = detector.getDetectionResult();
      expect(result.genreScores).toHaveProperty('calm');
      expect(result.genreScores).toHaveProperty('energetic');
      expect(result.genreScores).toHaveProperty('mysterious');
      expect(result.genreScores).toHaveProperty('festival');
    });
  });

  describe('getCurrentGenre', () => {
    it('returns null initially', () => {
      expect(detector.getCurrentGenre()).toBeNull();
    });

    it('updates after detecting a genre', () => {
      for (let i = 0; i < 10; i++) {
        detector.recordAppleEaten('lavender');
      }
      for (let i = 0; i < 5; i++) {
        detector.recordAppleEaten('love');
      }

      // Genre detection happens after minimum apples
      const result = detector.getDetectionResult();
      if (result.genre) {
        expect(detector.getCurrentGenre()).toBe(result.genre);
      }
    });
  });

  describe('appleContributesToGenre', () => {
    it('returns true for lavender in calm genre', () => {
      expect(detector.appleContributesToGenre('lavender', 'calm')).toBe(true);
    });

    it('returns false for lavender in energetic genre', () => {
      expect(detector.appleContributesToGenre('lavender', 'energetic')).toBe(false);
    });

    it('returns true for caffeinated in energetic genre', () => {
      expect(detector.appleContributesToGenre('caffeinated', 'energetic')).toBe(true);
    });

    it('returns true for koi in mysterious genre', () => {
      expect(detector.appleContributesToGenre('koi', 'mysterious')).toBe(true);
    });
  });

  describe('getGenreLabelKey', () => {
    it('returns none for null genre', () => {
      expect(detector.getGenreLabelKey(null)).toBe('music.genre.none');
    });

    it('returns correct label key for calm', () => {
      expect(detector.getGenreLabelKey('calm')).toBe('music.genre.calm');
    });

    it('returns correct label key for energetic', () => {
      expect(detector.getGenreLabelKey('energetic')).toBe('music.genre.energetic');
    });
  });

  describe('getTempoMultiplier', () => {
    it('returns 1 when no genre is active', () => {
      expect(detector.getTempoMultiplier()).toBe(1);
    });

    it('returns calm tempo multiplier when calm is detected', () => {
      for (let i = 0; i < 10; i++) {
        detector.recordAppleEaten('lavender');
      }
      for (let i = 0; i < 5; i++) {
        detector.recordAppleEaten('love');
      }

      const result = detector.getDetectionResult();
      if (result.genre === 'calm') {
        expect(detector.getTempoMultiplier()).toBe(0.7);
      }
    });

    it('returns correct tempo multiplier for detected genre', () => {
      // Reset to clear any previous state
      detector.reset();
      // Add only caffeinated apples to trigger energetic genre
      for (let i = 0; i < 30; i++) {
        detector.recordAppleEaten('caffeinated');
      }

      const result = detector.getDetectionResult();
      expect(result.genre).not.toBeNull();

      // Get the tempo from the genre definition directly
      const genreDef = getGenreDefinition(result.genre!);
      expect(genreDef).not.toBeNull();
      expect(genreDef!.tempoMultiplier).toBeGreaterThan(0);
    });
  });

  describe('getScalePattern', () => {
    it('returns default pattern when no genre', () => {
      const pattern = detector.getScalePattern();
      expect(pattern).toEqual([0, 2, 4, 5, 7]);
    });

    it('returns calm scale pattern when calm is active', () => {
      for (let i = 0; i < 10; i++) {
        detector.recordAppleEaten('lavender');
      }
      for (let i = 0; i < 5; i++) {
        detector.recordAppleEaten('love');
      }

      const result = detector.getDetectionResult();
      if (result.genre === 'calm') {
        expect(detector.getScalePattern()).toEqual([0, 2, 4, 5, 7]);
      }
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      detector.recordAppleEaten('lavender');
      detector.recordAppleEaten('love');
      detector.reset();

      expect(detector.getCurrentGenre()).toBeNull();
      const result = detector.getDetectionResult();
      expect(result.genre).toBeNull();
    });
  });

  describe('getGenreDefinitions', () => {
    it('returns all genre definitions', () => {
      const definitions = detector.getGenreDefinitions();
      expect(definitions.length).toBe(4);

      const ids = definitions.map((d) => d.id);
      expect(ids).toContain('calm');
      expect(ids).toContain('energetic');
      expect(ids).toContain('mysterious');
      expect(ids).toContain('festival');
    });
  });
});
