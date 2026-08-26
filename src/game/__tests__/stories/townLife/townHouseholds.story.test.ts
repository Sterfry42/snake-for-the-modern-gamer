import { describe, expect, it } from 'vitest';
import {
  HeadlessScenario,
  createHeadlessScenario,
} from '../../../../test/headless/headlessScenario.js';
import { adjacentWalkableTile } from '../../../../test/headless/scenarioFixtures.js';
import type { RoomSnapshot } from '../../../../world/types.js';

describe('Town life household hardening stories', () => {
  it('TOWN-HARDEN-035 - player residential exits dematerialize actors without moving them outside', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-harden-035-residential-exit-presence' });
    scenario.setDayPhase('night');
    const residence = findResidentialInteriorWithActor(scenario);

    expect(residence).toBeDefined();
    if (!residence) {
      throw new Error('Expected a residential interior with at least one actor.');
    }

    const { room, entrance, actorIds, interiorRoomId } = residence;
    for (let cycle = 0; cycle < 6; cycle += 1) {
      for (const actorId of actorIds) {
        const actor = scenario.actor(actorId);
        expect(actor.currentRoomId).toBe(interiorRoomId);
        expect(actor.presence?.roomId).toBe(interiorRoomId);
        expect(actor.presence?.materialized).toBe(true);
      }

      exitCurrentLayerThroughDoor(scenario);
      expect(scenario.currentRoom().id).toBe(room.id);
      expect(scenario.game.getActorsInCurrentRoom().map((actor) => actor.id)).not.toEqual(
        expect.arrayContaining(actorIds),
      );
      for (const actorId of actorIds) {
        const actor = scenario.actor(actorId);
        expect(actor.currentRoomId).toBe(interiorRoomId);
        expect(actor.presence).toBeUndefined();
      }

      await scenario.advanceActorTicks(8);
      for (const actorId of actorIds) {
        const actor = scenario.actor(actorId);
        expect(actor.currentRoomId).toBe(interiorRoomId);
        expect(actor.presence).toBeUndefined();
      }

      scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));
      expect(scenario.game.enterNearbyTownBuildingDoor().ok).toBe(true);
      await scenario.advanceActorTicks(3);
      expect(scenario.currentRoom().id).toBe(interiorRoomId);
      expect(scenario.game.getActorsInCurrentRoom().map((actor) => actor.id)).toEqual(
        expect.arrayContaining(actorIds),
      );
    }
    scenario.assertWorldIntegrity();
  });

  it('TOWN-HARDEN-005 - visible residential doors have one-to-one entrance metadata across 50 seeds', () => {
    for (let index = 0; index < 50; index += 1) {
      const seed = `town-harden-005-residential-doors-${index}`;
      const scenario = createHeadlessScenario({ seed });
      const residentialRooms = generatedTownRooms(scenario).filter(
        (room) => room.town?.districtByRoomId[room.id] === 'residentialStreet',
      );

      expect(residentialRooms.length, seed).toBeGreaterThan(0);
      for (const room of residentialRooms) {
        const visibleDoors = visibleResidentialDoors(room);
        const entrances = residentialEntrances(room);

        expect(entrances.map((entrance) => `${entrance.x},${entrance.y}`).sort(), seed).toEqual(
          visibleDoors.map((door) => `${door.x},${door.y}`).sort(),
        );
        expect(new Set(entrances.map((entrance) => entrance.id)).size, seed).toBe(
          visibleDoors.length,
        );
        expect(new Set(entrances.map((entrance) => entrance.layerId)).size, seed).toBe(
          visibleDoors.length,
        );
      }
    }
  }, 30_000);

  it('TOWN-HARDEN-006 / TOWN-REGRESSION-004 - three-house districts expose distinct stable household interiors', () => {
    const scenario = createHeadlessScenario({ seed: 'town-regression-004-three-households' });
    const residentialRoom = generatedTownRooms(scenario).find(
      (room) => residentialEntrances(room).length >= 3,
    );

    expect(residentialRoom).toBeDefined();
    if (!residentialRoom) return;
    const entrances = residentialEntrances(residentialRoom).slice(0, 3);
    const enteredLayerIds = new Map<string, string>();

    for (const entrance of entrances) {
      scenario.enterRoom(residentialRoom.id, adjacentWalkableTile(residentialRoom, entrance));
      const entered = scenario.game.enterNearbyTownBuildingDoor();

      expect(entered.ok, entrance.id).toBe(true);
      expect(scenario.currentRoom().layer).toMatchObject({
        entranceId: entrance.id,
        parentRoomId: residentialRoom.id,
        templateId: 'residentialHome',
      });
      enteredLayerIds.set(entrance.id, scenario.currentRoom().id);
      exitCurrentLayerThroughDoor(scenario);
      expect(scenario.currentRoom().id).toBe(residentialRoom.id);
      expect(scenario.game.getSnakeBody()[0]).toEqual(
        worldPosition(residentialRoom, entrance.returnPosition),
      );
    }

    expect(new Set(enteredLayerIds.values()).size).toBe(entrances.length);

    const reloaded = HeadlessScenario.fromSave(scenario.game.getSaveData());
    for (const entrance of entrances) {
      reloaded.enterRoom(residentialRoom.id, adjacentWalkableTile(residentialRoom, entrance));
      expect(reloaded.game.enterNearbyTownBuildingDoor().ok).toBe(true);
      expect(reloaded.currentRoom().id).toBe(enteredLayerIds.get(entrance.id));
      exitCurrentLayerThroughDoor(reloaded);
    }
    reloaded.assertWorldIntegrity();
  });
});

function generatedTownRooms(scenario: HeadlessScenario, radius = 10): RoomSnapshot[] {
  const rooms: RoomSnapshot[] = [];
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      const room = scenario.getRoom(`${x},${y},0`);
      if (room.town) {
        rooms.push(room);
      }
    }
  }
  return rooms;
}

function findResidentialInteriorWithActor(scenario: HeadlessScenario):
  | {
      room: RoomSnapshot;
      entrance: ReturnType<typeof residentialEntrances>[number];
      actorIds: string[];
      interiorRoomId: string;
    }
  | undefined {
  for (const room of generatedTownRooms(scenario)) {
    for (const entrance of residentialEntrances(room)) {
      scenario.enterRoom(room.id, adjacentWalkableTile(room, entrance));
      expect(scenario.game.enterNearbyTownBuildingDoor().ok).toBe(true);
      const actors = scenario.game.getActorsInCurrentRoom();
      if (actors.length > 0) {
        return {
          room,
          entrance,
          actorIds: actors.map((actor) => actor.id),
          interiorRoomId: scenario.currentRoom().id,
        };
      }
      exitCurrentLayerThroughDoor(scenario);
    }
  }
  return undefined;
}

function visibleResidentialDoors(room: RoomSnapshot): Array<{ x: number; y: number }> {
  const doors: Array<{ x: number; y: number }> = [];
  room.layout.forEach((row, y) => {
    [...row].forEach((tile, x) => {
      if (tile === 'h' || tile === 'j') {
        doors.push({ x, y });
      }
    });
  });
  return doors;
}

function residentialEntrances(room: RoomSnapshot) {
  return (room.layerEntrances ?? []).filter(
    (entrance) => entrance.templateId === 'residentialHome',
  );
}

function exitCurrentLayerThroughDoor(scenario: HeadlessScenario): void {
  const interior = scenario.currentRoom();
  const exit = interior.layer?.exit;
  expect(exit).toBeDefined();
  if (!exit) return;
  const beforeExit = adjacentWalkableTile(interior, exit);
  expect(beforeExit).not.toEqual(exit);
  placeSnakeForMovement(scenario, interior.id, beforeExit, {
    x: exit.x - beforeExit.x,
    y: exit.y - beforeExit.y,
  });
  scenario.game.setFlag('traversal.manualResumePending', undefined);
  scenario.game.setFlag('traversal.exitDirectionLockTicks', undefined);
  scenario.game.forceDirection(exit.x - beforeExit.x, exit.y - beforeExit.y);
  scenario.advanceActionTicks(1);
}

function worldPosition(
  room: RoomSnapshot,
  local: { x: number; y: number },
): { x: number; y: number } {
  const [roomX = 0, roomY = 0] = room.id.split(',').map(Number);
  return {
    x: local.x + roomX * 32,
    y: local.y + roomY * 24,
  };
}

function placeSnakeForMovement(
  scenario: HeadlessScenario,
  roomId: string,
  local: { x: number; y: number },
  direction: { x: number; y: number },
): void {
  const room = scenario.game.getRoom(roomId);
  const world = room.id.startsWith('layer:') ? local : worldPosition(room, local);
  const loaded = scenario.game.loadFromSaveData({
    ...scenario.game.getSaveData(),
    snakeRoomId: roomId,
    snakeBody: Array.from({ length: scenario.game.getSnakeLength() }, () => ({ ...world })),
    snakeDirection: direction,
  });
  expect(loaded).toBe(true);
}
