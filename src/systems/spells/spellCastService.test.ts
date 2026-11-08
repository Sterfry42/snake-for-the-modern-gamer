import { describe, expect, it } from 'vitest';
import { SpellbookService } from './spellbookService.js';
import { SpellCastService } from './spellCastService.js';
import type { SpellCastServiceRuntime } from './spellCastService.js';
import type { SpellRuntime } from './spellTypes.js';

interface Harness {
  flags: Map<string, unknown>;
  spellbook: SpellbookService;
  service: SpellCastService;
  runtime: SpellRuntime & Record<string, unknown>;
  spentMana: number[];
  overcastRequests: number[];
}

function makeHarness(
  overrides: {
    mana?: number;
    overcastSegments?: number;
    runtime?: Partial<SpellRuntime> & Record<string, unknown>;
  } = {},
): Harness {
  const flags = new Map<string, unknown>();
  const spellbook = new SpellbookService({
    getFlag: <T = unknown>(key: string) => flags.get(key) as T | undefined,
    setFlag: (key, value) => {
      if (value === undefined) flags.delete(key);
      else flags.set(key, value);
    },
    getCapacity: () => 8,
  });
  const spentMana: number[] = [];
  const overcastRequests: number[] = [];
  let mana = overrides.mana ?? 100;
  const segments = overrides.overcastSegments ?? 0;

  const runtime: SpellRuntime & Record<string, unknown> = {
    hasRatFamiliar: () => false,
    castArcanePulse: () => ({ magnitude: 1 }),
    castSummonRatFamiliar: () => ({ magnitude: 1 }),
    castFirebolt: () => ({ fired: true, directHit: false, magnitude: 1 }),
    castMagicMissile: () => ({ hit: true, defeated: null, magnitude: 1 }),
    hasMagicMissileTarget: () => true,
    castLightningStrike: () => ({ strikes: [{ x: 1, y: 1 }], defeated: ['enemy-1'], magnitude: 1 }),
    hasLightningTarget: () => true,
    castFrostNova: () => ({ chilled: 2, affected: [{ x: 2, y: 2 }], defeated: [], magnitude: 2 }),
    hasFrostNovaTargets: () => true,
    castSwiftstep: () => ({ moved: 3, magnitude: 3 }),
    canSwiftstep: () => true,
    castHaste: () => ({ magnitude: 60 }),
    castMirrorImage: () => ({ magnitude: 8 }),
    castShimmerCloak: () => ({ magnitude: 12 }),
    castHealingGlow: () => ({ kind: 'vitality', magnitude: 1 }),
    castManaSip: () => ({ magnitude: 25 }),
    hasLightWisp: () => false,
    castSummonLightWisp: () => ({ ok: true, message: 'A light wisp unfurls.', color: '#9ad1ff' }),
    getSpellStatusTicks: (statusId: string) => {
      const value = flags.get(`spell.status.${statusId}`);
      return typeof value === 'number' ? value : 0;
    },
    ...overrides.runtime,
  };

  const service = new SpellCastService(spellbook, {
    getMana: () => mana,
    spendMana: (amount) => {
      spentMana.push(amount);
      if (mana < amount) return false;
      mana -= amount;
      return true;
    },
    spendOvercastSegments: (missing) => {
      overcastRequests.push(missing);
      const needed = Math.max(1, Math.ceil(missing / 10));
      return Math.min(segments, needed);
    },
    onOvercast: () => {
      flags.set('ui.overcast', true);
    },
    getSpellRuntime: () => runtime,
  } satisfies SpellCastServiceRuntime);

  return { flags, spellbook, service, runtime, spentMana, overcastRequests };
}

function learn(harness: Harness, ...spellIds: string[]): void {
  for (const spellId of spellIds) {
    harness.spellbook.learn(spellId);
  }
}

describe('spell cast service', () => {
  it('rejects unknown spells before touching mana', () => {
    const harness = makeHarness();
    expect(harness.service.cast('not-a-spell')).toEqual({
      ok: false,
      spellId: 'not-a-spell',
      reason: 'unknown-spell',
    });
    expect(harness.spentMana).toEqual([]);
  });

  it('rejects spells the snake has not learned or loaded', () => {
    const harness = makeHarness();
    expect(harness.service.cast('firebolt')).toMatchObject({
      ok: false,
      reason: 'not-known',
      label: 'Firebolt',
    });

    learn(harness, 'firebolt');
    harness.spellbook.unequip('firebolt');
    expect(harness.service.cast('firebolt')).toMatchObject({ ok: false, reason: 'not-loaded' });
    expect(harness.service.cast('firebolt', { requireLoaded: false })).toMatchObject({
      ok: true,
      spellId: 'firebolt',
    });
  });

  it('charges mana and propagates verb detail on a successful firebolt', () => {
    const harness = makeHarness();
    learn(harness, 'firebolt');

    const result = harness.service.cast('firebolt');
    expect(result).toMatchObject({
      ok: true,
      spellId: 'firebolt',
      label: 'Firebolt',
      school: 'destruction',
      manaSpent: 12,
      overcastSegments: 0,
      fired: true,
      directHit: false,
    });
    expect(harness.spentMana).toEqual([12]);
  });

  it('carries lightning strike chains and frost nova chills through the result', () => {
    const harness = makeHarness();
    learn(harness, 'lightning-strike', 'frost-nova');

    const lightning = harness.service.cast('lightning-strike');
    expect(lightning).toMatchObject({
      ok: true,
      manaSpent: 24,
      strikes: [{ x: 1, y: 1 }],
      defeated: ['enemy-1'],
    });

    const nova = harness.service.cast('frost-nova');
    expect(nova).toMatchObject({
      ok: true,
      manaSpent: 20,
      chilled: 2,
      affected: [{ x: 2, y: 2 }],
    });
  });

  it('refuses the mana sip while the river cooldown is active', () => {
    const harness = makeHarness();
    learn(harness, 'mana-sip');
    harness.flags.set('spell.status.mana-sip-cooldown', 30);

    expect(harness.service.cast('mana-sip')).toMatchObject({
      ok: false,
      reason: 'blocked-state',
      label: 'Mana Sip',
    });
    expect(harness.spentMana).toEqual([]);
  });

  it('honors the light wisp summon limit', () => {
    const harness = makeHarness({ runtime: { hasLightWisp: () => true } });
    learn(harness, 'summon-light-wisp');

    expect(harness.service.cast('summon-light-wisp')).toMatchObject({
      ok: false,
      reason: 'summon-limit',
    });
  });

  it('refuses targeted spells when their predicates say no target exists', () => {
    const harness = makeHarness({
      runtime: {
        hasMagicMissileTarget: () => false,
        hasLightningTarget: () => false,
        hasFrostNovaTargets: () => false,
        canSwiftstep: () => false,
      },
    });
    learn(harness, 'magic-missile', 'lightning-strike', 'frost-nova', 'swiftstep');

    for (const spellId of ['magic-missile', 'lightning-strike', 'frost-nova', 'swiftstep']) {
      expect(harness.service.cast(spellId)).toMatchObject({
        ok: false,
        reason: 'invalid-target',
      });
    }
    expect(harness.spentMana).toEqual([]);
  });

  it('fails with insufficient mana when overcast cannot cover the gap', () => {
    const harness = makeHarness({ mana: 4, overcastSegments: 0 });
    learn(harness, 'firebolt');

    const result = harness.service.cast('firebolt');
    expect(result).toMatchObject({
      ok: false,
      reason: 'insufficient-mana',
      manaMissing: 8,
    });
  });

  it('overcasts with body segments when mana runs short', () => {
    const harness = makeHarness({ mana: 8, overcastSegments: 3 });
    learn(harness, 'firebolt');

    const result = harness.service.cast('firebolt');
    expect(result).toMatchObject({
      ok: true,
      spellId: 'firebolt',
      manaSpent: 8,
      overcastSegments: 1,
    });
    expect(harness.overcastRequests).toEqual([4]);
    expect(harness.flags.get('ui.overcast')).toBe(true);
  });

  it('restoration and illusion spells cast through their verb hooks', () => {
    const harness = makeHarness({ mana: 200 });
    learn(harness, 'healing-glow', 'mirror-image', 'shimmer-cloak', 'haste', 'mana-sip');

    expect(harness.service.cast('healing-glow')).toMatchObject({
      ok: true,
      manaSpent: 30,
      kind: 'vitality',
    });
    expect(harness.service.cast('mirror-image')).toMatchObject({
      ok: true,
      manaSpent: 18,
      magnitude: 8,
    });
    expect(harness.service.cast('shimmer-cloak')).toMatchObject({
      ok: true,
      manaSpent: 26,
      magnitude: 12,
    });
    expect(harness.service.cast('haste')).toMatchObject({ ok: true, manaSpent: 22 });
    expect(harness.service.cast('mana-sip')).toMatchObject({ ok: true, manaSpent: 10 });
  });
});
