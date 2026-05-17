import type { GridConfig, WorldConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import type { RoomSnapshot } from './types.js';
import { CoordinateBiomeMap } from './generation/biomeMap.js';
import { RoomGenerationPipeline } from './generation/roomGenerationPipeline.js';
import type { RoomGenerationContext } from './generation/types.js';
import { TerrainCanvas } from './generation/terrainCanvas.js';
import { PortalOperations } from './generation/stages/portalOperations.js';
import { RandomObstacleOperations } from './generation/stages/randomObstacleOperations.js';
import { SafetyOperations } from './generation/stages/safetyOperations.js';
import { StructureOperations } from './generation/stages/structureOperations.js';
import { OceanOperations } from './generation/stages/oceanOperations.js';
import { CrossRoomFeatureOperations } from './generation/stages/crossRoomFeatureOperations.js';
import { ForestOperations } from './generation/stages/forestOperations.js';
import { RoomArchetypeOperations } from './generation/stages/roomArchetypeOperations.js';

export class RoomGenerator {
  private readonly pipeline: RoomGenerationPipeline;
  private readonly biomeMap = new CoordinateBiomeMap();
  private readonly crossRoomFeatureOperations: CrossRoomFeatureOperations;
  private readonly forestOperations: ForestOperations;
  private readonly obstacleOperations: RandomObstacleOperations;
  private readonly oceanOperations: OceanOperations;
  private readonly portalOperations: PortalOperations;
  private readonly roomArchetypeOperations: RoomArchetypeOperations;
  private readonly safetyOperations: SafetyOperations;
  private readonly structureOperations: StructureOperations;

  constructor(
    private readonly config: WorldConfig,
    private readonly rng: RandomGenerator,
  ) {
    this.crossRoomFeatureOperations = new CrossRoomFeatureOperations(this.biomeMap, rng);
    this.forestOperations = new ForestOperations(this.biomeMap);
    this.obstacleOperations = new RandomObstacleOperations(config, rng);
    this.oceanOperations = new OceanOperations(this.biomeMap, rng);
    this.portalOperations = new PortalOperations(config, rng);
    this.roomArchetypeOperations = new RoomArchetypeOperations(config, rng);
    this.safetyOperations = new SafetyOperations(config);
    this.structureOperations = new StructureOperations(config, rng);
    this.pipeline = new RoomGenerationPipeline(this);
  }

  generate(roomId: string, grid: GridConfig): RoomSnapshot {
    return this.pipeline.generate(roomId, grid);
  }

  createGenerationContext(roomId: string, grid: GridConfig): RoomGenerationContext {
    const canvas = new TerrainCanvas(grid);
    const portals: RoomSnapshot['portals'] = [];
    const palette = this.biomeMap.createPalette(roomId);
    const isOcean = palette.biomeId === 'sunken-ocean';
    const isDenseForest = palette.biomeId === 'elderwood-maze';
    const isJadePeak = palette.biomeId === 'jade-peak-province';
    const spawnGuard = this.safetyOperations.createSpawnGuard(roomId);

    return {
      roomId,
      grid,
      canvas,
      layout: canvas.layout,
      portals,
      palette,
      isOcean,
      isDenseForest,
      isJadePeak,
      spawnGuard,
    };
  }

  finalizeGenerationContext(context: RoomGenerationContext): RoomSnapshot {
    return {
      id: context.roomId,
      layout: context.canvas.toRows(),
      archetypeId: context.archetype?.id,
      portals: context.portals,
      questGiver: context.questGiver,
      village: context.village,
      goblinCamp: context.goblinCamp,
      town: context.town,
      snakeMcDonalds: context.snakeMcDonalds,
      shrine: context.shrine,
      ramenStand: context.ramenStand,
      koiPond: context.koiPond,
      tenguCamp: context.tenguCamp,
      temperatureReliefs: context.temperatureReliefs,
      biomeId: context.palette.biomeId,
      biomeTitle: context.palette.biomeTitle,
      backgroundColor: context.palette.backgroundColor,
      wallColor: context.palette.wallColor,
      wallOutlineColor: context.palette.wallOutlineColor,
    };
  }

  resolveBiomeMap(_context: RoomGenerationContext): void {
    // Current biome decisions are resolved when the context is created.
    // Keeping this stage explicit gives the randomized BiomeMap a stable hook.
  }

  applyBiomeBaseTerrain(context: RoomGenerationContext): void {
    if (context.isOcean) {
      this.oceanOperations.fillRoom(context.layout, context.grid, context.roomId);
    } else if (context.isDenseForest) {
      this.forestOperations.fillDenseForestRoom(
        context.layout,
        context.grid,
        context.roomId,
        context.spawnGuard?.protected,
      );
    }
  }

  applyRoomArchetype(context: RoomGenerationContext): void {
    this.roomArchetypeOperations.apply(context);
  }

  placeRandomObstacles(context: RoomGenerationContext): void {
    this.obstacleOperations.place(context);
  }

  placeCrossRoomFeatures(context: RoomGenerationContext): void {
    this.crossRoomFeatureOperations.place(context);
    if (!context.isOcean && !context.isDenseForest) {
      this.forestOperations.placeDenseForestThresholds(
        context.layout,
        context.grid,
        context.roomId,
        context.spawnGuard?.protected,
      );
    }
  }

  placeRoomStructures(context: RoomGenerationContext): void {
    this.structureOperations.place(context);
  }

  placePortals(context: RoomGenerationContext): void {
    this.portalOperations.place(context);
  }

  validateRoomSafety(context: RoomGenerationContext): void {
    this.safetyOperations.validate(context);
  }
}
