import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_DEFINITIONS } from './achievementDefinitions.js';
import {
  achievementGoalTarget,
  achievementLocationId,
  achievementLocationKey,
  getApAchievementDefinitions,
} from './achievementApMapping.js';

describe('achievement AP mapping', () => {
  it('provides stable unique keys and ids', () => {
    const enabled = getApAchievementDefinitions(ACHIEVEMENT_DEFINITIONS);
    expect(new Set(enabled.map((definition) => achievementLocationKey(definition.id))).size).toBe(
      enabled.length,
    );
    expect(
      new Set(
        enabled.map((definition) => achievementLocationId(ACHIEVEMENT_DEFINITIONS, definition.id)),
      ).size,
    ).toBe(enabled.length);
  });

  it('uses ceil for percentage goals', () => {
    expect(achievementGoalTarget(31, 60)).toBe(19);
  });

  it('appends restored achievements without shifting the existing AP range', () => {
    expect(achievementLocationId(ACHIEVEMENT_DEFINITIONS, 'skillTree.allBranches')).toBe(912001055);
    expect(achievementLocationId(ACHIEVEMENT_DEFINITIONS, 'caves.appleRushClear')).toBe(912001056);
    expect(achievementLocationId(ACHIEVEMENT_DEFINITIONS, 'cards.win.dennis-dare')).toBe(912001062);
    expect(achievementLocationId(ACHIEVEMENT_DEFINITIONS, 'equipment.cowbell200')).toBe(912001063);
    expect(achievementLocationId(ACHIEVEMENT_DEFINITIONS, 'equipment.wardTrinity')).toBe(912001064);
    expect(achievementLocationId(ACHIEVEMENT_DEFINITIONS, 'system.zoomFlurry')).toBe(912001065);
    // Dream achievements added +9 to the sequence
    expect(achievementLocationId(ACHIEVEMENT_DEFINITIONS, 'arcade.snakeception')).toBe(912001086);
    expect(achievementLocationId(ACHIEVEMENT_DEFINITIONS, 'arcade.blueScreen')).toBe(912001087);
    expect(achievementLocationId(ACHIEVEMENT_DEFINITIONS, 'stats.special10')).toBe(912001088);
    expect(achievementLocationId(ACHIEVEMENT_DEFINITIONS, 'exploration.trainSixZones')).toBe(
      912001089,
    );
    // Archaeology achievements added +12 to the sequence
    expect(achievementLocationId(ACHIEVEMENT_DEFINITIONS, 'archaeology.firstDig')).toBe(912001075);
    expect(achievementLocationId(ACHIEVEMENT_DEFINITIONS, 'archaeology.firstFragment')).toBe(
      912001076,
    );
    expect(achievementLocationId(ACHIEVEMENT_DEFINITIONS, 'divine.snakeOutOfHell')).toBe(912001097);
  });
});
