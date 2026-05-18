import { createHouseRoom } from '../houseRoom.js';
import type { RoomSnapshot } from '../types.js';
import type { GridConfig } from '../../config/gameConfig.js';
import {
  BaseTerrainStage,
  BiomeMapStage,
  CrossRoomFeatureStage,
  MultiRoomStructureStage,
  PortalStage,
  RandomObstacleStage,
  RoomArchetypeStage,
  SafetyValidationStage,
  StructureStage,
} from './stages/currentRoomStages.js';
import type { RoomGenerationOperations, RoomGenerationStage } from './types.js';

export class RoomGenerationPipeline {
  private readonly stages: RoomGenerationStage[];

  constructor(private readonly operations: RoomGenerationOperations) {
    this.stages = [
      new BiomeMapStage(operations),
      new MultiRoomStructureStage(operations),
      new BaseTerrainStage(operations),
      new RoomArchetypeStage(operations),
      new CrossRoomFeatureStage(operations),
      new StructureStage(operations),
      new RandomObstacleStage(operations),
      new PortalStage(operations),
      new SafetyValidationStage(operations),
    ];
  }

  generate(roomId: string, grid: GridConfig): RoomSnapshot {
    // Keep the home interior as a special room while the rest of generation moves into stages.
    if (roomId === '0,-1,0') {
      return createHouseRoom(roomId, grid);
    }

    const context = this.operations.createGenerationContext(roomId, grid);
    for (const stage of this.stages) {
      stage.apply(context);
    }
    return this.operations.finalizeGenerationContext(context);
  }
}
