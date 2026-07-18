import { describe, it, expect, beforeEach } from 'vitest';
import { DreamManager } from '../DreamManager.js';
import { DREAM_APPLE_TYPES } from '../dreamAppleTypes.js';

function createMockRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

describe('DreamManager', () => {
  let manager: DreamManager;

  beforeEach(() => {
    manager = new DreamManager();
  });

  describe('initialization', () => {
    it('creates a default save data', () => {
      const saveData = manager.getSaveData();
      expect(saveData.version).toBe(1);
      expect(saveData.totalDreamVisits).toBe(0);
      expect(saveData.totalNightmareVisits).toBe(0);
      expect(saveData.totalShardsCollected).toBe(0);
      expect(saveData.currentSession).toBeNull();
    });

    it('starts with no active session', () => {
      expect(manager.isActive()).toBe(false);
      expect(manager.getCurrentSession()).toBeNull();
    });
  });

  describe('dream entry conditions', () => {
    it('should not enter dream world with default settings and low rng', () => {
      const rng = createMockRng(1);
      const result = manager.shouldEnterDreamWorld(
        { rand: rng } as never,
        100,
        10,
      );
      // With low rng value, should return false
      expect(result).toBe(false);
    });

    it('tracks apple combinations', () => {
      manager.recordAppleEaten('caffeinated');
      manager.recordAppleEaten('caffeinated');
      manager.recordAppleEaten('wasabi');

      const saveData = manager.getSaveData();
      expect(saveData.appleCombinations['caffeinated']).toBe(2);
      expect(saveData.appleCombinations['wasabi']).toBe(1);
    });
  });

  describe('session management', () => {
    it('begins a dream session', () => {
      manager.beginDreamSession('dream');

      expect(manager.isActive()).toBe(true);
      expect(manager.getActiveState()).toBe('dream');

      const session = manager.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session!.state).toBe('dream');
      expect(session!.startTime).toBeGreaterThan(0);
    });

    it('begins a nightmare session', () => {
      manager.beginDreamSession('nightmare');

      expect(manager.getActiveState()).toBe('nightmare');

      const session = manager.getCurrentSession();
      expect(session!.state).toBe('nightmare');
    });

    it('ends a session and updates totals', () => {
      manager.beginDreamSession('dream');
      manager.recordShardCollection(10);
      manager.recordLoreDiscovery('lore.test');
      manager.endDreamSession();

      expect(manager.isActive()).toBe(false);

      const saveData = manager.getSaveData();
      expect(saveData.totalDreamVisits).toBe(1);
      expect(saveData.totalShardsCollected).toBe(10);
    });

    it('tracks nightmare visits separately', () => {
      manager.beginDreamSession('nightmare');
      manager.endDreamSession();

      const saveData = manager.getSaveData();
      expect(saveData.totalDreamVisits).toBe(0);
      expect(saveData.totalNightmareVisits).toBe(1);
    });
  });

  describe('session recording', () => {
    beforeEach(() => {
      manager.beginDreamSession('dream');
    });

    it('records shard collection', () => {
      manager.recordShardCollection(5);
      const session = manager.getCurrentSession();
      expect(session!.shardsCollected).toBe(5);
    });

    it('enforces max shards per session', () => {
      manager.recordShardCollection(100);
      const session = manager.getCurrentSession();
      // Should be capped
      expect(session!.shardsCollected).toBeLessThanOrEqual(50);
    });

    it('records lore discovery', () => {
      manager.recordLoreDiscovery('lore.test-1');
      manager.recordLoreDiscovery('lore.test-2');

      const session = manager.getCurrentSession();
      expect(session!.loreFragments).toContain('lore.test-1');
      expect(session!.loreFragments).toContain('lore.test-2');
    });

    it('does not duplicate lore fragments', () => {
      manager.recordLoreDiscovery('lore.test');
      manager.recordLoreDiscovery('lore.test');

      const session = manager.getCurrentSession();
      expect(session!.loreFragments.filter((f) => f === 'lore.test').length).toBe(1);
    });

    it('records puzzle solving', () => {
      manager.recordPuzzleSolved('puzzle-1');
      manager.recordPuzzleSolved('puzzle-2');

      const session = manager.getCurrentSession();
      expect(session!.puzzlesSolved).toContain('puzzle-1');
      expect(session!.puzzlesSolved).toContain('puzzle-2');
    });

    it('records apple eating', () => {
      manager.recordAppleEaten('dream');
      manager.recordAppleEaten('lucid');

      const session = manager.getCurrentSession();
      expect(session!.applesEaten).toContain('dream');
      expect(session!.applesEaten).toContain('lucid');
    });

    it('records ticks', () => {
      manager.recordTick();
      manager.recordTick();
      manager.recordTick();

      const session = manager.getCurrentSession();
      expect(session!.survivedTicks).toBe(3);
    });
  });

  describe('dream apple types', () => {
    it('returns dream-appropriate apple types', () => {
      const dreamApples = manager.getAvailableAppleTypes('dream');
      const nightmareApples = manager.getAvailableAppleTypes('nightmare');

      // Dream should have dream and lucid types
      expect(dreamApples.some((a) => a.behavior === 'dream')).toBe(true);
      expect(dreamApples.some((a) => a.behavior === 'lucid')).toBe(true);
      expect(dreamApples.some((a) => a.behavior === 'nightmare')).toBe(false);

      // Nightmare should have nightmare and lucid types
      expect(nightmareApples.some((a) => a.behavior === 'nightmare')).toBe(true);
      expect(nightmareApples.some((a) => a.behavior === 'lucid')).toBe(true);
    });

    it('returns all dream apple types from registry', () => {
      expect(DREAM_APPLE_TYPES.length).toBeGreaterThan(0);
      expect(DREAM_APPLE_TYPES.length).toBe(8);
    });
  });

  describe('lucid dreaming', () => {
    it('starts with lucid dreaming unlocked=false', () => {
      const lucidState = manager.getLucidState();
      expect(lucidState.unlocked).toBe(false);
      expect(lucidState.level).toBe(0);
    });

    it('tracks total dream visits for lucidity', () => {
      // Simulate multiple visits
      for (let i = 0; i < 5; i++) {
        manager.beginDreamSession('dream');
        manager.endDreamSession();
      }

      const lucidState = manager.getLucidState();
      expect(lucidState.totalVisits).toBe(5);
    });

    it('can use ability when unlocked', () => {
      // Manually unlock for testing
      const lucidState = manager.getLucidState();
      lucidState.unlocked = true;
      lucidState.level = 1;
      lucidState.abilities = [
        {
          ability: 'reverseGravity',
          cooldown: 0,
          maxCooldown: 300,
          available: true,
        },
      ];

      expect(manager.canUseAbility('reverseGravity')).toBe(true);
      expect(manager.useAbility('reverseGravity')).toBe(true);
      expect(manager.canUseAbility('reverseGravity')).toBe(false);
    });

    it('cannot use ability when not unlocked', () => {
      expect(manager.canUseAbility('reverseGravity')).toBe(false);
      expect(manager.useAbility('reverseGravity')).toBe(false);
    });

    it('updates ability cooldowns', () => {
      const lucidState = manager.getLucidState();
      lucidState.unlocked = true;
      lucidState.abilities = [
        {
          ability: 'timeStop',
          cooldown: 100,
          maxCooldown: 600,
          available: false,
        },
      ];

      manager.updateAbilityCooldowns(50);
      expect(lucidState.abilities[0].cooldown).toBe(50);

      manager.updateAbilityCooldowns(50);
      expect(lucidState.abilities[0].cooldown).toBe(0);
      expect(lucidState.abilities[0].available).toBe(true);
    });
  });

  describe('save/load', () => {
    it('saves and loads dream data', () => {
      manager.beginDreamSession('dream');
      manager.recordShardCollection(25);
      manager.recordLoreDiscovery('lore.test');
      const session = manager.getCurrentSession();
      manager.endDreamSession();

      const saveData = manager.getSaveData();
      expect(saveData.totalShardsCollected).toBe(25);

      // Create new manager and load
      const newManager = new DreamManager();
      newManager.loadSaveData(saveData);

      const loadedData = newManager.getSaveData();
      expect(loadedData.totalShardsCollected).toBe(25);
      expect(loadedData.totalDreamVisits).toBe(1);
    });
  });

  describe('puzzle tracking', () => {
    beforeEach(() => {
      manager.beginDreamSession('dream');
    });

    it('tracks solved puzzles', () => {
      manager.recordPuzzleSolved('puzzle-1');
      expect(manager.hasPuzzleSolved('puzzle-1')).toBe(true);
      expect(manager.hasPuzzleSolved('puzzle-2')).toBe(false);
    });
  });
});
