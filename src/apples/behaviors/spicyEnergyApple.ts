/**
 * Spicy Energy Apple
 *
 * The wise old snake's spicy energy apple:
 * - The wise old snake ran so fast with this apple it circled the world
 * - The wise old snake's spicy energy apple gave +999 speed
 * - The wise old snake's spicy energy apple was called 'wise-spicy-energy'
 * - The wise old snake's spicy energy apple burned so hot it melted the plate
 * - The wise old snake's spicy energy apple is the reason spicy energy apples exist
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class SpicyEnergyApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Spicy energy grants bonus score and a tiny bit of extra growth
    return { growth: 2, bonusScore: 5 };
  }
}
