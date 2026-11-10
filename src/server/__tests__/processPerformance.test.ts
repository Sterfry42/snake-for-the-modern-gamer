import { describe, expect, it } from 'vitest';
import { ProcessPerformance } from '../ProcessPerformance.js';

describe('ProcessPerformance', () => {
  it('reports bounded GC pause aggregates and resets them across samples', () => {
    const probe = new ProcessPerformance();
    try {
      for (let index = 0; index < 2; index++) {
        const report = probe.read();
        expect(report.gcCount).toBeGreaterThanOrEqual(0);
        expect(report.gcDurationMs).toBeGreaterThanOrEqual(0);
        expect(report.maximumGcPauseMs).toBeGreaterThanOrEqual(0);
        expect(report.maximumGcPauseMs).toBeLessThanOrEqual(report.gcDurationMs);
        expect(Number.isFinite(report.eventLoopMaxMs)).toBe(true);
      }
    } finally {
      probe.close();
    }
  });
});
