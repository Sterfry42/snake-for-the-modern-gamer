import { serialize } from 'node:v8';
import {
  MultiplayerProfiler,
  multiplayerProfilingEnabled,
} from '../session/MultiplayerProfiler.js';

/** v8 sizes are sampled estimates. postMessage wall time includes synchronous clone cost. */
export class WorkerTransferPerformance {
  private readonly profiler = new MultiplayerProfiler(multiplayerProfilingEnabled());
  private readonly sent = new Map<string, number>();
  private readonly received = new Map<string, number>();

  post(kind: string, message: unknown, send: () => void): void {
    this.sent.set(kind, (this.sent.get(kind) ?? 0) + 1);
    const sample = this.profiler.begin('', kind);
    const startedAt = sample ? performance.now() : undefined;
    send();
    if (startedAt !== undefined) {
      this.profiler.record(kind + '/post-message', performance.now() - startedAt);
      this.measureBytes(kind + '/out-bytes', message);
    }
  }

  receive(kind: string, message: unknown): void {
    this.received.set(kind, (this.received.get(kind) ?? 0) + 1);
    if (this.profiler.begin('', kind)) this.measureBytes(kind + '/in-bytes', message);
  }

  private measureBytes(key: string, message: unknown): void {
    try {
      this.profiler.record(key, serialize(message).byteLength);
    } catch {
      this.profiler.record('unmeasurable-messages', 1);
    }
  }

  read() {
    return {
      sent: Object.fromEntries(this.sent),
      received: Object.fromEntries(this.received),
      samples: this.profiler.read().metrics,
    };
  }
}
