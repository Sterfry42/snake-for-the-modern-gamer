import { describe, expect, it, vi } from 'vitest';

import { DevServerDebugSink } from '../sinks/devServerDebugSink.js';
import type { DebugEvent } from '../debugEvents.js';

type BrowserInterval = (callback: () => void, timeout?: number) => number;
type BrowserClearInterval = (intervalId: number) => void;

describe('development server debug sink', () => {
  it('flushes when the batch reaches max size', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const sink = new DevServerDebugSink('session', true, {
      fetchImpl,
      maxBatchSize: 2,
      setIntervalImpl: (() => 1) as BrowserInterval,
      clearIntervalImpl: (() => undefined) as BrowserClearInterval,
    });
    sink.handle(event(1));
    sink.handle(event(2));
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    expect(sink.getPendingCount()).toBe(0);
  });

  it('flushes on interval and disables after endpoint failure', async () => {
    const callbacks: Array<() => void> = [];
    const fetchImpl = vi.fn(async () => new Response(null, { status: 404 }));
    const sink = new DevServerDebugSink('session', true, {
      fetchImpl,
      maxBatchSize: 100,
      setIntervalImpl: ((callback: () => void) => {
        callbacks.push(callback);
        return 1;
      }) as BrowserInterval,
      clearIntervalImpl: (() => undefined) as BrowserClearInterval,
    });
    sink.handle(event(1));
    callbacks[0]?.();
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    expect(sink.isAvailable()).toBe(false);
    expect(sink.getPendingCount()).toBe(1);
    sink.handle(event(2));
    expect(sink.getPendingCount()).toBe(1);
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
    sessionId: 'session',
    runId: 'run',
    runPhase: 'boot',
    data: {},
  };
}
