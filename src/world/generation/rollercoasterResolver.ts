import type { GridConfig } from '../../config/gameConfig.js';
import type { WorldGenerationIdentity } from './worldGenerationIdentity.js';
import { parseRoomId, type RoomCoordinate } from './multiRoomStructures.js';
import { positiveMod } from './worldHash.js';

const COASTER_STATION_REGION_SIZE = 16;
const COASTER_STATION_CANDIDATE_ATTEMPTS = 6;
const COASTER_DESTINATION_RADIUS = 12;
const COASTER_DESTINATION_Z_RADIUS = 4;

/** A pre-computed rollercoaster station placement. */
export interface RollercoasterPlacement {
  id: string;
  seed: number;
  roomId: string;
  /** Grid coordinate of the station room. */
  coordinate: RoomCoordinate;
}

/** A pre-computed destination for a coaster station. */
export interface RollercoasterDestinationInfo {
  /** Room ID of the destination room. */
  roomId: string;
  /** Grid coordinate of the destination room. */
  coordinate: RoomCoordinate;
  /** Exit position within the destination room. */
  exitX: number;
  exitY: number;
  /** Weight for random selection. */
  weight: number;
}

/** Resolver that pre-computes rollercoaster station placements and destinations. */
export class RollercoasterStructureResolver {
  private readonly stationPlacements = new Map<string, RollercoasterPlacement>();
  private readonly destinationMap = new Map<string, RollercoasterDestinationInfo[]>();
  private readonly allStationableRooms = new Set<string>();
  private readonly coordsByRoomId = new Map<string, RoomCoordinate>();
  private readonly roomsByRegion = new Map<string, string[]>();
  private version = 0;
  private computedVersion = -1;

  constructor(
    private readonly identity: WorldGenerationIdentity,
    private readonly grid: GridConfig,
  ) {}

  /** Register a room that can have a rollercoaster station. */
  registerStationableRoom(roomId: string): boolean {
    if (this.allStationableRooms.has(roomId)) {
      return false;
    }
    this.allStationableRooms.add(roomId);
    const coord = parseRoomId(roomId);
    const regionKey = this.getRegionKey(coord);
    this.coordsByRoomId.set(roomId, coord);
    const regionRooms = this.roomsByRegion.get(regionKey);
    if (regionRooms) {
      regionRooms.push(roomId);
    } else {
      this.roomsByRegion.set(regionKey, [roomId]);
    }
    this.version += 1;
    return true;
  }

  /** Get all registered stationable room IDs. */
  getStationableRooms(): Set<string> {
    return new Set(this.allStationableRooms);
  }

  hasStationableRoom(roomId: string): boolean {
    return this.allStationableRooms.has(roomId);
  }

  clear(): void {
    this.stationPlacements.clear();
    this.destinationMap.clear();
    this.allStationableRooms.clear();
    this.coordsByRoomId.clear();
    this.roomsByRegion.clear();
    this.version = 0;
    this.computedVersion = -1;
  }

  /** Check if a room has a pre-assigned coaster station. */
  hasStation(roomId: string): boolean {
    return this.stationPlacements.has(roomId);
  }

  /** Get the station placement for a room. */
  getStationPlacement(roomId: string): RollercoasterPlacement | null {
    return this.stationPlacements.get(roomId) ?? null;
  }

  /** Get pre-computed destinations for a station. */
  getDestinations(roomId: string): RollercoasterDestinationInfo[] {
    return this.destinationMap.get(roomId) ?? [];
  }

  /** Pre-compute all station placements and destinations. */
  computePlacements(): boolean {
    if (this.computedVersion === this.version) {
      return false;
    }
    this.stationPlacements.clear();
    this.destinationMap.clear();
    this.computedVersion = this.version;
    if (this.allStationableRooms.size === 0) return false;

    // Determine regions and assign stations
    const regionMap = new Map<string, { x: number; y: number }>();
    for (const coord of this.coordsByRoomId.values()) {
      const regionKey = this.getRegionKey(coord);
      if (!regionMap.has(regionKey)) {
        regionMap.set(regionKey, {
          x: Math.floor(coord.x / COASTER_STATION_REGION_SIZE),
          y: Math.floor(coord.y / COASTER_STATION_REGION_SIZE),
        });
      }
    }

    // Assign one station per region (deterministic)
    let regionIndex = 0;
    for (const [regionKey, region] of regionMap) {
      const placement = this.createRegionPlacement(region.x, region.y, regionKey, regionIndex);
      if (placement) {
        this.stationPlacements.set(placement.roomId, placement);
        regionIndex++;
      }
    }

    // Compute destinations for each station
    for (const placement of this.stationPlacements.values()) {
      const destinations = this.computeDestinations(placement);
      this.destinationMap.set(placement.roomId, destinations);
    }
    return true;
  }

  private createRegionPlacement(
    regionX: number,
    regionY: number,
    regionKey: string,
    index: number,
  ): RollercoasterPlacement | null {
    const seed = positiveMod(hashWorldCoordinate(this.identity.seed, regionKey, index), 1000000);

    for (let attempt = 0; attempt < COASTER_STATION_CANDIDATE_ATTEMPTS; attempt++) {
      const candidateKey = `${regionKey}:${attempt}`;
      const candidateSeed = positiveMod(
        hashWorldCoordinate(String(seed), candidateKey, 0),
        1000000,
      );

      const regionRooms = this.roomsByRegion.get(regionKey) ?? [];
      for (const roomId of regionRooms) {
        const coord = this.coordsByRoomId.get(roomId);
        if (!coord) continue;
        const roomRegionX = Math.floor(coord.x / COASTER_STATION_REGION_SIZE);
        const roomRegionY = Math.floor(coord.y / COASTER_STATION_REGION_SIZE);
        if (roomRegionX !== regionX || roomRegionY !== regionY) continue;

        // Check for collisions with other stations
        let collision = false;
        for (const existing of this.stationPlacements.values()) {
          const dist =
            Math.abs(existing.coordinate.x - coord.x) + Math.abs(existing.coordinate.y - coord.y);
          if (dist < 4) {
            collision = true;
            break;
          }
        }
        if (!collision) {
          return {
            id: `rollercoaster-region:${regionKey}`,
            seed: candidateSeed,
            roomId,
            coordinate: coord,
          };
        }
      }
    }
    return null;
  }

  private computeDestinations(placement: RollercoasterPlacement): RollercoasterDestinationInfo[] {
    const destinations: RollercoasterDestinationInfo[] = [];

    for (const roomId of this.allStationableRooms) {
      if (roomId === placement.roomId) continue;

      const coord = this.coordsByRoomId.get(roomId);
      if (!coord) continue;
      const stationCoord = placement.coordinate;
      const dx = Math.abs(coord.x - stationCoord.x);
      const dy = Math.abs(coord.y - stationCoord.y);
      const dz = Math.abs(coord.z - stationCoord.z);

      if (
        dx <= COASTER_DESTINATION_RADIUS &&
        dy <= COASTER_DESTINATION_RADIUS &&
        dz <= COASTER_DESTINATION_Z_RADIUS
      ) {
        const dist = dx + dy + dz;
        const weight = Math.max(
          1,
          COASTER_DESTINATION_RADIUS + COASTER_DESTINATION_Z_RADIUS - dist,
        );

        destinations.push({
          roomId,
          coordinate: coord,
          exitX: Math.floor(this.grid.cols / 2),
          exitY: Math.floor(this.grid.rows / 2),
          weight,
        });
      }
    }

    // Fallback: allow self-destination if no others found
    if (destinations.length === 0) {
      destinations.push({
        roomId: placement.roomId,
        coordinate: placement.coordinate,
        exitX: Math.floor(this.grid.cols / 2),
        exitY: Math.floor(this.grid.rows / 2),
        weight: 1,
      });
    }

    return destinations;
  }

  private getRegionKey(coord: RoomCoordinate): string {
    return `${Math.floor(coord.x / COASTER_STATION_REGION_SIZE)},${Math.floor(coord.y / COASTER_STATION_REGION_SIZE)}`;
  }
}

function hashWorldCoordinate(seed: string, regionKey: string, index: number): number {
  let hash = 0;
  const combined = `${seed}:${regionKey}:${index}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}
