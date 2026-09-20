export type AlchemyRecipeTier = 'basic' | 'advanced' | 'mythic';

export interface AlchemyIngredientRequirement {
  itemId: string;
  quantity: number;
}

export interface AlchemyRecipe {
  id: string;
  name: string;
  ingredients: readonly AlchemyIngredientRequirement[];
  output: {
    itemId: string;
    quantity: number;
  };
  recipeScrollItemId?: string;
  tier: AlchemyRecipeTier;
  released: boolean;
  allowSelfOutput?: boolean;
}

export type AlchemyStationContext =
  | {
      kind: 'alchemy-station';
      source: 'wizard-bench';
      roomId: string;
      position: { x: number; y: number };
    }
  | { kind: 'alchemy-station'; source: 'placed'; worldObjectId: string };

export interface ActiveStatusEffect {
  id: string;
  remainingTicks: number;
  magnitude?: number;
}

export interface PlacedAlchemyStation {
  id: string;
  roomId: string;
  position: { x: number; y: number };
}

export interface AlchemyState {
  knownRecipes: string[];
  activeEffects: ActiveStatusEffect[];
  placedStation?: PlacedAlchemyStation;
}

export type LearnRecipeResult =
  | { ok: true; recipeId: string; scrollItemId: string }
  | { ok: false; reason: 'not-a-scroll' | 'already-known' | 'invalid-scroll' | 'missing-scroll' };

export type BrewResult =
  | { ok: true; recipeId: string; outputItemId: string; quantity: number }
  | {
      ok: false;
      reason:
        | 'unknown-recipe'
        | 'station-required'
        | 'missing-ingredients'
        | 'inventory-full'
        | 'invalid-recipe';
    };

export type PotionUseResult =
  | { ok: true; potionItemId: string; effects: ActiveStatusEffect[] }
  | { ok: false; reason: 'not-a-potion' | 'missing-potion' | 'application-failed' };

export type DeployStationResult =
  | { ok: true; station: PlacedAlchemyStation }
  | {
      ok: false;
      reason:
        | 'missing-station'
        | 'already-deployed'
        | 'invalid-bounds'
        | 'blocked-tile'
        | 'occupied-tile'
        | 'snake-tile'
        | 'prohibited-room';
    };

export type PackStationResult =
  | { ok: true; station: PlacedAlchemyStation }
  | { ok: false; reason: 'missing-station' };

export interface AlchemyInventoryRuntime {
  inventory: {
    addItem(itemId: string, count?: number): void;
    removeItem(itemId: string, count?: number): boolean;
    getItemCount(itemId: string): number;
  };
  canAddItem?: (itemId: string, quantity: number) => boolean;
  isStationContextValid?: (stationContext: AlchemyStationContext) => boolean;
}
