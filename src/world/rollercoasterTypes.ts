/** Track segment types for rollercoaster station decorations. */
export type RollercoasterTrackSegment =
  | { type: 'lift-hill'; x: number; y: number; direction: 'up' | 'down' }
  | { type: 'loop'; x: number; y: number; size: number }
  | { type: 'straight'; x: number; y: number; length: number; direction: 'horizontal' | 'vertical' }
  | { type: 'curve'; x: number; y: number; radius: number; arc: number }
  | { type: 'drop'; x: number; y: number; height: number }
  | { type: 'bridge'; x: number; y: number; length: number }
  | { type: 'station-platform'; x: number; y: number };

/** A rollercoaster station stamped into a room. */
export interface RollercoasterStation {
  /** Grid position of the station entrance tile. */
  entranceX: number;
  entranceY: number;
  /** The station's internal ID (seeded from roomId). */
  stationId: string;
  /** Available destinations at this station. */
  destinations: RollercoasterDestination[];
  /** Whether this station has been used this run. */
  used: boolean;
  /** Track decorations: lift hills, loops, drops, bridges. */
  trackSegments: RollercoasterTrackSegment[];
  /** Station name (e.g., "Thunder Ridge Coaster"). */
  stationName: string;
  /** Coaster theme flavor. */
  theme: RollercoasterTheme;
}

/** Coaster theme that determines visual style and naming. */
export type RollercoasterTheme =
  | 'thunder-ridge' // Mountain/rock theme
  | 'neon-nights' // Cyberpunk/neon theme
  | 'jungle-jolt' // Jungle/temple theme
  | 'arctic-avalanche' // Ice/snow theme
  | 'volcanic-veer' // Lava/volcano theme
  | 'cosmic-corkscrew'; // Space/stars theme;

/** A reachable destination from a rollercoaster station. */
export interface RollercoasterDestination {
  /** Room ID of the destination room. */
  roomId: string;
  /** Grid position where the snake exits the coaster. */
  exitX: number;
  exitY: number;
  /** Flavor text shown on arrival. */
  arrivalFlavor: string;
  /** Display name for the destination. */
  displayName: string;
  /** Chance weight for random selection (higher = more likely). */
  weight: number;
  /** Optional condition for destination availability. */
  condition?: 'first-visit' | 'any';
  /** Destination room coordinates as a display string. */
  coordinates?: string;
}

/** Phases of a rollercoaster journey. */
export type RollercoasterJourneyPhase =
  | 'idle'
  | 'boarding'
  | 'climbing'
  | 'launching'
  | 'in-transit'
  | 'arriving'
  | 'exiting';

/** Runtime state for an active rollercoaster journey. */
export interface RollercoasterJourney {
  phase: RollercoasterJourneyPhase;
  stationRoomId: string;
  stationEntranceX: number;
  stationEntranceY: number;
  destinationRoomId: string;
  destinationExitX: number;
  destinationExitY: number;
  transitRooms: string[];
  transitProgress: number;
  startedAtMs: number;
  durationMs: number;
  /** Coaster-specific: maximum height reached during the ride. */
  maxHeightReached: number;
  /** Coaster-specific: number of loops/turns. */
  turnsCompleted: number;
}

/** A destination choice presented to the player. */
export interface RollercoasterDestinationChoice {
  roomId: string;
  displayName: string;
  arrivalFlavor: string;
  exitX: number;
  exitY: number;
  weight: number;
  coordinates?: string;
}

/** Coaster car visual properties. */
export interface RollercoasterCarVisual {
  /** Car body color. */
  bodyColor: number;
  /** Car stripe color. */
  stripeColor: number;
  /** Wheel color. */
  wheelColor: number;
  /** Seat color. */
  seatColor: number;
}

/** Coaster ride speed profile (time -> speed multiplier). */
export interface SpeedProfile {
  /** Climbing phase speed (slow, steady). */
  climbSpeed: number;
  /** Peak speed after the drop. */
  peakSpeed: number;
  /** Braking speed at the end. */
  brakeSpeed: number;
  /** Total ride duration in ms. */
  totalDuration: number;
}
