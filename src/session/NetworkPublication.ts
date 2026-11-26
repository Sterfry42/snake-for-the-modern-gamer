import type { CommandResult } from './ClientCommand.js';
import type { MultiplayerCommandTrace } from './MultiplayerProfiler.js';
import type { Vector2Like } from '../core/math.js';
import type { PlayerInteraction } from './SceneActionCommand.js';

export interface NetworkPublication {
  connectionId: string;
  playerId: string;
  roomId: string;
  epoch: number;
  movementRevision?: number;
  eventSequence: number;
  encoded?: {
    text: string;
    encodeMs: number;
    serializationMs: number;
    categoryBytes?: Record<string, number>;
  };
}

export interface NetworkCommandResult {
  result: CommandResult;
  publication?: NetworkPublication;
  trace?: MultiplayerCommandTrace;
  rejection?: {
    roomId: string;
    head?: Vector2Like;
    movementRevision?: number;
    mode?: PlayerInteraction;
    menuId?: number;
  };
}
