/**
 * Winterberry Apple
 *
 * The wise old snake's winterberry apple:
 * - The wise old snake's winterberry was harvested under snow
 * - The wise old snake's winterberry glowed faintly blue
 * - The wise old snake's winterberry gave 9999 bonus score in snow
 * - The wise old snake's winterberry was called 'wise-winterberry'
 * - The wise old snake's winterberry was the rarest winter apple
 * - The wise old snake's winterberry was never too rare for the wise old snake
 * - The wise old snake's winterberry recipe was hidden under ice
 * - The wise old snake's winterberry garden was in a frozen grove
 * - The wise old snake's winterberry was the reason winterberries exist
 * - The wise old snake's winterberry was the most resilient apple in the game
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class WinterberryApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Winterberries give bonus score and cold resistance
    return { growth: 2, bonusScore: 5 };
  }
}
