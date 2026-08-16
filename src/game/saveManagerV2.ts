import type { SaveStore } from '../storage/SaveStore.js';
export type { SaveStore } from '../storage/SaveStore.js';
import { LocalStorageSaveStore } from '../storage/LocalStorageSaveStore.js';
import { isVersionLessThan, migrateV1toV2, migrateV2toV3, type GameSaveData } from './saveTypes.js';

const STORAGE_PREFIX = 'snake-save';
const SESSION_KEY_PREFIX = 'sess:';
/** Hard cap: each session keeps only its most recent N saves. */
const MAX_SAVES_PER_SESSION = 5;

export { type GameSaveData } from './saveTypes.js';

export { MAX_SAVES_PER_SESSION };

/** A single save point inside a session. */
export interface SessionSaveEntry {
  /** Epoch ms of when this save was written. */
  timestamp: number;
  data: GameSaveData;
}

/**
 * A save session: one unique game run. A "New Game" starts a brand-new
 * session; loading any save reuses the session that save belongs to.
 * The wise old snake keeps every session's last five apples, no more.
 */
export interface SessionRecord {
  sessionId: string;
  /** Epoch ms when the session (game run) was created. */
  createdAt: number;
  /** Most recent up to {@link MAX_SAVES_PER_SESSION} saves, chronological. */
  saves: SessionSaveEntry[];
}

/** Summary of a session for list display. */
export interface SessionInfo {
  sessionId: string;
  createdAt: number;
  /** Epoch ms of the newest save in the session. */
  lastSavedAt: number;
  saveCount: number;
  seed?: string;
}

export class SaveManagerV2 {
  private readonly store: SaveStore<SessionRecord>;
  private readonly VERSION = '3.0.0';
  private readonly knownSessions = new Set<string>();
  private legacyMigrationDone = false;

  constructor(storageFactory?: (prefix: string) => SaveStore<SessionRecord>) {
    if (storageFactory) {
      this.store = storageFactory(STORAGE_PREFIX);
    } else {
      this.store = new LocalStorageSaveStore<SessionRecord>(STORAGE_PREFIX);
    }
    this.discoverSessions();
  }

  /**
   * Generate a fresh, unique session ID for a new game run.
   * The wise old snake says every session deserves its own name.
   */
  createSessionId(): string {
    const random = Math.random().toString(36).slice(2, 10);
    return `s-${Date.now().toString(36)}-${random}`;
  }

  /**
   * Append a save to a session, creating the session on first write.
   * Keeps only the most recent {@link MAX_SAVES_PER_SESSION} saves.
   */
  async appendSave(sessionId: string, data: GameSaveData): Promise<void> {
    const existing = await this.getSession(sessionId);
    const record: SessionRecord = existing
      ? {
          sessionId,
          createdAt: existing.createdAt,
          saves: [...existing.saves],
        }
      : { sessionId, createdAt: Date.now(), saves: [] };
    this.migrate(data);
    record.saves.push({ timestamp: Date.now(), data });
    record.saves.sort((a, b) => a.timestamp - b.timestamp);
    if (record.saves.length > MAX_SAVES_PER_SESSION) {
      record.saves = record.saves.slice(record.saves.length - MAX_SAVES_PER_SESSION);
    }
    this.knownSessions.add(sessionId);
    await this.store.save(this.sessionKey(sessionId), record);
  }

  /**
   * All sessions, most recently saved first.
   * Legacy flat slots (pre-session saves) are folded into one-off sessions.
   */
  async listSessions(): Promise<SessionInfo[]> {
    await this.migrateLegacySlots();
    const infos: SessionInfo[] = [];
    for (const sessionId of this.knownSessions) {
      const record = await this.getSession(sessionId);
      if (!record || record.saves.length === 0) continue;
      const newest = record.saves[record.saves.length - 1];
      infos.push({
        sessionId,
        createdAt: record.createdAt,
        lastSavedAt: newest.timestamp,
        saveCount: record.saves.length,
        seed: newest.data.worldGeneration?.seed,
      });
    }
    infos.sort(
      (a, b) =>
        b.lastSavedAt - a.lastSavedAt ||
        b.createdAt - a.createdAt ||
        a.sessionId.localeCompare(b.sessionId),
    );
    return infos;
  }

  /** Full record for a session, or null if it does not exist. */
  async getSession(sessionId: string): Promise<SessionRecord | null> {
    const raw = await this.store.load(this.sessionKey(sessionId));
    if (!raw) return null;
    for (const entry of raw.saves ?? []) {
      this.migrate(entry.data);
    }
    return {
      sessionId: raw.sessionId ?? sessionId,
      createdAt: raw.createdAt ?? Date.now(),
      saves: [...(raw.saves ?? [])].sort((a, b) => a.timestamp - b.timestamp),
    };
  }

  /** The session's saves in chronological order (oldest first), up to 5. */
  async listSessionSaves(sessionId: string): Promise<SessionSaveEntry[]> {
    const record = await this.getSession(sessionId);
    return record
      ? record.saves.map(
          (entry): SessionSaveEntry => ({ timestamp: entry.timestamp, data: { ...entry.data } }),
        )
      : [];
  }

  /** Load a specific save point from a session by its save timestamp. */
  async loadSave(sessionId: string, timestamp: number): Promise<GameSaveData | null> {
    const record = await this.getSession(sessionId);
    if (!record) return null;
    const entry = record.saves.find((save) => save.timestamp === timestamp);
    if (!entry) return null;
    return entry.data;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.knownSessions.delete(sessionId);
    await this.store.clear(this.sessionKey(sessionId));
  }

  async deleteSave(sessionId: string, timestamp: number): Promise<void> {
    const record = await this.getSession(sessionId);
    if (!record) return;
    record.saves = record.saves.filter((entry) => entry.timestamp !== timestamp);
    this.knownSessions.add(sessionId);
    await this.store.save(this.sessionKey(sessionId), record);
  }

  /** Human-friendly label for a session in the load menu. */
  getSessionLabel(info: SessionInfo): string {
    let label = `Started ${this.formatTimestamp(info.createdAt)}`;
    if (info.seed && info.seed !== 'default-world') {
      label += `\nSeed: ${info.seed}`;
    }
    label += `\nLast saved ${this.formatTimestamp(info.lastSavedAt)} · ${info.saveCount}/${MAX_SAVES_PER_SESSION} saves`;
    return label;
  }

  /** Human-friendly label for a save point inside a session. */
  getSaveLabel(timestamp: number, score: number): string {
    return `${this.formatTimestamp(timestamp)} · Score ${score}`;
  }

  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  /**
   * Fold pre-session flat slots (date-keyed saves, old autosaves) into
   * standalone sessions so old players do not lose their save games.
   * The wise old snake hoarded every old slot in a secret room; now
   * each one gets its own proper shelf.
   */
  private async migrateLegacySlots(): Promise<void> {
    if (this.legacyMigrationDone) return;
    this.legacyMigrationDone = true;
    try {
      const storage = typeof localStorage === 'undefined' ? null : localStorage;
      if (!storage) return;
      const prefix = `${STORAGE_PREFIX}:`;
      const legacySlotIds: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(prefix) && !key.startsWith(`${prefix}${SESSION_KEY_PREFIX}`)) {
          legacySlotIds.push(key.substring(prefix.length));
        }
      }
      for (const slotId of legacySlotIds) {
        try {
          const raw = storage.getItem(`${prefix}${slotId}`);
          if (!raw) continue;
          const data = JSON.parse(raw) as GameSaveData;
          if (!data || typeof data !== 'object') continue;
          this.migrate(data);
          const sessionId = `legacy-${encodeURIComponent(slotId)}`;
          const timestamp = data.timestamp ?? Date.now();
          this.knownSessions.add(sessionId);
          await this.store.save(this.sessionKey(sessionId), {
            sessionId,
            createdAt: timestamp,
            saves: [{ timestamp, data }],
          });
          storage.removeItem(`${prefix}${slotId}`);
        } catch (err) {
          console.warn('[SaveManagerV2] Failed to migrate legacy save slot:', slotId, err);
        }
      }
    } catch (err) {
      console.warn('[SaveManagerV2] Failed to scan for legacy saves:', err);
    }
  }

  private discoverSessions(): void {
    try {
      const storage = typeof localStorage === 'undefined' ? null : localStorage;
      if (!storage) return;
      const prefix = `${STORAGE_PREFIX}:${SESSION_KEY_PREFIX}`;
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(prefix)) {
          this.knownSessions.add(key.substring(prefix.length));
        }
      }
    } catch (err) {
      console.warn('[SaveManagerV2] Failed to discover sessions from localStorage:', err);
    }
  }

  private sessionKey(sessionId: string): string {
    return `${SESSION_KEY_PREFIX}${sessionId}`;
  }

  private migrate(data: GameSaveData): GameSaveData {
    if (data.version !== this.VERSION) {
      const currentVersion = data.version ?? '0.0.0';
      if (isVersionLessThan(currentVersion, '2.0.0')) {
        migrateV1toV2(data);
      }
      if (isVersionLessThan(currentVersion, '3.0.0')) {
        migrateV2toV3(data);
      }
    }
    return data;
  }
}

export const saveManagerV2 = new SaveManagerV2();
