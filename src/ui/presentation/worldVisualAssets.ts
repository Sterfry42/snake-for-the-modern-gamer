import type Phaser from 'phaser';
import type { AppleSnapshot } from '../../apples/types.js';
import type { Vector2Like } from '../../core/math.js';
import type { AnimalInstance } from '../../animals/types.js';
import type { EnemyInstance } from '../../systems/enemies.js';
import type { VegetationInstance } from '../../world/types.js';
import { RuntimeSpriteFactory } from '../runtimeSpriteFactory.js';
import { appleSpriteRecipe, type AppleSpriteVariant } from '../spriteRecipes/appleRecipe.js';
import { animalSpriteRecipe, type AnimalSpriteVariant } from '../spriteRecipes/animalRecipe.js';
import { enemySpriteRecipe, type EnemySpriteVariant } from '../spriteRecipes/enemyRecipe.js';
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
}

export class WorldVisualAssets implements WorldVisualAssetResolver {
  private readonly spriteFactory: RuntimeSpriteFactory;

  constructor(scene: Phaser.Scene) {
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
      case 'road-rash':
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
}

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
