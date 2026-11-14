import type { RandomGenerator } from '../core/rng.js';
import type { RollercoasterJourney, RollercoasterTheme } from './rollercoasterTypes.js';
import { generateTransitRooms } from './transitShared.js';

/**
 * Rollercoaster ride service.
 *
 * Station placement and destination selection live in the
 * RollercoasterStructureResolver; this service owns the theme palette
 * and the ride journey/speed profile used by the coaster scene.
 */

const THEME_CONFIG: Record<RollercoasterTheme, { name: string; colors: number[] }> = {
  'thunder-ridge': {
    name: 'Thunder Ridge',
    colors: [0x8b4513, 0xa0522d, 0xcd853f, 0xd2691e],
  },
  'neon-nights': {
    name: 'Neon Nights',
    colors: [0xff00ff, 0x00ffff, 0xffff00, 0xff4400],
  },
  'jungle-jolt': {
    name: 'Jungle Jolt',
    colors: [0x228b22, 0x32cd32, 0x8b8000, 0x6b8e23],
  },
  'arctic-avalanche': {
    name: 'Arctic Avalanche',
    colors: [0x87ceeb, 0xb0e0e6, 0xadd8e6, 0xe0ffff],
  },
  'volcanic-veer': {
    name: 'Volcanic Veer',
    colors: [0xff4500, 0xff6347, 0xffd700, 0xff8c00],
  },
  'cosmic-corkscrew': {
    name: 'Cosmic Corkscrew',
    colors: [0x9370db, 0xba55d3, 0x7b68ee, 0x6a5acd],
  },
};

/** Get the speed profile for a coaster ride. */
export function getSpeedProfile(theme: RollercoasterTheme): {
  climbSpeed: number;
  peakSpeed: number;
  brakeSpeed: number;
  totalDuration: number;
} {
  const profiles: Record<
    RollercoasterTheme,
    { climbSpeed: number; peakSpeed: number; brakeSpeed: number; totalDuration: number }
  > = {
    'thunder-ridge': { climbSpeed: 0.3, peakSpeed: 1.0, brakeSpeed: 0.2, totalDuration: 5000 },
    'neon-nights': { climbSpeed: 0.4, peakSpeed: 1.2, brakeSpeed: 0.15, totalDuration: 4500 },
    'jungle-jolt': { climbSpeed: 0.25, peakSpeed: 0.9, brakeSpeed: 0.25, totalDuration: 5500 },
    'arctic-avalanche': { climbSpeed: 0.35, peakSpeed: 1.1, brakeSpeed: 0.3, totalDuration: 4800 },
    'volcanic-veer': { climbSpeed: 0.2, peakSpeed: 1.3, brakeSpeed: 0.1, totalDuration: 4000 },
    'cosmic-corkscrew': { climbSpeed: 0.5, peakSpeed: 1.4, brakeSpeed: 0.2, totalDuration: 5200 },
  };
  return profiles[theme];
}

/** Generate a rollercoaster journey between two rooms. */
export function createRollercoasterJourney(
  stationRoomId: string,
  stationEntranceX: number,
  stationEntranceY: number,
  destinationRoomId: string,
  destinationExitX: number,
  destinationExitY: number,
  theme: RollercoasterTheme,
  rng: RandomGenerator,
): RollercoasterJourney {
  const transitRooms = generateTransitRooms(stationRoomId, destinationRoomId, rng);
  const profile = getSpeedProfile(theme);

  return {
    phase: 'boarding',
    stationRoomId,
    stationEntranceX,
    stationEntranceY,
    destinationRoomId,
    destinationExitX,
    destinationExitY,
    transitRooms,
    transitProgress: 0,
    startedAtMs: Date.now(),
    durationMs: profile.totalDuration,
    maxHeightReached: 0,
    turnsCompleted: 0,
  };
}

export { THEME_CONFIG };
