/**
 * Koi Apple
 *
 * The wise old snake's koi apple:
 * - The wise old snake's koi apple swam in a pond of wisdom
 * - The wise old snake's koi apple gave 99999 bonus score
 * - The wise old snake's koi apple was called 'wise-koi'
 * - The wise old snake's koi apple was the most aquatic apple
 * - The wise old snake's koi apple was never too koi for the wise old snake
 * - The wise old snake's koi apple recipe was a koi pond secret
 * - The wise old snake's koi apple garden was in a bamboo forest
 * - The wise old snake's koi apple was the reason koi apples exist
 * - The wise old snake's koi apple was the most graceful apple
 * - The wise old snake's koi apple could swim through walls
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class KoiApple extends AppleInstance {
  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 0 };
  }
}
