import { isRecord } from '../core/saveNormalize.js';
import type { GameSaveData } from '../game/saveTypes.js';
import type { HostedCheckpoint, PlayerCheckpoint } from '../players/playerCheckpoint.js';
import type { PlayerLifecycle } from '../players/playerLifecycle.js';
import { SPECIAL_STAT_IDS } from '../stats/specialTypes.js';

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const vector = (value: unknown): boolean => isRecord(value) && finite(value.x) && finite(value.y);
const cardinal = (value: unknown): boolean =>
  isRecord(value) &&
  finite(value.x) &&
  finite(value.y) &&
  Number.isInteger(value.x) &&
  Number.isInteger(value.y) &&
  Math.abs(value.x) + Math.abs(value.y) === 1;
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

function isLifecycle(value: unknown): value is PlayerLifecycle | undefined {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  if (value.kind === 'active') return true;
  const offers = value.offers;
  if (value.kind === 'creating')
    return (
      ['faith', 'background', 'class'].includes(String(value.stage)) &&
      isRecord(value.selections) &&
      isRecord(offers) &&
      ['faith', 'background', 'class'].every((stage) => strings(offers[stage]))
    );
  if (value.kind !== 'death' || !isRecord(value.encounter)) return false;
  const encounter = value.encounter;
  return (
    typeof encounter.id === 'string' &&
    finite(encounter.revision) &&
    encounter.revision > 0 &&
    ['death-presentation', 'afterlife-choice', 'awaiting-respawn'].includes(
      String(encounter.phase),
    ) &&
    ['angel', 'afterlife', 'ledger'].includes(String(encounter.stage)) &&
    typeof encounter.reason === 'string' &&
    typeof encounter.terminal === 'boolean' &&
    ['angel', 'goblin-angel'].includes(String(encounter.rescuer)) &&
    finite(encounter.taunts) &&
    strings(encounter.availableChoices) &&
    encounter.availableChoices.every((choice) =>
      ['return', 'continue', 'taunt', 'romance', 'complain'].includes(choice),
    )
  );
}

function isPlayer(value: unknown): value is PlayerCheckpoint {
  if (
    !isRecord(value) ||
    !isRecord(value.directionQueue) ||
    !isRecord(value.special) ||
    !isRecord(value.special.stats) ||
    !isRecord(value.level)
  )
    return false;
  const stats = value.special.stats;
  return (
    typeof value.id === 'string' &&
    value.id.length <= 256 &&
    typeof value.name === 'string' &&
    typeof value.alive === 'boolean' &&
    typeof value.roomId === 'string' &&
    Array.isArray(value.body) &&
    value.body.length > 0 &&
    value.body.every(vector) &&
    cardinal(value.directionQueue.direction) &&
    cardinal(value.directionQueue.nextDirection) &&
    (value.directionQueue.bufferedDirection === null ||
      cardinal(value.directionQueue.bufferedDirection)) &&
    finite(value.score) &&
    isRecord(value.flags) &&
    isRecord(value.inventory) &&
    Object.values(value.inventory).every((count) => finite(count) && count >= 0) &&
    isRecord(value.equipment) &&
    Object.values(value.equipment).every((id) => typeof id === 'string') &&
    strings(value.activeQuests) &&
    strings(value.completedQuests) &&
    strings(value.acceptedQuests) &&
    strings(value.visitedRooms) &&
    value.special.version === 1 &&
    SPECIAL_STAT_IDS.every((stat) => finite(stats[stat])) &&
    finite(value.special.unspentPoints) &&
    value.level.version === 1 &&
    finite(value.level.level) &&
    finite(value.level.lifetimeScore) &&
    isLifecycle(value.lifecycle)
  );
}

function isHosted(value: unknown): value is HostedCheckpoint {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.primaryClaimed !== 'boolean' ||
    !Array.isArray(value.players) ||
    !value.players.every(isPlayer) ||
    !isRecord(value.resumeDigests) ||
    !Array.isArray(value.rooms)
  )
    return false;
  const ids = new Set(value.players.map((player) => player.id));
  return (
    ids.size === value.players.length &&
    Object.entries(value.resumeDigests).every(
      ([digest, id]) => /^[0-9a-f]{64}$/.test(digest) && typeof id === 'string' && ids.has(id),
    ) &&
    value.rooms.every(
      (room) =>
        isRecord(room) &&
        typeof room.id === 'string' &&
        strings(room.layout) &&
        room.layout.length > 0 &&
        Array.isArray(room.portals),
    )
  );
}

/** Legacy world checkpoints migrate by having no hosted section. Unknown schemas fail closed. */
export function isGameCheckpoint(value: unknown): value is GameSaveData {
  return (
    isRecord(value) &&
    typeof value.version === 'string' &&
    finite(value.timestamp) &&
    finite(value.score) &&
    isRecord(value.inventory) &&
    Object.values(value.inventory).every(finite) &&
    isRecord(value.equipment) &&
    Object.values(value.equipment).every((item) => typeof item === 'string') &&
    isRecord(value.flags) &&
    (value.hosted === undefined || isHosted(value.hosted))
  );
}

export function copyGameCheckpoint(data: GameSaveData): GameSaveData {
  // Room caches expose proxies; one checkpoint-boundary JSON copy detaches them.
  const parsed: unknown = JSON.parse(JSON.stringify(data));
  if (!isGameCheckpoint(parsed)) throw new Error('Invalid or unsupported game checkpoint');
  return parsed;
}
