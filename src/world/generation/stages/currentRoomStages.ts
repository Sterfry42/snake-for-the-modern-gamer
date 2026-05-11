import type {
  RoomGenerationContext,
  RoomGenerationOperations,
  RoomGenerationStage,
} from '../types.js';

abstract class CurrentRoomStage implements RoomGenerationStage {
  abstract readonly id: string;

  constructor(protected readonly operations: RoomGenerationOperations) {}

  abstract apply(context: RoomGenerationContext): void;
}

export class BiomeMapStage extends CurrentRoomStage {
  readonly id = 'biome-map';

  apply(context: RoomGenerationContext): void {
    this.operations.resolveBiomeMap(context);
  }
}

export class BaseTerrainStage extends CurrentRoomStage {
  readonly id = 'biome-base-terrain';

  apply(context: RoomGenerationContext): void {
    this.operations.applyBiomeBaseTerrain(context);
  }
}

export class RandomObstacleStage extends CurrentRoomStage {
  readonly id = 'random-obstacles';

  apply(context: RoomGenerationContext): void {
    this.operations.placeRandomObstacles(context);
  }
}

export class RoomArchetypeStage extends CurrentRoomStage {
  readonly id = 'room-archetype';

  apply(context: RoomGenerationContext): void {
    this.operations.applyRoomArchetype(context);
  }
}

export class CrossRoomFeatureStage extends CurrentRoomStage {
  readonly id = 'cross-room-features';

  apply(context: RoomGenerationContext): void {
    this.operations.placeCrossRoomFeatures(context);
  }
}

export class StructureStage extends CurrentRoomStage {
  readonly id = 'room-structures';

  apply(context: RoomGenerationContext): void {
    this.operations.placeRoomStructures(context);
  }
}

export class PortalStage extends CurrentRoomStage {
  readonly id = 'portals';

  apply(context: RoomGenerationContext): void {
    this.operations.placePortals(context);
  }
}

export class SafetyValidationStage extends CurrentRoomStage {
  readonly id = 'safety-validation';

  apply(context: RoomGenerationContext): void {
    this.operations.validateRoomSafety(context);
  }
}
