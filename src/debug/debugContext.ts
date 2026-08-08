import type { DebugVerbosity } from './debugEvents.js';

export interface DebugActivation {
  enabled: boolean;
  verbosity: DebugVerbosity;
}

export function parseDebugActivation(search: string): DebugActivation {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const value = params.get('debug');
  switch (value) {
    case 'true':
      return { enabled: true, verbosity: 'normal' };
    case 'verbose':
      return { enabled: true, verbosity: 'verbose' };
    case 'trace':
      return { enabled: true, verbosity: 'trace' };
    default:
      return { enabled: false, verbosity: 'normal' };
  }
}

export function createDebugSessionId(now = new Date(), random = Math.random): string {
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const suffix = Math.floor(random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
  return `${timestamp}_${suffix}`;
}

export function createDebugTransactionId(prefix: string, random = Math.random): string {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 32) || 'tx';
  const suffix = Math.floor(random() * 0xffffffff)
    .toString(16)
    .padStart(8, '0');
  return `${safePrefix}_${suffix}`;
}

export function verbosityAllows(active: DebugVerbosity, eventVerbosity: DebugVerbosity): boolean {
  const ranks: Record<DebugVerbosity, number> = {
    normal: 0,
    verbose: 1,
    trace: 2,
  };
  return ranks[eventVerbosity] <= ranks[active];
}
