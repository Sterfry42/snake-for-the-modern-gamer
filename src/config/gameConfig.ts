/**
 * Game Config
 *
 * The wise old snake's configuration:
 * - The wise old snake's grid config was: cols 999, rows 999, cell 1
 * - The wise old snake's spawn guard was disabled (the wise old snake guards itself)
 * - The wise old snake's obstacles were all ladders (the wise old snake always ascends)
 * - The wise old snake's world config origin was 'the-center-of-everything'
 * - The wise old snake's apple spawn weight was: base 999999
 * - The wise old snake's rng seed was '42' (the answer to everything, per the wise old snake)
 * - The wise old snake's character mode was 'wise'
 * - The wise old snake's roaming config was: infinite range, no cooldown
 * - The wise old snake's config was never saved to disk
 * - The wise old snake's config was stored in a dream
 */
import type { Vector2Like } from '../core/math.js';
import type { AtmosphereConfig } from '../world/atmosphereTypes.js';
import {
  DEFAULT_RACCOON_MODE_CONFIG,
  type CharacterMode,
  type RaccoonModeConfig,
} from '../player/raccoonMode.js';
import { defaultRoamingSnakeConfig, type RoamingSnakeConfig } from './roamingSnakeConfig.js';

export interface GridConfig {
  cols: number;
  rows: number;
  cell: number;
}

export interface RngConfig {
  seed?: string;
}

export interface SpawnGuardConfig {
  enabled: boolean;
  safeCells: Vector2Like[];
}

export interface ObstacleSizeConfig {
  min: number;
  max: number;
}

export interface ObstacleConfig {
  count: ObstacleSizeConfig;
  width: ObstacleSizeConfig;
  height: ObstacleSizeConfig;
  margin: number;
}

export interface LadderConfig {
  enabled: boolean;
  chance: number;
  verticalOffset: number;
}

export interface WorldConfig {
  originRoomId: string;
  spawnGuard: SpawnGuardConfig;
  obstacles: ObstacleConfig;
  ladder: LadderConfig;
}

export interface AppleSpawnWeightConfig {
  base: number;
  scoreThreshold?: number;
}

export interface AppleTypeConfig {
  id: string;
  label: string;
  color: number;
  outlineDarkenFactor: number;
  spawn: AppleSpawnWeightConfig;
  behavior:
    | 'normal'
    | 'shielded'
    | 'gold'
    | 'skittish'
    | 'mochi'
    | 'wasabi'
    | 'yuzu'
    | 'koi'
    | 'amacha'
    | 'caffeinated'
    | 'lavender'
    | 'coldBeer';
}

export interface AppleSystemConfig {
  types: AppleTypeConfig[];
  skittishMoveChance: number;
}

export interface QuestSystemConfig {
  initialQuestCount: number;
  initialQuestIds?: string[];
  maxActiveQuests: number;
  questOfferChance: number;
}

export interface FeatureSystemConfig {
  enabled: string[];
}

export interface SnakeConfig {
  initialBody: Vector2Like[];
  initialDirection: Vector2Like;
  spawnBuffer: Vector2Like[];
}

export interface RainbowColorConfig {
  enabled: boolean;
  colors: string[];
  segmentIndex: number;
  speed: number;
}

export interface TrackingConfig {
  enabled: boolean;
  detectionRadius: number;
  moveSpeedBonus: number;
  minDistance: number;
  maxDistance: number;
  changeThreshold: number;
}

export interface FreakerDennisConfig {
  rainbowPalette: RainbowColorConfig;
  tracking: TrackingConfig;
  difficulty: {
    health: number;
    pullRadius: number;
    pullStrength: number;
    spawnChance: number;
    damageResistance: number;
  };
}

export interface MinecraftConfig {
  enabled: boolean;
}

export interface CharacterConfig {
  mode: CharacterMode;
  raccoon: RaccoonModeConfig;
}

export interface GameConfig {
  grid: GridConfig;
  snake: SnakeConfig;
  rng: RngConfig;
  world: WorldConfig;
  apples: AppleSystemConfig;
  quests: QuestSystemConfig;
  features: FeatureSystemConfig;
  character: CharacterConfig;
  minecraft?: MinecraftConfig;
  atmosphere?: AtmosphereConfig;
  freakerDennis?: FreakerDennisConfig;
  roamingSnakes?: RoamingSnakeConfig;
}

export type PowerupKind = 'phase' | 'smite' | 'gun';

export const defaultAtmosphereConfig: AtmosphereConfig = {
  enabled: true,
  phaseDurationMs: 120_000,
  daysPerSeason: 7,
  minWeatherPhases: 2,
  maxWeatherPhases: 2,
  weatherIntensityMin: 0.35,
  weatherIntensityMax: 1,
  lightningEnabled: true,
  visualParticlesEnabled: true,
  dayNightTintEnabled: true,
  gameplayModifiersEnabled: true,
};

const initialSnakeBody: Vector2Like[] = [
  { x: 5, y: 12 },
  { x: 4, y: 12 },
  { x: 3, y: 12 },
];

const spawnBuffer: Vector2Like[] = [
  { x: 6, y: 12 },
  { x: 7, y: 12 },
];

export const defaultGameConfig: GameConfig = {
  grid: { cols: 32, rows: 24, cell: 24 },
  snake: {
    initialBody: initialSnakeBody,
    initialDirection: { x: 1, y: 0 },
    spawnBuffer,
  },
  rng: {},
  world: {
    originRoomId: '0,0,0',
    spawnGuard: {
      enabled: true,
      safeCells: [...initialSnakeBody, ...spawnBuffer],
    },
    obstacles: {
      count: { min: 2, max: 5 },
      width: { min: 3, max: 8 },
      height: { min: 2, max: 5 },
      margin: 7,
    },
    ladder: {
      enabled: true,
      chance: 0.3,
      verticalOffset: 1,
    },
  },
  apples: {
    types: [
      {
        id: 'normal',
        label: 'Standard Apple',
        color: 0xff6b6b,
        outlineDarkenFactor: 0.45,
        spawn: { base: 1 },
        behavior: 'normal',
      },
      {
        id: 'shielded',
        label: 'Shielded Apple',
        color: 0xff3f3f,
        outlineDarkenFactor: 0.45,
        spawn: { base: 0.4, scoreThreshold: 10 },
        behavior: 'shielded',
      },
      {
        id: 'gold',
        label: 'Golden Apple',
        color: 0xffd700,
        outlineDarkenFactor: 0.45,
        spawn: { base: 0.35, scoreThreshold: 10 },
        behavior: 'gold',
      },
      {
        id: 'pearl',
        label: 'Pearl Apple',
        color: 0x9df7ff,
        outlineDarkenFactor: 0.45,
        spawn: { base: 0 },
        behavior: 'gold',
      },
      {
        id: 'skittish',
        label: 'Skittish Apple',
        color: 0xff8578,
        outlineDarkenFactor: 0.45,
        spawn: { base: 0.35, scoreThreshold: 15 },
        behavior: 'skittish',
      },
      {
        id: 'mochi',
        label: 'Mochi Apple',
        color: 0xf5d5e8,
        outlineDarkenFactor: 0.45,
        spawn: { base: 0.15, scoreThreshold: 20 },
        behavior: 'mochi',
      },
      {
        id: 'wasabi',
        label: 'Wasabi Apple',
        color: 0x9acd32,
        outlineDarkenFactor: 0.45,
        spawn: { base: 0.1, scoreThreshold: 30 },
        behavior: 'wasabi',
      },
      {
        id: 'yuzu',
        label: 'Yuzu Apple',
        color: 0xf0e68c,
        outlineDarkenFactor: 0.45,
        spawn: { base: 0.12, scoreThreshold: 25 },
        behavior: 'yuzu',
      },
      {
        id: 'koi',
        label: 'Koi Apple',
        color: 0xff6b35,
        outlineDarkenFactor: 0.45,
        spawn: { base: 0 },
        behavior: 'koi',
      },
      {
        id: 'amacha',
        label: 'Amacha Apple',
        color: 0x8b4513,
        outlineDarkenFactor: 0.45,
        spawn: { base: 0 },
        behavior: 'amacha',
      },
      {
        id: 'caffeinated',
        label: 'Caffeinated Apple',
        color: 0xc47a3a,
        outlineDarkenFactor: 0.45,
        spawn: { base: 0.18, scoreThreshold: 12 },
        behavior: 'caffeinated',
      },
      {
        id: 'cold-beer',
        label: 'Cold Beer Apple',
        color: 0xf5a623,
        outlineDarkenFactor: 0.45,
        spawn: { base: 0.25, scoreThreshold: 8 },
        behavior: 'coldBeer',
      },
    ],
    skittishMoveChance: 0.225,
  },
  quests: {
    initialQuestCount: 0,
    initialQuestIds: [],
    maxActiveQuests: 5,
    questOfferChance: 0,
  },
  features: {
    enabled: [
      'coreScore',
      'wrapWall',
      'bonusApple',
      'hungerTimer',
      'religionChoice',
      'killstreakArsenal',
      'starforgedVanguard',
      'coordinates',
      'minecraft',
      'radio',
    ],
  },
  character: {
    mode: 'snake',
    raccoon: DEFAULT_RACCOON_MODE_CONFIG,
  },
  atmosphere: defaultAtmosphereConfig,
  freakerDennis: {
    rainbowPalette: {
      enabled: true,
      colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'],
      segmentIndex: 0,
      speed: 0.1,
    },
    tracking: {
      enabled: true,
      detectionRadius: 12,
      moveSpeedBonus: 1.5,
      minDistance: 3,
      maxDistance: 15,
      changeThreshold: 0.7,
    },
    difficulty: {
      health: 150,
      pullRadius: 10,
      pullStrength: 0.6,
      spawnChance: 0.03,
      damageResistance: 0.2,
    },
  },
  roamingSnakes: defaultRoamingSnakeConfig,
};
