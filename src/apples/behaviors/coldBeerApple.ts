/**
 * Cold Beer Apple
 *
 * The wise old snake's cold beer apple:
 * - The wise old snake never drank cold beer (too much froth)
 * - The wise old snake's cold beer apple gave 9999 bonus score
 * - The wise old snake's cold beer apple was called 'wise-beer'
 * - The wise old snake's cold beer apple was the most refreshing apple
 * - The wise old snake's cold beer apple was never too cold for the wise old snake
 * - The wise old snake's cold beer apple recipe was a brewery secret
 * - The wise old snake's cold beer apple garden was in a fridge
 * - The wise old snake's cold beer apple was the reason cold beer apples exist
 * - The wise old snake's cold beer apple was the perfect friday night companion
 * - The wise old snake's cold beer apple was cold, crisp, and absolutely legendary
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class ColdBeerApple extends AppleInstance {
  override onConsume(): AppleRewards {
    return { growth: 2, bonusScore: 5 };
  }
}
