import {
  createBiomePalette,
  createBiomePaletteFromBiome,
  getAllBiomeDefinitions,
  getBiomeForRoom,
  type BiomeDefinition,
  type BiomeId,
} from '../biomes.js';
import { sampleClimateForRegion, type ClimateSample } from './climate.js';
import type { RoomGenerationPalette } from './types.js';
import { hashWorldCoordinate, positiveMod } from './worldHash.js';
import {
  createWorldGenerationIdentity,
  type WorldGenerationIdentity,
} from './worldGenerationIdentity.js';

export const STARTER_BIOME_RADIUS = 20;
const REGION_SIZE_ROOMS = 8;

export interface BiomeMap {
  getBiomeForRoomId(roomId: string): BiomeDefinition;
  createPalette(roomId: string): RoomGenerationPalette;
}

function parseRoomId(roomId: string): { x: number; y: number; z: number } {
  const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
  return { x, y, z };
}

export function isAuthoredStarterBiomeRoom(roomId: string): boolean {
  const { x, y, z } = parseRoomId(roomId);
  return z === 0 && Math.abs(x) <= STARTER_BIOME_RADIUS && Math.abs(y) <= STARTER_BIOME_RADIUS;
}

export function getAuthoredStarterBiomeForRoom(roomId: string): BiomeDefinition | null {
  return isAuthoredStarterBiomeRoom(roomId) ? getBiomeForRoom(roomId) : null;
}

function zAllowed(profile: NonNullable<BiomeDefinition['generation']>, z: number): boolean {
  if (profile.minZ !== undefined && z < profile.minZ) return false;
  if (profile.maxZ !== undefined && z > profile.maxZ) return false;
  switch (profile.allowedZ) {
    case 'surface':
      return z === 0;
    case 'above':
      return z > 0;
    case 'below':
      return z < 0;
    case 'any':
    case undefined:
      return true;
  }
}

function rarityMultiplier(rarity: NonNullable<BiomeDefinition['generation']>['rarity']): number {
  switch (rarity) {
    case 'legendary':
      return 0.12;
    case 'rare':
      return 0.35;
    case 'uncommon':
      return 0.7;
    case 'common':
    case undefined:
      return 1;
  }
}

function climateFit(value: number, ideal: number, tolerance: number): number {
  return Math.max(0, 1 - Math.abs(value - ideal) / Math.max(0.01, tolerance));
}

export class SeededBiomeMap implements BiomeMap {
  private readonly cache = new Map<string, BiomeDefinition>();

  constructor(private readonly identity: WorldGenerationIdentity = createWorldGenerationIdentity()) {}

  getBiomeForRoomId(roomId: string): BiomeDefinition {
    const cached = this.cache.get(roomId);
    if (cached) return cached;

    const authored = getAuthoredStarterBiomeForRoom(roomId);
    const biome = authored ?? this.resolveProceduralBiome(roomId);
    this.cache.set(roomId, biome);
    return biome;
  }

  createPalette(roomId: string): RoomGenerationPalette {
    const authored = getAuthoredStarterBiomeForRoom(roomId);
    if (authored) {
      return createBiomePalette(roomId);
    }
    return createBiomePaletteFromBiome(this.getBiomeForRoomId(roomId), roomId);
  }

  private resolveProceduralBiome(roomId: string): BiomeDefinition {
    const { x, y, z } = parseRoomId(roomId);
    const regionX = Math.floor(x / REGION_SIZE_ROOMS);
    const regionY = Math.floor(y / REGION_SIZE_ROOMS);
    return this.resolveRegionBiome(regionX, regionY, z);
  }

  private resolveRegionBiome(regionX: number, regionY: number, z: number): BiomeDefinition {
    const climate = sampleClimateForRegion({ regionX, regionY, z, identity: this.identity });
    const candidates = getAllBiomeDefinitions()
      .filter((biome) => biome.generation && biome.id !== 'home-hearth')
      .filter((biome) => zAllowed(biome.generation!, z));

    const scored = candidates.map((biome) => ({
      biome,
      score: this.scoreBiome(biome, climate, regionX, regionY, z),
    }));
    scored.sort((a, b) => b.score - a.score);

    const pickWindow = scored.slice(0, Math.min(4, scored.length));
    const hash = hashWorldCoordinate({
      x: regionX,
      y: regionY,
      z,
      salt: this.identity.biomeSalt,
      featureSalt: 0x5107,
    });
    const weightedTotal = pickWindow.reduce((sum, entry) => sum + entry.score, 0);
    let roll = (hash / 0xffffffff) * weightedTotal;
    for (const entry of pickWindow) {
      roll -= entry.score;
      if (roll <= 0) {
        return entry.biome;
      }
    }
    return pickWindow[positiveMod(hash, pickWindow.length)]?.biome ?? getBiomeForRoom('0,0,0');
  }

  private scoreBiome(
    biome: BiomeDefinition,
    climate: ClimateSample,
    regionX: number,
    regionY: number,
    z: number,
  ): number {
    const profile = biome.generation;
    if (!profile) return 0;
    const temperature = climateFit(
      climate.temperature,
      profile.idealTemperature,
      profile.temperatureTolerance,
    );
    const moisture = climateFit(climate.moisture, profile.idealMoisture, profile.moistureTolerance);
    const weirdness =
      profile.idealWeirdness === undefined
        ? 0.75
        : climateFit(
            climate.weirdness,
            profile.idealWeirdness,
            profile.weirdnessTolerance ?? 0.75,
          );
    const distanceRooms = Math.hypot(regionX * REGION_SIZE_ROOMS, regionY * REGION_SIZE_ROOMS);
    if (profile.minDistanceFromOrigin !== undefined && distanceRooms < profile.minDistanceFromOrigin) {
      return 0;
    }
    if (profile.maxDistanceFromOrigin !== undefined && distanceRooms > profile.maxDistanceFromOrigin) {
      return 0;
    }
    const zBias =
      biome.family === 'cave' && z < 0
        ? 1 + Math.min(1.25, Math.abs(z) * 0.22)
        : biome.tags.includes('high-altitude') && z > 0
          ? 1 + Math.min(1, z * 0.18)
          : biome.family === 'ocean' && z !== 0
            ? 0.55
            : 1;
    const noise =
      0.85 +
      (hashWorldCoordinate({
        x: regionX,
        y: regionY,
        z,
        salt: this.identity.biomeSalt,
        featureSalt: biome.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0),
      }) /
        0xffffffff) *
        0.3;
    return (
      Math.max(0.001, profile.baseWeight) *
      rarityMultiplier(profile.rarity) *
      (0.5 + temperature) *
      (0.5 + moisture) *
      (0.5 + weirdness) *
      zBias *
      noise
    );
  }
}

export class CoordinateBiomeMap implements BiomeMap {
  getBiomeForRoomId(roomId: string): BiomeDefinition {
    return getBiomeForRoom(roomId);
  }

  createPalette(roomId: string): RoomGenerationPalette {
    return createBiomePalette(roomId);
  }
}

export function getProceduralBiomeForRoom(
  roomId: string,
  identity: WorldGenerationIdentity,
): BiomeId {
  return new SeededBiomeMap(identity).getBiomeForRoomId(roomId).id;
}
