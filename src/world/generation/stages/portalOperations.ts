import type { WorldConfig } from "../../../config/gameConfig.js";
import type { RandomGenerator } from "../../../core/rng.js";
import type { RoomGenerationContext } from "../types.js";

export class PortalOperations {
  constructor(
    private readonly config: WorldConfig,
    private readonly rng: RandomGenerator
  ) {}

  place(context: RoomGenerationContext): void {
    if (!this.config.ladder.enabled || this.rng() >= this.config.ladder.chance) {
      return;
    }

    let ladderPlaced = false;
    for (let attempts = 0; attempts < 50 && !ladderPlaced; attempts++) {
      const ladderWidth = context.grid.cols - this.config.obstacles.margin * 2;
      const ladderHeight = context.grid.rows - this.config.obstacles.margin * 2;
      if (ladderWidth <= 0 || ladderHeight <= 0) {
        break;
      }
      const ladderX = this.config.obstacles.margin + this.randomInt(ladderWidth);
      const ladderY = this.config.obstacles.margin + this.randomInt(ladderHeight);
      if (!context.canvas.isEmpty(ladderX, ladderY)) {
        continue;
      }
      context.canvas.set(ladderX, ladderY, "H");
      context.portals.push(this.createPortal(context.roomId, ladderX, ladderY));
      ladderPlaced = true;
    }
  }

  private createPortal(roomId: string, x: number, y: number) {
    const [roomX, roomY, roomZ = 0] = roomId.split(",").map(Number);
    const offset = this.config.ladder.verticalOffset;
    const destZ = roomZ + (this.rng() < 0.5 ? offset : -offset);
    return {
      x,
      y,
      destRoomId: `${roomX},${roomY},${destZ}`,
      destX: x,
      destY: y,
    };
  }

  private randomInt(maxExclusive: number): number {
    return Math.floor(this.rng() * maxExclusive);
  }
}
