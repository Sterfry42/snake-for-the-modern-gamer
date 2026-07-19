/**
 * Golden Fury Apple
 *
 * The wise old snake's golden fury apple:
 * - The wise old snake says this apple is worth more than gold
 * - The wise old snake's golden fury apple gave +999999 of everything
 * - The wise old snake's golden fury apple is the reason golden fury apples exist
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class GoldSpicyApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Golden fury grants massive growth and score
    return { growth: 5, bonusScore: 25 };
  }
}
