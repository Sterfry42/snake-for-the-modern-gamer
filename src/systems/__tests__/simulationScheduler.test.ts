import { describe, expect, it } from 'vitest';
import { SimulationScheduler } from '../simulationScheduler.js';

describe('SimulationScheduler', () => {
  it('accumulates elapsed time and steps clocks at their own interval', () => {
    const steps: number[] = [];
    const scheduler = new SimulationScheduler([
      {
        id: 'action',
        intervalMs: 100,
        step: (stepMs) => steps.push(stepMs),
      },
    ]);

    scheduler.update(40, { action: true });
    scheduler.update(60, { action: true });
    scheduler.update(250, { action: true });

    expect(steps).toEqual([100, 100, 100]);
  });

  it('does not accumulate disabled or manual clocks during automatic updates', () => {
    let steps = 0;
    const scheduler = new SimulationScheduler([
      {
        id: 'action',
        intervalMs: 100,
        step: () => {
          steps += 1;
        },
      },
    ]);

    scheduler.update(200, { action: false });
    scheduler.update(200, { action: 'manual' });

    expect(steps).toBe(0);
  });

  it('can step manual clocks directly', () => {
    const steps: number[] = [];
    const scheduler = new SimulationScheduler([
      {
        id: 'action',
        intervalMs: 120,
        step: (stepMs) => steps.push(stepMs),
      },
    ]);

    scheduler.stepManual('action');

    expect(steps).toEqual([120]);
  });

  it('uses updated clock intervals for future steps', () => {
    const steps: number[] = [];
    const scheduler = new SimulationScheduler([
      {
        id: 'action',
        intervalMs: 100,
        step: (stepMs) => steps.push(stepMs),
      },
    ]);

    scheduler.update(90, { action: true });
    scheduler.setClockInterval('action', 50);
    scheduler.update(50, { action: true });

    expect(steps).toEqual([50, 50]);
  });

  it('steps clocks in mode-rule order', () => {
    const steps: string[] = [];
    const scheduler = new SimulationScheduler([
      { id: 'boss', intervalMs: 100, step: () => steps.push('boss') },
      { id: 'action', intervalMs: 100, step: () => steps.push('action') },
      { id: 'actor', intervalMs: 100, step: () => steps.push('actor') },
      { id: 'bullet', intervalMs: 100, step: () => steps.push('bullet') },
      { id: 'hazard', intervalMs: 100, step: () => steps.push('hazard') },
    ]);

    scheduler.update(100, { boss: true, action: true, actor: true, bullet: true, hazard: true });

    expect(steps).toEqual(['boss', 'action', 'actor', 'bullet', 'hazard']);
  });

  it('reports scheduler diagnostics for clamping and per-clock steps', () => {
    let steps = 0;
    const scheduler = new SimulationScheduler([
      {
        id: 'action',
        intervalMs: 100,
        step: () => {
          steps += 1;
        },
      },
      {
        id: 'actor',
        intervalMs: 200,
        step: () => {
          steps += 1;
        },
      },
    ]);

    scheduler.update(300, { action: true, actor: true });

    const diagnostics = scheduler.getDiagnostics();
    expect(steps).toBe(3);
    expect(diagnostics.rawDeltaMs).toBe(300);
    expect(diagnostics.clampedDeltaMs).toBe(250);
    expect(diagnostics.wasDeltaClamped).toBe(true);
    expect(diagnostics.clocks.find((clock) => clock.id === 'action')?.stepsLastUpdate).toBe(2);
    expect(diagnostics.clocks.find((clock) => clock.id === 'actor')?.stepsLastUpdate).toBe(1);
  });
});
