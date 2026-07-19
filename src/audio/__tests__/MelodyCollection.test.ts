import { describe, expect, it, beforeEach } from 'vitest';
import { MelodyCollection } from '../MelodyCollection.js';
import type { MelodyFragmentProgress } from '../MelodyCollection.js';

describe('MelodyCollection', () => {
  let collection: MelodyCollection;

  beforeEach(() => {
    collection = new MelodyCollection();
  });

  describe('initial state', () => {
    it('starts with all fragments locked', () => {
      const state = collection.getState();
      expect(state.totalUnlocked).toBe(0);
      expect(state.totalCompleted).toBe(0);
      expect(state.overallProgress).toBe(0);
      expect(state.unlockedTracks.length).toBe(0);
    });

    it('has all fragments in locked state', () => {
      const state = collection.getState();
      for (const fragment of Object.values(state.fragments)) {
        expect(fragment.state).toBe('locked');
      }
    });
  });

  describe('onAppleEaten', () => {
    it('records apples in sequence buffer', () => {
      collection.onAppleEaten('lavender');
      collection.onAppleEaten('love');
      collection.onAppleEaten('mochi');

      const state = collection.getState();
      const calmFragment = state.fragments['calm-fragment-1'];
      expect(calmFragment).not.toBeNull();
    });

    it('unlocks fragment when sequence matches', () => {
      // calm-fragment-1 requires: ['lavender', 'love', 'mochi']
      collection.onAppleEaten('lavender');
      collection.onAppleEaten('love');
      collection.onAppleEaten('mochi');

      const state = collection.getState();
      const fragment = state.fragments['calm-fragment-1'];
      expect(fragment!.state).toBe('unlocked');
    });

    it('does not unlock if sequence is wrong', () => {
      collection.onAppleEaten('caffeinated');
      collection.onAppleEaten('wasabi');
      collection.onAppleEaten('skittish');

      const state = collection.getState();
      const calmFragment = state.fragments['calm-fragment-1'];
      expect(calmFragment!.state).toBe('locked');
    });

    it('tracks sequence matches progressively', () => {
      // The sequence matching checks the last N entries in the buffer
      // We need to add apples that form the sequence at the end
      collection.onAppleEaten('lavender');
      collection.onAppleEaten('love');
      collection.onAppleEaten('mochi');
      let state = collection.getState();
      expect(state.fragments['calm-fragment-1']!.sequenceMatches).toBe(3);
      expect(state.fragments['calm-fragment-1']!.state).toBe('unlocked');
    });
  });

  describe('getState', () => {
    it('returns complete collection state', () => {
      const state = collection.getState();
      expect(state).toHaveProperty('fragments');
      expect(state).toHaveProperty('genreCompletions');
      expect(state).toHaveProperty('totalUnlocked');
      expect(state).toHaveProperty('totalCompleted');
      expect(state).toHaveProperty('overallProgress');
      expect(state).toHaveProperty('unlockedTracks');
    });

    it('calculates overall progress correctly', () => {
      // Unlock one fragment
      collection.onAppleEaten('lavender');
      collection.onAppleEaten('love');
      collection.onAppleEaten('mochi');

      const state = collection.getState();
      expect(state.totalUnlocked).toBeGreaterThanOrEqual(1);
      expect(state.overallProgress).toBeGreaterThan(0);
    });
  });

  describe('getFragmentProgress', () => {
    it('returns null for unknown fragment', () => {
      expect(collection.getFragmentProgress('nonexistent')).toBeNull();
    });

    it('returns progress for known fragment', () => {
      const progress = collection.getFragmentProgress('calm-fragment-1');
      expect(progress).not.toBeNull();
      expect(progress!.id).toBe('calm-fragment-1');
    });
  });

  describe('getGenreCompletion', () => {
    it('returns completion for calm genre', () => {
      const completion = collection.getGenreCompletion('calm');
      expect(completion).toHaveProperty('genreId', 'calm');
      expect(completion).toHaveProperty('totalFragments');
      expect(completion).toHaveProperty('unlockedFragments');
      expect(completion).toHaveProperty('progress');
    });

    it('returns completion for energetic genre', () => {
      const completion = collection.getGenreCompletion('energetic');
      expect(completion.genreId).toBe('energetic');
    });

    it('returns completion for mysterious genre', () => {
      const completion = collection.getGenreCompletion('mysterious');
      expect(completion.genreId).toBe('mysterious');
    });

    it('returns completion for festival genre', () => {
      const completion = collection.getGenreCompletion('festival');
      expect(completion.genreId).toBe('festival');
    });
  });

  describe('getUnlockedFragments', () => {
    it('returns empty array initially', () => {
      expect(collection.getUnlockedFragments().length).toBe(0);
    });

    it('returns unlocked fragments after unlocking', () => {
      collection.onAppleEaten('lavender');
      collection.onAppleEaten('love');
      collection.onAppleEaten('mochi');

      const unlocked = collection.getUnlockedFragments();
      expect(unlocked.length).toBeGreaterThan(0);
    });
  });

  describe('getCompletedFragments', () => {
    it('returns empty array initially', () => {
      expect(collection.getCompletedFragments().length).toBe(0);
    });
  });

  describe('isTrackUnlocked', () => {
    it('returns false initially', () => {
      expect(collection.isTrackUnlocked('calm')).toBe(false);
    });
  });

  describe('getUnlockedTracks', () => {
    it('returns empty array initially', () => {
      expect(collection.getUnlockedTracks().length).toBe(0);
    });
  });

  describe('callbacks', () => {
    it('calls onFragmentUnlocked when fragment is unlocked', () => {
      let unlockedFragment: MelodyFragmentProgress | undefined;
      collection.onFragmentUnlocked((fragment: MelodyFragmentProgress) => {
        unlockedFragment = fragment;
      });

      collection.onAppleEaten('lavender');
      collection.onAppleEaten('love');
      collection.onAppleEaten('mochi');

      expect(unlockedFragment).not.toBeNull();
      expect(unlockedFragment!.state).toBe('unlocked');
    });
  });

  describe('serialize/deserialize', () => {
    it('serializes and deserializes state', () => {
      // Unlock a fragment
      collection.onAppleEaten('lavender');
      collection.onAppleEaten('love');
      collection.onAppleEaten('mochi');

      const serialized = collection.serialize();
      expect(serialized).toHaveProperty('fragments');
      expect(serialized).toHaveProperty('unlockedTracks');

      // Create new collection and deserialize
      const newCollection = new MelodyCollection();
      newCollection.deserialize(serialized);

      const newState = newCollection.getState();
      const calmFragment = newState.fragments['calm-fragment-1'];
      expect(calmFragment!.state).toBe('unlocked');
    });
  });

  describe('reset', () => {
    it('resets all progress', () => {
      // Unlock a fragment
      collection.onAppleEaten('lavender');
      collection.onAppleEaten('love');
      collection.onAppleEaten('mochi');

      collection.reset();

      const state = collection.getState();
      expect(state.totalUnlocked).toBe(0);
      expect(state.totalCompleted).toBe(0);

      for (const fragment of Object.values(state.fragments)) {
        expect(fragment.state).toBe('locked');
      }
    });
  });

  describe('all genres have fragments', () => {
    it('calm has fragments', () => {
      const calmFragments = collection.getGenreCompletion('calm');
      expect(calmFragments.totalFragments).toBeGreaterThan(0);
    });

    it('energetic has fragments', () => {
      const energeticFragments = collection.getGenreCompletion('energetic');
      expect(energeticFragments.totalFragments).toBeGreaterThan(0);
    });

    it('mysterious has fragments', () => {
      const mysteriousFragments = collection.getGenreCompletion('mysterious');
      expect(mysteriousFragments.totalFragments).toBeGreaterThan(0);
    });

    it('festival has fragments', () => {
      const festivalFragments = collection.getGenreCompletion('festival');
      expect(festivalFragments.totalFragments).toBeGreaterThan(0);
    });
  });
});
