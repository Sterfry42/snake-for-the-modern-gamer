import { describe, expect, it, vi } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';
import type { Actor } from '../../actors/actorTypes.js';
import type { RoomSnapshot } from '../../world/types.js';

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
  it('routes a returning guild contact through the street containing the interior entrance', () => {
    const game = createGame();
    const internals = game as unknown as {
      world: {
        getLayerEntranceByLayerId: (id: string) => { parentRoomId: string } | undefined;
        peekCachedRoom: (id: string) => RoomSnapshot | undefined;
        getTownById: (id: string) => undefined;
      };
      getLoadedActorTravelLegTarget: () => { x: number; y: number } | undefined;
      getNeighborRoomIds: (roomId: string) => string[];
      selectNextActorTravelRoomForActor: (
        actor: Actor,
        room: RoomSnapshot,
        goalRoomId: string,
      ) => string;
    };
    vi.spyOn(internals.world, 'getLayerEntranceByLayerId').mockReturnValue({
      parentRoomId: '2,0,0',
    });
    vi.spyOn(internals, 'getNeighborRoomIds').mockReturnValue(['2,0,0']);
    vi.spyOn(internals, 'getLoadedActorTravelLegTarget').mockReturnValue({ x: 4, y: 4 });
    const actor = game.getActorSystem().registry.ensureTownResidentActor({
      residentId: 'guild-boss',
      name: 'Guild Contact',
      role: 'thiefContact',
      townId: 'seaside',
      currentRoomId: '1,0,0',
      workRoomId: 'layer:townInterior:seaside:thievesGuild',
    });
    const room = { id: '1,0,0', portals: [] } as RoomSnapshot;
    expect(
      internals.selectNextActorTravelRoomForActor(
        actor,
        room,
        'layer:townInterior:seaside:thievesGuild',
      ),
    ).toBe('2,0,0');
  });

});
