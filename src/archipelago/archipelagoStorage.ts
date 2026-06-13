import type { ArchipelagoConnectionConfig } from './archipelagoConnectionTypes.js';

const CONNECTION_STORAGE_KEY = 'snake.ap.connection';
const RUN_STORAGE_PREFIX = 'snake.ap.run';

export interface ArchipelagoStoredConnection {
  serverUrl: string;
  slotName: string;
}

export interface ArchipelagoRunSaveData {
  serverUrl: string;
  slotName: string;
  seedName?: string;
  team?: number;
  slot?: number;
  checkedLocationIds: number[];
  lastReceivedItemIndex: number;
  completedGoal: boolean;
}

function getStorage(): Storage | null {
  try {
    return typeof globalThis !== 'undefined' ? (globalThis.localStorage ?? null) : null;
  } catch {
    return null;
  }
}

function normalizeRunPart(value: string | number | undefined): string {
  return encodeURIComponent(
    String(value ?? 'unknown')
      .trim()
      .toLowerCase(),
  );
}

export function getArchipelagoRunStorageKey(input: {
  serverUrl: string;
  slotName: string;
  seedName?: string;
}): string {
  return [
    RUN_STORAGE_PREFIX,
    normalizeRunPart(input.serverUrl),
    normalizeRunPart(input.slotName),
    normalizeRunPart(input.seedName),
  ].join('.');
}

export class BrowserArchipelagoStorage {
  loadConnection(): ArchipelagoStoredConnection {
    const fallback = { serverUrl: 'ws://localhost:38281', slotName: 'Player' };
    const storage = getStorage();
    if (!storage) return fallback;
    try {
      const parsed = JSON.parse(
        storage.getItem(CONNECTION_STORAGE_KEY) ?? 'null',
      ) as Partial<ArchipelagoStoredConnection> | null;
      return {
        serverUrl:
          typeof parsed?.serverUrl === 'string' && parsed.serverUrl.trim()
            ? parsed.serverUrl.trim()
            : fallback.serverUrl,
        slotName:
          typeof parsed?.slotName === 'string' && parsed.slotName.trim()
            ? parsed.slotName.trim()
            : fallback.slotName,
      };
    } catch {
      return fallback;
    }
  }

  saveConnection(config: ArchipelagoConnectionConfig): void {
    const storage = getStorage();
    if (!storage) return;
    try {
      const stored: ArchipelagoStoredConnection = {
        serverUrl: config.serverUrl.trim(),
        slotName: config.slotName.trim(),
      };
      storage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      console.info('[Archipelago] Connection fields could not be persisted locally.');
    }
  }

  loadRun(input: {
    serverUrl: string;
    slotName: string;
    seedName?: string;
    team?: number;
    slot?: number;
  }): ArchipelagoRunSaveData {
    const fallback: ArchipelagoRunSaveData = {
      serverUrl: input.serverUrl,
      slotName: input.slotName,
      seedName: input.seedName,
      team: input.team,
      slot: input.slot,
      checkedLocationIds: [],
      lastReceivedItemIndex: -1,
      completedGoal: false,
    };
    const storage = getStorage();
    if (!storage) return fallback;
    try {
      const parsed = JSON.parse(
        storage.getItem(getArchipelagoRunStorageKey(input)) ?? 'null',
      ) as Partial<ArchipelagoRunSaveData> | null;
      if (!parsed) return fallback;
      return {
        ...fallback,
        checkedLocationIds: Array.isArray(parsed.checkedLocationIds)
          ? parsed.checkedLocationIds.filter((id): id is number => Number.isInteger(id))
          : [],
        lastReceivedItemIndex: Number.isInteger(parsed.lastReceivedItemIndex)
          ? Number(parsed.lastReceivedItemIndex)
          : -1,
        completedGoal: parsed.completedGoal === true,
      };
    } catch {
      return fallback;
    }
  }

  saveRun(data: ArchipelagoRunSaveData): void {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(getArchipelagoRunStorageKey(data), JSON.stringify(data));
    } catch {
      console.info('[Archipelago] Run sync state could not be persisted locally.');
    }
  }
}
