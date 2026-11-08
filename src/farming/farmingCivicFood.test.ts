import { describe, expect, it } from 'vitest';
import { createHeadlessScenario } from '../test/headless/headlessScenario.js';
import { findGeneratedTownDoor } from '../test/headless/scenarioFixtures.js';
import { createTownRuntimeState } from '../world/townRuntime.js';
import { CivicService } from '../civic/civicService.js';
import { resolveSoilSubstrate } from './soilResolver.js';
import { ConstructionState } from '../building/constructionState.js';
import { FARM_RECIPES, getCrop, produceItem } from './cropCatalog.js';
import { AuthoritativeGameSession } from '../session/AuthoritativeGameSession.js';

describe('municipal farming follows the actual office holder', () => {
  it('preserves crops through an election and grants public access only to designated beds', () => {
    const scenario = createHeadlessScenario({ seed: 'town-civic-001-campaign-round' });
    const hall = findGeneratedTownDoor(scenario, { templateId: 'townHall' });
    const town = hall.room.town;
    let room = hall.room;
    if (!town) throw new Error('Missing generated town');
    let target: { x: number; y: number } | undefined;
    const [hallX, hallY] = hall.room.id.split(',').map(Number);
    const candidates = Array.from(
      { length: 49 },
      (_, i) => `${hallX! + (i % 7) - 3},${hallY! + Math.floor(i / 7) - 3},0`,
    );
    for (const id of candidates) {
      room = scenario.getRoom(id);
      if (room.town?.id !== town.id) continue;
      for (let y = 2; y < room.layout.length - 2 && !target; y++) {
        for (let x = 2; x < room.layout[y]!.length - 2; x++) {
          if (
            resolveSoilSubstrate(room, x, y, true) &&
            !scenario.game
              .getActorSystem()
              .getActorsInRoom(room.id)
              .some((actor) => actor.presence?.position.x === x && actor.presence.position.y === y)
          ) {
            target = { x, y };
            break;
          }
        }
      }
      if (target) break;
    }
    if (!target) throw new Error('Missing legal public soil');
    room.vegetation ??= [];
    room.vegetation.push({ ...target, variant: 'grass-1' });
    scenario.enterRoom(room.id, target);
    const game = scenario.game,
      playerId = game.getLocalPlayerId();
    const runtime = createTownRuntimeState(town, new CivicService());
    const elect = (id: string) =>
      game.setFlag(`town.runtime.${town.id}`, {
        ...runtime,
        civic: { ...runtime.civic, mayor: { kind: 'player', playerId: id } },
      });
    game.getInventory().addItem('farm-hoe');
    game.getInventory().addItem('seed-radish');
    elect('other-town-mayor');
    expect(game.performFarmAction({ action: 'till' }).ok).toBe(false);
    elect(playerId);
    const tilled = game.performFarmAction({ action: 'till' });
    expect(tilled.ok, tilled.message).toBe(true);
    expect(game.performFarmAction({ action: 'plant', seedItemId: 'seed-radish' }).ok).toBe(true);
    const crop = game.getFarmCells()[0]!.crop!.instanceId;
    elect('successor');
    expect(game.performFarmAction({ action: 'water' }).ok).toBe(false);
    expect(game.getFarmCells()[0]!.crop!.instanceId).toBe(crop);
    expect(game.designateMunicipalFarm().ok).toBe(false);
    elect(playerId);
    expect(game.designateMunicipalFarm().ok).toBe(true);
    elect('successor');
    game.getInventory().addItem('watering-can');
    expect(game.performFarmAction({ action: 'water' }).ok).toBe(true);
    expect(game.purchaseCurrentRoomClaim().ok).toBe(false);
    game.placeSnakeBodyAtLocal(hall.room.id, hall.entrance, { x: 1, y: 0 });
    elect(playerId);
    expect(game.performFarmAction({ action: 'till' }).ok).toBe(false);
    expect(game.getFarmCells(room.id)).toHaveLength(1);
  });

  it('never grants inherited object properties as permissions', () => {
    const construction = new ConstructionState();
    construction.claimRoom('1,1,0', 'owner');
    construction.grant('1,1,0', 'owner', 'friend', 'farm', true);
    expect(construction.can('1,1,0', 'toString', 'farm')).toBe(false);
    expect(construction.grant('1,1,0', 'owner', 'toString', 'farm', true)).toBe(true);
    expect(construction.can('1,1,0', 'toString', 'farm')).toBe(true);
    expect(construction.can('1,1,0', 'toString', 'harvest')).toBe(false);
    expect(construction.grant('1,1,0', 'owner', '__proto__', 'farm', true)).toBe(false);
  });
});

describe('farm food uses authoritative inventory and existing survival effects', () => {
  it.each(FARM_RECIPES)(
    'cooks and consumes $id once, retaining quality of unused ingredients',
    async (recipe) => {
      const scenario = createHeadlessScenario({ seed: 'farm-food' });
      const game = scenario.game,
        session = new AuthoritativeGameSession({ game });
      const crop = getCrop(recipe.input)!;
      const input = produceItem(crop, 'excellent'),
        output = `food-${recipe.id}`;
      game.getInventory().addItem(input, 2);
      expect(game.cookRecipe(recipe.id).ok).toBe(false);
      expect(game.getInventory().getItemCount(input)).toBe(2);
      game.moveToRoom('0,-1,0', { x: 10, y: 10 });
      expect(
        (
          await session.executeCommand({
            type: 'inventoryAction',
            action: 'cook',
            recipeId: recipe.id,
            playerId: game.getLocalPlayerId(),
          })
        ).ok,
      ).toBe(true);
      expect(game.getInventory().getItemCount(input)).toBe(1);
      expect(game.getInventory().getItemCount(output)).toBe(1);
      game.setFlag('timeSinceEat', 100);
      game.setFlag('player.health', 1);
      const use = () =>
        session.executeCommand({
          type: 'useItem',
          itemId: output,
          playerId: game.getLocalPlayerId(),
        });
      expect((await use()).ok).toBe(true);
      expect(game.getFlag('timeSinceEat')).toBe(10);
      expect(game.getPlayerHealth().current).toBe(2);
      expect(game.getInventory().getItemCount(output)).toBe(0);
      expect((await use()).ok).toBe(false);
      expect(game.getPlayerHealth().current).toBe(2);
    },
  );
  it('consumes raw ordinary produce once and restores 25 hunger', async () => {
    const scenario = createHeadlessScenario({ seed: 'farm-raw-food' });
    const game = scenario.game,
      session = new AuthoritativeGameSession({ game });
    game.getInventory().addItem('produce-radish');
    game.setFlag('timeSinceEat', 100);
    const command = {
      type: 'useItem' as const,
      itemId: 'produce-radish',
      playerId: game.getLocalPlayerId(),
    };
    expect((await session.executeCommand(command)).ok).toBe(true);
    expect(game.getFlag('timeSinceEat')).toBe(75);
    expect((await session.executeCommand(command)).ok).toBe(false);
    expect(game.getFlag('timeSinceEat')).toBe(75);
  });
});
