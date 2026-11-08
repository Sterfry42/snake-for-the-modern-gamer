import type { Vector2Like } from '../core/math.js';
import type { SpecialStatsState } from '../stats/specialTypes.js';
import type { LevelProgressionState } from '../stats/levelProgression.js';
import type { SnakeDirectionQueue } from '../systems/snakeDirectionQueue.js';
import type { PlayerCosmetics } from './playerTypes.js';
import type { PlayerLifecycle } from './playerLifecycle.js';
import type { RoomSnapshot } from '../world/types.js';

export interface PlayerCheckpoint {
  id: string;
  name: string;
  alive: boolean;
  roomId: string;
  body: Vector2Like[];
  directionQueue: SnakeDirectionQueue;
  score: number;
  flags: Record<string, unknown>;
  inventory: Record<string, number>;
  equipment: Record<string, string>;
  activeQuests: string[];
  completedQuests: string[];
  acceptedQuests: string[];
  special: SpecialStatsState;
  level: LevelProgressionState;
  visitedRooms: string[];
  lifecycle?: PlayerLifecycle;
  cosmetics?: PlayerCosmetics;
}

/** Private disk-only ownership and characters, atomically stored with their world. */
export interface HostedCheckpoint {
  schemaVersion: 1;
  primaryClaimed: boolean;
  resumeDigests: Record<string, string>;
  players: PlayerCheckpoint[];
  rooms: RoomSnapshot[];
}
