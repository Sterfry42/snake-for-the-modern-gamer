import type { BiomeId } from '../biomes.js';

export type MultiRoomStructureKind = 'humanTown' | 'futureDungeon' | 'futureCastle' | 'futureRuin';

export type StructureRoomRole = 'inside' | 'adjacent' | 'approach';

export interface RoomCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface MultiRoomStructurePlacement {
  id: string;
  kind: MultiRoomStructureKind;
  anchor: RoomCoordinate;
  seed: number;
  townBiomeId?: BiomeId;
  bounds: {
    left: number;
    top: number;
    width: number;
    height: number;
    z: number;
  };
}

export interface StructureRoomMembership {
  placement: MultiRoomStructurePlacement;
  role: StructureRoomRole;
  roomId: string;
}

export type TownPhysicalDistrictKind =
  | 'townCenter'
  | 'outskirts'
  | 'gate'
  | 'square'
  | 'marketStreet'
  | 'tavernInterior'
  | 'residentialStreet'
  | 'backAlley'
  | 'townExit';

export interface TownRoomMembership extends StructureRoomMembership {
  district?: TownPhysicalDistrictKind;
  adjacentSideFacingTown?: 'north' | 'south' | 'east' | 'west';
  adjacentSidesFacingTown?: Array<'north' | 'south' | 'east' | 'west'>;
  adjacentCornersFacingTown?: Array<'northWest' | 'northEast' | 'southWest' | 'southEast'>;
  isEntranceApproach?: boolean;
  isExitApproach?: boolean;
}

export function parseRoomId(roomId: string): RoomCoordinate {
  const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
  return { x, y, z };
}

export function formatRoomId(coord: RoomCoordinate): string {
  return `${coord.x},${coord.y},${coord.z}`;
}
