import { createDebugSessionId, parseDebugActivation } from './debugContext.js';
import { DebugBus } from './debugBus.js';
import type { DebugEvent, DebugStatus } from './debugEvents.js';
import { serializeErrorLike } from './debugSerializers.js';

export interface DebugSnapshotProvider {
  snapshot(): Record<string, unknown>;
}

export interface SnakeDebugWindowApi {
  status(): DebugStatus;
  events(): readonly DebugEvent[];
  flush(): Promise<void>;
  clear(): void;
  export(): void;
  mark(label: string): void;
  snapshot(): void;
}

declare global {
  interface Window {
    snakeDebug?: SnakeDebugWindowApi;
    webkitAudioContext?: typeof AudioContext;
  }
}

let debugBus: DebugBus | null = null;
let snapshotProvider: DebugSnapshotProvider | null = null;

export function initializeDebugRuntime(options: {
  urlSearch: string;
  appVersion?: string;
  gameConfigSummary?: Record<string, unknown>;
}): DebugBus {
  const activation = parseDebugActivation(options.urlSearch);
  const sessionId = activation.enabled ? createDebugSessionId() : 'debug-disabled';
  const runId = activation.enabled ? createDebugSessionId() : 'debug-disabled-run';
  const fileSinkEnabled = activation.enabled && import.meta.env.DEV;
  debugBus = new DebugBus({
    enabled: activation.enabled,
    verbosity: activation.verbosity,
    sessionId,
    runId,
    runPhase: 'boot',
    fileSinkEnabled,
  });

  installWindowApi();
  installGlobalErrorHandlers();
  debugBus.emit({
    type: 'session.started',
    category: 'session',
    verbosity: 'normal',
    data: {
      sessionId,
      runId,
      appVersion: options.appVersion,
      url: window.location.href,
      debugVerbosity: activation.verbosity,
      userAgent: navigator.userAgent,
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      gameConfig: options.gameConfigSummary,
    },
  });

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void debugBus?.flush();
    }
  });
  window.addEventListener('pagehide', () => {
    debugBus?.emit({
      type: 'session.ended',
      category: 'session',
      verbosity: 'normal',
      data: { reason: 'pagehide' },
    });
    void debugBus?.flush();
  });

  return debugBus;
}

export function getDebugBus(): DebugBus | null {
  return debugBus;
}

export function setDebugSnapshotProvider(provider: DebugSnapshotProvider | null): void {
  snapshotProvider = provider;
}

function installWindowApi(): void {
  window.snakeDebug = {
    status: () =>
      debugBus?.status() ?? {
        enabled: false,
        verbosity: 'off',
        sessionId: null,
        runId: null,
        runPhase: null,
        eventCount: 0,
        fileSinkEnabled: false,
        fileSinkAvailable: false,
        droppedEventCount: 0,
      },
    events: () => debugBus?.events() ?? [],
    flush: async () => {
      await debugBus?.flush();
    },
    clear: () => debugBus?.clear(),
    export: () => debugBus?.export(),
    mark: (label: string) => {
      debugBus?.emit({
        type: 'debug.user_marker',
        category: 'debug',
        verbosity: 'normal',
        data: { label },
      });
    },
    snapshot: () => {
      debugBus?.emitLazy(
        {
          type: 'debug.snapshot',
          category: 'debug',
          verbosity: 'normal',
        },
        () => snapshotProvider?.snapshot() ?? { unavailable: true },
      );
    },
  };
}

function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (event) => {
    debugBus?.emit({
      type: 'error.uncaught',
      category: 'error',
      verbosity: 'normal',
      data: {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        error: serializeErrorLike(event.error),
      },
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    debugBus?.emit({
      type: 'error.unhandled_rejection',
      category: 'error',
      verbosity: 'normal',
      data: {
        reason: serializeErrorLike(event.reason),
      },
    });
  });
}
