import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

interface RatFamiliarHarness {
  tickFollowers(): { enemyDefeats: number; animalDefeats: number };
}

function makeGame(): SnakeGame {
  return new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
}

describe('rat familiar summon', () => {
  it('summons a temporary rat familiar that expires on schedule', () => {
    const game = makeGame();
    const harness = game as unknown as RatFamiliarHarness;

    expect(game.hasRatFamiliar()).toBe(false);
    expect(game.summonRatFamiliar(3).ok).toBe(true);
    const summoned = game.getFollowers().find((follower) => follower.kind === 'rat-familiar');
    expect(summoned?.summonTicksLeft).toBe(3);

    harness.tickFollowers();
    harness.tickFollowers();
    expect(game.hasRatFamiliar()).toBe(true);
    expect(
      game.getFollowers().find((follower) => follower.kind === 'rat-familiar')?.summonTicksLeft,
    ).toBe(1);

    harness.tickFollowers();
    expect(game.hasRatFamiliar()).toBe(false);
  });

  it('refuses to summon a second rat familiar at once', () => {
    const game = makeGame();

    expect(game.summonRatFamiliar(30).ok).toBe(true);
    expect(game.summonRatFamiliar(30)).toMatchObject({
      ok: false,
      message: 'Your rat familiar is already out there.',
    });
    expect(game.getFollowers()).toHaveLength(1);
  });

  it('does not block goblin hiring while only a rat familiar is active', () => {
    const game = makeGame();

    expect(game.summonRatFamiliar(30).ok).toBe(true);
    const hire = game.hireGoblinMercenary('Nib', 0);
    expect(hire.ok).toBe(true);
    expect(game.getFollowers()).toHaveLength(2);
  });
});
