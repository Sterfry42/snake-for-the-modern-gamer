export type DebugVerbosity = 'normal' | 'verbose' | 'trace';
export type DebugRunPhase =
  | 'boot'
  | 'title'
  | 'character-creation'
  | 'playing'
  | 'paused'
  | 'modal'
  | 'death-resolution'
  | 'game-over';

export type DebugCategory =
  | 'session'
  | 'game'
  | 'input'
  | 'snake'
  | 'apple'
  | 'room'
  | 'generation'
  | 'progression'
  | 'archaeology'
  | 'ui'
  | 'save'
  | 'audio'
  | 'npc'
  | 'combat'
  | 'error'
  | 'performance'
  | 'debug';

export interface DebugEvent<
  TType extends string = string,
  TData extends Record<string, unknown> = Record<string, unknown>,
> {
  sequence: number;
  type: TType;
  category: DebugCategory;
  verbosity: DebugVerbosity;
  wallTime: string;
  elapsedMs: number;
  frame?: number;
  sessionId: string;
  runId: string;
  runPhase: DebugRunPhase;
  causedBySequence?: number;
  transactionId?: string;
  interactionId?: string;
  scene?: string;
  roomId?: string;
  data: TData;
}

export type DebugEventInput<
  TType extends string = string,
  TData extends Record<string, unknown> = Record<string, unknown>,
> = {
  type: TType;
  category: DebugCategory;
  verbosity: DebugVerbosity;
  frame?: number;
  runId?: string;
  runPhase?: DebugRunPhase;
  causedBySequence?: number;
  transactionId?: string;
  interactionId?: string;
  scene?: string;
  roomId?: string;
  data?: TData;
};

export type DebugEventFactory<TData extends Record<string, unknown> = Record<string, unknown>> =
  () => TData;

export interface DebugStatus {
  enabled: boolean;
  verbosity: DebugVerbosity | 'off';
  sessionId: string | null;
  runId: string | null;
  runPhase: DebugRunPhase | null;
  eventCount: number;
  fileSinkEnabled: boolean;
  fileSinkAvailable: boolean;
  droppedEventCount: number;
}
