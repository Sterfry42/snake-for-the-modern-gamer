import type { GridConfig, WorldConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import type { WorldGenerationIdentity } from '../world/generation/worldGenerationIdentity.js';
import type { RoomSnapshot } from '../world/types.js';

export type WorldJob =
  | {
      kind: 'room';
      id: string;
      grid: GridConfig;
      config: WorldConfig;
      identity: WorldGenerationIdentity;
      rngState: number;
    }
  | {
      kind: 'path';
      start: Vector2Like;
      goal: Vector2Like;
      cols: number;
      rows: number;
      walkable: Uint8Array;
    };

export type WorldResult =
  | { kind: 'room'; room: RoomSnapshot; rngState: number }
  | { kind: 'path'; directions: Vector2Like[] | null };

export interface WorldWorkReport {
  pending: number;
  submittedPaths: number;
  submittedRooms: number;
  completed: number;
  failed: number;
  maximumRoundTripMs: number;
}

export interface WorldWork {
  report(reset: boolean): WorldWorkReport;
  available(): boolean;
  canAccept(): boolean;
  request(job: WorldJob, done: (result: WorldResult | null) => void): boolean;
}
