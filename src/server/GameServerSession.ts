import type { ProcessPerformance } from './ProcessPerformance.js';
import type { AuthoritativeGameSession as Session } from '../session/AuthoritativeGameSession.js';

export type GameServerSession = Pick<
  Session,
  | 'configureHosting'
  | 'onDiagnostic'
  | 'onMovement'
  | 'onEvent'
  | 'getSnapshot'
  | 'hasClaimedPrimaryCharacter'
  | 'suspendConnection'
  | 'detachConnection'
  | 'attachConnection'
  | 'enableMovementGrace'
  | 'openNetworkPublication'
  | 'publishConnectionState'
  | 'executeNetworkCommand'
  | 'publishNetworkDeltas'
  | 'recordPublishedMovementRevision'
  | 'getPerformanceReport'
  | 'performance'
  | 'autosave'
  | 'stop'
  | 'flush'
> & {
  resolveResumeDigest(
    digest: string,
  ):
    | ReturnType<Session['resolveResumeDigest']>
    | Promise<ReturnType<Session['resolveResumeDigest']>>;
  getMovementClockTime(): number | Promise<number>;
  getPlayerMovementDiagnostic(
    id: string,
  ):
    | ReturnType<Session['getPlayerMovementDiagnostic']>
    | Promise<ReturnType<Session['getPlayerMovementDiagnostic']>>;
  refreshPerformance?(reset: boolean): Promise<
    ReturnType<Session['getPerformanceReport']> & {
      authorityThread?: ReturnType<ProcessPerformance['read']>;
    }
  >;
};
