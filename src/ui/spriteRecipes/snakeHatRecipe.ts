import type { RuntimeSpriteRecipe } from '../runtimeSpriteFactory.js';

export type SnakeHatVariant = 'hat-up' | 'hat-down' | 'hat-left' | 'hat-right';
export type SnakeHatStyle =
  | 'cowboy'
  | 'market-cap'
  | 'ember-cowl'
  | 'pearl-crown'
  | 'dragon-helm'
  | 'master-broth'
  | 'unicorn-horn'
  | 'demon-horns';

export interface SnakeHatPalette {
  style: SnakeHatStyle;
  fillColor: string;
  bandColor: string;
  outlineColor: string;
  accentColor?: string;
}

const VARIANTS: readonly SnakeHatVariant[] = ['hat-up', 'hat-down', 'hat-left', 'hat-right'];

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
  points: readonly [number, number][],
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

function rotatePoints(points: number[][], turns: number): [number, number][] {
  return points.map(([x, y]) => rotatePoint(x, y, turns));
}

const HAT_TOP = [
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
];

const HAT_BRIM = [
  [1, 4],
  [2, 4],
  [3, 4],
  [4, 4],
  [5, 4],
  [6, 4],
];

const _HAT_BAND = [
  [2, 3],
  [3, 3],
  [4, 3],
  [5, 3],
];

const CAP_CROWN = [
  [2, 2],
  [3, 2],
  [4, 2],
  [5, 2],
  [2, 3],
  [3, 3],
  [4, 3],
  [5, 3],
];

const CAP_BILL = [
  [4, 4],
  [5, 4],
  [6, 4],
];

const COWL_HOOD = [
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
  [5, 3],
  [6, 3],
  [2, 4],
  [5, 4],
];

const COWL_FLAME = [
  [3, 0],
  [4, 0],
  [3, 1],
  [4, 1],
];

const CROWN_BASE = [
  [1, 4],
  [2, 4],
  [3, 4],
  [4, 4],
  [5, 4],
  [6, 4],
  [2, 3],
  [3, 3],
  [4, 3],
  [5, 3],
];

const CROWN_POINTS = [
  [1, 2],
  [3, 1],
  [4, 1],
  [6, 2],
];

const CROWN_GEMS = [
  [3, 3],
  [4, 3],
];

const HELM_BASE = [
  [1, 4],
  [2, 4],
  [3, 4],
  [4, 4],
  [5, 4],
  [6, 4],
  [2, 3],
  [3, 3],
  [4, 3],
  [5, 3],
];

const HELM_HORNS = [
  [2, 1],
  [3, 0],
  [4, 0],
  [5, 1],
];

const HELM_RIDGE = [
  [3, 2],
  [4, 2],
  [3, 3],
  [4, 3],
];

const CHEF_TOP = [
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
  [2, 2],
  [3, 2],
  [4, 2],
  [5, 2],
  [2, 3],
  [3, 3],
  [4, 3],
  [5, 3],
];

const CHEF_BAND = [
  [2, 3],
  [3, 3],
  [4, 3],
  [5, 3],
];

const UNICORN_HORN = [
  [3, 0],
  [4, 0],
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
];

const UNICORN_MANE = [
  [1, 2],
  [2, 2],
  [0, 3],
  [1, 3],
  [0, 4],
  [1, 4],
  [6, 2],
  [7, 2],
  [6, 3],
  [7, 3],
  [6, 4],
  [7, 4],
];

const UNICORN_EAR = [
  [2, 1],
  [3, 1],
  [2, 2],
  [3, 2],
  [5, 1],
  [6, 1],
  [5, 2],
  [6, 2],
];

const DEMON_HORN_OUTLINE = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
  [1, 2],
  [2, 2],
  [2, 3],
  [6, 0],
  [7, 0],
  [6, 1],
  [7, 1],
  [6, 2],
  [5, 2],
  [5, 3],
];

const DEMON_HORN_FILL = [
  [1, 0],
  [1, 1],
  [2, 2],
  [6, 0],
  [6, 1],
  [5, 2],
];

const DEMON_HORN_TIPS = [
  [0, 0],
  [7, 0],
];

export const snakeHatRecipe: RuntimeSpriteRecipe<SnakeHatVariant, SnakeHatPalette> = {
  id: 'snake-hat',
  variants: VARIANTS,
  getPaletteKey(palette): string {
    return [
      palette.style,
      palette.fillColor,
      palette.bandColor,
      palette.outlineColor,
      palette.accentColor ?? '',
    ].join('-');
  },
  draw(context, variant, size, palette): void {
    const pixelSize = Math.max(1, Math.floor(size / 8));
    const spriteSize = pixelSize * 8;
    const offset = Math.floor((size - spriteSize) / 2);
    const turns =
      variant === 'hat-right' ? 1 : variant === 'hat-down' ? 2 : variant === 'hat-left' ? 3 : 0;

    context.save();
    context.translate(offset, offset);
    context.imageSmoothingEnabled = false;
    if (palette.style === 'market-cap') {
      drawPixels(
        context,
        rotatePoints([...CAP_CROWN, ...CAP_BILL], turns),
        pixelSize,
        palette.outlineColor,
      );
      drawPixels(
        context,
        rotatePoints(
          CAP_CROWN.filter(([, y]) => y === 2),
          turns,
        ),
        pixelSize,
        palette.fillColor,
      );
      drawPixels(
        context,
        rotatePoints(
          CAP_CROWN.filter(([, y]) => y === 3),
          turns,
        ),
        pixelSize,
        palette.bandColor,
      );
      drawPixels(context, rotatePoints(CAP_BILL.slice(1), turns), pixelSize, palette.fillColor);
      drawPixels(
        context,
        rotatePoints(
          [
            [3, 2],
            [4, 2],
          ],
          turns,
        ),
        pixelSize,
        palette.accentColor ?? palette.bandColor,
      );
    } else if (palette.style === 'ember-cowl') {
      drawPixels(
        context,
        rotatePoints([...COWL_HOOD, ...COWL_FLAME], turns),
        pixelSize,
        palette.outlineColor,
      );
      drawPixels(
        context,
        rotatePoints(
          COWL_HOOD.filter(([, y]) => y < 3),
          turns,
        ),
        pixelSize,
        palette.fillColor,
      );
      drawPixels(
        context,
        rotatePoints(
          COWL_HOOD.filter(([, y]) => y >= 3),
          turns,
        ),
        pixelSize,
        palette.bandColor,
      );
      drawPixels(
        context,
        rotatePoints(COWL_FLAME, turns),
        pixelSize,
        palette.accentColor ?? '#ffb36b',
      );
    } else if (palette.style === 'pearl-crown') {
      drawPixels(
        context,
        rotatePoints([...CROWN_BASE, ...CROWN_POINTS], turns),
        pixelSize,
        palette.outlineColor,
      );
      drawPixels(context, rotatePoints(CROWN_BASE, turns), pixelSize, palette.fillColor);
      drawPixels(context, rotatePoints(CROWN_POINTS, turns), pixelSize, palette.bandColor);
      drawPixels(
        context,
        rotatePoints(CROWN_GEMS, turns),
        pixelSize,
        palette.accentColor ?? '#ffffff',
      );
    } else if (palette.style === 'dragon-helm') {
      drawPixels(
        context,
        rotatePoints([...HELM_BASE, ...HELM_HORNS], turns),
        pixelSize,
        palette.outlineColor,
      );
      drawPixels(context, rotatePoints(HELM_BASE, turns), pixelSize, palette.fillColor);
      drawPixels(context, rotatePoints(HELM_HORNS, turns), pixelSize, palette.bandColor);
      drawPixels(
        context,
        rotatePoints(HELM_RIDGE, turns),
        pixelSize,
        palette.accentColor ?? '#ff6b35',
      );
    } else if (palette.style === 'master-broth') {
      drawPixels(
        context,
        rotatePoints([...CHEF_TOP, ...CHEF_BAND], turns),
        pixelSize,
        palette.outlineColor,
      );
      drawPixels(context, rotatePoints(CHEF_TOP, turns), pixelSize, palette.fillColor);
      drawPixels(context, rotatePoints(CHEF_BAND, turns), pixelSize, palette.bandColor);
    } else if (palette.style === 'unicorn-horn') {
      // Outline everything
      drawPixels(
        context,
        rotatePoints([...UNICORN_HORN, ...UNICORN_MANE, ...UNICORN_EAR], turns),
        pixelSize,
        palette.outlineColor,
      );
      // Horn (main body) - golden
      drawPixels(context, rotatePoints(UNICORN_HORN, turns), pixelSize, palette.fillColor);
      // Mane - rainbow accent (uses accentColor as the primary mane color)
      drawPixels(
        context,
        rotatePoints(UNICORN_MANE, turns),
        pixelSize,
        palette.accentColor ?? '#ffb3e6',
      );
      // Ears - match bandColor
      drawPixels(context, rotatePoints(UNICORN_EAR, turns), pixelSize, palette.bandColor);
    } else if (palette.style === 'demon-horns') {
      drawPixels(context, rotatePoints(DEMON_HORN_OUTLINE, turns), pixelSize, palette.outlineColor);
      drawPixels(context, rotatePoints(DEMON_HORN_FILL, turns), pixelSize, palette.fillColor);
      drawPixels(
        context,
        rotatePoints(DEMON_HORN_TIPS, turns),
        pixelSize,
        palette.accentColor ?? palette.bandColor,
      );
    } else {
      drawPixels(context, rotatePoints(HAT_TOP, turns), pixelSize, palette.outlineColor);
      drawPixels(context, rotatePoints(HAT_BRIM, turns), pixelSize, palette.outlineColor);
      drawPixels(
        context,
        rotatePoints(
          HAT_TOP.filter(([, y]) => y < 3),
          turns,
        ),
        pixelSize,
        palette.fillColor,
      );
      drawPixels(
        context,
        rotatePoints(
          HAT_TOP.filter(([, y]) => y === 3),
          turns,
        ),
        pixelSize,
        palette.bandColor,
      );
      drawPixels(
        context,
        rotatePoints(
          HAT_BRIM.filter(([x]) => x > 1 && x < 6),
          turns,
        ),
        pixelSize,
        palette.fillColor,
      );
    }
    context.restore();
  },
};
