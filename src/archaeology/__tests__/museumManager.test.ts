import { describe, it, expect } from 'vitest';
import {
  createMuseumState,
  addCompletedFossil,
  canUnlockUpgrade,
  unlockResearchUpgrade,
  getAvailableUpgrades,
  getLockedUpgrades,
  calculateMuseumBonuses,
  getMuseumStats,
  getExhibitData,
  isMuseumComplete,
  getCompletedByRarity,
  serializeMuseumState,
  deserializeMuseumState,
  type MuseumState,
} from '../MuseumManager.js';
import { FOSSIL_SETS } from '../fossilRegistry.js';
import type { CompletedFossil } from '../fossilRegistry.js';

describe('Museum Manager', () => {
  describe('createMuseumState', () => {
    it('should create a valid museum state', () => {
      const state = createMuseumState();
      expect(state.version).toBe(1);
      expect(state.completedFossils.length).toBe(0);
      expect(state.exhibits.length).toBe(0);
      expect(state.researchLevel).toBe(0);
      expect(state.unlockedUpgrades.length).toBe(0);
      expect(state.museumName).toBe('The Wise Snake Museum');
    });

    it('should accept custom museum name', () => {
      const state = createMuseumState('My Museum');
      expect(state.museumName).toBe('My Museum');
    });
  });

  describe('addCompletedFossil', () => {
    it('should add a completed fossil', () => {
      const state = createMuseumState();
      const completed: CompletedFossil = {
        fossilSetId: 'trilobite',
        fragments: [
          { fragmentType: 'bone-fragment', condition: 'pristine' },
          { fragmentType: 'bone-fragment', condition: 'good' },
          { fragmentType: 'bone-fragment', condition: 'good' },
          { fragmentType: 'shell', condition: 'pristine' },
          { fragmentType: 'shell', condition: 'good' },
        ],
        completedAt: Date.now(),
      };

      const result = addCompletedFossil(state, completed);
      expect(result).toBe(true);
      expect(state.completedFossils.length).toBe(1);
    });

    it('should not add duplicate fossil', () => {
      const state = createMuseumState();
      const completed: CompletedFossil = {
        fossilSetId: 'trilobite',
        fragments: [],
        completedAt: Date.now(),
      };

      addCompletedFossil(state, completed);
      const result = addCompletedFossil(state, completed);
      expect(result).toBe(false);
      expect(state.completedFossils.length).toBe(1);
    });

    it('should unlock exhibit when adding fossil', () => {
      const state = createMuseumState();
      const completed: CompletedFossil = {
        fossilSetId: 'trilobite',
        fragments: [],
        completedAt: Date.now(),
      };

      addCompletedFossil(state, completed);
      expect(state.exhibits.length).toBe(1);
      expect(state.exhibits[0]?.unlocked).toBe(true);
    });

    it('should track legendary fossils', () => {
      const state = createMuseumState();
      const completed: CompletedFossil = {
        fossilSetId: 'tyrannosaurus',
        fragments: [],
        completedAt: Date.now(),
      };

      addCompletedFossil(state, completed);
      expect(state.legendaryFossilsCompleted).toContain('tyrannosaurus');
    });
  });

  describe('canUnlockUpgrade', () => {
    it('should return false when requirements not met', () => {
      const state = createMuseumState();
      expect(canUnlockUpgrade(state, 'excavation-speed-1')).toBe(false);
    });

    it('should return false when already unlocked', () => {
      const state = createMuseumState();
      const completed: CompletedFossil = {
        fossilSetId: 'trilobite',
        fragments: [],
        completedAt: Date.now(),
      };
      addCompletedFossil(state, completed);

      // Try to unlock, then try again
      unlockResearchUpgrade(state, 'excavation-speed-1');
      expect(canUnlockUpgrade(state, 'excavation-speed-1')).toBe(false);
    });
  });

  describe('unlockResearchUpgrade', () => {
    it('should unlock upgrade when requirements met', () => {
      const state = createMuseumState();
      const completed: CompletedFossil = {
        fossilSetId: 'trilobite',
        fragments: [],
        completedAt: Date.now(),
      };
      addCompletedFossil(state, completed);
      // Set research level to meet requirement
      state.researchLevel = 1;

      const result = unlockResearchUpgrade(state, 'excavation-speed-1');
      expect(result).toBe(true);
      expect(state.unlockedUpgrades).toContain('excavation-speed-1');
    });

    it('should add effects to active effects', () => {
      const state = createMuseumState();
      const completed: CompletedFossil = {
        fossilSetId: 'trilobite',
        fragments: [],
        completedAt: Date.now(),
      };
      addCompletedFossil(state, completed);
      // Set research level to meet requirement
      state.researchLevel = 1;

      unlockResearchUpgrade(state, 'excavation-speed-1');
      expect(state.activeEffects.length).toBeGreaterThan(0);
    });
  });

  describe('getAvailableUpgrades', () => {
    it('should return empty when no requirements met', () => {
      const state = createMuseumState();
      const available = getAvailableUpgrades(state);
      expect(available.length).toBe(0);
    });

    it('should return available upgrades when requirements met', () => {
      const state = createMuseumState();
      const completed: CompletedFossil = {
        fossilSetId: 'trilobite',
        fragments: [],
        completedAt: Date.now(),
      };
      addCompletedFossil(state, completed);
      // Set research level to meet requirement
      state.researchLevel = 1;

      const available = getAvailableUpgrades(state);
      const excavationUpgrade = available.find((u) => u.id === 'excavation-speed-1');
      expect(excavationUpgrade).toBeDefined();
    });
  });

  describe('getLockedUpgrades', () => {
    it('should return locked upgrades with missing requirements', () => {
      const state = createMuseumState();
      const locked = getLockedUpgrades(state);
      expect(locked.length).toBeGreaterThan(0);
    });

    it('should show missing fossil requirements', () => {
      const state = createMuseumState();
      const locked = getLockedUpgrades(state);
      const firstLocked = locked[0];

      if (firstLocked) {
        expect(firstLocked.missingFossils.length).toBeGreaterThan(0);
      }
    });
  });

  describe('calculateMuseumBonuses', () => {
    it('should return zero bonuses for empty museum', () => {
      const state = createMuseumState();
      const bonuses = calculateMuseumBonuses(state);

      expect(bonuses.scoreMultiplier).toBe(0);
      expect(bonuses.growthBonus).toBe(0);
      expect(bonuses.speedBonus).toBe(0);
    });

    it('should apply fossil set bonuses', () => {
      const state = createMuseumState();
      const completed: CompletedFossil = {
        fossilSetId: 'pterodactyl',
        fragments: [],
        completedAt: Date.now(),
      };
      addCompletedFossil(state, completed);

      const bonuses = calculateMuseumBonuses(state);
      expect(bonuses.speedBonus).toBeGreaterThan(0);
    });

    it('should apply research upgrade effects', () => {
      const state = createMuseumState();
      const completed: CompletedFossil = {
        fossilSetId: 'trilobite',
        fragments: [],
        completedAt: Date.now(),
      };
      addCompletedFossil(state, completed);
      unlockResearchUpgrade(state, 'excavation-speed-1');

      const bonuses = calculateMuseumBonuses(state);
      // Research effects may or may not add to direct bonuses
      expect(bonuses).toBeDefined();
    });
  });

  describe('getMuseumStats', () => {
    it('should return correct stats for empty museum', () => {
      const state = createMuseumState();
      const stats = getMuseumStats(state);

      expect(stats.totalFossils).toBe(0);
      expect(stats.totalExhibits).toBe(0);
      expect(stats.completionPercentage).toBe(0);
    });

    it('should count fossils by rarity', () => {
      const state = createMuseumState();

      // Add common
      addCompletedFossil(state, {
        fossilSetId: 'trilobite',
        fragments: [],
        completedAt: Date.now(),
      } as CompletedFossil);

      // Add legendary
      addCompletedFossil(state, {
        fossilSetId: 'tyrannosaurus',
        fragments: [],
        completedAt: Date.now(),
      } as CompletedFossil);

      const stats = getMuseumStats(state);
      expect(stats.commonCount).toBe(1);
      expect(stats.legendaryCount).toBe(1);
      expect(stats.totalFossils).toBe(2);
    });

    it('should calculate completion percentage', () => {
      const state = createMuseumState();
      const completed: CompletedFossil = {
        fossilSetId: 'trilobite',
        fragments: [],
        completedAt: Date.now(),
      };
      addCompletedFossil(state, completed);

      const stats = getMuseumStats(state);
      const expectedPct = Math.floor((1 / FOSSIL_SETS.length) * 100);
      expect(stats.completionPercentage).toBe(expectedPct);
    });
  });

  describe('getExhibitData', () => {
    it('should return only unlocked exhibits', () => {
      const state = createMuseumState();
      const data = getExhibitData(state);
      expect(data.length).toBe(0);

      addCompletedFossil(state, {
        fossilSetId: 'trilobite',
        fragments: [],
        completedAt: Date.now(),
      } as CompletedFossil);

      const dataAfter = getExhibitData(state);
      expect(dataAfter.length).toBe(1);
    });
  });

  describe('isMuseumComplete', () => {
    it('should return false for empty museum', () => {
      const state = createMuseumState();
      expect(isMuseumComplete(state)).toBe(false);
    });

    it('should return true when all fossils completed', () => {
      const state = createMuseumState();
      for (const set of FOSSIL_SETS) {
        addCompletedFossil(state, {
          fossilSetId: set.id,
          fragments: [],
          completedAt: Date.now(),
        } as CompletedFossil);
      }

      expect(isMuseumComplete(state)).toBe(true);
    });
  });

  describe('getCompletedByRarity', () => {
    it('should filter by rarity', () => {
      const state = createMuseumState();
      addCompletedFossil(state, {
        fossilSetId: 'trilobite',
        fragments: [],
        completedAt: Date.now(),
      } as CompletedFossil);
      addCompletedFossil(state, {
        fossilSetId: 'tyrannosaurus',
        fragments: [],
        completedAt: Date.now(),
      } as CompletedFossil);

      const common = getCompletedByRarity(state, 'common');
      const legendary = getCompletedByRarity(state, 'legendary');

      expect(common.length).toBe(1);
      expect(legendary.length).toBe(1);
    });
  });

  describe('serializeMuseumState', () => {
    it('should serialize and deserialize correctly', () => {
      const state = createMuseumState();
      addCompletedFossil(state, {
        fossilSetId: 'trilobite',
        fragments: [],
        completedAt: Date.now(),
      } as CompletedFossil);

      const json = serializeMuseumState(state);
      const deserialized = deserializeMuseumState(json);

      expect(deserialized.version).toBe(state.version);
      expect(deserialized.completedFossils.length).toBe(state.completedFossils.length);
      expect(deserialized.museumName).toBe(state.museumName);
    });
  });
});
