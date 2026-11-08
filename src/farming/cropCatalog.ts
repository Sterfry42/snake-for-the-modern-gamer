import type { Season } from '../world/atmosphereTypes.js';
import type { Item } from '../inventory/item.js';
import { stableStringHashUnsigned } from '../core/math.js';

export type CropQuality = 'normal' | 'good' | 'excellent';
export const QUALITY_MULTIPLIERS = { normal: 1, good: 1.25, excellent: 1.6 };
export interface CropDefinition {
  id: string;
  label: string;
  seasons: readonly Season[];
  growDays: number;
  regrowDays?: number;
  yield: number;
  value: number;
  seedCost: number;
  preferredTags: readonly string[];
  thirsty: boolean;
  coldTolerant: boolean;
  specialty?: 'ash' | 'magic';
  contraband: boolean;
  seedItemId: string;
  produceItemId: string;
  renderColor: number;
}

function crop(
  id: string,
  seasons: readonly Season[],
  growDays: number,
  yieldCount: number,
  value: number,
  tags: readonly string[],
  regrowDays?: number,
): CropDefinition {
  return {
    id,
    label: id
      .split('-')
      .map((word) => word[0]?.toUpperCase() + word.slice(1))
      .join(' '),
    seasons,
    growDays,
    yield: yieldCount,
    value,
    seedCost: Math.max(2, value * 2),
    preferredTags: tags,
    regrowDays,
    thirsty: ['lettuce', 'melon', 'forest-mushroom'].includes(id),
    coldTolerant: seasons.includes('winter'),
    contraband: id === 'cannabis',
    specialty: id === 'ash-chili' ? 'ash' : id === 'luminous-mushroom' ? 'magic' : undefined,
    seedItemId: `seed-${id}`,
    produceItemId: id === 'cannabis' ? 'cannabis-bud' : `produce-${id}`,
    renderColor:
      [0xe7839e, 0x84c969, 0xefac50, 0xc5a568, 0xf0d37a, 0xd88958][
        stableStringHashUnsigned(id) % 6
      ] ?? 0x84c969,
  };
}
const cool: readonly Season[] = ['spring', 'autumn'];
const warm: readonly Season[] = ['summer', 'autumn'];
export const CROPS: readonly CropDefinition[] = [
  crop('radish', cool, 0.65, 2, 2, ['temperate']),
  crop('lettuce', cool, 0.9, 2, 3, ['humid', 'wet']),
  crop('carrot', cool, 1.25, 2, 4, ['temperate']),
  crop('potato', ['spring', 'summer', 'autumn'], 1.5, 3, 3, ['temperate']),
  crop('wheat', ['spring', 'summer', 'autumn'], 1.5, 4, 2, ['temperate']),
  crop('onion', cool, 1.6, 2, 4, ['dry']),
  crop('garlic', cool, 1.75, 2, 5, ['temperate']),
  crop('strawberry', ['spring'], 1.6, 3, 5, ['temperate'], 1),
  crop('tomato', warm, 2, 3, 5, ['temperate'], 1),
  crop('corn', warm, 2.5, 3, 4, ['hot'], 1.25),
  crop('pepper', ['summer'], 2, 2, 7, ['hot'], 1),
  crop('melon', ['summer'], 2.75, 2, 10, ['hot']),
  crop('pumpkin', ['autumn'], 3, 1, 20, ['temperate']),
  crop('cabbage', ['autumn', 'winter'], 2, 2, 6, ['cold']),
  crop('beet', ['autumn', 'winter'], 1.6, 2, 5, ['cold']),
  crop('snow-pea', ['winter', 'spring'], 1.75, 3, 5, ['cold'], 1),
  crop('frostroot', ['winter'], 2.25, 2, 10, ['cold']),
  crop('forest-mushroom', cool, 1.2, 2, 6, ['forest', 'humid']),
  crop('ash-chili', warm, 2.5, 2, 13, ['hot']),
  crop('luminous-mushroom', ['autumn', 'winter'], 2.8, 1, 17, ['magical']),
  crop('cannabis', warm, 3, 2, 15, ['temperate']),
];
export function getCrop(id: string): CropDefinition | undefined {
  return CROPS.find((crop) => crop.id === id);
}
export function produceItem(crop: CropDefinition, quality: CropQuality): string {
  return quality === 'normal' ? crop.produceItemId : `${crop.produceItemId}-${quality}`;
}
export function resolveProduce(
  id: string,
): { crop: CropDefinition; quality: CropQuality } | undefined {
  for (const crop of CROPS)
    for (const quality of ['normal', 'good', 'excellent'] as const)
      if (produceItem(crop, quality) === id) return { crop, quality };
  return undefined;
}
export const FARM_TOOLS = [
  { id: 'farm-hoe', name: 'Hoe', price: 12 },
  { id: 'watering-can', name: 'Watering Can (8 charges)', price: 10 },
  { id: 'farm-water-refill', name: 'Water Refill', price: 2 },
  { id: 'farm-compost', name: 'Compost', price: 8 },
  { id: 'farm-magic-bed', name: 'Luminous Substrate', price: 30 },
] as const;
export const FARM_RECIPES = [
  { id: 'vegetable-stew', input: 'carrot', name: 'Vegetable Stew' },
  { id: 'roasted-potato', input: 'potato', name: 'Roasted Potatoes' },
  { id: 'tomato-soup', input: 'tomato', name: 'Tomato Soup' },
  { id: 'farm-bread', input: 'wheat', name: 'Farm Bread' },
  { id: 'grilled-corn', input: 'corn', name: 'Grilled Corn' },
  { id: 'berry-bowl', input: 'strawberry', name: 'Berry Bowl' },
  { id: 'pumpkin-soup', input: 'pumpkin', name: 'Pumpkin Soup' },
  { id: 'mushroom-stew', input: 'forest-mushroom', name: 'Mushroom Stew' },
  { id: 'spicy-chili', input: 'ash-chili', name: 'Spicy Chili' },
  { id: 'frostroot-broth', input: 'frostroot', name: 'Frostroot Broth' },
  { id: 'luminous-broth', input: 'luminous-mushroom', name: 'Luminous Broth' },
] as const;
export const FARM_ITEMS: readonly Item[] = [
  ...FARM_TOOLS.map((tool) => ({
    id: tool.id,
    name: tool.name,
    description: 'Use from inventory or the farm tools shortcut. Tools enable deliberate step-by-step tending.',
    category: 'material' as const,
  })),
  ...CROPS.flatMap((crop) => [
    {
      id: crop.seedItemId,
      name: `${crop.label} Seeds`,
      category: 'material' as const,
      description: `${crop.seasons.join('/')} outdoors; ${crop.growDays} world days. Use to select planting mode. ${crop.contraband ? 'Contraband. Black-market source.' : 'Seasonal merchant supply.'}`,
    },
    ...(['normal', 'good', 'excellent'] as const).map((quality) => ({
      id: produceItem(crop, quality),
      name: `${crop.label} (${quality})`,
      kind: 'consumable' as const,
      category: 'food' as const,
      description: `${crop.contraband ? 'Black market only' : 'Eat, cook or sell'}: ${Math.floor(crop.value * QUALITY_MULTIPLIERS[quality])} score. ${crop.preferredTags.join(', ')} climate preferred.`,
    })),
  ]),
  ...FARM_RECIPES.map((recipe) => ({
    id: `food-${recipe.id}`,
    name: recipe.name,
    kind: 'consumable' as const,
    category: 'food' as const,
    description: 'Farm cooking: restores hunger and one heart.',
  })),
];
