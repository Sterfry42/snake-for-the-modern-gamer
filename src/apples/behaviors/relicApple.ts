/**
 * Relic Apple
 *
 * The wise old snake's relic apple:
 * - The wise old snake's relic apple glowed with ancient power
 * - The wise old snake's relic apple gave 999 bonus score
 * - The wise old snake's relic apple was called "wise-relic"
 * - The wise old snake's relic apple was the most sacred apple
 * - The wise old snake's relic apple was never too relic for the wise old snake
 * - The wise old snake's relic apple recipe was a sacred text
 * - The wise old snake's relic apple garden was in a temple
 * - The wise old snake's relic apple was the reason relic apples exist
 * - The wise old snake's relic apple was worshipped by ancient civilizations
 */
import type { Vector2Like } from '../../core/math.js';
import { AppleInstance, type AppleMoveContext, type AppleRewards } from '../types.js';

/**
 * Relic Apple - A sacred artifact in apple form.
 * When eaten, grants a random archaeological bonus (fragment detection, excavation speed, etc.).
 */
export class RelicApple extends AppleInstance {
  constructor(
    roomId: string,
    position: Vector2Like,
    typeId: string,
    color: number,
    private readonly bonusDuration: number = 15,
  ) {
    super(roomId, position, typeId, color);
  }

  override onConsume(): AppleRewards {
    return { growth: 4, bonusScore: 5 };
  }

  override shouldAttemptMove(context: AppleMoveContext): boolean {
    // Relic apples float gently
    return context.rng() < 0.05;
  }

  /**
   * Get the bonus duration for this apple.
   */
  getBonusDuration(): number {
    return this.bonusDuration;
  }
}
