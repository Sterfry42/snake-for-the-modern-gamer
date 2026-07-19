import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManagerV2 } from '../../game/saveManagerV2.js';
import type { GameSaveData, SaveStore } from '../../game/saveManagerV2.js';

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
      seed: 'integration-test',
      worldSalt: 11111,
      biomeSalt: 22222,
      riverSalt: 33333,
      barrierSalt: 44444,
      structureSalt: 55555,
      townSalt: 66666,
    },
    ...overrides,
  };
}

describe('SaveManagerV2 Integration', () => {
  let storage: Map<string, GameSaveData>;
  let manager: SaveManagerV2;

  beforeEach(() => {
    storage = new Map();
    manager = new SaveManagerV2((_prefix) => createMockStore<GameSaveData>(storage));
  });

  it('saves and loads with key prefix isolation', async () => {
    // Save to two different slots
    await manager.save('game-1', makeSaveData({ score: 100 }));
    await manager.save('game-2', makeSaveData({ score: 200 }));

    // Load and verify data integrity
    const data1 = await manager.load('game-1');
    const data2 = await manager.load('game-2');

    expect(data1?.score).toBe(100);
    expect(data2?.score).toBe(200);
    expect(data1?.worldGeneration?.seed).toBe('integration-test');
    expect(data2?.worldGeneration?.seed).toBe('integration-test');
  });

  it('autosave slots do not collide with regular slots', async () => {
    await manager.save('2026-01-01T00:00:00.000Z', makeSaveData({ score: 1 }));
    await manager.save('autosave-0', makeSaveData({ score: 2 }));

    const regularSaves = await manager.listRegularSaves();
    const autosaves = await manager.listAutosaves();

    expect(regularSaves).toHaveLength(1);
    expect(autosaves).toHaveLength(1);
    expect(regularSaves[0].data.score).toBe(1);
    expect(autosaves[0].data.score).toBe(2);
  });

  it('full save/load/delete cycle works end-to-end', async () => {
    const slotId = '2026-06-15T12:00:00.000Z';

    // Save
    const data = makeSaveData({ score: 42, inventory: { 'apple-red': 5 } });
    await manager.save(slotId, data);

    // Verify it exists
    const loaded = await manager.load(slotId);
    expect(loaded).not.toBeNull();
    expect(loaded!.score).toBe(42);
    expect(loaded!.inventory!['apple-red']).toBe(5);

    // List it
    const saves = await manager.listRegularSaves();
    expect(saves).toHaveLength(1);
    expect(saves[0].slotId).toBe(slotId);

    // Delete
    await manager.delete(slotId);

    // Verify it's gone
    const afterDelete = await manager.load(slotId);
    expect(afterDelete).toBeNull();

    const afterDeleteList = await manager.listRegularSaves();
    expect(afterDeleteList).toHaveLength(0);
  });

  it('multiple saves with different seeds are independent', async () => {
    const seed1 = 'alpha-world';
    const seed2 = 'beta-world';

    await manager.save('slot-alpha', makeSaveData({ score: 10, worldGeneration: { seed: seed1, worldSalt: 1, biomeSalt: 2, riverSalt: 3, barrierSalt: 4, structureSalt: 5, townSalt: 6 } }));
    await manager.save('slot-beta', makeSaveData({ score: 20, worldGeneration: { seed: seed2, worldSalt: 7, biomeSalt: 8, riverSalt: 9, barrierSalt: 10, structureSalt: 11, townSalt: 12 } }));

    const alpha = await manager.load('slot-alpha');
    const beta = await manager.load('slot-beta');

    expect(alpha?.score).toBe(10);
    expect(alpha?.worldGeneration?.seed).toBe(seed1);
    expect(beta?.score).toBe(20);
    expect(beta?.worldGeneration?.seed).toBe(seed2);
  });

  it('storage factory is used when provided', async () => {
    const testStorage = new Map<string, GameSaveData>();
    const testManager = new SaveManagerV2((_prefix) => createMockStore<GameSaveData>(testStorage));

    await testManager.save('test-slot', makeSaveData({ score: 777 }));

    const loaded = await testManager.load('test-slot');
    expect(loaded?.score).toBe(777);
    expect(testStorage.has('test-slot')).toBe(true);
  });
});
