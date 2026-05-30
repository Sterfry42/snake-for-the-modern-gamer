// Mount UI — displays ride/dismount button when a mount companion is available.

import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import { MountSystem, type MountResult } from '../companions/mountSystem.js';

const BUTTON_WIDTH = 80;
const BUTTON_HEIGHT = 32;
const BUTTON_RADIUS = 6;
const MOUNT_BUTTON_KEY = 'mount-ui-button';

/**
 * UI overlay for mounting and dismounting creature companions.
 * Shows a single button that toggles between "Ride" and "Dismount".
 */
export class MountUI {
  private button?: Phaser.GameObjects.Container;
  private bgImage?: Phaser.GameObjects.Image;
  private label?: Phaser.GameObjects.Text;
  private isMounted = false;
  private mountAvailable = false;
  private mountSystem?: MountSystem;
  private onMountAction?: (mounted: boolean) => boolean;
  private buttonKey = `${MOUNT_BUTTON_KEY}:${Math.random().toString(36).slice(2, 8)}`;

  constructor(private readonly scene: SnakeScene) {
    // Register a simple button texture
    if (!this.scene.textures.exists(this.buttonKey)) {
      const canvas = document.createElement('canvas');
      canvas.width = BUTTON_WIDTH;
      canvas.height = BUTTON_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1a2a3a';
        this.drawRoundedRect(ctx, 0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS);
        ctx.fill();
        ctx.strokeStyle = '#9ad1ff';
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, 1, 1, BUTTON_WIDTH - 2, BUTTON_HEIGHT - 2, BUTTON_RADIUS - 1);
        ctx.stroke();
      }
      this.scene.textures.addCanvas(this.buttonKey, canvas);
    }
  }

  /**
   * Show or update the mount button.
   * @param mountAvailable Whether a mount companion is active
   * @param isMounted Whether the player is currently mounted
   */
  showMountButton(mountAvailable: boolean, isMounted: boolean): void {
    this.mountAvailable = mountAvailable;
    this.isMounted = isMounted;

    const visible = mountAvailable;

    if (!visible) {
      this.hide();
      return;
    }

    // Create or update button
    if (!this.bgImage) {
      this.bgImage = this.scene.add
        .image(0, 0, this.buttonKey)
        .setOrigin(0, 0)
        .setDepth(20)
        .setInteractive({ useHandCursor: true });

      this.label = this.scene.add
        .text(BUTTON_WIDTH / 2, BUTTON_HEIGHT / 2, this.getText(), {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 0.5)
        .setDepth(21);

      this.button = this.scene.add.container(0, 0, [this.bgImage!, this.label!]).setDepth(20);

      this.bgImage!.on('pointerdown', () => this.onButtonClick());
      this.bgImage!.on('pointerover', () => {
        this.bgImage?.setScale(1.05);
        this.label?.setScale(1.05);
      });
      this.bgImage!.on('pointerout', () => {
        this.bgImage?.setScale(1);
        this.label?.setScale(1);
      });
    } else {
      this.bgImage?.setVisible(true);
      this.label?.setVisible(true);
      this.label?.setText(this.getText());
    }

    // Position at bottom-center of screen
    if (this.button) {
      const cam = this.scene.cameras.main;
      this.button.setPosition(
        cam.centerX,
        cam.height - 48,
      );
    }
  }

  hide(): void {
    this.button?.destroy();
    this.button = undefined;
    this.bgImage = undefined;
    this.label = undefined;
  }

  setMountSystem(system: MountSystem): void {
    this.mountSystem = system;
  }

  setOnMountAction(fn: (mounted: boolean) => boolean): void {
    this.onMountAction = fn;
  }

  // ---- Private ----

  private getText(): string {
    if (this.isMounted) {
      return 'Dismount';
    }
    return 'Ride';
  }

  private onButtonClick(): void {
    if (this.onMountAction) {
      const result = this.onMountAction(!this.isMounted);
      if (result) {
        this.isMounted = !this.isMounted;
        this.label?.setText(this.getText());
      }
    }
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
