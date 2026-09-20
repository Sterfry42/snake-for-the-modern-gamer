import { defaultGameConfig } from '../../config/gameConfig.js';
import { SnakeGame } from '../../game/snakeGame.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { LocalGameSession } from '../LocalGameSession.js';

function createGame(): SnakeGame {
  return new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
}

describe('boss snapshot presentation', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    });
  });

  it('carries bosses through the client snapshot without exposing authoritative boss state', () => {
    const game = createGame();
    game.reset({ preserveRunSeed: true });
    const roomId = game.getCurrentRoom().id;
    game.bosses.spawnBoss(roomId, 'freak-dennis', game.getRoom(roomId));
    const authoritativeBoss = game.getBosses(roomId)[0];
    expect(authoritativeBoss).toBeDefined();

    const session = new LocalGameSession({ game });
    const snapshot = session.getSnapshot();
    const snapshotBoss = snapshot.viewport.rooms[roomId]?.bosses?.[0];

    expect(snapshotBoss).toBeDefined();
    expect(snapshotBoss?.kind).toBe('freak-dennis');
    expect(snapshotBoss?.body).toEqual(authoritativeBoss?.body);

    const authoritativeHeadX = authoritativeBoss!.body[0]!.x;
    snapshotBoss!.body[0]!.x = 9999;

    expect(game.getBosses(roomId)[0]?.body[0]?.x).toBe(authoritativeHeadX);
  });
});
