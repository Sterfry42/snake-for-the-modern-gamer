import { describe, expect, it } from 'vitest';
import {
  addLifetimeScore,
  createDefaultLevelProgressionState,
  getLevelForLifetimeScore,
  getLevelProgressionView,
  getScoreForLevel,
} from '../levelProgression.js';

describe('level progression', () => {
  it('hits the requested score anchors', () => {
    expect(getScoreForLevel(1)).toBe(0);
    expect(getScoreForLevel(2)).toBe(100);
    expect(getScoreForLevel(10)).toBe(2000);
    expect(getScoreForLevel(20)).toBe(8000);
  });

  it('derives levels at and around thresholds', () => {
    expect(getLevelForLifetimeScore(99)).toBe(1);
    expect(getLevelForLifetimeScore(100)).toBe(2);
    expect(getLevelForLifetimeScore(1999)).toBe(9);
    expect(getLevelForLifetimeScore(2000)).toBe(10);
    expect(getLevelForLifetimeScore(8000)).toBe(20);
  });

  it('reports every crossed level in a large score gain', () => {
    const result = addLifetimeScore(createDefaultLevelProgressionState(), 2000);
    expect(result.state.level).toBe(10);
    expect(result.levelUp).toMatchObject({
      previousLevel: 1,
      level: 10,
      levelsGained: 9,
    });
  });

  it('shows progress only within the current level span', () => {
    const state = addLifetimeScore(createDefaultLevelProgressionState(), 50).state;
    expect(getLevelProgressionView(state)).toMatchObject({
      level: 1,
      currentLevelScore: 0,
      nextLevelScore: 100,
      progress: 0.5,
    });
  });
});
