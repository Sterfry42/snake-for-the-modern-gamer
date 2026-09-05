import { isSolidTile } from '../world/tiles.js';
import type { RoomSnapshot } from '../world/types.js';
import {
  getAlchemyRecipe,
  getAlchemyRecipeForScroll,
  isAlchemyItemDefined,
} from './alchemyCatalog.js';
import { createActiveStatusEffect, getPotionEffectDefinition } from './potionEffects.js';
import type {
  ActiveStatusEffect,
  AlchemyInventoryRuntime,
  AlchemyState,
  AlchemyStationContext,
  BrewResult,
  DeployStationResult,
  LearnRecipeResult,
  PackStationResult,
  PlacedAlchemyStation,
  PotionUseResult,
} from './alchemyTypes.js';

export const ALCHEMY_STATE_FLAG = 'alchemy.state';
export const ALCHEMY_STATION_ITEM_ID = 'alchemy-station';

export function createDefaultAlchemyState(): AlchemyState {
  return {
    knownRecipes: [],
    activeEffects: [],
  };
}

export function normalizeAlchemyState(value: unknown): AlchemyState {
  if (!value || typeof value !== 'object') {
    return createDefaultAlchemyState();
  }
  const raw = value as Partial<AlchemyState>;
  const knownRecipes = Array.isArray(raw.knownRecipes)
    ? [...new Set(raw.knownRecipes.filter((id): id is string => typeof id === 'string'))]
    : [];
  const activeEffects = Array.isArray(raw.activeEffects)
    ? raw.activeEffects
        .filter((effect): effect is ActiveStatusEffect => {
          return (
            effect !== null &&
            typeof effect === 'object' &&
            typeof effect.id === 'string' &&
            typeof effect.remainingTicks === 'number' &&
            effect.remainingTicks > 0
          );
        })
        .map((effect) => ({
          id: effect.id,
          remainingTicks: Math.max(0, Math.floor(effect.remainingTicks)),
          magnitude: typeof effect.magnitude === 'number' ? effect.magnitude : undefined,
        }))
    : [];
  const placedStation =
    raw.placedStation &&
    typeof raw.placedStation.id === 'string' &&
    typeof raw.placedStation.roomId === 'string' &&
    raw.placedStation.position &&
    typeof raw.placedStation.position.x === 'number' &&
    typeof raw.placedStation.position.y === 'number'
      ? {
          id: raw.placedStation.id,
          roomId: raw.placedStation.roomId,
          position: {
            x: Math.floor(raw.placedStation.position.x),
            y: Math.floor(raw.placedStation.position.y),
          },
        }
      : undefined;

  return {
    knownRecipes,
    activeEffects,
    placedStation,
  };
}

export function knowsAlchemyRecipe(state: AlchemyState, recipeId: string): boolean {
  return state.knownRecipes.includes(recipeId);
}

export function learnAlchemyRecipeFromScroll(
  state: AlchemyState,
  runtime: AlchemyInventoryRuntime,
  scrollItemId: string,
): LearnRecipeResult {
  if (runtime.inventory.getItemCount(scrollItemId) <= 0) {
    return { ok: false, reason: 'missing-scroll' };
  }
  const recipe = getAlchemyRecipeForScroll(scrollItemId);
  if (!recipe) {
    const isScroll = scrollItemId.startsWith('recipe-scroll-');
    return { ok: false, reason: isScroll ? 'invalid-scroll' : 'not-a-scroll' };
  }
  if (knowsAlchemyRecipe(state, recipe.id)) {
    return { ok: false, reason: 'already-known' };
  }
  runtime.inventory.removeItem(scrollItemId, 1);
  state.knownRecipes = [...state.knownRecipes, recipe.id];
  return { ok: true, recipeId: recipe.id, scrollItemId };
}

export function brewAlchemyRecipe(
  state: AlchemyState,
  runtime: AlchemyInventoryRuntime,
  recipeId: string,
  stationContext?: AlchemyStationContext | null,
): BrewResult {
  const recipe = getAlchemyRecipe(recipeId);
  if (!recipe || !recipe.released) {
    return { ok: false, reason: 'invalid-recipe' };
  }
  if (!knowsAlchemyRecipe(state, recipeId)) {
    return { ok: false, reason: 'unknown-recipe' };
  }
  if (!isValidStationContext(state, stationContext)) {
    return { ok: false, reason: 'station-required' };
  }
  if (
    !recipe.ingredients.every((req) => runtime.inventory.getItemCount(req.itemId) >= req.quantity)
  ) {
    return { ok: false, reason: 'missing-ingredients' };
  }
  if (runtime.canAddItem && !runtime.canAddItem(recipe.output.itemId, recipe.output.quantity)) {
    return { ok: false, reason: 'inventory-full' };
  }
  for (const req of recipe.ingredients) {
    runtime.inventory.removeItem(req.itemId, req.quantity);
  }
  runtime.inventory.addItem(recipe.output.itemId, recipe.output.quantity);
  return {
    ok: true,
    recipeId,
    outputItemId: recipe.output.itemId,
    quantity: recipe.output.quantity,
  };
}

export function useAlchemyPotion(
  state: AlchemyState,
  runtime: AlchemyInventoryRuntime,
  potionItemId: string,
  applyEffect: (effect: ActiveStatusEffect) => boolean,
): PotionUseResult {
  const definition = getPotionEffectDefinition(potionItemId);
  if (!definition) {
    return { ok: false, reason: 'not-a-potion' };
  }
  if (runtime.inventory.getItemCount(potionItemId) <= 0) {
    return { ok: false, reason: 'missing-potion' };
  }
  const effect = createActiveStatusEffect(definition);
  if (!applyEffect(effect)) {
    return { ok: false, reason: 'application-failed' };
  }
  runtime.inventory.removeItem(potionItemId, 1);
  const others = state.activeEffects.filter((active) => active.id !== effect.id);
  state.activeEffects = [...others, effect];
  return { ok: true, potionItemId, effects: [effect] };
}

export function tickAlchemyEffects(state: AlchemyState): AlchemyState {
  state.activeEffects = state.activeEffects
    .map((effect) => ({ ...effect, remainingTicks: Math.max(0, effect.remainingTicks - 1) }))
    .filter((effect) => effect.remainingTicks > 0);
  return state;
}

export interface StationPlacementContext {
  room: RoomSnapshot;
  target: { x: number; y: number };
  snakeTiles: readonly { x: number; y: number }[];
  occupiedTiles?: readonly { x: number; y: number }[];
  prohibitedRoom?: boolean;
}

export function deployAlchemyStation(
  state: AlchemyState,
  runtime: AlchemyInventoryRuntime,
  context: StationPlacementContext,
): DeployStationResult {
  if (runtime.inventory.getItemCount(ALCHEMY_STATION_ITEM_ID) <= 0) {
    return { ok: false, reason: 'missing-station' };
  }
  if (state.placedStation) {
    return { ok: false, reason: 'already-deployed' };
  }
  if (context.prohibitedRoom || context.room.layer || context.room.cave) {
    return { ok: false, reason: 'prohibited-room' };
  }
  const { x, y } = context.target;
  if (
    y < 0 ||
    y >= context.room.layout.length ||
    x < 0 ||
    x >= (context.room.layout[0]?.length ?? 0)
  ) {
    return { ok: false, reason: 'invalid-bounds' };
  }
  const tile = context.room.layout[y]?.[x];
  if (tile === undefined || isSolidTile(tile)) {
    return { ok: false, reason: 'blocked-tile' };
  }
  if (context.snakeTiles.some((tilePosition) => tilePosition.x === x && tilePosition.y === y)) {
    return { ok: false, reason: 'snake-tile' };
  }
  if (context.occupiedTiles?.some((tilePosition) => tilePosition.x === x && tilePosition.y === y)) {
    return { ok: false, reason: 'occupied-tile' };
  }
  if (
    (context.room.apple && context.room.apple.x === x && context.room.apple.y === y) ||
    context.room.apples?.some((apple) => apple.x === x && apple.y === y) ||
    (context.room.treasure && context.room.treasure.x === x && context.room.treasure.y === y) ||
    (context.room.powerup && context.room.powerup.x === x && context.room.powerup.y === y)
  ) {
    return { ok: false, reason: 'occupied-tile' };
  }
  const station: PlacedAlchemyStation = {
    id: `alchemy-station:${context.room.id}:${x},${y}`,
    roomId: context.room.id,
    position: { x, y },
  };
  runtime.inventory.removeItem(ALCHEMY_STATION_ITEM_ID, 1);
  state.placedStation = station;
  return { ok: true, station };
}

export function packAlchemyStation(
  state: AlchemyState,
  runtime: AlchemyInventoryRuntime,
  stationId: string,
): PackStationResult {
  const station = state.placedStation;
  if (!station || station.id !== stationId) {
    return { ok: false, reason: 'missing-station' };
  }
  state.placedStation = undefined;
  runtime.inventory.addItem(ALCHEMY_STATION_ITEM_ID, 1);
  return { ok: true, station };
}

export function countAlchemyStationsInExistence(
  state: AlchemyState,
  runtime: AlchemyInventoryRuntime,
): number {
  return runtime.inventory.getItemCount(ALCHEMY_STATION_ITEM_ID) + (state.placedStation ? 1 : 0);
}

function isValidStationContext(
  state: AlchemyState,
  stationContext?: AlchemyStationContext | null,
): boolean {
  if (!stationContext || stationContext.kind !== 'alchemy-station') {
    return false;
  }
  if (stationContext.source === 'wizard-house') {
    return true;
  }
  return state.placedStation?.id === stationContext.worldObjectId;
}

export function validateAlchemyCatalogItemRefs(recipeIds: readonly string[]): string[] {
  const missing: string[] = [];
  for (const recipeId of recipeIds) {
    const recipe = getAlchemyRecipe(recipeId);
    if (!recipe) {
      missing.push(`recipe:${recipeId}`);
      continue;
    }
    for (const ingredient of recipe.ingredients) {
      if (!isAlchemyItemDefined(ingredient.itemId)) {
        missing.push(`ingredient:${ingredient.itemId}`);
      }
    }
    if (!isAlchemyItemDefined(recipe.output.itemId)) {
      missing.push(`output:${recipe.output.itemId}`);
    }
  }
  return missing;
}
