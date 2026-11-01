/**
 * Transit Shared
 *
 * Primitives common to every transit station kind (bullet train, roller
 * coaster, future lines): floor-block detection, edge tiling, station id
 * scheme, and the candidate-seed hash. Content (flavor, themes, tracks)
 * stays with each transit kind.
 */
import type { GridConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { parseRoomId, type RoomCoordinate } from './roomAddress.js';
import type { WorldGenerationIdentity } from './generation/worldGenerationIdentity.js';
import { positiveMod } from './generation/worldHash.js';

export interface TransitFloorBlock {
  tiles: Vector2Like[];
  count: number;
}

/** Find contiguous open-floor blocks of at least `minSize` tiles; `entranceTile` counts as floor. */
export function findContiguousFloorBlocks(
  layout: string[][],
  minSize: number,
  entranceTile: string,
): TransitFloorBlock[] {
  const visited = new Set<string>();
  const blocks: TransitFloorBlock[] = [];

  function floodFill(startX: number, startY: number): Vector2Like[] {
    const tiles: Vector2Like[] = [];
    const queue: Vector2Like[] = [{ x: startX, y: startY }];
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      tiles.push({ x, y });

      const neighbors = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
      ];

      for (const n of neighbors) {
        if (n.x < 0 || n.y < 0 || n.y >= layout.length || n.x >= layout[0].length) continue;
        const nk = `${n.x},${n.y}`;
        if (visited.has(nk)) continue;
        const tile = layout[n.y]?.[n.x];
        if (tile !== '.' && tile !== entranceTile) continue;
        visited.add(nk);
        queue.push(n);
      }
    }
    return tiles;
  }

  for (let y = 0; y < layout.length; y += 1) {
    for (let x = 0; x < layout[y].length; x += 1) {
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      const tile = layout[y][x];
      if (tile !== '.' && tile !== entranceTile) continue;
      const tiles = floodFill(x, y);
      if (tiles.length >= minSize) {
        blocks.push({ tiles, count: tiles.length });
      }
    }
  }
  return blocks;
}

/** Find tiles near a room edge (within maxDistance tiles of a wall); `entranceTile` counts as floor. */
export function findEdgeTiles(
  layout: string[][],
  maxDistance: number,
  entranceTile: string,
): Vector2Like[] {
  const tiles: Vector2Like[] = [];
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const tile = layout[y][x];
      if (tile !== '.' && tile !== entranceTile) continue;

      const distToEdge = Math.min(x, y, cols - 1 - x, rows - 1 - y);
      if (distToEdge <= maxDistance) {
        tiles.push({ x, y });
      }
    }
  }
  return tiles;
}

/** Generate a unique station ID from a transit kind and room ID. */
export function generateTransitStationId(kind: string, roomId: string): string {
  return `${kind}:${roomId}`;
}

/** A pre-computed station placement shared by every transit resolver. */
export interface TransitStationPlacement {
  id: string;
  seed: number;
  roomId: string;
  /** Grid coordinate of the station room. */
  coordinate: RoomCoordinate;
}

/** A pre-computed destination for a transit station. */
export interface TransitDestinationInfo {
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

/** Build the 1-2 intermediate transit room ids between a station and its destination. */
export function generateTransitRooms(
  stationRoomId: string,
  destinationRoomId: string,
  rng: RandomGenerator,
): string[] {
  const transitRooms: string[] = [];
  const count = 1 + Math.floor(rng() * 2); // 1-2 transit rooms

  for (let i = 0; i < count; i++) {
    const transitId = `transit:${stationRoomId}:${destinationRoomId}:${i}`;
    transitRooms.push(transitId);
  }

  return transitRooms;
}

/** Deterministic candidate-seed hash shared by transit resolvers. */
export function hashTransitCoordinate(seed: string, regionKey: string, index: number): number {
  let hash = 0;
  const combined = `${seed}:${regionKey}:${index}`;
  for (let i = 0; i < combined.length; i += 1) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

/** Tunables for a transit line's station/destination resolver. */
export interface TransitStationResolverConfig {
  /** Station id prefix, e.g. 'bullet-train-region:'. */
  idPrefix: string;
  /** Region grid size in rooms. */
  regionSize: number;
  /** Candidate rooms tried per region before giving up. */
  candidateAttempts: number;
  /** Max |dx|/|dy| between a station and its destinations. */
  destinationRadius: number;
  /** Max |dz| between a station and its destinations. */
  destinationZRadius: number;
  /** Minimum Manhattan distance between two stations. */
  minSeparation: number;
}

/**
 * Pre-computes deterministic station placements and destinations for a
 * transit line. Shared by the bullet train and rollercoaster resolvers.
 */
export class TransitStationResolver {
  protected readonly stationPlacements = new Map<string, TransitStationPlacement>();
  protected readonly destinationMap = new Map<string, TransitDestinationInfo[]>();
  protected readonly allStationableRooms = new Set<string>();
  protected readonly coordsByRoomId = new Map<string, RoomCoordinate>();
  protected readonly roomsByRegion = new Map<string, string[]>();
  private version = 0;
  private computedVersion = -1;

  constructor(
    protected readonly identity: WorldGenerationIdentity,
    protected readonly grid: GridConfig,
    protected readonly config: TransitStationResolverConfig,
  ) {}

  /** Register a room so it can be considered for stations and destinations. */
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

  /** Check if a room has a pre-assigned station. */
  hasStation(roomId: string): boolean {
    return this.stationPlacements.has(roomId);
  }

  /** Get the station placement for a room. */
  getStationPlacement(roomId: string): TransitStationPlacement | null {
    return this.stationPlacements.get(roomId) ?? null;
  }

  /** Get pre-computed destinations for a station. */
  getDestinations(roomId: string): TransitDestinationInfo[] {
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
          x: Math.floor(coord.x / this.config.regionSize),
          y: Math.floor(coord.y / this.config.regionSize),
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
  ): TransitStationPlacement | null {
    const seed = positiveMod(hashTransitCoordinate(this.identity.seed, regionKey, index), 1000000);

    // Try multiple candidate rooms in the region
    for (let attempt = 0; attempt < this.config.candidateAttempts; attempt++) {
      const candidateKey = `${regionKey}:${attempt}`;
      const candidateSeed = positiveMod(
        hashTransitCoordinate(String(seed), candidateKey, 0),
        1000000,
      );

      const regionRooms = this.roomsByRegion.get(regionKey) ?? [];
      for (const roomId of regionRooms) {
        const coord = this.coordsByRoomId.get(roomId);
        if (!coord) continue;
        const roomRegionX = Math.floor(coord.x / this.config.regionSize);
        const roomRegionY = Math.floor(coord.y / this.config.regionSize);
        if (roomRegionX !== regionX || roomRegionY !== regionY) continue;

        // Check for collisions with other stations
        let collision = false;
        for (const existing of this.stationPlacements.values()) {
          const dist =
            Math.abs(existing.coordinate.x - coord.x) + Math.abs(existing.coordinate.y - coord.y);
          if (dist < this.config.minSeparation) {
            collision = true;
            break;
          }
        }
        if (!collision) {
          return {
            id: `${this.config.idPrefix}${regionKey}`,
            seed: candidateSeed,
            roomId,
            coordinate: coord,
          };
        }
      }
    }
    return null;
  }

  private computeDestinations(placement: TransitStationPlacement): TransitDestinationInfo[] {
    const destinations: TransitDestinationInfo[] = [];

    for (const roomId of this.allStationableRooms) {
      // Exclude the station's own room
      if (roomId === placement.roomId) continue;

      const coord = this.coordsByRoomId.get(roomId);
      if (!coord) continue;
      const stationCoord = placement.coordinate;
      const dx = Math.abs(coord.x - stationCoord.x);
      const dy = Math.abs(coord.y - stationCoord.y);
      const dz = Math.abs(coord.z - stationCoord.z);

      // Allow travel within X/Y radius and Z depth radius
      if (
        dx <= this.config.destinationRadius &&
        dy <= this.config.destinationRadius &&
        dz <= this.config.destinationZRadius
      ) {
        // Weight by combined distance (closer = more likely)
        const dist = dx + dy + dz;
        const weight = Math.max(
          1,
          this.config.destinationRadius + this.config.destinationZRadius - dist,
        );

        // Pick an exit tile near a portal or center
        const exitX = Math.floor(this.grid.cols / 2);
        const exitY = Math.floor(this.grid.rows / 2);

        destinations.push({ roomId, coordinate: coord, exitX, exitY, weight });
      }
    }

    // If no destinations found (e.g., only one stationable room),
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

  private getRegionKey(coord: RoomCoordinate): string {
    return `${Math.floor(coord.x / this.config.regionSize)},${Math.floor(coord.y / this.config.regionSize)}`;
  }
}
