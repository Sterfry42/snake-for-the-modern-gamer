import type { RuntimeSpriteRecipe } from "../runtimeSpriteFactory.js";

export type QuestPortraitVariant = "sage-1" | "sage-2" | "sage-3";

export interface QuestPortraitPalette {
  frameColor: string;
  frameAccent: string;
  backgroundColor: string;
}

const VARIANTS: readonly QuestPortraitVariant[] = ["sage-1", "sage-2", "sage-3"];

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
  for (const [x, y] of points) {
    fillPixel(context, x, y, pixelSize, color);
  }
}

const FRAME = [
  [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0],
  [0, 1], [15, 1],
  [0, 2], [15, 2],
  [0, 3], [15, 3],
  [0, 4], [15, 4],
  [0, 5], [15, 5],
  [0, 6], [15, 6],
  [0, 7], [15, 7],
  [0, 8], [15, 8],
  [0, 9], [15, 9],
  [0, 10], [15, 10],
  [0, 11], [15, 11],
  [0, 12], [15, 12],
  [0, 13], [15, 13],
  [0, 14], [15, 14],
  [0, 15], [1, 15], [2, 15], [3, 15], [4, 15], [5, 15], [6, 15], [7, 15], [8, 15], [9, 15], [10, 15], [11, 15], [12, 15], [13, 15], [14, 15], [15, 15],
] as const;

const FRAME_ACCENT = [
  [1, 1], [2, 1], [3, 1], [12, 1], [13, 1], [14, 1],
  [1, 14], [2, 14], [3, 14], [12, 14], [13, 14], [14, 14],
] as const;

const BACKGROUND = Array.from({ length: 12 * 12 }, (_, index) => {
  const x = 2 + (index % 12);
  const y = 2 + Math.floor(index / 12);
  return [x, y] as [number, number];
});

type PortraitLayers = {
  hood: readonly [number, number][];
  face: readonly [number, number][];
  beard: readonly [number, number][];
  eyes: readonly [number, number][];
  trim: readonly [number, number][];
  hoodColor: string;
  faceColor: string;
  beardColor: string;
  eyeColor: string;
  trimColor: string;
};

const PORTRAITS: Record<QuestPortraitVariant, PortraitLayers> = {
  "sage-1": {
    hood: [
      [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3],
      [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],
      [3, 5], [4, 5], [5, 5], [10, 5], [11, 5],
      [3, 6], [4, 6], [11, 6],
      [3, 7], [4, 7], [11, 7],
      [3, 8], [4, 8], [11, 8],
      [3, 9], [4, 9], [11, 9],
      [4, 10], [5, 10], [10, 10], [11, 10],
      [5, 11], [10, 11],
      [6, 12], [9, 12],
    ],
    face: [
      [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5],
      [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6],
      [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7],
      [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8],
    ],
    beard: [
      [6, 9], [7, 9], [8, 9], [9, 9],
      [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10],
      [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [10, 11],
      [6, 12], [7, 12], [8, 12], [9, 12],
    ],
    eyes: [[6, 6], [9, 6]],
    trim: [[4, 10], [11, 10], [5, 12], [10, 12]],
    hoodColor: "#5e8fbc",
    faceColor: "#f1c9a3",
    beardColor: "#f6f1de",
    eyeColor: "#1c1a1c",
    trimColor: "#d4ebff",
  },
  "sage-2": {
    hood: [
      [5, 3], [6, 3], [7, 3], [8, 3], [9, 3],
      [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],
      [3, 5], [4, 5], [5, 5], [10, 5], [11, 5],
      [3, 6], [4, 6], [11, 6],
      [3, 7], [4, 7], [11, 7],
      [3, 8], [4, 8], [11, 8],
      [4, 9], [11, 9],
      [4, 10], [5, 10], [10, 10], [11, 10],
      [5, 11], [10, 11],
      [6, 12], [9, 12],
    ],
    face: [
      [5, 5], [6, 5], [7, 5], [8, 5], [9, 5],
      [5, 6], [6, 6], [7, 6], [8, 6], [9, 6],
      [5, 7], [6, 7], [7, 7], [8, 7], [9, 7],
      [5, 8], [6, 8], [7, 8], [8, 8], [9, 8],
      [6, 9], [7, 9], [8, 9],
    ],
    beard: [
      [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10],
      [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [10, 11],
      [6, 12], [7, 12], [8, 12], [9, 12],
    ],
    eyes: [[6, 6], [8, 6]],
    trim: [[4, 11], [11, 11], [7, 3], [8, 3]],
    hoodColor: "#7f5a9d",
    faceColor: "#d9a782",
    beardColor: "#ceb8a2",
    eyeColor: "#20151a",
    trimColor: "#f1d86f",
  },
  "sage-3": {
    hood: [
      [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3],
      [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],
      [3, 5], [4, 5], [5, 5], [10, 5], [11, 5],
      [3, 6], [4, 6], [11, 6],
      [3, 7], [4, 7], [11, 7],
      [3, 8], [4, 8], [11, 8],
      [4, 9], [5, 9], [10, 9], [11, 9],
      [5, 10], [10, 10],
      [6, 11], [9, 11],
      [7, 12], [8, 12],
    ],
    face: [
      [5, 5], [6, 5], [7, 5], [8, 5], [9, 5],
      [5, 6], [6, 6], [7, 6], [8, 6], [9, 6],
      [5, 7], [6, 7], [7, 7], [8, 7], [9, 7],
      [5, 8], [6, 8], [7, 8], [8, 8], [9, 8],
    ],
    beard: [
      [6, 9], [7, 9], [8, 9],
      [5, 10], [6, 10], [7, 10], [8, 10], [9, 10],
      [6, 11], [7, 11], [8, 11], [9, 11],
      [7, 12], [8, 12],
    ],
    eyes: [[6, 6], [9, 6]],
    trim: [[5, 4], [9, 4], [4, 9], [11, 9]],
    hoodColor: "#567048",
    faceColor: "#f0d3bb",
    beardColor: "#8b6a4d",
    eyeColor: "#151515",
    trimColor: "#d0f0a9",
  },
};

export const questPortraitRecipe: RuntimeSpriteRecipe<
  QuestPortraitVariant,
  QuestPortraitPalette
> = {
  id: "quest-portrait",
  variants: VARIANTS,
  getPaletteKey(palette): string {
    return [palette.frameColor, palette.frameAccent, palette.backgroundColor].join("-");
  },
  draw(context, variant, size, palette): void {
    const pixelSize = Math.max(2, Math.floor(size / 16));
    const spriteSize = pixelSize * 16;
    const offset = Math.floor((size - spriteSize) / 2);
    const layers = PORTRAITS[variant];

    context.save();
    context.translate(offset, offset);
    context.imageSmoothingEnabled = false;
    drawPixels(context, FRAME, pixelSize, palette.frameColor);
    drawPixels(context, FRAME_ACCENT, pixelSize, palette.frameAccent);
    drawPixels(context, BACKGROUND, pixelSize, palette.backgroundColor);
    drawPixels(context, layers.hood, pixelSize, layers.hoodColor);
    drawPixels(context, layers.face, pixelSize, layers.faceColor);
    drawPixels(context, layers.beard, pixelSize, layers.beardColor);
    drawPixels(context, layers.trim, pixelSize, layers.trimColor);
    drawPixels(context, layers.eyes, pixelSize, layers.eyeColor);
    context.restore();
  },
};
