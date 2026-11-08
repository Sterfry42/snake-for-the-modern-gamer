import { describe, expect, it } from 'vitest';
import { spellRegistry } from './spellRegistry.js';
import { SPELL_TOMES, getSpellTome, getSpellTomeBySpell, type TomeRarity } from './spellTomes.js';

const RARITY_BY_SCHOOL: Record<string, TomeRarity> = {
  destruction: 'common',
  alteration: 'uncommon',
  illusion: 'uncommon',
  restoration: 'rare',
  conjuration: 'rare',
};

describe('spell tomes', () => {
  it('maps one tome to every registered spell', () => {
    const spells = spellRegistry.list();
    expect(SPELL_TOMES).toHaveLength(spells.length);

    const tomeBySpell = new Map(SPELL_TOMES.map((tome) => [tome.spellId, tome]));
    for (const spell of spells) {
      const tome = tomeBySpell.get(spell.id);
      expect(tome, `tome for ${spell.id}`).toBeDefined();
      expect(tome?.itemId).toBe(`spell-tome-${spell.id}`);
      expect(tome?.name).toBe(`Tome of ${spell.label}`);
      expect(tome?.school).toBe(spell.school);
      expect(tome?.rarity).toBe(RARITY_BY_SCHOOL[spell.school]);
      expect(tome?.description).toContain(spell.label);
      expect(tome?.description).toContain(spell.school);
    }
  });

  it('looks tomes up by item id and by spell id', () => {
    expect(getSpellTome('spell-tome-firebolt')).toMatchObject({
      itemId: 'spell-tome-firebolt',
      spellId: 'firebolt',
      rarity: 'common',
    });
    expect(getSpellTome('spell-tome-healing-glow')).toMatchObject({
      spellId: 'healing-glow',
      rarity: 'rare',
    });
    expect(getSpellTome('not-a-tome')).toBeUndefined();

    expect(getSpellTomeBySpell('summon-light-wisp')?.itemId).toBe('spell-tome-summon-light-wisp');
    expect(getSpellTomeBySpell('no-such-spell')).toBeUndefined();
  });

  it('keeps the legacy novice tome ids stable', () => {
    expect(getSpellTome('spell-tome-arcane-pulse')).toBeDefined();
    expect(getSpellTome('spell-tome-summon-rat-familiar')).toBeDefined();
  });
});
