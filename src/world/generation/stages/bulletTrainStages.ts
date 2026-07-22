import type { RoomGenerationContext } from '../types.js';
import type { RoomGenerationStage } from '../types.js';

/**
 * Bullet train station placement stage.
 *
 * This stage is a placeholder in the generation pipeline. Actual station
 * stamping is handled by WorldService.stampBulletTrainStation() after room
 * generation, using pre-computed placements from BulletTrainStructureResolver.
 *
 * Keeping this stage in the pipeline gives us a stable hook point for future
 * per-room bullet train logic (e.g., special Jade Peak archetypes).
 */
export class BulletTrainStationStage implements RoomGenerationStage {
  readonly id = 'bullet-train-station';

  apply(context: RoomGenerationContext): void {
    void context;
    // No-op. Station stamping is deferred to WorldService.
  }
}
