import { describe, expect, it } from 'vitest';

import {
  snakeSpriteRecipe,
  type SnakeSpritePalette,
  type SnakeSpriteVariant,
} from '../spriteRecipes/snakeRecipe.js';

/** Palette whose feet color is vividly distinct from everything else in the sprite. */
const GEOMETRY_PALETTE: SnakeSpritePalette = {
  baseColor: '#00ff00',
  bellyColor: '#ffffff',
  patternColor: '#ff00ff',
  outlineColor: '#000000',
  eyeColor: '#ffffff',
  feetColor: '#ff0000',
};

const DEFAULT_PALETTE: SnakeSpritePalette = {
  baseColor: '#00ff00',
  bellyColor: '#ffffff',
  patternColor: '#ff00ff',
  outlineColor: '#123123',
  eyeColor: '#ffffff',
};

interface PaintCall {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

function createStubContext(): {
  context: CanvasRenderingContext2D;
  painted: PaintCall[];
} {
  const painted: PaintCall[] = [];
  const state = { fillStyle: '#000000' };
  const context = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    imageSmoothingEnabled: true,
    get fillStyle() {
      return state.fillStyle;
    },
    set fillStyle(value: string) {
      state.fillStyle = value;
    },
    fillRect: (x: number, y: number, width: number, height: number) => {
      painted.push({ x, y, width, height, color: state.fillStyle });
    },
  } as unknown as CanvasRenderingContext2D;
  return { context, painted };
}

function renderVariant(variant: SnakeSpriteVariant, palette: SnakeSpritePalette): PaintCall[] {
  const { context, painted } = createStubContext();
  snakeSpriteRecipe.draw(context, variant, 8, palette);
  return painted;
}

function feetPixels(variant: SnakeSpriteVariant, palette: SnakeSpritePalette): PaintCall[] {
  const feetColor = palette.feetColor ?? palette.outlineColor;
  return renderVariant(variant, palette).filter((call) => call.color === feetColor);
}

function feetCells(variant: SnakeSpriteVariant, palette: SnakeSpritePalette): string[] {
  return feetPixels(variant, palette)
    .map((call) => `${call.x},${call.y}`)
    .sort();
}

describe('snake sprite feet', () => {
  it('paints four feet pixels per segment, tucked into the silhouette edges', () => {
    // The wise old snake has never seen a footless snake.
    for (const variant of snakeSpriteRecipe.variants) {
      const feet = feetPixels(variant, GEOMETRY_PALETTE);
      expect(feet, `variant ${variant}`).toHaveLength(4);
    }
  });

  it('plants the head feet at the back corners of the head', () => {
    expect(feetCells('head-up', GEOMETRY_PALETTE)).toEqual(['0,5', '0,6', '7,5', '7,6']);
  });

  it('plants the body feet along the two long edges', () => {
    expect(feetCells('body-horizontal', GEOMETRY_PALETTE)).toEqual(['2,0', '3,0', '4,7', '5,7']);
  });

  it('rotates the feet along with the body when vertical', () => {
    expect(feetCells('body-vertical', GEOMETRY_PALETTE)).toEqual(['0,4', '0,5', '7,2', '7,3']);
  });

  it('draws the turn feet tucked into the free corners of the elbow', () => {
    expect(feetCells('turn-left-up', GEOMETRY_PALETTE)).toEqual(['0,0', '0,1', '7,5', '7,6']);
  });

  it('draws the tail feet splayed on the wide end of the taper', () => {
    expect(feetCells('tail-up', GEOMETRY_PALETTE)).toEqual(['0,1', '0,2', '7,1', '7,2']);
  });

  it('rotates head feet toward the back of the head when facing sideways', () => {
    expect(feetCells('head-right', GEOMETRY_PALETTE)).toEqual(['1,0', '1,7', '2,0', '2,7']);
  });

  it('defaults feet to the outline color when feetColor is not set', () => {
    const painted = renderVariant('head-up', DEFAULT_PALETTE);
    // The head's back-corner feet cells are not part of the silhouette, so any
    // pixel painted there must be a foot.
    const feetCells = painted.filter((call) => call.x === 0 && (call.y === 5 || call.y === 6));
    expect(feetCells.length).toBeGreaterThan(0);
    for (const call of feetCells) {
      expect(call.color).toBe(DEFAULT_PALETTE.outlineColor);
    }
  });

  it('uses an explicit feetColor when the palette provides one', () => {
    const painted = renderVariant('head-up', GEOMETRY_PALETTE);
    const feetCells = painted.filter((call) => call.x === 0 && (call.y === 5 || call.y === 6));
    expect(feetCells.length).toBeGreaterThan(0);
    for (const call of feetCells) {
      expect(call.color).toBe('#ff0000');
    }
  });

  it('caches the texture under the same key as an explicit outline-colored feet palette', () => {
    const withoutFeet = snakeSpriteRecipe.getPaletteKey(DEFAULT_PALETTE);
    const withOutlineFeet = snakeSpriteRecipe.getPaletteKey({
      ...DEFAULT_PALETTE,
      feetColor: DEFAULT_PALETTE.outlineColor,
    });
    expect(withoutFeet).toBe(withOutlineFeet);

    const withRedFeet = snakeSpriteRecipe.getPaletteKey({
      ...DEFAULT_PALETTE,
      feetColor: '#ff0000',
    });
    expect(withRedFeet).not.toBe(withoutFeet);
  });
});
