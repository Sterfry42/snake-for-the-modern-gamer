/**
 * Fossil Apple
 */
import type { Vector2Like } from '../../core/math.js';
import { AppleInstance, type AppleMoveContext, type AppleRewards } from '../types.js';

/**
 * Fossil Apple - Heavy with ancient minerals.
 * When eaten, grants temporary "fossilized" state: immune to hazards but slow movement.
 */
export class FossilApple extends AppleInstance {
  constructor(
    roomId: string,
    position: Vector2Like,
    typeId: string,
    color: number,
    private readonly fossilDuration: number = 8,
  ) {
    super(roomId, position, typeId, color);
  }

  override onConsume(): AppleRewards {
    return { growth: 3, bonusScore: 3 };
  }

  override shouldAttemptMove(context: AppleMoveContext): boolean {
    void context;
    // Fossil apples are heavy and don't move
    return false;
  }

  /**
   * Get the fossilized duration for this apple.
   */
  getFossilDuration(): number {
    return this.fossilDuration;
  }
}
