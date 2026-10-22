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
  MAX_CONNECTED_MOVEMENT_LEAD_MS,
  type MovementReplay,
} from './MovementResume.js';

export interface PredictedSnake {
  body: Vector2Like[];
  roomId: string;
  direction: Vector2Like;
}

type BufferedInput = { revision: number; direction: Vector2Like; sequence?: number };
const sameBody = (a: PredictedSnake, b: PredictedSnake) =>
  a.roomId === b.roomId &&
  a.body.length === b.body.length &&
  a.body.every((point, i) => point.x === b.body[i].x && point.y === b.body[i].y);

/** Discrete presentation only. Authority is the sole writer of gameplay outcomes. */
export class ClientMovementPredictor {
  private seed: PlayerSnapshot | null = null;
  private state: PredictedSnake | null = null;
  private queue: SnakeDirectionQueue | null = null;
  private readonly rooms = new Map<string, RoomSnapshot>();
  private readonly history = new Map<number, PredictedSnake>();
  private epoch: number | undefined;
  private grid: GridConfig | undefined;
  private startedAt: number | null = null;
  private lastAt = 0;
  private accumulator = 0;
  private steps = 0;
  private connectionId = '';
  private liveInputs: BufferedInput[] = [];
  private readonly appliedInputs = new Set<BufferedInput>();
  private stopped = false;
  private submitted = false;
  private connected = false;
  private seedAt = 0;
  private clockOffset: number | null = null;

  seedFrom(
    snapshot: GameSnapshot,
    now = performance.now(),
    connected = false,
    pendingDirections: readonly Vector2Like[] = [],
  ): void {
    if (this.epoch !== snapshot.replication?.epoch) this.rooms.clear();
    for (const room of snapshot.clientState?.worldRooms ?? []) this.rooms.set(room.id, room);
    for (const entry of Object.values(snapshot.viewport.rooms))
      this.rooms.set(entry.id, entry.room);
    this.accept(
      snapshot.players[snapshot.localPlayerId],
      snapshot.replication?.epoch,
      snapshot.tick,
      now,
      connected,
      pendingDirections,
    );
  }

  accept(
    player: PlayerSnapshot | undefined,
    epoch: number | undefined,
    tick: number,
    now = performance.now(),
    connected = true,
    pendingDirections: readonly Vector2Like[] = [],
  ): void {
    this.advance(now);
    const base = player?.movementRevision ?? 0;
    const oldRevision = (this.seed?.movementRevision ?? 0) + this.steps;
    const previousPhase = this.accumulator;
    const continuous =
      (this.connected || this.startedAt !== null) &&
      connected &&
      this.epoch === epoch &&
      this.seed?.movementIntervalMs === player?.movementIntervalMs &&
      Boolean(player && this.history.get(base) && sameBody(this.history.get(base)!, player));
    const resetClock =
      this.epoch !== epoch ||
      !this.seed?.movementPredictionAllowed ||
      !player?.movementPredictionAllowed ||
      this.seed.movementIntervalMs !== player.movementIntervalMs;
    if (resetClock) this.clockOffset = null;
    if (this.epoch !== epoch) {
      this.history.clear();
      this.liveInputs = [];
    }
    this.epoch = epoch;
    const acknowledged = player?.acknowledgedDirectionSequence ?? 0;
    this.liveInputs = this.liveInputs.filter((input) =>
      input.sequence === undefined ? input.revision >= base : input.sequence > acknowledged,
    );
    this.appliedInputs.clear();
    if (pendingDirections.length)
      this.liveInputs = pendingDirections.map((direction) => ({
        revision: base,
        direction: { ...direction },
      }));
    this.seed = player ? { ...player, body: player.body.map((point) => ({ ...point })) } : null;
    this.grid = player?.movementGrid;
    this.queue = player?.directionQueue ? structuredClone(player.directionQueue) : null;
    this.startedAt = null;
    this.submitted = false;
    this.connected =
      connected &&
      Boolean(player?.alive && player.movementPredictionAllowed && this.queue && this.grid);
    this.seedAt = now;
    this.state = null;
    this.steps = 0;
    this.stopped = false;
    if (!this.connected || !player || !this.rooms.has(player.roomId)) return;
    this.clockOffset = Math.max(
      now - tick - MAX_CONNECTED_MOVEMENT_LEAD_MS,
      Math.min(this.clockOffset ?? Infinity, now - tick),
    );
    const horizon = Math.max(0, now - this.clockOffset - tick);
    this.state = {
      body: player.body.map((point) => ({ ...point })),
      roomId: player.roomId,
      direction: { ...player.direction },
    };
    this.history.set(base, { ...this.state });
    this.lastAt = now - horizon;
    this.accumulator = player.movementAccumulatorMs ?? 0;
    this.advance(now);
    // A matching authoritative prefix must not rewind an already displayed step
    // just because the slow resync arrived with a different publication phase.
    if (
      continuous &&
      this.state &&
      oldRevision > base + this.steps &&
      oldRevision - base <=
        Math.ceil(MAX_CONNECTED_MOVEMENT_LEAD_MS / (player.movementIntervalMs ?? Infinity)) &&
      !this.stopped
    ) {
      while (base + this.steps < oldRevision && this.steps < MAX_PREDICTED_STEPS) {
        this.applyInputs();
        if (!this.step()) {
          this.stopped = true;
          break;
        }
        this.steps++;
        this.remember();
      }
      this.accumulator = previousPhase;
    }
    this.applyInputs();
  }

  private applyInputs(): void {
    if (!this.queue) return;
    const revision = (this.seed?.movementRevision ?? 0) + this.steps;
    for (const input of this.liveInputs)
      if (
        !this.appliedInputs.has(input) &&
        Math.max(this.seed?.movementRevision ?? 0, input.revision) === revision
      ) {
        queueSnakeDirection(this.queue, input.direction);
        this.appliedInputs.add(input);
      }
  }
  private remember(): void {
    if (this.state)
      this.history.set((this.seed?.movementRevision ?? 0) + this.steps, { ...this.state });
    while (this.history.size > 160) this.history.delete(this.history.keys().next().value!);
  }
  cancel(): void {
    this.connected = false;
    this.startedAt = null;
    this.state = null;
    this.queue = null;
    this.liveInputs = [];
    this.history.clear();
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
    this.advance(now);
    this.connectionId = connectionId;
    if (!this.state) {
      this.state = {
        body: this.seed.body.map((point) => ({ ...point })),
        roomId: this.seed.roomId,
        direction: { ...this.seed.direction },
      };
      this.accumulator = this.seed.movementAccumulatorMs ?? 0;
      this.steps = 0;
      this.stopped = false;
    }
    this.connected = false;
    this.startedAt = now;
    this.lastAt = now;
    this.submitted = false;
  }
  direction(direction: Vector2Like, now = performance.now(), sequence?: number): boolean {
    if (
      !Number.isInteger(direction.x) ||
      !Number.isInteger(direction.y) ||
      Math.abs(direction.x) + Math.abs(direction.y) !== 1 ||
      !this.queue ||
      !this.seed?.movementPredictionAllowed
    )
      return false;
    this.advance(now);
    if (
      this.stopped ||
      this.submitted ||
      this.liveInputs.length >= MAX_RESUME_INPUTS ||
      (this.startedAt !== null &&
        (now - this.startedAt >= MOVEMENT_GRACE_MS || this.steps >= MAX_PREDICTED_STEPS))
    )
      return false;
    const accepted = queueSnakeDirection(this.queue, direction);
    if (accepted) {
      const input = {
        revision: (this.seed?.movementRevision ?? 0) + this.steps,
        direction: { ...direction },
        sequence,
      };
      this.liveInputs.push(input);
      this.appliedInputs.add(input);
    }
    return accepted;
  }
  rejectDirection(sequence: number): void {
    this.liveInputs = this.liveInputs.filter((input) => input.sequence !== sequence);
  }
  discardReplayedInputs(): void {
    if (this.startedAt !== null) {
      this.liveInputs = [];
      this.appliedInputs.clear();
    }
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
    const start = this.startedAt ?? this.seedAt;
    const end = Math.min(now, start + MOVEMENT_GRACE_MS);
    this.accumulator += Math.max(0, end - this.lastAt);
    this.lastAt = end;
    const interval = this.seed?.movementIntervalMs;
    if (!interval || interval < 20) {
      this.stopped = true;
      return;
    }
    while (this.accumulator >= interval && this.steps < MAX_PREDICTED_STEPS) {
      this.applyInputs();
      this.accumulator -= interval;
      if (!this.step()) {
        this.stopped = true;
        break;
      }
      this.steps++;
      this.remember();
      if (this.stopped) break;
    }
    if (now - start >= MOVEMENT_GRACE_MS || this.steps >= MAX_PREDICTED_STEPS) this.stopped = true;
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
      inputs: this.liveInputs.map((input) => ({
        step: Math.max(0, input.revision - (this.seed?.movementRevision ?? 0)),
        direction: { ...input.direction },
      })),
    };
  }
  presentation(player: PlayerSnapshot, now = performance.now()): PredictedSnake | null {
    if (!player.alive) return null;
    this.advance(now);
    return this.state;
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
