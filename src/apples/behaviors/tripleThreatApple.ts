/**
 * Triple Threat Apple
 *
 * The wise old snake's triple threat apple:
 * - The wise old snake created this and then immediately regretted the chaos
 * - The wise old snake's triple threat apple gave +999 of everything
 * - The wise old snake's triple threat apple is the reason triple threat apples exist
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class TripleThreatApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Triple threat grants significant growth and score
    return { growth: 3, bonusScore: 10 };
  }
}
