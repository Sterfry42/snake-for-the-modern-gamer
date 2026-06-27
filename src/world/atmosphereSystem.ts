import { createRng, type RandomGenerator } from '../core/rng.js';
import type {
  AtmosphereConfig,
  AtmosphereState,
  DayPhase,
  GlobalWeather,
  Season,
} from './atmosphereTypes.js';
import { DAY_PHASE_DURATION_SCALARS, DAY_PHASE_ORDER, SEASON_ORDER } from './atmosphereTypes.js';

export const BASE_WEATHER_WEIGHTS: Record<GlobalWeather, number> = {
  clear: 50,
  rain: 25,
  storm: 8,
  fog: 5,
  heatwave: 4,
  coldfront: 4,
  wind: 4,
};

const SEASON_WEATHER_MODIFIERS: Record<Season, Partial<Record<GlobalWeather, number>>> = {
  spring: { rain: 6, fog: 2, wind: 2 },
  summer: { clear: -3, heatwave: 10, storm: 3, coldfront: -2 },
  autumn: { wind: 7, fog: 2, storm: 2 },
  winter: { clear: -5, coldfront: 14, fog: 2, heatwave: -3, rain: -4 },
};

const DAY_PHASE_WEATHER_MODIFIERS: Record<DayPhase, Partial<Record<GlobalWeather, number>>> = {
  dawn: { fog: 2, rain: 1 },
  day: { clear: 5, heatwave: 2 },
  dusk: { wind: 3, storm: 1 },
  night: { fog: 1, storm: 2 },
};

export function getWeatherWeights(
  season: Season,
  dayPhase: DayPhase,
): Record<GlobalWeather, number> {
  const weights = { ...BASE_WEATHER_WEIGHTS };
  for (const [weather, delta] of Object.entries(SEASON_WEATHER_MODIFIERS[season])) {
    weights[weather as GlobalWeather] = Math.max(0, weights[weather as GlobalWeather] + delta);
  }
  for (const [weather, delta] of Object.entries(DAY_PHASE_WEATHER_MODIFIERS[dayPhase])) {
    weights[weather as GlobalWeather] = Math.max(0, weights[weather as GlobalWeather] + delta);
  }
  return weights;
}

export function createDefaultAtmosphereState(seed = 0): AtmosphereState {
  return {
    worldDay: 0,
    season: 'spring',
    dayPhase: 'day',
    phaseProgress: 0,
    globalWeather: 'clear',
    weatherIntensity: 0.35,
    remainingWeatherPhaseTicks: 2,
    weatherSeed: seed,
  };
}

export class WorldAtmosphereSystem {
  private state: AtmosphereState;
  private elapsedPhaseMs = 0;
  private rng: RandomGenerator;

  constructor(
    private readonly config: AtmosphereConfig,
    seed: string | number,
  ) {
    this.rng = createRng(`atmosphere:${String(seed)}`);
    this.state = createDefaultAtmosphereState(this.nextWeatherSeed());
  }

  getState(): AtmosphereState {
    return { ...this.state };
  }

  reset(seed: string | number): void {
    this.elapsedPhaseMs = 0;
    this.rng = createRng(`atmosphere:${String(seed)}`);
    this.state = createDefaultAtmosphereState(this.nextWeatherSeed());
  }

  hydrate(saved?: Partial<AtmosphereState>): void {
    this.elapsedPhaseMs = 0;
    if (!saved) {
      return;
    }
    const worldDay = clampInt(saved.worldDay, 0, Number.MAX_SAFE_INTEGER);
    const dayPhase = isDayPhase(saved.dayPhase) ? saved.dayPhase : 'day';
    this.state = {
      worldDay,
      season: seasonForDay(worldDay, this.config.daysPerSeason),
      dayPhase,
      phaseProgress: clamp01(Number(saved.phaseProgress ?? 0)),
      globalWeather: isGlobalWeather(saved.globalWeather) ? saved.globalWeather : 'clear',
      weatherIntensity: clamp(
        Number(saved.weatherIntensity ?? this.config.weatherIntensityMin),
        this.config.weatherIntensityMin,
        this.config.weatherIntensityMax,
      ),
      remainingWeatherPhaseTicks: clampInt(
        saved.remainingWeatherPhaseTicks,
        this.config.minWeatherPhases,
        this.config.maxWeatherPhases,
      ),
      weatherSeed: clampInt(saved.weatherSeed, 0, Number.MAX_SAFE_INTEGER),
    };
    this.elapsedPhaseMs = this.state.phaseProgress * this.getCurrentPhaseDurationMs();
  }

  update(deltaMs: number): AtmosphereState {
    if (!this.config.enabled) {
      return this.getState();
    }
    this.elapsedPhaseMs += Math.max(0, deltaMs);
    let phaseDuration = this.getCurrentPhaseDurationMs();
    while (this.elapsedPhaseMs >= phaseDuration) {
      this.elapsedPhaseMs -= phaseDuration;
      this.advancePhase();
      phaseDuration = this.getCurrentPhaseDurationMs();
    }
    this.state.phaseProgress = clamp01(this.elapsedPhaseMs / phaseDuration);
    return this.getState();
  }

  forceWeather(weather: GlobalWeather): AtmosphereState {
    this.state = {
      ...this.state,
      globalWeather: weather,
      weatherIntensity: this.config.weatherIntensityMax,
      remainingWeatherPhaseTicks: this.getConfiguredWeatherPhaseDuration(),
      weatherSeed: this.nextWeatherSeed(),
    };
    return this.getState();
  }

  private advancePhase(): void {
    const currentIndex = DAY_PHASE_ORDER.indexOf(this.state.dayPhase);
    const nextPhase = DAY_PHASE_ORDER[(currentIndex + 1) % DAY_PHASE_ORDER.length] ?? 'dawn';
    const nextDay = nextPhase === 'dawn' ? this.state.worldDay + 1 : this.state.worldDay;
    this.state = {
      ...this.state,
      worldDay: nextDay,
      season: seasonForDay(nextDay, this.config.daysPerSeason),
      dayPhase: nextPhase,
      phaseProgress: 0,
      remainingWeatherPhaseTicks: this.state.remainingWeatherPhaseTicks - 1,
    };
    if (this.state.remainingWeatherPhaseTicks <= 0) {
      this.rollWeather();
    }
  }

  private rollWeather(): void {
    const weights = getWeatherWeights(this.state.season, this.state.dayPhase);
    const globalWeather = pickWeighted(this.rng, weights);
    const intensity =
      this.config.weatherIntensityMin +
      this.rng() * (this.config.weatherIntensityMax - this.config.weatherIntensityMin);
    this.state = {
      ...this.state,
      globalWeather,
      weatherIntensity: clamp(
        intensity,
        this.config.weatherIntensityMin,
        this.config.weatherIntensityMax,
      ),
      remainingWeatherPhaseTicks: this.getConfiguredWeatherPhaseDuration(),
      weatherSeed: this.nextWeatherSeed(),
    };
  }

  private getConfiguredWeatherPhaseDuration(): number {
    const min = Math.max(1, this.config.minWeatherPhases);
    const max = Math.max(min, this.config.maxWeatherPhases);
    return min + Math.floor(this.rng() * (max - min + 1));
  }

  private getCurrentPhaseDurationMs(): number {
    return (
      Math.max(1, this.config.phaseDurationMs) *
      (DAY_PHASE_DURATION_SCALARS[this.state.dayPhase] ?? 1)
    );
  }

  private nextWeatherSeed(): number {
    return Math.floor(this.rng() * 0x7fffffff);
  }
}

function seasonForDay(worldDay: number, daysPerSeason: number): Season {
  const seasonDays = Math.max(1, Math.floor(daysPerSeason));
  return SEASON_ORDER[Math.floor(worldDay / seasonDays) % SEASON_ORDER.length] ?? 'spring';
}

function pickWeighted<T extends string>(rng: RandomGenerator, weights: Record<T, number>): T {
  const entries = Object.entries(weights) as Array<[T, number]>;
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
  let roll = rng() * Math.max(1, total);
  for (const [value, weight] of entries) {
    roll -= Math.max(0, weight);
    if (roll <= 0) return value;
  }
  return entries[0]![0];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clampInt(value: unknown, min: number, max: number): number {
  return Math.floor(clamp(Number(value ?? min), min, max));
}

function isDayPhase(value: unknown): value is DayPhase {
  return typeof value === 'string' && DAY_PHASE_ORDER.includes(value as DayPhase);
}

function isGlobalWeather(value: unknown): value is GlobalWeather {
  return (
    value === 'clear' ||
    value === 'rain' ||
    value === 'storm' ||
    value === 'fog' ||
    value === 'heatwave' ||
    value === 'coldfront' ||
    value === 'wind'
  );
}
