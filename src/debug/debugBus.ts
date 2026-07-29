import { verbosityAllows } from './debugContext.js';
import type {
  DebugEvent,
  DebugEventFactory,
  DebugEventInput,
  DebugRunPhase,
  DebugStatus,
  DebugVerbosity,
} from './debugEvents.js';
import { safeDebugValue } from './debugSerializers.js';
import { ConsoleDebugSink } from './sinks/consoleDebugSink.js';
import { DevServerDebugSink } from './sinks/devServerDebugSink.js';
import { MemoryDebugSink } from './sinks/memoryDebugSink.js';

export interface DebugBusOptions {
  enabled: boolean;
  verbosity: DebugVerbosity;
  sessionId: string;
  runId: string;
  runPhase?: DebugRunPhase;
  memoryLimit?: number;
  fileSinkEnabled?: boolean;
  now?: () => number;
  wallNow?: () => Date;
}

export class DebugBus {
  private sequence = 0;
  private readonly startMs: number;
  private lastElapsedMs = 0;
  private readonly memorySink: MemoryDebugSink;
  private readonly consoleSink: ConsoleDebugSink;
  private readonly devServerSink: DevServerDebugSink | null;
  private runPhase: DebugRunPhase;

  constructor(private readonly options: DebugBusOptions) {
    const now = this.options.now ?? performance.now.bind(performance);
    this.startMs = now();
    this.memorySink = new MemoryDebugSink(options.memoryLimit);
    this.consoleSink = new ConsoleDebugSink();
    this.runPhase = options.runPhase ?? 'boot';
    this.devServerSink =
      options.enabled && options.fileSinkEnabled
        ? new DevServerDebugSink(options.sessionId, true)
        : null;
  }

  get enabled(): boolean {
    return this.options.enabled;
  }

  get verbosity(): DebugVerbosity {
    return this.options.verbosity;
  }

  get sessionId(): string {
    return this.options.sessionId;
  }

  get runId(): string {
    return this.options.runId;
  }

  setRunPhase(runPhase: DebugRunPhase): void {
    this.runPhase = runPhase;
  }

  shouldEmit(verbosity: DebugVerbosity): boolean {
    return this.enabled && verbosityAllows(this.verbosity, verbosity);
  }

  emit<TType extends string, TData extends Record<string, unknown>>(
    input: DebugEventInput<TType, TData>,
  ): DebugEvent<TType, TData> | null {
    if (!this.shouldEmit(input.verbosity)) {
      return null;
    }
    const event = this.createEvent(input);
    this.dispatch(event);
    return event;
  }

  emitLazy<TType extends string, TData extends Record<string, unknown>>(
    input: Omit<DebugEventInput<TType, TData>, 'data'>,
    createData: DebugEventFactory<TData>,
  ): DebugEvent<TType, TData> | null {
    if (!this.shouldEmit(input.verbosity)) {
      return null;
    }
    return this.emit({ ...input, data: createData() });
  }

  status(): DebugStatus {
    return {
      enabled: this.enabled,
      verbosity: this.enabled ? this.verbosity : 'off',
      sessionId: this.enabled ? this.sessionId : null,
      runId: this.enabled ? this.runId : null,
      runPhase: this.enabled ? this.runPhase : null,
      eventCount: this.memorySink.getEvents().length,
      fileSinkEnabled: this.devServerSink !== null,
      fileSinkAvailable: this.devServerSink?.isAvailable() ?? false,
      droppedEventCount: this.memorySink.getDroppedEventCount(),
    };
  }

  events(): readonly DebugEvent[] {
    return this.memorySink.getEvents();
  }

  clear(): void {
    this.memorySink.clear();
  }

  export(): void {
    this.memorySink.download(this.sessionId);
  }

  async flush(): Promise<void> {
    await this.devServerSink?.flush();
  }

  dispose(): void {
    this.devServerSink?.disable();
  }

  private createEvent<TType extends string, TData extends Record<string, unknown>>(
    input: DebugEventInput<TType, TData>,
  ): DebugEvent<TType, TData> {
    const now = this.options.now ?? performance.now.bind(performance);
    const wallNow = this.options.wallNow ?? (() => new Date());
    const elapsedMs = Math.max(this.lastElapsedMs, now() - this.startMs);
    this.lastElapsedMs = elapsedMs;
    return {
      sequence: ++this.sequence,
      type: input.type,
      category: input.category,
      verbosity: input.verbosity,
      wallTime: wallNow().toISOString(),
      elapsedMs,
      frame: input.frame,
      runId: input.runId ?? this.runId,
      runPhase: input.runPhase ?? this.runPhase,
      causedBySequence: input.causedBySequence,
      transactionId: input.transactionId,
      interactionId: input.interactionId,
      scene: input.scene,
      roomId: input.roomId,
      sessionId: this.sessionId,
      data: safeDebugValue(input.data ?? {}) as TData,
    };
  }

  private dispatch(event: DebugEvent): void {
    try {
      this.memorySink.handle(event);
      this.consoleSink.handle(event);
      this.devServerSink?.handle(event);
    } catch (error) {
      console.warn('[snake-debug] debug sink failed', error);
    }
  }
}
