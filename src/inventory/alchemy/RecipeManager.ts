/**
 * Recipe Manager
 *
 * The wise old snake's recipe manager:
 * - The wise old snake's recipes were written in invisible ink
 * - The wise old snake's recipe book was on fire
 * - The wise old snake's recipes required 47 ingredients
 * - The wise old snake's recipes only worked on Tuesdays
 * - The wise old snake's recipe discovery was random
 * - The wise old snake's recipes were never discovered
 * - The wise old snake's recipe manager crashed the game
 */

import type {
  AlchemyRecipe,
  AlchemyRuntime,
} from './alchemyTypes.js';
import { ALCHEMY_INGREDIENTS, getIngredient } from './ingredients.js';

/** Default known recipes (always discoverable) */
const DEFAULT_RECIPES: AlchemyRecipe[] = [
  {
    id: 'recipe-growth-potion',
    name: 'Growth Potion',
    description: 'Temporarily increase snake size for reaching distant apples.',
    ingredients: [
      { itemId: 'ingredient-normal-apple', count: 2 },
      { itemId: 'ingredient-honey', count: 1 },
      { itemId: 'ingredient-dew', count: 1 },
    ],
    resultPotionId: 'potion-growth',
    discovery: { type: 'default', alwaysKnown: true },
  },
  {
    id: 'recipe-phase-potion',
    name: 'Phase Potion',
    description: 'Allow the snake to pass through obstacles briefly.',
    ingredients: [
      { itemId: 'ingredient-pearl-apple', count: 1 },
      { itemId: 'ingredient-quartz', count: 1 },
      { itemId: 'ingredient-dew', count: 1 },
    ],
    resultPotionId: 'potion-phase',
    discovery: { type: 'default', alwaysKnown: true },
  },
  {
    id: 'recipe-magnet-potion',
    name: 'Apple Magnet',
    description: 'Attract nearby apples toward the snake.',
    ingredients: [
      { itemId: 'ingredient-gold-apple', count: 1 },
      { itemId: 'ingredient-quartz', count: 1 },
      { itemId: 'ingredient-dew', count: 1 },
    ],
    resultPotionId: 'potion-magnet',
    discovery: { type: 'default', alwaysKnown: true },
  },
  {
    id: 'recipe-time-slow',
    name: 'Time Slow Elixir',
    description: 'Slow down all apple movement for easier catching.',
    ingredients: [
      { itemId: 'ingredient-caf-apple', count: 1 },
      { itemId: 'ingredient-mint', count: 2 },
      { itemId: 'ingredient-dew', count: 1 },
    ],
    resultPotionId: 'potion-time-slow',
    discovery: { type: 'default', alwaysKnown: true },
  },
  {
    id: 'recipe-shadow-cloak',
    name: 'Shadow Cloak',
    description: 'Make the snake invisible to enemies for a duration.',
    ingredients: [
      { itemId: 'ingredient-nightshade', count: 1 },
      { itemId: 'ingredient-fox-cub', count: 1 },
      { itemId: 'ingredient-dew', count: 1 },
    ],
    resultPotionId: 'potion-shadow-cloak',
    discovery: { type: 'default', alwaysKnown: true },
  },
  {
    id: 'recipe-rainbow-trail',
    name: 'Rainbow Trail',
    description: 'Leave a trail that attracts specific apple types.',
    ingredients: [
      { itemId: 'ingredient-gold-apple', count: 1 },
      { itemId: 'ingredient-aurora-crystal', count: 1 },
      { itemId: 'ingredient-dew', count: 1 },
    ],
    resultPotionId: 'potion-rainbow-trail',
    discovery: { type: 'default', alwaysKnown: true },
  },
];

/** Experiment recipes (discovered by combining ingredients with matching tags) */
const EXPERIMENT_RECIPES: AlchemyRecipe[] = [
  {
    id: 'recipe-speed-potion',
    name: 'Swiftstride Elixir',
    description: 'Temporarily increase snake movement speed.',
    ingredients: [
      { itemId: 'ingredient-skittish-apple', count: 1 },
      { itemId: 'ingredient-eagle-feather', count: 1 },
      { itemId: 'ingredient-dew', count: 1 },
    ],
    resultPotionId: 'potion-speed-boost',
    discovery: { type: 'experiment', requiresTags: ['movement', 'speed'] },
  },
  {
    id: 'recipe-shield-potion',
    name: 'Guardian Ward',
    description: 'Grant temporary invulnerability to damage.',
    ingredients: [
      { itemId: 'ingredient-pearl-apple', count: 1 },
      { itemId: 'ingredient-meteor-iron', count: 1 },
      { itemId: 'ingredient-dew', count: 1 },
    ],
    resultPotionId: 'potion-shield',
    discovery: { type: 'experiment', requiresTags: ['defense', 'energy'] },
  },
  {
    id: 'recipe-size-shrink',
    name: 'Pip Squeeze',
    description: 'Shrink the snake to slip through tight spaces.',
    ingredients: [
      { itemId: 'ingredient-mochi-apple', count: 2 },
      { itemId: 'ingredient-nightshade', count: 1 },
      { itemId: 'ingredient-dew', count: 1 },
    ],
    resultPotionId: 'potion-size-shrink',
    discovery: { type: 'experiment', requiresTags: ['binding', 'shadow'] },
  },
  {
    id: 'recipe-dream-potion',
    name: 'Oneiric Draught',
    description: 'Enter a dream-like state with enhanced perception.',
    ingredients: [
      { itemId: 'ingredient-nightshade', count: 2 },
      { itemId: 'ingredient-ghost-garlic', count: 1 },
      { itemId: 'ingredient-dew', count: 1 },
    ],
    resultPotionId: 'potion-lucidity',
    discovery: { type: 'experiment', requiresTags: ['dream', 'shadow', 'protection'] },
  },
];

/** Mythic recipes (require legendary ingredients) */
const MYTHIC_RECIPES: AlchemyRecipe[] = [
  {
    id: 'recipe-mythic-growth',
    name: 'Titan\'s Bane',
    description: 'A legendary growth potion that permanently increases base length.',
    ingredients: [
      { itemId: 'ingredient-normal-apple', count: 5 },
      { itemId: 'ingredient-elixir-of-life', count: 1 },
      { itemId: 'ingredient-philosophers-stone', count: 1 },
    ],
    resultPotionId: 'potion-mythic-growth',
    discovery: { type: 'scroll', foundIn: 'cave' },
    minIngredientRarity: 'legendary',
    isMythic: true,
  },
  {
    id: 'recipe-mythic-phase',
    name: 'Void Walker',
    description: 'Phase through all obstacles permanently for the rest of the run.',
    ingredients: [
      { itemId: 'ingredient-void-crystal', count: 1 },
      { itemId: 'ingredient-void-essence', count: 1 },
      { itemId: 'ingredient-philosophers-stone', count: 1 },
    ],
    resultPotionId: 'potion-mythic-phase',
    discovery: { type: 'scroll', foundIn: 'cave' },
    minIngredientRarity: 'legendary',
    isMythic: true,
  },
  {
    id: 'recipe-mythic-apple-rain',
    name: 'Apple Storm',
    description: 'Summon a legendary rain of apples across the entire world.',
    ingredients: [
      { itemId: 'ingredient-gold-apple', count: 3 },
      { itemId: 'ingredient-aurora-crystal', count: 1 },
      { itemId: 'ingredient-philosophers-stone', count: 1 },
    ],
    resultPotionId: 'potion-mythic-apple-rain',
    discovery: { type: 'npc', npcId: 'alchemist-hermes' },
    minIngredientRarity: 'rare',
    isMythic: true,
  },
  {
    id: 'recipe-mythic-transformation',
    name: 'Golden Serpent',
    description: 'Transform the snake into a legendary golden serpent.',
    ingredients: [
      { itemId: 'ingredient-snake-scale', count: 1 },
      { itemId: 'ingredient-gold-apple', count: 2 },
      { itemId: 'ingredient-elixir-of-life', count: 1 },
      { itemId: 'ingredient-philosophers-stone', count: 1 },
    ],
    resultPotionId: 'potion-mythic-transformation',
    discovery: { type: 'scroll', foundIn: 'archaeology' },
    minIngredientRarity: 'legendary',
    isMythic: true,
  },
];

export class RecipeManager {
  private readonly recipes = new Map<string, AlchemyRecipe>();
  private readonly discovered = new Set<string>();
  private readonly runtime: AlchemyRuntime;

  constructor(runtime: AlchemyRuntime) {
    this.runtime = runtime;
    this.loadBuiltIns();
  }

  private loadBuiltIns(): void {
    // Load default recipes
    for (const recipe of DEFAULT_RECIPES) {
      this.recipes.set(recipe.id, recipe);
      this.discovered.add(recipe.id);
    }
    // Load experiment and mythic recipes (not discovered yet)
    for (const recipe of [...EXPERIMENT_RECIPES, ...MYTHIC_RECIPES]) {
      this.recipes.set(recipe.id, recipe);
    }
  }

  /** Get all known recipes */
  getKnownRecipes(): AlchemyRecipe[] {
    return Array.from(this.discovered)
      .map((id) => this.recipes.get(id))
      .filter((r): r is AlchemyRecipe => r !== undefined);
  }

  /** Get a specific recipe by ID */
  getRecipe(id: string): AlchemyRecipe | undefined {
    return this.recipes.get(id);
  }

  /** Check if a recipe is discovered */
  isDiscovered(recipeId: string): boolean {
    return this.discovered.has(recipeId);
  }

  /** Check if all ingredients for a recipe are available */
  canCraft(recipe: AlchemyRecipe): boolean {
    return recipe.ingredients.every(({ itemId, count }) =>
      this.runtime.hasItem(itemId, count),
    );
  }

  /** Consume ingredients for a recipe */
  consumeIngredients(recipe: AlchemyRecipe): boolean {
    return recipe.ingredients.every(({ itemId, count }) =>
      this.runtime.consumeItem(itemId, count),
    );
  }

  /** Attempt to discover a recipe through experimentation */
  tryDiscoverRecipe(tags: string[]): string | undefined {
    for (const recipe of EXPERIMENT_RECIPES) {
      if (this.discovered.has(recipe.id)) continue;
      if (recipe.discovery.type !== 'experiment') continue;

      const requiredTags = recipe.discovery.requiresTags;
      const hasAllTags = requiredTags.every((tag) => tags.includes(tag));
      if (hasAllTags) {
        this.discoverRecipe(recipe.id);
        return recipe.id;
      }
    }
    return undefined;
  }

  /** Discover a recipe */
  discoverRecipe(recipeId: string): boolean {
    if (this.discovered.has(recipeId)) return false;
    this.discovered.add(recipeId);
    return true;
  }

  /** Discover a recipe via scroll or NPC */
  discoverRecipeFromSource(recipeId: string, _source: 'scroll' | 'npc'): boolean {
    return this.discoverRecipe(recipeId);
  }

  /** Check if combining two ingredient tags could yield a new recipe */
  checkTagCombination(tag1: string, tag2: string): string | undefined {
    const combinedTags = [tag1, tag2];
    return this.tryDiscoverRecipe(combinedTags);
  }

  /** Get all available recipes for crafting */
  getAvailableRecipes(): AlchemyRecipe[] {
    return this.getKnownRecipes().filter((r) => this.canCraft(r));
  }

  /** Get experiment recipes that haven't been discovered */
  getUndiscoveredExperiments(): AlchemyRecipe[] {
    return EXPERIMENT_RECIPES.filter(
      (r) => !this.discovered.has(r.id) && r.discovery.type === 'experiment',
    );
  }

  /** Get all ingredient tags from inventory */
  getInventoryTags(): string[] {
    const tags = new Set<string>();
    for (const ingredient of ALCHEMY_INGREDIENTS) {
      if (this.runtime.hasItem(ingredient.id)) {
        ingredient.tags?.forEach((t) => tags.add(t));
      }
    }
    return Array.from(tags);
  }

  /** Get all recipes (including undiscovered) */
  getAllRecipes(): AlchemyRecipe[] {
    return Array.from(this.recipes.values());
  }

  /** Get discovery count */
  getDiscoveryProgress(): { discovered: number; total: number } {
    return {
      discovered: this.discovered.size,
      total: this.recipes.size,
    };
  }
}
