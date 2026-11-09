import { describe, expect, it } from 'vitest';

import { batchParticleValue, cubicEaseOut, type BatchParticleSpec } from '../juice/batchParticle';

const spec: BatchParticleSpec = {
  x: 100,
  y: 200,
  radius: 10,
  color: 0xffffff,
  alpha: 1,
  dx: 20,
  dy: -30,
  scaleEnd: 0,
  durationMs: 200,
};

describe('cubicEaseOut', () => {
  it('matches the Cubic.easeOut curve at the boundaries and midpoint', () => {
    expect(cubicEaseOut(0)).toBe(0);
    expect(cubicEaseOut(1)).toBe(1);
    // Cubic.Out(0.5) = 1 - (1/2)^3 = 0.875
    expect(cubicEaseOut(0.5)).toBeCloseTo(0.875);
  });

  it('clamps out-of-range progress', () => {
    expect(cubicEaseOut(-1)).toBe(0);
    expect(cubicEaseOut(2)).toBe(1);
  });
});

describe('batchParticleValue', () => {
  it('starts at the spawn state at t=0', () => {
    const value = batchParticleValue(spec, 0);
    expect(value).toEqual({ x: 100, y: 200, radius: 10, alpha: 1 });
  });

  it('follows the eased drift and fade mid-life', () => {
    const value = batchParticleValue(spec, 100);
    const eased = 0.875;
    expect(value?.x).toBeCloseTo(100 + 20 * eased);
    expect(value?.y).toBeCloseTo(200 - 30 * eased);
    expect(value?.radius).toBeCloseTo(10 * (1 - eased));
    expect(value?.alpha).toBeCloseTo(1 - eased);
  });

  it('dies at its lifetime and beyond', () => {
    expect(batchParticleValue(spec, 200)).toBeNull();
    expect(batchParticleValue(spec, 200.001)).toBeNull();
    expect(batchParticleValue(spec, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('treats negative elapsed as t=0', () => {
    const value = batchParticleValue(spec, -50);
    expect(value).toEqual({ x: 100, y: 200, radius: 10, alpha: 1 });
  });

  it('keeps a non-zero end scale instead of shrinking to nothing', () => {
    const partial: BatchParticleSpec = { ...spec, scaleEnd: 0.5 };
    // radius(t) = r * (1 + (scaleEnd - 1) * eased); at eased -> 1 it is r * scaleEnd
    const nearEnd = batchParticleValue(partial, partial.durationMs - 1);
    expect(nearEnd?.radius).toBeGreaterThan(partial.radius * partial.scaleEnd * 0.99);
  });
});
