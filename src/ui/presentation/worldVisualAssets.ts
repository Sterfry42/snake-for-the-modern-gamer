import type Phaser from 'phaser';
import type { AppleSnapshot } from '../../apples/types.js';
import type { Vector2Like } from '../../core/math.js';
import type { AnimalInstance } from '../../animals/types.js';
import type { BombInstance, FootballInstance } from '../../game/snakeGame.js';
import type { EnemyInstance } from '../../systems/enemies.js';
import type { BulletInstance } from '../../systems/enemies.js';
import type { VegetationInstance } from '../../world/types.js';
import { RuntimeSpriteFactory } from '../runtimeSpriteFactory.js';
import { appleSpriteRecipe, type AppleSpriteVariant } from '../spriteRecipes/appleRecipe.js';
import { animalSpriteRecipe, type AnimalSpriteVariant } from '../spriteRecipes/animalRecipe.js';
import { enemySpriteRecipe, type EnemySpriteVariant } from '../spriteRecipes/enemyRecipe.js';
import {
  furnitureSpriteRecipe,
  type FurnitureSpriteVariant,
} from '../spriteRecipes/furnitureRecipe.js';
import { questGiverSpriteRecipe } from '../spriteRecipes/questGiverRecipe.js';
import {
  snakeSpriteRecipe,
  type SnakeSpritePalette,
  type SnakeSpriteVariant,
} from '../spriteRecipes/snakeRecipe.js';
import { vegetationSpriteRecipe } from '../spriteRecipes/vegetationRecipe.js';
import type { RenderSpriteVisual } from './worldRenderScene.js';

export interface WorldVisualAssetResolver {
  getSnakeTexture(segmentIndex: number, direction: Vector2Like): RenderSpriteVisual;
  getAppleTexture(apple?: AppleSnapshot | null): RenderSpriteVisual;
  getEnemyTexture(enemy: EnemyInstance, segmentIndex: number): RenderSpriteVisual;
  getNpcTexture(): RenderSpriteVisual;
  getAnimalTexture(animal: AnimalInstance): RenderSpriteVisual;
  getVegetationTexture(
    vegetation: VegetationInstance,
    biomeAccentColor: number,
  ): RenderSpriteVisual;
  getFurnitureTexture(variant: FurnitureSpriteVariant): RenderSpriteVisual;
  getPowerupTexture(kind: 'phase' | 'smite' | 'gun'): RenderSpriteVisual;
  getProjectileTexture(projectile: BulletInstance): RenderSpriteVisual;
  getBombTexture(bomb: BombInstance): RenderSpriteVisual;
  getFootballTexture(football: FootballInstance): RenderSpriteVisual;
  getTreasureTexture(): RenderSpriteVisual;
  getAlchemyStationTexture(): RenderSpriteVisual;
}

export class WorldVisualAssets implements WorldVisualAssetResolver {
  private readonly spriteFactory: RuntimeSpriteFactory;

  constructor(private readonly scene: Phaser.Scene) {
    this.spriteFactory = new RuntimeSpriteFactory(scene);
  }

  getSnakeTexture(segmentIndex: number, direction: Vector2Like): RenderSpriteVisual {
    const keys = this.spriteFactory.ensureRecipe(snakeSpriteRecipe, 64, {
      baseColor: '#4ecdc4',
      bellyColor: '#b7fff8',
      patternColor: '#2f9e9a',
      outlineColor: '#123f3d',
      eyeColor: '#f8f9fa',
    });
    const variant = segmentIndex === 0 ? this.headVariant(direction) : 'body-horizontal';
    return { defaultTextureKey: keys[variant], firstPersonTextureKey: keys[variant] };
  }

  getAppleTexture(apple?: AppleSnapshot | null): RenderSpriteVisual {
    const keys = this.spriteFactory.ensureRecipe(appleSpriteRecipe, 64, {
      fillColor: colorToCss(apple?.color ?? 0xff3b30),
      accentColor: '#ff8f7a',
      outlineColor: '#5a1914',
      leafColor: '#66bb6a',
      stemColor: '#7a4f2a',
      sparkleColor: '#fff3b0',
    });
    const key = keys[this.appleVariant(apple)];
    return { defaultTextureKey: key, firstPersonTextureKey: key };
  }

  getEnemyTexture(enemy: EnemyInstance, segmentIndex: number): RenderSpriteVisual {
    if (enemy.encounterKind === 'rival-snake' || enemy.encounterKind === 'roaming-snake') {
      const keys = this.spriteFactory.ensureRecipe(
        snakeSpriteRecipe,
        64,
        this.enemySnakePalette(enemy),
      );
      const variant = segmentIndex === 0 ? this.headVariant(enemy.aimDirection) : 'body-horizontal';
      return { defaultTextureKey: keys[variant], firstPersonTextureKey: keys[variant] };
    }
    const keys = this.spriteFactory.ensureRecipe(enemySpriteRecipe, 64, {
      bodyColor: enemy.encounterKind === 'goblin' ? '#4f8a32' : '#a82d3d',
      accentColor: '#f28482',
      outlineColor: '#2b1116',
      eyeColor: '#fff7ad',
      bulletColor: '#ffd166',
      bulletOutlineColor: '#5f3b00',
    });
    const key = keys[segmentIndex === 0 ? this.enemyVariant(enemy) : 'enemy-down'];
    return { defaultTextureKey: key, firstPersonTextureKey: key };
  }

  getNpcTexture(): RenderSpriteVisual {
    const keys = this.spriteFactory.ensureRecipe(questGiverSpriteRecipe, 64, {
      robeColor: '#f6bd60',
      trimColor: '#9ad1ff',
      outlineColor: '#2d1b08',
      eyeColor: '#101820',
    });
    return { defaultTextureKey: keys.idle, firstPersonTextureKey: keys.idle };
  }

  getAnimalTexture(animal: AnimalInstance): RenderSpriteVisual {
    const keys = this.spriteFactory.ensureRecipe(animalSpriteRecipe, 64, {
      bodyColor: '#d7b98c',
      accentColor: '#f2d2a2',
      outlineColor: '#4a3422',
      eyeColor: '#101820',
      flashColor: '#ffffff',
    });
    const variant = `${animal.type}-down` as AnimalSpriteVariant;
    const key = keys[variant] ?? keys['rabbit-down'];
    return { defaultTextureKey: key, firstPersonTextureKey: key };
  }

  getVegetationTexture(
    vegetation: VegetationInstance,
    biomeAccentColor: number,
  ): RenderSpriteVisual {
    const keys = this.spriteFactory.ensureRecipe(vegetationSpriteRecipe, 64, {
      biomeAccentColor,
      paletteSize: 64,
    });
    const key = keys[vegetation.variant];
    return { defaultTextureKey: key, firstPersonTextureKey: key };
  }

  getFurnitureTexture(variant: FurnitureSpriteVariant): RenderSpriteVisual {
    const keys = this.spriteFactory.ensureRecipe(furnitureSpriteRecipe, 64, {
      couch: { fill: '#8f5a67', accent: '#ffc0cb', outline: '#2d1b22' },
      kitchen: { fill: '#d8d1c2', accent: '#6ab7ff', outline: '#33302a' },
      bed: { fill: '#5f7fb8', accent: '#f5e6ca', outline: '#1d2940' },
      plant: { fill: '#3fa34d', accent: '#a3d977', outline: '#1f3d24' },
      lamp: { fill: '#ffe08a', accent: '#9d6b34', outline: '#3d2a12' },
    });
    const key = keys[variant];
    return { defaultTextureKey: key, firstPersonTextureKey: key };
  }

  getPowerupTexture(kind: 'phase' | 'smite' | 'gun'): RenderSpriteVisual {
    const key = this.ensureOrbTexture(
      `presentation-powerup-${kind}`,
      kind === 'phase' ? 0x9b5de5 : kind === 'smite' ? 0xd7263d : 0xf6bd60,
      kind === 'phase' ? 0xf4ddff : 0xfff3a8,
    );
    return { defaultTextureKey: key, firstPersonTextureKey: key };
  }

  getProjectileTexture(projectile: BulletInstance): RenderSpriteVisual {
    const keys = this.spriteFactory.ensureRecipe(
      enemySpriteRecipe,
      64,
      this.projectilePalette(projectile),
    );
    return { defaultTextureKey: keys.bullet, firstPersonTextureKey: keys.bullet };
  }

  getBombTexture(): RenderSpriteVisual {
    const key = this.ensureOrbTexture('presentation-bomb', 0x20232a, 0xffd166);
    return { defaultTextureKey: key, firstPersonTextureKey: key };
  }

  getFootballTexture(): RenderSpriteVisual {
    const key = this.ensureOrbTexture('presentation-football', 0x8b4a24, 0xf3eee2);
    return { defaultTextureKey: key, firstPersonTextureKey: key };
  }

  getTreasureTexture(): RenderSpriteVisual {
    const key = this.ensureOrbTexture('presentation-treasure', 0xb87532, 0xffd166);
    return { defaultTextureKey: key, firstPersonTextureKey: key };
  }

  getAlchemyStationTexture(): RenderSpriteVisual {
    const key = this.ensureOrbTexture('presentation-alchemy-station', 0x3f2a54, 0x8cffd2);
    return { defaultTextureKey: key, firstPersonTextureKey: key };
  }

  private headVariant(direction: Vector2Like): SnakeSpriteVariant {
    if (direction.y < 0) return 'head-up';
    if (direction.y > 0) return 'head-down';
    if (direction.x < 0) return 'head-left';
    return 'head-right';
  }

  private enemyVariant(enemy: EnemyInstance): EnemySpriteVariant {
    if (enemy.aimDirection.y < 0) return 'enemy-up';
    if (enemy.aimDirection.y > 0) return 'enemy-down';
    if (enemy.aimDirection.x < 0) return 'enemy-left';
    return 'enemy-right';
  }

  private appleVariant(apple?: AppleSnapshot | null): AppleSpriteVariant {
    switch (apple?.typeId) {
      case 'shielded':
        return 'shielded';
      case 'gold':
        return 'gold';
      case 'skittish':
        return 'skittish';
      case 'roadRash':
        return 'roadRash';
      default:
        return 'normal';
    }
  }

  private enemySnakePalette(enemy: EnemyInstance): SnakeSpritePalette {
    const base = enemy._colorHex ?? '#888888';
    return {
      baseColor: base,
      bellyColor: '#bbbbbb',
      patternColor: '#666666',
      outlineColor: '#444444',
      eyeColor: '#ffffff',
    };
  }

  private projectilePalette(projectile: BulletInstance) {
    switch (projectile.style) {
      case 'player':
        return this.bulletPalette('#ffe0a3', '#7a4d1d');
      case 'goblin':
        return this.bulletPalette('#b6ff6a', '#315a1f');
      case 'npc-hostile':
        return this.bulletPalette('#ff8e7a', '#5a1620');
      case 'freak-joey':
      case 'duelist':
        return this.bulletPalette('#ffd27d', '#5a2a12');
      default:
        return this.bulletPalette('#ffd166', '#5f3b00');
    }
  }

  private bulletPalette(bulletColor: string, bulletOutlineColor: string) {
    return {
      bodyColor: '#a82d3d',
      accentColor: '#f28482',
      outlineColor: '#2b1116',
      eyeColor: '#fff7ad',
      bulletColor,
      bulletOutlineColor,
    };
  }

  private ensureOrbTexture(key: string, fill: number, shine: number): string {
    const textureKey = `${key}-64`;
    if (this.scene.textures.exists(textureKey)) {
      return textureKey;
    }
    const texture = this.scene.textures.createCanvas(textureKey, 64, 64);
    if (!texture) {
      return '';
    }
    const context = texture.getContext();
    context.clearRect(0, 0, 64, 64);
    context.imageSmoothingEnabled = false;
    context.fillStyle = colorToCss(darkenNumber(fill, 0.48));
    context.beginPath();
    context.ellipse(34, 36, 22, 18, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = colorToCss(fill);
    context.beginPath();
    context.arc(32, 31, 19, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = colorToCss(shine);
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = colorToCss(shine);
    context.beginPath();
    context.arc(25, 22, 5, 0, Math.PI * 2);
    context.fill();
    texture.refresh();
    return textureKey;
  }
}

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function darkenNumber(color: number, amount: number): number {
  const scale = 1 - amount;
  const r = Math.round(((color >> 16) & 0xff) * scale);
  const g = Math.round(((color >> 8) & 0xff) * scale);
  const b = Math.round((color & 0xff) * scale);
  return (r << 16) | (g << 8) | b;
}
