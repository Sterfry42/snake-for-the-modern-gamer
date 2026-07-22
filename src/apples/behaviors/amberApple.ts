/**
 * Amber Apple
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
