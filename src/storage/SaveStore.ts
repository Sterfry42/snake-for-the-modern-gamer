/**
 * Save Store
 */
export interface SaveStore<TSaveData> {
  load(slotId: string): Promise<TSaveData | null>;
  save(slotId: string, data: TSaveData): Promise<void>;
  clear(slotId: string): Promise<void>;
  has(slotId: string): Promise<boolean>;
}
