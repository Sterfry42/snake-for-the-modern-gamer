import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManagerV2, type GameSaveData } from '../../game/saveManagerV2.js';
import type { SaveStore } from '../../storage/SaveStore.js';

function createMockStore<T>(storage: Map<string, T>): SaveStore<T> {
  return {
    async load(slotId: string): Promise<T | null> {
      return storage.get(slotId) ?? null;
    },
    async save(slotId: string, data: T): Promise<void> {
      storage.set(slotId, data);
    },
    async clear(slotId: string): Promise<void> {
      storage.delete(slotId);
    },
    async has(slotId: string): Promise<boolean> {
      return storage.has(slotId);
    },
  };
}

function makeSaveData(overrides: Partial<GameSaveData> = {}): GameSaveData {
  return {
    version: '3.0.0',
    timestamp: Date.now(),
    score: 100,
    inventory: {},
    equipment: {},
    flags: {},
    worldGeneration: {
      seed: 'test-seed',
      worldSalt: 12345,
      biomeSalt: 23456,
      riverSalt: 34567,
      barrierSalt: 45678,
      structureSalt: 56789,
      townSalt: 67890,
    },
    ...overrides,
  };
}

describe('SaveManagerV2', () => {
  let storage: Map<string, GameSaveData>;
  let manager: SaveManagerV2;

  beforeEach(() => {
    storage = new Map();
    manager = new SaveManagerV2((_prefix: string) => {
      void _prefix;
      return createMockStore<GameSaveData>(storage);
    });
  });

  describe('save and load', () => {
    it('saves and loads a slot', async () => {
      const data = makeSaveData({ score: 42 });
      await manager.save('2026-01-15T10:00:00.000Z', data);

      const loaded = await manager.load('2026-01-15T10:00:00.000Z');
      expect(loaded).not.toBeNull();
      expect(loaded!.score).toBe(42);
      expect(loaded!.worldGeneration?.seed).toBe('test-seed');
    });

    it('returns null for missing slot', async () => {
      const result = await manager.load('nonexistent');
      expect(result).toBeNull();
    });

    it('overwrites existing slot data', async () => {
      await manager.save('slot-a', makeSaveData({ score: 10 }));
      await manager.save('slot-a', makeSaveData({ score: 99 }));

      const loaded = await manager.load('slot-a');
      expect(loaded!.score).toBe(99);
    });
  });

  describe('delete', () => {
    it('removes a saved slot', async () => {
      await manager.save('slot-b', makeSaveData({ score: 50 }));
      await manager.delete('slot-b');

      const loaded = await manager.load('slot-b');
      expect(loaded).toBeNull();
    });

    it('does not throw on deleting nonexistent slot', async () => {
      await expect(manager.delete('ghost-slot')).resolves.toBeUndefined();
    });
  });

  describe('list regular saves', () => {
    it('returns saves sorted newest first', async () => {
      await manager.save('2026-01-10T10:00:00.000Z', makeSaveData({ score: 1 }));
      await manager.save('2026-01-15T10:00:00.000Z', makeSaveData({ score: 2 }));
      await manager.save('2026-01-12T10:00:00.000Z', makeSaveData({ score: 3 }));

      const saves = await manager.listRegularSaves();
      expect(saves).toHaveLength(3);
      expect(saves[0].slotId).toBe('2026-01-15T10:00:00.000Z');
      expect(saves[1].slotId).toBe('2026-01-12T10:00:00.000Z');
      expect(saves[2].slotId).toBe('2026-01-10T10:00:00.000Z');
    });

    it('excludes autosave slots from regular list', async () => {
      await manager.save('2026-01-15T10:00:00.000Z', makeSaveData({ score: 1 }));
      await manager.save('autosave-0', makeSaveData({ score: 2 }));

      const saves = await manager.listRegularSaves();
      expect(saves).toHaveLength(1);
      expect(saves[0].slotId).toBe('2026-01-15T10:00:00.000Z');
    });

    it('returns empty array when no saves exist', async () => {
      const saves = await manager.listRegularSaves();
      expect(saves).toHaveLength(0);
    });
  });

  describe('autosaves', () => {
    it('lists autosaves in slot order', async () => {
      await manager.save('autosave-0', makeSaveData({ score: 1 }));
      await manager.save('autosave-2', makeSaveData({ score: 3 }));
      await manager.save('autosave-1', makeSaveData({ score: 2 }));

      const autosaves = await manager.listAutosaves();
      expect(autosaves).toHaveLength(3);
      expect(autosaves[0].slotId).toBe('autosave-0');
      expect(autosaves[1].slotId).toBe('autosave-1');
      expect(autosaves[2].slotId).toBe('autosave-2');
    });

    it('skips empty autosave slots', async () => {
      await manager.save('autosave-0', makeSaveData({ score: 1 }));
      await manager.save('autosave-4', makeSaveData({ score: 5 }));

      const autosaves = await manager.listAutosaves();
      expect(autosaves).toHaveLength(2);
      expect(autosaves[0].slotId).toBe('autosave-0');
      expect(autosaves[1].slotId).toBe('autosave-4');
    });

    it('returns empty array when no autosaves exist', async () => {
      const autosaves = await manager.listAutosaves();
      expect(autosaves).toHaveLength(0);
    });

    it('sliding window: 6th autosave replaces oldest', async () => {
      // Fill all 5 slots
      for (let i = 0; i < 5; i++) {
        await manager.save(`autosave-${i}`, makeSaveData({ score: i * 100 }));
      }

      // After filling 5 slots, the index wraps to 0
      // Simulate by saving to autosave-0 (which would be the next slot after index 4)
      await manager.save('autosave-0', makeSaveData({ score: 999 }));

      const autosaves = await manager.listAutosaves();
      expect(autosaves).toHaveLength(5);
      // autosave-0 should now have the new data
      expect(autosaves.find((a) => a.slotId === 'autosave-0')!.data.score).toBe(999);
    });
  });

  describe('getSlotLabel', () => {
    it('returns formatted date for ISO date slot IDs', async () => {
      const label = manager.getSlotLabel('2026-06-17T14:30:00.000Z');
      expect(label).toContain('Jun');
      expect(label).toContain('2026');
    });

    it('returns autosave label for autosave slot IDs', () => {
      expect(manager.getSlotLabel('autosave-0')).toBe('Autosave 1');
      expect(manager.getSlotLabel('autosave-1')).toBe('Autosave 2');
      expect(manager.getSlotLabel('autosave-4')).toBe('Autosave 5');
    });

    it('returns raw slotId for unknown format', () => {
      expect(manager.getSlotLabel('unknown-format')).toBe('unknown-format');
    });
  });

  describe('getDisplayLabel', () => {
    it('appends seed to label when seed is provided', () => {
      const data = makeSaveData({
        worldGeneration: {
          seed: 'my-world',
          worldSalt: 1,
          biomeSalt: 2,
          riverSalt: 3,
          barrierSalt: 4,
          structureSalt: 5,
          townSalt: 6,
        },
      });
      const label = manager.getDisplayLabel('2026-06-17T14:30:00.000Z', data.worldGeneration!.seed);
      expect(label).toContain('my-world');
      expect(label).toContain('\nSeed: my-world');
    });

    it('does not append default seed', () => {
      const data = makeSaveData({
        worldGeneration: {
          seed: 'default-world',
          worldSalt: 1,
          biomeSalt: 2,
          riverSalt: 3,
          barrierSalt: 4,
          structureSalt: 5,
          townSalt: 6,
        },
      });
      const label = manager.getDisplayLabel('2026-06-17T14:30:00.000Z', data.worldGeneration!.seed);
      expect(label).not.toContain('default-world');
    });
  });

  describe('migration', () => {
    it('migrates v1 data to v3', async () => {
      const v1Data: GameSaveData = {
        version: '1.0.0',
        timestamp: Date.now(),
        score: 50,
        inventory: {},
        equipment: {},
        flags: {},
      };

      // Save as raw in the mock store
      storage.set('v1-test', v1Data as unknown as GameSaveData);

      const loaded = await manager.load('v1-test');
      expect(loaded!.version).toBe('3.0.0');
      expect(loaded!.minecraftBlocks).toEqual([]);
      expect(loaded!.minecraftPlayerState).toBeDefined();
      expect(loaded!.fishing).toBeDefined();
      expect(loaded!.fishing!.catchJournal).toEqual([]);
      expect(loaded!.fishing!.equippedRod).toBe('none');
    });

    it('migrates v2 data to v3', async () => {
      const v2Data: GameSaveData = {
        version: '2.0.0',
        timestamp: Date.now(),
        score: 75,
        inventory: {},
        equipment: {},
        flags: {},
        fishing: {
          caughtFish: { 'fish-minnow': 5 },
        },
      };

      storage.set('v2-test', v2Data as unknown as GameSaveData);

      const loaded = await manager.load('v2-test');
      expect(loaded!.version).toBe('3.0.0');
      expect(loaded!.fishing!.caughtFish).toEqual({ 'fish-minnow': 5 });
      expect(loaded!.fishing!.catchJournal).toEqual([]);
      expect(loaded!.fishing!.equippedRod).toBe('none');
    });

    it('does not re-migrate already migrated data', async () => {
      const data = makeSaveData({ version: '3.0.0', score: 300 });

      storage.set('v3-test', data);

      const loaded1 = await manager.load('v3-test');
      expect(loaded1!.version).toBe('3.0.0');

      const loaded2 = await manager.load('v3-test');
      expect(loaded2!.version).toBe('3.0.0');
      expect(loaded2!.score).toBe(300);
    });
  });

  describe('legacy save', () => {
    it('returns null when no legacy save exists', async () => {
      const loaded = await manager.load('legacy');
      expect(loaded).toBeNull();
    });
  });
});
