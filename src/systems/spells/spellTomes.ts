import { spellRegistry } from './spellRegistry.js';
import type { SpellDefinition, SpellSchool } from './spellTypes.js';

export type TomeRarity = 'common' | 'uncommon' | 'rare';

export interface SpellTomeDefinition {
  readonly itemId: string;
  readonly spellId: string;
  readonly name: string;
  readonly description: string;
  readonly school: SpellSchool;
  readonly rarity: TomeRarity;
}

const SCHOOL_RARITY: Readonly<Record<SpellSchool, TomeRarity>> = {
  destruction: 'common',
  alteration: 'uncommon',
  illusion: 'uncommon',
  restoration: 'rare',
  conjuration: 'rare',
};

const SCHOOL_FLAVOR: Readonly<Record<SpellSchool, string>> = {
  destruction: 'The wizard who sold it insists the soot in the binding is "atmosphere."',
  alteration: 'Its pages run cold to the touch, like a winter that has not started yet.',
  illusion: 'Hold it up to a candle and the margins seem to argue with themselves.',
  restoration: 'It smells faintly of bandages and something almost like breakfast.',
  conjuration: 'Small footprints and one very small claw mark appear in the margins.',
};

function rarityForSchool(school: SpellSchool): TomeRarity {
  return SCHOOL_RARITY[school];
}

function tomeDescription(spell: SpellDefinition): string {
  const tags = spell.tags.join(', ');
  return `A spell tome teaching ${spell.label}. ${spell.school}; ${tags}. ${SCHOOL_FLAVOR[spell.school]}`;
}

export const SPELL_TOMES: readonly SpellTomeDefinition[] = spellRegistry.list().map((spell) => ({
  itemId: `spell-tome-${spell.id}`,
  spellId: spell.id,
  name: `Tome of ${spell.label}`,
  description: tomeDescription(spell),
  school: spell.school,
  rarity: rarityForSchool(spell.school),
}));

const TOME_BY_ITEM_ID = new Map(SPELL_TOMES.map((tome) => [tome.itemId, tome]));

export function getSpellTome(itemId: string): SpellTomeDefinition | undefined {
  return TOME_BY_ITEM_ID.get(itemId);
}

export function getSpellTomeBySpell(spellId: string): SpellTomeDefinition | undefined {
  return TOME_BY_ITEM_ID.get(`spell-tome-${spellId}`);
}
