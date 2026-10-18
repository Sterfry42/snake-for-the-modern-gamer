export type ClockRule = boolean | 'manual';
type ClockRules = Readonly<Record<string, ClockRule>>;

export interface SimulationClock {
  id: string;
  intervalMs: number;
  maxStepsPerUpdate?: number;
  step: (stepMs: number) => void;
}

interface RuntimeClock extends SimulationClock {
  accumulatorMs: number;
  droppedStepsLastUpdate: number;
  stepsLastUpdate: number;
}

export interface ClockDiagnostics {
  id: string;
  intervalMs: number;
  accumulatorMs: number;
  droppedStepsLastUpdate: number;
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
  private diagnostics: Omit<SchedulerDiagnostics, 'clocks'> = {
    rawDeltaMs: 0,
    clampedDeltaMs: 0,
    wasDeltaClamped: false,
  };

  constructor(clocks: readonly SimulationClock[]) {
    for (const clock of clocks) {
      this.addClock(clock);
    }
  }

  addClock(clock: SimulationClock): void {
    this.clocks.set(clock.id, {
      ...clock,
      maxStepsPerUpdate: Math.max(1, Math.floor(clock.maxStepsPerUpdate ?? 8)),
      accumulatorMs: 0,
      droppedStepsLastUpdate: 0,
      stepsLastUpdate: 0,
    });
  }

  update(deltaMs: number, rules: ClockRules | (() => ClockRules)): void {
    const currentRules = () => (typeof rules === 'function' ? rules() : rules);
    const clampedDelta = Math.max(0, Math.min(deltaMs, 250));
    for (const clock of this.clocks.values()) {
      clock.droppedStepsLastUpdate = 0;
      clock.stepsLastUpdate = 0;
    }
    for (const id of Object.keys(currentRules())) {
      if (currentRules()[id] !== true) {
        continue;
      }
      this.advanceClock(id, clampedDelta, () => currentRules()[id] === true);
    }
    this.diagnostics = {
      rawDeltaMs: deltaMs,
      clampedDeltaMs: clampedDelta,
      wasDeltaClamped: clampedDelta !== deltaMs,
    };
  }

  setClockInterval(id: string, intervalMs: number): void {
    const clock = this.clocks.get(id);
    if (!clock) {
      return;
    }
    const nextIntervalMs = Math.max(1, intervalMs);
    if (clock.intervalMs === nextIntervalMs) {
      return;
    }
    clock.intervalMs = nextIntervalMs;
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
    clock.droppedStepsLastUpdate = 0;
    clock.stepsLastUpdate = 1;
    clock.accumulatorMs = 0;
  }

  getDiagnostics(): SchedulerDiagnostics {
    return {
      ...this.diagnostics,
      clocks: Array.from(this.clocks.values()).map((clock) => ({
        id: clock.id,
        intervalMs: clock.intervalMs,
        accumulatorMs: clock.accumulatorMs,
        droppedStepsLastUpdate: clock.droppedStepsLastUpdate,
        stepsLastUpdate: clock.stepsLastUpdate,
      })),
    };
  }

  private advanceClock(id: string, deltaMs: number, enabled: () => boolean): void {
    const clock = this.clocks.get(id);
    if (!clock) {
      return;
    }
    clock.accumulatorMs += deltaMs;
    const maxSteps = Math.max(1, Math.floor(clock.maxStepsPerUpdate ?? 8));
    while (clock.accumulatorMs >= clock.intervalMs && clock.stepsLastUpdate < maxSteps) {
      if (!enabled()) {
        // A preceding step opened a menu. Do not bank catch-up work for resume.
        clock.accumulatorMs %= clock.intervalMs;
        return;
      }
      const stepIntervalMs = clock.intervalMs;
      clock.step(stepIntervalMs);
      clock.accumulatorMs -= stepIntervalMs;
      clock.stepsLastUpdate += 1;
    }
    if (clock.accumulatorMs >= clock.intervalMs) {
      const droppedSteps = Math.floor(clock.accumulatorMs / clock.intervalMs);
      clock.droppedStepsLastUpdate += droppedSteps;
      clock.accumulatorMs %= clock.intervalMs;
    }
  }
}
