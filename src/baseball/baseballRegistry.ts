import type {
  BaseballModifiers,
  BaseballSessionResult,
  BaseballState,
  HitOutcome,
  PitchDefinition,
} from './types.js';
import { PITCH_DEFINITIONS } from './pitchDefinitions.js';
import { applyBonus } from '../stats/statModifiers.js';

export interface BaseballRegistryOptions {
  /** Random number generator (0-1) */
  rng: () => number;
  /** Runtime modifiers for swing windows and carry distance. Defaults to neutral behavior. */
  getModifiers?: () => BaseballModifiers;
}

/** Swing windows in plate-space: distance from home plate that still counts. */
export const SWING_WINDOWS = {
  'home-run': 0.055,
  triple: 0.12,
  double: 0.19,
  single: 0.27,
  foul: 0.42,
} as const;

/** How far past the plate the ball may travel before a left pitch counts as a strike. */
const LEFT_PITCH_TOLERANCE = 0.45;

/** Carry distance in feet per outcome: [base, randomSpread]. */
const OUTCOME_DISTANCE: Record<Exclude<HitOutcome, 'strike'>, [number, number]> = {
  'home-run': [390, 80],
  triple: [285, 60],
  double: [185, 70],
  single: [95, 60],
  foul: [20, 10],
};

const NEUTRAL_MODIFIERS: BaseballModifiers = { swingBonus: 0, distanceBonus: 0 };

export class BaseballRegistry {
  private readonly rng: () => number;
  private readonly getModifiers: () => BaseballModifiers;

  constructor(options: BaseballRegistryOptions) {
    this.rng = options.rng;
    this.getModifiers = options.getModifiers ?? (() => NEUTRAL_MODIFIERS);
  }

  /** Get all pitch definitions */
  getPitchDefinitions(): readonly PitchDefinition[] {
    return PITCH_DEFINITIONS;
  }

  /**
   * Pick a random pitch using weighted selection.
   */
  pickRandomPitch(): PitchDefinition {
    const totalWeight = PITCH_DEFINITIONS.reduce((sum, pitch) => sum + pitch.spawnWeight, 0);
    if (totalWeight <= 0) return PITCH_DEFINITIONS[0];

    let roll = this.rng() * totalWeight;
    for (const pitch of PITCH_DEFINITIONS) {
      roll -= pitch.spawnWeight;
      if (roll <= 0) return pitch;
    }
    return PITCH_DEFINITIONS[PITCH_DEFINITIONS.length - 1];
  }

  /**
   * Start a new pitch.
   * Returns the initial BaseballState.
   */
  startPitch(pitch: PitchDefinition): BaseballState {
    return {
      pitch,
      pitchPosition: 0,
      complete: false,
      outcome: null,
      distance: 0,
    };
  }

  /**
   * Advance one animation frame of the pitch.
   *
   * @param state — current baseball state
   * @param deltaMs — elapsed milliseconds
   * @returns { state, result? } — result is present only when the pitch completes
   */
  tickPitching(
    state: BaseballState,
    deltaMs: number,
  ): { state: BaseballState; result?: BaseballSessionResult } {
    if (state.complete) return { state };

    const updated = {
      ...state,
      pitchPosition: state.pitchPosition + deltaMs / state.pitch.travelMs,
    };
    if (updated.pitchPosition >= 1 + LEFT_PITCH_TOLERANCE) {
      updated.complete = true;
      updated.outcome = 'strike';
      updated.distance = 0;
      return {
        state: updated,
        result: { hit: false, outcome: 'strike', distance: 0, reason: 'left-plate' },
      };
    }
    return { state: updated };
  }

  /**
   * Resolve the player's swing against the current pitch position.
   *
   * Timing is measured in plate-space: the closer the ball is to home plate
   * (position 1) when the bat comes around, the farther the carry.
   */
  swing(state: BaseballState): { state: BaseballState; result?: BaseballSessionResult } {
    if (state.complete) return { state };

    const offset = state.pitchPosition - 1;
    const absOffset = Math.abs(offset);
    const modifiers = this.getModifiers();
    const homeRunWindow = applyBonus(SWING_WINDOWS['home-run'], modifiers.swingBonus);
    const tripleWindow = applyBonus(SWING_WINDOWS.triple, modifiers.swingBonus);
    const doubleWindow = applyBonus(SWING_WINDOWS.double, modifiers.swingBonus);
    const singleWindow = applyBonus(SWING_WINDOWS.single, modifiers.swingBonus);
    const foulWindow = applyBonus(SWING_WINDOWS.foul, modifiers.swingBonus);

    let outcome: HitOutcome;
    if (absOffset <= homeRunWindow) outcome = 'home-run';
    else if (absOffset <= tripleWindow) outcome = 'triple';
    else if (absOffset <= doubleWindow) outcome = 'double';
    else if (absOffset <= singleWindow) outcome = 'single';
    else if (absOffset <= foulWindow) outcome = 'foul';
    else outcome = 'strike';

    if (outcome === 'strike') {
      const updated: BaseballState = { ...state, complete: true, outcome, distance: 0 };
      return {
        state: updated,
        result: { hit: false, outcome: 'strike', distance: 0, reason: 'swung-miss' },
      };
    }

    const [base, spread] = OUTCOME_DISTANCE[outcome];
    const rawDistance = base + this.rng() * spread;
    const distance = Math.max(1, Math.round(applyBonus(rawDistance, modifiers.distanceBonus)));
    const updated: BaseballState = { ...state, complete: true, outcome, distance };
    return { state: updated, result: { hit: true, outcome, distance } };
  }

  /**
   * Walk away from the plate (player intentionally stops).
   */
  abortPitch(state: BaseballState): BaseballSessionResult {
    if (!state.complete) {
      return { hit: false, outcome: 'strike', distance: 0, reason: 'playerAbort' };
    }
    return this.resultForState(state);
  }

  /**
   * Score payout for a carry distance.
   * Formula: max(1, floor(distance × 0.1 × baseballMod)) for any real carry, 0 for a whiff.
   */
  calculateScore(distance: number, baseballMod: number = 1.0): number {
    if (distance <= 0) return 0;
    return Math.max(1, Math.floor(distance * 0.1 * baseballMod));
  }

  private resultForState(state: BaseballState): BaseballSessionResult {
    if (state.outcome === 'strike') {
      return { hit: false, outcome: 'strike', distance: 0, reason: 'swung-miss' };
    }
    if (state.outcome) {
      return { hit: true, outcome: state.outcome, distance: state.distance };
    }
    return { hit: false, outcome: 'strike', distance: 0, reason: 'playerAbort' };
  }
}
