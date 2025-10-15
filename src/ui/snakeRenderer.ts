import Phaser from "phaser";
import { paletteConfig, darkenColor } from "../config/palette.js";
import type { GridConfig } from "../config/gameConfig.js";
import type { Vector2Like } from "../core/math.js";
import type { RoomSnapshot } from "../world/types.js";
import type { AppleSnapshot } from "../apples/types.js";

const SNAKE_OUTLINE_ALPHA = 0.9;
const SNAKE_OUTLINE_WIDTH = 1;
const LADDER_OUTLINE_ALPHA = 0.8;
const LADDER_OUTLINE_WIDTH = 1;
const APPLE_OUTLINE_ALPHA = 0.85;
const APPLE_OUTLINE_WIDTH = 1;

interface SnakeRenderOptions {
  wallSenseRadius?: number;
}

export class SnakeRenderer {
  constructor(
    private readonly graphics: Phaser.GameObjects.Graphics,
    private readonly grid: GridConfig
  ) {}

  getWorldPosition(position: Vector2Like, currentRoomId: string): { x: number; y: number } {
    const [roomX, roomY] = currentRoomId.split(",").map(Number);
    const localX = position.x - roomX * this.grid.cols;
    const localY = position.y - roomY * this.grid.rows;

    return {
      x: localX * this.grid.cell,
      y: localY * this.grid.cell,
    };
  }

  render(
    room: RoomSnapshot,
    snakeBody: readonly Vector2Like[],
    currentRoomId: string,
    appleInfo?: AppleSnapshot | null,
    options: SnakeRenderOptions = {}
  ): void {
    this.graphics.clear();
    this.graphics.clearMask();

    const opts = options ?? {};

    this.drawRoom(room);
    this.highlightWalls(room, snakeBody, currentRoomId, opts.wallSenseRadius ?? 0);
    this.drawGrid();
    this.drawApple(room, appleInfo ?? undefined);
    this.drawTreasure(room);
    this.drawSnake(room, snakeBody, currentRoomId);
  }

  private drawRoom(room: RoomSnapshot): void {
    const ladderOutlineColor = darkenColor(
      paletteConfig.ladder.color,
      paletteConfig.ladder.outlineDarkenFactor
    );
    for (let y = 0; y < room.layout.length; y++) {
      for (let x = 0; x < room.layout[y].length; x++) {
        const tile = room.layout[y][x];
        const rectX = x * this.grid.cell;
        const rectY = y * this.grid.cell;
        if (tile === "#") {
          this.graphics.fillStyle(room.wallColor, 1);
          this.graphics.fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
          this.graphics.lineStyle(2, room.wallOutlineColor, 0.85);
          this.graphics.strokeRect(rectX, rectY, this.grid.cell, this.grid.cell);
        } else if (tile === "H") {
          this.graphics.fillStyle(paletteConfig.ladder.color, 1);
          this.graphics.fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
          this.graphics.lineStyle(LADDER_OUTLINE_WIDTH, ladderOutlineColor, LADDER_OUTLINE_ALPHA);
          this.graphics.strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
        } else {
          this.graphics.fillStyle(room.backgroundColor, 1);
          this.graphics.fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
        }
      }
    }
  }

  private highlightWalls(
    room: RoomSnapshot,
    snakeBody: readonly Vector2Like[],
    currentRoomId: string,
    radius: number
  ): void {
    if (radius <= 0 || snakeBody.length === 0) {
      return;
    }
    const head = snakeBody[0];
    const [roomX, roomY] = currentRoomId.split(",").map(Number);
    const localHeadX = head.x - roomX * this.grid.cols;
    const localHeadY = head.y - roomY * this.grid.rows;
    if (
      localHeadX < 0 ||
      localHeadX >= this.grid.cols ||
      localHeadY < 0 ||
      localHeadY >= this.grid.rows
    ) {
      return;
    }

    const now = (this.graphics.scene as Phaser.Scene).time?.now ?? performance.now();
    const pulse = 0.8 + 0.2 * Math.sin(now / 240);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const targetX = localHeadX + dx;
        const targetY = localHeadY + dy;
        if (
          targetX < 0 ||
          targetX >= this.grid.cols ||
          targetY < 0 ||
          targetY >= this.grid.rows
        ) {
          continue;
        }
        const tile = room.layout[targetY]?.[targetX];
        if (tile !== "#") {
          continue;
        }
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance > radius) {
          continue;
        }
        const alpha = Math.max(0.1, (0.28 - 0.05 * distance) * pulse);
        this.graphics.fillStyle(0x4da3ff, alpha);
        this.graphics.fillRect(
          targetX * this.grid.cell,
          targetY * this.grid.cell,
          this.grid.cell,
          this.grid.cell
        );
      }
    }
  }

  private drawGrid(): void {
    this.graphics.lineStyle(1, paletteConfig.grid.color, paletteConfig.grid.alpha);
    const width = this.grid.cols * this.grid.cell;
    const height = this.grid.rows * this.grid.cell;
    for (let x = 0; x <= this.grid.cols; x++) {
      const px = Math.min(width - 0.5, x * this.grid.cell + 0.5);
      this.graphics.lineBetween(px, 0.5, px, height - 0.5);
    }
    for (let y = 0; y <= this.grid.rows; y++) {
      const py = Math.min(height - 0.5, y * this.grid.cell + 0.5);
      this.graphics.lineBetween(0.5, py, width - 0.5, py);
    }
  }

  private drawApple(room: RoomSnapshot, appleInfo?: AppleSnapshot): void {
    const apple = room.apple;
    if (!apple) return;

    const appleColor = appleInfo?.color ?? paletteConfig.apple.colors.normal;
    const appleOutlineColor = darkenColor(appleColor, paletteConfig.apple.outlineDarkenFactor);

    const x = apple.x * this.grid.cell;
    const y = apple.y * this.grid.cell;
    this.graphics.fillStyle(appleColor, 1);
    this.graphics.fillRect(x, y, this.grid.cell, this.grid.cell);

    this.graphics.lineStyle(APPLE_OUTLINE_WIDTH, appleOutlineColor, APPLE_OUTLINE_ALPHA);
    this.graphics.strokeRect(x + 0.5, y + 0.5, this.grid.cell - 1, this.grid.cell - 1);

    const shieldDirs = this.extractShieldDirs(appleInfo);
    if (shieldDirs) {
      this.drawShieldIndicators(x, y, shieldDirs);
    }
  }

  private drawTreasure(room: RoomSnapshot): void {
    const spot = room.treasure;
    if (!spot) return;
    const x = spot.x * this.grid.cell;
    const y = spot.y * this.grid.cell;
    const color = 0x9ad1ff; // bright blue for treasure
    const outline = darkenColor(color, 0.35);
    this.graphics.fillStyle(color, 1).fillRect(x, y, this.grid.cell, this.grid.cell);
    this.graphics.lineStyle(1, outline, 0.9).strokeRect(x + 0.5, y + 0.5, this.grid.cell - 1, this.grid.cell - 1);
  }

  private extractShieldDirs(appleInfo?: AppleSnapshot): Vector2Like[] | undefined {
    if (!appleInfo || appleInfo.typeId !== "shielded") {
      return undefined;
    }
    const dirs = appleInfo.metadata?.protectedDirs as Vector2Like[] | undefined;
    return dirs?.map((dir) => ({ x: dir.x, y: dir.y }));
  }

  private drawShieldIndicators(originX: number, originY: number, dirs: Vector2Like[]) {
    const size = this.grid.cell;
    const shieldColor = 0xffffff;
    this.graphics.fillStyle(shieldColor, 0.6);
    dirs.forEach((dir) => {
      if (dir.x === 1 && dir.y === 0) {
        this.graphics.fillRect(originX + 1, originY + 2, 3, size - 4);
      } else if (dir.x === -1 && dir.y === 0) {
        this.graphics.fillRect(originX + size - 4, originY + 2, 3, size - 4);
      } else if (dir.x === 0 && dir.y === 1) {
        this.graphics.fillRect(originX + 2, originY + 1, size - 4, 3);
      } else if (dir.x === 0 && dir.y === -1) {
        this.graphics.fillRect(originX + 2, originY + size - 4, size - 4, 3);
      }
    });
  }

  private drawSnake(room: RoomSnapshot, snakeBody: readonly Vector2Like[], currentRoomId: string): void {
    const [roomX, roomY] = currentRoomId.split(",").map(Number);
    const outlineColor = darkenColor(
      paletteConfig.snake.bodyColor,
      paletteConfig.snake.outlineDarkenFactor
    );
    snakeBody.forEach((segment, index) => {
      const localX = segment.x - roomX * this.grid.cols;
      const localY = segment.y - roomY * this.grid.rows;
      if (localX < 0 || localX >= this.grid.cols || localY < 0 || localY >= this.grid.rows) {
        return;
      }
      const alpha = Math.max(
        paletteConfig.snake.minAlpha,
        1 - index * paletteConfig.snake.fadeStep
      );
      const x = localX * this.grid.cell;
      const y = localY * this.grid.cell;

      this.graphics.fillStyle(paletteConfig.snake.bodyColor, alpha);
      this.graphics.fillRect(x, y, this.grid.cell, this.grid.cell);

      this.graphics.lineStyle(SNAKE_OUTLINE_WIDTH, outlineColor, SNAKE_OUTLINE_ALPHA);
      this.graphics.strokeRect(x + 0.5, y + 0.5, this.grid.cell - 1, this.grid.cell - 1);
    });
  }
}
