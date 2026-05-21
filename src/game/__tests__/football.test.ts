import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  });
});

function createGame(): SnakeGame {
  return new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
}

describe('Liberty footballs', () => {
  it('spawns and moves footballs one tile per step', () => {
    const game = createGame();
    const football = game.spawnFootball('0,0,0', { x: 5, y: 5 }, { x: 1, y: 0 });

    expect(football).not.toBeNull();
    expect(game.getFootballs('0,0,0')[0]?.position).toEqual({ x: 6, y: 5 });

    game.stepFootballs({ x: 0, y: 0 });

    expect(game.getFootballs('0,0,0')[0]?.position).toEqual({ x: 7, y: 5 });
  });

  it('lets the snake catch a football by entering its tile', () => {
    const game = createGame();
    game.spawnFootball('0,0,0', { x: 5, y: 5 }, { x: 1, y: 0 });

    expect(game.catchFootball('0,0,0', { x: 6, y: 5 })).toBe(true);
    expect(game.getFootballs('0,0,0')).toHaveLength(0);
    expect(game.getScore()).toBe(15);
  });

  it('lets the snake catch a football when the ball moves onto the head', () => {
    const game = createGame();
    game.spawnFootball('0,0,0', { x: 5, y: 5 }, { x: 1, y: 0 });

    game.stepFootballs({ x: 7, y: 5 });

    expect(game.getFootballs('0,0,0')).toHaveLength(0);
    expect(game.getScore()).toBe(15);
  });

  it('grounds footballs when they hit walls or bounds, then expires them', () => {
    const game = createGame();
    const room = game.getRoom('0,0,0');
    const rows = room.layout.map((row) => row.split(''));
    rows[5]![7] = '#';
    room.layout = rows.map((row) => row.join(''));

    game.spawnFootball('0,0,0', { x: 5, y: 5 }, { x: 1, y: 0 });
    game.stepFootballs({ x: 0, y: 0 });

    expect(game.getFootballs('0,0,0')[0]?.state).toBe('grounded');

    game.stepFootballs({ x: 0, y: 0 });
    game.stepFootballs({ x: 0, y: 0 });
    game.stepFootballs({ x: 0, y: 0 });
    game.stepFootballs({ x: 0, y: 0 });

    expect(game.getFootballs('0,0,0')).toHaveLength(0);
  });
});
