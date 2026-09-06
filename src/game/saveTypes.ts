/**
 * Shared save data types and migration utilities.
 */
import type { WorldGenerationIdentity } from '../world/generation/worldGenerationIdentity.js';
import type { CharacterMode } from '../player/raccoonMode.js';
import type { SpecialStatsState } from '../stats/specialTypes.js';
import type { AchievementState } from '../achievements/achievementTypes.js';
import type { LevelProgressionState } from '../stats/levelProgression.js';
import type { ArcadeSnakeSaveData } from '../arcade/arcadeSnakeTypes.js';
import type { AtmosphereState } from '../world/atmosphereTypes.js';
import type { DrivingCarState } from '../vehicles/car.js';
import type { LayerInstance } from '../layers/layerTypes.js';

export interface ChoiceWithMods {
  id: string;
  mods: Record<string, unknown>;
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
    cowbellUnlocked: boolean;
    cowbellEquipped: boolean;
    loudWalkingNoiseUnlocked: boolean;
    loudWalkingNoiseEnabled: boolean;
    minimapUnlocked: boolean;
    minimapEnabled: boolean;
    languageSelected: boolean;
    languageSet: boolean;
    activeLanguage: string;
    ownedEmoticons: string[];
    activeEmoticon: string | null;
  };
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
  activeVehicle?: DrivingCarState;
  layerInstances?: LayerInstance[];
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

/**
 * Advance legacy v1 saves to the v2 version boundary.
 *
 * v2 originally introduced Minecraft fields. That feature stack has since been
 * removed, so modern code intentionally ignores any old Minecraft payload that
 * may still be present in persisted JSON.
 */
export function migrateV1toV2(data: GameSaveData): void {
  console.info('[SaveMigrations] Migrating from v1.x to v2.0.0');
  data.version = '2.0.0';
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
