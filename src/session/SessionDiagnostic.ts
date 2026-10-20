/** Operational diagnostics are separate from gameplay events and never go to clients. */
export interface SessionDiagnostic {
  level: 'info' | 'warn' | 'error';
  event: string;
  fields?: Record<string, unknown>;
}

export type DiagnosticSink = (diagnostic: SessionDiagnostic) => void;
