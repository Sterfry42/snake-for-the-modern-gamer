import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';

export interface ComboSpinnerEntry {
  id: string;
  label: string;
  color: string;
  textColor: string;
}

export class ComboSpinner {
  private container?: Phaser.GameObjects.Container;
  private wheelGraphics?: Phaser.GameObjects.Graphics;
  private pointer?: Phaser.GameObjects.Graphics;
  private resultText?: Phaser.GameObjects.Text;
  private spinning = false;
  private angle = 0;
  private velocity = 0;
  private friction = 0.985;
  private onResult?: (entry: ComboSpinnerEntry) => void;
  private scene: Phaser.Scene;
  private centerX: number;
  private centerY: number;
  private radius: number;
  private entries: ComboSpinnerEntry[] = [];

  constructor(scene: SnakeScene, centerX: number, centerY: number, radius: number) {
    this.scene = scene;
    this.centerX = centerX;
    this.centerY = centerY;
    this.radius = radius;
    this.build();
  }

  private build(): void {
    this.container = this.scene.add.container(this.centerX, this.centerY);
    this.container.setDepth(100); // Render above all UI
    this.wheelGraphics = this.scene.add.graphics();
    this.wheelGraphics.setDepth(101);
    this.pointer = this.scene.add.graphics();
    this.pointer.setDepth(102); // Pointer on top of wheel
    this.resultText = this.scene.add
      .text(0, this.radius + 40, '', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(103); // Text on top of pointer

    this.container.add(this.wheelGraphics);
    this.container.add(this.pointer);
    this.container.add(this.resultText);
    this.setVisible(false);
  }

  setVisible(visible: boolean): void {
    if (!this.container) return;
    this.container.setVisible(visible);
  }

  isVisible(): boolean {
    return this.container?.visible ?? false;
  }

  hide(): void {
    this.spinning = false;
    this.velocity = 0;
    this.setVisible(false);
    this.resultText?.setText('');
  }

  spin(entries: ComboSpinnerEntry[], onResult: (entry: ComboSpinnerEntry) => void): void {
    this.entries = entries;
    this.onResult = onResult;
    this.spinning = true;
    this.resultText?.setText('');
    this.setVisible(true);

    // Random initial velocity for a nice spin
    this.velocity = 0.3 + Math.random() * 0.4;
    this.angle = Math.random() * Math.PI * 2;

    // Register as a custom update
    this.scene.events.on('update', this.update, this);
  }

  private update(time: number, delta: number): void {
    void time;
    void delta;
    if (!this.spinning) return;

    this.angle += this.velocity;
    this.velocity *= this.friction;

    if (this.velocity < 0.002) {
      this.velocity = 0;
      this.spinning = false;
      this.scene.events.off('update', this.update, this);

      // Determine which segment the pointer points to
      const entry = this.resolveResult(this.angle);
      this.resultText?.setText(entry.label);
      this.onResult?.(entry);
      return;
    }

    this.drawWheel();
  }

  private drawWheel(): void {
    if (!this.wheelGraphics) return;

    this.wheelGraphics.clear();
    this.wheelGraphics.lineStyle(2, 0x000000, 1);

    const count = this.entries.length;
    if (count === 0) return;
    const sliceAngle = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const startAngle = this.angle + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      const color = Phaser.Display.Color.HexStringToColor(this.entries[i]!.color);
      this.wheelGraphics.fillStyle(color.color, 0.85);

      // Draw slice using fillPath (relative to graphics origin, container handles screen position)
      this.wheelGraphics.beginPath();
      this.wheelGraphics.moveTo(0, 0);
      this.wheelGraphics.lineTo(
        Math.cos(startAngle) * this.radius,
        Math.sin(startAngle) * this.radius,
      );
      this.wheelGraphics.lineTo(Math.cos(endAngle) * this.radius, Math.sin(endAngle) * this.radius);
      this.wheelGraphics.closePath();
      this.wheelGraphics.fillPath();
    }

    // Draw pointer (fixed at top, relative to graphics origin)
    if (this.pointer) {
      this.pointer.clear();
      this.pointer.fillStyle(0xffd700, 1);
      this.pointer.lineStyle(2, 0x000000, 1);
      this.pointer.fillTriangle(0, -this.radius - 8, -8, -this.radius + 8, 8, -this.radius + 8);
    }
  }

  private resolveResult(angle: number): ComboSpinnerEntry {
    const count = this.entries.length;
    if (count === 0) return this.entries[0]!;
    const sliceAngle = (Math.PI * 2) / count;

    // Pointer is at top (angle = -PI/2 from standard position)
    // Normalize angle
    const normalizedAngle =
      (((-angle - Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const index = Math.floor(normalizedAngle / sliceAngle) % count;
    return this.entries[index]!;
  }

  destroy(): void {
    this.scene?.events.off('update', this.update, this);
    this.container?.destroy();
    this.container = undefined;
    this.wheelGraphics = undefined;
    this.pointer = undefined;
    this.resultText = undefined;
  }
}
