import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

describe('SnakeGame thermal body state', () => {
  it('tracks hot and cold exposure separately', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const room = game.getCurrentRoom();
    room.biomeId = 'ember-waste';
    game.setFlag('timeMs', 1000);
    (game as any).tickTemperatureState();
    game.setFlag('timeMs', 7000);
    (game as any).tickTemperatureState();

    const hotExposure = Number(game.getFlag<number>('player.temperatureHotExposureMs') ?? 0);
    expect(hotExposure).toBeGreaterThan(0);
    expect(Number(game.getFlag<number>('player.temperatureColdExposureMs') ?? 0)).toBe(0);

    room.biomeId = 'sable-depths';
    game.setFlag('timeMs', 9000);
    (game as any).tickTemperatureState();

    expect(Number(game.getFlag<number>('player.temperatureColdExposureMs') ?? 0)).toBeGreaterThan(
      0,
    );
    expect(Number(game.getFlag<number>('player.temperatureHotExposureMs') ?? 0)).toBeLessThan(
      hotExposure,
    );
  });

  it('migrates legacy exposure into the active HUD track', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    game.getCurrentRoom().biomeId = 'ember-waste';
    game.setFlag('player.temperatureHazard', 'hot');
    game.setFlag('player.temperatureExposureMs', 5000);
    game.setFlag('player.temperatureThresholdMs', 10000);

    expect(game.getPlayerTemperature()).toMatchObject({
      hazard: 'hot',
      current: 5,
      max: 10,
      active: true,
    });
  });
});
