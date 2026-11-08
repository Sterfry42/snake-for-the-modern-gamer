import type { ClientCommand } from './ClientCommand.js';

export const TURN_INPUT_GRACE_MS = 80;
export const TURN_CLOCK_UNCERTAINTY_MS = 40;
export const TURN_COMMIT_GRACE_MS = TURN_INPUT_GRACE_MS + TURN_CLOCK_UNCERTAINTY_MS;
type Turn = Extract<ClientCommand, { type: 'setDirection' }>;
type ScheduledTurn = Turn & {
  inputSequence: number;
  intendedRevision: number;
  estimatedServerTimeMs: number;
};

/** Inputs may change an uncommitted step. Committed world outcomes never rewind. */
export class MovementTurnAuthority {
  private readonly turns: ScheduledTurn[] = [];
  private receivedSequence = 0;
  private readonly intervals: Array<{ at: number; interval: number }> = [];

  observeInterval(interval: number, at: number): void {
    if (this.intervals[this.intervals.length - 1]?.interval === interval) return;
    this.intervals.push({ at, interval });
    if (this.intervals.length > 32) this.intervals.shift();
  }

  private intervalAt(at: number, fallback: number): number {
    let interval = this.intervals[0]?.interval ?? fallback;
    for (const sample of this.intervals) {
      if (sample.at > at) break;
      interval = sample.interval;
    }
    return interval;
  }

  submit(
    turn: Turn,
    revision: number,
    phase: number,
    interval: number,
    now: number,
  ): string | null {
    if (
      !turn.inputSequence ||
      turn.intendedRevision === undefined ||
      turn.estimatedServerTimeMs === undefined
    )
      return 'missing-turn-step';
    if (turn.inputSequence <= this.receivedSequence) return 'duplicate-turn';
    this.receivedSequence = turn.inputSequence;
    if (turn.intendedRevision <= revision) return 'step-already-committed';
    const inputInterval = this.intervalAt(turn.estimatedServerTimeMs, interval);
    if (
      turn.intendedRevision >
      revision +
        Math.floor(Math.max(0, phase + TURN_COMMIT_GRACE_MS) / Math.min(interval, inputInterval)) +
        2
    )
      return 'step-too-far-ahead';
    const age = now - turn.estimatedServerTimeMs;
    if (age < -TURN_CLOCK_UNCERTAINTY_MS || age > TURN_INPUT_GRACE_MS + TURN_CLOCK_UNCERTAINTY_MS)
      return 'input-outside-grace';
    const phaseAtInput = phase + TURN_COMMIT_GRACE_MS - age;
    if (
      turn.intendedRevision <
      revision + Math.floor(Math.max(0, phaseAtInput - 20) / inputInterval) + 1
    )
      return 'input-after-step-boundary';
    const scheduled: ScheduledTurn = {
      ...structuredClone(turn),
      inputSequence: turn.inputSequence,
      intendedRevision: turn.intendedRevision,
      estimatedServerTimeMs: turn.estimatedServerTimeMs,
    };
    if (this.turns.some((input) => input.intendedRevision > scheduled.intendedRevision))
      return 'unordered-turn';
    const replaced = this.turns.findIndex(
      (input) => input.intendedRevision === turn.intendedRevision,
    );
    if (replaced >= 0) this.turns[replaced] = scheduled;
    else {
      if (this.turns.length >= 64) return 'turn-buffer-full';
      this.turns.push(scheduled);
    }
    return null;
  }

  take(revision: number): ScheduledTurn[] {
    const due = this.turns.filter((turn) => turn.intendedRevision === revision);
    this.turns.splice(
      0,
      this.turns.length,
      ...this.turns.filter((turn) => turn.intendedRevision > revision),
    );
    return due;
  }

  clear(): void {
    this.turns.length = 0;
  }
}
