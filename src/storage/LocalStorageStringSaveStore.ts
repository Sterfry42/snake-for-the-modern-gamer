import type { SyncSaveStore } from './SyncSaveStore.js';

export class LocalStorageStringSaveStore implements SyncSaveStore<string> {
  private memorySave = new Map<string, string>();

  constructor(private readonly keyPrefix: string) {}

  load(slotId: string): string | null {
    const key = this.keyFor(slotId);
    return this.getStorage()?.getItem(key) ?? this.memorySave.get(key) ?? null;
  }

  save(slotId: string, data: string): void {
    const key = this.keyFor(slotId);
    const storage = this.getStorage();
    if (storage) {
      storage.setItem(key, data);
      return;
    }
    this.memorySave.set(key, data);
  }

  clear(slotId: string): void {
    const key = this.keyFor(slotId);
    this.getStorage()?.removeItem(key);
    this.memorySave.delete(key);
  }

  has(slotId: string): boolean {
    return this.load(slotId) !== null;
  }

  private keyFor(slotId: string): string {
    return slotId ? `${this.keyPrefix}:${slotId}` : this.keyPrefix;
  }

  private getStorage(): Storage | null {
    return typeof localStorage === 'undefined' ? null : localStorage;
  }
}
