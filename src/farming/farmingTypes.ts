import type { AtmosphereState } from '../world/atmosphereTypes.js';
import type { BiomeId } from '../world/biomes.js';
export type SoilSubstrate = 'loam' | 'rich' | 'dry' | 'ash' | 'poor' | 'artificial';
export type CropStage = 'seeded' | 'sprout' | 'young' | 'mature' | 'ready' | 'withered';
export interface FarmCrop {
  instanceId: string;
  cropId: string;
  plantedBy: string;
  progress: number;
  stage: CropStage;
  health: number;
  regrowCount: number;
  care: number;
  exposure: number;
  unsuitableDays: number;
}
export interface FarmCell {
  annexOwnerId?: string;
  x: number;
  y: number;
  substrate: SoilSubstrate;
  moisture: number;
  fertility: number;
  weeds: number;
  revision: number;
  crop?: FarmCrop;
  magicBed?: boolean;
}
export interface FarmRoom {
  roomId: string;
  biomeId: BiomeId;
  cells: FarmCell[];
  revision: number;
}
export interface FarmIncident {
  id: string;
  roomId: string;
  x: number;
  y: number;
  worldDay: number;
  kind: 'eaten' | 'trampled' | 'stolen' | 'destroyed' | 'structure-damaged';
  actorId?: string;
  cropId: string;
  summary: string;
}
export interface FarmingSaveData {
  schemaVersion: 1;
  elapsedMs: number;
  nextInstance: number;
  pending: Array<{ durationMs: number; climate: AtmosphereState }>;
  rooms: FarmRoom[];
  incidents: FarmIncident[];
  municipalBeds: Array<{ roomId: string; x: number; y: number; farm: boolean; harvest: boolean }>;
  annexOwners: string[];
  actions?: Array<{ playerId: string; nonce: number; result: { ok: boolean; message?: string } }>;
  lastDawn?: number;
  stolenLoot?: Array<{ actorId: string; itemId: string; count: number }>;
}
export interface FarmAction {
  action:
    | 'till'
    | 'plant'
    | 'water'
    | 'harvest'
    | 'clear'
    | 'weed'
    | 'compost'
    | 'inspect'
    | 'refillCan'
    | 'magicBed'
    | 'toggleGate'
    | 'reinforce';
  seedItemId?: string;
  target?: { dx: number; dy: number };
  confirmed?: boolean;
}
