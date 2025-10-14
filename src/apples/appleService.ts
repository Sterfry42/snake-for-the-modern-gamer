import type { AppleSystemConfig, AppleTypeConfig, GridConfig } from "../config/gameConfig.js";
import type { Vector2Like } from "../core/math.js";
import type { RandomGenerator } from "../core/rng.js";
import type { WorldService } from "../world/worldService.js";
import type {
  AppleInstance,
  AppleSnapshot,
  AppleRewards,
  AppleMoveContext,
  AppleConsumptionContext,
} from "./types.js";
import { AppleRegistry } from "./appleRegistry.js";

export interface AppleSpawnResult {
  snapshot: AppleSnapshot | null;
  changed: boolean;
}

export interface AppleConsumptionResult {
  fatal: boolean;
  rewards: AppleRewards;
  worldPosition: Vector2Like | null;
  changed: boolean;
  snapshot: AppleSnapshot | null;
}

export class AppleService {
  private readonly registry: AppleRegistry;
  private readonly apples = new Map<string, AppleInstance>();

  constructor(
    private readonly config: AppleSystemConfig,
    private readonly grid: GridConfig,
    private readonly world: WorldService,
    private readonly rng: RandomGenerator
  ) {
    this.registry = new AppleRegistry(config);
  }

  getSnapshot(roomId: string): AppleSnapshot | null {
    const apple = this.apples.get(roomId);
    return apple ? apple.getSnapshot() : null;
  }

  ensureApple(roomId: string, snake: Vector2Like[], score: number): AppleSpawnResult {
    const existing = this.apples.get(roomId);
    if (existing) {
      return { snapshot: existing.getSnapshot(), changed: false };
    }
    return this.spawnApple(roomId, snake, score);
  }

  spawnApple(roomId: string, snake: Vector2Like[], score: number): AppleSpawnResult {
    const room = this.world.getRoom(roomId);
    const spawnOptions = this.collectSpawnOptions(roomId, room.layout, snake);
    if (spawnOptions.length === 0) {
      return { snapshot: null, changed: false };
    }

    const appleType = this.chooseAppleType(score);
    if (!appleType) {
      return { snapshot: null, changed: false };
    }

    const spawnIndex = Math.floor(this.rng() * spawnOptions.length);
    const position = spawnOptions[spawnIndex];
    const instance = this.registry.createInstance(appleType, roomId, position);
    instance.initialize({ rng: this.rng });

    this.apples.set(roomId, instance);
    this.world.setApple(roomId, position);
    return { snapshot: instance.getSnapshot(), changed: true };
  }

  moveApples(snake: Vector2Like[]): Set<string> {
    const affectedRooms = new Set<string>();
    for (const apple of Array.from(this.apples.values())) {
      const context = this.createMoveContext(apple, snake);
      const explicitMove = apple.maybeMove(context);
      if (explicitMove) {
        const movement = this.applyMovement(apple, explicitMove.roomId, explicitMove.position, snake);
        if (movement) {
          affectedRooms.add(movement.from);
          affectedRooms.add(movement.to);
        }
        continue;
      }

      if (!apple.shouldAttemptMove(context)) {
        continue;
      }

      const directions = apple.getMoveDirections(context);
      const movement = this.tryDirections(apple, directions, snake);
      if (movement) {
        affectedRooms.add(movement.from);
        affectedRooms.add(movement.to);
      }
    }
    return affectedRooms;
  }

  handleConsumption(roomId: string, direction: Vector2Like): AppleConsumptionResult {
    const apple = this.apples.get(roomId) ?? null;
    if (!apple) {
      return {
        fatal: false,
        rewards: { growth: 1, bonusScore: 0 },
        worldPosition: null,
        changed: false,
        snapshot: null,
      };
    }

    const context: AppleConsumptionContext = { direction };
    const fatal = apple.isFatalApproach(context);
    if (fatal) {
      return {
        fatal: true,
        rewards: { growth: 0, bonusScore: 0 },
        worldPosition: null,
        changed: false,
        snapshot: apple.getSnapshot(),
      };
    }

    const rewards = apple.onConsume();
    const worldPosition = this.appleWorldPosition(apple);
    this.clearApple(roomId);

    return {
      fatal: false,
      rewards,
      worldPosition,
      changed: true,
      snapshot: null,
    };
  }

  clearApple(roomId: string): void {
    if (!this.apples.has(roomId)) {
      return;
    }
    this.apples.delete(roomId);
    this.world.setApple(roomId, undefined);
  }

  clearAll(): void {
    this.apples.clear();
  }

  private appleWorldPosition(apple: AppleInstance): Vector2Like {
    const [roomX, roomY] = apple.roomId.split(",").map(Number);
    const worldX = (roomX * this.grid.cols + apple.position.x + 0.5) * this.grid.cell;
    const worldY = (roomY * this.grid.rows + apple.position.y + 0.5) * this.grid.cell;
    return { x: worldX, y: worldY };
  }

  private tryDirections(
    apple: AppleInstance,
    directions: Vector2Like[],
    snake: Vector2Like[]
  ): { from: string; to: string } | null {
    for (const dir of directions) {
      const candidate = this.resolveMove(apple, dir, snake);
      if (!candidate) {
        continue;
      }
      const movement = this.applyMovement(apple, candidate.roomId, candidate.position, snake);
      if (movement) {
        return movement;
      }
    }
    return null;
  }

  private applyMovement(
    apple: AppleInstance,
    roomId: string,
    position: Vector2Like,
    snake: Vector2Like[]
  ): { from: string; to: string } | null {
    const fromRoom = apple.roomId;

    const occupant = this.apples.get(roomId);
    if (occupant && occupant !== apple && occupant.position.x === position.x && occupant.position.y === position.y) {
      return null;
    }

    const global = this.toGlobal(roomId, position);
    if (this.isSnakeAtGlobal(snake, global.x, global.y)) {
      return null;
    }

    if (fromRoom !== roomId) {
      this.world.setApple(fromRoom, undefined);
    }

    apple.relocate(roomId, position);
    this.apples.set(roomId, apple);
    this.world.setApple(roomId, position);
    if (fromRoom !== roomId) {
      this.apples.delete(fromRoom);
    }

    return { from: fromRoom, to: apple.roomId };
  }

  private resolveMove(
    apple: AppleInstance,
    dir: Vector2Like,
    snake: Vector2Like[]
  ): { roomId: string; position: Vector2Like } | null {
    let localX = apple.position.x + dir.x;
    let localY = apple.position.y + dir.y;
    let [roomX, roomY, roomZ = 0] = apple.roomId.split(",").map(Number);

    if (localX < 0) {
      localX = this.grid.cols - 1;
      roomX -= 1;
    } else if (localX >= this.grid.cols) {
      localX = 0;
      roomX += 1;
    }

    if (localY < 0) {
      localY = this.grid.rows - 1;
      roomY -= 1;
    } else if (localY >= this.grid.rows) {
      localY = 0;
      roomY += 1;
    }

    const targetRoomId = `${roomX},${roomY},${roomZ}`;
    const targetRoom = this.world.getRoom(targetRoomId);
    const tile = targetRoom.layout[localY]?.[localX];
    if (tile !== ".") {
      return null;
    }

    const occupant = this.apples.get(targetRoomId);
    if (occupant && occupant !== apple && occupant.position.x === localX && occupant.position.y === localY) {
      return null;
    }

    const global = this.toGlobal(targetRoomId, { x: localX, y: localY });
    if (this.isSnakeAtGlobal(snake, global.x, global.y)) {
      return null;
    }

    return { roomId: targetRoomId, position: { x: localX, y: localY } };
  }

  private createMoveContext(apple: AppleInstance, snake: Vector2Like[]): AppleMoveContext {
    return {
      rng: this.rng,
      grid: this.grid,
      snake,
      currentRoom: this.world.getRoom(apple.roomId),
      getRoom: (roomId: string) => this.world.getRoom(roomId),
      isAppleOccupied: (roomId: string, position: Vector2Like) => {
        const occupant = this.apples.get(roomId);
        if (!occupant) return false;
        if (occupant === apple) return false;
        return occupant.position.x === position.x && occupant.position.y === position.y;
      },
    };
  }

  private chooseAppleType(score: number): AppleTypeConfig | null {
    const eligible = this.registry
      .getTypes()
      .filter((type) => (type.spawn.scoreThreshold ?? 0) <= score);

    if (eligible.length === 0) {
      return this.registry.getTypes().find((t) => t.id === "normal") ?? null;
    }

    const totalWeight = eligible.reduce((total, type) => total + type.spawn.base, 0);
    if (totalWeight <= 0) {
      return eligible[0] ?? null;
    }

    const choice = this.rng() * totalWeight;
    let cumulative = 0;
    for (const type of eligible) {
      cumulative += type.spawn.base;
      if (choice <= cumulative) {
        return type;
      }
    }
    return eligible[eligible.length - 1] ?? null;
  }

  private collectSpawnOptions(
    roomId: string,
    layout: string[],
    snake: Vector2Like[]
  ): Vector2Like[] {
    const options: Vector2Like[] = [];
    const [roomX, roomY] = roomId.split(",").map(Number);
    const occupant = this.apples.get(roomId);

    for (let y = 0; y < layout.length; y++) {
      const row = layout[y];
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== ".") continue;
        // Avoid spawning on treasure chests
        if (this.world.hasTreasureAt(roomId, x, y)) continue;
        if (occupant && occupant.position.x === x && occupant.position.y === y) continue;
        const globalX = roomX * this.grid.cols + x;
        const globalY = roomY * this.grid.rows + y;
        if (this.isSnakeAtGlobal(snake, globalX, globalY)) continue;
        options.push({ x, y });
      }
    }
    return options;
  }

  private toGlobal(roomId: string, position: Vector2Like): Vector2Like {
    const [roomX, roomY] = roomId.split(",").map(Number);
    return {
      x: roomX * this.grid.cols + position.x,
      y: roomY * this.grid.rows + position.y,
    };
  }

  private isSnakeAtGlobal(snake: Vector2Like[], x: number, y: number): boolean {
    return snake.some((segment) => segment.x === x && segment.y === y);
  }
}
