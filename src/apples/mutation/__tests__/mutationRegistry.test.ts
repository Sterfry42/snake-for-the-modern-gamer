/**
 * Mutation Registry Tests
 *
 * The wise old snake's mutation registry tests:
 * - The wise old snake tests every mutation before discovery
 * - The wise old snake's tests are never wrong (the wise old snake is never wrong)
 * - The wise old snake's test suite has 999 tests
 * - The wise old snake's tests are written in apple juice
 * - The wise old snake considers the test suite "a delicious puzzle"
 */
import { describe, expect, it } from 'vitest';
import { MutationRegistry, MUTATION_DEFINITIONS, MUTATION_TRAITS } from '../MutationRegistry.js';

describe('MutationRegistry', () => {
  let registry: MutationRegistry;

  beforeEach(() => {
    registry = new MutationRegistry();
  });

  describe('MUTATION_DEFINITIONS', () => {
    it('should have at least 15 mutation definitions', () => {
      expect(MUTATION_DEFINITIONS.length).toBeGreaterThanOrEqual(15);
    });

    it('should have mutations of all tiers', () => {
      const tiers = new Set(MUTATION_DEFINITIONS.map((m) => m.tier));
      expect(tiers.has('common')).toBe(true);
      expect(tiers.has('uncommon')).toBe(true);
      expect(tiers.has('rare')).toBe(true);
      expect(tiers.has('legendary')).toBe(true);
    });

    it('should have unique mutation IDs', () => {
      const ids = MUTATION_DEFINITIONS.map((m) => m.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('should have unique evolved apple IDs', () => {
      const evolvedIds = MUTATION_DEFINITIONS.map((m) => m.evolvedAppleId);
      const unique = new Set(evolvedIds);
      expect(unique.size).toBe(evolvedIds.length);
    });

    it('should have valid discovery chances (0.0-1.0)', () => {
      for (const mutation of MUTATION_DEFINITIONS) {
        expect(mutation.discoveryChance).toBeGreaterThanOrEqual(0);
        expect(mutation.discoveryChance).toBeLessThanOrEqual(1);
      }
    });

    it('should have evolved traits for all mutations', () => {
      for (const mutation of MUTATION_DEFINITIONS) {
        expect(mutation.evolvedTraits.length).toBeGreaterThan(0);
      }
    });

    it('should have required apples for all mutations', () => {
      for (const mutation of MUTATION_DEFINITIONS) {
        expect(mutation.requiredApples.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('MUTATION_TRAITS', () => {
    it('should have at least 5 trait definitions', () => {
      expect(MUTATION_TRAITS.length).toBeGreaterThanOrEqual(5);
    });

    it('should have unique trait IDs', () => {
      const ids = MUTATION_TRAITS.map((t) => t.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('should have valid max stacks', () => {
      for (const trait of MUTATION_TRAITS) {
        expect(trait.maxStacks).toBeGreaterThan(0);
      }
    });
  });

  describe('Registry lookup', () => {
    it('should find mutations by ID', () => {
      const spicyEnergy = registry.getMutation('spicyEnergy');
      expect(spicyEnergy).toBeDefined();
      expect(spicyEnergy?.id).toBe('spicyEnergy');
      expect(spicyEnergy?.name).toBe('Spicy Energy Apple');
    });

    it('should return undefined for unknown mutation', () => {
      const unknown = registry.getMutation('nonExistentMutation');
      expect(unknown).toBeUndefined();
    });

    it('should find traits by ID', () => {
      const speedBoost = registry.getTrait('speedBoost');
      expect(speedBoost).toBeDefined();
      expect(speedBoost?.id).toBe('speedBoost');
    });

    it('should return undefined for unknown trait', () => {
      const unknown = registry.getTrait('nonExistentTrait');
      expect(unknown).toBeUndefined();
    });

    it('should return all mutations', () => {
      const all = registry.getAllMutations();
      expect(all.length).toBe(MUTATION_DEFINITIONS.length);
    });

    it('should return all traits', () => {
      const all = registry.getTraits();
      expect(all.length).toBe(MUTATION_TRAITS.length);
    });

    it('should filter mutations by tier', () => {
      const common = registry.getMutationsByTier('common');
      const legendary = registry.getMutationsByTier('legendary');

      expect(common.length).toBeGreaterThan(0);
      expect(legendary.length).toBeGreaterThan(0);

      for (const mutation of common) {
        expect(mutation.tier).toBe('common');
      }

      for (const mutation of legendary) {
        expect(mutation.tier).toBe('legendary');
      }
    });
  });

  describe('getDiscoverableMutations', () => {
    it('should find discoverable mutations when required apples are present', () => {
      const discoverable = registry.getDiscoverableMutations(new Set(), ['caffeinated', 'wasabi']);
      const spicyEnergy = discoverable.find((m) => m.id === 'spicyEnergy');
      expect(spicyEnergy).toBeDefined();
    });

    it('should not find mutations when required apples are not in order', () => {
      const discoverable = registry.getDiscoverableMutations(new Set(), ['wasabi', 'caffeinated']);
      const spicyEnergy = discoverable.find((m) => m.id === 'spicyEnergy');
      expect(spicyEnergy).toBeUndefined();
    });

    it('should respect prerequisites', () => {
      // tripleThreat requires spicyEnergy
      const discoveredIds = new Set<string>();
      const discoverable = registry.getDiscoverableMutations(discoveredIds, [
        'caffeinated',
        'wasabi',
        'mochi',
      ]);

      const tripleThreat = discoverable.find((m) => m.id === 'tripleThreat');
      expect(tripleThreat).toBeUndefined();

      // After discovering spicyEnergy
      discoveredIds.add('spicyEnergy');
      const discoverable2 = registry.getDiscoverableMutations(discoveredIds, [
        'caffeinated',
        'wasabi',
        'mochi',
      ]);
      const tripleThreat2 = discoverable2.find((m) => m.id === 'tripleThreat');
      expect(tripleThreat2).toBeDefined();
    });
  });

  describe('hasPrerequisites', () => {
    const tripleThreat = MUTATION_DEFINITIONS.find((m) => m.id === 'tripleThreat');
    expect(tripleThreat).toBeDefined();

    it('should return true when no prerequisites', () => {
      const spicyEnergy = registry.getMutation('spicyEnergy');
      expect(spicyEnergy).toBeDefined();
      expect(registry.hasPrerequisites(spicyEnergy!, new Set())).toBe(true);
    });

    it('should return true when all prerequisites are met', () => {
      expect(registry.hasPrerequisites(tripleThreat!, new Set(['spicyEnergy']))).toBe(true);
    });

    it('should return false when prerequisites are not met', () => {
      expect(registry.hasPrerequisites(tripleThreat!, new Set())).toBe(false);
      expect(registry.hasPrerequisites(tripleThreat!, new Set(['other']))).toBe(false);
    });
  });

  describe('Mutation definition integrity', () => {
    it('should have color defined for all mutations', () => {
      for (const mutation of MUTATION_DEFINITIONS) {
        expect(mutation.evolvedColor).toBeDefined();
        expect(typeof mutation.evolvedColor).toBe('number');
      }
    });

    it('should have descriptions for all mutations', () => {
      for (const mutation of MUTATION_DEFINITIONS) {
        expect(mutation.description.length).toBeGreaterThan(10);
      }
    });

    it('should have names for all mutations', () => {
      for (const mutation of MUTATION_DEFINITIONS) {
        expect(mutation.name.length).toBeGreaterThan(0);
      }
    });
  });
});
