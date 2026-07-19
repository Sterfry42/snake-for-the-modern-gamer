/**
 * Shared save data types and migration utilities.
 *
 * Both SaveManager and SaveManagerV2 import from here to avoid
 * duplicating type definitions and migration functions.
 */
import type { WorldGenerationIdentity } from '../world/generation/worldGenerationIdentity.js';
import type { CharacterMode } from '../player/raccoonMode.js';
import type { SpecialStatsState } from '../stats/specialTypes.js';
import type { AchievementState } from '../achievements/achievementTypes.js';
import type { LevelProgressionState } from '../stats/levelProgression.js';
import type { ArcadeSnakeSaveData } from '../arcade/arcadeSnakeTypes.js';
import type { AtmosphereState } from '../world/atmosphereTypes.js';
import type { DreamSaveData } from '../world/dream/types.js';

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
  minecraftBlocks?: MinecraftBlockEntry[];
  minecraftPlayerState?: MinecraftPlayerSaveData;
  minecraftDayNight?: { day: number; timeOfDay: number };
  minecraftMobState?: MinecraftMobEntry[];
  minecraftInventory?: Array<{ itemId: string; count: number }>;
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
  dreamWorld?: DreamSaveData;
}

/** Compare two semver-style version strings. Returns true if `a < b`. */
export function isVersionLessThan(version: string, target: string): boolean {
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

/** Migrate save data from v1.x to v2.0.0 (adds Minecraft fields). */
export function migrateV1toV2(data: GameSaveData): void {
  console.info('[SaveMigrations] Migrating from v1.x to v2.0.0');
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

/** Migrate save data from v2.x to v3.0.0 (adds fishing fields). */
export function migrateV2toV3(data: GameSaveData): void {
  console.info('[SaveMigrations] Migrating from v2.x to v3.0.0');
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
