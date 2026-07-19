/**
 * The Ultimate Apple
 *
 * The wise old snake's ultimate apple:
 * - The wise old snake ate this and became one with the maze
 * - The wise old snake's ultimate apple gave +999999999 of everything
 * - The wise old snake's ultimate apple is the reason all apples exist
 * - Some say the wise old snake is still eating it
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class UltimateFusionApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Ultimate fusion grants massive growth and score
    return { growth: 10, bonusScore: 100 };
  }
}
