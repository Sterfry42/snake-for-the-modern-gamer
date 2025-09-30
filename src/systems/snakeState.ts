import type { GridConfig, SnakeConfig } from "../config/gameConfig.js";
import type { Vector2Like } from "../core/math.js";
import { addVectors } from "../core/math.js";
import type { RoomSnapshot } from "../world/types.js";

export interface SnakeStepOutcome {
  status: "alive" | "dead";
  reason?: "wall" | "self";
  appleEaten?: boolean;
}

export interface SnakeStepDependencies {
  getRoom(roomId: string): RoomSnapshot;
  ensureApple(roomId: string, snake: readonly Vector2Like[], score: number): void;
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
    this.direction = { ...this.nextDirection };
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
    if (tile === "#") {
      return { status: "dead", reason: "wall" };
    }

    if (this.body.some((segment) => segment.x === head.x && segment.y === head.y)) {
      return { status: "dead", reason: "self" };
    }

    this.body.unshift({ x: head.x, y: head.y });

    const appleEaten = Boolean(
      finalizedRoom.apple &&
      finalizedRoom.apple.x === finalLocalHeadX &&
      finalizedRoom.apple.y === finalLocalHeadY
    );

    if (!appleEaten) {
      this.body.pop();
    }

    return { status: "alive", appleEaten };
  }
}
