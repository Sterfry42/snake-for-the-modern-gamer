import type { SaveStore } from './SaveStore.js';
import { safeLocalStorage } from './localStorage.js';

export class LocalStorageQuotaExceededError extends Error {
  constructor(
    message: string,
    readonly key: string,
    readonly attemptedChars: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LocalStorageQuotaExceededError';
  }
}

export class LocalStorageSaveStore<TSaveData> implements SaveStore<TSaveData> {
  constructor(private readonly keyPrefix: string) {}

  async load(slotId: string): Promise<TSaveData | null> {
    const raw = this.getStorage()?.getItem(this.keyFor(slotId)) ?? null;
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TSaveData;
    } catch {
      console.warn(`[LocalStorageSaveStore] Failed to parse save for slot "${slotId}"`);
      return null;
    }
  }

  async save(slotId: string, data: TSaveData): Promise<void> {
    const storage = this.getStorage();
    if (!storage) return;
    const key = this.keyFor(slotId);
    const serialized = JSON.stringify(data);
    try {
      storage.setItem(key, serialized);
    } catch (error) {
      if (isQuotaExceededError(error)) {
        throw new LocalStorageQuotaExceededError(
          `localStorage quota exceeded while saving "${slotId}" (${serialized.length} chars)`,
          key,
          serialized.length,
          error,
        );
      }
      throw error;
    }
  }

  async clear(slotId: string): Promise<void> {
    this.getStorage()?.removeItem(this.keyFor(slotId));
  }

  async has(slotId: string): Promise<boolean> {
    return this.getStorage()?.getItem(this.keyFor(slotId)) !== null;
  }

  private keyFor(slotId: string): string {
    return `${this.keyPrefix}:${slotId}`;
  }

  private getStorage(): Storage | null {
    return safeLocalStorage();
  }
}

function isQuotaExceededError(error: unknown): boolean {
  if (!(error instanceof DOMException)) {
    return false;
  }
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
}
