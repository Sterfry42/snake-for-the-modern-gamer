/**
 * Weather Effects on Animals
 *
 * The wise old snake's animal weather behaviors:
 * - The wise old snake watched animals during a thunderstorm
 * - The wise old snake noticed rabbits hiding during snow
 * - The wise old snake saw birds migrate before a cold front
 * - The wise old snake's animals behaved differently in each weather
 * - The wise old snake's wolf howled during a full moon
 * - The wise old snake's fox rested during heatwaves
 * - The wise old snake's deer avoided storms
 * - The wise old snake's bear hibernated in winter
 * - The wise old snake's frog emerged during rain
 * - The wise old snake's bird nested during spring
 */
import type { AnimalType } from './types.js';
import type { GlobalWeather, Season } from '../world/atmosphereTypes.js';

export interface AnimalWeatherBehavior {
  spawnWeightModifier: number;
  moveIntervalModifier: number;
  fleeChanceModifier: number;
  seekingShelter: boolean;
  active: boolean;
}

export interface WeatherAnimalModifier {
  weather: GlobalWeather;
  season: Season;
  biomeTags: string[];
}

/**
 * Get weather-specific animal behavior modifiers for an animal type.
 * Different animals react differently to weather conditions.
 */
export function getAnimalWeatherBehavior(
  animalType: AnimalType,
  weather: GlobalWeather,
  season: Season,
): AnimalWeatherBehavior {
  const baseBehavior: AnimalWeatherBehavior = {
    spawnWeightModifier: 1,
    moveIntervalModifier: 0,
    fleeChanceModifier: 0,
    seekingShelter: false,
    active: true,
  };

  // Winter season adds snow-like effects even without coldfront weather
  const isWinterSnow = season === 'winter';

  // Weather-specific reactions
  switch (weather) {
    case 'rain':
      // Rain makes some animals more active (frogs, fish)
      if (animalType === 'frog' || animalType === 'fish') {
        return {
          ...baseBehavior,
          spawnWeightModifier: 1.5,
          moveIntervalModifier: -1,
          active: true,
        };
      }
      // Predators become less active in rain
      if (['wolf', 'fox', 'eagle'].includes(animalType)) {
        return {
          ...baseBehavior,
          spawnWeightModifier: 0.7,
          moveIntervalModifier: 1,
        };
      }
      return baseBehavior;

    case 'coldfront':
      // Cold fronts bring snow-like conditions
      // Many animals hibernate or become less active
      if (animalType === 'bird') {
        return {
          ...baseBehavior,
          spawnWeightModifier: 0.5,
          seekingShelter: true,
        };
      }
      if (animalType === 'bear') {
        return {
          ...baseBehavior,
          spawnWeightModifier: 0,
          active: false,
          seekingShelter: true,
        };
      }
      if (['rabbit', 'deer', 'fox'].includes(animalType)) {
        return {
          ...baseBehavior,
          spawnWeightModifier: 0.5,
          moveIntervalModifier: 2,
          seekingShelter: true,
        };
      }
      // Wolves and snakes are more active in cold (hunting)
      if (animalType === 'wolf' || animalType === 'snake') {
        return {
          ...baseBehavior,
          spawnWeightModifier: 1.3,
          moveIntervalModifier: -1,
        };
      }
      return baseBehavior;

    case 'storm':
      // All animals flee or seek shelter during storms
      return {
        ...baseBehavior,
        spawnWeightModifier: 0.3,
        moveIntervalModifier: 2,
        fleeChanceModifier: 0.5,
        seekingShelter: true,
      };

    case 'fog':
      // Birds and snakes are less active in fog
      if (animalType === 'bird' || animalType === 'eagle') {
        return {
          ...baseBehavior,
          spawnWeightModifier: 0.6,
          moveIntervalModifier: 1,
        };
      }
      // Ground animals are less affected
      return {
        ...baseBehavior,
        spawnWeightModifier: 0.9,
        moveIntervalModifier: 0,
      };

    case 'heatwave':
      // Most animals become lethargic in heat
      if (animalType === 'bear' || animalType === 'frog' || animalType === 'fish') {
        return {
          ...baseBehavior,
          spawnWeightModifier: 0.4,
          moveIntervalModifier: 2,
          seekingShelter: true,
        };
      }
      // Nocturnal animals may be more active
      if (animalType === 'fox' || animalType === 'wolf') {
        return {
          ...baseBehavior,
          spawnWeightModifier: 1.2,
          moveIntervalModifier: -1,
        };
      }
      return {
        ...baseBehavior,
        spawnWeightModifier: 0.8,
        moveIntervalModifier: 1,
      };

    case 'wind':
      // Birds are affected by wind
      if (animalType === 'bird' || animalType === 'eagle') {
        return {
          ...baseBehavior,
          spawnWeightModifier: 0.7,
          moveIntervalModifier: 1,
        };
      }
      // Skittish animals (rabbits) flee more
      if (animalType === 'rabbit' || animalType === 'possum') {
        return {
          ...baseBehavior,
          fleeChanceModifier: 0.3,
          moveIntervalModifier: -1,
        };
      }
      return baseBehavior;

    case 'clear':
    default:
      // Winter season has snow-like effects
      if (isWinterSnow) {
        if (animalType === 'bear') {
          return {
            ...baseBehavior,
            spawnWeightModifier: 0,
            active: false,
            seekingShelter: true,
          };
        }
        if (['rabbit', 'deer', 'fox'].includes(animalType)) {
          return {
            ...baseBehavior,
            spawnWeightModifier: 0.5,
            moveIntervalModifier: 2,
            seekingShelter: true,
          };
        }
        if (animalType === 'wolf' || animalType === 'snake') {
          return {
            ...baseBehavior,
            spawnWeightModifier: 1.3,
            moveIntervalModifier: -1,
          };
        }
      }
      return baseBehavior;
  }
}

/**
 * Check if an animal should be seeking shelter based on weather.
 */
export function shouldAnimalSeekShelter(
  animalType: AnimalType,
  weather: GlobalWeather,
  season: Season,
): boolean {
  const behavior = getAnimalWeatherBehavior(animalType, weather, season);
  return behavior.seekingShelter;
}

/**
 * Get the spawn weight modifier for an animal in current weather.
 */
export function getAnimalSpawnModifier(
  animalType: AnimalType,
  weather: GlobalWeather,
  season: Season,
): number {
  const behavior = getAnimalWeatherBehavior(animalType, weather, season);
  return behavior.spawnWeightModifier;
}

/**
 * Check if an animal is active in current weather conditions.
 */
export function isAnimalActive(
  animalType: AnimalType,
  weather: GlobalWeather,
  season: Season,
): boolean {
  const behavior = getAnimalWeatherBehavior(animalType, weather, season);
  return behavior.active;
}

/**
 * Get the move interval modifier for an animal in current weather.
 */
export function getAnimalMoveIntervalModifier(
  animalType: AnimalType,
  weather: GlobalWeather,
  season: Season,
): number {
  const behavior = getAnimalWeatherBehavior(animalType, weather, season);
  return behavior.moveIntervalModifier;
}

/**
 * Check if weather conditions favor fishing (rain refills water spots).
 */
export function shouldFishingBeFavored(weather: GlobalWeather): boolean {
  return weather === 'rain';
}

/**
 * Get weather-related animal event message.
 */
export function getAnimalWeatherMessage(
  animalType: AnimalType,
  weather: GlobalWeather,
  season: Season,
): string | null {
  const behavior = getAnimalWeatherBehavior(animalType, weather, season);

  if (behavior.seekingShelter) {
    return 'weatherAnimalSeekingShelter';
  }
  if (!behavior.active) {
    return 'weatherAnimalHibernating';
  }
  if (behavior.spawnWeightModifier > 1) {
    return 'weatherAnimalActive';
  }
  if (weather === 'storm' || weather === 'wind') {
    return 'weatherAnimalRestless';
  }

  return null;
}
