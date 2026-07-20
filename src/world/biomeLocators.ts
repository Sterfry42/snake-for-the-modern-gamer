/**
 * Biome Locators
 *
 * Locator items point the snake toward the nearest biome of a given type.
 * One locator exists per biome, auto-generated from the biome registry so
 * new biomes always get a locator for free.
 *
 * The wise old snake's locator rules:
 * - The wise old snake always knows where the nearest biome is. That's why it's wise.
 * - The wise old snake's locator once pointed at a biome that didn't exist yet. It was right.
 * - The wise old snake lost its locator in a goblin casino. It found the casino instead.
 */
import type { BiomeDefinition, BiomeId } from './biomes.js';
import { getAllBiomeDefinitions, getBiomeDefinition } from './biomes.js';
import type { Item } from '../inventory/item.js';
import { SeededBiomeMap } from './generation/biomeMap.js';
import { type WorldGenerationIdentity } from './generation/worldGenerationIdentity.js';

export const LOCATOR_ITEM_PREFIX = 'locator-';

/** Build the item id for a biome locator. */
export function getLocatorItemId(biomeId: BiomeId): string {
  return `${LOCATOR_ITEM_PREFIX}${biomeId}`;
}

/** Check whether an item id is a biome locator. */
export function isLocatorItemId(itemId: string): boolean {
  return itemId.startsWith(LOCATOR_ITEM_PREFIX);
}

/** Extract the biome id from a locator item id, or null if not a locator. */
export function getLocatorBiomeId(itemId: string): BiomeId | null {
  if (!isLocatorItemId(itemId)) return null;
  const biomeId = itemId.slice(LOCATOR_ITEM_PREFIX.length) as BiomeId;
  return getBiomeDefinition(biomeId) ? biomeId : null;
}

/** All biome locator item ids, one per biome. */
export function getAllLocatorItemIds(): string[] {
  return getAllBiomeDefinitions().map((b) => getLocatorItemId(b.id));
}

export interface LocatorResult {
  /** The room id of the nearest matching biome. */
  roomId: string;
  /** Manhattan distance in rooms from the search origin. */
  distance: number;
  /** The biome definition found at that room. */
  biome: BiomeDefinition;
  /** Room coordinates [x, y, z]. */
  coordinates: [number, number, number];
}

export interface LocatorLookup {
  /** Nearest biome on the same floor (z) as the origin. */
  sameFloor: LocatorResult | null;
  /** Nearest biome across all floors. */
  anyFloor: LocatorResult | null;
}

export type BiomeMapResolver = (roomId: string) => BiomeDefinition;

/**
 * Parse a coordinate-style room id into [x, y, z].
 * Falls back to [0, 0, 0] for non-coordinate rooms (caves, layers, etc.).
 */
function parseLocatorRoomId(roomId: string): [number, number, number] {
  if (roomId.startsWith('cave:') || roomId.startsWith('layer:')) {
    return [0, 0, 0];
  }
  const parts = roomId.split(',').map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/**
 * Generate the four cardinal adjacent room ids (same z level).
 */
function adjacentRoomIds(x: number, y: number, z: number): string[] {
  return [`${x + 1},${y},${z}`, `${x - 1},${y},${z}`, `${x},${y + 1},${z}`, `${x},${y - 1},${z}`];
}

/**
 * Generate all six adjacent room ids (any z level).
 */
function adjacentRoomIdsAnyFloor(x: number, y: number, z: number): string[] {
  return [
    `${x + 1},${y},${z}`,
    `${x - 1},${y},${z}`,
    `${x},${y + 1},${z}`,
    `${x},${y - 1},${z}`,
    `${x},${y},${z + 1}`,
    `${x},${y},${z - 1}`,
  ];
}

/**
 * Region size used by the world generator. Biomes are constant within an
 * 8×8 room region, so we can search regions instead of rooms for a ~64× speedup.
 */
export const REGION_SIZE_ROOMS = 8;

/**
 * Convert a room coordinate [x, y, z] to its region coordinate.
 */
function roomToRegion(x: number, y: number): [number, number] {
  return [Math.floor(x / REGION_SIZE_ROOMS), Math.floor(y / REGION_SIZE_ROOMS)];
}

/**
 * Convert a region coordinate back to the center room id within that region.
 */
function regionToCenterRoomId(regionX: number, regionY: number, z: number): string {
  const cx = regionX * REGION_SIZE_ROOMS + Math.floor(REGION_SIZE_ROOMS / 2);
  const cy = regionY * REGION_SIZE_ROOMS + Math.floor(REGION_SIZE_ROOMS / 2);
  return `${cx},${cy},${z}`;
}

/**
 * Generate the four cardinal adjacent region ids (same z level).
 */
function adjacentRegionIds(rx: number, ry: number, _z: number): [number, number, number][] {
  return [
    [rx + 1, ry, _z],
    [rx - 1, ry, _z],
    [rx, ry + 1, _z],
    [rx, ry - 1, _z],
  ];
}

/**
 * Generate all six cardinal adjacent region ids (any z level).
 */
function adjacentRegionIdsAnyFloor(rx: number, ry: number, z: number): [number, number, number][] {
  return [
    [rx + 1, ry, z],
    [rx - 1, ry, z],
    [rx, ry + 1, z],
    [rx, ry - 1, z],
    [rx, ry, z + 1],
    [rx, ry, z - 1],
  ];
}

/**
 * Create a biome resolver that uses SeededBiomeMap for fast, generation-free
 * biome lookups. This avoids triggering full room generation just to read the
 * biome id.
 */
export function createSeededBiomeResolver(identity?: WorldGenerationIdentity): BiomeMapResolver {
  const biomeMap = new SeededBiomeMap(identity);
  return (roomId: string) => biomeMap.getBiomeForRoomId(roomId);
}

/**
 * BFS through the **region** grid to find the nearest region with the target
 * biome. Since biomes are constant within each 8×8 room region, this visits
 * ~64× fewer nodes than a room-by-room BFS.
 *
 * When a matching region is found, the center room of that region is returned
 * as the destination.
 *
 * @param originRoomId - The room to search from.
 * @param targetBiomeId - The biome id to find.
 * @param sameFloor - If true, only search regions on the same z level.
 * @param resolveBiome - Function that returns the biome for any region (called
 *   with the region's center room id).
 * @param maxSearchDepth - Stop expanding after this many regions visited (safety).
 * @param maxRadius - Stop if any searched region is farther than this many
 *   regions from the origin. Defaults to 100 (covers ~800 rooms).
 */
export function findNearestBiomeByRegion(
  originRoomId: string,
  targetBiomeId: BiomeId,
  sameFloor: boolean,
  resolveBiome: BiomeMapResolver,
  maxSearchDepth = 10500,
  maxRadius = 100,
): LocatorResult | null {
  const targetDef = getBiomeDefinition(targetBiomeId);
  if (!targetDef) return null;

  const [ox, oy, oz] = parseLocatorRoomId(originRoomId);
  const [origRx, origRy] = roomToRegion(ox, oy);

  function biomeMatches(roomBiome: BiomeDefinition): boolean {
    return roomBiome.id === targetBiomeId;
  }

  const adjacent = sameFloor ? adjacentRegionIds : adjacentRegionIdsAnyFloor;

  const visited = new Set<string>();
  const queue: Array<{
    regionX: number;
    regionY: number;
    z: number;
    distance: number;
  }> = [];

  const originRegionKey = `${origRx},${origRy},${oz}`;
  visited.add(originRegionKey);
  queue.push({ regionX: origRx, regionY: origRy, z: oz, distance: 0 });

  while (queue.length > 0) {
    if (queue.length > maxSearchDepth) break;

    const current = queue.shift()!;
    const centerRoomId = regionToCenterRoomId(current.regionX, current.regionY, current.z);
    const roomBiome = resolveBiome(centerRoomId);

    if (biomeMatches(roomBiome)) {
      // Compute Manhattan distance from origin room to center of matching region
      const centerCoord = parseLocatorRoomId(centerRoomId);
      const distance =
        Math.abs(centerCoord[0] - ox) +
        Math.abs(centerCoord[1] - oy) +
        Math.abs(centerCoord[2] - oz);
      return {
        roomId: centerRoomId,
        distance,
        biome: roomBiome,
        coordinates: centerCoord as [number, number, number],
      };
    }

    // Prune regions outside the search radius.
    const { regionX: rx, regionY: ry, z: rz } = current;
    if (
      Math.abs(rx - origRx) > maxRadius ||
      Math.abs(ry - origRy) > maxRadius ||
      Math.abs(rz - oz) > maxRadius
    ) {
      continue;
    }

    const neighbors = adjacent(current.regionX, current.regionY, current.z);
    for (const [nx, ny, nz] of neighbors) {
      const key = `${nx},${ny},${nz}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ regionX: nx, regionY: ny, z: nz, distance: current.distance + 1 });
    }
  }

  return null;
}

/**
 * Look up both same-floor and any-floor nearest biomes via region BFS.
 */
export function lookupNearestBiomesByRegion(
  originRoomId: string,
  targetBiomeId: BiomeId,
  resolveBiome: BiomeMapResolver,
  maxSearchDepth = 10500,
  maxRadius = 100,
): LocatorLookup {
  const sameFloor = findNearestBiomeByRegion(
    originRoomId,
    targetBiomeId,
    true,
    resolveBiome,
    maxSearchDepth,
    maxRadius,
  );
  const anyFloor = findNearestBiomeByRegion(
    originRoomId,
    targetBiomeId,
    false,
    resolveBiome,
    maxSearchDepth,
    maxRadius,
  );
  return { sameFloor, anyFloor };
}

/**
 * BFS through the room grid to find the nearest room with the target biome.
 *
 * The search expands in Manhattan-distance order. It stops as soon as it
 * finds a room whose biome matches the target biome.
 *
 * @param originRoomId - The room to search from.
 * @param targetBiomeId - The biome id to find.
 * @param sameFloor - If true, only search rooms on the same z level.
 * @param resolveBiome - Function that returns the biome for any room id.
 * @param maxSearchDepth - Stop expanding after this many rooms visited (safety).
 * @param maxRadius - Stop if any searched room is farther than this many rooms
 *   from the origin in any axis. Defaults to 50.
 */
export function findNearestBiome(
  originRoomId: string,
  targetBiomeId: BiomeId,
  sameFloor: boolean,
  resolveBiome: BiomeMapResolver,
  maxSearchDepth = 2000,
  maxRadius = 50,
): LocatorResult | null {
  const targetDef = getBiomeDefinition(targetBiomeId);
  if (!targetDef) return null;

  const [ox, oy, oz] = parseLocatorRoomId(originRoomId);

  function biomeMatches(roomBiome: BiomeDefinition): boolean {
    return roomBiome.id === targetBiomeId;
  }

  const adjacent = sameFloor ? adjacentRoomIds : adjacentRoomIdsAnyFloor;

  const visited = new Set<string>();
  const queue: Array<{ roomId: string; x: number; y: number; z: number; distance: number }> = [];

  visited.add(originRoomId);
  queue.push({ roomId: originRoomId, x: ox, y: oy, z: oz, distance: 0 });

  while (queue.length > 0) {
    if (queue.length > maxSearchDepth) break;

    const current = queue.shift()!;
    const roomBiome = resolveBiome(current.roomId);

    if (biomeMatches(roomBiome)) {
      return {
        roomId: current.roomId,
        distance: current.distance,
        biome: roomBiome,
        coordinates: [current.x, current.y, current.z] as [number, number, number],
      };
    }

    // Prune rooms outside the search radius to prevent infinite expansion.
    const { x: cx, y: cy, z: cz } = current;
    if (
      Math.abs(cx - ox) > maxRadius ||
      Math.abs(cy - oy) > maxRadius ||
      Math.abs(cz - oz) > maxRadius
    ) {
      continue;
    }

    const neighbors = adjacent(current.x, current.y, current.z);
    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      const [nx, ny, nz] = parseLocatorRoomId(neighborId);
      queue.push({
        roomId: neighborId,
        x: nx,
        y: ny,
        z: nz,
        distance: current.distance + 1,
      });
    }
  }

  return null;
}

/**
 * Look up both same-floor and any-floor nearest biomes in one call.
 *
 * Uses region-based BFS for speed (biomes are constant within 8×8 room regions).
 */
export function lookupNearestBiomes(
  originRoomId: string,
  targetBiomeId: BiomeId,
  resolveBiome: BiomeMapResolver,
  maxSearchDepth = 500,
  maxRadius = 6,
): LocatorLookup {
  const sameFloor = findNearestBiomeByRegion(
    originRoomId,
    targetBiomeId,
    true,
    resolveBiome,
    maxSearchDepth,
    maxRadius,
  );
  const anyFloor = findNearestBiomeByRegion(
    originRoomId,
    targetBiomeId,
    false,
    resolveBiome,
    maxSearchDepth,
    maxRadius,
  );
  return { sameFloor, anyFloor };
}

/**
 * Format a locator result into a human-readable string.
 */
export function formatLocatorResult(result: LocatorResult, label: string): string {
  const [x, y, z] = result.coordinates;
  const distLabel = result.distance === 0 ? 'right here' : `${result.distance} rooms away`;
  return `${label}: ${result.biome.title} at X=${x}, Y=${y}, Z=${z} (${distLabel}).`;
}

// ===== LOCATOR ITEM DEFINITIONS =====
// Generated dynamically from biome definitions so new biomes auto-get locators.

export function createBiomeLocatorItem(biome: BiomeDefinition): Item {
  return {
    id: getLocatorItemId(biome.id),
    name: `${biome.title} Locator`,
    description: `Points toward the nearest ${biome.title}. Shows the closest one on your current floor and the closest one anywhere in the world. Use it to find your way.`,
    kind: 'consumable',
    category: 'material',
  };
}

/**
 * Build locator items for every biome in the game.
 * Call this once at module load and merge into the item registry.
 */
export function generateBiomeLocatorItems(): Item[] {
  return getAllBiomeDefinitions().map(createBiomeLocatorItem);
}
