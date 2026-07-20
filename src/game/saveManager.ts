import { LocalStorageStringSaveStore } from '../storage/LocalStorageStringSaveStore.js';
import { isVersionLessThan, migrateV1toV2, migrateV2toV3, type GameSaveData } from './saveTypes.js';

const SAVE_KEY = 'snakeGameSave';
const DEFAULT_SAVE_SLOT = '';
const saveStore = new LocalStorageStringSaveStore(SAVE_KEY);

export { type GameSaveData } from './saveTypes.js';

export function getSavedGameData(): string | null {
  return saveStore.load(DEFAULT_SAVE_SLOT);
}

export function setSavedGameData(data: string): void {
  saveStore.save(DEFAULT_SAVE_SLOT, data);
}

export function clearSavedGameData(): void {
  saveStore.clear(DEFAULT_SAVE_SLOT);
}

export class SaveManager {
  private readonly VERSION = '3.0.0';

  constructor() {}

  save(game: any, religionChoice?: any, classChoice?: any, backgroundChoice?: any): void {
    try {
      const data = game.getSaveData();

      if (religionChoice) {
        data.religionId = religionChoice.id;
        data.religionMods = religionChoice.mods;
      }

      if (classChoice) {
        data.classId = classChoice.id;
        data.classMods = classChoice.mods;
      }

      if (backgroundChoice) {
        data.backgroundId = backgroundChoice.id;
        data.backgroundMods = backgroundChoice.mods;
      }

      setSavedGameData(JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  }

  load(
    game: any,
    getReligionChoice?: () => any,
    getClassChoice?: () => any,
    getBackgroundChoice?: () => any,
  ): boolean {
    try {
      const saved = getSavedGameData();
      if (!saved) {
        return false;
      }

      const data = JSON.parse(saved) as GameSaveData;

      if (data.version !== this.VERSION) {
        // Migrate from v1.x to v2.0.0
        const currentVersion = data.version ?? '0.0.0';
        if (isVersionLessThan(currentVersion, '2.0.0')) {
          migrateV1toV2(data);
        }
        // Migrate from v2.x to v3.0.0
        if (isVersionLessThan(currentVersion, '3.0.0')) {
          migrateV2toV3(data);
        }
      }

      const success = game.loadGame(getReligionChoice, getClassChoice, getBackgroundChoice);

      return success;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }

  hasSave(): boolean {
    try {
      return Boolean(getSavedGameData());
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      clearSavedGameData();
    } catch (error) {
      console.error('Failed to clear save:', error);
    }
  }
}

export const saveManager = new SaveManager();
