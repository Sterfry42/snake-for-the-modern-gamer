import Phaser from "phaser";
import { paletteConfig, darkenColor } from "../config/palette.js";
import type { GridConfig, SnakeState } from "../systems/snakeState.js";
import type { Room } from "../systems/world.js";

const SNAKE_OUTLINE_ALPHA = 0.9;
const SNAKE_OUTLINE_WIDTH = 1;
const LADDER_OUTLINE_ALPHA = 0.8;
const LADDER_OUTLINE_WIDTH = 1;
const APPLE_OUTLINE_ALPHA = 0.85;
const APPLE_OUTLINE_WIDTH = 1;

export class SnakeRenderer {
  constructor(
    private readonly graphics: Phaser.GameObjects.Graphics,
    private readonly grid: GridConfig
  ) {}

  render(room: Room, state: SnakeState): void {
    this.graphics.clear();
    this.graphics.clearMask();

    this.drawRoom(room);
    this.drawGrid();
    this.drawApple(room);
    this.drawSnake(room, state);
  }

  private drawRoom(room: Room): void {
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

  private drawGrid(): void {
    this.graphics.lineStyle(1, paletteConfig.grid.color, paletteConfig.grid.alpha);
    for (let x = 0; x <= this.grid.cols; x++) {
      this.graphics.lineBetween(
        x * this.grid.cell,
        0,
        x * this.grid.cell,
        this.grid.rows * this.grid.cell
      );
    }
    for (let y = 0; y <= this.grid.rows; y++) {
      this.graphics.lineBetween(
        0,
        y * this.grid.cell,
        this.grid.cols * this.grid.cell,
        y * this.grid.cell
      );
    }
  }

  private drawApple(room: Room): void {
    const apple = room.apple;
    if (!apple) return;

    const appleColor = paletteConfig.apple.color;
    const appleOutlineColor = darkenColor(appleColor, paletteConfig.apple.outlineDarkenFactor);

    const x = apple.x * this.grid.cell;
    const y = apple.y * this.grid.cell;
    this.graphics.fillStyle(appleColor, 1);
    this.graphics.fillRect(x, y, this.grid.cell, this.grid.cell);

    this.graphics.lineStyle(APPLE_OUTLINE_WIDTH, appleOutlineColor, APPLE_OUTLINE_ALPHA);
    this.graphics.strokeRect(x + 0.5, y + 0.5, this.grid.cell - 1, this.grid.cell - 1);
  }

  private drawSnake(room: Room, state: SnakeState): void {
    const [currentRoomX, currentRoomY] = state.currentRoomId.split(",").map(Number);
    const outlineColor = darkenColor(
      paletteConfig.snake.bodyColor,
      paletteConfig.snake.outlineDarkenFactor
    );
    state.body.forEach((segment, index) => {
      const localX = segment.x - currentRoomX * this.grid.cols;
      const localY = segment.y - currentRoomY * this.grid.rows;
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