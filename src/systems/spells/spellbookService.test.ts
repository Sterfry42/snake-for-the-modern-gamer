import { describe, expect, it } from 'vitest';
import { SpellbookService } from './spellbookService.js';

function makeSpellbook(capacity = 2) {
  const flags = new Map<string, unknown>();
  const service = new SpellbookService({
    getFlag: <T = unknown>(key: string) => flags.get(key) as T | undefined,
    setFlag: (key, value) => {
      if (value === undefined) flags.delete(key);
      else flags.set(key, value);
    },
    getCapacity: () => capacity,
  });
  return { flags, service };
}

describe('spellbook service', () => {
  it('learns spells idempotently and exposes the spellbook', () => {
    const { flags, service } = makeSpellbook();

    expect(service.learn('arcane-pulse')).toMatchObject({ ok: true });
    expect(service.knows('arcane-pulse')).toBe(true);
    expect(flags.get('arcane.spellbook')).toEqual({ enabled: true });

    expect(service.learn('arcane-pulse')).toMatchObject({
      ok: false,
      reason: 'already-known',
    });
  });

  it('enforces known spells, capacity, and duplicate loadout entries', () => {
    const { service } = makeSpellbook(1);

    expect(service.equip('arcane-pulse')).toEqual({ ok: false, reason: 'not-known' });
    service.learn('arcane-pulse', { autoEquip: false });
    service.learn('summon-rat-familiar', { autoEquip: false });

    expect(service.equip('arcane-pulse')).toMatchObject({ ok: true });
    expect(service.equip('arcane-pulse')).toEqual({ ok: false, reason: 'already-loaded' });
    expect(service.equip('summon-rat-familiar')).toEqual({ ok: false, reason: 'no-capacity' });
  });

  it('falls back when removing the currently bound spell', () => {
    const { flags, service } = makeSpellbook(2);
    service.learn('arcane-pulse');
    service.learn('summon-rat-familiar');
    service.bindCurrentSpell('summon-rat-familiar');

    service.unequip('summon-rat-familiar');

    expect(flags.get('actions.slots')).toEqual({ q: 'arcane-pulse' });
  });
});
