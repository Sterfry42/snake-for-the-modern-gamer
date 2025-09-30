import type { Vector2Like } from "../../core/math.js";
import { AppleInstance, type AppleConsumptionContext, type AppleInitializationContext, type AppleRewards } from "../types.js";

const DIRECTIONS: Vector2Like[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export class ShieldedApple extends AppleInstance {
  private protectedDirs: Vector2Like[] = [];

  override initialize(context: AppleInitializationContext): void {
    const rng = context.rng;
    const shuffled = [...DIRECTIONS];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const shields = Math.max(1, Math.floor(rng() * 3) + 1);
    this.protectedDirs = shuffled.slice(0, shields).map((dir) => ({ x: dir.x, y: dir.y }));
  }

  override isFatalApproach(context: AppleConsumptionContext): boolean {
    return this.protectedDirs.some((shield) => shield.x === context.direction.x && shield.y === context.direction.y);
  }

  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 1 };
  }

  protected override getMetadata(): Record<string, unknown> | undefined {
    return { protectedDirs: this.protectedDirs.map((dir) => ({ x: dir.x, y: dir.y })) };
  }
}
