import type { RuntimeSpriteRecipe } from "../runtimeSpriteFactory.js";

export type SnakeHatVariant = "hat-up" | "hat-down" | "hat-left" | "hat-right";
export type SnakeHatStyle = "cowboy" | "market-cap" | "ember-cowl" | "pearl-crown";

export interface SnakeHatPalette {
  style: SnakeHatStyle;
  fillColor: string;
  bandColor: string;
  outlineColor: string;
  accentColor?: string;
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

const CAP_CROWN = [
  [2, 2], [3, 2], [4, 2], [5, 2],
  [2, 3], [3, 3], [4, 3], [5, 3],
] as const;

const CAP_BILL = [
  [4, 4], [5, 4], [6, 4],
] as const;

const COWL_HOOD = [
  [2, 1], [3, 1], [4, 1], [5, 1],
  [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
  [1, 3], [2, 3], [5, 3], [6, 3],
  [2, 4], [5, 4],
] as const;

const COWL_FLAME = [
  [3, 0], [4, 0], [3, 1], [4, 1],
] as const;

const CROWN_BASE = [
  [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4],
  [2, 3], [3, 3], [4, 3], [5, 3],
] as const;

const CROWN_POINTS = [
  [1, 2], [3, 1], [4, 1], [6, 2],
] as const;

const CROWN_GEMS = [
  [3, 3], [4, 3],
] as const;

export const snakeHatRecipe: RuntimeSpriteRecipe<SnakeHatVariant, SnakeHatPalette> = {
  id: "snake-hat",
  variants: VARIANTS,
  getPaletteKey(palette): string {
    return [palette.style, palette.fillColor, palette.bandColor, palette.outlineColor, palette.accentColor ?? ""].join("-");
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
    if (palette.style === "market-cap") {
      drawPixels(context, rotatePoints([...CAP_CROWN, ...CAP_BILL], turns), pixelSize, palette.outlineColor);
      drawPixels(context, rotatePoints(CAP_CROWN.filter(([, y]) => y === 2), turns), pixelSize, palette.fillColor);
      drawPixels(context, rotatePoints(CAP_CROWN.filter(([, y]) => y === 3), turns), pixelSize, palette.bandColor);
      drawPixels(context, rotatePoints(CAP_BILL.slice(1), turns), pixelSize, palette.fillColor);
      drawPixels(context, rotatePoints([[3, 2], [4, 2]], turns), pixelSize, palette.accentColor ?? palette.bandColor);
    } else if (palette.style === "ember-cowl") {
      drawPixels(context, rotatePoints([...COWL_HOOD, ...COWL_FLAME], turns), pixelSize, palette.outlineColor);
      drawPixels(context, rotatePoints(COWL_HOOD.filter(([, y]) => y < 3), turns), pixelSize, palette.fillColor);
      drawPixels(context, rotatePoints(COWL_HOOD.filter(([, y]) => y >= 3), turns), pixelSize, palette.bandColor);
      drawPixels(context, rotatePoints(COWL_FLAME, turns), pixelSize, palette.accentColor ?? "#ffb36b");
    } else if (palette.style === "pearl-crown") {
      drawPixels(context, rotatePoints([...CROWN_BASE, ...CROWN_POINTS], turns), pixelSize, palette.outlineColor);
      drawPixels(context, rotatePoints(CROWN_BASE, turns), pixelSize, palette.fillColor);
      drawPixels(context, rotatePoints(CROWN_POINTS, turns), pixelSize, palette.bandColor);
      drawPixels(context, rotatePoints(CROWN_GEMS, turns), pixelSize, palette.accentColor ?? "#ffffff");
    } else {
      drawPixels(context, rotatePoints(HAT_TOP, turns), pixelSize, palette.outlineColor);
      drawPixels(context, rotatePoints(HAT_BRIM, turns), pixelSize, palette.outlineColor);
      drawPixels(context, rotatePoints(HAT_TOP.filter(([, y]) => y < 3), turns), pixelSize, palette.fillColor);
      drawPixels(context, rotatePoints(HAT_TOP.filter(([, y]) => y === 3), turns), pixelSize, palette.bandColor);
      drawPixels(context, rotatePoints(HAT_BRIM.filter(([x]) => x > 1 && x < 6), turns), pixelSize, palette.fillColor);
    }
    context.restore();
  },
};
