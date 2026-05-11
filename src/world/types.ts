import type { Vector2Like } from '../core/math.js';
import type { NpcProfile } from '../npcs/profiles.js';
import type { BiomeId } from './biomes.js';

export interface PortalConfig {
  x: number;
  y: number;
  destRoomId: string;
  destX: number;
  destY: number;
}

export interface RoomSnapshot {
  id: string;
  layout: string[];
  archetypeId?: string;
  portals: PortalConfig[];
  apple?: Vector2Like;
  treasure?: Vector2Like;
  powerup?: { x: number; y: number; kind: 'phase' | 'smite' | 'gun' };
  questGiver?: NpcProfile & { x: number; y: number };
  village?: {
    name: string;
    center: Vector2Like;
    lanterns: Vector2Like[];
    residents: Array<NpcProfile & { x: number; y: number }>;
    shopkeeper: NpcProfile & { x: number; y: number };
  };
  goblinCamp?: {
    id: string;
    name: string;
    center: Vector2Like;
    tents: Vector2Like[];
    fires: Vector2Like[];
    guards: Array<NpcProfile & { x: number; y: number }>;
    shopkeeper: NpcProfile & { x: number; y: number };
  };
  temperatureReliefs?: Array<{ x: number; y: number; kind: 'warm' | 'cool' }>;
  biomeId: BiomeId;
  biomeTitle: string;
  backgroundColor: number;
  wallColor: number;
  wallOutlineColor: number;
}
