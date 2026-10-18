import { isRecord } from '../core/saveNormalize.js';
import type { ClientCommand, CommandResult } from './ClientCommand.js';
import type { GameEvent } from './GameEvent.js';
import type { GameSnapshot } from './GameSnapshot.js';
import { SPECIAL_STAT_IDS } from '../stats/specialTypes.js';
import { EQUIPMENT_SLOTS } from '../inventory/item.js';

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
    case 'playerInteraction':
      return (
        typeof value.mode === 'string' &&
        ['playing', 'manual', 'inventory', 'special', 'dialogue', 'shop', 'paused'].includes(
          value.mode,
        )
      );
    case 'purchase':
      return validIdentifier(value.actorId) && validIdentifier(value.offerId);
    case 'relationshipAction':
      return (
        validIdentifier(value.actorId) &&
        typeof value.choice === 'string' &&
        RELATIONSHIP_CHOICES.has(value.choice)
      );
    case 'questAction':
      return value.action === 'track' && (value.questId === null || validIdentifier(value.questId));
    case 'specialAction':
      return (
        value.action === 'apply' ||
        value.action === 'reset' ||
        (value.action === 'preview' &&
          SPECIAL_STAT_IDS.some((id) => id === value.statId) &&
          (value.delta === -1 || value.delta === 1))
      );
    case 'construction':
      switch (value.action) {
        case 'begin':
          return validIdentifier(value.blueprintId);
        case 'demolish':
          return validIdentifier(value.structureId);
        case 'step':
        case 'face':
          return isCardinalDirection(value.direction);
        case 'claim':
        case 'confirm':
        case 'cancel':
          return true;
        default:
          return false;
      }
    case 'vehicleAction':
      return (
        value.action === 'buyGarageCar' ||
        value.action === 'exit' ||
        (value.action === 'enter' && validIdentifier(value.carId)) ||
        (value.action === 'input' &&
          [-1, 0, 1].some((entry) => entry === value.throttle) &&
          [-1, 0, 1].some((entry) => entry === value.steering))
      );
    case 'debugAction':
      return value.action === 'cycleWeather';
    case 'manualStep':
    case 'manualReturn':
      return true;
    case 'companionAction':
      return (
        (value.action === 'feed' || value.action === 'release') &&
        validIdentifier(value.companionId)
      );
    case 'minigameAction':
      return value.action === 'start'
        ? value.kind === 'fishing' || value.kind === 'baseball'
        : value.action === 'pull'
          ? [-1, 0, 1].some((direction) => direction === value.direction)
          : value.action === 'swing' || value.action === 'abort';
    case 'inventoryAction':
      if (value.action === 'cook') return validIdentifier(value.recipeId);
      return value.action === 'equip'
        ? validIdentifier(value.itemId)
        : value.action === 'unequip' && EQUIPMENT_SLOTS.some((slot) => slot === value.slot);
    case 'progressionAction':
      if (value.action === 'usePrimary') return true;
      if (value.action === 'bind') return validIdentifier(value.abilityId);
      return value.action === 'purchase'
        ? validIdentifier(value.perkId)
        : value.action === 'cast' && validIdentifier(value.spellId);
    case 'combatAction':
      return (
        (value.action === 'fire' || value.action === 'bomb') && isCardinalDirection(value.direction)
      );
    case 'maneuverAction':
      return value.action === 'equip'
        ? validIdentifier(value.id)
        : value.action === 'activate'
          ? value.direction === undefined || isCardinalDirection(value.direction)
          : value.action === 'digest';
    case 'openActor':
      return (
        typeof value.actorId === 'string' && value.actorId.length > 0 && value.actorId.length <= 256
      );
    case 'selectInteraction':
      return (
        Number.isSafeInteger(value.menuId) &&
        typeof value.menuId === 'number' &&
        value.menuId > 0 &&
        typeof value.optionId === 'string' &&
        value.optionId.length > 0 &&
        value.optionId.length <= 256
      );
    case 'closeInteraction':
      return (
        typeof value.menuId === 'number' && Number.isSafeInteger(value.menuId) && value.menuId > 0
      );
    case 'talkToActor':
      return typeof value.actorId === 'string' && value.actorId.length <= 256;
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

const RELATIONSHIP_CHOICES = new Set([
  'talk',
  'flirt',
  'ask-out',
  'date',
  'apologize',
  'boundary',
  'mean',
  'break-up',
  'propose',
  'family',
  'discuss-arrangement',
  'divorce',
  'reassure',
  'explain',
  'plead',
  'fight',
  'run',
  'child-hug',
  'child-catch',
]);

function validIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 256;
}

function isCardinalDirection(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    Number.isInteger(value.x) &&
    Number.isInteger(value.y) &&
    Math.abs(value.x) + Math.abs(value.y) === 1
  );
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
