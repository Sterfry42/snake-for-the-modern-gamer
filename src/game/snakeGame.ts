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

interface PredationComputedConfig {
  enabled: boolean;
  window: number;
  decayHold: number;
  decayStep: number;
  maxStacks: number;
  stackGain: number;
  scorePerStack: number;
  quickEatWindow: number;
  bonusStacksOnQuickEat: number;
  stackGainOnRoomEnter: number;
  scentDuration: number;
  frenzyThreshold: number;
  frenzyDuration: number;
  frenzyScoreBonus: number;
  rend: {
    enabled: boolean;
    gainThreshold: number;
    maxCharges: number;
    growthPerCharge: number;
    scorePerCharge: number;
  };
  apex: {
    enabled: boolean;
    requiredStacks: number;
    score: number;
    growth: number;
    cooldown: number;
  };
}

interface PredationRuntimeState {
  stacks: number;
  timer: number;
  decayHold: number;
  frenzyTicks: number;
  frenzyCooldown: number;
  rendCharges: number;
  apexCooldown: number;
  scentTicks: number;
  ticksSinceLastApple: number;
  lastRoomId: string;
}

function createDefaultPredationConfig(): PredationComputedConfig {
  return {
    enabled: false,
    window: 0,
    decayHold: 0,
    decayStep: 1,
    maxStacks: 0,
    stackGain: 1,
    scorePerStack: 0,
    quickEatWindow: 0,
    bonusStacksOnQuickEat: 0,
    stackGainOnRoomEnter: 0,
    scentDuration: 0,
    frenzyThreshold: Number.POSITIVE_INFINITY,
    frenzyDuration: 0,
    frenzyScoreBonus: 0,
    rend: {
      enabled: false,
      gainThreshold: Number.POSITIVE_INFINITY,
      maxCharges: 0,
      growthPerCharge: 0,
      scorePerCharge: 0,
    },
    apex: {
      enabled: false,
      requiredStacks: Number.POSITIVE_INFINITY,
      score: 0,
      growth: 0,
      cooldown: 0,
    },
  };
}

function createDefaultPredationState(): PredationRuntimeState {
  return {
    stacks: 0,
    timer: 0,
    decayHold: 0,
    frenzyTicks: 0,
    frenzyCooldown: 0,
    rendCharges: 0,
    apexCooldown: 0,
    scentTicks: 0,
    ticksSinceLastApple: Number.POSITIVE_INFINITY,
    lastRoomId: '',
  };
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

  private predationConfig: PredationComputedConfig = createDefaultPredationConfig();
  private predationState: PredationRuntimeState = createDefaultPredationState();

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

    this.resetPredation();
    this.apples.ensureApple(this.snake.currentRoomId, Array.from(this.snake.bodySegments), this.snake.score);
  }

  step(paused: boolean): StepResult {
    const roomsChanged = new Set<string>();
    const previousRoom = this.snake.currentRoomId;
    const snakeSegments = Array.from(this.snake.bodySegments);

    this.hydratePredationConfig();
    const predationState = this.ensurePredationState();
    predationState.lastRoomId = previousRoom;

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

    let outcome = this.snake.step(dependencies);

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
      if (!this.tryFortitudePhoenix(outcome, roomsChanged, previousRoom)) {
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
      outcome = { status: "alive", reason: undefined, appleEaten: false };
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
      this.handleFortitudeOnApple(roomsChanged);

    }

    if (appleStateChanged) {
      roomsChanged.add(this.snake.currentRoomId);
    }

    this.tickPredationTimers();
    this.tickFortitudeStates();

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


  private tickFortitudeStates(): void {
    const invuln = this.getFlag<number>("fortitude.invulnerabilityTicks") ?? 0;
    if (invuln > 0) {
      this.setFlag("fortitude.invulnerabilityTicks", Math.max(0, invuln - 1));
    }
  }

  private handleFortitudeRegenerator(roomsChanged: Set<string>): void {
    const config = this.getFlag<{ interval?: number; amount?: number }>("fortitude.regenerator");
    if (!config || !config.interval || config.interval <= 0) {
      return;
    }
    const counter = (this.getFlag<number>("fortitude.regeneratorCounter") ?? 0) + 1;
    if (counter >= config.interval) {
      const amount = Math.max(1, config.amount ?? 1);
      for (let i = 0; i < amount; i += 1) {
        this.snake.grow(1);
      }
      roomsChanged.add(this.snake.currentRoomId);
      this.setFlag("fortitude.regeneratorCounter", 0);
    } else {
      this.setFlag("fortitude.regeneratorCounter", counter);
    }
  }

  private handleFortitudeOnApple(roomsChanged: Set<string>): void {
    this.activateFortitudeInvulnerability();
    this.processFortitudeBloodBank(roomsChanged);
  }

  private processFortitudeBloodBank(roomsChanged: Set<string>): void {
    const bank = this.getFlag<{ stored?: number; capacity?: number; reward?: { score?: number; growth?: number } }>(
      "fortitude.bloodBank"
    );
    if (!bank) {
      return;
    }
    const capacity = Math.max(1, bank.capacity ?? 1);
    const stored = Math.min(capacity, (bank.stored ?? 0) + 1);
    bank.stored = stored;

    if (stored >= capacity) {
      const reward = bank.reward ?? {};
      if (reward.score && reward.score !== 0) {
        this.addScore(reward.score);
      }
      if (reward.growth && reward.growth > 0) {
        for (let i = 0; i < reward.growth; i += 1) {
          this.snake.grow(1);
        }
        roomsChanged.add(this.snake.currentRoomId);
      }
      bank.stored = 0;
    }

    this.setFlag("fortitude.bloodBank", bank);
  }

  private activateFortitudeInvulnerability(): void {
    const base = this.getFlag<{ duration?: number }>("fortitude.invulnerability");
    if (!base) {
      return;
    }
    const bonus = this.getFlag<number>("fortitude.invulnerabilityBonus") ?? 0;
    const duration = Math.max(0, (base.duration ?? 0) + bonus);
    if (duration <= 0) {
      return;
    }
    const current = this.getFlag<number>("fortitude.invulnerabilityTicks") ?? 0;
    const updated = Math.max(current, duration + 1);
    this.setFlag("fortitude.invulnerabilityTicks", updated);
  }

  private tryFortitudePhoenix(
    outcome: SnakeStepOutcome,
    roomsChanged: Set<string>,
    previousRoomId: string
  ): boolean {
    const state = this.getFlag<{ charges?: number }>("fortitude.phoenix");
    const charges = state?.charges ?? 0;
    if (charges <= 0) {
      return false;
    }

    const remaining = charges - 1;
    this.setFlag("fortitude.phoenix", { ...state, charges: remaining });
    this.snake.restorePreviousSnapshot();
    roomsChanged.add(previousRoomId);
    this.setFlag("fortitude.phoenixTriggered", { reason: outcome.reason ?? "unknown" });

    const base = this.getFlag<{ duration?: number }>("fortitude.invulnerability");
    const bonus = this.getFlag<number>("fortitude.invulnerabilityBonus") ?? 0;
    if (base && (base.duration ?? 0) + bonus > 0) {
      const current = this.getFlag<number>("fortitude.invulnerabilityTicks") ?? 0;
      const refreshed = Math.max(current, (base.duration ?? 0) + bonus + 1);
      this.setFlag("fortitude.invulnerabilityTicks", refreshed);
    }

    return true;
  }

  private handlePredationOnApple(
    consumption: AppleConsumptionResult,
    roomsChanged: Set<string>,
    head: Vector2Like | undefined
  ): { score: number; growth: number } {
    const config = this.predationConfig;
    if (!config.enabled) {
      return { score: 0, growth: 0 };
    }

    this.setFlag("predation.rendConsumed", undefined);
    this.setFlag("predation.apexTriggered", undefined);

    const state = this.ensurePredationState();
    const quickWindow = config.quickEatWindow;
    const quickEligible = quickWindow > 0 && state.ticksSinceLastApple <= quickWindow;
    const maxStacks = Math.max(config.maxStacks, state.stacks + Math.max(config.stackGain, 1));
    let stackGain = Math.max(1, config.stackGain);
    if (quickEligible && config.bonusStacksOnQuickEat > 0) {
      stackGain += config.bonusStacksOnQuickEat;
    }

    state.ticksSinceLastApple = 0;
    state.stacks = Math.min(maxStacks, state.stacks + stackGain);
    state.timer = config.window;
    state.decayHold = config.decayHold;
    state.lastRoomId = this.snake.currentRoomId;

    if (config.scentDuration > 0) {
      state.scentTicks = config.scentDuration;
    }

    const bonus = { score: 0, growth: 0 };

    if (config.scorePerStack > 0 && state.stacks > 0) {
      const scoreGain = Math.ceil(config.scorePerStack * state.stacks);
      if (scoreGain > 0) {
        this.addScore(scoreGain);
        bonus.score += scoreGain;
      }
    }

    if (config.rend.enabled) {
      const maxCharges = Math.max(0, config.rend.maxCharges);
      if (state.stacks >= config.rend.gainThreshold && maxCharges > 0) {
        state.rendCharges = Math.min(maxCharges, state.rendCharges + 1);
      }
      if (state.rendCharges > 0 && (config.rend.scorePerCharge > 0 || config.rend.growthPerCharge > 0)) {
        state.rendCharges -= 1;
        if (config.rend.scorePerCharge > 0) {
          this.addScore(config.rend.scorePerCharge);
          bonus.score += config.rend.scorePerCharge;
        }
        if (config.rend.growthPerCharge > 0) {
          for (let i = 0; i < config.rend.growthPerCharge; i += 1) {
            this.snake.grow(1);
          }
          bonus.growth += config.rend.growthPerCharge;
          roomsChanged.add(this.snake.currentRoomId);
        }
        this.setFlag("predation.rendConsumed", {
          roomId: this.snake.currentRoomId,
          head: head ? { x: head.x, y: head.y } : undefined,
        });
      }
    }

    const frenzyAvailable = Number.isFinite(config.frenzyThreshold) && state.stacks >= config.frenzyThreshold;
    if (frenzyAvailable && config.frenzyDuration > 0 && state.frenzyTicks <= 0) {
      state.frenzyTicks = config.frenzyDuration;
      this.setFlag("predation.frenzyTriggered", {
        roomId: this.snake.currentRoomId,
        stacks: state.stacks,
      });
    }

    if (config.apex.enabled && state.frenzyTicks > 0 && state.stacks >= config.apex.requiredStacks && state.apexCooldown <= 0) {
      state.apexCooldown = config.apex.cooldown;
      if (config.apex.score > 0) {
        this.addScore(config.apex.score);
        bonus.score += config.apex.score;
      }
      if (config.apex.growth > 0) {
        for (let i = 0; i < config.apex.growth; i += 1) {
          this.snake.grow(1);
        }
        bonus.growth += config.apex.growth;
        roomsChanged.add(this.snake.currentRoomId);
      }
      state.stacks = Math.max(0, state.stacks - config.apex.requiredStacks);
      this.setFlag("predation.apexTriggered", {
        roomId: this.snake.currentRoomId,
        stacks: state.stacks,
      });
    }

    this.syncPredationFlags();
    return bonus;
  }

  private handlePredationOnRoomChange(newRoomId: string): void {
    const config = this.predationConfig;
    const state = this.ensurePredationState();
    state.lastRoomId = newRoomId;
    if (!config.enabled || config.stackGainOnRoomEnter <= 0) {
      this.syncPredationFlags();
      return;
    }
    const maxStacks = Math.max(config.maxStacks, state.stacks + config.stackGainOnRoomEnter);
    state.stacks = Math.min(maxStacks, state.stacks + config.stackGainOnRoomEnter);
    if (state.stacks > 0) {
      if (config.window > 0) {
        state.timer = Math.max(state.timer, config.window);
      }
      state.decayHold = config.decayHold;
    }
    this.syncPredationFlags();
  }
  private resetPredation(): void {
    this.predationConfig = createDefaultPredationConfig();
    this.predationState = createDefaultPredationState();
    this.predationState.lastRoomId = this.snake.currentRoomId;
    this.syncPredationFlags();
    this.setFlag("predation.scentTicks", undefined);
    this.setFlag("predation.frenzyTriggered", undefined);
    this.setFlag("predation.rendConsumed", undefined);
    this.setFlag("predation.apexTriggered", undefined);
  }

  private hydratePredationConfig(): void {
    const contributions = Object.entries(this.snake.flags)
      .filter(([key]) => key.startsWith("predation.config."))
      .map(([, value]) => value)
      .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object");

    if (contributions.length === 0) {
      this.predationConfig = createDefaultPredationConfig();
      this.syncPredationFlags();
      return;
    }

    let enabled = false;
    let baseWindow = 0;
    let windowBonus = 0;
    let baseDecayHold = 0;
    let decayHoldBonus = 0;
    let decayStep = 1;
    let decayStepBonus = 0;
    let baseMaxStacks = 0;
    let maxStacksBonus = 0;
    let stackGain = 1;
    let stackGainBonus = 0;
    let baseScorePerStack = 0;
    let scorePerStackBonus = 0;
    let baseQuickWindow = 0;
    let quickWindowBonus = 0;
    let bonusStacksOnQuick = 0;
    let stackGainOnRoomEnter = 0;
    let scentDuration = 0;

    let frenzyThresholdBase = Number.POSITIVE_INFINITY;
    let frenzyThresholdBonus = 0;
    let frenzyDurationBase = 0;
    let frenzyDurationBonus = 0;
    let frenzyScoreBonus = 0;

    let rendEnabled = false;
    let rendGainThreshold = Number.POSITIVE_INFINITY;
    let rendMaxChargesBase = 0;
    let rendMaxChargesBonus = 0;
    let rendGrowthPerCharge = 0;
    let rendScorePerCharge = 0;

    let apexEnabled = false;
    let apexRequiredStacks = Number.POSITIVE_INFINITY;
    let apexScore = 0;
    let apexGrowth = 0;
    let apexCooldown = 0;

    for (const contribution of contributions) {
      if ((contribution as { enabled?: boolean }).enabled) {
        enabled = true;
      }

      const windowValue = (contribution as { window?: unknown }).window;
      if (typeof windowValue === "number" && windowValue > baseWindow) {
        baseWindow = windowValue;
      }
      const windowBonusValue = (contribution as { windowBonus?: unknown }).windowBonus;
      if (typeof windowBonusValue === "number") {
        windowBonus += windowBonusValue;
      }

      const decayHoldValue = (contribution as { decayHold?: unknown }).decayHold;
      if (typeof decayHoldValue === "number" && decayHoldValue > baseDecayHold) {
        baseDecayHold = decayHoldValue;
      }
      const decayHoldBonusValue = (contribution as { decayHoldBonus?: unknown }).decayHoldBonus;
      if (typeof decayHoldBonusValue === "number") {
        decayHoldBonus += decayHoldBonusValue;
      }

      const decayStepValue = (contribution as { decayStep?: unknown }).decayStep;
      if (typeof decayStepValue === "number" && decayStepValue > 0) {
        decayStep = Math.max(decayStep, Math.floor(decayStepValue));
      }
      const decayStepBonusValue = (contribution as { decayStepBonus?: unknown }).decayStepBonus;
      if (typeof decayStepBonusValue === "number") {
        decayStepBonus += decayStepBonusValue;
      }

      const stackGainValue = (contribution as { stackGain?: unknown }).stackGain;
      if (typeof stackGainValue === "number" && stackGainValue > stackGain) {
        stackGain = stackGainValue;
      }
      const stackGainBonusValue = (contribution as { stackGainBonus?: unknown }).stackGainBonus;
      if (typeof stackGainBonusValue === "number") {
        stackGainBonus += stackGainBonusValue;
      }

      const maxStacksValue = (contribution as { maxStacks?: unknown }).maxStacks;
      if (typeof maxStacksValue === "number" && maxStacksValue > baseMaxStacks) {
        baseMaxStacks = maxStacksValue;
      }
      const maxStacksBonusValue = (contribution as { maxStacksBonus?: unknown }).maxStacksBonus;
      if (typeof maxStacksBonusValue === "number") {
        maxStacksBonus += maxStacksBonusValue;
      }

      const scorePerStackValue = (contribution as { scorePerStack?: unknown }).scorePerStack;
      if (typeof scorePerStackValue === "number") {
        baseScorePerStack += scorePerStackValue;
      }
      const scorePerStackBonusValue = (contribution as { scorePerStackBonus?: unknown }).scorePerStackBonus;
      if (typeof scorePerStackBonusValue === "number") {
        scorePerStackBonus += scorePerStackBonusValue;
      }

      const quickEatWindowValue = (contribution as { quickEatWindow?: unknown }).quickEatWindow;
      if (typeof quickEatWindowValue === "number" && quickEatWindowValue > baseQuickWindow) {
        baseQuickWindow = quickEatWindowValue;
      }
      const quickEatWindowBonusValue = (contribution as { quickEatWindowBonus?: unknown }).quickEatWindowBonus;
      if (typeof quickEatWindowBonusValue === "number") {
        quickWindowBonus += quickEatWindowBonusValue;
      }

      const bonusStacksValue = (contribution as { bonusStacksOnQuickEat?: unknown }).bonusStacksOnQuickEat;
      if (typeof bonusStacksValue === "number") {
        bonusStacksOnQuick += bonusStacksValue;
      }

      const stackGainOnRoomEnterValue = (contribution as { stackGainOnRoomEnter?: unknown }).stackGainOnRoomEnter;
      if (typeof stackGainOnRoomEnterValue === "number") {
        stackGainOnRoomEnter += stackGainOnRoomEnterValue;
      }

      const scentDurationValue = (contribution as { scentDuration?: unknown }).scentDuration;
      if (typeof scentDurationValue === "number" && scentDurationValue > scentDuration) {
        scentDuration = scentDurationValue;
      }

      const frenzyValue = (contribution as { frenzy?: unknown }).frenzy;
      if (frenzyValue && typeof frenzyValue === "object") {
        const frenzy = frenzyValue as Record<string, unknown>;
        const threshold = frenzy.threshold;
        if (typeof threshold === "number" && threshold < frenzyThresholdBase) {
          frenzyThresholdBase = threshold;
        }
        const thresholdBonus = frenzy.thresholdBonus;
        if (typeof thresholdBonus === "number") {
          frenzyThresholdBonus += thresholdBonus;
        }
        const duration = frenzy.duration;
        if (typeof duration === "number" && duration > frenzyDurationBase) {
          frenzyDurationBase = duration;
        }
        const durationBonus = frenzy.durationBonus;
        if (typeof durationBonus === "number") {
          frenzyDurationBonus += durationBonus;
        }
        const scoreBonus = frenzy.scoreBonus;
        if (typeof scoreBonus === "number") {
          frenzyScoreBonus += scoreBonus;
        }
      }

      const rendValue = (contribution as { rend?: unknown }).rend;
      if (rendValue && typeof rendValue === "object") {
        const rend = rendValue as Record<string, unknown>;
        if (rend.enabled === true) {
          rendEnabled = true;
        }
        const gainThreshold = rend.gainThreshold;
        if (typeof gainThreshold === "number" && gainThreshold < rendGainThreshold) {
          rendGainThreshold = gainThreshold;
        }
        const maxCharges = rend.maxCharges;
        if (typeof maxCharges === "number" && maxCharges > rendMaxChargesBase) {
          rendMaxChargesBase = maxCharges;
        }
        const maxChargesBonusValue = rend.maxChargesBonus;
        if (typeof maxChargesBonusValue === "number") {
          rendMaxChargesBonus += maxChargesBonusValue;
        }
        const growthPerCharge = rend.growthPerCharge;
        if (typeof growthPerCharge === "number" && growthPerCharge > rendGrowthPerCharge) {
          rendGrowthPerCharge = growthPerCharge;
        }
        const scorePerChargeValue = rend.scorePerCharge;
        if (typeof scorePerChargeValue === "number" && scorePerChargeValue > rendScorePerCharge) {
          rendScorePerCharge = scorePerChargeValue;
        }
      }

      const apexValue = (contribution as { apex?: unknown }).apex;
      if (apexValue && typeof apexValue === "object") {
        const apex = apexValue as Record<string, unknown>;
        apexEnabled = true;
        const requiredStacks = apex.requiredStacks;
        if (typeof requiredStacks === "number" && requiredStacks < apexRequiredStacks) {
          apexRequiredStacks = requiredStacks;
        }
        const apexScoreValue = apex.score;
        if (typeof apexScoreValue === "number" && apexScoreValue > apexScore) {
          apexScore = apexScoreValue;
        }
        const apexGrowthValue = apex.growth;
        if (typeof apexGrowthValue === "number" && apexGrowthValue > apexGrowth) {
          apexGrowth = apexGrowthValue;
        }
        const apexCooldownValue = apex.cooldown;
        if (typeof apexCooldownValue === "number" && apexCooldownValue > apexCooldown) {
          apexCooldown = apexCooldownValue;
        }
      }
    }

    const config = createDefaultPredationConfig();
    config.enabled = enabled || baseWindow > 0 || baseScorePerStack > 0 || rendEnabled || apexEnabled;

    config.window = Math.max(0, Math.round(baseWindow + windowBonus));
    config.decayHold = Math.max(0, Math.round(baseDecayHold + decayHoldBonus));
    config.decayStep = Math.max(1, Math.round(decayStep + decayStepBonus));
    config.maxStacks = Math.max(0, Math.floor(baseMaxStacks + maxStacksBonus));
    config.stackGain = Math.max(1, Math.floor(stackGain + stackGainBonus));
    config.scorePerStack = Math.max(0, baseScorePerStack + scorePerStackBonus);
    config.quickEatWindow = Math.max(0, Math.round(baseQuickWindow + quickWindowBonus));
    config.bonusStacksOnQuickEat = Math.max(0, Math.floor(bonusStacksOnQuick));
    config.stackGainOnRoomEnter = Math.max(0, Math.floor(stackGainOnRoomEnter));
    config.scentDuration = Math.max(0, Math.round(scentDuration));

    const frenzyThreshold = frenzyThresholdBase + frenzyThresholdBonus;
    if (Number.isFinite(frenzyThreshold) && frenzyThreshold > 0) {
      config.frenzyThreshold = Math.max(1, Math.round(frenzyThreshold));
      config.frenzyDuration = Math.max(0, Math.round(frenzyDurationBase + frenzyDurationBonus));
      config.frenzyScoreBonus = Math.max(0, frenzyScoreBonus);
    }

    if (rendEnabled) {
      config.rend.enabled = true;
      config.rend.gainThreshold = Math.max(1, Math.round(Number.isFinite(rendGainThreshold) ? rendGainThreshold : 2));
      config.rend.maxCharges = Math.max(0, Math.floor(rendMaxChargesBase + rendMaxChargesBonus));
      config.rend.growthPerCharge = Math.max(0, Math.floor(rendGrowthPerCharge));
      config.rend.scorePerCharge = Math.max(0, rendScorePerCharge);
    }

    if (apexEnabled) {
      config.apex.enabled = true;
      config.apex.requiredStacks = Math.max(1, Math.round(Number.isFinite(apexRequiredStacks) ? apexRequiredStacks : 6));
      config.apex.score = Math.max(0, apexScore);
      config.apex.growth = Math.max(0, Math.floor(apexGrowth));
      config.apex.cooldown = Math.max(0, Math.round(apexCooldown));
    }

    if (config.maxStacks === 0 && config.enabled) {
      config.maxStacks = 1;
    }

    this.predationConfig = config;
    this.syncPredationFlags();
  }

  private ensurePredationState(): PredationRuntimeState {
    if (!this.predationState.lastRoomId) {
      this.predationState.lastRoomId = this.snake.currentRoomId;
    }
    return this.predationState;
  }

  private syncPredationFlags(): void {
    const state = this.predationState;
    const config = this.predationConfig;

    if (!config.enabled && state.stacks === 0 && state.rendCharges === 0 && state.frenzyTicks === 0 && state.scentTicks === 0) {
      this.setFlag("predation.state", undefined);
      this.setFlag("predation.scentTicks", undefined);
      this.setFlag("predation.frenzyActive", undefined);
      return;
    }

    this.setFlag("predation.state", {
      stacks: state.stacks,
      timer: state.timer,
      decayHold: state.decayHold,
      frenzyTicks: state.frenzyTicks,
      frenzyCooldown: state.frenzyCooldown,
      rendCharges: state.rendCharges,
      apexCooldown: state.apexCooldown,
      scentTicks: state.scentTicks,
    });

    if (state.scentTicks > 0) {
      this.setFlag("predation.scentTicks", state.scentTicks);
    } else {
      this.setFlag("predation.scentTicks", undefined);
    }

    if (state.frenzyTicks > 0) {
      this.setFlag("predation.frenzyActive", state.frenzyTicks);
    } else {
      this.setFlag("predation.frenzyActive", undefined);
    }
  }

  private tickPredationTimers(): void {
    const config = this.predationConfig;
    const state = this.ensurePredationState();

    if (config.enabled && state.frenzyTicks > 0 && config.frenzyScoreBonus > 0) {
      this.addScore(config.frenzyScoreBonus);
    }

    if (!config.enabled) {
      if (state.stacks !== 0 || state.rendCharges !== 0 || state.frenzyTicks !== 0 || state.scentTicks !== 0) {
        this.predationState = createDefaultPredationState();
        this.predationState.lastRoomId = this.snake.currentRoomId;
        this.syncPredationFlags();
      }
      return;
    }

    state.ticksSinceLastApple = Math.min(state.ticksSinceLastApple + 1, Number.MAX_SAFE_INTEGER);

    if (state.frenzyTicks > 0) {
      state.frenzyTicks -= 1;
    } else if (state.frenzyCooldown > 0) {
      state.frenzyCooldown -= 1;
    }

    if (state.apexCooldown > 0) {
      state.apexCooldown -= 1;
    }

    if (state.scentTicks > 0) {
      state.scentTicks -= 1;
    }

    if (state.stacks <= 0) {
      state.timer = 0;
      state.decayHold = 0;
      this.syncPredationFlags();
      return;
    }

    if (state.timer > 0) {
      state.timer -= 1;
      this.syncPredationFlags();
      return;
    }

    if (state.decayHold > 0) {
      state.decayHold -= 1;
      this.syncPredationFlags();
      return;
    }

    const loss = Math.max(1, config.decayStep);
    state.stacks = Math.max(0, state.stacks - loss);
    if (state.stacks > 0) {
      state.timer = config.window;
      state.decayHold = config.decayHold;
    } else {
      state.timer = 0;
      state.decayHold = 0;
      state.frenzyTicks = 0;
      this.setFlag("predation.frenzyActive", undefined);
    }

    this.syncPredationFlags();
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

