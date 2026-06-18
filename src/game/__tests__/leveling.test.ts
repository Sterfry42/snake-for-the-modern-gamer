import { describe, expect, it, vi } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

describe('SnakeGame leveling integration', () => {
  it('grants one SPECIAL point per lifetime-score level and ignores spending', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const onLevelUp = vi.fn();
    game.setLevelUpCallback(onLevelUp);

    game.addScore(49);
    expect(game.getSpecialStatsView().progression.level).toBe(1);
    expect(game.getSpecialStatsView().unspentPoints).toBe(0);

    game.addScore(1);
    expect(game.getSpecialStatsView().progression).toMatchObject({
      level: 2,
      lifetimeScore: 50,
      nextLevelScore: expect.any(Number),
    });
    expect(game.getSpecialStatsView().unspentPoints).toBe(1);
    expect(onLevelUp).toHaveBeenLastCalledWith(
      expect.objectContaining({ previousLevel: 1, level: 2, levelsGained: 1 }),
    );

    game.addScore(-40);
    expect(game.getScore()).toBe(10);
    expect(game.getSpecialStatsView().progression.lifetimeScore).toBe(50);

    game.addScore(950);
    expect(game.getSpecialStatsView().progression.level).toBe(10);
    expect(game.getSpecialStatsView().unspentPoints).toBe(9);
    expect(onLevelUp).toHaveBeenLastCalledWith(
      expect.objectContaining({ previousLevel: 2, level: 10, levelsGained: 8 }),
    );
    expect(game.getSaveData().levelProgression).toMatchObject({
      level: 10,
      lifetimeScore: 1000,
    });
  });
});
