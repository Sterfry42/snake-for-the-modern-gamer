import type { RuntimeSpriteRecipe } from "../runtimeSpriteFactory.js";

export type AppleSpriteVariant = "normal" | "shielded" | "gold" | "skittish";

export interface AppleSpritePalette {
  fillColor: string;
  accentColor: string;
  outlineColor: string;
  leafColor: string;
  stemColor: string;
  sparkleColor: string;
}

const APPLE_VARIANTS: readonly AppleSpriteVariant[] = ["normal", "shielded", "gold", "skittish"];

function drawBlock(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  pixelSize: number,
  color: string
): void {
  context.fillStyle = color;
  context.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
}

function drawMany(
  context: CanvasRenderingContext2D,
  points: number[][],
  pixelSize: number,
  color: string
): void {
  points.forEach(([x, y]) => drawBlock(context, x, y, pixelSize, color));
}

const APPLE_OUTLINE = [
  [3, 1], [4, 1],
  [2, 2], [3, 2], [4, 2], [5, 2],
  [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
  [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4],
  [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5],
  [2, 6], [3, 6], [4, 6], [5, 6],
  [3, 7], [4, 7],
];

const APPLE_FILL = [
  [3, 2], [4, 2],
  [2, 3], [3, 3], [4, 3], [5, 3],
  [2, 4], [3, 4], [4, 4], [5, 4],
  [2, 5], [3, 5], [4, 5], [5, 5],
  [3, 6], [4, 6],
];

const APPLE_ACCENT = [
  [4, 3],
  [3, 4], [4, 4],
  [3, 5],
];

const LEAF = [
  [5, 0], [6, 0],
  [4, 1], [5, 1],
];

const STEM = [
  [3, 0],
  [3, 1],
];

const SHIELD_MARKS = [
  [0, 3], [0, 4],
  [7, 3], [7, 4],
  [3, 0], [4, 0],
  [3, 7], [4, 7],
];

const GOLD_SPARKLES = [
  [1, 1], [6, 1], [1, 6], [6, 6],
  [0, 4], [7, 4],
];

const SKITTISH_EYES = [
  [2, 2], [5, 2],
  [2, 3], [5, 3],
];

const SKITTISH_FEET = [
  [2, 7], [5, 7],
];

export const appleSpriteRecipe: RuntimeSpriteRecipe<AppleSpriteVariant, AppleSpritePalette> = {
  id: "apple",
  variants: APPLE_VARIANTS,
  getPaletteKey(palette): string {
    return [
      palette.fillColor,
      palette.accentColor,
      palette.outlineColor,
      palette.leafColor,
      palette.stemColor,
      palette.sparkleColor,
    ].join("-");
  },
  draw(context, variant, size, palette): void {
    const pixelSize = Math.max(1, Math.floor(size / 8));
    const spriteSize = pixelSize * 8;
    const offset = Math.floor((size - spriteSize) / 2);

    context.save();
    context.translate(offset, offset);
    context.imageSmoothingEnabled = false;

    drawMany(context, APPLE_OUTLINE, pixelSize, palette.outlineColor);
    drawMany(context, APPLE_FILL, pixelSize, palette.fillColor);
    drawMany(context, APPLE_ACCENT, pixelSize, palette.accentColor);
    drawMany(context, LEAF, pixelSize, palette.leafColor);
    drawMany(context, STEM, pixelSize, palette.stemColor);

    if (variant === "shielded") {
      drawMany(context, SHIELD_MARKS, pixelSize, palette.sparkleColor);
    } else if (variant === "gold") {
      drawMany(context, GOLD_SPARKLES, pixelSize, palette.sparkleColor);
    } else if (variant === "skittish") {
      drawMany(context, SKITTISH_EYES, pixelSize, palette.sparkleColor);
      drawMany(context, SKITTISH_FEET, pixelSize, palette.sparkleColor);
    }

    context.restore();
  },
};
