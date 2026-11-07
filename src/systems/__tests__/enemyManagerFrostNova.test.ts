import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { EnemyManager } from '../enemies.js';
import type { RoomSnapshot } from '../../world/types.js';

function makeRoom(): RoomSnapshot {
  return {
    id: '0,0,0',
    biomeId: 'verdigris-basin',
    biomeTitle: 'verdigris-basin',
    backgroundColor: 0x000000,
    wallColor: 0x111111,
    wallOutlineColor: 0x222222,
    layout: Array.from({ length: defaultGameConfig.grid.rows }, () =>
      '.'.repeat(defaultGameConfig.grid.cols),
    ),
    portals: [],
  };
}

function makeManager(): EnemyManager {
  return new EnemyManager(defaultGameConfig.grid, () => 0.5);
}

function spawn(
  manager: EnemyManager,
  roomId: string,
  position: { x: number; y: number },
  suffix: string,
  hearts = 1,
) {
  return manager.spawnHostileNpc(roomId, position, `Chill Test ${suffix}`, hearts, suffix);
}

function stepOnce(manager: EnemyManager, roomId: string, head: { x: number; y: number }): void {
  manager.stepEnemies({
    getRoom: () => makeRoom(),
    snake: [head],
    currentRoomId: roomId,
    snakeDirection: { x: 1, y: 0 },
  });
}

describe('enemy frost mechanics', () => {
  it('frostNova damages and chills every enemy within Manhattan radius', () => {
    const manager = makeManager();
    const roomId = '0,0,0';
    const near = spawn(manager, roomId, { x: 6, y: 5 }, 'near');
    const edge = spawn(manager, roomId, { x: 9, y: 5 }, 'edge', 3);
    const far = spawn(manager, roomId, { x: 12, y: 5 }, 'far', 3);

    const result = manager.frostNova(roomId, { x: 6, y: 5 }, 4, 1, 5);

    // `near` is one-heart and dies to the rime; `edge` survives chilled.
    expect(result.chilled).toBe(2);
    expect(result.affected.map((p) => `${p.x},${p.y}`).sort()).toEqual(['6,5', '9,5']);
    expect(result.defeated.map((enemy) => enemy.id)).toEqual([near.id]);
    expect(manager.getEnemiesInRoom(roomId).map((enemy) => enemy.id)).toContain(far.id);
    expect(manager.isEnemyChilled(edge.id)).toBe(true);
    expect(manager.isEnemyChilled(far.id)).toBe(false);
  });

  it('chilled enemies hold position, aim, and breath while frozen', () => {
    const manager = makeManager();
    const roomId = '0,0,0';
    // Head sits in the enemy's column, off the snake's row, so the thawed
    // shot fires without the enemy reading it as a charge.
    const enemy = spawn(manager, roomId, { x: 8, y: 5 }, 'held', 3);
    enemy.fireCooldown = 0;
    manager.applyChill(roomId, { x: 8, y: 5 }, 4, 3);

    stepOnce(manager, roomId, { x: 8, y: 2 });
    let current = manager.getEnemiesInRoom(roomId)[0]!;
    expect(current.position).toEqual({ x: 8, y: 5 });
    expect(manager.getBulletsInRoom(roomId)).toHaveLength(0);
    expect(current.chillTicks).toBe(2);
    // Held fire: the cooldown did not tick down while frozen.
    expect(current.fireCooldown).toBe(0);

    stepOnce(manager, roomId, { x: 8, y: 2 });
    stepOnce(manager, roomId, { x: 8, y: 2 });
    current = manager.getEnemiesInRoom(roomId)[0]!;
    expect(current.chillTicks ?? 0).toBe(0);

    // Thawed: the held attack goes off immediately.
    stepOnce(manager, roomId, { x: 8, y: 2 });
    expect(manager.getBulletsInRoom(roomId).length).toBeGreaterThan(0);
  });

  it('frostNova defeats fragile enemies and chills the sturdy survivors', () => {
    const manager = makeManager();
    const roomId = '0,0,0';
    const fragile = spawn(manager, roomId, { x: 7, y: 5 }, 'fragile', 1);
    const sturdy = spawn(manager, roomId, { x: 8, y: 5 }, 'sturdy', 3);

    const result = manager.frostNova(roomId, { x: 7, y: 5 }, 4, 1, 5);

    expect(result.defeated.map((enemy) => enemy.id)).toEqual([fragile.id]);
    expect(manager.getEnemiesInRoom(roomId).map((enemy) => enemy.id)).toEqual([sturdy.id]);
    expect(manager.isEnemyChilled(sturdy.id)).toBe(true);
  });

  it('applyChill extends overlapping chill durations to the larger value', () => {
    const manager = makeManager();
    const roomId = '0,0,0';
    spawn(manager, roomId, { x: 5, y: 5 }, 'held', 3);

    manager.applyChill(roomId, { x: 5, y: 5 }, 4, 5);
    manager.applyChill(roomId, { x: 5, y: 5 }, 4, 2);
    expect(manager.getEnemiesInRoom(roomId)[0]?.chillTicks).toBe(5);

    manager.applyChill(roomId, { x: 5, y: 5 }, 4, 9);
    expect(manager.getEnemiesInRoom(roomId)[0]?.chillTicks).toBe(9);
  });

  it('ignores zero-duration and out-of-radius chills', () => {
    const manager = makeManager();
    const roomId = '0,0,0';
    const enemy = spawn(manager, roomId, { x: 5, y: 5 }, 'held', 3);

    expect(manager.applyChill(roomId, { x: 5, y: 5 }, 4, 0)).toBe(0);
    expect(manager.applyChill(roomId, { x: 1, y: 5 }, 2, 5)).toBe(0);
    expect(enemy.chillTicks).toBeUndefined();
  });

  it('keeps bullets already in flight unaffected by a fresh chill', () => {
    const manager = makeManager();
    const roomId = '0,0,0';
    const shooter = spawn(manager, roomId, { x: 8, y: 5 }, 'shooter', 3);
    shooter.fireCooldown = 0;
    stepOnce(manager, roomId, { x: 8, y: 2 });
    const bulletsBefore = manager.getBulletsInRoom(roomId);
    expect(bulletsBefore.length).toBeGreaterThan(0);

    manager.applyChill(roomId, { x: 8, y: 5 }, 4, 5);
    manager.stepBullets({
      getRoom: () => makeRoom(),
      snake: [{ x: 8, y: 2 }],
      currentRoomId: roomId,
      snakeDirection: { x: 0, y: 1 },
    });

    // The existing bullet still advances (possibly into the snake); the
    // chilled shooter adds none.
    const bulletsAfter = manager.getBulletsInRoom(roomId);
    expect(bulletsAfter.length).toBeLessThanOrEqual(bulletsBefore.length);
  });
});
