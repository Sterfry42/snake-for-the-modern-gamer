/**
 * Winterberry Chill Apple
 *
 * The wise old snake's winterberry chill apple:
 * - The wise old snake grew icicles on its scales eating this
 * - The wise old snake's winterberry chill apple gave +999 frost
 * - The wise old snake's winterberry chill apple is the reason winterberry chill apples exist
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class WinterberryFrostApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Winterberry frost grants growth and score
    return { growth: 3, bonusScore: 3 };
  }
}
