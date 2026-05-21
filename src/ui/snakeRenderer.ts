import Phaser from 'phaser';
import { paletteConfig, darkenColor } from '../config/palette.js';
import type { GridConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import type { RoomSnapshot } from '../world/types.js';
import type { AppleSnapshot } from '../apples/types.js';
import { RuntimeSpriteFactory } from './runtimeSpriteFactory.js';
import { getBiomeDefinition } from '../world/biomes.js';
import {
  snakeSpriteRecipe,
  type SnakeSpritePalette,
  type SnakeSpriteVariant,
} from './spriteRecipes/snakeRecipe.js';
import {
  appleSpriteRecipe,
  type AppleSpritePalette,
  type AppleSpriteVariant,
} from './spriteRecipes/appleRecipe.js';
import {
  snakeHatRecipe,
  type SnakeHatPalette,
  type SnakeHatStyle,
  type SnakeHatVariant,
} from './spriteRecipes/snakeHatRecipe.js';
import {
  enemySpriteRecipe,
  type EnemySpritePalette,
  type EnemySpriteVariant,
} from './spriteRecipes/enemyRecipe.js';
import {
  furnitureSpriteRecipe,
  type FurnitureSpritePalette,
  type FurnitureSpriteVariant,
} from './spriteRecipes/furnitureRecipe.js';
import {
  animalSpriteRecipe,
  type AnimalSpritePalette,
  type AnimalSpriteVariant,
} from './spriteRecipes/animalRecipe.js';
import type { EnemyInstance, BulletInstance } from '../systems/enemies.js';
import type { AnimalInstance } from '../animals/types.js';
import type { FootballInstance } from '../game/snakeGame.js';

const SNAKE_OUTLINE_ALPHA = 0.9;
const SNAKE_OUTLINE_WIDTH = 1;
const LADDER_OUTLINE_ALPHA = 0.8;
const LADDER_OUTLINE_WIDTH = 1;
const APPLE_OUTLINE_ALPHA = 0.85;
const APPLE_OUTLINE_WIDTH = 1;
const APPLE_LAYER_DEPTH = 4;
const SNAKE_LAYER_DEPTH = 5;
const ANIMAL_LAYER_DEPTH = 2;
const ENEMY_LAYER_DEPTH = 6;
const BULLET_LAYER_DEPTH = 7;
const FURNITURE_LAYER_DEPTH = 3;

interface SnakeRenderOptions {
  wallSenseRadius?: number;
  snakeColor?: number;
  poweredUp?: boolean;
  direction?: Vector2Like;
  snakePalette?: SnakeSpritePalette;
  cowboyHat?: boolean;
  activeHat?: SnakeHatStyle | null;
  enemies?: readonly EnemyInstance[];
  followers?: readonly EnemyInstance[];
  bullets?: readonly BulletInstance[];
  footballs?: readonly FootballInstance[];
  animals?: readonly AnimalInstance[];
}

export class SnakeRenderer {
  private readonly spriteFactory: RuntimeSpriteFactory;
  private readonly snakeSprites: Phaser.GameObjects.Image[] = [];
  private readonly snakeLayer: Phaser.GameObjects.Container;
  private readonly hatSprite: Phaser.GameObjects.Image;
  private readonly defaultSnakeTextureKeys: Record<SnakeSpriteVariant, string>;
  private readonly appleTextureKeys: Record<AppleSpriteVariant, string>;
  private readonly appleSprite: Phaser.GameObjects.Image;
  private readonly hatTextureKeys: Record<SnakeHatVariant, string>;
  private readonly hatTextureCache: Partial<
    Record<SnakeHatStyle, Record<SnakeHatVariant, string>>
  > = {};
  private readonly animalTextureKeys: Record<AnimalSpriteVariant, string>;
  private readonly animalSprites: Phaser.GameObjects.Image[] = [];
  private readonly enemyTextureKeys: Record<EnemySpriteVariant, string>;
  private readonly enemySprites: Phaser.GameObjects.Image[] = [];
  private readonly bulletSprites: Phaser.GameObjects.Image[] = [];
  private readonly furnitureTextureKeys: Record<FurnitureSpriteVariant, string>;
  private readonly furnitureSprites: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly graphics: Phaser.GameObjects.Graphics,
    private readonly grid: GridConfig,
  ) {
    this.spriteFactory = new RuntimeSpriteFactory(scene);
    this.defaultSnakeTextureKeys = this.spriteFactory.ensureRecipe(
      snakeSpriteRecipe,
      this.grid.cell,
      this.buildSnakePalette(),
    );
    this.appleTextureKeys = this.spriteFactory.ensureRecipe(
      appleSpriteRecipe,
      this.grid.cell,
      this.buildApplePalette(),
    );
    this.appleSprite = this.scene.add
      .image(0, 0, this.appleTextureKeys.normal)
      .setDepth(APPLE_LAYER_DEPTH)
      .setVisible(false)
      .setOrigin(0.5, 0.5);
    this.hatTextureKeys = this.spriteFactory.ensureRecipe(
      snakeHatRecipe,
      this.grid.cell,
      this.buildHatPalette(),
    );
    this.enemyTextureKeys = this.spriteFactory.ensureRecipe(
      enemySpriteRecipe,
      this.grid.cell,
      this.buildEnemyPalette(),
    );
    this.furnitureTextureKeys = this.spriteFactory.ensureRecipe(
      furnitureSpriteRecipe,
      this.grid.cell,
      this.buildFurniturePalette(),
    );
    this.animalTextureKeys = this.spriteFactory.ensureRecipe(
      animalSpriteRecipe,
      this.grid.cell,
      this.buildAnimalPalette(),
    );
    this.snakeLayer = this.scene.add.container(0, 0).setDepth(SNAKE_LAYER_DEPTH);
    this.hatSprite = this.scene.add
      .image(0, 0, this.hatTextureKeys['hat-up'])
      .setDepth(SNAKE_LAYER_DEPTH + 1)
      .setVisible(false)
      .setOrigin(0.5, 0.5);
  }

  getWorldPosition(position: Vector2Like, currentRoomId: string): { x: number; y: number } {
    const [roomX, roomY] = currentRoomId.split(',').map(Number);
    const localX = position.x - roomX * this.grid.cols;
    const localY = position.y - roomY * this.grid.rows;

    return {
      x: localX * this.grid.cell,
      y: localY * this.grid.cell,
    };
  }

  render(
    room: RoomSnapshot,
    snakeBody: readonly Vector2Like[],
    currentRoomId: string,
    appleInfo?: AppleSnapshot | null,
    options: SnakeRenderOptions = {},
  ): void {
    this.graphics.clear();
    this.graphics.clearMask();

    const opts = options ?? {};

    this.drawRoom(room);
    this.drawTemperatureReliefs(room);
    this.drawFurniture(room);
    this.highlightWalls(room, snakeBody, currentRoomId, opts.wallSenseRadius ?? 0);
    this.drawGrid();
    this.drawApple(room, appleInfo ?? undefined);
    this.drawTreasure(room);
    this.drawPowerup(room);
    this.drawSnake(
      room,
      snakeBody,
      currentRoomId,
      opts.direction ?? { x: 1, y: 0 },
      opts.snakeColor,
      opts.poweredUp ?? false,
      opts.snakePalette,
      opts.activeHat ?? (opts.cowboyHat ? 'cowboy' : null),
    );
    this.drawAnimals(opts.animals ?? []);
    this.drawEnemies([...(opts.enemies ?? []), ...(opts.followers ?? [])]);
    this.drawBullets(opts.bullets ?? []);
    this.drawFootballs(opts.footballs ?? []);
  }

  private drawRoom(room: RoomSnapshot): void {
    const ladderOutlineColor = darkenColor(
      paletteConfig.ladder.color,
      paletteConfig.ladder.outlineDarkenFactor,
    );
    const biome = getBiomeDefinition(room.biomeId);
    for (let y = 0; y < room.layout.length; y++) {
      for (let x = 0; x < room.layout[y].length; x++) {
        const tile = room.layout[y][x];
        const rectX = x * this.grid.cell;
        const rectY = y * this.grid.cell;
        if (tile === '#') {
          if (room.biomeId === 'elderwood-maze') {
            this.drawTreeTile(rectX, rectY, x, y);
          } else if (room.biomeId === 'liberty-badlands') {
            this.drawLibertyWallTile(rectX, rectY, x, y);
          } else {
            this.graphics.fillStyle(room.wallColor, 1);
            this.graphics.fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics.lineStyle(2, room.wallOutlineColor, 0.85);
            this.graphics.strokeRect(rectX, rectY, this.grid.cell, this.grid.cell);
          }
        } else if (tile === 'H') {
          const portal = room.portals.find((entry) => entry.x === x && entry.y === y);
          const [, , currentZ = '0'] = room.id.split(',');
          const [, , destZ = currentZ] = portal?.destRoomId.split(',') ?? [];
          this.drawLadderTile(
            rectX,
            rectY,
            Number(destZ) >= Number(currentZ) ? 'up' : 'down',
            ladderOutlineColor,
          );
        } else if (tile === '~') {
          this.drawWaterTile(rectX, rectY, x, y, room.biomeId === 'sunken-ocean');
      } else if (tile === 'O') {
          if (room.biomeId === 'jade-peak-province') {
            const base = 0x5bb8d4;
            const deep = 0x3a8fad;
            const foam = 0x9ad4e8;
            this.graphics.fillStyle(base, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .fillStyle(deep, 0.35)
              .fillRect(rectX, rectY + this.grid.cell * 0.52, this.grid.cell, this.grid.cell * 0.48);
            if ((x * 3 + y * 5) % 4 === 0) {
              const waveY = rectY + Math.floor(this.grid.cell * 0.38);
              this.graphics.lineStyle(2, foam, 0.5);
              this.graphics.beginPath();
              this.graphics.moveTo(rectX + 4, waveY);
              this.graphics.lineTo(rectX + this.grid.cell * 0.4, waveY - 2);
              this.graphics.lineTo(rectX + this.grid.cell - 4, waveY + 1);
              this.graphics.stroke();
            }
          } else {
            this.drawBoatTile(rectX, rectY, x, y);
          }
        } else if (room.biomeId === 'liberty-badlands' && ['A', 'E', 'F', 'G', 'L', 'M', 'N', 'O', 'P', 'W'].includes(tile)) {
          this.drawLibertyTile(rectX, rectY, tile, x, y);
        } else if (tile === 'W') {
          // Wooden floor for house interior
          const color = 0x6d5845;
          const outline = darkenColor(color, 0.35);
          this.graphics.fillStyle(color, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
          this.graphics
            .lineStyle(1, outline, 0.35)
            .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
        } else if (tile === 'T') {
          // Door trim/frame accent
          const color = 0xcfa77a;
          const outline = darkenColor(color, 0.35);
          this.graphics
            .fillStyle(color, 0.9)
            .fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
          this.graphics
            .lineStyle(1, outline, 0.6)
            .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
        } else if (tile === 'N' || tile === 'U' || tile === 'M' || tile === 'R' || tile === 'F' || tile === 'P') {
          this.drawTownSymbolTile(rectX, rectY, tile);
        } else if (tile === 'S') {
          if (room.biomeId === 'jade-peak-province') {
            const color = 0xd4c5a9;
            const outline = darkenColor(color, 0.35);
            this.graphics.fillStyle(color, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics.lineStyle(1, outline, 0.5).strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          } else {
            this.drawMarketCanopyTile(rectX, rectY, x, y);
          }
        } else if (tile === 'A') {
          this.drawMarketCounterTile(rectX, rectY, x, y);
        } else if (tile === 'C') {
          const color = 0x6d5845;
          const outline = darkenColor(color, 0.35);
          this.graphics.fillStyle(color, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
          this.graphics
            .lineStyle(1, outline, 0.35)
            .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
       } else if (tile === 'K') {
          if (room.biomeId === 'jade-peak-province') {
            const color = 0xff8c42;
            const outline = darkenColor(color, 0.35);
            this.graphics.fillStyle(color, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics.lineStyle(1, outline, 0.5).strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          } else {
            const color = 0x6d5845;
            const outline = darkenColor(color, 0.35);
            this.graphics.fillStyle(color, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, outline, 0.35)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          }
      } else if (tile === 'B') {
          if (room.biomeId === 'jade-peak-province') {
            const color = 0x3a7d44;
            const outline = darkenColor(color, 0.35);
            this.graphics.fillStyle(color, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics.lineStyle(1, outline, 0.7).strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          } else {
            const color = 0x6d5845;
            const outline = darkenColor(color, 0.35);
            this.graphics.fillStyle(color, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, outline, 0.35)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          }
     } else if (tile === 'P') {
          if (room.biomeId === 'jade-peak-province') {
            const color = 0xf8d5e0;
            const outline = darkenColor(color, 0.35);
            this.graphics.fillStyle(color, 0.7).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics.lineStyle(1, outline, 0.4).strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          } else {
            const color = 0x6d5845;
            const outline = darkenColor(color, 0.35);
            this.graphics.fillStyle(color, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, outline, 0.35)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          }
        } else if (tile === 'L') {
          const color = 0x6d5845;
          const outline = darkenColor(color, 0.35);
          this.graphics.fillStyle(color, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
          this.graphics
            .lineStyle(1, outline, 0.35)
            .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
     } else if (tile === 'E') {
          if (room.biomeId === 'jade-peak-province') {
            const color = 0xe8e0d4;
            const outline = darkenColor(color, 0.35);
            this.graphics.fillStyle(color, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics.lineStyle(1, outline, 0.5).strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          } else {
            const color = 0x8ea1ff;
            const outline = darkenColor(color, 0.45);
            this.graphics
              .fillStyle(color, 0.75)
              .fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, outline, 0.6)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          }
        } else if (tile === 'G') {
          // Quest giver tile uses cozy floor; sprite renders on top.
          const color = 0x6d5845;
          const outline = darkenColor(color, 0.35);
          this.graphics.fillStyle(color, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
          this.graphics
            .lineStyle(1, outline, 0.35)
            .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
      } else if (tile === 'R') {
          if (room.biomeId === 'jade-peak-province') {
            const color = 0x8b5e3c;
            const outline = darkenColor(color, 0.35);
            this.graphics.fillStyle(color, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics.lineStyle(1, outline, 0.5).strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          } else {
            this.graphics.fillStyle(0xffffff, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, 0xcccccc, 0.6)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          }
        } else if (tile === 'F') {
          if (room.biomeId === 'jade-peak-province') {
            const color = 0x6b4c3b;
            const outline = darkenColor(color, 0.35);
            this.graphics.fillStyle(color, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics.lineStyle(1, outline, 0.5).strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          }
        } else {
          this.graphics.fillStyle(room.backgroundColor, 1);
          this.graphics.fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
          this.drawBiomeAccent(biome.id, biome.accentColor, x, y, rectX, rectY);
        }
      }
    }
  }

  private drawWaterTile(
    rectX: number,
    rectY: number,
    tileX: number,
    tileY: number,
    ocean: boolean,
  ): void {
    const base = ocean ? 0x0b4f7a : 0x176b8f;
    const deep = ocean ? 0x07344f : 0x0d4a66;
    const foam = ocean ? 0xa7e8ff : 0x8bdcff;
    this.graphics.fillStyle(base, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
    this.graphics
      .fillStyle(deep, 0.42)
      .fillRect(rectX, rectY + this.grid.cell * 0.52, this.grid.cell, this.grid.cell * 0.48);
    if ((tileX * 3 + tileY * 5) % 4 === 0) {
      const y = rectY + Math.floor(this.grid.cell * 0.38);
      this.graphics.lineStyle(2, foam, 0.55);
      this.graphics.beginPath();
      this.graphics.moveTo(rectX + 4, y);
      this.graphics.lineTo(rectX + this.grid.cell * 0.4, y - 2);
      this.graphics.lineTo(rectX + this.grid.cell - 4, y + 1);
      this.graphics.strokePath();
    }
    this.graphics
      .lineStyle(1, deep, 0.45)
      .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
  }

  private drawMarketCanopyTile(rectX: number, rectY: number, tileX: number, tileY: number): void {
    const stripe = (tileX + tileY) % 2 === 0 ? 0xc7433d : 0xffe0a3;
    const shadow = darkenColor(stripe, 0.32);
    this.graphics.fillStyle(stripe, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
    this.graphics
      .fillStyle(shadow, 0.55)
      .fillRect(rectX, rectY + this.grid.cell * 0.62, this.grid.cell, this.grid.cell * 0.38);
    this.graphics
      .lineStyle(1, 0x5b2f24, 0.72)
      .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
  }

  private drawMarketCounterTile(rectX: number, rectY: number, tileX: number, tileY: number): void {
    void tileX;
    void tileY;
    this.graphics.fillStyle(0x7a5232, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
    this.graphics
      .fillStyle(0xcfa77a, 0.9)
      .fillRect(rectX, rectY, this.grid.cell, Math.max(2, Math.floor(this.grid.cell * 0.32)));
    this.graphics
      .fillStyle(0x3d2412, 0.58)
      .fillRect(rectX + 2, rectY + this.grid.cell - 4, this.grid.cell - 4, 2);
    this.graphics
      .lineStyle(1, 0x3d2412, 0.75)
      .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
  }

  private drawTownSymbolTile(rectX: number, rectY: number, tile: string): void {
    const cell = this.grid.cell;
    const base = tile === 'U' ? 0x333844 : tile === 'N' ? 0x8b5f32 : tile === 'M' ? 0xc7433d : 0x6d5845;
    const accent =
      tile === 'U'
        ? 0x9aa4b2
        : tile === 'N'
          ? 0xffe0a3
          : tile === 'M'
            ? 0xffe0a3
            : tile === 'R'
              ? 0xf4d08b
              : tile === 'P'
                ? 0x8fd1ff
                : 0x9f6b3f;
    const outline = darkenColor(base, 0.42);
    this.graphics.fillStyle(base, 1).fillRect(rectX, rectY, cell, cell);
    this.graphics.lineStyle(1, outline, 0.75).strokeRect(rectX + 0.5, rectY + 0.5, cell - 1, cell - 1);

    if (tile === 'N') {
      this.graphics.fillStyle(accent, 1).fillRect(rectX + cell * 0.22, rectY + cell * 0.18, cell * 0.56, cell * 0.58);
      this.graphics.lineStyle(1, outline, 0.8);
      this.graphics.beginPath();
      this.graphics.moveTo(rectX + cell * 0.3, rectY + cell * 0.36);
      this.graphics.lineTo(rectX + cell * 0.7, rectY + cell * 0.36);
      this.graphics.moveTo(rectX + cell * 0.3, rectY + cell * 0.52);
      this.graphics.lineTo(rectX + cell * 0.62, rectY + cell * 0.52);
      this.graphics.strokePath();
    } else if (tile === 'U') {
      for (let i = 0; i < 4; i += 1) {
        const x = rectX + cell * (0.24 + i * 0.14);
        this.graphics.fillStyle(accent, 0.85).fillRect(x, rectY + cell * 0.18, Math.max(2, cell * 0.06), cell * 0.64);
      }
    } else if (tile === 'M') {
      this.graphics.fillStyle(accent, 1).fillRect(rectX + 2, rectY + 3, cell - 4, cell * 0.28);
      this.graphics.fillStyle(0x7a5232, 1).fillRect(rectX + cell * 0.2, rectY + cell * 0.58, cell * 0.6, cell * 0.18);
    } else if (tile === 'R') {
      this.graphics.fillStyle(accent, 1).fillCircle(rectX + cell * 0.5, rectY + cell * 0.48, cell * 0.22);
      this.graphics.fillStyle(outline, 0.85).fillRect(rectX + cell * 0.46, rectY + cell * 0.62, cell * 0.08, cell * 0.18);
    } else if (tile === 'P') {
      this.graphics.fillStyle(accent, 1).fillRect(rectX + cell * 0.25, rectY + cell * 0.22, cell * 0.5, cell * 0.42);
      this.graphics.fillStyle(outline, 1).fillRect(rectX + cell * 0.32, rectY + cell * 0.64, cell * 0.36, cell * 0.12);
    } else {
      this.graphics.fillStyle(accent, 1).fillRect(rectX + cell * 0.2, rectY + cell * 0.42, cell * 0.6, cell * 0.14);
      this.graphics.fillStyle(accent, 1).fillRect(rectX + cell * 0.28, rectY + cell * 0.2, cell * 0.12, cell * 0.6);
      this.graphics.fillStyle(accent, 1).fillRect(rectX + cell * 0.6, rectY + cell * 0.2, cell * 0.12, cell * 0.6);
    }
  }

  private drawBoatTile(rectX: number, rectY: number, tileX: number, tileY: number): void {
    const base = (tileX + tileY) % 2 === 0 ? 0x8a5a2f : 0x76502f;
    const edge = darkenColor(base, 0.45);
    const highlight = 0xc79356;
    this.graphics.fillStyle(base, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
    this.graphics
      .lineStyle(1, edge, 0.65)
      .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
    this.graphics.lineStyle(1, highlight, 0.35);
    this.graphics.beginPath();
    this.graphics.moveTo(rectX + 3, rectY + this.grid.cell * 0.36);
    this.graphics.lineTo(rectX + this.grid.cell - 3, rectY + this.grid.cell * 0.36);
    this.graphics.moveTo(rectX + 3, rectY + this.grid.cell * 0.68);
    this.graphics.lineTo(rectX + this.grid.cell - 3, rectY + this.grid.cell * 0.68);
    this.graphics.strokePath();
  }

  private drawTreeTile(rectX: number, rectY: number, tileX: number, tileY: number): void {
    const base = (tileX + tileY) % 2 === 0 ? 0x174f2a : 0x1d5f31;
    const shadow = 0x0b2414;
    const leaf = (tileX * 5 + tileY * 3) % 4 === 0 ? 0x2f8d45 : 0x26763a;
    const trunk = 0x5c3a23;
    this.graphics.fillStyle(base, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
    this.graphics
      .fillStyle(shadow, 0.45)
      .fillRect(rectX, rectY + this.grid.cell * 0.62, this.grid.cell, this.grid.cell * 0.38);
    this.graphics
      .fillStyle(trunk, 0.95)
      .fillRect(
        rectX + this.grid.cell * 0.43,
        rectY + this.grid.cell * 0.48,
        this.grid.cell * 0.14,
        this.grid.cell * 0.34,
      );
    this.graphics
      .fillStyle(leaf, 0.95)
      .fillCircle(
        rectX + this.grid.cell * 0.5,
        rectY + this.grid.cell * 0.38,
        this.grid.cell * 0.32,
      );
    this.graphics
      .fillStyle(0x9ddd76, 0.16)
      .fillCircle(
        rectX + this.grid.cell * 0.4,
        rectY + this.grid.cell * 0.28,
        this.grid.cell * 0.12,
      );
    this.graphics
      .lineStyle(1, shadow, 0.8)
      .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
  }

  private drawLadderTile(
    rectX: number,
    rectY: number,
    direction: 'up' | 'down',
    outlineColor: number,
  ): void {
    const cell = this.grid.cell;
    const inner = Math.max(4, Math.floor(cell * 0.18));
    const railInset = Math.max(5, Math.floor(cell * 0.24));
    const rungInset = Math.max(4, Math.floor(cell * 0.18));
    const arrowColor = direction === 'up' ? 0xbef7ff : 0xffe0a3;
    const floorColor = direction === 'up' ? 0x17364a : 0x3c2a1d;
    const railColor = direction === 'up' ? 0x78d8ff : 0xffc46b;
    const shadowColor = direction === 'up' ? 0x071822 : 0x21140c;

    this.graphics.fillStyle(floorColor, 1);
    this.graphics.fillRect(rectX, rectY, cell, cell);
    this.graphics.lineStyle(LADDER_OUTLINE_WIDTH, outlineColor, LADDER_OUTLINE_ALPHA);
    this.graphics.strokeRect(rectX + 0.5, rectY + 0.5, cell - 1, cell - 1);

    this.graphics.fillStyle(shadowColor, 0.45);
    this.graphics.fillRect(rectX + inner, rectY + inner, cell - inner * 2, cell - inner * 2);

    const leftRailX = rectX + railInset;
    const rightRailX = rectX + cell - railInset;
    const topY = rectY + inner + 1;
    const bottomY = rectY + cell - inner - 1;

    this.graphics.lineStyle(2, railColor, 0.95);
    this.graphics.beginPath();
    this.graphics.moveTo(leftRailX, topY);
    this.graphics.lineTo(leftRailX, bottomY);
    this.graphics.moveTo(rightRailX, topY);
    this.graphics.lineTo(rightRailX, bottomY);
    this.graphics.strokePath();

    this.graphics.lineStyle(2, arrowColor, 0.9);
    for (
      let y = rectY + rungInset + 3;
      y < rectY + cell - rungInset;
      y += Math.max(5, Math.floor(cell * 0.22))
    ) {
      this.graphics.beginPath();
      this.graphics.moveTo(leftRailX, y);
      this.graphics.lineTo(rightRailX, y);
      this.graphics.strokePath();
    }

    const centerX = rectX + cell / 2;
    const arrowTop = direction === 'up' ? rectY + 4 : rectY + cell - 4;
    const arrowBase = direction === 'up' ? rectY + 10 : rectY + cell - 10;
    this.graphics.fillStyle(arrowColor, 0.95);
    if (direction === 'up') {
      this.graphics.fillTriangle(centerX, arrowTop, centerX - 4, arrowBase, centerX + 4, arrowBase);
    } else {
      this.graphics.fillTriangle(centerX, arrowTop, centerX - 4, arrowBase, centerX + 4, arrowBase);
    }
  }

  private drawBiomeAccent(
    biomeId: string,
    accentColor: number,
    tileX: number,
    tileY: number,
    rectX: number,
    rectY: number,
  ): void {
    switch (biomeId) {
      case 'ember-waste':
        if ((tileX + tileY) % 5 === 0) {
          this.graphics.fillStyle(accentColor, 0.07);
          this.graphics.fillCircle(rectX + this.grid.cell * 0.72, rectY + this.grid.cell * 0.28, 2);
        }
        break;
      case 'moonlit-parish':
        if ((tileX * 2 + tileY) % 6 === 0) {
          this.graphics.lineStyle(1, accentColor, 0.08);
          this.graphics.strokeRect(rectX + 3, rectY + 3, this.grid.cell - 6, this.grid.cell - 6);
        }
        break;
      case 'sable-depths':
        if ((tileX + tileY * 2) % 4 === 0) {
          this.graphics.fillStyle(accentColor, 0.05);
          this.graphics.fillRect(rectX + 2, rectY + this.grid.cell - 4, this.grid.cell - 4, 2);
        }
        break;
      case 'gloam-garden':
        if ((tileX * 3 + tileY) % 7 === 0) {
          this.graphics.fillStyle(accentColor, 0.06);
          this.graphics.fillCircle(rectX + this.grid.cell * 0.35, rectY + this.grid.cell * 0.4, 2);
          this.graphics.fillCircle(
            rectX + this.grid.cell * 0.58,
            rectY + this.grid.cell * 0.62,
            1.5,
          );
        }
        break;
      case 'elderwood-maze':
        if ((tileX + tileY * 3) % 5 === 0) {
          this.graphics.fillStyle(accentColor, 0.08);
          this.graphics.fillCircle(rectX + this.grid.cell * 0.5, rectY + this.grid.cell * 0.5, 2);
        }
        break;
      case 'sunken-ocean':
        if ((tileX + tileY * 2) % 5 === 0) {
          this.graphics.fillStyle(accentColor, 0.12);
          this.graphics.fillRect(rectX + 5, rectY + 9, this.grid.cell - 10, 2);
        }
        break;
      case 'home-hearth':
        if ((tileX + tileY) % 6 === 0) {
          this.graphics.fillStyle(accentColor, 0.04);
          this.graphics.fillRect(rectX + 2, rectY + 2, this.grid.cell - 4, this.grid.cell - 4);
        }
        break;
      case 'liberty-badlands':
        if ((tileX * 3 + tileY * 2) % 6 === 0) {
          this.graphics.fillStyle(0xe6d8c7, 0.08);
          this.graphics.fillRect(rectX + 3, rectY + this.grid.cell - 5, this.grid.cell - 6, 2);
        }
        if ((tileX + tileY * 5) % 17 === 0) {
          this.graphics.fillStyle(accentColor, 0.16);
          this.graphics.fillCircle(rectX + this.grid.cell * 0.68, rectY + this.grid.cell * 0.34, 2);
        }
        break;
      case 'verdigris-basin':
      default:
        if ((tileX + tileY) % 6 === 0) {
          this.graphics.fillStyle(accentColor, 0.05);
          this.graphics.fillRect(rectX + 2, rectY + 2, this.grid.cell - 4, 2);
        }
        break;
    }
  }

  private drawLibertyTile(
    rectX: number,
    rectY: number,
    tile: string,
    tileX: number,
    tileY: number,
  ): void {
    const cell = this.grid.cell;
    switch (tile) {
      case 'A': {
        const base = 0x2f3032;
        this.graphics.fillStyle(base, 1).fillRect(rectX, rectY, cell, cell);
        if ((tileX + tileY) % 4 === 0) {
          this.graphics.fillStyle(0xffffff, 0.18).fillRect(rectX + 3, rectY + cell * 0.48, cell - 6, 2);
        }
        break;
      }
      case 'E': {
        const color = 0xd9d2c4;
        const outline = darkenColor(color, 0.28);
        this.graphics.fillStyle(color, 0.92).fillRect(rectX, rectY, cell, cell);
        this.graphics.lineStyle(1, outline, 0.36).strokeRect(rectX + 0.5, rectY + 0.5, cell - 1, cell - 1);
        break;
      }
      case 'F': {
        const color = 0x9b2f27;
        const outline = darkenColor(color, 0.35);
        this.graphics.fillStyle(color, 1).fillRect(rectX + 3, rectY + 5, cell - 6, cell - 8);
        this.graphics.fillStyle(0xe7ded0, 0.9).fillRect(rectX + 5, rectY + 7, cell - 10, 3);
        this.graphics.lineStyle(1, outline, 0.72).strokeRect(rectX + 3.5, rectY + 5.5, cell - 7, cell - 9);
        break;
      }
      case 'G': {
        this.graphics.fillStyle(0xe6d8c7, 0.78).fillCircle(rectX + cell / 2, rectY + cell * 0.46, cell * 0.28);
        this.graphics.fillStyle(0x315f7d, 0.95).fillRect(rectX + cell * 0.25, rectY + cell * 0.18, cell * 0.5, cell * 0.24);
        this.graphics.fillStyle(0xb5362f, 0.95).fillRect(rectX + cell * 0.3, rectY + cell * 0.55, cell * 0.4, cell * 0.28);
        this.graphics.lineStyle(1, 0xf3eee2, 0.8).strokeRect(rectX + cell * 0.3, rectY + cell * 0.55, cell * 0.4, cell * 0.28);
        break;
      }
      case 'L': {
        this.graphics.fillStyle(0x6fa8dc, 0.38).fillCircle(rectX + cell / 2, rectY + cell / 2, Math.max(3, cell * 0.22));
        this.graphics.fillStyle(0xf6f0df, 0.95).fillCircle(rectX + cell / 2, rectY + cell / 2, Math.max(1.5, cell * 0.08));
        break;
      }
      case 'M': {
        const color = 0xe8e2d4;
        const outline = 0x82786b;
        this.graphics.fillStyle(color, 1).fillRect(rectX + 2, rectY + 2, cell - 4, cell - 4);
        this.graphics.lineStyle(1, outline, 0.75).strokeRect(rectX + 2.5, rectY + 2.5, cell - 5, cell - 5);
        this.graphics.fillStyle(0x5f8fbf, 0.45).fillRect(rectX + cell * 0.25, rectY + 4, cell * 0.5, 2);
        break;
      }
      case 'N': {
        const base = 0x315f7d;
        this.graphics.fillStyle(base, 1).fillRect(rectX + 2, rectY + 4, cell - 4, cell - 8);
        this.graphics.fillStyle(0xbfe9ff, 0.85).fillRect(rectX + 5, rectY + 7, cell - 10, 2);
        this.graphics.lineStyle(1, 0xbfe9ff, 0.55).strokeRect(rectX + 2.5, rectY + 4.5, cell - 5, cell - 9);
        break;
      }
      case 'O': {
        const color = 0x2c6e91;
        this.graphics.fillStyle(color, 0.42).fillRect(rectX, rectY, cell, cell);
        this.graphics.lineStyle(1, 0x9ad4e8, 0.5).strokeRect(rectX + 2, rectY + 2, cell - 4, cell - 4);
        break;
      }
      case 'P': {
        const color = tileX % 2 === 0 ? 0xe8e2d4 : 0xb5362f;
        this.graphics.fillStyle(color, 0.55).fillRect(rectX + 5, rectY + 5, cell - 10, cell - 10);
        break;
      }
      case 'W': {
        this.graphics.fillStyle(0xf3eee2, 0.9).fillRect(rectX + cell * 0.38, rectY, Math.max(2, cell * 0.24), cell);
        if ((tileX + tileY) % 2 === 0) {
          this.graphics.fillStyle(0x5f8fbf, 0.22).fillRect(rectX + cell * 0.42, rectY + 4, Math.max(1, cell * 0.16), 4);
        }
        break;
      }
    }
  }

  private drawLibertyWallTile(rectX: number, rectY: number, tileX: number, tileY: number): void {
    const cell = this.grid.cell;
    const base = (tileX + tileY) % 3 === 0 ? 0x244f87 : 0x173b6d;
    const deep = 0x0d2347;
    const highlight = 0xf3eee2;
    const rust = 0xb5362f;
    this.graphics.fillStyle(base, 1).fillRect(rectX, rectY, cell, cell);
    this.graphics.fillStyle(deep, 0.42).fillRect(rectX, rectY + cell * 0.62, cell, cell * 0.38);
    if ((tileX * 2 + tileY) % 5 === 0) {
      this.graphics.fillStyle(highlight, 0.42).fillRect(rectX + 3, rectY + 4, cell - 6, 2);
    }
    if ((tileX + tileY * 3) % 4 === 0) {
      this.graphics.fillStyle(rust, 0.38).fillRect(rectX + cell - 5, rectY + 3, 2, cell - 6);
    }
    if ((tileX * 7 + tileY) % 9 === 0) {
      this.graphics.fillStyle(highlight, 0.35).fillCircle(rectX + cell * 0.28, rectY + cell * 0.35, 1.6);
      this.graphics.fillStyle(highlight, 0.35).fillCircle(rectX + cell * 0.72, rectY + cell * 0.35, 1.6);
    }
    this.graphics.lineStyle(1, 0x07152c, 0.75).strokeRect(rectX + 0.5, rectY + 0.5, cell - 1, cell - 1);
  }

  private highlightWalls(
    room: RoomSnapshot,
    snakeBody: readonly Vector2Like[],
    currentRoomId: string,
    radius: number,
  ): void {
    if (radius <= 0 || snakeBody.length === 0) {
      return;
    }
    const head = snakeBody[0];
    const [roomX, roomY] = currentRoomId.split(',').map(Number);
    const localHeadX = head.x - roomX * this.grid.cols;
    const localHeadY = head.y - roomY * this.grid.rows;
    if (
      localHeadX < 0 ||
      localHeadX >= this.grid.cols ||
      localHeadY < 0 ||
      localHeadY >= this.grid.rows
    ) {
      return;
    }

    const now = (this.graphics.scene as Phaser.Scene).time?.now ?? performance.now();
    const pulse = 0.8 + 0.2 * Math.sin(now / 240);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const targetX = localHeadX + dx;
        const targetY = localHeadY + dy;
        if (targetX < 0 || targetX >= this.grid.cols || targetY < 0 || targetY >= this.grid.rows) {
          continue;
        }
        const tile = room.layout[targetY]?.[targetX];
        if (tile !== '#') {
          continue;
        }
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance > radius) {
          continue;
        }
        const alpha = Math.max(0.1, (0.28 - 0.05 * distance) * pulse);
        this.graphics.fillStyle(0x4da3ff, alpha);
        this.graphics.fillRect(
          targetX * this.grid.cell,
          targetY * this.grid.cell,
          this.grid.cell,
          this.grid.cell,
        );
      }
    }
  }

  private drawGrid(): void {
    this.graphics.lineStyle(1, paletteConfig.grid.color, paletteConfig.grid.alpha);
    const width = this.grid.cols * this.grid.cell;
    const height = this.grid.rows * this.grid.cell;
    for (let x = 0; x <= this.grid.cols; x++) {
      const px = Math.min(width - 0.5, x * this.grid.cell + 0.5);
      this.graphics.lineBetween(px, 0.5, px, height - 0.5);
    }
    for (let y = 0; y <= this.grid.rows; y++) {
      const py = Math.min(height - 0.5, y * this.grid.cell + 0.5);
      this.graphics.lineBetween(0.5, py, width - 0.5, py);
    }
  }

  private drawFurniture(room: RoomSnapshot): void {
    this.furnitureSprites.forEach((sprite) => sprite.setVisible(false));
    let index = 0;
    for (let y = 0; y < room.layout.length; y++) {
      for (let x = 0; x < room.layout[y].length; x++) {
        const variant = this.furnitureVariantForTile(room.layout[y][x]);
        if (!variant) continue;
        const sprite = this.ensureFurnitureSprite(index);
        sprite
          .setTexture(this.furnitureTextureKeys[variant])
          .setPosition(
            x * this.grid.cell + this.grid.cell / 2,
            y * this.grid.cell + this.grid.cell / 2,
          )
          .setDisplaySize(this.grid.cell, this.grid.cell)
          .setVisible(true);
        index += 1;
      }
    }
  }

  private drawApple(room: RoomSnapshot, appleInfo?: AppleSnapshot): void {
    const apple = room.apple;
    if (!apple) {
      this.appleSprite.setVisible(false);
      return;
    }

    const appleColor = appleInfo?.color ?? paletteConfig.apple.colors.normal;
    const appleOutlineColor = darkenColor(appleColor, paletteConfig.apple.outlineDarkenFactor);

    const x = apple.x * this.grid.cell;
    const y = apple.y * this.grid.cell;
    this.appleSprite
      .setTexture(this.appleTextureKeys[this.resolveAppleVariant(appleInfo)])
      .setPosition(x + this.grid.cell / 2, y + this.grid.cell / 2)
      .setDisplaySize(this.grid.cell, this.grid.cell)
      .setTint(appleColor)
      .setVisible(true);

    const shieldDirs = this.extractShieldDirs(appleInfo);
    if (shieldDirs) {
      this.graphics.lineStyle(APPLE_OUTLINE_WIDTH, appleOutlineColor, APPLE_OUTLINE_ALPHA);
      this.drawShieldIndicators(x, y, shieldDirs);
    }
  }

  private drawTreasure(room: RoomSnapshot): void {
    const spot = room.treasure;
    if (!spot) return;
    const x = spot.x * this.grid.cell;
    const y = spot.y * this.grid.cell;
    const cell = this.grid.cell;
    const pad = Math.max(2, Math.floor(cell * 0.08));
    const left = x + pad;
    const top = y + pad;
    const width = cell - pad * 2;
    const height = cell - pad * 2;
    const lidHeight = Math.max(7, Math.floor(height * 0.42));
    const bodyTop = top + Math.floor(height * 0.38);
    const bodyHeight = height - Math.floor(height * 0.38);
    const bandWidth = Math.max(3, Math.floor(width * 0.16));
    const lockSize = Math.max(4, Math.floor(cell * 0.18));

    this.graphics.fillStyle(0x7a4a24, 1);
    this.graphics.fillRoundedRect(left, bodyTop, width, bodyHeight, 3);
    this.graphics.fillStyle(0xb87532, 1);
    this.graphics.fillRoundedRect(left, top, width, lidHeight, 5);

    this.graphics.fillStyle(0xffd166, 1);
    this.graphics.fillRect(x + cell / 2 - bandWidth / 2, top, bandWidth, height);
    this.graphics.fillRect(left, bodyTop - 1, width, Math.max(2, Math.floor(cell * 0.1)));

    this.graphics.fillStyle(0xfff3a8, 1);
    this.graphics.fillRect(x + cell / 2 - lockSize / 2, bodyTop + 2, lockSize, lockSize);

    this.graphics.lineStyle(1, 0x3b2112, 0.95);
    this.graphics.strokeRoundedRect(left + 0.5, top + 0.5, width - 1, height - 1, 4);
    this.graphics.lineStyle(1, 0xffe58a, 0.45);
    this.graphics.strokeRect(left + 2, top + 2, width - 4, Math.max(3, lidHeight - 3));
  }

  private drawTemperatureReliefs(room: RoomSnapshot): void {
    const reliefs = room.temperatureReliefs ?? [];
    for (const relief of reliefs) {
      const x = relief.x * this.grid.cell;
      const y = relief.y * this.grid.cell;
      const color = relief.kind === 'warm' ? 0xffc27a : 0x8fd8ff;
      const outline = darkenColor(color, 0.45);
      this.graphics.fillStyle(color, 0.55);
      this.graphics.fillCircle(
        x + this.grid.cell / 2,
        y + this.grid.cell / 2,
        Math.max(4, this.grid.cell * 0.28),
      );
      this.graphics.lineStyle(1, outline, 0.85);
      this.graphics.strokeCircle(
        x + this.grid.cell / 2,
        y + this.grid.cell / 2,
        Math.max(4, this.grid.cell * 0.28),
      );
      this.graphics.lineStyle(1, color, 0.28);
      this.graphics.strokeCircle(
        x + this.grid.cell / 2,
        y + this.grid.cell / 2,
        Math.max(6, this.grid.cell * 0.4),
      );
    }
  }

  private drawPowerup(room: RoomSnapshot): void {
    const p = room.powerup;
    if (!p) return;
    const x = p.x * this.grid.cell;
    const y = p.y * this.grid.cell;
    const color = p.kind === 'gun' ? 0xf6bd60 : p.kind === 'smite' ? 0xd7263d : 0x9b5de5;
    const outline = darkenColor(color, 0.35);
    this.graphics.fillStyle(color, 1).fillRect(x, y, this.grid.cell, this.grid.cell);
    this.graphics
      .lineStyle(1, outline, 0.9)
      .strokeRect(x + 0.5, y + 0.5, this.grid.cell - 1, this.grid.cell - 1);
  }

  private extractShieldDirs(appleInfo?: AppleSnapshot): Vector2Like[] | undefined {
    if (!appleInfo || appleInfo.typeId !== 'shielded') {
      return undefined;
    }
    const dirs = appleInfo.metadata?.protectedDirs as Vector2Like[] | undefined;
    return dirs?.map((dir) => ({ x: dir.x, y: dir.y }));
  }

  private drawShieldIndicators(originX: number, originY: number, dirs: Vector2Like[]) {
    const size = this.grid.cell;
    const shieldColor = 0xffffff;
    this.graphics.fillStyle(shieldColor, 0.6);
    dirs.forEach((dir) => {
      if (dir.x === 1 && dir.y === 0) {
        this.graphics.fillRect(originX + 1, originY + 2, 3, size - 4);
      } else if (dir.x === -1 && dir.y === 0) {
        this.graphics.fillRect(originX + size - 4, originY + 2, 3, size - 4);
      } else if (dir.x === 0 && dir.y === 1) {
        this.graphics.fillRect(originX + 2, originY + 1, size - 4, 3);
      } else if (dir.x === 0 && dir.y === -1) {
        this.graphics.fillRect(originX + 2, originY + size - 4, size - 4, 3);
      }
    });
  }

  private drawSnake(
    room: RoomSnapshot,
    snakeBody: readonly Vector2Like[],
    currentRoomId: string,
    direction: Vector2Like,
    overrideColor?: number,
    poweredUp: boolean = false,
    paletteOverride?: SnakeSpritePalette,
    activeHat: SnakeHatStyle | null = null,
  ): void {
    void room;
    const [roomX, roomY] = currentRoomId.split(',').map(Number);
    const now = (this.graphics.scene as Phaser.Scene).time?.now ?? performance.now();
    const pulse = poweredUp ? 0.85 + 0.15 * Math.sin(now / 180) : 1;
    const tintColor = typeof overrideColor === 'number' ? overrideColor : 0xffffff;
    const textureKeys = this.spriteFactory.ensureRecipe(
      snakeSpriteRecipe,
      this.grid.cell,
      paletteOverride ?? this.buildSnakePalette(),
    );
    this.snakeSprites.forEach((sprite) => sprite.setVisible(false));
    this.hatSprite.setVisible(false);

    snakeBody.forEach((segment, index) => {
      const localX = segment.x - roomX * this.grid.cols;
      const localY = segment.y - roomY * this.grid.rows;
      if (localX < 0 || localX >= this.grid.cols || localY < 0 || localY >= this.grid.rows) {
        return;
      }
      const alpha = Math.max(
        paletteConfig.snake.minAlpha,
        1 - index * paletteConfig.snake.fadeStep,
      );
      const x = localX * this.grid.cell;
      const y = localY * this.grid.cell;
      const sprite = this.ensureSnakeSprite(index);
      const variant = this.resolveVariant(snakeBody, index, direction);
      sprite
        .setTexture(textureKeys[variant])
        .setPosition(x + this.grid.cell / 2, y + this.grid.cell / 2)
        .setDisplaySize(this.grid.cell, this.grid.cell)
        .setAlpha(alpha * pulse)
        .setTint(tintColor)
        .setVisible(true);

      if (activeHat && index === 0) {
        const hatTextures = this.getHatTextureKeys(activeHat);
        this.hatSprite
          .setTexture(hatTextures[this.hatVariantFor(direction)])
          .setPosition(x + this.grid.cell / 2, y + this.grid.cell / 2 - this.grid.cell * 0.12)
          .setDisplaySize(this.grid.cell, this.grid.cell)
          .setAlpha(pulse)
          .setVisible(true);
      }
    });
  }

  private buildSnakePalette(): SnakeSpritePalette {
    return {
      baseColor: this.toCssColor(paletteConfig.snake.bodyColor),
      bellyColor: this.toCssColor(paletteConfig.snake.bellyColor),
      patternColor: this.toCssColor(paletteConfig.snake.patternColor),
      outlineColor: this.toCssColor(
        darkenColor(paletteConfig.snake.bodyColor, paletteConfig.snake.outlineDarkenFactor),
      ),
      eyeColor: this.toCssColor(paletteConfig.snake.eyeColor),
    };
  }

  private buildApplePalette(): AppleSpritePalette {
    return {
      fillColor: '#ffffff',
      accentColor: '#ffd9d9',
      outlineColor: '#5c241d',
      leafColor: '#9af7aa',
      stemColor: '#714c2a',
      sparkleColor: '#fff5c2',
    };
  }

  private buildHatPalette(): SnakeHatPalette {
    return {
      style: 'cowboy',
      fillColor: '#8b5a2b',
      bandColor: '#d5b06f',
      outlineColor: '#3d2412',
    };
  }

  private buildHatPaletteFor(style: SnakeHatStyle): SnakeHatPalette {
    if (style === 'market-cap') {
      return {
        style,
        fillColor: '#315f7d',
        bandColor: '#f0f6ff',
        outlineColor: '#102b3a',
        accentColor: '#ffcf5a',
      };
    }
    if (style === 'ember-cowl') {
      return {
        style,
        fillColor: '#4b1d28',
        bandColor: '#8f2f1f',
        outlineColor: '#1a0c12',
        accentColor: '#ffb36b',
      };
    }
    if (style === 'pearl-crown') {
      return {
        style,
        fillColor: '#f4d36a',
        bandColor: '#fff5c8',
        outlineColor: '#6a4b15',
        accentColor: '#bff7ff',
      };
    }
    if (style === 'dragon-helm') {
      return {
        style,
        fillColor: '#7ec8e3',
        bandColor: '#c41e3a',
        outlineColor: '#1a2b3c',
        accentColor: '#ff6b35',
      };
    }
    if (style === 'master-broth') {
      return {
        style,
        fillColor: '#ffffff',
        bandColor: '#4a90d9',
        outlineColor: '#2c3e50',
      };
    }
    return this.buildHatPalette();
  }

  private getHatTextureKeys(style: SnakeHatStyle): Record<SnakeHatVariant, string> {
    const cached = this.hatTextureCache[style];
    if (cached) {
      return cached;
    }
    const keys = this.spriteFactory.ensureRecipe(
      snakeHatRecipe,
      this.grid.cell,
      this.buildHatPaletteFor(style),
    );
    this.hatTextureCache[style] = keys;
    return keys;
  }

  private buildEnemyPalette(): EnemySpritePalette {
    return {
      bodyColor: '#ff8f5a',
      accentColor: '#ffd0a6',
      outlineColor: '#6a2c1a',
      eyeColor: '#fff8ef',
      bulletColor: '#fff3a8',
      bulletOutlineColor: '#8b5a2b',
    };
  }

  private buildFurniturePalette(): FurnitureSpritePalette {
    return {
      couch: { fill: '#ffb26b', accent: '#ffd8a8', outline: '#7c4a27' },
      kitchen: { fill: '#5ac8c0', accent: '#c7fff7', outline: '#24504d' },
      bed: { fill: '#ffb3c1', accent: '#fff0f4', outline: '#6e4350' },
      plant: { fill: '#62d96b', accent: '#9a6b3d', outline: '#29472d' },
      lamp: { fill: '#ffe58a', accent: '#fff6c7', outline: '#6c5a25' },
    };
  }

  private buildAnimalPalette(): AnimalSpritePalette {
    return {
      bodyColor: '#808080',
      accentColor: '#a0a0a0',
      outlineColor: '#404040',
      eyeColor: '#101010',
      flashColor: '#ffffff',
    };
  }

  private toCssColor(hex: number): string {
    return `#${hex.toString(16).padStart(6, '0')}`;
  }

  private ensureSnakeSprite(index: number): Phaser.GameObjects.Image {
    let sprite = this.snakeSprites[index];
    if (sprite) {
      return sprite;
    }

    sprite = this.scene.add
      .image(0, 0, this.defaultSnakeTextureKeys['body-horizontal'])
      .setVisible(false)
      .setOrigin(0.5, 0.5);
    this.snakeLayer.add(sprite);
    this.snakeSprites[index] = sprite;
    return sprite;
  }

  private resolveVariant(
    snakeBody: readonly Vector2Like[],
    index: number,
    direction: Vector2Like,
  ): SnakeSpriteVariant {
    if (snakeBody.length <= 1) {
      return this.headVariantFor(direction);
    }

    if (index === 0) {
      return this.headVariantFor(direction);
    }

    if (index === snakeBody.length - 1) {
      const previous = snakeBody[index - 1];
      const current = snakeBody[index];
      return this.tailVariantFor({
        x: current.x - previous.x,
        y: current.y - previous.y,
      });
    }

    const previous = snakeBody[index - 1];
    const current = snakeBody[index];
    const next = snakeBody[index + 1];
    const toPrevious = {
      x: previous.x - current.x,
      y: previous.y - current.y,
    };
    const toNext = {
      x: next.x - current.x,
      y: next.y - current.y,
    };

    if (toPrevious.x === -toNext.x && toPrevious.y === -toNext.y) {
      return toPrevious.x !== 0 ? 'body-horizontal' : 'body-vertical';
    }

    return this.turnVariantFor(toPrevious, toNext);
  }

  private headVariantFor(direction: Vector2Like): SnakeSpriteVariant {
    if (direction.x > 0) return 'head-right';
    if (direction.x < 0) return 'head-left';
    if (direction.y > 0) return 'head-down';
    return 'head-up';
  }

  private tailVariantFor(direction: Vector2Like): SnakeSpriteVariant {
    if (direction.x > 0) return 'tail-right';
    if (direction.x < 0) return 'tail-left';
    if (direction.y > 0) return 'tail-down';
    return 'tail-up';
  }

  private turnVariantFor(a: Vector2Like, b: Vector2Like): SnakeSpriteVariant {
    const hasUp = a.y < 0 || b.y < 0;
    const hasRight = a.x > 0 || b.x > 0;
    const hasDown = a.y > 0 || b.y > 0;
    const hasLeft = a.x < 0 || b.x < 0;

    if (hasUp && hasRight) return 'turn-up-right';
    if (hasRight && hasDown) return 'turn-right-down';
    if (hasDown && hasLeft) return 'turn-down-left';
    return 'turn-left-up';
  }

  private hatVariantFor(direction: Vector2Like): SnakeHatVariant {
    if (direction.x > 0) return 'hat-right';
    if (direction.x < 0) return 'hat-left';
    if (direction.y > 0) return 'hat-down';
    return 'hat-up';
  }

  private resolveAppleVariant(appleInfo?: AppleSnapshot): AppleSpriteVariant {
    switch (appleInfo?.typeId) {
      case 'shielded':
        return 'shielded';
      case 'gold':
      case 'pearl':
        return 'gold';
      case 'skittish':
        return 'skittish';
      default:
        return 'normal';
    }
  }

  private drawEnemies(enemies: readonly EnemyInstance[]): void {
    this.enemySprites.forEach((sprite) => sprite.setVisible(false));
    enemies.forEach((enemy, index) => {
      const sprite = this.ensureEnemySprite(index);
      const variant = this.resolveEnemyVariant(enemy);
      const textureKeys = this.spriteFactory.ensureRecipe(
        enemySpriteRecipe,
        this.grid.cell,
        this.paletteForEnemy(enemy),
      );
      sprite
        .setTexture(textureKeys[variant])
        .setPosition(
          enemy.position.x * this.grid.cell + this.grid.cell / 2,
          enemy.position.y * this.grid.cell + this.grid.cell / 2,
        )
        .setDisplaySize(this.grid.cell, this.grid.cell)
        .setVisible(true);
    });
  }

  private drawBullets(bullets: readonly BulletInstance[]): void {
    this.bulletSprites.forEach((sprite) => sprite.setVisible(false));
    const bulletSize = Math.max(this.grid.cell * 0.7, this.grid.cell - 4);
    bullets.forEach((bullet, index) => {
      const sprite = this.ensureBulletSprite(index);
      const textureKeys = this.spriteFactory.ensureRecipe(
        enemySpriteRecipe,
        this.grid.cell,
        this.paletteForBullet(bullet),
      );
      sprite
        .setTexture(textureKeys['bullet'])
        .setPosition(
          bullet.position.x * this.grid.cell + this.grid.cell / 2,
          bullet.position.y * this.grid.cell + this.grid.cell / 2,
        )
        .setDisplaySize(bulletSize, bulletSize)
        .setVisible(true);
    });
  }

  private drawFootballs(footballs: readonly FootballInstance[]): void {
    const cell = this.grid.cell;
    footballs.forEach((football) => {
      const cx = football.position.x * cell + cell / 2;
      const cy = football.position.y * cell + cell / 2;
      const grounded = football.state === 'grounded';
      const angle = football.direction.x !== 0 ? 0 : Math.PI / 2;
      const radiusX = grounded ? cell * 0.28 : cell * 0.34;
      const radiusY = grounded ? cell * 0.18 : cell * 0.22;
      this.graphics.fillStyle(0x8b4a24, 1);
      this.graphics.fillEllipse(cx, cy, radiusX * 2, radiusY * 2);
      this.graphics.lineStyle(1, 0x3d1f10, 0.9);
      this.graphics.strokeEllipse(cx, cy, radiusX * 2, radiusY * 2);
      this.graphics.lineStyle(1, 0xf3eee2, 0.95);
      if (angle === 0) {
        this.graphics.lineBetween(cx - radiusX * 0.35, cy, cx + radiusX * 0.35, cy);
        for (let i = -1; i <= 1; i += 1) {
          this.graphics.lineBetween(cx + i * 3, cy - 3, cx + i * 3, cy + 3);
        }
      } else {
        this.graphics.lineBetween(cx, cy - radiusX * 0.35, cx, cy + radiusX * 0.35);
        for (let i = -1; i <= 1; i += 1) {
          this.graphics.lineBetween(cx - 3, cy + i * 3, cx + 3, cy + i * 3);
        }
      }
      if (football.state === 'returning') {
        this.graphics.lineStyle(1, 0xf3eee2, 0.28);
        this.graphics.strokeCircle(cx, cy, cell * 0.42);
      }
    });
  }

  private ensureEnemySprite(index: number): Phaser.GameObjects.Image {
    let sprite = this.enemySprites[index];
    if (sprite) {
      return sprite;
    }
    sprite = this.scene.add
      .image(0, 0, this.enemyTextureKeys['enemy-down'])
      .setDepth(ENEMY_LAYER_DEPTH)
      .setVisible(false)
      .setOrigin(0.5, 0.5);
    this.enemySprites[index] = sprite;
    return sprite;
  }

  private ensureBulletSprite(index: number): Phaser.GameObjects.Image {
    let sprite = this.bulletSprites[index];
    if (sprite) {
      return sprite;
    }
    sprite = this.scene.add
      .image(0, 0, this.enemyTextureKeys['bullet'])
      .setDepth(BULLET_LAYER_DEPTH)
      .setVisible(false)
      .setOrigin(0.5, 0.5);
    this.bulletSprites[index] = sprite;
    return sprite;
  }

  private ensureFurnitureSprite(index: number): Phaser.GameObjects.Image {
    let sprite = this.furnitureSprites[index];
    if (sprite) {
      return sprite;
    }
    sprite = this.scene.add
      .image(0, 0, this.furnitureTextureKeys['couch'])
      .setDepth(FURNITURE_LAYER_DEPTH)
      .setVisible(false)
      .setOrigin(0.5, 0.5);
    this.furnitureSprites[index] = sprite;
    return sprite;
  }

  private drawAnimals(animals: readonly AnimalInstance[]): void {
    this.animalSprites.forEach((sprite) => sprite.setVisible(false));
    animals.forEach((animal, index) => {
      const sprite = this.ensureAnimalSprite(index);
      const variant = this.resolveAnimalVariant(animal);
      const textureKeys = this.spriteFactory.ensureRecipe(
        animalSpriteRecipe,
        this.grid.cell,
        this.paletteForAnimal(animal),
      );
      sprite
        .setTexture(textureKeys[variant])
        .setPosition(
          animal.position.x * this.grid.cell + this.grid.cell / 2,
          animal.position.y * this.grid.cell + this.grid.cell / 2,
        )
        .setDisplaySize(this.grid.cell, this.grid.cell)
        .setVisible(true);
    });
  }

  private ensureAnimalSprite(index: number): Phaser.GameObjects.Image {
    let sprite = this.animalSprites[index];
    if (sprite) {
      return sprite;
    }
    sprite = this.scene.add
      .image(0, 0, this.animalTextureKeys['rabbit-down'])
      .setDepth(ANIMAL_LAYER_DEPTH)
      .setVisible(false)
      .setOrigin(0.5, 0.5);
    this.animalSprites[index] = sprite;
    return sprite;
  }

  private resolveAnimalVariant(animal: AnimalInstance): AnimalSpriteVariant {
    const direction = animal.direction;
    const suffix =
      direction.x > 0
        ? 'right'
        : direction.x < 0
          ? 'left'
          : direction.y < 0
            ? 'up'
            : 'down';
    const flashSuffix = animal.flashTicks > 0 ? 'flash-' : '';
    return `${animal.type}-${flashSuffix}${suffix}` as AnimalSpriteVariant;
  }

  private paletteForAnimal(animal: AnimalInstance): AnimalSpritePalette {
    switch (animal.type) {
      case 'rabbit':
        return {
          bodyColor: '#f0d0a0',
          accentColor: '#c08060',
          outlineColor: '#5a3a20',
          eyeColor: '#202020',
          flashColor: '#ffffff',
        };
      case 'deer':
        return {
          bodyColor: '#b07040',
          accentColor: '#d0a070',
          outlineColor: '#3a2010',
          eyeColor: '#202020',
          flashColor: '#ffffff',
        };
      case 'fox':
        return {
          bodyColor: '#e08030',
          accentColor: '#f0c080',
          outlineColor: '#4a2010',
          eyeColor: '#202020',
          flashColor: '#ffffff',
        };
      case 'wolf':
        return {
          bodyColor: '#a0a0a0',
          accentColor: '#d0d0d0',
          outlineColor: '#202020',
          eyeColor: '#ff4040',
          flashColor: '#ffffff',
        };
      case 'bear':
        return {
          bodyColor: '#604020',
          accentColor: '#806040',
          outlineColor: '#201008',
          eyeColor: '#101010',
          flashColor: '#ffffff',
        };
      case 'fish':
        return {
          bodyColor: '#60b0e0',
          accentColor: '#a0d8f0',
          outlineColor: '#204060',
          eyeColor: '#101010',
          flashColor: '#ffffff',
        };
      case 'bird':
        return {
          bodyColor: '#4080c0',
          accentColor: '#60a0e0',
          outlineColor: '#102040',
          eyeColor: '#101010',
          flashColor: '#ffffff',
        };
      case 'snake':
        return {
          bodyColor: '#60a040',
          accentColor: '#80c060',
          outlineColor: '#203010',
          eyeColor: '#ffff00',
          flashColor: '#ffffff',
        };
      case 'eagle':
        return {
          bodyColor: '#5a3b22',
          accentColor: '#f2f0df',
          outlineColor: '#20140c',
          eyeColor: '#ffe88a',
          flashColor: '#ffd166',
        };
      case 'jackalope':
        return {
          bodyColor: '#c49a6c',
          accentColor: '#e8d7b8',
          outlineColor: '#4b2d17',
          eyeColor: '#201008',
          flashColor: '#ffffff',
        };
      case 'raccoon':
        return {
          bodyColor: '#747474',
          accentColor: '#c7c7c7',
          outlineColor: '#252525',
          eyeColor: '#fff0c8',
          flashColor: '#ffffff',
        };
      case 'coyote':
        return {
          bodyColor: '#b9864c',
          accentColor: '#efd0a2',
          outlineColor: '#3c2414',
          eyeColor: '#ffe08a',
          flashColor: '#ffffff',
        };
      case 'bison':
        return {
          bodyColor: '#5a351f',
          accentColor: '#d0c2a0',
          outlineColor: '#1f1008',
          eyeColor: '#fff0c8',
          flashColor: '#ffffff',
        };
      case 'bass':
        return {
          bodyColor: '#5f8f67',
          accentColor: '#c8e6a0',
          outlineColor: '#1f3f2a',
          eyeColor: '#101010',
          flashColor: '#ffffff',
        };
      case 'possum':
        return {
          bodyColor: '#b9b5ad',
          accentColor: '#f1c9d0',
          outlineColor: '#4d4a46',
          eyeColor: '#101010',
          flashColor: '#ffffff',
        };
      case 'armadillo':
        return {
          bodyColor: '#9a816d',
          accentColor: '#d2bea6',
          outlineColor: '#3d3028',
          eyeColor: '#101010',
          flashColor: '#ffffff',
        };
      default:
        return {
          bodyColor: '#808080',
          accentColor: '#a0a0a0',
          outlineColor: '#404040',
          eyeColor: '#101010',
          flashColor: '#ffffff',
        };
    }
  }

  private resolveEnemyVariant(enemy: EnemyInstance): EnemySpriteVariant {
    const suffix =
      enemy.aimDirection.x > 0
        ? 'right'
        : enemy.aimDirection.x < 0
          ? 'left'
          : enemy.aimDirection.y < 0
            ? 'up'
            : 'down';

    return (
      enemy.flashTicks > 0 ? `enemy-flash-${suffix}` : `enemy-${suffix}`
    ) as EnemySpriteVariant;
  }

  private paletteForEnemy(enemy: EnemyInstance): EnemySpritePalette {
    if (enemy.encounterKind === 'npc-hostile') {
      return {
        bodyColor: '#a82d3d',
        accentColor: '#ff9f8b',
        outlineColor: '#30070e',
        eyeColor: '#fff0ea',
        bulletColor: '#ffb36b',
        bulletOutlineColor: '#6a2c1a',
      };
    }
    if (enemy.encounterKind === 'goblin') {
      return {
        bodyColor: '#4f8a32',
        accentColor: '#d5ff7a',
        outlineColor: '#10220b',
        eyeColor: '#fff4c2',
        bulletColor: '#b6ff6a',
        bulletOutlineColor: '#315a1f',
      };
    }
    if (enemy.encounterKind === 'duelist') {
      if (enemy.id === 'freak-joey') {
        return {
          bodyColor: '#7a2430',
          accentColor: '#f4b46a',
          outlineColor: '#23060a',
          eyeColor: '#fff0d4',
          bulletColor: '#ffd27d',
          bulletOutlineColor: '#5a2a12',
        };
      }
      return {
        bodyColor: '#5d3d7d',
        accentColor: '#f0da8a',
        outlineColor: '#1c1026',
        eyeColor: '#fff8e2',
        bulletColor: '#e2c8ff',
        bulletOutlineColor: '#4a315f',
      };
    }
    if (enemy.encounterKind === 'shark') {
      return {
        bodyColor: '#3f6f87',
        accentColor: '#b9e8f5',
        outlineColor: '#092534',
        eyeColor: '#fff6e8',
        bulletColor: '#9ed8e8',
        bulletOutlineColor: '#123746',
      };
    }
    return this.buildEnemyPalette();
  }

  private paletteForBullet(bullet: BulletInstance): EnemySpritePalette {
    switch (bullet.style) {
      case 'player':
        return {
          bodyColor: '#f6bd60',
          accentColor: '#ffe0a3',
          outlineColor: '#7a4d1d',
          eyeColor: '#fff8ef',
          bulletColor: '#ffe0a3',
          bulletOutlineColor: '#7a4d1d',
        };
      case 'npc-hostile':
        return {
          bodyColor: '#a82d3d',
          accentColor: '#ff9f8b',
          outlineColor: '#30070e',
          eyeColor: '#fff0ea',
          bulletColor: '#ff8e7a',
          bulletOutlineColor: '#5a1620',
        };
      case 'goblin':
        return {
          bodyColor: '#4f8a32',
          accentColor: '#d5ff7a',
          outlineColor: '#10220b',
          eyeColor: '#fff4c2',
          bulletColor: '#b6ff6a',
          bulletOutlineColor: '#315a1f',
        };
      case 'freak-joey':
        return {
          bodyColor: '#7a2430',
          accentColor: '#f4b46a',
          outlineColor: '#23060a',
          eyeColor: '#fff0d4',
          bulletColor: '#ffd27d',
          bulletOutlineColor: '#5a2a12',
        };
      case 'duelist':
        return {
          bodyColor: '#5d3d7d',
          accentColor: '#f0da8a',
          outlineColor: '#1c1026',
          eyeColor: '#fff8e2',
          bulletColor: '#e2c8ff',
          bulletOutlineColor: '#4a315f',
        };
      case 'enemy':
      default:
        return this.buildEnemyPalette();
    }
  }

  private furnitureVariantForTile(tile: string): FurnitureSpriteVariant | null {
    switch (tile) {
      case 'C':
        return 'couch';
      case 'K':
        return 'kitchen';
      case 'B':
        return 'bed';
      case 'P':
        return 'plant';
      case 'L':
        return 'lamp';
      default:
        return null;
    }
  }
}
