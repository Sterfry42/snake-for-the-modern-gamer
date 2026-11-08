import { describe, expect, it } from 'vitest';
import type { Actor } from '../../../../actors/actorTypes.js';
import { getSpellTomeBySpell, SPELL_TOMES } from '../../../../systems/spells/spellTomes.js';
import { spellRegistry } from '../../../../systems/spells/spellRegistry.js';
import type { LayerEntrance } from '../../../../layers/layerTypes.js';
import type { HeadlessScenario } from '../../../../test/headless/headlessScenario.js';
import { createHeadlessScenario } from '../../../../test/headless/headlessScenario.js';
import {
  adjacentWalkableTile,
  findGeneratedTownDoor,
} from '../../../../test/headless/scenarioFixtures.js';
import { DEFAULT_SHOP_OFFER_POOLS } from '../../../../shops/shopProfiles.js';
import type { RoomSnapshot } from '../../../../world/types.js';

describe('Town magic stories', () => {
  it('TOWN-MAGIC-002 - the wizard market covers every school of magic', () => {
    const pool = DEFAULT_SHOP_OFFER_POOLS.get('wizard-items');
    expect(pool).toBeDefined();

    const offers = pool!.resolve({
      biomeId: 'elderwood-maze',
      townId: 'town-magic-002',
      worldSeed: 'town-magic-002',
      stockPeriod: 1,
      priceScalar: 1,
      stockCountBonus: 0,
      hasAlchemyStation: false,
    });
    const itemIds = offers.map((offer) => offer.itemId);

    for (const tome of SPELL_TOMES) {
      expect(itemIds, `wizard stock should carry ${tome.itemId}`).toContain(tome.itemId);
    }
    for (const school of ['destruction', 'alteration', 'conjuration', 'illusion', 'restoration']) {
      const schoolTomes = SPELL_TOMES.filter((tome) => tome.school === school);
      expect(schoolTomes.length, `registry lost ${school} spells`).toBeGreaterThan(0);
      expect(
        itemIds.filter((id) => schoolTomes.some((tome) => tome.itemId === id)).length,
        `wizard stock should cover ${school}`,
      ).toBeGreaterThan(0);
    }
    expect(itemIds).toContain('mana-crystal');

    const services = DEFAULT_SHOP_OFFER_POOLS.get('wizard-services')!.resolve({
      biomeId: 'elderwood-maze',
      townId: 'town-magic-002',
      worldSeed: 'town-magic-002',
      stockPeriod: 1,
      priceScalar: 1,
      stockCountBonus: 0,
      hasAlchemyStation: false,
    });
    expect(services).toHaveLength(1);
    expect(services[0]).toMatchObject({ id: 'wizard-lesson', itemId: 'wizard-lesson' });
  });

  it('TOWN-MAGIC-003 - the wizard lesson service teaches spells atomically', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-magic-003-wizard-lesson-service' });
    scenario.setDayPhase('day');
    scenario.game.setScore(0);
    const { room, entrance } = findGeneratedTownDoor(scenario, { templateId: 'wizardShop' });

    moveSnakeIntoDoor(scenario, room, entrance);
    await scenario.advanceActorTicks(3);

    const wizard = currentRoomActorWithRole(scenario, 'wizard');
    const view = scenario.game.getActorShopView(wizard.id);
    expect(view?.offers.map((offer) => offer.id)).toContain('wizard-lesson');

    const refused = scenario.game.purchaseActorShopOffer(wizard.id, 'wizard-lesson');
    expect(refused).toMatchObject({ ok: false, reason: 'insufficient-score' });
    expect(scenario.game.getScore()).toBe(0);
    expect(scenario.game.getFlag<string[]>('arcane.spellbook.known')).toBeUndefined();

    scenario.game.setScore(100);
    const first = scenario.game.purchaseActorShopOffer(wizard.id, 'wizard-lesson');
    expect(first).toMatchObject({ ok: true, offerId: 'wizard-lesson' });
    expect(first.scoreAfter).toBeLessThan(first.scoreBefore);
    expect(scenario.game.getFlag<string[]>('arcane.spellbook.known')).toContain('arcane-pulse');
    expect(scenario.game.getInventory().getItemCount('wizard-lesson')).toBe(0);
    expect(scenario.game.getFlag<number>('magic.wizardLessons')).toBe(1);

    const second = scenario.game.purchaseActorShopOffer(wizard.id, 'wizard-lesson');
    expect(second).toMatchObject({ ok: true });
    const knownNow = new Set(scenario.game.getFlag<string[]>('arcane.spellbook.known') ?? []);
    expect(knownNow.size).toBe(2);

    const third = scenario.game.purchaseActorShopOffer(wizard.id, 'wizard-lesson');
    expect(third).toMatchObject({ ok: true });
    expect(scenario.game.getFlag<number>('magic.wizardLessons')).toBe(3);

    const exhausted = scenario.game.purchaseActorShopOffer(wizard.id, 'wizard-lesson');
    expect(exhausted).toMatchObject({ ok: false });
    expect(scenario.game.getFlag<number>('magic.wizardLessons')).toBe(3);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-MAGIC-004 - tomes and mana stock bought from the wizard flow through inventory', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-magic-004-wizard-magic-stock' });
    scenario.setDayPhase('day');
    scenario.game.setScore(300);
    const { room, entrance } = findGeneratedTownDoor(scenario, { templateId: 'wizardShop' });

    moveSnakeIntoDoor(scenario, room, entrance);
    await scenario.advanceActorTicks(3);

    // A purchased mana potion queues the astral refund when used.
    scenario.game.grantInventoryItem('mana-potion', 1);
    const potion = scenario.game.useInventoryItem('mana-potion');
    expect(potion).toMatchObject({ ok: true, consume: true });
    expect(scenario.game.getFlag<number>('mana.pendingRestore')).toBe(30);

    // A purchased tome teaches exactly one spell and consumes itself.
    scenario.game.grantInventoryItem('spell-tome-magic-missile', 1);
    const tome = scenario.game.useInventoryItem('spell-tome-magic-missile');
    expect(tome).toMatchObject({ ok: true, consume: true });
    expect(scenario.game.getInventory().getItemCount('spell-tome-magic-missile')).toBe(0);
    expect(scenario.game.getFlag<string[]>('arcane.spellbook.known')).toContain('magic-missile');
    expect(getSpellTomeBySpell('magic-missile')).toMatchObject({
      itemId: 'spell-tome-magic-missile',
      school: 'destruction',
    });

    // A failed re-learn must not consume the tome.
    scenario.game.grantInventoryItem('spell-tome-haste', 1);
    expect(scenario.game.useInventoryItem('spell-tome-haste')).toMatchObject({ ok: true });
    expect(scenario.game.getInventory().getItemCount('spell-tome-haste')).toBe(0);
    scenario.game.grantInventoryItem('spell-tome-haste', 1);
    const duplicate = scenario.game.useInventoryItem('spell-tome-haste');
    expect(duplicate).toMatchObject({ ok: false });
    expect(scenario.game.getInventory().getItemCount('spell-tome-haste')).toBe(1);

    // Every registered spell still resolves through the canonical registry.
    expect(spellRegistry.list().length).toBe(SPELL_TOMES.length);
    scenario.assertWorldIntegrity();
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
