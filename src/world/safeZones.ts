import type { Vector2Like } from '../core/math.js';
import { tileHasTag } from './tiles.js';
import type { RoomSnapshot } from './types.js';

const HOME_ROOM_ID = '0,-1,0';

interface SafeZoneRules {
  steerAwayFromWalls: boolean;
  phaseThroughWalls: boolean;
}

interface SpawnPolicy {
  apples: 'allow' | 'suppress' | 'clearExisting';
  enemies: 'allow' | 'suppress';
  animals: 'allow' | 'suppress';
  bosses: 'allow' | 'suppress';
  powerups: 'allow' | 'suppress';
  treasure: 'allow' | 'suppress';
}

interface ZoneRules {
  collision: SafeZoneRules | null;
  spawning: SpawnPolicy;
}

const STANDARD_SAFE_ZONE_RULES: SafeZoneRules = {
  steerAwayFromWalls: true,
  phaseThroughWalls: true,
};

const ALLOW_SPAWNS: SpawnPolicy = {
  apples: 'allow',
  enemies: 'allow',
  animals: 'allow',
  bosses: 'allow',
  powerups: 'allow',
  treasure: 'allow',
};

const SAFE_SETTLEMENT_SPAWNS: SpawnPolicy = {
  apples: 'clearExisting',
  enemies: 'suppress',
  animals: 'suppress',
  bosses: 'suppress',
  powerups: 'suppress',
  treasure: 'suppress',
};

const TOWN_PERIMETER_SPAWNS: SpawnPolicy = {
  ...ALLOW_SPAWNS,
  enemies: 'suppress',
  animals: 'suppress',
  bosses: 'suppress',
};

function getZoneRules(room: RoomSnapshot, localPosition?: Vector2Like): ZoneRules {
  if (room.id === HOME_ROOM_ID) {
    return {
      collision: STANDARD_SAFE_ZONE_RULES,
      spawning: { ...SAFE_SETTLEMENT_SPAWNS, apples: 'suppress' },
    };
  }
  if (room.town || room.layer?.kind === 'townInterior') {
    return { collision: STANDARD_SAFE_ZONE_RULES, spawning: SAFE_SETTLEMENT_SPAWNS };
  }
  if (room.village) {
    return { collision: STANDARD_SAFE_ZONE_RULES, spawning: SAFE_SETTLEMENT_SPAWNS };
  }
  if (room.townPerimeter) {
    return { collision: null, spawning: TOWN_PERIMETER_SPAWNS };
  }
  return {
    collision:
      localPosition && isSafeZoneTile(room.layout[localPosition.y]?.[localPosition.x])
        ? STANDARD_SAFE_ZONE_RULES
        : null,
    spawning: ALLOW_SPAWNS,
  };
}

export function getSpawnPolicy(room: RoomSnapshot): SpawnPolicy {
  return getZoneRules(room).spawning;
}

export function getSafeZoneRules(
  room: RoomSnapshot,
  localPosition?: Vector2Like,
): SafeZoneRules | null {
  return getZoneRules(room, localPosition).collision;
}

function isSafeZoneTile(tile?: string): boolean {
  return tileHasTag(tile, 'safe');
}
