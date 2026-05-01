import { getItem } from "../inventory/itemRegistry.js";

export interface GameSaveData {
  version: string;
  timestamp: number;
  snakeLength: number;
  score: number;
  snakeBody: Array<{ x: number; y: number }>;
  snakeDirection: { x: number; y: number };
  snakeRoomId: string;
  playerHealth: number;
  playerMaxHealth: number;
  questsActive: string[];
  questsCompleted: string[];
  questsAccepted: string[];
  inventory: Record<string, number>;
  equipment: Record<string, string>;
  flags: Record<string, unknown>;
  religionId?: string;
  religionMods?: Record<string, unknown>;
  classId?: string;
  classMods?: Record<string, unknown>;
  backgroundId?: string;
  backgroundMods?: Record<string, unknown>;
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

      const getReligion = getReligionChoice || (() => null);
      const getClass = getClassChoice || (() => null);
      const getBackground = getBackgroundChoice || (() => null);

      const religionChoice = data.religionId ? getReligion() : null;
      const classChoice = data.classId ? getClass() : null;
      const backgroundChoice = data.backgroundId ? getBackground() : null;

const success = game.loadGame(getReligionChoice, getClassChoice, getBackgroundChoice);

if (success) {
        console.log(`[SaveManager] Loaded save successfully`);
        game.setFlag("timeMs", data.timestamp);
        game.setFlag("player.health", data.playerHealth);
        game.setFlag("player.maxHealth", data.playerMaxHealth);

        // Restore snake body, direction, position, and length
        if (data.snakeBody && data.snakeBody.length > 0 && data.snakeDirection && data.snakeRoomId) {
          console.log(`[SaveManager] Restoring snake from save`);
          game.snake.restoreFromSave(data.snakeBody, data.snakeDirection, data.snakeRoomId, data.snakeLength);
        }

        for (const [key, value] of Object.entries(data.inventory)) {
          game.getInventory().addItem(key, value);
        }

        for (const [slot, itemId] of Object.entries(data.equipment)) {
          const item = getItem(itemId);
          if (item) {
            game.getInventory().equip(item);
          }
        }

        for (const [key, value] of Object.entries(data.flags)) {
          if (value !== undefined) {
            game.setFlag(key, value);
          }
        }

        if (data.religionId) {
          const religion = getReligion();
          if (religion && religion.id === data.religionId) {
            game.setFlag("religion.id", data.religionId);
            game.setFlag("religion.mods", data.religionMods);
          }
        }

        if (data.classId) {
          const cls = getClass();
          if (cls && cls.id === data.classId) {
            game.setFlag("class.id", data.classId);
            game.setFlag("class.mods", data.classMods);
          }
        }

        if (data.backgroundId) {
          const bg = getBackground();
          if (bg && bg.id === data.backgroundId) {
            game.setFlag("background.id", data.backgroundId);
            game.setFlag("background.mods", data.backgroundMods);
          }
        }
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