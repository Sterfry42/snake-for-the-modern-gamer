import type { TensionZones } from './types.js';

/** The canonical tension zone partition — a strict mathematical partition of [0..100] */
export const TENSION_ZONES: TensionZones = {
  criticalLow: [0, 7],
  warningLow: [8, 14],
  dangerLow: [15, 19],
  safe: [20, 80],
  dangerHigh: [81, 85],
  warningHigh: [86, 91],
  criticalHigh: [92, 100],
};

/**
 * Determine which tension zone a value falls into.
 *
 * Partition:
 *   critical-low:   0-7
 *   warning-low:    8-14
 *   danger-low:     15-19
 *   safe:           20-80
 *   danger-high:    81-85
 *   warning-high:   86-91
 *   critical-high:  92-100
 */
export function getTensionZone(value: number): string {
  if (value < 8) return 'critical-low';
  if (value < 15) return 'warning-low';
  if (value < 20) return 'danger-low';
  if (value <= 80) return 'safe';
  if (value < 86) return 'danger-high';
  if (value < 92) return 'warning-high';
  return 'critical-high';
}

/**
 * Escape chance per tick by tension zone.
 *
 * Safe (20-80):     0
 * Warning (8-14, 86-91): 0.02 * fish.fightAggression
 * Danger (15-19, 81-85): 0.05 * fish.fightAggression, lineBreak 0.01
 * Critical (0-7, 92-100): lineBreak 0.15
 */
export function getEscapeChance(zone: string, fightAggression: number): number {
  switch (zone) {
    case 'safe':
      return 0;
    case 'warning-low':
    case 'warning-high':
      return 0.02 * fightAggression;
    case 'danger-low':
    case 'danger-high':
      return 0.05 * fightAggression;
    case 'critical-low':
    case 'critical-high':
      return 1; // handled separately
    default:
      return 0;
  }
}

/**
 * Line break chance per tick by tension zone.
 *
 * Safe (20-80):     0
 * Warning (8-14, 86-91): 0
 * Danger (15-19, 81-85): 0.01
 * Critical (0-7, 92-100): 0.15
 */
export function getLineBreakChance(zone: string): number {
  switch (zone) {
    case 'safe':
    case 'warning-low':
    case 'warning-high':
      return 0;
    case 'danger-low':
    case 'danger-high':
      return 0.01;
    case 'critical-low':
    case 'critical-high':
      return 0.15;
    default:
      return 0;
  }
}

/**
 * Calculate tension change based on player input direction.
 *
 * When the struggle direction is right (1), pulling left decreases tension.
 * When the struggle direction is left (-1), pulling right decreases tension.
 * Pulling in the wrong direction increases tension.
 */
export function calculateTensionChange(
  currentTension: number,
  pullDirection: number,
  struggleDirection: number,
  difficulty: number,
): number {
  // Player pulled against the struggle — tension decreases
  if (pullDirection !== struggleDirection) {
    const decrease = difficulty * 1.2;
    return Math.max(0, currentTension - decrease);
  }
  // Player pulled with the struggle — tension increases
  const increase = difficulty * 1.8;
  return Math.min(100, currentTension + increase);
}

/**
 * Calculate progress gain per tick.
 * Progress increases faster in the safe zone.
 */
export function getProgressGain(zone: string, difficulty: number): number {
  switch (zone) {
    case 'safe':
      return 0.8 + (10 - difficulty) * 0.1;
    case 'warning-low':
    case 'warning-high':
      return 0.4 + (10 - difficulty) * 0.05;
    case 'danger-low':
    case 'danger-high':
      return 0.2;
    case 'critical-low':
    case 'critical-high':
      return 0.05;
    default:
      return 0;
  }
}
