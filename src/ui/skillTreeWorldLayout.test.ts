import { describe, expect, it } from 'vitest';
import { SKILL_DEFINITIONS } from '../systems/skillCatalog.js';
import { buildSkillTreeWorldLayout, getSkillTreeFoundationPoint } from './skillTreeWorldLayout.js';

describe('buildSkillTreeWorldLayout', () => {
  it('places every entry on the bottom foundation and grows upward', () => {
    const layout = buildSkillTreeWorldLayout(SKILL_DEFINITIONS);
    const entries = SKILL_DEFINITIONS.filter((perk) => perk.kind === 'entry').map(
      (perk) => layout.get(perk.id)!,
    );
    expect(new Set(entries.map((point) => point.y)).size).toBe(1);
    expect(layout.get('phaseStride')!.y).toBeLessThan(layout.get('swiftScales')!.y);
    expect(layout.get('windShear')?.x).not.toBe(layout.get('overclock')?.x);
    const foundation = getSkillTreeFoundationPoint(SKILL_DEFINITIONS, layout);
    expect(foundation.x).toBeCloseTo(
      entries.reduce((sum, point) => sum + point.x, 0) / entries.length,
    );
    expect(foundation.y).toBeGreaterThan(entries[0]!.y);
  });

  it('places combo nodes in one evenly spaced collision-free row', () => {
    const layout = buildSkillTreeWorldLayout(SKILL_DEFINITIONS);
    const combos = SKILL_DEFINITIONS.filter((perk) => perk.kind === 'combo').map(
      (perk) => layout.get(perk.id)!,
    );
    expect(new Set(combos.map((point) => point.y)).size).toBe(1);
    const gaps = combos.slice(1).map((point, index) => point.x - combos[index]!.x);
    expect(Math.min(...gaps)).toBeGreaterThan(48);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.001);
  });

  it('keeps every pair of node circles separated', () => {
    const points = [...buildSkillTreeWorldLayout(SKILL_DEFINITIONS).values()];
    for (let left = 0; left < points.length; left += 1) {
      for (let right = left + 1; right < points.length; right += 1) {
        expect(
          Math.hypot(points[left]!.x - points[right]!.x, points[left]!.y - points[right]!.y),
        ).toBeGreaterThan(36);
      }
    }
  });
});
