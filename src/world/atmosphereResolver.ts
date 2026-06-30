import type { BiomeDefinition, BiomeId } from './biomes.js';
import { getBiomeDefinition } from './biomes.js';
import {
  createTagDerivedWeatherResponse,
  DEFAULT_ATMOSPHERE_GAMEPLAY,
  DEFAULT_ATMOSPHERE_TINT,
  particleDefaultsForVisual,
} from './atmosphereDefaults.js';
import { BIOME_ATMOSPHERE_PROFILES } from './biomeAtmosphereProfiles.js';
import type {
  AtmosphereConfig,
  AtmosphereGameplayModifiers,
  AtmosphereState,
  BiomeLightProfile,
  BiomeAtmosphereProfile,
  BiomeAtmosphereResponse,
  DarknessLevel,
  ResolvedAtmosphereGameplayModifiers,
  ResolvedAtmosphereParticleProfile,
  ResolvedAtmosphereTint,
  ResolvedAtmosphereView,
  ShelterMode,
  WeatherIconId,
  AtmosphereEffectTag,
} from './atmosphereTypes.js';
import { NO_LIGHTNING_PROFILE } from './atmosphereTypes.js';

export function getBiomeAtmosphereProfile(biomeId: BiomeId): BiomeAtmosphereProfile {
  return BIOME_ATMOSPHERE_PROFILES[biomeId];
}

export function resolveBiomeAtmosphere(
  biome: BiomeDefinition,
  state: AtmosphereState,
  config?: Pick<
    AtmosphereConfig,
    | 'enabled'
    | 'visualParticlesEnabled'
    | 'dayNightTintEnabled'
    | 'gameplayModifiersEnabled'
    | 'lightningEnabled'
  > & { shelterMode?: ShelterMode },
  profile = getBiomeAtmosphereProfile(biome.id),
): ResolvedAtmosphereView {
  const enabled = config?.enabled ?? true;
  if (!enabled) {
    return buildDisabledView(biome, state);
  }

  const shelterMode = config?.shelterMode ?? 'exposed';
  const tagDefault = createTagDerivedWeatherResponse(biome, state.globalWeather);
  const profileDefault = profile.defaultLocalVisual
    ? ({ localVisual: profile.defaultLocalVisual } satisfies BiomeAtmosphereResponse)
    : undefined;
  const responses = [
    tagDefault,
    profileDefault,
    profile.seasonResponses?.[state.season],
    profile.dayPhaseResponses?.[state.dayPhase],
    profile.weatherResponses[state.globalWeather],
  ].filter(Boolean) as BiomeAtmosphereResponse[];
  const merged = mergeResponses(responses);
  const localVisual = adaptLocalVisualForShelter(
    merged.localVisual ?? profile.defaultLocalVisual ?? tagDefault.localVisual,
    shelterMode,
  );
  const baseParticles = particleDefaultsForVisual(localVisual);
  const intensity = clamp01(state.weatherIntensity);
  const tint =
    config?.dayNightTintEnabled === false ? DEFAULT_ATMOSPHERE_TINT : resolveTint(merged, state);
  const transitionScalar = resolveWeatherTransitionScalar(state);
  const particles =
    config?.visualParticlesEnabled === false
      ? { density: 0, speed: 1, color: baseParticles.color, alpha: 0 }
      : adaptParticlesForShelter(
          resolveParticles(baseParticles, merged, intensity * transitionScalar),
          shelterMode,
        );
  const gameplay =
    config?.gameplayModifiersEnabled === false
      ? DEFAULT_ATMOSPHERE_GAMEPLAY
      : resolveGameplay(
          adaptGameplayForShelter(merged.gameplay, shelterMode),
          Boolean(config?.lightningEnabled) && shelterMode === 'exposed',
        );
  const effects = resolveEffects(biome, state, localVisual, shelterMode, gameplay.visibilityScalar);
  const darkness = resolveDarkness(biome, state, localVisual, shelterMode, profile.lightProfile);
  const weatherIcon = resolveWeatherIcon(state, localVisual);
  const playerSummary = {
    skyLabel: formatAtmosphereLabel(state.skyEvent?.current ?? state.globalWeather),
    localLabel:
      localVisual === state.globalWeather
        ? 'Here: same sky'
        : `Here: ${formatAtmosphereLabel(localVisual)}`,
    timeLabel: formatAtmosphereLabel(state.dayPhase),
    seasonLabel: formatAtmosphereLabel(state.season),
    shelterLabel: shelterLabelForMode(shelterMode),
    lightLabel: formatAtmosphereLabel(darkness.level),
    oneLine: `${formatAtmosphereLabel(state.season)} · ${formatAtmosphereLabel(state.dayPhase)} · ${formatAtmosphereLabel(state.globalWeather)}`,
  };
  return {
    state: { ...state },
    biomeId: biome.id,
    localVisual,
    activeJuice: unique([...profile.baseJuice, ...(merged.juice ?? [])]),
    gameplay,
    tint,
    particles,
    debugLabel: `${state.season}/${state.dayPhase}/${state.globalWeather}->${localVisual}`,
    sheltered: shelterMode !== 'exposed',
    shelterMode,
    darkness,
    effects,
    weatherIcon,
    playerSummary,
  };
}

export function resolveAtmosphereForBiomeId(
  biomeId: BiomeId,
  state: AtmosphereState,
  config?: Pick<
    AtmosphereConfig,
    | 'enabled'
    | 'visualParticlesEnabled'
    | 'dayNightTintEnabled'
    | 'gameplayModifiersEnabled'
    | 'lightningEnabled'
  > & { shelterMode?: ShelterMode },
): ResolvedAtmosphereView {
  return resolveBiomeAtmosphere(getBiomeDefinition(biomeId), state, config);
}

function buildDisabledView(biome: BiomeDefinition, state: AtmosphereState): ResolvedAtmosphereView {
  const darkness = resolveDarkness(biome, state, 'clear', 'interior');
  return {
    state: { ...state },
    biomeId: biome.id,
    localVisual: 'clear',
    activeJuice: [],
    gameplay: DEFAULT_ATMOSPHERE_GAMEPLAY,
    tint: DEFAULT_ATMOSPHERE_TINT,
    particles: { density: 0, speed: 1, color: 0xffffff, alpha: 0 },
    debugLabel: 'disabled',
    sheltered: true,
    shelterMode: 'interior',
    darkness,
    effects: ['interior-shelter', 'muffled-weather'],
    weatherIcon: resolveWeatherIcon(state, 'clear'),
    playerSummary: {
      skyLabel: formatAtmosphereLabel(state.globalWeather),
      localLabel: 'Weather muffled here',
      timeLabel: formatAtmosphereLabel(state.dayPhase),
      seasonLabel: formatAtmosphereLabel(state.season),
      shelterLabel: shelterLabelForMode('interior'),
      lightLabel: formatAtmosphereLabel(darkness.level),
      oneLine: `${formatAtmosphereLabel(state.season)} · ${formatAtmosphereLabel(state.dayPhase)} · sheltered`,
    },
  };
}

function mergeResponses(responses: BiomeAtmosphereResponse[]): BiomeAtmosphereResponse {
  return responses.reduce<BiomeAtmosphereResponse>(
    (merged, response) => ({
      localVisual: response.localVisual ?? merged.localVisual,
      juice: unique([...(merged.juice ?? []), ...(response.juice ?? [])]),
      tint: { ...(merged.tint ?? {}), ...(response.tint ?? {}) },
      particles: { ...(merged.particles ?? {}), ...(response.particles ?? {}) },
      gameplay: mergeGameplay(merged.gameplay, response.gameplay),
      audio: unique([...(merged.audio ?? []), ...(response.audio ?? [])]),
      messageTag: response.messageTag ?? merged.messageTag,
    }),
    { localVisual: 'clear' },
  );
}

function mergeGameplay(
  left?: AtmosphereGameplayModifiers,
  right?: AtmosphereGameplayModifiers,
): AtmosphereGameplayModifiers | undefined {
  if (!left && !right) return undefined;
  return {
    ...left,
    ...right,
    animalSpawnBiasAdd: {
      ...(left?.animalSpawnBiasAdd ?? {}),
      ...(right?.animalSpawnBiasAdd ?? {}),
    },
  };
}

function resolveGameplay(
  gameplay: AtmosphereGameplayModifiers | undefined,
  lightningEnabled: boolean,
): ResolvedAtmosphereGameplayModifiers {
  const lightningProfile = gameplay?.lightningProfile ?? NO_LIGHTNING_PROFILE;
  return {
    heatRateScalar: clamp(gameplay?.heatRateScalar ?? 1, 0.5, 1.5),
    coldRateScalar: clamp(gameplay?.coldRateScalar ?? 1, 0.5, 1.5),
    animalSpawnChanceScalar: clamp(gameplay?.animalSpawnChanceScalar ?? 1, 0, 1.5),
    animalSpawnBiasAdd: gameplay?.animalSpawnBiasAdd ?? {},
    enemySpawnChanceScalar: clamp(gameplay?.enemySpawnChanceScalar ?? 1, 0, 1.25),
    enemyFireCooldownScalar: clamp(gameplay?.enemyFireCooldownScalar ?? 1, 0.85, 1.25),
    enemyMoveCooldownScalar: clamp(gameplay?.enemyMoveCooldownScalar ?? 1, 0.85, 1.25),
    fishingChanceScalar: clamp(gameplay?.fishingChanceScalar ?? 1, 0.5, 1.5),
    visibilityScalar: clamp(gameplay?.visibilityScalar ?? 1, 0.65, 1),
    lightningProfile: {
      ...lightningProfile,
      enabled: lightningEnabled && lightningProfile.enabled,
    },
  };
}

function adaptLocalVisualForShelter(
  visual: BiomeAtmosphereResponse['localVisual'],
  shelterMode: ShelterMode,
): BiomeAtmosphereResponse['localVisual'] {
  if (shelterMode === 'exposed') {
    return visual;
  }
  if (shelterMode === 'interior') {
    switch (visual) {
      case 'rain':
      case 'heavyRain':
      case 'monsoon':
      case 'neonRain':
      case 'oilRain':
      case 'seaSpray':
        return 'mist';
      case 'thunder':
      case 'dryLightning':
        return 'clear';
      case 'snow':
      case 'sleet':
      case 'whiteout':
        return 'mist';
      default:
        return visual;
    }
  }
  switch (visual) {
    case 'rain':
    case 'heavyRain':
    case 'monsoon':
    case 'neonRain':
    case 'oilRain':
    case 'seaSpray':
      return 'caveDrip';
    case 'thunder':
    case 'dryLightning':
      return 'boneDust';
    case 'fog':
      return 'mist';
    case 'snow':
    case 'sleet':
    case 'whiteout':
      return 'mist';
    default:
      return visual;
  }
}

function adaptParticlesForShelter(
  particles: ResolvedAtmosphereParticleProfile,
  shelterMode: ShelterMode,
): ResolvedAtmosphereParticleProfile {
  if (shelterMode === 'exposed') {
    return particles;
  }
  return {
    ...particles,
    density: 0,
    alpha: 0,
  };
}

function adaptGameplayForShelter(
  gameplay: AtmosphereGameplayModifiers | undefined,
  shelterMode: ShelterMode,
): AtmosphereGameplayModifiers | undefined {
  if (shelterMode === 'exposed') {
    return gameplay;
  }
  return {
    ...gameplay,
    lightningProfile: NO_LIGHTNING_PROFILE,
    visibilityScalar:
      shelterMode === 'interior'
        ? Math.max(0.9, gameplay?.visibilityScalar ?? 1)
        : gameplay?.visibilityScalar,
  };
}

function resolveEffects(
  biome: BiomeDefinition,
  state: AtmosphereState,
  visual: BiomeAtmosphereResponse['localVisual'],
  shelterMode: ShelterMode,
  visibilityScalar: number,
): AtmosphereEffectTag[] {
  const effects: AtmosphereEffectTag[] = [];
  if (shelterMode === 'interior') effects.push('interior-shelter', 'muffled-weather');
  if (shelterMode === 'underground') effects.push('underground-shelter', 'underground-weather');
  if (state.dayPhase === 'night') effects.push('night-active');
  if (state.skyEvent?.current === 'bloodMoon') effects.push('blood-moon', 'night-active');
  if (state.skyEvent?.current === 'eclipse') effects.push('eclipse', 'darkness', 'requires-light');
  if (state.skyEvent?.current === 'meteorShower') effects.push('meteor-shower');
  if (state.skyEvent?.current === 'aurora') effects.push('aurora');
  if (visibilityScalar < 0.9) effects.push('low-visibility');
  if (
    ['rain', 'heavyRain', 'monsoon', 'neonRain', 'oilRain', 'seaSpray', 'caveDrip'].includes(visual)
  ) {
    effects.push('wet', 'good-fishing');
  }
  if (
    ['fog', 'mist', 'whiteout', 'dustStorm', 'ashfall', 'fallout', 'sporeCloud'].includes(visual)
  ) {
    effects.push('low-visibility');
  }
  if (['heatHaze', 'steam'].includes(visual) || state.globalWeather === 'heatwave') {
    effects.push('heat-pressure');
  }
  if (['snow', 'sleet', 'whiteout'].includes(visual) || state.globalWeather === 'coldfront') {
    effects.push('cold-pressure');
  }
  if (state.globalWeather === 'storm') {
    effects.push('storm-charged');
    if (shelterMode === 'exposed') effects.push('sky-lightning');
  }
  if (visual === 'sporeCloud') effects.push('spore-bloom');
  if (visual === 'fallout') effects.push('radioactive-air');
  if (biome.tags.includes('haunted')) effects.push('haunted-active');
  if (biome.tags.includes('civilized')) effects.push('mechanical-active');
  return unique(effects);
}

function resolveDarkness(
  biome: BiomeDefinition,
  state: AtmosphereState,
  visual: BiomeAtmosphereResponse['localVisual'],
  shelterMode: ShelterMode,
  lightProfile?: BiomeLightProfile,
): ResolvedAtmosphereView['darkness'] {
  const reasons: string[] = [];
  let score = 0;
  const add = (amount: number, reason: string) => {
    if (amount !== 0) {
      score += amount;
      reasons.push(`${reason} ${amount > 0 ? '+' : ''}${amount.toFixed(2)}`);
    }
  };
  if (shelterMode === 'interior') {
    add(0.08, 'interior');
  } else {
    add({ dawn: 0.15, day: 0, dusk: 0.25, night: 0.45 }[state.dayPhase], state.dayPhase);
    add(weatherDarknessAdd(state.globalWeather, visual), visual);
    add(shelterMode === 'underground' ? 0.25 : 0, shelterMode);
  }
  if (biome.tags.includes('dense')) add(0.15, 'dense');
  if (biome.tags.includes('forest')) add(0.05, 'forest');
  if (biome.tags.includes('haunted')) add(0.1, 'haunted');
  if (biome.tags.includes('underground') || biome.tags.includes('cave')) add(0.2, 'underground');
  if (biome.tags.includes('civilized')) add(-0.05, 'civilized');
  if (
    shelterMode !== 'interior' &&
    biome.tags.includes('hot') &&
    biome.tags.includes('dry') &&
    state.dayPhase === 'day'
  ) {
    add(-0.1, 'sun glare');
  }
  if (shelterMode !== 'interior') {
    switch (state.skyEvent?.current) {
      case 'bloodMoon':
        if (state.dayPhase === 'night') add(0.2, 'blood moon');
        break;
      case 'eclipse':
        if (state.dayPhase === 'day' || state.dayPhase === 'dusk') add(0.45, 'eclipse');
        break;
      case 'meteorShower':
        add(0.05, 'meteor shower');
        break;
      case 'aurora':
        if (state.dayPhase === 'night') add(-0.18, 'aurora');
        break;
      case 'none':
      case undefined:
        break;
    }
  }
  add(lightProfile?.baseDarknessAdd ?? 0, 'biome');
  if (shelterMode !== 'interior' && state.dayPhase === 'night') {
    add(lightProfile?.nightDarknessAdd ?? 0, 'biome night');
  }
  if (shelterMode !== 'interior') {
    add(lightProfile?.weatherDarknessAdd?.[state.globalWeather] ?? 0, 'weather profile');
  }
  add(lightProfile?.localVisualDarknessAdd?.[visual] ?? 0, 'local profile');
  const level = clampDarknessLevel(darknessLevelForScore(score), lightProfile);
  return {
    level,
    darknessAlpha: darknessAlphaForLevel(level, score),
    visibleRadiusTiles:
      level === 'pitchBlack' ? 4 : level === 'dark' ? 7 : level === 'dim' ? 12 : null,
    lanternRecommended:
      darknessRank(level) >= darknessRank(lightProfile?.lanternRecommendedAt ?? 'dark'),
    lightSources: [],
    debugReason: reasons,
  };
}

function weatherDarknessAdd(
  weather: AtmosphereState['globalWeather'],
  visual: BiomeAtmosphereResponse['localVisual'],
): number {
  if (weather === 'storm') return 0.12;
  if (weather === 'fog' || visual === 'fog' || visual === 'mist') return 0.18;
  if (weather === 'rain') return 0.05;
  if (visual === 'whiteout') return 0.22;
  if (['dustStorm', 'ashfall', 'fallout', 'sporeCloud'].includes(visual)) return 0.12;
  if (weather === 'coldfront' || visual === 'snow' || visual === 'sleet') return 0.08;
  if (weather === 'heatwave' || visual === 'heatHaze') return 0.03;
  if (weather === 'wind') return 0.03;
  return 0;
}

function darknessLevelForScore(score: number): DarknessLevel {
  if (score >= 0.85) return 'pitchBlack';
  if (score >= 0.55) return 'dark';
  if (score >= 0.2) return 'dim';
  return 'bright';
}

function clampDarknessLevel(level: DarknessLevel, profile?: BiomeLightProfile): DarknessLevel {
  const min = profile?.minDarkness;
  const max = profile?.maxDarkness;
  let rank = darknessRank(level);
  if (min) rank = Math.max(rank, darknessRank(min));
  if (max) rank = Math.min(rank, darknessRank(max));
  return (['bright', 'dim', 'dark', 'pitchBlack'] as DarknessLevel[])[rank] ?? level;
}

function darknessRank(level: DarknessLevel): number {
  return { bright: 0, dim: 1, dark: 2, pitchBlack: 3 }[level];
}

function darknessAlphaForLevel(level: DarknessLevel, score: number): number {
  switch (level) {
    case 'bright':
      return 0;
    case 'dim':
      return clamp(0.08 + score * 0.14, 0.08, 0.18);
    case 'dark':
      return clamp(0.3 + (score - 0.55) * 0.32, 0.3, 0.48);
    case 'pitchBlack':
      return clamp(0.62 + (score - 0.85) * 0.18, 0.62, 0.78);
  }
}

function resolveWeatherIcon(
  state: AtmosphereState,
  visual: BiomeAtmosphereResponse['localVisual'],
): WeatherIconId {
  switch (state.skyEvent?.current) {
    case 'bloodMoon':
      return 'blood-moon';
    case 'eclipse':
      return 'eclipse';
    case 'meteorShower':
      return 'meteor-shower';
    case 'aurora':
      return 'aurora';
    case 'none':
    case undefined:
      break;
  }
  switch (visual) {
    case 'rain':
    case 'heavyRain':
    case 'monsoon':
      return 'rain';
    case 'thunder':
      return 'storm';
    case 'fog':
    case 'mist':
      return 'fog';
    case 'heatHaze':
      return 'heatwave';
    case 'snow':
    case 'sleet':
      return 'snow';
    case 'whiteout':
      return 'whiteout';
    case 'steam':
      return 'steam';
    case 'dryLightning':
      return 'dry-lightning';
    case 'seaSpray':
      return 'sea-spray';
    case 'neonRain':
      return 'neon-rain';
    case 'oilRain':
      return 'oil-rain';
    case 'fallout':
      return 'fallout';
    case 'sporeCloud':
      return 'spores';
    case 'dustStorm':
    case 'leafFall':
      return 'wind';
    default:
      return state.dayPhase === 'night'
        ? 'clear-night'
        : state.globalWeather === 'clear'
          ? 'sunny'
          : 'cloud';
  }
}

function shelterLabelForMode(mode: ShelterMode): string {
  switch (mode) {
    case 'interior':
      return 'Indoors - weather muffled';
    case 'underground':
      return 'Underground - weather translated below';
    case 'exposed':
      return 'Exposed - open to sky';
  }
}

function formatAtmosphereLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolveTint(
  response: BiomeAtmosphereResponse,
  state: AtmosphereState,
): ResolvedAtmosphereTint {
  const current = tintStopForPhase(state.dayPhase);
  const next = tintStopForPhase(nextDayPhase(state.dayPhase));
  const t = smoothstep(state.phaseProgress);
  const phaseTint: ResolvedAtmosphereTint = {
    color: lerpColor(current.color, next.color, t),
    alpha: lerp(current.alpha, next.alpha, t),
  };
  const weatherAlpha =
    state.globalWeather === 'fog' || state.globalWeather === 'storm'
      ? 0.05 * state.weatherIntensity
      : 0;
  const baseTint: ResolvedAtmosphereTint = {
    color: response.tint?.color ?? phaseTint.color,
    alpha: response.tint?.alpha ?? phaseTint.alpha,
  };
  const skyTint = skyEventTint(state);
  if (skyTint) {
    return {
      color: lerpColor(baseTint.color, skyTint.color, skyTint.amount),
      alpha: clamp(lerp(baseTint.alpha, skyTint.alpha, skyTint.amount) + weatherAlpha, 0, 0.36),
    };
  }
  const cloudyTint = cloudyWeatherTint(state);
  if (cloudyTint) {
    return {
      color: lerpColor(baseTint.color, cloudyTint.color, cloudyTint.amount),
      alpha: clamp(
        lerp(baseTint.alpha, cloudyTint.alpha, cloudyTint.amount) + weatherAlpha,
        0,
        0.32,
      ),
    };
  }
  return {
    color: baseTint.color,
    alpha: clamp(baseTint.alpha + weatherAlpha, 0, 0.32),
  };
}

function skyEventTint(
  state: AtmosphereState,
): { color: number; alpha: number; amount: number } | null {
  const intensity = clamp01(state.skyEvent?.intensity ?? 0);
  switch (state.skyEvent?.current) {
    case 'bloodMoon':
      return { color: 0x5a0b1a, alpha: 0.18 + intensity * 0.12, amount: 0.78 };
    case 'eclipse':
      return { color: 0x05070d, alpha: 0.28 + intensity * 0.12, amount: 0.86 };
    case 'meteorShower':
      return { color: 0x1d2748, alpha: 0.1 + intensity * 0.06, amount: 0.45 };
    case 'aurora':
      return { color: 0x2c5770, alpha: 0.08 + intensity * 0.08, amount: 0.5 };
    case 'none':
    case undefined:
      return null;
  }
}

function cloudyWeatherTint(
  state: AtmosphereState,
): { color: number; alpha: number; amount: number } | null {
  const intensity = clamp01(state.weatherIntensity);
  switch (state.globalWeather) {
    case 'fog':
      return { color: 0x91a4ad, alpha: 0.1 + intensity * 0.06, amount: 0.82 };
    case 'rain':
      return { color: 0x405968, alpha: 0.08 + intensity * 0.08, amount: 0.62 };
    case 'storm':
      return { color: 0x24313e, alpha: 0.14 + intensity * 0.1, amount: 0.76 };
    case 'coldfront':
      return { color: 0x7893aa, alpha: 0.08 + intensity * 0.07, amount: 0.55 };
    default:
      return null;
  }
}

function resolveWeatherTransitionScalar(state: AtmosphereState): number {
  const startRamp = Math.min(
    state.weatherTransitionProgress ?? 1,
    smoothstep(clamp(state.phaseProgress / 0.35, 0, 1)),
  );
  const endingSoon =
    state.remainingWeatherPhaseTicks <= 1
      ? 1 - smoothstep(clamp((state.phaseProgress - 0.65) / 0.35, 0, 1))
      : 1;
  return clamp(startRamp * endingSoon, 0, 1);
}

function tintStopForPhase(phase: AtmosphereState['dayPhase']): ResolvedAtmosphereTint {
  switch (phase) {
    case 'dawn':
      return { color: 0xffc9a0, alpha: 0.1 };
    case 'day':
      return { color: 0xffffff, alpha: 0 };
    case 'dusk':
      return { color: 0xff9f6e, alpha: 0.12 };
    case 'night':
      return { color: 0x071022, alpha: 0.26 };
  }
}

function nextDayPhase(phase: AtmosphereState['dayPhase']): AtmosphereState['dayPhase'] {
  switch (phase) {
    case 'dawn':
      return 'day';
    case 'day':
      return 'dusk';
    case 'dusk':
      return 'night';
    case 'night':
      return 'dawn';
  }
}

function smoothstep(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  return (
    (Math.round(lerp(ar, br, t)) << 16) |
    (Math.round(lerp(ag, bg, t)) << 8) |
    Math.round(lerp(ab, bb, t))
  );
}

function resolveParticles(
  base: ResolvedAtmosphereParticleProfile,
  response: BiomeAtmosphereResponse,
  intensity: number,
): ResolvedAtmosphereParticleProfile {
  return {
    density: clamp(response.particles?.density ?? base.density * intensity, 0, 1),
    speed: clamp(response.particles?.speed ?? base.speed, 0.1, 3),
    color: response.particles?.color ?? base.color,
    alpha: clamp(response.particles?.alpha ?? base.alpha, 0, 0.8),
  };
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
