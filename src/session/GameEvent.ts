import type { PlayerId } from '../players/playerTypes.js';

export type GameEvent =
  | {
      type: 'sound.play';
      soundId: string;
    }
  | {
      type: 'screen.shake';
      intensity: number;
      durationMs: number;
    }
  | {
      type: 'toast';
      message: string;
    }
  | {
      type: 'player.died';
      playerId: PlayerId;
      reason: string;
    }
  | {
      type: 'room.changed';
      playerId: PlayerId;
      fromRoomId: string;
      toRoomId: string;
    };
