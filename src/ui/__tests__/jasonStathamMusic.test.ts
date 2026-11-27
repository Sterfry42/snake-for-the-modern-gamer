import { describe, expect, it } from 'vitest';
import { buildBossMusic } from '../juice/bossMusic.js';
import { createGainWithContext } from './bossMusicTestStubs.js';

describe('Jason Statham boss music', () => {
  it('builds a cinematic recipe with a deep heartbeat sub oscillator', () => {
    const { gain, context } = createGainWithContext();
    const result = buildBossMusic('jason-statham', 0, gain);

    expect(result.sources.length).toBeGreaterThanOrEqual(8);
    expect(result.cleanup.length).toBeGreaterThan(0);
    for (const source of result.sources) {
      expect((source as { type?: string }).type).toBeTruthy();
      expect((source as { frequency?: { value?: number } }).frequency?.value ?? 0).toBeGreaterThan(
        0,
      );
    }
    // The cinematic heartbeat: a deep sub sine near 48Hz the rhythm LFO throbs
    const heartbeat = result.sources.find((source) => {
      const node = source as { type?: string; frequency?: { value?: number } };
      return node.type === 'sine' && (node.frequency?.value ?? 0) < 60;
    });
    expect(heartbeat).toBeDefined();
    // The heartbeat is modulated by a low-frequency thump LFO
    const thumpLfo = result.sources.find((source) => {
      const node = source as { type?: string; frequency?: { value?: number } };
      const freq = node.frequency?.value ?? 0;
      return node.type === 'sine' && freq > 1 && freq < 3;
    });
    expect(thumpLfo).toBeDefined();
    expect(context.createOscillator).toBeDefined();
  });

  it('remains distinct from the Freak Turkey track', () => {
    const { gain: jasonGain } = createGainWithContext();
    const { gain: turkeyGain } = createGainWithContext();
    const jason = buildBossMusic('jason-statham', 0, jasonGain);
    const turkey = buildBossMusic('freak-turkey', 0, turkeyGain);

    const jasonTypes = jason.sources.map((source) => (source as { type?: string }).type);
    const turkeyTypes = turkey.sources.map((source) => (source as { type?: string }).type);
    expect(jasonTypes).not.toEqual(turkeyTypes);
  });
});
