import { describe, expect, it } from 'vitest';
import { buildBossMusic } from '../juice/bossMusic.js';
import { createGainWithContext } from './bossMusicTestStubs.js';

describe('Freak Turkey boss music', () => {
  it('builds a Thanksgiving-themed WebAudio recipe with a gobble trill', () => {
    const { gain, context } = createGainWithContext();
    const result = buildBossMusic('freak-turkey', 0, gain);

    expect(result.sources.length).toBeGreaterThanOrEqual(6);
    expect(result.cleanup.length).toBeGreaterThan(0);
    expect(typeof result.onBuild).toBe('function');
    for (const source of result.sources) {
      expect((source as { type?: string }).type).toBeTruthy();
      expect((source as { frequency?: { value?: number } }).frequency?.value ?? 0).toBeGreaterThan(
        0,
      );
    }
    // The gobble trill uses a sawtooth oscillator warbling the lead frequency.
    const sawtoothSources = result.sources.filter(
      (source) => (source as { type?: string }).type === 'sawtooth',
    );
    expect(sawtoothSources.length).toBeGreaterThan(0);
    // The bass breathes: at least one sub-bass oscillator near D1/D2.
    const lowSources = result.sources.filter(
      (source) => ((source as { frequency?: { value?: number } }).frequency?.value ?? 0) < 80,
    );
    expect(lowSources.length).toBeGreaterThan(0);
    expect(context.createOscillator).toBeDefined();
  });

  it('keeps the generic fallback for unknown boss kinds', () => {
    const { gain } = createGainWithContext();
    const result = buildBossMusic('default', 0, gain);

    expect(result.sources.length).toBe(4);
    expect(result.cleanup.length).toBeGreaterThan(0);
  });

  it('is distinct from the Jason Statham track', () => {
    const { gain } = createGainWithContext();
    const turkey = buildBossMusic('freak-turkey', 0, gain);
    const { gain: gain2 } = createGainWithContext();
    const jason = buildBossMusic('jason-statham', 0, gain2);

    // Both build, but the turkey track is a looser, major-key recipe, not a clone
    expect(turkey.sources.length).not.toBe(0);
    const turkeyTypes = turkey.sources.map((source) => (source as { type?: string }).type);
    const jasonTypes = jason.sources.map((source) => (source as { type?: string }).type);
    expect(turkeyTypes).not.toEqual(jasonTypes);
  });
});
