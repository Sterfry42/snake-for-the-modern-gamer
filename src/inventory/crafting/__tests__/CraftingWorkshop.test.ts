/**
 * CraftingWorkshop Tests
 *
 * The wise old snake's workshop tests:
 * - The wise old snake's workshop tests were all cardboard boxes
 * - The wise old snake's workshop tests couldn't build anything
 * - The wise old snake's workshop tests had no definitions
 * - The wise old snake's workshop tests crashed on build
 * - The wise old snake's workshop tests tested nothing
 */

import { describe, expect, it } from 'vitest';
import {
  CraftingWorkshop,
  COSMETIC_SKINS,
  PATTERNS,
  canBuildWorkshop,
  getAvailablePatterns,
  getAvailableSkins,
  getAllWorkshopDefinitions,
  getWorkshopDefinition,
} from '../CraftingWorkshop.js';
import type { WorkshopType } from '../../alchemy/alchemyTypes.js';

describe('CraftingWorkshop', () => {
  describe('workshop definitions', () => {
    it('gets all workshop definitions', () => {
      const definitions = getAllWorkshopDefinitions();
      expect(definitions.length).toBe(4);
    });

    it('gets a workshop definition by type', () => {
      const def = getWorkshopDefinition('enchantedLoom');
      expect(def).toBeDefined();
      expect(def.type).toBe('enchantedLoom');
    });

    it('returns undefined for non-existent workshop type', () => {
      const result = getWorkshopDefinition('non-existent' as WorkshopType);
      expect(result).toBeUndefined();
    });
  });

  describe('workshop building', () => {
    it('creates an unbuilt workshop', () => {
      const workshop = new CraftingWorkshop('enchantedLoom');
      expect(workshop.isBuilt()).toBe(false);
    });

    it('builds a workshop when resources are available', () => {
      const workshop = new CraftingWorkshop('enchantedLoom');
      const built = workshop.build(
        () => true,
        () => true,
      );
      expect(built).toBe(true);
      expect(workshop.isBuilt()).toBe(true);
    });

    it('fails to build when resources are unavailable', () => {
      const workshop = new CraftingWorkshop('enchantedLoom');
      const built = workshop.build(
        () => false,
        () => true,
      );
      expect(built).toBe(false);
      expect(workshop.isBuilt()).toBe(false);
    });

    it('cannot build an already built workshop', () => {
      const workshop = new CraftingWorkshop('enchantedLoom');
      workshop.build(
        () => true,
        () => true,
      );
      const built = workshop.build(
        () => true,
        () => true,
      );
      expect(built).toBe(false);
    });

    it('records crafted items', () => {
      const workshop = new CraftingWorkshop('enchantedLoom');
      workshop.recordCraft('cosmetic-skin-1', 2);
      expect(workshop.getCraftedCount('cosmetic-skin-1')).toBe(2);
    });

    it('gets all crafted items', () => {
      const workshop = new CraftingWorkshop('enchantedLoom');
      workshop.recordCraft('cosmetic-skin-1', 2);
      workshop.recordCraft('cosmetic-skin-2', 1);
      const crafted = workshop.getAllCrafted();
      expect(crafted.length).toBe(2);
    });
  });

  describe('capabilities', () => {
    it('gets workshop capabilities', () => {
      const workshop = new CraftingWorkshop('enchantedLoom');
      const caps = workshop.getCapabilities();
      expect(caps.length).toBeGreaterThan(0);
    });

    it('checks if a capability exists', () => {
      const workshop = new CraftingWorkshop('enchantedLoom');
      expect(workshop.hasCapability('cosmeticSkin')).toBe(true);
      expect(workshop.hasCapability('non-existent')).toBe(false);
    });
  });

  describe('workshop build cost checking', () => {
    it('checks if a workshop can be built', () => {
      const canBuild = canBuildWorkshop('enchantedLoom', () => true);
      expect(canBuild).toBe(true);
    });

    it('returns false when resources are insufficient', () => {
      const canBuild = canBuildWorkshop('enchantedLoom', () => false);
      expect(canBuild).toBe(false);
    });
  });

  describe('cosmetic skins', () => {
    it('gets all cosmetic skins', () => {
      expect(COSMETIC_SKINS.length).toBeGreaterThan(0);
    });

    it('gets available skins based on inventory', () => {
      const available = getAvailableSkins(() => true);
      expect(available.length).toBe(COSMETIC_SKINS.length);
    });

    it('filters unavailable skins', () => {
      const available = getAvailableSkins(() => false);
      expect(available.length).toBe(0);
    });
  });

  describe('patterns', () => {
    it('gets all patterns', () => {
      expect(PATTERNS.length).toBeGreaterThan(0);
    });

    it('gets available patterns based on inventory', () => {
      const available = getAvailablePatterns(() => true);
      expect(available.length).toBe(PATTERNS.length);
    });

    it('filters unavailable patterns', () => {
      const available = getAvailablePatterns(() => false);
      expect(available.length).toBe(0);
    });
  });
});
