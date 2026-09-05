import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_SAVES_PER_SESSION,
  SaveManagerV2,
  type GameSaveData,
  type SessionRecord,
} from '../saveManagerV2.js';
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
      worldSalt: 1,
      biomeSalt: 2,
      riverSalt: 3,
      barrierSalt: 4,
      structureSalt: 5,
      townSalt: 6,
    },
    ...overrides,
  };
}

describe('SaveManagerV2', () => {
  let storage: Map<string, SessionRecord>;
  let manager: SaveManagerV2;

  beforeEach(() => {
    storage = new Map();
    if (typeof localStorage !== 'undefined') localStorage.clear();
    manager = new SaveManagerV2(() => createMockStore(storage));
  });

  it('creates unique session IDs', () => {
    expect(manager.createSessionId()).not.toBe(manager.createSessionId());
  });

  it(`keeps only the newest ${MAX_SAVES_PER_SESSION} saves per session`, async () => {
    const sessionId = manager.createSessionId();
    for (let score = 0; score < MAX_SAVES_PER_SESSION + 3; score++) {
      await manager.appendSave(sessionId, makeSaveData({ score }));
    }

    const saves = await manager.listSessionSaves(sessionId);
    expect(saves).toHaveLength(MAX_SAVES_PER_SESSION);
    expect(saves.map((entry) => entry.data.score)).toEqual([3, 4, 5, 6, 7]);
  });

  it('keeps sessions independent and reports their latest metadata', async () => {
    const alpha = manager.createSessionId();
    const beta = manager.createSessionId();
    await manager.appendSave(alpha, makeSaveData({ score: 10 }));
    await manager.appendSave(beta, makeSaveData({ score: 20 }));
    await manager.appendSave(
      alpha,
      makeSaveData({
        score: 30,
        worldGeneration: {
          seed: 'alpha-latest',
          worldSalt: 1,
          biomeSalt: 2,
          riverSalt: 3,
          barrierSalt: 4,
          structureSalt: 5,
          townSalt: 6,
        },
      }),
    );

    const sessions = await manager.listSessions();
    const alphaInfo = sessions.find((entry) => entry.sessionId === alpha);
    const betaInfo = sessions.find((entry) => entry.sessionId === beta);

    expect(alphaInfo?.saveCount).toBe(2);
    expect(alphaInfo?.seed).toBe('alpha-latest');
    expect(betaInfo?.saveCount).toBe(1);
  });

  it('loads and deletes individual save points', async () => {
    const sessionId = manager.createSessionId();
    await manager.appendSave(sessionId, makeSaveData({ score: 1 }));
    await new Promise((resolve) => setTimeout(resolve, 2));
    await manager.appendSave(sessionId, makeSaveData({ score: 2 }));

    const saves = await manager.listSessionSaves(sessionId);
    const newest = saves[saves.length - 1];
    expect(newest).toBeDefined();
    if (!newest) return;

    expect((await manager.loadSave(sessionId, newest.timestamp))?.score).toBe(2);
    await manager.deleteSave(sessionId, newest.timestamp);
    expect((await manager.listSessionSaves(sessionId)).map((entry) => entry.data.score)).toEqual([1]);
  });

  it('deletes whole sessions', async () => {
    const sessionId = manager.createSessionId();
    await manager.appendSave(sessionId, makeSaveData());

    await manager.deleteSession(sessionId);

    expect(await manager.getSession(sessionId)).toBeNull();
  });

  it(
    'migrates v1 saves to the live v3 schema without synthesizing removed Minecraft state',
    async () => {
      const sessionId = manager.createSessionId();
      await manager.appendSave(sessionId, makeSaveData({ version: '1.0.0' }));

      const [entry] = await manager.listSessionSaves(sessionId);
      expect(entry.data.version).toBe('3.0.0');
      expect(entry.data.fishing).toEqual({
        caughtFish: {},
        catchJournal: [],
        equippedRod: 'none',
      });
      expect('minecraftBlocks' in entry.data).toBe(false);
      expect('minecraftPlayerState' in entry.data).toBe(false);
    },
  );

  it('migrates v2 fishing data without losing existing catches', async () => {
    const sessionId = manager.createSessionId();
    await manager.appendSave(
      sessionId,
      makeSaveData({
        version: '2.0.0',
        fishing: { caughtFish: { 'fish-minnow': 5 } },
      }),
    );

    const [entry] = await manager.listSessionSaves(sessionId);
    expect(entry.data.version).toBe('3.0.0');
    expect(entry.data.fishing).toEqual({
      caughtFish: { 'fish-minnow': 5 },
      catchJournal: [],
      equippedRod: 'none',
    });
  });

  it('formats session and save labels from live data', async () => {
    const sessionId = manager.createSessionId();
    await manager.appendSave(sessionId, makeSaveData({ score: 77 }));
    const [info] = await manager.listSessions();

    expect(manager.getSessionLabel(info)).toContain('test-seed');
    expect(manager.getSaveLabel(info.lastSavedAt, 77)).toContain('Score 77');
  });
});
