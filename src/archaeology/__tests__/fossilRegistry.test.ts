import { describe, it, expect } from 'vitest';
import {
  FOSSIL_SETS,
  LEGENDARY_ARTIFACTS,
  RESEARCH_UPGRADES,
  FRAGMENT_RARITY_WEIGHTS,
  getFossilSet,
  getFossilSetFragments,
  getFossilSetsByRarity,
  rollFragmentType,
  determineFragmentCondition,
  calculateFragmentValue,
  getDigSiteParams,
  DIG_SITE_TIERS,
  COMPLETED_FOSSIL_SET_IDS,
} from '../fossilRegistry.js';

describe('Fossil Registry', () => {
  describe('FOSSIL_SETS', () => {
    it('should have all unique IDs', () => {
      const ids = FOSSIL_SETS.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have sets of each rarity', () => {
      const common = getFossilSetsByRarity('common');
      const uncommon = getFossilSetsByRarity('uncommon');
      const rare = getFossilSetsByRarity('rare');
      const legendary = getFossilSetsByRarity('legendary');

      expect(common.length).toBeGreaterThan(0);
      expect(uncommon.length).toBeGreaterThan(0);
      expect(rare.length).toBeGreaterThan(0);
      expect(legendary.length).toBeGreaterThan(0);
    });

    it('should have all sets with valid fragment combinations', () => {
      for (const set of FOSSIL_SETS) {
        expect(set.fragments.length).toBeGreaterThan(0);
        for (const fragment of set.fragments) {
          expect(fragment.count).toBeGreaterThan(0);
          expect(Object.keys(FRAGMENT_RARITY_WEIGHTS)).toContain(fragment.fragmentType);
        }
      }
    });

    it('should have all sets with set bonuses', () => {
      for (const set of FOSSIL_SETS) {
        expect(set.setBonuses.length).toBeGreaterThan(0);
        for (const bonus of set.setBonuses) {
          expect(bonus.description.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have exactly 12 fossil sets', () => {
      expect(FOSSIL_SETS.length).toBe(12);
    });
  });

  describe('LEGENDARY_ARTIFACTS', () => {
    it('should have exactly 4 legendary artifacts', () => {
      expect(LEGENDARY_ARTIFACTS.length).toBe(4);
    });

    it('should all be legendary rarity', () => {
      for (const artifact of LEGENDARY_ARTIFACTS) {
        expect(artifact.rarity).toBe('legendary');
      }
    });

    it('should all have required fossil sets', () => {
      for (const artifact of LEGENDARY_ARTIFACTS) {
        expect(artifact.requiredFossilSets.length).toBeGreaterThan(0);
      }
    });
  });

  describe('RESEARCH_UPGRADES', () => {
    it('should have exactly 7 research upgrades', () => {
      expect(RESEARCH_UPGRADES.length).toBe(7);
    });

    it('should have increasing research level requirements', () => {
      const levels = RESEARCH_UPGRADES.map((u) => u.requiredResearchLevel);
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
      }
    });
  });

  describe('getFossilSet', () => {
    it('should return the correct fossil set by ID', () => {
      const set = getFossilSet('tyrannosaurus');
      expect(set).toBeDefined();
      expect(set?.id).toBe('tyrannosaurus');
      expect(set?.name).toBe('T-Rex Complete Skeleton');
    });

    it('should return undefined for non-existent ID', () => {
      const set = getFossilSet('non-existent');
      expect(set).toBeUndefined();
    });
  });

  describe('getFossilSetFragments', () => {
    it('should return fragments for a valid fossil set', () => {
      const fragments = getFossilSetFragments('trilobite');
      expect(fragments).toBeDefined();
      expect(fragments?.length).toBe(2);
    });

    it('should return undefined for non-existent ID', () => {
      const fragments = getFossilSetFragments('non-existent');
      expect(fragments).toBeUndefined();
    });
  });

  describe('getFossilSetsByRarity', () => {
    it('should return only sets of the specified rarity', () => {
      const common = getFossilSetsByRarity('common');
      for (const set of common) {
        expect(set.rarity).toBe('common');
      }
    });
  });

  describe('rollFragmentType', () => {
    it('should return a valid fragment type', () => {
      const fragment = rollFragmentType(() => 0.5, 'common');
      expect(Object.keys(FRAGMENT_RARITY_WEIGHTS)).toContain(fragment);
    });

    it('should favor rare fragments at higher rarity digs', () => {
      const rareFragments = ['mythical-remains', 'scale', 'wing-bone'];
      let rareCount = 0;
      const totalRolls = 100;

      for (let i = 0; i < totalRolls; i++) {
        const fragment = rollFragmentType(() => Math.random(), 'legendary');
        if (rareFragments.includes(fragment)) {
          rareCount++;
        }
      }

      // Should have at least some rare fragments
      expect(rareCount).toBeGreaterThan(0);
    });
  });

  describe('determineFragmentCondition', () => {
    it('should return pristine for quality >= 0.8', () => {
      expect(determineFragmentCondition(0.8)).toBe('pristine');
      expect(determineFragmentCondition(1.0)).toBe('pristine');
    });

    it('should return good for quality >= 0.5', () => {
      expect(determineFragmentCondition(0.5)).toBe('good');
      expect(determineFragmentCondition(0.79)).toBe('good');
    });

    it('should return damaged for quality < 0.5', () => {
      expect(determineFragmentCondition(0.49)).toBe('damaged');
      expect(determineFragmentCondition(0.1)).toBe('damaged');
    });
  });

  describe('calculateFragmentValue', () => {
    it('should calculate correct values for pristine common', () => {
      const value = calculateFragmentValue('pristine', 'common');
      expect(value).toBe(15); // 10 * 1.5 * 1
    });

    it('should calculate correct values for damaged legendary', () => {
      const value = calculateFragmentValue('damaged', 'legendary');
      expect(value).toBe(20); // 10 * 0.5 * 4
    });

    it('should calculate correct values for good rare', () => {
      const value = calculateFragmentValue('good', 'rare');
      expect(value).toBe(20); // 10 * 1.0 * 2
    });
  });

  describe('getDigSiteParams', () => {
    it('should return common params for low depth', () => {
      const params = getDigSiteParams(3);
      expect(params.rarity).toBe('common');
    });

    it('should return uncommon params for medium depth', () => {
      const params = getDigSiteParams(10);
      expect(params.rarity).toBe('uncommon');
    });

    it('should return rare params for high depth', () => {
      const params = getDigSiteParams(20);
      expect(params.rarity).toBe('rare');
    });

    it('should return legendary params for very high depth', () => {
      const params = getDigSiteParams(50);
      expect(params.rarity).toBe('legendary');
    });
  });

  describe('DIG_SITE_TIERS', () => {
    it('should have exactly 4 tiers', () => {
      expect(DIG_SITE_TIERS.length).toBe(4);
    });

    it('should have increasing depth ranges', () => {
      for (let i = 1; i < DIG_SITE_TIERS.length; i++) {
        expect(DIG_SITE_TIERS[i]!.depthRange[0]).toBeGreaterThan(
          DIG_SITE_TIERS[i - 1]!.depthRange[1],
        );
      }
    });
  });

  describe('COMPLETED_FOSSIL_SET_IDS', () => {
    it('should contain all fossil set IDs', () => {
      for (const set of FOSSIL_SETS) {
        expect(COMPLETED_FOSSIL_SET_IDS.has(set.id)).toBe(true);
      }
    });
  });
});
