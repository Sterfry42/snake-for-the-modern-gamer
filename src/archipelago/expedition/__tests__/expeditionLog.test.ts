import { describe, it, expect, beforeEach } from 'vitest';
import { ExpeditionLogManager } from '../ExpeditionLog.js';
import type { ExpeditionLogEntry } from '../types.js';

describe('ExpeditionLogManager', () => {
  let logManager: ExpeditionLogManager;

  beforeEach(() => {
    logManager = new ExpeditionLogManager();
  });

  describe('addEntry', () => {
    it('should add a log entry', () => {
      const entry: ExpeditionLogEntry = {
        id: 'test-entry',
        expeditionId: 'volcanic-isle',
        islandId: 'volcanic-isle',
        status: 'completed',
        duration: 120000,
        discoveries: ['Ancient Relic'],
        bossKilled: true,
        bossName: 'lava-warden',
        rewards: ['fire-resistant-mutation'],
        companionNotes: ['Test note'],
        completedAt: Date.now(),
      };

      logManager.addEntry(entry);
      const entries = logManager.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('test-entry');
    });

    it('should sort entries by completion time (newest first)', () => {
      const oldEntry: ExpeditionLogEntry = {
        id: 'old-entry',
        expeditionId: 'volcanic-isle',
        islandId: 'volcanic-isle',
        status: 'completed',
        duration: 60000,
        discoveries: [],
        bossKilled: false,
        rewards: [],
        companionNotes: [],
        completedAt: 1000,
      };

      const newEntry: ExpeditionLogEntry = {
        id: 'new-entry',
        expeditionId: 'crystal-cavern',
        islandId: 'crystal-cavern',
        status: 'completed',
        duration: 90000,
        discoveries: [],
        bossKilled: false,
        rewards: [],
        companionNotes: [],
        completedAt: 2000,
      };

      logManager.addEntry(oldEntry);
      logManager.addEntry(newEntry);

      const entries = logManager.getEntries();
      expect(entries[0].id).toBe('new-entry');
      expect(entries[1].id).toBe('old-entry');
    });
  });

  describe('getEntries', () => {
    it('should return all entries without filter', () => {
      logManager.addEntry({
        id: 'entry1',
        expeditionId: 'volcanic-isle',
        islandId: 'volcanic-isle',
        status: 'completed',
        duration: 60000,
        discoveries: [],
        bossKilled: false,
        rewards: [],
        companionNotes: [],
      });

      logManager.addEntry({
        id: 'entry2',
        expeditionId: 'crystal-cavern',
        islandId: 'crystal-cavern',
        status: 'failed',
        duration: 30000,
        discoveries: [],
        bossKilled: false,
        rewards: [],
        companionNotes: [],
        failedAt: Date.now(),
      });

      expect(logManager.getEntries()).toHaveLength(2);
    });

    it('should filter by island ID', () => {
      logManager.addEntry({
        id: 'entry1',
        expeditionId: 'volcanic-isle',
        islandId: 'volcanic-isle',
        status: 'completed',
        duration: 60000,
        discoveries: [],
        bossKilled: false,
        rewards: [],
        companionNotes: [],
      });

      logManager.addEntry({
        id: 'entry2',
        expeditionId: 'crystal-cavern',
        islandId: 'crystal-cavern',
        status: 'completed',
        duration: 60000,
        discoveries: [],
        bossKilled: false,
        rewards: [],
        companionNotes: [],
      });

      const volcanicEntries = logManager.getEntries('volcanic-isle');
      expect(volcanicEntries).toHaveLength(1);
      expect(volcanicEntries[0].islandId).toBe('volcanic-isle');

      const crystalEntries = logManager.getEntries('crystal-cavern');
      expect(crystalEntries).toHaveLength(1);
      expect(crystalEntries[0].islandId).toBe('crystal-cavern');
    });
  });

  describe('getEntry', () => {
    it('should find entry by ID', () => {
      logManager.addEntry({
        id: 'find-me',
        expeditionId: 'volcanic-isle',
        islandId: 'volcanic-isle',
        status: 'completed',
        duration: 60000,
        discoveries: [],
        bossKilled: false,
        rewards: [],
        companionNotes: [],
      });

      const entry = logManager.getEntry('find-me');
      expect(entry).toBeDefined();
      expect(entry?.id).toBe('find-me');

      const notFound = logManager.getEntry('does-not-exist');
      expect(notFound).toBeUndefined();
    });
  });

  describe('getEntriesByStatus', () => {
    it('should filter by status', () => {
      logManager.addEntry({
        id: 'completed1',
        expeditionId: 'volcanic-isle',
        islandId: 'volcanic-isle',
        status: 'completed',
        duration: 60000,
        discoveries: [],
        bossKilled: true,
        rewards: [],
        companionNotes: [],
        completedAt: Date.now(),
      });

      logManager.addEntry({
        id: 'failed1',
        expeditionId: 'crystal-cavern',
        islandId: 'crystal-cavern',
        status: 'failed',
        duration: 30000,
        discoveries: [],
        bossKilled: false,
        rewards: [],
        companionNotes: [],
        failedAt: Date.now(),
      });

      const completed = logManager.getEntriesByStatus('completed');
      expect(completed).toHaveLength(1);
      expect(completed[0].id).toBe('completed1');

      const failed = logManager.getEntriesByStatus('failed');
      expect(failed).toHaveLength(1);
      expect(failed[0].id).toBe('failed1');
    });
  });

  describe('getExpeditionCount', () => {
    it('should return total entry count', () => {
      expect(logManager.getExpeditionCount()).toBe(0);

      logManager.addEntry({
        id: 'entry1',
        expeditionId: 'volcanic-isle',
        islandId: 'volcanic-isle',
        status: 'completed',
        duration: 60000,
        discoveries: [],
        bossKilled: false,
        rewards: [],
        companionNotes: [],
      });
      logManager.addEntry({
        id: 'entry2',
        expeditionId: 'crystal-cavern',
        islandId: 'crystal-cavern',
        status: 'completed',
        duration: 60000,
        discoveries: [],
        bossKilled: false,
        rewards: [],
        companionNotes: [],
      });

      expect(logManager.getExpeditionCount()).toBe(2);
    });
  });

  describe('getCompletedCount / getFailedCount', () => {
    it('should count completed and failed separately', () => {
      logManager.addEntry({
        id: 'c1',
        expeditionId: 'volcanic-isle',
        islandId: 'volcanic-isle',
        status: 'completed',
        duration: 60000,
        discoveries: [],
        bossKilled: true,
        rewards: [],
        companionNotes: [],
        completedAt: Date.now(),
      });
      logManager.addEntry({
        id: 'f1',
        expeditionId: 'crystal-cavern',
        islandId: 'crystal-cavern',
        status: 'failed',
        duration: 30000,
        discoveries: [],
        bossKilled: false,
        rewards: [],
        companionNotes: [],
        failedAt: Date.now(),
      });
      logManager.addEntry({
        id: 'c2',
        expeditionId: 'sunken-temple',
        islandId: 'sunken-temple',
        status: 'completed',
        duration: 90000,
        discoveries: [],
        bossKilled: true,
        rewards: [],
        companionNotes: [],
        completedAt: Date.now(),
      });

      expect(logManager.getCompletedCount()).toBe(2);
      expect(logManager.getFailedCount()).toBe(1);
    });
  });

  describe('getCompletionRate', () => {
    it('should return 0 with no entries', () => {
      expect(logManager.getCompletionRate()).toBe(0);
    });

    it('should calculate correct rate', () => {
      logManager.addEntry({
        id: 'c1',
        expeditionId: 'volcanic-isle',
        islandId: 'volcanic-isle',
        status: 'completed',
        duration: 60000,
        discoveries: [],
        bossKilled: true,
        rewards: [],
        companionNotes: [],
        completedAt: Date.now(),
      });
      logManager.addEntry({
        id: 'f1',
        expeditionId: 'crystal-cavern',
        islandId: 'crystal-cavern',
        status: 'failed',
        duration: 30000,
        discoveries: [],
        bossKilled: false,
        rewards: [],
        companionNotes: [],
        failedAt: Date.now(),
      });

      expect(logManager.getCompletionRate()).toBe(0.5);
    });
  });

  describe('getIslandStats', () => {
    it('should return stats for a specific island', () => {
      logManager.addEntry({
        id: 'v1',
        expeditionId: 'volcanic-isle',
        islandId: 'volcanic-isle',
        status: 'completed',
        duration: 120000,
        discoveries: [],
        bossKilled: true,
        rewards: [],
        companionNotes: [],
        completedAt: Date.now(),
      });
      logManager.addEntry({
        id: 'v2',
        expeditionId: 'volcanic-isle',
        islandId: 'volcanic-isle',
        status: 'failed',
        duration: 60000,
        discoveries: [],
        bossKilled: false,
        rewards: [],
        companionNotes: [],
        failedAt: Date.now(),
      });

      const stats = logManager.getIslandStats('volcanic-isle');
      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.avgDuration).toBe(120000);
    });

    it('should return zero stats for unvisited island', () => {
      const stats = logManager.getIslandStats('volcanic-isle');
      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.avgDuration).toBe(0);
    });
  });

  describe('getCompanionNotes', () => {
    it('should return notes for volcanic-isle', () => {
      const notes = logManager.getCompanionNotes('volcanic-isle');
      expect(notes).toHaveLength(4);
      expect(notes[0]).toContain('Note 1:');
    });

    it('should return notes for all islands', () => {
      const islands = ['volcanic-isle', 'crystal-cavern', 'sunken-temple', 'sky-garden', 'ancient-ruins', 'mirror-dimension'] as const;
      for (const island of islands) {
        const notes = logManager.getCompanionNotes(island);
        expect(notes).toHaveLength(4);
      }
    });
  });

  describe('formatEntry', () => {
    it('should format a completed entry', () => {
      const entry: ExpeditionLogEntry = {
        id: 'fmt-test',
        expeditionId: 'volcanic-isle',
        islandId: 'volcanic-isle',
        status: 'completed',
        duration: 125000,
        discoveries: ['Ancient Relic', 'Hidden Vault'],
        bossKilled: true,
        bossName: 'lava-warden',
        rewards: ['fire-resistant-mutation'],
        companionNotes: ['Test note'],
        completedAt: Date.now(),
      };

      const formatted = logManager.formatEntry(entry);
      expect(formatted).toContain('Volcanic Isle Expedition');
      expect(formatted).toContain('Status: COMPLETED');
      expect(formatted).toContain('Boss Defeated: Yes');
      expect(formatted).toContain('lava-warden');
      expect(formatted).toContain('Ancient Relic');
      expect(formatted).toContain('fire-resistant-mutation');
    });

    it('should format a failed entry', () => {
      const entry: ExpeditionLogEntry = {
        id: 'fmt-fail',
        expeditionId: 'crystal-cavern',
        islandId: 'crystal-cavern',
        status: 'failed',
        duration: 30000,
        discoveries: [],
        bossKilled: false,
        rewards: [],
        companionNotes: [],
        failedAt: Date.now(),
        failureReason: 'Ran out of supplies',
      };

      const formatted = logManager.formatEntry(entry);
      expect(formatted).toContain('Crystal Cavern Expedition');
      expect(formatted).toContain('Status: FAILED');
      expect(formatted).toContain('Ran out of supplies');
    });
  });

  describe('exportLog / importLog', () => {
    it('should export and import log data', () => {
      logManager.addEntry({
        id: 'export-test',
        expeditionId: 'volcanic-isle',
        islandId: 'volcanic-isle',
        status: 'completed',
        duration: 60000,
        discoveries: ['Test Discovery'],
        bossKilled: true,
        rewards: ['test-reward'],
        companionNotes: ['Test note'],
        completedAt: Date.now(),
      });

      const exported = logManager.exportLog();
      expect(exported).toContain('export-test');

      const newManager = new ExpeditionLogManager();
      newManager.importLog(exported);
      expect(newManager.getExpeditionCount()).toBe(1);
      expect(newManager.getEntry('export-test')).toBeDefined();
    });

    it('should handle invalid import gracefully', () => {
      const newManager = new ExpeditionLogManager();
      newManager.importLog('not valid json');
      expect(newManager.getExpeditionCount()).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      logManager.addEntry({
        id: 'clear-test',
        expeditionId: 'volcanic-isle',
        islandId: 'volcanic-isle',
        status: 'completed',
        duration: 60000,
        discoveries: [],
        bossKilled: false,
        rewards: [],
        companionNotes: [],
      });

      logManager.clear();
      expect(logManager.getExpeditionCount()).toBe(0);
    });
  });
});
