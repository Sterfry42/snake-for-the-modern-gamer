import type { WorldGenerationIdentity } from '../world/generation/worldGenerationIdentity.js';
import { LocalStorageStringSaveStore } from '../storage/LocalStorageStringSaveStore.js';
import type { CharacterMode } from '../player/raccoonMode.js';
import type { SpecialStatsState } from '../stats/specialTypes.js';
import type { AchievementState } from '../achievements/achievementTypes.js';
import type { LevelProgressionState } from '../stats/levelProgression.js';
import type { ArcadeSnakeSaveData } from '../arcade/arcadeSnakeTypes.js';
import type { AtmosphereState } from '../world/atmosphereTypes.js';

const SAVE_KEY = 'snakeGameSave';
const DEFAULT_SAVE_SLOT = '';
const saveStore = new LocalStorageStringSaveStore(SAVE_KEY);

export function getSavedGameData(): string | null {
  return saveStore.load(DEFAULT_SAVE_SLOT);
}

export function setSavedGameData(data: string): void {
  saveStore.save(DEFAULT_SAVE_SLOT, data);
}

export function clearSavedGameData(): void {
  saveStore.clear(DEFAULT_SAVE_SLOT);
}

export interface MinecraftBlockEntry {
  roomId: string;
  x: number;
  y: number;
  blockType: string;
}

export interface MinecraftMobEntry {
  id: string;
  type: string;
  roomId: string;
  x: number;
  y: number;
  health: number;
}

export interface MinecraftPlayerSaveData {
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  xp: number;
  xpLevel: number;
  armorPoints: number;
  spawnX: number;
  spawnY: number;
  spawnRoomId: string;
  inventory: Array<{ itemId: string; count: number }>;
  equippedTool: string | null;
}

export interface GameSaveData {
  version: string;
  timestamp: number;
  characterMode?: CharacterMode;
  raccoonWeight?: number;
  raccoonHunger?: number;
  raccoonHungerTimer?: number;
  raccoonBanditMeter?: number;
  raccoonStashedTotal?: number;
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
  // Minecraft fields
  minecraftBlocks?: MinecraftBlockEntry[];
  minecraftPlayerState?: MinecraftPlayerSaveData;
  minecraftDayNight?: { day: number; timeOfDay: number };
  minecraftMobState?: MinecraftMobEntry[];
  minecraftInventory?: Array<{ itemId: string; count: number }>;
  // Fishing fields
  fishing?: {
    caughtFish?: Record<string, number>;
    catchJournal?: unknown[];
    equippedRod?: string;
  };
  special?: SpecialStatsState;
  levelProgression?: LevelProgressionState;
  achievements?: AchievementState;
  arcadeSnake?: ArcadeSnakeSaveData;
  atmosphere?: AtmosphereState;
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

function isVersionLessThan(version: string, target: string): boolean {
  const parts = version.split('.').map(Number);
  const targetParts = target.split('.').map(Number);

  for (let i = 0; i < Math.max(parts.length, targetParts.length); i++) {
    const a = parts[i] ?? 0;
    const b = targetParts[i] ?? 0;
    if (a < b) return true;
    if (a > b) return false;
  }
  return false;
}

function migrateV1toV2(data: GameSaveData): void {
  console.info('[SaveManager] Migrating from v1.x to v2.0.0');
  data.version = '2.0.0';

  if (!data.minecraftBlocks) {
    data.minecraftBlocks = [];
  }
  if (!data.minecraftPlayerState) {
    data.minecraftPlayerState = {
      health: 20,
      maxHealth: 20,
      hunger: 20,
      maxHunger: 20,
      xp: 0,
      xpLevel: 0,
      armorPoints: 0,
      spawnX: 0,
      spawnY: 0,
      spawnRoomId: '0,0,0',
      inventory: [],
      equippedTool: null,
    };
  }
  if (!data.minecraftDayNight) {
    data.minecraftDayNight = { day: 1, timeOfDay: 0 };
  }
  if (!data.minecraftMobState) {
    data.minecraftMobState = [];
  }
  if (!data.minecraftInventory) {
    data.minecraftInventory = [];
  }
}

function migrateV2toV3(data: GameSaveData): void {
  console.info('[SaveManager] Migrating from v2.x to v3.0.0');
  data.version = '3.0.0';
  data.fishing = data.fishing ?? {};
  if (!data.fishing.catchJournal) {
    data.fishing.catchJournal = [];
  }
  if (!data.fishing.equippedRod) {
    data.fishing.equippedRod = 'none';
  }
  if (!data.fishing.caughtFish) {
    data.fishing.caughtFish = {};
  }
}

export const saveManager = new SaveManager();
