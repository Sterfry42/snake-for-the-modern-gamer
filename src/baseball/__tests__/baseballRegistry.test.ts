import { describe, it, expect } from 'vitest';
import { BaseballRegistry, SWING_WINDOWS } from '../baseballRegistry.js';
import { getPitchDefinition } from '../pitchDefinitions.js';

const makeRng = (values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

const createRegistry = (values: number[] = [0.5]) => new BaseballRegistry({ rng: makeRng(values) });

describe('BaseballRegistry — pitch selection', () => {
  it('picks the first pitch on a zero roll', () => {
    const registry = createRegistry([0]);
    expect(registry.pickRandomPitch().typeId).toBe('fastball');
  });

  it('picks the last pitch on a high roll', () => {
    const registry = createRegistry([0.99]);
    expect(registry.pickRandomPitch().typeId).toBe('changeup');
  });

  it('picks a mid-weight pitch on a mid roll', () => {
    const registry = createRegistry([0.6]);
    // Cumulative weights: fastball 40, curveball 65, slider 85, changeup 100
    expect(registry.pickRandomPitch().typeId).toBe('curveball');
  });

  it('exposes every pitch definition', () => {
    const registry = createRegistry();
    const definitions = registry.getPitchDefinitions();
    expect(definitions.length).toBeGreaterThanOrEqual(4);
    for (const pitch of definitions) {
      expect(registry.pickRandomPitch()).toBeDefined();
      expect(getPitchDefinition(pitch.typeId)?.name).toBe(pitch.name);
    }
  });
});

describe('BaseballRegistry — pitch flight', () => {
  it('starts at the rubber', () => {
    const registry = createRegistry();
    const state = registry.startPitch(getPitchDefinition('fastball')!);
    expect(state.pitchPosition).toBe(0);
    expect(state.complete).toBe(false);
    expect(state.outcome).toBeNull();
    expect(state.distance).toBe(0);
  });

  it('advances proportionally to travel time', () => {
    const registry = createRegistry();
    const state = registry.startPitch(getPitchDefinition('fastball')!); // 560ms
    const tick = registry.tickPitching(state, 280);
    expect(tick.state.pitchPosition).toBeCloseTo(0.5);
    expect(tick.result).toBeUndefined();
  });

  it('strikes when the ball is left on the plate', () => {
    const registry = createRegistry();
    let state = registry.startPitch(getPitchDefinition('fastball')!);
    const tick = registry.tickPitching(state, 560 * 1.5);
    expect(tick.state.complete).toBe(true);
    expect(tick.state.outcome).toBe('strike');
    expect(tick.result).toEqual({
      hit: false,
      outcome: 'strike',
      distance: 0,
      reason: 'left-plate',
    });
    state = tick.state;
    const again = registry.tickPitching(state, 280);
    expect(again.result).toBeUndefined();
  });
});

describe('BaseballRegistry — swing timing', () => {
  const pitch = () => getPitchDefinition('fastball')!;

  it('is a home run at the plate', () => {
    const registry = createRegistry();
    let state = registry.startPitch(pitch());
    state = registry.tickPitching(state, 560).state;
    const result = registry.swing(state);
    expect(result.result?.hit).toBe(true);
    if (result.result?.hit) {
      expect(result.result.outcome).toBe('home-run');
      expect(result.result.distance).toBeGreaterThanOrEqual(390);
      expect(result.result.distance).toBeLessThanOrEqual(470);
    }
  });

  it('is a double slightly early', () => {
    const registry = createRegistry();
    let state = registry.startPitch(pitch());
    // 0.87 of the way: offset 0.13 > triple window (0.12), within double (0.19)
    state = registry.tickPitching(state, 560 * 0.87).state;
    const result = registry.swing(state);
    expect(result.result).toEqual(expect.objectContaining({ hit: true, outcome: 'double' }));
  });

  it('is a single well early', () => {
    const registry = createRegistry();
    let state = registry.startPitch(pitch());
    state = registry.tickPitching(state, 560 * 0.75).state;
    const result = registry.swing(state);
    expect(result.result).toEqual(expect.objectContaining({ hit: true, outcome: 'single' }));
  });

  it('is a foul near the edge of the window', () => {
    const registry = createRegistry();
    let state = registry.startPitch(pitch());
    state = registry.tickPitching(state, 560 * 0.6).state;
    const result = registry.swing(state);
    expect(result.result).toEqual(expect.objectContaining({ hit: true, outcome: 'foul' }));
  });

  it('is a struck-out miss far from the plate', () => {
    const registry = createRegistry();
    let state = registry.startPitch(pitch());
    state = registry.tickPitching(state, 560 * 0.4).state;
    const result = registry.swing(state);
    expect(result.result).toEqual({
      hit: false,
      outcome: 'strike',
      distance: 0,
      reason: 'swung-miss',
    });
  });

  it('grades late swings the same as early ones', () => {
    const registry = createRegistry();
    let state = registry.startPitch(pitch());
    state = registry.tickPitching(state, 560 * 1.13).state; // offset +0.13
    const result = registry.swing(state);
    expect(result.result).toEqual(expect.objectContaining({ hit: true, outcome: 'double' }));
  });

  it('ignores swings after the pitch completes', () => {
    const registry = createRegistry();
    let state = registry.startPitch(pitch());
    state = registry.tickPitching(state, 560).state;
    state = registry.swing(state).state;
    expect(state.complete).toBe(true);
    const again = registry.swing(state);
    expect(again.result).toBeUndefined();
    expect(again.state).toBe(state);
  });
});

describe('BaseballRegistry — modifiers', () => {
  it('widens the home-run window with swingBonus', () => {
    const registry = new BaseballRegistry({
      rng: makeRng([0.5]),
      getModifiers: () => ({ swingBonus: 1.0, distanceBonus: 0 }),
    });
    let state = registry.startPitch(getPitchDefinition('fastball')!);
    // offset 0.06 misses the neutral 0.055 window but fits the doubled 0.11 window
    state = registry.tickPitching(state, 560 * 0.94).state;
    const result = registry.swing(state);
    expect(result.result).toEqual(expect.objectContaining({ hit: true, outcome: 'home-run' }));
  });

  it('extends carry distance with distanceBonus', () => {
    const registry = new BaseballRegistry({
      rng: makeRng([0.5]),
      getModifiers: () => ({ swingBonus: 0, distanceBonus: 0.5 }),
    });
    let state = registry.startPitch(getPitchDefinition('fastball')!);
    state = registry.tickPitching(state, 560).state;
    const result = registry.swing(state);
    if (result.result?.hit) {
      // Neutral home-run at rng 0.5 is 430; 1.5x is 645
      expect(result.result.distance).toBe(645);
    } else {
      throw new Error('expected a hit');
    }
  });
});

describe('BaseballRegistry — abort and score', () => {
  it('reports playerAbort when walking away mid-flight', () => {
    const registry = createRegistry();
    const state = registry.startPitch(getPitchDefinition('fastball')!);
    expect(registry.abortPitch(state)).toEqual({
      hit: false,
      outcome: 'strike',
      distance: 0,
      reason: 'playerAbort',
    });
  });

  it('returns the stored result when aborting after completion', () => {
    const registry = createRegistry();
    let state = registry.startPitch(getPitchDefinition('fastball')!);
    state = registry.tickPitching(state, 560).state;
    state = registry.swing(state).state;
    expect(registry.abortPitch(state)).toEqual(expect.objectContaining({ hit: true }));
  });

  it('scores zero for a whiff', () => {
    const registry = createRegistry();
    expect(registry.calculateScore(0)).toBe(0);
  });

  it('scores at least one for a real carry', () => {
    const registry = createRegistry();
    expect(registry.calculateScore(1)).toBe(1);
  });

  it('scales score by baseballMod', () => {
    const registry = createRegistry();
    expect(registry.calculateScore(430)).toBe(43);
    expect(registry.calculateScore(430, 1.5)).toBe(64);
  });
});

describe('BaseballRegistry — swing window shape', () => {
  it('keeps windows nested from home run to foul', () => {
    expect(SWING_WINDOWS['home-run']).toBeLessThan(SWING_WINDOWS.triple);
    expect(SWING_WINDOWS.triple).toBeLessThan(SWING_WINDOWS.double);
    expect(SWING_WINDOWS.double).toBeLessThan(SWING_WINDOWS.single);
    expect(SWING_WINDOWS.single).toBeLessThan(SWING_WINDOWS.foul);
  });
});
