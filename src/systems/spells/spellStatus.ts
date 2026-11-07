import type { DerivedStatModifier, DerivedStatSource } from '../../stats/derivedStats.js';

/**
 * Spell Status Effects
 *
 * The wise old snake has cataloged 999 statuses. These are the polite ones.
 */

export const SPELL_STATUS_FLAG = 'spells.activeStatus';

export type SpellStatusId = 'haste' | 'mana-sip-cooldown' | 'mirror-image' | 'shimmer-cloak';

export interface SpellStatusDefinition {
  readonly id: SpellStatusId;
  readonly label: string;
  readonly durationTicks: number;
  readonly magnitude?: number;
  readonly derivedModifiers?: readonly DerivedStatModifier[];
}

export const SPELL_STATUS_DEFINITIONS: readonly SpellStatusDefinition[] = [
  {
    id: 'haste',
    label: 'Haste',
    durationTicks: 60,
    magnitude: 0.8,
    derivedModifiers: [{ stat: 'actionStepIntervalScalar', operation: 'multiply', value: 0.8 }],
  },
  {
    id: 'mana-sip-cooldown',
    label: 'Mana Sip Cooldown',
    durationTicks: 60,
  },
  {
    id: 'mirror-image',
    label: 'Mirror Image',
    durationTicks: 3,
    magnitude: 1,
  },
  {
    id: 'shimmer-cloak',
    label: 'Shimmer Cloak',
    durationTicks: 12,
    magnitude: 1,
  },
] as const;

export interface SpellStatusEffect {
  id: SpellStatusId;
  remainingTicks: number;
  magnitude?: number;
}

export function getSpellStatusDefinition(statusId: string): SpellStatusDefinition | undefined {
  return SPELL_STATUS_DEFINITIONS.find((definition) => definition.id === statusId);
}

export function createSpellStatus(definitionId: string): SpellStatusEffect {
  const definition = getSpellStatusDefinition(definitionId);
  if (!definition) {
    throw new Error(`Unknown spell status: ${definitionId}`);
  }
  return {
    id: definition.id,
    remainingTicks: definition.durationTicks,
    magnitude: definition.magnitude,
  };
}

export function normalizeSpellStatusState(value: unknown): SpellStatusEffect[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is SpellStatusEffect => {
      return (
        entry !== null &&
        typeof entry === 'object' &&
        typeof (entry as SpellStatusEffect).id === 'string' &&
        getSpellStatusDefinition((entry as SpellStatusEffect).id) !== undefined &&
        typeof (entry as SpellStatusEffect).remainingTicks === 'number' &&
        (entry as SpellStatusEffect).remainingTicks > 0
      );
    })
    .map((entry) => ({
      id: entry.id,
      remainingTicks: Math.max(0, Math.floor(entry.remainingTicks)),
      magnitude: typeof entry.magnitude === 'number' ? entry.magnitude : undefined,
    }))
    .filter((entry) => entry.remainingTicks > 0);
}

export function addSpellStatus(
  effects: readonly SpellStatusEffect[],
  status: SpellStatusEffect,
): SpellStatusEffect[] {
  const others = effects.filter((effect) => effect.id !== status.id);
  const existing = effects.find((effect) => effect.id === status.id);
  const merged: SpellStatusEffect = {
    ...status,
    remainingTicks: Math.max(
      status.remainingTicks,
      existing ? Math.max(0, Math.floor(existing.remainingTicks)) : 0,
    ),
  };
  return [...others, merged];
}

export function tickSpellStatusEffects(effects: readonly SpellStatusEffect[]): SpellStatusEffect[] {
  return effects
    .map((effect) => ({ ...effect, remainingTicks: Math.max(0, effect.remainingTicks - 1) }))
    .filter((effect) => effect.remainingTicks > 0);
}

export function hasSpellStatus(
  effects: readonly SpellStatusEffect[],
  statusId: SpellStatusId,
): boolean {
  return effects.some((effect) => effect.id === statusId && effect.remainingTicks > 0);
}

export function getSpellStatusTicks(
  effects: readonly SpellStatusEffect[],
  statusId: string,
): number {
  const effect = effects.find((entry) => entry.id === statusId);
  return effect ? Math.max(0, Math.floor(effect.remainingTicks)) : 0;
}

export function getSpellStatusSource(effects: readonly SpellStatusEffect[]): DerivedStatSource {
  const modifiers = effects.flatMap((effect) => {
    const definition = getSpellStatusDefinition(effect.id);
    return definition?.derivedModifiers ?? [];
  });
  return {
    id: 'status.spells',
    category: 'status',
    modifiers,
  };
}
