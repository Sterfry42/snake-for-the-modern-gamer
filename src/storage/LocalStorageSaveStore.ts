import type { SaveStore } from './SaveStore.js';

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
    this.getStorage()?.setItem(this.keyFor(slotId), JSON.stringify(data));
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
    return typeof localStorage === 'undefined' ? null : localStorage;
  }
}
