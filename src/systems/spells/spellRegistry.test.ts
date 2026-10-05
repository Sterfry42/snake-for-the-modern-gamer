import { describe, expect, it } from 'vitest';
import { SPELL_DEFINITIONS, SpellRegistry } from './spellRegistry.js';

describe('spell registry', () => {
  it('contains unique spells with valid metadata', () => {
    const ids = new Set<string>();

    for (const spell of SPELL_DEFINITIONS) {
      expect(ids.has(spell.id)).toBe(false);
      ids.add(spell.id);
      expect(spell.label.length).toBeGreaterThan(0);
      expect(spell.description.length).toBeGreaterThan(0);
      expect(spell.manaCost).toBeGreaterThanOrEqual(0);
      expect(spell.tags.length).toBeGreaterThan(0);
    }

    expect(() => new SpellRegistry(SPELL_DEFINITIONS)).not.toThrow();
  });
});
