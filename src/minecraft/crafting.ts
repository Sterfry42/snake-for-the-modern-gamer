import type { CraftingRecipe, CraftResult } from './types.js';

export const RECIPES: readonly CraftingRecipe[] = [
  // Tools
  {
    id: 'wooden_pickaxe',
    name: 'Wooden Pickaxe',
    result: { itemId: 'wooden_pickaxe', count: 1 },
    ingredients: [
      { itemId: 'planks_item', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    craftingTable: true,
  },
  {
    id: 'stone_pickaxe',
    name: 'Stone Pickaxe',
    result: { itemId: 'stone_pickaxe', count: 1 },
    ingredients: [
      { itemId: 'cobblestone', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    craftingTable: true,
  },
  {
    id: 'iron_pickaxe',
    name: 'Iron Pickaxe',
    result: { itemId: 'iron_pickaxe', count: 1 },
    ingredients: [
      { itemId: 'iron_ingot', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    craftingTable: true,
  },
  {
    id: 'diamond_pickaxe',
    name: 'Diamond Pickaxe',
    result: { itemId: 'diamond_pickaxe', count: 1 },
    ingredients: [
      { itemId: 'diamond', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    craftingTable: true,
  },
  {
    id: 'wooden_sword',
    name: 'Wooden Sword',
    result: { itemId: 'wooden_sword', count: 1 },
    ingredients: [
      { itemId: 'planks_item', count: 2 },
      { itemId: 'stick', count: 1 },
    ],
    craftingTable: true,
  },
  {
    id: 'stone_sword',
    name: 'Stone Sword',
    result: { itemId: 'stone_sword', count: 1 },
    ingredients: [
      { itemId: 'cobblestone', count: 2 },
      { itemId: 'stick', count: 1 },
    ],
    craftingTable: true,
  },
  {
    id: 'iron_sword',
    name: 'Iron Sword',
    result: { itemId: 'iron_sword', count: 1 },
    ingredients: [
      { itemId: 'iron_ingot', count: 2 },
      { itemId: 'stick', count: 1 },
    ],
    craftingTable: true,
  },
  {
    id: 'wooden_axe',
    name: 'Wooden Axe',
    result: { itemId: 'wooden_axe', count: 1 },
    ingredients: [
      { itemId: 'planks_item', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    craftingTable: true,
  },
  {
    id: 'stone_axe',
    name: 'Stone Axe',
    result: { itemId: 'stone_axe', count: 1 },
    ingredients: [
      { itemId: 'cobblestone', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    craftingTable: true,
  },
  {
    id: 'iron_axe',
    name: 'Iron Axe',
    result: { itemId: 'iron_axe', count: 1 },
    ingredients: [
      { itemId: 'iron_ingot', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    craftingTable: true,
  },
  {
    id: 'wooden_shovel',
    name: 'Wooden Shovel',
    result: { itemId: 'wooden_shovel', count: 1 },
    ingredients: [
      { itemId: 'planks_item', count: 1 },
      { itemId: 'stick', count: 2 },
    ],
    craftingTable: true,
  },
  {
    id: 'stone_shovel',
    name: 'Stone Shovel',
    result: { itemId: 'stone_shovel', count: 1 },
    ingredients: [
      { itemId: 'cobblestone', count: 1 },
      { itemId: 'stick', count: 2 },
    ],
    craftingTable: true,
  },
  {
    id: 'iron_shovel',
    name: 'Iron Shovel',
    result: { itemId: 'iron_shovel', count: 1 },
    ingredients: [
      { itemId: 'iron_ingot', count: 1 },
      { itemId: 'stick', count: 2 },
    ],
    craftingTable: true,
  },
  // Materials
  {
    id: 'planks_from_wood',
    name: 'Planks',
    result: { itemId: 'planks_item', count: 4 },
    ingredients: [
      { itemId: 'wood', count: 1 },
    ],
    craftingTable: false,
  },
  {
    id: 'sticks',
    name: 'Sticks',
    result: { itemId: 'stick', count: 4 },
    ingredients: [
      { itemId: 'planks_item', count: 2 },
    ],
    craftingTable: false,
  },
  {
    id: 'torch_recipe',
    name: 'Torches',
    result: { itemId: 'torch_item', count: 4 },
    ingredients: [
      { itemId: 'coal', count: 1 },
      { itemId: 'stick', count: 1 },
    ],
    craftingTable: false,
  },
  {
    id: 'crafting_table',
    name: 'Crafting Table',
    result: { itemId: 'crafting_table', count: 1 },
    ingredients: [
      { itemId: 'planks_item', count: 4 },
    ],
    craftingTable: false,
  },
  {
    id: 'furnace_recipe',
    name: 'Furnace',
    result: { itemId: 'furnace', count: 1 },
    ingredients: [
      { itemId: 'cobblestone', count: 8 },
    ],
    craftingTable: true,
  },
  {
    id: 'bread_recipe',
    name: 'Bread',
    result: { itemId: 'bread', count: 3 },
    ingredients: [
      { itemId: 'wheat', count: 3 },
    ],
    craftingTable: false,
  },
  {
    id: 'bucket_recipe',
    name: 'Bucket',
    result: { itemId: 'bucket', count: 1 },
    ingredients: [
      { itemId: 'iron_ingot', count: 3 },
    ],
    craftingTable: true,
  },
  {
    id: 'boat_recipe',
    name: 'Boat',
    result: { itemId: 'boat', count: 1 },
    ingredients: [
      { itemId: 'planks_item', count: 5 },
    ],
    craftingTable: true,
  },
  {
    id: 'chest_recipe',
    name: 'Chest',
    result: { itemId: 'chest', count: 1 },
    ingredients: [
      { itemId: 'planks_item', count: 8 },
    ],
    craftingTable: true,
  },
  {
    id: 'ladder_recipe',
    name: 'Ladder',
    result: { itemId: 'ladder', count: 3 },
    ingredients: [
      { itemId: 'stick', count: 7 },
    ],
    craftingTable: false,
  },
  {
    id: 'door_recipe',
    name: 'Door',
    result: { itemId: 'door', count: 3 },
    ingredients: [
      { itemId: 'planks_item', count: 3 },
    ],
    craftingTable: false,
  },
  {
    id: 'cooked_beef_recipe',
    name: 'Cooked Beef',
    result: { itemId: 'cooked_beef', count: 1 },
    ingredients: [
      { itemId: 'raw_beef', count: 1 },
    ],
    craftingTable: false,
  },
  {
    id: 'iron_ingot_smelt',
    name: 'Iron Ingot',
    result: { itemId: 'iron_ingot', count: 1 },
    ingredients: [
      { itemId: 'raw_iron', count: 1 },
    ],
    craftingTable: false,
  },
  {
    id: 'gold_ingot_smelt',
    name: 'Gold Ingot',
    result: { itemId: 'gold_ingot', count: 1 },
    ingredients: [
      { itemId: 'raw_gold', count: 1 },
    ],
    craftingTable: false,
  },
];

export function getRecipeById(id: string): CraftingRecipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

export function getInventoryRecipes(): CraftingRecipe[] {
  return RECIPES.filter((r) => !r.craftingTable);
}

export function getCraftingTableRecipes(): CraftingRecipe[] {
  return RECIPES.filter((r) => r.craftingTable);
}

export function canCraft(recipeId: string, playerInventory: Array<{ itemId: string; count: number }>): boolean {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return false;

  for (const ingredient of recipe.ingredients) {
    const have = playerInventory.find((i) => i.itemId === ingredient.itemId);
    const currentCount = have?.count ?? 0;
    if (currentCount < ingredient.count) return false;
  }

  return true;
}

export function craft(
  recipeId: string,
  playerInventory: Array<{ itemId: string; count: number }>,
): { success: boolean; message?: string } {
  const recipe = getRecipeById(recipeId);
  if (!recipe) {
    return { success: false, message: 'Unknown recipe.' };
  }

  // Check ingredients
  const inventoryCopy = playerInventory.map((i) => ({ ...i }));
  for (const ingredient of recipe.ingredients) {
    const idx = inventoryCopy.findIndex((i) => i.itemId === ingredient.itemId);
    if (idx === -1) {
      return { success: false, message: `Need ${ingredient.count} ${ingredient.itemId}.` };
    }
    if (inventoryCopy[idx]!.count < ingredient.count) {
      return { success: false, message: `Need ${ingredient.count} ${ingredient.itemId}.` };
    }
    inventoryCopy[idx]!.count -= ingredient.count;
  }

  // Consume ingredients
  for (let i = inventoryCopy.length - 1; i >= 0; i--) {
    if (inventoryCopy[i]!.count <= 0) {
      playerInventory.splice(i, 1);
    }
  }

  // Add result
  const existing = playerInventory.find((i) => i.itemId === recipe.result.itemId);
  if (existing) {
    existing.count += recipe.result.count;
  } else {
    playerInventory.push({ itemId: recipe.result.itemId, count: recipe.result.count });
  }

  return { success: true };
}
