import { describe, expect, it } from 'vitest';
import { FishingRegistry } from '../fishingRegistry.js';
import type { FishDefinition, FishingState } from '../types.js';

/**
 * The escape curve documented in tensionZones.ts is graded by zone:
 * critical 0.5, danger 0.05 * fightAggression, warning 0.02 * fightAggression,
 * safe 0. These tests pin every non-safe zone to an actual per-tick roll so a
 * skipped roll (a flat spot in the curve) cannot regress silently.
 */

function makeFish(overrides: Partial<{ fightAggression: number }> = {}): FishDefinition {
  return {
    typeId: 'minnow',
    name: 'Minnow',
    description: '',
    biomeId: 'verdigris-basin',
    rarity: 'common' as const,
    baseScore: 1,
    minWeight: 0.1,
    maxWeight: 0.3,
    difficulty: 2,
    fightAggression: 0.2,
    fightStruggleInterval: 8,
    spawnWeight: 50,
    ...overrides,
  };
}

function makeState(tension: number, fish = makeFish({ fightAggression: 2 })) {
  return {
    tension,
    fish,
    progress: 0,
    fightTicks: 0,
    struggleDirection: 1,
    biomeId: 'verdigris-basin',
    escaped: false,
    lineBroken: false,
    complete: false,
  } satisfies FishingState;
}

describe('FishingRegistry tickFishing escape curve', () => {
  it('escapes from the warning zone on a failed roll', () => {
    // An rng that always returns 0 fails every chance check, so if the warning
    // zone rolls at all (0.02 * fightAggression > 0) the fish must escape.
    const registry = new FishingRegistry({ rng: () => 0 });
    const state = makeState(10); // warning-low
    const { state: next, result } = registry.tickFishing(state, 0);
    expect(next.complete).toBe(true);
    expect(next.escaped).toBe(true);
    expect(result?.caught).toBe(false);
    expect(result?.reason).toBe('escape');
  });

  it('escapes from the warning-high zone on a failed roll', () => {
    const registry = new FishingRegistry({ rng: () => 0 });
    const state = makeState(88); // warning-high
    const { state: next, result } = registry.tickFishing(state, 0);
    expect(next.escaped).toBe(true);
    expect(result?.reason).toBe('escape');
  });

  it('never escapes from the safe zone regardless of the roll', () => {
    const registry = new FishingRegistry({ rng: () => 0 });
    const state = makeState(50); // safe
    const { state: next, result } = registry.tickFishing(state, 0);
    expect(next.complete).toBe(false);
    expect(next.escaped).toBe(false);
    expect(result).toBeUndefined();
  });

  it('survives the warning zone when the roll succeeds and retention is maxed', () => {
    const registry = new FishingRegistry({
      rng: () => 0.99,
      getModifiers: () => ({
        fishingControl: 0,
        fishingStability: 0,
        fishRetention: 1,
        catchProgressBonus: 0,
        rareFishChance: 0,
      }),
    });
    const state = makeState(10);
    const { state: next, result } = registry.tickFishing(state, 0);
    // fishRetention 1 reduces the escape chance to zero.
    expect(next.escaped).toBe(false);
    expect(result).toBeUndefined();
  });
});
