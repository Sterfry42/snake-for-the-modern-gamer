import { describe, expect, it } from 'vitest';
import { selectAchievementInDirection } from '../achievementControllerNavigation.js';

const nodes = [
  { id: 'center', x: 100, y: 100 },
  { id: 'right', x: 200, y: 100 },
  { id: 'down', x: 100, y: 200 },
  { id: 'diagonal', x: 180, y: 180 },
];

describe('achievement controller navigation', () => {
  it('selects the closest visible node in the requested direction', () => {
    expect(selectAchievementInDirection(nodes, 'center', { x: 1, y: 0 }, { x: 100, y: 100 })).toBe(
      'right',
    );
    expect(selectAchievementInDirection(nodes, 'center', { x: 0, y: 1 }, { x: 100, y: 100 })).toBe(
      'down',
    );
  });

  it('starts from the node nearest the viewport center', () => {
    expect(selectAchievementInDirection(nodes, null, { x: 1, y: 0 }, { x: 95, y: 95 })).toBe(
      'right',
    );
  });

  it('stays selected when no visible node exists in that direction', () => {
    expect(selectAchievementInDirection(nodes, 'right', { x: 1, y: 0 }, { x: 100, y: 100 })).toBe(
      'right',
    );
  });
});
