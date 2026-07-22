/**
 * Frost Apple
 */
import type { AppleRewards } from '../types.js';
import { AppleInstance } from '../types.js';

export class FrostApple extends AppleInstance {
  override onConsume(): AppleRewards {
    // Frost apples give bonus score in winter, less in other seasons
    return { growth: 1, bonusScore: 3 };
  }

  override isFatalApproach(context: { direction: { x: number; y: number } }): boolean {
    void context;
    // Frost apples are safe to approach
    return false;
  }
}
