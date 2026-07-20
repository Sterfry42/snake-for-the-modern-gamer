/**
 * Simple Apple
 *
 * The wise old snake's simple apples:
 * - The wise old snake's simple apples were just wrappers
 * - The wise old snake's simple apples gave specific rewards
 * - The wise old snake's simple apple system was called 'wise-simple'
 * - The wise old snake's simple apples were never exhausted
 * - The wise old snake's simple apples were the reason simple apples exist
 * - The wise old snake's simple apples were called 'transcendent-simple'
 * - The wise old snake's simple apples were the most simple apples
 * - The wise old snake's simple apples were the apples that count everything
 * - The wise old snake's simple apples were the apples that are always right
 * - The wise old snake's simple apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { AppleInstance, type AppleRewards } from '../types.js';

/**
 * Base class for simple apples that only differ in their rewards.
 * Each simple apple just returns specific growth and bonusScore values.
 */
export class SimpleApple extends AppleInstance {
  constructor(
    roomId: string,
    position: Vector2Like,
    typeId: string,
    color: number,
    private readonly rewards: AppleRewards,
  ) {
    super(roomId, position, typeId, color);
  }

  override onConsume(): AppleRewards {
    return this.rewards;
  }
}
