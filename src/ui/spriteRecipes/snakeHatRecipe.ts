import type { RuntimeSpriteRecipe } from "../runtimeSpriteFactory.js";

export type SnakeHatVariant = "hat-up" | "hat-down" | "hat-left" | "hat-right";

export interface SnakeHatPalette {
  fillColor: string;
  bandColor: string;
  outlineColor: string;
}

const VARIANTS: readonly SnakeHatVariant[] = ["hat-up", "hat-down", "hat-left", "hat-right"];

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
  points: readonly [number, number][],
  pixelSize: number,
  color: string
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

function rotatePoints(points: readonly [number, number][], turns: number): [number, number][] {
  return points.map(([x, y]) => rotatePoint(x, y, turns));
}

const HAT_TOP = [
  [2, 1], [3, 1], [4, 1], [5, 1],
  [2, 2], [3, 2], [4, 2], [5, 2],
  [2, 3], [3, 3], [4, 3], [5, 3],
] as const;

const HAT_BRIM = [
  [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4],
] as const;

const HAT_BAND = [
  [2, 3], [3, 3], [4, 3], [5, 3],
] as const;

export const snakeHatRecipe: RuntimeSpriteRecipe<SnakeHatVariant, SnakeHatPalette> = {
  id: "snake-hat",
  variants: VARIANTS,
  getPaletteKey(palette): string {
    return [palette.fillColor, palette.bandColor, palette.outlineColor].join("-");
  },
  draw(context, variant, size, palette): void {
    const pixelSize = Math.max(1, Math.floor(size / 8));
    const spriteSize = pixelSize * 8;
    const offset = Math.floor((size - spriteSize) / 2);
    const turns =
      variant === "hat-right" ? 1 :
      variant === "hat-down" ? 2 :
      variant === "hat-left" ? 3 :
      0;

    context.save();
    context.translate(offset, offset);
    context.imageSmoothingEnabled = false;
    drawPixels(context, rotatePoints(HAT_TOP, turns), pixelSize, palette.outlineColor);
    drawPixels(context, rotatePoints(HAT_BRIM, turns), pixelSize, palette.outlineColor);
    drawPixels(context, rotatePoints(HAT_TOP.filter(([, y]) => y < 3), turns), pixelSize, palette.fillColor);
    drawPixels(context, rotatePoints(HAT_TOP.filter(([, y]) => y === 3), turns), pixelSize, palette.bandColor);
    drawPixels(context, rotatePoints(HAT_BRIM.filter(([x]) => x > 1 && x < 6), turns), pixelSize, palette.fillColor);
    context.restore();
  },
};
