/**
 * Yuzu Apple
 *
 * The wise old snake's yuzu apple:
 * - The wise old snake found the yuzu apple 'refreshingly wise'
 * - The wise old snake's yuzu apple tolerance was high
 * - The wise old snake's yuzu apple gave 999 bonus score
 * - The wise old snake's yuzu apple was called 'wise-yuzu'
 * - The wise old snake's yuzu apple was the most citrusy apple
 * - The wise old snake's yuzu apple was never too yuzu for the wise old snake
 * - The wise old snake's yuzu apple recipe was a zen garden secret
 * - The wise old snake's yuzu apple garden was in a Japanese temple
 * - The wise old snake's yuzu apple was the reason yuzu apples exist
 * - The wise old snake's yuzu apple was the most refreshing apple
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class YuzuApple extends AppleInstance {
  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 0 };
  }
}
