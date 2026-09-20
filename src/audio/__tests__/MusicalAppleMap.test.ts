import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MUSICAL_MAPPINGS,
  GENRE_DEFINITIONS,
  DEFAULT_MELODY_FRAGMENTS,
  getAppleMusicalMapping,
  getGenreContributingMappings,
  getGenreDefinition,
  getMelodyFragmentsForGenre,
  getMelodyFragment,
  midiNoteToFrequency,
  getScaleNote,
  type AppleGenre,
  type InstrumentFamily,
} from '../MusicalAppleMap.js';

describe('MusicalAppleMap', () => {
  describe('DEFAULT_MUSICAL_MAPPINGS', () => {
    it('contains mappings for all standard apple types', () => {
      const expectedApples = [
        'normal',
        'caffeinated',
        'lavender',
        'love',
        'mochi',
        'wasabi',
        'gold',
        'skittish',
        'koi',
        'coldBeer',
        'treat',
        'yuzu',
        'amacha',
        'shielded',
        'frost',
        'winterberry',
        'heatwave',
      ];

      for (const appleId of expectedApples) {
        const mapping = getAppleMusicalMapping(appleId);
        expect(mapping).not.toBeNull();
        expect(mapping!.appleId).toBe(appleId);
      }
    });

    it('each mapping has valid note assignments', () => {
      for (const mapping of DEFAULT_MUSICAL_MAPPINGS) {
        for (const noteAssign of mapping.noteAssignments) {
          expect(noteAssign.baseNote).toBeGreaterThanOrEqual(12);
          expect(noteAssign.baseNote).toBeLessThanOrEqual(108);
          expect(noteAssign.duration).toBeGreaterThan(0);
          expect(noteAssign.velocity).toBeGreaterThanOrEqual(0);
          expect(noteAssign.velocity).toBeLessThanOrEqual(127);
        }
      }
    });

    it('each mapping has valid synth parameters', () => {
      for (const mapping of DEFAULT_MUSICAL_MAPPINGS) {
        const params = mapping.synthParams;
        expect(params.attack).toBeGreaterThanOrEqual(0);
        expect(params.decay).toBeGreaterThanOrEqual(0);
        expect(params.sustain).toBeGreaterThanOrEqual(0);
        expect(params.sustain).toBeLessThanOrEqual(1);
        expect(params.release).toBeGreaterThanOrEqual(0);
        expect(params.reverbMix).toBeGreaterThanOrEqual(0);
        expect(params.reverbMix).toBeLessThanOrEqual(1);
        expect(params.delayFeedback).toBeGreaterThanOrEqual(0);
        expect(params.delayFeedback).toBeLessThanOrEqual(1);
      }
    });

    it('has correct instrument families for key apples', () => {
      const expectedMappings: Record<string, InstrumentFamily> = {
        normal: 'percussion',
        caffeinated: 'synth',
        lavender: 'pad',
        love: 'strings',
        mochi: 'marimba',
        wasabi: 'brass',
        gold: 'choir',
        skittish: 'erratic',
        koi: 'water',
        coldBeer: 'bass',
      };

      for (const [appleId, expectedFamily] of Object.entries(expectedMappings)) {
        const mapping = getAppleMusicalMapping(appleId);
        expect(mapping!.instrumentFamily).toBe(expectedFamily);
      }
    });
  });

  describe('GENRE_DEFINITIONS', () => {
    it('contains all four genres', () => {
      const genreIds = GENRE_DEFINITIONS.map((g) => g.id);
      expect(genreIds).toContain('calm');
      expect(genreIds).toContain('energetic');
      expect(genreIds).toContain('mysterious');
      expect(genreIds).toContain('festival');
    });

    it('each genre has valid tempo multiplier', () => {
      for (const genre of GENRE_DEFINITIONS) {
        expect(genre.tempoMultiplier).toBeGreaterThan(0);
      }
    });

    it('each genre has scale pattern', () => {
      for (const genre of GENRE_DEFINITIONS) {
        expect(genre.scalePattern.length).toBeGreaterThan(0);
        for (const degree of genre.scalePattern) {
          expect(degree).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('calm genre contributes correct apples', () => {
      const calm = getGenreDefinition('calm');
      expect(calm).not.toBeNull();
      expect(calm!.contributingApples).toContain('lavender');
      expect(calm!.contributingApples).toContain('love');
      expect(calm!.contributingApples).toContain('mochi');
    });

    it('energetic genre contributes correct apples', () => {
      const energetic = getGenreDefinition('energetic');
      expect(energetic).not.toBeNull();
      expect(energetic!.contributingApples).toContain('caffeinated');
      expect(energetic!.contributingApples).toContain('wasabi');
      expect(energetic!.contributingApples).toContain('skittish');
    });
  });

  describe('getAppleMusicalMapping', () => {
    it('returns null for unknown apple', () => {
      expect(getAppleMusicalMapping('nonexistent')).toBeNull();
    });

    it('returns mapping for known apples', () => {
      expect(getAppleMusicalMapping('normal')).not.toBeNull();
      expect(getAppleMusicalMapping('wasabi')).not.toBeNull();
      expect(getAppleMusicalMapping('gold')).not.toBeNull();
    });
  });

  describe('getGenreContributingMappings', () => {
    it('returns mappings for calm genre', () => {
      const calmMappings = getGenreContributingMappings('calm');
      expect(calmMappings.length).toBeGreaterThan(0);
      for (const mapping of calmMappings) {
        expect(mapping.genreContributions).toContain('calm');
      }
    });

    it('returns mappings for energetic genre', () => {
      const energeticMappings = getGenreContributingMappings('energetic');
      expect(energeticMappings.length).toBeGreaterThan(0);
      for (const mapping of energeticMappings) {
        expect(mapping.genreContributions).toContain('energetic');
      }
    });
  });

  describe('getGenreDefinition', () => {
    it('returns null for unknown genre', () => {
      expect(getGenreDefinition('unknown' as AppleGenre)).toBeNull();
    });

    it('returns valid definition for known genres', () => {
      for (const genre of ['calm', 'energetic', 'mysterious', 'festival'] as AppleGenre[]) {
        const def = getGenreDefinition(genre);
        expect(def).not.toBeNull();
        expect(def!.id).toBe(genre);
      }
    });
  });

  describe('DEFAULT_MELODY_FRAGMENTS', () => {
    it('has fragments for each genre', () => {
      for (const genre of ['calm', 'energetic', 'mysterious', 'festival'] as AppleGenre[]) {
        const fragments = getMelodyFragmentsForGenre(genre);
        expect(fragments.length).toBeGreaterThan(0);
      }
    });

    it('each fragment has valid notes and durations', () => {
      for (const fragment of DEFAULT_MELODY_FRAGMENTS) {
        expect(fragment.notes.length).toBeGreaterThan(0);
        expect(fragment.durations.length).toBeGreaterThan(0);
        expect(fragment.notes.length).toBe(fragment.durations.length);

        for (const note of fragment.notes) {
          expect(note).toBeGreaterThanOrEqual(12);
          expect(note).toBeLessThanOrEqual(108);
        }

        for (const duration of fragment.durations) {
          expect(duration).toBeGreaterThan(0);
        }
      }
    });

    it('each fragment has valid difficulty', () => {
      for (const fragment of DEFAULT_MELODY_FRAGMENTS) {
        expect(fragment.difficulty).toBeGreaterThanOrEqual(1);
        expect(fragment.difficulty).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('getMelodyFragmentsForGenre', () => {
    it('returns only fragments for the specified genre', () => {
      const calmFragments = getMelodyFragmentsForGenre('calm');
      for (const fragment of calmFragments) {
        expect(fragment.genre).toBe('calm');
      }

      const energeticFragments = getMelodyFragmentsForGenre('energetic');
      for (const fragment of energeticFragments) {
        expect(fragment.genre).toBe('energetic');
      }
    });
  });

  describe('getMelodyFragment', () => {
    it('returns null for unknown fragment', () => {
      expect(getMelodyFragment('nonexistent')).toBeNull();
    });

    it('returns fragment for known ID', () => {
      const fragment = getMelodyFragment('calm-fragment-1');
      expect(fragment).not.toBeNull();
      expect(fragment!.id).toBe('calm-fragment-1');
    });
  });

  describe('midiNoteToFrequency', () => {
    it('converts MIDI 69 to 440 Hz', () => {
      expect(midiNoteToFrequency(69)).toBeCloseTo(440, 5);
    });

    it('converts MIDI 60 (middle C) to ~261.63 Hz', () => {
      expect(midiNoteToFrequency(60)).toBeCloseTo(261.63, 2);
    });

    it('converts MIDI 72 (C5) to ~523.25 Hz', () => {
      expect(midiNoteToFrequency(72)).toBeCloseTo(523.25, 2);
    });

    it('frequency increases with higher MIDI notes', () => {
      expect(midiNoteToFrequency(72)).toBeGreaterThan(midiNoteToFrequency(60));
    });
  });

  describe('getScaleNote', () => {
    it('returns note within the scale pattern', () => {
      const scale = [0, 2, 4, 5, 7];
      const baseNote = 60;

      for (let i = 0; i < scale.length; i++) {
        const note = getScaleNote(baseNote, i, scale);
        expect(note).toBe(baseNote + scale[i]);
      }
    });

    it('wraps around for scale degrees beyond pattern length', () => {
      const scale = [0, 2, 4, 5, 7];
      const baseNote = 60;

      const note0 = getScaleNote(baseNote, 0, scale);
      const note5 = getScaleNote(baseNote, 5, scale);
      expect(note5).toBe(note0); // 5 % 5 = 0
    });
  });
});
