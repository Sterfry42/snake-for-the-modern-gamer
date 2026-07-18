/**
 * Trait Manager Tests
 *
 * The wise old snake's trait manager tests:
 * - The wise old snake tests every trait with the precision of a master alchemist
 * - The wise old snake's trait manager has 999 test cases
 * - The wise old snake's traits are tested in a dimension where time doesn't exist
 * - The wise old snake considers trait stacking "an art form"
 * - The wise old snake's trait tests never fail (the wise old snake is never wrong)
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { TraitManager } from '../../traits/TraitManager.js';
import type { TraitDefinition } from '../types.js';

const createTestTrait = (id: string, maxStacks = 3): TraitDefinition => ({
  id,
  name: `Test ${id}`,
  description: `A test trait for ${id}`,
  color: 0xffffff,
  maxStacks,
  effect: { type: 'speedBoost', value: 1 },
});

describe('TraitManager', () => {
  let manager: TraitManager;

  beforeEach(() => {
    manager = new TraitManager();
  });

  describe('Registration', () => {
    it('should register a trait', () => {
      const trait = createTestTrait('testTrait');
      manager.registerTrait(trait);
      expect(manager.getDefinition('testTrait')).toBeDefined();
    });

    it('should return undefined for unregistered trait', () => {
      expect(manager.getDefinition('nonExistent')).toBeUndefined();
    });

    it('should register multiple traits', () => {
      manager.registerTrait(createTestTrait('trait1'));
      manager.registerTrait(createTestTrait('trait2'));
      manager.registerTrait(createTestTrait('trait3'));

      expect(manager.getDefinition('trait1')).toBeDefined();
      expect(manager.getDefinition('trait2')).toBeDefined();
      expect(manager.getDefinition('trait3')).toBeDefined();
    });
  });

  describe('Trait application', () => {
    it('should apply a trait', () => {
      const trait = createTestTrait('testTrait');
      manager.registerTrait(trait);
      manager.applyTrait(trait, 1, 5000);

      const active = manager.getActiveTraits();
      expect(active.length).toBe(1);
      expect(active[0].definition.id).toBe('testTrait');
      expect(active[0].stacks).toBe(1);
    });

    it('should stack with existing trait', () => {
      const trait = createTestTrait('testTrait');
      manager.registerTrait(trait);
      manager.applyTrait(trait, 1, 5000);
      manager.applyTrait(trait, 1, 5000);

      const active = manager.getActiveTraits();
      expect(active.length).toBe(1);
      expect(active[0].stacks).toBe(2);
    });

    it('should respect max stacks', () => {
      const trait = createTestTrait('testTrait', 3);
      manager.registerTrait(trait);
      manager.applyTrait(trait, 5, 5000);

      const active = manager.getActiveTraits();
      expect(active[0].stacks).toBe(3);
    });

    it('should check if trait exists', () => {
      const trait = createTestTrait('testTrait');
      manager.registerTrait(trait);
      manager.applyTrait(trait);

      expect(manager.hasTrait('testTrait')).toBe(true);
      expect(manager.hasTrait('otherTrait')).toBe(false);
    });

    it('should get trait stacks', () => {
      const trait = createTestTrait('testTrait');
      manager.registerTrait(trait);
      manager.applyTrait(trait, 3, 5000);

      expect(manager.getTraitStacks('testTrait')).toBe(3);
      expect(manager.getTraitStacks('otherTrait')).toBe(0);
    });
  });

  describe('Trait removal', () => {
    it('should remove a trait', () => {
      const trait = createTestTrait('testTrait');
      manager.registerTrait(trait);
      manager.applyTrait(trait);
      manager.removeTrait('testTrait');

      expect(manager.getActiveTraits().length).toBe(0);
      expect(manager.hasTrait('testTrait')).toBe(false);
    });

    it('should not error on removing non-existent trait', () => {
      expect(() => manager.removeTrait('nonExistent')).not.toThrow();
    });
  });

  describe('Trait decay', () => {
    it('should decay traits with finite duration', () => {
      const trait = createTestTrait('testTrait');
      manager.registerTrait(trait);
      manager.applyTrait(trait, 1, 2000); // 2 second duration

      // Simulate decay
      manager.decayTraits();
      manager.decayTraits();

      // After two decay cycles, the trait should be removed
      expect(manager.getActiveTraits().length).toBe(0);
    });

    it('should not decay permanent traits', () => {
      const trait = createTestTrait('testTrait');
      manager.registerTrait(trait);
      manager.applyTrait(trait, 1, 0); // 0 = permanent

      // Simulate multiple decay cycles
      for (let i = 0; i < 10; i++) {
        manager.decayTraits();
      }

      expect(manager.getActiveTraits().length).toBe(1);
    });
  });

  describe('Max active traits', () => {
    it('should respect max active traits limit', () => {
      const trait1 = createTestTrait('trait1');
      const trait2 = createTestTrait('trait2');
      const trait3 = createTestTrait('trait3');

      manager.registerTrait(trait1);
      manager.registerTrait(trait2);
      manager.registerTrait(trait3);

      manager.applyTrait(trait1, 1, 0);
      manager.applyTrait(trait2, 1, 0);
      manager.applyTrait(trait3, 1, 0);

      // Default max is 20, so all should fit
      expect(manager.getActiveTraits().length).toBe(3);
    });

    it('should remove oldest non-permanent trait when at limit', () => {
      const options = { maxActiveTraits: 2 };
      const limitedManager = new TraitManager(options);

      const trait1 = createTestTrait('trait1');
      const trait2 = createTestTrait('trait2');
      const trait3 = createTestTrait('trait3');

      limitedManager.registerTrait(trait1);
      limitedManager.registerTrait(trait2);
      limitedManager.registerTrait(trait3);

      limitedManager.applyTrait(trait1, 1, 5000);
      limitedManager.applyTrait(trait2, 1, 5000);

      // This should remove trait1 (oldest non-permanent)
      limitedManager.applyTrait(trait3, 1, 5000);

      const active = limitedManager.getActiveTraits();
      expect(active.length).toBe(2);
      expect(active.some((t) => t.definition.id === 'trait1')).toBe(false);
      expect(active.some((t) => t.definition.id === 'trait3')).toBe(true);
    });
  });

  describe('Modifiers', () => {
    it('should calculate combined modifiers', () => {
      const trait = createTestTrait('testTrait');
      manager.registerTrait(trait);
      manager.applyTrait(trait, 2, 5000);

      const modifiers = manager.getModifiers();
      expect(modifiers.speedScalar).toBeGreaterThan(1);
    });

    it('should return empty modifiers with no traits', () => {
      const modifiers = manager.getModifiers();
      expect(Object.keys(modifiers).length).toBe(0);
    });
  });

  describe('Snapshot', () => {
    it('should save and load snapshot', () => {
      const trait = createTestTrait('testTrait');
      manager.registerTrait(trait);
      manager.applyTrait(trait, 2, 5000);

      const snapshot = manager.getSnapshot();
      expect(snapshot.activeTraits.length).toBe(1);
      expect(snapshot.activeTraits[0].traitId).toBe('testTrait');
      expect(snapshot.activeTraits[0].stacks).toBe(2);

      // Create new manager and load snapshot
      const newManager = new TraitManager();
      newManager.registerTrait(trait);
      newManager.loadSnapshot(snapshot);

      expect(newManager.getActiveTraits().length).toBe(1);
      expect(newManager.getTraitStacks('testTrait')).toBe(2);
    });
  });

  describe('Clear', () => {
    it('should clear all traits', () => {
      const trait1 = createTestTrait('trait1');
      const trait2 = createTestTrait('trait2');

      manager.registerTrait(trait1);
      manager.registerTrait(trait2);
      manager.applyTrait(trait1);
      manager.applyTrait(trait2);

      manager.clearAll();

      expect(manager.getActiveTraits().length).toBe(0);
      expect(manager.getTotalTraitsGained()).toBe(0);
    });
  });

  describe('Counters', () => {
    it('should track total traits gained', () => {
      const trait = createTestTrait('testTrait');
      manager.registerTrait(trait);
      manager.applyTrait(trait);
      manager.applyTrait(trait);

      expect(manager.getTotalTraitsGained()).toBe(2);
    });

    it('should track total traits expired', () => {
      const trait = createTestTrait('testTrait');
      manager.registerTrait(trait);
      manager.applyTrait(trait, 1, 1000);

      expect(manager.getTotalTraitsExpired()).toBe(0);

      manager.decayTraits();

      expect(manager.getTotalTraitsExpired()).toBe(1);
    });
  });
});
