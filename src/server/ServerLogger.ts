import { appendFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import { appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DiagnosticSink, SessionDiagnostic } from '../session/SessionDiagnostic.js';

export interface ServerLoggerOptions {
  directory: string;
  maxBytes?: number;
  archives?: number;
  maxBufferedBytes?: number;
  onError?: (error: unknown) => void;
}

/** Bounded asynchronous file logging. Only fatal-process reporting uses synchronous IO. */
export class ServerLogger {
  readonly runId = randomUUID();
  readonly path: string;
  private readonly directory: string;
  private readonly maxBytes: number;
  private readonly archives: number;
  private readonly maxBufferedBytes: number;
  private readonly pending: string[] = [];
  private pendingBytes = 0;
  private size = 0;
  private dropped = 0;
  private drainPromise: Promise<void> | null = null;
  private closed = false;
  private failed = false;

  private constructor(private readonly options: ServerLoggerOptions) {
    this.directory = resolve(options.directory);
    this.path = join(this.directory, 'server.jsonl');
    this.maxBytes = Math.max(1024, options.maxBytes ?? 10 * 1024 * 1024);
    this.archives = Math.max(1, Math.min(10, options.archives ?? 3));
    this.maxBufferedBytes = Math.max(1024, options.maxBufferedBytes ?? 1024 * 1024);
  }

  static async create(options: ServerLoggerOptions): Promise<ServerLogger> {
    const logger = new ServerLogger(options);
    try {
      await mkdir(logger.directory, { recursive: true });
      logger.size = await stat(logger.path).then(
        (value) => value.size,
        (error: unknown) => {
          if (isMissing(error)) return 0;
          throw error;
        },
      );
    } catch (error) {
      logger.fail(error);
    }
    return logger;
  }

  readonly log: DiagnosticSink = (diagnostic) => {
    if (this.closed || this.failed) return;
    const line = this.encode(diagnostic);
    const bytes = Buffer.byteLength(line);
    if (this.pendingBytes + bytes > this.maxBufferedBytes) {
      this.dropped++;
      return;
    }
    this.pending.push(line);
    this.pendingBytes += bytes;
    this.startDrain();
  };

  /** Preserve Node's normal crash behavior while saving the final diagnostic. */
  fatal(event: string, fields: Record<string, unknown>): void {
    try {
      appendFileSync(this.path, this.encode({ level: 'error', event, fields }), 'utf8');
    } catch (error) {
      this.fail(error);
    }
  }

  async flush(): Promise<void> {
    while (this.drainPromise) await this.drainPromise;
  }
  async close(): Promise<void> {
    this.closed = true;
    await this.flush();
  }

  private encode(diagnostic: SessionDiagnostic): string {
    const entry = {
      timestamp: new Date().toISOString(),
      runId: this.runId,
      level: diagnostic.level,
      event: scrubText(diagnostic.event.slice(0, 128)),
      fields: scrub(diagnostic.fields ?? {}, new WeakSet(), 0),
    };
    let line = JSON.stringify(entry) + '\n';
    const bytes = Buffer.byteLength(line);
    if (bytes > Math.min(16384, this.maxBytes))
      line = JSON.stringify({ ...entry, fields: { truncated: true, originalBytes: bytes } }) + '\n';
    return line;
  }

  private startDrain(): void {
    if (this.drainPromise || this.failed) return;
    this.drainPromise = Promise.resolve()
      .then(() => this.drain())
      .catch((error) => this.fail(error))
      .finally(() => {
        this.drainPromise = null;
        if (this.pending.length && !this.failed) this.startDrain();
      });
  }

  private async drain(): Promise<void> {
    while (this.pending.length || this.dropped) {
      if (this.dropped) {
        const line = this.encode({
          level: 'warn',
          event: 'logger.dropped',
          fields: { count: this.dropped },
        });
        this.dropped = 0;
        this.pending.push(line);
        this.pendingBytes += Buffer.byteLength(line);
      }
      const batch: string[] = [];
      let bytes = 0;
      const limit = Math.min(65536, this.maxBytes);
      while (this.pending.length) {
        const nextBytes = Buffer.byteLength(this.pending[0]);
        if (bytes + nextBytes > limit && batch.length) break;
        batch.push(this.pending.shift()!);
        bytes += nextBytes;
        this.pendingBytes -= nextBytes;
      }
      if (this.size && this.size + bytes > this.maxBytes) await this.rotate();
      await appendFile(this.path, batch.join(''), 'utf8');
      this.size += bytes;
    }
  }

  private async rotate(): Promise<void> {
    await rm(join(this.directory, `server.${this.archives}.jsonl`), { force: true });
    for (let index = this.archives - 1; index >= 0; index--) {
      const source = index === 0 ? this.path : join(this.directory, `server.${index}.jsonl`);
      try {
        await rename(source, join(this.directory, `server.${index + 1}.jsonl`));
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
    }
    this.size = 0;
  }

  private fail(error: unknown): void {
    if (this.failed) return;
    this.failed = true;
    this.pending.length = 0;
    this.pendingBytes = 0;
    if (this.options.onError) this.options.onError(error);
    else console.error('[game-server] File logging disabled:', scrub(error, new WeakSet(), 0));
  }
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function scrubText(value: string): string {
  return value
    .replace(
      /((?:resume|hostToken|token|password|authorization|cookie|secret)\s*[=:]\s*)[^&\s"'<>]+/gi,
      '$1[redacted]',
    )
    .replace(/(\b(?:https?|wss?):\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[redacted]@');
}

function scrub(value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (typeof value === 'string') return scrubText(value.slice(0, 4096));
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value === undefined) return undefined;
  if (typeof value !== 'object') return String(value).slice(0, 128);
  if (depth > 5) return '[depth limit]';
  if (seen.has(value)) return '[circular]';
  seen.add(value);
  if (value instanceof Error)
    return {
      name: scrubText(value.name.slice(0, 128)),
      message: scrub(value.message, seen, depth + 1),
      stack: scrub(value.stack, seen, depth + 1),
      code: 'code' in value ? scrub(value.code, seen, depth + 1) : undefined,
    };
  if (Array.isArray(value)) return value.slice(0, 32).map((item) => scrub(item, seen, depth + 1));
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 100)
      .map(([key, item]) => [
        key,
        /token|password|authorization|cookie|secret|credential/i.test(key)
          ? '[redacted]'
          : scrub(item, seen, depth + 1),
      ]),
  );
}
