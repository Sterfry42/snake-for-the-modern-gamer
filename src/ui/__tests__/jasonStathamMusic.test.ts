import { describe, expect, it, vi } from 'vitest';
import { buildBossMusic } from '../juice/bossMusic.js';

function createAudioParam(): { value: number; setValueAtTime: ReturnType<typeof vi.fn> } {
  return { value: 0, setValueAtTime: vi.fn() };
}

function createOscillatorNodeStub(context?: Record<string, unknown>) {
  return {
    type: 'sine',
    frequency: createAudioParam(),
    gain: createAudioParam(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    context,
  };
}

function createGainNodeStub(context: Record<string, unknown>) {
  return {
    gain: createAudioParam(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    context,
  };
}

function createGainWithContext() {
  const context = {
    createOscillator: () => createOscillatorNodeStub(),
    createGain: () => createGainNodeStub(context),
  };
  const gain = createGainNodeStub(context);
  return { gain: gain as unknown as GainNode, context };
}

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
