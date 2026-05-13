import type { RuntimeSpriteRecipe } from '../runtimeSpriteFactory.js';

export type DatingPortraitVariant =
  | 'human-masc'
  | 'human-femme'
  | 'goblin'
  | 'angel'
  | 'goblin-angel';

export interface DatingPortraitPalette {
  skin: string;
  hair: string;
  accent: string;
  outfit: string;
  eye: string;
  blush: string;
}

function rect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  alpha = 1,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.fillRect(x, y, w, h);
  context.restore();
}

function ellipse(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  alpha = 1,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();
  context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function strokeEllipse(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  width: number,
  alpha = 1,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();
  context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawSparkles(context: CanvasRenderingContext2D, color: string): void {
  for (const [x, y, size] of [
    [74, 84, 9],
    [426, 116, 7],
    [82, 392, 6],
    [442, 360, 10],
    [402, 62, 5],
  ] as const) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x, y - size);
    context.lineTo(x + size * 0.35, y - size * 0.35);
    context.lineTo(x + size, y);
    context.lineTo(x + size * 0.35, y + size * 0.35);
    context.lineTo(x, y + size);
    context.lineTo(x - size * 0.35, y + size * 0.35);
    context.lineTo(x - size, y);
    context.lineTo(x - size * 0.35, y - size * 0.35);
    context.closePath();
    context.fill();
  }
}

function drawEyes(context: CanvasRenderingContext2D, eye: string, variant: DatingPortraitVariant): void {
  const eyeY = variant.includes('goblin') ? 207 : 197;
  const leftX = 206;
  const rightX = 306;
  for (const x of [leftX, rightX]) {
    ellipse(context, x, eyeY, 28, 35, '#f7fbff');
    ellipse(context, x, eyeY + 4, 13, 21, eye);
    ellipse(context, x + 4, eyeY + 1, 6, 10, '#05070b', 0.88);
    ellipse(context, x - 6, eyeY - 11, 6, 6, '#ffffff', 0.95);
  }
  rect(context, 176, eyeY - 50, 60, 8, '#140910', 0.8);
  rect(context, 276, eyeY - 50, 60, 8, '#140910', 0.8);
}

function drawHuman(context: CanvasRenderingContext2D, palette: DatingPortraitPalette, masc: boolean): void {
  rect(context, 0, 0, 512, 512, '#1a1726');
  ellipse(context, 256, 478, masc ? 168 : 146, masc ? 118 : 104, palette.outfit);
  ellipse(context, 182, 414, masc ? 72 : 48, masc ? 92 : 76, palette.skin);
  ellipse(context, 330, 414, masc ? 72 : 48, masc ? 92 : 76, palette.skin);
  rect(context, 202, 342, 108, 96, palette.skin);
  ellipse(context, 256, 224, 112, 136, palette.skin);
  ellipse(context, 256, 166, 128, 84, palette.hair);
  rect(context, 139, 155, 38, 114, palette.hair);
  rect(context, 336, 155, 38, 114, palette.hair);
  if (!masc) {
    rect(context, 132, 218, 42, 156, palette.hair);
    rect(context, 338, 218, 42, 156, palette.hair);
  }
  drawEyes(context, palette.eye, masc ? 'human-masc' : 'human-femme');
  ellipse(context, 207, 253, 26, 11, palette.blush, 0.38);
  ellipse(context, 306, 253, 26, 11, palette.blush, 0.38);
  rect(context, 232, 286, 48, 6, '#7d2838', 0.86);
  rect(context, 202, 364, 108, 32, palette.accent, 0.86);
  if (masc) {
    rect(context, 170, 388, 172, 28, '#f7fbff', 0.9);
    rect(context, 238, 388, 36, 84, palette.skin, 0.82);
  } else {
    ellipse(context, 256, 395, 86, 34, '#f7fbff', 0.92);
    rect(context, 214, 382, 84, 90, palette.outfit);
  }
  drawSparkles(context, palette.accent);
}

function drawGoblin(context: CanvasRenderingContext2D, palette: DatingPortraitPalette, angel: boolean): void {
  rect(context, 0, 0, 512, 512, angel ? '#1d2512' : '#172417');
  if (angel) {
    strokeEllipse(context, 256, 91, 104, 23, '#d7ff8f', 10, 0.72);
  }
  ellipse(context, 256, 478, 156, 112, palette.outfit);
  ellipse(context, 256, 232, 118, 126, palette.skin);
  ellipse(context, 154, 220, 64, 33, palette.skin);
  ellipse(context, 358, 220, 64, 33, palette.skin);
  rect(context, 168, 146, 176, 50, palette.hair);
  rect(context, 182, 132, 148, 28, palette.hair);
  drawEyes(context, palette.eye, 'goblin');
  ellipse(context, 207, 266, 25, 10, palette.blush, 0.32);
  ellipse(context, 306, 266, 25, 10, palette.blush, 0.32);
  rect(context, 231, 298, 50, 7, '#0b1207', 0.84);
  rect(context, 202, 368, 108, 26, palette.accent, 0.92);
  rect(context, 184, 397, 144, 86, palette.outfit);
  rect(context, 236, 390, 40, 74, palette.skin, 0.6);
  if (angel) {
    ellipse(context, 122, 300, 74, 138, '#ddffad', 0.36);
    ellipse(context, 390, 300, 74, 138, '#ddffad', 0.36);
  }
  drawSparkles(context, palette.accent);
}

function drawAngel(context: CanvasRenderingContext2D, palette: DatingPortraitPalette): void {
  rect(context, 0, 0, 512, 512, '#202033');
  strokeEllipse(context, 256, 88, 116, 24, '#fff3a8', 11, 0.8);
  ellipse(context, 112, 310, 82, 154, '#fff7d6', 0.38);
  ellipse(context, 400, 310, 82, 154, '#fff7d6', 0.38);
  drawHuman(context, palette, false);
  strokeEllipse(context, 256, 88, 116, 24, '#fff3a8', 11, 0.8);
  ellipse(context, 112, 310, 82, 154, '#fff7d6', 0.28);
  ellipse(context, 400, 310, 82, 154, '#fff7d6', 0.28);
}

export const datingPortraitRecipe: RuntimeSpriteRecipe<DatingPortraitVariant, DatingPortraitPalette> = {
  id: 'dating-portrait',
  variants: ['human-masc', 'human-femme', 'goblin', 'angel', 'goblin-angel'],
  getPaletteKey(palette): string {
    return [palette.skin, palette.hair, palette.accent, palette.outfit, palette.eye, palette.blush].join('-');
  },
  draw(context, variant, size, palette): void {
    const scale = size / 512;
    context.save();
    context.scale(scale, scale);
    if (variant === 'goblin') drawGoblin(context, palette, false);
    else if (variant === 'goblin-angel') drawGoblin(context, palette, true);
    else if (variant === 'angel') drawAngel(context, palette);
    else drawHuman(context, palette, variant === 'human-masc');
    context.restore();
  },
};
