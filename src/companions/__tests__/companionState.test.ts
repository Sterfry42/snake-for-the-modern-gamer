// Tests for companion state — verifies flag read/write round-trip.

import { describe, it, expect } from 'vitest';
import {
  COMPANION_FLAG_PREFIX,
  COMPANION_INSTANCES_KEY,
  COMPANION_COMPENDIUM_KEY,
  COMPANION_SETTINGS_KEY,
  readCompanionState,
  writeCompanionState,
  createCompanionFlagHelpers,
} from '../companionState.js';

describe('companionState', () => {
  describe('readCompanionState', () => {
    it('returns defaults when flags are empty', () => {
      const flags: Record<string, unknown> = {};
      const state = readCompanionState(flags);
      expect(state.version).toBe(1);
      expect(state.instances).toEqual({});
      expect(state.compendium.discovered).toEqual([]);
    });

    it('reads instances from flags', () => {
      const flags: Record<string, unknown> = {
        'companions.instances': {
          'wild-1': {
            id: 'wild-1',
            definitionId: 'ember-wisp',
            bondLevel: 1,
            bondProgress: 0,
            isTamed: false,
            mood: 'neutral',
            gridX: 5,
            gridY: 10,
            currentRoomId: 'test-0-0',
            lastFedRoom: 1,
            feedCountThisDay: 0,
            lastInteractionRoom: 1,
            abilitiesUsed: {},
            totalApplesEatenTogether: 0,
            totalDangersSurvived: 0,
            flags: {},
          },
        },
      };
      const state = readCompanionState(flags);
      expect(state.instances['wild-1']).toBeDefined();
      expect(state.instances['wild-1'].definitionId).toBe('ember-wisp');
    });

    it('handles invalid flag data gracefully', () => {
      const flags: Record<string, unknown> = {
        'companions.instances': 'not-an-object',
      };
      const state = readCompanionState(flags);
      expect(state.instances).toEqual({});
    });
  });

  describe('writeCompanionState', () => {
    it('writes all required keys', () => {
      const flags: Record<string, unknown> = {};
      writeCompanionState(flags, {
        version: 1,
        instances: {},
        compendium: { discovered: [], maxBondReached: {}, totalEncounters: {}, totalBred: 0 },
        settings: { mountAutoEnabled: false, followerLimit: 3 },
      });

      expect(flags[COMPANION_INSTANCES_KEY]).toBeDefined();
      expect(flags[COMPANION_COMPENDIUM_KEY]).toBeDefined();
      expect(flags[COMPANION_SETTINGS_KEY]).toBeDefined();
    });

    it('serializes compendium correctly', () => {
      const flags: Record<string, unknown> = {};
      writeCompanionState(flags, {
        version: 1,
        instances: {},
        compendium: {
          discovered: ['ember-wisp'],
          maxBondReached: { 'ember-wisp': 3 },
          totalEncounters: { 'ember-wisp': 5 },
          totalBred: 0,
        },
        settings: { mountAutoEnabled: false, followerLimit: 3 },
      });

      const compendium = flags[COMPANION_COMPENDIUM_KEY] as Record<string, unknown>;
      expect((compendium as any)?.discovered).toContain('ember-wisp');
      expect((compendium as any)?.maxBondReached).toEqual({ 'ember-wisp': 3 });
    });
  });

  describe('read/write round-trip', () => {
    it('preserves all state through a round-trip', () => {
      const flags: Record<string, unknown> = {};
      const originalState = {
        version: 1,
        instances: {
          'wild-1': {
            id: 'wild-1',
            definitionId: 'ember-wisp',
            bondLevel: 2,
            bondProgress: 50,
            isTamed: true,
            mood: 'happy' as any,
            gridX: 5,
            gridY: 10,
            currentRoomId: 'test-0-0',
            lastFedRoom: 1,
            feedCountThisDay: 1,
            lastInteractionRoom: 1,
            abilitiesUsed: { 'ember-glow': 1 } as any,
            totalApplesEatenTogether: 3,
            totalDangersSurvived: 1,
            flags: { favorite: 'apples' },
          },
        },
        compendium: {
          discovered: ['ember-wisp'],
          maxBondReached: { 'ember-wisp': 2 },
          totalEncounters: { 'ember-wisp': 2 },
          totalBred: 0,
        },
        settings: { mountAutoEnabled: true, followerLimit: 4 },
      };

      writeCompanionState(flags, originalState);
      const loadedState = readCompanionState(flags);

      expect(loadedState.version).toBe(1);
      expect(loadedState.instances['wild-1'].definitionId).toBe('ember-wisp');
      expect(loadedState.instances['wild-1'].bondLevel).toBe(2);
      expect(loadedState.instances['wild-1'].isTamed).toBe(true);
      expect(loadedState.compendium.discovered).toContain('ember-wisp');
      expect(loadedState.settings.followerLimit).toBe(4);
    });
  });

  describe('createCompanionFlagHelpers', () => {
    it('sets and gets nested companion flags', () => {
      const flags: Record<string, unknown> = {};
      const helpers = createCompanionFlagHelpers(flags);

      helpers.setCompanionFlag('encounterCooldown.ember-wisp', 100);
      expect(helpers.getCompanionFlag<number>('encounterCooldown.ember-wisp')).toBe(100);
    });

    it('returns undefined for missing flags', () => {
      const flags: Record<string, unknown> = {};
      const helpers = createCompanionFlagHelpers(flags);
      expect(helpers.getCompanionFlag('nonexistent')).toBeUndefined();
    });

    it('checks flag existence', () => {
      const flags: Record<string, unknown> = {};
      const helpers = createCompanionFlagHelpers(flags);

      expect(helpers.hasCompanionFlag('test')).toBe(false);
      helpers.setCompanionFlag('test', 'value');
      expect(helpers.hasCompanionFlag('test')).toBe(true);
    });
  });
});
