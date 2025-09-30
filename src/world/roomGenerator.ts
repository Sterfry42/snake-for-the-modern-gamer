import { paletteConfig, darkenColor, randomBackgroundColor } from "../config/palette.js";
import type { GridConfig, WorldConfig } from "../config/gameConfig.js";
import { vectorKey } from "../core/math.js";
import type { RandomGenerator } from "../core/rng.js";
import type { RoomSnapshot } from "./types.js";

export class RoomGenerator {
  constructor(
    private readonly config: WorldConfig,
    private readonly rng: RandomGenerator
  ) {}

  generate(roomId: string, grid: GridConfig): RoomSnapshot {
    const layout = Array.from({ length: grid.rows }, () => Array(grid.cols).fill("."));
    const portals: RoomSnapshot["portals"] = [];
    const backgroundColor = randomBackgroundColor(this.rng);
    const wallColor = darkenColor(backgroundColor, paletteConfig.wall.darkenFactor);
    const wallOutlineColor = darkenColor(wallColor, paletteConfig.wall.outlineDarkenFactor);

    const spawnGuard = this.createSpawnGuard(roomId);

    const numObstacles = this.randomIntInRange(
      this.config.obstacles.count.min,
      this.config.obstacles.count.max + 1
    );

    for (let i = 0; i < numObstacles; i++) {
      const obstacleWidth = this.randomIntInRange(
        this.config.obstacles.width.min,
        this.config.obstacles.width.max + 1
      );
      const obstacleHeight = this.randomIntInRange(
        this.config.obstacles.height.min,
        this.config.obstacles.height.max + 1
      );

      const maxX = grid.cols - obstacleWidth - this.config.obstacles.margin * 2;
      const maxY = grid.rows - obstacleHeight - this.config.obstacles.margin * 2;
      if (maxX <= 0 || maxY <= 0) {
        continue;
      }

      const x = this.config.obstacles.margin + this.randomInt(maxX);
      const y = this.config.obstacles.margin + this.randomInt(maxY);

      for (let row = y; row < y + obstacleHeight; row++) {
        for (let col = x; col < x + obstacleWidth; col++) {
          if (spawnGuard?.protected.has(vectorKey({ x: col, y: row }))) {
            continue;
          }
          layout[row][col] = "#";
        }
      }
    }

    if (this.config.ladder.enabled && this.rng() < this.config.ladder.chance) {
      let ladderPlaced = false;
      for (let attempts = 0; attempts < 50 && !ladderPlaced; attempts++) {
        const ladderWidth = grid.cols - this.config.obstacles.margin * 2;
        const ladderHeight = grid.rows - this.config.obstacles.margin * 2;
        if (ladderWidth <= 0 || ladderHeight <= 0) {
          break;
        }
        const ladderX = this.config.obstacles.margin + this.randomInt(ladderWidth);
        const ladderY = this.config.obstacles.margin + this.randomInt(ladderHeight);
        if (layout[ladderY]?.[ladderX] === "#") {
          continue;
        }
        layout[ladderY][ladderX] = "H";
        portals.push(this.createPortal(roomId, ladderX, ladderY));
        ladderPlaced = true;
      }
    }

    spawnGuard?.clear(layout);

    return {
      id: roomId,
      layout: layout.map((row) => row.join("")),
      portals,
      backgroundColor,
      wallColor,
      wallOutlineColor,
    };
  }

  private randomInt(maxExclusive: number): number {
    return Math.floor(this.rng() * maxExclusive);
  }

  private randomIntInRange(minInclusive: number, maxExclusive: number): number {
    return minInclusive + this.randomInt(Math.max(1, maxExclusive - minInclusive));
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

  private createSpawnGuard(roomId: string) {
    if (!this.config.spawnGuard.enabled) {
      return null;
    }
    if (roomId !== this.config.originRoomId) {
      return null;
    }

    const protectedCells = new Set<string>(
      this.config.spawnGuard.safeCells.map((cell) => vectorKey(cell))
    );

    return {
      protected: protectedCells,
      clear(layout: string[][]) {
        for (const key of protectedCells) {
          const [col, row] = key.split(",").map(Number);
          if (layout[row]?.[col] === "#") {
            layout[row][col] = ".";
          }
        }
      },
    };
  }
}
