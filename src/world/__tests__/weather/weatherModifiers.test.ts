import { describe, expect, it } from 'vitest';
import { defaultAtmosphereConfig, type AppleSystemConfig, type GridConfig } from '../../../config/gameConfig.js';
import { WorldAtmosphereSystem } from '../../atmosphereSystem.js';
import { AppleService } from '../../../apples/appleService.js';
import type { AtmosphereState } from '../../atmosphereTypes.js';
import { WorldService } from '../../worldService.js';

describe('Weather Modifiers', () => {
  describe('WeatherSpawnModifiers', () => {
    it('has correct structure with default values', () => {
      const service = new AppleService(
        {
          types: [],
          skittishMoveChance: 0.1,
        } as unknown as AppleSystemConfig,
        { cols: 10, rows: 10 } as unknown as GridConfig,
        {} as unknown as WorldService,
        () => 0.5,
      );

      const modifiers = service.calculateWeatherModifiers();
      expect(modifiers.spawnRateScalar).toBe(1);
      expect(modifiers.decayRateScalar).toBe(1);
      expect(modifiers.visibilityScalar).toBe(1);
      expect(modifiers.bonusApples.size).toBe(0);
      expect(modifiers.suppressedApples.size).toBe(0);
    });

    it('returns rain modifiers correctly', () => {
      const service = new AppleService(
        {
          types: [],
          skittishMoveChance: 0.1,
        } as unknown as AppleSystemConfig,
        { cols: 10, rows: 10 } as unknown as GridConfig,
        {} as unknown as WorldService,
        () => 0.5,
      );

      const weatherState: AtmosphereState = {
        worldDay: 0,
        season: 'spring',
        dayPhase: 'day',
        phaseProgress: 0.5,
        globalWeather: 'rain',
        weatherIntensity: 0.7,
        remainingWeatherPhaseTicks: 2,
        weatherSeed: 12345,
        weatherTransitionProgress: 1,
      };

      const modifiers = service.calculateWeatherModifiers({ atmosphere: weatherState });
      expect(modifiers.spawnRateScalar).toBe(1);
      expect(modifiers.visibilityScalar).toBe(0.95);
      expect(modifiers.bonusApples.has('skittish')).toBe(true);
      expect(modifiers.bonusApples.has('koi')).toBe(true);
    });

    it('returns snow modifiers correctly', () => {
      const service = new AppleService(
        {
          types: [],
          skittishMoveChance: 0.1,
        } as unknown as AppleSystemConfig,
        { cols: 10, rows: 10 } as unknown as GridConfig,
        {} as unknown as WorldService,
        () => 0.5,
      );

      const weatherState: AtmosphereState = {
        worldDay: 60,
        season: 'winter',
        dayPhase: 'day',
        phaseProgress: 0.5,
        globalWeather: 'coldfront',
        weatherIntensity: 0.8,
        remainingWeatherPhaseTicks: 2,
        weatherSeed: 12345,
        weatherTransitionProgress: 1,
      };

      const modifiers = service.calculateWeatherModifiers({ atmosphere: weatherState });
      expect(modifiers.spawnRateScalar).toBe(0.8);
      expect(modifiers.visibilityScalar).toBe(0.7);
      expect(modifiers.bonusApples.has('wasabi')).toBe(true);
    });

    it('returns fog modifiers correctly', () => {
      const service = new AppleService(
        {
          types: [],
          skittishMoveChance: 0.1,
        } as unknown as AppleSystemConfig,
        { cols: 10, rows: 10 } as unknown as GridConfig,
        {} as unknown as WorldService,
        () => 0.5,
      );

      const weatherState: AtmosphereState = {
        worldDay: 30,
        season: 'autumn',
        dayPhase: 'dawn',
        phaseProgress: 0.5,
        globalWeather: 'fog',
        weatherIntensity: 0.6,
        remainingWeatherPhaseTicks: 2,
        weatherSeed: 12345,
        weatherTransitionProgress: 1,
      };

      const modifiers = service.calculateWeatherModifiers({ atmosphere: weatherState });
      expect(modifiers.visibilityScalar).toBe(0.6);
      expect(modifiers.bonusApples.has('caffeinated')).toBe(true);
    });

    it('returns storm modifiers correctly', () => {
      const service = new AppleService(
        {
          types: [],
          skittishMoveChance: 0.1,
        } as unknown as AppleSystemConfig,
        { cols: 10, rows: 10 } as unknown as GridConfig,
        {} as unknown as WorldService,
        () => 0.5,
      );

      const weatherState: AtmosphereState = {
        worldDay: 15,
        season: 'summer',
        dayPhase: 'night',
        phaseProgress: 0.5,
        globalWeather: 'storm',
        weatherIntensity: 0.9,
        remainingWeatherPhaseTicks: 2,
        weatherSeed: 12345,
        weatherTransitionProgress: 1,
      };

      const modifiers = service.calculateWeatherModifiers({ atmosphere: weatherState });
      expect(modifiers.spawnRateScalar).toBe(0.7);
      expect(modifiers.suppressedApples.has('caffeinated')).toBe(true);
    });

    it('returns heatwave modifiers correctly', () => {
      const service = new AppleService(
        {
          types: [],
          skittishMoveChance: 0.1,
        } as unknown as AppleSystemConfig,
        { cols: 10, rows: 10 } as unknown as GridConfig,
        {} as unknown as WorldService,
        () => 0.5,
      );

      const weatherState: AtmosphereState = {
        worldDay: 45,
        season: 'summer',
        dayPhase: 'day',
        phaseProgress: 0.5,
        globalWeather: 'heatwave',
        weatherIntensity: 0.85,
        remainingWeatherPhaseTicks: 2,
        weatherSeed: 12345,
        weatherTransitionProgress: 1,
      };

      const modifiers = service.calculateWeatherModifiers({ atmosphere: weatherState });
      expect(modifiers.spawnRateScalar).toBe(1.5);
      expect(modifiers.decayRateScalar).toBe(1.5);
      expect(modifiers.bonusApples.has('caffeinated')).toBe(true);
      expect(modifiers.bonusApples.has('treat')).toBe(true);
    });

    it('returns seasonal modifiers correctly', () => {
      const service = new AppleService(
        {
          types: [],
          skittishMoveChance: 0.1,
        } as unknown as AppleSystemConfig,
        { cols: 10, rows: 10 } as unknown as GridConfig,
        {} as unknown as WorldService,
        () => 0.5,
      );

      // Spring
      const springState: AtmosphereState = {
        worldDay: 0,
        season: 'spring',
        dayPhase: 'day',
        phaseProgress: 0.5,
        globalWeather: 'clear',
        weatherIntensity: 0.5,
        remainingWeatherPhaseTicks: 2,
        weatherSeed: 12345,
        weatherTransitionProgress: 1,
      };
      expect(
        service.calculateWeatherModifiers({ atmosphere: springState }).bonusApples.has('lavender'),
      ).toBe(true);

      // Summer
      const summerState: AtmosphereState = {
        worldDay: 7,
        season: 'summer',
        dayPhase: 'day',
        phaseProgress: 0.5,
        globalWeather: 'clear',
        weatherIntensity: 0.5,
        remainingWeatherPhaseTicks: 2,
        weatherSeed: 12345,
        weatherTransitionProgress: 1,
      };
      const summerModifiers = service.calculateWeatherModifiers({ atmosphere: summerState });
      expect(summerModifiers.spawnRateScalar).toBe(1.1);
      expect(summerModifiers.bonusApples.has('caffeinated')).toBe(true);

      // Autumn
      const autumnState: AtmosphereState = {
        worldDay: 14,
        season: 'autumn',
        dayPhase: 'day',
        phaseProgress: 0.5,
        globalWeather: 'clear',
        weatherIntensity: 0.5,
        remainingWeatherPhaseTicks: 2,
        weatherSeed: 12345,
        weatherTransitionProgress: 1,
      };
      const autumnModifiers = service.calculateWeatherModifiers({ atmosphere: autumnState });
      expect(autumnModifiers.visibilityScalar).toBe(0.9);
      expect(autumnModifiers.bonusApples.has('mochi')).toBe(true);

      // Winter
      const winterState: AtmosphereState = {
        worldDay: 21,
        season: 'winter',
        dayPhase: 'day',
        phaseProgress: 0.5,
        globalWeather: 'clear',
        weatherIntensity: 0.5,
        remainingWeatherPhaseTicks: 2,
        weatherSeed: 12345,
        weatherTransitionProgress: 1,
      };
      const winterModifiers = service.calculateWeatherModifiers({ atmosphere: winterState });
      expect(winterModifiers.visibilityScalar).toBe(0.8);
      expect(winterModifiers.bonusApples.has('wasabi')).toBe(true);
    });
  });

  describe('AtmosphereSystem weather transitions', () => {
    it('starts with clear weather', () => {
      const system = new WorldAtmosphereSystem(defaultAtmosphereConfig, 'test-seed');
      const state = system.getState();
      expect(state.globalWeather).toBe('clear');
    });

    it('changes season after configured days', () => {
      const system = new WorldAtmosphereSystem(
        { ...defaultAtmosphereConfig, daysPerSeason: 1 },
        'season-test',
      );

      // Advance past spring days
      system.update(300_000);
      expect(system.getState().season).toBe('summer');

      system.update(300_000);
      expect(system.getState().season).toBe('autumn');

      system.update(300_000);
      expect(system.getState().season).toBe('winter');

      system.update(300_000);
      expect(system.getState().season).toBe('spring');
    });

    it('cycles through weather types', () => {
      const system = new WorldAtmosphereSystem(defaultAtmosphereConfig, 'weather-cycle');
      const weatherHistory = new Set<string>();

      // Advance enough to see multiple weather changes
      for (let i = 0; i < 20; i++) {
        system.update(120_000);
        weatherHistory.add(system.getState().globalWeather);
      }

      // Should have seen at least a few different weather types
      expect(weatherHistory.size).toBeGreaterThan(1);
    });

    it('produces deterministic weather for same seed', () => {
      const first = new WorldAtmosphereSystem(defaultAtmosphereConfig, 'deterministic');
      const second = new WorldAtmosphereSystem(defaultAtmosphereConfig, 'deterministic');

      for (let i = 0; i < 10; i++) {
        first.update(60_000);
        second.update(60_000);
        expect(first.getState().globalWeather).toBe(second.getState().globalWeather);
        expect(first.getState().season).toBe(second.getState().season);
      }
    });
  });
});
