import type { RuntimeSpriteRecipe } from "../runtimeSpriteFactory.js";

export type QuestGiverSpriteVariant = "idle" | "blink";

export interface QuestGiverSpritePalette {
  robeColor: string;
  trimColor: string;
  outlineColor: string;
  eyeColor: string;
}

const VARIANTS: readonly QuestGiverSpriteVariant[] = ["idle", "blink"];

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

const OUTLINE = [
  [2, 1], [3, 1], [4, 1], [5, 1],
  [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
  [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
  [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4],
  [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5],
  [2, 6], [3, 6], [4, 6], [5, 6],
] as const;

const ROBE = [
  [2, 2], [3, 2], [4, 2], [5, 2],
  [2, 3], [3, 3], [4, 3], [5, 3],
  [2, 4], [3, 4], [4, 4], [5, 4],
  [2, 5], [3, 5], [4, 5], [5, 5],
] as const;

const TRIM = [
  [3, 5], [4, 5],
] as const;

const EYES_IDLE = [
  [2, 3], [5, 3],
] as const;

const EYES_BLINK = [
  [2, 3], [5, 3],
] as const;

export const questGiverSpriteRecipe: RuntimeSpriteRecipe<
  QuestGiverSpriteVariant,
  QuestGiverSpritePalette
> = {
  id: "quest-giver",
  variants: VARIANTS,
  getPaletteKey(palette): string {
    return [palette.robeColor, palette.trimColor, palette.outlineColor, palette.eyeColor].join("-");
  },
  draw(context, variant, size, palette): void {
    const pixelSize = Math.max(1, Math.floor(size / 8));
    const spriteSize = pixelSize * 8;
    const offset = Math.floor((size - spriteSize) / 2);

    context.save();
    context.translate(offset, offset);
    context.imageSmoothingEnabled = false;
    drawPixels(context, OUTLINE, pixelSize, palette.outlineColor);
    drawPixels(context, ROBE, pixelSize, palette.robeColor);
    drawPixels(context, TRIM, pixelSize, palette.trimColor);
    drawPixels(context, variant === "blink" ? EYES_BLINK : EYES_IDLE, pixelSize, palette.eyeColor);
    context.restore();
  },
};
