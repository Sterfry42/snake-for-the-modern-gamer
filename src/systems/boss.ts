import type { GridConfig } from "../config/gameConfig.js";
import type { Vector2Like } from "../core/math.js";
import { addVectors, manhattanDistance } from "../core/math.js";
import type { RoomSnapshot } from "../world/types.js";

export interface Boss {
  id: string;
  body: Vector2Like[];
  health: number;
  roomId: string;
  direction: Vector2Like;
  pull?: {
    radius: number;
    strength: number;
  };
}

export interface BossStepDependencies {
  getRoom(roomId: string): RoomSnapshot;
  getSnakeBody(): readonly Vector2Like[];
}

export class BossManager {
  private bosses = new Map<string, Boss>();
  private readonly grid: GridConfig;

  constructor(grid: GridConfig) {
    this.grid = grid;
  }

  public spawnBoss(roomId: string, bossType: "freak-dennis" | "random" = "random"): void {
    const [roomX, roomY] = roomId.split(",").map(Number);
    const roomOffsetX = roomX * this.grid.cols;
    const roomOffsetY = roomY * this.grid.rows;

    const id = `boss-${Date.now()}`;
    // Meet Freak Dennis
    const centerX = roomOffsetX + this.grid.cols / 2 + 5;
    const centerY = roomOffsetY + this.grid.rows / 2;
    const body: Vector2Like[] = [];
    // Create a 3x3 body, with the center as the 'head' (body[0])
    body.push({ x: centerX, y: centerY });
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        body.push({ x: centerX + dx, y: centerY + dy });
      }
    }
    const boss: Boss = {
      id,
      body,
      health: 100,
      roomId,
      direction: { x: 1, y: 0 },
      pull: {
        radius: 8,
        strength: 0.4, // 40% chance per tick to override player movement
      },
    };
    this.bosses.set(id, boss);
  }

  public step(deps: BossStepDependencies): void {
    for (const boss of this.bosses.values()) {
      this.moveBoss(boss, deps);
    }
  }

  public getBossesInRoom(roomId: string): Boss[] {
    return Array.from(this.bosses.values()).filter((b) => b.roomId === roomId);
  }

  public isCollidingWithBoss(position: Vector2Like, roomId: string): boolean {
    const bossesInRoom = this.getBossesInRoom(roomId);
    for (const boss of bossesInRoom) {
      if (boss.body.some((segment) => segment.x === position.x && segment.y === position.y)) {
        return true;
      }
    }
    return false;
  }

  public getPullFor(snakeHead: Vector2Like, roomId: string, rng: () => number): Vector2Like | null {
    const bossesInRoom = this.getBossesInRoom(roomId);
    for (const boss of bossesInRoom) {
      if (!boss.pull || !boss.body.length) continue;

      const bossHead = boss.body[0];
      const distance = manhattanDistance(snakeHead, bossHead);

      if (distance > 0 && distance <= boss.pull.radius) {
        if (rng() > boss.pull.strength) {
          // The snake resists the pull this tick
          return null;
        }

        // Calculate the direction from the snake to the boss
        const dx = bossHead.x - snakeHead.x;
        const dy = bossHead.y - snakeHead.y;

        // Determine primary axis of pull
        if (Math.abs(dx) > Math.abs(dy)) {
          return { x: Math.sign(dx), y: 0 };
        } else if (Math.abs(dy) > 0) {
          return { x: 0, y: Math.sign(dy) };
        }
      }
    }

    // No pull effect
    return null;
  }

  private moveBoss(boss: Boss, deps: BossStepDependencies): void {
    const room = deps.getRoom(boss.roomId);
    if (!room) return;

    // Simple random movement logic
    if (Math.random() < 0.2) {
      const directions = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];
      // Avoid reversing direction
      const validDirections = directions.filter(
        (d) => d.x + boss.direction.x !== 0 || d.y + boss.direction.y !== 0
      );
      boss.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
    }

    const nextHead = addVectors(boss.body[0], boss.direction);

    const [roomX, roomY] = boss.roomId.split(",").map(Number);
    const localHeadX = nextHead.x - roomX * this.grid.cols;
    const localHeadY = nextHead.y - roomY * this.grid.rows;

    // Check for wall collisions
    if (
      localHeadX < 0 ||
      localHeadX >= this.grid.cols ||
      localHeadY < 0 ||
      localHeadY >= this.grid.rows ||
      room.layout[localHeadY]?.[localHeadX] === "#"
    ) {
      // If hitting a wall, reverse direction and don't move
      boss.direction = { x: -boss.direction.x, y: -boss.direction.y };
      return;
    }

    // Move the boss
    const moveVector = boss.direction;
    const newBody = boss.body.map((segment) => addVectors(segment, moveVector));
    boss.body.length = 0;
    boss.body.push(...newBody);
  }

  public clearAll(): void {
    this.bosses.clear();
  }
}