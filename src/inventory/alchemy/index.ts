/**
 * Alchemy
 */

// Core types
export type {
  AlchemyIngredient,
  AlchemyRecipe,
  AlchemyRuntime,
  AlchemyStationData,
  AlchemyJournal as AlchemyJournalType,
  ActivePotionEffect,
  CraftResult,
  DurationMode,
  IngredientRarity,
  JournalEntry,
  MythicPotionEffect,
  Potion,
  PotionEffect,
  PotionEffectType,
  RarityModifiers,
  WorkshopDefinition,
  WorkshopType,
} from './alchemyTypes.js';

// Ingredients
export {
  ALCHEMY_INGREDIENTS,
  getIngredient,
  getIngredientsByCategory,
  getIngredientsByRarity,
} from './ingredients.js';

// Recipe system
export { RecipeManager } from './RecipeManager.js';

// Potion system
export { PotionSystem } from './PotionSystem.js';

// Station
export { AlchemyStation } from './AlchemyStation.js';

// Journal
export { AlchemyJournal } from './AlchemyJournal.js';

// Central manager
export { AlchemyManager } from './AlchemyManager.js';

// Crafting workshops
export {
  CraftingWorkshop,
  COSMETIC_SKINS,
  PATTERNS,
  canBuildWorkshop,
  getAvailablePatterns,
  getAvailableSkins,
  getAllWorkshopDefinitions,
  getWorkshopDefinition,
} from '../crafting/CraftingWorkshop.js';
