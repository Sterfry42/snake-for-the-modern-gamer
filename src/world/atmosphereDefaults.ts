import type { BiomeDefinition } from './biomes.js';
import type {
  BiomeAtmosphereResponse,
  GlobalWeather,
  LocalWeatherVisual,
  ResolvedAtmosphereGameplayModifiers,
  ResolvedAtmosphereParticleProfile,
  ResolvedAtmosphereTint,
} from './atmosphereTypes.js';
import { NO_LIGHTNING_PROFILE } from './atmosphereTypes.js';

export const DEFAULT_ATMOSPHERE_GAMEPLAY: ResolvedAtmosphereGameplayModifiers = {
  heatRateScalar: 1,
  coldRateScalar: 1,
  animalSpawnChanceScalar: 1,
  animalSpawnBiasAdd: {},
  enemySpawnChanceScalar: 1,
  enemyFireCooldownScalar: 1,
  enemyMoveCooldownScalar: 1,
  fishingChanceScalar: 1,
  visibilityScalar: 1,
  lightningProfile: NO_LIGHTNING_PROFILE,
};

export const DEFAULT_ATMOSPHERE_TINT: ResolvedAtmosphereTint = {
  color: 0x0b1020,
  alpha: 0,
};

export const DEFAULT_ATMOSPHERE_PARTICLES: ResolvedAtmosphereParticleProfile = {
  density: 0,
  speed: 1,
  color: 0xffffff,
  alpha: 0,
};

export function createTagDerivedWeatherResponse(
  biome: BiomeDefinition,
  weather: GlobalWeather,
): BiomeAtmosphereResponse {
  if (weather === 'clear') {
    if (biome.tags.includes('hot')) {
      return { localVisual: 'heatHaze', juice: ['heat-haze'] };
    }
    if (biome.tags.includes('frigid') || biome.tags.includes('cold')) {
      return { localVisual: 'mist', juice: ['soft-mist'] };
    }
    return { localVisual: 'clear' };
  }
  if (weather === 'rain') {
    if (biome.tags.includes('underground')) {
      return { localVisual: 'caveDrip', juice: ['cave-echo'] };
    }
    if (biome.tags.includes('frigid') || biome.tags.includes('cold')) {
      return { localVisual: 'snow', juice: ['snow-caps'], gameplay: { coldRateScalar: 1.08 } };
    }
    if (biome.tags.includes('hot') && biome.tags.includes('dry')) {
      return { localVisual: 'steam', juice: ['steam-vents'], gameplay: { heatRateScalar: 0.9 } };
    }
    return {
      localVisual: biome.tags.includes('humid') ? 'heavyRain' : 'rain',
      juice: ['leaf-drips'],
      gameplay: { animalSpawnBiasAdd: { frog: 1, fish: 1 } },
    };
  }
  if (weather === 'storm') {
    if (biome.tags.includes('dry') && biome.tags.includes('hot')) {
      return { localVisual: 'dryLightning', juice: ['dust-gusts'] };
    }
    if (biome.tags.includes('frigid')) {
      return {
        localVisual: 'whiteout',
        juice: ['snow-caps'],
        gameplay: { coldRateScalar: 1.18, visibilityScalar: 0.75 },
      };
    }
    return {
      localVisual: 'thunder',
      juice: ['leaf-drips'],
      gameplay: { visibilityScalar: 0.9 },
      audio: ['thunder'],
    };
  }
  if (weather === 'fog') {
    return {
      localVisual: biome.tags.includes('underground') ? 'mist' : 'fog',
      juice: ['soft-mist'],
      gameplay: { visibilityScalar: biome.tags.includes('dangerous') ? 0.86 : 0.94 },
    };
  }
  if (weather === 'heatwave') {
    return {
      localVisual: 'heatHaze',
      juice: ['heat-haze'],
      gameplay: { heatRateScalar: biome.tags.includes('hot') ? 1.2 : 1 },
    };
  }
  if (weather === 'coldfront') {
    return {
      localVisual: biome.tags.includes('frigid') || biome.tags.includes('cold') ? 'snow' : 'mist',
      juice: ['soft-mist'],
      gameplay: {
        coldRateScalar: biome.tags.includes('cold') || biome.tags.includes('frigid') ? 1.18 : 1,
      },
    };
  }
  return {
    localVisual: biome.tags.includes('dry') ? 'dustStorm' : 'leafFall',
    juice: biome.tags.includes('dry') ? ['dust-gusts'] : ['leaf-fall'],
    gameplay: { visibilityScalar: biome.tags.includes('sparse') ? 0.9 : 1 },
  };
}

export function particleDefaultsForVisual(
  visual: LocalWeatherVisual,
): ResolvedAtmosphereParticleProfile {
  switch (visual) {
    case 'rain':
    case 'neonRain':
    case 'oilRain':
      return {
        density: 0.45,
        speed: 1.6,
        color: visual === 'neonRain' ? 0x5ff8ff : 0x9ccfff,
        alpha: 0.42,
      };
    case 'heavyRain':
    case 'monsoon':
      return { density: 0.75, speed: 1.9, color: 0x9ccfff, alpha: 0.5 };
    case 'snow':
    case 'sleet':
    case 'whiteout':
      return {
        density: visual === 'whiteout' ? 0.85 : 0.5,
        speed: 0.75,
        color: 0xf4fbff,
        alpha: 0.55,
      };
    case 'fog':
    case 'mist':
    case 'steam':
    case 'caveDrip':
      return {
        density: visual === 'fog' ? 0.22 : 0.3,
        speed: 0.45,
        color: visual === 'steam' ? 0xffe2cc : 0xd8ecff,
        alpha: visual === 'fog' ? 0.18 : 0.24,
      };
    case 'ashfall':
    case 'boneDust':
    case 'dustStorm':
      return {
        density: 0.48,
        speed: 1.2,
        color: visual === 'boneDust' ? 0xdfcbb5 : 0xc9a57e,
        alpha: 0.38,
      };
    case 'fallout':
    case 'sporeCloud':
      return {
        density: 0.46,
        speed: 0.7,
        color: visual === 'fallout' ? 0xb6ff3f : 0xf2a8ff,
        alpha: 0.42,
      };
    case 'petals':
    case 'leafFall':
    case 'fireflies':
      return {
        density: 0.32,
        speed: 0.6,
        color: visual === 'fireflies' ? 0xf8ff8f : 0xffa6c8,
        alpha: 0.55,
      };
    case 'dryLightning':
      return { density: 0.2, speed: 1.1, color: 0xfff3a6, alpha: 0.25 };
    case 'thunder':
      return { density: 0.78, speed: 2, color: 0x9ccfff, alpha: 0.52 };
    case 'heatHaze':
      return { density: 0.1, speed: 0.32, color: 0xffc078, alpha: 0.14 };
    case 'seaSpray':
      return { density: 0.42, speed: 1.1, color: 0xb8f7ff, alpha: 0.42 };
    case 'aurora':
      return { density: 0.18, speed: 0.3, color: 0x8ffff2, alpha: 0.28 };
    case 'clear':
    default:
      return DEFAULT_ATMOSPHERE_PARTICLES;
  }
}
