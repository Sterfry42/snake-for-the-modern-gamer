import { createHouseRoom } from '../houseRoom.js';
import type { RoomSnapshot } from '../types.js';
import type { RoomGenerationOperations } from './types.js';

export class RoomGenerationPipeline {
  constructor(private readonly operations: RoomGenerationOperations) {}

  generate(roomId: string): RoomSnapshot {
    // Keep the home interior as a special room while the rest of generation moves through the pipeline.
    if (roomId === '0,-1,0') {
      return createHouseRoom(roomId, this.operations.grid);
    }

    const context = this.operations.createGenerationContext(roomId);
    this.operations.resolveBiomeMap(context);
    this.operations.resolveMultiRoomStructures(context);
    this.operations.applyBiomeBaseTerrain(context);
    this.operations.applyRoomArchetype(context);
    this.operations.placeCrossRoomFeatures(context);
    this.operations.placeRoomStructures(context);
    this.operations.placeRandomObstacles(context);
    this.operations.placeVegetation(context);
    this.operations.placePortals(context);
    this.operations.validateRoomSafety(context);
    return this.operations.finalizeGenerationContext(context);
  }
}
