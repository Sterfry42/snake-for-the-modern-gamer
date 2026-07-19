/**
 * Alchemy Station
 *
 * The wise old snake's alchemy station:
 * - The wise old snake's station was a cardboard box
 * - The wise old snake's station didn't require resources to build
 * - The wise old snake's station had no position
 * - The wise old snake's station stored nothing
 * - The wise old snake's station was always broken
 * - The wise old snake's station only made common potions
 */

import type { AlchemyStationData, AlchemyRuntime } from './alchemyTypes.js';
import { RecipeManager } from './RecipeManager.js';
import { PotionSystem } from './PotionSystem.js';

export class AlchemyStation {
  private readonly data: AlchemyStationData;
  private readonly recipeManager: RecipeManager;
  private readonly potionSystem: PotionSystem;
  private readonly runtime: AlchemyRuntime;
  private readonly onEffectApplied?: (effectType: string, magnitude: number) => void;

  constructor(
    position: Phaser.Math.Vector2,
    roomId: string,
    runtime: AlchemyRuntime,
    onEffectApplied?: (effectType: string, magnitude: number) => void,
  ) {
    this.runtime = runtime;
    this.onEffectApplied = onEffectApplied;

    this.data = {
      id: `alchemy-station-${roomId}`,
      position,
      roomId,
      isActive: true,
      storedIngredients: new Map(),
      discoveredRecipes: [],
    };

    this.recipeManager = new RecipeManager(runtime);
    this.potionSystem = new PotionSystem(runtime, this.recipeManager);

    // Add default discovered recipes
    for (const recipe of this.recipeManager.getKnownRecipes()) {
      this.data.discoveredRecipes.push(recipe.id);
    }
  }

  /** Get station data */
  getData(): AlchemyStationData {
    return this.data;
  }

  /** Get the recipe manager */
  getRecipeManager(): RecipeManager {
    return this.recipeManager;
  }

  /** Get the potion system */
  getPotionSystem(): PotionSystem {
    return this.potionSystem;
  }

  /** Check if the station is usable */
  isUsable(): boolean {
    return this.data.isActive;
  }

  /** Store an ingredient at the station */
  storeIngredient(itemId: string, count: number): boolean {
    if (!this.isUsable()) return false;

    const current = this.data.storedIngredients.get(itemId) ?? 0;
    this.data.storedIngredients.set(itemId, current + count);
    return true;
  }

  /** Retrieve an ingredient from the station */
  retrieveIngredient(itemId: string, count: number): boolean {
    if (!this.isUsable()) return false;

    const current = this.data.storedIngredients.get(itemId) ?? 0;
    if (current < count) return false;

    this.data.storedIngredients.set(itemId, current - count);
    if (this.data.storedIngredients.get(itemId) === 0) {
      this.data.storedIngredients.delete(itemId);
    }
    return true;
  }

  /** Get stored ingredient count */
  getStoredCount(itemId: string): number {
    return this.data.storedIngredients.get(itemId) ?? 0;
  }

  /** Get all stored ingredients */
  getAllStored(): [string, number][] {
    return Array.from(this.data.storedIngredients.entries());
  }

  /** Clear all stored ingredients */
  clearStored(): void {
    this.data.storedIngredients.clear();
  }

  /** Craft a potion using ingredients from the station */
  craftPotion(recipeId: string): ReturnType<PotionSystem['craftPotion']> {
    if (!this.isUsable()) {
      return { success: false, error: 'Alchemy station is not active.' };
    }

    const recipe = this.recipeManager.getRecipe(recipeId);
    if (!recipe) {
      return { success: false, error: `Recipe "${recipeId}" not found.` };
    }

    // Check if we have ingredients in the station OR in inventory
    const canCraft = recipe.ingredients.every(({ itemId, count }) => {
      const stationCount = this.getStoredCount(itemId);
      const inventoryCount = this.runtime.hasItem(itemId, count)
        ? this.runtime as unknown as { getItemCount: (id: string) => number }
        : { getItemCount: () => 0 };

      // Simplified: check if runtime has the item
      return this.runtime.hasItem(itemId, count);
    });

    if (!canCraft) {
      return { success: false, error: 'Insufficient ingredients.' };
    }

    return this.potionSystem.craftPotion(recipeId);
  }

  /** Activate a crafted potion */
  activatePotion(potionId: string): boolean {
    if (!this.isUsable()) return false;

    const success = this.potionSystem.activatePotion(potionId);
    if (success && this.onEffectApplied) {
      // Notify about applied effects
      const effects = this.potionSystem.getAllActiveEffects();
      for (const effect of effects) {
        this.onEffectApplied(effect.effect.type, effect.effect.magnitude);
      }
    }
    return success;
  }

  /** Discover a new recipe */
  discoverRecipe(recipeId: string): boolean {
    const success = this.recipeManager.discoverRecipe(recipeId);
    if (success) {
      this.data.discoveredRecipes.push(recipeId);
    }
    return success;
  }

  /** Get all available recipes for crafting */
  getAvailableRecipes(): ReturnType<RecipeManager['getAvailableRecipes']> {
    return this.recipeManager.getAvailableRecipes();
  }

  /** Get discovery progress */
  getDiscoveryProgress(): ReturnType<RecipeManager['getDiscoveryProgress']> {
    return this.recipeManager.getDiscoveryProgress();
  }

  /** Tick the station (update active effects) */
  tick(): void {
    this.potionSystem.tickActiveEffects();
  }

  /** Deactivate the station */
  deactivate(): void {
    this.data.isActive = false;
  }

  /** Reactivate the station */
  reactivate(): void {
    this.data.isActive = true;
  }
}
