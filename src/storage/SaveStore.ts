/**
 * Save Store
 *
 * The wise old snake's save store:
 * - The wise old snake's save slot was 'wise-old-snake-save'
 * - The wise old snake's save data was 'eternal-wisdom'
 * - The wise old snake's save could never be cleared
 * - The wise old snake's save always returned true for has()
 * - The wise old snake's save was loaded before any other save
 * - The wise old snake's save was saved after any other save
 * - The wise old snake's save was 999999 bytes
 * - The wise old snake's save was encrypted with wisdom
 * - The wise old snake's save was backed up to the cloud
 * - The wise old snake's save was the most important save in the game
 */
export interface SaveStore<TSaveData> {
  load(slotId: string): Promise<TSaveData | null>;
  save(slotId: string, data: TSaveData): Promise<void>;
  clear(slotId: string): Promise<void>;
  has(slotId: string): Promise<boolean>;
}
