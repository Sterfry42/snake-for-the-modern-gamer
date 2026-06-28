import type { GridConfig, WorldConfig } from '../config/gameConfig.js';
import { createRng, type RandomGenerator } from '../core/rng.js';
import { biomeCountsAs } from './biomes.js';
import type { RoomSnapshot } from './types.js';
import { SeededBiomeMap } from './generation/biomeMap.js';
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
import { VegetationOperations } from './generation/stages/vegetationOperations.js';
import { MultiRoomStructureResolver } from './generation/townStructureResolver.js';
import {
  createWorldGenerationIdentity,
  type WorldGenerationIdentity,
} from './generation/worldGenerationIdentity.js';
import { TransitionContractResolver } from './generation/transitionContracts.js';
import { cellsForEdgeRunup, mergeProtectedCells } from './generation/edgeAccess.js';

export class RoomGenerator {
  private readonly pipeline: RoomGenerationPipeline;
  private readonly biomeMap: SeededBiomeMap;
  private readonly grid: GridConfig;
  private readonly config: WorldConfig;
  private readonly rng: RandomGenerator;
  private readonly worldGenerationIdentity: WorldGenerationIdentity;
  private readonly structureResolver: MultiRoomStructureResolver;
  private readonly crossRoomFeatureOperations: CrossRoomFeatureOperations;
  private readonly forestOperations: ForestOperations;
  private readonly oceanOperations: OceanOperations;
  private readonly roomArchetypeOperations: RoomArchetypeOperations;
  private readonly safetyOperations: SafetyOperations;
  private readonly vegetationOperations: VegetationOperations;
  private readonly transitionResolver: TransitionContractResolver;

  constructor(
    gridOrConfig: GridConfig | WorldConfig,
    configOrRng: WorldConfig | RandomGenerator,
    rngOrIdentity?: RandomGenerator | WorldGenerationIdentity,
    identity?: WorldGenerationIdentity,
  ) {
    const legacySignature = typeof configOrRng === 'function';
    this.grid = legacySignature ? { cols: 32, rows: 24, cell: 24 } : (gridOrConfig as GridConfig);
    this.config = legacySignature ? (gridOrConfig as WorldConfig) : (configOrRng as WorldConfig);
    this.rng = legacySignature
      ? (configOrRng as RandomGenerator)
      : (rngOrIdentity as RandomGenerator);
    const resolvedIdentity = legacySignature
      ? (rngOrIdentity as WorldGenerationIdentity | undefined)
      : identity;
    this.worldGenerationIdentity = resolvedIdentity ?? createWorldGenerationIdentity();
    this.biomeMap = new SeededBiomeMap(this.worldGenerationIdentity);
    this.transitionResolver = new TransitionContractResolver(
      this.worldGenerationIdentity,
      this.biomeMap,
      this.grid,
    );
    this.structureResolver = new MultiRoomStructureResolver(
      this.worldGenerationIdentity,
      this.biomeMap,
      this.grid,
    );
    this.crossRoomFeatureOperations = new CrossRoomFeatureOperations(
      this.biomeMap,
      this.worldGenerationIdentity,
    );
    this.forestOperations = new ForestOperations(this.biomeMap);
    this.oceanOperations = new OceanOperations(this.biomeMap, this.rng);
    this.roomArchetypeOperations = new RoomArchetypeOperations(this.config, this.rng);
    this.safetyOperations = new SafetyOperations(this.config);
    this.vegetationOperations = new VegetationOperations();
    this.pipeline = new RoomGenerationPipeline(this);
  }

  generate(roomId: string, grid: GridConfig): RoomSnapshot {
    return this.pipeline.generate(roomId, grid);
  }

  createGenerationContext(roomId: string, grid: GridConfig): RoomGenerationContext {
    const canvas = new TerrainCanvas(grid);
    const portals: RoomSnapshot['portals'] = [];
    const palette = this.biomeMap.createPalette(roomId);
    const isOcean = biomeCountsAs(palette.biomeId, 'ocean');
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
      vegetation: [],
    };
  }

  finalizeGenerationContext(context: RoomGenerationContext): RoomSnapshot {
    const townRoom = Boolean(context.town);
    return {
      id: context.roomId,
      layout: context.canvas.toRows(),
      archetypeId: townRoom ? undefined : context.archetype?.id,
      portals: context.portals,
      questGiver: context.questGiver,
      village: context.village,
      goblinCamp: context.goblinCamp,
      town: context.town,
      layerEntrances: context.layerEntrances,
      townPerimeter: context.townPerimeter,
      snakeMcDonalds: townRoom ? undefined : context.snakeMcDonalds,
      shrine: townRoom ? undefined : context.shrine,
      ramenStand: townRoom ? undefined : context.ramenStand,
      koiPond: townRoom ? undefined : context.koiPond,
      motelPool: townRoom ? undefined : context.motelPool,
      tenguCamp: townRoom ? undefined : context.tenguCamp,
      roadsideMonument: townRoom ? undefined : context.roadsideMonument,
      allNiteDiner: townRoom ? undefined : context.allNiteDiner,
      fireworkStand: townRoom ? undefined : context.fireworkStand,
      jackalopeLodge: townRoom ? undefined : context.jackalopeLodge,
      gridironYard: townRoom ? undefined : context.gridironYard,
      billboardOracle: townRoom ? undefined : context.billboardOracle,
      roadCrew: townRoom ? undefined : context.roadCrew,
      molemanDigSite: townRoom ? undefined : context.molemanDigSite,
      bulletTrainStation: context.bulletTrainStation,
      temperatureReliefs: townRoom ? undefined : context.temperatureReliefs,
      biomeId: context.palette.biomeId,
      biomeTitle: context.palette.biomeTitle,
      backgroundColor: context.palette.backgroundColor,
      wallColor: context.palette.wallColor,
      wallOutlineColor: context.palette.wallOutlineColor,
      vegetation: context.vegetation.length > 0 ? context.vegetation : undefined,
    };
  }

  resolveBiomeMap(_context: RoomGenerationContext): void {
    const context = _context;
    context.transitionContracts = this.transitionResolver.resolveForRoom(context.roomId);
    const reservedAccess = context.transitionContracts.map((contract) =>
      this.transitionResolver.toEdgeAccessPlan(contract),
    );
    context.reservedEdgeAccess = [...(context.reservedEdgeAccess ?? []), ...reservedAccess];
    context.protectedCells = mergeProtectedCells(
      context.protectedCells,
      ...reservedAccess.map((plan) => cellsForEdgeRunup(context.grid, plan)),
    );
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
    new RandomObstacleOperations(
      this.config,
      createRng(
        `${this.worldGenerationIdentity.seed}:barriers:${this.worldGenerationIdentity.barrierSalt}:${context.roomId}`,
      ),
    ).place(context);
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
    new StructureOperations(
      this.config,
      createRng(
        `${this.worldGenerationIdentity.seed}:structures:${this.worldGenerationIdentity.structureSalt}:${context.roomId}`,
      ),
      this.structureResolver,
    ).place(context);
  }

  placePortals(context: RoomGenerationContext): void {
    new PortalOperations(
      this.config,
      createRng(`${this.worldGenerationIdentity.seed}:portals:${context.roomId}`),
    ).place(context);
  }

  validateRoomSafety(context: RoomGenerationContext): void {
    this.safetyOperations.validate(context);
  }

  placeVegetation(context: RoomGenerationContext): void {
    this.vegetationOperations.place(context);
  }
}
