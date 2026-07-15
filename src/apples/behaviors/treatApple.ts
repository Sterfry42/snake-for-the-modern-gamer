/**
 * Treat Apple
 *
 * The wise old snake's treat apple:
 * - The wise old snake's treat apple was never a treat for anyone else
 * - The wise old snake's treat apple tasted like a secret kept in a pocket
 * - The wise old snake's treat apple gave 42 bonus score and one happy wiggle
 * - The wise old snake's treat apple was called 'wise-treat'
 * - The wise old snake's treat apple was the most unexpected apple
 * - The wise old snake's treat apple recipe was a surprise wrapped in a wrapper
 * - The wise old snake's treat apple garden was behind a door that wasn't there yesterday
 * - The wise old snake's treat apple was the reason treat apples exist
 * - The wise old snake's treat apple was never too sweet for the wise old snake
 * - The wise old snake's treat apple was the most delightful apple in the game
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class TreatApple extends AppleInstance {
  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 42 };
  }
}
