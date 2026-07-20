import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { ExpeditionManager } from '../ExpeditionManager.js';
import type { ExpeditionEventCallbacks, ExpeditionLogEntry, IslandId } from '../types.js';
import { createRng } from '../../../core/rng.js';

describe('ExpeditionManager', () => {
  let manager: ExpeditionManager;
  let callbacks: ExpeditionEventCallbacks & {
    onLogEntryCreated: Mock<(...args: [ExpeditionLogEntry]) => void>;
  };

  beforeEach(() => {
    callbacks = {
      onEvent: vi.fn(),
      onProgressChanged: vi.fn(),
      onLogEntryCreated: vi.fn(),
    } as ExpeditionEventCallbacks & {
      onLogEntryCreated: Mock<(...args: [ExpeditionLogEntry]) => void>;
    };
    manager = new ExpeditionManager(createRng('test'), callbacks);
  });

  describe('getIsland', () => {
    it('should return island by ID', () => {
      const island = manager.getIsland('volcanic-isle');
      expect(island).toBeDefined();
      expect(island?.name).toBe('Volcanic Isle');
    });

    it('should return undefined for unknown island', () => {
      const island = manager.getIsland('unknown-island' as IslandId);
      expect(island).toBeUndefined();
    });
  });

  describe('getAvailableIslands', () => {
    it('should return volcanic-isle as first available', () => {
      const available = manager.getAvailableIslands([]);
      expect(available).toContain('volcanic-isle');
    });

    it('should return next island when previous is completed', () => {
      const available = manager.getAvailableIslands(['volcanic-isle']);
      expect(available).toContain('crystal-cavern');
      expect(available).not.toContain('volcanic-isle');
    });

    it('should skip islands until all previous are completed', () => {
      const available = manager.getAvailableIslands(['volcanic-isle', 'crystal-cavern']);
      expect(available).toContain('sunken-temple');
      // All remaining islands are available once sunken-temple is unlocked
      expect(available).toContain('sky-garden');
      expect(available).toContain('ancient-ruins');
      expect(available).toContain('mirror-dimension');
    });

    it('should return all islands when all are completed', () => {
      const completed: IslandId[] = [
        'volcanic-isle',
        'crystal-cavern',
        'sunken-temple',
        'sky-garden',
        'ancient-ruins',
      ];
      const available = manager.getAvailableIslands(completed);
      expect(available).toContain('mirror-dimension');
    });
  });

  describe('startPreparing', () => {
    it('should start preparing for a valid island', () => {
      const result = manager.startPreparing('volcanic-isle');
      expect(result).toBe(true);
      expect(callbacks.onProgressChanged).toHaveBeenCalled();
    });

    it('should fail for unknown island', () => {
      const result = manager.startPreparing('unknown-island' as IslandId);
      expect(result).toBe(false);
    });

    it('should create progress if none exists', () => {
      manager.startPreparing('volcanic-isle');
      const progress = manager.getProgress('volcanic-isle');
      expect(progress).toBeDefined();
      expect(progress?.status).toBe('preparing');
    });
  });

  describe('finishPreparing', () => {
    beforeEach(() => {
      manager.startPreparing('volcanic-isle');
    });

    it('should finish preparing with valid supplies', () => {
      const supplies = [
        { slotIndex: 0, appleTypeId: 'caffeinated', quantity: 1 },
        { slotIndex: 1, appleTypeId: 'wasabi', quantity: 1 },
      ];
      const result = manager.finishPreparing('volcanic-isle', supplies);
      expect(result).toBe(true);

      const progress = manager.getProgress('volcanic-isle');
      expect(progress?.status).toBe('ready');
      expect(progress?.suppliesPacked).toEqual(supplies);
    });

    it('should fail with missing required apple', () => {
      const supplies = [{ slotIndex: 0, appleTypeId: 'frost', quantity: 1 }];
      const result = manager.finishPreparing('volcanic-isle', supplies);
      expect(result).toBe(false);
      expect(callbacks.onEvent).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'supplies-invalid' }),
      );
    });

    it('should fail with avoided apple', () => {
      const supplies = [
        { slotIndex: 0, appleTypeId: 'caffeinated', quantity: 1 },
        { slotIndex: 1, appleTypeId: 'frost', quantity: 1 },
      ];
      const result = manager.finishPreparing('volcanic-isle', supplies);
      expect(result).toBe(false);
    });
  });

  describe('launchExpedition', () => {
    beforeEach(() => {
      manager.startPreparing('volcanic-isle');
      manager.finishPreparing('volcanic-isle', [
        { slotIndex: 0, appleTypeId: 'caffeinated', quantity: 1 },
        { slotIndex: 1, appleTypeId: 'wasabi', quantity: 1 },
      ]);
    });

    it('should launch expedition when ready', () => {
      const result = manager.launchExpedition('volcanic-isle');
      expect(result).toBe(true);

      const progress = manager.getProgress('volcanic-isle');
      expect(progress?.status).toBe('in-progress');
      expect(progress?.currentPhase).toBe('approach');
    });

    it('should fail if not ready', () => {
      manager.startPreparing('crystal-cavern');
      const result = manager.launchExpedition('crystal-cavern');
      expect(result).toBe(false);
    });
  });

  describe('completeStage', () => {
    beforeEach(() => {
      manager.startPreparing('volcanic-isle');
      manager.finishPreparing('volcanic-isle', [
        { slotIndex: 0, appleTypeId: 'caffeinated', quantity: 1 },
        { slotIndex: 1, appleTypeId: 'wasabi', quantity: 1 },
      ]);
      manager.launchExpedition('volcanic-isle');
    });

    it('should complete first stage', () => {
      const result = manager.completeStage('volcanic-isle', 'approach-volcanic', 100);
      expect(result).toBe(true);
      expect(callbacks.onEvent).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'stage-completed' }),
      );
    });

    it('should not complete with insufficient progress', () => {
      const result = manager.completeStage('volcanic-isle', 'explore-volcanic', 50);
      expect(result).toBe(false);
    });
  });

  describe('failExpedition', () => {
    beforeEach(() => {
      manager.startPreparing('volcanic-isle');
      manager.finishPreparing('volcanic-isle', [
        { slotIndex: 0, appleTypeId: 'caffeinated', quantity: 1 },
      ]);
      manager.launchExpedition('volcanic-isle');
    });

    it('should fail expedition with reason', () => {
      const result = manager.failExpedition('volcanic-isle', 'ran out of supplies');
      expect(result).toBe(true);

      const progress = manager.getProgress('volcanic-isle');
      expect(progress?.status).toBe('failed');
      expect(progress?.failureReason).toBe('ran out of supplies');
    });
  });

  describe('completeExpedition', () => {
    beforeEach(() => {
      manager.startPreparing('volcanic-isle');
      manager.finishPreparing('volcanic-isle', [
        { slotIndex: 0, appleTypeId: 'caffeinated', quantity: 1 },
        { slotIndex: 1, appleTypeId: 'wasabi', quantity: 1 },
      ]);
      manager.launchExpedition('volcanic-isle');
    });

    it('should complete expedition', () => {
      const result = manager.completeExpedition('volcanic-isle');
      expect(result).toBe(true);

      const progress = manager.getProgress('volcanic-isle');
      expect(progress?.status).toBe('completed');
      expect(progress?.completedAt).toBeDefined();
    });

    it('should create log entry on completion', () => {
      manager.completeExpedition('volcanic-isle');
      expect(callbacks.onLogEntryCreated).toHaveBeenCalled();
    });
  });

  describe('addDiscovery', () => {
    beforeEach(() => {
      manager.startPreparing('volcanic-isle');
      manager.finishPreparing('volcanic-isle', [
        { slotIndex: 0, appleTypeId: 'caffeinated', quantity: 1 },
      ]);
      manager.launchExpedition('volcanic-isle');
    });

    it('should add discovery during expedition', () => {
      const result = manager.addDiscovery('volcanic-isle', {
        name: 'Ancient Relic',
        description: 'A relic from the ancient civilization',
        mapData: [{ x: 5, y: 5 }],
      });
      expect(result).toBe(true);

      const progress = manager.getProgress('volcanic-isle');
      expect(progress?.discoveries).toHaveLength(1);
    });

    it('should fail to add discovery when expedition not in progress', () => {
      manager.startPreparing('crystal-cavern');
      const result = manager.addDiscovery('crystal-cavern', {
        name: 'Test Discovery',
        description: 'Test',
      });
      expect(result).toBe(false);
    });
  });

  describe('defeatBoss', () => {
    it('should mark boss as defeated', () => {
      manager.startPreparing('volcanic-isle');
      const result = manager.defeatBoss('volcanic-isle');
      expect(result).toBe(true);

      const progress = manager.getProgress('volcanic-isle');
      expect(progress?.bossDefeated).toBe(true);
    });
  });

  describe('validateSupplies', () => {
    it('should validate volcanic-isle supplies correctly', () => {
      const valid = manager.validateSupplies(
        [{ slotIndex: 0, appleTypeId: 'caffeinated', quantity: 1 }],
        'volcanic-isle',
      );
      expect(valid.valid).toBe(true);

      const invalid = manager.validateSupplies(
        [{ slotIndex: 0, appleTypeId: 'frost', quantity: 1 }],
        'volcanic-isle',
      );
      expect(invalid.valid).toBe(false);
    });
  });

  describe('getCompletedIslands', () => {
    it('should return only completed islands', () => {
      manager.startPreparing('volcanic-isle');
      manager.finishPreparing('volcanic-isle', [
        { slotIndex: 0, appleTypeId: 'caffeinated', quantity: 1 },
      ]);
      manager.launchExpedition('volcanic-isle');
      manager.completeExpedition('volcanic-isle');

      const completed = manager.getCompletedIslands();
      expect(completed).toContain('volcanic-isle');
    });
  });

  describe('getLogEntries', () => {
    it('should return log entries', () => {
      manager.startPreparing('volcanic-isle');
      manager.finishPreparing('volcanic-isle', [
        { slotIndex: 0, appleTypeId: 'caffeinated', quantity: 1 },
      ]);
      manager.launchExpedition('volcanic-isle');
      manager.completeExpedition('volcanic-isle');

      const entries = manager.getLogEntries();
      expect(entries).toHaveLength(1);
    });

    it('should filter by island ID', () => {
      manager.startPreparing('volcanic-isle');
      manager.finishPreparing('volcanic-isle', [
        { slotIndex: 0, appleTypeId: 'caffeinated', quantity: 1 },
      ]);
      manager.launchExpedition('volcanic-isle');
      manager.completeExpedition('volcanic-isle');

      const entries = manager.getLogEntries('volcanic-isle');
      expect(entries).toHaveLength(1);
      expect(entries[0].islandId).toBe('volcanic-isle');

      const crystalEntries = manager.getLogEntries('crystal-cavern');
      expect(crystalEntries).toHaveLength(0);
    });
  });
});
