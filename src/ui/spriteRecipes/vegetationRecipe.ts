import type { RuntimeSpriteRecipe } from '../runtimeSpriteFactory.js';
import type { VegetationType } from '../../world/types.js';

export interface VegetationSpritePalette {
  biomeAccentColor: number;
  paletteSize: number;
}

export type VegetationSpriteVariant = VegetationType;

const VARIANTS: readonly VegetationType[] = [
  'grass-1',
  'grass-2',
  'grass-3',
  'grass-4',
  'grass-5',
  'flower-1',
  'flower-2',
  'flower-3',
  'flower-4',
  'flower-5',
  'bush-1',
  'bush-2',
  'bush-3',
  'bush-4',
  'bush-5',
  'mushroom-1',
  'mushroom-2',
  'mushroom-3',
  'mushroom-4',
  'mushroom-5',
  'vine-1',
  'vine-2',
  'vine-3',
  'vine-4',
  'vine-5',
  'rock-1',
  'rock-2',
  'rock-3',
  'rock-4',
  'rock-5',
  'tree-1',
  'tree-2',
  'tree-3',
  'tree-4',
  'tree-5',
  'decor-1',
  'decor-2',
  'decor-3',
  'decor-4',
  'decor-5',
  'cactus-1',
  'cactus-2',
  'cactus-3',
  'cactus-4',
  'cactus-5',
] as const;

const VARIANT_BASE_COLORS: Record<VegetationType, { fill: string; outline: string }> = {
  'grass-1': { fill: '#cccccc', outline: '#999999' },
  'grass-2': { fill: '#d0d0d0', outline: '#999999' },
  'grass-3': { fill: '#c8c8c8', outline: '#888888' },
  'grass-4': { fill: '#d4d4d4', outline: '#9a9a9a' },
  'grass-5': { fill: '#c0c0c0', outline: '#808080' },
  'flower-1': { fill: '#e0d0d0', outline: '#b09090' },
  'flower-2': { fill: '#d8d0d8', outline: '#a890a8' },
  'flower-3': { fill: '#e8d0d8', outline: '#c090a0' },
  'flower-4': { fill: '#d0d8e0', outline: '#a0a8b0' },
  'flower-5': { fill: '#e0d8d0', outline: '#b0a890' },
  'bush-1': { fill: '#b8b8b8', outline: '#888888' },
  'bush-2': { fill: '#b0b0b0', outline: '#808080' },
  'bush-3': { fill: '#a8a8a8', outline: '#787878' },
  'bush-4': { fill: '#b4b4b4', outline: '#848484' },
  'bush-5': { fill: '#acacac', outline: '#7c7c7c' },
  'mushroom-1': { fill: '#c8c8d0', outline: '#9898a0' },
  'mushroom-2': { fill: '#d0c8c8', outline: '#a09898' },
  'mushroom-3': { fill: '#c0c8c8', outline: '#909898' },
  'mushroom-4': { fill: '#d8c8d0', outline: '#a898a0' },
  'mushroom-5': { fill: '#c8c8c0', outline: '#989890' },
  'vine-1': { fill: '#a8a8b0', outline: '#787880' },
  'vine-2': { fill: '#b0a8a8', outline: '#807878' },
  'vine-3': { fill: '#a8b0a8', outline: '#788078' },
  'vine-4': { fill: '#a0a8b0', outline: '#707880' },
  'vine-5': { fill: '#b0a0a8', outline: '#807078' },
  'rock-1': { fill: '#909090', outline: '#606060' },
  'rock-2': { fill: '#888888', outline: '#585858' },
  'rock-3': { fill: '#989898', outline: '#686868' },
  'rock-4': { fill: '#808080', outline: '#505050' },
  'rock-5': { fill: '#949494', outline: '#646464' },
  'tree-1': { fill: '#b0b0b0', outline: '#808080' },
  'tree-2': { fill: '#a8a8a8', outline: '#787878' },
  'tree-3': { fill: '#a0a0a0', outline: '#707070' },
  'tree-4': { fill: '#b4b4b4', outline: '#848484' },
  'tree-5': { fill: '#aca8a0', outline: '#7c7870' },
  'decor-1': { fill: '#d0d0d0', outline: '#a0a0a0' },
  'decor-2': { fill: '#d8d8d0', outline: '#a8a8a0' },
  'decor-3': { fill: '#d0d8d8', outline: '#a0a8a8' },
  'decor-4': { fill: '#d8d0d8', outline: '#a8a0a8' },
  'decor-5': { fill: '#d4d4d4', outline: '#a4a4a4' },
  'cactus-1': { fill: '#88aa66', outline: '#557733' },
  'cactus-2': { fill: '#77aa55', outline: '#447733' },
  'cactus-3': { fill: '#66aa44', outline: '#336622' },
  'cactus-4': { fill: '#88bb77', outline: '#558844' },
  'cactus-5': { fill: '#77aa66', outline: '#447733' },
};

function drawSprite(
  context: CanvasRenderingContext2D,
  size: number,
  draw: (pixelSize: number, fill: string, outline: string) => void,
  baseColors: { fill: string; outline: string },
): void {
  const pixelSize = Math.max(1, Math.floor(size / 8));
  const spriteSize = pixelSize * 8;
  const offset = Math.floor((size - spriteSize) / 2);
  context.save();
  context.translate(offset, offset);
  context.imageSmoothingEnabled = false;
  draw(pixelSize, baseColors.fill, baseColors.outline);
  context.restore();
}

function fillPixel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  pixelSize: number,
  color: string,
): void {
  context.fillStyle = color;
  context.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
}

function drawPixels(
  context: CanvasRenderingContext2D,
  points: readonly [number, number][],
  pixelSize: number,
  color: string,
): void {
  points.forEach(([px, py]) => fillPixel(context, px, py, pixelSize, color));
}

function drawVariant(
  context: CanvasRenderingContext2D,
  variant: VegetationType,
  size: number,
): void {
  const colors = VARIANT_BASE_COLORS[variant];
  colors.fill;

  drawSprite(
    context,
    size,
    (ps, fill, outline) => {
      switch (variant) {
        case 'grass-1':
          drawPixels(
            context,
            [
              [3, 1],
              [4, 1],
              [3, 2],
              [4, 2],
              [3, 3],
              [4, 3],
              [3, 4],
              [4, 4],
              [3, 5],
              [4, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [3, 0],
              [4, 0],
              [3, 6],
              [4, 6],
            ],
            ps,
            outline,
          );
          break;
        case 'grass-2':
          drawPixels(
            context,
            [
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
              [3, 3],
              [4, 3],
              [3, 4],
              [4, 4],
              [3, 5],
              [4, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 1],
              [5, 1],
              [2, 6],
              [5, 6],
            ],
            ps,
            outline,
          );
          break;
        case 'grass-3':
          drawPixels(
            context,
            [
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [3, 2],
              [4, 2],
              [3, 4],
              [4, 4],
              [3, 5],
              [4, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 2],
              [5, 2],
              [2, 6],
              [5, 6],
            ],
            ps,
            outline,
          );
          break;
        case 'grass-4':
          drawPixels(
            context,
            [
              [3, 2],
              [3, 3],
              [3, 4],
              [3, 5],
              [4, 2],
              [4, 3],
              [4, 4],
              [4, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 3],
              [5, 3],
              [3, 1],
              [4, 1],
              [3, 6],
              [4, 6],
            ],
            ps,
            outline,
          );
          break;
        case 'grass-5':
          drawPixels(
            context,
            [
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
              [3, 2],
              [4, 2],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 3],
              [6, 3],
              [3, 1],
              [4, 1],
              [2, 5],
              [5, 5],
            ],
            ps,
            outline,
          );
          break;
        case 'flower-1':
          drawPixels(
            context,
            [
              [3, 1],
              [3, 2],
              [3, 3],
              [3, 4],
              [3, 5],
              [3, 6],
            ],
            ps,
            outline,
          );
          drawPixels(
            context,
            [
              [2, 2],
              [4, 2],
              [2, 4],
              [4, 4],
              [2, 6],
              [4, 6],
              [1, 3],
              [5, 3],
              [1, 5],
              [5, 5],
            ],
            ps,
            fill,
          );
          break;
        case 'flower-2':
          drawPixels(
            context,
            [
              [4, 2],
              [4, 3],
              [4, 4],
              [4, 5],
            ],
            ps,
            outline,
          );
          drawPixels(
            context,
            [
              [3, 1],
              [5, 1],
              [3, 6],
              [5, 6],
              [2, 3],
              [5, 3],
              [2, 4],
              [5, 4],
              [2, 5],
              [5, 5],
            ],
            ps,
            fill,
          );
          break;
        case 'flower-3':
          drawPixels(
            context,
            [
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
              [2, 5],
              [3, 5],
              [4, 5],
              [5, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 2],
              [5, 2],
              [1, 4],
              [6, 4],
            ],
            ps,
            outline,
          );
          break;
        case 'flower-4':
          drawPixels(
            context,
            [
              [3, 2],
              [4, 2],
              [3, 3],
              [4, 3],
              [3, 4],
              [4, 4],
              [3, 5],
              [4, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [3, 1],
              [4, 1],
              [3, 6],
              [4, 6],
              [2, 3],
              [5, 3],
              [2, 4],
              [5, 4],
            ],
            ps,
            outline,
          );
          break;
        case 'flower-5':
          drawPixels(
            context,
            [
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
              [3, 3],
              [4, 3],
              [2, 5],
              [5, 5],
              [3, 5],
              [4, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 3],
              [5, 3],
              [3, 2],
              [4, 2],
              [2, 6],
              [5, 6],
              [1, 4],
              [6, 4],
            ],
            ps,
            outline,
          );
          break;
        case 'bush-1':
          drawPixels(
            context,
            [
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [3, 4],
              [4, 4],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 3],
              [6, 3],
              [2, 1],
              [5, 1],
              [3, 5],
              [4, 5],
              [1, 2],
              [6, 2],
            ],
            ps,
            outline,
          );
          break;
        case 'bush-2':
          drawPixels(
            context,
            [
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
              [3, 5],
              [4, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 3],
              [6, 3],
              [1, 4],
              [6, 4],
              [2, 1],
              [5, 1],
              [2, 6],
              [5, 6],
            ],
            ps,
            outline,
          );
          break;
        case 'bush-3':
          drawPixels(
            context,
            [
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 2],
              [6, 2],
              [1, 3],
              [6, 3],
              [1, 4],
              [6, 4],
              [2, 1],
              [5, 1],
              [2, 6],
              [5, 6],
            ],
            ps,
            outline,
          );
          break;
        case 'bush-4':
          drawPixels(
            context,
            [
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
              [2, 5],
              [3, 5],
              [4, 5],
              [5, 5],
              [3, 2],
              [4, 2],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 4],
              [6, 4],
              [2, 2],
              [5, 2],
              [2, 6],
              [5, 6],
              [3, 1],
              [4, 1],
            ],
            ps,
            outline,
          );
          break;
        case 'bush-5':
          drawPixels(
            context,
            [
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
              [3, 5],
              [4, 5],
              [2, 6],
              [5, 6],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 2],
              [6, 2],
              [1, 3],
              [6, 3],
              [1, 4],
              [6, 4],
              [1, 6],
              [6, 6],
              [2, 1],
              [5, 1],
            ],
            ps,
            outline,
          );
          break;
        case 'mushroom-1':
          drawPixels(
            context,
            [
              [3, 3],
              [4, 3],
              [3, 4],
              [4, 4],
            ],
            ps,
            outline,
          );
          drawPixels(
            context,
            [
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [3, 1],
              [4, 1],
            ],
            ps,
            outline,
          );
          break;
        case 'mushroom-2':
          drawPixels(
            context,
            [
              [3, 3],
              [4, 3],
              [3, 4],
              [4, 4],
            ],
            ps,
            outline,
          );
          drawPixels(
            context,
            [
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 1],
              [3, 1],
              [4, 1],
              [5, 1],
            ],
            ps,
            fill,
          );
          break;
        case 'mushroom-3':
          drawPixels(
            context,
            [
              [3, 3],
              [4, 3],
              [3, 4],
              [4, 4],
            ],
            ps,
            outline,
          );
          drawPixels(
            context,
            [
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 3],
              [6, 3],
            ],
            ps,
            fill,
          );
          break;
        case 'mushroom-4':
          drawPixels(
            context,
            [
              [3, 3],
              [4, 3],
              [3, 4],
              [4, 4],
            ],
            ps,
            outline,
          );
          drawPixels(
            context,
            [
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [3, 1],
              [4, 1],
              [2, 1],
              [5, 1],
            ],
            ps,
            fill,
          );
          break;
        case 'mushroom-5':
          drawPixels(
            context,
            [
              [3, 3],
              [4, 3],
              [3, 4],
              [4, 4],
            ],
            ps,
            outline,
          );
          drawPixels(
            context,
            [
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 1],
              [5, 1],
              [3, 0],
              [4, 0],
            ],
            ps,
            fill,
          );
          break;
        case 'vine-1':
          drawPixels(
            context,
            [
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [3, 4],
              [4, 4],
            ],
            ps,
            outline,
          );
          drawPixels(
            context,
            [
              [1, 3],
              [6, 3],
            ],
            ps,
            outline,
          );
          break;
        case 'vine-2':
          drawPixels(
            context,
            [
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 1],
              [5, 1],
              [2, 5],
              [5, 5],
            ],
            ps,
            outline,
          );
          break;
        case 'vine-3':
          drawPixels(
            context,
            [
              [3, 1],
              [4, 1],
              [3, 2],
              [4, 2],
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
              [3, 5],
              [4, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 2],
              [5, 2],
              [3, 0],
              [4, 0],
              [3, 6],
              [4, 6],
            ],
            ps,
            outline,
          );
          break;
        case 'vine-4':
          drawPixels(
            context,
            [
              [3, 1],
              [4, 1],
              [3, 2],
              [4, 2],
              [3, 3],
              [4, 3],
              [3, 4],
              [4, 4],
              [3, 5],
              [4, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 2],
              [5, 2],
              [2, 5],
              [5, 5],
              [3, 0],
              [4, 0],
            ],
            ps,
            outline,
          );
          break;
        case 'vine-5':
          drawPixels(
            context,
            [
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
              [2, 5],
              [3, 5],
              [4, 5],
              [5, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 3],
              [6, 3],
              [2, 1],
              [5, 1],
              [2, 6],
              [5, 6],
            ],
            ps,
            outline,
          );
          break;
        case 'rock-1':
          drawPixels(
            context,
            [
              [3, 3],
              [4, 3],
              [3, 4],
              [4, 4],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 3],
              [5, 3],
              [2, 4],
              [5, 4],
              [3, 2],
              [4, 2],
              [3, 5],
              [4, 5],
            ],
            ps,
            outline,
          );
          break;
        case 'rock-2':
          drawPixels(
            context,
            [
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 3],
              [6, 3],
              [1, 4],
              [6, 4],
              [2, 2],
              [5, 2],
              [2, 5],
              [5, 5],
            ],
            ps,
            outline,
          );
          break;
        case 'rock-3':
          drawPixels(
            context,
            [
              [2, 2],
              [3, 2],
              [4, 2],
              [2, 3],
              [3, 3],
              [4, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 3],
              [6, 3],
              [1, 4],
              [6, 4],
              [2, 1],
              [3, 1],
              [4, 1],
              [5, 1],
              [2, 5],
              [3, 5],
              [4, 5],
              [5, 5],
            ],
            ps,
            outline,
          );
          break;
        case 'rock-4':
          drawPixels(
            context,
            [
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [3, 2],
              [4, 2],
              [2, 2],
              [5, 2],
              [3, 5],
              [4, 5],
              [2, 5],
              [5, 5],
              [1, 3],
              [6, 3],
            ],
            ps,
            outline,
          );
          break;
        case 'rock-5':
          drawPixels(
            context,
            [
              [2, 2],
              [3, 2],
              [2, 3],
              [3, 3],
              [4, 4],
              [5, 4],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 5],
              [3, 5],
              [4, 2],
              [5, 2],
              [4, 3],
              [5, 3],
              [1, 3],
              [6, 3],
            ],
            ps,
            outline,
          );
          break;
        case 'tree-1':
          drawPixels(
            context,
            [
              [4, 4],
              [4, 5],
            ],
            ps,
            outline,
          );
          drawPixels(
            context,
            [
              [3, 2],
              [3, 3],
              [4, 2],
              [4, 3],
              [5, 2],
              [5, 3],
            ],
            ps,
            fill,
          );
          break;
        case 'tree-2':
          drawPixels(
            context,
            [
              [4, 3],
              [4, 4],
              [4, 5],
            ],
            ps,
            outline,
          );
          drawPixels(
            context,
            [
              [3, 1],
              [3, 2],
              [4, 1],
              [4, 2],
              [5, 1],
              [5, 2],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 2],
              [6, 2],
              [3, 3],
              [5, 3],
            ],
            ps,
            fill,
          );
          break;
        case 'tree-3':
          drawPixels(
            context,
            [
              [3, 3],
              [4, 3],
              [3, 4],
              [4, 4],
            ],
            ps,
            outline,
          );
          drawPixels(
            context,
            [
              [2, 1],
              [3, 1],
              [4, 1],
              [5, 1],
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 2],
              [6, 2],
              [2, 3],
              [5, 3],
            ],
            ps,
            fill,
          );
          break;
        case 'tree-4':
          drawPixels(
            context,
            [
              [3, 3],
              [4, 3],
              [3, 4],
              [4, 4],
            ],
            ps,
            outline,
          );
          drawPixels(
            context,
            [
              [2, 1],
              [3, 1],
              [4, 1],
              [5, 1],
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 1],
              [6, 1],
              [1, 2],
              [6, 2],
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
            ],
            ps,
            fill,
          );
          break;
        case 'tree-5':
          drawPixels(
            context,
            [
              [3, 3],
              [4, 3],
              [3, 4],
              [4, 4],
            ],
            ps,
            outline,
          );
          drawPixels(
            context,
            [
              [2, 1],
              [3, 1],
              [4, 1],
              [5, 1],
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 1],
              [6, 1],
              [1, 2],
              [6, 2],
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [2, 0],
              [5, 0],
            ],
            ps,
            fill,
          );
          break;
        case 'decor-1':
          drawPixels(
            context,
            [
              [3, 3],
              [4, 3],
              [3, 4],
              [4, 4],
            ],
            ps,
            outline,
          );
          drawPixels(
            context,
            [
              [2, 2],
              [3, 2],
              [4, 2],
              [5, 2],
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
            ],
            ps,
            fill,
          );
          break;
        case 'decor-2':
          drawPixels(
            context,
            [
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [3, 4],
              [4, 4],
              [3, 5],
              [4, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 2],
              [5, 2],
              [3, 2],
              [4, 2],
              [2, 6],
              [5, 6],
            ],
            ps,
            outline,
          );
          break;
        case 'decor-3':
          drawPixels(
            context,
            [
              [3, 2],
              [4, 2],
              [3, 3],
              [4, 3],
              [3, 4],
              [4, 4],
              [3, 5],
              [4, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [3, 1],
              [4, 1],
              [3, 6],
              [4, 6],
              [2, 3],
              [5, 3],
              [2, 4],
              [5, 4],
              [2, 5],
              [5, 5],
            ],
            ps,
            outline,
          );
          break;
        case 'decor-4':
          drawPixels(
            context,
            [
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
              [2, 5],
              [3, 5],
              [4, 5],
              [5, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 3],
              [6, 3],
              [1, 4],
              [6, 4],
              [2, 2],
              [5, 2],
              [2, 6],
              [5, 6],
            ],
            ps,
            outline,
          );
          break;
        case 'decor-5':
          drawPixels(
            context,
            [
              [3, 2],
              [3, 3],
              [4, 3],
              [4, 4],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 2],
              [5, 2],
              [2, 4],
              [5, 4],
              [3, 1],
              [4, 1],
              [3, 6],
              [4, 6],
            ],
            ps,
            outline,
          );
          break;
        case 'cactus-1':
          // Classic barrel cactus
          drawPixels(
            context,
            [
              [3, 2],
              [4, 2],
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
              [3, 5],
              [4, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [2, 2],
              [5, 2],
              [1, 3],
              [6, 3],
              [1, 4],
              [6, 4],
              [2, 5],
              [5, 5],
              [3, 1],
              [4, 1],
              [3, 6],
              [4, 6],
            ],
            ps,
            outline,
          );
          break;
        case 'cactus-2':
          // Saguaro with one arm
          drawPixels(
            context,
            [
              [4, 2],
              [4, 3],
              [4, 4],
              [4, 5],
              [3, 3],
              [3, 4],
              [3, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [3, 2],
              [4, 1],
              [4, 6],
              [2, 3],
              [2, 4],
              [2, 5],
              [3, 6],
              [5, 3],
              [5, 4],
              [5, 5],
            ],
            ps,
            outline,
          );
          break;
        case 'cactus-3':
          // Prickly pear pad
          drawPixels(
            context,
            [
              [2, 3],
              [3, 3],
              [4, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [2, 5],
              [3, 5],
              [4, 5],
              [5, 4],
              [5, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 3],
              [5, 3],
              [1, 4],
              [5, 4],
              [1, 5],
              [6, 4],
              [2, 2],
              [3, 2],
              [4, 2],
              [2, 6],
              [3, 6],
              [4, 6],
            ],
            ps,
            outline,
          );
          break;
        case 'cactus-4':
          // Tall cholla
          drawPixels(
            context,
            [
              [3, 1],
              [4, 1],
              [3, 2],
              [4, 2],
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
              [2, 4],
              [3, 4],
              [4, 4],
              [5, 4],
              [3, 5],
              [4, 5],
              [3, 6],
              [4, 6],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [3, 0],
              [4, 0],
              [2, 1],
              [5, 1],
              [1, 3],
              [6, 3],
              [1, 4],
              [6, 4],
              [2, 5],
              [5, 5],
              [2, 6],
              [5, 6],
            ],
            ps,
            outline,
          );
          break;
        case 'cactus-5':
          // Cluster of small cacti
          drawPixels(
            context,
            [
              [2, 3],
              [3, 3],
              [2, 4],
              [3, 4],
              [5, 2],
              [6, 2],
              [5, 3],
              [6, 3],
              [4, 4],
              [5, 4],
              [4, 5],
              [5, 5],
            ],
            ps,
            fill,
          );
          drawPixels(
            context,
            [
              [1, 3],
              [4, 3],
              [1, 4],
              [4, 4],
              [4, 1],
              [7, 1],
              [4, 2],
              [7, 2],
              [3, 5],
              [6, 5],
              [3, 6],
              [6, 6],
            ],
            ps,
            outline,
          );
          break;
      }
    },
    colors,
  );
}

export const vegetationSpriteRecipe: RuntimeSpriteRecipe<
  VegetationSpriteVariant,
  VegetationSpritePalette
> = {
  id: 'vegetation',
  variants: VARIANTS,
  getPaletteKey(_palette): string {
    return 'default';
  },
  draw(context: CanvasRenderingContext2D, variant: VegetationSpriteVariant, size: number): void {
    drawVariant(context, variant, size);
  },
};
