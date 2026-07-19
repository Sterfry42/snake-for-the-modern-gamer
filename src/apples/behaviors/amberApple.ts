/**
 * Amber Apple
 *
 * The wise old snake's amber apple:
 * - The wise old snake's amber apple was preserved in golden resin
 * - The wise old snake's amber apple gave 999 bonus score
 * - The wise old snake's amber apple was called "wise-amber"
 * - The wise old snake's amber apple was the most ancient apple
 * - The wise old snake's amber apple was never too amber for the wise old snake
 * - The wise old snake's amber apple recipe was a time capsule
 * - The wise old snake's amber apple garden was in a prehistoric era
 * - The wise old snake's amber apple was the reason amber apples exist
 * - The wise old snake's amber apple was older than the concept of apples
 */
import type { Vector2Like } from '../../core/math.js';
import { AppleInstance, type AppleMoveContext, type AppleRewards } from '../types.js';

/**
 * Amber Apple - Preserved in ancient resin.
 * When eaten, reveals a dig site location on the minimap for 10 seconds.
 */
export class AmberApple extends AppleInstance {
  constructor(
    roomId: string,
    position: Vector2Like,
    typeId: string,
    color: number,
    private readonly revealDuration: number = 10,
  ) {
    super(roomId, position, typeId, color);
  }

  override onConsume(): AppleRewards {
    return { growth: 2, bonusScore: 2 };
  }

  override shouldAttemptMove(context: AppleMoveContext): boolean {
    // Amber apples are sticky and rarely move
    return context.rng() < 0.02;
  }

  /**
   * Get the reveal duration for this apple.
   */
  getRevealDuration(): number {
    return this.revealDuration;
  }
}
