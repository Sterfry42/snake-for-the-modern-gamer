import { describe, expect, it } from 'vitest';
import {
  getArcadeCorruptionTier,
  getArcadeDeadPixelCount,
  getArcadeGlitchPressure,
  isArcadeBlueScreenEligible,
  maybeScheduleArcadeCorruption,
  shouldTriggerArcadeBlueScreen,
} from '../arcadeSnakeCorruption.js';
import {
  createArcadeSnakeRun,
  queueArcadeDirection,
  tickArcadeSnake,
} from '../arcadeSnakeLogic.js';
import { createDefaultArcadeSnakeSaveData } from '../arcadeSnakeTypes.js';

describe('arcade corruption', () => {
  it('calculates pressure and tiers at specified thresholds', () => {
    const save = createDefaultArcadeSnakeSaveData();
    save.stats.corruption = 10;
    save.stats.lifetimeScore = 60;
    save.stats.playCount = 4;
    const run = createArcadeSnakeRun(save, () => 0.99);
    run.score = 20;
    run.corruptionThisRun = 5;
    run.elapsedMs = 10_000;
    expect(getArcadeGlitchPressure(save.stats, run)).toBe(18);
    expect(getArcadeCorruptionTier(4)).toBe(0);
    expect(getArcadeCorruptionTier(5)).toBe(1);
    expect(getArcadeCorruptionTier(15)).toBe(2);
    expect(getArcadeCorruptionTier(30)).toBe(3);
    expect(getArcadeCorruptionTier(50)).toBe(4);
  });

  it('increases dead pixels by tier', () => {
    expect(getArcadeDeadPixelCount(0, () => 0)).toBe(0);
    expect(getArcadeDeadPixelCount(1, () => 0)).toBe(1);
    expect(getArcadeDeadPixelCount(2, () => 0)).toBe(3);
    expect(getArcadeDeadPixelCount(4, () => 0.999)).toBe(20);
  });

  it('gates blue screens behind later play, high pressure, time, and a bad apple this run', () => {
    const save = createDefaultArcadeSnakeSaveData();
    const run = createArcadeSnakeRun(save, () => 0.99);
    save.stats.playCount = 1;
    expect(isArcadeBlueScreenEligible(save.stats, run, 0)).toBe(false);
    run.elapsedMs = 12_000;
    run.corruptedApplesEatenThisRun = 1;
    expect(isArcadeBlueScreenEligible(save.stats, run, 29)).toBe(false);
    expect(isArcadeBlueScreenEligible(save.stats, run, 30)).toBe(true);
    run.tick = 18;
    save.stats.corruption = 40;
    expect(shouldTriggerArcadeBlueScreen(save.stats, run, () => 0.001)).toBe(true);
    run.corruptedApplesEatenThisRun = 0;
    expect(shouldTriggerArcadeBlueScreen(save.stats, run, () => 0)).toBe(false);
  });

  it('schedules direction failure at tier 2+ and never disables current movement', () => {
    const save = createDefaultArcadeSnakeSaveData();
    save.stats.corruption = 35;
    const run = createArcadeSnakeRun(save, () => 0.99);
    run.elapsedMs = 10_000;
    run.tick = 20;
    const events = maybeScheduleArcadeCorruption(save.stats, run, () => 0);
    const failure = events.find((event) => event.type === 'direction-failure-start');
    expect(failure?.type).toBe('direction-failure-start');
    if (failure?.type === 'direction-failure-start') {
      expect(failure.direction).not.toBe(run.direction);
      expect(queueArcadeDirection(run, failure.direction)).toContainEqual({
        type: 'direction-failure-input-rejected',
        direction: failure.direction,
      });
    }
  });

  it('expires a disabled direction while current movement continues', () => {
    const save = createDefaultArcadeSnakeSaveData();
    const run = createArcadeSnakeRun(save, () => 0.99);
    run.apple.position = { x: 12, y: 10 };
    run.disabledDirection = 'down';
    run.disabledDirectionUntilTick = 1;
    const events = tickArcadeSnake(run, save, () => 0.99).events;
    expect(events).toContainEqual({ type: 'direction-failure-end', direction: 'down' });
    expect(run.disabledDirection).toBeUndefined();
    expect(run.snake[0]).toEqual({ x: 7, y: 6 });
  });

  it('can schedule independent pauses and speed changes at elevated pressure', () => {
    const save = createDefaultArcadeSnakeSaveData();
    save.stats.corruption = 35;
    const run = createArcadeSnakeRun(save, () => 0.99);
    run.elapsedMs = 15_000;
    run.tick = 120;
    const events = maybeScheduleArcadeCorruption(save.stats, run, () => 0);
    expect(events.some((event) => event.type === 'system-pause')).toBe(true);
    expect(events.some((event) => event.type === 'speed-shift')).toBe(true);
    expect(run.speedMultiplier).not.toBe(1);
  });

  it('adds deleted tiles at moderate-high pressure', () => {
    const save = createDefaultArcadeSnakeSaveData();
    save.stats.corruption = 35;
    const run = createArcadeSnakeRun(save, () => 0.99);
    run.tick = 114;
    const events = maybeScheduleArcadeCorruption(save.stats, run, () => 0);
    expect(events.some((event) => event.type === 'deleted-tile-added')).toBe(true);
    expect(run.deletedTiles).toHaveLength(1);
  });
});
