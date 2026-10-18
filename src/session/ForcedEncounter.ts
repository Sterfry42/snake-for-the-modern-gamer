import type { WandererEncounter } from '../npcs/encounters.js';
import type { Actor } from '../actors/actorTypes.js';
import type { Vector2Like } from '../core/math.js';

export interface ForcedEncounter {
  token: number;
  encounter: WandererEncounter & { roomId: string; statsNote: string; actorId?: string };
  position: Vector2Like;
  species: Actor['species'];
}
