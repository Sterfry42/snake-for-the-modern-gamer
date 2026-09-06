import type { GridConfig, WorldConfig } from '../config/gameConfig.js';
import { createRng } from '../core/rng.js';
import { RoomGenerator } from './roomGenerator.js';
import type { StructureLocatorKind } from './structureLocators.js';
import type { RoomSnapshot } from './types.js';
import type { WorldGenerationIdentity } from './generation/worldGenerationIdentity.js';

export interface StructureLocatorSearchInput {
  originRoomId: string;
  structureKind: StructureLocatorKind;
  identity: WorldGenerationIdentity;
  grid: GridConfig;
  worldConfig: WorldConfig;
  maxRadius: number;
}

export interface StructureLocatorSearchResult {
  found: boolean;
  structureKind: StructureLocatorKind;
  searchedRooms: number;
  distance?: number;
  direction?: 'here' | 'north' | 'south' | 'east' | 'west';
  coordinates?: [number, number, number];
  roomId?: string;
  structureId?: string;
  structureName?: string;
}

export function findNearestStructureLocatorTarget(
  input: StructureLocatorSearchInput,
): StructureLocatorSearchResult {
  const origin = parseRoomCoordinates(input.originRoomId);
  const generator = new RoomGenerator(
    input.grid,
    input.worldConfig,
    createRng(input.identity.seed),
    input.identity,
  );
  let searchedRooms = 0;

  for (let radius = 0; radius <= Math.max(0, input.maxRadius); radius += 1) {
    for (const coordinates of coordinatesAtRadius(origin, radius)) {
      searchedRooms += 1;
      const roomId = formatRoomCoordinates(coordinates);
      const room = generator.generate(roomId, input.grid);
      const target = structureTargetForRoom(room, input.structureKind);
      if (target) {
        const distance = roomDistance(origin, coordinates);
        return {
          found: true,
          structureKind: input.structureKind,
          searchedRooms,
          distance,
          direction: directionFromDelta(coordinates[0] - origin[0], coordinates[1] - origin[1]),
          coordinates,
          roomId,
          structureId: target.id,
          structureName: target.name,
        };
      }
    }
  }

  return {
    found: false,
    structureKind: input.structureKind,
    searchedRooms,
  };
}

function structureTargetForRoom(
  room: RoomSnapshot,
  structureKind: StructureLocatorKind,
): { id: string; name: string } | undefined {
  switch (structureKind) {
    case 'garage':
      return room.garage ? { id: room.garage.id, name: room.garage.name } : undefined;
    case 'moleman-dig-site':
      return room.molemanDigSite
        ? { id: room.molemanDigSite.id, name: room.molemanDigSite.name }
        : undefined;
  }
}

function* coordinatesAtRadius(
  origin: [number, number, number],
  radius: number,
): Generator<[number, number, number]> {
  if (radius === 0) {
    yield origin;
    return;
  }

  for (let dx = -radius; dx <= radius; dx += 1) {
    const dy = radius - Math.abs(dx);
    yield [origin[0] + dx, origin[1] - dy, origin[2]];
    if (dy !== 0) {
      yield [origin[0] + dx, origin[1] + dy, origin[2]];
    }
  }
}

function parseRoomCoordinates(roomId: string): [number, number, number] {
  const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
  return [x, y, z];
}

function formatRoomCoordinates([x, y, z]: [number, number, number]): string {
  return `${x},${y},${z}`;
}

function roomDistance(
  [originX, originY, originZ]: [number, number, number],
  [x, y, z]: [number, number, number],
): number {
  return Math.abs(x - originX) + Math.abs(y - originY) + Math.abs(z - originZ);
}

function directionFromDelta(dx: number, dy: number): 'here' | 'north' | 'south' | 'east' | 'west' {
  if (dx === 0 && dy === 0) {
    return 'here';
  }
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'east' : 'west';
  }
  return dy >= 0 ? 'south' : 'north';
}
