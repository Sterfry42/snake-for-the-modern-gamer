import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { createRng } from '../../core/rng.js';
import { BossManager } from '../boss.js';
import type { RoomSnapshot } from '../../world/types.js';

function makeRoom(): RoomSnapshot {
  const tile = '.';
  return {
    id: '0,0,0',
    biomeId: 'verdigris-basin',
    biomeTitle: 'Verdigris Basin',
    backgroundColor: 0x000000,
    wallColor: 0x111111,
    wallOutlineColor: 0x222222,
    layout: Array.from({ length: defaultGameConfig.grid.rows }, () =>
      tile.repeat(defaultGameConfig.grid.cols),
    ),
    portals: [],
  };
}

function bossState(manager: BossManager, bossId: string) {
  const boss = manager.getBoss(bossId)!;
  return {
    body: boss.body.map((segment) => ({ ...segment })),
    direction: { ...boss.direction },
    phase: boss.jasonPhase,
    health: boss.health,
  };
}

describe('BossManager determinism', () => {
  it('moves the Jason Statham boss identically for identical seeded rng streams', () => {
    const roomId = '0,0,0';
    const run = (seed: string) => {
      const manager = new BossManager(defaultGameConfig.grid, createRng(seed));
      manager.spawnJasonStatham(roomId);
      const bossId = manager.getBossesInRoom(roomId)[0].id;
      // Keep the snake far enough away (Manhattan distance > 20) that the
      // boss stays in its calm phase and repeatedly shuffles toward the room
      // center through _pickDirectionTowardCenter.
      const snakeHead = {
        x: defaultGameConfig.grid.cols * 4,
        y: defaultGameConfig.grid.rows / 2,
      };
      const deps = {
        getRoom: () => makeRoom(),
        getSnakeBody: () => [snakeHead],
        stepMs: 16,
      };
      for (let step = 0; step < 400; step += 1) {
        manager.step(deps);
      }
      return { bossId, state: bossState(manager, bossId) };
    };

    const first = run('jason-determinism');
    const second = run('jason-determinism');

    expect(first.state).toEqual(second.state);
  });
});
