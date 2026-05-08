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
  private readonly SAVE_KEY = "snakeGameSave";
  private readonly VERSION = "1.0.0";

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

      localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save game:", error);
    }
  }

  load(game: any, getReligionChoice?: () => any, getClassChoice?: () => any, getBackgroundChoice?: () => any): boolean {
    try {
      const saved = localStorage.getItem(this.SAVE_KEY);
      if (!saved) {
        return false;
      }

      const data = JSON.parse(saved) as GameSaveData;

      if (data.version !== this.VERSION) {
        console.error("Save version mismatch:", data.version, this.VERSION);
        return false;
      }

      const success = game.loadGame(getReligionChoice, getClassChoice, getBackgroundChoice);

      if (success) {
        console.log(`[SaveManager] Loaded save successfully`);
      }

      return success;
    } catch (error) {
      console.error("Failed to load game:", error);
      return false;
    }
  }

  hasSave(): boolean {
    try {
      return Boolean(localStorage.getItem(this.SAVE_KEY));
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.SAVE_KEY);
    } catch (error) {
      console.error("Failed to clear save:", error);
    }
  }
}

export const saveManager = new SaveManager();
