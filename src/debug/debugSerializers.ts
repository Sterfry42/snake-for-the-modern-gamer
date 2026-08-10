import type { RoomSnapshot } from '../world/types.js';

export interface DebugEntitySnapshot {
  id?: string;
  kind: string;
  x?: number;
  y?: number;
  roomId?: string;
  label?: string;
}

export interface DebugExitSnapshot {
  kind: string;
  x?: number;
  y?: number;
  targetRoomId?: string;
  direction?: string;
}

export interface DebugRoomSnapshot {
  roomId: string;
  seed?: string;
  coordinates?: { x: number; y: number; z?: number };
  biome?: string;
  purpose?: string;
  rewardTier?: string;
  width: number;
  height: number;
  tileLegendVersion: number;
  tiles: string[];
  entities: DebugEntitySnapshot[];
  exits: DebugExitSnapshot[];
  generation?: {
    durationMs?: number;
    attemptCount?: number;
    identity?: Record<string, unknown>;
  };
}

export const DEBUG_ROOM_TILE_LEGEND = {
  version: 1,
  '#': 'wall',
  '.': 'floor',
  S: 'snake or spawn',
  A: 'apple',
  E: 'enemy',
  N: 'NPC',
  D: 'doorway',
  X: 'special exit',
  C: 'chest',
  '?': 'unknown or unclassified entity',
} as const;

export function safeDebugValue(value: unknown): unknown {
  const seen = new WeakSet<object>();
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, nested) => {
        if (typeof nested === 'object' && nested !== null) {
          if (seen.has(nested)) {
            return {
              serializationError: true,
              valueType: 'object',
              stringValue: '[Circular]',
            };
          }
          seen.add(nested);
        }
        if (typeof nested === 'function') {
          return {
            serializationError: true,
            valueType: 'function',
            stringValue: nested.name ? `[Function ${nested.name}]` : '[Function]',
          };
        }
        return nested;
      }),
    );
  } catch (error) {
    return {
      serializationError: true,
      valueType: typeof value,
      stringValue: String(value),
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

export function serializeErrorLike(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    value: safeDebugValue(error),
  };
}

export function serializeRoomSnapshot(
  room: RoomSnapshot,
  options: {
    seed?: string;
    durationMs?: number;
    attemptCount?: number;
    identity?: Record<string, unknown>;
  } = {},
): DebugRoomSnapshot {
  const coordinates = parseDebugRoomCoordinates(room.id);
  const entities: DebugEntitySnapshot[] = [];
  const exits: DebugExitSnapshot[] = [];
  const tiles = room.layout.map((row) => row);

  if (room.apple) {
    entities.push({ kind: 'apple', x: room.apple.x, y: room.apple.y, roomId: room.id });
  }
  if (room.apples) {
    room.apples.forEach((apple, index) => {
      entities.push({
        id: `apple:${index}`,
        kind: 'apple',
        x: apple.x,
        y: apple.y,
        roomId: room.id,
      });
    });
  }
  if (room.treasure) {
    entities.push({ kind: 'treasure', x: room.treasure.x, y: room.treasure.y, roomId: room.id });
  }
  if (room.powerup) {
    entities.push({
      kind: `powerup:${room.powerup.kind}`,
      x: room.powerup.x,
      y: room.powerup.y,
      roomId: room.id,
    });
  }
  for (const portal of room.portals ?? []) {
    exits.push({
      kind: describeDebugPortalKind(room.id, portal.destRoomId),
      x: portal.x,
      y: portal.y,
      targetRoomId: portal.destRoomId,
      direction: describeDebugPortalDirection(room.id, portal.destRoomId),
    });
  }
  for (const entrance of room.caveEntrances ?? []) {
    exits.push({
      kind: 'cave',
      x: entrance.x,
      y: entrance.y,
      targetRoomId: entrance.caveId,
    });
  }
  for (const entrance of room.layerEntrances ?? []) {
    exits.push({
      kind: entrance.kind,
      x: entrance.x,
      y: entrance.y,
      targetRoomId: entrance.layerId,
    });
  }

  return {
    roomId: room.id,
    seed: options.seed,
    coordinates,
    biome: room.biomeId,
    purpose: describeDebugRoomPurpose(room),
    rewardTier: describeDebugRoomRewardTier(room),
    width: room.layout[0]?.length ?? 0,
    height: room.layout.length,
    tileLegendVersion: DEBUG_ROOM_TILE_LEGEND.version,
    tiles,
    entities,
    exits,
    generation:
      options.durationMs !== undefined || options.attemptCount !== undefined || options.identity
        ? {
            durationMs: options.durationMs,
            attemptCount: options.attemptCount,
            identity: options.identity,
          }
        : undefined,
  };
}

export function describeDebugRoomPurpose(room: RoomSnapshot): string {
  if (room.cave) return `cave:${room.cave.templateId}`;
  if (room.layer) return `layer:${room.layer.templateId}`;
  if (room.town) return `town:${room.town.id}`;
  if (room.townPerimeter) return 'town:perimeter';
  if (room.village) return 'village';
  if (room.goblinCamp) return `camp:${room.goblinCamp.id}`;
  if (room.questGiver) return 'quest:giver';
  if (room.snakeMcDonalds) return 'restaurant:snake-mcdonalds';
  if (room.snakeCanes) return 'restaurant:snake-canes';
  if (room.ramenStand) return 'restaurant:ramen-stand';
  if (room.allNiteDiner) return 'restaurant:all-nite-diner';
  if (room.shrine) return 'shrine';
  if (room.koiPond) return 'koi-pond';
  if (room.molemanDigSite) return 'archaeology:dig-site';
  if (room.garage) return 'shop:garage';
  if (room.rollercoasterStation) return 'transit:rollercoaster-station';
  if (room.bulletTrainStation) return 'transit:bullet-train-station';
  if (room.archetypeId) return `archetype:${room.archetypeId}`;
  return 'ordinary-room';
}

export function describeDebugRoomRewardTier(room: RoomSnapshot): string {
  if (room.cave?.lockedReward) return 'locked-room-reward';
  if (room.treasure && room.powerup) return 'treasure-and-powerup';
  if (room.treasure) return room.cave ? 'cave-treasure' : 'treasure';
  if (room.powerup) return `powerup:${room.powerup.kind}`;
  if (room.molemanDigSite) return 'minigame-entry';
  if (room.garage) return 'vehicle-shop';
  if (room.shrine) return 'service';
  if (room.snakeMcDonalds || room.snakeCanes || room.ramenStand || room.allNiteDiner) {
    return 'shop-or-service';
  }
  return 'standard';
}

function describeDebugPortalKind(sourceRoomId: string, targetRoomId: string): string {
  const source = parseDebugRoomCoordinates(sourceRoomId);
  const target = parseDebugRoomCoordinates(targetRoomId);
  if (!source || !target) return 'portal:special';
  const dz = (target.z ?? 0) - (source.z ?? 0);
  const manhattan = Math.abs(target.x - source.x) + Math.abs(target.y - source.y) + Math.abs(dz);
  if (manhattan === 1 && dz === 0) return 'doorway:ordinary-room';
  if (dz !== 0) return 'portal:vertical';
  return 'portal:special';
}

function describeDebugPortalDirection(
  sourceRoomId: string,
  targetRoomId: string,
): string | undefined {
  const source = parseDebugRoomCoordinates(sourceRoomId);
  const target = parseDebugRoomCoordinates(targetRoomId);
  if (!source || !target) return undefined;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dz = (target.z ?? 0) - (source.z ?? 0);
  if (dx === 1 && dy === 0 && dz === 0) return 'east';
  if (dx === -1 && dy === 0 && dz === 0) return 'west';
  if (dy === 1 && dx === 0 && dz === 0) return 'south';
  if (dy === -1 && dx === 0 && dz === 0) return 'north';
  if (dz === 1 && dx === 0 && dy === 0) return 'up';
  if (dz === -1 && dx === 0 && dy === 0) return 'down';
  return 'special';
}

function parseDebugRoomCoordinates(
  roomId: string,
): { x: number; y: number; z?: number } | undefined {
  const parts = roomId.split(',').map(Number);
  if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) {
    return undefined;
  }
  return { x: parts[0]!, y: parts[1]!, z: parts[2] };
}
