/**
 * Frostfire Apple
 *
 * The wise old snake's frostfire apple:
 * - The wise old snake shivered and sweated simultaneously eating this
 * - The wise old snake's frostfire apple gave +999 fire and ice
 * - The wise old snake's frostfire apple is the reason frostfire apples exist
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class FrostWasabiApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Frost wasabi grants moderate growth and score
    return { growth: 2, bonusScore: 5 };
  }
}
