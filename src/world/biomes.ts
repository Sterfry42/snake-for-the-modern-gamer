import { darkenColor, hslToHex, paletteConfig } from '../config/palette.js';

export type BiomeId =
  | 'verdigris-basin'
  | 'ember-waste'
  | 'moonlit-parish'
  | 'sable-depths'
  | 'gloam-garden'
  | 'elderwood-maze'
  | 'sunken-ocean'
  | 'home-hearth';

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

export function getBiomeForRoom(roomId: string): BiomeDefinition {
  if (roomId === '0,-1,0') {
    return BIOMES['home-hearth'];
  }
  const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
  if (z <= -1 || y >= 2) {
    return BIOMES['sable-depths'];
  }
  if (y <= -9) {
    return BIOMES['sunken-ocean'];
  }
  if (x >= 3 && y <= -1 && y >= -6) {
    return BIOMES['elderwood-maze'];
  }
  if (x >= 6) {
    return BIOMES['moonlit-parish'];
  }
  if (x <= -3) {
    return BIOMES['ember-waste'];
  }
  if (y <= -3) {
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
