import { describe, expect, it } from 'vitest';
import { defaultAtmosphereConfig } from '../../config/gameConfig.js';
import { getAllBiomeDefinitions } from '../biomes.js';
import { BIOME_ATMOSPHERE_PROFILES } from '../biomeAtmosphereProfiles.js';
import { resolveBiomeAtmosphere } from '../atmosphereResolver.js';
import type { AtmosphereState, GlobalWeather } from '../atmosphereTypes.js';

function state(globalWeather: GlobalWeather): AtmosphereState {
  return {
    worldDay: 0,
    season: 'spring',
    dayPhase: 'day',
    phaseProgress: 0,
    globalWeather,
    weatherIntensity: 0.75,
    remainingWeatherPhaseTicks: 2,
    weatherSeed: 123,
  };
}

describe('resolveBiomeAtmosphere', () => {
  it('has explicit profile coverage for every biome', () => {
    const biomeIds = getAllBiomeDefinitions()
      .map((biome) => biome.id)
      .sort();
    expect(Object.keys(BIOME_ATMOSPHERE_PROFILES).sort()).toEqual(biomeIds);
  });

  it('resolves every biome and weather without throwing', () => {
    const weather: GlobalWeather[] = [
      'clear',
      'rain',
      'storm',
      'fog',
      'heatwave',
      'coldfront',
      'wind',
    ];

    for (const biome of getAllBiomeDefinitions()) {
      for (const entry of weather) {
        const view = resolveBiomeAtmosphere(biome, state(entry), defaultAtmosphereConfig);
        expect(view.biomeId).toBe(biome.id);
        expect(view.localVisual).toEqual(expect.any(String));
        expect(view.gameplay.heatRateScalar).toBeGreaterThanOrEqual(0.5);
        expect(view.gameplay.heatRateScalar).toBeLessThanOrEqual(1.5);
        expect(view.gameplay.visibilityScalar).toBeGreaterThanOrEqual(0.65);
        expect(view.gameplay.visibilityScalar).toBeLessThanOrEqual(1);
      }
    }
  });

  it('implements required local weather translations', () => {
    const byId = Object.fromEntries(getAllBiomeDefinitions().map((biome) => [biome.id, biome]));

    expect(
      resolveBiomeAtmosphere(byId['rainforest']!, state('clear'), defaultAtmosphereConfig)
        .localVisual,
    ).toBe('rain');
    expect(
      resolveBiomeAtmosphere(byId['frozen-sea']!, state('rain'), defaultAtmosphereConfig)
        .localVisual,
    ).toBe('snow');
    expect(
      resolveBiomeAtmosphere(byId['frozen-sea']!, state('storm'), defaultAtmosphereConfig)
        .localVisual,
    ).toBe('whiteout');
    expect(
      resolveBiomeAtmosphere(byId['ember-waste']!, state('rain'), defaultAtmosphereConfig)
        .localVisual,
    ).toBe('steam');
    expect(
      resolveBiomeAtmosphere(byId['glass-desert']!, state('storm'), defaultAtmosphereConfig)
        .localVisual,
    ).toBe('dryLightning');
    expect(
      resolveBiomeAtmosphere(byId['sable-depths']!, state('rain'), defaultAtmosphereConfig)
        .localVisual,
    ).toBe('caveDrip');
    expect(
      resolveBiomeAtmosphere(byId['ember-caverns']!, state('rain'), defaultAtmosphereConfig)
        .localVisual,
    ).toBe('steam');
    expect(
      resolveBiomeAtmosphere(byId['neon-underpass']!, state('rain'), defaultAtmosphereConfig)
        .localVisual,
    ).toBe('neonRain');
    expect(
      resolveBiomeAtmosphere(byId['radioactive-orchard']!, state('rain'), defaultAtmosphereConfig)
        .localVisual,
    ).toBe('fallout');
    expect(
      resolveBiomeAtmosphere(byId['clockwork-quarry']!, state('storm'), defaultAtmosphereConfig)
        .localVisual,
    ).toBe('thunder');
  });

  it('keeps Home Hearth non-harmful', () => {
    const home = getAllBiomeDefinitions().find((biome) => biome.id === 'home-hearth')!;
    for (const weather of [
      'clear',
      'rain',
      'storm',
      'fog',
      'heatwave',
      'coldfront',
      'wind',
    ] as GlobalWeather[]) {
      const view = resolveBiomeAtmosphere(home, state(weather), defaultAtmosphereConfig);
      expect(view.gameplay.heatRateScalar).toBe(1);
      expect(view.gameplay.coldRateScalar).toBe(1);
      expect(view.gameplay.enemySpawnChanceScalar).toBe(1);
    }
  });

  it('lets cloudy weather override warm sunset tint', () => {
    const meadow = getAllBiomeDefinitions().find((biome) => biome.id === 'verdigris-basin')!;
    const clearDusk = resolveBiomeAtmosphere(
      meadow,
      { ...state('clear'), dayPhase: 'dusk', phaseProgress: 0 },
      defaultAtmosphereConfig,
    );
    const foggyDusk = resolveBiomeAtmosphere(
      meadow,
      { ...state('fog'), dayPhase: 'dusk', phaseProgress: 0 },
      defaultAtmosphereConfig,
    );

    expect(clearDusk.tint.color).not.toBe(foggyDusk.tint.color);
    expect(foggyDusk.tint.alpha).toBeGreaterThan(clearDusk.tint.alpha);
  });

  it('renders thunderstorms as intense rain with thunder identity', () => {
    const meadow = getAllBiomeDefinitions().find((biome) => biome.id === 'verdigris-basin')!;
    const view = resolveBiomeAtmosphere(
      meadow,
      { ...state('storm'), phaseProgress: 0.5 },
      defaultAtmosphereConfig,
    );

    expect(view.localVisual).toBe('thunder');
    expect(view.particles.density).toBeGreaterThan(0.5);
    expect(view.particles.speed).toBeGreaterThan(1.5);
  });

  it('disables gameplay and visuals when atmosphere config is disabled', () => {
    const frozen = getAllBiomeDefinitions().find((biome) => biome.id === 'frozen-sea')!;
    const view = resolveBiomeAtmosphere(frozen, state('storm'), {
      ...defaultAtmosphereConfig,
      enabled: false,
    });

    expect(view.localVisual).toBe('clear');
    expect(view.particles.density).toBe(0);
    expect(view.gameplay.coldRateScalar).toBe(1);
    expect(view.sheltered).toBe(true);
  });
});
