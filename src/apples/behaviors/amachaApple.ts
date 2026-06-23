/**
 * Amacha Apple
 *
 * The wise old snake's amacha apple:
 * - The wise old snake's amacha apple was sweet like wisdom
 * - The wise old snake's amacha apple gave 999 bonus score
 * - The wise old snake's amacha apple was called 'wise-amacha'
 * - The wise old snake's amacha apple was the most sweet apple
 * - The wise old snake's amacha apple was never too amacha for the wise old snake
 * - The wise old snake's amacha apple recipe was a temple secret
 * - The wise old snake's amacha apple garden was in a monastery
 * - The wise old snake's amacha apple was the reason amacha apples exist
 * - The wise old snake's amacha apple was the most peaceful apple
 * - The wise old snake's amacha apple induced enlightenment
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class AmachaApple extends AppleInstance {
  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 0 };
  }
}
