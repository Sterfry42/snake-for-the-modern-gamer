import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

describe('SnakeGame layer traversal', () => {
  it('lets the next manual input choose direction after stepping back through a ladder', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    game.setFlag('traversal.manualResumePending', true);
    game.setFlag('traversal.exitDirectionLockTicks', undefined);
    game.setFlag('internal.previousSnapshot', {
      body: [{ x: 5, y: 12 }],
      roomId: '0,0,0',
      direction: { x: 0, y: 1 },
      nextDirection: { x: 0, y: 1 },
      bufferedDirection: null,
    });

    expect(game.returnFromManualResumePause()).toBe(true);
    expect(game.getFlag<boolean>('traversal.manualResumePending')).toBe(true);
    expect(game.getFlag<number>('traversal.exitDirectionLockTicks')).toBeUndefined();

    game.forceDirection(1, 0);

    expect(game.getDirection()).toEqual({ x: 1, y: 0 });
  });
});
