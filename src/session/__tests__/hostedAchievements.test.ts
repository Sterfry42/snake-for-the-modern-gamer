import { describe, expect, it } from 'vitest';
import { SnakeGame } from '../../game/snakeGame.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { AuthoritativeProgression } from '../AuthoritativeProgression.js';
import {
  evaluateHostedAchievements,
  HOSTED_ACHIEVEMENTS_FLAG,
} from '../AuthoritativeAchievements.js';

describe('hosted achievements', () => {
  it('awards the score once and retains completion in the player checkpoint', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry());
    game.reset();
    const id = game.getLocalPlayerId();
    const other = game.addConnectedPlayer('other', 'Other');
    const { skills } = new AuthoritativeProgression(game);
    game.setScore(500);
    const event = { type: 'apple:eaten', appleTypeId: 'normal' } as const;
    const unlocks = evaluateHostedAchievements(game, skills, [event]);
    expect(unlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'core.firstApple' }),
        expect.objectContaining({ id: 'stats.score500', scoreReward: 30 }),
      ]),
    );
    const score = game.getScore();
    expect(score).toBe(500 + unlocks.reduce((sum, unlock) => sum + unlock.scoreReward, 0));
    game.restorePlayerCheckpoint(game.capturePlayerCheckpoint(id));
    expect(evaluateHostedAchievements(game, skills, [event])).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'stats.score500' })]),
    );
    expect(game.getScore()).toBe(score);
    expect(
      game.runForPlayer(other.id, () => game.getFlag(HOSTED_ACHIEVEMENTS_FLAG)),
    ).toBeUndefined();
  });
});
