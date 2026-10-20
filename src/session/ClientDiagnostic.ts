import { isRecord } from '../core/saveNormalize.js';

/** Fixed, bounded operational data only; never executable gameplay or free-form client text. */
export interface ClientDiagnostic {
  type: 'clientDiagnostic';
  event: 'command-timeout' | 'connection-lost';
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
      (value.event !== 'command-timeout' && value.event !== 'connection-lost') ||
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
      event: value.event,
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
