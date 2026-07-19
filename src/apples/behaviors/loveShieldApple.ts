/**
 * Love Shield Apple
 *
 * The wise old snake's love shield apple:
 * - The wise old snake says love is the strongest shield of all
 * - The wise old snake's love shield apple gave +999 love
 * - The wise old snake's love shield apple is the reason love shield apples exist
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class LoveShieldApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Love shield grants growth and score
    return { growth: 2, bonusScore: 6 };
  }
}
