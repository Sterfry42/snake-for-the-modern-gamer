export type CookingRecipeId = 'cook-meat' | 'cook-fish';

export interface CookingRecipe {
  id: CookingRecipeId;
  input: string;
  output: string;
  outputCount: number;
}

export const COOKING_RECIPES: readonly CookingRecipe[] = [
  {
    id: 'cook-meat',
    input: 'raw-meat',
    output: 'cooked-meat',
    outputCount: 1,
  },
  {
    id: 'cook-fish',
    input: 'fish-meat',
    output: 'cooked-fish',
    outputCount: 1,
  },
];

export function findCookingRecipe(inputItemId: string): CookingRecipe | undefined {
  return COOKING_RECIPES.find((recipe) => recipe.input === inputItemId);
}
