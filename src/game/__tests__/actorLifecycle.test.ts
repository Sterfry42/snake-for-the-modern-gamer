import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

function createGame(): SnakeGame {
  return new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
}

describe('Actor simulation lifecycle', () => {
  it('keeps room, minimap-provider, actor, debug, and save reads actor-pure', () => {
    const game = createGame();
    game.getActorSystem().registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      townId: 'eastmere',
      currentRoomId: game.getCurrentRoom().id,
    });
    const before = JSON.stringify(game.getActorSystem().toSaveData());

    for (let index = 0; index < 100; index += 1) {
      game.getRoom('0,0,0');
      game.getRoom('1,0,0');
      game.getActorsInCurrentRoom();
      game.getDebugSnapshot();
      game.getSaveData();
    }

    expect(JSON.stringify(game.getActorSystem().toSaveData())).toBe(before);
    expect(game.getActorSystem().getTickCount()).toBe(0);
  });

  it('advances exactly once per explicit Actor clock call regardless of intervening reads', async () => {
    const game = createGame();

    for (let index = 0; index < 10; index += 1) {
      for (let read = 0; read < 25; read += 1) {
        game.getRoom(`${read % 3},${Math.floor(read / 3) % 3},0`);
        game.getActorsInCurrentRoom();
      }
      await game.actorClockStep(100);
    }

    expect(game.getActorSystem().getTickCount()).toBe(10);
  });
});
