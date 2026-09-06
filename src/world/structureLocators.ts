import type { Item } from '../inventory/item.js';

type StructureLocatorKind = 'garage' | 'moleman-dig-site';

interface StructureLocatorDefinition {
  kind: StructureLocatorKind;
  itemId: string;
  name: string;
  structureLabel: string;
  description: string;
}

const STRUCTURE_LOCATOR_PREFIX = 'structure-locator-';

const STRUCTURE_LOCATORS: readonly StructureLocatorDefinition[] = [
  {
    kind: 'garage',
    itemId: `${STRUCTURE_LOCATOR_PREFIX}garage`,
    name: 'Garage Locator',
    structureLabel: 'garage',
    description: 'Points toward a garage where a mechanic can put wheels under your bad ideas.',
  },
  {
    kind: 'moleman-dig-site',
    itemId: `${STRUCTURE_LOCATOR_PREFIX}moleman-dig-site`,
    name: 'Moleman Dig-Site Locator',
    structureLabel: 'moleman dig site',
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
