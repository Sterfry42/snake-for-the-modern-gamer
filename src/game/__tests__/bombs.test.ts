import { defaultGameConfig } from '../../config/gameConfig.js';
import type { Vector2Like } from '../../core/math.js';
import type { EnemyInstance } from '../../systems/enemies.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

interface SnakeGameBombTestAccess {
  tickBombs(roomsChanged: Set<string>): boolean;
  enemies: {
    spawnHostileNpc(
      roomId: string,
      position: Vector2Like,
      name: string,
      hearts: number,
      idSuffix?: string,
      currentHearts?: number,
      actorId?: string,
    ): EnemyInstance;
  };
}

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

function tickBombFuse(game: SnakeGame): boolean {
  const access = game as unknown as SnakeGameBombTestAccess;
  let died = false;
  for (let i = 0; i < 30; i += 1) {
    died = access.tickBombs(new Set<string>()) || died;
  }
  return died;
}

describe('bombs', () => {
  it('places an inventory bomb at the snake head and damages the player on detonation', () => {
    const game = createGame();
    game.addItem('bomb', 1);
    game.setFlag('player.health', 3);

    const result = game.useInventoryItem('bomb');

    expect(result.ok).toBe(true);
    expect(game.getInventory().getItemCount('bomb')).toBe(0);
    expect(game.getBombs(game.getCurrentRoom().id)).toHaveLength(1);

    const died = tickBombFuse(game);

    expect(died).toBe(false);
    expect(game.getPlayerHealth().current).toBe(1);
    expect(game.getBombs(game.getCurrentRoom().id)).toHaveLength(0);
  });

  it('throws bombs diagonally with the slingshot and breaks walls in the blast radius', () => {
    const game = createGame();
    const room = game.getCurrentRoom();
    const head = game.getSnakeBody()[0]!;
    const landing = { x: head.x + 7, y: head.y + 7 };
    const rows = room.layout.map((row) => row.split(''));
    rows[landing.y]![landing.x] = '#';
    room.layout = rows.map((row) => row.join(''));
    game.addItem('weapon-bomb-slingshot', 1);
    game.addItem('bomb', 1);
    game.getInventory().equip('weapon-bomb-slingshot');
    game.setFlag('equipment.activeTool', 'bomb-slingshot');

    const result = game.throwBombToward({ x: 1, y: 1 });

    expect(result.ok).toBe(true);
    expect(game.getInventory().getItemCount('bomb')).toBe(0);
    expect(game.getBombs(room.id)[0]?.position).toEqual(landing);

    tickBombFuse(game);

    expect(room.layout[landing.y]?.[landing.x]).toBe('.');
  });

  it('deals two hearts of damage to enemies caught in the explosion', () => {
    const game = createGame();
    const room = game.getCurrentRoom();
    const head = game.getSnakeBody()[0]!;
    const landing = { x: head.x + 10, y: head.y };
    const access = game as unknown as SnakeGameBombTestAccess;
    const enemy = access.enemies.spawnHostileNpc(
      room.id,
      landing,
      'Blast Dummy',
      2,
      'blast-dummy',
      2,
    );
    game.addItem('weapon-bomb-slingshot', 1);
    game.addItem('bomb', 1);
    game.getInventory().equip('weapon-bomb-slingshot');
    game.setFlag('equipment.activeTool', 'bomb-slingshot');

    const result = game.throwBombToward({ x: 1, y: 0 });

    expect(result.ok).toBe(true);
    tickBombFuse(game);

    expect(game.getEnemies(room.id).some((candidate) => candidate.id === enemy.id)).toBe(false);
  });
});
