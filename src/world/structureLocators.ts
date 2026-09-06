import type { Item } from '../inventory/item.js';

interface StructureLocatorItemDefinition {
  itemId: string;
  name: string;
  description: string;
}

const STRUCTURE_LOCATOR_PREFIX = 'structure-locator-';

const STRUCTURE_LOCATORS: readonly StructureLocatorItemDefinition[] = [
  {
    itemId: `${STRUCTURE_LOCATOR_PREFIX}garage`,
    name: 'Garage Locator',
    description: 'Points toward a garage where a mechanic can put wheels under your bad ideas.',
  },
  {
    itemId: `${STRUCTURE_LOCATOR_PREFIX}moleman-dig-site`,
    name: 'Moleman Dig-Site Locator',
    description: 'Points toward a moleman dig site without waking every tunnel rumor in town.',
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
