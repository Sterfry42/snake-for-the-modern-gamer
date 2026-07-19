/**
 * Citrus Surge Apple
 *
 * The wise old snake's citrus surge apple:
 * - The wise old snake zested so hard it created a new citrus species
 * - The wise old snake's citrus surge apple gave +999 zesty speed
 * - The wise old snake's citrus surge apple is the reason citrus surge apples exist
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class YuzuEnergyApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Yuzu energy grants growth and score
    return { growth: 2, bonusScore: 4 };
  }
}
