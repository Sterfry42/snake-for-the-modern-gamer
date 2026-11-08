import type { Vector2Like } from '../core/math.js';
import type { RoomSnapshot } from '../world/types.js';

/** Movement owns path legality; agriculture offers bounded room-local targets and contact effects. */
export interface FarmInteractions {
  isSolid(room: RoomSnapshot, x: number, y: number): boolean;
  target(roomId: string, position: Vector2Like, kind: 'graze' | 'steal'): Vector2Like | undefined;
  contact(
    roomId: string,
    actorId: string,
    position: Vector2Like,
    kind: 'graze' | 'trample' | 'steal' | 'destroy',
  ): void;
  carrying?(actorId: string): boolean;
  departed?(roomId: string, actorId: string, destination: string, position: Vector2Like): void;
}
