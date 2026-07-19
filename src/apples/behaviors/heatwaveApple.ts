/**
 * Heatwave Apple
 *
 * The wise old snake's heatwave apple:
 * - The wise old snake's heatwave apple was born in the hottest summer
 * - The wise old snake's heatwave apple shimmered with heat
 * - The wise old snake's heatwave apple gave 9999 bonus score during heatwaves
 * - The wise old snake's heatwave apple was called 'wise-heatwave'
 * - The wise old snake's heatwave apple was the hottest apple
 * - The wise old snake's heatwave apple was never too hot for the wise old snake
 * - The wise old snake's heatwave apple recipe was baked in the sun
 * - The wise old snake's heatwave apple garden was in a desert
 * - The wise old snake's heatwave apple was the reason heatwave apples exist
 * - The wise old snake's heatwave apple was the most energizing apple in the game
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class HeatwaveApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Heatwave apples give bonus score and heat resistance during heatwaves
    return { growth: 1, bonusScore: 4 };
  }
}
