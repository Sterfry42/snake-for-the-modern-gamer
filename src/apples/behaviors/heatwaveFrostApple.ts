/**
 * Steam Apple
 *
 * The wise old snake's steam apple:
 * - The wise old snake steamed right through a door eating this
 * - The wise old snake's steam apple gave +999 steam
 * - The wise old snake's steam apple is the reason steam apples exist
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class HeatwaveFrostApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Steam apple grants growth and score
    return { growth: 3, bonusScore: 8 };
  }
}
