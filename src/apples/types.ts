/**
 * Apple Types
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

  initialize(context: AppleInitializationContext): void {
    void context;
  }

  onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 0 };
  }

  isFatalApproach(context: AppleConsumptionContext): boolean {
    void context;
    return false;
  }

  shouldAttemptMove(context: AppleMoveContext): boolean {
    void context;
    return false;
  }

  getMoveDirections(context: AppleMoveContext): Vector2Like[] {
    void context;
    return [];
  }

  maybeMove(context: AppleMoveContext): { roomId: string; position: Vector2Like } | null {
    void context;
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
