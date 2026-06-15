import type { BlockData, ChunkKey } from './types.js';
import type SnakeScene from '../scenes/snakeScene.js';
import { CHUNK_SIZE, RENDER_DISTANCE } from './config.js';
import { ChunkManager, chunkSeed } from './chunk.js';
import {
  isMinecraftBlockType,
  blockIdToColor,
  isSolidBlock,
  getBlockType,
} from './blockRegistry.js';

export class MinecraftRenderLayer {
  private graphics: Phaser.GameObjects.Graphics;
  private chunkManager: ChunkManager;
  private highlightGraphics: Phaser.GameObjects.Graphics | null = null;
  private hoveredBlockX: number = -1;
  private hoveredBlockY: number = -1;
  private readonly textureCache: Map<string, string> = new Map();

  constructor(scene: SnakeScene, chunkManager: ChunkManager) {
    this.chunkManager = chunkManager;
   this.graphics = scene.add.graphics().setDepth(3);
    this.graphics.setBlendMode(Phaser.BlendModes.NORMAL);
    this.highlightGraphics = scene.add.graphics().setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
  }

  setHoveredBlock(x: number, y: number): void {
    if (x === this.hoveredBlockX && y === this.hoveredBlockY) return;
    this.hoveredBlockX = x;
    this.hoveredBlockY = y;
  }

  render(scene: SnakeScene): void {
    this.graphics.clear();
    this.highlightGraphics?.clear();

    const snakeBody = scene.snakeGame.getSnakeBody();
    if (snakeBody.length === 0) return;

    const head = snakeBody[0];
    const [roomX, roomY] = this.parseRoomCoordinates(scene.snakeGame.getCurrentRoom().id);
    const centerX = head.x - roomX * scene.grid.cols + scene.grid.cell / 2;
    const centerY = head.y - roomY * scene.grid.rows + scene.grid.cell / 2;

    const chunks = this.chunkManager.getBlocksInRange(
      scene.snakeGame.getCurrentRoom().id,
      centerX,
      centerY,
      RENDER_DISTANCE,
    );

    for (const block of chunks) {
      if (!isMinecraftBlockType(block.type)) continue;

      const colorStr = blockIdToColor(block.type);
      const color = hexToNumber(colorStr);
      const x = block.x * scene.grid.cell;
      const y = block.y * scene.grid.cell;
      const cellSize = scene.grid.cell;

      const blockDef = getBlockType(block.type);
      const isLight = blockDef?.kind === 'light';

      if (isLight) {
        this.graphics.fillStyle(0x000000, 0.5);
        this.graphics.fillRect(x, y, cellSize, cellSize);
      }

      this.graphics.fillStyle(color, 0.35);
      this.graphics.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

      const darkColor = hexToNumber(darkenColorStr(colorStr, 0.3));
      this.graphics.lineStyle(1, darkColor, 0.35);
      this.graphics.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);

      const lightColorStr = lightenColorStr(colorStr, 0.15);
      this.graphics.fillStyle(hexToNumber(lightColorStr), 0.15);
      this.graphics.fillRect(x + 1, y + 1, cellSize - 2, 2);

      if (isSolidBlock(block.type)) {
        this.graphics.fillStyle(hexToNumber(darkenColorStr(colorStr, 0.15)), 0.2);
        this.graphics.fillRect(x + 1, y + cellSize - 3, cellSize - 2, 2);
      }

      // Highlight hovered block
      if (block.x === this.hoveredBlockX && block.y === this.hoveredBlockY) {
        this.highlightGraphics?.lineStyle(2, 0xffffff, 0.6);
        this.highlightGraphics?.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
      }
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.highlightGraphics?.destroy();
  }

  private parseRoomCoordinates(roomId: string): [number, number] {
    if (roomId.startsWith('cave:')) return [0, 0];
    const parts = roomId.split(',').map(Number);
    return [parts[0] ?? 0, parts[1] ?? 0];
  }
}

function hexToNumber(hex: string): number {
  const clean = hex.replace('#', '');
  return parseInt(clean, 16);
}

function darkenColorStr(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const newR = Math.floor(r * (1 - factor));
  const newG = Math.floor(g * (1 - factor));
  const newB = Math.floor(b * (1 - factor));
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function lightenColorStr(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
  const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
  const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
  return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
}
