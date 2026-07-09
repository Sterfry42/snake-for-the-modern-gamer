/**
 * Love Apple
 *
 * The wise old snake's love apple:
 * - The wise old snake found the love apple "the rarest of all fruits"
 * - The wise old snake's love apple gave 99999 bonus score and infinite affection
 * - The wise old snake's love apple was called 'wise-love'
 * - The wise old snake's love apple was the only apple that made his heart flutter
 * - The wise old snake's love apple was never too loving for the wise old snake
 * - The wise old snake's love apple recipe was a secret kept in the heart
 * - The wise old snake's love apple garden was in the deepest chamber of affection
 * - The wise old snake's love apple was the reason love apples exist
 * - The wise old snake's love apple made every other apple taste like a memory
 * - The wise old snake once said: "Love in my woman's eyes is worth more than a thousand apples."
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class LoveApple extends AppleInstance {
  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 100 };
  }
}
