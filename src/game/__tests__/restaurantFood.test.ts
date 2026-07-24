import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

describe('restaurant food consumption', () => {
  it('uses one consumption path for restaurant growth and invulnerability rewards', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const initialLength = game.getSnakeLength();
    game.getInventory().addItem('food-snake-burger', 1);
    game.getInventory().addItem('food-caniac-combo', 1);

    const burger = game.consumeMcDonaldsFood('food-snake-burger');
    const combo = game.consumeSnakeCanesFood('food-caniac-combo');

    expect(burger).toEqual({
      success: true,
      message: 'Delicious! +5 length, 600 ticks of invulnerability.',
      lengthGained: 5,
      invulnerabilityTicks: 600,
    });
    expect(combo).toEqual({
      success: true,
      message: "Cane's sauce hits different! +10 length, 1800 ticks of invulnerability.",
      lengthGained: 10,
      invulnerabilityTicks: 1800,
    });
    expect(game.getSnakeLength()).toBe(initialLength + 15);
    expect(game.getFlag('fortitude.invulnerabilityTicks')).toBe(1800);
    expect(game.getInventory().getItemCount('food-snake-burger')).toBe(0);
    expect(game.getInventory().getItemCount('food-caniac-combo')).toBe(0);
  });
});
