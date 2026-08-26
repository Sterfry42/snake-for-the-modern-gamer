import { describe, expect, it } from 'vitest';
import type { LayerEntrance } from '../../../../layers/layerTypes.js';
import type { HeadlessScenario } from '../../../../test/headless/headlessScenario.js';
import { createHeadlessScenario } from '../../../../test/headless/headlessScenario.js';
import {
  adjacentWalkableTile,
  findGeneratedTownDoor,
} from '../../../../test/headless/scenarioFixtures.js';
import type { RoomSnapshot } from '../../../../world/types.js';

describe('Town life door hardening stories', () => {
  it('TOWN-HARDEN-001 / TOWN-REGRESSION-001 - closed mapper doors block movement entry and open mapper doors allow it', () => {
    const scenario = createHeadlessScenario({ seed: 'town-harden-001-mapper-movement-door' });
    const { room, entrance } = findGeneratedTownDoor(scenario, { templateId: 'mapper' });

    scenario.setDayPhase('night');
    moveSnakeIntoDoor(scenario, room, entrance);

    expect(scenario.currentRoom().id).toBe(room.id);
    expect(scenario.currentRoom().layer).toBeUndefined();
    expect(scenario.game.getFlag('layers.active')).toBeUndefined();
    expect(scenario.game.getFlag<{ message?: string }>('ui.questInteraction')?.message).toContain(
      'closed',
    );
    expect(currentRoomEnabledShopActors(scenario)).toEqual([]);

    scenario.setDayPhase('day');
    moveSnakeIntoDoor(scenario, room, entrance);

    expect(scenario.currentRoom().layer).toMatchObject({
      kind: 'townInterior',
      parentRoomId: room.id,
      templateId: 'mapper',
    });
    expect(scenario.game.getFlag('layers.active')).toMatchObject({
      entranceId: entrance.id,
      parentRoomId: room.id,
    });
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

function currentRoomEnabledShopActors(scenario: HeadlessScenario): string[] {
  return scenario.game
    .getActorsInCurrentRoom()
    .filter((actor) =>
      scenario.game
        .getActorInteractionMenu(actor.id)
        ?.options.some((option) => option.id === 'shop' && option.enabled),
    )
    .map((actor) => actor.id);
}
