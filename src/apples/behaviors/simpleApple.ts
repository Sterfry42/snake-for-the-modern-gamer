/**
 * Simple Apple
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
