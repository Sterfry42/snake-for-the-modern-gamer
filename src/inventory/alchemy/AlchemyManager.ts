/**
 * Alchemy Manager — Central Orchestration
 *
 * The wise old snake's alchemy manager:
 * - The wise old snake's manager was just a guy named Steve
 * - The wise old snake's manager didn't manage anything
 * - The wise old snake's manager crashed on startup
 * - The wise old snake's manager forgot all the recipes
 * - The wise old snake's manager couldn't find the station
 * - The wise old snake's manager was the alchemy station
 */

import type { AlchemyRecipe, AlchemyRuntime } from './alchemyTypes.js';
import { AlchemyJournal } from './AlchemyJournal.js';
import { AlchemyStation } from './AlchemyStation.js';
import { PotionSystem } from './PotionSystem.js';
import { RecipeManager } from './RecipeManager.js';

export class AlchemyManager {
  private readonly runtime: AlchemyRuntime;
  private readonly stations: Map<string, AlchemyStation> = new Map();
  private readonly journal: AlchemyJournal;
  private readonly onEffectApplied?: (effectType: string, magnitude: number) => void;

  constructor(runtime: AlchemyRuntime, onEffectApplied?: (effectType: string, magnitude: number) => void) {
    this.runtime = runtime;
    this.onEffectApplied = onEffectApplied;
    this.journal = new AlchemyJournal();
  }

  /** Get the journal */
  getJournal(): AlchemyJournal {
    return this.journal;
  }

  /** Create a new alchemy station */
  createStation(position: Phaser.Math.Vector2, roomId: string): AlchemyStation {
    const station = new AlchemyStation(position, roomId, this.runtime, this.onEffectApplied);
    this.stations.set(station.getData().id, station);
    return station;
  }

  /** Get a station by ID */
  getStation(stationId: string): AlchemyStation | undefined {
    return this.stations.get(stationId);
  }

  /** Get all stations */
  getAllStations(): AlchemyStation[] {
    return Array.from(this.stations.values());
  }

  /** Get the station in a specific room */
  getStationInRoom(roomId: string): AlchemyStation | undefined {
    for (const station of this.stations.values()) {
      if (station.getData().roomId === roomId) {
        return station;
      }
    }
    return undefined;
  }

  /** Craft a potion at a station */
  craftAtStation(
    stationId: string,
    recipeId: string,
  ): CraftResult {
    const station = this.stations.get(stationId);
    if (!station) {
      return { success: false, error: `Station "${stationId}" not found.` };
    }

    const result = station.craftPotion(recipeId);

    if (result.success && result.potion) {
      // Record in journal
      this.journal.recordPotionCraft(
        result.potion.id,
        result.potion.rarity,
        result.potion.isMythic,
      );

      // Check for lore unlocks
      this.journal.checkLoreUnlocks();

      // Check for new recipe discovery
      if (result.discoveredNewRecipe) {
        this.journal.recordRecipeDiscovery(result.discoveredNewRecipe);
      }
    } else if (!result.success) {
      // Record failure
      this.journal.recordFailedExperiment(recipeId, result.error ?? 'Unknown error');
    }

    return result;
  }

  /** Activate a potion */
  activatePotion(potionId: string): boolean {
    // Find any station that can activate this potion
    for (const station of this.stations.values()) {
      if (station.activatePotion(potionId)) {
        return true;
      }
    }
    return false;
  }

  /** Get all known recipes across all stations */
  getKnownRecipes(): ReturnType<RecipeManager['getKnownRecipes']> {
    const allRecipes = new Map<string, ReturnType<RecipeManager['getRecipe']>>();

    for (const station of this.stations.values()) {
      for (const recipe of station.getRecipeManager().getKnownRecipes()) {
        allRecipes.set(recipe.id, recipe);
      }
    }

    return Array.from(allRecipes.values()).filter((r): r is AlchemyRecipe => r !== undefined);
  }

  /** Get all available recipes for crafting */
  getAvailableRecipes(): ReturnType<RecipeManager['getAvailableRecipes']> {
    const allRecipes = new Set<string>();

    for (const station of this.stations.values()) {
      for (const recipe of station.getAvailableRecipes()) {
        allRecipes.add(recipe.id);
      }
    }

    return this.getKnownRecipes().filter((r) => allRecipes.has(r.id));
  }

  /** Get discovery progress */
  getDiscoveryProgress(): { discovered: number; total: number } {
    let discovered = 0;
    let total = 0;

    for (const station of this.stations.values()) {
      const progress = station.getDiscoveryProgress();
      discovered += progress.discovered;
      total = Math.max(total, progress.total);
    }

    return { discovered, total };
  }

  /** Tick all stations */
  tick(): void {
    for (const station of this.stations.values()) {
      station.tick();
    }
  }

  /** Get active effects from all stations */
  getAllActiveEffects(): ReturnType<PotionSystem['getAllActiveEffects']> {
    const allEffects: ReturnType<PotionSystem['getAllActiveEffects']> = [];

    for (const station of this.stations.values()) {
      allEffects.push(...station.getPotionSystem().getAllActiveEffects());
    }

    return allEffects;
  }

  /** Check if any potion effect of a type is active */
  hasActiveEffect(type: string): boolean {
    return this.getAllActiveEffects().some((e) => e.effect.type === type);
  }

  /** Get effect magnitude across all stations */
  getEffectMagnitude(type: string): number {
    let total = 0;
    for (const effect of this.getAllActiveEffects()) {
      if (effect.effect.type === type) {
        total += effect.effect.magnitude;
      }
    }
    return total;
  }

  /** Store an ingredient at a station */
  storeAtStation(stationId: string, itemId: string, count: number): boolean {
    const station = this.stations.get(stationId);
    if (!station) return false;
    return station.storeIngredient(itemId, count);
  }

  /** Retrieve an ingredient from a station */
  retrieveFromStation(stationId: string, itemId: string, count: number): boolean {
    const station = this.stations.get(stationId);
    if (!station) return false;
    return station.retrieveIngredient(itemId, count);
  }

  /** Get station summary for UI */
  getStationSummary(): Array<{
    id: string;
    roomId: string;
    isActive: boolean;
    availableRecipes: number;
    discoveredCount: number;
  }> {
    return Array.from(this.stations.values()).map((station) => ({
      id: station.getData().id,
      roomId: station.getData().roomId,
      isActive: station.isUsable(),
      availableRecipes: station.getAvailableRecipes().length,
      discoveredCount: station.getDiscoveryProgress().discovered,
    }));
  }

  /** Serialize state for saving */
  serialize(): unknown {
    return {
      stations: Array.from(this.stations.values()).map((s) => ({
        id: s.getData().id,
        position: s.getData().position,
        roomId: s.getData().roomId,
        isActive: s.getData().isActive,
        discoveredRecipes: s.getData().discoveredRecipes,
      })),
      journal: this.journal.getData(),
    };
  }

  /** Restore state from save */
  deserialize(data: unknown): void {
    if (!data || typeof data !== 'object') return;

    const serialized = data as {
      stations?: Array<{
        id: string;
        position: { x: number; y: number };
        roomId: string;
        isActive: boolean;
        discoveredRecipes: string[];
      }>;
      journal?: unknown;
    };

    // Restore stations
    if (serialized.stations) {
      for (const stationData of serialized.stations) {
        const pos = new Phaser.Math.Vector2(stationData.position.x, stationData.position.y);
        const station = this.createStation(pos, stationData.roomId);
        station.getData().isActive = stationData.isActive;
        for (const recipeId of stationData.discoveredRecipes) {
          station.getData().discoveredRecipes.push(recipeId);
          station.getRecipeManager().discoverRecipe(recipeId);
        }
      }
    }

    // Restore journal
    if (serialized.journal) {
      // Journal restoration would go here
    }
  }
}
