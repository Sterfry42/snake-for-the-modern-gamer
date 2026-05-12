import type { RandomGenerator } from '../core/rng.js';
import type { AnimalInstance, DropEntry } from './types.js';
import { AnimalRegistry } from './animalRegistry.js';

export interface AnimalDropResult {
  items: Array<{ itemId: string; count: number }>;
  count: number;
}

function rollDrop(drops: readonly DropEntry[], rng: RandomGenerator): string | null {
  for (const entry of drops) {
    if (rng() < entry.chance) {
      return entry.itemId;
    }
  }
  return null;
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

  const items: Array<{ itemId: string; count: number }> = [];
  const uniqueDrops = new Set<string>();

  for (const drop of drops) {
    if (rollDrop([drop], rng)) {
      const count = 1;
      items.push({ itemId: drop.itemId, count });
      uniqueDrops.add(drop.itemId);
    }
  }

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
