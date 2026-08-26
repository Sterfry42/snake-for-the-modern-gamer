import { defaultGameConfig, type GridConfig, type WorldConfig } from '../config/gameConfig.js';
import { createRng } from '../core/rng.js';
import { RoomGenerator } from './roomGenerator.js';
import type { RoomSnapshot } from './types.js';
import type { WorldGenerationIdentity } from './generation/worldGenerationIdentity.js';
import type { StructureLocatorKind } from './structureLocators.js';

export interface StructureLocatorResult {
  found: boolean;
  structureKind: StructureLocatorKind;
  roomId?: string;
  coordinates?: [number, number, number];
  direction?: 'here' | 'north' | 'south' | 'east' | 'west';
  distance?: number;
  searchedRooms: number;
}

export interface StructureLocatorSearchOptions {
  originRoomId: string;
  structureKind: StructureLocatorKind;
  identity: WorldGenerationIdentity;
  grid?: GridConfig;
  worldConfig?: WorldConfig;
  maxRadius?: number;
}

export function findNearestStructureLocatorTarget(
  options: StructureLocatorSearchOptions,
): StructureLocatorResult {
  const grid = options.grid ?? defaultGameConfig.grid;
  const worldConfig = options.worldConfig ?? defaultGameConfig.world;
  const maxRadius = options.maxRadius ?? 24;
  const [originX, originY, originZ] = parseCoordinateRoomId(options.originRoomId);
  const generator = new RoomGenerator(
    grid,
    worldConfig,
    createRng(`${options.identity.seed}:structure-locator:${options.structureKind}`),
    options.identity,
  );
  let searchedRooms = 0;
  for (let distance = 0; distance <= maxRadius; distance += 1) {
    for (const [x, y, z] of ringCoordinates(originX, originY, originZ, distance)) {
      const roomId = `${x},${y},${z}`;
      searchedRooms += 1;
      const room = generator.generate(roomId, grid);
      if (roomHasStructure(room, options.structureKind)) {
        return {
          found: true,
          structureKind: options.structureKind,
          roomId,
          coordinates: [x, y, z],
          direction: directionFromDelta(x - originX, y - originY),
          distance,
          searchedRooms,
        };
      }
    }
  }
  return {
    found: false,
    structureKind: options.structureKind,
    searchedRooms,
  };
}

function roomHasStructure(room: RoomSnapshot, structureKind: StructureLocatorKind): boolean {
  switch (structureKind) {
    case 'garage':
      return Boolean(room.garage);
    case 'moleman-dig-site':
      return Boolean(room.molemanDigSite);
  }
}

function ringCoordinates(
  originX: number,
  originY: number,
  originZ: number,
  distance: number,
): Array<[number, number, number]> {
  if (distance === 0) {
    return [[originX, originY, originZ]];
  }
  const coords: Array<[number, number, number]> = [];
  for (let dx = -distance; dx <= distance; dx += 1) {
    const dy = distance - Math.abs(dx);
    coords.push([originX + dx, originY + dy, originZ]);
    if (dy !== 0) {
      coords.push([originX + dx, originY - dy, originZ]);
    }
  }
  return coords;
}

function parseCoordinateRoomId(roomId: string): [number, number, number] {
  const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
  return [Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0, Number.isFinite(z) ? z : 0];
}

function directionFromDelta(
  dx: number,
  dy: number,
): NonNullable<StructureLocatorResult['direction']> {
  if (dx === 0 && dy === 0) {
    return 'here';
  }
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'east' : 'west';
  }
  return dy >= 0 ? 'south' : 'north';
}
