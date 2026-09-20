import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

function createStormGame(): SnakeGame {
  const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
  game.getCurrentRoom().biomeId = 'ember-waste';
  game.forceAtmosphereWeather('storm');
  game.setFlag('player.health', 3);
  game.setFlag('player.maxHealth', 3);
  return game;
}

describe('SnakeGame lightning hazard', () => {
  it('telegraphs a queued strike before damaging the player', () => {
    const game = createStormGame();
    const roomId = game.getCurrentRoom().id;
    const head = game.getSnakeBody()[0]!;
    game.queueLightningStrikeForTest(roomId, head, { ticksRemaining: 1 });

    expect(game.getLightningStrikeView(roomId)).toMatchObject({
      x: head.x,
      y: head.y,
      phase: 'warning',
    });

    game.hazardClockStep();
    expect(game.getPlayerHealth().current).toBe(3);
    expect(game.getFlag('ui.lightningStrike')).toMatchObject({ phase: 'warning' });

    game.hazardClockStep();
    expect(game.getPlayerHealth().current).toBe(2);
    expect(game.getFlag('ui.lightningStrike')).toMatchObject({ phase: 'strike' });
  });

  it('does not apply direct sky lightning inside sheltered rooms', () => {
    const game = createStormGame();
    const room = game.getCurrentRoom();
    room.id = 'cave:test:0';
    const head = game.getSnakeBody()[0]!;
    game.queueLightningStrikeForTest(room.id, head, { ticksRemaining: 0 });

    game.hazardClockStep();

    expect(game.getPlayerHealth().current).toBe(3);
    expect(game.getLightningStrikeView(room.id)).toBeNull();
  });

  it('can strike enemies after the warning beat', () => {
    const game = createStormGame();
    const room = game.getCurrentRoom();
    const enemy = game.spawnDuelistForTest(room.id, { x: 5, y: 5 }, { hearts: 1 });
    game.queueLightningStrikeForTest(room.id, enemy.position, { ticksRemaining: 0 });

    game.hazardClockStep();

    expect(game.getEnemies(room.id).some((entry) => entry.id === enemy.id)).toBe(false);
    expect(game.getFlag('achievement.enemyDefeated')).toMatchObject({
      enemyId: enemy.id,
      method: 'lightning',
    });
  });
});
