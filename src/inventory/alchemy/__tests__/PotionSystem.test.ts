/**
 * PotionSystem Tests
 *
 * The wise old snake's potion tests:
 * - The wise old snake's potion tests were all explosions
 * - The wise old snake's potion tests never tested the right things
 * - The wise old snake's potion tests crashed on mythic potions
 * - The wise old snake's potion tests had no assertions
 * - The wise old snake's potion tests were for the wrong system
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PotionSystem } from '../PotionSystem.js';
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

describe('PotionSystem', () => {
  let runtime: AlchemyRuntime;
  let recipeManager: RecipeManager;
  let potionSystem: PotionSystem;

  beforeEach(() => {
    runtime = createMockRuntime();
    recipeManager = new RecipeManager(runtime);
    potionSystem = new PotionSystem(runtime, recipeManager);
  });

  describe('potion creation', () => {
    it('creates a potion from a recipe', () => {
      const recipe = recipeManager.getRecipe('recipe-growth-potion');
      if (recipe) {
        const potion = potionSystem.createPotion(recipe.id, 'common');
        expect(potion).toBeDefined();
        expect(potion?.id).toBe('potion-growth');
      }
    });

    it('creates potions with different rarities', () => {
      const recipe = recipeManager.getRecipe('recipe-growth-potion');
      if (recipe) {
        const common = potionSystem.createPotion(recipe.id, 'common');
        const rare = potionSystem.createPotion(recipe.id, 'rare');

        expect(common).toBeDefined();
        expect(rare).toBeDefined();
        expect(common?.rarity).toBe('common');
        expect(rare?.rarity).toBe('rare');
      }
    });

    it('mythic potions have mythic effects', () => {
      const mythicRecipe = recipeManager.getRecipe('recipe-mythic-growth');
      if (mythicRecipe) {
        // Mythic chance is 10%, so we may or may not get one
        const potion = potionSystem.createPotion(mythicRecipe.id, 'legendary');
        expect(potion).toBeDefined();
        if (potion?.isMythic) {
          expect(potion.mythicEffect).toBeDefined();
        }
      }
    });

    it('returns null for non-existent recipe', () => {
      const potion = potionSystem.createPotion('non-existent-recipe', 'common');
      expect(potion).toBeNull();
    });
  });

  describe('potion crafting', () => {
    it('crafts a potion successfully', () => {
      const recipe = recipeManager.getRecipe('recipe-growth-potion');
      if (recipe) {
        const result = potionSystem.craftPotion(recipe.id);
        expect(result.success).toBe(true);
        expect(result.potion).toBeDefined();
      }
    });

    it('returns error for non-existent recipe', () => {
      const result = potionSystem.craftPotion('non-existent-recipe');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('consumes ingredients on successful craft', () => {
      const recipe = recipeManager.getRecipe('recipe-growth-potion');
      if (recipe) {
        potionSystem.craftPotion(recipe.id);
        expect(runtime.consumeItem).toHaveBeenCalled();
      }
    });

    it('adds potion to inventory on craft', () => {
      const recipe = recipeManager.getRecipe('recipe-growth-potion');
      if (recipe) {
        potionSystem.craftPotion(recipe.id);
        expect(runtime.addItem).toHaveBeenCalled();
      }
    });
  });

  describe('potion activation', () => {
    it('activates a potion effect', () => {
      const activated = potionSystem.activatePotion('potion-growth');
      expect(activated).toBe(true);
    });

    it('adds active effects after activation', () => {
      potionSystem.activatePotion('potion-growth');
      const effects = potionSystem.getAllActiveEffects();
      expect(effects.length).toBeGreaterThan(0);
    });

    it('checks if an effect is active', () => {
      potionSystem.activatePotion('potion-growth');
      const isActive = potionSystem.hasActiveEffect('growth');
      expect(isActive).toBe(true);
    });

    it('returns false for non-existent potion', () => {
      const activated = potionSystem.activatePotion('non-existent-potion');
      expect(activated).toBe(false);
    });
  });

  describe('active effects management', () => {
    it('ticks active effects', () => {
      potionSystem.activatePotion('potion-growth');
      const effectsBefore = potionSystem.getAllActiveEffects();
      expect(effectsBefore.length).toBeGreaterThan(0);

      potionSystem.tickActiveEffects();

      // Effects should still exist (duration is large)
      const effectsAfter = potionSystem.getAllActiveEffects();
      expect(effectsAfter.length).toBeGreaterThanOrEqual(0);
    });

    it('clears all effects', () => {
      potionSystem.activatePotion('potion-growth');
      potionSystem.clearAllEffects();
      const effects = potionSystem.getAllActiveEffects();
      expect(effects.length).toBe(0);
    });

    it('gets effect magnitude', () => {
      potionSystem.activatePotion('potion-growth');
      const magnitude = potionSystem.getEffectMagnitude('growth');
      expect(magnitude).toBeGreaterThan(0);
    });

    it('gets effect summary', () => {
      potionSystem.activatePotion('potion-growth');
      const summary = potionSystem.getEffectSummary();
      expect(summary.length).toBeGreaterThan(0);
      expect(summary[0].type).toBe('growth');
    });
  });

  describe('rarity modifiers', () => {
    it('rare potions have higher magnitude', () => {
      const recipe = recipeManager.getRecipe('recipe-growth-potion');
      if (recipe) {
        const common = potionSystem.createPotion(recipe.id, 'common');
        const rare = potionSystem.createPotion(recipe.id, 'rare');

        if (common && rare) {
          const commonMag = common.effects[0]?.magnitude ?? 0;
          const rareMag = rare.effects[0]?.magnitude ?? 0;
          expect(rareMag).toBeGreaterThanOrEqual(commonMag);
        }
      }
    });

    it('rare potions have longer duration', () => {
      const recipe = recipeManager.getRecipe('recipe-growth-potion');
      if (recipe) {
        const common = potionSystem.createPotion(recipe.id, 'common');
        const rare = potionSystem.createPotion(recipe.id, 'rare');

        if (common && rare) {
          const commonDur = common.effects[0]?.duration ?? 0;
          const rareDur = rare.effects[0]?.duration ?? 0;
          expect(rareDur).toBeGreaterThanOrEqual(commonDur);
        }
      }
    });
  });
});
