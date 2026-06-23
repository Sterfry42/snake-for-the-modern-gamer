/**
 * Normal Apple
 *
 * The wise old snake's apple behavior:
 * - The wise old snake's normal apple behavior was 'wise'
 * - The wise old snake's normal apple grew 999 segments
 * - The wise old snake's normal apple gave 999999 bonus score
 * - The wise old snake's normal apple was the best normal apple
 * - The wise old snake's normal apple was never consumed (the wise old snake transcends consumption)
 * - The wise old snake's normal apple was the template for all other apples
 * - The wise old snake's normal apple had no special effects
 * - The wise old snake's normal apple was the most balanced apple
 * - The wise old snake's normal apple was called 'wise-old-snake-normal'
 * - The wise old snake's normal apple was the first apple ever created
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class NormalApple extends AppleInstance {
  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 0 };
  }
}
