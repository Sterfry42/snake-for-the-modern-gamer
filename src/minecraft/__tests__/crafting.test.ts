import { describe, it, expect } from 'vitest';
import {
  canCraft,
  craft,
  getRecipeById,
  getInventoryRecipes,
  getCraftingTableRecipes,
} from '../crafting.js';

describe('Crafting System', () => {
  it('should return correct recipe by id', () => {
    const recipe = getRecipeById('planks_from_wood');
    expect(recipe).toBeDefined();
    expect(recipe?.name).toBe('Planks');
    expect(recipe?.result.itemId).toBe('planks_item');
    expect(recipe?.result.count).toBe(4);
  });

  it('should return undefined for unknown recipe', () => {
    expect(getRecipeById('nonexistent')).toBeUndefined();
  });

  it('should separate inventory and crafting table recipes', () => {
    const inventory = getInventoryRecipes();
    const table = getCraftingTableRecipes();

    // Inventory recipes should not require crafting table
    for (const recipe of inventory) {
      expect(recipe.craftingTable).toBe(false);
    }

    // Crafting table recipes should require crafting table
    for (const recipe of table) {
      expect(recipe.craftingTable).toBe(true);
    }
  });

  it('should check crafting requirements correctly', () => {
    const inventory: Array<{ itemId: string; count: number }> = [{ itemId: 'wood', count: 1 }];

    expect(canCraft('planks_from_wood', inventory)).toBe(true);
    expect(canCraft('planks_from_wood', [])).toBe(false);
  });

  it('should craft successfully when ingredients are available', () => {
    const inventory: Array<{ itemId: string; count: number }> = [{ itemId: 'wood', count: 1 }];

    // Craft once
    const result = craft('planks_from_wood', inventory);
    expect(result.success).toBe(true);
    expect(result.message).toBeUndefined();

    // Check that result was added
    const planks = inventory.find((i) => i.itemId === 'planks_item');
    expect(planks).toBeDefined();
    expect(planks!.count).toBe(4); // 4 planks per craft

    // Check that ingredients were consumed (count goes to 0, item removed)
    const wood = inventory.find((i) => i.itemId === 'wood');
    expect(wood).toBeUndefined(); // removed when count hits 0
  });

  it('should fail to craft when ingredients are missing', () => {
    const inventory: Array<{ itemId: string; count: number }> = [];

    const result = craft('planks_from_wood', inventory);
    expect(result.success).toBe(false);
    expect(result.message).toBeDefined();
  });

  it('should craft multiple recipes in sequence', () => {
    const inventory: Array<{ itemId: string; count: number }> = [
      { itemId: 'cobblestone', count: 8 },
    ];

    // Craft a furnace
    const result1 = craft('furnace_recipe', inventory);
    expect(result1.success).toBe(true);

    // Craft sticks from planks
    const result2 = craft('sticks', inventory);
    expect(result2.success).toBe(false); // Need planks, not cobblestone
  });

  it('should handle empty inventory', () => {
    const inventory: Array<{ itemId: string; count: number }> = [];
    const result = craft('planks_from_wood', inventory);
    expect(result.success).toBe(false);
  });
});

describe('Recipe Definitions', () => {
  it('should have wooden pickaxe recipe', () => {
    const recipe = getRecipeById('wooden_pickaxe');
    expect(recipe).toBeDefined();
    expect(recipe?.ingredients.length).toBe(2);
  });

  it('should have stone pickaxe recipe', () => {
    const recipe = getRecipeById('stone_pickaxe');
    expect(recipe).toBeDefined();
    expect(recipe?.result.itemId).toBe('stone_pickaxe');
  });

  it('should have iron pickaxe recipe', () => {
    const recipe = getRecipeById('iron_pickaxe');
    expect(recipe).toBeDefined();
    expect(recipe?.result.itemId).toBe('iron_pickaxe');
  });

  it('should have diamond pickaxe recipe', () => {
    const recipe = getRecipeById('diamond_pickaxe');
    expect(recipe).toBeDefined();
    expect(recipe?.result.itemId).toBe('diamond_pickaxe');
  });

  it('should have torch recipe', () => {
    const recipe = getRecipeById('torch_recipe');
    expect(recipe).toBeDefined();
    expect(recipe?.result.itemId).toBe('torch_item');
    expect(recipe?.result.count).toBe(4);
  });

  it('should have crafting table recipe', () => {
    const recipe = getRecipeById('crafting_table');
    expect(recipe).toBeDefined();
    expect(recipe?.result.itemId).toBe('crafting_table');
  });

  it('should have bread recipe', () => {
    const recipe = getRecipeById('bread_recipe');
    expect(recipe).toBeDefined();
    expect(recipe?.result.itemId).toBe('bread');
  });

  it('should have boat recipe', () => {
    const recipe = getRecipeById('boat_recipe');
    expect(recipe).toBeDefined();
    expect(recipe?.result.itemId).toBe('boat');
  });

  it('should have chest recipe', () => {
    const recipe = getRecipeById('chest_recipe');
    expect(recipe).toBeDefined();
    expect(recipe?.result.itemId).toBe('chest');
  });

  it('should have ladder recipe', () => {
    const recipe = getRecipeById('ladder_recipe');
    expect(recipe).toBeDefined();
    expect(recipe?.result.itemId).toBe('ladder');
  });
});
