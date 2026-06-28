import { createRng } from '../core/rng.js';

export interface SeededQuestRoomCoord {
  x: number;
  y: number;
  z: number;
}

export type SeededQuestTargetKind = 'cult-temple' | 'letter-recipient';

export interface SeededQuestTarget {
  questId: string;
  kind: SeededQuestTargetKind;
  roomId: string;
  coord: SeededQuestRoomCoord;
  displayName: string;
  description: string;
  distanceFromOrigin: number;
  npcName?: string;
  artifactName?: string;
}

const LETTER_FIRST_NAMES = [
  'Mara',
  'Corin',
  'Isolde',
  'Pavel',
  'Nia',
  'Oren',
  'Selka',
  'Tamsin',
  'Voss',
  'Elian',
] as const;

const LETTER_LAST_NAMES = [
  'Wick',
  'Glass',
  'Holloway',
  'Underbranch',
  'Morrow',
  'Farfield',
  'Kettle',
  'Northgate',
  'Ash',
  'Bellweather',
] as const;

const CULT_ARTIFACT_NAMES = [
  'The Knotted Idol',
  'The Serpent Reliquary',
  'The Bell Without a Tongue',
  'The Black Orchard Seed',
  'The Choir-Stone',
  'The Unblinking Coin',
] as const;

export function parseSeededQuestRoomId(roomId: string): SeededQuestRoomCoord {
  const [rawX, rawY, rawZ] = roomId.split(',');
  return {
    x: Number(rawX ?? 0) || 0,
    y: Number(rawY ?? 0) || 0,
    z: Number(rawZ ?? 0) || 0,
  };
}

export function formatSeededQuestRoomId(coord: SeededQuestRoomCoord): string {
  return `${coord.x},${coord.y},${coord.z}`;
}

export function getRuntimeWorldSeed(runtime: {
  worldSeed?: string;
  getFlag?: <T = unknown>(key: string) => T | undefined;
}): string {
  const flagSeed = runtime.getFlag?.<string>('world.seed');
  if (typeof runtime.worldSeed === 'string' && runtime.worldSeed.length > 0) {
    return runtime.worldSeed;
  }
  if (typeof flagSeed === 'string' && flagSeed.length > 0) {
    return flagSeed;
  }
  return 'default-world';
}

export function getRuntimeRoomId(runtime: {
  getCurrentRoomId?: () => string | undefined;
  getCurrentRoom?: () => { id?: string } | undefined;
  getFlag?: <T = unknown>(key: string) => T | undefined;
}): string {
  const explicit = runtime.getCurrentRoomId?.();
  if (explicit) {
    return explicit;
  }
  const room = runtime.getCurrentRoom?.();
  if (room?.id) {
    return room.id;
  }
  const flagged = runtime.getFlag?.<string>('currentRoomId');
  return flagged || '0,0,0';
}

export function resolveLetterDeliveryTarget(
  worldSeed: string,
  originRoomId: string,
  questId = 'letter-for-the-unspawned',
  distance = 30,
): SeededQuestTarget {
  const origin = parseSeededQuestRoomId(originRoomId);
  const rng = createRng(`${worldSeed}:seeded-quest:${questId}:letter:${originRoomId}:${distance}`);
  const offset = pickManhattanRingOffset(distance, rng);
  const coord = {
    x: origin.x + offset.x,
    y: origin.y + offset.y,
    z: origin.z,
  };
  const npcName = `${pick(LETTER_FIRST_NAMES, rng)} ${pick(LETTER_LAST_NAMES, rng)}`;
  const roomId = formatSeededQuestRoomId(coord);
  return {
    questId,
    kind: 'letter-recipient',
    roomId,
    coord,
    displayName: npcName,
    npcName,
    distanceFromOrigin: manhattanDistance(origin, coord),
    description: `Deliver the letter to ${npcName}, ${distance} zones away at ${roomId}.`,
  };
}

export function resolveCultTempleTarget(
  worldSeed: string,
  questId = 'cult-temple-artifact',
  depth = -20,
): SeededQuestTarget {
  const rng = createRng(`${worldSeed}:seeded-quest:${questId}:cult-temple:${depth}`);
  const coord = {
    x: Math.floor(rng() * 41) - 20,
    y: Math.floor(rng() * 41) - 20,
    z: depth,
  };
  const artifactName = pick(CULT_ARTIFACT_NAMES, rng);
  const roomId = formatSeededQuestRoomId(coord);
  return {
    questId,
    kind: 'cult-temple',
    roomId,
    coord,
    displayName: 'Buried Cult Temple',
    artifactName,
    distanceFromOrigin: Math.abs(coord.x) + Math.abs(coord.y) + Math.abs(coord.z),
    description: `Find the cult temple at depth ${depth} in room ${roomId} and recover ${artifactName}.`,
  };
}

function pick<T>(values: readonly T[], rng: () => number): T {
  return values[Math.floor(rng() * values.length)] ?? values[0];
}

function pickManhattanRingOffset(distance: number, rng: () => number): { x: number; y: number } {
  const safeDistance = Math.max(1, Math.floor(distance));
  const absX = Math.floor(rng() * (safeDistance + 1));
  const absY = safeDistance - absX;
  const x = absX === 0 ? 0 : absX * (rng() < 0.5 ? -1 : 1);
  const y = absY === 0 ? 0 : absY * (rng() < 0.5 ? -1 : 1);
  return { x, y };
}

function manhattanDistance(a: SeededQuestRoomCoord, b: SeededQuestRoomCoord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
}
