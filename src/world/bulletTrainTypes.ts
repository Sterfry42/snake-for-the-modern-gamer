/** Decoration types for a bullet train station platform. */
export type BulletTrainDecoration =
  | { type: 'lantern'; x: number; y: number; color: number }
  | { type: 'ticket-booth'; x: number; y: number }
  | { type: 'bench'; x: number; y: number; facing: 'north' | 'south' }
  | { type: 'sign'; x: number; y: number; text: string }
  | { type: 'platform-edge'; x: number; y: number };

/** A reachable destination room from a bullet train station. */
export interface BulletTrainDestination {
  /** Room ID of the destination room in Jade Peak Province. */
  roomId: string;
  /** Grid position where the snake exits the train. */
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
  /** Destination room coordinates as a display string (e.g., "(-3, 2, 0)"). */
  coordinates?: string;
}

/** A bullet train station stamped into a Jade Peak room. */
export interface BulletTrainStation {
  /** Grid position of the station entrance tile. */
  entranceX: number;
  entranceY: number;
  /** The station's internal ID (seeded from roomId). */
  stationId: string;
  /** Available destinations at this station. */
  destinations: BulletTrainDestination[];
  /** Whether this station has been used this run. */
  used: boolean;
  /** Platform decorations: lanterns, ticket booth, bench. */
  decorations: BulletTrainDecoration[];
}

/** Phases of a bullet train journey. */
export type BulletTrainJourneyPhase =
  | 'idle'
  | 'boarding'
  | 'departing'
  | 'in-transit'
  | 'arriving'
  | 'exiting';

/** Runtime state for an active bullet train journey. */
export interface BulletTrainJourney {
  phase: BulletTrainJourneyPhase;
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
}

/** A destination choice presented to the player. */
export interface BulletTrainDestinationChoice {
  roomId: string;
  displayName: string;
  arrivalFlavor: string;
  exitX: number;
  exitY: number;
  weight: number;
}
