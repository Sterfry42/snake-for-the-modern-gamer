import type { WorldConfig } from '../../../config/gameConfig.js';
import type { RandomGenerator } from '../../../core/rng.js';
import type { RoomGenerationContext } from '../types.js';
import { isOrdinaryPortalDestinationAllowed } from '../../hellDepth.js';

export function placePortals(
  context: RoomGenerationContext,
  config: WorldConfig,
  rng: RandomGenerator,
): void {
  if (context.townMembership || context.townAdjacency) {
    return;
  }
  if (!config.ladder.enabled || rng() >= config.ladder.chance) {
    return;
  }

  let ladderPlaced = false;
  for (let attempts = 0; attempts < 50 && !ladderPlaced; attempts++) {
    const ladderWidth = context.grid.cols - config.obstacles.margin * 2;
    const ladderHeight = context.grid.rows - config.obstacles.margin * 2;
    if (ladderWidth <= 0 || ladderHeight <= 0) {
      break;
    }
    const ladderX = config.obstacles.margin + randomInt(rng, ladderWidth);
    const ladderY = config.obstacles.margin + randomInt(rng, ladderHeight);
    if (!context.canvas.isEmpty(ladderX, ladderY)) {
      continue;
    }
    const portal = createPortal(context.roomId, ladderX, ladderY, config, rng);
    if (!isOrdinaryPortalDestinationAllowed(portal.destRoomId)) {
      continue;
    }
    context.canvas.set(ladderX, ladderY, 'H');
    context.portals.push(portal);
    ladderPlaced = true;
  }
}

function createPortal(
  roomId: string,
  x: number,
  y: number,
  config: WorldConfig,
  rng: RandomGenerator,
) {
  const [roomX, roomY, roomZ = 0] = roomId.split(',').map(Number);
  const offset = config.ladder.verticalOffset;
  const destZ = roomZ + (rng() < 0.5 ? offset : -offset);
  return {
    x,
    y,
    destRoomId: `${roomX},${roomY},${destZ}`,
    destX: x,
    destY: y,
  };
}

function randomInt(rng: RandomGenerator, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}
