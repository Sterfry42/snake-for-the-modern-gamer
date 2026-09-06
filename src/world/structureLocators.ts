import type { Item } from '../inventory/item.js';

export type StructureLocatorKind = 'garage' | 'moleman-dig-site';

export interface StructureLocatorItemDefinition {
  kind: StructureLocatorKind;
  itemId: string;
  name: string;
  description: string;
  structureLabel: string;
}

const STRUCTURE_LOCATOR_PREFIX = 'structure-locator-';

export const STRUCTURE_LOCATORS: readonly StructureLocatorItemDefinition[] = [
  {
    kind: 'garage',
    itemId: `${STRUCTURE_LOCATOR_PREFIX}garage`,
    name: 'Garage Locator',
    description: 'Points toward a garage where a mechanic can put wheels under your bad ideas.',
    structureLabel: 'garage',
  },
  {
    kind: 'moleman-dig-site',
    itemId: `${STRUCTURE_LOCATOR_PREFIX}moleman-dig-site`,
    name: 'Moleman Dig-Site Locator',
    description: 'Points toward a moleman dig site without waking every tunnel rumor in town.',
    structureLabel: 'Moleman Dig Site',
  },
];

export function generateStructureLocatorItems(): Item[] {
  return STRUCTURE_LOCATORS.map((locator) => ({
    id: locator.itemId,
    name: locator.name,
    description: locator.description,
    kind: 'consumable',
    category: 'material',
  }));
}
