import { describe, expect, it } from 'vitest';
import { createRng, withFallback } from '../rng.js';

describe('RNG unit tests', () => {
  it('createRng produces the same sequence for the same seed', () => {
    const rng1 = createRng('determinism-test');
    const rng2 = createRng('determinism-test');
    const values1: number[] = [];
    const values2: number[] = [];
    for (let i = 0; i < 100; i++) {
      values1.push(rng1());
      values2.push(rng2());
    }
    expect(values1).toEqual(values2);
  });

  it('different seeds produce different sequences', () => {
    const rng1 = createRng('seed-alpha');
    const rng2 = createRng('seed-beta');
    const values1: number[] = [];
    const values2: number[] = [];
    for (let i = 0; i < 50; i++) {
      values1.push(rng1());
      values2.push(rng2());
    }
    expect(values1).not.toEqual(values2);
  });

  it('different seeds diverge from the first value', () => {
    const rng1 = createRng('diverge-alpha');
    const rng2 = createRng('diverge-beta');
    expect(rng1()).not.toBe(rng2());
  });

  it('all RNG values fall in the range [0, 1)', () => {
    const rng = createRng('range-test');
    for (let i = 0; i < 1000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('RNGs at the same offset produce identical values', () => {
    const rng1 = createRng('offset-test');
    const rng2 = createRng('offset-test');

    // Consume 20 values from both
    for (let i = 0; i < 20; i++) {
      rng1();
      rng2();
    }

    // The next values should match
    expect(rng1()).toBe(rng2());
  });

  it('RNGs at the same offset produce identical sequences', () => {
    const rng1 = createRng('seq-offset-test');
    const rng2 = createRng('seq-offset-test');

    // Consume 50 values from both
    for (let i = 0; i < 50; i++) {
      rng1();
      rng2();
    }

    const values1: number[] = [];
    const values2: number[] = [];
    for (let i = 0; i < 30; i++) {
      values1.push(rng1());
      values2.push(rng2());
    }
    expect(values1).toEqual(values2);
  });

  it('undefined seed produces non-deterministic values (via Math.random)', () => {
    const rng = createRng();
    const values: number[] = [];
    for (let i = 0; i < 10; i++) {
      values.push(rng());
    }
    // Values should still be in [0, 1)
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    // Two separate undefined-seed RNGs should produce different sequences
    const rng2 = createRng();
    const values2: number[] = [];
    for (let i = 0; i < 10; i++) {
      values2.push(rng2());
    }
    expect(values).not.toEqual(values2);
  });

  it('withFallback returns the provided RNG', () => {
    const rng = createRng('fallback-test');
    const wrapped = withFallback(rng);
    const values: number[] = [];
    for (let i = 0; i < 10; i++) {
      values.push(wrapped());
    }
    const direct: number[] = [];
    // Create a fresh RNG with the same seed and consume the same number of values
    const freshRng = createRng('fallback-test');
    for (let i = 0; i < 10; i++) {
      direct.push(freshRng());
    }
    expect(values).toEqual(direct);
  });

  it('withFallback returns Math.random when rng is undefined', () => {
    const wrapped = withFallback(undefined);
    const value = wrapped();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
    // Math.random is non-deterministic, so we just verify the range
  });

  it('same seed always produces the same first value', () => {
    const firstValues: number[] = [];
    for (let run = 0; run < 10; run++) {
      const rng = createRng('first-value-test');
      firstValues.push(rng());
    }
    expect(new Set(firstValues).size).toBe(1);
  });

  it('empty string seed falls back to Math.random (non-deterministic)', () => {
    // Empty string is falsy in JS, so createRng('') falls back to Math.random()
    const rng1 = createRng('');
    const rng2 = createRng('');
    const values1: number[] = [];
    const values2: number[] = [];
    for (let i = 0; i < 20; i++) {
      values1.push(rng1());
      values2.push(rng2());
    }
    // Should be different since both use Math.random()
    expect(values1).not.toEqual(values2);
  });

  it('seed with special characters produces deterministic output', () => {
    const specialSeed = 'pH!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`äöü日本語🐍';
    const values1: number[] = [];
    const values2: number[] = [];
    for (let run = 0; run < 2; run++) {
      const rng = createRng(specialSeed);
      for (let i = 0; i < 20; i++) {
        if (run === 0) values1.push(rng());
        else values2.push(rng());
      }
    }
    expect(values1).toEqual(values2);
  });

  it('long seed strings produce deterministic output', () => {
    const longSeed = 'a'.repeat(1000);
    const values1: number[] = [];
    const values2: number[] = [];
    for (let run = 0; run < 2; run++) {
      const rng = createRng(longSeed);
      for (let i = 0; i < 20; i++) {
        if (run === 0) values1.push(rng());
        else values2.push(rng());
      }
    }
    expect(values1).toEqual(values2);
  });
});
