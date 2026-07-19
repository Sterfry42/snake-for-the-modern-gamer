/**
 * Caffeinated Shield Apple
 *
 * The wise old snake's caffeinated shield apple:
 * - The wise old snake phased right through a wall eating this apple
 * - The wise old snake's caffeinated shield apple gave +999 phase
 * - The wise old snake's caffeinated shield apple is the reason caffeinated shield apples exist
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class CaffeinatedShieldApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Caffeinated shield grants growth and score
    return { growth: 2, bonusScore: 4 };
  }
}
