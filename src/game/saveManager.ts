import type { WorldGenerationIdentity } from '../world/generation/worldGenerationIdentity.js';

const SAVE_KEY = 'snakeGameSave';
let memorySave: string | null = null;

function getStorage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function getSavedGameData(): string | null {
  return getStorage()?.getItem(SAVE_KEY) ?? memorySave;
}

export function setSavedGameData(data: string): void {
  const storage = getStorage();
  if (storage) {
    storage.setItem(SAVE_KEY, data);
    return;
  }
  memorySave = data;
}

export function clearSavedGameData(): void {
  getStorage()?.removeItem(SAVE_KEY);
  memorySave = null;
}

export interface GameSaveData {
  version: string;
  timestamp: number;
  snakeLength?: number;
  score: number;
  snakeBody?: Array<{ x: number; y: number }>;
  snakeDirection?: { x: number; y: number };
  snakeRoomId?: string;
  playerHealth?: number;
  playerMaxHealth?: number;
  questsActive?: string[];
  questsCompleted?: string[];
  questsAccepted?: string[];
  inventory: Record<string, number>;
  equipment: Record<string, string>;
  flags: Record<string, unknown>;
  worldGeneration?: WorldGenerationIdentity;
  religionId?: string;
  religionMods?: Record<string, unknown>;
  classId?: string;
  classMods?: Record<string, unknown>;
  backgroundId?: string;
  backgroundMods?: Record<string, unknown>;
  cosmetics?: {
    unlockedThemes: string[];
    activeTheme: string;
    unlockedHats: string[];
    activeHat: string | null;
    cowboyHatUnlocked: boolean;
    cowboyHatEquipped: boolean;
    loudWalkingNoiseUnlocked: boolean;
    loudWalkingNoiseEnabled: boolean;
    languageSelected: boolean;
    languageSet: boolean;
  };
}

export class SaveManager {
  private readonly VERSION = '1.0.0';

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
        console.error('Save version mismatch:', data.version, this.VERSION);
        return false;
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
