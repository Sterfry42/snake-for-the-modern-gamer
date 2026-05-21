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
import { MultiRoomStructureResolver } from './generation/townStructureResolver.js';
import {
  createWorldGenerationIdentity,
  type WorldGenerationIdentity,
} from './generation/worldGenerationIdentity.js';

export class RoomGenerator {
  private readonly pipeline: RoomGenerationPipeline;
  private readonly biomeMap = new CoordinateBiomeMap();
  private readonly grid: GridConfig;
  private readonly config: WorldConfig;
  private readonly rng: RandomGenerator;
  private readonly worldGenerationIdentity: WorldGenerationIdentity;
  private readonly structureResolver: MultiRoomStructureResolver;
  private readonly crossRoomFeatureOperations: CrossRoomFeatureOperations;
  private readonly forestOperations: ForestOperations;
  private readonly obstacleOperations: RandomObstacleOperations;
  private readonly oceanOperations: OceanOperations;
  private readonly portalOperations: PortalOperations;
  private readonly roomArchetypeOperations: RoomArchetypeOperations;
  private readonly safetyOperations: SafetyOperations;
  private readonly structureOperations: StructureOperations;

  constructor(
    gridOrConfig: GridConfig | WorldConfig,
    configOrRng: WorldConfig | RandomGenerator,
    rngOrIdentity?: RandomGenerator | WorldGenerationIdentity,
    identity?: WorldGenerationIdentity,
  ) {
    const legacySignature = typeof configOrRng === 'function';
    this.grid = legacySignature ? { cols: 32, rows: 24, cell: 24 } : (gridOrConfig as GridConfig);
    this.config = legacySignature ? (gridOrConfig as WorldConfig) : (configOrRng as WorldConfig);
    this.rng = legacySignature ? (configOrRng as RandomGenerator) : (rngOrIdentity as RandomGenerator);
    const resolvedIdentity = legacySignature
      ? (rngOrIdentity as WorldGenerationIdentity | undefined)
      : identity;
    this.worldGenerationIdentity = resolvedIdentity ?? createWorldGenerationIdentity();
    this.structureResolver = new MultiRoomStructureResolver(
      this.worldGenerationIdentity,
      this.biomeMap,
      this.grid,
    );
    this.crossRoomFeatureOperations = new CrossRoomFeatureOperations(this.biomeMap, this.rng);
    this.forestOperations = new ForestOperations(this.biomeMap);
    this.obstacleOperations = new RandomObstacleOperations(this.config, this.rng);
    this.oceanOperations = new OceanOperations(this.biomeMap, this.rng);
    this.portalOperations = new PortalOperations(this.config, this.rng);
    this.roomArchetypeOperations = new RoomArchetypeOperations(this.config, this.rng);
    this.safetyOperations = new SafetyOperations(this.config);
    this.structureOperations = new StructureOperations(this.config, this.rng, this.structureResolver);
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
    const isLibertyBadlands = palette.biomeId === 'liberty-badlands';
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
      isLibertyBadlands,
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
      townPerimeter: context.townPerimeter,
      snakeMcDonalds: context.snakeMcDonalds,
      shrine: context.shrine,
      ramenStand: context.ramenStand,
      koiPond: context.koiPond,
      motelPool: context.motelPool,
      tenguCamp: context.tenguCamp,
      roadsideMonument: context.roadsideMonument,
      allNiteDiner: context.allNiteDiner,
      fireworkStand: context.fireworkStand,
      jackalopeLodge: context.jackalopeLodge,
      gridironYard: context.gridironYard,
      billboardOracle: context.billboardOracle,
      roadCrew: context.roadCrew,
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

  resolveMultiRoomStructures(context: RoomGenerationContext): void {
    context.townMembership = this.structureResolver.getTownMembership(context.roomId);
    context.townAdjacency = context.townMembership
      ? null
      : this.structureResolver.getTownAdjacency(context.roomId);
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
