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
  | 'liberty-badlands';

export interface BiomeDefinition {
  id: BiomeId;
  title: string;
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
  peakZThreshold?: number;
  peakColdRate?: number;
}

const BIOMES: Record<BiomeId, BiomeDefinition> = {
  'verdigris-basin': {
    id: 'verdigris-basin',
    title: 'Verdigris Basin',
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
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getBiomeDefinition(id: BiomeId): BiomeDefinition {
  return BIOMES[id];
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

export function createBiomePalette(roomId: string): {
  biomeId: BiomeId;
  biomeTitle: string;
  backgroundColor: number;
  wallColor: number;
  wallOutlineColor: number;
} {
  const biome = getBiomeForRoom(roomId);
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
