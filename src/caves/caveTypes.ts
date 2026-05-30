import type { Vector2Like } from '../core/math.js';

export type CaveTemplateId =
  | 'goldenAppleRush'
  | 'skittishAppleRush'
  | 'simpleTreasure'
  | 'lakeTreasure'
  | 'caveDweller'
  | 'monsterDen'
  | 'randomStructureRoom';

export type CaveLayoutId =
  | 'appleRush'
  | 'simpleTreasure'
  | 'lakeTreasure'
  | 'caveDweller'
  | 'monsterDen'
  | 'structureRoom';

export type CaveBoundaryMode = 'solidWalls' | 'wrap';
export type CaveExitMode = 'manual' | 'timerForced' | 'combatClear' | 'rewardClaimed';
export type CaveInstanceState = 'available' | 'active' | 'completed' | 'collapsed';
export type CaveDirection = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';

export interface CaveApplePool {
  typeId: string;
  count: number;
  minCount?: number;
  maxCount?: number;
}

export interface CaveEntrance {
  id: string;
  caveId: string;
  x: number;
  y: number;
  templateId: CaveTemplateId;
  collapsed: boolean;
}

export interface CaveZone {
  id: string;
  localCoord: {
    x: number;
    y: number;
    z: number;
  };
  templateId: string;
  completed: boolean;
  exits: Partial<Record<CaveDirection, string>>;
}

export interface CaveInstance {
  id: string;
  parentRoomId: string;
  seed: number;
  templateId: CaveTemplateId;
  state: CaveInstanceState;
  returnPosition: Vector2Like;
  zones: Record<string, CaveZone>;
}

export interface CaveTemplate {
  id: CaveTemplateId;
  label: string;
  category: 'appleRush' | 'treasure' | 'npc' | 'combat' | 'structure';
  layoutId: CaveLayoutId;
  boundaryMode: CaveBoundaryMode;
  exitMode: CaveExitMode;
  timerSeconds?: number;
  collapseOnExit?: boolean;
  collapseOnTimerEnd?: boolean;
  forcedEjectionOnTimerEnd?: boolean;
  applePool?: CaveApplePool;
  rewardTableId?: string;
  enemyTableId?: string;
  structureTableId?: string;
}

export interface CaveInstanceSaveData {
  id: string;
  parentRoomId: string;
  templateId: CaveTemplateId;
  state: CaveInstanceState;
  collectedItemIds: string[];
  openedChestIds: string[];
  killedEnemyIds: string[];
  rewardClaimed: boolean;
  discoveredZones: string[];
}

export interface CaveSaveState {
  caveInstances: Record<string, CaveInstanceSaveData>;
}

export interface CaveRuntimeState {
  caveId: string;
  parentRoomId: string;
  entranceId: string;
  returnPosition: Vector2Like;
  templateId: CaveTemplateId;
  timerTicks?: number;
  timerTotalTicks?: number;
  appleRushRemaining?: number;
}

export interface CaveGenerationResult {
  instance: CaveInstance;
  room: import('../world/types.js').RoomSnapshot;
  spawn: Vector2Like;
  exit: Vector2Like;
}

export const CAVE_ZONE_ORIGIN_ID = '0,0,0';
export const CAVE_ENTRANCE_TILE = 'V';
export const CAVE_EXIT_TILE = 'X';
export const CAVE_RUBBLE_TILE = 'Q';
