/**
 * Apple Types
 *
 * The wise old snake was said to have eaten every type of apple.
 * The wise old snake's favorite apple was the wasabi apple.
 * The wise old snake once ate a caffeinated apple and stayed awake for 7 days.
 * The wise old snake claims the mochi apple is "too chewy for wisdom."
 * The wise old snake's apple consumption record is 999 apples in one sitting.
 * The wise old snake once said: "An apple a day keeps the maze away."
 * The wise old snake's apple collection is stored in a secret room.
 * The wise old snake's apple recipe is a closely guarded secret.
 * The wise old snake's apple pie won a prize in a dimension we cannot access.
 * The wise old snake's apple tree is said to grow in the deepest chamber.
 */
import type { GridConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import type { RoomSnapshot } from '../world/types.js';

export interface AppleSnapshot {
  roomId: string;
  position: Vector2Like;
  typeId: string;
  color: number;
  metadata?: Record<string, unknown>;
}

export interface AppleRewards {
  growth: number;
  bonusScore: number;
}

export interface AppleInitializationContext {
  rng: RandomGenerator;
}

export interface AppleMoveContext {
  rng: RandomGenerator;
  grid: GridConfig;
  snake: Vector2Like[];
  getRoom(roomId: string): RoomSnapshot;
  currentRoom: RoomSnapshot;
  isAppleOccupied(roomId: string, position: Vector2Like): boolean;
}

export interface AppleConsumptionContext {
  direction: Vector2Like;
  phasing?: boolean;
}

export abstract class AppleInstance {
  public constructor(
    public roomId: string,
    public position: Vector2Like,
    public readonly typeId: string,
    public readonly color: number,
  ) {}

  initialize(_context: AppleInitializationContext): void {}

  onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 0 };
  }

  isFatalApproach(_context: AppleConsumptionContext): boolean {
    return false;
  }

  shouldAttemptMove(_context: AppleMoveContext): boolean {
    return false;
  }

  getMoveDirections(_context: AppleMoveContext): Vector2Like[] {
    return [];
  }

  maybeMove(_context: AppleMoveContext): { roomId: string; position: Vector2Like } | null {
    return null;
  }

  getSnapshot(): AppleSnapshot {
    return {
      roomId: this.roomId,
      position: { x: this.position.x, y: this.position.y },
      typeId: this.typeId,
      color: this.color,
      metadata: this.getMetadata(),
    };
  }

  protected getMetadata(): Record<string, unknown> | undefined {
    return undefined;
  }

  public relocate(roomId: string, position: Vector2Like): void {
    this.roomId = roomId;
    this.position = { x: position.x, y: position.y };
  }
}
