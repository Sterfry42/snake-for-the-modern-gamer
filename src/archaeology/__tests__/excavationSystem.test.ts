import { describe, it, expect } from 'vitest';
import {
  createExcavationSession,
  updateTimingBar,
  processTimingHit,
  excavateFragment,
  checkFossilAssembly,
  assembleFossil,
  calculateAssemblyQuality,
  getProgressDisplay,
  getRemainingFragments,
  resetExcavationSession,
  simulateProgress,
  type ExcavationSession,
} from '../ExcavationSystem.js';
import type { FragmentType } from '../fossilRegistry.js';

describe('Excavation System', () => {
  describe('createExcavationSession', () => {
    it('should create a valid session', () => {
      const session = createExcavationSession('test-dig', 5, () => 0.5);
      expect(session.state).toBe('idle');
      expect(session.digSiteId).toBe('test-dig');
      expect(session.totalFragments).toBeGreaterThan(0);
      expect(session.currentFragmentIndex).toBe(0);
      expect(session.discoveredFragments.length).toBe(0);
    });

    it('should have different fragment counts based on depth', () => {
      const shallow = createExcavationSession('shallow', 3, () => 0.5);
      const deep = createExcavationSession('deep', 50, () => 0.5);

      expect(deep.totalFragments).toBeGreaterThan(shallow.totalFragments);
    });
  });

  describe('updateTimingBar', () => {
    it('should move cursor right with positive input', () => {
      const session = createExcavationSession('test', 5, () => 0.5);
      session.state = 'active';

      updateTimingBar(session, 16, 1); // Move right
      expect(session.timingBar.position).toBeGreaterThan(0.5);
    });

    it('should move cursor left with negative input', () => {
      const session = createExcavationSession('test', 5, () => 0.5);
      session.state = 'active';

      updateTimingBar(session, 16, -1); // Move left
      expect(session.timingBar.position).toBeLessThan(0.5);
    });

    it('should not move with zero input', () => {
      const session = createExcavationSession('test', 5, () => 0.5);
      session.state = 'active';
      const initialPos = session.timingBar.position;

      updateTimingBar(session, 16, 0);
      // With zero input, position stays the same (no auto-bounce in this implementation)
      expect(session.timingBar.position).toBe(initialPos);
    });

    it('should clamp position to valid range', () => {
      const session = createExcavationSession('test', 5, () => 0.5);
      session.state = 'active';
      session.timingBar.position = 0.99;

      updateTimingBar(session, 16, 1);
      // Position should be clamped to 1
      expect(session.timingBar.position).toBeLessThanOrEqual(1);
      expect(session.timingBar.position).toBeGreaterThanOrEqual(0);
    });
  });

  describe('processTimingHit', () => {
    it('should return quality between 0.1 and 1', () => {
      const session = createExcavationSession('test', 5, () => 0.5);
      session.state = 'active';

      const quality = processTimingHit(session);
      expect(quality).toBeGreaterThanOrEqual(0.1);
      expect(quality).toBeLessThanOrEqual(1);
    });
  });

  describe('excavateFragment', () => {
    it('should return null when not active', () => {
      const session = createExcavationSession('test', 5, () => 0.5);
      const result = excavateFragment(session, () => 0.5);
      expect(result).toBeNull();
    });

    it('should excavate fragments when active', () => {
      const session = createExcavationSession('test', 5, () => 0.5);
      session.state = 'active';

      const fragment = excavateFragment(session, () => 0.5);
      expect(fragment).toBeDefined();
      expect(session.currentFragmentIndex).toBe(1);
      expect(session.discoveredFragments.length).toBe(1);
    });

    it('should transition to assembling when all fragments excavated', () => {
      const session = createExcavationSession('test', 3, () => 0.5);
      session.state = 'active';

      // Excavate all fragments (small count for testing)
      while (session.state === 'active') {
        excavateFragment(session, () => 0.5);
      }

      // Session transitions to 'assembling' state when done excavating
      expect(session.state).toBe('assembling');
    });

    it('should update progress correctly', () => {
      const session = createExcavationSession('test', 50, () => 0.5);
      session.state = 'active';

      for (let i = 0; i < 3; i++) {
        excavateFragment(session, () => 0.5);
      }

      expect(session.progress).toBeGreaterThan(0);
      expect(session.progress).toBeLessThan(1);
    });
  });

  describe('checkFossilAssembly', () => {
    it('should return canAssemble false when fragments are missing', () => {
      const fragments: Array<{
        fossilSetId: string;
        fragmentType: FragmentType;
        condition: 'pristine' | 'good' | 'damaged';
        value: number;
        discoveredAt: number;
      }> = [
        {
          fossilSetId: 'trilobite',
          fragmentType: 'bone-fragment',
          condition: 'pristine',
          value: 15,
          discoveredAt: Date.now(),
        },
      ];

      const result = checkFossilAssembly(fragments, 'trilobite');
      expect(result.canAssemble).toBe(false);
    });

    it('should return canAssemble true when all fragments present', () => {
      const fragments: Array<{
        fossilSetId: string;
        fragmentType: FragmentType;
        condition: 'pristine' | 'good' | 'damaged';
        value: number;
        discoveredAt: number;
      }> = [
        {
          fossilSetId: 'trilobite',
          fragmentType: 'bone-fragment',
          condition: 'pristine',
          value: 15,
          discoveredAt: Date.now(),
        },
        {
          fossilSetId: 'trilobite',
          fragmentType: 'bone-fragment',
          condition: 'good',
          value: 10,
          discoveredAt: Date.now(),
        },
        {
          fossilSetId: 'trilobite',
          fragmentType: 'bone-fragment',
          condition: 'good',
          value: 10,
          discoveredAt: Date.now(),
        },
        {
          fossilSetId: 'trilobite',
          fragmentType: 'shell',
          condition: 'pristine',
          value: 15,
          discoveredAt: Date.now(),
        },
        {
          fossilSetId: 'trilobite',
          fragmentType: 'shell',
          condition: 'good',
          value: 10,
          discoveredAt: Date.now(),
        },
      ];

      const result = checkFossilAssembly(fragments, 'trilobite');
      expect(result.canAssemble).toBe(true);
    });

    it('should return empty for non-existent fossil set', () => {
      const result = checkFossilAssembly([], 'non-existent');
      expect(result.canAssemble).toBe(false);
      expect(result.fragmentCounts.size).toBe(0);
    });
  });

  describe('assembleFossil', () => {
    it('should return null when assembly is not possible', () => {
      const fragments: Array<{
        fossilSetId: string;
        fragmentType: FragmentType;
        condition: 'pristine' | 'good' | 'damaged';
        value: number;
        discoveredAt: number;
      }> = [
        {
          fossilSetId: 'trilobite',
          fragmentType: 'bone-fragment',
          condition: 'pristine',
          value: 15,
          discoveredAt: Date.now(),
        },
      ];

      const result = assembleFossil(fragments, 'trilobite', 0.8);
      expect(result).toBeNull();
    });

    it('should return completed fossil when assembly is possible', () => {
      const fragments: Array<{
        fossilSetId: string;
        fragmentType: FragmentType;
        condition: 'pristine' | 'good' | 'damaged';
        value: number;
        discoveredAt: number;
      }> = [
        {
          fossilSetId: 'trilobite',
          fragmentType: 'bone-fragment',
          condition: 'pristine',
          value: 15,
          discoveredAt: Date.now(),
        },
        {
          fossilSetId: 'trilobite',
          fragmentType: 'bone-fragment',
          condition: 'good',
          value: 10,
          discoveredAt: Date.now(),
        },
        {
          fossilSetId: 'trilobite',
          fragmentType: 'bone-fragment',
          condition: 'good',
          value: 10,
          discoveredAt: Date.now(),
        },
        {
          fossilSetId: 'trilobite',
          fragmentType: 'shell',
          condition: 'pristine',
          value: 15,
          discoveredAt: Date.now(),
        },
        {
          fossilSetId: 'trilobite',
          fragmentType: 'shell',
          condition: 'good',
          value: 10,
          discoveredAt: Date.now(),
        },
      ];

      const result = assembleFossil(fragments, 'trilobite', 0.8);
      expect(result).toBeDefined();
      expect(result?.fossilSetId).toBe('trilobite');
      expect(result?.fragments.length).toBe(5);
    });
  });

  describe('calculateAssemblyQuality', () => {
    it('should return 0 for empty array', () => {
      expect(calculateAssemblyQuality([])).toBe(0);
    });

    it('should return average of qualities', () => {
      const qualities = [0.5, 0.8, 0.9];
      const result = calculateAssemblyQuality(qualities);
      expect(result).toBeCloseTo(0.733, 2);
    });

    it('should handle single quality', () => {
      expect(calculateAssemblyQuality([0.75])).toBe(0.75);
    });
  });

  describe('getProgressDisplay', () => {
    it('should return percentage string', () => {
      const session = createExcavationSession('test', 5, () => 0.5);
      session.progress = 0.5;

      expect(getProgressDisplay(session)).toBe('50%');
    });

    it('should handle 100% progress', () => {
      const session = createExcavationSession('test', 5, () => 0.5);
      session.progress = 1;

      expect(getProgressDisplay(session)).toBe('100%');
    });
  });

  describe('getRemainingFragments', () => {
    it('should return correct remaining count', () => {
      const session = createExcavationSession('test', 50, () => 0.5);
      session.currentFragmentIndex = 3;

      const remaining = getRemainingFragments(session);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThan(session.totalFragments);
    });

    it('should not return negative', () => {
      const session = createExcavationSession('test', 50, () => 0.5);
      session.currentFragmentIndex = 20;

      expect(getRemainingFragments(session)).toBe(0);
    });
  });

  describe('resetExcavationSession', () => {
    it('should reset session to initial state', () => {
      const session = createExcavationSession('test', 5, () => 0.5);
      session.state = 'complete';
      session.progress = 1;
      session.currentFragmentIndex = 5;
      session.discoveredFragments.push({
        fossilSetId: 'test',
        fragmentType: 'bone-fragment',
        condition: 'pristine',
        value: 15,
        discoveredAt: Date.now(),
      });

      resetExcavationSession(session);

      expect(session.state).toBe('idle');
      expect(session.progress).toBe(0);
      expect(session.currentFragmentIndex).toBe(0);
      expect(session.discoveredFragments.length).toBe(0);
      expect(session.failed).toBe(false);
    });
  });

  describe('simulateProgress', () => {
    it('should not progress when not active', () => {
      const session = createExcavationSession('test', 5, () => 0.5);
      const result = simulateProgress(session, 1000, () => 0.5);
      expect(result).toBe(false);
    });

    it('should complete when progress reaches 1', () => {
      const session = createExcavationSession('test', 3, () => 0.5);
      session.state = 'active';
      session.progress = 0.99;

      const result = simulateProgress(session, 1000, () => 0.5);
      expect(result).toBe(true);
      expect(session.state).toBe('complete');
    });
  });
});
