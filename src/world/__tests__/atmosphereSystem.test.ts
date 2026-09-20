import { describe, expect, it } from 'vitest';
import { defaultAtmosphereConfig } from '../../config/gameConfig.js';
import {
  BASE_WEATHER_WEIGHTS,
  getWeatherWeights,
  WorldAtmosphereSystem,
} from '../atmosphereSystem.js';

describe('WorldAtmosphereSystem', () => {
  it('starts new runs sunny and clear', () => {
    const system = new WorldAtmosphereSystem(defaultAtmosphereConfig, 'seed-a');

    expect(system.getState()).toMatchObject({
      dayPhase: 'day',
      globalWeather: 'clear',
      weatherIntensity: defaultAtmosphereConfig.weatherIntensityMin,
      remainingWeatherPhaseTicks: 2,
      weatherTransitionProgress: 1,
      skyEvent: expect.objectContaining({ current: 'none' }),
    });
  });

  it('advances weighted day phases and increments world day after night', () => {
    const system = new WorldAtmosphereSystem(defaultAtmosphereConfig, 'seed-a');

    expect(system.getState().dayPhase).toBe('day');
    system.update(99_999);
    expect(system.getState().dayPhase).toBe('day');
    system.update(1);
    expect(system.getState().dayPhase).toBe('dusk');
    system.update(60_000);
    expect(system.getState().dayPhase).toBe('night');
    system.update(79_999);
    expect(system.getState().dayPhase).toBe('night');
    system.update(1);
    expect(system.getState().dayPhase).toBe('dawn');
    expect(system.getState().worldDay).toBe(1);
    system.update(45_000);
    expect(system.getState().dayPhase).toBe('day');
  });

  it('changes season after configured days', () => {
    const system = new WorldAtmosphereSystem(
      { ...defaultAtmosphereConfig, phaseDurationMs: 1, daysPerSeason: 1 },
      'seed-a',
    );

    system.update(285_000);

    expect(system.getState().worldDay).toBe(1);
    expect(system.getState().season).toBe('summer');
  });

  it('rerolls weather every configured two phase cadence', () => {
    const system = new WorldAtmosphereSystem(defaultAtmosphereConfig, 'seed-a');

    expect(system.getState().remainingWeatherPhaseTicks).toBe(2);
    system.update(100_000);
    expect(system.getState().remainingWeatherPhaseTicks).toBe(1);
    system.update(60_000);
    expect(system.getState().remainingWeatherPhaseTicks).toBe(2);
  });

  it('ramps weather transitions in and out instead of snapping particles', () => {
    const system = new WorldAtmosphereSystem(defaultAtmosphereConfig, 'seed-a');

    system.forceWeather('rain');
    expect(system.getState().weatherTransitionProgress).toBe(0);
    system.update(20_000);
    expect(system.getState().weatherTransitionProgress).toBeGreaterThan(0);
    system.update(80_000);
    expect(system.getState().remainingWeatherPhaseTicks).toBe(1);
  });

  it('produces deterministic weather sequences for the same seed', () => {
    const first = new WorldAtmosphereSystem(defaultAtmosphereConfig, 'same-seed');
    const second = new WorldAtmosphereSystem(defaultAtmosphereConfig, 'same-seed');
    const firstSequence = [];
    const secondSequence = [];

    for (let i = 0; i < 20; i++) {
      first.update(45_000);
      second.update(45_000);
      firstSequence.push(first.getState().globalWeather, first.getState().weatherIntensity);
      secondSequence.push(second.getState().globalWeather, second.getState().weatherIntensity);
    }

    expect(firstSequence).toEqual(secondSequence);
  });

  it('exposes season and day phase weather weight modifiers', () => {
    expect(BASE_WEATHER_WEIGHTS.clear).toBe(50);
    expect(BASE_WEATHER_WEIGHTS.rain + BASE_WEATHER_WEIGHTS.storm).toBe(33);
    expect(BASE_WEATHER_WEIGHTS.rain).toBeGreaterThan(BASE_WEATHER_WEIGHTS.storm);
    expect(getWeatherWeights('spring', 'dawn').rain).toBeGreaterThan(
      getWeatherWeights('winter', 'day').rain,
    );
    expect(getWeatherWeights('summer', 'day').heatwave).toBeGreaterThan(
      getWeatherWeights('spring', 'day').heatwave,
    );
    expect(getWeatherWeights('autumn', 'dusk').wind).toBeGreaterThan(
      getWeatherWeights('spring', 'day').wind,
    );
    expect(getWeatherWeights('winter', 'night').coldfront).toBeGreaterThan(
      getWeatherWeights('summer', 'night').coldfront,
    );
    expect(getWeatherWeights('summer', 'day').heatwave).toBeGreaterThan(
      getWeatherWeights('winter', 'day').heatwave,
    );
  });
});
