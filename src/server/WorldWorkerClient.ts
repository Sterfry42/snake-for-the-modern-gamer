import { Worker } from 'node:worker_threads';
import type { WorldResult, WorldWork } from '../world/WorldWork.js';

export class WorldWorkerClient implements WorldWork {
  private readonly worker = new Worker(new URL('./workerBootstrap.mjs', import.meta.url), {
    workerData: { entry: './worldWorker.ts' },
  });
  private readonly pending = new Map<
    number,
    { at: number; done: (result: WorldResult | null) => void }
  >();
  private submittedPaths = 0;
  private submittedRooms = 0;
  private completed = 0;
  private failed = 0;
  private maximumRoundTripMs = 0;
  private nextId = 0;
  private closed = false;

  constructor(onError: (error: Error) => void) {
    this.worker.on('message', ({ id, result }: { id: number; result: WorldResult | null }) => {
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      if (result) this.completed++;
      else this.failed++;
      this.maximumRoundTripMs = Math.max(this.maximumRoundTripMs, performance.now() - pending.at);
      pending.done(result);
    });
    this.worker.on('error', onError);
    this.worker.on('exit', (code) => {
      if (!this.closed && code !== 0) onError(new Error(`World worker exited with code ${code}`));
      this.closed = true;
      this.failed += this.pending.size;
      for (const pending of this.pending.values()) pending.done(null);
      this.pending.clear();
    });
  }

  available(): boolean {
    return !this.closed;
  }
  canAccept(): boolean {
    return this.available() && this.pending.size < 24;
  }

  readonly request: WorldWork['request'] = (job, done) => {
    if (!this.canAccept()) return false;
    const id = ++this.nextId;
    this.pending.set(id, { at: performance.now(), done });
    try {
      this.worker.postMessage({ id, job });
      if (job.kind === 'path') this.submittedPaths++;
      else this.submittedRooms++;
      return true;
    } catch {
      this.pending.delete(id);
      return false;
    }
  };

  report(reset: boolean) {
    const report = {
      pending: this.pending.size,
      submittedPaths: this.submittedPaths,
      submittedRooms: this.submittedRooms,
      completed: this.completed,
      failed: this.failed,
      maximumRoundTripMs: this.maximumRoundTripMs,
    };
    if (reset)
      this.submittedPaths =
        this.submittedRooms =
        this.completed =
        this.failed =
        this.maximumRoundTripMs =
          0;
    return report;
  }

  close(): Promise<number> {
    this.closed = true;
    return this.worker.terminate();
  }
}
