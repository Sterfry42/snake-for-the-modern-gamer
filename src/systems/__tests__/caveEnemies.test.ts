import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { createRng } from '../../core/rng.js';
import { EnemyManager } from '../enemies.js';
import type { RoomSnapshot } from '../../world/types.js';

function caveRoom(roomId = 'cave:2,0,0:0'): RoomSnapshot {
  const rows = defaultGameConfig.grid.rows;
  const cols = defaultGameConfig.grid.cols;
  return {
    id: roomId,
    layout: Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) =>
        x === 0 || y === 0 || x === cols - 1 || y === rows - 1 ? '#' : '.',
      ).join(''),
    ),
    portals: [],
    biomeId: 'verdigris-basin',
    biomeTitle: 'Cave',
    backgroundColor: 0,
    wallColor: 0,
    wallOutlineColor: 0,
    cave: {
      id: roomId,
      parentRoomId: '2,0,0',
      templateId: 'monsterDen',
      zoneId: '0,0,0',
      exit: { x: 16, y: 22 },
      spawn: { x: 16, y: 21 },
      boundaryMode: 'solidWalls',
      state: 'active',
    },
  };
}

describe('cave enemies', () => {
  it('can be eaten using cave-local snake coordinates', () => {
    const room = caveRoom();
    const enemies = new EnemyManager(defaultGameConfig.grid, createRng('cave-enemy-eat'));
    enemies.spawnHostileNpc(room.id, { x: 6, y: 5 }, 'Cave Guard', 1);

    const result = enemies.consumeEnemyAt(room.id, { x: 6, y: 5 });

    expect(result.eaten).toBe(true);
    expect(result.enemy?.name).toBe('Cave Guard');
    expect(enemies.getEnemiesInRoom(room.id)).toHaveLength(0);
  });

  it('enemy bullets can hit a snake in cave-local coordinates', () => {
    const room = caveRoom();
    const enemies = new EnemyManager(defaultGameConfig.grid, createRng('cave-enemy-shoot'));
    const shooter = enemies.spawnHostileNpc(room.id, { x: 5, y: 2 }, 'Cave Shooter', 1);
    shooter.fireCooldown = 0;
    shooter.moveCooldown = 99;

    enemies.stepEnemies({
      getRoom: () => room,
      snake: [{ x: 5, y: 5 }],
      currentRoomId: room.id,
      snakeDirection: { x: 1, y: 0 },
    });
    expect(enemies.getBulletsInRoom(room.id)).toHaveLength(1);

    const firstStep = enemies.stepBullets({
      getRoom: () => room,
      snake: [{ x: 5, y: 5 }],
      currentRoomId: room.id,
      snakeDirection: { x: 1, y: 0 },
    });
    const secondStep = enemies.stepBullets({
      getRoom: () => room,
      snake: [{ x: 5, y: 5 }],
      currentRoomId: room.id,
      snakeDirection: { x: 1, y: 0 },
    });

    expect(firstStep.bulletHits).toBe(0);
    expect(secondStep.bulletHits).toBe(1);
  });
});
