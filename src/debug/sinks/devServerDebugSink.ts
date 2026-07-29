import type { DebugEvent } from '../debugEvents.js';

type DebugSetInterval = (callback: () => void, timeout?: number) => number;
type DebugClearInterval = (intervalId: number) => void;

export interface DevServerDebugSinkOptions {
  endpoint?: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  fetchImpl?: typeof fetch;
  setIntervalImpl?: DebugSetInterval;
  clearIntervalImpl?: DebugClearInterval;
}

export class DevServerDebugSink {
  private readonly endpoint: string;
  private readonly flushIntervalMs: number;
  private readonly maxBatchSize: number;
  private readonly fetchImpl: typeof fetch;
  private readonly setIntervalImpl: DebugSetInterval;
  private readonly clearIntervalImpl: DebugClearInterval;
  private queue: DebugEvent[] = [];
  private available = true;
  private flushing = false;
  private intervalId: number | null = null;

  constructor(
    private readonly sessionId: string,
    enabled: boolean,
    options: DevServerDebugSinkOptions = {},
  ) {
    this.endpoint = options.endpoint ?? '/__snake-debug/events';
    this.flushIntervalMs = options.flushIntervalMs ?? 500;
    this.maxBatchSize = options.maxBatchSize ?? 100;
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.setIntervalImpl = options.setIntervalImpl ?? window.setInterval.bind(window);
    this.clearIntervalImpl = options.clearIntervalImpl ?? window.clearInterval.bind(window);
    this.available = enabled;
    if (enabled) {
      this.intervalId = this.setIntervalImpl(() => {
        void this.flush();
      }, this.flushIntervalMs);
    }
  }

  handle(event: DebugEvent): void {
    if (!this.available) {
      return;
    }
    this.queue.push(event);
    if (this.queue.length >= this.maxBatchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (!this.available || this.flushing || this.queue.length === 0) {
      return;
    }
    this.flushing = true;
    const batch = this.queue.slice(0, this.maxBatchSize);
    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId, events: batch }),
        keepalive: batch.length < 20,
      });
      if (!response.ok) {
        this.disable();
        return;
      }
      this.queue = this.queue.slice(batch.length);
    } catch {
      this.disable();
    } finally {
      this.flushing = false;
    }
  }

  disable(): void {
    this.available = false;
    if (this.intervalId !== null) {
      this.clearIntervalImpl(this.intervalId);
      this.intervalId = null;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  getPendingCount(): number {
    return this.queue.length;
  }
}
