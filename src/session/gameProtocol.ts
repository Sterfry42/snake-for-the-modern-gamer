import { isRecord } from '../core/saveNormalize.js';
import type { ClientCommand, CommandResult } from './ClientCommand.js';
import type { GameEvent } from './GameEvent.js';
import type { GameSnapshot } from './GameSnapshot.js';

export const GAME_PROTOCOL_VERSION = 1;

export interface CommandMessage {
  type: 'command';
  id: number;
  command: ClientCommand;
}

export type ServerMessage =
  | {
      type: 'welcome';
      version: number;
      connectionId: string;
      playerId: string;
      snapshot: GameSnapshot;
    }
  | { type: 'snapshot'; snapshot: GameSnapshot }
  | { type: 'event'; event: GameEvent }
  | { type: 'result'; id: number; result: CommandResult };

/** Network clients can submit intentions, never method names or arbitrary flags. */
export function isClientCommand(value: unknown): value is ClientCommand {
  if (!isRecord(value) || typeof value.playerId !== 'string') return false;
  switch (value.type) {
    case 'setDirection':
    case 'forceDirection': {
      const direction = value.direction;
      return (
        isRecord(direction) &&
        typeof direction.x === 'number' &&
        typeof direction.y === 'number' &&
        Math.abs(direction.x) + Math.abs(direction.y) === 1 &&
        Number.isInteger(direction.x) &&
        Number.isInteger(direction.y)
      );
    }
    case 'useItem':
      return typeof value.itemId === 'string' && value.itemId.length <= 128;
    case 'chooseOption':
      return typeof value.choiceId === 'string' && value.choiceId.length <= 256;
    case 'saveGame':
    case 'loadGame':
      // Creation choices are server state. Do not accept client-supplied modifiers.
      return (
        value.religionChoice === undefined &&
        value.classChoice === undefined &&
        value.backgroundChoice === undefined
      );
    case 'interact':
    case 'restartRun':
    case 'pause':
    case 'resume':
    case 'clearSave':
      return true;
    default:
      return false;
  }
}

export function parseCommandMessage(raw: string): CommandMessage | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.type !== 'command' ||
      typeof value.id !== 'number' ||
      !Number.isSafeInteger(value.id) ||
      value.id < 1 ||
      !isClientCommand(value.command)
    )
      return null;
    return { type: 'command', id: value.id, command: value.command };
  } catch {
    return null;
  }
}

/** The server is trusted; validate envelope shape before dispatching its payload. */
export function parseServerMessage(raw: string): ServerMessage {
  const value: unknown = JSON.parse(raw);
  if (!isServerMessage(value)) throw new Error('Invalid game server message');
  return value;
}

function isServerMessage(value: unknown): value is ServerMessage {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case 'welcome':
      return (
        value.version === GAME_PROTOCOL_VERSION &&
        typeof value.connectionId === 'string' &&
        typeof value.playerId === 'string' &&
        isSnapshot(value.snapshot)
      );
    case 'snapshot':
      return isSnapshot(value.snapshot);
    case 'event':
      return isRecord(value.event) && typeof value.event.type === 'string';
    case 'result':
      return (
        typeof value.id === 'number' &&
        isRecord(value.result) &&
        typeof value.result.ok === 'boolean'
      );
    default:
      return false;
  }
}

export function copyGameSnapshot(snapshot: GameSnapshot): GameSnapshot {
  // RoomSnapshotCache exposes proxies, which structuredClone cannot copy.
  const value: unknown = JSON.parse(JSON.stringify(snapshot));
  if (!isSnapshot(value)) throw new Error('Invalid game snapshot');
  return value;
}

function isSnapshot(value: unknown): value is GameSnapshot {
  return (
    isRecord(value) &&
    typeof value.tick === 'number' &&
    typeof value.localPlayerId === 'string' &&
    isRecord(value.players) &&
    isRecord(value.ui) &&
    isRecord(value.viewport) &&
    isRecord(value.viewport.rooms) &&
    typeof value.viewport.centerRoomId === 'string'
  );
}
