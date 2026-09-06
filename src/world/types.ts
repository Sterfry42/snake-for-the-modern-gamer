/**
 * World Types
 */
import type { Vector2Like } from '../core/math.js';
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
import type { BulletTrainStation } from './bulletTrainTypes.js';
import type { RollercoasterStation } from './rollercoasterTypes.js';
import type { GarageStructure, ParkedCar } from '../vehicles/car.js';

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
  | 'decor-5'
  | 'cactus-1'
  | 'cactus-2'
  | 'cactus-3'
  | 'cactus-4'
  | 'cactus-5';

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

export interface WorldHumanoidSpawn {
  id: string;
  name: string;
  portraitId?: string;
  x: number;
  y: number;
}

export type MosaicCoastExposureKind = 'direct-sun' | 'shade' | 'cooling' | 'interior';

export interface MosaicCoastMetadata {
  exposure: Array<{ x: number; y: number; kind: MosaicCoastExposureKind }>;
  fountains: Array<{ x: number; y: number; radius: number }>;
  canopyTrees: Array<{ trunk: Vector2Like; canopy: Vector2Like[] }>;
  awnings: Array<{ cells: Vector2Like[]; colorId: string }>;
  tapasBar?: {
    bartender: WorldHumanoidSpawn;
    tableCells: Vector2Like[];
    minigameSeed: string;
  };
  souvenirStand?: {
    vendor: WorldHumanoidSpawn;
    standName: string;
  };
  gaudiPark?: {
    bossEntrance?: Vector2Like;
    mosaicCells: Vector2Like[];
  };
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
  questGiver?: WorldHumanoidSpawn;
  village?: {
    name: string;
    center: Vector2Like;
    safeArea: RoomArea;
    lanterns: Vector2Like[];
    residents: WorldHumanoidSpawn[];
    shopkeeper: WorldHumanoidSpawn;
  };
  goblinCamp?: {
    id: string;
    name: string;
    center: Vector2Like;
    safeArea: RoomArea;
    tents: Vector2Like[];
    fires: Vector2Like[];
    guards: WorldHumanoidSpawn[];
    shopkeeper: WorldHumanoidSpawn;
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
  snakeCanes?: {
    cashier: {
      name: string;
      x: number;
      y: number;
    };
    bounds: { left: number; top: number; width: number; height: number };
  };
  shrine?: {
    maiden: WorldHumanoidSpawn;
    hasBlessings: boolean;
  };
  ramenStand?: {
    chef: WorldHumanoidSpawn;
    sellsRamen: boolean;
  };
  koiPond?: {
    center: Vector2Like;
    waterTiles: Vector2Like[];
  };
  motelPool?: {
    clerk: WorldHumanoidSpawn;
    maintenance: WorldHumanoidSpawn;
    poolName: string;
    center: Vector2Like;
    waterTiles: Vector2Like[];
  };
  tenguCamp?: {
    chieftain: WorldHumanoidSpawn;
    feathers: Vector2Like[];
  };
  roadsideMonument?: {
    docent: WorldHumanoidSpawn;
    ranger: WorldHumanoidSpawn;
    hasBlessings: boolean;
    monumentName: string;
  };
  allNiteDiner?: {
    cook: WorldHumanoidSpawn;
    waitress: WorldHumanoidSpawn;
    regular: WorldHumanoidSpawn;
    sellsFood: true;
    dinerName: string;
  };
  fireworkStand?: {
    vendor: WorldHumanoidSpawn;
    inspector: WorldHumanoidSpawn;
    sellsFireworks: true;
    standName: string;
  };
  jackalopeLodge?: {
    elder: WorldHumanoidSpawn;
    witnesses: WorldHumanoidSpawn[];
    lodgeName: string;
  };
  gridironYard?: {
    coach: WorldHumanoidSpawn;
    players: WorldHumanoidSpawn[];
    fieldName: string;
  };
  billboardOracle?: {
    signPainter: WorldHumanoidSpawn;
    slogan: string;
  };
  roadCrew?: {
    ranger: WorldHumanoidSpawn;
    roadName: string;
  };
  molemanDigSite?: {
    id: string;
    name: string;
    variantId: DigSiteVariantId;
    foreman: WorldHumanoidSpawn;
    bounds: { left: number; top: number; width: number; height: number };
    pit: Vector2Like;
  };
  lavenderFarm?: {
    farmCenter: { x: number; y: number };
    safeArea: { left: number; top: number; width: number; height: number };
    farmer: WorldHumanoidSpawn;
    rows: Array<{ x: number; y: number }>;
  };
  cheeseShop?: {
    shopCenter: { x: number; y: number };
    safeArea: { left: number; top: number; width: number; height: number };
    shopkeeper: WorldHumanoidSpawn;
  };
  garage?: GarageStructure;
  cars?: ParkedCar[];
  bulletTrainStation?: BulletTrainStation;
  rollercoasterStation?: RollercoasterStation;
  temperatureReliefs?: Array<{ x: number; y: number; kind: 'warm' | 'cool' | 'onsen' }>;
  mosaicCoast?: MosaicCoastMetadata;
  minecraftBlocks?: Record<string, string>;
  minecraftCropData?: Map<string, { stage: number; growthTicks: number }>;
  vegetation?: VegetationInstance[];
  biomeId: BiomeId;
  biomeTitle: string;
  backgroundColor: number;
  wallColor: number;
  wallOutlineColor: number;
}
