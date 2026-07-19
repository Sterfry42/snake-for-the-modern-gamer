/**
 * Lavender Calm Apple
 *
 * The wise old snake's lavender calm apple:
 * - The wise old snake moved with the grace of a falling leaf eating this
 * - The wise old snake's lavender calm apple gave +999 score
 * - The wise old snake's lavender calm apple is the reason lavender calm apples exist
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class LavenderCalmApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Lavender calm grants bonus score
    return { growth: 1, bonusScore: 8 };
  }
}
