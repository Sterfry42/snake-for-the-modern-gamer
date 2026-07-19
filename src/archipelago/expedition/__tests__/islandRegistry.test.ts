import { describe, it, expect } from 'vitest';
import {
  ISLAND_DEFINITIONS,
  ISLAND_BY_ID,
  ISLAND_BOSS_BY_ID,
  ISLAND_UNLOCK_ORDER,
  ISLAND_APPLE_DEFINITIONS,
  ISLAND_APPLE_BY_ID,
  LEGACY_EFFECT_DEFINITIONS,
  LEGACY_EFFECT_BY_ID,
} from '../IslandRegistry.js';
import type { IslandId, LegacyEffectId } from '../types.js';

describe('IslandRegistry', () => {
  describe('ISLAND_DEFINITIONS', () => {
    it('should define exactly 6 islands', () => {
      expect(ISLAND_DEFINITIONS).toHaveLength(6);
    });

    it('should have unique island IDs', () => {
      const ids = ISLAND_DEFINITIONS.map((i) => i.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('should have all required fields', () => {
      for (const island of ISLAND_DEFINITIONS) {
        expect(island.id).toBeDefined();
        expect(island.name).toBeDefined();
        expect(island.biome).toBeDefined();
        expect(island.description).toBeDefined();
        expect(island.unlockScore).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(island.requiredApples)).toBe(true);
        expect(Array.isArray(island.preferredApples)).toBe(true);
        expect(Array.isArray(island.avoidedApples)).toBe(true);
        expect(island.bossId).toBeDefined();
        expect(island.rewardId).toBeDefined();
        expect(island.legacyEffect).toBeDefined();
        expect(Array.isArray(island.stages)).toBe(true);
        expect(island.stages.length).toBeGreaterThan(0);
        expect(island.color).toBeDefined();
        expect(island.wallColor).toBeDefined();
        expect(island.backgroundColor).toBeDefined();
      }
    });

    it('should have 4 stages per island', () => {
      for (const island of ISLAND_DEFINITIONS) {
        expect(island.stages).toHaveLength(4);
      }
    });

    it('should have stages in order', () => {
      for (const island of ISLAND_DEFINITIONS) {
        const orders = island.stages.map((s) => s.order);
        expect(orders).toEqual([0, 1, 2, 3]);
      }
    });
  });

  describe('ISLAND_BY_ID', () => {
    it('should contain all islands by ID', () => {
      for (const island of ISLAND_DEFINITIONS) {
        expect(ISLAND_BY_ID[island.id]).toBe(island);
      }
    });

    it('should not contain unknown islands', () => {
      expect(ISLAND_BY_ID['unknown-island']).toBeUndefined();
    });
  });

  describe('ISLAND_UNLOCK_ORDER', () => {
    it('should list all island IDs in order', () => {
      const expected: IslandId[] = [
        'volcanic-isle',
        'crystal-cavern',
        'sunken-temple',
        'sky-garden',
        'ancient-ruins',
        'mirror-dimension',
      ];
      expect(ISLAND_UNLOCK_ORDER).toEqual(expected);
    });

    it('should have increasing unlock scores', () => {
      for (let i = 1; i < ISLAND_UNLOCK_ORDER.length; i++) {
        const prev = ISLAND_BY_ID[ISLAND_UNLOCK_ORDER[i - 1]];
        const curr = ISLAND_BY_ID[ISLAND_UNLOCK_ORDER[i]];
        expect(curr.unlockScore).toBeGreaterThan(prev.unlockScore);
      }
    });
  });

  describe('ISLAND_BOSS_BY_ID', () => {
    it('should map boss IDs to their islands', () => {
      for (const island of ISLAND_DEFINITIONS) {
        expect(ISLAND_BOSS_BY_ID[island.bossId]).toBe(island);
      }
    });
  });

  describe('ISLAND_APPLE_DEFINITIONS', () => {
    it('should define exactly 12 island apples', () => {
      expect(ISLAND_APPLE_DEFINITIONS).toHaveLength(12);
    });

    it('should have unique apple IDs', () => {
      const ids = ISLAND_APPLE_DEFINITIONS.map((a) => a.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('should have all required fields', () => {
      for (const apple of ISLAND_APPLE_DEFINITIONS) {
        expect(apple.id).toBeDefined();
        expect(apple.name).toBeDefined();
        expect(apple.typeId).toBeDefined();
        expect(apple.color).toBeDefined();
        expect(apple.growth).toBeGreaterThan(0);
        expect(apple.bonusScore).toBeGreaterThanOrEqual(0);
        expect(apple.specialBehavior).toBeDefined();
      }
    });
  });

  describe('ISLAND_APPLE_BY_ID', () => {
    it('should contain all apples by ID', () => {
      for (const apple of ISLAND_APPLE_DEFINITIONS) {
        expect(ISLAND_APPLE_BY_ID[apple.id]).toBe(apple);
      }
    });
  });

  describe('LEGACY_EFFECT_DEFINITIONS', () => {
    it('should define exactly 6 legacy effects', () => {
      expect(LEGACY_EFFECT_DEFINITIONS).toHaveLength(6);
    });

    it('should have unique effect IDs', () => {
      const ids = LEGACY_EFFECT_DEFINITIONS.map((e) => e.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('should map each island to exactly one legacy effect', () => {
      const islandEffects = LEGACY_EFFECT_DEFINITIONS.map((e) => e.islandId);
      const unique = new Set(islandEffects);
      expect(unique.size).toBe(islandEffects.length);
    });

    it('should have valid visual types', () => {
      const validTypes = ['horizon', 'deposit', 'pool', 'floating', 'monument', 'reflection'];
      for (const effect of LEGACY_EFFECT_DEFINITIONS) {
        expect(validTypes).toContain(effect.visualType);
      }
    });
  });

  describe('LEGACY_EFFECT_BY_ID', () => {
    it('should contain all effects by ID', () => {
      for (const effect of LEGACY_EFFECT_DEFINITIONS) {
        expect(LEGACY_EFFECT_BY_ID[effect.id]).toBe(effect);
      }
    });
  });

  describe('Cross-references', () => {
    it('should have all island bosses defined', () => {
      for (const island of ISLAND_DEFINITIONS) {
        expect(island.bossId).toBeDefined();
        expect(typeof island.bossId).toBe('string');
      }
    });

    it('should have all required apples per island', () => {
      for (const island of ISLAND_DEFINITIONS) {
        expect(island.requiredApples.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should have all avoided apples per island', () => {
      for (const island of ISLAND_DEFINITIONS) {
        expect(island.avoidedApples.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});
