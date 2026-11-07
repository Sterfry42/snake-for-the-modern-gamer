import { describe, expect, it } from 'vitest';
import { SkillTreeSystem } from '../skillTree.js';
import type { SkillTreeRuntime } from '../skillTypes.js';

interface ManaRuntime
  extends SkillTreeRuntime, Omit<Record<string, unknown>, keyof SkillTreeRuntime> {
  flags: Map<string, unknown>;
  manaChanges: Array<{ current: number; max: number; regen: number }>;
  wispRegen: number;
}

function createRuntime(overrides: { wispRegen?: number } = {}): ManaRuntime {
  const wispRegen = overrides.wispRegen ?? 0;
  const flags = new Map<string, unknown>();
  const manaChanges: Array<{ current: number; max: number; regen: number }> = [];
  const runtime = {
    flags,
    manaChanges,
    wispRegen,
    getScore: () => 0,
    addScore() {},
    setActionStepIntervalMs() {},
    setTickDelay() {},
    growSnake() {},
    notifyScoreMultiplierChanged() {},
    notifyExtraLifeGained() {},
    notifyExtraLifeConsumed() {},
    notifyExtraLifeReset() {},
    notifyManaChanged(current: number, max: number, regen: number) {
      manaChanges.push({ current, max, regen });
    },
    notifyManaUnlocked() {},
    notifyArcanePulseUnlocked() {},
    notifyArcaneVeilUnlocked() {},
    onArcanePulseCast() {},
    onArcaneVeilTriggered() {},
    getFlag<T = unknown>(key: string): T | undefined {
      return flags.get(key) as T | undefined;
    },
    setFlag(key: string, value: unknown) {
      if (value === undefined) flags.delete(key);
      else flags.set(key, value);
    },
    getLightWispManaRegen: () => wispRegen,
  } as ManaRuntime;
  return runtime;
}

interface ManaHarness {
  manaRegen: number;
  manaCurrent: number;
}

function enableMana(tree: SkillTreeSystem): void {
  tree.enableMana({ max: 50, regen: 1 });
}

function drainMana(tree: SkillTreeSystem): void {
  (tree as unknown as ManaHarness).manaCurrent = 0;
}

describe('skill tree mana credits', () => {
  it('restores mana and unlocks the astral river when it was never enabled', () => {
    const runtime = createRuntime();
    const tree = new SkillTreeSystem(runtime, 100);

    expect(tree.getManaState().enabled).toBe(false);
    tree.restoreMana(25);

    // Unlocking the river tops it off, so the first sip arrives full.
    expect(tree.getStats().mana).toBe(30);
    expect(tree.getStats().manaMax).toBeGreaterThanOrEqual(30);
    expect(tree.getManaState().enabled).toBe(true);
  });

  it('caps restored mana at the maximum', () => {
    const runtime = createRuntime();
    const tree = new SkillTreeSystem(runtime, 100);
    enableMana(tree);
    tree.restoreMana(1000);

    expect(tree.getStats().mana).toBe(tree.getStats().manaMax);
  });

  it('drains queued potion restores on the next tick', () => {
    const runtime = createRuntime();
    const tree = new SkillTreeSystem(runtime, 100);
    enableMana(tree);
    drainMana(tree);
    runtime.flags.set('mana.pendingRestore', 30);

    tree.tick();

    expect(runtime.flags.get('mana.pendingRestore')).toBeUndefined();
    expect(tree.getStats().mana).toBe(31); // 30 refund + 1 regen on the same tick
  });

  it('adds light wisp regen on top of the base regeneration', () => {
    const runtime = createRuntime({ wispRegen: 0.5 });
    const tree = new SkillTreeSystem(runtime, 100);
    enableMana(tree);
    drainMana(tree);

    tree.tick();
    expect(tree.getStats().mana).toBe(1.5);

    tree.tick();
    expect(tree.getStats().mana).toBe(3);
  });

  it('regens through a wisp even when base regen is zero', () => {
    const runtime = createRuntime({ wispRegen: 0.5 });
    const tree = new SkillTreeSystem(runtime, 100);
    enableMana(tree);
    drainMana(tree);

    // Force zero base regen while keeping mana enabled.
    (tree as unknown as ManaHarness).manaRegen = 0;
    tree.tick();
    expect(tree.getStats().mana).toBe(0.5);
  });

  it('applies queued crystal upgrades as stacking derived sources', () => {
    const runtime = createRuntime();
    const tree = new SkillTreeSystem(runtime, 100);
    enableMana(tree);
    runtime.flags.set('mana.pendingUpgrades', [
      { max: 5, regen: 0.5 },
      { max: 5, regen: 0.5 },
    ]);

    tree.tick();

    expect(runtime.flags.get('mana.pendingUpgrades')).toBeUndefined();
    expect(runtime.flags.get('mana.creditIndex')).toBe(2);
    expect(tree.getStats().manaMax).toBe(60);
    expect(tree.getStats().manaRegen).toBeCloseTo(2); // base 1 + 0.5 + 0.5

    // A later crystal stacks on the next credit index instead of overwriting.
    runtime.flags.set('mana.pendingUpgrades', [{ max: 5, regen: 0.5 }]);
    tree.tick();
    expect(runtime.flags.get('mana.creditIndex')).toBe(3);
    expect(tree.getStats().manaMax).toBe(65);
    expect(tree.getStats().manaRegen).toBeCloseTo(2.5);
  });

  it('does not change mana when nothing is queued and mana is idle', () => {
    const runtime = createRuntime();
    const tree = new SkillTreeSystem(runtime, 100);

    tree.tick();

    expect(tree.getStats().mana).toBe(0);
    expect(tree.getManaState().enabled).toBe(false);
    expect(runtime.manaChanges).toEqual([]);
  });
});
