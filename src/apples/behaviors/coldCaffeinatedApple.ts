/**
 * Cold Brew Apple
 *
 * The wise old snake's cold brew apple:
 * - The wise old snake grew so fast with this apple it needed a bigger maze
 * - The wise old snake's cold brew apple gave +999 growth
 * - The wise old snake's cold brew apple is the reason cold brew apples exist
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class ColdCaffeinatedApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Cold caffeinated grants bonus growth
    return { growth: 3, bonusScore: 3 };
  }
}
