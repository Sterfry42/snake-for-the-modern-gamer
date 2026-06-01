import type { AnimalInstance } from '../animals/types.js';
import type { AppleSnapshot } from '../apples/types.js';
import type { Vector2Like } from '../core/math.js';
import type { FootballInstance } from '../game/snakeGame.js';
import type { PlayerId } from '../players/playerTypes.js';
import type { BulletInstance, EnemyInstance } from '../systems/enemies.js';
import type { RoomSnapshot } from '../world/types.js';

export interface GameSnapshot {
  tick: number;
  localPlayerId: PlayerId;
  viewport: ViewportSnapshot;
  players: Record<PlayerId, PlayerSnapshot>;
  ui: UiSnapshot;
}

export interface ViewportSnapshot {
  centerRoomId: string;
  rooms: Record<string, ClientRoomSnapshot>;
}

export interface ClientRoomSnapshot {
  id: string;
  /**
   * Compatibility bridge for the current Phaser renderer. New client code should
   * prefer the explicit DTO fields below while the room snapshot is being
   * disentangled from browser rendering.
   */
  room: RoomSnapshot;
  layout: string[];
  biomeId?: string;
  biomeTitle?: string;
  backgroundColor?: number;
  wallColor?: number;
  wallOutlineColor?: number;
  portals?: unknown[];
  structures?: unknown[];
  caveEntrances?: unknown[];
  apples?: AppleSnapshot | null;
  enemies?: readonly EnemyInstance[];
  followers?: readonly EnemyInstance[];
  bullets?: readonly BulletInstance[];
  npcs?: unknown[];
  pickups?: unknown[];
  animals?: readonly AnimalInstance[];
  footballs?: readonly FootballInstance[];
}

export interface PlayerSnapshot {
  id: PlayerId;
  name: string;
  roomId: string;
  body: Vector2Like[];
  direction: Vector2Like;
  score: number;
  alive: boolean;
  isLocal: boolean;
}

export interface UiSnapshot {
  paused?: boolean;
  messages?: string[];
  activeChoice?: unknown;
  activeQuest?: unknown;
  health?: {
    current: number;
    max: number;
  };
}
