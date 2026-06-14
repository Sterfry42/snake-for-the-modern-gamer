import { describe, expect, it } from 'vitest';
import { computeAchievementDetailLayout, type DetailRect } from './achievementDetailLayout.js';

function contains(outer: DetailRect, inner: DetailRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

describe('achievement detail layout', () => {
  it.each([358, 378, 420])('keeps every information card inside a %ipx panel', (height) => {
    const panel = { x: 392, y: 92, width: 230, height };
    const layout = computeAchievementDetailLayout(panel);

    for (const card of [
      layout.status,
      layout.section,
      layout.category,
      layout.progress,
      layout.reward,
    ]) {
      expect(contains(panel, card)).toBe(true);
    }
    expect(layout.description.y + layout.description.height).toBeLessThan(layout.status.y);
  });
});
