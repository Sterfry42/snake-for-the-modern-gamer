import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  DebugRequestValidationError,
  formatDebugJsonl,
  getDebugRunOutputPath,
  parseDebugBatchRequest,
  sanitizeDebugSessionId,
} from '../viteMiddleware.js';
import type { DebugEvent } from '../debugEvents.js';

describe('Vite debug middleware helpers', () => {
  it('sanitizes session IDs and keeps output inside debug directory', () => {
    expect(sanitizeDebugSessionId('../bad/id')).toBe('.._bad_id');
    const output = getDebugRunOutputPath('/repo', '../bad/id');
    expect(output).toBe(path.resolve('/repo/.debug-runs/.._bad_id.jsonl'));
  });

  it('formats JSONL', () => {
    expect(
      formatDebugJsonl([event(1), event(2)])
        .split('\n')
        .filter(Boolean),
    ).toHaveLength(2);
  });

  it('validates requests', () => {
    expect(
      parseDebugBatchRequest(JSON.stringify({ sessionId: 'abc', events: [event(1)] })),
    ).toEqual({
      sessionId: 'abc',
      events: [event(1)],
    });
    expect(() => parseDebugBatchRequest('{')).toThrow(DebugRequestValidationError);
    expect(() => parseDebugBatchRequest(JSON.stringify({ events: [] }))).toThrow(
      DebugRequestValidationError,
    );
  });
});

function event(sequence: number): DebugEvent {
  return {
    sequence,
    type: 'debug.test',
    category: 'debug',
    verbosity: 'normal',
    wallTime: '2026-07-23T00:00:00.000Z',
    elapsedMs: sequence,
    sessionId: 'abc',
    runId: 'run',
    runPhase: 'boot',
    data: {},
  };
}
