import type { ClientCommand } from './ClientCommand.js';

export type MultiplayerStage =
  | 'input'
  | 'constructed'
  | 'client-send'
  | 'network-received'
  | 'network-dispatch'
  | 'worker-received'
  | 'authority-enqueued'
  | 'authority-start'
  | 'event-generated'
  | 'authority-committed'
  | 'authority-complete'
  | 'projection-start'
  | 'projection-complete'
  | 'worker-response'
  | 'network-response'
  | 'network-send'
  | 'client-received'
  | 'client-presented'
  | 'first-frame';

export interface MultiplayerCommandTrace {
  id: string;
  command: string;
  times: Partial<Record<MultiplayerStage, number>>;
  movementRevision?: number;
  roomRevision?: number;
  firstEventSequence?: number;
  intendedRevision?: number;
  parentId?: string;
}

export function multiplayerNow(): number {
  return performance.timeOrigin + performance.now();
}

export function markMultiplayer(
  trace: MultiplayerCommandTrace | undefined,
  stage: MultiplayerStage,
): void {
  if (trace && trace.times[stage] === undefined) trace.times[stage] = multiplayerNow();
}

export function multiplayerCommandType(command: ClientCommand): string {
  return 'action' in command
    ? `${command.type}.${command.action}`
    : command.type === 'playerInteraction'
      ? `playerInteraction.${command.mode}`
      : command.type;
}

function environmentNumber(name: string, fallback: number): number {
  const value = typeof process !== 'undefined' ? Number(process.env[name]) : NaN;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const multiplayerThresholds = {
  acknowledgment: environmentNumber('SNAKE_MP_ACK_MS', 25),
  queue: environmentNumber('SNAKE_MP_QUEUE_MS', 10),
  operation: environmentNumber('SNAKE_MP_OPERATION_MS', 25),
  publication: environmentNumber('SNAKE_MP_PUBLICATION_MS', 25),
  encoding: environmentNumber('SNAKE_MP_ENCODING_MS', 10),
};

export function multiplayerProfilingEnabled(): boolean {
  return typeof process !== 'undefined' && process.env.SNAKE_MULTIPLAYER_PROFILE === '1';
}

const spans = [
  ['input-to-command', 'input', 'constructed'],
  ['command-to-wire', 'constructed', 'client-send'],
  ['socket-command', 'client-send', 'client-received'],
  ['event-to-wire', 'event-generated', 'network-send'],
  ['event-to-coordinator', 'event-generated', 'network-received'],
  ['event-queue', 'network-received', 'network-send'],
  ['network-dispatch', 'network-received', 'network-dispatch'],
  ['worker-outbound', 'network-dispatch', 'worker-received'],
  ['worker-to-queue', 'worker-received', 'authority-enqueued'],
  ['authority-queue', 'authority-enqueued', 'authority-start'],
  ['authority-execution', 'authority-start', 'authority-complete'],
  ['authority-commit', 'authority-start', 'authority-committed'],
  ['worker-projection', 'projection-start', 'projection-complete'],
  ['worker-inbound', 'worker-response', 'network-response'],
  ['response-to-send', 'network-response', 'network-send'],
  ['acknowledgment', 'network-received', 'network-send'],
  ['response-to-presentation', 'client-received', 'client-presented'],
  ['authority-to-frame', 'client-received', 'first-frame'],
  ['input-to-frame', 'input', 'first-frame'],
] as const;

/** Keeps a bounded recent window per stage and a small sample of complete traces. */
export class MultiplayerProfiler {
  private readonly metrics = new Map<
    string,
    { values: number[]; count: number; maximum: number }
  >();
  private readonly traces: MultiplayerCommandTrace[] = [];
  private readonly categorySamples = new Map<string, number>();
  private readonly sampleEvery: number;

  constructor(
    readonly enabled: boolean,
    sampleEvery = environmentNumber('SNAKE_MULTIPLAYER_PROFILE_EVERY', 8),
  ) {
    this.sampleEvery = Math.max(1, Math.floor(sampleEvery));
  }

  begin(id: string, command: string): MultiplayerCommandTrace | undefined {
    if (!this.enabled) return undefined;
    const sequence = this.categorySamples.get(command) ?? 0;
    this.categorySamples.set(command, sequence + 1);
    if (sequence % this.sampleEvery !== 0) return undefined;
    return { id, command, times: {} };
  }

  record(key: string, value: number): void {
    if (!this.enabled || !Number.isFinite(value) || value < 0) return;
    let series = this.metrics.get(key);
    if (!series) {
      if (this.metrics.size >= 512) return;
      series = { values: [], count: 0, maximum: 0 };
      this.metrics.set(key, series);
    }
    series.values[series.count % 128] = value;
    series.count++;
    series.maximum = Math.max(series.maximum, value);
  }

  finish(trace: MultiplayerCommandTrace | undefined): void {
    if (!trace) return;
    for (const [label, start, end] of spans) {
      const from = trace.times[start];
      const to = trace.times[end];
      if (from !== undefined && to !== undefined)
        this.record(`${trace.command}/${label}`, to - from);
    }
    this.traces.push(trace);
    if (this.traces.length > 16) this.traces.shift();
  }

  read() {
    const metrics = Object.fromEntries(
      [...this.metrics].map(([key, { values, count, maximum }]) => {
        const sorted = [...values].sort((a, b) => a - b);
        const percentile = (p: number) => sorted[Math.ceil(sorted.length * p) - 1];
        return [
          key,
          {
            count,
            window: sorted.length,
            p50: percentile(0.5),
            p95: percentile(0.95),
            p99: percentile(0.99),
            max: maximum,
          },
        ];
      }),
    );
    return { metrics, traces: structuredClone(this.traces) };
  }
}
