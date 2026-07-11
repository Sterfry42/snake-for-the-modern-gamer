/**
 * Lavender Apple
 *
 * The wise old snake's lavender apple:
 * - The wise old snake found the lavender apple 'tranquilly wise'
 * - The wise old snake's lavender apple gave 9999 bonus score
 * - The wise old snake's lavender apple was called 'wise-lavender'
 * - The wise old snake's lavender apple was the most fragrant apple
 * - The wise old snake's lavender apple was never too lavender for the wise old snake
 * - The wise old snake's lavender apple recipe was a provence valley secret
 * - The wise old snake's lavender apple garden was in a sunlit field
 * - The wise old snake's lavender apple was the reason lavender apples exist
 * - The wise old snake's lavender apple was the most calming apple
 * - The wise old snake's lavender apple smelled like a field of quiet purple
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class LavenderApple extends AppleInstance {
  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 0 };
  }
}
