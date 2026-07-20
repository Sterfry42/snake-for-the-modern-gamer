import { describe, expect, it } from 'vitest';
import {
  getAnimalWeatherBehavior,
  getAnimalSpawnModifier,
  isAnimalActive,
  shouldAnimalSeekShelter,
  shouldFishingBeFavored,
  getAnimalWeatherMessage,
} from '../weatherEffects.js';

describe('Animal Weather Effects', () => {
  describe('getAnimalWeatherBehavior', () => {
    it('returns base behavior for clear weather', () => {
      const behavior = getAnimalWeatherBehavior('rabbit', 'clear', 'spring');
      expect(behavior.spawnWeightModifier).toBe(1);
      expect(behavior.moveIntervalModifier).toBe(0);
      expect(behavior.fleeChanceModifier).toBe(0);
      expect(behavior.seekingShelter).toBe(false);
      expect(behavior.active).toBe(true);
    });

    it('makes frogs and fish more active during rain', () => {
      const frogBehavior = getAnimalWeatherBehavior('frog', 'rain', 'spring');
      expect(frogBehavior.spawnWeightModifier).toBe(1.5);
      expect(frogBehavior.moveIntervalModifier).toBe(-1);
      expect(frogBehavior.active).toBe(true);

      const fishBehavior = getAnimalWeatherBehavior('fish', 'rain', 'spring');
      expect(fishBehavior.spawnWeightModifier).toBe(1.5);
    });

    it('makes predators less active during rain', () => {
      const wolfBehavior = getAnimalWeatherBehavior('wolf', 'rain', 'spring');
      expect(wolfBehavior.spawnWeightModifier).toBe(0.7);
      expect(wolfBehavior.moveIntervalModifier).toBe(1);

      const foxBehavior = getAnimalWeatherBehavior('fox', 'rain', 'spring');
      expect(foxBehavior.spawnWeightModifier).toBe(0.7);
    });

    it('causes bears to hibernate during snow (coldfront)', () => {
      const bearBehavior = getAnimalWeatherBehavior('bear', 'coldfront', 'winter');
      expect(bearBehavior.spawnWeightModifier).toBe(0);
      expect(bearBehavior.active).toBe(false);
      expect(bearBehavior.seekingShelter).toBe(true);
    });

    it('reduces rabbit and deer activity during snow (coldfront)', () => {
      const rabbitBehavior = getAnimalWeatherBehavior('rabbit', 'coldfront', 'winter');
      expect(rabbitBehavior.spawnWeightModifier).toBe(0.5);
      expect(rabbitBehavior.seekingShelter).toBe(true);

      const deerBehavior = getAnimalWeatherBehavior('deer', 'coldfront', 'winter');
      expect(deerBehavior.spawnWeightModifier).toBe(0.5);
    });

    it('makes wolves and snakes more active during snow (coldfront)', () => {
      const wolfBehavior = getAnimalWeatherBehavior('wolf', 'coldfront', 'winter');
      expect(wolfBehavior.spawnWeightModifier).toBe(1.3);
      expect(wolfBehavior.moveIntervalModifier).toBe(-1);

      const snakeBehavior = getAnimalWeatherBehavior('snake', 'coldfront', 'winter');
      expect(snakeBehavior.spawnWeightModifier).toBe(1.3);
    });

    it('causes bears to hibernate in winter clear weather', () => {
      const bearBehavior = getAnimalWeatherBehavior('bear', 'clear', 'winter');
      expect(bearBehavior.spawnWeightModifier).toBe(0);
      expect(bearBehavior.active).toBe(false);
      expect(bearBehavior.seekingShelter).toBe(true);
    });

    it('reduces rabbit activity in winter clear weather', () => {
      const rabbitBehavior = getAnimalWeatherBehavior('rabbit', 'clear', 'winter');
      expect(rabbitBehavior.spawnWeightModifier).toBe(0.5);
      expect(rabbitBehavior.seekingShelter).toBe(true);
    });

    it('makes all animals flee during storms', () => {
      const behavior = getAnimalWeatherBehavior('rabbit', 'storm', 'spring');
      expect(behavior.spawnWeightModifier).toBe(0.3);
      expect(behavior.seekingShelter).toBe(true);
      expect(behavior.fleeChanceModifier).toBe(0.5);
    });

    it('reduces bird activity during fog', () => {
      const birdBehavior = getAnimalWeatherBehavior('bird', 'fog', 'spring');
      expect(birdBehavior.spawnWeightModifier).toBe(0.6);
      expect(birdBehavior.moveIntervalModifier).toBe(1);
    });

    it('makes most animals lethargic during heatwaves', () => {
      const bearBehavior = getAnimalWeatherBehavior('bear', 'heatwave', 'summer');
      expect(bearBehavior.spawnWeightModifier).toBe(0.4);
      expect(bearBehavior.seekingShelter).toBe(true);

      const foxBehavior = getAnimalWeatherBehavior('fox', 'heatwave', 'summer');
      expect(foxBehavior.spawnWeightModifier).toBe(1.2);
      expect(foxBehavior.moveIntervalModifier).toBe(-1);
    });

    it('makes birds flee during cold fronts', () => {
      const birdBehavior = getAnimalWeatherBehavior('bird', 'coldfront', 'autumn');
      expect(birdBehavior.spawnWeightModifier).toBe(0.5);
      expect(birdBehavior.seekingShelter).toBe(true);
    });

    it('makes birds less active during wind', () => {
      const birdBehavior = getAnimalWeatherBehavior('bird', 'wind', 'spring');
      expect(birdBehavior.spawnWeightModifier).toBe(0.7);
    });

    it('makes skittish animals flee more during wind', () => {
      const rabbitBehavior = getAnimalWeatherBehavior('rabbit', 'wind', 'spring');
      expect(rabbitBehavior.fleeChanceModifier).toBe(0.3);
      expect(rabbitBehavior.moveIntervalModifier).toBe(-1);
    });
  });

  describe('getAnimalSpawnModifier', () => {
    it('returns 1 for clear weather', () => {
      expect(getAnimalSpawnModifier('rabbit', 'clear', 'spring')).toBe(1);
    });

    it('returns 0 for hibernating animals', () => {
      expect(getAnimalSpawnModifier('bear', 'coldfront', 'winter')).toBe(0);
    });

    it('returns 1.5 for amphibians during rain', () => {
      expect(getAnimalSpawnModifier('frog', 'rain', 'spring')).toBe(1.5);
    });
  });

  describe('isAnimalActive', () => {
    it('returns false for hibernating bears in winter', () => {
      expect(isAnimalActive('bear', 'clear', 'winter')).toBe(false);
      expect(isAnimalActive('bear', 'coldfront', 'winter')).toBe(false);
    });

    it('returns true for active animals in clear weather', () => {
      expect(isAnimalActive('rabbit', 'clear', 'spring')).toBe(true);
    });

    it('returns true for foxes during heatwaves (nocturnal)', () => {
      expect(isAnimalActive('fox', 'heatwave', 'summer')).toBe(true);
    });
  });

  describe('shouldAnimalSeekShelter', () => {
    it('returns true for bears during winter', () => {
      expect(shouldAnimalSeekShelter('bear', 'clear', 'winter')).toBe(true);
    });

    it('returns true for all animals during storms', () => {
      expect(shouldAnimalSeekShelter('rabbit', 'storm', 'spring')).toBe(true);
    });

    it('returns false for clear weather', () => {
      expect(shouldAnimalSeekShelter('rabbit', 'clear', 'spring')).toBe(false);
    });
  });

  describe('shouldFishingBeFavored', () => {
    it('returns true for rain', () => {
      expect(shouldFishingBeFavored('rain')).toBe(true);
    });

    it('returns false for other weather', () => {
      expect(shouldFishingBeFavored('clear')).toBe(false);
      expect(shouldFishingBeFavored('coldfront')).toBe(false);
      expect(shouldFishingBeFavored('storm')).toBe(false);
    });
  });

  describe('getAnimalWeatherMessage', () => {
    it('returns seekingShelter message for hibernating bears', () => {
      const message = getAnimalWeatherMessage('bear', 'clear', 'winter');
      expect(message).toBe('weatherAnimalSeekingShelter');
    });

    it('returns active message for boosted animals', () => {
      const message = getAnimalWeatherMessage('frog', 'rain', 'spring');
      expect(message).toBe('weatherAnimalActive');
    });

    it('returns null for normal behavior', () => {
      const message = getAnimalWeatherMessage('rabbit', 'clear', 'spring');
      expect(message).toBeNull();
    });
  });

  describe('Season interactions', () => {
    it('bears hibernate in winter', () => {
      expect(isAnimalActive('bear', 'clear', 'winter')).toBe(false);
      expect(getAnimalSpawnModifier('bear', 'clear', 'winter')).toBe(0);
    });

    it('frogs are active in spring rain', () => {
      expect(getAnimalSpawnModifier('frog', 'rain', 'spring')).toBe(1.5);
      expect(isAnimalActive('frog', 'rain', 'spring')).toBe(true);
    });

    it('birds migrate in autumn cold fronts', () => {
      expect(getAnimalSpawnModifier('bird', 'coldfront', 'autumn')).toBe(0.5);
      expect(shouldAnimalSeekShelter('bird', 'coldfront', 'autumn')).toBe(true);
    });
  });
});
