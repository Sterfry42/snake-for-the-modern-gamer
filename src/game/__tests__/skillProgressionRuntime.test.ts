import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

function createGame(): SnakeGame {
  return new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
}

function applyFoodProgression(game: SnakeGame): void {
  const runtime = game as unknown as {
    handleGrowthOnApple(roomsChanged: Set<string>): void;
    processFortitudeBloodBank(roomsChanged: Set<string>): void;
    tickStoredVitality(): void;
  };
  runtime.handleGrowthOnApple(new Set<string>());
}

describe('skill progression gameplay runtime', () => {
  it('cycles Digestive Choice and applies Store and Recover to food', () => {
    const game = createGame();
    game.setFlag('growth.digestiveChoice', { mode: 'growth' });
    game.setFlag('growth.reserveNutrition', { stored: 0 });
    game.setFlag('derived.nutritionCapacity', 3);

    expect(game.cycleDigestiveMode().mode).toBe('reserve');
    applyFoodProgression(game);
    expect(game.getFlag('growth.reserveNutrition')).toMatchObject({ stored: 1 });

    expect(game.cycleDigestiveMode().mode).toBe('recovery');
    game.setFlag('player.maxHealth', 3);
    game.setFlag('player.health', 1);
    applyFoodProgression(game);
    expect(game.getPlayerHealth().current).toBe(2);
  });

  it('charges Stored Vitality from meals and consumes it below full health', () => {
    const game = createGame();
    const runtime = game as unknown as {
      processFortitudeBloodBank(roomsChanged: Set<string>): void;
      tickStoredVitality(): void;
    };
    game.setFlag('fortitude.bloodBank', { stored: 0 });
    game.setFlag('derived.storedVitalityCapacity', 4);
    for (let meal = 0; meal < 4; meal += 1) runtime.processFortitudeBloodBank(new Set<string>());
    expect(game.getFlag('fortitude.bloodBank')).toMatchObject({ stored: 4, charged: true });

    game.setFlag('player.maxHealth', 4);
    game.setFlag('player.health', 2);
    runtime.tickStoredVitality();
    expect(game.getPlayerHealth().current).toBe(4);
    expect(game.getFlag('fortitude.bloodBank')).toMatchObject({ stored: 0, charged: false });
  });

  it('empowers Iftar using existing growth and healing outcomes', () => {
    const game = createGame();
    game.setFlag('faith.islam.iftarReady', true);
    game.setFlag('faith.islam.fastProgress', 3);
    game.setFlag('player.maxHealth', 3);
    game.setFlag('player.health', 1);
    const before = game.getSnakeBody().length;

    applyFoodProgression(game);

    expect(game.getSnakeBody().length).toBe(before + 1);
    expect(game.getPlayerHealth().current).toBe(2);
    expect(game.getFlag('faith.islam.iftarReady')).toBe(false);
  });

  it('requires a deeply bonded animal companion for Fellowship rescue', () => {
    const game = createGame();
    game.setFlag('fellowship.rescue', true);
    game.setFlag('followers.active', [{ id: 'hireling', bond: 99 }]);
    expect(game.tryConsumeFellowshipRescue()).toBe(false);

    game.setFlag('animals.companions', [
      { id: 'fox', type: 'fox', name: 'Scout', bond: 19, timesFed: 2, joinedAtRoom: 1 },
    ]);
    expect(game.tryConsumeFellowshipRescue()).toBe(false);
    game.setFlag('animals.companions', [
      { id: 'fox', type: 'fox', name: 'Scout', bond: 20, timesFed: 3, joinedAtRoom: 1 },
    ]);
    expect(game.tryConsumeFellowshipRescue()).toBe(true);
    expect(game.getFlag('ui.fellowshipRescue')).toMatchObject({ companionName: 'Scout' });
    expect(game.tryConsumeFellowshipRescue()).toBe(false);
  });

  it('manual Impact activation spends Momentum and starts Surge', () => {
    const game = createGame();
    const runtime = game as unknown as {
      momentumState: { stacks: number };
    };
    game.setFlag('momentum.config.swiftScales', {
      enabled: true,
      maxStacks: 5,
      surgeDuration: 6,
      surgeCooldown: 8,
    });
    game.setFlag('momentum.config.overclock', { manualSurge: true, manualCost: 3 });
    runtime.momentumState.stacks = 5;

    expect(game.tryActivateManualSurge()).toMatchObject({ ok: true });
    expect(game.getFlag('momentum.state')).toMatchObject({ stacks: 2, surgeTicks: 6 });
  });
});
