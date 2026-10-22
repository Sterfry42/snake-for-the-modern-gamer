import { isRecord } from '../core/saveNormalize.js';
import type { Vector2Like } from '../core/math.js';

export const MOVEMENT_GRACE_MS = 3000;
export const MAX_PREDICTED_STEPS = 30;
export const MAX_RESUME_INPUTS = 64;
export const MAX_CONNECTED_MOVEMENT_LEAD_MS = 250;

/** Inputs only. The old connection binds a replay to one suspension. */
export interface MovementReplay {
  connectionId: string;
  baseRevision: number;
  steps: number;
  elapsedMs: number;
  inputs: Array<{ step: number; direction: Vector2Like }>;
}

export function isMovementReplay(value: unknown): value is MovementReplay {
  if (
    !isRecord(value) ||
    typeof value.connectionId !== 'string' ||
    value.connectionId.length > 128 ||
    !Number.isSafeInteger(value.baseRevision) ||
    Number(value.baseRevision) < 0 ||
    !Number.isInteger(value.steps) ||
    Number(value.steps) < 0 ||
    Number(value.steps) > MAX_PREDICTED_STEPS ||
    typeof value.elapsedMs !== 'number' ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    value.elapsedMs > MOVEMENT_GRACE_MS ||
    !Array.isArray(value.inputs) ||
    value.inputs.length > MAX_RESUME_INPUTS
  )
    return false;
  let previous = 0;
  for (const input of value.inputs) {
    if (
      !isRecord(input) ||
      !Number.isInteger(input.step) ||
      Number(input.step) < previous ||
      Number(input.step) > Number(value.steps) ||
      !isRecord(input.direction) ||
      !Number.isInteger(input.direction.x) ||
      !Number.isInteger(input.direction.y) ||
      Math.abs(Number(input.direction.x)) + Math.abs(Number(input.direction.y)) !== 1
    )
      return false;
    previous = Number(input.step);
  }
  return true;
}

export function parseMovementHello(raw: string): { replay?: MovementReplay } | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.type !== 'movementResume') return null;
    if (value.replay === undefined) return {};
    return isMovementReplay(value.replay) ? { replay: value.replay } : null;
  } catch {
    return null;
  }
}
