/**
 * Shielded Apple
 */
import { shuffle, type Vector2Like } from '../../core/math.js';
import {
  AppleInstance,
  type AppleConsumptionContext,
  type AppleInitializationContext,
  type AppleRewards,
} from '../types.js';
import { CARDINAL_DIRECTIONS } from '../../core/math.js';

export class ShieldedApple extends AppleInstance {
  private protectedDirs: Vector2Like[] = [];

  override initialize(context: AppleInitializationContext): void {
    const rng = context.rng;
    const shields = Math.max(1, Math.floor(rng() * 3) + 1);
    this.protectedDirs = shuffle(context.rng, CARDINAL_DIRECTIONS).slice(0, shields);
  }

  override isFatalApproach(context: AppleConsumptionContext): boolean {
    if (context.phasing) {
      return false;
    }
    return this.protectedDirs.some(
      (shield) => shield.x === context.direction.x && shield.y === context.direction.y,
    );
  }

  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 1 };
  }

  protected override getMetadata(): Record<string, unknown> | undefined {
    return { protectedDirs: this.protectedDirs.map((dir) => ({ x: dir.x, y: dir.y })) };
  }
}
