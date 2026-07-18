import type { AchievementState } from './achievementTypes.js';

export const ACHIEVEMENT_STORAGE_KEY = 'snake.achievements.v1';

export interface AchievementStorage {
  load(): AchievementState;
  save(state: AchievementState): void;
}

export function createDefaultAchievementState(): AchievementState {
  return {
    version: 1,
    completed: {},
    progress: {},
    discoveredBiomes: [],
    apSubmitted: {},
    run: { consumedItemIds: [], waterTilesSwum: 0, mutationCount: 0, traitCount: 0 },
  };
}

export function normalizeAchievementState(raw: unknown): AchievementState {
  if (!raw || typeof raw !== 'object' || (raw as { version?: unknown }).version !== 1) {
    return createDefaultAchievementState();
  }
  const value = raw as Partial<AchievementState>;
  return {
    version: 1,
    completed: value.completed && typeof value.completed === 'object' ? value.completed : {},
    progress: value.progress && typeof value.progress === 'object' ? value.progress : {},
    discoveredBiomes: Array.isArray(value.discoveredBiomes)
      ? [...new Set(value.discoveredBiomes.filter((id): id is string => typeof id === 'string'))]
      : [],
    apSubmitted:
      value.apSubmitted && typeof value.apSubmitted === 'object' ? value.apSubmitted : {},
    run: {
      consumedItemIds: Array.isArray(value.run?.consumedItemIds)
        ? [
            ...new Set(
              value.run.consumedItemIds.filter((id): id is string => typeof id === 'string'),
            ),
          ]
        : [],
      waterTilesSwum: Math.max(0, Math.floor(Number(value.run?.waterTilesSwum) || 0)),
      mutationCount: Math.max(0, Math.floor(Number(value.run?.mutationCount) || 0)),
      traitCount: Math.max(0, Math.floor(Number(value.run?.traitCount) || 0)),
    },
  };
}

export class BrowserAchievementStorage implements AchievementStorage {
  load(): AchievementState {
    try {
      const storage = globalThis.localStorage;
      return storage
        ? normalizeAchievementState(JSON.parse(storage.getItem(ACHIEVEMENT_STORAGE_KEY) ?? 'null'))
        : createDefaultAchievementState();
    } catch {
      return createDefaultAchievementState();
    }
  }

  save(state: AchievementState): void {
    try {
      globalThis.localStorage?.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable in tests, privacy modes, or embedded browsers.
    }
  }
}

export class MemoryAchievementStorage implements AchievementStorage {
  constructor(private state: AchievementState = createDefaultAchievementState()) {}
  load(): AchievementState {
    return structuredClone(this.state);
  }
  save(state: AchievementState): void {
    this.state = structuredClone(state);
  }
}
