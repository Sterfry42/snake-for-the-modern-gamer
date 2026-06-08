import type { RandomGenerator } from '../core/rng.js';
import type { AnimalInstance, DropEntry } from './types.js';
import { AnimalRegistry } from './animalRegistry.js';

export interface AnimalDropResult {
  items: Array<{ itemId: string; count: number }>;
  count: number;
}

export interface AnimalDropModifiers {
  bonusChance?: number;
  doubleRoll?: boolean;
  guaranteedMeat?: boolean;
}

function rollDropCount(entry: DropEntry, rng: RandomGenerator): number {
  const minCount = Math.max(1, Math.floor(entry.minCount ?? 1));
  const maxCount = Math.max(minCount, Math.floor(entry.maxCount ?? minCount));
  if (maxCount === minCount) {
    return minCount;
  }
  return minCount + Math.floor(rng() * (maxCount - minCount + 1));
}

export function rollAnimalDrops(
  drops: readonly DropEntry[] | undefined,
  rng: RandomGenerator,
  modifiers: AnimalDropModifiers = {},
): Array<{ itemId: string; count: number }> {
  if (!drops || drops.length === 0) {
    return [];
  }

  const rolls = modifiers.doubleRoll ? 2 : 1;
  const awarded = new Map<string, number>();

  for (let rollIndex = 0; rollIndex < rolls; rollIndex += 1) {
    for (const entry of drops) {
      const chance = Math.max(0, Math.min(1, entry.chance + (modifiers.bonusChance ?? 0)));
      const isGuaranteedMeat =
        Boolean(modifiers.guaranteedMeat) &&
        (entry.itemId === 'raw-meat' || entry.itemId === 'fish-meat');
      if (!isGuaranteedMeat && rng() >= chance) {
        continue;
      }
      const count = rollDropCount(entry, rng);
      awarded.set(entry.itemId, (awarded.get(entry.itemId) ?? 0) + count);
    }
  }

  return Array.from(awarded.entries()).map(([itemId, count]) => ({ itemId, count }));
}

export function processAnimalDrops(
  defeated: AnimalInstance,
  rng: RandomGenerator,
): AnimalDropResult {
  const def = AnimalRegistry.getDefinition(defeated.type);
  const drops = def.drops;

  if (!drops || drops.length === 0) {
    return { items: [], count: 0 };
  }

  const items = rollAnimalDrops(drops, rng);

  return { items, count: items.length };
}

export function processMultipleAnimalDrops(
  defeated: readonly AnimalInstance[],
  rng: RandomGenerator,
): AnimalDropResult {
  const items: Array<{ itemId: string; count: number }> = [];
  let totalDrops = 0;

  for (const animal of defeated) {
    const result = processAnimalDrops(animal, rng);
    for (const item of result.items) {
      items.push(item);
      totalDrops += item.count;
    }
  }

  return { items, count: totalDrops };
}
