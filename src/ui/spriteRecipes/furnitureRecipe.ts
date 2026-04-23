import type { RuntimeSpriteRecipe } from "../runtimeSpriteFactory.js";

export type FurnitureSpriteVariant = "couch" | "kitchen" | "bed" | "plant" | "lamp";

export interface FurnitureSpritePalette {
  couch: { fill: string; accent: string; outline: string };
  kitchen: { fill: string; accent: string; outline: string };
  bed: { fill: string; accent: string; outline: string };
  plant: { fill: string; accent: string; outline: string };
  lamp: { fill: string; accent: string; outline: string };
}

const VARIANTS: readonly FurnitureSpriteVariant[] = ["couch", "kitchen", "bed", "plant", "lamp"];

function fillPixel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  pixelSize: number,
  color: string
): void {
  context.fillStyle = color;
  context.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
}

function drawPixels(
  context: CanvasRenderingContext2D,
  points: readonly [number, number][],
  pixelSize: number,
  color: string
): void {
  points.forEach(([x, y]) => fillPixel(context, x, y, pixelSize, color));
}

function drawSprite(
  context: CanvasRenderingContext2D,
  size: number,
  draw: (pixelSize: number) => void
): void {
  const pixelSize = Math.max(1, Math.floor(size / 8));
  const spriteSize = pixelSize * 8;
  const offset = Math.floor((size - spriteSize) / 2);
  context.save();
  context.translate(offset, offset);
  context.imageSmoothingEnabled = false;
  draw(pixelSize);
  context.restore();
}

export const furnitureSpriteRecipe: RuntimeSpriteRecipe<
  FurnitureSpriteVariant,
  FurnitureSpritePalette
> = {
  id: "furniture",
  variants: VARIANTS,
  getPaletteKey(palette): string {
    return JSON.stringify(palette);
  },
  draw(context, variant, size, palette): void {
    if (variant === "couch") {
      drawSprite(context, size, (pixelSize) => {
        drawPixels(context, [
          [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4],
          [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5],
          [2, 2], [2, 3], [5, 2], [5, 3],
          [1, 6], [6, 6],
        ], pixelSize, palette.couch.outline);
        drawPixels(context, [
          [2, 4], [3, 4], [4, 4], [5, 4],
          [2, 5], [3, 5], [4, 5], [5, 5],
          [2, 3], [5, 3],
        ], pixelSize, palette.couch.fill);
        drawPixels(context, [
          [3, 4], [4, 4], [3, 5], [4, 5],
        ], pixelSize, palette.couch.accent);
      });
      return;
    }

    if (variant === "kitchen") {
      drawSprite(context, size, (pixelSize) => {
        drawPixels(context, [
          [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
          [1, 3], [6, 3],
          [1, 4], [6, 4],
          [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5],
        ], pixelSize, palette.kitchen.outline);
        drawPixels(context, [
          [2, 3], [3, 3], [4, 3], [5, 3],
          [2, 4], [3, 4], [4, 4], [5, 4],
        ], pixelSize, palette.kitchen.fill);
        drawPixels(context, [
          [2, 2], [5, 2], [3, 4], [4, 4],
        ], pixelSize, palette.kitchen.accent);
      });
      return;
    }

    if (variant === "bed") {
      drawSprite(context, size, (pixelSize) => {
        drawPixels(context, [
          [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
          [1, 3], [6, 3],
          [1, 4], [6, 4],
          [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5],
        ], pixelSize, palette.bed.outline);
        drawPixels(context, [
          [2, 3], [3, 3], [4, 3], [5, 3],
          [2, 4], [3, 4], [4, 4], [5, 4],
        ], pixelSize, palette.bed.fill);
        drawPixels(context, [
          [2, 3], [5, 3],
        ], pixelSize, palette.bed.accent);
      });
      return;
    }

    if (variant === "plant") {
      drawSprite(context, size, (pixelSize) => {
        drawPixels(context, [
          [3, 1], [4, 1], [2, 2], [5, 2], [3, 2], [4, 2],
          [2, 3], [5, 3], [3, 4], [4, 4],
        ], pixelSize, palette.plant.fill);
        drawPixels(context, [
          [2, 5], [3, 5], [4, 5], [5, 5], [2, 6], [5, 6],
        ], pixelSize, palette.plant.outline);
        drawPixels(context, [
          [3, 5], [4, 5],
        ], pixelSize, palette.plant.accent);
      });
      return;
    }

    drawSprite(context, size, (pixelSize) => {
      drawPixels(context, [
        [3, 1], [4, 1], [2, 2], [3, 2], [4, 2], [5, 2],
        [3, 3], [4, 3], [3, 4], [4, 4], [3, 5], [4, 5],
      ], pixelSize, palette.lamp.outline);
      drawPixels(context, [
        [3, 2], [4, 2], [3, 3], [4, 3],
      ], pixelSize, palette.lamp.fill);
      drawPixels(context, [
        [3, 5], [4, 5],
      ], pixelSize, palette.lamp.accent);
    });
  },
};
