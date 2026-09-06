import type { GridConfig, WorldConfig } from '../config/gameConfig.js';
import { createRng, type RandomGenerator } from '../core/rng.js';
import { biomeCountsAs } from './biomes.js';
import { createHouseRoom } from './houseRoom.js';
import type { RoomSnapshot } from './types.js';
import { SeededBiomeMap } from './generation/biomeMap.js';
import type { RoomGenerationContext } from './generation/types.js';
import { TerrainCanvas } from './generation/terrainCanvas.js';
import { placePortals } from './generation/stages/portalOperations.js';
import { placeRandomObstacles } from './generation/stages/randomObstacleOperations.js';
import { SafetyOperations } from './generation/stages/safetyOperations.js';
import { StructureOperations } from './generation/stages/structureOperations.js';
import { OceanOperations } from './generation/stages/oceanOperations.js';
import { MosaicCoastOperations } from './generation/stages/mosaicCoastOperations.js';
import { CrossRoomFeatureOperations } from './generation/stages/crossRoomFeatureOperations.js';
import { ForestOperations } from './generation/stages/forestOperations.js';
import { RoomArchetypeOperations } from './generation/stages/roomArchetypeOperations.js';
import { placeVegetation } from './generation/stages/vegetationOperations.js';
import { MultiRoomStructureResolver } from './generation/townStructureResolver.js';
import {
  createWorldGenerationIdentity,
  type WorldGenerationIdentity,
} from './generation/worldGenerationIdentity.js';
import { TransitionContractResolver } from './generation/transitionContracts.js';
import { cellsForEdgeRunup, mergeProtectedCells } from './generation/edgeAccess.js';

export class RoomGenerator {
  private readonly biomeMap: SeededBiomeMap;
  readonly grid: GridConfig;
  private readonly config: WorldConfig;
  private readonly rng: RandomGenerator;
  private readonly worldGenerationIdentity: WorldGenerationIdentity;
  private readonly structureResolver: MultiRoomStructureResolver;
  private readonly crossRoomFeatureOperations: CrossRoomFeatureOperations;
  private readonly forestOperations: ForestOperations;
  private readonly oceanOperations: OceanOperations;
  private readonly mosaicCoastOperations: MosaicCoastOperations;
  private readonly safetyOperations: SafetyOperations;
  private readonly transitionResolver: TransitionContractResolver;

  constructor(
    grid: GridConfig,
    config: WorldConfig,
    rng: RandomGenerator,
    identity?: WorldGenerationIdentity,
  ) {
    this.grid = grid;
    this.config = config;
    this.rng = rng;
    this.worldGenerationIdentity = identity ?? createWorldGenerationIdentity();
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
    this.mosaicCoastOperations = new MosaicCoastOperations(this.worldGenerationIdentity);
    this.safetyOperations = new SafetyOperations(this.config);
  }

  generate(roomId: string): RoomSnapshot {
    if (roomId === '0,-1,0') {
      return createHouseRoom(roomId, this.grid);
    }

    const context = this.createGenerationContext(roomId);
    this.resolveBiomeMap(context);
    this.resolveMultiRoomStructures(context);
    this.applyBiomeBaseTerrain(context);
    this.applyRoomArchetype(context);
    this.placeCrossRoomFeatures(context);
    this.placeRoomStructures(context);
    placeRandomObstacles(
      context,
      this.config,
      createRng(
        `${this.worldGenerationIdentity.seed}:barriers:${this.worldGenerationIdentity.barrierSalt}:${context.roomId}`,
      ),
    );
    placeVegetation(context);
    placePortals(
      context,
      this.config,
      createRng(`${this.worldGenerationIdentity.seed}:portals:${context.roomId}`),
    );
    this.validateRoomSafety(context);
    return this.finalizeGenerationContext(context);
  }

  private createGenerationContext(roomId: string): RoomGenerationContext {
    const canvas = new TerrainCanvas(this.grid);
    const portals: RoomSnapshot['portals'] = [];
    const palette = this.biomeMap.createPalette(roomId);
    const isOcean = biomeCountsAs(palette.biomeId, 'ocean');
    const isDenseForest = palette.biomeId === 'elderwood-maze';
    const isMosaicCoast = palette.biomeId === 'mosaic-coast';
    const isJadePeak = palette.biomeId === 'jade-peak-province';
    const isLibertyBadlands = palette.biomeId === 'liberty-badlands';
    const isProvenceValley = palette.biomeId === 'provence-valley';
    const spawnGuard = this.safetyOperations.createSpawnGuard(roomId);

    return {
      roomId,
      grid: this.grid,
      canvas,
      layout: canvas.layout,
      portals,
      palette,
      isOcean,
      isDenseForest,
      isMosaicCoast,
      isJadePeak,
      isLibertyBadlands,
      isProvenceValley,
      spawnGuard,
      vegetation: [],
    };
  }

  private finalizeGenerationContext(context: RoomGenerationContext): RoomSnapshot {
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
      snakeCanes: townRoom ? undefined : context.snakeCanes,
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
      lavenderFarm: townRoom ? undefined : context.lavenderFarm,
      cheeseShop: townRoom ? undefined : context.cheeseShop,
      garage: townRoom ? undefined : context.garage,
      bulletTrainStation: context.bulletTrainStation,
      rollercoasterStation: context.rollercoasterStation,
      temperatureReliefs: townRoom ? undefined : context.temperatureReliefs,
      mosaicCoast: townRoom ? undefined : context.mosaicCoast,
      biomeId: context.palette.biomeId,
      biomeTitle: context.palette.biomeTitle,
      backgroundColor: context.palette.backgroundColor,
      wallColor: context.palette.wallColor,
      wallOutlineColor: context.palette.wallOutlineColor,
      vegetation: context.vegetation.length > 0 ? context.vegetation : undefined,
    };
  }

  private resolveBiomeMap(context: RoomGenerationContext): void {
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

  private resolveMultiRoomStructures(context: RoomGenerationContext): void {
    context.townMembership = this.structureResolver.getTownMembership(context.roomId);
    context.townAdjacency = context.townMembership
      ? null
      : this.structureResolver.getTownAdjacency(context.roomId);
  }

  private applyBiomeBaseTerrain(context: RoomGenerationContext): void {
    if (
      context.isMosaicCoast &&
      !context.town &&
      !context.townPerimeter &&
      !context.townMembership &&
      !context.townAdjacency
    ) {
      this.mosaicCoastOperations.fillMosaicCoastRoom(context);
    } else if (context.isOcean) {
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

  private applyRoomArchetype(context: RoomGenerationContext): void {
    if (context.isMosaicCoast) {
      return;
    }
    new RoomArchetypeOperations(
      this.config,
      createRng(
        `${this.worldGenerationIdentity.seed}:archetypes:${this.worldGenerationIdentity.worldSalt}:${context.roomId}`,
      ),
    ).apply(context);
  }

  private placeCrossRoomFeatures(context: RoomGenerationContext): void {
    if (context.isMosaicCoast) {
      this.mosaicCoastOperations.placeDistrictContinuity(context);
      return;
    }
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

  private placeRoomStructures(context: RoomGenerationContext): void {
    if (
      context.isMosaicCoast &&
      !context.town &&
      !context.townPerimeter &&
      !context.townMembership &&
      !context.townAdjacency
    ) {
      return;
    }
    new StructureOperations(
      this.config,
      createRng(
        `${this.worldGenerationIdentity.seed}:structures:${this.worldGenerationIdentity.structureSalt}:${context.roomId}`,
      ),
      this.structureResolver,
    ).place(context);
  }

  private validateRoomSafety(context: RoomGenerationContext): void {
    this.safetyOperations.validate(context);
    if (context.isMosaicCoast) {
      this.mosaicCoastOperations.refreshExposureFromLayout(context);
    }
  }
}
