import { vectorKey } from '../../../core/math.js';
import type { WorldConfig } from '../../../config/gameConfig.js';
import type { RandomGenerator } from '../../../core/rng.js';
import type { RoomGenerationContext } from '../types.js';

export class RandomObstacleOperations {
  constructor(
    private readonly config: WorldConfig,
    private readonly rng: RandomGenerator,
  ) {}

  place(context: RoomGenerationContext): void {
    if (
      context.archetype?.suppressRandomObstacles ||
      context.townMembership ||
      context.townAdjacency
    ) {
      return;
    }

    const numObstacles =
      context.isOcean || context.isDenseForest
        ? 0
        : this.randomIntInRange(
            this.config.obstacles.count.min,
            this.config.obstacles.count.max + 1,
          );

    for (let i = 0; i < numObstacles; i++) {
      const obstacleWidth = this.randomIntInRange(
        this.config.obstacles.width.min,
        this.config.obstacles.width.max + 1,
      );
      const obstacleHeight = this.randomIntInRange(
        this.config.obstacles.height.min,
        this.config.obstacles.height.max + 1,
      );

      const maxX = context.grid.cols - obstacleWidth - this.config.obstacles.margin * 2;
      const maxY = context.grid.rows - obstacleHeight - this.config.obstacles.margin * 2;
      if (maxX <= 0 || maxY <= 0) {
        continue;
      }

      const x = this.config.obstacles.margin + this.randomInt(maxX);
      const y = this.config.obstacles.margin + this.randomInt(maxY);

      for (let row = y; row < y + obstacleHeight; row++) {
        for (let col = x; col < x + obstacleWidth; col++) {
          if (context.layout[row]?.[col] !== '.') {
            continue;
          }
          const key = vectorKey({ x: col, y: row });
          if (context.spawnGuard?.protected.has(key) || context.protectedCells?.has(key)) {
            continue;
          }
          context.canvas.set(col, row, '#');
        }
      }
    }
  }

  private randomInt(maxExclusive: number): number {
    return Math.floor(this.rng() * maxExclusive);
  }

  private randomIntInRange(minInclusive: number, maxExclusive: number): number {
    return minInclusive + this.randomInt(Math.max(1, maxExclusive - minInclusive));
  }
}
