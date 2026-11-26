import type { AuthoritativeGameSession as Session } from '../session/AuthoritativeGameSession.js';
import type { GameSnapshot } from '../session/GameSnapshot.js';
import type { MovementUpdate } from '../session/MovementUpdate.js';
import type { GameEvent, GameEventTiming } from '../session/GameEvent.js';
import type { SessionDiagnostic } from '../session/SessionDiagnostic.js';
import type { ProcessPerformance } from './ProcessPerformance.js';
import type { NetworkPublication } from '../session/NetworkPublication.js';

export type AuthorityInitial = {
  snapshot: GameSnapshot;
  claimed: boolean;
  performance: ReturnType<Session['getPerformanceReport']>;
};

export type AuthorityNotice =
  | { type: 'ready'; value: AuthorityInitial }
  | { type: 'movement'; value: MovementUpdate }
  | { type: 'event'; value: GameEvent; sequence: number; timing?: GameEventTiming }
  | { type: 'diagnostic'; value: SessionDiagnostic }
  | { type: 'result'; id: number; value: unknown }
  | { type: 'failed'; id: number; error: string; name: string };

export type AuthorityRequest = {
  id: number;
  method: keyof AuthorityMethods;
  args: unknown[];
};

export type AuthorityMethods = Pick<
  Session,
  | 'attachConnection'
  | 'detachConnection'
  | 'suspendConnection'
  | 'enableMovementGrace'
  | 'getConnectionSnapshot'
  | 'openNetworkPublication'
  | 'publishConnectionState'
  | 'executeCommand'
  | 'executeNetworkCommand'
  | 'autosave'
  | 'flush'
  | 'stop'
  | 'getMovementClockTime'
  | 'resolveResumeDigest'
  | 'getPlayerMovementDiagnostic'
  | 'recordPublishedMovementRevision'
> & {
  getPerformanceReport(reset?: boolean): ReturnType<Session['getPerformanceReport']> & {
    authorityThread?: ReturnType<ProcessPerformance['read']>;
  };
  networkDeltas(): Promise<NetworkPublication[]>;
  start(): void;
};
