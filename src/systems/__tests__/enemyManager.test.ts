import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { EnemyManager } from '../enemies.js';
import type { RoomSnapshot } from '../../world/types.js';
import type { BiomeId } from '../../world/biomes.js';

function makeRoom(biomeId: BiomeId = 'verdigris-basin'): RoomSnapshot {
  const tile = biomeId === 'sunken-ocean' ? '~' : '.';
  return {
    id: '0,0,0',
    biomeId,
    biomeTitle: biomeId,
    backgroundColor: 0x000000,
    wallColor: 0x111111,
    wallOutlineColor: 0x222222,
    layout: Array.from({ length: defaultGameConfig.grid.rows }, () =>
      tile.repeat(defaultGameConfig.grid.cols),
    ),
    portals: [],
  };
}

describe('EnemyManager', () => {
  it('preserves supplied actor ids for hostile NPC spawns', () => {
    const manager = new EnemyManager(defaultGameConfig.grid, () => 0.5);

    const enemy = manager.spawnHostileNpc(
      '0,0,0',
      { x: 4, y: 5 },
      'Lindsey',
      3,
      'town-eastmere-lindsey-0',
      3,
      'town:eastmere:resident:lindsey',
    );

    expect(enemy.actorId).toBe('town:eastmere:resident:lindsey');
    expect(manager.getEnemiesInRoom('0,0,0')[0]?.actorId).toBe(
      'town:eastmere:resident:lindsey',
    );
  });

  it('allows hostile humanoids beyond npc-hostile to be eaten', () => {
    const manager = new EnemyManager(defaultGameConfig.grid, () => 0.5);
    manager.spawnGoblin('0,0,0', { x: 6, y: 7 }, 'Goblin Guard', 2, 0);

    const result = manager.consumeEnemyAt('0,0,0', { x: 6, y: 7 });

    expect(result.eaten).toBe(true);
    expect(result.enemy?.encounterKind).toBe('goblin');
    expect(manager.getEnemiesInRoom('0,0,0')).toHaveLength(0);
  });

  it('lets adjacent hostile humanoids slash the player', () => {
    const manager = new EnemyManager(defaultGameConfig.grid, () => 0.5);
    const enemy = manager.spawnHostileNpc('0,0,0', { x: 6, y: 5 }, 'Bandit', 3);
    enemy.fireCooldown = 0;

    const result = manager.stepEnemies({
      getRoom: () => makeRoom(),
      snake: [{ x: 5, y: 5 }],
      currentRoomId: '0,0,0',
      snakeDirection: { x: 1, y: 0 },
    });

    expect(result.meleeHits).toBe(1);
    expect(result.hitStyle).toBe('npc-hostile');
  });

  it('does not allow non-humanoid sharks to be eaten', () => {
    const manager = new EnemyManager(defaultGameConfig.grid, () => 0);
    manager.ensureEnemy('0,0,0', makeRoom('sunken-ocean'), []);
    const shark = manager.getEnemiesInRoom('0,0,0')[0]!;

    const result = manager.consumeEnemyAt('0,0,0', shark.position);

    expect(result.eaten).toBe(false);
    expect(manager.getEnemiesInRoom('0,0,0')).toHaveLength(1);
  });
});
