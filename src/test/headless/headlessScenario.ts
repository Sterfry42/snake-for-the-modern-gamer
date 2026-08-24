import { expect } from 'vitest';
import { defaultGameConfig, type GameConfig } from '../../config/gameConfig.js';
import type { GameSaveData } from '../../game/saveManager.js';
import { SnakeGame } from '../../game/snakeGame.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { LocalGameSession } from '../../session/LocalGameSession.js';
import { SimulationScheduler, type ClockRule } from '../../systems/simulationScheduler.js';
import { parseCoordinateRoomId } from '../../world/roomAddress.js';
import { isSolidTile } from '../../world/tiles.js';
import type { RoomSnapshot } from '../../world/types.js';
import type { Actor, ActorGoal, ActorPresence } from '../../actors/actorTypes.js';

export interface HeadlessScenarioOptions {
  seed: string;
  configOverrides?: DeepPartial<GameConfig>;
}

export interface AdvanceOptions {
  assertIntegrityEveryMs?: number;
}

export interface AdvanceUntilOptions extends AdvanceOptions {
  timeoutMs: number;
  stepMs?: number;
}

export interface ScenarioDiagnostics {
  seed: string;
  simulatedMs: number;
  actorTicks: number;
  actorCount: number;
  actorMutations: number;
  currentRoomId: string;
  dayPhase: string;
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

const HEADLESS_CLOCK_RULES: Record<string, ClockRule> = {
  action: false,
  actor: true,
  bullet: true,
  hazard: true,
};

export class HeadlessScenario {
  readonly game: SnakeGame;
  readonly session: LocalGameSession;
  private readonly scheduler: SimulationScheduler;
  private simulatedMs = 0;
  private actorStepsDue = 0;
  private readonly recentEvents: string[] = [];

  private constructor(game: SnakeGame) {
    this.game = game;
    this.session = new LocalGameSession({ game });
    this.scheduler = new SimulationScheduler([
      {
        id: 'action',
        intervalMs: 100,
        step: () => {
          this.session.actionStep(false);
        },
      },
      {
        id: 'actor',
        intervalMs: 100,
        step: () => {
          this.actorStepsDue += 1;
        },
      },
      {
        id: 'bullet',
        intervalMs: 100,
        step: () => {
          this.session.bulletClockStep();
        },
      },
      {
        id: 'hazard',
        intervalMs: 100,
        step: () => {
          this.session.hazardClockStep();
        },
      },
    ]);
    this.captureActorTelemetry();
  }

  static create(options: HeadlessScenarioOptions): HeadlessScenario {
    const config = mergeConfig(defaultGameConfig, {
      ...options.configOverrides,
      rng: { ...options.configOverrides?.rng, seed: options.seed },
    });
    const game = new SnakeGame(config, new QuestRegistry(), {});
    return new HeadlessScenario(game);
  }

  static fromSave(save: GameSaveData): HeadlessScenario {
    const game = new SnakeGame(
      mergeConfig(defaultGameConfig, {
        rng: { seed: save.worldGeneration?.seed ?? 'headless-load' },
      }),
      new QuestRegistry(),
      {},
    );
    const loaded = game.loadFromSaveData(save);
    expect(loaded).toBe(true);
    return new HeadlessScenario(game);
  }

  async advanceMs(ms: number, options: AdvanceOptions = {}): Promise<void> {
    const target = this.simulatedMs + Math.max(0, ms);
    let nextIntegrityAt =
      options.assertIntegrityEveryMs && options.assertIntegrityEveryMs > 0
        ? this.simulatedMs + options.assertIntegrityEveryMs
        : Number.POSITIVE_INFINITY;

    while (this.simulatedMs < target) {
      const deltaMs = Math.min(250, target - this.simulatedMs);
      this.simulatedMs += deltaMs;
      this.game.setFlag('timeMs', this.simulatedMs);
      this.game.updateAtmosphere(deltaMs);
      this.scheduler.update(deltaMs, HEADLESS_CLOCK_RULES);
      await this.drainActorSteps();

      if (this.simulatedMs >= nextIntegrityAt) {
        this.assertWorldIntegrity();
        nextIntegrityAt += options.assertIntegrityEveryMs ?? Number.POSITIVE_INFINITY;
      }
    }
  }

  async advanceSeconds(seconds: number, options?: AdvanceOptions): Promise<void> {
    await this.advanceMs(seconds * 1_000, options);
  }

  async advanceMinutes(minutes: number, options?: AdvanceOptions): Promise<void> {
    await this.advanceMs(minutes * 60_000, options);
  }

  async advanceActorTicks(ticks: number, stepMs = 100): Promise<void> {
    for (let index = 0; index < ticks; index += 1) {
      this.simulatedMs += stepMs;
      this.game.setFlag('timeMs', this.simulatedMs);
      await this.session.actorClockStep(stepMs);
    }
  }

  advanceActionTicks(ticks: number): void {
    for (let index = 0; index < ticks; index += 1) {
      this.session.actionStep(false);
    }
  }

  async advanceUntil(predicate: () => boolean, options: AdvanceUntilOptions): Promise<void> {
    const stepMs = options.stepMs ?? 100;
    const startedAt = this.simulatedMs;
    while (this.simulatedMs - startedAt < options.timeoutMs) {
      if (predicate()) {
        return;
      }
      await this.advanceMs(stepMs, options);
    }
    throw new Error(this.describeTimeout(options.timeoutMs));
  }

  setDayPhase(dayPhase: 'dawn' | 'day' | 'dusk' | 'night'): void {
    const save = this.game.getSaveData();
    const loaded = this.game.loadFromSaveData({
      ...save,
      atmosphere: { ...this.game.getAtmosphereState(), dayPhase, phaseProgress: 0 },
    });
    expect(loaded).toBe(true);
    this.game.getActorSystem().markSchedulesDirty();
  }

  async advanceToDayPhase(dayPhase: 'dawn' | 'day' | 'dusk' | 'night'): Promise<void> {
    await this.advanceUntil(() => this.game.getAtmosphereState().dayPhase === dayPhase, {
      timeoutMs: 600_000,
      stepMs: 1_000,
    });
  }

  getRoom(roomId: string): RoomSnapshot {
    return this.game.getRoom(roomId);
  }

  enterRoom(roomId: string, position = { x: 5, y: 5 }): void {
    this.game.moveToRoom(roomId, position);
  }

  currentRoom(): RoomSnapshot {
    return this.game.getCurrentRoom();
  }

  actor(actorId: string): Actor {
    const actor = this.game.getActorSystem().getActor(actorId);
    if (!actor) {
      throw new Error(`Actor "${actorId}" was not found.\n${this.describeWorld()}`);
    }
    return actor;
  }

  actorsInRoom(roomId: string): Actor[] {
    return this.game.getActorSystem().getActorsInRoom(roomId);
  }

  player() {
    const player = this.game.getPlayer(this.game.getLocalPlayerId());
    if (!player) {
      throw new Error('Local player was not found.');
    }
    return player;
  }

  placeActor(actorId: string, presence: ActorPresence, reason = 'headless-scenario'): Actor {
    const actor = this.game.getActorSystem().setPresence(actorId, presence, reason);
    if (!actor) {
      throw new Error(`Cannot place missing Actor "${actorId}".`);
    }
    return actor;
  }

  setActorGoal(actorId: string, goal: ActorGoal): Actor {
    const actor = this.game.getActorSystem().requestGoal(actorId, goal, { interrupt: true });
    if (!actor) {
      throw new Error(`Cannot set goal for missing Actor "${actorId}".`);
    }
    return actor;
  }

  diagnostics(): ScenarioDiagnostics {
    const actorSystem = this.game.getActorSystem();
    return {
      seed: this.game.worldSeed,
      simulatedMs: this.simulatedMs,
      actorTicks: actorSystem.getTickCount(),
      actorCount: actorSystem.registry.getAll().length,
      actorMutations: actorSystem.registry.getMutationCount(),
      currentRoomId: this.game.getCurrentRoom().id,
      dayPhase: this.game.getAtmosphereState().dayPhase,
    };
  }

  captureSimulationFingerprint(): Record<string, unknown> {
    return {
      diagnostics: this.diagnostics(),
      actorSave: this.game.getActorSystem().toSaveData(),
      snapshot: this.game.getSnapshot(),
      atmosphere: this.game.getAtmosphereState(),
    };
  }

  readNineRoomsRepeatedly(iterations: number): void {
    const address = parseCoordinateRoomId(this.game.getCurrentRoom().id);
    const x = address?.x ?? 0;
    const y = address?.y ?? 0;
    const z = address?.z ?? 0;
    for (let index = 0; index < iterations; index += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          this.game.getRoom(`${x + dx},${y + dy},${z}`);
        }
      }
      this.game.getActorsInCurrentRoom();
      this.game.getDebugSnapshot();
    }
  }

  assertWorldIntegrity(): void {
    const roomsToCheck = new Set<string>([this.game.getCurrentRoom().id]);
    const actors = this.game.getActorSystem().registry.getAll();
    const actorIds = new Set<string>();
    for (const actor of actors) {
      expect(actorIds.has(actor.id), `Duplicate Actor id: ${actor.id}`).toBe(false);
      actorIds.add(actor.id);
      if (actor.presence) {
        roomsToCheck.add(actor.presence.roomId);
      }
      if (actor.currentRoomId) {
        roomsToCheck.add(actor.currentRoomId);
      }
    }

    for (const roomId of roomsToCheck) {
      try {
        this.game.getRoom(roomId);
      } catch (error) {
        if (roomId.startsWith('layer:')) {
          continue;
        }
        throw error;
      }
    }

    this.assertPlayerPositionValid();
    this.assertActorPositionsValid(actors);
    this.assertLayerRuntimeConsistent();
  }

  private async drainActorSteps(): Promise<void> {
    while (this.actorStepsDue > 0) {
      this.actorStepsDue -= 1;
      await this.session.actorClockStep(100);
    }
  }

  private assertPlayerPositionValid(): void {
    const player = this.player();
    const head = player.snake.bodySegments[0];
    expect(head, 'Player snake should have a head segment.').toBeDefined();
    if (!head) return;
    const roomId = player.snake.currentRoomId;
    const room = this.game.getRoom(roomId);
    const local = toLocalPosition(roomId, head, this.game.config.grid);
    expect(isInsideRoom(room, local), `Player is outside room ${roomId}.`).toBe(true);
  }

  private assertActorPositionsValid(actors: readonly Actor[]): void {
    const occupied = new Map<string, string>();
    for (const actor of actors) {
      if (actor.health?.state === 'dead' || actor.hostility === 'dead' || !actor.presence) {
        continue;
      }
      const room = this.game.getRoom(actor.presence.roomId);
      expect(
        actor.currentRoomId,
        `Actor ${actor.id} should keep currentRoomId with Presence.`,
      ).toBe(actor.presence.roomId);
      expect(isInsideRoom(room, actor.presence.position), this.describeActor(actor)).toBe(true);
      const tile = room.layout[actor.presence.position.y]?.[actor.presence.position.x];
      expect(isSolidTile(tile), `Actor ${actor.id} is on solid tile "${tile}".`).toBe(false);
      if (!actor.presence.materialized) {
        continue;
      }
      const key = `${actor.presence.roomId}:${actor.presence.position.x},${actor.presence.position.y}`;
      const previous = occupied.get(key);
      expect(previous, `Actors ${previous} and ${actor.id} overlap at ${key}.`).toBeUndefined();
      occupied.set(key, actor.id);
    }
  }

  private assertLayerRuntimeConsistent(): void {
    const currentRoom = this.currentRoom();
    const activeLayer = this.game.getFlag<{
      layerId?: string;
      parentRoomId?: string;
      entranceId?: string;
      returnPosition?: { x: number; y: number };
    }>('layers.active');
    if (currentRoom.layer) {
      expect(activeLayer, `Layer room ${currentRoom.id} requires layers.active.`).toBeDefined();
      expect(activeLayer?.layerId, `Active layer should match ${currentRoom.id}.`).toBe(
        currentRoom.id,
      );
      expect(activeLayer?.parentRoomId, `Active parent should match ${currentRoom.id}.`).toBe(
        currentRoom.layer.parentRoomId,
      );
      expect(
        activeLayer?.entranceId,
        `Active entrance should exist for ${currentRoom.id}.`,
      ).toBeDefined();
      expect(
        activeLayer?.returnPosition,
        `Active return position should exist for ${currentRoom.id}.`,
      ).toBeDefined();
      return;
    }
    expect(
      activeLayer,
      `Coordinate room ${currentRoom.id} must not keep stale layers.active.`,
    ).toBeUndefined();
  }

  private describeTimeout(timeoutMs: number): string {
    return [
      `Headless scenario timed out after ${timeoutMs}ms simulated time.`,
      this.describeWorld(),
      `Recent events: ${this.recentEvents.slice(-8).join(' | ') || 'none'}`,
    ].join('\n');
  }

  private describeWorld(): string {
    const diagnostics = this.diagnostics();
    const actors = this.game
      .getActorSystem()
      .registry.getAll()
      .slice(0, 10)
      .map((actor) => this.describeActor(actor))
      .join('\n');
    return `World: ${JSON.stringify(diagnostics)}\nActors:\n${actors || 'none'}`;
  }

  private describeActor(actor: Actor): string {
    return `${actor.id} ${actor.displayName} room=${actor.presence?.roomId ?? actor.currentRoomId ?? 'none'} pos=${actor.presence ? `${actor.presence.position.x},${actor.presence.position.y}` : 'none'} goal=${actor.goal?.kind ?? 'none'} activity=${actor.activity?.kind ?? 'none'}`;
  }

  private captureActorTelemetry(): void {
    this.game.getActorSystem().setTelemetrySink((event) => {
      if (
        event.type === 'actor.goal_changed' ||
        event.type === 'actor.presence_changed' ||
        event.type === 'actor.combat_started' ||
        event.type === 'actor.schedule_changed'
      ) {
        this.recentEvents.push(`${event.type}:${event.actorId}:${event.reason}`);
        if (this.recentEvents.length > 32) {
          this.recentEvents.shift();
        }
      }
    });
  }
}

export function createHeadlessScenario(options: HeadlessScenarioOptions): HeadlessScenario {
  return HeadlessScenario.create(options);
}

function mergeConfig(base: GameConfig, overrides: DeepPartial<GameConfig>): GameConfig {
  return mergeObjects(structuredClone(base), overrides) as GameConfig;
}

function mergeObjects(base: unknown, overrides: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(overrides)) {
    return overrides ?? base;
  }
  const next: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    next[key] = mergeObjects(next[key], value);
  }
  return next;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toLocalPosition(
  roomId: string,
  position: { x: number; y: number },
  grid: GameConfig['grid'],
): { x: number; y: number } {
  const address = parseCoordinateRoomId(roomId);
  if (!address) {
    return { ...position };
  }
  return {
    x: position.x - address.x * grid.cols,
    y: position.y - address.y * grid.rows,
  };
}

function isInsideRoom(room: RoomSnapshot, position: { x: number; y: number }): boolean {
  return (
    position.y >= 0 &&
    position.y < room.layout.length &&
    position.x >= 0 &&
    position.x < (room.layout[0]?.length ?? 0)
  );
}
