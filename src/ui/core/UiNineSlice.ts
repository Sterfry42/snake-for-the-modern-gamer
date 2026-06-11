import Phaser from 'phaser';

import type { UiRect } from './UiLayout.js';

export interface UiNineSliceStyle {
  fill: number;
  stroke: number;
  glow?: number;
  alpha?: number;
  strokeAlpha?: number;
  glowAlpha?: number;
  cornerSize?: number;
  edgeSize?: number;
  radius?: number;
}

export function drawPixelNineSliceFrame(
  graphics: Phaser.GameObjects.Graphics,
  rect: UiRect,
  style: UiNineSliceStyle,
): void {
  const corner = style.cornerSize ?? 8;
  const edge = style.edgeSize ?? 2;
  const radius = style.radius ?? 6;

  graphics
    .fillStyle(style.fill, style.alpha ?? 0.9)
    .fillRoundedRect(rect.x, rect.y, rect.width, rect.height, radius);
  graphics
    .lineStyle(edge, style.stroke, style.strokeAlpha ?? 0.88)
    .strokeRoundedRect(
      rect.x + edge / 2,
      rect.y + edge / 2,
      rect.width - edge,
      rect.height - edge,
      radius,
    );

  const glow = style.glow ?? style.stroke;
  graphics.fillStyle(glow, style.glowAlpha ?? 0.72);
  graphics.fillRect(rect.x, rect.y, corner, edge);
  graphics.fillRect(rect.x, rect.y, edge, corner);
  graphics.fillRect(rect.x + rect.width - corner, rect.y, corner, edge);
  graphics.fillRect(rect.x + rect.width - edge, rect.y, edge, corner);
  graphics.fillRect(rect.x, rect.y + rect.height - edge, corner, edge);
  graphics.fillRect(rect.x, rect.y + rect.height - corner, edge, corner);
  graphics.fillRect(rect.x + rect.width - corner, rect.y + rect.height - edge, corner, edge);
  graphics.fillRect(rect.x + rect.width - edge, rect.y + rect.height - corner, edge, corner);
}

export function drawPixelDivider(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  color: number,
  alpha = 0.7,
): void {
  graphics.fillStyle(color, alpha).fillRect(x, y, width, 1);
  graphics.fillStyle(color, alpha * 0.5).fillRect(x + 8, y + 2, Math.max(0, width - 16), 1);
}
