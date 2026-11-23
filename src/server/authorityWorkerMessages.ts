import type { AuthoritativeGameSession as Session } from '../session/AuthoritativeGameSession.js';
import type { GameSnapshot } from '../session/GameSnapshot.js';
import type { MovementUpdate } from '../session/MovementUpdate.js';
import type { GameEvent } from '../session/GameEvent.js';
import type { SessionDiagnostic } from '../session/SessionDiagnostic.js';

export type AuthorityInitial = {
  snapshot: GameSnapshot;
  claimed: boolean;
  performance: ReturnType<Session['getPerformanceReport']>;
};

export type AuthorityNotice =
  | { type: 'ready'; value: AuthorityInitial }
  | { type: 'movement'; value: MovementUpdate }
  | { type: 'event'; value: GameEvent }
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
  | 'executeCommand'
  | 'autosave'
  | 'flush'
  | 'stop'
  | 'getMovementClockTime'
  | 'resolveResumeDigest'
  | 'getPlayerMovementDiagnostic'
  | 'getPerformanceReport'
  | 'recordPublishedMovementRevision'
> & {
  networkState(): Promise<Array<[string, GameSnapshot]>>;
  start(): void;
};
