import { defaultGameConfig, type GameConfig } from "../config/gameConfig.js";
import type { Vector2Like } from "../core/math.js";
import { createRng, type RandomGenerator } from "../core/rng.js";
import { AppleService, type AppleConsumptionResult } from "../apples/appleService.js";
import type { AppleSnapshot } from "../apples/types.js";
import { SnakeState, type SnakeStepDependencies } from "../systems/snakeState.js";
import { WorldService } from "../world/worldService.js";
import { QuestController } from "../systems/questController.js";
import type { Quest } from "../quests/quest.js";
import type { QuestRegistry } from "../quests/questRegistry.js";
import type { QuestRuntime } from "../quests/quest.js";

export interface StepResult {
  status: "alive" | "dead";
  deathReason?: "wall" | "self" | "shielded";
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
  private readonly questController: QuestController;

  constructor(config: GameConfig = defaultGameConfig, registry: QuestRegistry, rng?: RandomGenerator) {
    this.config = config;
    this.rng = rng ?? createRng(config.rng.seed);
    this.world = new WorldService(config.grid, config.world, this.rng);
    this.apples = new AppleService(config.apples, config.grid, this.world, this.rng);
    this.snake = new SnakeState(config.grid, config.snake, config.world.originRoomId);
    this.questController = new QuestController(registry, {
      initialQuestCount: config.quests.initialQuestCount,
      maxActiveQuests: config.quests.maxActiveQuests,
      questOfferChance: config.quests.questOfferChance,
      rng: this.rng,
    });
  }

  reset(): void {
    this.world.clear();
    this.apples.clearAll();
    this.snake.reset(this.config.world.originRoomId);
    this.questController.reset(this);
    this.apples.ensureApple(this.snake.currentRoomId, Array.from(this.snake.bodySegments), this.snake.score);
  }

  step(paused: boolean): StepResult {
    const roomsChanged = new Set<string>();
    const previousRoom = this.snake.currentRoomId;
    const snakeSegments = Array.from(this.snake.bodySegments);

    const skittishRooms = this.apples.moveApples(snakeSegments);
    skittishRooms.forEach((roomId) => roomsChanged.add(roomId));

    const appleBeforeStep = this.apples.getSnapshot(this.snake.currentRoomId);

    const dependencies: SnakeStepDependencies = {
      getRoom: (roomId: string) => this.world.getRoom(roomId),
      ensureApple: (roomId: string, snake, score) => {
        const { changed } = this.apples.ensureApple(roomId, Array.from(snake), score);
        if (changed) {
          roomsChanged.add(roomId);
        }
      },
    };

    const outcome = this.snake.step(dependencies);

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
        roomChanged: previousRoom !== this.snake.currentRoomId,
        questOffer: null,
        questsCompleted: [],
      };
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
      roomChanged: previousRoom !== this.snake.currentRoomId,
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
}
