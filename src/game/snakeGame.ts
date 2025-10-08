import { defaultGameConfig, type GameConfig } from "../config/gameConfig.js";
import type { Vector2Like } from "../core/math.js";
import { createRng, type RandomGenerator } from "../core/rng.js";
import { AppleService, type AppleConsumptionResult } from "../apples/appleService.js";
import type { AppleSnapshot } from "../apples/types.js";
import { SnakeState, type SnakeStepDependencies } from "../systems/snakeState.js";
import { BossManager } from "../systems/boss.js";
import { WorldService } from "../world/worldService.js";
import { QuestController } from "../systems/questController.js";
import type { Quest } from "../quests/quest.js";
import type { QuestRegistry } from "../quests/questRegistry.js";
import type { QuestRuntime } from "../quests/quest.js";

export interface StepResult {
  status: "alive" | "dead";
  deathReason?: "wall" | "self" | "shielded" | "boss";
  apple: {
    eaten: boolean;
    rewards?: AppleConsumptionResult["rewards"];
    worldPosition?: Vector2Like | null;
    current: AppleSnapshot | null;
    stateChanged: boolean;
  };
  roomsChanged: Set<string>;
  roomChanged: boolean;
  questOffer?: Quest | null;
  questsCompleted: Quest[];
}

export class SnakeGame implements QuestRuntime {
  readonly config: GameConfig;

  private readonly rng: RandomGenerator;
  private readonly world: WorldService;
  private readonly apples: AppleService;
  private readonly snake: SnakeState;
  private readonly bosses: BossManager;
  private readonly questController: QuestController;
  private readonly visitedRooms: Set<string>;

  constructor(config: GameConfig = defaultGameConfig, registry: QuestRegistry, rng?: RandomGenerator) {
    this.config = config;
    this.rng = rng ?? createRng(config.rng.seed);
    this.world = new WorldService(config.grid, config.world, this.rng);
    this.apples = new AppleService(config.apples, config.grid, this.world, this.rng);
    this.snake = new SnakeState(config.grid, config.snake, config.world.originRoomId);
    this.bosses = new BossManager(config.grid);
    this.questController = new QuestController(registry, {
      initialQuestCount: config.quests.initialQuestCount,
      maxActiveQuests: config.quests.maxActiveQuests,
      questOfferChance: config.quests.questOfferChance,
      rng: this.rng,
    });
    this.visitedRooms = new Set([this.snake.currentRoomId]);
  }

  reset(): void {
    this.world.clear();
    this.apples.clearAll();
    this.snake.reset(this.config.world.originRoomId);
    this.bosses.clearAll();
    this.questController.reset(this);
    this.visitedRooms.clear();
    this.visitedRooms.add(this.snake.currentRoomId);

    // TODO: Make this configurable
    if (this.rng() < 0.05) { // 5% chance to spawn a boss on reset
      this.bosses.spawnBoss(this.snake.currentRoomId, "freak-dennis");
    }

    this.apples.ensureApple(this.snake.currentRoomId, Array.from(this.snake.bodySegments), this.snake.score);
  }

  step(paused: boolean): StepResult {
    const roomsChanged = new Set<string>();
    const previousRoom = this.snake.currentRoomId;
    const snakeSegments = Array.from(this.snake.bodySegments);

    const skittishRooms = this.apples.moveApples(snakeSegments);
    skittishRooms.forEach((roomId) => roomsChanged.add(roomId));

    this.bosses.step({
      getRoom: (roomId: string) => this.world.getRoom(roomId),
      getSnakeBody: () => this.snake.bodySegments,
    });


    const appleBeforeStep = this.apples.getSnapshot(this.snake.currentRoomId);

    const dependencies: SnakeStepDependencies = {
      getRoom: (roomId: string) => this.world.getRoom(roomId),
      ensureApple: (roomId: string, snake, score) => {
        const { changed } = this.apples.ensureApple(roomId, Array.from(snake), score);
        if (changed) {
          roomsChanged.add(roomId);
        }
      },
      getBossManager: () => this.bosses,
    };

    const outcome = this.snake.step(dependencies);

    const roomHasChanged = previousRoom !== this.snake.currentRoomId;
    if (roomHasChanged) {
      const newRoomId = this.snake.currentRoomId;
      if (!this.visitedRooms.has(newRoomId)) {
        this.visitedRooms.add(newRoomId);
        // TODO: Make this configurable
        if (this.rng() < 0.05) { // 5% chance to spawn Freak Dennis in a new room
          this.bosses.spawnBoss(newRoomId, "freak-dennis");
        }
      }
    }

    if (outcome.status === "dead") {
      return {
        status: "dead",
        deathReason: outcome.reason,
        apple: {
          eaten: false,
          current: appleBeforeStep,
          stateChanged: roomsChanged.has(previousRoom),
        },
        roomsChanged,
        roomChanged: roomHasChanged,
        questOffer: null,
        questsCompleted: [],
      };
    }

    const updatedSnake = Array.from(this.snake.bodySegments);
    const currentHead = updatedSnake[0];

    const lastTail = this.getFlag<{ x: number; y: number; roomId?: string }>("internal.lastRemovedTail");
    if (lastTail && this.getFlag<boolean>("geometry.masonryEnabled")) {
      this.applyMasonry(lastTail, updatedSnake, roomsChanged);
    }
    this.setFlag("internal.lastRemovedTail", undefined);

    const wallEaten = this.getFlag<{ x: number; y: number; roomId: string }>("geometry.wallEaten");
    if (wallEaten) {
      this.handleWallEaten(wallEaten, roomsChanged);
      this.setFlag("geometry.wallEaten", undefined);
    }

    if (this.getFlag<boolean>("geometry.faultLineEnabled") && currentHead) {
      this.applyFaultLine(currentHead, roomsChanged);
    }

    let appleStateChanged = roomsChanged.has(this.snake.currentRoomId);
    let appleSnapshot = this.apples.getSnapshot(this.snake.currentRoomId);
    let appleRewards: AppleConsumptionResult["rewards"] | undefined;
    let appleWorldPosition: Vector2Like | null = null;
    let appleEaten = false;

    if (outcome.appleEaten) {
      appleEaten = true;
      const consumption = this.apples.handleConsumption(this.snake.currentRoomId, this.snake.directionVector);
      if (consumption.fatal) {
        return {
          status: "dead",
          deathReason: "shielded",
          apple: {
            eaten: true,
            current: appleBeforeStep,
            stateChanged: true,
          },
          roomsChanged,
          roomChanged: previousRoom !== this.snake.currentRoomId,
          questOffer: null,
          questsCompleted: [],
        };
      }

      appleRewards = consumption.rewards;
      appleWorldPosition = consumption.worldPosition ?? null;
      appleStateChanged = appleStateChanged || consumption.changed;

      if (consumption.rewards.bonusScore > 0) {
        this.addScore(consumption.rewards.bonusScore);
      }

      const extraGrowth = Math.max(0, consumption.rewards.growth - 1);
      if (extraGrowth > 0) {
        this.snake.grow(extraGrowth);
      }

      const spawn = this.apples.spawnApple(this.snake.currentRoomId, Array.from(this.snake.bodySegments), this.snake.score);
      if (spawn.changed) {
        appleStateChanged = true;
      }
      appleSnapshot = spawn.snapshot;

      const seismicRadius = this.getFlag<number>("geometry.seismicPulseRadius") ?? 0;
      if (seismicRadius > 0 && currentHead) {
        this.triggerSeismicPulse(currentHead, seismicRadius, roomsChanged);
      }
      if (this.getFlag<boolean>("geometry.collapseControlEnabled") && currentHead) {
        this.triggerCollapseControl(currentHead, updatedSnake, roomsChanged);
      }
      this.rechargeTerraShield();

    }

    if (appleStateChanged) {
      roomsChanged.add(this.snake.currentRoomId);
    }

    const questsCompleted = this.questController.handleCompletions(this);
    const questOffer = this.questController.maybeCreateOffer(paused, this) ?? undefined;

    return {
      status: "alive",
      apple: {
        eaten: appleEaten,
        rewards: appleRewards,
        worldPosition: appleWorldPosition,
        current: appleSnapshot,
        stateChanged: appleStateChanged,
      },
      roomsChanged,
      roomChanged: roomHasChanged,
      questOffer,
      questsCompleted,
    };
  }

  getCurrentRoom() {
    return this.world.getRoom(this.snake.currentRoomId);
  }

  getApple(roomId: string): AppleSnapshot | null {
    return this.apples.getSnapshot(roomId);
  }

  getSnakeBody(): readonly Vector2Like[] {
    return this.snake.bodySegments;
  }

  getDirection(): Vector2Like {
    return this.snake.directionVector;
  }

  getScore(): number {
    return this.snake.score;
  }

  addScore(amount: number): void {
    this.snake.addScore(amount);
  }

  getSnakeLength(): number {
    return this.snake.bodySegments.length;
  }

  growSnake(extraSegments: number): void {
    this.snake.grow(extraSegments);
  }
  setDirection(x: number, y: number): void {
    this.snake.setDirection(x, y);
  }

  getFlag<T = unknown>(key: string): T | undefined {
    return this.snake.flags[key] as T | undefined;
  }

  setFlag(key: string, value: unknown): void {
    if (value === undefined) {
      delete this.snake.flags[key];
    } else {
      this.snake.flags[key] = value;
    }
  }

  random(): number {
    return this.rng();
  }

  enableTeleport(flag: boolean): void {
    this.snake.enableTeleport(flag);
  }

  getTeleport(): boolean {
    return this.snake.teleport;
  }

  getActiveQuests(): Quest[] {
    return this.questController.getActive();
  }

  getCompletedQuestIds(): string[] {
    return this.questController.getCompletedIds();
  }

  getOfferedQuest(): Quest | null {
    return this.questController.getOffered();
  }

  acceptOfferedQuest(): Quest | null {
    return this.questController.acceptOffered();
  }

  rejectOfferedQuest(): void {
    this.questController.rejectOffered();
  }

  getBosses(roomId: string) {
    return this.bosses.getBossesInRoom(roomId);
  }

  private applyMasonry(
    lastTail: { x: number; y: number; roomId?: string },
    snake: readonly Vector2Like[],
    roomsChanged: Set<string>
  ): void {
    const info = this.resolveRoomPosition(lastTail);
    if (!info) {
      return;
    }
    const { roomId, localX, localY } = info;
    if (this.isSnakeOccupying(lastTail, snake)) {
      return;
    }
    const room = this.world.getRoom(roomId);
    const tile = room.layout[localY]?.[localX];
    if (!tile || tile === '#' || tile === 'H') {
      return;
    }
    if (room.apple && room.apple.x === localX && room.apple.y === localY) {
      this.world.setApple(roomId, undefined);
    }
    if (this.setRoomTile(roomId, localX, localY, '#')) {
      roomsChanged.add(roomId);
    }
  }

  private applyFaultLine(head: Vector2Like, roomsChanged: Set<string>): void {
    const info = this.resolveRoomPosition(head);
    if (!info) {
      return;
    }
    const { roomId, localY } = info;
    const room = this.world.getRoom(roomId);
    const row = room.layout[localY];
    if (!row) {
      return;
    }
    const chars = row.split('');
    let changed = false;
    for (let x = 0; x < chars.length; x++) {
      if (chars[x] === '#') {
        chars[x] = '.';
        changed = true;
      }
    }
    if (changed) {
      room.layout[localY] = chars.join('');
      roomsChanged.add(roomId);
    }
  }

  private triggerSeismicPulse(head: Vector2Like, radius: number, roomsChanged: Set<string>): void {
    if (radius <= 0) {
      return;
    }
    const info = this.resolveRoomPosition(head);
    if (!info) {
      return;
    }
    const { roomId, localX, localY } = info;
    const room = this.world.getRoom(roomId);
    let changed = false;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const targetX = localX + dx;
        const targetY = localY + dy;
        if (targetX < 0 || targetX >= this.config.grid.cols || targetY < 0 || targetY >= this.config.grid.rows) {
          continue;
        }
        const tile = room.layout[targetY]?.[targetX];
        if (tile !== '#') {
          continue;
        }
        if (this.setRoomTile(roomId, targetX, targetY, '.')) {
          changed = true;
        }
      }
    }
    if (changed) {
      roomsChanged.add(roomId);
    }
  }

  private triggerCollapseControl(
    head: Vector2Like,
    snake: readonly Vector2Like[],
    roomsChanged: Set<string>
  ): void {
    const info = this.resolveRoomPosition(head);
    if (!info) {
      return;
    }
    const { roomId, localX, localY } = info;
    const room = this.world.getRoom(roomId);
    const offsets: Vector2Like[] = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    let changed = false;
    for (const offset of offsets) {
      const targetX = localX + offset.x;
      const targetY = localY + offset.y;
      const worldPos = { x: head.x + offset.x, y: head.y + offset.y };
      if (
        targetX < 0 ||
        targetX >= this.config.grid.cols ||
        targetY < 0 ||
        targetY >= this.config.grid.rows ||
        this.isSnakeOccupying(worldPos, snake)
      ) {
        continue;
      }
      const tile = room.layout[targetY]?.[targetX];
      if (!tile || tile === '#' || tile === 'H') {
        continue;
      }
      if (room.apple && room.apple.x === targetX && room.apple.y === targetY) {
        this.world.setApple(roomId, undefined);
      }
      if (this.setRoomTile(roomId, targetX, targetY, '#')) {
        changed = true;
      }
    }
    if (changed) {
      roomsChanged.add(roomId);
    }
  }

  private handleWallEaten(
    info: { x: number; y: number; roomId: string },
    roomsChanged: Set<string>
  ): void {
    roomsChanged.add(info.roomId);
    const reward = this.getFlag<{ score?: number; growth?: number }>("geometry.worldEaterReward");
    const bonusScore = reward?.score ?? 1;
    const bonusGrowth = reward?.growth ?? 0;
    if (bonusScore !== 0) {
      this.addScore(bonusScore);
    }
    if (bonusGrowth > 0) {
      this.snake.grow(bonusGrowth);
    }
  }

  private rechargeTerraShield(): void {
    const shield = this.getFlag<{ charges: number; max?: number; recharge?: number }>("geometry.terraShield");
    if (!shield) {
      return;
    }
    const max = shield.max ?? shield.charges;
    if (shield.charges >= max) {
      return;
    }
    const recharge = shield.recharge ?? 1;
    const updated = {
      charges: Math.min(max, shield.charges + recharge),
      max,
      recharge,
    };
    this.setFlag("geometry.terraShield", updated);
  }

  private resolveRoomPosition(position: { x: number; y: number; roomId?: string }): {
    roomId: string;
    localX: number;
    localY: number;
  } | null {
    const roomId = position.roomId ?? this.getRoomIdForPosition(position);
    const [roomX, roomY] = roomId.split(",").map(Number);
    const localX = position.x - roomX * this.config.grid.cols;
    const localY = position.y - roomY * this.config.grid.rows;
    if (
      localX < 0 ||
      localY < 0 ||
      localX >= this.config.grid.cols ||
      localY >= this.config.grid.rows
    ) {
      return null;
    }
    return { roomId, localX, localY };
  }

  private setRoomTile(roomId: string, localX: number, localY: number, tile: string): boolean {
    const room = this.world.getRoom(roomId);
    const row = room.layout[localY];
    if (!row || row[localX] === undefined || row[localX] === tile) {
      return false;
    }
    const chars = row.split('');
    chars[localX] = tile;
    room.layout[localY] = chars.join('');
    return true;
  }

  private isSnakeOccupying(position: Vector2Like, snake: readonly Vector2Like[]): boolean {
    return snake.some((segment) => segment.x === position.x && segment.y === position.y);
  }

  private getRoomIdForPosition(position: Vector2Like): string {
    const roomX = Math.floor(position.x / this.config.grid.cols);
    const roomY = Math.floor(position.y / this.config.grid.rows);
    const [, , roomZ = "0"] = this.snake.currentRoomId.split(",");
    return `${roomX},${roomY},${roomZ}`;
  }
}
