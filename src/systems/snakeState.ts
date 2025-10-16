import type { GridConfig, SnakeConfig } from "../config/gameConfig.js";
import type { Vector2Like } from "../core/math.js";
import { addVectors } from "../core/math.js";
import type { BossManager } from "./boss.js";
import type { RoomSnapshot } from "../world/types.js";

export interface SnakeStepOutcome {
  status: "alive" | "dead";
  reason?: "wall" | "self" | "boss";
  appleEaten?: boolean;
}

export interface SnakeStepDependencies {
  getRoom(roomId: string): RoomSnapshot;
  ensureApple(roomId: string, snake: readonly Vector2Like[], score: number): void;
  getBossManager(): BossManager;
}

export class SnakeState {
  readonly grid: GridConfig;
  readonly flags: Record<string, unknown> = {};

  private readonly config: SnakeConfig;
  private body: Vector2Like[] = [];
  private direction: Vector2Like;
  private nextDirection: Vector2Like;
  private scoreValue = 0;
  private teleportEnabled = false;
  private roomId: string;

  constructor(grid: GridConfig, snakeConfig: SnakeConfig, originRoomId: string) {
    this.grid = grid;
    this.config = snakeConfig;
    this.direction = { ...snakeConfig.initialDirection };
    this.nextDirection = { ...snakeConfig.initialDirection };
    this.roomId = originRoomId;
    this.reset(originRoomId);
  }

  reset(originRoomId: string): void {
    this.body = this.config.initialBody.map((segment) => ({ x: segment.x, y: segment.y }));
    this.direction = { ...this.config.initialDirection };
    this.nextDirection = { ...this.config.initialDirection };
    this.scoreValue = 0;
    this.teleportEnabled = false;
    this.roomId = originRoomId;
    for (const key of Object.keys(this.flags)) {
      delete this.flags[key];
    }
  }

  get bodySegments(): readonly Vector2Like[] {
    return this.body;
  }

  get head(): Vector2Like {
    return this.body[0];
  }

  get score(): number {
    return this.scoreValue;
  }

  set score(value: number) {
    this.scoreValue = value;
  }

  addScore(amount: number): void {
    this.scoreValue += amount;
  }

  get currentRoomId(): string {
    return this.roomId;
  }

  set currentRoomId(value: string) {
    this.roomId = value;
  }

  get directionVector(): Vector2Like {
    return this.direction;
  }

  get nextDirectionVector(): Vector2Like {
    return this.nextDirection;
  }

  setDirection(x: number, y: number): void {
    if (x + this.direction.x === 0 && y + this.direction.y === 0) {
      return;
    }
    this.nextDirection = { x, y };
  }

  enableTeleport(flag: boolean): void {
    this.teleportEnabled = flag;
  }

  get teleport(): boolean {
    return this.teleportEnabled;
  }

  grow(extraSegments: number): void {
    if (extraSegments <= 0) {
      return;
    }
    const tail = this.body[this.body.length - 1];
    if (!tail) {
      return;
    }
    for (let i = 0; i < extraSegments; i++) {
      this.body.push({ x: tail.x, y: tail.y });
    }
  }

  step(deps: SnakeStepDependencies): SnakeStepOutcome {
    const previousSnapshot = {
      body: this.body.map((segment) => ({ x: segment.x, y: segment.y })),
      roomId: this.roomId,
      direction: { ...this.direction },
      nextDirection: { ...this.nextDirection },
    };
    this.flags["internal.previousSnapshot"] = previousSnapshot;

    const bossManager = deps.getBossManager();
    const currentHeadBeforeMove = this.body[0];
    const pullDirection = currentHeadBeforeMove
      ? bossManager.getPullFor(currentHeadBeforeMove, this.roomId, Math.random)
      : null;

    if (pullDirection) {
      this.direction = pullDirection;
    } else {
      this.direction = { ...this.nextDirection };
    }

    const previousHead = currentHeadBeforeMove;
    if (previousHead) {
      this.flags["internal.previousHead"] = { x: previousHead.x, y: previousHead.y };
    } else {
      delete this.flags["internal.previousHead"];
    }
    delete this.flags["internal.lastRemovedTail"];
    delete this.flags["geometry.wallEaten"];
    delete this.flags["geometry.terraShieldTriggered"];

    const head = addVectors(this.body[0], this.direction);

    let roomChanged = false;

    const [roomX, roomY, roomZ = 0] = this.roomId.split(",").map(Number);
    const localHeadX = head.x - roomX * this.grid.cols;
    const localHeadY = head.y - roomY * this.grid.rows;
    const currentRoom = deps.getRoom(this.roomId);

    const portal = currentRoom.portals.find((p) => p.x === localHeadX && p.y === localHeadY);
    if (portal) {
      this.roomId = portal.destRoomId;
      roomChanged = true;
    }

    const newRoomX = Math.floor(head.x / this.grid.cols);
    const newRoomY = Math.floor(head.y / this.grid.rows);
    if (newRoomX !== roomX || newRoomY !== roomY) {
      this.roomId = `${newRoomX},${newRoomY},${roomZ}`;
      roomChanged = true;
    }

    if (roomChanged) {
      deps.ensureApple(this.roomId, this.body, this.scoreValue);
    }

    const finalizedRoom = deps.getRoom(this.roomId);
    const baseRoomX = Math.floor(head.x / this.grid.cols) * this.grid.cols;
    const baseRoomY = Math.floor(head.y / this.grid.rows) * this.grid.rows;
    const finalLocalHeadX = head.x - baseRoomX;
    const finalLocalHeadY = head.y - baseRoomY;

    const tile = finalizedRoom.layout[finalLocalHeadY]?.[finalLocalHeadX];
    const invulnTicks = Number(this.flags["fortitude.invulnerabilityTicks"] ?? 0);
    if (tile === "#") {
      if (invulnTicks > 0) {
        // Invulnerability lets us phase through the wall.
      } else if (this.tryConsumeWall(finalizedRoom, finalLocalHeadX, finalLocalHeadY, head)) {
        this.flags["geometry.wallEaten"] = { x: head.x, y: head.y, roomId: this.roomId };
      } else {
        return { status: "dead", reason: "wall" };
      }
    }

    const selfCollisionIndex = this.body.findIndex((segment) => segment.x === head.x && segment.y === head.y);
    if (selfCollisionIndex !== -1) {
      if (this.resolveSelfCollision(head, selfCollisionIndex, invulnTicks)) {
        this.sliceSnakeAtIndex(selfCollisionIndex);
      } else {
        return { status: "dead", reason: "self" };
      }
    }

    if (bossManager.isCollidingWithBoss(head, this.roomId) && invulnTicks <= 0) {
      const smite = Number(this.flags["powerup.smiteTicks"] ?? 0);
      if (smite > 0) {
        // Kill the boss we collided with instead of dying
        bossManager.killBossAtPosition(head, this.roomId);
        this.flags["ui.bossSmite"] = {
          x: head.x,
          y: head.y,
          roomId: this.getRoomIdForPosition(head),
        };
      } else {
        return { status: "dead", reason: "boss" };
      }
    }

    this.body.unshift({ x: head.x, y: head.y });
    this.flags["internal.currentHead"] = { x: head.x, y: head.y };

    const appleEaten = Boolean(
      finalizedRoom.apple &&
      finalizedRoom.apple.x === finalLocalHeadX &&
      finalizedRoom.apple.y === finalLocalHeadY
    );

    if (!appleEaten) {
      const removed = this.body.pop();
      if (removed) {
        const tailRoomX = Math.floor(removed.x / this.grid.cols);
        const tailRoomY = Math.floor(removed.y / this.grid.rows);
        const [, , roomZ = "0"] = this.roomId.split(",");
        this.flags["internal.lastRemovedTail"] = {
          x: removed.x,
          y: removed.y,
          roomId: `${tailRoomX},${tailRoomY},${roomZ}`
        };
      } else {
        delete this.flags["internal.lastRemovedTail"];
      }
    } else {
      delete this.flags["internal.lastRemovedTail"];
    }

    return { status: "alive", appleEaten };
  }
  restorePreviousSnapshot(): void {
    const snapshot = this.flags["internal.previousSnapshot"] as
      | {
          body: Vector2Like[];
          roomId: string;
          direction: Vector2Like;
          nextDirection: Vector2Like;
        }
      | undefined;
    if (!snapshot) {
      return;
    }
    this.body = snapshot.body.map((segment) => ({ x: segment.x, y: segment.y }));
    this.roomId = snapshot.roomId;
    this.direction = { ...snapshot.direction };
    this.nextDirection = { ...snapshot.nextDirection };
    const currentHead = this.body[0];
    if (currentHead) {
      this.flags["internal.currentHead"] = { x: currentHead.x, y: currentHead.y };
    }
    delete this.flags["internal.previousSnapshot"];
  }

  private resolveSelfCollision(head: Vector2Like, collisionIndex: number, invulnTicks: number): boolean {
    if (invulnTicks > 0) {
      return true;
    }
    return this.tryConsumeSelfCollision(head);
  }

  private sliceSnakeAtIndex(index: number): void {
    if (index <= 0) {
      return;
    }
    this.body.splice(index);
  }

  private tryConsumeSelfCollision(head: Vector2Like): boolean {
    const state = this.flags["fortitude.hardened"] as { charges?: number } | undefined;
    const charges = state?.charges ?? 0;
    if (charges <= 0) {
      return false;
    }
    const next = Math.max(0, charges - 1);
    this.flags["fortitude.hardened"] = { ...state, charges: next };
    this.flags["fortitude.hardenedTriggered"] = {
      x: head.x,
      y: head.y,
      roomId: this.getRoomIdForPosition(head),
    };
    return true;
  }

  private getRoomIdForPosition(position: Vector2Like): string {
    const roomX = Math.floor(position.x / this.grid.cols);
    const roomY = Math.floor(position.y / this.grid.rows);
    const [, , roomZ = "0"] = this.roomId.split(",");
    return `${roomX},${roomY},${roomZ}`;
  }

  private tryConsumeWall(
    room: RoomSnapshot,
    localX: number,
    localY: number,
    _head: Vector2Like
  ): boolean {
    const canEatWalls = Boolean(this.flags["geometry.canEatWalls"]);
    const shieldState = this.flags["geometry.terraShield"] as
      | { charges: number; max?: number; recharge?: number }
      | undefined;
    const traversalShield = this.flags["traversal.ghostShield"] as { charges?: number } | undefined;

    let usingShield = false;

    if (!canEatWalls) {
      const traversalCharges = traversalShield?.charges ?? 0;
      if (traversalCharges > 0) {
        const nextTraversal = {
          ...traversalShield,
          charges: Math.max(0, traversalCharges - 1),
        };
        this.flags["traversal.ghostShield"] = nextTraversal;
        const [roomX, roomY] = this.roomId.split(",").map(Number);
        const worldX = roomX * this.grid.cols + localX;
        const worldY = roomY * this.grid.rows + localY;
        this.flags["traversal.ghostShieldTriggered"] = { x: worldX, y: worldY, roomId: this.roomId };
        usingShield = true;
      } else {
        const charges = shieldState?.charges ?? 0;
        if (charges <= 0) {
          return false;
        }
        const max = shieldState?.max ?? charges;
        const nextShield = {
          charges: Math.max(0, charges - 1),
          max,
          recharge: shieldState?.recharge,
        };
        this.flags["geometry.terraShield"] = nextShield;
        const [roomX, roomY] = this.roomId.split(",").map(Number);
        const worldX = roomX * this.grid.cols + localX;
        const worldY = roomY * this.grid.rows + localY;
        this.flags["geometry.terraShieldTriggered"] = { x: worldX, y: worldY, roomId: this.roomId };
        usingShield = true;
      }
    }

    this.clearWallTile(room, localX, localY);
    return canEatWalls || usingShield;
  }

  private clearWallTile(room: RoomSnapshot, localX: number, localY: number): void {
    const row = room.layout[localY];
    if (!row || row[localX] === undefined) {
      return;
    }
    if (row[localX] === "#") {
      room.layout[localY] = row.substring(0, localX) + "." + row.substring(localX + 1);
    }
    if (room.apple && room.apple.x === localX && room.apple.y === localY) {
      delete room.apple;
    }
  }
}








