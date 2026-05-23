export type ClockRule = boolean | 'manual';

export interface SimulationClock {
  id: string;
  intervalMs: number;
  step: (stepMs: number) => void;
}

interface RuntimeClock extends SimulationClock {
  accumulatorMs: number;
  stepsLastUpdate: number;
}

export interface ClockDiagnostics {
  id: string;
  intervalMs: number;
  accumulatorMs: number;
  stepsLastUpdate: number;
}

export interface SchedulerDiagnostics {
  rawDeltaMs: number;
  clampedDeltaMs: number;
  wasDeltaClamped: boolean;
  clocks: ClockDiagnostics[];
}

export class SimulationScheduler {
  private readonly clocks = new Map<string, RuntimeClock>();
  private diagnostics: SchedulerDiagnostics = {
    rawDeltaMs: 0,
    clampedDeltaMs: 0,
    wasDeltaClamped: false,
    clocks: [],
  };

  constructor(clocks: readonly SimulationClock[]) {
    for (const clock of clocks) {
      this.addClock(clock);
    }
  }

  addClock(clock: SimulationClock): void {
    this.clocks.set(clock.id, { ...clock, accumulatorMs: 0, stepsLastUpdate: 0 });
  }

  update(deltaMs: number, rules: Readonly<Record<string, ClockRule>>): void {
    const clampedDelta = Math.max(0, Math.min(deltaMs, 250));
    for (const clock of this.clocks.values()) {
      clock.stepsLastUpdate = 0;
    }
    for (const [id, rule] of Object.entries(rules)) {
      if (rule !== true) {
        continue;
      }
      this.advanceClock(id, clampedDelta);
    }
    this.diagnostics = {
      rawDeltaMs: deltaMs,
      clampedDeltaMs: clampedDelta,
      wasDeltaClamped: clampedDelta !== deltaMs,
      clocks: Array.from(this.clocks.values()).map((clock) => ({
        id: clock.id,
        intervalMs: clock.intervalMs,
        accumulatorMs: clock.accumulatorMs,
        stepsLastUpdate: clock.stepsLastUpdate,
      })),
    };
  }

  setClockInterval(id: string, intervalMs: number): void {
    const clock = this.clocks.get(id);
    if (!clock) {
      return;
    }
    clock.intervalMs = Math.max(1, intervalMs);
    clock.accumulatorMs = Math.min(clock.accumulatorMs, clock.intervalMs);
  }

  resetClock(id: string): void {
    const clock = this.clocks.get(id);
    if (clock) {
      clock.accumulatorMs = 0;
    }
  }

  stepManual(id: string): void {
    const clock = this.clocks.get(id);
    if (!clock) {
      return;
    }
    clock.step(clock.intervalMs);
    clock.stepsLastUpdate = 1;
    clock.accumulatorMs = 0;
  }

  getDiagnostics(): SchedulerDiagnostics {
    return {
      ...this.diagnostics,
      clocks: this.diagnostics.clocks.map((clock) => ({ ...clock })),
    };
  }

  private advanceClock(id: string, deltaMs: number): void {
    const clock = this.clocks.get(id);
    if (!clock) {
      return;
    }
    clock.accumulatorMs += deltaMs;
    while (clock.accumulatorMs >= clock.intervalMs) {
      clock.step(clock.intervalMs);
      clock.accumulatorMs -= clock.intervalMs;
      clock.stepsLastUpdate += 1;
    }
  }
}
