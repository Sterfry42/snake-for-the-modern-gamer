import { describe, expect, it } from 'vitest';
import { MultiplayerProfiler } from '../MultiplayerProfiler.js';

describe('multiplayer profiling', () => {
  it('bounds the percentile window and retains the maximum and total sample count', () => {
    const profiler = new MultiplayerProfiler(true, 1);
    for (let index = 0; index < 200; index++) {
      const trace = profiler.begin(String(index), 'manualStep');
      if (!trace) throw new Error('Expected a sampled trace');
      trace.times['authority-enqueued'] = 10;
      trace.times['authority-start'] = 10 + index;
      profiler.finish(trace);
    }
    const { metrics, traces } = profiler.read();
    expect(metrics['manualStep/authority-queue']).toEqual({
      count: 200,
      window: 128,
      p50: 135,
      p95: 193,
      p99: 198,
      max: 199,
    });
    expect(traces).toHaveLength(16);
    expect(traces[traces.length - 1]?.id).toBe('199');
  });
});
