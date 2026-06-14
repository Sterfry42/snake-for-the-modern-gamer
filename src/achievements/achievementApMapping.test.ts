import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_DEFINITIONS } from './achievementDefinitions.js';
import { achievementGoalTarget, achievementLocationId, achievementLocationKey, getApAchievementDefinitions } from './achievementApMapping.js';

describe('achievement AP mapping', () => {
  it('provides stable unique keys and ids', () => {
    const enabled = getApAchievementDefinitions(ACHIEVEMENT_DEFINITIONS);
    expect(new Set(enabled.map((definition) => achievementLocationKey(definition.id))).size).toBe(enabled.length);
    expect(new Set(enabled.map((definition) => achievementLocationId(ACHIEVEMENT_DEFINITIONS, definition.id))).size).toBe(enabled.length);
  });

  it('uses ceil for percentage goals', () => {
    expect(achievementGoalTarget(31, 60)).toBe(19);
  });
});
