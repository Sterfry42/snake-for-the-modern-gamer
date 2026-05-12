import type { RuntimeSpriteRecipe } from '../runtimeSpriteFactory.js';

export type AnimalSpriteVariant =
  | 'rabbit-up'
  | 'rabbit-down'
  | 'rabbit-left'
  | 'rabbit-right'
  | 'rabbit-flash-up'
  | 'rabbit-flash-down'
  | 'rabbit-flash-left'
  | 'rabbit-flash-right'
  | 'fox-up'
  | 'fox-down'
  | 'fox-left'
  | 'fox-right'
  | 'fox-flash-up'
  | 'fox-flash-down'
  | 'fox-flash-left'
  | 'fox-flash-right'
  | 'wolf-up'
  | 'wolf-down'
  | 'wolf-left'
  | 'wolf-right'
  | 'wolf-flash-up'
  | 'wolf-flash-down'
  | 'wolf-flash-left'
  | 'wolf-flash-right'
  | 'deer-up'
  | 'deer-down'
  | 'deer-left'
  | 'deer-right'
  | 'deer-flash-up'
  | 'deer-flash-down'
  | 'deer-flash-left'
  | 'deer-flash-right'
  | 'bear-up'
  | 'bear-down'
  | 'bear-left'
  | 'bear-right'
  | 'bear-flash-up'
  | 'bear-flash-down'
  | 'bear-flash-left'
  | 'bear-flash-right'
  | 'fish-up'
  | 'fish-down'
  | 'fish-left'
  | 'fish-right'
  | 'fish-flash-up'
  | 'fish-flash-down'
  | 'fish-flash-left'
  | 'fish-flash-right'
  | 'bird-up'
  | 'bird-down'
  | 'bird-left'
  | 'bird-right'
  | 'bird-flash-up'
  | 'bird-flash-down'
  | 'bird-flash-left'
  | 'bird-flash-right'
  | 'snake-up'
  | 'snake-down'
  | 'snake-left'
  | 'snake-right'
  | 'snake-flash-up'
  | 'snake-flash-down'
  | 'snake-flash-left'
  | 'snake-flash-right';

export interface AnimalSpritePalette {
  bodyColor: string;
  accentColor: string;
  outlineColor: string;
  eyeColor: string;
  flashColor?: string;
}

const ALL_VARIANTS: readonly AnimalSpriteVariant[] = [
  'rabbit-up', 'rabbit-down', 'rabbit-left', 'rabbit-right',
  'rabbit-flash-up', 'rabbit-flash-down', 'rabbit-flash-left', 'rabbit-flash-right',
  'fox-up', 'fox-down', 'fox-left', 'fox-right',
  'fox-flash-up', 'fox-flash-down', 'fox-flash-left', 'fox-flash-right',
  'wolf-up', 'wolf-down', 'wolf-left', 'wolf-right',
  'wolf-flash-up', 'wolf-flash-down', 'wolf-flash-left', 'wolf-flash-right',
  'deer-up', 'deer-down', 'deer-left', 'deer-right',
  'deer-flash-up', 'deer-flash-down', 'deer-flash-left', 'deer-flash-right',
  'bear-up', 'bear-down', 'bear-left', 'bear-right',
  'bear-flash-up', 'bear-flash-down', 'bear-flash-left', 'bear-flash-right',
  'fish-up', 'fish-down', 'fish-left', 'fish-right',
  'fish-flash-up', 'fish-flash-down', 'fish-flash-left', 'fish-flash-right',
  'bird-up', 'bird-down', 'bird-left', 'bird-right',
  'bird-flash-up', 'bird-flash-down', 'bird-flash-left', 'bird-flash-right',
  'snake-up', 'snake-down', 'snake-left', 'snake-right',
  'snake-flash-up', 'snake-flash-down', 'snake-flash-left', 'snake-flash-right',
];

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

function rotatePoint(x: number, y: number, turns: number): [number, number] {
  let px = x;
  let py = y;
  for (let i = 0; i < turns; i++) {
    const nextX = 8 - py;
    const nextY = px;
    px = nextX;
    py = nextY;
  }
  return [px, py];
}

function rotatePoints(
  points: readonly (readonly [number, number])[],
  turns: number,
): [number, number][] {
  return points.map(([x, y]) => rotatePoint(x, y, turns));
}

function turnsForVariant(variant: AnimalSpriteVariant): number {
  if (variant.endsWith('right')) return 1;
  if (variant.endsWith('down')) return 2;
  if (variant.endsWith('left')) return 3;
  return 0;
}

function getAnimalType(variant: AnimalSpriteVariant): string {
  const parts = variant.split('-');
  return parts[0];
}

function isFlashVariant(variant: AnimalSpriteVariant): boolean {
  return variant.includes('flash');
}

const BODY = [
  [3, 3],
  [4, 3],
  [2, 4],
  [3, 4],
  [4, 4],
  [5, 4],
  [2, 5],
  [3, 5],
  [4, 5],
  [5, 5],
  [3, 6],
  [4, 6],
] as const;

const HEAD = [
  [2, 2],
  [3, 2],
  [4, 2],
  [5, 2],
  [2, 1],
  [3, 1],
  [4, 1],
  [5, 1],
] as const;

const EYES = [
  [3, 2],
  [5, 2],
] as const;

const EYES_FLASH = [
  [3, 2],
  [5, 2],
] as const;

const RABBIT_EARS = [
  [2, 0],
  [3, 0],
  [2, 1],
  [3, 1],
] as const;

const FOX_NOSE = [
  [3, 1],
  [4, 1],
  [3, 0],
  [4, 0],
] as const;

const WOLF_NOSE = [
  [3, 1],
  [4, 1],
  [3, 0],
  [4, 0],
] as const;

const DEER_ANTLERS = [
  [2, 0],
  [2, -1],
  [3, 0],
  [3, -1],
  [5, 0],
  [5, -1],
  [6, 0],
  [6, -1],
] as const;

const BEAR_EARS = [
  [2, 0],
  [3, 0],
  [5, 0],
  [6, 0],
] as const;

const FISH_TAIL = [
  [6, 3],
  [7, 3],
  [6, 4],
  [7, 4],
  [6, 5],
  [7, 5],
] as const;

const BIRD_BEAK = [
  [7, 2],
  [8, 2],
] as const;

const BIRD_WING = [
  [4, 4],
  [5, 4],
] as const;

const SNAKE_HEAD = [
  [1, 3],
  [2, 3],
  [1, 4],
  [2, 4],
  [1, 5],
  [2, 5],
] as const;

export const animalSpriteRecipe: RuntimeSpriteRecipe<AnimalSpriteVariant, AnimalSpritePalette> = {
  id: 'animal',
  variants: ALL_VARIANTS,
  getPaletteKey(palette): string {
    return [
      palette.bodyColor,
      palette.accentColor,
      palette.outlineColor,
      palette.eyeColor,
      palette.flashColor ?? '',
    ].join('-');
  },
  draw(context, variant, size, palette): void {
    const pixelSize = Math.max(1, Math.floor(size / 8));
    const spriteSize = pixelSize * 8;
    const offset = Math.floor((size - spriteSize) / 2);

    context.save();
    context.translate(offset, offset);
    context.imageSmoothingEnabled = false;

    const turns = turnsForVariant(variant);
    const isFlash = isFlashVariant(variant);
    const animalType = getAnimalType(variant);

    const drawPoints = (pts: readonly (readonly [number, number])[], col: string) => {
      drawPixels(context, rotatePoints(pts, turns), pixelSize, col);
    };

    drawPoints(BODY, palette.bodyColor);
    drawPoints(HEAD, palette.bodyColor);
    drawPoints(EYES, isFlash ? palette.flashColor ?? palette.eyeColor : palette.eyeColor);

    drawPoints(BODY, palette.outlineColor);
    drawPoints(HEAD, palette.outlineColor);

    switch (animalType) {
      case 'rabbit':
        drawPoints(RABBIT_EARS, palette.outlineColor);
        break;
      case 'fox':
        drawPoints(FOX_NOSE, palette.accentColor);
        break;
      case 'wolf':
        drawPoints(WOLF_NOSE, '#333333');
        break;
      case 'deer':
        drawPoints(DEER_ANTLERS, palette.outlineColor);
        break;
      case 'bear':
        drawPoints(BEAR_EARS, palette.outlineColor);
        break;
      case 'fish':
        drawPoints(FISH_TAIL, palette.accentColor);
        break;
      case 'bird':
        drawPoints(BIRD_BEAK, palette.flashColor ?? '#ffaa00');
        drawPoints(BIRD_WING, palette.accentColor);
        break;
      case 'snake':
        drawPoints(SNAKE_HEAD, palette.outlineColor);
        break;
    }

    if (isFlash) {
      drawPoints(EYES_FLASH, palette.flashColor ?? '#ffffff');
    }

    context.restore();
  },
};
