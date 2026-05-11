import type { RuntimeSpriteRecipe } from '../runtimeSpriteFactory.js';

export type SnakeSpriteVariant =
  | 'head-up'
  | 'head-down'
  | 'head-left'
  | 'head-right'
  | 'body-horizontal'
  | 'body-vertical'
  | 'turn-up-right'
  | 'turn-right-down'
  | 'turn-down-left'
  | 'turn-left-up'
  | 'tail-up'
  | 'tail-down'
  | 'tail-left'
  | 'tail-right';

export interface SnakeSpritePalette {
  baseColor: string;
  bellyColor: string;
  patternColor: string;
  outlineColor: string;
  eyeColor: string;
}

const VARIANTS: readonly SnakeSpriteVariant[] = [
  'head-up',
  'head-down',
  'head-left',
  'head-right',
  'body-horizontal',
  'body-vertical',
  'turn-up-right',
  'turn-right-down',
  'turn-down-left',
  'turn-left-up',
  'tail-up',
  'tail-down',
  'tail-left',
  'tail-right',
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
  points: ReadonlyArray<readonly [number, number]>,
  pixelSize: number,
  color: string,
): void {
  points.forEach(([x, y]) => fillPixel(context, x, y, pixelSize, color));
}

function rotatePoint(x: number, y: number, turns: number): [number, number] {
  let px = x;
  let py = y;
  for (let i = 0; i < turns; i++) {
    const nextX = 7 - py;
    const nextY = px;
    px = nextX;
    py = nextY;
  }
  return [px, py];
}

function rotatePoints(
  points: ReadonlyArray<readonly [number, number]>,
  turns: number,
): [number, number][] {
  return points.map(([x, y]) => rotatePoint(x, y, turns));
}

function directionToTurns(direction: 'up' | 'right' | 'down' | 'left'): number {
  switch (direction) {
    case 'right':
      return 1;
    case 'down':
      return 2;
    case 'left':
      return 3;
    default:
      return 0;
  }
}

const HEAD_BASE = {
  outline: [
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 1],
    [5, 1],
    [6, 1],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 2],
    [6, 2],
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
    [4, 3],
    [5, 3],
    [6, 3],
    [7, 3],
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
    [5, 4],
    [6, 4],
    [7, 4],
    [1, 5],
    [2, 5],
    [3, 5],
    [4, 5],
    [5, 5],
    [6, 5],
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 6],
    [5, 6],
    [6, 6],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
  ] as const,
  base: [
    [2, 1],
    [3, 1],
    [4, 1],
    [5, 1],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 2],
    [6, 2],
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
    [1, 5],
    [2, 5],
    [3, 5],
    [4, 5],
    [5, 5],
    [6, 5],
    [2, 6],
    [3, 6],
    [4, 6],
    [5, 6],
  ] as const,
  belly: [
    [3, 4],
    [4, 4],
    [3, 5],
    [4, 5],
    [3, 6],
    [4, 6],
  ] as const,
  pattern: [
    [2, 2],
    [5, 2],
    [2, 5],
    [5, 5],
  ] as const,
  eyes: [
    [2, 3],
    [5, 3],
  ] as const,
};

const BODY_HORIZONTAL = {
  outline: [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 1],
    [5, 1],
    [6, 1],
    [7, 1],
    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 2],
    [6, 2],
    [7, 2],
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
    [4, 3],
    [5, 3],
    [6, 3],
    [7, 3],
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
    [5, 4],
    [6, 4],
    [7, 4],
    [0, 5],
    [1, 5],
    [2, 5],
    [3, 5],
    [4, 5],
    [5, 5],
    [6, 5],
    [7, 5],
    [0, 6],
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 6],
    [5, 6],
    [6, 6],
    [7, 6],
  ] as const,
  base: [
    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 2],
    [6, 2],
    [7, 2],
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
    [4, 3],
    [5, 3],
    [6, 3],
    [7, 3],
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
    [5, 4],
    [6, 4],
    [7, 4],
    [0, 5],
    [1, 5],
    [2, 5],
    [3, 5],
    [4, 5],
    [5, 5],
    [6, 5],
    [7, 5],
  ] as const,
  belly: [
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
    [5, 4],
    [6, 4],
    [7, 4],
  ] as const,
  pattern: [
    [1, 2],
    [3, 2],
    [5, 2],
    [7, 2],
  ] as const,
};

const TURN_LEFT_UP = {
  outline: [
    [4, 0],
    [5, 0],
    [3, 1],
    [4, 1],
    [5, 1],
    [6, 1],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 2],
    [6, 2],
    [1, 3],
    [2, 3],
    [3, 3],
    [4, 3],
    [5, 3],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
    [1, 5],
    [2, 5],
    [3, 5],
    [1, 6],
    [2, 6],
  ] as const,
  base: [
    [4, 1],
    [5, 1],
    [3, 2],
    [4, 2],
    [5, 2],
    [2, 3],
    [3, 3],
    [4, 3],
    [2, 4],
    [3, 4],
    [2, 5],
  ] as const,
  belly: [
    [4, 2],
    [3, 3],
    [2, 4],
  ] as const,
  pattern: [
    [5, 2],
    [2, 3],
  ] as const,
};

const TAIL_UP = {
  outline: [
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
    [2, 1],
    [3, 1],
    [4, 1],
    [5, 1],
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
    [3, 5],
    [4, 5],
    [3, 6],
    [4, 6],
    [3, 7],
    [4, 7],
  ] as const,
  base: [
    [3, 0],
    [4, 0],
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
    [3, 6],
    [4, 6],
  ] as const,
  belly: [
    [3, 4],
    [4, 4],
    [3, 5],
    [4, 5],
    [3, 6],
    [4, 6],
  ] as const,
  pattern: [
    [3, 1],
    [4, 1],
  ] as const,
};

function drawHead(
  context: CanvasRenderingContext2D,
  direction: 'up' | 'right' | 'down' | 'left',
  pixelSize: number,
  palette: SnakeSpritePalette,
): void {
  const turns = directionToTurns(direction);
  drawPixels(context, rotatePoints(HEAD_BASE.outline, turns), pixelSize, palette.outlineColor);
  drawPixels(context, rotatePoints(HEAD_BASE.base, turns), pixelSize, palette.baseColor);
  drawPixels(context, rotatePoints(HEAD_BASE.belly, turns), pixelSize, palette.bellyColor);
  drawPixels(context, rotatePoints(HEAD_BASE.pattern, turns), pixelSize, palette.patternColor);
  drawPixels(context, rotatePoints(HEAD_BASE.eyes, turns), pixelSize, palette.eyeColor);
}

function drawBody(
  context: CanvasRenderingContext2D,
  vertical: boolean,
  pixelSize: number,
  palette: SnakeSpritePalette,
): void {
  const turns = vertical ? 1 : 0;
  drawPixels(
    context,
    rotatePoints(BODY_HORIZONTAL.outline, turns),
    pixelSize,
    palette.outlineColor,
  );
  drawPixels(context, rotatePoints(BODY_HORIZONTAL.base, turns), pixelSize, palette.baseColor);
  drawPixels(context, rotatePoints(BODY_HORIZONTAL.belly, turns), pixelSize, palette.bellyColor);
  drawPixels(
    context,
    rotatePoints(BODY_HORIZONTAL.pattern, turns),
    pixelSize,
    palette.patternColor,
  );
}

function drawTurn(
  context: CanvasRenderingContext2D,
  turns: number,
  pixelSize: number,
  palette: SnakeSpritePalette,
): void {
  drawPixels(context, rotatePoints(TURN_LEFT_UP.outline, turns), pixelSize, palette.outlineColor);
  drawPixels(context, rotatePoints(TURN_LEFT_UP.base, turns), pixelSize, palette.baseColor);
  drawPixels(context, rotatePoints(TURN_LEFT_UP.belly, turns), pixelSize, palette.bellyColor);
  drawPixels(context, rotatePoints(TURN_LEFT_UP.pattern, turns), pixelSize, palette.patternColor);
}

function drawTail(
  context: CanvasRenderingContext2D,
  direction: 'up' | 'right' | 'down' | 'left',
  pixelSize: number,
  palette: SnakeSpritePalette,
): void {
  const turns = directionToTurns(direction);
  drawPixels(context, rotatePoints(TAIL_UP.outline, turns), pixelSize, palette.outlineColor);
  drawPixels(context, rotatePoints(TAIL_UP.base, turns), pixelSize, palette.baseColor);
  drawPixels(context, rotatePoints(TAIL_UP.belly, turns), pixelSize, palette.bellyColor);
  drawPixels(context, rotatePoints(TAIL_UP.pattern, turns), pixelSize, palette.patternColor);
}

export const snakeSpriteRecipe: RuntimeSpriteRecipe<SnakeSpriteVariant, SnakeSpritePalette> = {
  id: 'snake',
  variants: VARIANTS,
  getPaletteKey(palette): string {
    return [
      palette.baseColor,
      palette.bellyColor,
      palette.patternColor,
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

    switch (variant) {
      case 'head-up':
        drawHead(context, 'up', pixelSize, palette);
        break;
      case 'head-right':
        drawHead(context, 'right', pixelSize, palette);
        break;
      case 'head-down':
        drawHead(context, 'down', pixelSize, palette);
        break;
      case 'head-left':
        drawHead(context, 'left', pixelSize, palette);
        break;
      case 'body-horizontal':
        drawBody(context, false, pixelSize, palette);
        break;
      case 'body-vertical':
        drawBody(context, true, pixelSize, palette);
        break;
      case 'turn-up-right':
        drawTurn(context, 1, pixelSize, palette);
        break;
      case 'turn-right-down':
        drawTurn(context, 2, pixelSize, palette);
        break;
      case 'turn-down-left':
        drawTurn(context, 3, pixelSize, palette);
        break;
      case 'turn-left-up':
        drawTurn(context, 0, pixelSize, palette);
        break;
      case 'tail-up':
        drawTail(context, 'up', pixelSize, palette);
        break;
      case 'tail-right':
        drawTail(context, 'right', pixelSize, palette);
        break;
      case 'tail-down':
        drawTail(context, 'down', pixelSize, palette);
        break;
      case 'tail-left':
        drawTail(context, 'left', pixelSize, palette);
        break;
    }

    context.restore();
  },
};
