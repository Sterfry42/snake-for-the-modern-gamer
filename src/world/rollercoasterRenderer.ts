import Phaser from 'phaser';
import type { RollercoasterStation, RollercoasterTrackSegment } from './rollercoasterTypes.js';
import { THEME_CONFIG } from './rollercoasterService.js';

/** Renders rollercoaster station graphics onto a Phaser Graphics object. */
export class RollercoasterRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly cell: number;

  constructor(graphics: Phaser.GameObjects.Graphics, cellSize: number) {
    this.graphics = graphics;
    this.cell = cellSize;
  }

  /** Draw the entire rollercoaster station (entrance, tracks, supports, station building). */
  drawStation(station: RollercoasterStation, entranceX: number, entranceY: number): void {
    const { trackSegments, theme } = station;

    // Draw track supports (pillars) first (behind everything)
    this.drawTrackSupports(entranceX, entranceY, theme);

    // Draw track segments
    for (const segment of trackSegments) {
      this.drawTrackSegment(segment, entranceX, entranceY, theme);
    }

    // Draw station platform
    this.drawStationPlatform(entranceX, entranceY, theme);

    // Draw station building/sign
    this.drawStationBuilding(entranceX, entranceY, station.stationName, theme);

    // Draw entrance tile with pulsing glow
    this.drawEntranceTile(entranceX, entranceY, theme);
  }

  private drawTrackSupports(entranceX: number, entranceY: number, theme: string): void {
    const { cell } = this;
    const themeColors = THEME_CONFIG[theme as keyof typeof THEME_CONFIG] ?? THEME_CONFIG['thunder-ridge'];
    const supportColor = themeColors[0];

    // Draw support pillars along the track
    for (let dx = -12; dx <= 12; dx += 2) {
      if (dx === 0) continue; // Skip the entrance area

      const px = (entranceX + dx) * cell + cell / 2;
      const py = entranceY * cell + cell * 1.5;

      // Pillar
      this.graphics.fillStyle(supportColor, 0.3);
      this.graphics.fillRect(px - 2, py, 4, cell * 2);

      // Cross brace
      this.graphics.lineStyle(1, supportColor, 0.15);
      this.graphics.lineBetween(px - 6, py + cell * 0.5, px + 6, py + cell * 0.5);
      this.graphics.lineBetween(px - 4, py + cell * 1.2, px + 4, py + cell * 1.2);
    }
  }

  private drawTrackSegment(
    segment: RollercoasterTrackSegment,
    entranceX: number,
    entranceY: number,
    theme: string,
  ): void {
    const { cell } = this;
    const themeColors = THEME_CONFIG[theme as keyof typeof THEME_CONFIG] ?? THEME_CONFIG['thunder-ridge'];
    const trackColor = themeColors[0];
    const railColor = themeColors[1] ?? trackColor;

    switch (segment.type) {
      case 'station-platform':
        this.drawStationPlatformTile(entranceX, entranceY);
        break;
      case 'lift-hill':
        this.drawLiftHill(entranceX, entranceY, segment.direction, trackColor);
        break;
      case 'drop':
        this.drawDrop(entranceX, entranceY, segment.height, trackColor);
        break;
      case 'loop':
        this.drawLoop(entranceX, entranceY, segment.size, trackColor);
        break;
      case 'curve':
        this.drawCurve(entranceX, entranceY, segment.radius, segment.arc, trackColor);
        break;
      case 'straight':
        this.drawStraightTrack(entranceX, entranceY, segment.length, segment.direction, trackColor, railColor);
        break;
      case 'bridge':
        this.drawBridge(entranceX, entranceY, segment.length, trackColor);
        break;
    }
  }

  private drawStationPlatformTile(x: number, y: number): void {
    const { cell } = this;

    // Platform surface
    this.graphics.fillStyle(0x888888, 0.5);
    this.graphics.fillRect(x * cell, y * cell, cell, cell);

    // Platform edge
    this.graphics.lineStyle(2, 0xffd166, 0.5);
    this.graphics.strokeRect(x * cell, y * cell, cell, cell);
  }

  private drawLiftHill(x: number, y: number, direction: 'up' | 'down', trackColor: number): void {
    const { cell } = this;

    // Draw ascending/descending track
    this.graphics.lineStyle(4, trackColor, 0.7);
    const startX = (x + (direction === 'up' ? 3 : -3)) * cell + cell / 2;
    const startY = (y - 2) * cell;
    const endX = (x + (direction === 'up' ? 7 : -7)) * cell + cell / 2;
    const endY = (y + 1) * cell;

    this.graphics.lineBetween(startX, startY, endX, endY);

    // Chain lift mechanism
    this.graphics.fillStyle(0x666666, 0.3);
    this.graphics.fillRect(startX - 3, startY, 6, endY - startY);

    // Chain links
    this.graphics.lineStyle(1, 0x888888, 0.4);
    for (let i = 0; i < 4; i++) {
      const ty = startY + (endY - startY) * (i / 4);
      this.graphics.lineBetween(startX - 5, ty, startX + 5, ty);
    }
  }

  private drawDrop(x: number, y: number, height: number, trackColor: number): void {
    const { cell } = this;

    // Steep drop track
    this.graphics.lineStyle(4, trackColor, 0.7);
    const startX = (x - 3) * cell + cell / 2;
    const startY = (y + 1) * cell;
    const endX = (x + 3) * cell + cell / 2;
    const endY = (y + height) * cell;

    this.graphics.lineBetween(startX, startY, endX, endY);

    // Splash/water at bottom
    this.graphics.fillStyle(0x4488ff, 0.2);
    this.graphics.fillCircle(endX, endY + cell, cell * 2);
  }

  private drawLoop(x: number, y: number, size: number, trackColor: number): void {
    const { cell } = this;
    const cx = (x + 5) * cell + cell / 2;
    const cy = (y + 1) * cell;
    const radius = size * cell * 0.8;

    // Loop circle
    this.graphics.lineStyle(4, trackColor, 0.7);
    this.graphics.lineBetween(cx - radius, cy, cx + radius, cy);

    // Loop arc
    this.graphics.beginPath();
    this.graphics.arc(cx, cy, radius, Math.PI * 0.8, Math.PI * 0.2, false);
    this.graphics.strokePath();

    // Support structure
    this.graphics.fillStyle(0x666666, 0.2);
    this.graphics.fillRect(cx - 4, cy + radius, 8, cell * 2);
  }

  private drawCurve(
    x: number,
    y: number,
    radius: number,
    arc: number,
    trackColor: number,
  ): void {
    const { cell } = this;
    const cx = (x + 8) * cell + cell / 2;
    const cy = (y + 1) * cell;

    // Curved track
    this.graphics.lineStyle(4, trackColor, 0.7);
    this.graphics.beginPath();
    this.graphics.arc(cx, cy, radius * cell * 0.6, 0, arc, false);
    this.graphics.strokePath();
  }

  private drawStraightTrack(
    x: number,
    y: number,
    length: number,
    direction: 'horizontal' | 'vertical',
    trackColor: number,
    railColor: number,
  ): void {
    const { cell } = this;

    if (direction === 'horizontal') {
      const startX = (x - length / 2) * cell + cell / 2;
      const endX = (x + length / 2) * cell + cell / 2;
      const cy = (y + 1) * cell;

      // Top rail
      this.graphics.lineStyle(3, trackColor, 0.7);
      this.graphics.lineBetween(startX, cy - 3, endX, cy - 3);
      // Bottom rail
      this.graphics.lineStyle(3, trackColor, 0.7);
      this.graphics.lineBetween(startX, cy + 3, endX, cy + 3);
      // Ties
      this.graphics.lineStyle(2, railColor, 0.3);
      for (let i = 0; i <= length; i++) {
        const tx = startX + (endX - startX) * (i / length);
        this.graphics.lineBetween(tx, cy - 4, tx, cy + 4);
      }
    } else {
      const startY = (y - length / 2) * cell + cell / 2;
      const endY = (y + length / 2) * cell + cell / 2;
      const cx = (x + 1) * cell + cell / 2;

      // Left rail
      this.graphics.lineStyle(3, trackColor, 0.7);
      this.graphics.lineBetween(cx - 3, startY, cx - 3, endY);
      // Right rail
      this.graphics.lineStyle(3, trackColor, 0.7);
      this.graphics.lineBetween(cx + 3, startY, cx + 3, endY);
      // Ties
      this.graphics.lineStyle(2, railColor, 0.3);
      for (let i = 0; i <= length; i++) {
        const ty = startY + (endY - startY) * (i / length);
        this.graphics.lineBetween(cx - 4, ty, cx + 4, ty);
      }
    }
  }

  private drawBridge(x: number, y: number, length: number, trackColor: number): void {
    const { cell } = this;

    // Bridge deck
    this.graphics.fillStyle(0x8b6914, 0.3);
    this.graphics.fillRect(
      (x - length / 2) * cell,
      (y + 1) * cell - 2,
      length * cell,
      4,
    );

    // Bridge rails
    this.graphics.lineStyle(2, trackColor, 0.5);
    this.graphics.lineBetween(
      (x - length / 2) * cell,
      (y + 1) * cell - 6,
      (x + length / 2) * cell,
      (y + 1) * cell - 6,
    );
    this.graphics.lineBetween(
      (x - length / 2) * cell,
      (y + 1) * cell + 2,
      (x + length / 2) * cell,
      (y + 1) * cell + 2,
    );

    // Bridge supports
    this.graphics.fillStyle(0x666666, 0.2);
    for (let i = -length / 2; i <= length / 2; i += 2) {
      this.graphics.fillRect((x + i) * cell, (y + 1) * cell + 2, 4, cell * 2);
    }
  }

  private drawStationPlatform(entranceX: number, entranceY: number, theme: string): void {
    const { cell } = this;
    const themeColors = THEME_CONFIG[theme as keyof typeof THEME_CONFIG] ?? THEME_CONFIG['thunder-ridge'];

    // Platform tiles around entrance
    this.graphics.fillStyle(themeColors[0], 0.15);
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const px = entranceX + dx;
        const py = entranceY + dy;
        if (px === entranceX && dy === 0) continue;
        this.graphics.fillRect(px * cell, py * cell, cell, cell);
        this.graphics.lineStyle(1, themeColors[0], 0.1);
        this.graphics.strokeRect(px * cell, py * cell, cell, cell);
      }
    }
  }

  private drawStationBuilding(
    entranceX: number,
    entranceY: number,
    stationName: string,
    theme: string,
  ): void {
    const { cell } = this;
    const themeColors = THEME_CONFIG[theme as keyof typeof THEME_CONFIG] ?? THEME_CONFIG['thunder-ridge'];

    // Station sign on a post
    const signX = entranceX * cell + cell / 2;
    const signY = (entranceY - 2) * cell;

    // Post
    this.graphics.lineStyle(3, 0x666666, 0.7);
    this.graphics.lineBetween(signX, signY + 12, signX, signY + cell);

    // Sign board
    this.graphics.fillStyle(themeColors[0], 0.8);
    this.graphics.fillRect(signX - 24, signY - 8, 48, 16);

    // Sign border
    this.graphics.lineStyle(2, themeColors[1] ?? themeColors[0], 0.6);
    this.graphics.strokeRect(signX - 24, signY - 8, 48, 16);

    // Coaster icon on sign
    this.graphics.fillStyle(0xffffff, 0.7);
    this.graphics.fillCircle(signX - 14, signY, 4);
    this.graphics.fillCircle(signX + 14, signY, 4);
  }

  private drawEntranceTile(x: number, y: number, theme: string): void {
    const { cell } = this;
    const themeColors = THEME_CONFIG[theme as keyof typeof THEME_CONFIG] ?? THEME_CONFIG['thunder-ridge'];

    // Entrance tile glow
    this.graphics.fillStyle(themeColors[0], 0.25);
    this.graphics.fillRect(x * cell, y * cell, cell, cell);

    // Inner glow
    this.graphics.fillStyle(themeColors[1] ?? themeColors[0], 0.35);
    this.graphics.fillCircle(x * cell + cell / 2, y * cell + cell / 2, cell / 3);

    // Outer glow
    this.graphics.fillStyle(themeColors[0], 0.08);
    this.graphics.fillCircle(x * cell + cell / 2, y * cell + cell / 2, cell / 1.5);

    // Coaster car icon on entrance
    this.graphics.fillStyle(0xffffff, 0.5);
    this.graphics.fillRect((x + 0.25) * cell, (y + 0.3) * cell, cell * 0.5, cell * 0.35);

    // Car windows
    this.graphics.fillStyle(themeColors[0], 0.4);
    this.graphics.fillRect((x + 0.3) * cell, (y + 0.35) * cell, cell * 0.15, cell * 0.15);
    this.graphics.fillRect((x + 0.5) * cell, (y + 0.35) * cell, cell * 0.15, cell * 0.15);

    // Wheels
    this.graphics.fillStyle(0x333333, 0.5);
    this.graphics.fillCircle((x + 0.35) * cell, (y + 0.7) * cell, 2.5);
    this.graphics.fillCircle((x + 0.65) * cell, (y + 0.7) * cell, 2.5);
  }
}
