import type { AnimalInstance } from '../animals/types.js';
import type { Actor } from '../actors/actorTypes.js';
import type { AppleSnapshot } from '../apples/types.js';
import type { Vector2Like } from '../core/math.js';
import type { BombInstance, FootballInstance, QuestInteraction } from '../game/snakeGame.js';
import type { PlayerId } from '../players/playerTypes.js';
import type { Boss } from '../systems/boss.js';
import type { BulletInstance, EnemyInstance } from '../systems/enemies.js';
import type { RoomSnapshot } from '../world/types.js';
import type { ResolvedAtmosphereView } from '../world/atmosphereTypes.js';
import type { GameInteractionView } from './GameInteraction.js';
import type { SceneClientState } from './SceneClientState.js';
import type { PlayerInteraction } from './SceneActionCommand.js';

export interface GameSnapshot {
  tick: number;
  localPlayerId: PlayerId;
  viewport: ViewportSnapshot;
  players: Record<PlayerId, PlayerSnapshot>;
  ui: UiSnapshot;
  minigame?: import('./MinigameSnapshot.js').MinigameSnapshot | null;
  /** Player-specific synchronous selectors for the normal scene's menus and HUD. */
  clientState?: SceneClientState;
  persistence?: { slotId: string; checkpoint: import('../game/saveTypes.js').GameSaveData | null };
  connections?: Record<string, ConnectionPresence>;
  presentation?: {
    characterMode: 'snake' | 'raccoon';
    atmosphere: ResolvedAtmosphereView;
  };
}

export interface ConnectionPresence {
  connectionId: string;
  playerId: PlayerId;
  displayName: string;
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
  layerEntrances?: unknown[];
  apples?: AppleSnapshot | null;
  enemies?: readonly EnemyInstance[];
  followers?: readonly EnemyInstance[];
  bosses?: readonly Boss[];
  bullets?: readonly BulletInstance[];
  npcs?: readonly Actor[];
  pickups?: unknown[];
  animals?: readonly AnimalInstance[];
  footballs?: readonly FootballInstance[];
  bombs?: readonly BombInstance[];
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
  playerInteraction?: PlayerInteraction;
  interaction?: GameInteractionView | null;
  paused?: boolean;
  messages?: string[];
  activeChoice?: QuestInteraction | null;
  inventory?: Record<string, number>;
  activeQuest?: unknown;
  health?: {
    current: number;
    max: number;
  };
}
