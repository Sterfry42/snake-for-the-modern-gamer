import type { BiomeId } from '../world/biomes.js';
import type { CatchEntry, FishRarity, FishTypeId } from './types.js';

const CATCH_JOURNAL_FLAG = 'fishing.catchJournal';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function roundWeight(weight: number): number {
  return Math.round(weight * 100) / 100;
}

/**
 * In-memory journal used during gameplay.
 * Synced with the game's save flags via snakeScene.
 */
let entries: CatchEntry[] = [];

/**
 * Optional persistence callback — set by snakeScene during game init
 * to sync journal state with the game's save system.
 */
type PersistenceCallback = {
  get: () => CatchEntry[];
  set: (newEntries: CatchEntry[]) => void;
};
let persistence: PersistenceCallback | null = null;

function getEntries(): CatchEntry[] {
  if (persistence) {
    // Use the persistence layer
    const stored = persistence.get();
    // Merge in-memory changes that haven't been persisted yet
    return [...stored];
  }
  return entries;
}

/**
 * Initialize the journal from saved flag data.
 * Call this when loading a saved game.
 */
export function loadJournal(savedData: unknown): void {
  if (Array.isArray(savedData)) {
    entries = savedData as CatchEntry[];
  } else {
    entries = [];
  }
}

/**
 * Save the journal to the persistence layer.
 * Call this after appending a new entry.
 */
export function saveJournal(): void {
  if (persistence) {
    persistence.set(entries);
  }
}

/**
 * Register a persistence callback for game-save integration.
 * This is called once during game load to sync the journal
 * with the game's save system.
 */
export function setPersistence(cb: PersistenceCallback): void {
  persistence = cb;
  if (cb) {
    const stored = cb.get();
    if (Array.isArray(stored)) {
      entries = stored;
    }
  }
}

/**
 * CatchJournalService — provides read/write/append helpers for the fishing catch journal.
 *
 * In production code, callers should use the QuestRuntime getFlag/setFlag methods.
 * These functions are the core implementation; wrappers in snakeScene.ts delegate to runtime.
 */
export const catchJournal = {
  /**
   * Append a new catch entry to the journal.
   */
  appendCatchEntry(typeId: FishTypeId, biomeId: BiomeId, rarity: FishRarity, weight: number): void {
    entries.push({
      id: generateId(),
      typeId,
      biomeId,
      rarity,
      weight: roundWeight(weight),
      timestamp: Date.now(),
    });
    // Immediately persist
    saveJournal();
  },

  /**
   * Get all entries from the journal.
   */
  getEntries(): CatchEntry[] {
    return getEntries();
  },

  /**
   * Count entries for a specific biome.
   */
  countByBiome(biomeId: BiomeId): number {
    return getEntries().filter((e) => e.biomeId === biomeId).length;
  },

  /**
   * Count entries for a specific rarity tier.
   */
  countByRarity(rarity: FishRarity): number {
    return getEntries().filter((e) => e.rarity === rarity).length;
  },

  /**
   * Count entries for a specific fish type.
   */
  countByTypeId(typeId: FishTypeId): number {
    return getEntries().filter((e) => e.typeId === typeId).length;
  },

  /**
   * Check whether the journal contains unique catches from at least `count` different biomes.
   */
  hasUniqueBiomes(count: number): boolean {
    const biomes = new Set(getEntries().map((e) => e.biomeId));
    return biomes.size >= count;
  },

  /**
   * Get the set of unique biome IDs in the journal.
   */
  getUniqueBiomes(): Set<string> {
    return new Set(getEntries().map((e) => e.biomeId));
  },

  /**
   * Get the set of unique fish type IDs in the journal.
   */
  getUniqueTypeIds(): Set<string> {
    return new Set(getEntries().map((e) => e.typeId));
  },

  /**
   * Clear all entries (useful for testing).
   */
  clear(): void {
    entries = [];
    saveJournal();
  },
};
