import type { Item } from '../inventory/item.js';

export type StructureLocatorKind = 'garage' | 'moleman-dig-site';

export interface StructureLocatorDefinition {
  kind: StructureLocatorKind;
  itemId: string;
  name: string;
  structureLabel: string;
  description: string;
}

export const STRUCTURE_LOCATOR_PREFIX = 'structure-locator-';

export const STRUCTURE_LOCATORS: readonly StructureLocatorDefinition[] = [
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

export function getStructureLocatorItemId(kind: StructureLocatorKind): string {
  return `${STRUCTURE_LOCATOR_PREFIX}${kind}`;
}

export function isStructureLocatorItemId(itemId: string): boolean {
  return itemId.startsWith(STRUCTURE_LOCATOR_PREFIX);
}

export function getStructureLocatorDefinition(
  itemId: string,
): StructureLocatorDefinition | undefined {
  return STRUCTURE_LOCATORS.find((locator) => locator.itemId === itemId);
}

export function generateStructureLocatorItems(): Item[] {
  return STRUCTURE_LOCATORS.map((locator) => ({
    id: locator.itemId,
    name: locator.name,
    description: locator.description,
    kind: 'consumable',
    category: 'material',
  }));
}
