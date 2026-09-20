import { describe, it, expect, beforeEach } from 'vitest';
import {
  SaveManagerV2,
  MAX_SAVES_PER_SESSION,
  type GameSaveData,
  type SessionRecord,
} from '../../game/saveManagerV2.js';
import type { SaveStore } from '../../game/saveManagerV2.js';

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
  let storage: Map<string, SessionRecord>;
  let manager: SaveManagerV2;

  beforeEach(() => {
    storage = new Map();
    manager = new SaveManagerV2((_prefix: string) => {
      void _prefix;
      return createMockStore<SessionRecord>(storage);
    });
  });

  it('saves and loads with session isolation', async () => {
    const alpha = manager.createSessionId();
    const beta = manager.createSessionId();
    await manager.appendSave(alpha, makeSaveData({ score: 100 }));
    await manager.appendSave(beta, makeSaveData({ score: 200 }));

    const alphaSaves = await manager.listSessionSaves(alpha);
    const betaSaves = await manager.listSessionSaves(beta);

    expect(alphaSaves[0].data.score).toBe(100);
    expect(betaSaves[0].data.score).toBe(200);
    expect(alphaSaves[0].data.worldGeneration?.seed).toBe('integration-test');
    expect(betaSaves[0].data.worldGeneration?.seed).toBe('integration-test');
  });

  it('repeated saves in one session stay capped at the last five', async () => {
    const sessionId = manager.createSessionId();
    for (let i = 0; i < MAX_SAVES_PER_SESSION + 2; i++) {
      await manager.appendSave(sessionId, makeSaveData({ score: i }));
    }

    const saves = await manager.listSessionSaves(sessionId);
    expect(saves).toHaveLength(MAX_SAVES_PER_SESSION);
    expect(saves[0].data.score).toBe(2);
    expect(saves[saves.length - 1].data.score).toBe(MAX_SAVES_PER_SESSION + 1);
    const sessions = await manager.listSessions();
    expect(sessions[0].saveCount).toBe(MAX_SAVES_PER_SESSION);
  });

  it('full session lifecycle works end-to-end', async () => {
    const sessionId = manager.createSessionId();

    // Save
    const data = makeSaveData({ score: 42, inventory: { 'apple-red': 5 } });
    await manager.appendSave(sessionId, data);

    // Verify it exists
    const saves = await manager.listSessionSaves(sessionId);
    expect(saves).toHaveLength(1);
    expect(saves[0].data.score).toBe(42);
    expect(saves[0].data.inventory['apple-red']).toBe(5);

    // List it
    const sessions = await manager.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe(sessionId);

    // Delete
    await manager.deleteSession(sessionId);

    // Verify it's gone
    expect(await manager.getSession(sessionId)).toBeNull();
    expect(await manager.listSessions()).toHaveLength(0);
  });

  it('multiple sessions with different seeds are independent', async () => {
    const seed1 = 'alpha-world';
    const seed2 = 'beta-world';
    const alpha = manager.createSessionId();
    const beta = manager.createSessionId();

    await manager.appendSave(
      alpha,
      makeSaveData({
        score: 10,
        worldGeneration: {
          seed: seed1,
          worldSalt: 1,
          biomeSalt: 2,
          riverSalt: 3,
          barrierSalt: 4,
          structureSalt: 5,
          townSalt: 6,
        },
      }),
    );
    await manager.appendSave(
      beta,
      makeSaveData({
        score: 20,
        worldGeneration: {
          seed: seed2,
          worldSalt: 7,
          biomeSalt: 8,
          riverSalt: 9,
          barrierSalt: 10,
          structureSalt: 11,
          townSalt: 12,
        },
      }),
    );

    const sessions = await manager.listSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions.map((s) => s.seed).sort()).toEqual([seed1, seed2]);

    const alphaSaves = await manager.listSessionSaves(alpha);
    const betaSaves = await manager.listSessionSaves(beta);
    expect(alphaSaves[0].data.worldGeneration?.seed).toBe(seed1);
    expect(betaSaves[0].data.worldGeneration?.seed).toBe(seed2);
  });

  it('storage factory is used when provided', async () => {
    const testStorage = new Map<string, SessionRecord>();
    const testManager = new SaveManagerV2((_prefix: string) => {
      void _prefix;
      return createMockStore<SessionRecord>(testStorage);
    });

    const sessionId = testManager.createSessionId();
    await testManager.appendSave(sessionId, makeSaveData({ score: 777 }));

    const saves = await testManager.listSessionSaves(sessionId);
    expect(saves[0].data.score).toBe(777);
    expect(testStorage.has(`sess:${sessionId}`)).toBe(true);
  });
});
