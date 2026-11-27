import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import {
  LAYER_EXIT_TILE,
  type LayerEntrance,
  type LayerTemplateId,
} from '../../layers/layerTypes.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { createHeadlessScenario } from '../../test/headless/headlessScenario.js';
import { findGeneratedTownDoor } from '../../test/headless/scenarioFixtures.js';
import { TOWN_INTERIORS } from '../../world/townInteriorDefinitions.js';
import { SnakeGame } from '../snakeGame.js';

describe('SnakeGame layer traversal', () => {
  it('lets the next manual input choose direction after stepping back through a ladder', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const origin = game.getRoom('0,0,0');
    const upper = game.getRoom('0,0,1');
    origin.layout = origin.layout.map((row) => '.'.repeat(row.length));
    upper.layout = upper.layout.map((row) => '.'.repeat(row.length));
    origin.portals = [{ x: 6, y: 12, destRoomId: upper.id, destX: 5, destY: 12 }];
    game.placeSnakeBodyAtLocal(origin.id, { x: 5, y: 12 }, { x: 1, y: 0 });
    expect(game.actionStep(false)).toMatchObject({ status: 'alive', roomChanged: true });
    expect(game.getCurrentRoom().id).toBe(upper.id);
    expect(game.canReturnFromManualResumePause()).toBe(true);
    expect(game.returnFromManualResumePause()).toEqual({ ok: true });
    expect(game.getCurrentRoom().id).toBe(origin.id);
    expect(game.canReturnFromManualResumePause()).toBe(false);
    expect(game.getFlag<boolean>('traversal.manualResumePending')).toBe(true);
    expect(game.getFlag<number>('traversal.exitDirectionLockTicks')).toBeUndefined();

    game.forceDirection(0, -1);

    expect(game.getDirection()).toEqual({ x: 0, y: -1 });
  });

  it.each([...Object.values(TOWN_INTERIORS).map(({ templateId }) => templateId), 'inn' as const])(
    'returns from %s on a first visit, from the exit tile and from the interaction',
    (templateId) => {
      const { game, room, entrance } = townDoorFixture(templateId);
      game.forceDirection(1, 0);
      const step = game.actionStep(false);
      expect(step.roomChanged).toBe(true);
      const interior = game.getCurrentRoom();
      expect(interior.id).toBe(entrance.layerId);
      const { spawn, exit } = interior.layer!;
      expect(interior.layout[exit.y][exit.x]).toBe(LAYER_EXIT_TILE);
      expect(game.getSnakeBody()[0]).toEqual({ x: exit.x, y: exit.y - 1 });
      expect(game.getSnakeBody()[0]).toEqual(spawn);
      expect(game.returnFromManualResumePause()).toEqual({ ok: true });
      expect(game.getCurrentRoom().id).toBe(room.id);
      expect(game.getFlag('layers.active')).toBeUndefined();
      expect(game.getFlag('traversal.exitDirectionLockTicks')).toBeUndefined();
      expect(game.getFlag('ui.questInteraction')).toEqual({ message: 'You step back outside.' });
      expect(game.canReturnFromManualResumePause()).toBe(false);
      expect(game.returnFromManualResumePause()).toMatchObject({ ok: false });

      expect(game.enterNearbyTownBuildingDoor()).toMatchObject({ ok: true });
      expect(game.getCurrentRoom()).toBe(interior);
      game.forceDirection(0, 1);
      expect(game.actionStep(false)).toMatchObject({ status: 'alive', roomChanged: true });
      expect(game.getCurrentRoom().id).toBe(room.id);
      expect(game.getFlag('layers.active')).toBeUndefined();

      expect(game.enterNearbyTownBuildingDoor()).toMatchObject({ ok: true });
      game.setFlag('internal.previousSnapshot', undefined);
      expect(game.returnFromManualResumePause()).toEqual({ ok: true });
      expect(game.getCurrentRoom().id).toBe(room.id);
      expect(game.resolveRoomPosition(game.getSnakeBody()[0])).toMatchObject({
        localX: entrance.returnPosition.x,
        localY: entrance.returnPosition.y,
      });
    },
  );

  it('keeps a shared interior, its revision and its actors when one occupant leaves', () => {
    const { game, room, entrance } = townDoorFixture('mapper');
    expect(game.enterNearbyTownBuildingDoor()).toMatchObject({ ok: true });
    const interior = game.getCurrentRoom();
    // A persistent edit would have disappeared when entry or exit deleted the cache entry.
    interior.treasure = { x: 11, y: 11 };
    const actor = game.getActorsInCurrentRoom().find((item) => item.presence?.materialized);
    expect(actor).toBeDefined();
    const playerId = game.getLocalPlayerId();
    game.addConnectedPlayer('visitor', 'Visitor');
    game.runForPlayer('visitor', () => {
      game.placeSnakeBodyAtLocal(room.id, { x: entrance.x - 1, y: entrance.y }, { x: 1, y: 0 });
      expect(game.enterNearbyTownBuildingDoor()).toMatchObject({ ok: true });
      expect(game.getSnakeBody()[0]).not.toEqual(game.getPlayer(playerId)?.snake.bodySegments[0]);
    });
    const revision = game.getNetworkRoomView().roomRevisions[interior.id];
    expect(game.returnFromManualResumePause()).toEqual({ ok: true });
    expect(game.getCurrentRoom().id).toBe(room.id);
    game.runForPlayer('visitor', () => {
      expect(game.getCurrentRoom()).toBe(interior);
      expect(game.getCurrentRoom().treasure).toEqual({ x: 11, y: 11 });
      expect(game.getNetworkRoomView().roomRevisions[interior.id]).toBe(revision);
      expect(game.getActorsInCurrentRoom().find((item) => item.id === actor?.id)?.presence).toEqual(
        actor?.presence,
      );
      expect(game.getFlag('layers.active')).toMatchObject({ layerId: interior.id });
      expect(game.returnFromManualResumePause()).toMatchObject({
        ok: false,
        reason: 'Someone is blocking the exit outside.',
      });
      expect(game.getCurrentRoom()).toBe(interior);
    });
    game.placeSnakeBodyAtLocal(room.id, { x: 5, y: 5 }, { x: 1, y: 0 });
    game.runForPlayer('visitor', () => {
      expect(game.returnFromManualResumePause()).toEqual({ ok: true });
      expect(game.getCurrentRoom().id).toBe(room.id);
    });
    expect(game.getRoom(interior.id)).toBe(interior);
  });
});

function townDoorFixture(templateId: LayerTemplateId) {
  const scenario = createHeadlessScenario({ seed: 'town-harden-001-mapper-movement-door' });
  const { room, entrance: generated } = findGeneratedTownDoor(scenario, { templateId: 'mapper' });
  const parentX = 11;
  const parentY = 14;
  const entrance: LayerEntrance = {
    id: `test-door:${templateId}`,
    layerId: `layer:townInterior:${room.town!.id}:traversal:${templateId}`,
    parentRoomId: room.id,
    kind: 'townInterior',
    templateId,
    townBuildingId: generated.townBuildingId,
    x: parentX,
    y: parentY,
    returnPosition: { x: parentX - 1, y: parentY },
  };
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  room.portals = [];
  room.layerEntrances = [entrance];
  const { game } = scenario;
  game.placeSnakeBodyAtLocal(room.id, entrance.returnPosition, { x: 1, y: 0 });
  return { game, room, entrance };
}
