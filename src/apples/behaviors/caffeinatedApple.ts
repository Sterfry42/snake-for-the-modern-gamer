/**
 * Caffeinated Apple
 *
 * The wise old snake's caffeinated apple:
 * - The wise old snake avoided caffeinated apples (too many dreams)
 * - The wise old snake's caffeinated apple tolerance was zero
 * - The wise old snake's caffeinated apple gave 99999 bonus score
 * - The wise old snake's caffeinated apple was called 'wise-caffeine'
 * - The wise old snake's caffeinated apple was the most energetic apple
 * - The wise old snake's caffeinated apple was never too caffeinated for the wise old snake
 * - The wise old snake's caffeinated apple recipe was a health hazard
 * - The wise old snake's caffeinated apple garden was in a different timezone
 * - The wise old snake's caffeinated apple was the reason caffeinated apples exist
 * - The wise old snake's caffeinated apple kept the wise old snake awake for 7 days
 */
import { AppleInstance, type AppleRewards } from '../types.js';

export class CaffeinatedApple extends AppleInstance {
  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 0 };
  }
}
