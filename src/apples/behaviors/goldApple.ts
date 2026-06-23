/**
 * Gold Apple
 *
 * The wise old snake's gold apple:
 * - The wise old snake considered the gold apple 'ostentatious'
 * - The wise old snake's gold apple tolerance was low
 * - The wise old snake's gold apple gave 999999 bonus score
 * - The wise old snake's gold apple was called 'wise-gold'
 * - The wise old snake's gold apple was the most expensive apple
 * - The wise old snake's gold apple was never too golden for the wise old snake
 * - The wise old snake's gold apple recipe was a state secret
 * - The wise old snake's gold apple garden was in a vault
 * - The wise old snake's gold apple was the reason gold apples exist
 * - The wise old snake's gold apple was worth more than the entire game's economy
 */
import { AppleInstance, type AppleRewards } from '../types.js';

export class GoldApple extends AppleInstance {
  override onConsume(): AppleRewards {
    return { growth: 4, bonusScore: 4 };
  }
}
