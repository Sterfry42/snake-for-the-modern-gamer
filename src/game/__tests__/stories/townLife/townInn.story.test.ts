import { describe, expect, it } from 'vitest';
import type { LayerEntrance } from '../../../../layers/layerTypes.js';
import type { HeadlessScenario } from '../../../../test/headless/headlessScenario.js';
import { createHeadlessScenario } from '../../../../test/headless/headlessScenario.js';
import {
  adjacentWalkableTile,
  findGeneratedTownDoor,
} from '../../../../test/headless/scenarioFixtures.js';
import type { RoomSnapshot } from '../../../../world/types.js';

describe('Town life inn hardening stories', () => {
  it('TOWN-HARDEN-019 / TOWN-REGRESSION-012 - paid inn rest is reachable through inn gameplay interaction', async () => {
    const scenario = createHeadlessScenario({ seed: 'town-harden-019-player-inn-rest' });
    const { room, entrance } = findGeneratedTownDoor(scenario, { templateId: 'inn' });

    moveSnakeIntoDoor(scenario, room, entrance);
    expect(scenario.currentRoom().layer).toMatchObject({
      parentRoomId: room.id,
      templateId: 'inn',
    });

    scenario.setDayPhase('night');
    scenario.game.setScore(0);
    expect(scenario.game.getCurrentInnServiceView(12)).toMatchObject({
      available: false,
      cost: 12,
      score: 0,
      reason: 'Inn rest costs 12 score.',
    });
    expect(await scenario.game.chooseCurrentInnRest(12)).toMatchObject({
      ok: false,
      refusedReason: 'insufficient-score',
      scoreBefore: 0,
      scoreAfter: 0,
    });

    scenario.game.setScore(20);
    scenario.game.setFlag('player.health', 1);
    const beforeDay = scenario.game.getAtmosphereState().worldDay;
    const rest = await scenario.game.chooseCurrentInnRest(12);

    expect(rest).toMatchObject({
      ok: true,
      cost: 12,
      scoreBefore: 20,
      scoreAfter: 8,
      startedPhase: 'night',
      endedPhase: 'dawn',
      healthBefore: 1,
      healthAfter: 2,
      healed: 1,
      wellRested: true,
    });
    expect(rest.worldDayAfter).toBeGreaterThanOrEqual(beforeDay);
    expect(scenario.currentRoom().layer?.templateId).toBe('inn');
    expect(scenario.game.getActorsInCurrentRoom().some((actor) => actor.role === 'innkeeper')).toBe(
      true,
    );
    scenario.assertWorldIntegrity();
  });
});

function moveSnakeIntoDoor(
  scenario: HeadlessScenario,
  room: RoomSnapshot,
  entrance: LayerEntrance,
): void {
  const approach = adjacentWalkableTile(room, entrance);
  placeSnakeForMovement(scenario, room.id, approach, {
    x: entrance.x - approach.x,
    y: entrance.y - approach.y,
  });
  scenario.game.setFlag('traversal.manualResumePending', undefined);
  scenario.game.setFlag('traversal.exitDirectionLockTicks', undefined);
  scenario.game.forceDirection(entrance.x - approach.x, entrance.y - approach.y);
  scenario.advanceActionTicks(1);
}

function placeSnakeForMovement(
  scenario: HeadlessScenario,
  roomId: string,
  local: { x: number; y: number },
  direction: { x: number; y: number },
): void {
  const room = scenario.game.getRoom(roomId);
  const [roomX = 0, roomY = 0] = room.id.split(',').map(Number);
  const world = {
    x: local.x + roomX * scenario.game.config.grid.cols,
    y: local.y + roomY * scenario.game.config.grid.rows,
  };
  const loaded = scenario.game.loadFromSaveData({
    ...scenario.game.getSaveData(),
    snakeRoomId: roomId,
    snakeBody: Array.from({ length: scenario.game.getSnakeLength() }, () => ({ ...world })),
    snakeDirection: direction,
  });
  expect(loaded).toBe(true);
}
