import type { PlayerId } from '../players/playerTypes.js';

export interface GameEventTiming {
  generatedAt: number;
  correlationId?: string;
}

export type GameEvent =
  | { type: 'party.presence'; name: string; status: 'joined' | 'left' | 'reconnected' }
  | { type: 'party.activity'; name: string; status: 'died' | 'returned' }
  | {
      type: 'archaeology.outcome';
      playerId: PlayerId;
      outcome: import('./AuthoritativeArchaeology.js').ArchaeologyOutcome;
    }
  | {
      type: 'achievement.unlocked';
      playerId: PlayerId;
      unlocks: import('../achievements/achievementTypes.js').AchievementUnlockResult[];
    }
  | { type: 'boss.outcome'; playerId: PlayerId; event: import('../systems/boss.js').BossEvent }
  | {
      type: 'gameplay.outcome';
      playerId: PlayerId;
      outcome: import('./GameplayOutcome.js').GameplayOutcome;
    }
  | {
      type: 'gameplay.presentation';
      playerId: PlayerId;
      roomId: string;
      feedback: import('./GameplayOutcome.js').GameplayFeedback[];
    }
  | {
      type: 'apple.bite';
      playerId: PlayerId;
      epoch: number;
      revision: number;
      spawnId: number;
      committedAt: number;
      typeId?: string;
      streak?: number;
      violenceLevel?: number;
      roomId: string;
      position: import('../core/math.js').Vector2Like;
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

/** These cues use only committed data carried in the event. Menus, pickups and
 * outcome bundles follow the projection that their handlers can read. */
export function isImmediateGameEvent(event: GameEvent): boolean {
  return (
    event.type === 'apple.bite' ||
    event.type === 'sound.play' ||
    event.type === 'screen.shake' ||
    event.type === 'gameplay.presentation'
  );
}
