import type { GridConfig } from "../config/gameConfig.js";
import type { Vector2Like } from "../core/math.js";
import { addVectors, manhattanDistance } from "../core/math.js";
import type { RoomSnapshot } from "../world/types.js";

export interface Boss {
  id: string;
  name: string;
  kind?: "freak-dennis" | "freaker-dennis" | "revenant" | "angel";
  body: Vector2Like[];
  health: number;
  maxHealth: number;
  roomId: string;
  direction: Vector2Like;
  pull?: {
    radius: number;
    strength: number;
  };
  rainbowPalette?: boolean;
  trackingMode?: boolean;
}

export interface BossStepDependencies {
  getRoom(roomId: string): RoomSnapshot;
  getSnakeBody(): readonly Vector2Like[];
}

export class BossManager {
  private bosses = new Map<string, Boss>();
  private readonly grid: GridConfig;
  private rainbowColorTimer: number = 0;

  constructor(grid: GridConfig) {
    this.grid = grid;
  }

  public spawnBoss(roomId: string, bossType: "freak-dennis" | "freaker-dennis" | "random" | "fallen-angel" = "random"): void {
    if (!roomId || typeof roomId !== "string" || !roomId.includes(",")) {
      console.warn('[spawnBoss] Invalid roomId provided:', roomId);
      return;
    }
    const [roomX, roomY] = roomId.split(",").map(Number);
    const roomOffsetX = roomX * this.grid.cols;
    const roomOffsetY = roomY * this.grid.rows;

    const id = `boss-${Date.now()}`;
    const name =
      bossType === "freak-dennis" ? "Freak Dennis" :
      bossType === "freaker-dennis" ? "Freaker Dennis" :
      bossType === "fallen-angel" ? "The Angel, Insulted" :
      "Dread Revenant";
    const kind = bossType === "fallen-angel" ? "angel" : bossType === "freak-dennis" ? "freak-dennis" : "freaker-dennis";

    const centerX = roomOffsetX + this.grid.cols / 2 + 5;
    const centerY = roomOffsetY + this.grid.rows / 2;
    const body: Vector2Like[] = [];
    body.push({ x: centerX, y: centerY });
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        body.push({ x: centerX + dx, y: centerY + dy });
      }
    }

    const isFreaker = bossType === "freaker-dennis";
    const baseHealth = isFreaker ? 150 : 100;
    const basePullRadius = isFreaker ? 10 : 8;
    const basePullStrength = isFreaker ? 0.6 : 0.4;

    const boss: Boss = {
      id,
      name,
      kind,
      body,
      health: baseHealth,
      maxHealth: baseHealth,
      roomId,
      direction: { x: 1, y: 0 },
      rainbowPalette: isFreaker,
      trackingMode: isFreaker,
      pull: {
        radius: basePullRadius,
        strength: basePullStrength,
      },
    };
    this.bosses.set(id, boss);
  }

  public step(deps: BossStepDependencies): void {
    for (const boss of this.bosses.values()) {
      if (boss.kind === "angel") {
        this.moveAngelBoss(boss, deps);
      } else if (boss.kind === "freaker-dennis") {
        this.moveFreakerDennis(boss, deps);
      } else {
        this.moveStandardBoss(boss, deps);
      }
    }
  }

  public getBossesInRoom(roomId: string): Boss[] {
    const [targetRoomX, targetRoomY, targetRoomZ = 0] = roomId.split(",").map(Number);
    return Array.from(this.bosses.values()).filter((boss) => {
      const [, , bossRoomZ = 0] = boss.roomId.split(",").map(Number);
      if (bossRoomZ !== targetRoomZ) {
        return false;
      }
      return boss.body.some((segment) => {
        const roomX = Math.floor(segment.x / this.grid.cols);
        const roomY = Math.floor(segment.y / this.grid.rows);
        return roomX === targetRoomX && roomY === targetRoomY;
      });
    });
  }

  public isCollidingWithBoss(position: Vector2Like, roomId: string): boolean {
    return Boolean(this.getBossAtPosition(position, roomId));
  }

  public getBossAtPosition(position: Vector2Like, roomId: string): Boss | null {
    const bossesInRoom = this.getBossesInRoom(roomId);
    for (const boss of bossesInRoom) {
      if (boss.body.some((segment) => segment.x === position.x && segment.y === position.y)) {
        return boss;
      }
    }
    return null;
  }

  public killBossAtPosition(position: Vector2Like, roomId: string): boolean {
    // Remove the first boss that contains the position
    for (const [id, boss] of this.bosses) {
      if (boss.roomId.split(",")[2] !== roomId.split(",")[2]) continue;
      if (boss.body.some((segment) => segment.x === position.x && segment.y === position.y)) {
        this.bosses.delete(id);
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
        if (boss.kind === "freaker-dennis") {
          if (rng() > boss.pull.strength * 0.8) {
            return null;
          }
        } else {
          if (rng() > boss.pull.strength) {
            return null;
          }
        }

        const dx = bossHead.x - snakeHead.x;
        const dy = bossHead.y - snakeHead.y;

        if (Math.abs(dx) > Math.abs(dy)) {
          return { x: Math.sign(dx), y: 0 };
        }
        if (Math.abs(dy) > 0) {
          return { x: 0, y: Math.sign(dy) };
        }
      }
    }

    return null;
  }

  private moveBoss(boss: Boss, deps: BossStepDependencies): void {
    if (boss.kind === "angel") {
      this.moveAngelBoss(boss, deps);
      return;
    }

    if (Math.random() < 0.2) {
      const directions = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];
      const validDirections = directions.filter(
        (d) => d.x + boss.direction.x !== 0 || d.y + boss.direction.y !== 0
      );
      const choices = validDirections.length > 0 ? validDirections : directions;
      boss.direction = choices[Math.floor(Math.random() * choices.length)];
    }

    if (!boss.body.length) {
      return;
    }

    const nextHead = addVectors(boss.body[0], boss.direction);
    const [, , roomZ = 0] = boss.roomId.split(",").map(Number);

    const targetRoomX = Math.floor(nextHead.x / this.grid.cols);
    const targetRoomY = Math.floor(nextHead.y / this.grid.rows);
    const baseRoomX = targetRoomX * this.grid.cols;
    const baseRoomY = targetRoomY * this.grid.rows;
    const localHeadX = nextHead.x - baseRoomX;
    const localHeadY = nextHead.y - baseRoomY;

    const targetRoomId = `${targetRoomX},${targetRoomY},${roomZ}`;
    const targetRoom = deps.getRoom(targetRoomId);
    if (!targetRoom) {
      boss.direction = { x: -boss.direction.x, y: -boss.direction.y };
      return;
    }

    const tile = targetRoom.layout[localHeadY]?.[localHeadX];
    if (tile === "#") {
      boss.direction = { x: -boss.direction.x, y: -boss.direction.y };
      return;
    }

    const moveVector = boss.direction;
    boss.body = boss.body.map((segment) => addVectors(segment, moveVector));
    boss.roomId = targetRoomId;
  }

  private moveFreakerDennis(boss: Boss, deps: BossStepDependencies): void {
    if (!boss.trackingMode) {
      this.moveStandardBoss(boss, deps);
      return;
    }

    const snakeHead = deps.getSnakeBody()[0];
    const bossHead = boss.body[0];
    if (!snakeHead || !bossHead) {
      this.moveStandardBoss(boss, deps);
      return;
    }

    const [playerRoomX, playerRoomY] = snakeHead.x / this.grid.cols;
    const [bossRoomX, bossRoomY] = bossHead.x / this.grid.cols;

    if (playerRoomX === bossRoomX && playerRoomY === bossRoomY) {
      this.moveTrackingBoss(boss, snakeHead, deps);
    } else {
      this.moveStandardBoss(boss, deps);
    }
  }

  private moveTrackingBoss(boss: Boss, snakeHead: Vector2Like, deps: BossStepDependencies): void {
    const bossHead = boss.body[0];
    const dx = snakeHead.x - bossHead.x;
    const dy = snakeHead.y - bossHead.y;
    const distance = Math.abs(dx) + Math.abs(dy);

    let targetDirection: Vector2Like;
    let shouldMove = false;

    if (distance > 0) {
      const normalizedDx = dx / distance;
      const normalizedDy = dy / distance;

      targetDirection = {
        x: normalizedDx > 0.5 ? 1 : normalizedDx < -0.5 ? -1 : 0,
        y: normalizedDy > 0.5 ? 1 : normalizedDy < -0.5 ? -1 : 0,
      };

      if (targetDirection.x !== 0 && boss.direction.x !== 0) return;
      if (targetDirection.y !== 0 && boss.direction.y !== 0) return;

      if (Math.random() < 0.7) {
        shouldMove = true;
      }
    }

    if (!shouldMove) {
      if (Math.random() < 0.2) {
        const directions = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ];
        const validDirections = directions.filter(
          (d) => d.x + boss.direction.x !== 0 || d.y + boss.direction.y !== 0
        );
        boss.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
      }
    }

    if (boss.body.length > 0) {
      this.attemptMove(boss, boss.direction, deps);
    }
  }

  private moveStandardBoss(boss: Boss, deps: BossStepDependencies): void {
    if (Math.random() < 0.2) {
      const directions = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];
      const validDirections = directions.filter(
        (d) => d.x + boss.direction.x !== 0 || d.y + boss.direction.y !== 0
      );
      const choices = validDirections.length > 0 ? validDirections : directions;
      boss.direction = choices[Math.floor(Math.random() * choices.length)];
    }

    if (boss.body.length > 0) {
      this.attemptMove(boss, boss.direction, deps);
    }
  }

  private moveAngelBoss(boss: Boss, deps: BossStepDependencies): void {
    const snakeHead = deps.getSnakeBody()[0];
    const bossHead = boss.body[0];
    if (!snakeHead || !bossHead) {
      return;
    }

    const dx = snakeHead.x - bossHead.x;
    const dy = snakeHead.y - bossHead.y;
    const preferred =
      Math.abs(dx) >= Math.abs(dy)
        ? [{ x: Math.sign(dx), y: 0 }, { x: 0, y: Math.sign(dy) }]
        : [{ x: 0, y: Math.sign(dy) }, { x: Math.sign(dx), y: 0 }];

    const directions = preferred.filter((direction) => direction.x !== 0 || direction.y !== 0);
    for (const direction of directions) {
      if (this.tryMoveBoss(boss, direction, deps)) {
        return;
      }
    }
  }

  private tryMoveBoss(boss: Boss, direction: Vector2Like, deps: BossStepDependencies): boolean {
    const nextHead = addVectors(boss.body[0], direction);
    const [, , roomZ = 0] = boss.roomId.split(",").map(Number);
    const targetRoomX = Math.floor(nextHead.x / this.grid.cols);
    const targetRoomY = Math.floor(nextHead.y / this.grid.rows);
    const baseRoomX = targetRoomX * this.grid.cols;
    const baseRoomY = targetRoomY * this.grid.rows;
    const localHeadX = nextHead.x - baseRoomX;
    const localHeadY = nextHead.y - baseRoomY;
    const targetRoomId = `${targetRoomX},${targetRoomY},${roomZ}`;
    const targetRoom = deps.getRoom(targetRoomId);
    if (!targetRoom || targetRoom.layout[localHeadY]?.[localHeadX] === "#") {
      return false;
    }

    boss.direction = direction;
    boss.body = boss.body.map((segment) => addVectors(segment, direction));
    boss.roomId = targetRoomId;
    return true;
  }

  public clearAll(): void {
    this.bosses.clear();
  }

  private attemptMove(boss: Boss, direction: Vector2Like, deps: BossStepDependencies): void {
    const nextHead = addVectors(boss.body[0], direction);
    const [, , roomZ = 0] = boss.roomId.split(",").map(Number);

    const targetRoomX = Math.floor(nextHead.x / this.grid.cols);
    const targetRoomY = Math.floor(nextHead.y / this.grid.rows);
    const baseRoomX = targetRoomX * this.grid.cols;
    const baseRoomY = targetRoomY * this.grid.rows;
    const localHeadX = nextHead.x - baseRoomX;
    const localHeadY = nextHead.y - baseRoomY;

    const targetRoomId = `${targetRoomX},${targetRoomY},${roomZ}`;
    const targetRoom = deps.getRoom(targetRoomId);
    if (!targetRoom) {
      boss.direction = { x: -boss.direction.x, y: -boss.direction.y };
      return;
    }

    const tile = targetRoom.layout[localHeadY]?.[localHeadX];
    if (tile === "#") {
      boss.direction = { x: -boss.direction.x, y: -boss.direction.y };
      return;
    }

    const moveVector = boss.direction;
    boss.body = boss.body.map((segment) => addVectors(segment, moveVector));
    boss.roomId = targetRoomId;
  }
}
