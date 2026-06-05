import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RACCOON_MODE_CONFIG,
  calculateRaccoonStashReward,
  getNextRaccoonWeightThreshold,
  getRaccoonRenderableBody,
  getRaccoonSpeedMultiplier,
  normalizeCharacterMode,
  restoreRaccoonHunger,
  tickRaccoonHunger,
} from './raccoonMode.js';

describe('raccoonMode', () => {
  it('normalizes unknown character modes to snake', () => {
    expect(normalizeCharacterMode('raccoon')).toBe('raccoon');
    expect(normalizeCharacterMode('trash panda')).toBe('snake');
  });

  it('starts a little faster than snake and slows at weight thresholds', () => {
    expect(getRaccoonSpeedMultiplier(0)).toBeCloseTo(1.25);
    expect(getRaccoonSpeedMultiplier(9)).toBeCloseTo(1.25);
    expect(getRaccoonSpeedMultiplier(10)).toBeCloseTo(1.125);
    expect(getRaccoonSpeedMultiplier(20)).toBeCloseTo(0.9375);
    expect(getRaccoonSpeedMultiplier(30)).toBeCloseTo(0.8125);
    expect(getRaccoonSpeedMultiplier(50)).toBeCloseTo(0.625);
    expect(getRaccoonSpeedMultiplier(100)).toBeCloseTo(0.4375);
    expect(getRaccoonSpeedMultiplier(200)).toBeCloseTo(0.28125);
  });

  it('reports the next visible weight threshold', () => {
    expect(getNextRaccoonWeightThreshold(0)).toBe(10);
    expect(getNextRaccoonWeightThreshold(43)).toBe(50);
    expect(getNextRaccoonWeightThreshold(200)).toBeUndefined();
  });

  it('ticks hunger only after the configured timeout', () => {
    const beforeTimeout = tickRaccoonHunger({
      elapsedMs: 6_000,
      currentHunger: 3,
      maxHunger: 3,
      timerMs: 0,
      config: DEFAULT_RACCOON_MODE_CONFIG,
    });
    expect(beforeTimeout.currentHunger).toBe(3);

    const afterTimeout = tickRaccoonHunger({
      elapsedMs: 667,
      currentHunger: beforeTimeout.currentHunger,
      maxHunger: 3,
      timerMs: beforeTimeout.timerMs,
      config: DEFAULT_RACCOON_MODE_CONFIG,
    });
    expect(afterTimeout.currentHunger).toBe(2);
    expect(afterTimeout.hungerLost).toBe(1);
  });

  it('restores hunger without exceeding max', () => {
    expect(restoreRaccoonHunger(1, 3, 1)).toBe(2);
    expect(restoreRaccoonHunger(3, 3, 1)).toBe(3);
  });

  it('increases stash reward with deposit size and bandit meter', () => {
    expect(calculateRaccoonStashReward(9, 0).score).toBe(9);
    expect(calculateRaccoonStashReward(25, 0).score).toBe(33);
    expect(calculateRaccoonStashReward(25, 100).score).toBeGreaterThan(33);
  });

  it('renders raccoon mode as one visible body segment', () => {
    expect(
      getRaccoonRenderableBody([
        { x: 5, y: 5 },
        { x: 4, y: 5 },
      ]),
    ).toEqual([{ x: 5, y: 5 }]);
  });
});
