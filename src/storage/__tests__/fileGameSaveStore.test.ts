import { mkdtemp, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { FileGameSaveStore } from '../FileGameSaveStore.js';
import type { GameSaveData } from '../../game/saveTypes.js';

describe('Node game checkpoints', () => {
  it('persists through a new store instance and rejects corrupt checkpoints and path traversal', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'snake-checkpoint-'));
    const store = new FileGameSaveStore(directory);
    const checkpoint: GameSaveData = {
      version: '1.0.0',
      timestamp: 1,
      score: 7,
      inventory: { apple: 2 },
      equipment: {},
      flags: { timeMs: 123 },
    };
    try {
      expect(await store.has('run')).toBe(false);
      expect(await store.load('run')).toBeNull();
      await store.save('run', checkpoint);
      const reopened = new FileGameSaveStore(directory);
      expect(await reopened.has('run')).toBe(true);
      expect(await reopened.load('run')).toEqual(checkpoint);
      await reopened.save('run', { ...checkpoint, score: 9 });
      expect((await store.load('run'))?.score).toBe(9);
      await expect(store.load('../escape')).rejects.toThrow('Invalid save slot');
      await writeFile(join(directory, 'run.json'), '{"score":999}', 'utf8');
      await expect(store.load('run')).rejects.toThrow('Invalid game checkpoint');
      await store.clear('run');
      expect(await reopened.has('run')).toBe(false);
    } finally {
      await rm(join(directory, 'run.json'), { force: true });
      await rm(join(directory, 'run.json.tmp'), { force: true });
      await rmdir(directory);
    }
  });
});
