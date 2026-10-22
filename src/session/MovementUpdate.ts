import type { GameSnapshot, PlayerSnapshot } from './GameSnapshot.js';
import { isRecord } from '../core/saveNormalize.js';
import type { Vector2Like } from '../core/math.js';

/** Authority-only grid state. No inventory, room geometry or client-claimed positions. */
export type MovementPlayer = Pick<
  PlayerSnapshot,
  | 'id'
  | 'body'
  | 'roomId'
  | 'direction'
  | 'alive'
  | 'score'
  | 'activity'
  | 'movementRevision'
  | 'movementIntervalMs'
  | 'movementAccumulatorMs'
  | 'acknowledgedDirectionSequence'
  | 'directionQueue'
  | 'movementPredictionAllowed'
  | 'movementGrid'
>;
export interface MovementUpdate {
  epoch: number;
  sequence: number;
  tick: number;
  player: MovementPlayer;
}

export function applyMovementUpdate(snapshot: GameSnapshot, update: MovementUpdate): GameSnapshot {
  if (snapshot.replication?.epoch !== update.epoch || !snapshot.players[update.player.id])
    return snapshot;
  const previous = snapshot.players[update.player.id];
  if ((previous.movementRevision ?? 0) > (update.player.movementRevision ?? 0)) return snapshot;
  const player: MovementPlayer = { ...update.player };
  if (!previous.isLocal) {
    delete player.movementGrid;
    delete player.movementPredictionAllowed;
    delete player.acknowledgedDirectionSequence;
  }
  return {
    ...snapshot,
    players: {
      ...snapshot.players,
      [previous.id]: {
        ...previous,
        ...player,
        alive: previous.isLocal
          ? update.player.alive
          : update.player.alive && update.player.activity === 'playing',
      },
    },
  };
}

export function isMovementUpdate(value: unknown): value is MovementUpdate {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.epoch) ||
    !Number.isSafeInteger(value.sequence) ||
    typeof value.tick !== 'number' ||
    !Number.isFinite(value.tick) ||
    !isRecord(value.player)
  )
    return false;
  const player = value.player;
  const vector = (point: unknown): point is Vector2Like =>
    isRecord(point) && Number.isSafeInteger(point.x) && Number.isSafeInteger(point.y);
  const cardinal = (point: unknown) => vector(point) && Math.abs(point.x) + Math.abs(point.y) === 1;
  const queue = player.directionQueue;
  const grid = player.movementGrid;
  return (
    Number(value.sequence) > 0 &&
    Number(value.epoch) >= 0 &&
    value.tick >= 0 &&
    typeof player.id === 'string' &&
    typeof player.roomId === 'string' &&
    Array.isArray(player.body) &&
    player.body.length > 0 &&
    player.body.every(vector) &&
    cardinal(player.direction) &&
    (queue === undefined ||
      (isRecord(queue) &&
        cardinal(queue.direction) &&
        cardinal(queue.nextDirection) &&
        (queue.bufferedDirection === null || cardinal(queue.bufferedDirection)))) &&
    (grid === undefined ||
      (isRecord(grid) &&
        Number.isSafeInteger(grid.cols) &&
        Number(grid.cols) > 0 &&
        Number.isSafeInteger(grid.rows) &&
        Number(grid.rows) > 0 &&
        typeof grid.cell === 'number' &&
        Number.isFinite(grid.cell) &&
        grid.cell > 0)) &&
    (player.acknowledgedDirectionSequence === undefined ||
      (Number.isSafeInteger(player.acknowledgedDirectionSequence) &&
        Number(player.acknowledgedDirectionSequence) >= 0)) &&
    (player.movementPredictionAllowed === undefined ||
      typeof player.movementPredictionAllowed === 'boolean') &&
    ['playing', 'creating-character', 'death-encounter'].includes(String(player.activity)) &&
    typeof player.alive === 'boolean' &&
    typeof player.score === 'number' &&
    Number.isFinite(player.score) &&
    Number.isSafeInteger(player.movementRevision) &&
    Number(player.movementRevision) >= 0 &&
    typeof player.movementIntervalMs === 'number' &&
    Number.isFinite(player.movementIntervalMs) &&
    player.movementIntervalMs >= 20 &&
    typeof player.movementAccumulatorMs === 'number' &&
    Number.isFinite(player.movementAccumulatorMs) &&
    player.movementAccumulatorMs >= 0
  );
}
