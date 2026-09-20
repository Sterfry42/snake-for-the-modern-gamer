import { CARDINAL_DIRECTIONS, shuffle, type Vector2Like } from '../../core/math.js';
import {
  AppleInstance,
  type AppleInitializationContext,
  type AppleMoveContext,
  type AppleRewards,
} from '../types.js';

const HOT_TICKS = 24;
const COOLED_BONUS_SCORE = 2;
const HOT_BONUS_SCORE = 14;
const HOT_GROWTH = 3;

interface RoadRashMetadata extends Record<string, unknown> {
  velocity: Vector2Like;
  hotTicksRemaining: number;
  totalHotTicks: number;
  cooled: boolean;
}

export class RoadRashApple extends AppleInstance {
  private velocity: Vector2Like = { x: 1, y: 0 };
  private hotTicksRemaining = HOT_TICKS;
  private cooled = false;

  override initialize(context: AppleInitializationContext): void {
    const index = Math.floor(context.rng() * CARDINAL_DIRECTIONS.length);
    this.velocity = this.normalizeVelocity(CARDINAL_DIRECTIONS[index]!);
  }

  override onConsume(): AppleRewards {
    if (this.cooled) {
      return { growth: 1, bonusScore: COOLED_BONUS_SCORE };
    }
    return { growth: HOT_GROWTH, bonusScore: HOT_BONUS_SCORE + this.hotTicksRemaining };
  }

  override maybeMove(context: AppleMoveContext): { roomId: string; position: Vector2Like } | null {
    if (this.cooled) {
      return null;
    }

    this.hotTicksRemaining -= 1;
    if (this.hotTicksRemaining <= 0) {
      this.hotTicksRemaining = 0;
      this.cooled = true;
      return null;
    }

    const target = this.findNextTarget(context);
    if (!target) {
      this.cooled = true;
      return null;
    }

    this.velocity = this.normalizeVelocity(target.velocity);
    return { roomId: target.roomId, position: target.position };
  }

  protected override getMetadata(): RoadRashMetadata {
    return {
      velocity: { ...this.velocity },
      hotTicksRemaining: this.hotTicksRemaining,
      totalHotTicks: HOT_TICKS,
      cooled: this.cooled,
    };
  }

  private findNextTarget(
    context: AppleMoveContext,
  ): { roomId: string; position: Vector2Like; velocity: Vector2Like } | null {
    const candidates = [
      this.velocity,
      this.normalizeVelocity({ x: -this.velocity.x, y: -this.velocity.y }),
      ...shuffle(context.rng, CARDINAL_DIRECTIONS),
    ];

    for (const velocity of candidates) {
      const target = this.resolveTarget(context, velocity);
      if (target) {
        return { ...target, velocity };
      }
    }

    return null;
  }

  private normalizeVelocity(velocity: Vector2Like): Vector2Like {
    return {
      x: Object.is(velocity.x, -0) ? 0 : velocity.x,
      y: Object.is(velocity.y, -0) ? 0 : velocity.y,
    };
  }

  private resolveTarget(
    context: AppleMoveContext,
    velocity: Vector2Like,
  ): { roomId: string; position: Vector2Like } | null {
    if (this.roomId.startsWith('cave:')) {
      const position = {
        x: this.position.x + velocity.x,
        y: this.position.y + velocity.y,
      };
      if (
        position.x < 0 ||
        position.y < 0 ||
        position.x >= context.grid.cols ||
        position.y >= context.grid.rows
      ) {
        return null;
      }
      return this.isBlocked(context, this.roomId, position, position)
        ? null
        : { roomId: this.roomId, position };
    }

    const [rawRoomX, rawRoomY, rawRoomZ = 0] = this.roomId.split(',').map(Number);
    let localX = this.position.x + velocity.x;
    let localY = this.position.y + velocity.y;
    let roomX = rawRoomX;
    let roomY = rawRoomY;

    if (localX < 0) {
      localX = context.grid.cols - 1;
      roomX -= 1;
    } else if (localX >= context.grid.cols) {
      localX = 0;
      roomX += 1;
    }

    if (localY < 0) {
      localY = context.grid.rows - 1;
      roomY -= 1;
    } else if (localY >= context.grid.rows) {
      localY = 0;
      roomY += 1;
    }

    const roomId = `${roomX},${roomY},${rawRoomZ}`;
    const position = { x: localX, y: localY };
    const global = {
      x: roomX * context.grid.cols + localX,
      y: roomY * context.grid.rows + localY,
    };
    return this.isBlocked(context, roomId, position, global) ? null : { roomId, position };
  }

  private isBlocked(
    context: AppleMoveContext,
    roomId: string,
    localPosition: Vector2Like,
    globalPosition: Vector2Like,
  ): boolean {
    const targetRoom = context.getRoom(roomId);
    const tile = targetRoom.layout[localPosition.y]?.[localPosition.x];
    if (tile !== '.') {
      return true;
    }
    if (context.isAppleOccupied(roomId, localPosition)) {
      return true;
    }
    return context.snake.some(
      (segment) => segment.x === globalPosition.x && segment.y === globalPosition.y,
    );
  }
}
