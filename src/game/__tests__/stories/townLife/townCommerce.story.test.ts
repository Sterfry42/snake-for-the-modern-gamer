import { describe, expect, it } from 'vitest';
import type { Actor } from '../../../../actors/actorTypes.js';
import type { LayerEntrance } from '../../../../layers/layerTypes.js';
import type { HeadlessScenario } from '../../../../test/headless/headlessScenario.js';
import { createHeadlessScenario } from '../../../../test/headless/headlessScenario.js';
import {
  adjacentWalkableTile,
  findGeneratedTownDoor,
} from '../../../../test/headless/scenarioFixtures.js';
import type { RoomSnapshot } from '../../../../world/types.js';

describe('Town life commerce hardening stories', () => {
  it('TOWN-HARDEN-002 / TOWN-REGRESSION-002 - closed potion makers cannot sell at night through gameplay paths', () => {
    const scenario = createHeadlessScenario({ seed: 'town-harden-002-potion-night-sales' });
    const { room, entrance } = findGeneratedTownDoor(scenario, { templateId: 'potionMaker' });

    scenario.setDayPhase('night');
    moveSnakeIntoDoor(scenario, room, entrance);

    expect(scenario.currentRoom().id).toBe(room.id);
    expect(scenario.game.getFlag('layers.active')).toBeUndefined();
    expect(
      scenario.game.getActorsInCurrentRoom().some((actor) => actor.role === 'potionMaker'),
    ).toBe(false);

    scenario.setDayPhase('day');
    moveSnakeIntoDoor(scenario, room, entrance);
    const potionMaker = currentRoomActorWithRole(scenario, 'potionMaker');
    expect(shopOption(scenario, potionMaker)?.enabled).toBe(true);

    scenario.setDayPhase('night');
    const closedView = scenario.game.getActorShopView(potionMaker.id);
    expect(closedView).toMatchObject({
      open: false,
      closedReason: 'Closed until day.',
    });
    expect(scenario.game.purchaseActorShopOffer(potionMaker.id, 'healing-potion')).toMatchObject({
      ok: false,
      reason: 'closed',
      scoreBefore: scenario.game.getScore(),
      scoreAfter: scenario.game.getScore(),
    });

    scenario.setDayPhase('day');
    const openView = scenario.game.getActorShopView(potionMaker.id);
    expect(openView?.offers.map((offer) => offer.id)).toContain('healing-potion');
    scenario.game.setScore(40);
    const purchase = scenario.game.purchaseActorShopOffer(potionMaker.id, 'healing-potion');
    expect(purchase).toMatchObject({
      ok: true,
      offerId: 'healing-potion',
      scoreBefore: 40,
      scoreAfter: 16,
    });
    scenario.assertWorldIntegrity();
  });

  it('TOWN-HARDEN-003 / TOWN-REGRESSION-003 - mapper actor interaction opens mapper stock instead of generic equipment', () => {
    const scenario = createHeadlessScenario({ seed: 'town-harden-003-mapper-actor-shop' });
    const { room, entrance } = findGeneratedTownDoor(scenario, { templateId: 'mapper' });

    scenario.setDayPhase('day');
    moveSnakeIntoDoor(scenario, room, entrance);
    const mapper = currentRoomActorWithRole(scenario, 'mapper');

    expect(shopOption(scenario, mapper)).toMatchObject({ id: 'shop', enabled: true });
    const view = scenario.game.getActorShopView(mapper.id);

    expect(view).toMatchObject({
      actorId: mapper.id,
      role: 'mapper',
      open: true,
      categories: ['locators'],
    });
    expect(view?.offers.length).toBeGreaterThan(0);
    expect(view?.offers.every((offer) => offer.category === 'locators')).toBe(true);
    expect(view?.offers.some((offer) => offer.id === 'half-price-revolver')).toBe(false);
    expect(view?.offers.some((offer) => offer.itemId?.includes('locator'))).toBe(true);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-HARDEN-004 - specialist actors expose their role-specific commerce catalogs', () => {
    const expectations = [
      {
        templateId: 'generalStore',
        role: 'equipmentMerchant',
        expectedOffer: 'half-price-revolver',
        expectedCategory: 'equipment',
      },
      {
        templateId: 'potionMaker',
        role: 'potionMaker',
        expectedOffer: 'healing-potion',
        expectedCategory: 'supplies',
        forbiddenOffer: 'half-price-revolver',
      },
      {
        templateId: 'butcherShop',
        role: 'butcher',
        expectedOffer: 'animal-bait',
        expectedCategory: 'food',
        forbiddenOffer: 'half-price-revolver',
      },
      {
        templateId: 'mapper',
        role: 'mapper',
        expectedCategory: 'locators',
        forbiddenOffer: 'half-price-revolver',
      },
      {
        templateId: 'wizardShop',
        role: 'wizard',
        expectedOffer: 'life-tonic',
        expectedCategory: 'supplies',
        forbiddenOffer: 'half-price-revolver',
      },
      {
        templateId: 'tavern',
        role: 'bartender',
        expectedOffer: 'beer',
        expectedCategory: 'food',
        forbiddenOffer: 'half-price-revolver',
      },
      {
        templateId: 'tavern',
        role: 'cardDealer',
        expectedOffer: 'moss-two',
        expectedCategory: 'services',
        forbiddenOffer: 'half-price-revolver',
      },
    ] as const;

    for (const expectation of expectations) {
      const scenario = createHeadlessScenario({
        seed: `town-harden-004-${expectation.role}-catalog`,
      });
      scenario.setDayPhase('day');
      const { room, entrance } = findGeneratedTownDoor(scenario, {
        templateId: expectation.templateId,
      });

      moveSnakeIntoDoor(scenario, room, entrance);
      const actor = currentRoomActorWithRole(scenario, expectation.role);
      const view = scenario.game.getActorShopView(actor.id);

      expect(view?.open, `${expectation.role} shop should be open`).toBe(true);
      expect(view?.categories).toContain(expectation.expectedCategory);
      if ('expectedOffer' in expectation) {
        expect(view?.offers.map((offer) => offer.id)).toContain(expectation.expectedOffer);
      }
      if ('forbiddenOffer' in expectation) {
        expect(view?.offers.map((offer) => offer.id)).not.toContain(expectation.forbiddenOffer);
      }
      scenario.assertWorldIntegrity();
    }
  });
});

function moveSnakeIntoDoor(
  scenario: HeadlessScenario,
  room: RoomSnapshot,
  entrance: LayerEntrance,
): void {
  const approach = adjacentWalkableTile(room, entrance);
  if (approach.x === entrance.x && approach.y === entrance.y) {
    throw new Error(`No adjacent approach tile for ${entrance.id}; the test must use movement.`);
  }
  scenario.enterRoom(room.id, approach);
  scenario.game.forceDirection(entrance.x - approach.x, entrance.y - approach.y);
  scenario.advanceActionTicks(1);
}

function currentRoomActorWithRole(scenario: HeadlessScenario, role: Actor['role']): Actor {
  const actor = scenario.game.getActorsInCurrentRoom().find((entry) => entry.role === role);
  if (!actor) {
    throw new Error(`No ${role} actor in current room ${scenario.currentRoom().id}.`);
  }
  return actor;
}

function shopOption(scenario: HeadlessScenario, actor: Actor) {
  return scenario.game
    .getActorInteractionMenu(actor.id)
    ?.options.find((option) => option.id === 'shop');
}
