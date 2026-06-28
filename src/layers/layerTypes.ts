import type { Vector2Like } from '../core/math.js';

export type LayerKind = 'townInterior' | 'cave' | 'building' | 'basement' | 'dungeon' | 'other';

export type LayerTemplateId =
  | 'thievesGuild'
  | 'tavern'
  | 'generalStore'
  | 'butcherShop'
  | 'potionMaker'
  | 'residentialHome';

export type LayerInstanceState = 'available' | 'active' | 'completed' | 'locked';

export type LayerBoundaryMode = 'solidWalls' | 'wrap';

export interface LayerEntrance {
  id: string;
  layerId: string;
  parentRoomId: string;
  x: number;
  y: number;
  kind: LayerKind;
  templateId: LayerTemplateId;
  label?: string;
  locked?: boolean;
  discovered?: boolean;
  returnPosition: Vector2Like;
  tile?: string;
}

export interface LayerZone {
  id: string;
  templateId: LayerTemplateId;
  localCoord: Vector2Like;
  completed?: boolean;
}

export interface LayerInstance {
  id: string;
  kind: LayerKind;
  parentRoomId: string;
  entranceId: string;
  templateId: LayerTemplateId;
  seed: string;
  state: LayerInstanceState;
  spawn: Vector2Like;
  exit: Vector2Like;
  returnPosition: Vector2Like;
  zones: LayerZone[];
  boundaryMode: LayerBoundaryMode;
  townId?: string;
  tags?: string[];
}

export interface LayerRuntimeState {
  layerId: string;
  parentRoomId: string;
  entranceId: string;
  returnPosition: Vector2Like;
  templateId: LayerTemplateId;
  roomStack: string[];
}

export const LAYER_ENTRANCE_TILE = 'Y';
export const LAYER_EXIT_TILE = 'Y';
