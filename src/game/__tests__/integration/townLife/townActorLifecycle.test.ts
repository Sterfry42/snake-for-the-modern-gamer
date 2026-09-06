import { describe, expect, it } from 'vitest';
import { actorIdForTownResident } from '../../../../actors/actorFactory.js';
import type { LayerEntrance } from '../../../../layers/layerTypes.js';
import type { HeadlessScenario } from '../../../../test/headless/headlessScenario.js';
import { createHeadlessScenario } from '../../../../test/headless/headlessScenario.js';
import {
  adjacentWalkableTile,
  findGeneratedTownDoor,
} from '../../../../test/headless/scenarioFixtures.js';
import type { TownResident, TownStructure } from '../../../../world/town.js';
import type { RoomSnapshot } from '../../../../world/types.js';

describe('Town actor lifecycle integration hardening', () => {
  it('TOWN-HARDEN-026 / TOWN-REGRESSION-017 - discovered town owns its whole Actor roster', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-harden-026-full-roster' });
    const { room, entrance } = findGeneratedTownDoor(scenario, { templateId: 'generalStore' });
    const approach = adjacentWalkableTile(room, entrance);

    scenario.enterRoom(room.id, approach);

    const town = requireTown(room);
    const expectedActorIds = expectedTownActorIds(town);
    const registryIds = townRegistryActorIds(scenario, town.id);
    const unvisitedResidents = town.residents.filter(
      (resident) => !residentBelongsToRoom(town, resident, room.id),
    );

    expect(registryIds).toEqual(expectedActorIds);
    expect(unvisitedResidents.length).toBeGreaterThanOrEqual(3);
    for (const resident of unvisitedResidents.slice(0, 3)) {
      expect(registryIds).toContain(actorIdForResident(town, resident));
    }

    scenario.setDayPhase('night');
    await scenario.advanceActorTicks(1);

    for (const resident of unvisitedResidents.slice(0, 3)) {
      const actor = scenario.actor(actorIdForResident(town, resident));
      expect(actor.scheduleGoal, `${actor.id} should have a logical schedule`).toBeDefined();
      expect(actor.goal, `${actor.id} should have a logical goal`).toBeDefined();
    }
    scenario.assertWorldIntegrity();
  });

  it('TOWN-HARDEN-027 / TOWN-REGRESSION-018 - materialization is not resident creation', () => {
    const scenario = createHeadlessScenario({ seed: 'town-harden-027-materialization' });
    const firstDoor = findGeneratedTownDoor(scenario, { templateId: 'generalStore' });
    scenario.enterRoom(firstDoor.room.id, adjacentWalkableTile(firstDoor.room, firstDoor.entrance));

    const town = requireTown(firstDoor.room);
    const target = findUnvisitedResidentDoor(scenario, town, firstDoor.room.id);
    const actorId = actorIdForResident(town, target.resident);
    const beforeActorIds = townRegistryActorIds(scenario, town.id);

    scenario.game.getActorSystem().registry.update(actorId, (actor) => ({
      ...actor,
      memory: [
        ...actor.memory,
        {
          id: 'town-harden-027-memory',
          type: 'test-memory',
          summary: 'Remembered before first materialization.',
          source: 'system',
          intensity: 1,
          tags: ['materialization'],
        },
      ],
    }));

    scenario.enterRoom(target.room.id, adjacentWalkableTile(target.room, target.entrance));
    expect(scenario.game.enterNearbyTownBuildingDoor().ok).toBe(true);

    const afterActorIds = townRegistryActorIds(scenario, town.id);
    expect(afterActorIds).toEqual(beforeActorIds);
    expect(scenario.currentRoom().id).toBe(target.entrance.layerId);
    expect(scenario.game.getActorsInCurrentRoom().map((actor) => actor.id)).toContain(actorId);
    expect(
      scenario.actor(actorId).memory.some((memory) => memory.id === 'town-harden-027-memory'),
    ).toBe(true);
    scenario.assertWorldIntegrity();
  });
});

function requireTown(room: RoomSnapshot): TownStructure {
  expect(room.town).toBeDefined();
  if (!room.town) {
    throw new Error(`Expected room ${room.id} to belong to a town.`);
  }
  return room.town;
}

function actorIdForResident(town: TownStructure, resident: TownResident): string {
  return resident.actorId ?? actorIdForTownResident(town.id, resident.id, resident.role);
}

function expectedTownActorIds(town: TownStructure): string[] {
  return town.residents.map((resident) => actorIdForResident(town, resident)).sort();
}

function townRegistryActorIds(scenario: HeadlessScenario, townId: string): string[] {
  return scenario.game
    .getActorSystem()
    .registry.getByTown(townId)
    .map((actor) => actor.id)
    .sort();
}

function residentBelongsToRoom(
  town: TownStructure,
  resident: TownResident,
  roomId: string,
): boolean {
  return (
    resident.homeRoomId === roomId ||
    resident.workRoomId === roomId ||
    town.residentPresences?.some(
      (presence) => presence.residentId === resident.id && presence.roomId === roomId,
    ) === true
  );
}

function findUnvisitedResidentDoor(
  scenario: HeadlessScenario,
  town: TownStructure,
  visitedRoomId: string,
): { room: RoomSnapshot; entrance: LayerEntrance; resident: TownResident } {
  for (const building of town.buildings) {
    if (!building.enterable || !building.templateId || building.roomId === visitedRoomId) {
      continue;
    }
    const resident = town.residents.find(
      (entry) =>
        entry.id === building.ownerResidentId ||
        (building.ownerResidentId === undefined &&
          building.ownerResidentRole !== undefined &&
          entry.role === building.ownerResidentRole),
    );
    if (!resident) {
      continue;
    }
    const room = scenario.getRoom(building.roomId);
    const entrance = room.layerEntrances?.find((entry) => entry.townBuildingId === building.id);
    if (entrance && !entrance.locked) {
      return { room, entrance, resident };
    }
  }
  throw new Error('No unvisited resident-owned door found.');
}
