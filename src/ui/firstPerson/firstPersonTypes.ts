import type { Vector2Like } from '../../core/math.js';
import type { ClientRoomSnapshot } from '../../session/GameSnapshot.js';

export interface FirstPersonCamera {
  x: number;
  y: number;
  yaw: number;
}

export interface FirstPersonMaterial {
  id: string;
  occludesVision: boolean;
  wallHeight: number;
  wallColor: number;
}

export interface FirstPersonCell {
  x: number;
  y: number;
  tile: string | undefined;
  material: FirstPersonMaterial;
}

export interface FirstPersonBillboard {
  id: string;
  kind: 'apple' | 'enemy' | 'snake-body' | 'npc' | 'animal' | 'prop';
  x: number;
  y: number;
  width: number;
  height: number;
  anchorY: number;
  color: number;
  textureKey?: string;
  roomId?: string;
  facing?: Vector2Like;
}

export interface FirstPersonRoomPlacement {
  roomId: string;
  room: ClientRoomSnapshot;
  offsetX: number;
  offsetY: number;
}

export interface FirstPersonWorldView {
  readonly width: number;
  readonly height: number;
  readonly roomId: string;
  readonly skyColor: number;
  readonly floorColor: number;
  readonly fogColor: number;
  getCell(x: number, y: number): FirstPersonCell | null;
  getBillboards(): readonly FirstPersonBillboard[];
}

export interface FirstPersonRayHit {
  hit: boolean;
  x: number;
  y: number;
  mapX: number;
  mapY: number;
  distance: number;
  side: 'x' | 'y';
  material: FirstPersonMaterial | null;
}

export interface FirstPersonProjectedBillboard {
  billboard: FirstPersonBillboard;
  distance: number;
  screenX: number;
  width: number;
  height: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
}
