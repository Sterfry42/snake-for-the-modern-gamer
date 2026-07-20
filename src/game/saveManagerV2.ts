import type { SaveStore } from '../storage/SaveStore.js';
export type { SaveStore } from '../storage/SaveStore.js';
import { LocalStorageSaveStore } from '../storage/LocalStorageSaveStore.js';
import { isVersionLessThan, migrateV1toV2, migrateV2toV3, type GameSaveData } from './saveTypes.js';

const SAVE_KEY = 'snakeGameSave';
const AUTOSAVE_PREFIX = 'autosave-';
const AUTOSAVE_COUNT = 5;

export { type GameSaveData } from './saveTypes.js';

export interface SaveSlotInfo {
  slotId: string;
  data: GameSaveData;
  label: string;
}

export interface SaveSlotInfo {
  slotId: string;
  data: GameSaveData;
  label: string;
}

export class SaveManagerV2 {
  private readonly store: SaveStore<GameSaveData>;
  private readonly VERSION = '3.0.0';
  private autosaveIndex = 0;
  private legacyData: GameSaveData | null = null;
  private knownSlots = new Set<string>();

  constructor(storageFactory?: (prefix: string) => SaveStore<GameSaveData>) {
    if (storageFactory) {
      this.store = storageFactory('snake-save');
    } else {
      this.store = new LocalStorageSaveStore<GameSaveData>('snake-save');
    }
    this.discoverSaves();
  }

  private discoverSaves(): void {
    try {
      const storage = typeof localStorage === 'undefined' ? null : localStorage;
      if (!storage) return;
      const prefix = 'snake-save:';
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(prefix)) {
          const slotId = key.substring(prefix.length);
          this.knownSlots.add(slotId);
        }
      }
    } catch (err) {
      console.warn('[SaveManagerV2] Failed to discover saves from localStorage:', err);
    }
  }

  async save(slotId: string, data: GameSaveData): Promise<void> {
    this.knownSlots.add(slotId);
    await this.store.save(slotId, data);
  }

  async load(slotId: string): Promise<GameSaveData | null> {
    const raw = await this.store.load(slotId);
    if (!raw) {
      // Check legacy single-slot save as fallback
      if (slotId === 'legacy' && this.legacyData === null) {
        this.legacyData = await this.loadLegacy();
      }
      if (slotId === 'legacy' && this.legacyData) {
        return this.migrate(this.legacyData);
      }
      return null;
    }
    return this.migrate(raw);
  }

  async delete(slotId: string): Promise<void> {
    this.knownSlots.delete(slotId);
    await this.store.clear(slotId);
  }

  async listRegularSaves(): Promise<SaveSlotInfo[]> {
    this.discoverSaves();
    const all: [string, GameSaveData][] = [];
    for (const slotId of this.knownSlots) {
      const data = await this.store.load(slotId);
      if (data) {
        all.push([slotId, data]);
      }
    }
    const regular = all.filter(([id]) => !id.startsWith(AUTOSAVE_PREFIX));
    regular.sort((a, b) => b[0].localeCompare(a[0]));
    return regular.map(([slotId, data]) => ({
      slotId,
      data,
      label: this.getSlotLabel(slotId),
    }));
  }

  async listAutosaves(): Promise<SaveSlotInfo[]> {
    const results: SaveSlotInfo[] = [];

    // Check for autosave-current
    const currentSlotId = `${AUTOSAVE_PREFIX}current`;
    const currentData = await this.store.load(currentSlotId);
    if (currentData) {
      results.push({
        slotId: currentSlotId,
        data: currentData,
        label: this.getSlotLabel(currentSlotId),
      });
    }

    // Check for numbered autosaves
    for (let i = 0; i < AUTOSAVE_COUNT; i++) {
      const slotId = `${AUTOSAVE_PREFIX}${i}`;
      const data = await this.store.load(slotId);
      if (data) {
        results.push({
          slotId,
          data,
          label: this.getSlotLabel(slotId),
        });
      }
    }

    return results;
  }

  async triggerAutosave(): Promise<void> {
    const slotId = `${AUTOSAVE_PREFIX}${this.autosaveIndex}`;
    // Load legacy data if no game data available
    const data = await this.load('legacy');
    if (!data) {
      return;
    }
    await this.save(slotId, data);
    this.autosaveIndex = (this.autosaveIndex + 1) % AUTOSAVE_COUNT;
  }

  getSlotLabel(slotId: string): string {
    if (slotId === `${AUTOSAVE_PREFIX}current`) {
      return 'Autosave (Current)';
    }
    if (slotId.startsWith(AUTOSAVE_PREFIX)) {
      const index = parseInt(slotId.replace(AUTOSAVE_PREFIX, ''), 10);
      return `Autosave ${index + 1}`;
    }

    // Try to parse as ISO date string
    try {
      const date = new Date(slotId);
      if (!isNaN(date.getTime())) {
        const formatted = date.toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
        return formatted;
      }
    } catch {
      // not a date
    }

    return slotId;
  }

  getDisplayLabel(slotId: string, worldSeed?: string): string {
    let label = this.getSlotLabel(slotId);
    if (worldSeed && worldSeed !== 'default-world') {
      label += `\nSeed: ${worldSeed}`;
    }
    return label;
  }

  async getLegacySave(): Promise<GameSaveData | null> {
    return this.load('legacy');
  }

  async migrateLegacyToSlot(): Promise<string | null> {
    const data = await this.load('legacy');
    if (!data) {
      return null;
    }
    const dateKey = new Date(data.timestamp).toISOString();
    await this.save(dateKey, data);
    return dateKey;
  }

  private async loadLegacy(): Promise<GameSaveData | null> {
    try {
      const storage = typeof localStorage === 'undefined' ? null : localStorage;
      const raw = storage?.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as GameSaveData;
      return data;
    } catch {
      return null;
    }
  }

  private migrate(data: GameSaveData): GameSaveData {
    if (data.version !== this.VERSION) {
      const currentVersion = data.version ?? '0.0.0';
      if (isVersionLessThan(currentVersion, '2.0.0')) {
        migrateV1toV2(data);
      }
      if (isVersionLessThan(currentVersion, '3.0.0')) {
        migrateV2toV3(data);
      }
    }
    return data;
  }
}

export const saveManagerV2 = new SaveManagerV2();
