import { describe, expect, it } from 'vitest';
import { DerivedStatResolver } from './derivedStats.js';

describe('DerivedStatResolver', () => {
  it('aggregates additions before multipliers with a stable source breakdown', () => {
    const resolver = new DerivedStatResolver({ maxHealth: 3 });
    resolver.setSource({
      id: 'perk.thick-scales',
      category: 'perk',
      modifiers: [{ stat: 'maxHealth', operation: 'add', value: 1 }],
    });
    resolver.setSource({
      id: 'status.heroic',
      category: 'status',
      modifiers: [{ stat: 'maxHealth', operation: 'multiply', value: 2 }],
    });
    expect(resolver.resolve('maxHealth')).toBe(8);
    expect(resolver.getBreakdown('maxHealth').additions[0]?.sourceId).toBe('perk.thick-scales');
  });

  it('replaces duplicate sources, supports removal, and clamps unsafe values', () => {
    const resolver = new DerivedStatResolver();
    resolver.setSource({
      id: 'equipment.boots',
      category: 'equipment',
      modifiers: [{ stat: 'actionStepIntervalScalar', operation: 'multiply', value: 0.5 }],
    });
    resolver.setSource({
      id: 'equipment.boots',
      category: 'equipment',
      modifiers: [{ stat: 'actionStepIntervalScalar', operation: 'multiply', value: 0.1 }],
    });
    expect(resolver.resolve('actionStepIntervalScalar')).toBe(0.2);
    expect(resolver.removeSource('equipment.boots')).toBe(true);
    expect(resolver.resolve('actionStepIntervalScalar')).toBe(1);
  });
});
