import type { ActiveStatusEffect } from './alchemyTypes.js';
import type { DerivedStatModifier, DerivedStatSource } from '../stats/derivedStats.js';

export interface PotionEffectDefinition {
  id: string;
  potionItemId: string;
  durationTicks: number;
  magnitude?: number;
  derivedModifiers?: readonly DerivedStatModifier[];
}

export const POTION_EFFECTS: readonly PotionEffectDefinition[] = [
  { id: 'phase', potionItemId: 'potion-phase', durationTicks: 60, magnitude: 1 },
  { id: 'shield', potionItemId: 'potion-shield', durationTicks: 70, magnitude: 1 },
  {
    id: 'speed',
    potionItemId: 'potion-speed-boost',
    durationTicks: 90,
    magnitude: 0.7,
    derivedModifiers: [{ stat: 'actionStepIntervalScalar', operation: 'multiply', value: 0.7 }],
  },
  {
    id: 'magnet',
    potionItemId: 'potion-magnet',
    durationTicks: 75,
    magnitude: 8,
    derivedModifiers: [{ stat: 'pickupRadius', operation: 'add', value: 8 }],
  },
];

export function getPotionEffectDefinition(
  potionItemId: string,
): PotionEffectDefinition | undefined {
  return POTION_EFFECTS.find((effect) => effect.potionItemId === potionItemId);
}

export function createActiveStatusEffect(definition: PotionEffectDefinition): ActiveStatusEffect {
  return {
    id: definition.id,
    remainingTicks: definition.durationTicks,
    magnitude: definition.magnitude,
  };
}

export function getAlchemyDerivedStatSource(
  effects: readonly ActiveStatusEffect[],
): DerivedStatSource {
  const modifiers = effects.flatMap((effect) => {
    const definition = POTION_EFFECTS.find((candidate) => candidate.id === effect.id);
    return definition?.derivedModifiers ?? [];
  });
  return {
    id: 'status.alchemy',
    category: 'status',
    modifiers,
  };
}
