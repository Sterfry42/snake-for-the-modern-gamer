import { describe, expect, it } from 'vitest';

import { DebugBus } from '../debugBus.js';
import { parseDebugActivation } from '../debugContext.js';
import { safeDebugValue } from '../debugSerializers.js';
import { MemoryDebugSink } from '../sinks/memoryDebugSink.js';

describe('debug activation', () => {
  it('parses supported URL debug modes', () => {
    expect(parseDebugActivation('')).toEqual({ enabled: false, verbosity: 'normal' });
    expect(parseDebugActivation('?debug=true')).toEqual({ enabled: true, verbosity: 'normal' });
    expect(parseDebugActivation('?debug=verbose')).toEqual({
      enabled: true,
      verbosity: 'verbose',
    });
    expect(parseDebugActivation('?debug=trace')).toEqual({ enabled: true, verbosity: 'trace' });
    expect(parseDebugActivation('?debug=wat')).toEqual({ enabled: false, verbosity: 'normal' });
  });
});

describe('debug event filtering and sequencing', () => {
  it('filters events by verbosity', () => {
    const normal = createBus('normal');
    normal.emit(eventInput('normal'));
    normal.emit(eventInput('verbose'));
    normal.emit(eventInput('trace'));
    expect(normal.events().map((event) => event.verbosity)).toEqual(['normal']);

    const verbose = createBus('verbose');
    verbose.emit(eventInput('normal'));
    verbose.emit(eventInput('verbose'));
    verbose.emit(eventInput('trace'));
    expect(verbose.events().map((event) => event.verbosity)).toEqual(['normal', 'verbose']);

    const trace = createBus('trace');
    trace.emit(eventInput('normal'));
    trace.emit(eventInput('verbose'));
    trace.emit(eventInput('trace'));
    expect(trace.events().map((event) => event.verbosity)).toEqual(['normal', 'verbose', 'trace']);
  });

  it('uses monotonic sequence numbers, elapsed time, and one session id', () => {
    let now = 100;
    const bus = createBus('trace', () => {
      now += 5;
      return now;
    });
    bus.emit(eventInput('normal'));
    bus.emit(eventInput('normal'));
    const events = bus.events();
    expect(events.map((event) => event.sequence)).toEqual([1, 2]);
    expect(events[1]!.elapsedMs).toBeGreaterThanOrEqual(events[0]!.elapsedMs);
    expect(new Set(events.map((event) => event.sessionId))).toEqual(new Set(['test-session']));
  });

  it('emits run phase transitions', () => {
    const bus = createBus('normal');
    bus.setRunPhase('playing');
    const [event] = bus.events();
    expect(event?.type).toBe('run.phase_changed');
    expect(event?.runPhase).toBe('playing');
    expect(event?.data).toEqual({
      previousRunPhase: 'boot',
      runPhase: 'playing',
    });
  });
});

describe('memory debug sink', () => {
  it('retains, clears, bounds, and exports valid JSON', () => {
    const sink = new MemoryDebugSink(2);
    sink.handle(debugEvent(1));
    sink.handle(debugEvent(2));
    sink.handle(debugEvent(3));
    expect(sink.getEvents().map((event) => event.sequence)).toEqual([2, 3]);
    expect(JSON.parse(sink.exportJson())).toHaveLength(2);
    sink.clear();
    expect(sink.getEvents()).toHaveLength(0);
  });
});

describe('debug serialization', () => {
  it('does not crash on circular input', () => {
    const value: Record<string, unknown> = {};
    value.self = value;
    expect(safeDebugValue(value)).toEqual({
      self: {
        serializationError: true,
        valueType: 'object',
        stringValue: '[Circular]',
      },
    });
  });

  it('TOWN-HARDEN-022 / TOWN-REGRESSION-014 - preserves reused coordinate objects', () => {
    const shared = { x: 4, y: 9 };
    expect(
      safeDebugValue({
        presence: { position: shared, anchor: shared },
        schedule: { targetPosition: shared },
      }),
    ).toEqual({
      presence: {
        position: { x: 4, y: 9 },
        anchor: { x: 4, y: 9 },
      },
      schedule: {
        targetPosition: { x: 4, y: 9 },
      },
    });
  });
});

function createBus(verbosity: 'normal' | 'verbose' | 'trace', now = () => 100): DebugBus {
  return new DebugBus({
    enabled: true,
    verbosity,
    sessionId: 'test-session',
    runId: 'test-run',
    runPhase: 'boot',
    fileSinkEnabled: false,
    now,
    wallNow: () => new Date('2026-07-23T00:00:00.000Z'),
  });
}

function eventInput(verbosity: 'normal' | 'verbose' | 'trace') {
  return {
    type: `debug.${verbosity}`,
    category: 'debug' as const,
    verbosity,
    data: { ok: true },
  };
}

function debugEvent(sequence: number) {
  return {
    sequence,
    type: 'debug.test',
    category: 'debug' as const,
    verbosity: 'normal' as const,
    wallTime: '2026-07-23T00:00:00.000Z',
    elapsedMs: sequence,
    sessionId: 'test-session',
    runId: 'test-run',
    runPhase: 'boot' as const,
    data: {},
  };
}
