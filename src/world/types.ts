import type { Vector2Like } from '../core/math.js';
import type { NpcProfile } from '../npcs/profiles.js';
import type { BiomeId } from './biomes.js';
import type { TownStructure } from './town.js';
import type {
  CaveBoundaryMode,
  CaveEntrance,
  CaveInstanceState,
  CaveTemplateId,
} from '../caves/caveTypes.js';
import type { LayerEntrance, LayerInstance } from '../layers/layerTypes.js';
import type { DigSiteVariantId } from '../archaeology/molemanArchaeology.js';

/** A single vegetation instance placed on the room grid. */
export interface VegetationInstance {
  x: number;
  y: number;
  variant: VegetationType;
}

/** All 40 vegetation type string literals. */
export type VegetationType =
  | 'grass-1'
  | 'grass-2'
  | 'grass-3'
  | 'grass-4'
  | 'grass-5'
  | 'flower-1'
  | 'flower-2'
  | 'flower-3'
  | 'flower-4'
  | 'flower-5'
  | 'bush-1'
  | 'bush-2'
  | 'bush-3'
  | 'bush-4'
  | 'bush-5'
  | 'mushroom-1'
  | 'mushroom-2'
  | 'mushroom-3'
  | 'mushroom-4'
  | 'mushroom-5'
  | 'vine-1'
  | 'vine-2'
  | 'vine-3'
  | 'vine-4'
  | 'vine-5'
  | 'rock-1'
  | 'rock-2'
  | 'rock-3'
  | 'rock-4'
  | 'rock-5'
  | 'tree-1'
  | 'tree-2'
  | 'tree-3'
  | 'tree-4'
  | 'tree-5'
  | 'decor-1'
  | 'decor-2'
  | 'decor-3'
  | 'decor-4'
  | 'decor-5';

export interface PortalConfig {
  x: number;
  y: number;
  destRoomId: string;
  destX: number;
  destY: number;
}

export interface RoomArea {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RoomSnapshot {
  id: string;
  layout: string[];
  archetypeId?: string;
  portals: PortalConfig[];
  apple?: Vector2Like;
  apples?: Vector2Like[];
  treasure?: Vector2Like;
  powerup?: { x: number; y: number; kind: 'phase' | 'smite' | 'gun' };
  caveEntrances?: CaveEntrance[];
  layerEntrances?: LayerEntrance[];
  layer?: LayerInstance;
  cave?: {
    id: string;
    parentRoomId: string;
    templateId: CaveTemplateId;
    zoneId: string;
    exit: Vector2Like;
    spawn: Vector2Like;
    boundaryMode: CaveBoundaryMode;
    state: CaveInstanceState;
    lockedReward?: boolean;
    enemyCount?: number;
    forcedStructureId?: string;
    dwellerRewardClaimed?: boolean;
    lakeRewards?: Array<{ id: string; x: number; y: number }>;
  };
  questGiver?: NpcProfile & { x: number; y: number };
  village?: {
    name: string;
    center: Vector2Like;
    safeArea: RoomArea;
    lanterns: Vector2Like[];
    residents: Array<NpcProfile & { x: number; y: number }>;
    shopkeeper: NpcProfile & { x: number; y: number };
  };
  goblinCamp?: {
    id: string;
    name: string;
    center: Vector2Like;
    safeArea: RoomArea;
    tents: Vector2Like[];
    fires: Vector2Like[];
    guards: Array<NpcProfile & { x: number; y: number }>;
    shopkeeper: NpcProfile & { x: number; y: number };
  };
  town?: TownStructure;
  townPerimeter?: {
    townId: string;
    sideFacingTown?: 'north' | 'south' | 'east' | 'west';
    sidesFacingTown?: Array<'north' | 'south' | 'east' | 'west'>;
    cornersFacingTown?: Array<'northWest' | 'northEast' | 'southWest' | 'southEast'>;
  };
  snakeMcDonalds?: {
    cashier: {
      name: string;
      x: number;
      y: number;
    };
    toilet: {
      x: number;
      y: number;
    };
    arcade: {
      x: number;
      y: number;
    };
    bounds: { left: number; top: number; width: number; height: number };
  };
  shrine?: {
    maiden: NpcProfile & { x: number; y: number };
    hasBlessings: boolean;
  };
  ramenStand?: {
    chef: NpcProfile & { x: number; y: number };
    sellsRamen: boolean;
  };
  koiPond?: {
    center: Vector2Like;
    waterTiles: Vector2Like[];
  };
  motelPool?: {
    clerk: NpcProfile & { x: number; y: number };
    maintenance: NpcProfile & { x: number; y: number };
    poolName: string;
    center: Vector2Like;
    waterTiles: Vector2Like[];
  };
  tenguCamp?: {
    chieftain: NpcProfile & { x: number; y: number };
    feathers: Vector2Like[];
  };
  roadsideMonument?: {
    docent: NpcProfile & { x: number; y: number };
    ranger: NpcProfile & { x: number; y: number };
    hasBlessings: boolean;
    monumentName: string;
  };
  allNiteDiner?: {
    cook: NpcProfile & { x: number; y: number };
    waitress: NpcProfile & { x: number; y: number };
    regular: NpcProfile & { x: number; y: number };
    sellsFood: true;
    dinerName: string;
  };
  fireworkStand?: {
    vendor: NpcProfile & { x: number; y: number };
    inspector: NpcProfile & { x: number; y: number };
    sellsFireworks: true;
    standName: string;
  };
  jackalopeLodge?: {
    elder: NpcProfile & { x: number; y: number };
    witnesses: Array<NpcProfile & { x: number; y: number }>;
    lodgeName: string;
  };
  gridironYard?: {
    coach: NpcProfile & { x: number; y: number };
    players: Array<NpcProfile & { x: number; y: number }>;
    fieldName: string;
  };
  billboardOracle?: {
    signPainter: NpcProfile & { x: number; y: number };
    slogan: string;
  };
  roadCrew?: {
    ranger: NpcProfile & { x: number; y: number };
    roadName: string;
  };
  molemanDigSite?: {
    id: string;
    name: string;
    variantId: DigSiteVariantId;
    foreman: NpcProfile & { x: number; y: number };
    bounds: { left: number; top: number; width: number; height: number };
    pit: Vector2Like;
  };
  temperatureReliefs?: Array<{ x: number; y: number; kind: 'warm' | 'cool' | 'onsen' }>;
  minecraftBlocks?: Record<string, string>;
  minecraftCropData?: Map<string, { stage: number; growthTicks: number }>;
  vegetation?: VegetationInstance[];
  biomeId: BiomeId;
  biomeTitle: string;
  backgroundColor: number;
  wallColor: number;
  wallOutlineColor: number;
}
