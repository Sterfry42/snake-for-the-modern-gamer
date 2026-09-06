import { LocalStorageStringSaveStore } from '../storage/LocalStorageStringSaveStore.js';

const SAVE_KEY = 'snakeGameSave';
const DEFAULT_SAVE_SLOT = '';
const saveStore = new LocalStorageStringSaveStore(SAVE_KEY);

export { type ChoiceWithMods, type GameSaveData } from './saveTypes.js';

/**
 * Legacy single-slot storage helpers.
 *
 * New saves are owned by SaveManagerV2. These remain only for the handful of
 * SnakeGame callers that still need to be migrated away from the old slot.
 */
export function getSavedGameData(): string | null {
  return saveStore.load(DEFAULT_SAVE_SLOT);
}

export function setSavedGameData(data: string): void {
  saveStore.save(DEFAULT_SAVE_SLOT, data);
}

export function clearSavedGameData(): void {
  saveStore.clear(DEFAULT_SAVE_SLOT);
}
