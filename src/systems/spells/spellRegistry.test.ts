import { describe, expect, it } from 'vitest';
import { SPELL_DEFINITIONS, SpellRegistry } from './spellRegistry.js';
import type { SpellSchool, SpellRuntime } from './spellTypes.js';

const EXPECTED_SCHOOL_COVERAGE: Record<SpellSchool, string[]> = {
  destruction: ['arcane-pulse', 'firebolt', 'magic-missile', 'lightning-strike'],
  alteration: ['frost-nova', 'swiftstep', 'haste'],
  conjuration: ['summon-rat-familiar', 'summon-light-wisp'],
  illusion: ['mirror-image', 'shimmer-cloak'],
  restoration: ['healing-glow', 'mana-sip'],
};

function makeRuntime(overrides: Partial<SpellRuntime> = {}): SpellRuntime {
  return {
    hasRatFamiliar: () => false,
    castArcanePulse: () => ({ magnitude: 1 }),
    castSummonRatFamiliar: () => ({ magnitude: 1 }),
    ...overrides,
  };
}

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

  it('carries the full wizard-revamp roster of thirteen spells', () => {
    const registry = new SpellRegistry();
    expect(registry.list()).toHaveLength(13);

    const expected = [
      'arcane-pulse',
      'summon-rat-familiar',
      'firebolt',
      'magic-missile',
      'lightning-strike',
      'frost-nova',
      'swiftstep',
      'haste',
      'mirror-image',
      'shimmer-cloak',
      'healing-glow',
      'mana-sip',
      'summon-light-wisp',
    ];
    for (const id of expected) {
      expect(registry.get(id), `missing spell ${id}`).toBeDefined();
    }
  });

  it('covers every school with its revamp spells', () => {
    const registry = new SpellRegistry();
    for (const [school, ids] of Object.entries(EXPECTED_SCHOOL_COVERAGE) as [
      SpellSchool,
      string[],
    ][]) {
      const members = registry
        .list()
        .filter((spell) => spell.school === school)
        .map((s) => s.id);
      for (const id of ids) {
        expect(members, `${school} should include ${id}`).toContain(id);
      }
    }
  });

  it('gates both summons behind their summon limits', () => {
    const ratCheck = SPELL_DEFINITIONS.find(
      (spell) => spell.id === 'summon-rat-familiar',
    )!.canCast!;
    expect(ratCheck(makeRuntime({ hasRatFamiliar: () => false }), {})).toEqual({ ok: true });
    expect(ratCheck(makeRuntime({ hasRatFamiliar: () => true }), {})).toMatchObject({
      ok: false,
      reason: 'summon-limit',
    });

    const wispCheck = SPELL_DEFINITIONS.find((spell) => spell.id === 'summon-light-wisp')!.canCast!;
    expect(wispCheck(makeRuntime({ hasLightWisp: () => false }), {})).toEqual({ ok: true });
    expect(wispCheck(makeRuntime({ hasLightWisp: () => true }), {})).toMatchObject({
      ok: false,
      reason: 'summon-limit',
    });
  });

  it('refuses the mana sip while the river cooldown is active', () => {
    const sipCheck = SPELL_DEFINITIONS.find((spell) => spell.id === 'mana-sip')!.canCast!;
    expect(sipCheck(makeRuntime({ getSpellStatusTicks: () => 0 }), {})).toEqual({ ok: true });
    expect(sipCheck(makeRuntime({ getSpellStatusTicks: () => 12 }), {})).toMatchObject({
      ok: false,
      reason: 'blocked-state',
    });
  });

  it('refuses targeted spells when no target is in range', () => {
    for (const [spellId, predicate] of [
      ['magic-missile', 'hasMagicMissileTarget'],
      ['lightning-strike', 'hasLightningTarget'],
      ['frost-nova', 'hasFrostNovaTargets'],
      ['swiftstep', 'canSwiftstep'],
    ] as const) {
      const check = SPELL_DEFINITIONS.find((spell) => spell.id === spellId)!.canCast!;
      const withTarget = makeRuntime({ [predicate]: () => true } as Partial<SpellRuntime>);
      const withoutTarget = makeRuntime({ [predicate]: () => false } as Partial<SpellRuntime>);
      expect(check(withTarget, {}), `${spellId} with target`).toEqual({ ok: true });
      expect(check(withoutTarget, {}), `${spellId} without target`).toMatchObject({
        ok: false,
        reason: 'invalid-target',
      });
    }
  });

  it('rejects duplicate spell ids at construction', () => {
    const registry = new SpellRegistry();
    const first = SPELL_DEFINITIONS[0]!;
    expect(() => new SpellRegistry([...SPELL_DEFINITIONS, first])).toThrow(/Duplicate spell id/);
    expect(registry.get('definitely-not-a-spell')).toBeUndefined();
  });
});
