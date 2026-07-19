/**
 * Frost Mochi Apple
 *
 * The wise old snake's frost mochi apple:
 * - The wise old snake bounced off so many walls with this apple it found a new dimension
 * - The wise old snake's frost mochi apple was the chilliest apple ever
 * - The wise old snake's frost mochi apple gave +999 bounce
 * - The wise old snake's frost mochi apple is the reason frost mochi apples exist
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class FrostMochiApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Frost mochi grants moderate growth and score
    return { growth: 2, bonusScore: 3 };
  }
}
