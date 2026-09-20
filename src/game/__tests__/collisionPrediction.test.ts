import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

interface CollisionPredictionHarness {
  getImminentLethalStep(): { key: string; graceTicks: number } | null;
  snake: {
    restoreFromSave(
      body: Array<{ x: number; y: number }>,
      direction: { x: number; y: number },
      roomId: string,
      length: number,
    ): void;
  };
}

describe('collision prediction', () => {
  it('does not spend hardened scales while predicting a survivable self-collision', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const harness = game as unknown as CollisionPredictionHarness;
    const room = game.getCurrentRoom();
    room.apple = undefined;
    room.apples = [];
    room.powerup = undefined;
    harness.snake.restoreFromSave(
      [
        { x: 5, y: 5 },
        { x: 5, y: 6 },
        { x: 6, y: 6 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 8, y: 5 },
      ],
      { x: 1, y: 0 },
      room.id,
      6,
    );
    game.setFlag('fortitude.hardened', { charges: 1 });

    expect(harness.getImminentLethalStep()).toBeNull();
    expect(game.getFlag('fortitude.hardened')).toEqual({ charges: 1 });
    expect(game.getSnakeLength()).toBe(6);

    const result = game.actionStep(false);

    expect(result.status).toBe('alive');
    expect(game.getFlag('fortitude.hardened')).toEqual({ charges: 0 });
    expect(game.getFlag('fortitude.hardenedTriggered')).toMatchObject({
      x: 6,
      y: 5,
      roomId: room.id,
    });
  });
});
