import { describe, expect, it } from 'vitest';
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

describe('Town life tavern rest hardening stories', () => {
  it('TOWN-HARDEN-028 - hospitality schedules keep night services staffed without opening daytime specialists', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-harden-028-hospitality-schedules' });
    const { room: tavernRoom, entrance: tavernEntrance } = findGeneratedTownDoor(scenario, {
      templateId: 'tavern',
    });
    const { entrance: storeEntrance } = findGeneratedTownDoor(scenario, {
      templateId: 'generalStore',
    });
    const town = requireTown(tavernRoom);
    scenario.setDayPhase('night');
    scenario.enterRoom(
      tavernRoom.id,
      walkableTileAwayFrom(scenario, tavernRoom.id, tavernEntrance, 6),
    );
    await scenario.advanceActorTicks(1);

    expect(
      scenario.actor(actorIdForResident(scenario, town, requireResident(town, 'bartender'))).goal,
    ).toMatchObject({
      kind: 'work',
      roomId: tavernEntrance.layerId,
      reason: 'schedule:work',
    });
    expect(
      scenario.actor(actorIdForResident(scenario, town, requireResident(town, 'cardDealer'))).goal,
    ).toMatchObject({
      kind: 'work',
      roomId: tavernEntrance.layerId,
      reason: 'schedule:work',
    });
    expect(
      scenario.actor(actorIdForResident(scenario, town, requireResident(town, 'equipmentMerchant')))
        .goal,
    ).toMatchObject({
      kind: 'sleep',
      reason: 'schedule:sleep',
    });
    expect(storeEntrance.layerId).not.toBe(tavernEntrance.layerId);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-HARDEN-028 / TOWN-REGRESSION-019 - an unvisited tavern works at night with a pre-existing bartender', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-harden-028-night-tavern-unvisited' });
    const { room, entrance } = findGeneratedTownDoor(scenario, { templateId: 'tavern' });
    const town = requireTown(room);
    const bartender = requireResident(town, 'bartender');
    const bartenderActorId = actorIdForResident(scenario, town, bartender);

    scenario.setDayPhase('night');
    scenario.enterRoom(room.id, walkableTileAwayFrom(scenario, room.id, entrance, 6));
    await scenario.advanceActorTicks(1);

    const beforeActorIds = townRegistryActorIds(scenario, town.id);
    const logicalBartender = scenario.actor(bartenderActorId);
    expect(beforeActorIds).toContain(bartenderActorId);
    expect(logicalBartender.goal).toMatchObject({
      kind: 'work',
      roomId: entrance.layerId,
    });
    expect(logicalBartender.activity?.kind).not.toBe('sleeping');
    expect(scenario.game.resolveNearbyTownDoorAccess()).toBeNull();

    walkSnakeIntoDoor(scenario, room, entrance);

    expect(scenario.currentRoom().id).toBe(entrance.layerId);
    expect(townRegistryActorIds(scenario, town.id)).toEqual(beforeActorIds);
    const materializedBartender = scenario.game
      .getActorsInCurrentRoom()
      .find((actor) => actor.role === 'bartender');
    expect(materializedBartender?.id).toBe(bartenderActorId);
    scenario.game.setScore(20);
    expect(scenario.game.getCurrentInnServiceView(12)).toMatchObject({
      available: true,
      cost: 12,
    });

    const beforeDay = scenario.game.getAtmosphereState().worldDay;
    const rest = await scenario.game.chooseCurrentInnRest(12);

    expect(rest).toMatchObject({
      ok: true,
      cost: 12,
      scoreBefore: 20,
      scoreAfter: 8,
      startedPhase: 'night',
      endedPhase: 'dawn',
    });
    expect(rest.worldDayAfter).toBeGreaterThanOrEqual(beforeDay);
    expect(scenario.actor(bartenderActorId).id).toBe(bartenderActorId);
    scenario.assertWorldIntegrity();
  });

  it('TOWN-HARDEN-019 / TOWN-REGRESSION-012 - paid rest is reachable through bartender interaction', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-harden-019-player-tavern-rest' });
    const { room, entrance } = findGeneratedTownDoor(scenario, { templateId: 'tavern' });

    scenario.setDayPhase('night');
    scenario.enterRoom(room.id, walkableTileAwayFrom(scenario, room.id, entrance, 6));
    walkSnakeIntoDoor(scenario, room, entrance);
    await scenario.advanceActorTicks(3);
    expect(scenario.currentRoom().layer).toMatchObject({
      parentRoomId: room.id,
      templateId: 'tavern',
    });
    const bartender = currentRoomActorWithRole(scenario, 'bartender');

    scenario.game.setScore(0);
    const refusedOption = scenario.game
      .getActorInteractionMenu(bartender.id)
      ?.options.find((option) => option.id === 'tavern-rest');
    expect(refusedOption).toMatchObject({
      label: 'Sleep Until Dawn - 12 score',
      enabled: false,
      reason: 'Tavern rest costs 12 score.',
    });
    expect(await scenario.game.chooseActorInteraction(bartender.id, 'tavern-rest')).toMatchObject({
      ok: false,
      action: 'tavern-rest',
      reason: 'insufficient-score',
      rest: {
        refusedReason: 'insufficient-score',
        scoreBefore: 0,
        scoreAfter: 0,
      },
    });

    scenario.game.setScore(20);
    scenario.game.setFlag('player.health', 1);
    const beforeDay = scenario.game.getAtmosphereState().worldDay;
    const restOption = scenario.game
      .getActorInteractionMenu(bartender.id)
      ?.options.find((option) => option.id === 'tavern-rest');
    expect(restOption).toMatchObject({
      label: 'Sleep Until Dawn - 12 score',
      enabled: true,
    });
    const result = await scenario.game.chooseActorInteraction(bartender.id, 'tavern-rest');

    expect(result).toMatchObject({
      ok: true,
      action: 'tavern-rest',
      actorId: bartender.id,
      rest: {
        cost: 12,
        scoreBefore: 20,
        scoreAfter: 8,
        startedPhase: 'night',
        endedPhase: 'dawn',
        healthBefore: 1,
        healthAfter: 2,
        healed: 1,
        wellRested: true,
      },
    });
    expect(result.ok ? result.rest.worldDayAfter : 0).toBeGreaterThanOrEqual(beforeDay);
    expect(scenario.currentRoom().layer?.templateId).toBe('tavern');
    expect(scenario.game.getActorsInCurrentRoom().some((actor) => actor.role === 'bartender')).toBe(
      true,
    );
    scenario.assertWorldIntegrity();
  });
});

function walkSnakeIntoDoor(
  scenario: HeadlessScenario,
  room: RoomSnapshot,
  entrance: LayerEntrance,
): void {
  const approach = adjacentWalkableTile(room, entrance);
  walkToLocal(scenario, approach, [entrance]);
  scenario.game.forceDirection(entrance.x - approach.x, entrance.y - approach.y);
  scenario.advanceActionTicks(1);
}

function currentRoomActorWithRole(
  scenario: HeadlessScenario,
  role: TownResident['role'],
): NonNullable<ReturnType<HeadlessScenario['game']['getActorsInCurrentRoom']>[number]> {
  const actor = scenario.game.getActorsInCurrentRoom().find((entry) => entry.role === role);
  expect(actor, `Expected ${role} in current room ${scenario.currentRoom().id}`).toBeDefined();
  if (!actor) {
    throw new Error(`Expected ${role} in current room.`);
  }
  return actor;
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
      const key = pointKey(next);
      if (seen.has(key) || forbiddenKeys.has(key) || isSolidTile(room.layout[next.y]?.[next.x])) {
        continue;
      }
      seen.add(key);
      previous.set(key, { point: current, step });
      queue.push(next);
    }
  }
  throw new Error(`No local path from ${pointKey(start)} to ${pointKey(target)} in ${room.id}.`);
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

function townRegistryActorIds(scenario: HeadlessScenario, townId: string): string[] {
  return scenario.game
    .getActorSystem()
    .registry.getByTown(townId)
    .map((actor) => actor.id)
    .sort();
}
