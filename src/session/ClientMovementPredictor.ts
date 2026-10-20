import type { Vector2Like } from '../core/math.js';
import type { GridConfig } from '../config/gameConfig.js';
import type { GameSnapshot, PlayerSnapshot } from './GameSnapshot.js';
import type { RoomSnapshot } from '../world/types.js';
import { parseCoordinateRoomId } from '../world/roomAddress.js';
import { isManualMovementArea } from '../world/manualMovementPolicy.js';
import { isSolidTile } from '../world/tiles.js';
import {
  queueSnakeDirection,
  finishSnakeDirectionStep,
  type SnakeDirectionQueue,
} from '../systems/snakeDirectionQueue.js';
import {
  MAX_PREDICTED_STEPS,
  MAX_RESUME_INPUTS,
  MOVEMENT_GRACE_MS,
  type MovementReplay,
} from './MovementResume.js';

export interface PredictedSnake {
  body: Vector2Like[];
  roomId: string;
  direction: Vector2Like;
}

/** Presentation only: never holds a game runtime or writes into the scene replica. */
export class ClientMovementPredictor {
  private seed: PlayerSnapshot | null = null;
  private state: PredictedSnake | null = null;
  private queue: SnakeDirectionQueue | null = null;
  private readonly rooms = new Map<string, RoomSnapshot>();
  private epoch: number | undefined;
  private grid: GridConfig | undefined;
  private startedAt: number | null = null;
  private lastAt = 0;
  private accumulator = 0;
  private steps = 0;
  private inputs: MovementReplay['inputs'] = [];
  private connectionId = '';
  private liveInputs: MovementReplay['inputs'] = [];
  private stopped = false;
  private submitted = false;
  private correction: { body: Vector2Like[]; roomId: string; startedAt: number } | null = null;
  private connected = false;
  private seedAt = 0;
  private clockOffset: number | null = null;

  seedFrom(
    snapshot: GameSnapshot,
    now = performance.now(),
    connected = false,
    pendingDirections: readonly Vector2Like[] = [],
  ): void {
    const player = snapshot.players[snapshot.localPlayerId];
    const resetClock =
      this.epoch !== snapshot.replication?.epoch ||
      !this.seed?.movementPredictionAllowed ||
      !player?.movementPredictionAllowed ||
      this.seed.movementIntervalMs !== player.movementIntervalMs;
    if (resetClock) this.clockOffset = null;
    if (this.epoch !== snapshot.replication?.epoch) this.rooms.clear();
    this.epoch = snapshot.replication?.epoch;
    for (const room of snapshot.clientState?.worldRooms ?? []) this.rooms.set(room.id, room);
    for (const entry of Object.values(snapshot.viewport.rooms))
      this.rooms.set(entry.id, entry.room);
    this.advance(now);
    const previous = this.state;
    this.correction = null;
    if (
      !connected &&
      previous &&
      player?.alive &&
      player.movementPredictionAllowed &&
      previous.roomId === player.roomId &&
      previous.body.length === player.body.length
    ) {
      const distance = Math.max(
        ...previous.body.map((point, index) =>
          Math.hypot(point.x - player.body[index].x, point.y - player.body[index].y),
        ),
      );
      if (distance > 0 && distance <= 1.5)
        this.correction = { body: previous.body, roomId: player.roomId, startedAt: now };
    }
    this.liveInputs = [];
    if (connected)
      this.liveInputs = pendingDirections.map((direction) => ({
        step: 0,
        direction: { ...direction },
      }));
    this.seed = player ? structuredClone(player) : null;
    this.grid = player?.movementGrid;
    this.state = null;
    this.startedAt = null;
    this.submitted = false;
    this.queue = player?.directionQueue ? structuredClone(player.directionQueue) : null;
    this.connected =
      connected &&
      Boolean(player?.alive && player.movementPredictionAllowed && this.queue && this.grid);
    this.seedAt = now;
    if (this.connected && player) {
      // A stable server-tick anchor keeps the local step clock running through
      // publication jitter. Only bounded latency is projected between snapshots.
      this.clockOffset = Math.max(
        now - snapshot.tick - 250,
        Math.min(this.clockOffset ?? Infinity, now - snapshot.tick),
      );
      const horizon = Math.max(0, now - this.clockOffset - snapshot.tick);
      this.state = this.initializeState(now - horizon);
      for (const direction of pendingDirections) queueSnakeDirection(this.queue!, direction);
      this.advance(now);
      if (
        previous &&
        this.state &&
        previous.roomId === this.state.roomId &&
        previous.body.length === this.state.body.length
      ) {
        const distance = Math.max(
          ...previous.body.map((point, index) =>
            Math.hypot(point.x - this.state!.body[index].x, point.y - this.state!.body[index].y),
          ),
        );
        if (distance > 0 && distance <= 1.5)
          this.correction = { body: previous.body, roomId: this.state.roomId, startedAt: now };
      }
    }
  }

  private initializeState(now: number): PredictedSnake | null {
    if (!this.seed) return null;
    const state = {
      body: structuredClone(this.seed.body),
      roomId: this.seed.roomId,
      direction: { ...this.seed.direction },
    };
    this.lastAt = now;
    this.accumulator = this.seed.movementAccumulatorMs ?? 0;
    this.steps = 0;
    this.inputs = [];
    this.stopped = false;
    return state;
  }

  cancel(): void {
    this.connected = false;
    this.startedAt = null;
    this.state = null;
    this.queue = null;
    this.correction = null;
    this.liveInputs = [];
    this.clockOffset = null;
  }

  begin(connectionId: string, now = performance.now()): void {
    if (
      this.startedAt !== null ||
      !this.seed?.movementPredictionAllowed ||
      !this.queue ||
      !this.grid
    )
      return;
    this.connectionId = connectionId;
    this.advance(now);
    const previous = this.state;
    this.connected = false;
    this.queue = structuredClone(this.seed.directionQueue!);
    this.state = this.initializeState(now);
    for (const input of this.liveInputs) queueSnakeDirection(this.queue, input.direction);
    this.startedAt = now;
    this.lastAt = now;
    this.accumulator = this.seed.movementAccumulatorMs ?? 0;
    this.steps = 0;
    this.inputs = structuredClone(this.liveInputs);
    this.stopped = false;
    this.submitted = false;
    this.correction = null;
    if (
      previous &&
      this.state &&
      previous.roomId === this.state.roomId &&
      previous.body.length === this.state.body.length &&
      previous.body.every(
        (point, index) =>
          Math.hypot(point.x - this.state!.body[index].x, point.y - this.state!.body[index].y) <=
          1.5,
      )
    )
      this.correction = { body: previous.body, roomId: previous.roomId, startedAt: now };
  }

  direction(direction: Vector2Like, now = performance.now()): boolean {
    if (
      !Number.isInteger(direction.x) ||
      !Number.isInteger(direction.y) ||
      Math.abs(direction.x) + Math.abs(direction.y) !== 1 ||
      !this.queue
    )
      return false;
    if (this.connected) {
      this.advance(now);
      if (this.stopped || this.liveInputs.length >= MAX_RESUME_INPUTS) return false;
      const accepted = queueSnakeDirection(this.queue, direction);
      if (accepted) this.liveInputs.push({ step: 0, direction: { ...direction } });
      return accepted;
    }
    if (this.startedAt === null) {
      if (this.liveInputs.length >= MAX_RESUME_INPUTS) return false;
      const accepted = queueSnakeDirection(this.queue, direction);
      if (accepted) this.liveInputs.push({ step: 0, direction: { ...direction } });
      return accepted;
    }
    this.advance(now);
    if (
      now - this.startedAt >= MOVEMENT_GRACE_MS ||
      this.steps >= MAX_PREDICTED_STEPS ||
      this.submitted ||
      this.inputs.length >= MAX_RESUME_INPUTS
    )
      return false;
    if (queueSnakeDirection(this.queue, direction))
      this.inputs.push({ step: this.steps, direction: { ...direction } });
    return true;
  }

  advance(now = performance.now()): void {
    if (
      (!this.connected && this.startedAt === null) ||
      !this.state ||
      !this.queue ||
      !this.grid ||
      this.submitted ||
      this.stopped
    )
      return;
    const startedAt = this.startedAt ?? this.seedAt;
    const end = Math.min(now, startedAt + MOVEMENT_GRACE_MS);
    this.accumulator += Math.max(0, end - this.lastAt);
    this.lastAt = end;
    const interval = this.seed?.movementIntervalMs;
    if (!interval || interval < 20) {
      this.stopped = true;
      return;
    }
    while (this.accumulator >= interval && this.steps < MAX_PREDICTED_STEPS) {
      this.accumulator -= interval;
      if (!this.step()) {
        this.stopped = true;
        break;
      }
      this.steps++;
      if (this.stopped) break;
    }
    if (now - startedAt >= MOVEMENT_GRACE_MS || this.steps >= MAX_PREDICTED_STEPS)
      this.stopped = true;
  }

  private step(): boolean {
    if (!this.state || !this.queue || !this.grid) return false;
    const current = this.rooms.get(this.state.roomId);
    const head = this.state.body[0];
    if (!current || !head || isManualMovementArea(current, head, this.grid)) return false;
    // Special traversal, portals and interior boundary rules stay authority-dependent.
    if (current.cave || current.layer) return false;
    const next = { x: head.x + this.queue.nextDirection.x, y: head.y + this.queue.nextDirection.y };
    const coordinate = parseCoordinateRoomId(this.state.roomId);
    if (!coordinate) return false;
    const roomId = `${Math.floor(next.x / this.grid.cols)},${Math.floor(next.y / this.grid.rows)},${coordinate.z}`;
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const localX = next.x - Math.floor(next.x / this.grid.cols) * this.grid.cols;
    const localY = next.y - Math.floor(next.y / this.grid.rows) * this.grid.rows;
    const tile = room.layout[localY]?.[localX];
    if (
      room.cave ||
      room.layer ||
      room.portals.some((portal) => portal.x === localX && portal.y === localY)
    )
      return false;
    if (!tile || isSolidTile(tile) || tile === '~' || isManualMovementArea(room, next, this.grid))
      return false;
    if (this.state.body.slice(0, -1).some((point) => point.x === next.x && point.y === next.y))
      return false;
    this.queue.direction = { ...this.queue.nextDirection };
    finishSnakeDirectionStep(this.queue);
    this.state.direction = { ...this.queue.direction };
    this.state.body = [next, ...this.state.body.slice(0, -1)];
    if (roomId !== this.state.roomId) this.stopped = true;
    this.state.roomId = roomId;
    return true;
  }

  replay(now = performance.now()): MovementReplay | undefined {
    if (this.startedAt === null || !this.seed) return undefined;
    this.advance(now);
    this.submitted = true;
    return {
      connectionId: this.connectionId,
      baseRevision: this.seed.movementRevision ?? 0,
      steps: this.steps,
      elapsedMs: Math.min(MOVEMENT_GRACE_MS, Math.max(0, now - this.startedAt)),
      inputs: structuredClone(this.inputs),
    };
  }

  presentation(player: PlayerSnapshot, now = performance.now()): PredictedSnake | null {
    if (!player.alive) return null;
    this.advance(now);
    if (this.state && !this.correction) return structuredClone(this.state);
    if (this.correction && this.correction.roomId === player.roomId) {
      const amount = Math.min(1, Math.max(0, (now - this.correction.startedAt) / 120));
      const target = this.state ?? player;
      if (amount < 1)
        return {
          roomId: player.roomId,
          direction: { ...target.direction },
          body: target.body.map((point, index) => ({
            x: this.correction!.body[index].x * (1 - amount) + point.x * amount,
            y: this.correction!.body[index].y * (1 - amount) + point.y * amount,
          })),
        };
      this.correction = null;
    }
    if (this.state) return structuredClone(this.state);
    return null;
  }

  resumePredictionAfterFailedHello(): void {
    this.submitted = false;
  }
  canBufferHandoff(now = performance.now()): boolean {
    return (
      this.startedAt !== null &&
      now - this.startedAt < MOVEMENT_GRACE_MS &&
      this.steps < MAX_PREDICTED_STEPS
    );
  }
  get awaitingAuthority(): boolean {
    return this.submitted;
  }

  get exhausted(): boolean {
    return this.startedAt !== null && this.stopped;
  }
}
