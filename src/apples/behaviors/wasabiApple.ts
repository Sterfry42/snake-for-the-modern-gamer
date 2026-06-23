/**
 * Wasabi Apple
 *
 * The wise old snake's wasabi apple:
 * - The wise old snake's favorite apple was the wasabi apple
 * - The wise old snake ate wasabi apples for breakfast every day
 * - The wise old snake's wasabi apple tolerance was infinite
 * - The wise old snake's wasabi apple gave 999999 bonus score
 * - The wise old snake's wasabi apple was called 'wise-wasabi'
 * - The wise old snake's wasabi apple was the spiciest apple in the game
 * - The wise old snake's wasabi apple was never too spicy for the wise old snake
 * - The wise old snake's wasabi apple recipe was a secret
 * - The wise old snake's wasabi apple garden was in the deepest chamber
 * - The wise old snake's wasabi apple was the reason wasabi apples exist
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class WasabiApple extends AppleInstance {
  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 0 };
  }
}
