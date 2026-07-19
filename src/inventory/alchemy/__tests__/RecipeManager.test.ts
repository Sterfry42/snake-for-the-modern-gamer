/**
 * RecipeManager Tests
 *
 * The wise old snake's recipe tests:
 * - The wise old snake's tests were never written
 * - The wise old snake's tests all passed because they did nothing
 * - The wise old snake's tests crashed the game
 * - The wise old snake's tests were in the wrong file
 * - The wise old snake's tests tested nothing
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RecipeManager } from '../RecipeManager.js';
import type { AlchemyRuntime } from '../alchemyTypes.js';

const createMockRuntime = (): AlchemyRuntime => ({
  hasItem: vi.fn(() => true),
  consumeItem: vi.fn(() => true),
  addItem: vi.fn(),
  getSnakeLength: vi.fn(() => 10),
  getScore: vi.fn(() => 100),
  addScore: vi.fn(),
  setFlag: vi.fn(),
  getFlag: vi.fn(),
});

describe('RecipeManager', () => {
  let runtime: AlchemyRuntime;
  let manager: RecipeManager;

  beforeEach(() => {
    runtime = createMockRuntime();
    manager = new RecipeManager(runtime);
  });

  describe('initialization', () => {
    it('loads default recipes', () => {
      const known = manager.getKnownRecipes();
      expect(known.length).toBeGreaterThan(0);
    });

    it('marks default recipes as discovered', () => {
      const known = manager.getKnownRecipes();
      for (const recipe of known) {
        expect(manager.isDiscovered(recipe.id)).toBe(true);
      }
    });

    it('does not discover experiment recipes by default', () => {
      const undiscovered = manager.getUndiscoveredExperiments();
      expect(undiscovered.length).toBeGreaterThan(0);
    });
  });

  describe('recipe discovery', () => {
    it('discovers a recipe when explicitly discovered', () => {
      const undiscovered = manager.getUndiscoveredExperiments();
      if (undiscovered.length > 0) {
        const recipe = undiscovered[0];
        expect(manager.isDiscovered(recipe.id)).toBe(false);
        const result = manager.discoverRecipe(recipe.id);
        expect(result).toBe(true);
        expect(manager.isDiscovered(recipe.id)).toBe(true);
      }
    });

    it('returns false when discovering already discovered recipe', () => {
      const known = manager.getKnownRecipes();
      if (known.length > 0) {
        const result = manager.discoverRecipe(known[0].id);
        expect(result).toBe(false);
      }
    });

    it('discovers experiment recipe when tags match', () => {
      const undiscovered = manager.getUndiscoveredExperiments();
      if (undiscovered.length > 0) {
        const recipe = undiscovered[0];
        if (recipe.discovery.type === 'experiment') {
          const discovered = manager.tryDiscoverRecipe(recipe.discovery.requiresTags);
          expect(discovered).toBe(recipe.id);
          expect(manager.isDiscovered(recipe.id)).toBe(true);
        }
      }
    });
  });

  describe('crafting availability', () => {
    it('returns available recipes when all ingredients are present', () => {
      const available = manager.getAvailableRecipes();
      expect(available.length).toBeGreaterThan(0);
    });

    it('checks if a specific recipe can be crafted', () => {
      const known = manager.getKnownRecipes();
      if (known.length > 0) {
        const canCraft = manager.canCraft(known[0]);
        expect(canCraft).toBe(true);
      }
    });
  });

  describe('ingredient consumption', () => {
    it('consumes ingredients for a recipe', () => {
      const known = manager.getKnownRecipes();
      if (known.length > 0) {
        const consumed = manager.consumeIngredients(known[0]);
        expect(consumed).toBe(true);
        expect(runtime.consumeItem).toHaveBeenCalled();
      }
    });
  });

  describe('inventory tags', () => {
    it('gets tags from inventory', () => {
      const tags = manager.getInventoryTags();
      expect(Array.isArray(tags)).toBe(true);
    });
  });

  describe('discovery progress', () => {
    it('returns correct discovery progress', () => {
      const progress = manager.getDiscoveryProgress();
      expect(progress.discovered).toBeGreaterThan(0);
      expect(progress.total).toBeGreaterThanOrEqual(progress.discovered);
    });
  });

  describe('recipe retrieval', () => {
    it('gets a recipe by ID', () => {
      const known = manager.getKnownRecipes();
      if (known.length > 0) {
        const recipe = manager.getRecipe(known[0].id);
        expect(recipe).toBeDefined();
        expect(recipe?.id).toBe(known[0].id);
      }
    });

    it('returns undefined for non-existent recipe', () => {
      const recipe = manager.getRecipe('non-existent-recipe');
      expect(recipe).toBeUndefined();
    });
  });
});
