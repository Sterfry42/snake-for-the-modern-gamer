import type { GridConfig } from '../../config/gameConfig.js';
import type { WorldGenerationIdentity } from './worldGenerationIdentity.js';
import { formatRoomId, parseRoomId, type RoomCoordinate } from './multiRoomStructures.js';
import { positiveMod } from './worldHash.js';

const JADE_PEAK_STATION_REGION_SIZE = 12;
const JADE_PEAK_STATION_CANDIDATE_ATTEMPTS = 8;
const JADE_PEAK_DESTINATION_RADIUS = 10;
const JADE_PEAK_DESTINATION_Z_RADIUS = 3;

/** A pre-computed bullet train station placement. */
export interface BulletTrainPlacement {
  id: string;
  seed: number;
  roomId: string;
  /** Grid coordinate of the station room. */
  coordinate: RoomCoordinate;
}

/** A pre-computed destination for a station. */
export interface BulletTrainDestinationInfo {
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

/** Resolver that pre-computes bullet train station placements and destinations. */
export class BulletTrainStructureResolver {
  private readonly stationPlacements = new Map<string, BulletTrainPlacement>();
  private readonly destinationMap = new Map<string, BulletTrainDestinationInfo[]>();
  private readonly allJadePeakRooms = new Set<string>();

  constructor(
    private readonly identity: WorldGenerationIdentity,
    private readonly grid: GridConfig,
  ) {}

  /** Register a Jade Peak room so it can be considered for stations and destinations. */
  registerJadePeakRoom(roomId: string): void {
    this.allJadePeakRooms.add(roomId);
  }

  /** Get all registered Jade Peak room IDs. */
  getJadePeakRooms(): Set<string> {
    return this.allJadePeakRooms;
  }

  /** Check if a room has a pre-assigned station. */
  hasStation(roomId: string): boolean {
    return this.stationPlacements.has(roomId);
  }

  /** Get the station placement for a room. */
  getStationPlacement(roomId: string): BulletTrainPlacement | null {
    return this.stationPlacements.get(roomId) ?? null;
  }

  /** Get pre-computed destinations for a station. */
  getDestinations(roomId: string): BulletTrainDestinationInfo[] {
    return this.destinationMap.get(roomId) ?? [];
  }

  /** Pre-compute all station placements and destinations. */
  computePlacements(): void {
    const roomIds = Array.from(this.allJadePeakRooms);
    if (roomIds.length === 0) return;

    // Parse all room coordinates
    const roomsByCoord = new Map<string, RoomCoordinate>();
    for (const roomId of roomIds) {
      const coord = parseRoomId(roomId);
      roomsByCoord.set(formatRoomId(coord), coord);
    }

    // Determine regions and assign stations
    const regionMap = new Map<string, { x: number; y: number }>();
    for (const roomId of roomIds) {
      const coord = parseRoomId(roomId);
      const regionKey = `${Math.floor(coord.x / JADE_PEAK_STATION_REGION_SIZE)},${Math.floor(coord.y / JADE_PEAK_STATION_REGION_SIZE)}`;
      if (!regionMap.has(regionKey)) {
        regionMap.set(regionKey, { x: Math.floor(coord.x / JADE_PEAK_STATION_REGION_SIZE), y: Math.floor(coord.y / JADE_PEAK_STATION_REGION_SIZE) });
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
      const destinations = this.computeDestinations(placement, roomsByCoord);
      this.destinationMap.set(placement.roomId, destinations);
    }
  }

  private createRegionPlacement(
    regionX: number,
    regionY: number,
    regionKey: string,
    index: number,
  ): BulletTrainPlacement | null {
    const seed = positiveMod(
      hashWorldCoordinate(this.identity.seed, regionKey, index),
      1000000,
    );

    // Try multiple candidate rooms in the region
    for (let attempt = 0; attempt < JADE_PEAK_STATION_CANDIDATE_ATTEMPTS; attempt++) {
      const candidateKey = `${regionKey}:${attempt}`;
      const candidateSeed = positiveMod(hashWorldCoordinate(String(seed), candidateKey, 0), 1000000);

      // Find a Jade Peak room in this region
      for (const roomId of this.allJadePeakRooms) {
        const coord = parseRoomId(roomId);
        const roomRegionX = Math.floor(coord.x / JADE_PEAK_STATION_REGION_SIZE);
        const roomRegionY = Math.floor(coord.y / JADE_PEAK_STATION_REGION_SIZE);
        if (roomRegionX === regionX && roomRegionY === regionY) {
          // Check for collisions with other stations
          let collision = false;
          for (const existing of this.stationPlacements.values()) {
            const existingCoord = parseRoomId(existing.roomId);
            const dist = Math.abs(existingCoord.x - coord.x) + Math.abs(existingCoord.y - coord.y);
            if (dist < 3) {
              collision = true;
              break;
            }
          }
          if (!collision) {
            return {
              id: `bullet-train-region:${regionKey}`,
              seed: candidateSeed,
              roomId,
              coordinate: coord,
            };
          }
        }
      }
    }
    return null;
  }

  private computeDestinations(
    placement: BulletTrainPlacement,
    roomsByCoord: Map<string, RoomCoordinate>,
  ): BulletTrainDestinationInfo[] {
    const destinations: BulletTrainDestinationInfo[] = [];

    for (const roomId of this.allJadePeakRooms) {
      // Exclude the station's own room
      if (roomId === placement.roomId) continue;

      const coord = parseRoomId(roomId);
      const stationCoord = placement.coordinate;
      const dx = Math.abs(coord.x - stationCoord.x);
      const dy = Math.abs(coord.y - stationCoord.y);
      const dz = Math.abs(coord.z - stationCoord.z);

      // Allow travel within X/Y radius and Z depth radius
      if (dx <= JADE_PEAK_DESTINATION_RADIUS && dy <= JADE_PEAK_DESTINATION_RADIUS && dz <= JADE_PEAK_DESTINATION_Z_RADIUS) {
        // Weight by combined distance (closer = more likely)
        const dist = dx + dy + dz;
        const weight = Math.max(1, JADE_PEAK_DESTINATION_RADIUS + JADE_PEAK_DESTINATION_Z_RADIUS - dist);

        // Pick an exit tile near a portal or center
        const exitX = Math.floor(this.grid.cols / 2);
        const exitY = Math.floor(this.grid.rows / 2);

        destinations.push({
          roomId,
          coordinate: coord,
          exitX,
          exitY,
          weight,
        });
      }
    }

    // If no destinations found (e.g., only one Jade Peak room),
    // allow the station to destination to itself as a fallback
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
