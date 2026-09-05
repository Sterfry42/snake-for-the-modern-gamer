import { describe, expect, it } from 'vitest';
import { getItem } from '../../inventory/itemRegistry.js';
import { createHeadlessScenario, HeadlessScenario } from '../../test/headless/headlessScenario.js';
import {
  ensureScenarioActor,
  firstWalkableTile,
  offsetPosition,
} from '../../test/headless/scenarioFixtures.js';
import type { RoomSnapshot } from '../../world/types.js';
import { ALCHEMY_RECIPES, getReleasedAlchemyRecipes } from '../alchemyCatalog.js';
import {
  ALCHEMY_STATION_ITEM_ID,
  brewAlchemyRecipe,
  createDefaultAlchemyState,
  deployAlchemyStation,
  learnAlchemyRecipeFromScroll,
  validateAlchemyCatalogItemRefs,
} from '../alchemySystem.js';
import { POTION_EFFECTS, getAlchemyDerivedStatSource } from '../potionEffects.js';
import type { AlchemyStationContext } from '../alchemyTypes.js';

describe('alchemy headless end-to-end', () => {
  it('player can discover learn brew and drink first potion', () => {
    const scenario = createHeadlessScenario({ seed: 'alchemy-golden-path' });
    scenario.game.setScore(100);
    const wizard = createWizard(scenario);

    const scrollPurchase = scenario.game.purchaseActorShopOffer(wizard.id, 'recipe-scroll-growth');
    expect(scrollPurchase.ok).toBe(true);
    for (const offerId of [
      'ingredient-yuzu-apple',
      'ingredient-yuzu-apple',
      'ingredient-honey',
      'ingredient-dew',
    ]) {
      expect(scenario.game.purchaseActorShopOffer(wizard.id, offerId).ok).toBe(true);
    }

    const learned = scenario.game.useInventoryItem('recipe-scroll-growth');
    expect(learned.ok).toBe(true);
    expect(scenario.game.knowsAlchemyRecipe('growth')).toBe(true);

    const brewed = scenario.game.brewAlchemyRecipe('growth', {
      kind: 'alchemy-station',
      source: 'wizard-house',
    });
    expect(brewed).toEqual({
      ok: true,
      recipeId: 'growth',
      outputItemId: 'potion-growth',
      quantity: 1,
    });
    expect(scenario.game.getInventory().getItemCount('ingredient-yuzu-apple')).toBe(0);
    expect(scenario.game.getInventory().getItemCount('ingredient-honey')).toBe(0);
    expect(scenario.game.getInventory().getItemCount('ingredient-dew')).toBe(0);
    expect(scenario.game.getInventory().getItemCount('potion-growth')).toBe(1);

    const lengthBefore = scenario.game.getSnakeLength();
    const used = scenario.game.useInventoryItem('potion-growth');
    expect(used.ok).toBe(true);
    expect(scenario.game.getInventory().getItemCount('potion-growth')).toBe(0);
    expect(scenario.game.getSnakeLength()).toBeGreaterThan(lengthBefore);
    expect(scenario.game.getFlag('status.alchemyGrowthActive')).toBe(true);

    scenario.game.tickAlchemyStatusEffects(45);
    const midSave = scenario.game.getSaveData();
    const reloaded = HeadlessScenario.fromSave(midSave);
    const activeGrowth = reloaded.game
      .getAlchemyState()
      .activeEffects.find((effect) => effect.id === 'growth');
    expect(activeGrowth?.remainingTicks).toBe(45);

    reloaded.game.tickAlchemyStatusEffects(45);
    expect(reloaded.game.getFlag('status.alchemyGrowthActive')).toBeUndefined();
  });

  it('player can buy deploy use recover and persist an alchemy station', () => {
    const scenario = createHeadlessScenario({ seed: 'alchemy-portable-golden-path' });
    scenario.game.setScore(500);
    const wizard = createWizard(scenario);

    expect(scenario.game.purchaseActorShopOffer(wizard.id, 'alchemy-station').ok).toBe(true);
    expect(scenario.game.getInventory().getItemCount(ALCHEMY_STATION_ITEM_ID)).toBe(1);
    expect(
      scenario.game
        .getActorShopView(wizard.id)
        ?.offers.some((offer) => offer.id === 'alchemy-station'),
    ).toBe(false);

    learnGrowthAndGrantIngredients(scenario, 2);
    const target = offsetPosition(firstWalkableTile(scenario), 4, 0);
    const deployed = scenario.game.deployAlchemyStation(target);
    expect(deployed.ok).toBe(true);
    if (!deployed.ok) return;
    expect(scenario.game.getInventory().getItemCount(ALCHEMY_STATION_ITEM_ID)).toBe(0);
    expect(scenario.game.getAlchemyStationCount()).toBe(1);

    const context: AlchemyStationContext = {
      kind: 'alchemy-station',
      source: 'placed',
      worldObjectId: deployed.station.id,
    };
    expect(scenario.game.brewAlchemyRecipe('growth', context).ok).toBe(true);

    const saved = scenario.game.getSaveData();
    const reloaded = HeadlessScenario.fromSave(saved);
    expect(reloaded.game.getAlchemyStationCount()).toBe(1);
    expect(reloaded.game.getAlchemyState().placedStation).toEqual(deployed.station);
    expect(reloaded.game.brewAlchemyRecipe('growth', context).ok).toBe(true);

    const packed = reloaded.game.packAlchemyStation(deployed.station.id);
    expect(packed.ok).toBe(true);
    expect(reloaded.game.getAlchemyStationCount()).toBe(1);
    expect(reloaded.game.getInventory().getItemCount(ALCHEMY_STATION_ITEM_ID)).toBe(1);
    expect(reloaded.game.getAlchemyState().placedStation).toBeUndefined();
  });

  it('wizard bench brews without portable station and portable station is mechanically equivalent', () => {
    const wizardBench = createHeadlessScenario({ seed: 'alchemy-station-equivalence-a' });
    const portable = createHeadlessScenario({ seed: 'alchemy-station-equivalence-b' });
    learnGrowthAndGrantIngredients(wizardBench, 1);
    learnGrowthAndGrantIngredients(portable, 1);
    portable.game.grantInventoryItem(ALCHEMY_STATION_ITEM_ID, 1);
    const deployed = portable.game.deployAlchemyStation(
      offsetPosition(firstWalkableTile(portable), 4, 0),
    );
    expect(deployed.ok).toBe(true);
    if (!deployed.ok) return;

    const wizardResult = wizardBench.game.brewAlchemyRecipe('growth', {
      kind: 'alchemy-station',
      source: 'wizard-house',
    });
    const portableResult = portable.game.brewAlchemyRecipe('growth', {
      kind: 'alchemy-station',
      source: 'placed',
      worldObjectId: deployed.station.id,
    });

    expect(wizardResult.ok).toBe(true);
    expect(portableResult.ok).toBe(true);
    expect(wizardBench.game.getInventory().getAllItems()).toEqual(
      portable.game.getInventory().getAllItems(),
    );
  });

  it('recipe learning and duplicate scroll behavior is atomic and persistent', () => {
    const scenario = createHeadlessScenario({ seed: 'alchemy-recipes' });
    scenario.game.grantInventoryItem('recipe-scroll-growth', 1);

    expect(scenario.game.learnAlchemyRecipeFromScroll('recipe-scroll-growth')).toMatchObject({
      ok: true,
      recipeId: 'growth',
    });
    expect(scenario.game.getInventory().getItemCount('recipe-scroll-growth')).toBe(0);

    scenario.game.grantInventoryItem('recipe-scroll-growth', 1);
    expect(scenario.game.learnAlchemyRecipeFromScroll('recipe-scroll-growth')).toEqual({
      ok: false,
      reason: 'already-known',
    });
    expect(scenario.game.getInventory().getItemCount('recipe-scroll-growth')).toBe(1);

    scenario.game.grantInventoryItem('recipe-scroll-shadow', 1);
    const stateBeforeInvalidScroll = scenario.game.getAlchemyState();
    const before = structuredClone(scenario.game.getSaveData());
    expect(scenario.game.learnAlchemyRecipeFromScroll('recipe-scroll-shadow')).toEqual({
      ok: false,
      reason: 'invalid-scroll',
    });
    expect(scenario.game.getInventory().getAllItems()).toEqual(Object.entries(before.inventory));
    expect(scenario.game.getAlchemyState()).toEqual(stateBeforeInvalidScroll);

    scenario.game.grantInventoryItem('recipe-scroll-phase', 1);
    expect(scenario.game.learnAlchemyRecipeFromScroll('recipe-scroll-phase').ok).toBe(true);
    const reloaded = HeadlessScenario.fromSave(scenario.game.getSaveData());
    expect(reloaded.game.knowsAlchemyRecipe('growth')).toBe(true);
    expect(reloaded.game.knowsAlchemyRecipe('phase')).toBe(true);
    expect(reloaded.game.knowsAlchemyRecipe('shield')).toBe(false);
  });

  it('brewing failures never partially consume ingredients', () => {
    const state = createDefaultAlchemyState();
    const inventory = new ScenarioInventory();
    inventory.addItem('ingredient-yuzu-apple', 4);
    inventory.addItem('ingredient-honey', 1);
    inventory.addItem('ingredient-dew', 1);

    expect(
      brewAlchemyRecipe(state, { inventory }, 'growth', {
        kind: 'alchemy-station',
        source: 'wizard-house',
      }),
    ).toEqual({
      ok: false,
      reason: 'unknown-recipe',
    });
    expect(Object.fromEntries(inventory.getAllItems())).toEqual({
      'ingredient-yuzu-apple': 4,
      'ingredient-honey': 1,
      'ingredient-dew': 1,
    });

    inventory.addItem('recipe-scroll-growth', 1);
    expect(learnAlchemyRecipeFromScroll(state, { inventory }, 'recipe-scroll-growth').ok).toBe(
      true,
    );
    expect(brewAlchemyRecipe(state, { inventory }, 'growth', null)).toEqual({
      ok: false,
      reason: 'station-required',
    });
    expect(
      brewAlchemyRecipe(state, { inventory }, 'growth', {
        kind: 'alchemy-station',
        source: 'wizard-house',
      }).ok,
    ).toBe(true);
    expect(
      brewAlchemyRecipe(state, { inventory }, 'growth', {
        kind: 'alchemy-station',
        source: 'wizard-house',
      }),
    ).toEqual({
      ok: false,
      reason: 'missing-ingredients',
    });
    expect(Object.fromEntries(inventory.getAllItems())).toEqual({
      'ingredient-yuzu-apple': 2,
      'potion-growth': 1,
    });
  });

  it('station placement rejects invalid targets without duplication', () => {
    const state = createDefaultAlchemyState();
    const inventory = new ScenarioInventory();
    inventory.addItem(ALCHEMY_STATION_ITEM_ID, 1);
    const room: RoomSnapshot = {
      id: '0,0,0',
      layout: ['#####', '#...#', '#...#', '#####'],
      portals: [],
      biomeId: 'elderwood-maze',
      biomeTitle: 'Test Woods',
      backgroundColor: 0x000000,
      wallColor: 0x111111,
      wallOutlineColor: 0x222222,
    };

    for (const target of [
      { x: 0, y: 0 },
      { x: 9, y: 9 },
      { x: 1, y: 1 },
    ]) {
      const result = deployAlchemyStation(
        state,
        { inventory },
        {
          room,
          target,
          snakeTiles: target.x === 1 ? [{ x: 1, y: 1 }] : [],
        },
      );
      expect(result.ok).toBe(false);
      expect(inventory.getItemCount(ALCHEMY_STATION_ITEM_ID)).toBe(1);
      expect(state.placedStation).toBeUndefined();
    }

    const occupied = deployAlchemyStation(
      state,
      { inventory },
      {
        room,
        target: { x: 2, y: 1 },
        snakeTiles: [],
        occupiedTiles: [{ x: 2, y: 1 }],
      },
    );
    expect(occupied).toEqual({ ok: false, reason: 'occupied-tile' });
    expect(inventory.getItemCount(ALCHEMY_STATION_ITEM_ID)).toBe(1);
  });

  it('catalog integrity catches broken alchemy data', () => {
    expect(validateAlchemyCatalogItemRefs(ALCHEMY_RECIPES.map((recipe) => recipe.id))).toEqual([]);
    expect(new Set(ALCHEMY_RECIPES.map((recipe) => recipe.id)).size).toBe(ALCHEMY_RECIPES.length);
    const scrolls = ALCHEMY_RECIPES.flatMap((recipe) => recipe.recipeScrollItemId ?? []);
    expect(new Set(scrolls).size).toBe(scrolls.length);
    for (const recipe of getReleasedAlchemyRecipes()) {
      expect(recipe.output.quantity).toBeGreaterThan(0);
      expect(getItem(recipe.output.itemId)).toBeDefined();
      expect(POTION_EFFECTS.some((effect) => effect.potionItemId === recipe.output.itemId)).toBe(
        true,
      );
      expect(recipe.ingredients.every((ingredient) => ingredient.quantity > 0)).toBe(true);
      expect(
        recipe.allowSelfOutput ||
          recipe.ingredients.every((ingredient) => ingredient.itemId !== recipe.output.itemId),
      ).toBe(true);
    }
  });

  it('maps potion statuses onto shared derived stat sources where primitives exist', () => {
    const source = getAlchemyDerivedStatSource([
      { id: 'speed', remainingTicks: 90, magnitude: 0.7 },
      { id: 'magnet', remainingTicks: 75, magnitude: 8 },
      { id: 'size-shrink', remainingTicks: 45, magnitude: 0.5 },
    ]);

    expect(source).toEqual({
      id: 'status.alchemy',
      category: 'status',
      modifiers: [
        { stat: 'actionStepIntervalScalar', operation: 'multiply', value: 0.7 },
        { stat: 'pickupRadius', operation: 'add', value: 8 },
      ],
    });
  });

  it('wizard alchemy offers are atomic and preserve existing wizard goods', () => {
    const scenario = createHeadlessScenario({ seed: 'alchemy-wizard-shop' });
    const wizard = createWizard(scenario);
    scenario.game.setScore(0);
    const before = scenario.game.getSaveData();

    const failed = scenario.game.purchaseActorShopOffer(wizard.id, 'recipe-scroll-growth');
    expect(failed.ok).toBe(false);
    expect(failed.reason).toBe('insufficient-score');
    expect(scenario.game.getScore()).toBe(before.score);
    expect(scenario.game.getInventory().getAllItems()).toEqual(Object.entries(before.inventory));
    expect(scenario.game.getAlchemyState()).toEqual(createDefaultAlchemyState());

    scenario.game.setScore(200);
    const shop = scenario.game.getActorShopView(wizard.id);
    expect(shop?.offers.some((offer) => offer.id === 'orange-juice')).toBe(true);
    expect(scenario.game.purchaseActorShopOffer(wizard.id, 'orange-juice').ok).toBe(true);
    expect(scenario.game.getInventory().getItemCount('orange-juice')).toBe(1);
  });
});

function createWizard(scenario: ReturnType<typeof createHeadlessScenario>) {
  const actor = ensureScenarioActor(scenario, {
    id: 'headless-wizard',
    name: 'Wizard',
    role: 'shopkeeper',
    position: firstWalkableTile(scenario),
  });
  scenario.game.getActorSystem().registry.update(actor.id, (current) => ({
    ...current,
    role: 'wizard',
  }));
  return scenario.actor(actor.id);
}

function learnGrowthAndGrantIngredients(
  scenario: ReturnType<typeof createHeadlessScenario>,
  brews: number,
): void {
  scenario.game.grantInventoryItem('recipe-scroll-growth', 1);
  expect(scenario.game.learnAlchemyRecipeFromScroll('recipe-scroll-growth').ok).toBe(true);
  scenario.game.grantInventoryItem('ingredient-yuzu-apple', 2 * brews);
  scenario.game.grantInventoryItem('ingredient-honey', brews);
  scenario.game.grantInventoryItem('ingredient-dew', brews);
}

class ScenarioInventory {
  private readonly items = new Map<string, number>();

  addItem(itemId: string, count = 1): void {
    this.items.set(itemId, (this.items.get(itemId) ?? 0) + count);
  }

  removeItem(itemId: string, count = 1): boolean {
    const current = this.items.get(itemId) ?? 0;
    if (current < count) return false;
    const next = current - count;
    if (next > 0) {
      this.items.set(itemId, next);
    } else {
      this.items.delete(itemId);
    }
    return true;
  }

  getItemCount(itemId: string): number {
    return this.items.get(itemId) ?? 0;
  }

  getAllItems(): [string, number][] {
    return Array.from(this.items.entries());
  }
}
