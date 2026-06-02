export interface SyncSaveStore<TSaveData> {
  load(slotId: string): TSaveData | null;
  save(slotId: string, data: TSaveData): void;
  clear(slotId: string): void;
  has(slotId: string): boolean;
}
