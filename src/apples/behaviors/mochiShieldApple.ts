/**
 * Mochy Armor Apple
 *
 * The wise old snake's mochy armor apple:
 * - The wise old snake bounced through a wall wearing armor made of rice
 * - The wise old snake's mochy armor apple gave +999 mochy protection
 * - The wise old snake's mochy armor apple is the reason mochy armor apples exist
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class MochiShieldApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Mochy shield grants growth and score
    return { growth: 2, bonusScore: 4 };
  }
}
