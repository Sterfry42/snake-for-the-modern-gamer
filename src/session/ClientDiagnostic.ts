import type { PlayerInteraction } from './SceneActionCommand.js';
import { isRecord } from '../core/saveNormalize.js';

/** Fixed, bounded operational data only; client claims are untrusted and text is explicitly bounded. */
export interface ClientDiagnostic {
  type: 'clientDiagnostic';
  event:
    | 'command-timeout'
    | 'connection-lost'
    | 'browser-lifecycle'
    | 'presentation-error'
    | 'protocol-error'
    | 'movement-stalled';
  presentationKind?: 'snapshot' | 'movement' | 'event' | 'status' | 'disconnect';
  browserState?: 'hidden' | 'visible' | 'pagehide' | 'pageshow';
  closeWasClean?: boolean;
  previousConnectionId: string;
  requestId?: number;
  commandType?: string;
  snapshotAgeMs: number;
  pendingCommands: number;
  closeCode?: number;
  errorMessage?: string;
  errorStack?: string;
  gameplayEvent?: string;
  snapshotTick?: number;
  snapshotEpoch?: number;
  snapshotRoomId?: string;
  snapshotRoomRevision?: number;
  movementRevision?: number;
  desiredInteraction?: PlayerInteraction;
  lastInputDirection?: 'up' | 'down' | 'left' | 'right';
  lastInputAgeMs?: number;
}

export function parseClientDiagnostic(raw: string): ClientDiagnostic | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.type !== 'clientDiagnostic' ||
      ![
        'command-timeout',
        'connection-lost',
        'browser-lifecycle',
        'presentation-error',
        'protocol-error',
        'movement-stalled',
      ].includes(String(value.event)) ||
      (value.presentationKind !== undefined &&
        !['snapshot', 'movement', 'event', 'status', 'disconnect'].includes(
          String(value.presentationKind),
        )) ||
      (value.browserState !== undefined &&
        !['hidden', 'visible', 'pagehide', 'pageshow'].includes(String(value.browserState))) ||
      (value.closeWasClean !== undefined && typeof value.closeWasClean !== 'boolean') ||
      typeof value.previousConnectionId !== 'string' ||
      !/^[a-zA-Z0-9-]{1,128}$/.test(value.previousConnectionId) ||
      typeof value.snapshotAgeMs !== 'number' ||
      !Number.isFinite(value.snapshotAgeMs) ||
      value.snapshotAgeMs < 0 ||
      value.snapshotAgeMs > 86400000 ||
      typeof value.pendingCommands !== 'number' ||
      !Number.isInteger(value.pendingCommands) ||
      value.pendingCommands < 0 ||
      value.pendingCommands > 100000 ||
      (value.requestId !== undefined &&
        (!Number.isSafeInteger(value.requestId) || Number(value.requestId) < 1)) ||
      (value.commandType !== undefined &&
        (typeof value.commandType !== 'string' || !/^[a-zA-Z]{1,48}$/.test(value.commandType))) ||
      (value.closeCode !== undefined &&
        (!Number.isInteger(value.closeCode) ||
          Number(value.closeCode) < 1000 ||
          Number(value.closeCode) > 4999))
    )
      return null;
    // Select fields explicitly: additional client data is never forwarded into the log.
    return {
      type: 'clientDiagnostic',
      presentationKind:
        value.presentationKind === 'snapshot' ||
        value.presentationKind === 'movement' ||
        value.presentationKind === 'event' ||
        value.presentationKind === 'status' ||
        value.presentationKind === 'disconnect'
          ? value.presentationKind
          : undefined,
      event:
        value.event === 'movement-stalled'
          ? 'movement-stalled'
          : value.event === 'protocol-error'
            ? 'protocol-error'
            : value.event === 'presentation-error'
              ? 'presentation-error'
              : value.event === 'browser-lifecycle'
                ? 'browser-lifecycle'
                : value.event === 'connection-lost'
                  ? 'connection-lost'
                  : 'command-timeout',
      browserState:
        value.browserState === 'hidden' ||
        value.browserState === 'visible' ||
        value.browserState === 'pagehide' ||
        value.browserState === 'pageshow'
          ? value.browserState
          : undefined,
      closeWasClean: typeof value.closeWasClean === 'boolean' ? value.closeWasClean : undefined,
      previousConnectionId: value.previousConnectionId,
      snapshotAgeMs: value.snapshotAgeMs,
      pendingCommands: value.pendingCommands,
      requestId: typeof value.requestId === 'number' ? value.requestId : undefined,
      commandType: typeof value.commandType === 'string' ? value.commandType : undefined,
      closeCode: typeof value.closeCode === 'number' ? value.closeCode : undefined,
      ...(value.event === 'presentation-error' || value.event === 'movement-stalled'
        ? {
            errorMessage:
              value.event === 'presentation-error'
                ? diagnosticText(value.errorMessage, 300)
                : undefined,
            errorStack:
              value.event === 'presentation-error'
                ? diagnosticText(value.errorStack, 1500)
                : undefined,
            gameplayEvent:
              typeof value.gameplayEvent === 'string' &&
              /^[a-z.]+$/i.test(value.gameplayEvent) &&
              value.gameplayEvent.length <= 48
                ? value.gameplayEvent
                : undefined,
            snapshotTick: finiteTime(value.snapshotTick),
            snapshotEpoch: finiteTime(value.snapshotEpoch),
            snapshotRoomId:
              typeof value.snapshotRoomId === 'string' &&
              /^[a-z0-9,:_-]{1,128}$/i.test(value.snapshotRoomId)
                ? value.snapshotRoomId
                : undefined,
            snapshotRoomRevision: finiteTime(value.snapshotRoomRevision),
            movementRevision: finiteTime(value.movementRevision),
            desiredInteraction:
              value.desiredInteraction === 'playing' ||
              value.desiredInteraction === 'manual' ||
              value.desiredInteraction === 'paused' ||
              value.desiredInteraction === 'inventory' ||
              value.desiredInteraction === 'special' ||
              value.desiredInteraction === 'shop' ||
              value.desiredInteraction === 'dialogue'
                ? value.desiredInteraction
                : undefined,
            lastInputDirection:
              value.lastInputDirection === 'up' ||
              value.lastInputDirection === 'down' ||
              value.lastInputDirection === 'left' ||
              value.lastInputDirection === 'right'
                ? value.lastInputDirection
                : undefined,
            lastInputAgeMs: finiteTime(value.lastInputAgeMs),
          }
        : {}),
    };
  } catch {
    return null;
  }
}

function finiteTime(value: unknown): number | undefined {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= Number.MAX_SAFE_INTEGER
    ? value
    : undefined;
}

export function diagnosticText(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value
    .replace(/(?:https?|wss?):\/\/[^\s)]+/gi, (url) => {
      const path = url.replace(/^(\w+:\/\/)[^/]+/i, '$1[host]');
      return path.replace(/[?#].*$/, '');
    })
    .replace(
      /((?:resume(?:Token)?|hostToken|token|password|authorization|cookie|secret)\s*[=:]\s*)(?:Bearer\s+)?[^&\s"'<>]+/gi,
      '$1[redacted]',
    )
    .slice(0, limit);
}
