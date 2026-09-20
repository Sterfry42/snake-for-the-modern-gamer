import { vectorKey } from '../../../core/math.js';
import type { WorldConfig } from '../../../config/gameConfig.js';
import type { RandomGenerator } from '../../../core/rng.js';
import type { RoomGenerationContext } from '../types.js';

export function placeRandomObstacles(
  context: RoomGenerationContext,
  config: WorldConfig,
  rng: RandomGenerator,
): void {
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
      : randomIntInRange(rng, config.obstacles.count.min, config.obstacles.count.max + 1);

  for (let i = 0; i < numObstacles; i++) {
    const obstacleWidth = randomIntInRange(
      rng,
      config.obstacles.width.min,
      config.obstacles.width.max + 1,
    );
    const obstacleHeight = randomIntInRange(
      rng,
      config.obstacles.height.min,
      config.obstacles.height.max + 1,
    );

    const maxX = context.grid.cols - obstacleWidth - config.obstacles.margin * 2;
    const maxY = context.grid.rows - obstacleHeight - config.obstacles.margin * 2;
    if (maxX <= 0 || maxY <= 0) {
      continue;
    }

    const x = config.obstacles.margin + randomInt(rng, maxX);
    const y = config.obstacles.margin + randomInt(rng, maxY);

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

function randomInt(rng: RandomGenerator, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

function randomIntInRange(
  rng: RandomGenerator,
  minInclusive: number,
  maxExclusive: number,
): number {
  return minInclusive + randomInt(rng, Math.max(1, maxExclusive - minInclusive));
}
