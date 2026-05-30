// Companion state — read/write helper for companion data in snakeState flags.
// This file handles persistence only; runtime logic lives in CompanionService.

import type { CompanionSaveData, CompendiumSaveData } from './companionTypes.js';

/** Flag key prefix for all companion-related flags. */
export const COMPANION_FLAG_PREFIX = 'companions';

/** Flag key for serialized companion instances. */
export const COMPANION_INSTANCES_KEY = 'companions.instances';

/** Flag key for discovered creature IDs. */
export const COMPANION_COMPENDIUM_KEY = 'companions.discovered';

/** Flag key for companion settings. */
export const COMPANION_SETTINGS_KEY = 'companions.settings';

/**
 * Read companion save data from snakeState flags.
 * Returns defaults if flags are missing or invalid.
 */
export function readCompanionState(flags: Record<string, unknown>): CompanionSaveData {
  const rawInstances = flags[COMPANION_INSTANCES_KEY] as Record<string, unknown> | undefined;
  const instances: Record<string, any> = {};

  if (rawInstances && typeof rawInstances === 'object') {
    for (const [id, val] of Object.entries(rawInstances)) {
      if (val && typeof val === 'object') {
        instances[id] = val as any;
      }
    }
  }

  const rawCompendium = flags[COMPANION_COMPENDIUM_KEY] as CompendiumSaveData | undefined;
  const rawSettings = flags[COMPANION_SETTINGS_KEY] as Record<string, unknown> | undefined;

  return {
    version: 1,
    instances,
    compendium: {
      discovered: rawCompendium?.discovered ?? [],
      maxBondReached: rawCompendium?.maxBondReached ?? {},
      totalEncounters: rawCompendium?.totalEncounters ?? {},
      totalBred: rawCompendium?.totalBred ?? 0,
    },
    settings: {
      mountAutoEnabled: Boolean(rawSettings?.mountAutoEnabled),
      followerLimit: Number(rawSettings?.followerLimit) || 3,
    },
  };
}

/**
 * Write companion save data to snakeState flags.
 */
export function writeCompanionState(
  flags: Record<string, unknown>,
  data: CompanionSaveData,
): void {
  flags[COMPANION_INSTANCES_KEY] = data.instances;
  flags[COMPANION_COMPENDIUM_KEY] = {
    discovered: data.compendium.discovered,
    maxBondReached: data.compendium.maxBondReached,
    totalEncounters: data.compendium.totalEncounters,
    totalBred: data.compendium.totalBred,
  };
  flags[COMPANION_SETTINGS_KEY] = data.settings;
}

/**
 * Create helper functions for working with companion-specific flags.
 */
export function createCompanionFlagHelpers(flags: Record<string, unknown>): {
  /** Set a nested companion flag (e.g., 'companions.encounterCooldown.ember-wisp'). */
  setCompanionFlag: (key: string, value: unknown) => void;
  /** Get a companion flag value, with optional type parameter. */
  getCompanionFlag: <T = unknown>(key: string) => T | undefined;
  /** Check if a companion flag exists. */
  hasCompanionFlag: (key: string) => boolean;
} {
  return {
    setCompanionFlag(key: string, value: unknown): void {
      flags[`companions.${key}`] = value;
    },
    getCompanionFlag<T>(key: string): T | undefined {
      return flags[`companions.${key}`] as T | undefined;
    },
    hasCompanionFlag(key: string): boolean {
      return flags[`companions.${key}`] !== undefined;
    },
  };
}
