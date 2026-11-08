import type { PlayerId } from '../players/playerTypes.js';

export type GameEvent =
  | { type: 'party.presence'; name: string; status: 'joined' | 'left' | 'reconnected' }
  | { type: 'party.activity'; name: string; status: 'died' | 'returned' }
  | {
      type: 'archaeology.outcome';
      playerId: PlayerId;
      outcome: import('./AuthoritativeArchaeology.js').ArchaeologyOutcome;
    }
  | { type: 'boss.outcome'; playerId: PlayerId; event: import('../systems/boss.js').BossEvent }
  | {
      type: 'gameplay.outcome';
      playerId: PlayerId;
      outcome: import('./GameplayOutcome.js').GameplayOutcome;
    }
  | { type: 'player.revived'; playerId: PlayerId; reason: string }
  | {
      type: 'sound.play';
      playerId?: PlayerId;
      soundId: string;
    }
  | {
      type: 'screen.shake';
      playerId?: PlayerId;
      intensity: number;
      durationMs: number;
    }
  | {
      type: 'toast';
      message: string;
    }
  | {
      type: 'item.picked_up';
      playerId: PlayerId;
      itemId: string;
      label?: string;
    }
  | {
      type: 'quest.completed';
      playerId: PlayerId;
      questId: string;
      label: string;
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
      head?: import('../core/math.js').Vector2Like;
    };
