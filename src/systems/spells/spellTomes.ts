import { spellRegistry } from './spellRegistry.js';
import type { SpellDefinition } from './spellTypes.js';

export interface SpellTomeDefinition {
  readonly itemId: string;
  readonly spellId: string;
  readonly name: string;
  readonly description: string;
}

export const SPELL_TOMES: readonly SpellTomeDefinition[] = spellRegistry.list().map((spell) => ({
  itemId: `spell-tome-${spell.id}`,
  spellId: spell.id,
  name: `Tome of ${spell.label}`,
  description: tomeDescription(spell),
}));

const TOME_BY_ITEM_ID = new Map(SPELL_TOMES.map((tome) => [tome.itemId, tome]));

export function getSpellTome(itemId: string): SpellTomeDefinition | undefined {
  return TOME_BY_ITEM_ID.get(itemId);
}

function tomeDescription(spell: SpellDefinition): string {
  const tags = spell.tags.join(', ');
  return `A spell tome teaching ${spell.label}. ${spell.school}; ${tags}.`;
}
