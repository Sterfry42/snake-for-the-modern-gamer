import type { GridConfig } from '../../config/gameConfig.js';
import type { RoomSnapshot } from '../types.js';
import type { TerrainCanvas } from './terrainCanvas.js';

export type RoomLayout = string[][];
export type ProtectedCells = ReadonlySet<string> | undefined;

export interface SpawnGuard {
  protected: ReadonlySet<string>;
  clear(layout: RoomLayout): void;
}

export interface RoomGenerationPalette {
  biomeId: RoomSnapshot['biomeId'];
  biomeTitle: string;
  backgroundColor: number;
  wallColor: number;
  wallOutlineColor: number;
}

export type RoomArchetypeId =
  | 'classic'
  | 'open-clearing'
  | 'four-corners'
  | 'choke-point'
  | 'ocean'
  | 'dense-forest'
  | 'cherry-garden'
  | 'bamboo-thicket'
  | 'shrine-courtyard'
  | 'onsen-village'
  | 'mountain-pass'
  | 'tatami-dojo';

export interface RoomArchetype {
  id: RoomArchetypeId;
  suppressRandomObstacles?: boolean;
}

export interface RoomGenerationContext {
  roomId: string;
  grid: GridConfig;
  canvas: TerrainCanvas;
  layout: RoomLayout;
  portals: RoomSnapshot['portals'];
  questGiver?: RoomSnapshot['questGiver'];
  village?: RoomSnapshot['village'];
  goblinCamp?: RoomSnapshot['goblinCamp'];
  snakeMcDonalds?: RoomSnapshot['snakeMcDonalds'];
  shrine?: RoomSnapshot['shrine'];
  ramenStand?: RoomSnapshot['ramenStand'];
  koiPond?: RoomSnapshot['koiPond'];
  tenguCamp?: RoomSnapshot['tenguCamp'];
  temperatureReliefs?: RoomSnapshot['temperatureReliefs'];
  palette: RoomGenerationPalette;
  archetype?: RoomArchetype;
  isOcean: boolean;
  isDenseForest: boolean;
  isJadePeak: boolean;
  spawnGuard: SpawnGuard | null;
}

export interface RoomGenerationStage {
  readonly id: string;
  apply(context: RoomGenerationContext): void;
}

export interface RoomGenerationOperations {
  createGenerationContext(roomId: string, grid: GridConfig): RoomGenerationContext;
  finalizeGenerationContext(context: RoomGenerationContext): RoomSnapshot;
  resolveBiomeMap(context: RoomGenerationContext): void;
  applyBiomeBaseTerrain(context: RoomGenerationContext): void;
  applyRoomArchetype(context: RoomGenerationContext): void;
  placeRandomObstacles(context: RoomGenerationContext): void;
  placeCrossRoomFeatures(context: RoomGenerationContext): void;
  placeRoomStructures(context: RoomGenerationContext): void;
  placePortals(context: RoomGenerationContext): void;
  validateRoomSafety(context: RoomGenerationContext): void;
}
