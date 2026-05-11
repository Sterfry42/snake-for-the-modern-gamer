import type { RuntimeSpriteRecipe } from "../runtimeSpriteFactory.js";

export type EnemySpriteVariant =
  | "enemy-up"
  | "enemy-down"
  | "enemy-left"
  | "enemy-right"
  | "enemy-flash-up"
  | "enemy-flash-down"
  | "enemy-flash-left"
  | "enemy-flash-right"
  | "bullet";

export interface EnemySpritePalette {
  bodyColor: string;
  accentColor: string;
  outlineColor: string;
  eyeColor: string;
  bulletColor: string;
  bulletOutlineColor: string;
}

const VARIANTS: readonly EnemySpriteVariant[] = [
  "enemy-up",
  "enemy-down",
  "enemy-left",
  "enemy-right",
  "enemy-flash-up",
  "enemy-flash-down",
  "enemy-flash-left",
  "enemy-flash-right",
  "bullet",
];

function fillPixel(
  context: CanvasRenderingContext2D,
  px: number,
  py: number,
  pixelSize: number,
  color: string
): void {
  context.fillStyle = color;
  context.fillRect(px * pixelSize, py * pixelSize, pixelSize, pixelSize);
}

function drawPixels(
  context: CanvasRenderingContext2D,
  points: readonly (readonly [number, number])[],
  pixelSize: number,
  color: string
): void {
  points.forEach(([x, y]) => fillPixel(context, x, y, pixelSize, color));
}

const ENEMY_OUTLINE = [
  [2, 1], [3, 1], [4, 1], [5, 1],
  [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
  [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
  [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4],
  [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5],
  [2, 6], [3, 6], [4, 6], [5, 6],
] as const;

const ENEMY_FILL = [
  [2, 2], [3, 2], [4, 2], [5, 2],
  [2, 3], [3, 3], [4, 3], [5, 3],
  [2, 4], [3, 4], [4, 4], [5, 4],
  [2, 5], [3, 5], [4, 5], [5, 5],
] as const;

const ENEMY_ACCENT = [
  [3, 4], [4, 4],
  [3, 5], [4, 5],
] as const;

const ENEMY_EYES_IDLE = [
  [2, 3], [5, 3],
] as const;

const ENEMY_EYES_FLASH = [
  [2, 3], [5, 3],
] as const;

const MUZZLE = [
  [3, 0], [4, 0],
] as const;

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

function rotatePoints(points: readonly (readonly [number, number])[], turns: number): [number, number][] {
  return points.map(([x, y]) => rotatePoint(x, y, turns));
}

function turnsForVariant(variant: EnemySpriteVariant): number {
  if (variant.endsWith("right")) return 1;
  if (variant.endsWith("down")) return 2;
  if (variant.endsWith("left")) return 3;
  return 0;
}

const BULLET_OUTLINE = [
  [2, 1], [3, 1], [4, 1], [5, 1],
  [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
  [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
  [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4],
  [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5],
  [2, 6], [3, 6], [4, 6], [5, 6],
] as const;

const BULLET_FILL = [
  [2, 2], [3, 2], [4, 2], [5, 2],
  [2, 3], [3, 3], [4, 3], [5, 3],
  [2, 4], [3, 4], [4, 4], [5, 4],
  [2, 5], [3, 5], [4, 5], [5, 5],
] as const;

export const enemySpriteRecipe: RuntimeSpriteRecipe<EnemySpriteVariant, EnemySpritePalette> = {
  id: "enemy",
  variants: VARIANTS,
  getPaletteKey(palette): string {
    return [
      palette.bodyColor,
      palette.accentColor,
      palette.outlineColor,
      palette.eyeColor,
      palette.bulletColor,
      palette.bulletOutlineColor,
    ].join("-");
  },
  draw(context, variant, size, palette): void {
    const pixelSize = Math.max(1, Math.floor(size / 8));
    const spriteSize = pixelSize * 8;
    const offset = Math.floor((size - spriteSize) / 2);

    context.save();
    context.translate(offset, offset);
    context.imageSmoothingEnabled = false;

    if (variant === "bullet") {
      drawPixels(context, BULLET_OUTLINE, pixelSize, palette.bulletOutlineColor);
      drawPixels(context, BULLET_FILL, pixelSize, palette.bulletColor);
      context.restore();
      return;
    }

    const turns = turnsForVariant(variant);
    drawPixels(context, rotatePoints(ENEMY_OUTLINE, turns), pixelSize, palette.outlineColor);
    drawPixels(context, rotatePoints(ENEMY_FILL, turns), pixelSize, palette.bodyColor);
    drawPixels(context, rotatePoints(ENEMY_ACCENT, turns), pixelSize, palette.accentColor);
    drawPixels(
      context,
      rotatePoints(variant.startsWith("enemy-flash") ? ENEMY_EYES_FLASH : ENEMY_EYES_IDLE, turns),
      pixelSize,
      palette.eyeColor
    );
    if (variant.startsWith("enemy-flash")) {
      drawPixels(context, rotatePoints(MUZZLE, turns), pixelSize, palette.bulletColor);
    }
    context.restore();
  },
};
