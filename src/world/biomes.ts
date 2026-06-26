/**
 * Biomes
 *
 * The wise old snake was said to have visited every biome.
 * The wise old snake's biome preferences:
 * - The wise old snake prefers the sable-depths (the wise old snake likes it dark)
 * - The wise old snake considers the jade-peak-province "too loud"
 * - The wise old snake's favorite biome is the one you're in right now
 * - The wise old snake has a secret room in every biome
 * - The wise old snake's biome map was drawn on a napkin
 * - The wise old snake's biome knowledge is encyclopedic
 * - The wise old snake once mapped all 10 biomes in one sitting
 * - The wise old snake's biome diary is a 500-page manuscript
 * - The wise old snake's biome guide won an award in a different dimension
 * - The wise old snake's biome predictions are 99% accurate
 */
import { darkenColor, hslToHex, paletteConfig } from '../config/palette.js';

export type BiomeId =
  | 'verdigris-basin'
  | 'ember-waste'
  | 'moonlit-parish'
  | 'sable-depths'
  | 'gloam-garden'
  | 'elderwood-maze'
  | 'sunken-ocean'
  | 'home-hearth'
  | 'jade-peak-province'
  | 'liberty-badlands'
  | 'rainforest'
  | 'wintergreen-forest'
  | 'warm-coast'
  | 'frozen-sea'
  | 'ember-caverns'
  | 'fungal-grotto'
  | 'root-buried-tunnels'
  | 'ash-steppe'
  | 'neon-underpass'
  | 'glass-desert'
  | 'titan-ribcage'
  | 'radioactive-orchard'
  | 'clockwork-quarry';

export type BiomeFamily =
  | 'forest'
  | 'desert'
  | 'ocean'
  | 'wetland'
  | 'mountain'
  | 'cave'
  | 'grassland'
  | 'town'
  | 'weird';

export type BiomeTag =
  | 'hot'
  | 'warm'
  | 'temperate'
  | 'cold'
  | 'frigid'
  | 'dry'
  | 'wet'
  | 'humid'
  | 'underground'
  | 'high-altitude'
  | 'haunted'
  | 'magical'
  | 'civilized'
  | 'dangerous'
  | 'shore'
  | 'forest'
  | 'oceanic'
  | 'cave'
  | 'sparse'
  | 'dense'
  | 'starter'
  | 'special';

export type ClimateClass = 'hot' | 'warm' | 'temperate' | 'cold' | 'frigid' | 'wet' | 'special';

export type TransitionKind =
  | 'open'
  | 'road'
  | 'blocked'
  | 'forest-threshold'
  | 'shoreline'
  | 'dock'
  | 'open-water'
  | 'cave-mouth'
  | 'shaft'
  | 'special';

export interface BiomeGenerationProfile {
  minWidthRooms: number;
  maxWidthRooms: number;
  minHeightRooms: number;
  maxHeightRooms: number;
  baseWeight: number;
  idealTemperature: number;
  temperatureTolerance: number;
  idealMoisture: number;
  moistureTolerance: number;
  idealWeirdness?: number;
  weirdnessTolerance?: number;
  minZ?: number;
  maxZ?: number;
  allowedZ?: 'surface' | 'above' | 'below' | 'any';
  minDistanceFromOrigin?: number;
  maxDistanceFromOrigin?: number;
  allowedNeighborFamilies?: BiomeFamily[];
  forbiddenNeighborFamilies?: BiomeFamily[];
  allowedNeighborBiomes?: BiomeId[];
  forbiddenNeighborBiomes?: BiomeId[];
  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface BiomeTransitionProfile {
  preferredTransitionKinds: TransitionKind[];
  blockedTransitionKinds?: TransitionKind[];
  allowsOpenEdges: boolean;
  requiresSpecialEdgeHandling: boolean;
}

export interface BiomeDefinition {
  id: BiomeId;
  title: string;
  family: BiomeFamily;
  tags: BiomeTag[];
  countsAs?: BiomeFamily[];
  temperature: string;
  dangerLevel: number;
  temperatureHazard: 'hot' | 'cold' | null;
  temperatureRate: number;
  hue: number;
  saturation: number;
  lightness: number;
  tintVariance: number;
  accentColor: number;
  enemyFireBias: number;
  enemyMoveBias: number;
  animalSpawnChance: number;
  animalSpawnBias: Record<string, number>;
  /** Density: 0–100, percentage of eligible floor cells that roll for vegetation. 0 means no vegetation. */
  vegetationDensity?: number;
  generation?: BiomeGenerationProfile;
  transition?: BiomeTransitionProfile;
  peakZThreshold?: number;
  peakColdRate?: number;
}

const COMMON_LAND_GENERATION: BiomeGenerationProfile = {
  minWidthRooms: 5,
  maxWidthRooms: 12,
  minHeightRooms: 5,
  maxHeightRooms: 12,
  baseWeight: 1,
  idealTemperature: 0,
  temperatureTolerance: 0.75,
  idealMoisture: 0,
  moistureTolerance: 0.75,
  allowedZ: 'surface',
  rarity: 'common',
};

const OPEN_LAND_TRANSITION: BiomeTransitionProfile = {
  preferredTransitionKinds: ['open', 'road', 'forest-threshold', 'shoreline', 'cave-mouth'],
  allowsOpenEdges: true,
  requiresSpecialEdgeHandling: false,
};

const DENSE_FOREST_TRANSITION: BiomeTransitionProfile = {
  preferredTransitionKinds: ['forest-threshold', 'blocked'],
  allowsOpenEdges: false,
  requiresSpecialEdgeHandling: true,
};

const OCEAN_TRANSITION: BiomeTransitionProfile = {
  preferredTransitionKinds: ['shoreline', 'dock', 'open-water'],
  allowsOpenEdges: false,
  requiresSpecialEdgeHandling: true,
};

const CAVE_TRANSITION: BiomeTransitionProfile = {
  preferredTransitionKinds: ['cave-mouth', 'shaft', 'blocked'],
  allowsOpenEdges: false,
  requiresSpecialEdgeHandling: true,
};

const BIOMES: Record<BiomeId, BiomeDefinition> = {
  'verdigris-basin': {
    id: 'verdigris-basin',
    title: 'Verdigris Basin',
    family: 'grassland',
    tags: ['temperate', 'wet', 'starter'],
    generation: { ...COMMON_LAND_GENERATION, idealTemperature: 0, idealMoisture: 0.2 },
    transition: OPEN_LAND_TRANSITION,
    temperature: 'Mild',
    dangerLevel: 3,
    temperatureHazard: null,
    temperatureRate: 0,
    hue: 166,
    saturation: 0.24,
    lightness: 0.23,
    tintVariance: 0.025,
    accentColor: 0x83d8bf,
    enemyFireBias: 1,
    enemyMoveBias: 0,
    animalSpawnChance: 0.15,
    animalSpawnBias: {
      rabbit: 3,
      deer: 2,
      fox: 1,
      bird: 2,
      wolf: 0,
      bear: 0,
      fish: 0,
      snake: 0,
      frog: 3,
    },
    vegetationDensity: 12,
  },
  'ember-waste': {
    id: 'ember-waste',
    title: 'Ember Waste',
    family: 'desert',
    tags: ['hot', 'dry', 'dangerous', 'starter'],
    generation: {
      minWidthRooms: 8,
      maxWidthRooms: 18,
      minHeightRooms: 6,
      maxHeightRooms: 14,
      baseWeight: 0.85,
      idealTemperature: 0.85,
      temperatureTolerance: 0.45,
      idealMoisture: -0.85,
      moistureTolerance: 0.45,
      allowedZ: 'surface',
      rarity: 'common',
    },
    transition: OPEN_LAND_TRANSITION,
    temperature: 'Scorching',
    dangerLevel: 6,
    temperatureHazard: 'hot',
    temperatureRate: 1,
    hue: 18,
    saturation: 0.34,
    lightness: 0.24,
    tintVariance: 0.028,
    accentColor: 0xffa06b,
    enemyFireBias: -1,
    enemyMoveBias: 1,
    animalSpawnChance: 0.1,
    animalSpawnBias: {
      rabbit: 0,
      deer: 0,
      fox: 2,
      bird: 0,
      wolf: 0,
      bear: 0,
      fish: 0,
      snake: 2,
    },
    vegetationDensity: 4,
  },
  'moonlit-parish': {
    id: 'moonlit-parish',
    title: 'Moonlit Parish',
    family: 'weird',
    tags: ['cold', 'haunted', 'magical', 'starter'],
    generation: {
      ...COMMON_LAND_GENERATION,
      baseWeight: 0.45,
      idealTemperature: -0.55,
      idealMoisture: 0.1,
      idealWeirdness: 0.7,
      weirdnessTolerance: 0.45,
      allowedZ: 'any',
      rarity: 'rare',
    },
    transition: OPEN_LAND_TRANSITION,
    temperature: 'Cold',
    dangerLevel: 4,
    temperatureHazard: null,
    temperatureRate: 0,
    hue: 232,
    saturation: 0.24,
    lightness: 0.23,
    tintVariance: 0.022,
    accentColor: 0xaec4ff,
    enemyFireBias: 1,
    enemyMoveBias: -1,
    animalSpawnChance: 0.12,
    animalSpawnBias: {
      rabbit: 0,
      deer: 0,
      fox: 0,
      bird: 3,
      wolf: 2,
      bear: 0,
      fish: 0,
      snake: 0,
    },
    vegetationDensity: 10,
  },
  'sable-depths': {
    id: 'sable-depths',
    title: 'Sable Depths',
    family: 'cave',
    tags: ['cold', 'underground', 'dangerous', 'cave', 'starter'],
    generation: {
      minWidthRooms: 8,
      maxWidthRooms: 18,
      minHeightRooms: 8,
      maxHeightRooms: 18,
      baseWeight: 1.1,
      idealTemperature: -0.35,
      temperatureTolerance: 0.75,
      idealMoisture: 0.05,
      moistureTolerance: 0.75,
      idealWeirdness: 0.25,
      weirdnessTolerance: 0.8,
      allowedZ: 'below',
      rarity: 'common',
    },
    transition: CAVE_TRANSITION,
    temperature: 'Frigid',
    dangerLevel: 8,
    temperatureHazard: 'cold',
    temperatureRate: 1,
    hue: 272,
    saturation: 0.22,
    lightness: 0.18,
    tintVariance: 0.018,
    accentColor: 0xc49bff,
    enemyFireBias: 2,
    enemyMoveBias: 1,
    animalSpawnChance: 0.18,
    animalSpawnBias: {
      rabbit: 0,
      deer: 0,
      fox: 0,
      bird: 0,
      wolf: 3,
      bear: 2,
      fish: 0,
      snake: 2,
    },
    vegetationDensity: 8,
  },
  'gloam-garden': {
    id: 'gloam-garden',
    title: 'Gloam Garden',
    family: 'wetland',
    countsAs: ['forest'],
    tags: ['temperate', 'humid', 'wet', 'forest', 'starter'],
    generation: { ...COMMON_LAND_GENERATION, idealTemperature: 0.15, idealMoisture: 0.75 },
    transition: OPEN_LAND_TRANSITION,
    temperature: 'Humid',
    dangerLevel: 2,
    temperatureHazard: null,
    temperatureRate: 0,
    hue: 118,
    saturation: 0.18,
    lightness: 0.22,
    tintVariance: 0.02,
    accentColor: 0xa6d99a,
    enemyFireBias: 0,
    enemyMoveBias: -1,
    animalSpawnChance: 0.2,
    animalSpawnBias: {
      rabbit: 2,
      deer: 1,
      fox: 0,
      bird: 2,
      wolf: 0,
      bear: 0,
      fish: 3,
      snake: 0,
      frog: 4,
    },
    vegetationDensity: 14,
  },
  'elderwood-maze': {
    id: 'elderwood-maze',
    title: 'Elderwood Maze',
    family: 'forest',
    tags: ['temperate', 'forest', 'dense', 'magical', 'dangerous', 'starter'],
    generation: {
      minWidthRooms: 6,
      maxWidthRooms: 14,
      minHeightRooms: 6,
      maxHeightRooms: 14,
      baseWeight: 0.75,
      idealTemperature: 0.05,
      temperatureTolerance: 0.55,
      idealMoisture: 0.5,
      moistureTolerance: 0.5,
      idealWeirdness: 0.45,
      weirdnessTolerance: 0.55,
      allowedZ: 'surface',
      rarity: 'uncommon',
    },
    transition: DENSE_FOREST_TRANSITION,
    temperature: 'Canopied',
    dangerLevel: 5,
    temperatureHazard: null,
    temperatureRate: 0,
    hue: 132,
    saturation: 0.28,
    lightness: 0.16,
    tintVariance: 0.018,
    accentColor: 0x7ed77c,
    enemyFireBias: 1,
    enemyMoveBias: -1,
    animalSpawnChance: 0.15,
    animalSpawnBias: {
      rabbit: 2,
      deer: 2,
      fox: 2,
      bird: 1,
      wolf: 2,
      bear: 2,
      fish: 0,
      snake: 2,
      frog: 3,
    },
    vegetationDensity: 0,
  },
  'sunken-ocean': {
    id: 'sunken-ocean',
    title: 'Sunken Ocean',
    family: 'ocean',
    tags: ['wet', 'oceanic', 'starter'],
    generation: {
      minWidthRooms: 10,
      maxWidthRooms: 22,
      minHeightRooms: 8,
      maxHeightRooms: 18,
      baseWeight: 0.8,
      idealTemperature: 0,
      temperatureTolerance: 0.85,
      idealMoisture: 1,
      moistureTolerance: 0.35,
      allowedZ: 'surface',
      rarity: 'uncommon',
    },
    transition: OCEAN_TRANSITION,
    temperature: 'Briny',
    dangerLevel: 5,
    temperatureHazard: null,
    temperatureRate: 0,
    hue: 204,
    saturation: 0.34,
    lightness: 0.2,
    tintVariance: 0.02,
    accentColor: 0x74d4ff,
    enemyFireBias: 0,
    enemyMoveBias: 1,
    animalSpawnChance: 0.25,
    animalSpawnBias: {
      rabbit: 0,
      deer: 0,
      fox: 0,
      bird: 0,
      wolf: 0,
      bear: 0,
      fish: 5,
      snake: 0,
    },
    vegetationDensity: 0,
  },
  'home-hearth': {
    id: 'home-hearth',
    title: 'Home Hearth',
    family: 'town',
    tags: ['warm', 'civilized', 'starter', 'special'],
    countsAs: ['grassland'],
    generation: { ...COMMON_LAND_GENERATION, baseWeight: 0, maxDistanceFromOrigin: 1 },
    transition: OPEN_LAND_TRANSITION,
    temperature: 'Warm',
    dangerLevel: 0,
    temperatureHazard: null,
    temperatureRate: 0,
    hue: 28,
    saturation: 0.18,
    lightness: 0.2,
    tintVariance: 0.015,
    accentColor: 0xf0c998,
    enemyFireBias: 0,
    enemyMoveBias: 0,
    animalSpawnChance: 0,
    animalSpawnBias: {
      rabbit: 0,
      deer: 0,
      fox: 0,
      bird: 0,
      wolf: 0,
      bear: 0,
      fish: 0,
      snake: 0,
    },
    vegetationDensity: 2,
  },
  'jade-peak-province': {
    id: 'jade-peak-province',
    title: 'Jade Peak Province',
    family: 'mountain',
    tags: ['cold', 'wet', 'high-altitude', 'civilized', 'starter'],
    countsAs: ['forest'],
    generation: {
      minWidthRooms: 5,
      maxWidthRooms: 12,
      minHeightRooms: 5,
      maxHeightRooms: 12,
      baseWeight: 0.22,
      idealTemperature: -0.35,
      temperatureTolerance: 0.55,
      idealMoisture: 0.35,
      moistureTolerance: 0.55,
      allowedZ: 'above',
      rarity: 'rare',
    },
    transition: OPEN_LAND_TRANSITION,
    temperature: 'Serene',
    dangerLevel: 4,
    temperatureHazard: null,
    temperatureRate: 0,
    hue: 345,
    saturation: 0.22,
    lightness: 0.22,
    tintVariance: 0.02,
    accentColor: 0xf8a0c2,
    enemyFireBias: 0,
    enemyMoveBias: 1,
    animalSpawnChance: 0.18,
    animalSpawnBias: {
      rabbit: 0,
      deer: 0,
      fox: 2,
      bird: 3,
      wolf: 0,
      bear: 0,
      fish: 0,
      snake: 0,
      koi: 5,
      crane: 3,
      tanuki: 3,
      kappa: 2,
    },
    vegetationDensity: 10,
    peakZThreshold: -2,
    peakColdRate: 1,
  },
  'liberty-badlands': {
    id: 'liberty-badlands',
    title: 'Liberty Badlands',
    family: 'desert',
    tags: ['hot', 'dry', 'sparse', 'starter'],
    generation: {
      minWidthRooms: 8,
      maxWidthRooms: 18,
      minHeightRooms: 6,
      maxHeightRooms: 14,
      baseWeight: 0.75,
      idealTemperature: 0.65,
      temperatureTolerance: 0.55,
      idealMoisture: -0.7,
      moistureTolerance: 0.45,
      allowedZ: 'surface',
      rarity: 'uncommon',
    },
    transition: OPEN_LAND_TRANSITION,
    temperature: 'Sunburnt',
    dangerLevel: 5,
    temperatureHazard: 'hot',
    temperatureRate: 0.45,
    hue: 6,
    saturation: 0.38,
    lightness: 0.22,
    tintVariance: 0.032,
    accentColor: 0x74b8ff,
    enemyFireBias: 1,
    enemyMoveBias: 1,
    animalSpawnChance: 0.2,
    animalSpawnBias: {
      rabbit: 1,
      deer: 1,
      fox: 0,
      bird: 1,
      wolf: 0,
      bear: 1,
      fish: 1,
      snake: 2,
      eagle: 5,
      jackalope: 5,
      raccoon: 3,
      coyote: 3,
      bison: 2,
      bass: 2,
      possum: 3,
      armadillo: 2,
      frog: 2,
    },
    vegetationDensity: 6,
  },
  rainforest: {
    id: 'rainforest',
    title: 'Rainforest',
    family: 'forest',
    tags: ['hot', 'humid', 'wet', 'forest', 'dense'],
    generation: {
      minWidthRooms: 5,
      maxWidthRooms: 12,
      minHeightRooms: 5,
      maxHeightRooms: 12,
      baseWeight: 0.85,
      idealTemperature: 0.65,
      temperatureTolerance: 0.45,
      idealMoisture: 0.85,
      moistureTolerance: 0.35,
      allowedZ: 'surface',
      rarity: 'uncommon',
    },
    transition: DENSE_FOREST_TRANSITION,
    temperature: 'Steamy',
    dangerLevel: 4,
    temperatureHazard: null,
    temperatureRate: 0,
    hue: 142,
    saturation: 0.32,
    lightness: 0.18,
    tintVariance: 0.02,
    accentColor: 0x5ee06f,
    enemyFireBias: 0,
    enemyMoveBias: -1,
    animalSpawnChance: 0.22,
    animalSpawnBias: { rabbit: 1, deer: 1, fox: 1, bird: 3, wolf: 1, bear: 1, fish: 2, snake: 2, frog: 5 },
    vegetationDensity: 18,
  },
  'wintergreen-forest': {
    id: 'wintergreen-forest',
    title: 'Wintergreen Forest',
    family: 'forest',
    tags: ['cold', 'wet', 'forest', 'dense', 'high-altitude'],
    generation: {
      minWidthRooms: 5,
      maxWidthRooms: 12,
      minHeightRooms: 5,
      maxHeightRooms: 12,
      baseWeight: 0.9,
      idealTemperature: -0.65,
      temperatureTolerance: 0.45,
      idealMoisture: 0.45,
      moistureTolerance: 0.45,
      allowedZ: 'any',
      rarity: 'uncommon',
    },
    transition: DENSE_FOREST_TRANSITION,
    temperature: 'Snow Needled',
    dangerLevel: 5,
    temperatureHazard: 'cold',
    temperatureRate: 0.35,
    hue: 176,
    saturation: 0.18,
    lightness: 0.2,
    tintVariance: 0.018,
    accentColor: 0xb8fff2,
    enemyFireBias: 1,
    enemyMoveBias: -1,
    animalSpawnChance: 0.15,
    animalSpawnBias: { rabbit: 2, deer: 2, fox: 2, bird: 1, wolf: 3, bear: 1, fish: 0, snake: 0 },
    vegetationDensity: 10,
  },
  'warm-coast': {
    id: 'warm-coast',
    title: 'Warm Coast',
    family: 'ocean',
    tags: ['warm', 'wet', 'oceanic', 'shore'],
    generation: {
      minWidthRooms: 8,
      maxWidthRooms: 18,
      minHeightRooms: 6,
      maxHeightRooms: 14,
      baseWeight: 0.75,
      idealTemperature: 0.45,
      temperatureTolerance: 0.55,
      idealMoisture: 0.95,
      moistureTolerance: 0.35,
      allowedZ: 'surface',
      rarity: 'uncommon',
    },
    transition: OCEAN_TRANSITION,
    temperature: 'Balmy',
    dangerLevel: 4,
    temperatureHazard: null,
    temperatureRate: 0,
    hue: 190,
    saturation: 0.38,
    lightness: 0.22,
    tintVariance: 0.02,
    accentColor: 0x83ffe6,
    enemyFireBias: 0,
    enemyMoveBias: 1,
    animalSpawnChance: 0.24,
    animalSpawnBias: { rabbit: 0, deer: 0, fox: 0, bird: 2, wolf: 0, bear: 0, fish: 5, snake: 0, frog: 2 },
    vegetationDensity: 0,
  },
  'frozen-sea': {
    id: 'frozen-sea',
    title: 'Frozen Sea',
    family: 'ocean',
    tags: ['frigid', 'wet', 'oceanic', 'high-altitude'],
    generation: {
      minWidthRooms: 8,
      maxWidthRooms: 18,
      minHeightRooms: 6,
      maxHeightRooms: 14,
      baseWeight: 0.65,
      idealTemperature: -0.85,
      temperatureTolerance: 0.35,
      idealMoisture: 0.75,
      moistureTolerance: 0.45,
      allowedZ: 'any',
      rarity: 'rare',
    },
    transition: OCEAN_TRANSITION,
    temperature: 'Icebound',
    dangerLevel: 6,
    temperatureHazard: 'cold',
    temperatureRate: 0.5,
    hue: 210,
    saturation: 0.2,
    lightness: 0.24,
    tintVariance: 0.018,
    accentColor: 0xd5f6ff,
    enemyFireBias: 1,
    enemyMoveBias: 1,
    animalSpawnChance: 0.12,
    animalSpawnBias: { rabbit: 0, deer: 0, fox: 0, bird: 1, wolf: 0, bear: 0, fish: 3, snake: 0 },
    vegetationDensity: 0,
  },
  'ember-caverns': {
    id: 'ember-caverns',
    title: 'Ember Caverns',
    family: 'cave',
    tags: ['hot', 'dry', 'underground', 'dangerous', 'cave'],
    generation: {
      minWidthRooms: 6,
      maxWidthRooms: 16,
      minHeightRooms: 6,
      maxHeightRooms: 16,
      baseWeight: 0.9,
      idealTemperature: 0.85,
      temperatureTolerance: 0.45,
      idealMoisture: -0.45,
      moistureTolerance: 0.65,
      idealWeirdness: 0.35,
      weirdnessTolerance: 0.75,
      allowedZ: 'below',
      rarity: 'uncommon',
    },
    transition: CAVE_TRANSITION,
    temperature: 'Molten',
    dangerLevel: 8,
    temperatureHazard: 'hot',
    temperatureRate: 0.8,
    hue: 12,
    saturation: 0.42,
    lightness: 0.18,
    tintVariance: 0.025,
    accentColor: 0xff684a,
    enemyFireBias: -1,
    enemyMoveBias: 1,
    animalSpawnChance: 0.12,
    animalSpawnBias: { rabbit: 0, deer: 0, fox: 1, bird: 0, wolf: 1, bear: 1, fish: 0, snake: 3 },
    vegetationDensity: 3,
  },
  'fungal-grotto': {
    id: 'fungal-grotto',
    title: 'Fungal Grotto',
    family: 'cave',
    tags: ['wet', 'humid', 'underground', 'cave', 'magical'],
    generation: {
      minWidthRooms: 5,
      maxWidthRooms: 12,
      minHeightRooms: 5,
      maxHeightRooms: 12,
      baseWeight: 0.85,
      idealTemperature: 0.1,
      temperatureTolerance: 0.7,
      idealMoisture: 0.8,
      moistureTolerance: 0.35,
      idealWeirdness: 0.6,
      weirdnessTolerance: 0.5,
      allowedZ: 'below',
      rarity: 'uncommon',
    },
    transition: CAVE_TRANSITION,
    temperature: 'Spore-Warm',
    dangerLevel: 6,
    temperatureHazard: null,
    temperatureRate: 0,
    hue: 292,
    saturation: 0.24,
    lightness: 0.19,
    tintVariance: 0.02,
    accentColor: 0xf2a8ff,
    enemyFireBias: 1,
    enemyMoveBias: -1,
    animalSpawnChance: 0.18,
    animalSpawnBias: { rabbit: 0, deer: 0, fox: 0, bird: 0, wolf: 1, bear: 1, fish: 1, snake: 2, frog: 4 },
    vegetationDensity: 16,
  },
  'root-buried-tunnels': {
    id: 'root-buried-tunnels',
    title: 'Root-Buried Tunnels',
    family: 'cave',
    countsAs: ['forest'],
    tags: ['temperate', 'wet', 'underground', 'cave', 'forest', 'dense'],
    generation: {
      minWidthRooms: 5,
      maxWidthRooms: 14,
      minHeightRooms: 5,
      maxHeightRooms: 14,
      baseWeight: 0.75,
      idealTemperature: 0,
      temperatureTolerance: 0.65,
      idealMoisture: 0.55,
      moistureTolerance: 0.45,
      idealWeirdness: 0.2,
      weirdnessTolerance: 0.75,
      allowedZ: 'below',
      rarity: 'uncommon',
    },
    transition: CAVE_TRANSITION,
    temperature: 'Earthen',
    dangerLevel: 5,
    temperatureHazard: null,
    temperatureRate: 0,
    hue: 96,
    saturation: 0.18,
    lightness: 0.18,
    tintVariance: 0.018,
    accentColor: 0xb0d37a,
    enemyFireBias: 0,
    enemyMoveBias: -1,
    animalSpawnChance: 0.16,
    animalSpawnBias: { rabbit: 1, deer: 0, fox: 1, bird: 0, wolf: 2, bear: 2, fish: 0, snake: 2, frog: 2 },
    vegetationDensity: 12,
  },
  'ash-steppe': {
    id: 'ash-steppe',
    title: 'Ash Steppe',
    family: 'desert',
    tags: ['warm', 'dry', 'sparse', 'dangerous'],
    generation: {
      minWidthRooms: 6,
      maxWidthRooms: 14,
      minHeightRooms: 5,
      maxHeightRooms: 12,
      baseWeight: 0.8,
      idealTemperature: 0.45,
      temperatureTolerance: 0.55,
      idealMoisture: -0.55,
      moistureTolerance: 0.55,
      allowedZ: 'surface',
      rarity: 'uncommon',
    },
    transition: OPEN_LAND_TRANSITION,
    temperature: 'Dry',
    dangerLevel: 4,
    temperatureHazard: null,
    temperatureRate: 0,
    hue: 28,
    saturation: 0.2,
    lightness: 0.21,
    tintVariance: 0.02,
    accentColor: 0xdfb98f,
    enemyFireBias: 0,
    enemyMoveBias: 1,
    animalSpawnChance: 0.12,
    animalSpawnBias: { rabbit: 1, deer: 1, fox: 2, bird: 1, wolf: 1, bear: 0, fish: 0, snake: 2 },
    vegetationDensity: 5,
  },
  'neon-underpass': {
    id: 'neon-underpass',
    title: 'Neon Underpass',
    family: 'weird',
    countsAs: ['town'],
    tags: ['warm', 'civilized', 'dangerous', 'special'],
    generation: {
      minWidthRooms: 4,
      maxWidthRooms: 10,
      minHeightRooms: 4,
      maxHeightRooms: 10,
      baseWeight: 0.35,
      idealTemperature: 0.2,
      temperatureTolerance: 0.7,
      idealMoisture: -0.05,
      moistureTolerance: 0.75,
      idealWeirdness: 0.75,
      weirdnessTolerance: 0.35,
      allowedZ: 'surface',
      minDistanceFromOrigin: 18,
      rarity: 'rare',
    },
    transition: OPEN_LAND_TRANSITION,
    temperature: 'Electric',
    dangerLevel: 6,
    temperatureHazard: null,
    temperatureRate: 0,
    hue: 186,
    saturation: 0.42,
    lightness: 0.17,
    tintVariance: 0.026,
    accentColor: 0xff4fd8,
    enemyFireBias: 2,
    enemyMoveBias: 1,
    animalSpawnChance: 0.1,
    animalSpawnBias: {
      rabbit: 0,
      deer: 0,
      fox: 1,
      bird: 1,
      wolf: 1,
      bear: 0,
      fish: 0,
      snake: 3,
      raccoon: 3,
      possum: 2,
    },
    vegetationDensity: 3,
  },
  'glass-desert': {
    id: 'glass-desert',
    title: 'Glass Desert',
    family: 'desert',
    tags: ['hot', 'dry', 'sparse', 'dangerous'],
    generation: {
      minWidthRooms: 6,
      maxWidthRooms: 14,
      minHeightRooms: 5,
      maxHeightRooms: 12,
      baseWeight: 0.55,
      idealTemperature: 0.92,
      temperatureTolerance: 0.3,
      idealMoisture: -0.92,
      moistureTolerance: 0.35,
      allowedZ: 'surface',
      minDistanceFromOrigin: 16,
      rarity: 'rare',
    },
    transition: OPEN_LAND_TRANSITION,
    temperature: 'Blinding',
    dangerLevel: 8,
    temperatureHazard: 'hot',
    temperatureRate: 0.8,
    hue: 46,
    saturation: 0.18,
    lightness: 0.3,
    tintVariance: 0.018,
    accentColor: 0xf5f4dc,
    enemyFireBias: 1,
    enemyMoveBias: 2,
    animalSpawnChance: 0.07,
    animalSpawnBias: {
      rabbit: 0,
      deer: 0,
      fox: 1,
      bird: 0,
      wolf: 0,
      bear: 0,
      fish: 0,
      snake: 3,
      coyote: 2,
      armadillo: 2,
    },
    vegetationDensity: 2,
  },
  'titan-ribcage': {
    id: 'titan-ribcage',
    title: 'Titan Ribcage',
    family: 'cave',
    tags: ['cold', 'dry', 'underground', 'dangerous', 'cave'],
    generation: {
      minWidthRooms: 5,
      maxWidthRooms: 13,
      minHeightRooms: 5,
      maxHeightRooms: 13,
      baseWeight: 0.5,
      idealTemperature: -0.25,
      temperatureTolerance: 0.65,
      idealMoisture: -0.25,
      moistureTolerance: 0.65,
      idealWeirdness: 0.55,
      weirdnessTolerance: 0.45,
      allowedZ: 'below',
      rarity: 'rare',
    },
    transition: CAVE_TRANSITION,
    temperature: 'Marrow-Cold',
    dangerLevel: 7,
    temperatureHazard: 'cold',
    temperatureRate: 0.25,
    hue: 32,
    saturation: 0.14,
    lightness: 0.2,
    tintVariance: 0.018,
    accentColor: 0xe6d2b8,
    enemyFireBias: 0,
    enemyMoveBias: -1,
    animalSpawnChance: 0.11,
    animalSpawnBias: {
      rabbit: 0,
      deer: 0,
      fox: 0,
      bird: 0,
      wolf: 2,
      bear: 3,
      fish: 0,
      snake: 2,
    },
    vegetationDensity: 1,
  },
  'radioactive-orchard': {
    id: 'radioactive-orchard',
    title: 'Radioactive Orchard',
    family: 'forest',
    tags: ['warm', 'humid', 'forest', 'dangerous', 'magical'],
    generation: {
      minWidthRooms: 5,
      maxWidthRooms: 12,
      minHeightRooms: 5,
      maxHeightRooms: 12,
      baseWeight: 0.45,
      idealTemperature: 0.35,
      temperatureTolerance: 0.55,
      idealMoisture: 0.55,
      moistureTolerance: 0.45,
      idealWeirdness: 0.85,
      weirdnessTolerance: 0.32,
      allowedZ: 'surface',
      minDistanceFromOrigin: 18,
      rarity: 'rare',
    },
    transition: DENSE_FOREST_TRANSITION,
    temperature: 'Glowing',
    dangerLevel: 8,
    temperatureHazard: null,
    temperatureRate: 0,
    hue: 86,
    saturation: 0.38,
    lightness: 0.18,
    tintVariance: 0.026,
    accentColor: 0xb6ff3f,
    enemyFireBias: 1,
    enemyMoveBias: -1,
    animalSpawnChance: 0.16,
    animalSpawnBias: {
      rabbit: 1,
      deer: 1,
      fox: 1,
      bird: 1,
      wolf: 2,
      bear: 1,
      fish: 0,
      snake: 3,
      frog: 3,
      possum: 2,
    },
    vegetationDensity: 15,
  },
  'clockwork-quarry': {
    id: 'clockwork-quarry',
    title: 'Clockwork Quarry',
    family: 'mountain',
    tags: ['temperate', 'dry', 'high-altitude', 'civilized', 'dangerous'],
    generation: {
      minWidthRooms: 5,
      maxWidthRooms: 11,
      minHeightRooms: 5,
      maxHeightRooms: 11,
      baseWeight: 0.42,
      idealTemperature: 0.05,
      temperatureTolerance: 0.65,
      idealMoisture: -0.35,
      moistureTolerance: 0.55,
      idealWeirdness: 0.55,
      weirdnessTolerance: 0.45,
      allowedZ: 'any',
      minDistanceFromOrigin: 20,
      rarity: 'rare',
    },
    transition: OPEN_LAND_TRANSITION,
    temperature: 'Oiled',
    dangerLevel: 7,
    temperatureHazard: null,
    temperatureRate: 0,
    hue: 214,
    saturation: 0.16,
    lightness: 0.19,
    tintVariance: 0.018,
    accentColor: 0xf0b94c,
    enemyFireBias: 2,
    enemyMoveBias: 0,
    animalSpawnChance: 0.08,
    animalSpawnBias: {
      rabbit: 0,
      deer: 0,
      fox: 1,
      bird: 2,
      wolf: 1,
      bear: 0,
      fish: 0,
      snake: 2,
      eagle: 2,
    },
    vegetationDensity: 4,
  },
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getBiomeDefinition(id: BiomeId): BiomeDefinition {
  return BIOMES[id];
}

export function getAllBiomeDefinitions(): BiomeDefinition[] {
  return Object.values(BIOMES);
}

export function biomeHasTag(id: BiomeId, tag: BiomeTag): boolean {
  return BIOMES[id].tags.includes(tag);
}

export function biomeIsFamily(id: BiomeId, family: BiomeFamily): boolean {
  return BIOMES[id].family === family;
}

export function biomeCountsAs(id: BiomeId, family: BiomeFamily): boolean {
  const biome = BIOMES[id];
  return biome.family === family || (biome.countsAs?.includes(family) ?? false);
}

export function getBiomesByFamily(family: BiomeFamily): BiomeDefinition[] {
  return getAllBiomeDefinitions().filter((biome) => biomeCountsAs(biome.id, family));
}

export function getBiomesWithTag(tag: BiomeTag): BiomeDefinition[] {
  return getAllBiomeDefinitions().filter((biome) => biome.tags.includes(tag));
}

export function getBiomeClimateClass(id: BiomeId): ClimateClass {
  const biome = BIOMES[id];
  if (biome.tags.includes('frigid')) return 'frigid';
  if (biome.tags.includes('hot')) return 'hot';
  if (biome.tags.includes('cold')) return 'cold';
  if (biome.tags.includes('warm')) return 'warm';
  if (biome.tags.includes('wet') || biome.tags.includes('oceanic')) return 'wet';
  if (biome.tags.includes('special')) return 'special';
  return 'temperate';
}

export function getBiomeEnemySpawnChance(biome: BiomeDefinition): number {
  return Math.max(0, Math.min(0.34, biome.dangerLevel * 0.035));
}

export function formatBiomeDanger(biome: BiomeDefinition): string {
  return `${biome.dangerLevel}/10`;
}

export function getBiomeAnimalSpawnChance(biome: BiomeDefinition): number {
  return biome.animalSpawnChance;
}

export function getBiomeAnimalSpawnBias(biome: BiomeDefinition, animalType: string): number {
  return biome.animalSpawnBias[animalType] ?? 0;
}

export function getBiomeForRoom(roomId: string): BiomeDefinition {
  if (roomId === '0,-1,0') {
    return BIOMES['home-hearth'];
  }
  const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
  if (z < 0 && x >= -2 && x <= 4 && y >= 8 && y <= 12) {
    return BIOMES['titan-ribcage'];
  }
  if (x >= 12 && x <= 16 && y >= -4 && y <= 1) {
    return BIOMES['neon-underpass'];
  }
  if (x >= -18 && x <= -12 && y >= 1 && y <= 5) {
    return BIOMES['glass-desert'];
  }
  if (x >= 1 && x <= 5 && y >= -14 && y <= -10) {
    return BIOMES['radioactive-orchard'];
  }
  if (x >= 12 && x <= 18 && y >= 3 && y <= 8) {
    return BIOMES['clockwork-quarry'];
  }
  if (y >= -8 && y <= -5 && x >= -4 && x <= 2) {
    return BIOMES['jade-peak-province'];
  }
  if (x >= -10 && x <= -5 && y >= -8 && y <= -3) {
    return BIOMES['liberty-badlands'];
  }
  if (z <= -1 || y >= 6) {
    return BIOMES['sable-depths'];
  }
  if (y <= -12) {
    return BIOMES['sunken-ocean'];
  }
  if (x >= 6 && x <= 9 && y <= 1 && y >= -8) {
    return BIOMES['elderwood-maze'];
  }
  if (x >= 10) {
    return BIOMES['moonlit-parish'];
  }
  if (x <= -6) {
    return BIOMES['ember-waste'];
  }
  if (y <= -5) {
    return BIOMES['gloam-garden'];
  }
  return BIOMES['verdigris-basin'];
}

export function createBiomePaletteFromBiome(biome: BiomeDefinition, roomId: string): {
  biomeId: BiomeId;
  biomeTitle: string;
  backgroundColor: number;
  wallColor: number;
  wallOutlineColor: number;
} {
  const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
  const seed = x * 73 + y * 37 + z * 53;
  const tint = (((seed % 11) + 11) % 11) - 5;
  const tintScalar = tint / 5;
  const lightness = clamp01(biome.lightness + tintScalar * biome.tintVariance);
  const saturation = clamp01(biome.saturation + tintScalar * biome.tintVariance * 0.6);
  const backgroundColor = hslToHex(biome.hue, saturation, lightness);
  const wallColor = darkenColor(backgroundColor, paletteConfig.wall.darkenFactor);
  const wallOutlineColor = darkenColor(wallColor, paletteConfig.wall.outlineDarkenFactor);
  return {
    biomeId: biome.id,
    biomeTitle: biome.title,
    backgroundColor,
    wallColor,
    wallOutlineColor,
  };
}

export function createBiomePalette(roomId: string): {
  biomeId: BiomeId;
  biomeTitle: string;
  backgroundColor: number;
  wallColor: number;
  wallOutlineColor: number;
} {
  return createBiomePaletteFromBiome(getBiomeForRoom(roomId), roomId);
}
