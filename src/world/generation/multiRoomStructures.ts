import type { BiomeId } from '../biomes.js';
import type { RoomCoordinate } from '../roomAddress.js';

export type StructureRoomRole = 'inside' | 'adjacent' | 'approach';

export { formatRoomId, parseRoomId, type RoomCoordinate } from '../roomAddress.js';

export interface MultiRoomStructurePlacement {
  id: string;
  kind: 'humanTown';
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
