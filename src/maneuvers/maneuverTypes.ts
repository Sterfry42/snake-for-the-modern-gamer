import type { Vector2Like } from '../core/math.js';

export type ManeuverId = 'dash' | 'ghost' | 'sidewinder' | 'rewind';

export type ManeuverActivationMode = 'press' | 'modifier-direction';

export type MovementCause = 'normal' | 'dash' | 'ghost' | 'sidewinder' | 'rewind' | 'forced';

export interface ManeuverDefinition {
  id: ManeuverId;
  name: string;
  shortLabel: string;
  description: string;
  priceScore: 1000;
  cooldownSteps: number;
  activationMode: ManeuverActivationMode;
  distanceTiles?: number;
  durationSteps?: number;
  historySteps?: number;
}

export interface ManeuverSaveState {
  version: 1;
  learnedIds: ManeuverId[];
  equippedId: ManeuverId | null;
  cooldownRemaining: number;
  discoveredTrainerIds: string[];
}

export interface ManeuverSnapshot {
  roomId: string;
  body: Vector2Like[];
  direction: Vector2Like;
  health: number;
}

export type ManeuverFailureReason =
  | 'no-maneuver'
  | 'not-learned'
  | 'cooldown'
  | 'blocked'
  | 'room-boundary'
  | 'no-history'
  | 'modal'
  | 'form';

export interface ManeuverUseResult {
  ok: boolean;
  id?: ManeuverId;
  message: string;
  reason?: ManeuverFailureReason;
}
