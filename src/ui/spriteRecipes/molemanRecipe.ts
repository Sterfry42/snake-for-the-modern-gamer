import type { RuntimeSpriteRecipe } from '../runtimeSpriteFactory.js';

export type MolemanSpriteVariant = 'idle' | 'blink' | 'dig';

export interface MolemanSpritePalette {
  furColor: string;
  bellyColor: string;
  clawColor: string;
  helmetColor: string;
  outlineColor: string;
  eyeColor: string;
}

const VARIANTS: readonly MolemanSpriteVariant[] = ['idle', 'blink', 'dig'];

function fillPixel(
  context: CanvasRenderingContext2D,
  px: number,
  py: number,
  pixelSize: number,
  color: string,
): void {
  context.fillStyle = color;
  context.fillRect(px * pixelSize, py * pixelSize, pixelSize, pixelSize);
}

function drawPixels(
  context: CanvasRenderingContext2D,
  points: readonly (readonly [number, number])[],
  pixelSize: number,
  color: string,
): void {
  points.forEach(([x, y]) => fillPixel(context, x, y, pixelSize, color));
}

const BODY = [
  [3, 1],
  [4, 1],
  [2, 2],
  [3, 2],
  [4, 2],
  [5, 2],
  [1, 3],
  [2, 3],
  [3, 3],
  [4, 3],
  [5, 3],
  [6, 3],
  [1, 4],
  [2, 4],
  [3, 4],
  [4, 4],
  [5, 4],
  [6, 4],
  [2, 5],
  [3, 5],
  [4, 5],
  [5, 5],
  [2, 6],
  [3, 6],
  [4, 6],
  [5, 6],
] as const;

const BELLY = [
  [3, 4],
  [4, 4],
  [3, 5],
  [4, 5],
  [3, 6],
  [4, 6],
] as const;

const HELMET = [
  [2, 1],
  [3, 0],
  [4, 0],
  [5, 1],
  [2, 2],
  [3, 1],
  [4, 1],
  [5, 2],
] as const;

const CLAWS_IDLE = [
  [0, 4],
  [1, 5],
  [6, 5],
  [7, 4],
] as const;

const CLAWS_DIG = [
  [0, 5],
  [1, 6],
  [6, 6],
  [7, 5],
] as const;

export const molemanSpriteRecipe: RuntimeSpriteRecipe<MolemanSpriteVariant, MolemanSpritePalette> =
  {
    id: 'moleman',
    variants: VARIANTS,
    getPaletteKey(palette): string {
      return [
        palette.furColor,
        palette.bellyColor,
        palette.clawColor,
        palette.helmetColor,
        palette.outlineColor,
        palette.eyeColor,
      ].join('-');
    },
    draw(context, variant, size, palette): void {
      const pixelSize = Math.max(1, Math.floor(size / 8));
      const spriteSize = pixelSize * 8;
      const offset = Math.floor((size - spriteSize) / 2);

      context.save();
      context.translate(offset, offset);
      context.imageSmoothingEnabled = false;
      drawPixels(context, BODY, pixelSize, palette.outlineColor);
      drawPixels(context, BODY.slice(2, -2), pixelSize, palette.furColor);
      drawPixels(context, BELLY, pixelSize, palette.bellyColor);
      drawPixels(context, HELMET, pixelSize, palette.helmetColor);
      drawPixels(context, variant === 'dig' ? CLAWS_DIG : CLAWS_IDLE, pixelSize, palette.clawColor);
      if (variant === 'blink') {
        fillPixel(context, 2, 3, pixelSize, palette.outlineColor);
        fillPixel(context, 5, 3, pixelSize, palette.outlineColor);
      } else {
        fillPixel(context, 2, 3, pixelSize, palette.eyeColor);
        fillPixel(context, 5, 3, pixelSize, palette.eyeColor);
      }
      fillPixel(context, 3, 3, pixelSize, palette.outlineColor);
      fillPixel(context, 4, 3, pixelSize, palette.outlineColor);
      context.restore();
    },
  };
