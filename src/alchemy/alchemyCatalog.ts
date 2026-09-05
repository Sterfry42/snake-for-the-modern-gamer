import { getItem } from '../inventory/itemRegistry.js';
import type { AlchemyRecipe } from './alchemyTypes.js';

export const ALCHEMY_RECIPE_IDS = [
  'growth',
  'phase',
  'shield',
  'speed',
  'magnet',
  'size-shrink',
] as const;

export type AlchemyRecipeId = (typeof ALCHEMY_RECIPE_IDS)[number];

export const ALCHEMY_RECIPES: readonly AlchemyRecipe[] = [
  {
    id: 'growth',
    name: 'Growth Potion',
    ingredients: [
      { itemId: 'ingredient-yuzu-apple', quantity: 2 },
      { itemId: 'ingredient-honey', quantity: 1 },
      { itemId: 'ingredient-dew', quantity: 1 },
    ],
    output: { itemId: 'potion-growth', quantity: 1 },
    recipeScrollItemId: 'recipe-scroll-growth',
    tier: 'basic',
    released: true,
  },
  {
    id: 'phase',
    name: 'Phase Potion',
    ingredients: [
      { itemId: 'ingredient-pearl-apple', quantity: 1 },
      { itemId: 'ingredient-quartz', quantity: 1 },
      { itemId: 'ingredient-dew', quantity: 1 },
    ],
    output: { itemId: 'potion-phase', quantity: 1 },
    recipeScrollItemId: 'recipe-scroll-phase',
    tier: 'basic',
    released: true,
  },
  {
    id: 'shield',
    name: 'Shield Potion',
    ingredients: [
      { itemId: 'ingredient-pearl-apple', quantity: 1 },
      { itemId: 'ingredient-meteor-iron', quantity: 1 },
      { itemId: 'ingredient-dew', quantity: 1 },
    ],
    output: { itemId: 'potion-shield', quantity: 1 },
    recipeScrollItemId: 'recipe-scroll-shield',
    tier: 'basic',
    released: true,
  },
  {
    id: 'speed',
    name: 'Swiftstride Elixir',
    ingredients: [
      { itemId: 'ingredient-skittish-apple', quantity: 1 },
      { itemId: 'ingredient-eagle-feather', quantity: 1 },
      { itemId: 'ingredient-dew', quantity: 1 },
    ],
    output: { itemId: 'potion-speed-boost', quantity: 1 },
    recipeScrollItemId: 'recipe-scroll-speed',
    tier: 'advanced',
    released: true,
  },
  {
    id: 'magnet',
    name: 'Apple Magnet',
    ingredients: [
      { itemId: 'ingredient-gold-apple', quantity: 1 },
      { itemId: 'ingredient-quartz', quantity: 1 },
      { itemId: 'ingredient-dew', quantity: 1 },
    ],
    output: { itemId: 'potion-magnet', quantity: 1 },
    recipeScrollItemId: 'recipe-scroll-magnet',
    tier: 'advanced',
    released: true,
  },
  {
    id: 'size-shrink',
    name: 'Pip Squeeze',
    ingredients: [
      { itemId: 'ingredient-mochi-apple', quantity: 2 },
      { itemId: 'ingredient-nightshade', quantity: 1 },
      { itemId: 'ingredient-dew', quantity: 1 },
    ],
    output: { itemId: 'potion-size-shrink', quantity: 1 },
    tier: 'advanced',
    released: true,
  },
];

const RECIPE_BY_ID = new Map(ALCHEMY_RECIPES.map((recipe) => [recipe.id, recipe]));

export function getAlchemyRecipe(recipeId: string): AlchemyRecipe | undefined {
  return RECIPE_BY_ID.get(recipeId);
}

export function getAlchemyRecipeForScroll(scrollItemId: string): AlchemyRecipe | undefined {
  return ALCHEMY_RECIPES.find((recipe) => recipe.recipeScrollItemId === scrollItemId);
}

export function getReleasedAlchemyRecipes(): readonly AlchemyRecipe[] {
  return ALCHEMY_RECIPES.filter((recipe) => recipe.released);
}

export function isAlchemyItemDefined(itemId: string): boolean {
  return getItem(itemId) !== undefined;
}
