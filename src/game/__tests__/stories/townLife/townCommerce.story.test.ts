import { describe, expect, it } from 'vitest';
import type { Actor } from '../../../../actors/actorTypes.js';
import type { LayerEntrance } from '../../../../layers/layerTypes.js';
import type { HeadlessScenario } from '../../../../test/headless/headlessScenario.js';
import { createHeadlessScenario } from '../../../../test/headless/headlessScenario.js';
import {
  adjacentWalkableTile,
  findGeneratedTownDoor,
  walkableTileAwayFrom,
} from '../../../../test/headless/scenarioFixtures.js';
import type { TownResident, TownStructure } from '../../../../world/town.js';
import { isSolidTile } from '../../../../world/tiles.js';
import type { RoomSnapshot } from '../../../../world/types.js';

describe('Town life commerce hardening stories', () => {
  it('TOWN-HARDEN-029 - shopkeeper completes a full station-home-station lifecycle without recovery', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-harden-029-shopkeeper-lifecycle' });
    const { room, entrance } = findGeneratedTownDoor(scenario, { templateId: 'generalStore' });
    const town = requireTown(room);
    const resident = requireResident(town, 'equipmentMerchant');
    const actorId = actorIdForResident(scenario, town, resident);

    scenario.setDayPhase('day');
    scenario.enterRoom(room.id, walkableTileAwayFrom(scenario, room.id, entrance, 6));
    walkSnakeIntoDoor(scenario, room, entrance);
    await scenario.advanceActorTicks(3);

    const workRoomId = scenario.currentRoom().id;
    const atStation = currentRoomActorWithRole(scenario, 'equipmentMerchant');
    const workPosition = atStation.presence?.position;
    expect(atStation.id).toBe(actorId);
    expect(atStation.goal).toMatchObject({
      kind: 'work',
      roomId: workRoomId,
    });
    expect(atStation.activity?.kind).toBe('merchant');
    expect(workPosition).toBeDefined();
    if (!workPosition) {
      throw new Error('Expected materialized shopkeeper work position.');
    }
    expect(scenario.game.resolveNearbyTownDoorAccess()).toBeNull();
    expect(scenario.game.getActorShopView(actorId)).toMatchObject({ open: true });
    exitCurrentLayerThroughDoor(scenario);
    walkToLocal(scenario, walkableTileAwayFrom(scenario, room.id, entrance, 6), [entrance]);

    scenario.setDayPhase('dusk');
    await scenario.advanceActorTicks(1);
    expect(scenario.game.getActorShopView(actorId)).toMatchObject({
      open: false,
      closedReason: 'Closed until day.',
    });
    await advanceActorTicksUntil(
      scenario,
      () => {
        const actor = scenario.actor(actorId);
        return actor.currentRoomId !== workRoomId;
      },
      { timeoutMs: 90_000, stepMs: 250 },
    );

    scenario.setDayPhase('night');
    await advanceActorTicksUntil(
      scenario,
      () => {
        const actor = scenario.actor(actorId);
        return actor.currentRoomId === actor.homeRoomId && actor.activity?.kind === 'sleeping';
      },
      { timeoutMs: 180_000, stepMs: 250 },
    );
    const sleeping = scenario.actor(actorId);
    expect(sleeping.id).toBe(actorId);
    expect(sleeping.goal).toMatchObject({
      kind: 'sleep',
      roomId: sleeping.homeRoomId,
    });

    scenario.setDayPhase('dawn');
    await scenario.advanceActorTicks(1);
    expect(scenario.actor(actorId)).toMatchObject({
      id: actorId,
      goal: {
        kind: 'work',
        roomId: workRoomId,
      },
    });
    scenario.setDayPhase('day');
    await advanceActorTicksUntil(
      scenario,
      () => {
        const actor = scenario.actor(actorId);
        return (
          actor.currentRoomId === workRoomId &&
          actor.presence?.position.x === workPosition.x &&
          actor.presence.position.y === workPosition.y
        );
      },
      { timeoutMs: 240_000, stepMs: 250 },
    );

    const returned = scenario.actor(actorId);
    expect(returned.id).toBe(actorId);
    expect(returned.presence?.position).toEqual(workPosition);
    expect(returned.activity?.kind).toBe('merchant');
    expect(scenario.game.getActorShopView(actorId)).toMatchObject({ open: true });
    expect(
      scenario
        .actorTelemetryEvents()
        .filter((event) => event.type === 'actor.travel_recovered' && event.actorId === actorId),
    ).toEqual([]);
    scenario.assertWorldIntegrity();
  });

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

async function advanceActorTicksUntil(
  scenario: HeadlessScenario,
  predicate: () => boolean,
  options: { timeoutMs: number; stepMs: number },
): Promise<void> {
  let elapsed = 0;
  while (elapsed < options.timeoutMs) {
    if (predicate()) {
      return;
    }
    await scenario.advanceActorTicks(1, options.stepMs);
    elapsed += options.stepMs;
  }
  const actors = scenario.game
    .getActorSystem()
    .registry.getAll()
    .slice(0, 5)
    .map((actor) => ({
      id: actor.id,
      role: actor.role,
      roomId: actor.currentRoomId,
      presence: actor.presence,
      goal: actor.goal,
      activity: actor.activity,
    }));
  throw new Error(
    `Timed out waiting for actor-clock condition after ${options.timeoutMs}ms: ${JSON.stringify(
      scenario.diagnostics(),
    )} actors=${JSON.stringify(actors)}`,
  );
}

function walkSnakeIntoDoor(
  scenario: HeadlessScenario,
  room: RoomSnapshot,
  entrance: LayerEntrance,
): void {
  const approach = adjacentWalkableTile(room, entrance);
  walkToLocal(scenario, approach, [entrance]);
  const interacted = scenario.game.enterNearbyTownBuildingDoor();
  if (interacted.ok) {
    return;
  }
  scenario.game.forceDirection(entrance.x - approach.x, entrance.y - approach.y);
  scenario.advanceActionTicks(1);
  if (scenario.currentRoom().id === room.id) {
    const entered = scenario.game.enterNearbyTownBuildingDoor();
    expect(entered, entered.message).toMatchObject({ ok: true });
  }
}

function walkToLocal(
  scenario: HeadlessScenario,
  target: { x: number; y: number },
  forbidden: readonly { x: number; y: number }[] = [],
): void {
  const room = scenario.currentRoom();
  const path = findLocalPath(room, playerLocalHead(scenario), target, forbidden);
  for (const step of path) {
    scenario.game.forceDirection(step.x, step.y);
    scenario.advanceActionTicks(1);
  }
}

function exitCurrentLayerThroughDoor(scenario: HeadlessScenario): void {
  const room = scenario.currentRoom();
  const exit = room.layer?.exit;
  expect(exit).toBeDefined();
  if (!exit) {
    throw new Error(`Current room ${room.id} is not a layer.`);
  }
  const approach = adjacentWalkableTile(room, exit);
  walkToLocal(scenario, approach, [exit]);
  scenario.game.forceDirection(exit.x - approach.x, exit.y - approach.y);
  scenario.advanceActionTicks(1);
}

function playerLocalHead(scenario: HeadlessScenario): { x: number; y: number } {
  const room = scenario.currentRoom();
  const head = scenario.player().snake.bodySegments[0];
  expect(head).toBeDefined();
  if (!head) {
    throw new Error('Player head is missing.');
  }
  if (room.layer) {
    return { x: head.x, y: head.y };
  }
  const [roomX = 0, roomY = 0] = room.id.split(',').map(Number);
  return {
    x: head.x - roomX * scenario.game.config.grid.cols,
    y: head.y - roomY * scenario.game.config.grid.rows,
  };
}

function findLocalPath(
  room: RoomSnapshot,
  start: { x: number; y: number },
  target: { x: number; y: number },
  forbidden: readonly { x: number; y: number }[],
): Array<{ x: number; y: number }> {
  const path = findLocalPathOrNull(room, start, target, forbidden);
  if (!path) {
    throw new Error(`No local path from ${pointKey(start)} to ${pointKey(target)} in ${room.id}.`);
  }
  return path;
}

function findLocalPathOrNull(
  room: RoomSnapshot,
  start: { x: number; y: number },
  target: { x: number; y: number },
  forbidden: readonly { x: number; y: number }[],
): Array<{ x: number; y: number }> | null {
  const queue = [start];
  const seen = new Set<string>([pointKey(start)]);
  const forbiddenKeys = new Set(forbidden.map((point) => pointKey(point)));
  const previous = new Map<
    string,
    { point: { x: number; y: number }; step: { x: number; y: number } }
  >();
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    if (current.x === target.x && current.y === target.y) {
      return reconstructPath(previous, start, target);
    }
    for (const step of [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]) {
      const next = { x: current.x + step.x, y: current.y + step.y };
      if (
        next.x < 1 ||
        next.x >= (room.layout[0]?.length ?? 0) - 1 ||
        next.y < 1 ||
        next.y >= room.layout.length - 1
      ) {
        continue;
      }
      const key = pointKey(next);
      if (seen.has(key) || forbiddenKeys.has(key) || isSolidTile(room.layout[next.y]?.[next.x])) {
        continue;
      }
      seen.add(key);
      previous.set(key, { point: current, step });
      queue.push(next);
    }
  }
  return null;
}

function reconstructPath(
  previous: Map<string, { point: { x: number; y: number }; step: { x: number; y: number } }>,
  start: { x: number; y: number },
  target: { x: number; y: number },
): Array<{ x: number; y: number }> {
  const steps: Array<{ x: number; y: number }> = [];
  let current = target;
  while (current.x !== start.x || current.y !== start.y) {
    const entry = previous.get(pointKey(current));
    if (!entry) {
      throw new Error(`Broken path at ${pointKey(current)}.`);
    }
    steps.push(entry.step);
    current = entry.point;
  }
  return steps.reverse();
}

function pointKey(point: { x: number; y: number }): string {
  return `${point.x},${point.y}`;
}

function requireTown(room: RoomSnapshot): TownStructure {
  expect(room.town).toBeDefined();
  if (!room.town) {
    throw new Error(`Expected room ${room.id} to belong to a town.`);
  }
  return room.town;
}

function requireResident(town: TownStructure, role: TownResident['role']): TownResident {
  const resident = town.residents.find((entry) => entry.role === role);
  expect(resident).toBeDefined();
  if (!resident) {
    throw new Error(`Expected town ${town.id} to have a ${role}.`);
  }
  return resident;
}

function actorIdForResident(
  scenario: HeadlessScenario,
  town: TownStructure,
  resident: TownResident,
): string {
  return (
    resident.actorId ?? scenario.game.getTownResidentActorId(town.id, resident.id, resident.role)
  );
}

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
