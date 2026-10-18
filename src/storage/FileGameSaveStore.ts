import { mkdir, readFile, rename, rm, access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SaveStore } from './SaveStore.js';
import type { GameSaveData } from '../game/saveTypes.js';
import { isRecord } from '../core/saveNormalize.js';

/** Node-only persistence; replace a checkpoint atomically after a successful write. */
export class FileGameSaveStore implements SaveStore<GameSaveData> {
  constructor(private readonly directory: string) {}

  async load(slotId: string): Promise<GameSaveData | null> {
    let raw: string;
    try {
      raw = await readFile(this.path(slotId), 'utf8');
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
    const data: unknown = JSON.parse(raw);
    if (!isGameSaveData(data)) throw new Error('Invalid game checkpoint');
    return data;
  }

  async save(slotId: string, data: GameSaveData): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const path = this.path(slotId);
    const temporary = `${path}.tmp`;
    await writeFile(temporary, JSON.stringify(data), 'utf8');
    await rename(temporary, path);
  }

  async clear(slotId: string): Promise<void> {
    await rm(this.path(slotId), { force: true });
  }

  async has(slotId: string): Promise<boolean> {
    try {
      await access(this.path(slotId));
      return true;
    } catch (error) {
      if (isMissing(error)) return false;
      throw error;
    }
  }

  private path(slotId: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(slotId)) throw new Error('Invalid save slot');
    return join(this.directory, `${slotId}.json`);
  }
}

function isMissing(error: unknown): boolean {
  return isRecord(error) && error.code === 'ENOENT';
}

function isGameSaveData(data: unknown): data is GameSaveData {
  return (
    isRecord(data) &&
    typeof data.version === 'string' &&
    typeof data.timestamp === 'number' &&
    typeof data.score === 'number' &&
    isRecord(data.inventory) &&
    Object.values(data.inventory).every((count) => typeof count === 'number') &&
    isRecord(data.equipment) &&
    Object.values(data.equipment).every((item) => typeof item === 'string') &&
    isRecord(data.flags)
  );
}
