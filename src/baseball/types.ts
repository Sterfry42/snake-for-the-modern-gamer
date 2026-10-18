export type PitchType = 'fastball' | 'curveball' | 'slider' | 'changeup';

export interface PitchDefinition {
  typeId: PitchType;
  name: string;
  /** Milliseconds for the ball to travel from the rubber to home plate. */
  travelMs: number;
  /** Lateral drift of the ball between 0 and 1 (visual break only). */
  curve: number;
  /** Relative weight for random pitch selection. */
  spawnWeight: number;
}

export interface BaseballModifiers {
  /** Fractional widening of the hit windows (0 = neutral). */
  swingBonus: number;
  /** Fractional bonus applied to hit carry distance (0 = neutral). */
  distanceBonus: number;
}

export type HitOutcome = 'home-run' | 'triple' | 'double' | 'single' | 'foul' | 'strike';

export interface BaseballState {
  pitch: PitchDefinition;
  /** 0 at the rubber, 1 at home plate; grows past 1 when the pitch is left behind. */
  pitchPosition: number;
  complete: boolean;
  outcome: HitOutcome | null;
  /** Carry distance in feet once the outcome is known (0 while in flight). */
  distance: number;
}

export type BaseballSessionResult =
  | { hit: true; outcome: Exclude<HitOutcome, 'strike'>; distance: number }
  | {
      hit: false;
      outcome: 'strike';
      distance: number;
      reason: 'swung-miss' | 'left-plate' | 'playerAbort';
    };

/** Cumulative player baseball tracking (persisted in a game flag). */
export interface BaseballStats {
  swings: number;
  hits: number;
  homeRuns: number;
  totalDistance: number;
  bestDistance: number;
}
