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

    const scrollPurchase = scenario.game.purchaseActorShopOffer(wizard.id, 'recipe-scroll-phase');
    expect(scrollPurchase.ok).toBe(true);
    for (const offerId of ['ingredient-pearl-apple']) {
      expect(scenario.game.purchaseActorShopOffer(wizard.id, offerId).ok).toBe(true);
    }
    scenario.game.grantInventoryItem('ingredient-quartz', 1);
    scenario.game.grantInventoryItem('ingredient-dew', 1);
    scenario.game.grantInventoryItem(ALCHEMY_STATION_ITEM_ID, 1);
    const deployed = scenario.game.deployAlchemyStation(
      offsetPosition(firstWalkableTile(scenario), 4, 0),
    );
    expect(deployed.ok).toBe(true);
    if (!deployed.ok) return;

    const learned = scenario.game.useInventoryItem('recipe-scroll-phase');
    expect(learned.ok).toBe(true);
    expect(scenario.game.knowsAlchemyRecipe('phase')).toBe(true);

    const brewed = scenario.game.brewAlchemyRecipe('phase', {
      kind: 'alchemy-station',
      source: 'placed',
      worldObjectId: deployed.station.id,
    });
    expect(brewed).toEqual({
      ok: true,
      recipeId: 'phase',
      outputItemId: 'potion-phase',
      quantity: 1,
    });
    expect(scenario.game.getInventory().getItemCount('ingredient-pearl-apple')).toBe(0);
    expect(scenario.game.getInventory().getItemCount('ingredient-quartz')).toBe(0);
    expect(scenario.game.getInventory().getItemCount('ingredient-dew')).toBe(0);
    expect(scenario.game.getInventory().getItemCount('potion-phase')).toBe(1);

    const used = scenario.game.useInventoryItem('potion-phase');
    expect(used.ok).toBe(true);
    expect(scenario.game.getInventory().getItemCount('potion-phase')).toBe(0);
    expect(scenario.game.getFlag('traversal.phaseTicks')).toBe(60);

    scenario.game.tickAlchemyStatusEffects(30);
    const midSave = scenario.game.getSaveData();
    const reloaded = HeadlessScenario.fromSave(midSave);
    const activePhase = reloaded.game
      .getAlchemyState()
      .activeEffects.find((effect) => effect.id === 'phase');
    expect(activePhase?.remainingTicks).toBe(30);

    reloaded.game.tickAlchemyStatusEffects(30);
    expect(reloaded.game.getFlag('traversal.phaseTicks')).toBeUndefined();
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

    learnPhaseAndGrantIngredients(scenario, 2);
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
    expect(scenario.game.brewAlchemyRecipe('phase', context).ok).toBe(true);

    const saved = scenario.game.getSaveData();
    const reloaded = HeadlessScenario.fromSave(saved);
    expect(reloaded.game.getAlchemyStationCount()).toBe(1);
    expect(reloaded.game.getAlchemyState().placedStation).toEqual(deployed.station);
    expect(reloaded.game.brewAlchemyRecipe('phase', context).ok).toBe(true);

    reloaded.enterRoom(deployed.station.roomId, offsetPosition(deployed.station.position, 1, 0));
    grantPhaseIngredients(reloaded, 1);
    const interaction = reloaded.game.getNearbyAlchemyStationInteraction();
    expect(interaction?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'brew:phase', enabled: true }),
        expect.objectContaining({ id: 'pack-up', enabled: true }),
      ]),
    );
    expect(reloaded.game.chooseAlchemyStationInteraction('brew:phase')).toMatchObject({
      ok: true,
      action: 'brew',
      brew: { ok: true, outputItemId: 'potion-phase' },
    });

    const packed = reloaded.game.chooseAlchemyStationInteraction('pack-up');
    expect(packed).toMatchObject({ ok: true, action: 'pack-up' });
    expect(reloaded.game.getAlchemyStationCount()).toBe(1);
    expect(reloaded.game.getInventory().getItemCount(ALCHEMY_STATION_ITEM_ID)).toBe(1);
    expect(reloaded.game.getAlchemyState().placedStation).toBeUndefined();
  });

  it('wizard bench brews without portable station and portable station is mechanically equivalent', () => {
    const wizardBench = createHeadlessScenario({ seed: 'alchemy-station-equivalence-a' });
    const portable = createHeadlessScenario({ seed: 'alchemy-station-equivalence-b' });
    learnPhaseAndGrantIngredients(wizardBench, 1);
    learnPhaseAndGrantIngredients(portable, 1);
    portable.game.grantInventoryItem(ALCHEMY_STATION_ITEM_ID, 1);
    const deployed = portable.game.deployAlchemyStation(
      offsetPosition(firstWalkableTile(portable), 4, 0),
    );
    expect(deployed.ok).toBe(true);
    if (!deployed.ok) return;

    const wizardResult = wizardBench.game.brewAlchemyRecipe('phase', null);
    const portableResult = portable.game.brewAlchemyRecipe('phase', {
      kind: 'alchemy-station',
      source: 'placed',
      worldObjectId: deployed.station.id,
    });

    expect(wizardResult).toEqual({ ok: false, reason: 'station-required' });
    expect(portableResult.ok).toBe(true);
  });

  it('recipe learning and duplicate scroll behavior is atomic and persistent', () => {
    const scenario = createHeadlessScenario({ seed: 'alchemy-recipes' });
    scenario.game.grantInventoryItem('recipe-scroll-phase', 1);

    expect(scenario.game.learnAlchemyRecipeFromScroll('recipe-scroll-phase')).toMatchObject({
      ok: true,
      recipeId: 'phase',
    });
    expect(scenario.game.getInventory().getItemCount('recipe-scroll-phase')).toBe(0);

    scenario.game.grantInventoryItem('recipe-scroll-phase', 1);
    expect(scenario.game.learnAlchemyRecipeFromScroll('recipe-scroll-phase')).toEqual({
      ok: false,
      reason: 'already-known',
    });
    expect(scenario.game.getInventory().getItemCount('recipe-scroll-phase')).toBe(1);

    scenario.game.grantInventoryItem('recipe-scroll-shadow', 1);
    const stateBeforeInvalidScroll = scenario.game.getAlchemyState();
    const before = structuredClone(scenario.game.getSaveData());
    expect(scenario.game.learnAlchemyRecipeFromScroll('recipe-scroll-shadow')).toEqual({
      ok: false,
      reason: 'invalid-scroll',
    });
    expect(scenario.game.getInventory().getAllItems()).toEqual(Object.entries(before.inventory));
    expect(scenario.game.getAlchemyState()).toEqual(stateBeforeInvalidScroll);

    scenario.game.grantInventoryItem('recipe-scroll-shield', 1);
    expect(scenario.game.learnAlchemyRecipeFromScroll('recipe-scroll-shield').ok).toBe(true);
    const reloaded = HeadlessScenario.fromSave(scenario.game.getSaveData());
    expect(reloaded.game.knowsAlchemyRecipe('phase')).toBe(true);
    expect(reloaded.game.knowsAlchemyRecipe('shield')).toBe(true);
    expect(reloaded.game.knowsAlchemyRecipe('growth')).toBe(false);
  });

  it('brewing failures never partially consume ingredients', () => {
    const state = createDefaultAlchemyState();
    const inventory = new ScenarioInventory();
    inventory.addItem('ingredient-pearl-apple', 2);
    inventory.addItem('ingredient-quartz', 1);
    inventory.addItem('ingredient-dew', 1);

    expect(
      brewAlchemyRecipe(state, { inventory }, 'phase', {
        kind: 'alchemy-station',
        source: 'wizard-bench',
        roomId: 'fake-wizard-house',
        position: { x: 1, y: 1 },
      }),
    ).toEqual({
      ok: false,
      reason: 'unknown-recipe',
    });
    expect(Object.fromEntries(inventory.getAllItems())).toEqual({
      'ingredient-pearl-apple': 2,
      'ingredient-quartz': 1,
      'ingredient-dew': 1,
    });

    inventory.addItem('recipe-scroll-phase', 1);
    expect(learnAlchemyRecipeFromScroll(state, { inventory }, 'recipe-scroll-phase').ok).toBe(true);
    expect(brewAlchemyRecipe(state, { inventory }, 'phase', null)).toEqual({
      ok: false,
      reason: 'station-required',
    });
    expect(
      brewAlchemyRecipe(state, { inventory }, 'phase', {
        kind: 'alchemy-station',
        source: 'wizard-bench',
        roomId: 'fake-wizard-house',
        position: { x: 1, y: 1 },
      }),
    ).toEqual({ ok: false, reason: 'station-required' });
    expect(
      brewAlchemyRecipe(state, { inventory, isStationContextValid: () => true }, 'phase', {
        kind: 'alchemy-station',
        source: 'wizard-bench',
        roomId: 'real-wizard-shop',
        position: { x: 1, y: 1 },
      }).ok,
    ).toBe(true);
    expect(
      brewAlchemyRecipe(state, { inventory, isStationContextValid: () => true }, 'phase', {
        kind: 'alchemy-station',
        source: 'wizard-bench',
        roomId: 'real-wizard-shop',
        position: { x: 1, y: 1 },
      }),
    ).toEqual({
      ok: false,
      reason: 'missing-ingredients',
    });
    expect(Object.fromEntries(inventory.getAllItems())).toEqual({
      'ingredient-pearl-apple': 1,
      'potion-phase': 1,
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

    const failed = scenario.game.purchaseActorShopOffer(wizard.id, 'recipe-scroll-shield');
    expect(failed.ok).toBe(false);
    expect(failed.reason).toBe('insufficient-score');
    expect(scenario.game.getScore()).toBe(before.score);
    expect(scenario.game.getInventory().getAllItems()).toEqual(Object.entries(before.inventory));
    expect(scenario.game.getAlchemyState()).toEqual(createDefaultAlchemyState());

    scenario.game.setScore(200);
    const shop = scenario.game.getActorShopView(wizard.id);
    expect(shop?.categories).toEqual(['consumables', 'items']);
    expect(shop?.offers.map((offer) => offer.id)).toEqual(
      expect.arrayContaining([
        'alchemy-station',
        'recipe-scroll-shield',
        'recipe-scroll-phase',
        'ingredient-pearl-apple',
      ]),
    );
    expect(scenario.game.purchaseActorShopOffer(wizard.id, 'recipe-scroll-shield').ok).toBe(true);
    expect(scenario.game.getInventory().getItemCount('recipe-scroll-shield')).toBe(1);
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
    shopProfileId: 'wizard',
  }));
  return scenario.actor(actor.id);
}

function learnPhaseAndGrantIngredients(
  scenario: ReturnType<typeof createHeadlessScenario>,
  brews: number,
): void {
  scenario.game.grantInventoryItem('recipe-scroll-phase', 1);
  expect(scenario.game.learnAlchemyRecipeFromScroll('recipe-scroll-phase').ok).toBe(true);
  grantPhaseIngredients(scenario, brews);
}

function grantPhaseIngredients(
  scenario: ReturnType<typeof createHeadlessScenario>,
  brews: number,
): void {
  scenario.game.grantInventoryItem('ingredient-pearl-apple', brews);
  scenario.game.grantInventoryItem('ingredient-quartz', brews);
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
