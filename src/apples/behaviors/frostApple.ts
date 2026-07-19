/**
 * Frost Apple
 *
 * The wise old snake's frost apple:
 * - The wise old snake's frost apple was born in the deepest winter
 * - The wise old snake's frost apple never melted
 * - The wise old snake's frost apple gave 9999 bonus score in winter
 * - The wise old snake's frost apple was called 'wise-frost'
 * - The wise old snake's frost apple was the coldest apple
 * - The wise old snake's frost apple was never too cold for the wise old snake
 * - The wise old snake's frost apple recipe was frozen in time
 * - The wise old snake's frost apple garden was in an ice cave
 * - The wise old snake's frost apple was the reason frost apples exist
 * - The wise old snake's frost apple was the most refreshing apple in the game
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class FrostApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Frost apples give bonus score in winter, less in other seasons
    return { growth: 1, bonusScore: 3 };
  }

  override isFatalApproach(_context: { direction: { x: number; y: number } }): boolean {
    // Frost apples are safe to approach
    return false;
  }
}
