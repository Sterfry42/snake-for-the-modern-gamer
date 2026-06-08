import { describe, it, expect } from 'vitest';
import { getTensionZone, TENSION_ZONES } from '../tensionZones.js';

describe('Tension Zone Partition', () => {
  it('should be a strict mathematical partition covering 0-100 with no gaps', () => {
    const zones = new Set<string>();
    for (let i = 0; i <= 100; i++) {
      const zone = getTensionZone(i);
      zones.add(zone);
    }

    // All 7 zones must be present
    expect(zones).toEqual(
      new Set([
        'critical-low',
        'warning-low',
        'danger-low',
        'safe',
        'danger-high',
        'warning-high',
        'critical-high',
      ]),
    );
  });

  it('should assign correct zones for boundary values', () => {
    // Critical low: 0-7
    for (let i = 0; i <= 7; i++) {
      expect(getTensionZone(i)).toBe('critical-low');
    }

    // Warning low: 8-14
    for (let i = 8; i <= 14; i++) {
      expect(getTensionZone(i)).toBe('warning-low');
    }

    // Danger low: 15-19
    for (let i = 15; i <= 19; i++) {
      expect(getTensionZone(i)).toBe('danger-low');
    }

    // Safe: 20-80
    for (let i = 20; i <= 80; i++) {
      expect(getTensionZone(i)).toBe('safe');
    }

    // Danger high: 81-85
    for (let i = 81; i <= 85; i++) {
      expect(getTensionZone(i)).toBe('danger-high');
    }

    // Warning high: 86-91
    for (let i = 86; i <= 91; i++) {
      expect(getTensionZone(i)).toBe('warning-high');
    }

    // Critical high: 92-100
    for (let i = 92; i <= 100; i++) {
      expect(getTensionZone(i)).toBe('critical-high');
    }
  });

  it('should have no overlapping boundaries', () => {
    // Each value should map to exactly one zone
    let prevZone: string | null = null;
    const seenTransitions: string[] = [];

    for (let i = 0; i <= 100; i++) {
      const zone = getTensionZone(i);
      if (prevZone !== null && zone !== prevZone) {
        // There should be exactly one transition between adjacent zones
        const expectedTransition = i - 1; // The last value of the previous zone
        seenTransitions.push(`${expectedTransition}(${prevZone})→${i}(${zone})`);
      }
      prevZone = zone;
    }

    // Verify exact number of transitions (7 zones = 6 transitions)
    expect(seenTransitions.length).toBe(6);
    expect(seenTransitions).toEqual([
      '7(critical-low)→8(warning-low)',
      '14(warning-low)→15(danger-low)',
      '19(danger-low)→20(safe)',
      '80(safe)→81(danger-high)',
      '85(danger-high)→86(warning-high)',
      '91(warning-high)→92(critical-high)',
    ]);
  });

  it('should match the documented zone ranges', () => {
    expect(TENSION_ZONES.criticalLow).toEqual([0, 7]);
    expect(TENSION_ZONES.warningLow).toEqual([8, 14]);
    expect(TENSION_ZONES.dangerLow).toEqual([15, 19]);
    expect(TENSION_ZONES.safe).toEqual([20, 80]);
    expect(TENSION_ZONES.dangerHigh).toEqual([81, 85]);
    expect(TENSION_ZONES.warningHigh).toEqual([86, 91]);
    expect(TENSION_ZONES.criticalHigh).toEqual([92, 100]);
  });
});
