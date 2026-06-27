import type { BiomeId } from './biomes.js';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';
export type GlobalWeather = 'clear' | 'rain' | 'storm' | 'fog' | 'heatwave' | 'coldfront' | 'wind';

export type LocalWeatherVisual =
  | 'clear'
  | 'rain'
  | 'heavyRain'
  | 'snow'
  | 'sleet'
  | 'whiteout'
  | 'mist'
  | 'fog'
  | 'steam'
  | 'ashfall'
  | 'fallout'
  | 'caveDrip'
  | 'dryLightning'
  | 'thunder'
  | 'monsoon'
  | 'seaSpray'
  | 'neonRain'
  | 'petals'
  | 'fireflies'
  | 'boneDust'
  | 'oilRain'
  | 'dustStorm'
  | 'heatHaze'
  | 'aurora'
  | 'sporeCloud'
  | 'leafFall';

export type AtmosphereJuiceTag =
  | 'soft-mist'
  | 'pond-ripples'
  | 'lantern-reflections'
  | 'leaf-drips'
  | 'canopy-drips'
  | 'steam-vents'
  | 'heat-haze'
  | 'dust-gusts'
  | 'ash-gusts'
  | 'grave-bells'
  | 'ghost-breath'
  | 'cave-echo'
  | 'falling-dust'
  | 'bioluminescent-pulse'
  | 'root-creak'
  | 'neon-reflections'
  | 'sign-flicker'
  | 'glass-glare'
  | 'prism-haze'
  | 'bone-condensation'
  | 'bone-dust'
  | 'geiger-sparkle'
  | 'gear-drips'
  | 'oil-sheen'
  | 'fireflies'
  | 'petals'
  | 'leaf-fall'
  | 'snow-caps'
  | 'aurora'
  | 'moon-reflection'
  | 'sea-spray'
  | 'wave-chop'
  | 'spore-motes'
  | 'ice-shimmer';

export type AtmosphereAudioTag =
  | 'rain'
  | 'thunder'
  | 'wind'
  | 'cave-drip'
  | 'bells'
  | 'geiger'
  | 'machinery';

export interface AtmosphereState {
  worldDay: number;
  season: Season;
  dayPhase: DayPhase;
  phaseProgress: number;
  globalWeather: GlobalWeather;
  weatherIntensity: number;
  remainingWeatherPhaseTicks: number;
  weatherSeed: number;
}

export interface AtmosphereConfig {
  enabled: boolean;
  phaseDurationMs: number;
  daysPerSeason: number;
  minWeatherPhases: number;
  maxWeatherPhases: number;
  weatherIntensityMin: number;
  weatherIntensityMax: number;
  lightningEnabled: boolean;
  visualParticlesEnabled: boolean;
  dayNightTintEnabled: boolean;
  gameplayModifiersEnabled: boolean;
}

export interface AtmosphereTint {
  color?: number;
  alpha?: number;
  warmth?: number;
}

export interface ResolvedAtmosphereTint {
  color: number;
  alpha: number;
}

export interface AtmosphereParticleProfile {
  density?: number;
  speed?: number;
  color?: number;
  alpha?: number;
}

export interface ResolvedAtmosphereParticleProfile {
  density: number;
  speed: number;
  color: number;
  alpha: number;
}

export interface LightningProfile {
  enabled: boolean;
  strikeChancePerPhase?: number;
  strikeChancePerSnakeStep?: number;
  telegraphTicks: number;
  radius: number;
  targetsMetalEquipment: boolean;
  canHitEnemies: boolean;
  canHitPlayer: boolean;
  safeUnderCover: boolean;
}

export interface AtmosphereGameplayModifiers {
  heatRateScalar?: number;
  coldRateScalar?: number;
  animalSpawnChanceScalar?: number;
  animalSpawnBiasAdd?: Partial<Record<string, number>>;
  enemySpawnChanceScalar?: number;
  enemyFireCooldownScalar?: number;
  enemyMoveCooldownScalar?: number;
  fishingChanceScalar?: number;
  visibilityScalar?: number;
  lightningProfile?: LightningProfile;
}

export type ResolvedAtmosphereGameplayModifiers = Required<
  Omit<AtmosphereGameplayModifiers, 'animalSpawnBiasAdd' | 'lightningProfile'>
> & {
  animalSpawnBiasAdd: Partial<Record<string, number>>;
  lightningProfile: LightningProfile;
};

export interface BiomeAtmosphereResponse {
  localVisual: LocalWeatherVisual;
  juice?: AtmosphereJuiceTag[];
  tint?: AtmosphereTint;
  particles?: AtmosphereParticleProfile;
  gameplay?: AtmosphereGameplayModifiers;
  audio?: AtmosphereAudioTag[];
  messageTag?: string;
}

export interface BiomeAtmosphereProfile {
  biomeId: BiomeId;
  baseJuice: AtmosphereJuiceTag[];
  defaultLocalVisual?: LocalWeatherVisual;
  dayPhaseResponses?: Partial<Record<DayPhase, BiomeAtmosphereResponse>>;
  seasonResponses?: Partial<Record<Season, BiomeAtmosphereResponse>>;
  weatherResponses: Partial<Record<GlobalWeather, BiomeAtmosphereResponse>>;
  preserveCoreNote: string;
}

export interface ResolvedAtmosphereView {
  state: AtmosphereState;
  biomeId: BiomeId;
  localVisual: LocalWeatherVisual;
  activeJuice: AtmosphereJuiceTag[];
  gameplay: ResolvedAtmosphereGameplayModifiers;
  tint: ResolvedAtmosphereTint;
  particles: ResolvedAtmosphereParticleProfile;
  debugLabel: string;
  sheltered: boolean;
}

export const DAY_PHASE_ORDER: DayPhase[] = ['dawn', 'day', 'dusk', 'night'];
export const DAY_PHASE_DURATION_SCALARS: Record<DayPhase, number> = {
  dawn: 0.7,
  day: 1.1,
  dusk: 1,
  night: 1.6,
};
export const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export const NO_LIGHTNING_PROFILE: LightningProfile = {
  enabled: false,
  telegraphTicks: 2,
  radius: 0,
  targetsMetalEquipment: false,
  canHitEnemies: false,
  canHitPlayer: false,
  safeUnderCover: true,
};

export const RARE_TELEGRAPHED_LIGHTNING: LightningProfile = {
  enabled: true,
  strikeChancePerSnakeStep: 0.005,
  telegraphTicks: 2,
  radius: 0,
  targetsMetalEquipment: true,
  canHitEnemies: true,
  canHitPlayer: true,
  safeUnderCover: true,
};
