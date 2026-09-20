import type { BiomeId } from './biomes.js';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';
export type GlobalWeather = 'clear' | 'rain' | 'storm' | 'fog' | 'heatwave' | 'coldfront' | 'wind';
export type ShelterMode = 'exposed' | 'interior' | 'underground';
export type DarknessLevel = 'bright' | 'dim' | 'dark' | 'pitchBlack';
export type LightSourceKind =
  | 'player'
  | 'lantern'
  | 'town'
  | 'fireplace'
  | 'campfire'
  | 'lava'
  | 'neon'
  | 'radioactive'
  | 'fireflies'
  | 'aurora'
  | 'meteor'
  | 'lightning'
  | 'magic';
export type SkyEvent = 'none' | 'bloodMoon' | 'eclipse' | 'meteorShower' | 'aurora';
export type WeatherIconId =
  | 'sunny'
  | 'clear-night'
  | 'cloud'
  | 'rain'
  | 'storm'
  | 'fog'
  | 'heatwave'
  | 'coldfront'
  | 'wind'
  | 'snow'
  | 'whiteout'
  | 'steam'
  | 'dry-lightning'
  | 'sea-spray'
  | 'neon-rain'
  | 'oil-rain'
  | 'fallout'
  | 'spores'
  | 'blood-moon'
  | 'eclipse'
  | 'meteor-shower'
  | 'aurora'
  | 'unknown';
export type AtmosphereEffectTag =
  | 'wet'
  | 'low-visibility'
  | 'heat-pressure'
  | 'cold-pressure'
  | 'storm-charged'
  | 'sky-lightning'
  | 'muffled-weather'
  | 'underground-weather'
  | 'night-active'
  | 'blood-moon'
  | 'eclipse'
  | 'meteor-shower'
  | 'aurora'
  | 'darkness'
  | 'requires-light'
  | 'lantern-helpful'
  | 'interior-shelter'
  | 'underground-shelter'
  | 'good-fishing'
  | 'bad-flying'
  | 'spore-bloom'
  | 'radioactive-air'
  | 'mechanical-active'
  | 'haunted-active';

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
  | 'sandStorm'
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
  | 'sand-shift'
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
  weatherTransitionProgress: number;
  skyEvent?: SkyEventState;
}

export interface SkyEventState {
  current: SkyEvent;
  remainingPhaseTicks: number;
  intensity: number;
  seed: number;
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

export interface LightSource {
  id: string;
  x: number;
  y: number;
  roomId: string;
  radiusTiles: number;
  intensity: number;
  color: number;
  kind: LightSourceKind;
  flicker?: boolean;
  pulse?: boolean;
}

export interface DarknessView {
  level: DarknessLevel;
  darknessAlpha: number;
  visibleRadiusTiles: number | null;
  lanternRecommended: boolean;
  lightSources: LightSource[];
  debugReason: string[];
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
  lightProfile?: BiomeLightProfile;
  preserveCoreNote: string;
}

export interface BiomeLightProfile {
  baseDarknessAdd?: number;
  nightDarknessAdd?: number;
  weatherDarknessAdd?: Partial<Record<GlobalWeather, number>>;
  localVisualDarknessAdd?: Partial<Record<LocalWeatherVisual, number>>;
  minDarkness?: DarknessLevel;
  maxDarkness?: DarknessLevel;
  lanternRecommendedAt?: DarknessLevel;
}

export interface AtmospherePlayerSummary {
  skyLabel: string;
  localLabel: string;
  timeLabel: string;
  seasonLabel: string;
  shelterLabel: string;
  lightLabel: string;
  oneLine?: string;
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
  shelterMode: ShelterMode;
  darkness: DarknessView;
  effects: AtmosphereEffectTag[];
  weatherIcon: WeatherIconId;
  playerSummary: AtmospherePlayerSummary;
}

export const DAY_PHASE_ORDER: DayPhase[] = ['dawn', 'day', 'dusk', 'night'];
export const DAY_PHASE_DURATIONS_MS: Record<DayPhase, number> = {
  dawn: 45_000,
  day: 100_000,
  dusk: 60_000,
  night: 80_000,
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
