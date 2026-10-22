import { isRecord } from '../core/saveNormalize.js';

/** Fixed, bounded operational data only; never executable gameplay or free-form client text. */
export interface ClientDiagnostic {
  type: 'clientDiagnostic';
  event:
    | 'command-timeout'
    | 'connection-lost'
    | 'browser-lifecycle'
    | 'presentation-error'
    | 'protocol-error';
  presentationKind?: 'snapshot' | 'movement' | 'event' | 'status' | 'disconnect';
  browserState?: 'hidden' | 'visible' | 'pagehide' | 'pageshow';
  closeWasClean?: boolean;
  previousConnectionId: string;
  requestId?: number;
  commandType?: string;
  snapshotAgeMs: number;
  pendingCommands: number;
  closeCode?: number;
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
        value.event === 'protocol-error'
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
    };
  } catch {
    return null;
  }
}
