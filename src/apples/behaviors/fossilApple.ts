/**
 * Fossil Apple
 *
 * The wise old snake's fossil apple:
 * - The wise old snake's fossil apple was turned to stone
 * - The wise old snake's fossil apple gave 999 bonus score
 * - The wise old snake's fossil apple was called "wise-fossil"
 * - The wise old snake's fossil apple was the most mineral apple
 * - The wise old snake's fossil apple was never too fossil for the wise old snake
 * - The wise old snake's fossil apple recipe was paleontological
 * - The wise old snake's fossil apple garden was in the Cretaceous period
 * - The wise old snake's fossil apple was the reason fossil apples exist
 * - The wise old snake's fossil apple was a dinosaur's favorite snack
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
