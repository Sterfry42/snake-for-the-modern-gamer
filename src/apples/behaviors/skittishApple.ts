import type { Vector2Like } from "../../core/math.js";
import { AppleInstance, type AppleMoveContext, type AppleRewards } from "../types.js";

const DIRECTIONS: Vector2Like[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

function shuffleDirections(rng: () => number): Vector2Like[] {
  const shuffled = [...DIRECTIONS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export class SkittishApple extends AppleInstance {
  constructor(
    roomId: string,
    position: Vector2Like,
    typeId: string,
    color: number,
    private readonly moveChance: number
  ) {
    super(roomId, position, typeId, color);
  }

  override onConsume(): AppleRewards {
    return { growth: 2, bonusScore: 1 };
  }

  override shouldAttemptMove(context: AppleMoveContext): boolean {
    return context.rng() < this.moveChance;
  }

  override getMoveDirections(context: AppleMoveContext): Vector2Like[] {
    const head = context.snake[0];
    if (!head) {
      return shuffleDirections(context.rng);
    }

    const evaluated = DIRECTIONS.map((dir) => this.evaluateDirection(dir, context, head));
    const anyValid = evaluated.some((entry) => !entry.blocked);

    if (!anyValid) {
      return shuffleDirections(context.rng);
    }

    return evaluated
      .sort((a, b) => {
        if (a.blocked !== b.blocked) {
          return a.blocked ? 1 : -1;
        }
        if (b.distance !== a.distance) {
          return b.distance - a.distance;
        }
        return context.rng() - 0.5;
      })
      .map((entry) => entry.dir);
  }

  private evaluateDirection(
    dir: Vector2Like,
    context: AppleMoveContext,
    head: Vector2Like
  ): { dir: Vector2Like; distance: number; blocked: boolean } {
    const [roomX, roomY, roomZ = 0] = this.roomId.split(",").map(Number);
    let targetLocalX = this.position.x + dir.x;
    let targetLocalY = this.position.y + dir.y;
    let targetRoomX = roomX;
    let targetRoomY = roomY;

    if (targetLocalX < 0) {
      targetLocalX = context.grid.cols - 1;
      targetRoomX -= 1;
    } else if (targetLocalX >= context.grid.cols) {
      targetLocalX = 0;
      targetRoomX += 1;
    }

    if (targetLocalY < 0) {
      targetLocalY = context.grid.rows - 1;
      targetRoomY -= 1;
    } else if (targetLocalY >= context.grid.rows) {
      targetLocalY = 0;
      targetRoomY += 1;
    }

    const targetRoomId = `${targetRoomX},${targetRoomY},${roomZ}`;
    const targetRoom = context.getRoom(targetRoomId);
    const tile = targetRoom.layout[targetLocalY]?.[targetLocalX];
    const blockedByWall = tile !== ".";

    const candidateLocal = { x: targetLocalX, y: targetLocalY };
    const blockedByApple = context.isAppleOccupied(targetRoomId, candidateLocal);

    const globalX = targetRoomX * context.grid.cols + targetLocalX;
    const globalY = targetRoomY * context.grid.rows + targetLocalY;
    const blockedBySnake = context.snake.some((segment) => segment.x === globalX && segment.y === globalY);

    const distance = Math.abs(head.x - globalX) + Math.abs(head.y - globalY);

    return {
      dir,
      distance,
      blocked: blockedByWall || blockedByApple || blockedBySnake,
    };
  }
}
