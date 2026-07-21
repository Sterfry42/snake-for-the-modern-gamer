import Phaser from 'phaser';
import type { BulletTrainStation } from './bulletTrainTypes.js';

/** Renders bullet train station graphics onto a Phaser Graphics object. */
export class BulletTrainRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly cell: number;

  constructor(graphics: Phaser.GameObjects.Graphics, cellSize: number) {
    this.graphics = graphics;
    this.cell = cellSize;
  }

  /** Draw the entire station (entrance, decorations, platform, tracks, canopy). */
  drawStation(station: BulletTrainStation, entranceX: number, entranceY: number): void {
    const { decorations } = station;

    // Draw ballast/gravel bed under tracks
    this.drawBallast(entranceX, entranceY);

    // Draw platform tiles around the entrance
    this.drawPlatform(station, entranceX, entranceY);

    // Draw tracks perpendicular to the platform
    this.drawTracks(entranceX, entranceY);

    // Draw canopy/roof over entrance
    this.drawCanopy(entranceX, entranceY);

    // Draw decorations
    for (const deco of decorations) {
      this.drawDecoration(deco);
    }

    // Draw the entrance tile with a pulsing glow
    this.drawEntranceTile(entranceX, entranceY);
  }

  private drawBallast(entranceX: number, entranceY: number): void {
    const { cell } = this;

    // Dark gravel background under the tracks
    this.graphics.fillStyle(0x3d3528, 0.35);
    for (let dx = -10; dx <= 10; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const bx = entranceX + dx;
        const by = entranceY + dy;
        if (Math.abs(dy) <= 1 && Math.abs(dx) <= 8) {
          this.graphics.fillRect(bx * cell, by * cell, cell, cell);
        }
      }
    }
  }

  private drawCanopy(entranceX: number, entranceY: number): void {
    const { cell } = this;

    // Support pillars
    this.graphics.fillStyle(0x4a3a2a, 0.8);
    this.graphics.fillRect((entranceX - 1.5) * cell + 2, (entranceY - 2) * cell, 6, cell * 2);
    this.graphics.fillRect((entranceX + 1.5) * cell - 8, (entranceY - 2) * cell, 6, cell * 2);

    // Roof canopy
    this.graphics.fillStyle(0x8b2020, 0.7);
    this.graphics.fillRect((entranceX - 2) * cell, (entranceY - 2) * cell, cell * 4, 6);
    // Roof trim
    this.graphics.fillStyle(0xffd166, 0.45);
    this.graphics.fillRect((entranceX - 2) * cell, (entranceY - 2) * cell + 4, cell * 4, 2);
  }

  private drawPlatform(_station: BulletTrainStation, entranceX: number, entranceY: number): void {
    const { cell } = this;

    // Draw platform tiles (gray) around the entrance area
    this.graphics.fillStyle(0x7a7a7a, 0.55);
    for (let dx = -4; dx <= 4; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const px = entranceX + dx;
        const py = entranceY + dy;
        // Skip the entrance tile itself
        if (px === entranceX && py === entranceY) continue;
        this.graphics.fillRect(px * cell, py * cell, cell, cell);
        // Tile grid lines
        this.graphics.lineStyle(1, 0x5a5a5a, 0.25);
        this.graphics.strokeRect(px * cell, py * cell, cell, cell);
      }
    }

    // Yellow safety line along platform edge
    this.graphics.lineStyle(3, 0xd4a017, 0.7);
    for (let dx = -4; dx <= 4; dx++) {
      const ex = (entranceX + dx) * cell + cell / 2;
      this.graphics.lineBetween(ex, entranceY * cell + cell - 3, ex, entranceY * cell + cell + 1);
    }
    // Dashed pattern
    this.graphics.lineStyle(2, 0xffd166, 0.5);
    for (let dx = -3; dx <= 3; dx += 2) {
      const ex = (entranceX + dx) * cell + cell / 2;
      this.graphics.lineBetween(
        ex,
        entranceY * cell + cell - 1,
        ex + 5,
        entranceY * cell + cell - 1,
      );
    }
  }

  private drawTracks(entranceX: number, entranceY: number): void {
    const { cell } = this;

    // Draw track ties (cross pieces) first (behind rails)
    this.graphics.lineStyle(2, 0x5a4a3a, 0.5);
    for (let dx = -10; dx <= 10; dx += 1.5) {
      const tx = (entranceX + dx) * cell + cell / 2;
      this.graphics.lineBetween(tx, (entranceY - 1.3) * cell, tx, (entranceY + 1.3) * cell);
    }

    // Draw two parallel rails (dark gray)
    this.graphics.lineStyle(3, 0x4a4a4a, 0.9);
    this.graphics.lineBetween(
      (entranceX - 10) * cell + cell / 2,
      (entranceY - 1) * cell + cell / 2,
      (entranceX + 10) * cell + cell / 2,
      (entranceY - 1) * cell + cell / 2,
    );
    this.graphics.lineBetween(
      (entranceX - 10) * cell + cell / 2,
      (entranceY + 1) * cell + cell / 2,
      (entranceX + 10) * cell + cell / 2,
      (entranceY + 1) * cell + cell / 2,
    );

    // Rail highlights
    this.graphics.lineStyle(1, 0x6a6a6a, 0.4);
    this.graphics.lineBetween(
      (entranceX - 10) * cell + cell / 2,
      (entranceY - 1) * cell + cell / 2 - 1,
      (entranceX + 10) * cell + cell / 2,
      (entranceY - 1) * cell + cell / 2 - 1,
    );
    this.graphics.lineBetween(
      (entranceX - 10) * cell + cell / 2,
      (entranceY + 1) * cell + cell / 2 + 1,
      (entranceX + 10) * cell + cell / 2,
      (entranceY + 1) * cell + cell / 2 + 1,
    );
  }

  private drawDecoration(deco: BulletTrainStation['decorations'][number]): void {
    const { cell } = this;

    switch (deco.type) {
      case 'lantern':
        this.drawLantern(deco.x * cell + cell / 2, deco.y * cell + cell / 2, deco.color);
        break;
      case 'ticket-booth':
        this.drawTicketBooth(deco.x * cell, deco.y * cell);
        break;
      case 'bench':
        this.drawBench(deco.x * cell, deco.y * cell, deco.facing);
        break;
      case 'sign':
        this.drawSign(deco.x * cell + cell / 2, deco.y * cell, deco.text);
        break;
      case 'platform-edge':
        this.drawPlatformEdge(deco.x * cell + cell / 2, deco.y * cell + cell / 2);
        break;
    }
  }

  private drawLantern(x: number, y: number, color: number): void {
    // Lantern string
    this.graphics.lineStyle(1, 0x555555, 0.6);
    this.graphics.lineBetween(x, y - 8, x, y);

    // Lantern body
    this.graphics.fillStyle(color, 0.9);
    this.graphics.fillCircle(x, y + 4, 4);

    // Lantern glow
    this.graphics.fillStyle(color, 0.15);
    this.graphics.fillCircle(x, y + 4, 10);
  }

  private drawTicketBooth(x: number, y: number): void {
    const { cell } = this;

    // Booth structure
    this.graphics.fillStyle(0x8b4513, 0.8);
    this.graphics.fillRect(x + 2, y + 2, cell - 4, cell - 4);

    // Roof
    this.graphics.fillStyle(0xcc3333, 0.9);
    this.graphics.fillRect(x, y, cell, 4);

    // Window
    this.graphics.fillStyle(0xffd166, 0.7);
    this.graphics.fillRect(x + 6, y + 8, cell - 12, 6);
  }

  private drawBench(x: number, y: number, _facing: 'north' | 'south'): void {
    const { cell } = this;

    // Bench seat
    this.graphics.fillStyle(0x8b6914, 0.8);
    this.graphics.fillRect(x + 2, y + 4, cell - 4, 6);

    // Bench legs
    this.graphics.fillStyle(0x5a4a10, 0.8);
    this.graphics.fillRect(x + 4, y + 10, 3, 4);
    this.graphics.fillRect(x + cell - 7, y + 10, 3, 4);
  }

  private drawSign(x: number, y: number, _text: string): void {
    const { cell } = this;

    // Sign post
    this.graphics.lineStyle(2, 0x555555, 0.8);
    this.graphics.lineBetween(x, y + cell, x, y + cell + 8);

    // Sign board
    this.graphics.fillStyle(0x2a2a2a, 0.9);
    this.graphics.fillRect(x - 16, y, 32, 12);

    // Sign border
    this.graphics.lineStyle(1, 0xffd166, 0.6);
    this.graphics.strokeRect(x - 16, y, 32, 12);
  }

  private drawPlatformEdge(x: number, y: number): void {
    this.graphics.fillStyle(0xffd166, 0.4);
    this.graphics.fillCircle(x, y, 3);
  }

  private drawEntranceTile(x: number, y: number): void {
    const { cell } = this;

    // Entrance platform
    this.graphics.fillStyle(0xf8a0c2, 0.4);
    this.graphics.fillRect(x * cell, y * cell, cell, cell);

    // Inner glow circle
    this.graphics.fillStyle(0xff6b9d, 0.45);
    this.graphics.fillCircle(x * cell + cell / 2, y * cell + cell / 2, cell / 3);
    // Outer glow
    this.graphics.fillStyle(0xff6b9d, 0.07);
    this.graphics.fillCircle(x * cell + cell / 2, y * cell + cell / 2, cell / 1.5);

    // Simple train icon
    this.graphics.fillStyle(0xffffff, 0.6);
    this.graphics.fillRect((x + 0.3) * cell, (y + 0.3) * cell, cell * 0.4, cell * 0.4);
    this.graphics.fillRect((x + 0.55) * cell, (y + 0.2) * cell, cell * 0.2, cell * 0.6);
    // Train windows
    this.graphics.fillStyle(0x87ceeb, 0.5);
    this.graphics.fillRect((x + 0.35) * cell, (y + 0.35) * cell, cell * 0.12, cell * 0.15);
    this.graphics.fillRect((x + 0.5) * cell, (y + 0.35) * cell, cell * 0.12, cell * 0.15);
    // Wheels
    this.graphics.fillStyle(0x333333, 0.6);
    this.graphics.fillCircle((x + 0.35) * cell, (y + 0.75) * cell, 2);
    this.graphics.fillCircle((x + 0.65) * cell, (y + 0.75) * cell, 2);
  }

  /** Draw the train interior scene for the ride sequence. */
  drawTrainInterior(
    scene: Phaser.Scene,
    progress: number,
    windowOffset: number,
  ): {
    windowBg: Phaser.GameObjects.Graphics;
    speedLines: Phaser.GameObjects.Graphics;
    scenery: Phaser.GameObjects.Graphics;
  } {
    const width = scene.scale.width;
    const height = scene.scale.height;

    // Window background (mountain sky) - simplified without gradients
    const windowBg = scene.add.graphics();
    windowBg.fillStyle(0x87ceeb, 0.8);
    windowBg.fillRect(width * 0.15, height * 0.1, width * 0.7, height * 0.5);

    // Mountain silhouette
    windowBg.fillStyle(0x4a6741, 0.6);
    windowBg.beginPath();
    windowBg.moveTo(width * 0.15, height * 0.6);
    for (let i = 0; i <= 10; i++) {
      const mx = width * 0.15 + width * 0.7 * (i / 10);
      const my = height * 0.3 + Math.sin((i + windowOffset * 0.02) * 0.8) * 40;
      windowBg.lineTo(mx, my);
    }
    windowBg.lineTo(width * 0.85, height * 0.6);
    windowBg.closePath();
    windowBg.fillPath();

    // Cherry blossom petals
    windowBg.fillStyle(0xffb3ba, 0.5);
    for (let i = 0; i < 12; i++) {
      const px = width * 0.2 + ((i * 67 + windowOffset * 0.5) % (width * 0.6));
      const py =
        height * 0.15 + Math.sin((i * 31 + windowOffset * 0.03) * 1.3) * 30 + ((i * 13) % 40);
      windowBg.fillCircle(px, py, 3);
    }

    // Speed lines
    const speedLines = scene.add.graphics();
    const lineIntensity = Math.min(1, progress * 2);
    speedLines.lineStyle(2, 0xffffff, 0.3 * lineIntensity);

    for (let i = 0; i < 8; i++) {
      const lx = width * 0.15 + ((i * 97 + windowOffset * 2) % (width * 0.7));
      const ly = height * 0.15 + ((i * 23) % (height * 0.4));
      speedLines.lineBetween(lx, ly, lx - 30 - lineIntensity * 20, ly);
    }

    // Train interior frame
    const interior = scene.add.graphics();
    // Ceiling
    interior.fillStyle(0x6b4423, 0.9);
    interior.fillRect(0, 0, width, height * 0.08);

    // Walls
    interior.fillStyle(0x8b6914, 0.8);
    interior.fillRect(0, height * 0.08, width * 0.15, height * 0.84);
    interior.fillRect(width * 0.85, height * 0.08, width * 0.15, height * 0.84);

    // Floor
    interior.fillStyle(0x5a4a10, 0.8);
    interior.fillRect(0, height * 0.92, width, height * 0.08);

    // Window frame
    interior.lineStyle(4, 0x3a2a10, 1);
    interior.strokeRect(width * 0.15, height * 0.08, width * 0.7, height * 0.52);

    // Luggage rack
    interior.fillStyle(0x7a5a2a, 0.7);
    interior.fillRect(width * 0.2, height * 0.06, width * 0.6, 8);

    // Passenger silhouettes (simple snake shapes in seats)
    interior.fillStyle(0x2a2a2a, 0.4);
    for (let i = 0; i < 3; i++) {
      const sx = width * 0.2 + i * (width * 0.2);
      const sy = height * 0.65 + Math.sin(progress * 10 + i) * 2;
      // Seat
      interior.fillRect(sx - 10, sy + 10, 20, 30);
      // Head
      interior.fillCircle(sx, sy, 8);
    }

    return { windowBg, speedLines, scenery: interior };
  }
}
