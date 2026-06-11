import Phaser from 'phaser';

import type { UiRect } from './UiLayout.js';

export interface UiScrollPanelOptions {
  scene: Phaser.Scene;
  parent: Phaser.GameObjects.Container;
  rect: UiRect;
  contentHeight?: number;
  railColor: number;
  thumbColor: number;
}

export class UiScrollPanel {
  readonly content: Phaser.GameObjects.Container;

  private readonly scene: Phaser.Scene;
  private readonly parent: Phaser.GameObjects.Container;
  private readonly rect: UiRect;
  private readonly maskGraphics: Phaser.GameObjects.Graphics;
  private readonly railGraphics: Phaser.GameObjects.Graphics;
  private contentHeight: number;
  private offset = 0;
  private railColor: number;
  private thumbColor: number;

  constructor(options: UiScrollPanelOptions) {
    this.scene = options.scene;
    this.parent = options.parent;
    this.rect = { ...options.rect };
    this.contentHeight = options.contentHeight ?? options.rect.height;
    this.railColor = options.railColor;
    this.thumbColor = options.thumbColor;
    this.content = this.scene.add.container(this.rect.x, this.rect.y);
    this.maskGraphics = this.scene.add.graphics().setVisible(false);
    this.railGraphics = this.scene.add.graphics();
    this.rebuildMask();
    this.content.setMask(this.maskGraphics.createGeometryMask());
    this.parent.add([this.content, this.railGraphics]);
    this.redrawRail();
  }

  destroy(): void {
    this.content.destroy(true);
    this.maskGraphics.destroy();
    this.railGraphics.destroy();
  }

  setContentHeight(height: number): void {
    this.contentHeight = Math.max(this.rect.height, height);
    this.setOffset(this.offset);
  }

  setOffset(offset: number): void {
    const maxOffset = Math.max(0, this.contentHeight - this.rect.height);
    this.offset = Phaser.Math.Clamp(offset, 0, maxOffset);
    this.content.setY(this.rect.y - this.offset);
    this.redrawRail();
  }

  scrollBy(delta: number): void {
    this.setOffset(this.offset + delta);
  }

  getOffset(): number {
    return this.offset;
  }

  getMaxOffset(): number {
    return Math.max(0, this.contentHeight - this.rect.height);
  }

  containsWorldPoint(x: number, y: number): boolean {
    const parentX = this.parent.x;
    const parentY = this.parent.y;
    return (
      x >= parentX + this.rect.x &&
      x <= parentX + this.rect.x + this.rect.width &&
      y >= parentY + this.rect.y &&
      y <= parentY + this.rect.y + this.rect.height
    );
  }

  private rebuildMask(): void {
    this.maskGraphics.clear();
    this.maskGraphics
      .fillStyle(0xffffff, 1)
      .fillRect(
        this.parent.x + this.rect.x,
        this.parent.y + this.rect.y,
        this.rect.width,
        this.rect.height,
      );
  }

  private redrawRail(): void {
    this.railGraphics.clear();
    if (this.contentHeight <= this.rect.height) {
      return;
    }
    const railX = this.rect.x + this.rect.width - 6;
    const railY = this.rect.y + 4;
    const railH = this.rect.height - 8;
    const thumbH = Math.max(22, (this.rect.height / this.contentHeight) * railH);
    const thumbTravel = Math.max(1, railH - thumbH);
    const thumbY = railY + (this.offset / Math.max(1, this.getMaxOffset())) * thumbTravel;
    this.railGraphics.fillStyle(this.railColor, 0.5).fillRoundedRect(railX, railY, 3, railH, 2);
    this.railGraphics
      .fillStyle(this.thumbColor, 0.9)
      .fillRoundedRect(railX - 1, thumbY, 5, thumbH, 2);
  }
}
