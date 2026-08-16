import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SaveManagerV2,
  MAX_SAVES_PER_SESSION,
  type GameSaveData,
  type SessionRecord,
} from '../../game/saveManagerV2.js';
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
  let storage: Map<string, SessionRecord>;
  let manager: SaveManagerV2;

  beforeEach(() => {
    storage = new Map();
    manager = new SaveManagerV2((_prefix: string) => {
      void _prefix;
      return createMockStore<SessionRecord>(storage);
    });
  });

  describe('createSessionId', () => {
    it('produces unique IDs', () => {
      const a = manager.createSessionId();
      const b = manager.createSessionId();
      expect(a).not.toBe(b);
      expect(a.startsWith('s-')).toBe(true);
    });
  });

  describe('appendSave', () => {
    it('creates a session with its first save', async () => {
      const sessionId = manager.createSessionId();
      await manager.appendSave(sessionId, makeSaveData({ score: 42 }));

      const record = await manager.getSession(sessionId);
      expect(record).not.toBeNull();
      expect(record!.sessionId).toBe(sessionId);
      expect(record!.saves).toHaveLength(1);
      expect(record!.saves[0].data.score).toBe(42);
    });

    it('appends saves in chronological order', async () => {
      const sessionId = manager.createSessionId();
      await manager.appendSave(sessionId, makeSaveData({ score: 1 }));
      await new Promise((r) => setTimeout(r, 5));
      await manager.appendSave(sessionId, makeSaveData({ score: 2 }));

      const saves = await manager.listSessionSaves(sessionId);
      expect(saves).toHaveLength(2);
      expect(saves[0].data.score).toBe(1);
      expect(saves[1].data.score).toBe(2);
      expect(saves[0].timestamp).toBeLessThan(saves[1].timestamp);
    });

    it(`keeps only the last ${MAX_SAVES_PER_SESSION} saves`, async () => {
      const sessionId = manager.createSessionId();
      for (let i = 0; i < MAX_SAVES_PER_SESSION + 3; i++) {
        await manager.appendSave(sessionId, makeSaveData({ score: i }));
      }

      const saves = await manager.listSessionSaves(sessionId);
      expect(saves).toHaveLength(MAX_SAVES_PER_SESSION);
      // Oldest saves were pruned; newest ones remain in order.
      expect(saves[0].data.score).toBe(3);
      expect(saves[saves.length - 1].data.score).toBe(MAX_SAVES_PER_SESSION + 2);
    });

    it('does not affect other sessions', async () => {
      const alpha = manager.createSessionId();
      const beta = manager.createSessionId();
      await manager.appendSave(alpha, makeSaveData({ score: 10 }));
      for (let i = 0; i < 6; i++) {
        await manager.appendSave(beta, makeSaveData({ score: i }));
      }

      const alphaSaves = await manager.listSessionSaves(alpha);
      expect(alphaSaves).toHaveLength(1);
      expect(alphaSaves[0].data.score).toBe(10);
    });
  });

  describe('listSessions', () => {
    it('returns sessions most recently saved first', async () => {
      const older = manager.createSessionId();
      const newer = manager.createSessionId();
      await manager.appendSave(older, makeSaveData({ score: 1 }));
      await new Promise((r) => setTimeout(r, 5));
      await manager.appendSave(newer, makeSaveData({ score: 2 }));
      await new Promise((r) => setTimeout(r, 5));
      // Touch the older session so it becomes the most recently saved.
      await manager.appendSave(older, makeSaveData({ score: 2 }));

      const sessions = await manager.listSessions();
      expect(sessions.map((s) => s.sessionId)).toEqual([older, newer]);
    });

    it('exposes save count, timestamps and latest seed', async () => {
      const sessionId = manager.createSessionId();
      await manager.appendSave(sessionId, makeSaveData({ score: 1 }));
      await new Promise((r) => setTimeout(r, 5));
      await manager.appendSave(
        sessionId,
        makeSaveData({
          score: 2,
          worldGeneration: {
            seed: 'newest-seed',
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
      expect(sessions).toHaveLength(1);
      expect(sessions[0].saveCount).toBe(2);
      expect(sessions[0].seed).toBe('newest-seed');
      expect(sessions[0].lastSavedAt).toBeGreaterThanOrEqual(sessions[0].createdAt);
    });

    it('returns empty array when no sessions exist', async () => {
      const sessions = await manager.listSessions();
      expect(sessions).toHaveLength(0);
    });
  });

  describe('loadSave', () => {
    it('loads a specific save by timestamp', async () => {
      const sessionId = manager.createSessionId();
      await manager.appendSave(sessionId, makeSaveData({ score: 10 }));
      await new Promise((r) => setTimeout(r, 5));
      await manager.appendSave(sessionId, makeSaveData({ score: 20 }));

      const saves = await manager.listSessionSaves(sessionId);
      const loaded = await manager.loadSave(sessionId, saves[0].timestamp);
      expect(loaded).not.toBeNull();
      expect(loaded!.score).toBe(10);
    });

    it('returns null for unknown session or timestamp', async () => {
      const sessionId = manager.createSessionId();
      await manager.appendSave(sessionId, makeSaveData({ score: 1 }));

      expect(await manager.loadSave('nope', 123)).toBeNull();
      expect(await manager.loadSave(sessionId, 999999999)).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes an entire session', async () => {
      const sessionId = manager.createSessionId();
      await manager.appendSave(sessionId, makeSaveData({ score: 50 }));
      await manager.deleteSession(sessionId);

      expect(await manager.getSession(sessionId)).toBeNull();
      const sessions = await manager.listSessions();
      expect(sessions).toHaveLength(0);
    });

    it('removes a single save from a session', async () => {
      const sessionId = manager.createSessionId();
      await manager.appendSave(sessionId, makeSaveData({ score: 1 }));
      await new Promise((r) => setTimeout(r, 5));
      await manager.appendSave(sessionId, makeSaveData({ score: 2 }));

      const saves = await manager.listSessionSaves(sessionId);
      await manager.deleteSave(sessionId, saves[0].timestamp);

      const remaining = await manager.listSessionSaves(sessionId);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].data.score).toBe(2);
    });

    it('does not throw on deleting a nonexistent session', async () => {
      await expect(manager.deleteSession('ghost-session')).resolves.toBeUndefined();
    });
  });

  describe('labels', () => {
    it('formats a session label with seed and save count', async () => {
      const sessionId = manager.createSessionId();
      await manager.appendSave(sessionId, makeSaveData());
      const [info] = await manager.listSessions();
      const label = manager.getSessionLabel(info);
      expect(label).toContain('Started');
      expect(label).toContain('test-seed');
      expect(label).toContain(`${info.saveCount}/${MAX_SAVES_PER_SESSION} saves`);
    });

    it('does not label the default-world seed', async () => {
      const sessionId = manager.createSessionId();
      await manager.appendSave(
        sessionId,
        makeSaveData({
          worldGeneration: {
            seed: 'default-world',
            worldSalt: 1,
            biomeSalt: 2,
            riverSalt: 3,
            barrierSalt: 4,
            structureSalt: 5,
            townSalt: 6,
          },
        }),
      );
      const [info] = await manager.listSessions();
      expect(manager.getSessionLabel(info)).not.toContain('default-world');
    });

    it('formats save labels with date and score', () => {
      expect(manager.getSaveLabel(1000, 77)).toContain('Score 77');
    });
  });

  describe('migration', () => {
    it('migrates v1 data to v3 when appended and loaded', async () => {
      const v1Data: GameSaveData = {
        version: '1.0.0',
        timestamp: Date.now(),
        score: 50,
        inventory: {},
        equipment: {},
        flags: {},
      };
      const sessionId = manager.createSessionId();
      await manager.appendSave(sessionId, v1Data);

      const saves = await manager.listSessionSaves(sessionId);
      expect(saves[0].data.version).toBe('3.0.0');
      expect(saves[0].data.minecraftBlocks).toEqual([]);
      expect(saves[0].data.minecraftPlayerState).toBeDefined();
      expect(saves[0].data.fishing).toBeDefined();
      expect(saves[0].data.fishing!.catchJournal).toEqual([]);
      expect(saves[0].data.fishing!.equippedRod).toBe('none');
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
      const sessionId = manager.createSessionId();
      await manager.appendSave(sessionId, v2Data);

      const loaded = await manager.loadSave(
        sessionId,
        (await manager.listSessionSaves(sessionId))[0].timestamp,
      );
      expect(loaded!.version).toBe('3.0.0');
      expect(loaded!.fishing!.caughtFish).toEqual({ 'fish-minnow': 5 });
      expect(loaded!.fishing!.catchJournal).toEqual([]);
      expect(loaded!.fishing!.equippedRod).toBe('none');
    });

    it('does not re-migrate already migrated data', async () => {
      const sessionId = manager.createSessionId();
      await manager.appendSave(sessionId, makeSaveData({ score: 300 }));

      const first = await manager.loadSave(
        sessionId,
        (await manager.listSessionSaves(sessionId))[0].timestamp,
      );
      const second = await manager.loadSave(
        sessionId,
        (await manager.listSessionSaves(sessionId))[0].timestamp,
      );
      expect(first!.version).toBe('3.0.0');
      expect(second!.version).toBe('3.0.0');
      expect(second!.score).toBe(300);
    });
  });
});

describe('SaveManagerV2 legacy slot migration', () => {
  function createFakeLocalStorage() {
    const backing = new Map<string, string>();
    return {
      store: backing,
      get length() {
        return backing.size;
      },
      key: (i: number) => [...backing.keys()][i] ?? null,
      getItem: (k: string) => (backing.has(k) ? (backing.get(k) as string) : null),
      setItem: (k: string, v: string) => {
        backing.set(k, v);
      },
      removeItem: (k: string) => {
        backing.delete(k);
      },
    };
  }

  it('folds pre-session flat slots into standalone sessions', async () => {
    const fake = createFakeLocalStorage();
    const legacyData = makeSaveData({ score: 11 });
    legacyData.version = '2.0.0';
    legacyData.fishing = { caughtFish: { 'fish-minnow': 1 } };
    fake.store.set('snake-save:2026-01-15T10:00:00.000Z', JSON.stringify(legacyData));
    const autosaveData = makeSaveData({ score: 22 });
    fake.store.set('snake-save:autosave-0', JSON.stringify(autosaveData));

    vi.stubGlobal('localStorage', fake);
    const sessions = await new SaveManagerV2().listSessions();
    const dateSession = sessions.find((s) => s.sessionId.startsWith('legacy-2026'));
    const autosaveSession = sessions.find((s) => s.sessionId.startsWith('legacy-autosave-0'));
    expect(dateSession).toBeDefined();
    expect(autosaveSession).toBeDefined();

    // Legacy keys are consumed by the migration.
    expect(fake.store.has('snake-save:2026-01-15T10:00:00.000Z')).toBe(false);
    expect(fake.store.has('snake-save:autosave-0')).toBe(false);

    // Migrated data survives a round trip and v2 data is migrated to v3.
    const manager = new SaveManagerV2();
    const dateSaves = await manager.listSessionSaves(dateSession!.sessionId);
    expect(dateSaves[0].data.score).toBe(11);
    expect(dateSaves[0].data.version).toBe('3.0.0');
    expect(dateSaves[0].data.fishing!.equippedRod).toBe('none');
    const autosaveSaves = await manager.listSessionSaves(autosaveSession!.sessionId);
    expect(autosaveSaves[0].data.score).toBe(22);
  });

  it('does not double-migrate once legacy slots are gone', async () => {
    const fake = createFakeLocalStorage();
    fake.store.set(
      'snake-save:2026-01-15T10:00:00.000Z',
      JSON.stringify(makeSaveData({ score: 33 })),
    );

    vi.stubGlobal('localStorage', fake);
    const manager = new SaveManagerV2();
    const first = await manager.listSessions();
    expect(first).toHaveLength(1);
    const second = await manager.listSessions();
    expect(second).toHaveLength(1);
    expect(second[0].sessionId).toBe(first[0].sessionId);
  });
});
