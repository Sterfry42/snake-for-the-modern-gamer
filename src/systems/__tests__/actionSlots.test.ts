import { describe, expect, it, vi } from 'vitest';
import { ActionSlotController, type ActionSlotRuntime } from '../actionSlots.js';
import type { SkillTreeStats } from '../skillTypes.js';

function makeRuntime(overrides: Partial<ActionSlotRuntime> = {}) {
  const stats: SkillTreeStats = {
    extraLives: 0,
    scoreMultiplier: 1,
    speedRank: 0,
    growthRank: 0,
    mana: 50,
    manaMax: 60,
    manaRegen: 1.2,
    arcanePulseUnlocked: false,
    arcaneVeilUnlocked: false,
  };
  const flags = new Map<string, unknown>();
  const getFlag = <T = unknown>(key: string): T | undefined => flags.get(key) as T | undefined;
  const runtime: ActionSlotRuntime = {
    getStats: () => stats,
    getFlag,
    setFlag: (key, value) => {
      if (value === undefined) {
        flags.delete(key);
      } else {
        flags.set(key, value);
      }
    },
    tryCastArcanePulse: vi.fn(() => true),
    getArcanePulseCost: () => 20,
    tryActivateManualSurge: () => ({ ok: true, message: 'Surge on.' }),
    hasRatFamiliar: () => false,
    getSummonFamiliarCost: () => 25,
    tryCastSummonFamiliar: vi.fn(() => true),
    hasFollowers: () => false,
    commandFollowers: () => ({ ok: true, message: 'Commanded.' }),
    recallFollowers: () => ({ ok: true, message: 'Recalled.' }),
    ...overrides,
  };
  return { runtime, stats, flags };
}

describe('summon rat familiar action slot', () => {
  it('stays locked until the Familiar Rite flag is set', () => {
    const { runtime } = makeRuntime();
    const controller = new ActionSlotController(runtime);

    const view = controller
      .getAbilityViews()
      .find((ability) => ability.id === 'summon-rat-familiar');
    expect(view?.canBind).toBe(false);
    expect(view?.disabledReason).toMatch(/Familiar Rite/);

    expect(controller.bind('q', 'summon-rat-familiar')).toEqual({
      ok: false,
      reason: 'Unlock Familiar Rite in the skill tree.',
    });
  });

  it('binds and casts the summon when the rite is unlocked', () => {
    const { runtime, flags } = makeRuntime();
    flags.set('arcane.familiarRite', { enabled: true });
    const controller = new ActionSlotController(runtime);

    expect(controller.bind('q', 'summon-rat-familiar').ok).toBe(true);
    const result = controller.use('q');

    expect(result).toEqual({ ok: true, label: 'Summon Rat Familiar' });
    expect(runtime.tryCastSummonFamiliar).toHaveBeenCalledOnce();
  });

  it('refuses to summon while a rat familiar is already out', () => {
    const { runtime, flags } = makeRuntime({ hasRatFamiliar: () => true });
    flags.set('arcane.familiarRite', { enabled: true });
    const controller = new ActionSlotController(runtime);

    expect(controller.bind('q', 'summon-rat-familiar').ok).toBe(true);
    const result = controller.use('q');

    expect(result).toEqual({ ok: false, reason: 'Your rat familiar is already out there.' });
    expect(runtime.tryCastSummonFamiliar).not.toHaveBeenCalled();
  });

  it('reports missing mana for the summon', () => {
    const { runtime, stats, flags } = makeRuntime();
    flags.set('arcane.familiarRite', { enabled: true });
    stats.mana = 10;
    const controller = new ActionSlotController(runtime);

    expect(controller.bind('q', 'summon-rat-familiar').ok).toBe(true);
    const result = controller.use('q');

    expect(result).toEqual({
      ok: false,
      reason: 'Summon Rat Familiar needs 25 mana - missing 15.',
    });
    expect(runtime.tryCastSummonFamiliar).not.toHaveBeenCalled();
  });

  it('keeps Arcane Pulse as the default binding when unlocked', () => {
    const { runtime, stats, flags } = makeRuntime();
    stats.arcanePulseUnlocked = true;
    flags.set('arcane.familiarRite', { enabled: true });
    const controller = new ActionSlotController(runtime);

    controller.ensureDefaultBinding();
    expect(controller.getBound('q')).toBe('arcane-pulse');
  });
});
