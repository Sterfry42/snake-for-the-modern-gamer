// Companion renderer — handles rendering companion sprites on the game grid.
// Creatures trail behind the snake head at offset positions.

import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import type { CompanionRenderData } from '../companions/companionTypes.js';
import { RuntimeSpriteFactory } from './runtimeSpriteFactory.js';

/**
 * Manages companion sprite creation, positioning, and cleanup.
 * Called by the companion service each frame to update positions.
 */
export class CompanionRenderer {
  private readonly scene: SnakeScene;
  private readonly spriteFactory: RuntimeSpriteFactory;
  private readonly companionSprites = new Map<string, Phaser.GameObjects.Sprite>();

  constructor(scene: SnakeScene) {
    this.scene = scene;
    this.spriteFactory = new RuntimeSpriteFactory(scene);
  }

  /**
   * Create a sprite for a companion and add it to the scene.
   * The sprite uses the creature's sprite recipe for rendering.
   */
  createCompanionSprite(
    companionId: string,
    spriteRecipeId: string,
    size: number,
  ): Phaser.GameObjects.Sprite {
    const existing = this.companionSprites.get(companionId);
    if (existing) {
      return existing;
    }

    const displaySize = Math.round(24 * size);

    // Create a simple graphics texture for the creature sprite
    const textureKey = `companion-sprite:${spriteRecipeId}:${displaySize}`;
    if (!this.scene.textures.exists(textureKey)) {
      const texture = this.scene.textures.createCanvas(textureKey, displaySize, displaySize);
      const ctx = texture.getContext();
      this.drawCreatureShape(ctx, spriteRecipeId, displaySize);
      texture.refresh();
    }

    const sprite = this.scene.add.sprite(0, 0, textureKey);
    sprite.setDisplaySize(displaySize, displaySize);
    sprite.setOrigin(0.5, 0.5);
    sprite.setDepth(5); // Below snake body (depth 10)

    this.companionSprites.set(companionId, sprite);
    return sprite;
  }

  /**
   * Update all companion sprite positions based on snake head position.
   * Calculates follow offsets and interpolates toward target positions.
   */
  updateRenderData(renderData: CompanionRenderData[]): void {
    const head = (this.scene as any).snake?.head ?? null;
    if (!head) return;

    const headX = head.x * 24 + 12;
    const headY = head.y * 24 + 12;
    const gridWidth = (this.scene as any).config?.grid?.cols ?? 32;

    // Sort followers by follow index for consistent positioning
    const followers = renderData
      .filter((r) => r.followIndex >= 0)
      .sort((a, b) => a.followIndex - b.followIndex);

    // Non-followers (protectors, fighters, etc.) stay at their grid position
    for (const data of renderData) {
      if (data.followIndex < 0) {
        const targetX = data.gridX * 24 + 12;
        const targetY = data.gridY * 24 + 12;
     data.sprite.x = data.sprite.x + (targetX - data.sprite.x) * 0.15;
      data.sprite.y = data.sprite.y + (targetY - data.sprite.y) * 0.15;
      }
    }

    // Followers trail behind snake head
    for (let i = 0; i < followers.length; i++) {
      const data = followers[i];
      const offset = i * 28;

      // Position behind snake head (opposite of movement direction)
      const dir = (this.scene as any).snake?.directionVector ?? { x: 1, y: 0 };
      const targetX = headX - dir.x * offset;
      const targetY = headY - dir.y * offset;

      data.sprite.x = data.sprite.x + (targetX - data.sprite.x) * 0.12;
      data.sprite.y = data.sprite.y + (targetY - data.sprite.y) * 0.12;

      // Flip sprite based on direction
      if (dir.x !== 0) {
        data.sprite.setFlipX(dir.x < 0);
      }
    }
  }

  /**
   * Clear all companion sprites.
   */
  clear(): void {
    for (const [id, sprite] of this.companionSprites) {
      sprite.destroy();
    }
    this.companionSprites.clear();
  }

  /**
   * Get a sprite by companion ID, or undefined if not found.
   */
  getSprite(companionId: string): Phaser.GameObjects.Sprite | undefined {
    return this.companionSprites.get(companionId);
  }

  /**
   * Draw a basic creature shape on a canvas context.
   */
  private drawCreatureShape(
    ctx: CanvasRenderingContext2D,
    spriteRecipeId: string,
    size: number,
  ): void {
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.35;

    // Body
    ctx.fillStyle = '#9ad1ff';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#4da3ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.2, r * 0.2, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.3, cy - r * 0.2, r * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1b1f2a';
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.2, r * 0.1, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.35, cy - r * 0.2, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}
