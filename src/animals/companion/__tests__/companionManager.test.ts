import { describe, expect, it, beforeEach } from 'vitest';
import { CompanionManager } from '../CompanionManager.js';
import type { AnimalType, CompanionTrait } from '../../ecosystem/types.js';

describe('CompanionManager', () => {
  let manager: CompanionManager;

  beforeEach(() => {
    manager = new CompanionManager();
  });

  describe('trait definitions', () => {
    it('returns all trait definitions', () => {
      const traits = CompanionManager.getTraitDefinitions();
      expect(Object.keys(traits).length).toBeGreaterThan(0);
    });

    it('gets a trait definition by ID', () => {
      const trait = CompanionManager.getTraitDefinition('swift');
      expect(trait.label).toBe('Swift');
      expect(trait.description).toBeDefined();
    });

    it('returns trait inheritance map', () => {
      const inheritance = CompanionManager.getTraitInheritance();
      expect(Object.keys(inheritance).length).toBeGreaterThan(0);
    });
  });

  describe('adding companions', () => {
    it('adds a companion with default traits', () => {
      const companion = manager.addCompanion('fox', 'Slim', 1, 0, 1);

      expect(companion.id).toBeDefined();
      expect(companion.type).toBe('fox');
      expect(companion.name).toBe('Slim');
      expect(companion.bond).toBe(1);
      expect(companion.traits.length).toBe(0);
      expect(companion.generation).toBe(1);
    });

    it('adds a companion with initial traits', () => {
      const companion = manager.addCompanion('wolf', 'Alpha', 5, 0, 1, ['swift', 'fierce']);

      expect(companion.traits).toContain('swift');
      expect(companion.traits).toContain('fierce');
    });
  });

  describe('getting companions', () => {
    it('gets a companion by ID', () => {
      const companion = manager.addCompanion('fox', 'Slim', 1, 0, 1);
      const found = manager.getCompanion(companion.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe('Slim');
    });

    it('returns undefined for unknown ID', () => {
      expect(manager.getCompanion('unknown')).toBeUndefined();
    });

    it('gets all companions', () => {
      manager.addCompanion('fox', 'Slim', 1, 0, 1);
      manager.addCompanion('wolf', 'Alpha', 5, 0, 1);

      const all = manager.getAllCompanions();
      expect(all.length).toBe(2);
    });

    it('gets companions by type', () => {
      manager.addCompanion('fox', 'Slim', 1, 0, 1);
      manager.addCompanion('wolf', 'Alpha', 5, 0, 1);
      manager.addCompanion('fox', 'Foxy', 3, 0, 1);

      const foxes = manager.getCompanionsByType('fox');
      expect(foxes.length).toBe(2);
    });
  });

  describe('feeding companions', () => {
    it('feeds a companion and increases bond', () => {
      const companion = manager.addCompanion('fox', 'Slim', 1, 0, 1);

      const result = manager.feedCompanion(companion.id, 2);

      expect(result.success).toBe(true);
      expect(result.companion?.bond).toBe(3);
      expect(result.companion?.timesFed).toBe(1);
      expect(result.previousBond).toBe(1);
    });

    it('returns failure for unknown companion', () => {
      const result = manager.feedCompanion('unknown', 2);
      expect(result.success).toBe(false);
    });

    it('detects bond milestones', () => {
      const companion = manager.addCompanion('fox', 'Slim', 4, 0, 1);

      const result = manager.feedCompanion(companion.id, 2);
      expect(result.crossedMilestone).toBe(true);
    });

    it('does not detect milestone when not crossing', () => {
      const companion = manager.addCompanion('fox', 'Slim', 6, 0, 1);

      const result = manager.feedCompanion(companion.id, 1);
      expect(result.crossedMilestone).toBe(false);
    });

    it('applies trait bond bonus', () => {
      const companion = manager.addCompanion(
        'fox',
        'Slim',
        1,
        0,
        1,
        ['gentle'],
      );

      const result = manager.feedCompanion(companion.id, 2);
      // gentle trait gives +2 bond bonus
      expect(result.companion?.bond).toBeGreaterThan(3);
    });

    it('adds XP on feed', () => {
      const companion = manager.addCompanion('fox', 'Slim', 1, 0, 1);
      manager.feedCompanion(companion.id, 2);
      expect(companion.xp).toBeGreaterThan(0);
    });
  });

  describe('bond tiers', () => {
    it('returns WARY for low bond', () => {
      expect(manager.getBondTier(1)).toBe('WARY');
      expect(manager.getBondTier(4)).toBe('WARY');
    });

    it('returns TRUSTING for medium bond', () => {
      expect(manager.getBondTier(5)).toBe('TRUSTING');
      expect(manager.getBondTier(9)).toBe('TRUSTING');
    });

    it('returns LOYAL for high bond', () => {
      expect(manager.getBondTier(10)).toBe('LOYAL');
      expect(manager.getBondTier(19)).toBe('LOYAL');
    });

    it('returns SOULBOUND for max bond', () => {
      expect(manager.getBondTier(20)).toBe('SOULBOUND');
      expect(manager.getBondTier(50)).toBe('SOULBOUND');
    });
  });

  describe('crossing milestones', () => {
    it('detects crossing from WARY to TRUSTING', () => {
      expect(manager.crossedMilestone(4, 5)).toBe(true);
    });

    it('detects crossing from TRUSTING to LOYAL', () => {
      expect(manager.crossedMilestone(9, 10)).toBe(true);
    });

    it('detects crossing from LOYAL to SOULBOUND', () => {
      expect(manager.crossedMilestone(19, 20)).toBe(true);
    });

    it('does not detect crossing when not crossing', () => {
      expect(manager.crossedMilestone(1, 2)).toBe(false);
      expect(manager.crossedMilestone(5, 6)).toBe(false);
    });
  });

  describe('hunting bonus', () => {
    it('calculates hunting bonus from bond', () => {
      manager.addCompanion('fox', 'Slim', 20, 0, 1);
      const bonus = manager.getHuntingBonus();
      expect(bonus).toBeGreaterThan(0);
    });

    it('adds trait bonuses to hunting bonus', () => {
      manager.addCompanion('fox', 'Slim', 20, 0, 1, ['strong']);
      const bonus = manager.getHuntingBonus();
      expect(bonus).toBeGreaterThan(0.05); // base + strong trait
    });

    it('returns zero with no companions', () => {
      const bonus = manager.getHuntingBonus();
      expect(bonus).toBe(0);
    });
  });

  describe('companion views', () => {
    it('generates a companion view', () => {
      const companion = manager.addCompanion('fox', 'Slim', 10, 5, 1, ['swift']);
      const view = manager.getCompanionView(companion);

      expect(view.id).toBe(companion.id);
      expect(view.name).toBe('Slim');
      expect(view.bondTier).toBe('LOYAL');
      expect(view.traits).toContain('swift');
      expect(view.huntingBonusPercent).toBeGreaterThan(0);
    });

    it('generates views for all companions', () => {
      manager.addCompanion('fox', 'Slim', 10, 0, 1);
      manager.addCompanion('wolf', 'Alpha', 5, 0, 1);

      const views = manager.getAllCompanionViews();
      expect(views.length).toBe(2);
    });
  });

  describe('removing companions', () => {
    it('removes a companion', () => {
      const companion = manager.addCompanion('fox', 'Slim', 1, 0, 1);
      const result = manager.removeCompanion(companion.id);

      expect(result).toBe(true);
      expect(manager.getCompanion(companion.id)).toBeUndefined();
    });

    it('returns false for unknown ID', () => {
      expect(manager.removeCompanion('unknown')).toBe(false);
    });
  });

  describe('breeding', () => {
    it('breeds two compatible companions', () => {
      const p1 = manager.addCompanion('fox', 'Slim', 15, 0, 1);
      const p2 = manager.addCompanion('fox', 'Foxy', 15, 0, 1);

      const result = manager.breedCompanions(p1.id, p2.id, 1);
      expect(result.success).toBe(true);
      expect(result.offspring).toBeDefined();
      expect(result.offspring?.type).toBe('fox');
    });

    it('rejects breeding different types', () => {
      const p1 = manager.addCompanion('fox', 'Slim', 15, 0, 1);
      const p2 = manager.addCompanion('wolf', 'Alpha', 15, 0, 1);

      const result = manager.breedCompanions(p1.id, p2.id, 1);
      expect(result.success).toBe(false);
    });

    it('rejects breeding with insufficient bond', () => {
      const p1 = manager.addCompanion('fox', 'Slim', 5, 0, 1);
      const p2 = manager.addCompanion('fox', 'Foxy', 5, 0, 1);

      const result = manager.breedCompanions(p1.id, p2.id, 1);
      expect(result.success).toBe(false);
    });

    it('rejects breeding with unknown IDs', () => {
      const result = manager.breedCompanions('unknown1', 'unknown2', 1);
      expect(result.success).toBe(false);
    });
  });

  describe('photography', () => {
    it('takes a photo of a companion', () => {
      const companion = manager.addCompanion('fox', 'Slim', 1, 0, 1);
      const result = manager.takePhoto(companion.id);

      expect(result.success).toBe(true);
      expect(result.photoTaken).toBe(true);
    });

    it('returns failure for unknown companion', () => {
      const result = manager.takePhoto('unknown');
      expect(result.success).toBe(false);
    });
  });
});
