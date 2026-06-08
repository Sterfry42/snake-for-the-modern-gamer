import type { RuntimeSpriteRecipe } from '../runtimeSpriteFactory.js';

type AnimalSpriteType =
  | 'rabbit'
  | 'fox'
  | 'wolf'
  | 'deer'
  | 'bear'
  | 'fish'
  | 'bird'
  | 'snake'
  | 'eagle'
  | 'jackalope'
  | 'raccoon'
  | 'coyote'
  | 'bison'
  | 'bass'
  | 'possum'
  | 'armadillo';
type AnimalSpriteDirection = 'up' | 'down' | 'left' | 'right';
export type AnimalSpriteVariant =
  | `${AnimalSpriteType}-${AnimalSpriteDirection}`
  | `${AnimalSpriteType}-flash-${AnimalSpriteDirection}`;

export interface AnimalSpritePalette {
  bodyColor: string;
  accentColor: string;
  outlineColor: string;
  eyeColor: string;
  flashColor?: string;
}

const ANIMAL_SPRITE_TYPES: readonly AnimalSpriteType[] = [
  'rabbit',
  'fox',
  'wolf',
  'deer',
  'bear',
  'fish',
  'bird',
  'snake',
  'eagle',
  'jackalope',
  'raccoon',
  'coyote',
  'bison',
  'bass',
  'possum',
  'armadillo',
];
const ANIMAL_DIRECTIONS: readonly AnimalSpriteDirection[] = ['up', 'down', 'left', 'right'];
const ALL_VARIANTS: readonly AnimalSpriteVariant[] = ANIMAL_SPRITE_TYPES.flatMap((type) =>
  ANIMAL_DIRECTIONS.flatMap((direction) => [
    `${type}-${direction}` as AnimalSpriteVariant,
    `${type}-flash-${direction}` as AnimalSpriteVariant,
  ]),
);

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

const EAGLE_WINGS = [
  [1, 3],
  [2, 3],
  [6, 3],
  [7, 3],
  [0, 4],
  [1, 4],
  [7, 4],
  [8, 4],
] as const;

const JACKALOPE_ANTLERS = [
  [2, 0],
  [2, -1],
  [3, 0],
  [5, 0],
  [6, 0],
  [6, -1],
] as const;

const RACCOON_MASK = [
  [2, 2],
  [3, 2],
  [5, 2],
  [6, 2],
] as const;

const BISON_HORNS = [
  [1, 1],
  [2, 1],
  [6, 1],
  [7, 1],
] as const;

const ARMADILLO_SHELL = [
  [2, 4],
  [3, 4],
  [4, 4],
  [5, 4],
  [3, 5],
  [4, 5],
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
    drawPoints(EYES, isFlash ? (palette.flashColor ?? palette.eyeColor) : palette.eyeColor);

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
      case 'eagle':
        drawPoints(EAGLE_WINGS, palette.accentColor);
        drawPoints(BIRD_BEAK, palette.flashColor ?? '#ffaa00');
        break;
      case 'jackalope':
        drawPoints(RABBIT_EARS, palette.outlineColor);
        drawPoints(JACKALOPE_ANTLERS, palette.accentColor);
        break;
      case 'raccoon':
        drawPoints(RACCOON_MASK, palette.outlineColor);
        break;
      case 'coyote':
        drawPoints(FOX_NOSE, palette.accentColor);
        break;
      case 'bison':
        drawPoints(BEAR_EARS, palette.outlineColor);
        drawPoints(BISON_HORNS, palette.accentColor);
        break;
      case 'bass':
        drawPoints(FISH_TAIL, palette.accentColor);
        drawPoints(BIRD_WING, palette.outlineColor);
        break;
      case 'possum':
        drawPoints(FOX_NOSE, palette.flashColor ?? palette.accentColor);
        break;
      case 'armadillo':
        drawPoints(ARMADILLO_SHELL, palette.accentColor);
        break;
    }

    if (isFlash) {
      drawPoints(EYES_FLASH, palette.flashColor ?? '#ffffff');
    }

    context.restore();
  },
};
