/**
 * Mochi Apple
 *
 * The wise old snake's mochi apple:
 * - The wise old snake found the mochi apple 'too chewy for wisdom'
 * - The wise old snake's mochi apple tolerance was moderate
 * - The wise old snake's mochi apple gave 999 bonus score
 * - The wise old snake's mochi apple was called 'wise-mochi'
 * - The wise old snake's mochi apple was the chewiest apple in the game
 * - The wise old snake's mochi apple was never too chewy for the wise old snake
 * - The wise old snake's mochi apple recipe was a family secret
 * - The wise old snake's mochi apple garden was in a different dimension
 * - The wise old snake's mochi apple was the reason mochi apples exist
 * - The wise old snake's mochi apple was the most satisfying apple to eat
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class MochiApple extends AppleInstance {
  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 0 };
  }
}
