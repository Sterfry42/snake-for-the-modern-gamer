// Tests for compendium system — verifies discovery, taming, and snapshot logic.

import { describe, it, expect, beforeEach } from 'vitest';
import { CompendiumSystem } from '../compendiumSystem.js';
import { COMPANION_DEFINITIONS } from '../companionRegistry.js';

describe('CompendiumSystem', () => {
  let compendium: CompendiumSystem;

  beforeEach(() => {
    compendium = new CompendiumSystem();
  });

  describe('discoverCompanion', () => {
    it('marks a creature as discovered', () => {
      compendium.discoverCompanion('ember-wisp', 5);
      expect(compendium.isDiscovered('ember-wisp')).toBe(true);
    });

    it('does not change first encounter on second discovery', () => {
      compendium.discoverCompanion('ember-wisp', 5);
      compendium.discoverCompanion('ember-wisp', 10);
      const view = compendium.getCompendiumView(COMPANION_DEFINITIONS);
      const ember = view.find((v) => v.companionId === 'ember-wisp');
      expect(ember?.totalEncounters).toBe(2);
    });

    it('records encounter count', () => {
      compendium.discoverCompanion('ember-wisp', 5);
      compendium.recordEncounter('ember-wisp');
      const view = compendium.getCompendiumView(COMPANION_DEFINITIONS);
      const ember = view.find((v) => v.companionId === 'ember-wisp');
      expect(ember?.totalEncounters).toBe(2);
    });
  });

  describe('isDiscovered', () => {
    it('returns false for undiscovered creatures', () => {
      expect(compendium.isDiscovered('ember-wisp')).toBe(false);
    });

    it('returns true after discoverCompanion', () => {
      compendium.discoverCompanion('ember-wisp', 1);
      expect(compendium.isDiscovered('ember-wisp')).toBe(true);
    });
  });

  describe('getDiscoveryCount / getTotalCompanions', () => {
    it('returns 0 initially', () => {
      expect(compendium.getDiscoveryCount()).toBe(0);
    });

    it('returns correct count after discoveries', () => {
      compendium.discoverCompanion('ember-wisp', 1);
      compendium.discoverCompanion('dust-bunny', 2);
      expect(compendium.getDiscoveryCount()).toBe(2);
    });

    it('returns total definitions count', () => {
      expect(compendium.getTotalCompanions()).toBe(12);
    });
  });

  describe('getCompendiumView', () => {
    it('shows silhouettes for undiscovered creatures', () => {
      const view = compendium.getCompendiumView(COMPANION_DEFINITIONS);
      expect(view.length).toBe(12);
      expect(view.every((v) => v.discovered === false)).toBe(true);
    });

    it('marks discovered creatures correctly', () => {
      compendium.discoverCompanion('ember-wisp', 1);
      compendium.discoverCompanion('stoneback-turtle', 5);

      const view = compendium.getCompendiumView(COMPANION_DEFINITIONS);
      const ember = view.find((v) => v.companionId === 'ember-wisp');
      const turtle = view.find((v) => v.companionId === 'stoneback-turtle');
      const moth = view.find((v) => v.companionId === 'rust-moth');

      expect(ember?.discovered).toBe(true);
      expect(turtle?.discovered).toBe(true);
      expect(moth?.discovered).toBe(false);
    });
  });

  describe('markTamed', () => {
    it('marks a creature as tamed', () => {
      compendium.markTamed('ember-wisp');
      const view = compendium.getCompendiumView(COMPANION_DEFINITIONS);
      const ember = view.find((v) => v.companionId === 'ember-wisp');
      expect(ember?.tamed).toBe(true);
    });

    it('works independently of discovered state', () => {
      compendium.markTamed('ember-wisp');
      const view = compendium.getCompendiumView(COMPANION_DEFINITIONS);
      const ember = view.find((v) => v.companionId === 'ember-wisp');
      expect(ember?.tamed).toBe(true);
      expect(ember?.discovered).toBe(false); // Not auto-discovered
    });
  });

  describe('markBondReached', () => {
    it('records max bond level', () => {
      compendium.markBondReached('ember-wisp', 3);
      const view = compendium.getCompendiumView(COMPANION_DEFINITIONS);
      const ember = view.find((v) => v.companionId === 'ember-wisp');
      expect(ember?.maxBondReached).toBe(3);
    });

    it('updates to higher bond level only', () => {
      compendium.markBondReached('ember-wisp', 2);
      compendium.markBondReached('ember-wisp', 4);
      const view = compendium.getCompendiumView(COMPANION_DEFINITIONS);
      const ember = view.find((v) => v.companionId === 'ember-wisp');
      expect(ember?.maxBondReached).toBe(4);
    });

    it('does not update to lower bond level', () => {
      compendium.markBondReached('ember-wisp', 4);
      compendium.markBondReached('ember-wisp', 2);
      const view = compendium.getCompendiumView(COMPANION_DEFINITIONS);
      const ember = view.find((v) => v.companionId === 'ember-wisp');
      expect(ember?.maxBondReached).toBe(4);
    });
  });

  describe('getSnapshot / loadSnapshot', () => {
    it('produces a valid snapshot', () => {
      compendium.discoverCompanion('ember-wisp', 1);
      compendium.markTamed('ember-wisp');
      compendium.markBondReached('ember-wisp', 3);

      const snapshot = compendium.getSnapshot();
      expect(snapshot.discovered).toContain('ember-wisp');
      expect(snapshot.totalBred).toBe(0);
    });

    it('restores discovered state and max bond from snapshot', () => {
      compendium.discoverCompanion('ember-wisp', 1);
      compendium.discoverCompanion('dust-bunny', 3);
      compendium.markTamed('ember-wisp');
      compendium.markBondReached('ember-wisp', 2);

      const snapshot = compendium.getSnapshot();

      const newCompendium = new CompendiumSystem();
      newCompendium.loadSnapshot(snapshot);

      expect(newCompendium.isDiscovered('ember-wisp')).toBe(true);
      expect(newCompendium.isDiscovered('dust-bunny')).toBe(true);
      expect(newCompendium.isDiscovered('rust-moth')).toBe(false);

      const view = newCompendium.getCompendiumView(COMPANION_DEFINITIONS);
      const ember = view.find((v) => v.companionId === 'ember-wisp');
      expect(ember?.maxBondReached).toBe(2);
      expect(ember?.totalEncounters).toBe(1); // discoverCompanion recorded 1 encounter
    });
  });

  describe('recordEncounter', () => {
    it('increments encounter count without discovering', () => {
      compendium.recordEncounter('ember-wisp');
      compendium.recordEncounter('ember-wisp');
      const view = compendium.getCompendiumView(COMPANION_DEFINITIONS);
      const ember = view.find((v) => v.companionId === 'ember-wisp');
      expect(ember?.totalEncounters).toBe(2);
      expect(ember?.discovered).toBe(false);
    });
  });
});
