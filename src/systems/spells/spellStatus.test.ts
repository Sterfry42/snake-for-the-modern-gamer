import { describe, expect, it } from 'vitest';
import {
  SPELL_STATUS_DEFINITIONS,
  addSpellStatus,
  createSpellStatus,
  getSpellStatusDefinition,
  getSpellStatusSource,
  getSpellStatusTicks,
  hasSpellStatus,
  normalizeSpellStatusState,
  tickSpellStatusEffects,
  type SpellStatusEffect,
} from './spellStatus.js';

describe('spell status effects', () => {
  it('defines the haste, cooldown, and phase statuses', () => {
    expect(SPELL_STATUS_DEFINITIONS.map((definition) => definition.id)).toEqual([
      'haste',
      'mana-sip-cooldown',
      'mirror-image',
      'shimmer-cloak',
    ]);
    expect(getSpellStatusDefinition('haste')?.durationTicks).toBe(60);
    expect(getSpellStatusDefinition('mana-sip-cooldown')?.durationTicks).toBe(60);
    expect(getSpellStatusDefinition('shimmer-cloak')?.durationTicks).toBe(12);
    expect(getSpellStatusDefinition('not-a-status')).toBeUndefined();
  });

  it('creates effects from definitions with duration and magnitude', () => {
    expect(createSpellStatus('haste')).toEqual({
      id: 'haste',
      remainingTicks: 60,
      magnitude: 0.8,
    });
    expect(createSpellStatus('mana-sip-cooldown')).toEqual({
      id: 'mana-sip-cooldown',
      remainingTicks: 60,
      magnitude: undefined,
    });
    expect(() => createSpellStatus('definitely-not-a-status')).toThrow(/Unknown spell status/);
  });

  it('normalizes saved state, dropping garbage and expired effects', () => {
    const normalized = normalizeSpellStatusState([
      { id: 'haste', remainingTicks: 12.9, magnitude: 0.8 },
      { id: 'haste', remainingTicks: 40, magnitude: 0.8 },
      { id: 'mana-sip-cooldown', remainingTicks: 0 },
      { id: 'wisdom-of-999', remainingTicks: 50 },
      null,
      'not-an-effect',
      42,
    ]);
    expect(normalized).toEqual([
      { id: 'haste', remainingTicks: 12, magnitude: 0.8 },
      { id: 'haste', remainingTicks: 40, magnitude: 0.8 },
    ]);
    expect(normalizeSpellStatusState(undefined)).toEqual([]);
    expect(normalizeSpellStatusState({ id: 'haste', remainingTicks: 5 })).toEqual([]);
  });

  it('toggles and queries active statuses', () => {
    const effects: SpellStatusEffect[] = [createSpellStatus('haste')];
    expect(hasSpellStatus(effects, 'haste')).toBe(true);
    expect(hasSpellStatus(effects, 'shimmer-cloak')).toBe(false);
    expect(getSpellStatusTicks(effects, 'haste')).toBe(60);
    expect(getSpellStatusTicks(effects, 'shimmer-cloak')).toBe(0);
  });

  it('adds effects and extends overlapping durations to the larger value', () => {
    const base = [createSpellStatus('haste')];
    const withMirror = addSpellStatus(base, createSpellStatus('mirror-image'));
    expect(withMirror.map((effect) => effect.id).sort()).toEqual(['haste', 'mirror-image']);

    // Re-casting refreshes the veil back to its full duration.
    const nearVeil: SpellStatusEffect[] = [
      { id: 'shimmer-cloak', remainingTicks: 4, magnitude: 1 },
    ];
    const refreshed = addSpellStatus(nearVeil, createSpellStatus('shimmer-cloak'));
    expect(refreshed).toEqual([{ id: 'shimmer-cloak', remainingTicks: 12, magnitude: 1 }]);
  });

  it('ticks effects down and drops expired ones', () => {
    const effects = [createSpellStatus('haste'), createSpellStatus('mana-sip-cooldown')];
    const afterOne = tickSpellStatusEffects(effects);
    expect(afterOne).toEqual([
      { id: 'haste', remainingTicks: 59, magnitude: 0.8 },
      { id: 'mana-sip-cooldown', remainingTicks: 59, magnitude: undefined },
    ]);

    const nearEnd: SpellStatusEffect[] = [{ id: 'mirror-image', remainingTicks: 1, magnitude: 1 }];
    expect(tickSpellStatusEffects(nearEnd)).toEqual([]);
    expect(tickSpellStatusEffects([])).toEqual([]);
  });

  it('projects haste into the shared derived stat source and nothing else', () => {
    const hasteSource = getSpellStatusSource([createSpellStatus('haste')]);
    expect(hasteSource).toEqual({
      id: 'status.spells',
      category: 'status',
      modifiers: [{ stat: 'actionStepIntervalScalar', operation: 'multiply', value: 0.8 }],
    });

    const cooldownSource = getSpellStatusSource([createSpellStatus('mana-sip-cooldown')]);
    expect(cooldownSource.modifiers).toEqual([]);

    const cloakSource = getSpellStatusSource([createSpellStatus('shimmer-cloak')]);
    expect(cloakSource.modifiers).toEqual([]);

    const empty = getSpellStatusSource([]);
    expect(empty.id).toBe('status.spells');
    expect(empty.modifiers).toEqual([]);
  });
});
