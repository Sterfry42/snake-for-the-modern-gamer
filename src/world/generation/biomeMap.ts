import {
  createBiomePalette,
  createBiomePaletteFromBiome,
  getAllBiomeDefinitions,
  getBiomeThermalClass,
  getBiomeVerticalClass,
  getBiomeForRoom,
  type BiomeDefinition,
  type BiomeThermalClass,
  type BiomeVerticalClass,
  type BiomeId,
} from '../biomes.js';
import { HELL_ESCAPE_DEPTH } from '../hellDepth.js';
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

export interface VerticalLayerBiomeWeights {
  vertical: Record<BiomeVerticalClass, number>;
  thermal: Record<BiomeThermalClass, number>;
}

function zHardAllowed(profile: NonNullable<BiomeDefinition['generation']>, z: number): boolean {
  if (profile.minZ !== undefined && z < profile.minZ) return false;
  if (profile.maxZ !== undefined && z > profile.maxZ) return false;
  return true;
}

function softAllowedZMultiplier(
  profile: NonNullable<BiomeDefinition['generation']>,
  z: number,
): number {
  switch (profile.allowedZ) {
    case 'surface':
      return z === 0 ? 1 : Math.abs(z) === 1 ? 0.12 : 0.04;
    case 'above':
      return z > 0 ? 1 : z === 0 ? 0.32 : 0.08;
    case 'below':
      return z < 0 ? 1 : z === 0 ? 0.32 : 0.08;
    case 'any':
    case undefined:
      return 1;
  }
}

function pickSeededVerticalClass(
  weights: Record<BiomeVerticalClass, number>,
  regionX: number,
  regionY: number,
  z: number,
  identity: WorldGenerationIdentity,
): BiomeVerticalClass | null {
  if (z === 0) {
    return null;
  }
  const entries = (Object.entries(weights) as Array<[BiomeVerticalClass, number]>).filter(
    ([, weight]) => weight > 0,
  );
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) {
    return null;
  }
  const hash = hashWorldCoordinate({
    x: regionX,
    y: regionY,
    z,
    salt: identity.biomeSalt,
    featureSalt: 0x71a7,
  });
  let roll = (hash / 0xffffffff) * total;
  for (const [verticalClass, weight] of entries) {
    roll -= weight;
    if (roll <= 0) {
      return verticalClass;
    }
  }
  return entries[entries.length - 1]?.[0] ?? null;
}

function verticalClassSelectionMultiplier(
  selected: BiomeVerticalClass | null,
  actual: BiomeVerticalClass,
): number {
  if (!selected) {
    return 1;
  }
  if (actual === selected) {
    return 3.4;
  }
  if (actual === 'special') {
    return 0.7;
  }
  return 0.28;
}

function circularPhaseDistance(a: number, b: number, modulo: number): number {
  const diff = Math.abs(a - b) % modulo;
  return Math.min(diff, modulo - diff);
}

function verticalStrataNoveltyMultiplier(
  biome: BiomeDefinition,
  regionX: number,
  regionY: number,
  z: number,
  identity: WorldGenerationIdentity,
): number {
  if (z === 0) {
    return 1;
  }
  const modulo = 4;
  const biomeSalt = biome.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const biomePhase = positiveMod(
    hashWorldCoordinate({
      x: regionX,
      y: regionY,
      z: 0,
      salt: identity.biomeSalt,
      featureSalt: 0x91f0 + biomeSalt,
    }),
    modulo,
  );
  const layerPhase = positiveMod(Math.abs(z) - 1 + (z > 0 ? 2 : 0), modulo);
  const distance = circularPhaseDistance(biomePhase, layerPhase, modulo);
  if (distance === 0) {
    return 1.45;
  }
  if (distance === 1) {
    return 0.22;
  }
  return 0.08;
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function getVerticalLayerBiomeWeights(z: number): VerticalLayerBiomeWeights {
  const vertical: Record<BiomeVerticalClass, number> = {
    regular: 1,
    subterranean: 0.05,
    sky: 0.03,
    special: 0.18,
  };
  const thermal: Record<BiomeThermalClass, number> = {
    hot: 1,
    cold: 1,
    temperate: 1,
    neutral: 1,
  };

  if (z < 0) {
    const depth = Math.abs(z);
    vertical.regular = depth <= 1 ? 0.9 : lerp(0.9, 0.58, Math.min(depth - 1, 19) / 19);
    vertical.subterranean =
      depth <= 1
        ? 1.25
        : depth <= 5
          ? lerp(1, 2.7, (depth - 1) / 4)
          : depth <= 10
            ? lerp(2.7, 8.2, (depth - 5) / 5)
            : lerp(8.2, 14, Math.min(depth - 10, 15) / 15);
    vertical.sky = 0.02;
    thermal.cold = Math.max(0.12, 1 - depth * 0.07);
    thermal.hot = depth <= 9 ? 1 : 1 + Math.min(3.4, (depth - 9) * 0.24);
    thermal.temperate = Math.max(0.55, 1 - depth * 0.025);
  } else if (z > 0) {
    const height = z;
    vertical.regular = height <= 1 ? 0.88 : lerp(0.88, 0.5, Math.min(height - 1, 19) / 19);
    vertical.sky =
      height <= 1
        ? 2.4
        : height <= 5
          ? lerp(2.4, 10.5, (height - 1) / 4)
          : height <= 10
            ? lerp(10.5, 14, (height - 5) / 5)
            : lerp(14, 18, Math.min(height - 10, 15) / 15);
    vertical.subterranean = 0.02;
    thermal.cold = height < 10 ? 0.48 + height * 0.045 : 1 + Math.min(3.2, (height - 10) * 0.28);
    thermal.hot = Math.max(0.22, 1 - height * 0.055);
    thermal.temperate = Math.max(0.62, 1 - height * 0.02);
  }

  return { vertical, thermal };
}

export class SeededBiomeMap implements BiomeMap {
  private readonly cache = new Map<string, BiomeDefinition>();

  constructor(
    private readonly identity: WorldGenerationIdentity = createWorldGenerationIdentity(),
  ) {}

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
    const layerWeights = getVerticalLayerBiomeWeights(z);
    const selectedVerticalClass = pickSeededVerticalClass(
      layerWeights.vertical,
      regionX,
      regionY,
      z,
      this.identity,
    );
    const candidates = getAllBiomeDefinitions()
      .filter((biome) => biome.generation && biome.id !== 'home-hearth')
      .filter((biome) =>
        z === HELL_ESCAPE_DEPTH
          ? biome.temperatureHazard === 'hot'
          : zHardAllowed(biome.generation!, z),
      );

    const scored = candidates.map((biome) => ({
      biome,
      score: this.scoreBiome(
        biome,
        climate,
        regionX,
        regionY,
        z,
        layerWeights,
        selectedVerticalClass,
      ),
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
    layerWeights: VerticalLayerBiomeWeights,
    selectedVerticalClass: BiomeVerticalClass | null,
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
        : climateFit(climate.weirdness, profile.idealWeirdness, profile.weirdnessTolerance ?? 0.75);
    const distanceRooms = Math.hypot(regionX * REGION_SIZE_ROOMS, regionY * REGION_SIZE_ROOMS);
    if (
      profile.minDistanceFromOrigin !== undefined &&
      distanceRooms < profile.minDistanceFromOrigin
    ) {
      return 0;
    }
    if (
      profile.maxDistanceFromOrigin !== undefined &&
      distanceRooms > profile.maxDistanceFromOrigin
    ) {
      return 0;
    }
    const verticalClass = getBiomeVerticalClass(biome);
    const thermalClass = getBiomeThermalClass(biome);
    const verticalBias = layerWeights.vertical[verticalClass] ?? 1;
    const thermalBias = layerWeights.thermal[thermalClass] ?? 1;
    const verticalSelectionBias = verticalClassSelectionMultiplier(
      selectedVerticalClass,
      verticalClass,
    );
    const strataNoveltyBias = verticalStrataNoveltyMultiplier(
      biome,
      regionX,
      regionY,
      z,
      this.identity,
    );
    const oceanBias = biome.family === 'ocean' && z !== 0 ? 0.55 : 1;
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
      softAllowedZMultiplier(profile, z) *
      verticalBias *
      verticalSelectionBias *
      strataNoveltyBias *
      thermalBias *
      oceanBias *
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
