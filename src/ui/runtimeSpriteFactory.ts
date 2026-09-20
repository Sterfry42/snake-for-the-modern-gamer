import Phaser from 'phaser';

export interface RuntimeSpriteRecipe<TVariant extends string, TPalette> {
  readonly id: string;
  readonly variants: readonly TVariant[];
  getPaletteKey(palette: TPalette): string;
  draw(context: CanvasRenderingContext2D, variant: TVariant, size: number, palette: TPalette): void;
}

export class RuntimeSpriteFactory {
  constructor(private readonly scene: Phaser.Scene) {}

  ensureRecipe<TVariant extends string, TPalette>(
    recipe: RuntimeSpriteRecipe<TVariant, TPalette>,
    size: number,
    palette: TPalette,
  ): Record<TVariant, string> {
    const paletteKey = recipe.getPaletteKey(palette);
    const output = {} as Record<TVariant, string>;

    recipe.variants.forEach((variant) => {
      const key = `${recipe.id}:${variant}:${size}:${paletteKey}`;
      output[variant] = key;

      if (this.scene.textures.exists(key)) {
        return;
      }

      const texture = this.scene.textures.createCanvas(key, size, size);
      if (!texture) return;
      const context = texture.getContext();
      context.clearRect(0, 0, size, size);
      recipe.draw(context, variant, size, palette);
      texture.refresh();
    });

    return output;
  }
}
