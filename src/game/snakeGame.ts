import { defaultGameConfig, type GameConfig, type PowerupKind } from "../config/gameConfig.js";
import type { Vector2Like } from "../core/math.js";
import { createRng, type RandomGenerator } from "../core/rng.js";
import { AppleService, type AppleConsumptionResult } from "../apples/appleService.js";
import type { AppleSnapshot } from "../apples/types.js";
import { SnakeState, type SnakeStepDependencies } from "../systems/snakeState.js";
import { BossManager } from "../systems/boss.js";
import { EnemyManager } from "../systems/enemies.js";
import { WorldService } from "../world/worldService.js";
import { QuestController } from "../systems/questController.js";
import type { QuestGiverRequest } from "../systems/questController.js";
import type { Quest } from "../quests/quest.js";
import type { QuestRegistry } from "../quests/questRegistry.js";
import { InventorySystem } from "../inventory/inventory.js";
import { ITEMS, getItem } from "../inventory/itemRegistry.js";
import type { QuestRuntime } from "../quests/quest.js";
import {
  chooseWandererEncounter,
  getEncounterPages,
  getEncounterStatsNote,
  getRoomEncounterTags,
  type EncounterHistoryEntry,
  type WandererEncounter,
} from "../npcs/encounters.js";
import { getBiomeDefinition } from "../world/biomes.js";
import type { RoomSnapshot } from "../world/types.js";

export interface StepResult {
  status: "alive" | "dead";
  deathReason?: "wall" | "self" | "shielded" | "boss" | "bullet" | "temperature" | "water" | "shark";
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

export interface DeathDebugRoomSnapshot {
  roomId: string;
  biomeId: RoomSnapshot["biomeId"];
  biomeTitle: string;
  layout: string[];
}

export interface DeathDebugSnapshot {
  reason?: StepResult["deathReason"] | string | null;
  roomId: string;
  world: Vector2Like;
  local: Vector2Like;
  tile?: string;
  direction?: Vector2Like;
  rooms: DeathDebugRoomSnapshot[];
}

interface MomentumComputedConfig {
  enabled: boolean;
  gainPerTick: number;
  maxStacks: number;
  decayDelay: number;
  decayLoss: number;
  turnRetention: number;
  turnForgiveness: number;
  surgeThreshold: number;
  surgeDuration: number;
  surgeCooldown: number;
  surgeConsume: number;
  surgeInvulnerability: number;
  phaseTicksOnSurge: number;
  scorePerStack: number;
  surgeScore: number;
  trailTicks: number;
  trailScorePerTick: number;
}

interface MomentumRuntimeState {
  stacks: number;
  decayTimer: number;
  surgeTicks: number;
  surgeCooldown: number;
  phasingTicks: number;
  trailTicks: number;
  previousDirection: Vector2Like | null;
  forgivenessTimer: number;
}

function createDefaultMomentumConfig(): MomentumComputedConfig {
  return {
    enabled: false,
    gainPerTick: 0,
    maxStacks: 0,
    decayDelay: 0,
    decayLoss: 1,
    turnRetention: 0,
    turnForgiveness: 0,
    surgeThreshold: Number.POSITIVE_INFINITY,
    surgeDuration: 0,
    surgeCooldown: 0,
    surgeConsume: 0,
    surgeInvulnerability: 0,
    phaseTicksOnSurge: 0,
    scorePerStack: 0,
    surgeScore: 0,
    trailTicks: 0,
    trailScorePerTick: 0,
  };
}

function createDefaultMomentumState(): MomentumRuntimeState {
  return {
    stacks: 0,
    decayTimer: 0,
    surgeTicks: 0,
    surgeCooldown: 0,
    phasingTicks: 0,
    trailTicks: 0,
    previousDirection: null,
    forgivenessTimer: 0,
  };
}

interface TraversalComputedConfig {
  enabled: boolean;
  corridorWidth: number;
  extendForwardRooms: number;
  phaseTicksOnEnter: number;
  growthOnEnter: number;
  scoreOnEnter: number;
  ghostShieldCharges: number;
  echoTicks: number;
  echoScore: number;
  pullAppleIntoCorridor: boolean;
}

interface TraversalRuntimeState {
  ghostShields: number;
  phaseTicks: number;
  echoTicks: number;
}

function createDefaultTraversalConfig(): TraversalComputedConfig {
  return {
    enabled: false,
    corridorWidth: 0,
    extendForwardRooms: 0,
    phaseTicksOnEnter: 0,
    growthOnEnter: 0,
    scoreOnEnter: 0,
    ghostShieldCharges: 0,
    echoTicks: 0,
    echoScore: 0,
    pullAppleIntoCorridor: false,
  };
}

function createDefaultTraversalState(): TraversalRuntimeState {
  return {
    ghostShields: 0,
    phaseTicks: 0,
    echoTicks: 0,
  };
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
  private readonly enemies: EnemyManager;
  private readonly questController: QuestController;
  private readonly inventory: InventorySystem;
  private readonly visitedRooms: Set<string>;
  private readonly npcDisposition = new Map<string, { anger: number; hostility: "friendly" | "warning" | "hostile" }>();
  private readonly resolvedWandererEncounters = new Set<string>();
  private readonly wandererHistory = new Map<string, EncounterHistoryEntry>();
  private lastWandererEncounterRoomCount = -999;

  private predationConfig: PredationComputedConfig = createDefaultPredationConfig();
  private predationState: PredationRuntimeState = createDefaultPredationState();

  private powerupState: { kind: PowerupKind; remaining: number; total: number } | null = null;

  constructor(
    config: GameConfig = defaultGameConfig,
    private readonly registry: QuestRegistry,
    rng?: RandomGenerator
  ) {
    this.config = config;
    this.rng = rng ?? createRng(config.rng.seed);
    this.world = new WorldService(config.grid, config.world, this.rng);
    this.apples = new AppleService(config.apples, config.grid, this.world, this.rng);
    this.snake = new SnakeState(config.grid, config.snake, config.world.originRoomId);
    this.bosses = new BossManager(config.grid);
    this.enemies = new EnemyManager(config.grid, this.rng);
    this.questController = new QuestController(registry, {
      initialQuestCount: config.quests.initialQuestCount,
      initialQuestIds: config.quests.initialQuestIds ?? [],
      maxActiveQuests: config.quests.maxActiveQuests,
      questOfferChance: config.quests.questOfferChance,
      rng: this.rng,
    });
    this.inventory = new InventorySystem();
    this.visitedRooms = new Set([this.snake.currentRoomId]);
  }

  reset(): void {
    this.world.clear();
    this.apples.clearAll();
    this.snake.reset(this.config.world.originRoomId);
    this.bosses.clearAll();
    this.enemies.clearAll();
    this.questController.reset(this);
    this.inventory.clear();
    this.visitedRooms.clear();
    this.npcDisposition.clear();
    this.resolvedWandererEncounters.clear();
    this.wandererHistory.clear();
    this.lastWandererEncounterRoomCount = -999;
    this.visitedRooms.add(this.snake.currentRoomId);
    this.powerupState = null;
    this.setFlag("timeMs", 0);
    this.setFlag("player.health", 3);
    this.setFlag("player.maxHealth", 3);
    this.setFlag("ui.healthRevealed", undefined);
    this.setFlag("ui.livesRevealed", undefined);
    this.setFlag("player.bulletInvulnTicks", 0);
    this.setFlag("player.temperatureExposureMs", 0);
    this.setFlag("player.temperatureThresholdMs", 10000);
    this.setFlag("player.temperatureDamageIntervalMs", 5000);
    this.setFlag("player.temperatureDamageProgressMs", 0);
    this.setFlag("player.temperatureLastTickMs", 0);
    this.setFlag("player.temperatureHazard", undefined);
    this.setFlag("equipment.gunEnabled", undefined);
    this.setFlag("equipment.itemPhoenixCharges", undefined);
    this.setFlag("equipment.heatResistance", undefined);
    this.setFlag("equipment.coldResistance", undefined);
    this.setFlag("equipment.swimmingEnabled", undefined);
    this.setFlag("treasurePicked", 0);
    this.setFlag("powerupsPicked", 0);
    this.setFlag("roomsVisited", 1);
    this.setFlag("house.itemsPurchased", 0);
    this.setFlag("appleStreak", 0);
    this.setFlag("appleStreakMax", 0);
    this.setFlag("lastAppleTimeMs", undefined);
    this.setFlag("npc.randomEncounter", undefined);
    this.setFlag("npc.randomEncounter.prompted", undefined);
    this.setFlag("npc.randomEncounter.triggerAtMs", undefined);
    this.setFlag("npc.randomEncounter.revealAtMs", undefined);
    this.setFlag("ui.wandererReveal", undefined);
    this.setFlag("ui.playerShot", undefined);
    this.setFlag("ui.playerHit", undefined);
    this.setFlag("ui.villageReveal", undefined);
    this.setFlag("ui.biomeReveal", undefined);
    this.setFlag("ui.lastBiomeId", undefined);
    this.setFlag("npc.freakJoey.active", undefined);
    this.setFlag("npc.freakJoey.defeated", undefined);
    this.setFlag("roomEntryTimeMs", 0);
    const head = this.snake.bodySegments[0];
    if (head) {
      const [roomX, roomY] = this.snake.currentRoomId.split(",").map(Number);
      this.setFlag("roomEntryLocalPos", { x: head.x - roomX * this.config.grid.cols, y: head.y - roomY * this.config.grid.rows });
    } else {
      this.setFlag("roomEntryLocalPos", undefined);
    }

    // TODO: Make this configurable
    if (this.rng() < 0.05) { // 5% chance to spawn a boss on reset
      this.bosses.spawnBoss(this.snake.currentRoomId, "freak-dennis");
    }

    this.resetPredation();
    this.apples.ensureApple(this.snake.currentRoomId, Array.from(this.snake.bodySegments), this.snake.score);
    this.enemies.ensureEnemy(
      this.snake.currentRoomId,
      this.world.getRoom(this.snake.currentRoomId),
      this.config.snake.initialBody
    );
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
    const headBeforeSnakeStep = this.snake.bodySegments[0];
    const bossOnHead = headBeforeSnakeStep
      ? this.bosses.getBossAtPosition(headBeforeSnakeStep, this.snake.currentRoomId)
      : null;
    if (bossOnHead?.kind === "angel") {
      this.setFlag("internal.killedByBossKind", bossOnHead.kind);
      this.setFlag("internal.killedByBossName", bossOnHead.name);
      this.markDeathAtCurrentHead("boss");
      return {
        status: "dead",
        deathReason: "boss",
        apple: {
          eaten: false,
          current: appleBeforeStep,
          stateChanged: roomsChanged.has(previousRoom),
        },
        roomsChanged,
        roomChanged: false,
        questOffer: null,
        questsCompleted: [],
      };
    }

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
      const previousDepth = Number(previousRoom.split(",")[2] ?? 0);
      const newDepth = Number(newRoomId.split(",")[2] ?? 0);
      if (previousDepth !== newDepth) {
        this.setFlag("traversal.manualResumePending", true);
      }
      if (!this.visitedRooms.has(newRoomId)) {
        this.visitedRooms.add(newRoomId);
        // TODO: Make this configurable
        if (this.rng() < 0.05) { // 5% chance to spawn Freak Dennis in a new room
          this.bosses.spawnBoss(newRoomId, "freak-dennis");
        }
        this.enemies.ensureEnemy(
          newRoomId,
          this.world.getRoom(newRoomId),
          []
        );
        this.maybeQueueFreakJoeyEncounter(newRoomId);
        const newRoom = this.world.getRoom(newRoomId);
        const lastBiomeId = this.getFlag<string>("ui.lastBiomeId");
        if (lastBiomeId !== newRoom.biomeId) {
          const biome = getBiomeDefinition(newRoom.biomeId);
          this.setFlag("ui.biomeReveal", {
            roomId: newRoomId,
            biomeId: newRoom.biomeId,
            title: newRoom.biomeTitle,
            temperature: biome.temperature,
            dangerLevel: biome.dangerLevel,
          });
          this.setFlag("ui.lastBiomeId", newRoom.biomeId);
        }
        if (newRoom.village) {
          const maxHealth = Number(this.getFlag<number>("player.maxHealth") ?? 3);
          this.setFlag("player.health", maxHealth);
          this.addScore(3);
          this.setFlag("ui.villageReveal", {
            roomId: newRoomId,
            name: newRoom.village.name,
            x: newRoom.village.center.x,
            y: newRoom.village.center.y,
          });
        }
      } else {
        const newRoom = this.world.getRoom(newRoomId);
        const lastBiomeId = this.getFlag<string>("ui.lastBiomeId");
        if (lastBiomeId !== newRoom.biomeId) {
          const biome = getBiomeDefinition(newRoom.biomeId);
          this.setFlag("ui.biomeReveal", {
            roomId: newRoomId,
            biomeId: newRoom.biomeId,
            title: newRoom.biomeTitle,
            temperature: biome.temperature,
            dangerLevel: biome.dangerLevel,
          });
          this.setFlag("ui.lastBiomeId", newRoom.biomeId);
        }
      }
      const timeMs = Number(this.getFlag<number>("timeMs") ?? 0);
      const entryTimeMs = Number(this.getFlag<number>("roomEntryTimeMs") ?? timeMs);
      const entryPos = this.getFlag<{ x: number; y: number }>("roomEntryLocalPos");
      const previousHead = this.getFlag<{ x: number; y: number }>("internal.previousHead");
      if (entryPos && previousHead) {
        const [prevRoomX, prevRoomY] = previousRoom.split(",").map(Number);
        const prevLocalX = previousHead.x - prevRoomX * this.config.grid.cols;
        const prevLocalY = previousHead.y - prevRoomY * this.config.grid.rows;
        const distance = Math.abs(prevLocalX - entryPos.x) + Math.abs(prevLocalY - entryPos.y);
        this.setFlag("roomTravelDistance", distance);
        this.setFlag("roomTravelMs", Math.max(0, timeMs - entryTimeMs));
      } else {
        this.setFlag("roomTravelDistance", undefined);
        this.setFlag("roomTravelMs", undefined);
      }
      const head = this.snake.bodySegments[0];
      if (head) {
        const [roomX, roomY] = this.snake.currentRoomId.split(",").map(Number);
        this.setFlag("roomEntryLocalPos", { x: head.x - roomX * this.config.grid.cols, y: head.y - roomY * this.config.grid.rows });
      } else {
        this.setFlag("roomEntryLocalPos", undefined);
      }
      this.setFlag("roomEntryTimeMs", timeMs);
      this.setFlag("roomsVisited", this.visitedRooms.size);
    }

    if (outcome.status === "dead") {
      const killedByAngel = this.getFlag<string>("internal.killedByBossKind") === "angel";
      const insultedAngelActive = Boolean(this.getFlag<boolean>("boss.insultedAngel"));
      if (killedByAngel || insultedAngelActive || !this.tryFortitudePhoenix(outcome, roomsChanged, previousRoom)) {
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
    // UI: Turn skid when direction changes
    const previous = this.getFlag<{ direction?: Vector2Like }>("internal.previousSnapshot");
    const currDir = this.snake.directionVector;
    if (previous?.direction && (previous.direction.x !== currDir.x || previous.direction.y !== currDir.y) && currentHead) {
      this.setFlag("ui.turnSkid", { x: currentHead.x, y: currentHead.y, roomId: this.snake.currentRoomId, dx: currDir.x, dy: currDir.y });
    }

    const lastTail = this.getFlag<{ x: number; y: number; roomId?: string }>("internal.lastRemovedTail");
    if (lastTail && (this.getFlag<boolean>("geometry.masonryEnabled") || this.getFlag<boolean>("equipment.masonryEnabled"))) {
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

    // UI: Wall graze — spark if moving adjacent to a wall in move direction
    if (currentHead) {
      const dir = this.snake.directionVector;
      const info = this.resolveRoomPosition({ x: currentHead.x, y: currentHead.y });
      if (info) {
        const { roomId, localX, localY } = info;
        const room = this.world.getRoom(roomId);
        let nx = 0, ny = 0;
        if (dir.x !== 0) {
          const tx = localX + dir.x;
          if (tx >= 0 && tx < this.config.grid.cols) {
            const t = room.layout[localY]?.[tx];
            if (t === '#') { nx = dir.x; ny = 0; }
          }
        } else if (dir.y !== 0) {
          const ty = localY + dir.y;
          if (ty >= 0 && ty < this.config.grid.rows) {
            const t = room.layout[ty]?.[localX];
            if (t === '#') { nx = 0; ny = dir.y; }
          }
        }
        if (nx !== 0 || ny !== 0) {
          this.setFlag("ui.wallGraze", { x: currentHead.x, y: currentHead.y, roomId, nx, ny });
        }
      }
    }

    let appleStateChanged = roomsChanged.has(this.snake.currentRoomId);
    let appleSnapshot = this.apples.getSnapshot(this.snake.currentRoomId);
    let appleRewards: AppleConsumptionResult["rewards"] | undefined;
    let appleWorldPosition: Vector2Like | null = null;
    let appleEaten = false;

    if (outcome.appleEaten) {
      appleEaten = true;
      const phasePowerupActive = Boolean(this.powerupState?.kind === "phase" && this.powerupState.remaining > 0);
      const consumption = this.apples.handleConsumption(
        this.snake.currentRoomId,
        this.snake.directionVector,
        phasePowerupActive
      );
      if (consumption.fatal) {
        if (this.tryFortitudePhoenix({ status: "dead", reason: "shielded" }, roomsChanged, previousRoom)) {
          return this.createAliveStepResult({
            appleEaten: true,
            appleSnapshot: appleBeforeStep,
            appleStateChanged: true,
            roomsChanged,
            roomHasChanged,
          });
        }
        this.markDeathAtCurrentHead("shielded");
        return {
          status: "dead",
          deathReason: "shielded",
          apple: {
            eaten: true,
            current: appleBeforeStep,
            stateChanged: true,
          },
          roomsChanged,
          roomChanged: roomHasChanged,
          questOffer: null,
          questsCompleted: [],
        };
      }

      appleRewards = consumption.rewards;
      appleWorldPosition = consumption.worldPosition ?? null;
      appleStateChanged = appleStateChanged || consumption.changed;

      const nowMs = Number(this.getFlag<number>("timeMs") ?? 0);
      const lastAppleMs = Number(this.getFlag<number>("lastAppleTimeMs") ?? Number.NEGATIVE_INFINITY);
      const streakWindowMs = 1500;
      const streak = nowMs - lastAppleMs <= streakWindowMs
        ? Number(this.getFlag<number>("appleStreak") ?? 0) + 1
        : 1;
      const best = Math.max(Number(this.getFlag<number>("appleStreakMax") ?? 0), streak);
      this.setFlag("appleStreak", streak);
      this.setFlag("appleStreakMax", best);
      this.setFlag("lastAppleTimeMs", nowMs);

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

      const seismicRadius = (this.getFlag<number>("geometry.seismicPulseRadius") ?? 0)
        + (this.getFlag<number>("equipment.seismicPulseRadiusBonus") ?? 0);
      if (seismicRadius > 0 && currentHead) {
        this.triggerSeismicPulse(currentHead, seismicRadius, roomsChanged);
      }
      if ((this.getFlag<boolean>("geometry.collapseControlEnabled") || this.getFlag<boolean>("equipment.collapseControlEnabled")) && currentHead) {
        this.triggerCollapseControl(currentHead, updatedSnake, roomsChanged);
      }
      this.rechargeTerraShield();
      this.handleFortitudeOnApple(roomsChanged);

    }

    // Treasure pickup: collect and grant a random item
    if (currentHead) {
      const room = this.world.getRoom(this.snake.currentRoomId);
      const [roomX, roomY] = this.snake.currentRoomId.split(",").map(Number);
      const localX = currentHead.x - roomX * this.config.grid.cols;
      const localY = currentHead.y - roomY * this.config.grid.rows;
      if (room.treasure && room.treasure.x === localX && room.treasure.y === localY) {
        let awardedName: string | undefined;
        let awardedId: string | undefined;
        if (ITEMS.length > 0) {
          const idx = Math.floor(this.rng() * ITEMS.length);
          const awarded = ITEMS[Math.max(0, Math.min(ITEMS.length - 1, idx))];
          this.inventory.addItem(awarded.id, 1);
          awardedName = awarded.name;
          awardedId = awarded.id;
        }
        // Score bonus for treasure pickup
        this.addScore(5);
        this.world.setTreasure(this.snake.currentRoomId, undefined);
        roomsChanged.add(this.snake.currentRoomId);
        const treasureCount = Number(this.getFlag<number>("treasurePicked") ?? 0);
        this.setFlag("treasurePicked", treasureCount + 1);
        // Notify UI for juice + hint
        this.setFlag("loot.itemPicked", { head: currentHead, itemName: awardedName, itemId: awardedId });
        // Treasure-specific pickup FX at the pickup tile
        this.setFlag("ui.treasurePickup", { x: currentHead.x, y: currentHead.y, roomId: this.snake.currentRoomId });
      }
      // Powerup pickup: instant short effect
      if (room.powerup && room.powerup.x === localX && room.powerup.y === localY) {
        const kind = room.powerup.kind;
        const duration = 300; // ~30s at 100ms base tick
        this.world.setPowerup(this.snake.currentRoomId, undefined);
        roomsChanged.add(this.snake.currentRoomId);
        const powerupCount = Number(this.getFlag<number>("powerupsPicked") ?? 0);
        this.setFlag("powerupsPicked", powerupCount + 1);
        if (kind === "gun") {
          this.inventory.addItem("weapon-revolver", 1);
          const gunItem = getItem("weapon-revolver");
          if (gunItem && !this.inventory.getEquipped("weapon")) {
            this.inventory.equip(gunItem);
          }
          this.setFlag("equipment.gunEnabled", true);
          this.setFlag("loot.itemPicked", { head: currentHead, itemName: "Pilgrim Revolver", itemId: "weapon-revolver" });
        } else if (kind === "phase") {
          const bonus = Number(this.getFlag<number>("equipment.invulnerabilityBonus") ?? 0);
          const inv = Math.max(Number(this.getFlag<number>("fortitude.invulnerabilityTicks") ?? 0), duration + Math.max(0, Math.floor(bonus)));
          this.setFlag("fortitude.invulnerabilityTicks", inv);
        } else if (kind === "smite") {
          this.setFlag("powerup.smiteTicks", duration);
        }
        if (kind !== "gun") {
          this.powerupState = { kind, remaining: duration, total: duration };
          this.setFlag("powerup.active", { kind, remaining: duration, total: duration });
        }
        this.setFlag("ui.powerupPickup", { x: currentHead.x, y: currentHead.y, roomId: this.snake.currentRoomId, kind });
      }
    }

    if (appleStateChanged) {
      roomsChanged.add(this.snake.currentRoomId);
    }

    if (currentHead) {
      const harmfulEnemy = this.enemies.getHarmfulOccupantAt(this.snake.currentRoomId, currentHead);
      if (harmfulEnemy) {
        const deathReason = harmfulEnemy.encounterKind === "shark" ? "shark" : "boss";
        if (this.tryFortitudePhoenix({ status: "dead", reason: deathReason === "shark" ? "boss" : deathReason }, roomsChanged, previousRoom)) {
          return this.createAliveStepResult({
            appleEaten,
            appleRewards,
            appleWorldPosition,
            appleSnapshot,
            appleStateChanged,
            roomsChanged,
            roomHasChanged,
          });
        }
        this.markDeathAtCurrentHead(deathReason);
        return {
          status: "dead",
          deathReason,
          apple: {
            eaten: appleEaten,
            rewards: appleRewards,
            worldPosition: appleWorldPosition,
            current: appleSnapshot,
            stateChanged: appleStateChanged,
          },
          roomsChanged,
          roomChanged: roomHasChanged,
          questOffer: null,
          questsCompleted: [],
        };
      }
      const enemyEat = this.enemies.consumeEnemyAt(this.snake.currentRoomId, currentHead);
      if (enemyEat.eaten) {
        this.addScore(3);
        this.snake.grow(1);
        this.setFlag("ui.enemyEaten", {
          x: currentHead.x,
          y: currentHead.y,
          roomId: this.snake.currentRoomId,
        });
      }
    }

    const enemyStep = this.enemies.step({
      getRoom: (roomId: string) => this.world.getRoom(roomId),
      snake: this.snake.bodySegments,
      currentRoomId: this.snake.currentRoomId,
      snakeDirection: this.snake.directionVector,
    });
    if (enemyStep.bulletHits > 0 && this.applyBulletDamage(enemyStep.bulletHits, enemyStep.hitStyle)) {
      if (this.tryFortitudePhoenix({ status: "dead", reason: "bullet" }, roomsChanged, previousRoom)) {
        return this.createAliveStepResult({
          appleEaten,
          appleRewards,
          appleWorldPosition,
          appleSnapshot,
          appleStateChanged,
          roomsChanged,
          roomHasChanged,
        });
      }
      this.markDeathAtCurrentHead("bullet");
      return {
        status: "dead",
        deathReason: "bullet",
        apple: {
          eaten: appleEaten,
          rewards: appleRewards,
          worldPosition: appleWorldPosition,
          current: appleSnapshot,
          stateChanged: appleStateChanged,
        },
        roomsChanged,
        roomChanged: roomHasChanged,
        questOffer: null,
        questsCompleted: [],
      };
    }
    if (this.getFlag<boolean>("npc.freakJoey.active") && !this.enemies.hasEnemyWithId("freak-joey")) {
      this.setFlag("npc.freakJoey.active", undefined);
      this.setFlag("npc.freakJoey.defeated", true);
      this.resolvedWandererEncounters.add("freak-joey");
      this.addScore(25);
    }
    const activeDuel = this.getFlag<{ id: string; rewardScore?: number }>("npc.activeDuel");
    if (activeDuel && !this.enemies.hasEnemyWithId(activeDuel.id)) {
      if (activeDuel.id !== "freak-joey" && activeDuel.rewardScore) {
        this.addScore(activeDuel.rewardScore);
      }
      this.setFlag("npc.activeDuel", undefined);
    }

    this.tickPredationTimers();
    this.tickFortitudeStates();
    this.tickPlayerStates();
    if (this.tickTemperatureState()) {
      if (this.tryFortitudePhoenix({ status: "dead", reason: "temperature" }, roomsChanged, previousRoom)) {
        return this.createAliveStepResult({
          appleEaten,
          appleRewards,
          appleWorldPosition,
          appleSnapshot,
          appleStateChanged,
          roomsChanged,
          roomHasChanged,
        });
      }
      this.markDeathAtCurrentHead("temperature");
      return {
        status: "dead",
        deathReason: "temperature",
        apple: {
          eaten: appleEaten,
          rewards: appleRewards,
          worldPosition: appleWorldPosition,
          current: appleSnapshot,
          stateChanged: appleStateChanged,
        },
        roomsChanged,
        roomChanged: roomHasChanged,
        questOffer: null,
        questsCompleted: [],
      };
    }
    this.tickPowerupState();

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

  private markDeathAtCurrentHead(reason?: StepResult["deathReason"] | string): void {
    const head = this.snake.bodySegments[0] ?? { x: 0, y: 0 };
    const roomId = this.snake.currentRoomId;
    const [roomX = 0, roomY = 0] = roomId.split(",").map(Number);
    const local = {
      x: head.x - roomX * this.config.grid.cols,
      y: head.y - roomY * this.config.grid.rows,
    };
    const room = this.world.getRoom(roomId);
    this.setFlag("internal.lastDeathPosition", {
      world: { x: head.x, y: head.y },
      local,
      roomId,
      tile: room.layout[local.y]?.[local.x],
      direction: this.snake.directionVector,
      reason,
    });
  }

  getRoom(roomId: string) {
    return this.world.getRoom(roomId);
  }

  getApple(roomId: string): AppleSnapshot | null {
    return this.apples.getSnapshot(roomId);
  }

  getSnakeBody(): readonly Vector2Like[] {
    return this.snake.bodySegments;
  }

  createDeathDebugSnapshot(reason?: StepResult["deathReason"] | string | null): DeathDebugSnapshot {
    const death = this.getFlag<{
      world?: Vector2Like;
      local?: Vector2Like;
      roomId?: string;
      tile?: string;
      direction?: Vector2Like;
    }>("internal.lastDeathPosition");
    const fallbackHead = this.snake.bodySegments[0] ?? { x: 0, y: 0 };
    const fallbackRoomId = this.snake.currentRoomId;
    const roomId = death?.roomId ?? fallbackRoomId;
    const [roomX = 0, roomY = 0, roomZ = 0] = roomId.split(",").map(Number);
    const world = death?.world ?? fallbackHead;
    const local = death?.local ?? {
      x: world.x - roomX * this.config.grid.cols,
      y: world.y - roomY * this.config.grid.rows,
    };
    const room = this.world.getRoom(roomId);
    const tile = death?.tile ?? room.layout[local.y]?.[local.x];
    const rooms: DeathDebugRoomSnapshot[] = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const neighborId = `${roomX + dx},${roomY + dy},${roomZ}`;
        const neighbor = this.world.getRoom(neighborId);
        rooms.push({
          roomId: neighbor.id,
          biomeId: neighbor.biomeId,
          biomeTitle: neighbor.biomeTitle,
          layout: neighbor.layout,
        });
      }
    }
    return {
      reason,
      roomId,
      world,
      local,
      tile,
      direction: death?.direction ?? this.snake.directionVector,
      rooms,
    };
  }

  // Map support: expose generated rooms on the current Z level
  getGeneratedRooms(levelZ?: number): string[] {
    const all = Array.from(this.world.snapshot().keys());
    const z = levelZ ?? Number((this.snake.currentRoomId.split(",")[2] ?? 0));
    return all.filter((id) => Number((id.split(",")[2] ?? 0)) === z);
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

  getAcceptedQuestIds(): string[] {
    return this.questController.getAcceptedIds();
  }

  getAcceptedQuests(): Quest[] {
    const acceptedIds = new Set(this.questController.getAcceptedIds());
    return this.registry.getAll().filter((quest) => acceptedIds.has(quest.id));
  }

  getAllQuests(): Quest[] {
    return this.registry.getAll();
  }

  getOfferedQuest(): Quest | null {
    return this.questController.getOffered();
  }

  acceptOfferedQuest(): Quest | null {
    return this.questController.acceptOffered(this);
  }

  rejectOfferedQuest(): void {
    this.questController.rejectOffered();
  }

  requestQuestFromGiver(roomId: string): QuestGiverRequest {
    return this.questController.getQuestForGiver(roomId, this);
  }

  getBosses(roomId: string) {
    const bosses = this.bosses.getBossesInRoom(roomId);
    const duelBoss = this.enemies.getDuelBossInRoom(roomId);
    return duelBoss ? [...bosses, duelBoss] : bosses;
  }

  spawnInsultedAngelBoss(): void {
    this.bosses.spawnBoss(this.snake.currentRoomId, "fallen-angel");
    this.setFlag("boss.insultedAngel", true);
  }

  getEnemies(roomId: string) {
    return this.enemies.getEnemiesInRoom(roomId);
  }

  getEnemyBullets(roomId: string) {
    return this.enemies.getBulletsInRoom(roomId);
  }

  getPlayerHealth(): { current: number; max: number } {
    return {
      current: Number(this.getFlag<number>("player.health") ?? 3),
      max: Number(this.getFlag<number>("player.maxHealth") ?? 3),
    };
  }

  getPlayerTemperature(): {
    current: number;
    max: number;
    hazard: "hot" | "cold" | null;
    active: boolean;
  } {
    const currentRoom = this.getCurrentRoom();
    const biome = getBiomeDefinition(currentRoom.biomeId);
    const hazard = biome.temperatureHazard;
    const thresholdMs = Math.max(1, Number(this.getFlag<number>("player.temperatureThresholdMs") ?? 10000));
    const exposureMs = Math.max(0, Number(this.getFlag<number>("player.temperatureExposureMs") ?? 0));
    const max = 10;
    const current = Math.max(0, Math.min(max, Math.ceil((exposureMs / thresholdMs) * max)));
    return {
      current,
      max,
      hazard,
      active: hazard !== null,
    };
  }

  resolveRandomEncounter(accept: boolean): { kind: "quest" | "duel" | "flavor" | "none"; accepted: boolean } {
    const encounter = this.getFlag<(WandererEncounter & { roomId: string; statsNote: string })>("npc.randomEncounter");
    if (!encounter) {
      return { kind: "none", accepted: false };
    }
    this.setFlag("npc.randomEncounter", undefined);
    this.setFlag("npc.randomEncounter.prompted", undefined);
    this.setFlag("npc.randomEncounter.triggerAtMs", undefined);
    this.setFlag("npc.randomEncounter.revealAtMs", undefined);
    this.recordWandererOutcome(encounter.id, accept);
    if (!accept) {
      if (encounter.oneShot) {
        this.resolvedWandererEncounters.add(encounter.id);
      }
      return { kind: encounter.kind, accepted: false };
    }

    if (encounter.kind === "duel") {
      const started = this.startNamedDuel(encounter.id, encounter.name, encounter.rewardScore);
      if (started) {
        if (encounter.oneShot) {
          this.resolvedWandererEncounters.add(encounter.id);
        }
        return { kind: "duel", accepted: true };
      }
      return { kind: "duel", accepted: false };
    }

    if (encounter.kind === "quest" && encounter.questId) {
      const quest = this.questController.offerSpecificQuestById(encounter.questId, this);
      if (quest) {
        if (encounter.oneShot) {
          this.resolvedWandererEncounters.add(encounter.id);
        }
        return { kind: "quest", accepted: true };
      }
      if (encounter.rewardScore) {
        this.addScore(encounter.rewardScore);
      }
      return { kind: "quest", accepted: false };
    }

    if (encounter.rewardScore) {
      this.addScore(encounter.rewardScore);
    }
    if (encounter.oneShot) {
      this.resolvedWandererEncounters.add(encounter.id);
    }
    return { kind: encounter.kind, accepted: true };
  }

  startFreakJoeyDuel(): boolean {
    if (this.getFlag<boolean>("npc.freakJoey.defeated")) {
      return false;
    }
    return this.startNamedDuel("freak-joey", "Freak Joey", 25, 15);
  }

  startNamedDuel(encounterId: string, name: string, rewardScore?: number, hearts?: number): boolean {
    const room = this.world.getRoom(this.snake.currentRoomId);
    const [roomX, roomY] = this.snake.currentRoomId.split(",").map(Number);
    const occupied = this.snake.bodySegments.map((segment) => ({
      x: segment.x - roomX * this.config.grid.cols,
      y: segment.y - roomY * this.config.grid.rows,
    }));
    const maxHearts = hearts ?? Math.max(8, Math.ceil((this.getFlag<number>("roomsVisited") ?? this.visitedRooms.size) * 1.5));
    const duelist = this.enemies.spawnDuelist(this.snake.currentRoomId, room, occupied, {
      id: encounterId,
      name,
      hearts: maxHearts,
    });
    if (!duelist) {
      return false;
    }
    if (encounterId === "freak-joey") {
      this.setFlag("npc.freakJoey.active", true);
    }
    this.setFlag("npc.activeDuel", { id: encounterId, rewardScore });
    return true;
  }

  firePlayerShot(direction: Vector2Like): boolean {
    const active = this.powerupState;
    const hasGunEquipped = Boolean(this.getFlag<boolean>("equipment.gunEnabled"));
    const hasLegacyGunPowerup = Boolean(active && active.kind === "gun" && active.remaining > 0);
    if (!hasGunEquipped && !hasLegacyGunPowerup) {
      return false;
    }
    const head = this.snake.bodySegments[0];
    if (!head) {
      return false;
    }
    const [roomX, roomY] = this.snake.currentRoomId.split(",").map(Number);
    const localHead = {
      x: head.x - roomX * this.config.grid.cols,
      y: head.y - roomY * this.config.grid.rows,
    };
    const room = this.world.getRoom(this.snake.currentRoomId);
    const giver = room.questGiver;
    if (
      giver &&
      this.isNpcInLineOfFire(room, localHead, direction, { x: giver.x, y: giver.y })
    ) {
      this.angerNpc(this.snake.currentRoomId, "shot");
      this.setFlag("ui.playerShot", { x: head.x, y: head.y, roomId: this.snake.currentRoomId, dx: direction.x, dy: direction.y });
      return true;
    }
    const fired = this.enemies.firePlayerBullet(this.snake.currentRoomId, localHead, direction);
    if (fired) {
      this.setFlag("ui.playerShot", { x: head.x, y: head.y, roomId: this.snake.currentRoomId, dx: direction.x, dy: direction.y });
    }
    return fired;
  }

  getNpcDisposition(roomId: string): { anger: number; hostility: "friendly" | "warning" | "hostile" } {
    return this.npcDisposition.get(roomId) ?? { anger: 0, hostility: "friendly" };
  }

  insultNpc(roomId: string): { anger: number; hostility: "friendly" | "warning" | "hostile"; name: string } | null {
    const room = this.world.getRoom(roomId);
    const giver = room.questGiver;
    if (!giver) {
      return null;
    }
    const disposition = this.angerNpc(roomId, "insult");
    return disposition ? { ...disposition, name: giver.name } : null;
  }

  getInventory(): InventorySystem {
    return this.inventory;
  }

  getSaveData(): GameSaveData {
    const data: GameSaveData = {
      version: "1.0.0",
      timestamp: Date.now(),
      snakeLength: this.getSnakeLength(),
      score: this.getScore(),
      snakeBody: Array.from(this.getSnakeBody()),
      snakeDirection: this.getDirection(),
      snakeRoomId: this.snake.currentRoomId,
      playerHealth: this.getPlayerHealth().current,
      playerMaxHealth: this.getPlayerHealth().max,
      questsActive: this.getActiveQuests().map((q) => q.id),
      questsCompleted: this.getCompletedQuestIds(),
      questsAccepted: this.getAcceptedQuestIds(),
      inventory: Object.fromEntries(this.inventory.getAllItems()),
      equipment: Object.fromEntries(this.inventory.getAllEquipped()),
      flags: { ...this.snake.flags },
    };

    const religionId = this.getFlag<string>("religion.id");
    const religionMods = this.getFlag<Record<string, unknown>>("religion.mods");

    if (religionId || religionMods) {
      data.religionId = religionId;
      data.religionMods = religionMods;
    }

    const classId = this.getFlag<string>("class.id");
    const classMods = this.getFlag<Record<string, unknown>>("class.mods");

    if (classId || classMods) {
      data.classId = classId;
      data.classMods = classMods;
    }

    const backgroundId = this.getFlag<string>("background.id");
    const backgroundMods = this.getFlag<Record<string, unknown>>("background.mods");

    if (backgroundId || backgroundMods) {
      data.backgroundId = backgroundId;
      data.backgroundMods = backgroundMods;
    }

    return data;
  }

  saveGame(): void {
    try {
      const data = this.getSaveData();
      this.setFlag("timeMs", Date.now());
      localStorage.setItem("snakeGameSave", JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save game:", error);
    }
  }

  loadGame(getReligionChoice?: () => any, getClassChoice?: () => any, getBackgroundChoice?: () => any): boolean {
    try {
      const saved = localStorage.getItem("snakeGameSave");
      if (!saved) {
        return false;
      }

      const data = JSON.parse(saved) as GameSaveData;

      console.log(`[SnakeGame] Loading game with save data:`, {
        snakeLength: data.snakeLength,
        snakeBodyLength: data.snakeBody?.length,
        snakeDirection: data.snakeDirection,
        snakeRoomId: data.snakeRoomId,
        score: data.score,
      });

      this.reset();

      // Restore snake body, direction, position, and length
      if (data.snakeBody && data.snakeBody.length > 0 && data.snakeDirection && data.snakeRoomId) {
        console.log(`[SnakeGame] Restoring snake from save`);
        this.snake.restoreFromSave(data.snakeBody, data.snakeDirection, data.snakeRoomId, data.snakeLength);
      }

      console.log(`[SnakeGame] After loading - snake length: ${this.snake.bodySegments.length}, room: ${this.snake.currentRoomId}`);

      this.setFlag("timeMs", data.timestamp);
      this.setFlag("player.health", data.playerHealth);
      this.setFlag("player.maxHealth", data.playerMaxHealth);

      for (const [key, value] of Object.entries(data.inventory)) {
        this.inventory.addItem(key, value);
      }

      for (const [slot, itemId] of Object.entries(data.equipment)) {
        this.inventory.equip(itemId);
      }

      for (const [key, value] of Object.entries(data.flags)) {
        if (value !== undefined) {
          this.setFlag(key, value);
        }
      }

      const getReligion = getReligionChoice || (() => null);
      const getClass = getClassChoice || (() => null);
      const getBackground = getBackgroundChoice || (() => null);

      if (data.religionId) {
        const religion = getReligion();
        if (religion && religion.id === data.religionId) {
          this.setFlag("religion.id", data.religionId);
          this.setFlag("religion.mods", data.religionMods);
        }
      }

      if (data.classId) {
        const cls = getClass();
        if (cls && cls.id === data.classId) {
          this.setFlag("class.id", data.classId);
          this.setFlag("class.mods", data.classMods);
        }
      }

      if (data.backgroundId) {
        const bg = getBackground();
        if (bg && bg.id === data.backgroundId) {
          this.setFlag("background.id", data.backgroundId);
          this.setFlag("background.mods", data.backgroundMods);
        }
      }

      return true;
    } catch (error) {
      console.error("Failed to load game:", error);
      return false;
    }
  }

  hasSaveFile(): boolean {
    try {
      return Boolean(localStorage.getItem("snakeGameSave"));
    } catch {
      return false;
    }
  }

  clearSaveFile(): void {
    try {
      localStorage.removeItem("snakeGameSave");
    } catch (error) {
      console.error("Failed to clear save file:", error);
    }
  }

  private createAliveStepResult(options: {
    appleEaten: boolean;
    appleRewards?: AppleConsumptionResult["rewards"];
    appleWorldPosition?: Vector2Like | null;
    appleSnapshot: AppleSnapshot | null;
    appleStateChanged: boolean;
    roomsChanged: Set<string>;
    roomHasChanged: boolean;
  }): StepResult {
    return {
      status: "alive",
      apple: {
        eaten: options.appleEaten,
        rewards: options.appleRewards,
        worldPosition: options.appleWorldPosition,
        current: options.appleSnapshot,
        stateChanged: options.appleStateChanged,
      },
      roomsChanged: options.roomsChanged,
      roomChanged: options.roomHasChanged,
      questOffer: null,
      questsCompleted: [],
    };
  }

  // --- House decoration API ---
  purchaseHouseItem(kind: "couch" | "kitchen" | "expand" | "bed" | "plant" | "lamp"): boolean {
    const houseId = "0,-1,0";
    const room = this.world.getRoom(houseId);
    const cols = this.config.grid.cols;
    const rows = this.config.grid.rows;

    const purchases = (this.getFlag<Record<string, unknown>>("house.purchases") ?? {}) as Record<
      string,
      unknown
    >;

    const costs: Record<string, number> = {
      couch: 10,
      kitchen: 15,
      expand: 20,
      bed: 12,
      plant: 8,
      lamp: 14,
    } as const as Record<string, number>;

    const cost = costs[kind];
    if (this.snake.score < cost) {
      return false;
    }

    function setChar(x: number, y: number, ch: string) {
      const row = room.layout[y];
      if (!row) return;
      const chars = row.split("");
      if (x < 0 || x >= chars.length) return;
      if (chars[x] === ch) return;
      chars[x] = ch;
      room.layout[y] = chars.join("");
    }

    if (kind === "couch") {
      if (purchases[kind]) return false;
      // Place couch near lower-left inside the house cube
      const bbox = this.getHouseBoundingBox(room);
      if (!bbox) return false;
      const y = bbox.bottom - 2;
      const startX = bbox.left + 2;
      for (let x = startX; x < startX + 3; x++) setChar(x, y, "C");
      purchases[kind] = true;
    } else if (kind === "kitchen") {
      if (purchases[kind]) return false;
      // Kitchen block on upper-right inside the house cube
      const bbox = this.getHouseBoundingBox(room);
      if (!bbox) return false;
      const startY = bbox.top + 2;
      const startX = bbox.right - 4;
      for (let y = startY; y < startY + 2; y++) for (let x = startX; x < startX + 3; x++) setChar(x, y, "K");
      purchases[kind] = true;
    } else if (kind === "expand") {
      // Recompute cube larger by one step; max 3 expansions
      const level = Number((this.getFlag<number>("house.expandLevel") ?? 0));
      const cap = 5;
      if (level >= cap) return false;
      this.expandHouseCube(room, level + 1);
      this.setFlag("house.expandLevel", level + 1);
    } else if (kind === "bed") {
      if (purchases[kind]) return false;
      const bbox = this.getHouseBoundingBox(room);
      if (!bbox) return false;
      const startX = bbox.left + 3;
      const startY = bbox.top + Math.floor((bbox.bottom - bbox.top) / 2);
      for (let x = startX; x < startX + 2; x++) setChar(x, startY, "B");
      purchases[kind] = true;
    } else if (kind === "plant") {
      if (purchases[kind]) return false;
      const bbox = this.getHouseBoundingBox(room);
      if (!bbox) return false;
      setChar(bbox.left + 2, bbox.top + 2, "P");
      purchases[kind] = true;
    } else if (kind === "lamp") {
      if (purchases[kind]) return false;
      const bbox = this.getHouseBoundingBox(room);
      if (!bbox) return false;
      setChar(bbox.right - 2, bbox.bottom - 2, "L");
      purchases[kind] = true;
    }

    // Deduct points and persist state
    this.addScore(-cost);
    this.setFlag("house.purchases", purchases);
    const purchaseCount = Number(this.getFlag<number>("house.itemsPurchased") ?? 0);
    this.setFlag("house.itemsPurchased", purchaseCount + 1);
    return true;
  }

  private getHouseBoundingBox(room: { layout: string[] }): { left: number; right: number; top: number; bottom: number } | null {
    // Find the first wood tile to infer the cube, then expand to borders '#'
    for (let y = 0; y < room.layout.length; y++) {
      for (let x = 0; x < room.layout[y].length; x++) {
        if (room.layout[y][x] === 'W') {
          // expand left
          let left = x; while (left > 0 && room.layout[y][left] !== '#') left--;
          let right = x; while (right < room.layout[y].length && room.layout[y][right] !== '#') right++;
          // expand top/bottom by scanning columns within bounds
          let top = y; while (top > 0 && room.layout[top].slice(left + 1, right).includes('W')) top--;
          let bottom = y; while (bottom < room.layout.length - 1 && room.layout[bottom].slice(left + 1, right).includes('W')) bottom++;
          return { left, right, top, bottom };
        }
      }
    }
    return null;
  }

  private expandHouseCube(room: { layout: string[] }, level: number): void {
    // Recreate a centered cube, grown by 2 cells per expansion in each dimension
    const cols = this.config.grid.cols;
    const rows = this.config.grid.rows;
    const prev = room.layout.map((r) => r.split(''));
    const layout = Array.from({ length: rows }, () => Array(cols).fill('.')) as string[][];

    const baseW = Math.min(14, Math.max(10, Math.floor(cols * 0.45)));
    const baseH = Math.min(10, Math.max(8, Math.floor(rows * 0.42)));
    const add = Math.min(3, Math.max(0, level)) * 2; // +2 width/height per level
    const width = Math.min(cols - 4, baseW + add);
    const height = Math.min(rows - 4, baseH + add);
    const left = Math.floor(cols / 2 - width / 2);
    const top = Math.floor(rows / 2 - height / 2);
    for (let y = top; y < top + height; y++) {
      for (let x = left; x < left + width; x++) {
        const isBorder = x === left || x === left + width - 1 || y === top || y === top + height - 1;
        layout[y][x] = isBorder ? '#' : 'W';
      }
    }

    // Carve south door and add rug inside
    const bottom = top + height - 1;
    const cx = Math.floor(left + width / 2);
    const doorHalf = Math.max(1, Math.floor(Math.min(3, Math.floor(width / 6)) / 2));
    for (let x = cx - doorHalf; x <= cx + doorHalf; x++) {
      layout[bottom][x] = '.';
      if (bottom - 1 > top) layout[bottom - 1][x] = 'E';
    }

    // Re-apply furniture if still inside
    const tryPlace = (ch: string) => {
      for (let y = 0; y < prev.length; y++) for (let x = 0; x < prev[y].length; x++) if (prev[y][x] === ch) {
        if (x > left && x < left + width - 1 && y > top && y < top + height - 1) layout[y][x] = ch;
      }
    };
    tryPlace('C');
    tryPlace('K');

    room.layout = layout.map((r) => r.join(''));
  }

  private tickFortitudeStates(): void {
    const invuln = this.getFlag<number>("fortitude.invulnerabilityTicks") ?? 0;
    if (invuln > 0) {
      this.setFlag("fortitude.invulnerabilityTicks", Math.max(0, invuln - 1));
    }
  }

  private tickPlayerStates(): void {
    const invuln = Number(this.getFlag<number>("player.bulletInvulnTicks") ?? 0);
    if (invuln > 0) {
      this.setFlag("player.bulletInvulnTicks", invuln - 1);
    }
  }

  private tickTemperatureState(): boolean {
    const room = this.getCurrentRoom();
    const biome = getBiomeDefinition(room.biomeId);
    const head = this.snake.bodySegments[0];
    if (!head) {
      return false;
    }
    const timeMs = Number(this.getFlag<number>("timeMs") ?? 0);
    const lastTickMs = Number(this.getFlag<number>("player.temperatureLastTickMs") ?? 0);
    const deltaMs = Math.max(0, lastTickMs > 0 ? timeMs - lastTickMs : 0);
    this.setFlag("player.temperatureLastTickMs", timeMs);
    const [roomX, roomY] = this.snake.currentRoomId.split(",").map(Number);
    const localX = head.x - roomX * this.config.grid.cols;
    const localY = head.y - roomY * this.config.grid.rows;
    const tile = room.layout[localY]?.[localX] ?? ".";
    const sheltered = "WETCKBPLG".includes(tile);
    const onRelief = room.temperatureReliefs?.find((relief) => relief.x === localX && relief.y === localY);
    const thresholdMs = Math.max(1000, Number(this.getFlag<number>("player.temperatureThresholdMs") ?? 10000));
    const damageIntervalMs = Math.max(1000, Number(this.getFlag<number>("player.temperatureDamageIntervalMs") ?? 5000));
    const heatResistance = Math.max(0, Number(this.getFlag<number>("equipment.heatResistance") ?? 0));
    const coldResistance = Math.max(0, Number(this.getFlag<number>("equipment.coldResistance") ?? 0));
    const resistance = biome.temperatureHazard === "hot" ? heatResistance : biome.temperatureHazard === "cold" ? coldResistance : 0;
    const exposureRate = Math.max(0.05, (biome.temperatureRate || 1) * Math.max(0, 1 - resistance));
    let exposureMs = Math.max(0, Number(this.getFlag<number>("player.temperatureExposureMs") ?? 0));
    let damageProgressMs = Math.max(0, Number(this.getFlag<number>("player.temperatureDamageProgressMs") ?? 0));

    if (!biome.temperatureHazard) {
      exposureMs = Math.max(0, exposureMs - deltaMs * 2.5);
      damageProgressMs = 0;
      this.setFlag("player.temperatureExposureMs", exposureMs);
      this.setFlag("player.temperatureDamageProgressMs", damageProgressMs);
      this.setFlag("player.temperatureHazard", undefined);
      return false;
    }

    this.setFlag("player.temperatureHazard", biome.temperatureHazard);

    if (onRelief) {
      exposureMs = Math.max(0, exposureMs - deltaMs * 3.5);
      damageProgressMs = Math.max(0, damageProgressMs - deltaMs * 2);
    } else if (sheltered) {
      exposureMs = Math.max(0, exposureMs - deltaMs * 2);
      damageProgressMs = Math.max(0, damageProgressMs - deltaMs * 2);
    } else {
      exposureMs = Math.min(thresholdMs, exposureMs + deltaMs * exposureRate);
      if (exposureMs >= thresholdMs) {
        damageProgressMs += deltaMs;
      }
    }

    this.setFlag("player.temperatureExposureMs", exposureMs);
    this.setFlag("player.temperatureDamageProgressMs", damageProgressMs);

    if (exposureMs < thresholdMs) {
      return false;
    }

    if (damageProgressMs < damageIntervalMs) {
      return false;
    }

    const maxHealth = Number(this.getFlag<number>("player.maxHealth") ?? 3);
    let currentHealth = Number(this.getFlag<number>("player.health") ?? maxHealth);
    while (damageProgressMs >= damageIntervalMs && currentHealth > 0) {
      damageProgressMs -= damageIntervalMs;
      currentHealth -= 1;
    }
    this.setFlag("player.temperatureDamageProgressMs", damageProgressMs);
    this.setFlag("player.health", Math.max(0, currentHealth));
    this.setFlag("ui.healthRevealed", true);
    this.setFlag("ui.playerHit", {
      x: head.x,
      y: head.y,
      roomId: this.snake.currentRoomId,
      health: Math.max(0, currentHealth),
      maxHealth,
    });
    return currentHealth <= 0;
  }

  private tickPowerupState(): void {
    // Sync active state
    const active = this.powerupState;
    if (active && active.remaining > 0) {
      active.remaining -= 1;
      this.setFlag("powerup.active", { kind: active.kind, remaining: active.remaining, total: active.total });
      // Decrement smite runtime ticks mirror flag if present
      if (active.kind === "smite") {
        const sm = Number(this.getFlag<number>("powerup.smiteTicks") ?? 0);
        if (sm > 0) {
          this.setFlag("powerup.smiteTicks", sm - 1);
        } else {
          this.setFlag("powerup.smiteTicks", undefined);
        }
      }
    } else if (active && active.remaining <= 0) {
      // Clear state
      this.powerupState = null;
      this.setFlag("powerup.active", undefined);
      this.setFlag("powerup.smiteTicks", undefined);
    } else {
      // Ensure flag cleared when no powerup
      this.setFlag("powerup.active", undefined);
    }
  }

  private applyBulletDamage(hits: number, style?: "enemy" | "npc-hostile" | "duelist" | "freak-joey" | "player"): boolean {
    if (hits <= 0) {
      return false;
    }
    const invuln = Number(this.getFlag<number>("player.bulletInvulnTicks") ?? 0);
    if (invuln > 0) {
      return false;
    }
    const max = Number(this.getFlag<number>("player.maxHealth") ?? 3);
    const current = Number(this.getFlag<number>("player.health") ?? max);
    const next = Math.max(0, current - 1);
    this.setFlag("player.health", next);
    this.setFlag("ui.healthRevealed", true);
    this.setFlag("player.bulletInvulnTicks", 10);
    const head = this.snake.bodySegments[0];
    if (head) {
      this.setFlag("ui.playerHit", {
        x: head.x,
        y: head.y,
        roomId: this.snake.currentRoomId,
        health: next,
        maxHealth: max,
        source: style,
      });
    }
    return next <= 0;
  }

  private maybeQueueFreakJoeyEncounter(roomId: string): void {
    if (this.getFlag<boolean>("npc.freakJoey.defeated")) {
      return;
    }
    if (this.enemies.hasEnemyWithId("freak-joey")) {
      return;
    }
    const room = this.world.getRoom(roomId);
    if (room.questGiver) {
      return;
    }
    if (this.rng() > 1 / 15) {
      return;
    }
    if (this.visitedRooms.size - this.lastWandererEncounterRoomCount < 5) {
      return;
    }
    const roomsVisited = Number(this.getFlag<number>("roomsVisited") ?? this.visitedRooms.size);
    const encounter = chooseWandererEncounter(this.rng, {
      roomsVisited,
      zoneTags: getRoomEncounterTags(roomId),
      biomeId: room.biomeId,
      excludedIds: this.resolvedWandererEncounters,
      history: this.wandererHistory,
    });
    if (!encounter) {
      return;
    }
    const spawn = this.findEncounterSpawn(roomId);
    if (!spawn) {
      return;
    }
    const history = this.wandererHistory.get(encounter.id);
    this.recordWandererSeen(encounter.id);
    this.lastWandererEncounterRoomCount = this.visitedRooms.size;
    this.setFlag("npc.randomEncounter", {
      ...encounter,
      pages: getEncounterPages(encounter, history),
      roomId,
      x: spawn.x,
      y: spawn.y,
      statsNote: getEncounterStatsNote(encounter.name),
    });
    const revealAtMs = Number(this.getFlag<number>("timeMs") ?? 0);
    this.setFlag("npc.randomEncounter.revealAtMs", revealAtMs);
    this.setFlag("npc.randomEncounter.triggerAtMs", revealAtMs + 2200);
    this.setFlag("ui.wandererReveal", {
      x: spawn.x,
      y: spawn.y,
      roomId,
      id: encounter.id,
    });
  }

  getWandererEncounterHistory(id: string): EncounterHistoryEntry | undefined {
    const history = this.wandererHistory.get(id);
    return history ? { ...history } : undefined;
  }

  private angerNpc(
    roomId: string,
    reason: "insult" | "shot"
  ): { anger: number; hostility: "friendly" | "warning" | "hostile" } | null {
    const room = this.world.getRoom(roomId);
    const giver = room.questGiver;
    if (!giver) {
      return null;
    }
    const current = this.npcDisposition.get(roomId) ?? { anger: 0, hostility: "friendly" as const };
    const anger = reason === "shot" ? 99 : current.anger + 1;
    const hostility =
      anger >= 2 || reason === "shot" ? "hostile" :
      anger >= 1 ? "warning" :
      "friendly";
    const next = { anger, hostility };
    this.npcDisposition.set(roomId, next);
    if (hostility === "hostile") {
      this.enemies.spawnHostileNpc(
        roomId,
        { x: giver.x, y: giver.y },
        giver.name,
        Math.max(3, giver.maxHearts)
      );
    }
    return next;
  }

  private isNpcInLineOfFire(
    room: ReturnType<WorldService["getRoom"]>,
    origin: Vector2Like,
    direction: Vector2Like,
    target: Vector2Like
  ): boolean {
    if (direction.x !== 0) {
      if (origin.y !== target.y) {
        return false;
      }
      if ((target.x - origin.x) * direction.x <= 0) {
        return false;
      }
    } else {
      if (origin.x !== target.x) {
        return false;
      }
      if ((target.y - origin.y) * direction.y <= 0) {
        return false;
      }
    }

    let x = origin.x + direction.x;
    let y = origin.y + direction.y;
    while (x >= 0 && x < this.config.grid.cols && y >= 0 && y < this.config.grid.rows) {
      if (room.layout[y]?.[x] === "#") {
        return false;
      }
      if (x === target.x && y === target.y) {
        return true;
      }
      x += direction.x;
      y += direction.y;
    }
    return false;
  }

  private recordWandererSeen(id: string): void {
    const current = this.wandererHistory.get(id) ?? { seen: 0, accepted: 0, rejected: 0 };
    this.wandererHistory.set(id, {
      ...current,
      seen: current.seen + 1,
    });
  }

  private recordWandererOutcome(id: string, accepted: boolean): void {
    const current = this.wandererHistory.get(id) ?? { seen: 0, accepted: 0, rejected: 0 };
    this.wandererHistory.set(id, {
      seen: Math.max(1, current.seen),
      accepted: current.accepted + (accepted ? 1 : 0),
      rejected: current.rejected + (accepted ? 0 : 1),
    });
  }

  private findEncounterSpawn(roomId: string): Vector2Like | null {
    const room = this.world.getRoom(roomId);
    const [roomX, roomY] = roomId.split(",").map(Number);
    const head = this.snake.bodySegments[0];
    const headLocal = head
      ? {
          x: head.x - roomX * this.config.grid.cols,
          y: head.y - roomY * this.config.grid.rows,
        }
      : { x: Math.floor(this.config.grid.cols / 2), y: Math.floor(this.config.grid.rows / 2) };
    let best: Vector2Like | null = null;
    let bestDistance = -1;
    for (let y = 0; y < this.config.grid.rows; y++) {
      for (let x = 0; x < this.config.grid.cols; x++) {
        if (room.layout[y]?.[x] === "#") continue;
        if (room.apple && room.apple.x === x && room.apple.y === y) continue;
        if (room.treasure && room.treasure.x === x && room.treasure.y === y) continue;
        if (room.powerup && room.powerup.x === x && room.powerup.y === y) continue;
        if (room.questGiver && room.questGiver.x === x && room.questGiver.y === y) continue;
        const distance = Math.abs(x - headLocal.x) + Math.abs(y - headLocal.y);
        if (distance < 5) continue;
        if (distance > bestDistance) {
          bestDistance = distance;
          best = { x, y };
        }
      }
    }
    return best;
  }

  private handleFortitudeRegenerator(roomsChanged: Set<string>): void {
    const base = this.getFlag<{ interval?: number; amount?: number }>("fortitude.regenerator");
    const equip = this.getFlag<{ interval?: number; amount?: number }>("equipment.regenerator");
    const interval = Math.min(
      base?.interval && base.interval > 0 ? base.interval : Number.POSITIVE_INFINITY,
      equip?.interval && equip.interval > 0 ? equip.interval : Number.POSITIVE_INFINITY,
    );
    const amount = (base?.amount ?? 0) + (equip?.amount ?? 0);
    if (!Number.isFinite(interval) || interval <= 0 || amount <= 0) {
      return;
    }
    const counter = (this.getFlag<number>("fortitude.regeneratorCounter") ?? 0) + 1;
    if (counter >= interval) {
      const growAmount = Math.max(1, amount);
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
      // Still allow equipment-only bonus to have no effect without a base
      // invulnerability flag; so early return if no base present
      return;
    }
    const bonus = (this.getFlag<number>("fortitude.invulnerabilityBonus") ?? 0)
      + (this.getFlag<number>("equipment.invulnerabilityBonus") ?? 0);
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
    const eqCharges = this.getFlag<number>("equipment.phoenixCharges") ?? 0;
    const charges = (state?.charges ?? 0) + eqCharges;
    if (charges <= 0) {
      return false;
    }

    if ((state?.charges ?? 0) > 0) {
      const remaining = (state?.charges ?? 0) - 1;
      this.setFlag("fortitude.phoenix", { ...state, charges: remaining });
    } else {
      this.setFlag("equipment.phoenixCharges", Math.max(0, eqCharges - 1));
      this.consumeEquippedPhoenixItem();
    }
    this.snake.restorePreviousSnapshot();
    const maxHealth = Number(this.getFlag<number>("player.maxHealth") ?? 3);
    this.setFlag("player.health", maxHealth);
    this.setFlag("player.bulletInvulnTicks", 12);
    this.setFlag("ui.healthRevealed", true);
    roomsChanged.add(previousRoomId);
    this.setFlag("fortitude.phoenixTriggered", { reason: outcome.reason ?? "unknown" });
    this.setFlag("traversal.manualResumePending", true);

    const base = this.getFlag<{ duration?: number }>("fortitude.invulnerability");
    const bonus = this.getFlag<number>("fortitude.invulnerabilityBonus") ?? 0;
    if (base && (base.duration ?? 0) + bonus > 0) {
      const current = this.getFlag<number>("fortitude.invulnerabilityTicks") ?? 0;
      const refreshed = Math.max(current, (base.duration ?? 0) + bonus + 1);
      this.setFlag("fortitude.invulnerabilityTicks", refreshed);
    }

    return true;
  }

  reviveAfterExtraLife(reason?: string | null): void {
    this.snake.restorePreviousSnapshot();
    const maxHealth = Number(this.getFlag<number>("player.maxHealth") ?? 3);
    this.setFlag("player.health", maxHealth);
    this.setFlag("player.bulletInvulnTicks", 12);
    this.setFlag("ui.healthRevealed", true);
    this.setFlag("fortitude.phoenixTriggered", { reason: reason ?? "extra-life" });
    this.setFlag("traversal.manualResumePending", true);
  }

  private consumeEquippedPhoenixItem(): void {
    for (const [slot, itemId] of this.inventory.getAllEquipped()) {
      const item = getItem(itemId);
      const charges = item?.kind === "equipment" ? item.modifiers?.phoenixCharges ?? 0 : 0;
      if (charges <= 0) {
        continue;
      }
      this.inventory.removeItem(itemId, 1);
      this.inventory.unequip(slot);
      this.setFlag("equipment.itemPhoenixConsumed", { itemId, slot });
      return;
    }
  }

  private resetMomentum(): void {
    this.momentumConfig = createDefaultMomentumConfig();
    this.momentumState = createDefaultMomentumState();
    this.setFlag("momentum.state", undefined);
    this.setFlag("momentum.phasingTicks", undefined);
    this.setFlag("momentum.surgeTriggered", undefined);
    this.setFlag("momentum.trailActive", undefined);
  }

  private hydrateMomentumConfig(): void {
    const contributions = Object.entries(this.snake.flags)
      .filter(([key]) => key.startsWith("momentum.config."))
      .map(([, value]) => value)
      .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object");

    if (contributions.length === 0) {
      this.momentumConfig = createDefaultMomentumConfig();
      return;
    }

    let enabled = false;

    let baseMaxStacks: number | null = null;
    let maxStacksBonus = 0;
    let baseGain: number | null = null;
    let gainBonus = 0;
    let baseDecayDelay: number | null = null;
    let decayDelayBonus = 0;
    let baseDecayLoss: number | null = null;
    let decayLossBonus = 0;
    let baseTurnRetention: number | null = null;
    let turnRetentionBonus = 0;
    let baseTurnForgiveness: number | null = null;
    let turnForgivenessBonus = 0;
    let baseSurgeThreshold: number | null = null;
    let surgeThresholdBonus = 0;
    let baseSurgeDuration: number | null = null;
    let surgeDurationBonus = 0;
    let baseSurgeCooldown: number | null = null;
    let surgeCooldownBonus = 0;
    let baseSurgeConsume: number | null = null;
    let surgeConsumeBonus = 0;
    let baseSurgeInvuln: number | null = null;
    let surgeInvulnBonus = 0;
    let basePhaseTicks: number | null = null;
    let phaseTicksBonus = 0;
    let baseScorePerStack: number | null = null;
    let scorePerStackBonus = 0;
    let baseSurgeScore: number | null = null;
    let surgeScoreBonus = 0;
    let baseTrailTicks: number | null = null;
    let trailTicksBonus = 0;
    let baseTrailScore: number | null = null;
    let trailScoreBonus = 0;

    for (const contribution of contributions) {
      if ((contribution as { enabled?: boolean }).enabled) {
        enabled = true;
      }

      const maxStacksValue = (contribution as { maxStacks?: unknown }).maxStacks;
      if (typeof maxStacksValue === "number") {
        baseMaxStacks = Math.max(baseMaxStacks ?? maxStacksValue, maxStacksValue);
      }
      const maxStacksBonusValue = (contribution as { maxStacksBonus?: unknown }).maxStacksBonus;
      if (typeof maxStacksBonusValue === "number") {
        maxStacksBonus += maxStacksBonusValue;
      }

      const gainValue = (contribution as { baseGain?: unknown }).baseGain;
      if (typeof gainValue === "number") {
        baseGain = Math.max(baseGain ?? gainValue, gainValue);
      }
      const gainBonusValue = (contribution as { gainBonus?: unknown }).gainBonus;
      if (typeof gainBonusValue === "number") {
        gainBonus += gainBonusValue;
      }

      const decayDelayValue = (contribution as { decayDelay?: unknown }).decayDelay;
      if (typeof decayDelayValue === "number") {
        baseDecayDelay = Math.max(baseDecayDelay ?? decayDelayValue, decayDelayValue);
      }
      const decayDelayBonusValue = (contribution as { decayDelayBonus?: unknown }).decayDelayBonus;
      if (typeof decayDelayBonusValue === "number") {
        decayDelayBonus += decayDelayBonusValue;
      }

      const decayLossValue = (contribution as { decayLoss?: unknown }).decayLoss;
      if (typeof decayLossValue === "number") {
        baseDecayLoss = Math.max(baseDecayLoss ?? decayLossValue, decayLossValue);
      }
      const decayLossBonusValue = (contribution as { decayLossBonus?: unknown }).decayLossBonus;
      if (typeof decayLossBonusValue === "number") {
        decayLossBonus += decayLossBonusValue;
      }

      const turnRetentionValue = (contribution as { turnRetention?: unknown }).turnRetention;
      if (typeof turnRetentionValue === "number") {
        baseTurnRetention = Math.max(baseTurnRetention ?? turnRetentionValue, turnRetentionValue);
      }
      const turnRetentionBonusValue = (contribution as { turnRetentionBonus?: unknown }).turnRetentionBonus;
      if (typeof turnRetentionBonusValue === "number") {
        turnRetentionBonus += turnRetentionBonusValue;
      }

      const turnForgivenessValue = (contribution as { turnForgiveness?: unknown }).turnForgiveness;
      if (typeof turnForgivenessValue === "number") {
        baseTurnForgiveness = Math.max(baseTurnForgiveness ?? turnForgivenessValue, turnForgivenessValue);
      }
      const turnForgivenessBonusValue = (contribution as { turnForgivenessBonus?: unknown }).turnForgivenessBonus;
      if (typeof turnForgivenessBonusValue === "number") {
        turnForgivenessBonus += turnForgivenessBonusValue;
      }

      const surgeThresholdValue = (contribution as { surgeThreshold?: unknown }).surgeThreshold;
      if (typeof surgeThresholdValue === "number") {
        baseSurgeThreshold = Math.max(baseSurgeThreshold ?? surgeThresholdValue, surgeThresholdValue);
      }
      const surgeThresholdBonusValue = (contribution as { surgeThresholdBonus?: unknown }).surgeThresholdBonus;
      if (typeof surgeThresholdBonusValue === "number") {
        surgeThresholdBonus += surgeThresholdBonusValue;
      }

      const surgeDurationValue = (contribution as { surgeDuration?: unknown }).surgeDuration;
      if (typeof surgeDurationValue === "number") {
        baseSurgeDuration = Math.max(baseSurgeDuration ?? surgeDurationValue, surgeDurationValue);
      }
      const surgeDurationBonusValue = (contribution as { surgeDurationBonus?: unknown }).surgeDurationBonus;
      if (typeof surgeDurationBonusValue === "number") {
        surgeDurationBonus += surgeDurationBonusValue;
      }

      const surgeCooldownValue = (contribution as { surgeCooldown?: unknown }).surgeCooldown;
      if (typeof surgeCooldownValue === "number") {
        baseSurgeCooldown = Math.max(baseSurgeCooldown ?? surgeCooldownValue, surgeCooldownValue);
      }
      const surgeCooldownBonusValue = (contribution as { surgeCooldownBonus?: unknown }).surgeCooldownBonus;
      if (typeof surgeCooldownBonusValue === "number") {
        surgeCooldownBonus += surgeCooldownBonusValue;
      }

      const surgeConsumeValue = (contribution as { surgeConsume?: unknown }).surgeConsume;
      if (typeof surgeConsumeValue === "number") {
        baseSurgeConsume = Math.max(baseSurgeConsume ?? surgeConsumeValue, surgeConsumeValue);
      }
      const surgeConsumeBonusValue = (contribution as { surgeConsumeBonus?: unknown }).surgeConsumeBonus;
      if (typeof surgeConsumeBonusValue === "number") {
        surgeConsumeBonus += surgeConsumeBonusValue;
      }

      const surgeInvulnValue = (contribution as { surgeInvulnerability?: unknown }).surgeInvulnerability;
      if (typeof surgeInvulnValue === "number") {
        baseSurgeInvuln = Math.max(baseSurgeInvuln ?? surgeInvulnValue, surgeInvulnValue);
      }
      const surgeInvulnBonusValue = (contribution as { surgeInvulnerabilityBonus?: unknown }).surgeInvulnerabilityBonus;
      if (typeof surgeInvulnBonusValue === "number") {
        surgeInvulnBonus += surgeInvulnBonusValue;
      }

      const phaseTicksValue = (contribution as { phaseTicksOnSurge?: unknown }).phaseTicksOnSurge;
      if (typeof phaseTicksValue === "number") {
        basePhaseTicks = Math.max(basePhaseTicks ?? phaseTicksValue, phaseTicksValue);
      }
      const phaseTicksBonusValue = (contribution as { phaseTicksOnSurgeBonus?: unknown }).phaseTicksOnSurgeBonus;
      if (typeof phaseTicksBonusValue === "number") {
        phaseTicksBonus += phaseTicksBonusValue;
      }

      const scorePerStackValue = (contribution as { scorePerStack?: unknown }).scorePerStack;
      if (typeof scorePerStackValue === "number") {
        baseScorePerStack = Math.max(baseScorePerStack ?? scorePerStackValue, scorePerStackValue);
      }
      const scorePerStackBonusValue = (contribution as { scorePerStackBonus?: unknown }).scorePerStackBonus;
      if (typeof scorePerStackBonusValue === "number") {
        scorePerStackBonus += scorePerStackBonusValue;
      }

      const surgeScoreValue = (contribution as { surgeScore?: unknown }).surgeScore;
      if (typeof surgeScoreValue === "number") {
        baseSurgeScore = Math.max(baseSurgeScore ?? surgeScoreValue, surgeScoreValue);
      }
      const surgeScoreBonusValue = (contribution as { surgeScoreBonus?: unknown }).surgeScoreBonus;
      if (typeof surgeScoreBonusValue === "number") {
        surgeScoreBonus += surgeScoreBonusValue;
      }

      const trailTicksValue = (contribution as { trailTicks?: unknown }).trailTicks;
      if (typeof trailTicksValue === "number") {
        baseTrailTicks = Math.max(baseTrailTicks ?? trailTicksValue, trailTicksValue);
      }
      const trailTicksBonusValue = (contribution as { trailTicksBonus?: unknown }).trailTicksBonus;
      if (typeof trailTicksBonusValue === "number") {
        trailTicksBonus += trailTicksBonusValue;
      }

      const trailScoreValue = (contribution as { trailScorePerTick?: unknown }).trailScorePerTick;
      if (typeof trailScoreValue === "number") {
        baseTrailScore = Math.max(baseTrailScore ?? trailScoreValue, trailScoreValue);
      }
      const trailScoreBonusValue = (contribution as { trailScorePerTickBonus?: unknown }).trailScorePerTickBonus;
      if (typeof trailScoreBonusValue === "number") {
        trailScoreBonus += trailScoreBonusValue;
      }
    }

    const config = createDefaultMomentumConfig();
    config.enabled = enabled;

    const gainBase = baseGain ?? (enabled ? 1 : 0);
    config.gainPerTick = Math.max(0, gainBase + gainBonus);

    let maxStacks = baseMaxStacks ?? (enabled ? 5 : 0);
    maxStacks = Math.max(0, maxStacks + maxStacksBonus);
    config.maxStacks = Math.round(maxStacks);

    const decayDelayBase = baseDecayDelay ?? (enabled ? 4 : 0);
    config.decayDelay = Math.max(0, Math.round(decayDelayBase + decayDelayBonus));

    const decayLossBase = baseDecayLoss ?? (enabled ? 1 : 0);
    config.decayLoss = Math.max(0, decayLossBase + decayLossBonus);

    const turnRetentionBase = baseTurnRetention ?? (enabled ? 0.25 : 0);
    config.turnRetention = Math.max(0, Math.min(1, turnRetentionBase + turnRetentionBonus));

    const turnForgivenessBase = baseTurnForgiveness ?? 0;
    config.turnForgiveness = Math.max(0, Math.round(turnForgivenessBase + turnForgivenessBonus));

    let surgeThreshold = baseSurgeThreshold ?? (config.maxStacks > 0 ? config.maxStacks : Number.POSITIVE_INFINITY);
    surgeThreshold += surgeThresholdBonus;
    if (surgeThreshold <= 0) {
      surgeThreshold = Number.POSITIVE_INFINITY;
    }
    config.surgeThreshold = surgeThreshold;

    const surgeDurationBase = baseSurgeDuration ?? 0;
    config.surgeDuration = Math.max(0, Math.round(surgeDurationBase + surgeDurationBonus));

    const surgeCooldownBase = baseSurgeCooldown ?? 0;
    config.surgeCooldown = Math.max(0, Math.round(surgeCooldownBase + surgeCooldownBonus));

    const surgeConsumeBase = baseSurgeConsume ?? (config.maxStacks > 0 ? 1 : 0);
    config.surgeConsume = Math.max(0, Math.round(surgeConsumeBase + surgeConsumeBonus));

    const surgeInvulnBase = baseSurgeInvuln ?? 0;
    config.surgeInvulnerability = Math.max(0, Math.round(surgeInvulnBase + surgeInvulnBonus));

    const phaseTicksBase = basePhaseTicks ?? 0;
    config.phaseTicksOnSurge = Math.max(0, Math.round(phaseTicksBase + phaseTicksBonus));

    const scorePerStackBase = baseScorePerStack ?? 0;
    config.scorePerStack = Math.max(0, scorePerStackBase + scorePerStackBonus);

    const surgeScoreBase = baseSurgeScore ?? 0;
    config.surgeScore = Math.max(0, Math.round(surgeScoreBase + surgeScoreBonus));

    const trailTicksBase = baseTrailTicks ?? 0;
    config.trailTicks = Math.max(0, Math.round(trailTicksBase + trailTicksBonus));

    const trailScoreBase = baseTrailScore ?? 0;
    config.trailScorePerTick = Math.max(0, Math.round(trailScoreBase + trailScoreBonus));

    this.momentumConfig = config;
  }

  private ensureMomentumState(): MomentumRuntimeState {
    return this.momentumState;
  }

  private syncMomentumFlags(): void {
    const state = this.momentumState;
    if (!this.momentumConfig.enabled && state.stacks === 0 && state.surgeTicks === 0 && state.phasingTicks === 0 && state.trailTicks === 0) {
      this.setFlag("momentum.state", undefined);
    } else {
      this.setFlag("momentum.state", {
        stacks: state.stacks,
        surgeTicks: state.surgeTicks,
        cooldown: state.surgeCooldown,
      });
    }

    if (state.phasingTicks > 0) {
      this.setFlag("momentum.phasingTicks", state.phasingTicks);
    } else {
      this.setFlag("momentum.phasingTicks", undefined);
    }

    if (state.trailTicks > 0) {
      this.setFlag("momentum.trailActive", state.trailTicks);
    } else {
      this.setFlag("momentum.trailActive", undefined);
    }
  }

  private handleMomentumStep(previousDirection: Vector2Like, currentDirection: Vector2Like): void {
    const config = this.momentumConfig;
    const state = this.ensureMomentumState();
    if (!config.enabled) {
      return;
    }

    const moving = currentDirection.x !== 0 || currentDirection.y !== 0;
    const prev = state.previousDirection;
    const turned = Boolean(prev) && (prev!.x !== currentDirection.x || prev!.y !== currentDirection.y);

    if (moving && (!turned || state.forgivenessTimer > 0)) {
      state.stacks += config.gainPerTick;
      state.decayTimer = config.decayDelay;
      if (state.forgivenessTimer > 0) {
        state.forgivenessTimer -= 1;
      }
    } else if (turned) {
      const retention = Math.max(0, Math.min(1, config.turnRetention));
      state.stacks = Math.floor(state.stacks * retention);
      state.decayTimer = config.decayDelay;
      if (config.turnForgiveness > 0) {
        state.forgivenessTimer = Math.max(state.forgivenessTimer, config.turnForgiveness);
      }
      if (config.trailTicks > 0) {
        state.trailTicks = Math.max(state.trailTicks, config.trailTicks);
      }
    }

    if (moving) {
      state.previousDirection = { ...currentDirection };
    }

    if (state.stacks > config.maxStacks) {
      state.stacks = config.maxStacks;
    }
    if (state.stacks < 0) {
      state.stacks = 0;
    }

    if (config.surgeThreshold !== Number.POSITIVE_INFINITY && state.stacks >= config.surgeThreshold && (config.surgeDuration > 0 || config.phaseTicksOnSurge > 0 || config.surgeInvulnerability > 0)) {
      if (state.surgeCooldown <= 0) {
        state.surgeTicks = config.surgeDuration;
        state.surgeCooldown = config.surgeCooldown;
        if (config.surgeConsume > 0) {
          state.stacks = Math.max(0, state.stacks - config.surgeConsume);
        }
        const phaseGrant = config.phaseTicksOnSurge + config.surgeInvulnerability;
        if (phaseGrant > 0) {
          state.phasingTicks = Math.max(state.phasingTicks, phaseGrant);
        }
        if (config.surgeScore > 0) {
          this.addScore(config.surgeScore);
        }
        this.setFlag("momentum.surgeTriggered", {
          roomId: this.snake.currentRoomId,
          stacks: state.stacks,
          duration: state.surgeTicks,
        });
      }
    }

    this.syncMomentumFlags();
  }

  private handleMomentumOnApple(consumption: AppleConsumptionResult, roomsChanged: Set<string>): number {
    const config = this.momentumConfig;
    if (!config.enabled) {
      return 0;
    }
    const state = this.ensureMomentumState();
    let bonusScore = 0;
    if (config.scorePerStack > 0 && state.stacks > 0) {
      const scoreGain = Math.round(config.scorePerStack * state.stacks);
      if (scoreGain > 0) {
        this.addScore(scoreGain);
        bonusScore += scoreGain;
      }
    }
    this.syncMomentumFlags();
    return bonusScore;
  }

  private tickMomentumState(): void {
    const config = this.momentumConfig;
    const state = this.ensureMomentumState();

    if (!config.enabled) {
      if (state.stacks !== 0 || state.surgeTicks !== 0 || state.phasingTicks !== 0 || state.trailTicks !== 0) {
        this.momentumState = createDefaultMomentumState();
        this.syncMomentumFlags();
      }
      return;
    }

    if (state.decayTimer > 0) {
      state.decayTimer -= 1;
    } else if (config.decayLoss > 0 && state.stacks > 0) {
      state.stacks = Math.max(0, state.stacks - config.decayLoss);
      state.decayTimer = config.decayDelay;
    }

    if (state.surgeCooldown > 0) {
      state.surgeCooldown -= 1;
    }

    if (state.surgeTicks > 0) {
      state.surgeTicks -= 1;
      if (state.surgeTicks <= 0) {
        this.setFlag("momentum.surgeTriggered", undefined);
      }
    }

    if (state.phasingTicks > 0) {
      state.phasingTicks -= 1;
    }

    if (state.forgivenessTimer > 0) {
      state.forgivenessTimer -= 1;
    }

    if (state.trailTicks > 0) {
      state.trailTicks -= 1;
      if (config.trailScorePerTick > 0) {
        this.addScore(config.trailScorePerTick);
      }
    }

    if (state.stacks < 0) {
      state.stacks = 0;
    }
    if (state.stacks > config.maxStacks) {
      state.stacks = config.maxStacks;
    }

    this.syncMomentumFlags();
  }

  private resetTraversal(): void {
    this.traversalConfig = createDefaultTraversalConfig();
    this.traversalState = createDefaultTraversalState();
    this.setFlag("traversal.state", undefined);
    this.setFlag("traversal.phaseTicks", undefined);
    this.setFlag("traversal.ghostShield", undefined);
    this.setFlag("traversal.echoActive", undefined);
  }

  private hydrateTraversalConfig(): void {
    const contributions = Object.entries(this.snake.flags)
      .filter(([key]) => key.startsWith("traversal.config."))
      .map(([, value]) => value)
      .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object");

    if (contributions.length === 0) {
      this.traversalConfig = createDefaultTraversalConfig();
      return;
    }

    let enabled = false;

    let baseWidth: number | null = null;
    let widthBonus = 0;
    let baseExtend: number | null = null;
    let extendBonus = 0;
    let basePhaseTicks: number | null = null;
    let phaseTicksBonus = 0;
    let baseGrowth: number | null = null;
    let growthBonus = 0;
    let baseScore: number | null = null;
    let scoreBonus = 0;
    let baseShield: number | null = null;
    let shieldBonus = 0;
    let baseEchoTicks: number | null = null;
    let echoTicksBonus = 0;
    let baseEchoScore: number | null = null;
    let echoScoreBonus = 0;
    let pullApple = false;

    for (const contribution of contributions) {
      if ((contribution as { enabled?: boolean }).enabled) {
        enabled = true;
      }

      const widthValue = (contribution as { corridorWidth?: unknown }).corridorWidth;
      if (typeof widthValue === "number") {
        baseWidth = Math.max(baseWidth ?? widthValue, widthValue);
      }
      const widthBonusValue = (contribution as { corridorWidthBonus?: unknown }).corridorWidthBonus;
      if (typeof widthBonusValue === "number") {
        widthBonus += widthBonusValue;
      }

      const extendValue = (contribution as { extendForwardRooms?: unknown }).extendForwardRooms;
      if (typeof extendValue === "number") {
        baseExtend = Math.max(baseExtend ?? extendValue, extendValue);
      }
      const extendBonusValue = (contribution as { extendForwardRoomsBonus?: unknown }).extendForwardRoomsBonus;
      if (typeof extendBonusValue === "number") {
        extendBonus += extendBonusValue;
      }

      const phaseValue = (contribution as { phaseTicksOnEnter?: unknown }).phaseTicksOnEnter;
      if (typeof phaseValue === "number") {
        basePhaseTicks = Math.max(basePhaseTicks ?? phaseValue, phaseValue);
      }
      const phaseBonusValue = (contribution as { phaseTicksOnEnterBonus?: unknown }).phaseTicksOnEnterBonus;
      if (typeof phaseBonusValue === "number") {
        phaseTicksBonus += phaseBonusValue;
      }

      const growthValue = (contribution as { growthOnEnter?: unknown }).growthOnEnter;
      if (typeof growthValue === "number") {
        baseGrowth = Math.max(baseGrowth ?? growthValue, growthValue);
      }
      const growthBonusValue = (contribution as { growthOnEnterBonus?: unknown }).growthOnEnterBonus;
      if (typeof growthBonusValue === "number") {
        growthBonus += growthBonusValue;
      }

      const scoreValue = (contribution as { scoreOnEnter?: unknown }).scoreOnEnter;
      if (typeof scoreValue === "number") {
        baseScore = Math.max(baseScore ?? scoreValue, scoreValue);
      }
      const scoreBonusValue = (contribution as { scoreOnEnterBonus?: unknown }).scoreOnEnterBonus;
      if (typeof scoreBonusValue === "number") {
        scoreBonus += scoreBonusValue;
      }

      const shieldValue = (contribution as { ghostShieldCharges?: unknown }).ghostShieldCharges;
      if (typeof shieldValue === "number") {
        baseShield = Math.max(baseShield ?? shieldValue, shieldValue);
      }
      const shieldBonusValue = (contribution as { ghostShieldChargesBonus?: unknown }).ghostShieldChargesBonus;
      if (typeof shieldBonusValue === "number") {
        shieldBonus += shieldBonusValue;
      }

      const echoTicksValue = (contribution as { echoTicks?: unknown }).echoTicks;
      if (typeof echoTicksValue === "number") {
        baseEchoTicks = Math.max(baseEchoTicks ?? echoTicksValue, echoTicksValue);
      }
      const echoTicksBonusValue = (contribution as { echoTicksBonus?: unknown }).echoTicksBonus;
      if (typeof echoTicksBonusValue === "number") {
        echoTicksBonus += echoTicksBonusValue;
      }

      const echoScoreValue = (contribution as { echoScore?: unknown }).echoScore;
      if (typeof echoScoreValue === "number") {
        baseEchoScore = Math.max(baseEchoScore ?? echoScoreValue, echoScoreValue);
      }
      const echoScoreBonusValue = (contribution as { echoScoreBonus?: unknown }).echoScoreBonus;
      if (typeof echoScoreBonusValue === "number") {
        echoScoreBonus += echoScoreBonusValue;
      }

      if ((contribution as { pullAppleIntoCorridor?: boolean }).pullAppleIntoCorridor) {
        pullApple = true;
      }
    }

    const config = createDefaultTraversalConfig();
    config.enabled = enabled;

    const widthBase = baseWidth ?? (enabled ? 3 : 0);
    config.corridorWidth = Math.max(0, Math.round(widthBase + widthBonus));

    const extendBase = baseExtend ?? 0;
    config.extendForwardRooms = Math.max(0, Math.round(extendBase + extendBonus));

    const phaseBase = basePhaseTicks ?? 0;
    config.phaseTicksOnEnter = Math.max(0, Math.round(phaseBase + phaseTicksBonus));

    const growthBase = baseGrowth ?? 0;
    config.growthOnEnter = Math.max(0, Math.round(growthBase + growthBonus));

    const scoreBase = baseScore ?? 0;
    config.scoreOnEnter = Math.max(0, Math.round(scoreBase + scoreBonus));

    const shieldBase = baseShield ?? 0;
    config.ghostShieldCharges = Math.max(0, Math.round(shieldBase + shieldBonus));

    const echoTicksBase = baseEchoTicks ?? 0;
    config.echoTicks = Math.max(0, Math.round(echoTicksBase + echoTicksBonus));

    const echoScoreBase = baseEchoScore ?? 0;
    config.echoScore = Math.max(0, Math.round(echoScoreBase + echoScoreBonus));

    config.pullAppleIntoCorridor = pullApple;

    this.traversalConfig = config;
  }

  private ensureTraversalState(): TraversalRuntimeState {
    return this.traversalState;
  }

  private syncTraversalFlags(): void {
    const state = this.traversalState;
    if (!this.traversalConfig.enabled && state.ghostShields === 0 && state.phaseTicks === 0 && state.echoTicks === 0) {
      this.setFlag("traversal.state", undefined);
    } else {
      this.setFlag("traversal.state", {
        ghostShields: state.ghostShields,
        phaseTicks: state.phaseTicks,
        echoTicks: state.echoTicks,
      });
    }

    if (state.phaseTicks > 0) {
      this.setFlag("traversal.phaseTicks", state.phaseTicks);
    } else {
      this.setFlag("traversal.phaseTicks", undefined);
    }

    if (state.ghostShields > 0) {
      this.setFlag("traversal.ghostShield", { charges: state.ghostShields });
    } else {
      this.setFlag("traversal.ghostShield", undefined);
    }

    if (state.echoTicks > 0) {
      this.setFlag("traversal.echoActive", state.echoTicks);
    } else {
      this.setFlag("traversal.echoActive", undefined);
    }
  }

  private handleTraversalRoomChange(previousRoomId: string, currentRoomId: string, roomsChanged: Set<string>): void {
    const config = this.traversalConfig;
    if (!config.enabled) {
      return;
    }

    if (config.corridorWidth > 0) {
      this.carveTraversalCorridor(currentRoomId, this.snake.directionVector, config.corridorWidth, config.extendForwardRooms, roomsChanged, config.pullAppleIntoCorridor);
    }

    if (config.scoreOnEnter > 0) {
      this.addScore(config.scoreOnEnter);
    }

    if (config.growthOnEnter > 0) {
      for (let i = 0; i < config.growthOnEnter; i += 1) {
        this.snake.grow(1);
      }
      roomsChanged.add(currentRoomId);
    }

    if (config.ghostShieldCharges > 0) {
      const state = this.ensureTraversalState();
      state.ghostShields = Math.max(state.ghostShields, config.ghostShieldCharges);
    }

    if (config.phaseTicksOnEnter > 0) {
      const state = this.ensureTraversalState();
      state.phaseTicks = Math.max(state.phaseTicks, config.phaseTicksOnEnter);
    }

    if (config.echoTicks > 0) {
      const state = this.ensureTraversalState();
      state.echoTicks = Math.max(state.echoTicks, config.echoTicks);
    }

    this.syncTraversalFlags();
  }

  private tickTraversalState(): void {
    const config = this.traversalConfig;
    const state = this.ensureTraversalState();

    if (!config.enabled) {
      if (state.ghostShields !== 0 || state.phaseTicks !== 0 || state.echoTicks !== 0) {
        this.traversalState = createDefaultTraversalState();
        this.syncTraversalFlags();
      }
      return;
    }

    if (state.phaseTicks > 0) {
      state.phaseTicks -= 1;
    }

    if (state.echoTicks > 0) {
      state.echoTicks -= 1;
      if (config.echoScore > 0) {
        this.addScore(config.echoScore);
      }
    }

    const shieldFlag = this.getFlag<{ charges?: number }>("traversal.ghostShield");
    if (shieldFlag && typeof shieldFlag.charges === "number") {
      state.ghostShields = Math.max(0, shieldFlag.charges);
    }

    if (state.phaseTicks < 0) {
      state.phaseTicks = 0;
    }
    if (state.echoTicks < 0) {
      state.echoTicks = 0;
    }

    this.syncTraversalFlags();
  }

  private carveTraversalCorridor(
    roomId: string,
    direction: Vector2Like,
    width: number,
    extendForwardRooms: number,
    roomsChanged: Set<string>,
    pullApple: boolean
  ): void {
    const axisX = Math.abs(direction.x) >= Math.abs(direction.y) ? Math.sign(direction.x) : 0;
    const axisY = axisX === 0 ? Math.sign(direction.y) : 0;
    const visited = new Set<string>();
    let currentRoomId: string | null = roomId;
    let baseLocal: { localX: number; localY: number } | null = null;
    const head = this.snake.bodySegments[0];
    if (head) {
      const info = this.resolveRoomPosition(head);
      if (info) {
        baseLocal = { localX: info.localX, localY: info.localY };
      }
    }

    const totalSteps = Math.max(0, extendForwardRooms);
    for (let step = 0; step <= totalSteps; step += 1) {
      if (!currentRoomId || visited.has(currentRoomId)) {
        break;
      }
      visited.add(currentRoomId);
      this.openTraversalCorridorInRoom(currentRoomId, axisX, axisY, width, baseLocal, pullApple, roomsChanged);
      const nextRoomId = this.shiftRoomId(currentRoomId, axisX, axisY);
      currentRoomId = nextRoomId;
      baseLocal = null;
    }
  }

  private openTraversalCorridorInRoom(
    roomId: string,
    axisX: number,
    axisY: number,
    width: number,
    baseLocal: { localX: number; localY: number } | null,
    pullApple: boolean,
    roomsChanged: Set<string>
  ): void {
    const room = this.world.getRoom(roomId);
    if (!room) {
      return;
    }
    const cols = this.config.grid.cols;
    const rows = this.config.grid.rows;
    const orientationHorizontal = axisX !== 0 || axisY === 0;
    const centerX = baseLocal?.localX ?? Math.floor(cols / 2);
    const centerY = baseLocal?.localY ?? Math.floor(rows / 2);
    const halfWidth = Math.max(0, Math.floor((width - 1) / 2));

    if (orientationHorizontal) {
      for (let offset = -halfWidth; offset <= halfWidth; offset += 1) {
        const rowIndex = centerY + offset;
        if (rowIndex < 0 || rowIndex >= rows) {
          continue;
        }
        const row = room.layout[rowIndex];
        if (!row) {
          continue;
        }
        for (let x = 0; x < cols; x += 1) {
          if (row[x] === '#') {
            this.setRoomTile(roomId, x, rowIndex, '.');
          }
        }
      }
      if (pullApple && room.apple) {
        const minRow = Math.max(0, centerY - halfWidth);
        const maxRow = Math.min(rows - 1, centerY + halfWidth);
        if (room.apple.y < minRow || room.apple.y > maxRow) {
          const targetY = Math.min(Math.max(centerY, 0), rows - 1);
          const targetX = Math.min(Math.max(centerX, 0), cols - 1);
          this.world.setApple(roomId, { x: targetX, y: targetY });
        }
      }
    } else {
      for (let offset = -halfWidth; offset <= halfWidth; offset += 1) {
        const colIndex = centerX + offset;
        if (colIndex < 0 || colIndex >= cols) {
          continue;
        }
        for (let y = 0; y < rows; y += 1) {
          const row = room.layout[y];
          if (!row) {
            continue;
          }
          if (row[colIndex] === '#') {
            this.setRoomTile(roomId, colIndex, y, '.');
          }
        }
      }
      if (pullApple && room.apple) {
        const minCol = Math.max(0, centerX - halfWidth);
        const maxCol = Math.min(cols - 1, centerX + halfWidth);
        if (room.apple.x < minCol || room.apple.x > maxCol) {
          const targetX = Math.min(Math.max(centerX, 0), cols - 1);
          const targetY = Math.min(Math.max(centerY, 0), rows - 1);
          this.world.setApple(roomId, { x: targetX, y: targetY });
        }
      }
    }

    roomsChanged.add(roomId);
  }

  private shiftRoomId(roomId: string, axisX: number, axisY: number): string | null {
    if (axisX === 0 && axisY === 0) {
      return null;
    }
    const [roomX, roomY, roomZ = '0'] = roomId.split(',');
    const nextX = Number(roomX) + axisX;
    const nextY = Number(roomY) + axisY;
    if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
      return null;
    }
    return `${nextX},${nextY},${roomZ}`;
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
      // UI: horizontal sweep at the affected row
      this.setFlag("ui.faultLine", { roomId, y: localY });
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
      // UI: seismic pulse burst at head position
      this.setFlag("ui.seismicPulse", { x: head.x, y: head.y, roomId, radius });
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
      // UI: construction sparks at head
      this.setFlag("ui.collapseControl", { x: head.x, y: head.y, roomId });
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
    // UI: debris burst
    this.setFlag("ui.wallChomp", { x: info.x, y: info.y, roomId: info.roomId });
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
