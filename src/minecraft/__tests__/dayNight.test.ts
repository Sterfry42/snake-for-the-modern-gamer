import { describe, it, expect } from 'vitest';
import { DayNightCycle } from '../dayNight.js';
import { LIGHT_LEVEL_MOB_SPAWN_THRESHOLD } from '../config.js';

describe('Day/Night Cycle', () => {
  it('should start at day 1, time 0', () => {
    const cycle = new DayNightCycle();
    expect(cycle.getDay()).toBe(1);
    expect(cycle.getTimeOfDay()).toBe(0);
  });

  it('should advance time', () => {
    const cycle = new DayNightCycle();
    cycle.tick();
    expect(cycle.getTimeOfDay()).toBe(1);

    cycle.tick();
    expect(cycle.getTimeOfDay()).toBe(2);
  });

  it('should advance days at day length', () => {
    const cycle = new DayNightCycle();
    // Advance to the end of the day
    for (let i = 0; i < 24000; i++) {
      cycle.tick();
    }
    expect(cycle.getDay()).toBe(2);
    expect(cycle.getTimeOfDay()).toBe(0);
  });

  it('should identify night correctly', () => {
    const cycle = new DayNightCycle();

    // Day time
    cycle.timeOfDay = 6000;
    expect(cycle.isDay()).toBe(true);
    expect(cycle.isNight()).toBe(false);

    // Night time
    cycle.timeOfDay = 14000;
    expect(cycle.isDay()).toBe(false);
    expect(cycle.isNight()).toBe(true);

    // Dawn
    cycle.timeOfDay = 2500;
    expect(cycle.isDay()).toBe(true);
    expect(cycle.isNight()).toBe(false);
  });

  it('should return sky alpha based on time', () => {
    const cycle = new DayNightCycle();

    // Day
    cycle.timeOfDay = 6000;
    expect(cycle.getSkyAlpha()).toBe(0);

    // Full night
    cycle.timeOfDay = 18000;
    const nightAlpha = cycle.getSkyAlpha();
    expect(nightAlpha).toBeGreaterThan(0);
    expect(nightAlpha).toBeLessThanOrEqual(0.6);
  });

  it('should return correct day phase', () => {
    const cycle = new DayNightCycle();

    cycle.timeOfDay = 2500;
    expect(cycle.getDayPhase()).toBe('dawn');

    cycle.timeOfDay = 8000;
    expect(cycle.getDayPhase()).toBe('day');

    cycle.timeOfDay = 13000;
    expect(cycle.getDayPhase()).toBe('dusk');

    cycle.timeOfDay = 18000;
    expect(cycle.getDayPhase()).toBe('night');
  });

  it('should reset correctly', () => {
    const cycle = new DayNightCycle();
    cycle.day = 100;
    cycle.timeOfDay = 20000;
    cycle.reset();

    expect(cycle.day).toBe(1);
    expect(cycle.getTimeOfDay()).toBe(0);
  });

  it('should return light level threshold from config', () => {
    expect(LIGHT_LEVEL_MOB_SPAWN_THRESHOLD).toBe(7);
  });
});
