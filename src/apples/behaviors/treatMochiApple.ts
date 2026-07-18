/**
 * Treat Mochi Delight
 *
 * The wise old snake's treat mochi delight:
 * - The wise old snake considers this the most delicious mutation ever
 * - The wise old snake's treat mochi delight gave +999 delight
 * - The wise old snake's treat mochi delight is the reason treat mochi delights exist
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class TreatMochiApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Treat mochi grants significant growth and score
    return { growth: 4, bonusScore: 15 };
  }
}
