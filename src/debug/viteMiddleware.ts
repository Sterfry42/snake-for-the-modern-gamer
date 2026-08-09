import path from 'node:path';

import type { DebugEvent } from './debugEvents.js';

export const DEBUG_EVENTS_ENDPOINT = '/__snake-debug/events';
export const DEBUG_RUNS_DIRECTORY = '.debug-runs';
export const MAX_DEBUG_REQUEST_BYTES = 1024 * 1024;

export interface DebugBatchRequest {
  sessionId: string;
  events: DebugEvent[];
}

export function sanitizeDebugSessionId(sessionId: string): string {
  return sessionId.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 180);
}

export function getDebugRunOutputPath(root: string, sessionId: string): string {
  const safeSessionId = sanitizeDebugSessionId(sessionId) || 'debug-session';
  const outputDirectory = path.resolve(root, DEBUG_RUNS_DIRECTORY);
  const outputPath = path.resolve(outputDirectory, `${safeSessionId}.jsonl`);
  if (!outputPath.startsWith(`${outputDirectory}${path.sep}`)) {
    throw new Error('Invalid debug output path.');
  }
  return outputPath;
}

export function formatDebugJsonl(events: readonly DebugEvent[]): string {
  return events.map((event) => JSON.stringify(event)).join('\n') + (events.length > 0 ? '\n' : '');
}

export function parseDebugBatchRequest(body: string): DebugBatchRequest {
  if (Buffer.byteLength(body, 'utf8') > MAX_DEBUG_REQUEST_BYTES) {
    throw new DebugRequestValidationError(413, 'Debug request body is too large.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new DebugRequestValidationError(400, 'Malformed JSON.');
  }
  if (!isRecord(parsed)) {
    throw new DebugRequestValidationError(400, 'Expected JSON object.');
  }
  if (typeof parsed.sessionId !== 'string' || parsed.sessionId.trim().length === 0) {
    throw new DebugRequestValidationError(400, 'Missing sessionId.');
  }
  if (!Array.isArray(parsed.events)) {
    throw new DebugRequestValidationError(400, 'Missing events array.');
  }
  return {
    sessionId: parsed.sessionId,
    events: parsed.events.filter(isDebugEventLike),
  };
}

export class DebugRequestValidationError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

function isDebugEventLike(value: unknown): value is DebugEvent {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.sequence === 'number' &&
    typeof value.type === 'string' &&
    typeof value.category === 'string' &&
    typeof value.verbosity === 'string' &&
    typeof value.wallTime === 'string' &&
    typeof value.elapsedMs === 'number' &&
    typeof value.sessionId === 'string' &&
    typeof value.runId === 'string' &&
    typeof value.runPhase === 'string' &&
    isRecord(value.data)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
