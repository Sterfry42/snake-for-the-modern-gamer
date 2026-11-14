/**
 * Transit Shared
 *
 * Primitives common to every transit station kind (bullet train, roller
 * coaster, future lines): the placement resolver, the candidate-seed
 * hash, transit room interpolation, and safe exit snapping. Content
 * (flavor, themes, tracks) stays with each transit kind.
 */
import type { GridConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { parseRoomId, type RoomCoordinate } from './roomAddress.js';
import type { WorldGenerationIdentity } from './generation/worldGenerationIdentity.js';
import { positiveMod } from './generation/worldHash.js';
import { isSolidTile } from './tiles.js';

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

/**
 * Whether a room tile is a legal transit arrival tile: the snake dies
 * instantly on solid terrain and drowns on water without gear, so a
 * station exit must never point at either. Layout rows are row strings.
 */
export function isSafeTransitExitTile(
  layout: ReadonlyArray<string | undefined>,
  x: number,
  y: number,
): boolean {
  const tile = layout[y]?.[x];
  return tile !== undefined && !isSolidTile(tile) && tile !== '~';
}

/**
 * Resolve a transit exit to a tile the snake can actually stand on.
 *
 * Destination exits are computed at the room center, but generated terrain
 * (mountains, rivers, masonry) can make that tile solid or liquid, which
 * would kill the player on arrival. When the requested tile is unsafe, walk
 * an expanding square spiral until the nearest safe tile is found. The
 * search is deterministic so save/load replays resolve identically.
 */
export function resolveSafeTransitExit(
  layout: ReadonlyArray<string | undefined>,
  exit: Vector2Like,
): Vector2Like {
  if (isSafeTransitExitTile(layout, exit.x, exit.y)) {
    return { x: exit.x, y: exit.y };
  }
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  const maxRadius = Math.max(cols, rows);
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        // Only visit the ring boundary at this radius.
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const x = exit.x + dx;
        const y = exit.y + dy;
        if (x < 0 || y < 0 || y >= rows || x >= cols) continue;
        if (isSafeTransitExitTile(layout, x, y)) {
          return { x, y };
        }
      }
    }
  }
  // No safe tile anywhere (fully solid room); keep the original exit so
  // behavior is unchanged rather than inventing an off-grid position.
  return { x: exit.x, y: exit.y };
}
