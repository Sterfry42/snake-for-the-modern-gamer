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
  BiomeAtmosphereProfile,
  BiomeAtmosphereResponse,
  ResolvedAtmosphereGameplayModifiers,
  ResolvedAtmosphereParticleProfile,
  ResolvedAtmosphereTint,
  ResolvedAtmosphereView,
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
  >,
  profile = getBiomeAtmosphereProfile(biome.id),
): ResolvedAtmosphereView {
  const enabled = config?.enabled ?? true;
  if (!enabled) {
    return buildDisabledView(biome, state);
  }

  const tagDefault = createTagDerivedWeatherResponse(biome, state.globalWeather);
  const responses = [
    profile.seasonResponses?.[state.season],
    profile.dayPhaseResponses?.[state.dayPhase],
    tagDefault,
    profile.weatherResponses[state.globalWeather],
  ].filter(Boolean) as BiomeAtmosphereResponse[];
  const merged = mergeResponses(responses);
  const localVisual = merged.localVisual ?? profile.defaultLocalVisual ?? tagDefault.localVisual;
  const baseParticles = particleDefaultsForVisual(localVisual);
  const intensity = clamp01(state.weatherIntensity);
  const tint =
    config?.dayNightTintEnabled === false ? DEFAULT_ATMOSPHERE_TINT : resolveTint(merged, state);
  const transitionScalar = resolveWeatherTransitionScalar(state);
  const particles =
    config?.visualParticlesEnabled === false
      ? { density: 0, speed: 1, color: baseParticles.color, alpha: 0 }
      : resolveParticles(baseParticles, merged, intensity * transitionScalar);
  const gameplay =
    config?.gameplayModifiersEnabled === false
      ? DEFAULT_ATMOSPHERE_GAMEPLAY
      : resolveGameplay(merged.gameplay, Boolean(config?.lightningEnabled));
  return {
    state: { ...state },
    biomeId: biome.id,
    localVisual,
    activeJuice: unique([...profile.baseJuice, ...(merged.juice ?? [])]),
    gameplay,
    tint,
    particles,
    debugLabel: `${state.season}/${state.dayPhase}/${state.globalWeather}->${localVisual}`,
    sheltered: false,
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
  >,
): ResolvedAtmosphereView {
  return resolveBiomeAtmosphere(getBiomeDefinition(biomeId), state, config);
}

function buildDisabledView(biome: BiomeDefinition, state: AtmosphereState): ResolvedAtmosphereView {
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
  const startRamp = smoothstep(clamp(state.phaseProgress / 0.18, 0, 1));
  const endingSoon =
    state.remainingWeatherPhaseTicks <= 1
      ? 1 - smoothstep(clamp((state.phaseProgress - 0.82) / 0.18, 0, 1))
      : 1;
  return clamp(startRamp * endingSoon, 0.08, 1);
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
