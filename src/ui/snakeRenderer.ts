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
import {
  vegetationSpriteRecipe,
  type VegetationSpritePalette,
  type VegetationSpriteVariant,
} from './spriteRecipes/vegetationRecipe.js';
import type { EnemyInstance, BulletInstance } from '../systems/enemies.js';
import type { AnimalInstance } from '../animals/types.js';
import type { FootballInstance } from '../game/snakeGame.js';
import type { ResolvedAtmosphereView } from '../world/atmosphereTypes.js';

type PowerupKind = NonNullable<RoomSnapshot['powerup']>['kind'];

const LADDER_OUTLINE_ALPHA = 0.8;
const LADDER_OUTLINE_WIDTH = 1;
const APPLE_OUTLINE_ALPHA = 0.85;
const APPLE_OUTLINE_WIDTH = 1;
const APPLE_LAYER_DEPTH = 20;
const SNAKE_LAYER_DEPTH = 22;
const ANIMAL_LAYER_DEPTH = 18;
const ENEMY_LAYER_DEPTH = 23;
const BULLET_LAYER_DEPTH = 26;
const FURNITURE_LAYER_DEPTH = 21;
const VEGETATION_LAYER_DEPTH = 19;
const POWERUP_LAYER_DEPTH = 20.5;
const MOSAIC_COAST_WALL_COLORS = {
  stucco: 0xf6eedc,
  stuccoAlt: 0xe8dcc6,
  outline: 0x382818,
  castShadow: 0x5b4633,
  terracottaCap: 0xb65a38,
  crack: 0x6a5746,
};

interface SnakeRenderOptions {
  wallSenseRadius?: number;
  snakeColor?: number;
  poweredUp?: boolean;
  direction?: Vector2Like;
  snakeRenderStyle?: 'sprite' | 'retro-grid';
  characterMode?: 'snake' | 'raccoon';
  otherPlayers?: readonly {
    id: string;
    body: readonly Vector2Like[];
    direction: Vector2Like;
    color?: number;
  }[];
  snakePalette?: SnakeSpritePalette;
  cowboyHat?: boolean;
  activeHat?: SnakeHatStyle | null;
  enemies?: readonly EnemyInstance[];
  followers?: readonly EnemyInstance[];
  bullets?: readonly BulletInstance[];
  footballs?: readonly FootballInstance[];
  animals?: readonly AnimalInstance[];
  atmosphere?: ResolvedAtmosphereView;
  thermalBody?: {
    current: number;
    max: number;
    hazard: 'hot' | 'cold' | null;
    active: boolean;
  };
  lightningStrike?: {
    x: number;
    y: number;
    radius: number;
    ticksRemaining: number;
    phase: 'warning' | 'strike';
  } | null;
  renderTimeMs?: number;
}

export interface RenderDiagnostics {
  staticCacheStatus: 'cached' | 'rebuilt' | 'dirty' | 'disabled';
  staticTileCount: number;
  dynamicObjectCount: number;
  treeTileCount: number;
  detailedTreeTileCount: number;
  cheapForestTileCount: number;
}

export class SnakeRenderer {
  private readonly spriteFactory: RuntimeSpriteFactory;
  private readonly overlayGraphics: Phaser.GameObjects.Graphics;
  private readonly darknessTexture: Phaser.GameObjects.RenderTexture;
  private readonly darknessRevealGraphics: Phaser.GameObjects.Graphics;
  private readonly lightGlowGraphics: Phaser.GameObjects.Graphics;
  private readonly snakeSprites: Phaser.GameObjects.Image[] = [];
  private readonly snakeLayer: Phaser.GameObjects.Container;
  private readonly hatSprite: Phaser.GameObjects.Image;
  private readonly wallGraphics: Phaser.GameObjects.Graphics;
  private readonly defaultSnakeTextureKeys: Record<SnakeSpriteVariant, string>;
  private readonly appleTextureKeys: Record<AppleSpriteVariant, string>;
  private readonly appleSprites: Phaser.GameObjects.Image[] = [];
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
  private readonly vegetationTextureKeys: Record<VegetationSpriteVariant, string>;
  private readonly vegetationSprites: Phaser.GameObjects.Image[] = [];
  private readonly powerupTextureKeys: Record<PowerupKind, string>;
  private readonly powerupSprite: Phaser.GameObjects.Image;
  private readonly staticRoomSignatures = new Map<string, string>();
  private readonly dirtyStaticRooms = new Set<string>();
  private readonly loggedOtherPlayerRenderIds = new Set<string>();
  // Tracks masonry block creation timestamps for crumbling animation
  private readonly masonryBlockAges = new Map<string, number>();
  private renderDiagnostics: RenderDiagnostics = {
    staticCacheStatus: 'disabled',
    staticTileCount: 0,
    dynamicObjectCount: 0,
    treeTileCount: 0,
    detailedTreeTileCount: 0,
    cheapForestTileCount: 0,
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly graphics: Phaser.GameObjects.Graphics,
    wallGraphics: Phaser.GameObjects.Graphics,
    private readonly grid: GridConfig,
  ) {
    this.wallGraphics = wallGraphics;
    this.overlayGraphics = this.scene.add.graphics().setDepth(BULLET_LAYER_DEPTH + 0.75);
    this.darknessTexture = this.scene.add
      .renderTexture(0, 0, this.grid.cols * this.grid.cell, this.grid.rows * this.grid.cell)
      .setOrigin(0, 0)
      .setDepth(BULLET_LAYER_DEPTH + 0.7)
      .setVisible(false);
    this.darknessRevealGraphics = this.scene.add.graphics().setVisible(false);
    this.lightGlowGraphics = this.scene.add
      .graphics()
      .setDepth(BULLET_LAYER_DEPTH + 0.72)
      .setBlendMode(Phaser.BlendModes.ADD);
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
    this.appleSprites.push(this.createAppleSprite());
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
    this.vegetationTextureKeys = this.spriteFactory.ensureRecipe(
      vegetationSpriteRecipe,
      this.grid.cell,
      this.buildVegetationPalette(),
    );
    this.animalTextureKeys = this.spriteFactory.ensureRecipe(
      animalSpriteRecipe,
      this.grid.cell,
      this.buildAnimalPalette(),
    );
    this.powerupTextureKeys = this.ensurePowerupOrbTextures();
    this.powerupSprite = this.scene.add
      .image(0, 0, this.powerupTextureKeys.phase)
      .setDepth(POWERUP_LAYER_DEPTH)
      .setVisible(false)
      .setOrigin(0.5, 0.5);
    this.snakeLayer = this.scene.add.container(0, 0).setDepth(SNAKE_LAYER_DEPTH);
    this.hatSprite = this.scene.add
      .image(0, 0, this.hatTextureKeys['hat-up'])
      .setDepth(SNAKE_LAYER_DEPTH + 1)
      .setVisible(false)
      .setOrigin(0.5, 0.5);
  }

  getWorldPosition(position: Vector2Like, currentRoomId: string): { x: number; y: number } {
    const [roomX, roomY] = this.parseRoomCoordinates(currentRoomId);
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
    this.overlayGraphics.clear();
    this.overlayGraphics.clearMask();
    this.lightGlowGraphics.clear();
    this.lightGlowGraphics.clearMask();
    this.darknessTexture.clear().setVisible(false);
    this.wallGraphics.clear();

    const opts = options ?? {};
    this.beginRenderDiagnostics(room, snakeBody, appleInfo ?? null, opts);

    this.drawRoomFloors(room);
    this.drawRoomWalls(room);
    this.drawMasonryBlocks(room, (roomId, lx, ly) => this.getMasonryBlockAge(roomId, lx, ly));
    this.drawAtmosphereBaseTint(opts.atmosphere);
    this.drawTemperatureReliefs(room);
    this.drawMosaicCoastExposureOverlay(room, opts.renderTimeMs ?? 0);
    this.drawFurniture(room);
    this.drawVegetation(room);
    this.drawAtmosphereGroundJuice(room, opts.atmosphere, opts.renderTimeMs ?? 0);
    this.highlightWalls(room, snakeBody, currentRoomId, opts.wallSenseRadius ?? 0);
    this.drawGrid();
    this.drawAtmosphereParticles(room, opts.atmosphere, false, opts.renderTimeMs ?? 0);
    this.drawApple(room, appleInfo ?? undefined);
    this.drawTreasure(room);
    this.drawPowerup(room);
    if (opts.characterMode === 'raccoon') {
      this.drawRaccoonPlayer(
        snakeBody,
        currentRoomId,
        opts.direction ?? { x: 1, y: 0 },
        opts.poweredUp ?? false,
      );
    } else if (opts.snakeRenderStyle === 'retro-grid') {
      this.drawRetroGridSnake(
        snakeBody,
        currentRoomId,
        opts.direction ?? { x: 1, y: 0 },
        opts.poweredUp ?? false,
        opts.activeHat ?? (opts.cowboyHat ? 'cowboy' : null),
        opts.thermalBody,
      );
    } else {
      this.drawSnake(
        room,
        snakeBody,
        currentRoomId,
        opts.direction ?? { x: 1, y: 0 },
        opts.snakeColor,
        opts.poweredUp ?? false,
        opts.snakePalette,
        opts.activeHat ?? (opts.cowboyHat ? 'cowboy' : null),
        opts.thermalBody,
      );
    }
    this.drawOtherPlayers(room, currentRoomId, opts.otherPlayers ?? []);
    this.drawAnimals(opts.animals ?? []);
    this.drawEnemies([...(opts.enemies ?? []), ...(opts.followers ?? [])]);
    this.drawBullets(opts.bullets ?? []);
    this.drawFootballs(opts.footballs ?? []);
    this.drawAtmosphereParticles(room, opts.atmosphere, true, opts.renderTimeMs ?? 0);
    this.drawDarknessOverlay(opts.atmosphere, opts.renderTimeMs ?? 0);
    this.drawLightningStrikeMarker(opts.lightningStrike ?? null, opts.renderTimeMs ?? 0);
    this.drawSkyEventFlash(opts.atmosphere, opts.renderTimeMs ?? 0);
    this.drawLightningFlash(opts.atmosphere, opts.renderTimeMs ?? 0);
  }

  markStaticRoomDirty(roomId: string): void {
    this.dirtyStaticRooms.add(roomId);
  }

  private drawAtmosphereBaseTint(view?: ResolvedAtmosphereView): void {
    if (!view || view.tint.alpha <= 0) {
      return;
    }
    const width = this.grid.cols * this.grid.cell;
    const height = this.grid.rows * this.grid.cell;
    this.graphics.fillStyle(view.tint.color, view.tint.alpha).fillRect(0, 0, width, height);
  }

  private drawDarknessOverlay(
    view: ResolvedAtmosphereView | undefined,
    renderTimeMs: number,
  ): void {
    if (!view || view.darkness.darknessAlpha <= 0) {
      return;
    }
    const width = this.grid.cols * this.grid.cell;
    const height = this.grid.rows * this.grid.cell;
    this.darknessTexture.clear();
    this.darknessTexture.fill(0x020713, view.darkness.darknessAlpha, 0, 0, width, height);
    this.darknessTexture.setVisible(true);

    for (const light of view.darkness.lightSources) {
      this.eraseDarknessForLight(light, renderTimeMs);
      this.drawWarmLightCore(light, renderTimeMs);
    }
  }

  private eraseDarknessForLight(
    light: ResolvedAtmosphereView['darkness']['lightSources'][number],
    renderTimeMs: number,
  ): void {
    const radiusPx = light.radiusTiles * this.grid.cell;
    if (radiusPx <= 0 || light.intensity <= 0) {
      return;
    }
    const cx = light.x * this.grid.cell + this.grid.cell / 2;
    const cy = light.y * this.grid.cell + this.grid.cell / 2;
    const flicker = light.flicker ? 0.94 + Math.sin(renderTimeMs / 180 + light.x * 1.7) * 0.06 : 1;
    const intensity = Phaser.Math.Clamp(light.intensity * flicker, 0, 1.2);
    const reveal = this.darknessRevealGraphics.clear();

    reveal.fillStyle(0xffffff, Math.min(0.16, intensity * 0.13));
    reveal.fillCircle(cx, cy, radiusPx * 1.08);
    reveal.fillStyle(0xffffff, Math.min(0.48, 0.22 + intensity * 0.24));
    reveal.fillCircle(cx, cy, radiusPx * 0.86);
    reveal.fillStyle(0xffffff, Math.min(0.78, 0.42 + intensity * 0.3));
    reveal.fillCircle(cx, cy, radiusPx * 0.48);

    this.darknessTexture.erase([reveal]);
    reveal.clear();
  }

  private drawWarmLightCore(
    light: ResolvedAtmosphereView['darkness']['lightSources'][number],
    renderTimeMs: number,
  ): void {
    const radiusPx = light.radiusTiles * this.grid.cell;
    if (radiusPx <= 0 || light.intensity <= 0) {
      return;
    }
    const cx = light.x * this.grid.cell + this.grid.cell / 2;
    const cy = light.y * this.grid.cell + this.grid.cell / 2;
    const flicker = light.flicker ? 0.92 + Math.sin(renderTimeMs / 150 + light.y * 1.3) * 0.08 : 1;
    const warmAlpha = Math.min(0.14, light.intensity * flicker * 0.12);
    this.lightGlowGraphics.fillStyle(light.color, warmAlpha).fillCircle(cx, cy, radiusPx * 0.26);
    this.lightGlowGraphics
      .fillStyle(light.color, warmAlpha * 0.35)
      .fillCircle(cx, cy, radiusPx * 0.42);
  }

  private drawAtmosphereGroundJuice(
    room: RoomSnapshot,
    view: ResolvedAtmosphereView | undefined,
    renderTimeMs: number,
  ): void {
    if (!view || view.activeJuice.length === 0) {
      return;
    }
    const cell = this.grid.cell;
    const roomHash = this.hashString(`${room.id}:${view.state.weatherSeed}`);
    if (view.activeJuice.includes('pond-ripples') || view.activeJuice.includes('moon-reflection')) {
      this.graphics.lineStyle(Math.max(1, Math.floor(cell * 0.08)), 0xc9f6ff, 0.28);
      for (let y = 0; y < room.layout.length; y++) {
        for (let x = 0; x < room.layout[y].length; x++) {
          const tile = room.layout[y][x];
          if ((tile === '~' || tile === 'O') && (x * 11 + y * 7 + roomHash) % 5 === 0) {
            const pulse = 0.75 + Math.sin(renderTimeMs / 420 + x * 0.7 + y * 0.4) * 0.25;
            this.graphics.strokeEllipse(
              x * cell + cell / 2,
              y * cell + cell / 2,
              cell * (0.45 + pulse * 0.22),
              cell * (0.18 + pulse * 0.12),
            );
          }
        }
      }
    }
    if (
      view.activeJuice.includes('lantern-reflections') ||
      view.activeJuice.includes('neon-reflections') ||
      view.activeJuice.includes('oil-sheen')
    ) {
      const color = view.activeJuice.includes('neon-reflections') ? 0xff4fd8 : 0xffd48a;
      this.graphics.lineStyle(1, color, 0.22);
      for (let i = 0; i < 18; i++) {
        const x = ((roomHash + i * 17) % this.grid.cols) * cell + cell * 0.2;
        const y = ((roomHash + i * 29) % this.grid.rows) * cell + cell * 0.72;
        this.graphics.lineBetween(x, y, x + cell * 0.6, y + cell * 0.1);
      }
    }
    if (view.activeJuice.includes('glass-glare') || view.activeJuice.includes('prism-haze')) {
      this.graphics.lineStyle(1, 0xfff5c7, 0.18);
      for (let i = 0; i < 14; i++) {
        const x = ((roomHash + i * 23) % this.grid.cols) * cell;
        const y = ((roomHash + i * 31) % this.grid.rows) * cell;
        this.graphics.lineBetween(
          x + cell * 0.15,
          y + cell * 0.15,
          x + cell * 0.85,
          y + cell * 0.85,
        );
      }
    }
  }

  private drawAtmosphereParticles(
    room: RoomSnapshot,
    view: ResolvedAtmosphereView | undefined,
    foreground: boolean,
    renderTimeMs: number,
  ): void {
    if (!view || view.particles.density <= 0 || view.particles.alpha <= 0) {
      return;
    }
    const visual = view.localVisual;
    const foregroundVisuals = new Set([
      'fog',
      'mist',
      'steam',
      'heatHaze',
      'whiteout',
      'dryLightning',
    ]);
    if (foreground !== foregroundVisuals.has(visual)) {
      return;
    }
    const width = this.grid.cols * this.grid.cell;
    const height = this.grid.rows * this.grid.cell;
    const count = Math.floor(18 + view.particles.density * 150);
    const seed = this.hashString(`${room.id}:${view.state.weatherSeed}:${visual}`);
    const time = Math.max(0, renderTimeMs) * 0.001 * view.particles.speed;
    this.graphics.lineStyle(1, view.particles.color, view.particles.alpha);
    this.graphics.fillStyle(view.particles.color, view.particles.alpha);

    if (visual === 'fog' || visual === 'mist' || visual === 'steam' || visual === 'whiteout') {
      const bands = visual === 'whiteout' ? 8 : 5;
      for (let i = 0; i < bands; i++) {
        const drift = Math.sin(time * 0.9 + i * 1.7) * this.grid.cell * 1.4;
        const y =
          positiveMod(seed + i * 47 + Math.floor(time * this.grid.cell * 1.5), height) -
          this.grid.cell;
        const alpha = Math.min(0.16, view.particles.alpha * (visual === 'whiteout' ? 0.7 : 0.28));
        this.graphics
          .fillStyle(view.particles.color, alpha)
          .fillRect(
            drift - this.grid.cell * 2,
            y,
            width + this.grid.cell * 4,
            this.grid.cell * 1.8,
          );
      }
      return;
    }

    if (visual === 'heatHaze') {
      const lines = 11;
      this.graphics.lineStyle(1, 0xffc078, Math.min(0.2, view.particles.alpha));
      for (let i = 0; i < lines; i++) {
        const y = ((i + 1) / (lines + 1)) * height;
        const phase = time * 2.2 + i * 0.9;
        this.graphics.beginPath();
        this.graphics.moveTo(0, y);
        for (let x = 0; x <= width; x += this.grid.cell) {
          this.graphics.lineTo(x, y + Math.sin(phase + x * 0.018) * this.grid.cell * 0.18);
        }
        this.graphics.stroke();
      }
      return;
    }

    if (visual === 'dryLightning') {
      if ((view.state.weatherSeed + Math.floor(renderTimeMs / 180)) % 17 <= 1) {
        const x = ((seed % this.grid.cols) + 0.5) * this.grid.cell;
        this.graphics.lineStyle(2, 0xfff3a6, 0.45);
        this.graphics.beginPath();
        this.graphics.moveTo(x, 0);
        this.graphics.lineTo(x - this.grid.cell * 0.5, height * 0.28);
        this.graphics.lineTo(x + this.grid.cell * 0.35, height * 0.5);
        this.graphics.lineTo(x - this.grid.cell * 0.2, height * 0.72);
        this.graphics.stroke();
      }
      return;
    }

    if (
      visual === 'thunder' &&
      (view.state.weatherSeed + Math.floor(renderTimeMs / 180)) % 17 <= 1
    ) {
      const x = ((seed % this.grid.cols) + 0.5) * this.grid.cell;
      this.graphics.lineStyle(2, 0xfff3a6, 0.45);
      this.graphics.beginPath();
      this.graphics.moveTo(x, 0);
      this.graphics.lineTo(x - this.grid.cell * 0.5, height * 0.28);
      this.graphics.lineTo(x + this.grid.cell * 0.35, height * 0.5);
      this.graphics.lineTo(x - this.grid.cell * 0.2, height * 0.72);
      this.graphics.stroke();
      this.graphics.lineStyle(1, view.particles.color, view.particles.alpha);
    }

    for (let i = 0; i < count; i++) {
      const baseX = this.hashNumber(seed + i * 37) % width;
      const baseY = this.hashNumber(seed + i * 53) % height;
      const gust = Math.sin(time * 1.8 + i * 0.73) * this.grid.cell * 0.35;
      let x = baseX + 0.5;
      let y = baseY + 0.5;
      if (
        visual === 'rain' ||
        visual === 'heavyRain' ||
        visual === 'monsoon' ||
        visual === 'neonRain' ||
        visual === 'oilRain' ||
        visual === 'thunder'
      ) {
        const len =
          this.grid.cell *
          (visual === 'heavyRain' || visual === 'monsoon' || visual === 'thunder' ? 0.65 : 0.45);
        x = positiveMod(baseX - Math.floor(time * this.grid.cell * 9) + i * 3, width);
        y = positiveMod(baseY + Math.floor(time * this.grid.cell * 24), height);
        this.graphics.lineBetween(x, y, x - len * 0.35, y + len);
      } else if (
        visual === 'snow' ||
        visual === 'sleet' ||
        visual === 'ashfall' ||
        visual === 'fallout' ||
        visual === 'sporeCloud' ||
        visual === 'boneDust' ||
        visual === 'dustStorm' ||
        visual === 'leafFall' ||
        visual === 'petals' ||
        visual === 'fireflies' ||
        visual === 'aurora' ||
        visual === 'seaSpray' ||
        visual === 'caveDrip'
      ) {
        const fallSpeed =
          visual === 'snow' || visual === 'sleet'
            ? 4
            : visual === 'leafFall' || visual === 'petals'
              ? 2.2
              : visual === 'dustStorm'
                ? 10
                : 5;
        x = positiveMod(
          baseX + Math.floor(gust + time * this.grid.cell * (visual === 'dustStorm' ? 8 : 1.6)),
          width,
        );
        y = positiveMod(baseY + Math.floor(time * this.grid.cell * fallSpeed), height);
        const size =
          visual === 'leafFall' || visual === 'petals'
            ? this.grid.cell * 0.18
            : visual === 'fireflies'
              ? this.grid.cell * 0.12
              : this.grid.cell * 0.1;
        this.graphics.fillCircle(x, y, Math.max(1, size));
      }
    }
  }

  private drawLightningFlash(view: ResolvedAtmosphereView | undefined, renderTimeMs: number): void {
    if (!view || !view.gameplay.lightningProfile.enabled) {
      return;
    }
    if ((view.state.weatherSeed + Math.floor(renderTimeMs / 90)) % 37 > 1) {
      return;
    }
    this.overlayGraphics
      .fillStyle(0xfff3a6, 0.12)
      .fillRect(0, 0, this.grid.cols * this.grid.cell, this.grid.rows * this.grid.cell);
  }

  private drawLightningStrikeMarker(
    strike: SnakeRenderOptions['lightningStrike'],
    renderTimeMs: number,
  ): void {
    if (!strike) {
      return;
    }
    const cell = this.grid.cell;
    const cx = strike.x * cell + cell / 2;
    const cy = strike.y * cell + cell / 2;
    const radius = Math.max(cell * 0.55, (strike.radius + 0.65) * cell);
    if (strike.phase === 'strike') {
      this.overlayGraphics.fillStyle(0xfff4a8, 0.22).fillCircle(cx, cy, radius * 1.3);
      this.overlayGraphics.lineStyle(3, 0xffffff, 0.8).strokeCircle(cx, cy, radius);
      this.overlayGraphics.lineStyle(2, 0xfff4a8, 0.95);
      this.overlayGraphics.beginPath();
      this.overlayGraphics.moveTo(cx, 0);
      this.overlayGraphics.lineTo(cx - cell * 0.35, cy - cell * 0.45);
      this.overlayGraphics.lineTo(cx + cell * 0.22, cy - cell * 0.05);
      this.overlayGraphics.lineTo(cx - cell * 0.14, cy + cell * 0.42);
      this.overlayGraphics.stroke();
      return;
    }
    const pulse = 0.55 + Math.sin(renderTimeMs / 90) * 0.25;
    const alpha = 0.34 + pulse * 0.18;
    this.overlayGraphics.lineStyle(2, 0xfff4a8, alpha).strokeCircle(cx, cy, radius);
    this.overlayGraphics.lineStyle(1, 0xffffff, alpha * 0.75);
    this.overlayGraphics.strokeRect(
      strike.x * cell + 2,
      strike.y * cell + 2,
      Math.max(1, cell - 4),
      Math.max(1, cell - 4),
    );
    this.overlayGraphics.fillStyle(0xfff4a8, 0.08 + pulse * 0.08).fillCircle(cx, cy, radius * 0.72);
  }

  private drawSkyEventFlash(view: ResolvedAtmosphereView | undefined, renderTimeMs: number): void {
    const event = view?.state.skyEvent;
    if (!event || event.current === 'none') {
      return;
    }
    const width = this.grid.cols * this.grid.cell;
    const height = this.grid.rows * this.grid.cell;
    if (event.current === 'meteorShower') {
      this.overlayGraphics.lineStyle(2, 0xfff3a8, 0.55);
      for (let i = 0; i < 5; i++) {
        const x = positiveMod(event.seed + i * 131 + Math.floor(renderTimeMs * 0.08), width);
        const y = positiveMod(event.seed + i * 79 + Math.floor(renderTimeMs * 0.035), height / 2);
        this.overlayGraphics.lineBetween(x, y, x - this.grid.cell * 1.4, y + this.grid.cell * 0.65);
      }
      return;
    }
    if (event.current === 'aurora') {
      this.overlayGraphics.lineStyle(3, 0x8ffff2, 0.16 + event.intensity * 0.1);
      for (let i = 0; i < 4; i++) {
        const y = height * 0.18 + i * this.grid.cell * 0.55;
        this.overlayGraphics.beginPath();
        this.overlayGraphics.moveTo(0, y);
        for (let x = 0; x <= width; x += this.grid.cell) {
          this.overlayGraphics.lineTo(
            x,
            y + Math.sin(renderTimeMs / 900 + i + x * 0.018) * this.grid.cell * 0.35,
          );
        }
        this.overlayGraphics.stroke();
      }
      return;
    }
    if (event.current === 'bloodMoon') {
      this.overlayGraphics
        .fillStyle(0x8f1024, 0.06 + event.intensity * 0.04)
        .fillRect(0, 0, width, height);
    }
  }

  markAllStaticRoomsDirty(): void {
    this.staticRoomSignatures.clear();
    this.dirtyStaticRooms.clear();
  }

  getRenderDiagnostics(): RenderDiagnostics {
    return { ...this.renderDiagnostics };
  }

  private beginRenderDiagnostics(
    room: RoomSnapshot,
    snakeBody: readonly Vector2Like[],
    appleInfo: AppleSnapshot | null,
    options: SnakeRenderOptions,
  ): void {
    const signature = `${room.biomeId}|${room.layout.join('/')}`;
    const previous = this.staticRoomSignatures.get(room.id);
    const wasDirty = this.dirtyStaticRooms.delete(room.id);
    const staticCacheStatus =
      wasDirty || previous !== signature ? 'rebuilt' : previous ? 'cached' : 'rebuilt';
    this.staticRoomSignatures.set(room.id, signature);
    this.renderDiagnostics = {
      staticCacheStatus,
      staticTileCount: 0,
      dynamicObjectCount:
        snakeBody.length +
        (appleInfo ? 1 : 0) +
        (room.treasure ? 1 : 0) +
        (room.powerup ? 1 : 0) +
        (options.enemies?.length ?? 0) +
        (options.followers?.length ?? 0) +
        (options.bullets?.length ?? 0) +
        (options.footballs?.length ?? 0) +
        (options.animals?.length ?? 0),
      treeTileCount: 0,
      detailedTreeTileCount: 0,
      cheapForestTileCount: 0,
    };
  }

  private drawRoomFloors(room: RoomSnapshot): void {
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
        this.renderDiagnostics.staticTileCount += 1;
        if (tile === 'H') {
          const portal = room.portals.find((entry) => entry.x === x && entry.y === y);
          const [, , currentZ = '0'] = room.id.split(',');
          const [, , destZ = currentZ] = portal?.destRoomId.split(',') ?? [];
          this.drawLadderTile(
            rectX,
            rectY,
            Number(destZ) >= Number(currentZ) ? 'up' : 'down',
            ladderOutlineColor,
          );
        } else if (tile === 'V') {
          this.drawCaveEntranceTile(rectX, rectY, false);
        } else if (tile === 'X') {
          this.drawCaveExitTile(rectX, rectY);
        } else if (tile === 'Q') {
          this.drawCaveEntranceTile(rectX, rectY, true);
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
              .fillRect(
                rectX,
                rectY + this.grid.cell * 0.52,
                this.grid.cell,
                this.grid.cell * 0.48,
              );
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
        } else if (
          room.biomeId === 'mosaic-coast' &&
          ['.', 'M', 'a', 't', 'f', 'F', 'b', 'i', 'p', 'r', 'G'].includes(tile)
        ) {
          this.drawMosaicCoastTile(rectX, rectY, tile, x, y);
        } else if (
          room.biomeId === 'liberty-badlands' &&
          ['A', 'E', 'F', 'G', 'L', 'M', 'N', 'O', 'P', 'W'].includes(tile)
        ) {
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
        } else if (tile === 'Z') {
          this.drawArcadeCabinetTile(rectX, rectY);
        } else if (
          tile === 'D' ||
          tile === 'N' ||
          tile === 'U' ||
          tile === 'Y' ||
          tile === 'd' ||
          tile === 't' ||
          tile === 'h' ||
          tile === 'j' ||
          tile === 'u' ||
          tile === 'x' ||
          tile === 'o' ||
          tile === 'M' ||
          tile === 'R' ||
          tile === 'F' ||
          tile === 'P'
        ) {
          this.drawTownSymbolTile(rectX, rectY, tile);
        } else if (tile === 'S') {
          if (room.biomeId === 'jade-peak-province') {
            const color = 0xd4c5a9;
            const outline = darkenColor(color, 0.35);
            this.graphics
              .fillStyle(color, 1)
              .fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, outline, 0.5)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
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
            this.graphics
              .fillStyle(color, 1)
              .fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, outline, 0.5)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          } else {
            const color = 0x6d5845;
            const outline = darkenColor(color, 0.35);
            this.graphics
              .fillStyle(color, 1)
              .fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, outline, 0.35)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          }
        } else if (tile === 'B') {
          if (room.biomeId === 'jade-peak-province') {
            const color = 0x3a7d44;
            const outline = darkenColor(color, 0.35);
            this.graphics
              .fillStyle(color, 1)
              .fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, outline, 0.7)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          } else {
            const color = 0x6d5845;
            const outline = darkenColor(color, 0.35);
            this.graphics
              .fillStyle(color, 1)
              .fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, outline, 0.35)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          }
        } else if (tile === 'C') {
          // Cherry blossom tree
          this.drawCherryTreeTile(rectX, rectY, x, y);
        } else if (tile === 'P') {
          if (room.biomeId === 'jade-peak-province') {
            const color = 0xf8d5e0;
            const outline = darkenColor(color, 0.35);
            this.graphics
              .fillStyle(color, 0.7)
              .fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, outline, 0.4)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          } else {
            const color = 0x6d5845;
            const outline = darkenColor(color, 0.35);
            this.graphics
              .fillStyle(color, 1)
              .fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
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
            this.graphics
              .fillStyle(color, 1)
              .fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, outline, 0.5)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          } else if (room.town || room.layer?.kind === 'townInterior') {
            const color = room.layer?.kind === 'townInterior' ? 0x6d5845 : 0xb7ab96;
            const outline = darkenColor(color, 0.35);
            this.graphics
              .fillStyle(color, 1)
              .fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, outline, 0.3)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
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
            this.graphics
              .fillStyle(color, 1)
              .fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, outline, 0.5)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          } else {
            this.graphics
              .fillStyle(0xffffff, 1)
              .fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, 0xcccccc, 0.6)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          }
        } else if (tile === 'F') {
          if (room.biomeId === 'jade-peak-province') {
            const color = 0x6b4c3b;
            const outline = darkenColor(color, 0.35);
            this.graphics
              .fillStyle(color, 1)
              .fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
            this.graphics
              .lineStyle(1, outline, 0.5)
              .strokeRect(rectX + 0.5, rectY + 0.5, this.grid.cell - 1, this.grid.cell - 1);
          }
        } else {
          this.graphics.fillStyle(room.backgroundColor, 1);
          this.graphics.fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
          this.drawBiomeAccent(biome.id, biome.accentColor, x, y, rectX, rectY);
        }
      }
    }
    this.drawCaveLakeRewards(room);
  }

  private drawRoomWalls(room: RoomSnapshot): void {
    getBiomeDefinition(room.biomeId);
    for (let y = 0; y < room.layout.length; y++) {
      for (let x = 0; x < room.layout[y].length; x++) {
        const tile = room.layout[y][x];
        if (tile !== '#') {
          continue;
        }
        const rectX = x * this.grid.cell;
        const rectY = y * this.grid.cell;
        this.renderDiagnostics.staticTileCount += 1;
        if (room.biomeId === 'elderwood-maze') {
          const cell = this.grid.cell;
          const treeTileX = x;
          const treeTileY = y;
          this.renderDiagnostics.treeTileCount += 1;
          if (!((treeTileX * 11 + treeTileY * 7) % 5 === 0)) {
            const base = (treeTileX + treeTileY) % 2 === 0 ? 0x174f2a : 0x1d5f31;
            const shadow = 0x0b2414;
            const leaf = (treeTileX * 5 + treeTileY * 3) % 4 === 0 ? 0x2f8d45 : 0x26763a;
            this.wallGraphics.fillStyle(base, 1).fillRect(rectX, rectY, cell, cell);
            this.wallGraphics
              .fillStyle(shadow, 0.35)
              .fillRect(rectX, rectY + cell * 0.62, cell, cell * 0.38);
            this.wallGraphics
              .fillStyle(leaf, 0.72)
              .fillRect(rectX + cell * 0.18, rectY + cell * 0.16, cell * 0.64, cell * 0.48);
            this.wallGraphics
              .lineStyle(1, shadow, 0.55)
              .strokeRect(rectX + 0.5, rectY + 0.5, cell - 1, cell - 1);
          } else {
            this.renderDiagnostics.detailedTreeTileCount += 1;
            const base = (treeTileX + treeTileY) % 2 === 0 ? 0x174f2a : 0x1d5f31;
            const shadow = 0x0b2414;
            const leaf = (treeTileX * 5 + treeTileY * 3) % 4 === 0 ? 0x2f8d45 : 0x26763a;
            const trunk = 0x5c3a23;
            this.wallGraphics.fillStyle(base, 1).fillRect(rectX, rectY, cell, cell);
            this.wallGraphics
              .fillStyle(shadow, 0.45)
              .fillRect(rectX, rectY + cell * 0.62, cell, cell * 0.38);
            this.wallGraphics
              .fillStyle(trunk, 0.95)
              .fillRect(rectX + cell * 0.43, rectY + cell * 0.48, cell * 0.14, cell * 0.34);
            this.wallGraphics
              .fillStyle(leaf, 0.95)
              .fillCircle(rectX + cell * 0.5, rectY + cell * 0.38, cell * 0.32);
            this.wallGraphics
              .fillStyle(0x9ddd76, 0.16)
              .fillCircle(rectX + cell * 0.4, rectY + cell * 0.28, cell * 0.12);
            this.wallGraphics
              .lineStyle(1, shadow, 0.8)
              .strokeRect(rectX + 0.5, rectY + 0.5, cell - 1, cell - 1);
          }
        } else if (room.biomeId === 'liberty-badlands') {
          const cell = this.grid.cell;
          const base = (x + y) % 3 === 0 ? 0x244f87 : 0x173b6d;
          const deep = 0x0d2347;
          const highlight = 0xf3eee2;
          const rust = 0xb5362f;
          this.wallGraphics.fillStyle(base, 1).fillRect(rectX, rectY, cell, cell);
          this.wallGraphics
            .fillStyle(deep, 0.42)
            .fillRect(rectX, rectY + cell * 0.62, cell, cell * 0.38);
          if ((x * 2 + y) % 5 === 0) {
            this.wallGraphics
              .fillStyle(highlight, 0.42)
              .fillRect(rectX + 3, rectY + 4, cell - 6, 2);
          }
          if ((x + y * 3) % 4 === 0) {
            this.wallGraphics
              .fillStyle(rust, 0.38)
              .fillRect(rectX + cell - 5, rectY + 3, 2, cell - 6);
          }
          if ((x * 7 + y) % 9 === 0) {
            this.wallGraphics
              .fillStyle(highlight, 0.35)
              .fillCircle(rectX + cell * 0.28, rectY + cell * 0.35, 1.6);
            this.wallGraphics
              .fillStyle(highlight, 0.35)
              .fillCircle(rectX + cell * 0.72, rectY + cell * 0.35, 1.6);
          }
          this.wallGraphics
            .lineStyle(1, 0x07152c, 0.75)
            .strokeRect(rectX + 0.5, rectY + 0.5, cell - 1, cell - 1);
        } else if (room.biomeId === 'mosaic-coast') {
          const cell = this.grid.cell;
          const stucco =
            (x + y) % 4 === 0
              ? MOSAIC_COAST_WALL_COLORS.stucco
              : MOSAIC_COAST_WALL_COLORS.stuccoAlt;
          this.wallGraphics.fillStyle(stucco, 1).fillRect(rectX, rectY, cell, cell);
          this.wallGraphics
            .fillStyle(MOSAIC_COAST_WALL_COLORS.castShadow, 0.55)
            .fillRect(rectX + cell * 0.12, rectY + cell * 0.72, cell * 0.88, cell * 0.28);
          this.wallGraphics
            .fillStyle(MOSAIC_COAST_WALL_COLORS.castShadow, 0.32)
            .fillRect(rectX + cell * 0.74, rectY + cell * 0.12, cell * 0.26, cell * 0.88);
          if ((x * 3 + y * 5) % 7 === 0) {
            this.wallGraphics
              .fillStyle(MOSAIC_COAST_WALL_COLORS.terracottaCap, 0.92)
              .fillRect(rectX, rectY, cell, Math.max(3, cell * 0.15));
          }
          if ((x * 11 + y * 5) % 9 === 0) {
            this.wallGraphics
              .fillStyle(MOSAIC_COAST_WALL_COLORS.crack, 0.65)
              .fillRect(
                rectX + cell * 0.42,
                rectY + cell * 0.28,
                Math.max(1, cell * 0.08),
                cell * 0.4,
              );
          }
          if ((x * 7 + y * 13) % 11 === 0) {
            this.wallGraphics
              .fillStyle(0x17212b, 0.72)
              .fillRect(rectX + cell * 0.28, rectY + cell * 0.34, cell * 0.44, cell * 0.16);
          }
          this.wallGraphics
            .lineStyle(2, MOSAIC_COAST_WALL_COLORS.outline, 0.92)
            .strokeRect(rectX + 0.5, rectY + 0.5, cell - 1, cell - 1);
        } else {
          this.wallGraphics.fillStyle(room.wallColor, 1);
          this.wallGraphics.fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
          this.wallGraphics.lineStyle(2, room.wallOutlineColor, 0.85);
          this.wallGraphics.strokeRect(rectX, rectY, this.grid.cell, this.grid.cell);
        }
      }
    }
  }

  /**
   * Draws masonry building blocks ('%') — temporary walls that crumble over time.
   * @param room The room containing the masonry blocks.
   * @param getBlockAge A function that returns the age in milliseconds of a masonry block at the given position.
   */
  private drawMasonryBlocks(
    room: RoomSnapshot,
    getBlockAge: (roomId: string, localX: number, localY: number) => number | undefined,
  ): void {
    getBiomeDefinition(room.biomeId);
    (this.wallGraphics.scene as Phaser.Scene).time?.now ?? performance.now();
    const blockLifetimeMs = 4000; // 4 seconds before crumbling

    for (let y = 0; y < room.layout.length; y++) {
      for (let x = 0; x < room.layout[y].length; x++) {
        const tile = room.layout[y][x];
        if (tile !== '%') {
          continue;
        }
        const rectX = x * this.grid.cell;
        const rectY = y * this.grid.cell;
        const blockAge = getBlockAge(room.id, x, y);
        const ageMs = blockAge ?? 0;
        const lifeRatio = Math.max(0, 1 - ageMs / blockLifetimeMs);

        // Fade out as the block crumbles
        const alpha = Math.max(0.15, lifeRatio);

        // Brick-style rendering with crumbling effect
        const cell = this.grid.cell;
        const brickColor = 0xb8865e;
        const mortarColor = 0x8a6b4c;
        const crackColor = 0x5a4a3a;

        // Base brick fill
        this.wallGraphics.fillStyle(brickColor, alpha).fillRect(rectX, rectY, cell, cell);

        // Mortar lines (brick pattern)
        this.wallGraphics
          .lineStyle(1, mortarColor, alpha * 0.8)
          .strokeRect(rectX + 1, rectY + 1, cell - 2, cell - 2);

        // Horizontal mortar line (brick row divider)
        this.wallGraphics
          .lineStyle(1, mortarColor, alpha * 0.6)
          .fillRect(rectX + 1, rectY + cell / 2 - 0.5, cell - 2, 1);

        // Vertical mortar line (offset for brick pattern)
        const vertOffset = y % 2 === 0 ? cell / 2 : 0;
        this.wallGraphics
          .lineStyle(1, mortarColor, alpha * 0.6)
          .fillRect(rectX + vertOffset - 0.5, rectY + 1, 1, cell - 2);

        // Cracking effect as block ages
        if (lifeRatio < 0.7) {
          const crackIntensity = (0.7 - lifeRatio) / 0.7;
          this.wallGraphics
            .lineStyle(1, crackColor, alpha * crackIntensity * 0.8)
            .lineBetween(
              rectX + cell * 0.2,
              rectY + cell * 0.1,
              rectX + cell * 0.5,
              rectY + cell * 0.5,
            );
          this.wallGraphics
            .lineStyle(1, crackColor, alpha * crackIntensity * 0.6)
            .lineBetween(
              rectX + cell * 0.5,
              rectY + cell * 0.5,
              rectX + cell * 0.8,
              rectY + cell * 0.9,
            );
        }

        // Shrink effect in final moments
        if (lifeRatio < 0.3) {
          const shrinkAmount = ((0.3 - lifeRatio) / 0.3) * cell * 0.15;
          this.wallGraphics
            .lineStyle(1, crackColor, alpha * 0.5)
            .strokeRect(
              rectX + shrinkAmount,
              rectY + shrinkAmount,
              cell - shrinkAmount * 2,
              cell - shrinkAmount * 2,
            );
        }
      }
    }
  }

  /**
   * Gets the age in milliseconds of a masonry block at the given position.
   * Returns undefined if the block doesn't exist or has expired.
   */
  private getMasonryBlockAge(roomId: string, localX: number, localY: number): number | undefined {
    const key = `${roomId}:${localX},${localY}`;
    const created = this.masonryBlockAges.get(key);
    if (created === undefined) {
      return undefined;
    }
    const now = (this.wallGraphics.scene as Phaser.Scene).time?.now ?? performance.now();
    const age = now - created;
    const lifetimeMs = 4000;
    if (age >= lifetimeMs) {
      // Block has expired
      this.masonryBlockAges.delete(key);
      return undefined;
    }
    return age;
  }

  /**
   * Registers a new masonry block at the given position with the current timestamp.
   */
  registerMasonryBlock(roomId: string, localX: number, localY: number): void {
    const key = `${roomId}:${localX},${localY}`;
    const now = (this.wallGraphics.scene as Phaser.Scene).time?.now ?? performance.now();
    this.masonryBlockAges.set(key, now);
  }

  /**
   * Removes a masonry block from tracking (e.g., when it's removed from the room layout).
   */
  unregisterMasonryBlock(roomId: string, localX: number, localY: number): void {
    const key = `${roomId}:${localX},${localY}`;
    this.masonryBlockAges.delete(key);
  }

  private drawCaveEntranceTile(rectX: number, rectY: number, collapsed: boolean): void {
    const cell = this.grid.cell;
    this.graphics.fillStyle(collapsed ? 0x5b5147 : 0x1a101f, 1).fillRect(rectX, rectY, cell, cell);
    this.graphics.lineStyle(2, collapsed ? 0x9b8b73 : 0xb69cff, 0.75);
    this.graphics.strokeRect(rectX + 2, rectY + 2, cell - 4, cell - 4);
    if (!collapsed) {
      this.graphics
        .fillStyle(0x050308, 0.95)
        .fillEllipse(rectX + cell / 2, rectY + cell * 0.58, cell * 0.68, cell * 0.72);
      this.graphics
        .fillStyle(0xd8ccff, 0.35)
        .fillEllipse(rectX + cell / 2, rectY + cell * 0.34, cell * 0.48, cell * 0.18);
    } else {
      this.graphics
        .fillStyle(0x2e2924, 1)
        .fillCircle(rectX + cell * 0.35, rectY + cell * 0.58, cell * 0.18);
      this.graphics.fillCircle(rectX + cell * 0.62, rectY + cell * 0.5, cell * 0.14);
    }
  }

  private drawCaveExitTile(rectX: number, rectY: number): void {
    const cell = this.grid.cell;
    this.graphics.fillStyle(0x2b2435, 1).fillRect(rectX, rectY, cell, cell);
    this.graphics
      .fillStyle(0xfff1aa, 0.55)
      .fillRect(rectX + cell * 0.35, rectY + 3, cell * 0.3, cell - 6);
    this.graphics.lineStyle(2, 0xfff1aa, 0.8).strokeRect(rectX + 4, rectY + 4, cell - 8, cell - 8);
  }

  private drawCaveLakeRewards(room: RoomSnapshot): void {
    const rewards = room.cave?.lakeRewards ?? [];
    const cell = this.grid.cell;
    for (const reward of rewards) {
      const cx = reward.x * cell + cell / 2;
      const cy = reward.y * cell + cell / 2;
      this.graphics.fillStyle(0xfff1aa, 0.92).fillCircle(cx, cy, cell * 0.25);
      this.graphics.lineStyle(2, 0x5a3b10, 0.8).strokeCircle(cx, cy, cell * 0.25);
      this.graphics
        .fillStyle(0xffffff, 0.7)
        .fillCircle(cx - cell * 0.08, cy - cell * 0.08, cell * 0.07);
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

  private drawCherryTreeTile(rectX: number, rectY: number, tileX: number, tileY: number): void {
    const cell = this.grid.cell;
    const cx = rectX + cell / 2;
    const _cy = rectY + cell / 2;

    // Ground shadow
    this.graphics
      .fillStyle(0x3a1f1f, 0.3)
      .fillEllipse(cx, rectY + cell * 0.82, cell * 0.55, cell * 0.14);

    // Trunk
    const trunk = 0x6b423a;
    this.graphics
      .fillStyle(trunk, 1)
      .fillRect(rectX + cell * 0.42, rectY + cell * 0.48, cell * 0.16, cell * 0.42);
    // Trunk highlight
    this.graphics
      .fillStyle(0x8b5e4a, 0.6)
      .fillRect(rectX + cell * 0.42, rectY + cell * 0.48, cell * 0.06, cell * 0.42);

    // Canopy - main pink circle
    const canopyHue = (tileX * 3 + tileY * 7) % 3;
    let canopyColor: number;
    let highlightColor: number;
    let shadowColor: number;
    switch (canopyHue) {
      case 0:
        // Soft pink
        canopyColor = 0xffb3c6;
        highlightColor = 0xffd1dc;
        shadowColor = 0xe894a8;
        break;
      case 1:
        // Deep rose
        canopyColor = 0xff8fa8;
        highlightColor = 0xffb3c6;
        shadowColor = 0xd46b82;
        break;
      case 2:
        // Warm blush
        canopyColor = 0xffc8d4;
        highlightColor = 0xffe0e8;
        shadowColor = 0xe8a0b4;
        break;
      default:
        // Fallback (should never happen since (tileX*3+tileY*7)%3 is 0-2)
        canopyColor = 0xffb3c6;
        highlightColor = 0xffd1dc;
        shadowColor = 0xe894a8;
        break;
    }

    // Main canopy
    this.graphics.fillStyle(canopyColor, 0.92).fillCircle(cx, rectY + cell * 0.32, cell * 0.38);
    // Canopy shadow
    this.graphics.fillStyle(shadowColor, 0.55).fillCircle(cx, rectY + cell * 0.42, cell * 0.3);
    // Canopy highlight
    this.graphics
      .fillStyle(highlightColor, 0.5)
      .fillCircle(cx - cell * 0.08, rectY + cell * 0.22, cell * 0.16);
    // Extra canopy blob for organic shape
    this.graphics
      .fillStyle(canopyColor, 0.75)
      .fillCircle(cx + cell * 0.2, rectY + cell * 0.36, cell * 0.18);
    this.graphics
      .fillStyle(canopyColor, 0.7)
      .fillCircle(cx - cell * 0.18, rectY + cell * 0.34, cell * 0.16);

    // White blossom accents
    this.graphics
      .fillStyle(0xffffff, 0.35)
      .fillCircle(cx + cell * 0.1, rectY + cell * 0.24, cell * 0.05);
    this.graphics
      .fillStyle(0xffffff, 0.28)
      .fillCircle(cx - cell * 0.12, rectY + cell * 0.38, cell * 0.04);
    this.graphics
      .fillStyle(0xffffff, 0.22)
      .fillCircle(cx + cell * 0.05, rectY + cell * 0.42, cell * 0.035);
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
    const base =
      tile === 'x'
        ? 0x6f4426
        : tile === 'o'
          ? 0x8a603b
          : tile === 'd'
            ? 0x5f3b24
            : tile === 't'
              ? 0x7b3f22
              : tile === 'h' || tile === 'j'
                ? 0x3f2e24
                : tile === 'u'
                  ? 0x252b32
                  : tile === 'U'
                    ? 0x333844
                    : tile === 'Y'
                      ? 0x1f2128
                      : tile === 'D' || tile === 'N'
                        ? 0x8b5f32
                        : tile === 'M'
                          ? 0xc7433d
                          : 0x6d5845;
    const accent =
      tile === 'x'
        ? 0xd6a35f
        : tile === 'o'
          ? 0xe0b06f
          : tile === 'd'
            ? 0xd6a35f
            : tile === 't'
              ? 0xffc36b
              : tile === 'h'
                ? 0x9a7458
                : tile === 'j'
                  ? 0xd2b088
                  : tile === 'u'
                    ? 0x778493
                    : tile === 'U'
                      ? 0x9aa4b2
                      : tile === 'Y'
                        ? 0x79f2b4
                        : tile === 'D' || tile === 'N'
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
    this.graphics
      .lineStyle(1, outline, 0.75)
      .strokeRect(rectX + 0.5, rectY + 0.5, cell - 1, cell - 1);

    if (tile === 'd' || tile === 't' || tile === 'h' || tile === 'j') {
      this.graphics
        .fillStyle(accent, 1)
        .fillRect(rectX + cell * 0.24, rectY + cell * 0.12, cell * 0.52, cell * 0.76);
      this.graphics
        .lineStyle(1, outline, 0.9)
        .strokeRect(rectX + cell * 0.24, rectY + cell * 0.12, cell * 0.52, cell * 0.76);
      if (tile === 'h') {
        this.graphics
          .fillStyle(outline, 1)
          .fillRect(rectX + cell * 0.45, rectY + cell * 0.44, cell * 0.16, cell * 0.12);
      } else {
        this.graphics.fillStyle(outline, 1).fillCircle(rectX + cell * 0.62, rectY + cell * 0.5, 2);
      }
      if (tile === 't') {
        this.graphics
          .fillStyle(0xffe0a3, 1)
          .fillRect(rectX + cell * 0.28, rectY + 2, cell * 0.44, 3);
      }
    } else if (tile === 'x' || tile === 'o') {
      const plankAlpha = tile === 'x' ? 0.96 : 0.62;
      const shadow = 0x3d2412;
      const plankInset = tile === 'x' ? cell * 0.12 : cell * 0.2;
      const plankWidth = Math.max(2, cell * 0.18);
      for (let i = 0; i < 3; i += 1) {
        const x = rectX + plankInset + i * cell * 0.24;
        this.graphics
          .fillStyle(i % 2 === 0 ? accent : 0xb77a43, plankAlpha)
          .fillRect(x, rectY + cell * 0.12, plankWidth, cell * 0.76);
        this.graphics
          .lineStyle(1, shadow, tile === 'x' ? 0.55 : 0.35)
          .strokeRect(x + 0.5, rectY + cell * 0.12 + 0.5, plankWidth - 1, cell * 0.76 - 1);
      }
      this.graphics
        .lineStyle(Math.max(2, cell * 0.08), shadow, tile === 'x' ? 0.85 : 0.42)
        .lineBetween(
          rectX + cell * 0.14,
          rectY + cell * 0.32,
          rectX + cell * 0.86,
          rectY + cell * 0.32,
        );
      this.graphics
        .lineStyle(Math.max(2, cell * 0.08), shadow, tile === 'x' ? 0.85 : 0.42)
        .lineBetween(
          rectX + cell * 0.14,
          rectY + cell * 0.68,
          rectX + cell * 0.86,
          rectY + cell * 0.68,
        );
      if (tile === 'o') {
        this.graphics
          .fillStyle(0x1f140c, 0.3)
          .fillRect(rectX + cell * 0.4, rectY + cell * 0.08, cell * 0.2, cell * 0.84);
      }
    } else if (tile === 'D' || tile === 'N') {
      this.graphics
        .fillStyle(accent, 1)
        .fillRect(rectX + cell * 0.22, rectY + cell * 0.18, cell * 0.56, cell * 0.58);
      this.graphics.lineStyle(1, outline, 0.8);
      this.graphics.beginPath();
      this.graphics.moveTo(rectX + cell * 0.3, rectY + cell * 0.36);
      this.graphics.lineTo(rectX + cell * 0.7, rectY + cell * 0.36);
      this.graphics.moveTo(rectX + cell * 0.3, rectY + cell * 0.52);
      this.graphics.lineTo(rectX + cell * 0.62, rectY + cell * 0.52);
      this.graphics.strokePath();
    } else if (tile === 'U' || tile === 'u') {
      for (let i = 0; i < 4; i += 1) {
        const x = rectX + cell * (0.24 + i * 0.14);
        this.graphics
          .fillStyle(accent, tile === 'u' ? 0.55 : 0.85)
          .fillRect(x, rectY + cell * 0.18, Math.max(2, cell * 0.06), cell * 0.64);
      }
    } else if (tile === 'Y') {
      this.graphics.fillStyle(0x05070a, 1).fillRect(rectX + 3, rectY + 3, cell - 6, cell - 6);
      this.graphics
        .lineStyle(2, accent, 0.86)
        .strokeRect(rectX + cell * 0.2, rectY + cell * 0.2, cell * 0.6, cell * 0.6);
      this.graphics
        .fillStyle(accent, 0.42)
        .fillCircle(rectX + cell * 0.5, rectY + cell * 0.5, cell * 0.18);
    } else if (tile === 'M') {
      this.graphics.fillStyle(accent, 1).fillRect(rectX + 2, rectY + 3, cell - 4, cell * 0.28);
      this.graphics
        .fillStyle(0x7a5232, 1)
        .fillRect(rectX + cell * 0.2, rectY + cell * 0.58, cell * 0.6, cell * 0.18);
    } else if (tile === 'R') {
      this.graphics
        .fillStyle(accent, 1)
        .fillCircle(rectX + cell * 0.5, rectY + cell * 0.48, cell * 0.22);
      this.graphics
        .fillStyle(outline, 0.85)
        .fillRect(rectX + cell * 0.46, rectY + cell * 0.62, cell * 0.08, cell * 0.18);
    } else if (tile === 'P') {
      this.graphics
        .fillStyle(accent, 1)
        .fillRect(rectX + cell * 0.25, rectY + cell * 0.22, cell * 0.5, cell * 0.42);
      this.graphics
        .fillStyle(outline, 1)
        .fillRect(rectX + cell * 0.32, rectY + cell * 0.64, cell * 0.36, cell * 0.12);
    } else {
      this.graphics
        .fillStyle(accent, 1)
        .fillRect(rectX + cell * 0.2, rectY + cell * 0.42, cell * 0.6, cell * 0.14);
      this.graphics
        .fillStyle(accent, 1)
        .fillRect(rectX + cell * 0.28, rectY + cell * 0.2, cell * 0.12, cell * 0.6);
      this.graphics
        .fillStyle(accent, 1)
        .fillRect(rectX + cell * 0.6, rectY + cell * 0.2, cell * 0.12, cell * 0.6);
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
    this.renderDiagnostics.treeTileCount += 1;
    if (!this.shouldDrawDetailedTree(tileX, tileY)) {
      this.drawCheapTreeTile(rectX, rectY, tileX, tileY);
      return;
    }
    this.renderDiagnostics.detailedTreeTileCount += 1;
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

  private shouldDrawDetailedTree(tileX: number, tileY: number): boolean {
    return (tileX * 11 + tileY * 7) % 5 === 0;
  }

  private drawCheapTreeTile(rectX: number, rectY: number, tileX: number, tileY: number): void {
    this.renderDiagnostics.cheapForestTileCount += 1;
    const base = (tileX + tileY) % 2 === 0 ? 0x174f2a : 0x1d5f31;
    const shadow = 0x0b2414;
    const leaf = (tileX * 5 + tileY * 3) % 4 === 0 ? 0x2f8d45 : 0x26763a;
    this.graphics.fillStyle(base, 1).fillRect(rectX, rectY, this.grid.cell, this.grid.cell);
    this.graphics
      .fillStyle(shadow, 0.35)
      .fillRect(rectX, rectY + this.grid.cell * 0.62, this.grid.cell, this.grid.cell * 0.38);
    this.graphics
      .fillStyle(leaf, 0.72)
      .fillRect(
        rectX + this.grid.cell * 0.18,
        rectY + this.grid.cell * 0.16,
        this.grid.cell * 0.64,
        this.grid.cell * 0.48,
      );
    this.graphics
      .lineStyle(1, shadow, 0.55)
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

  private drawMosaicCoastTile(
    rectX: number,
    rectY: number,
    tile: string,
    tileX: number,
    tileY: number,
  ): void {
    const cell = this.grid.cell;
    const stone = (tileX * 17 + tileY * 7) % 11 === 0 ? 0xeadfc9 : 0xf2e8d6;
    this.graphics.fillStyle(stone, 1).fillRect(rectX, rectY, cell, cell);
    if ((tileX * 5 + tileY * 3) % 13 === 0 || tile === 'r') {
      this.graphics
        .lineStyle(1, 0xb5a58c, tile === 'r' ? 0.28 : 0.14)
        .lineBetween(
          rectX + cell * 0.22,
          rectY + cell * 0.64,
          rectX + cell * 0.78,
          rectY + cell * 0.58,
        );
    }
    if (tile === 'M') {
      const accent =
        (tileX + tileY) % 3 === 0 ? 0x2f8fbd : (tileX + tileY) % 3 === 1 ? 0xf0c15a : 0xf4fbff;
      this.graphics
        .fillStyle(accent, 0.5)
        .fillRect(rectX + cell * 0.24, rectY + cell * 0.24, cell * 0.52, cell * 0.52);
      this.graphics
        .lineStyle(1, 0x2b658a, 0.2)
        .strokeRect(rectX + cell * 0.24, rectY + cell * 0.24, cell * 0.52, cell * 0.52);
      return;
    }
    if (tile === 'a') {
      const stripe = tileX % 2 === 0 ? 0x206fa3 : 0xd96a44;
      this.graphics.fillStyle(stripe, 0.72).fillRect(rectX, rectY + cell * 0.1, cell, cell * 0.42);
      this.graphics
        .fillStyle(0x24445a, 0.13)
        .fillRect(rectX, rectY + cell * 0.54, cell, cell * 0.18);
      return;
    }
    if (tile === 'b' || tile === 'p') {
      this.graphics
        .fillStyle(tile === 'p' ? 0x8b5b3c : 0x486982, tile === 'p' ? 0.62 : 0.34)
        .fillRect(rectX + 2, rectY + cell * 0.22, cell - 4, cell * 0.56);
      this.graphics
        .lineStyle(1, tile === 'p' ? 0x4f301f : 0x24445a, 0.45)
        .strokeRect(rectX + 2.5, rectY + cell * 0.22, cell - 5, cell * 0.56);
      return;
    }
    if (tile === 't') {
      this.graphics
        .fillStyle(0x2d7042, 0.7)
        .fillCircle(rectX + cell / 2, rectY + cell / 2, cell * 0.44);
      this.graphics
        .fillStyle(0xf6a64a, 0.65)
        .fillCircle(rectX + cell * 0.58, rectY + cell * 0.42, Math.max(1.5, cell * 0.08));
      this.graphics
        .fillStyle(0x153622, 0.12)
        .fillRect(rectX, rectY + cell * 0.62, cell, cell * 0.24);
      return;
    }
    if (tile === 'f' || tile === 'F') {
      this.graphics
        .fillStyle(0x5bb8d4, 0.82)
        .fillCircle(rectX + cell / 2, rectY + cell / 2, cell * 0.38);
      this.graphics
        .fillStyle(0xd8f6ff, 0.75)
        .fillCircle(rectX + cell * 0.5, rectY + cell * 0.42, cell * 0.22);
      if (tile === 'F') {
        this.graphics
          .lineStyle(2, 0x315f7d, 0.85)
          .strokeCircle(rectX + cell / 2, rectY + cell / 2, cell * 0.34);
      }
      return;
    }
    if (tile === 'i') {
      this.graphics.fillStyle(0xe8dcc4, 1).fillRect(rectX, rectY, cell, cell);
      this.graphics.fillStyle(0x23384c, 0.16).fillRect(rectX, rectY, cell, cell);
      this.graphics
        .lineStyle(1, 0x9b8366, 0.35)
        .strokeRect(rectX + 0.5, rectY + 0.5, cell - 1, cell - 1);
      return;
    }
    if (tile === 'G') {
      this.graphics
        .fillStyle(0x8b5b3c, 0.75)
        .fillRect(rectX + cell * 0.25, rectY + cell * 0.18, cell * 0.5, cell * 0.64);
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
          this.graphics
            .fillStyle(0xffffff, 0.18)
            .fillRect(rectX + 3, rectY + cell * 0.48, cell - 6, 2);
        }
        break;
      }
      case 'E': {
        const color = 0xd9d2c4;
        const outline = darkenColor(color, 0.28);
        this.graphics.fillStyle(color, 0.92).fillRect(rectX, rectY, cell, cell);
        this.graphics
          .lineStyle(1, outline, 0.36)
          .strokeRect(rectX + 0.5, rectY + 0.5, cell - 1, cell - 1);
        break;
      }
      case 'F': {
        const color = 0x9b2f27;
        const outline = darkenColor(color, 0.35);
        this.graphics.fillStyle(color, 1).fillRect(rectX + 3, rectY + 5, cell - 6, cell - 8);
        this.graphics.fillStyle(0xe7ded0, 0.9).fillRect(rectX + 5, rectY + 7, cell - 10, 3);
        this.graphics
          .lineStyle(1, outline, 0.72)
          .strokeRect(rectX + 3.5, rectY + 5.5, cell - 7, cell - 9);
        break;
      }
      case 'G': {
        this.graphics
          .fillStyle(0xe6d8c7, 0.78)
          .fillCircle(rectX + cell / 2, rectY + cell * 0.46, cell * 0.28);
        this.graphics
          .fillStyle(0x315f7d, 0.95)
          .fillRect(rectX + cell * 0.25, rectY + cell * 0.18, cell * 0.5, cell * 0.24);
        this.graphics
          .fillStyle(0xb5362f, 0.95)
          .fillRect(rectX + cell * 0.3, rectY + cell * 0.55, cell * 0.4, cell * 0.28);
        this.graphics
          .lineStyle(1, 0xf3eee2, 0.8)
          .strokeRect(rectX + cell * 0.3, rectY + cell * 0.55, cell * 0.4, cell * 0.28);
        break;
      }
      case 'L': {
        this.graphics
          .fillStyle(0x6fa8dc, 0.38)
          .fillCircle(rectX + cell / 2, rectY + cell / 2, Math.max(3, cell * 0.22));
        this.graphics
          .fillStyle(0xf6f0df, 0.95)
          .fillCircle(rectX + cell / 2, rectY + cell / 2, Math.max(1.5, cell * 0.08));
        break;
      }
      case 'M': {
        const color = 0xe8e2d4;
        const outline = 0x82786b;
        this.graphics.fillStyle(color, 1).fillRect(rectX + 2, rectY + 2, cell - 4, cell - 4);
        this.graphics
          .lineStyle(1, outline, 0.75)
          .strokeRect(rectX + 2.5, rectY + 2.5, cell - 5, cell - 5);
        this.graphics
          .fillStyle(0x5f8fbf, 0.45)
          .fillRect(rectX + cell * 0.25, rectY + 4, cell * 0.5, 2);
        break;
      }
      case 'N': {
        const base = 0x315f7d;
        this.graphics.fillStyle(base, 1).fillRect(rectX + 2, rectY + 4, cell - 4, cell - 8);
        this.graphics.fillStyle(0xbfe9ff, 0.85).fillRect(rectX + 5, rectY + 7, cell - 10, 2);
        this.graphics
          .lineStyle(1, 0xbfe9ff, 0.55)
          .strokeRect(rectX + 2.5, rectY + 4.5, cell - 5, cell - 9);
        break;
      }
      case 'O': {
        const color = 0x2c6e91;
        this.graphics.fillStyle(color, 0.42).fillRect(rectX, rectY, cell, cell);
        this.graphics
          .lineStyle(1, 0x9ad4e8, 0.5)
          .strokeRect(rectX + 2, rectY + 2, cell - 4, cell - 4);
        break;
      }
      case 'P': {
        const color = tileX % 2 === 0 ? 0xe8e2d4 : 0xb5362f;
        this.graphics.fillStyle(color, 0.55).fillRect(rectX + 5, rectY + 5, cell - 10, cell - 10);
        break;
      }
      case 'W': {
        this.graphics
          .fillStyle(0xf3eee2, 0.9)
          .fillRect(rectX + cell * 0.38, rectY, Math.max(2, cell * 0.24), cell);
        if ((tileX + tileY) % 2 === 0) {
          this.graphics
            .fillStyle(0x5f8fbf, 0.22)
            .fillRect(rectX + cell * 0.42, rectY + 4, Math.max(1, cell * 0.16), 4);
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
      this.graphics
        .fillStyle(highlight, 0.35)
        .fillCircle(rectX + cell * 0.28, rectY + cell * 0.35, 1.6);
      this.graphics
        .fillStyle(highlight, 0.35)
        .fillCircle(rectX + cell * 0.72, rectY + cell * 0.35, 1.6);
    }
    this.graphics
      .lineStyle(1, 0x07152c, 0.75)
      .strokeRect(rectX + 0.5, rectY + 0.5, cell - 1, cell - 1);
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
    const [roomX, roomY] = this.parseRoomCoordinates(currentRoomId);
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

    const now = (this.wallGraphics.scene as Phaser.Scene).time?.now ?? performance.now();
    const pulse = 0.8 + 0.2 * Math.sin(now / 240);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const targetX = localHeadX + dx;
        const targetY = localHeadY + dy;
        if (targetX < 0 || targetX >= this.grid.cols || targetY < 0 || targetY >= this.grid.rows) {
          continue;
        }
        const tile = room.layout[targetY]?.[targetX];
        if (tile !== '#' && tile !== '%') {
          continue;
        }
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance > radius) {
          continue;
        }
        const alpha = Math.max(0.1, (0.28 - 0.05 * distance) * pulse);
        // Masonry blocks get a slightly warmer glow to distinguish them from walls
        const senseColor = tile === '%' ? 0xffb366 : 0x4da3ff;
        this.wallGraphics.fillStyle(senseColor, alpha);
        this.wallGraphics.fillRect(
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

  private drawVegetation(room: RoomSnapshot): void {
    const veg = room.vegetation;
    if (!veg || veg.length === 0) {
      this.vegetationSprites.forEach((sprite) => sprite.setVisible(false));
      return;
    }

    const biome = getBiomeDefinition(room.biomeId);
    const tintHex = biome.accentColor ?? 0x888888;

    for (let i = 0; i < veg.length; i++) {
      const instance = veg[i];
      const sprite = this.ensureVegetationSprite(i);
      sprite
        .setTexture(this.vegetationTextureKeys[instance.variant])
        .setTint(tintHex)
        .setAlpha(0.55)
        .setPosition(
          instance.x * this.grid.cell + this.grid.cell / 2,
          instance.y * this.grid.cell + this.grid.cell / 2,
        )
        .setDisplaySize(this.grid.cell, this.grid.cell)
        .setVisible(true);
    }

    for (let i = veg.length; i < this.vegetationSprites.length; i++) {
      this.vegetationSprites[i]!.setVisible(false);
    }
  }

  private drawApple(room: RoomSnapshot, appleInfo?: AppleSnapshot): void {
    const apples =
      room.apples && room.apples.length > 0 ? room.apples : room.apple ? [room.apple] : [];
    if (apples.length === 0) {
      this.appleSprites.forEach((sprite) => sprite.setVisible(false));
      return;
    }

    const appleColor = appleInfo?.color ?? paletteConfig.apple.colors.normal;
    const appleOutlineColor = darkenColor(appleColor, paletteConfig.apple.outlineDarkenFactor);
    const variant = this.resolveAppleVariant(appleInfo);

    this.appleSprites.forEach((sprite) => sprite.setVisible(false));
    apples.forEach((apple, index) => {
      const x = apple.x * this.grid.cell;
      const y = apple.y * this.grid.cell;
      this.ensureAppleSprite(index)
        .setTexture(this.appleTextureKeys[variant])
        .setPosition(x + this.grid.cell / 2, y + this.grid.cell / 2)
        .setDisplaySize(this.grid.cell, this.grid.cell)
        .setTint(appleColor)
        .setVisible(true);
    });

    const shieldDirs = this.extractShieldDirs(appleInfo);
    if (shieldDirs && apples.length === 1) {
      const apple = apples[0]!;
      const x = apple.x * this.grid.cell;
      const y = apple.y * this.grid.cell;
      this.graphics.lineStyle(APPLE_OUTLINE_WIDTH, appleOutlineColor, APPLE_OUTLINE_ALPHA);
      this.drawShieldIndicators(x, y, shieldDirs);
    }
  }

  private createAppleSprite(): Phaser.GameObjects.Image {
    return this.scene.add
      .image(0, 0, this.appleTextureKeys.normal)
      .setDepth(APPLE_LAYER_DEPTH)
      .setVisible(false)
      .setOrigin(0.5, 0.5);
  }

  private ensureAppleSprite(index: number): Phaser.GameObjects.Image {
    while (this.appleSprites.length <= index) {
      this.appleSprites.push(this.createAppleSprite());
    }
    return this.appleSprites[index]!;
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

  private drawMosaicCoastExposureOverlay(room: RoomSnapshot, renderTimeMs: number): void {
    if (room.biomeId !== 'mosaic-coast' || !room.mosaicCoast) {
      return;
    }
    const cell = this.grid.cell;
    const shimmer = 0.5 + Math.sin(renderTimeMs / 360) * 0.5;
    for (const exposure of room.mosaicCoast.exposure) {
      const x = exposure.x * cell;
      const y = exposure.y * cell;
      switch (exposure.kind) {
        case 'direct-sun':
          if ((exposure.x * 3 + exposure.y * 5) % 5 === 0) {
            this.graphics.fillStyle(0xffd47a, 0.035 + shimmer * 0.025).fillRect(x, y, cell, cell);
          }
          break;
        case 'shade':
          this.graphics.fillStyle(0x42647d, 0.18).fillRect(x, y, cell, cell);
          break;
        case 'cooling':
          this.graphics.fillStyle(0x76dfff, 0.22).fillRect(x, y, cell, cell);
          this.graphics
            .lineStyle(1, 0xc9f6ff, 0.35 + shimmer * 0.18)
            .strokeCircle(x + cell / 2, y + cell / 2, cell * (0.24 + shimmer * 0.08));
          break;
        case 'interior':
          this.graphics.fillStyle(0x203246, 0.2).fillRect(x, y, cell, cell);
          break;
      }
    }

    for (const tree of room.mosaicCoast.canopyTrees) {
      const cx = tree.trunk.x * cell + cell / 2;
      const cy = tree.trunk.y * cell + cell / 2;
      this.graphics.fillStyle(0x174326, 0.95).fillCircle(cx, cy, cell * 0.22);
      this.graphics.lineStyle(2, 0x0e2418, 0.8).strokeCircle(cx, cy, cell * 0.24);
      for (const canopy of tree.canopy) {
        const x = canopy.x * cell;
        const y = canopy.y * cell;
        this.graphics.fillStyle(0x2f7a48, 0.22).fillCircle(x + cell / 2, y + cell / 2, cell * 0.48);
      }
    }

    for (const fountain of room.mosaicCoast.fountains) {
      const cx = fountain.x * cell + cell / 2;
      const cy = fountain.y * cell + cell / 2;
      const radius = Math.max(cell * 0.5, fountain.radius * cell * 0.55);
      this.graphics.lineStyle(2, 0x2c6e91, 0.7).strokeCircle(cx, cy, radius);
      this.graphics
        .lineStyle(1, 0xc9f6ff, 0.42)
        .strokeCircle(cx, cy, radius * (0.6 + shimmer * 0.15));
    }
  }

  private drawPowerup(room: RoomSnapshot): void {
    const p = room.powerup;
    if (!p) {
      this.powerupSprite.setVisible(false);
      return;
    }
    const now = (this.graphics.scene as Phaser.Scene).time?.now ?? performance.now();
    const pulse = 0.92 + 0.08 * Math.sin(now / 140);
    const bob = Math.sin(now / 210) * this.grid.cell * 0.06;
    this.powerupSprite
      .setTexture(this.powerupTextureKeys[p.kind])
      .setPosition(
        p.x * this.grid.cell + this.grid.cell / 2,
        p.y * this.grid.cell + this.grid.cell / 2 + bob,
      )
      .setDisplaySize(this.grid.cell * 0.86 * pulse, this.grid.cell * 0.86 * pulse)
      .setAlpha(0.96)
      .setVisible(true);
  }

  private drawArcadeCabinetTile(rectX: number, rectY: number): void {
    const cell = this.grid.cell;
    this.graphics.fillStyle(0x17202b, 1).fillRect(rectX, rectY, cell, cell);
    this.graphics
      .fillStyle(0x24142f, 1)
      .fillRoundedRect(rectX + cell * 0.16, rectY + cell * 0.08, cell * 0.68, cell * 0.86, 3);
    this.graphics
      .lineStyle(2, 0x08050c, 0.95)
      .strokeRoundedRect(rectX + cell * 0.16, rectY + cell * 0.08, cell * 0.68, cell * 0.86, 3);
    this.graphics
      .fillStyle(0xb86cff, 0.95)
      .fillRect(rectX + cell * 0.27, rectY + cell * 0.19, cell * 0.46, cell * 0.28);
    this.graphics
      .fillStyle(0x8dff9d, 0.8)
      .fillRect(rectX + cell * 0.32, rectY + cell * 0.24, cell * 0.22, 2);
    this.graphics
      .fillStyle(0xffd166, 1)
      .fillCircle(rectX + cell * 0.38, rectY + cell * 0.63, Math.max(2, cell * 0.07));
    this.graphics
      .fillStyle(0xff5d7a, 1)
      .fillCircle(rectX + cell * 0.62, rectY + cell * 0.65, Math.max(2, cell * 0.06));
  }

  private ensurePowerupOrbTextures(): Record<PowerupKind, string> {
    return {
      phase: this.ensurePowerupOrbTexture('phase', 0x9b5de5, 0xf4ddff),
      smite: this.ensurePowerupOrbTexture('smite', 0xd7263d, 0xffd166),
      gun: this.ensurePowerupOrbTexture('gun', 0xf6bd60, 0xfff3a8),
    };
  }

  private ensurePowerupOrbTexture(kind: PowerupKind, color: number, shine: number): string {
    const key = `powerup-orb-${kind}-${this.grid.cell}`;
    if (this.scene.textures.exists(key)) {
      return key;
    }
    const size = Math.max(24, this.grid.cell * 2);
    const center = size / 2;
    const radius = size * 0.34;
    const g = this.scene.add.graphics();
    g.fillStyle(0x000000, 0.24);
    g.fillEllipse(center + size * 0.05, center + size * 0.08, radius * 1.65, radius * 1.25);
    g.fillStyle(darkenColor(color, 0.48), 0.95);
    g.fillCircle(center, center, radius);
    g.fillStyle(color, 1);
    g.fillCircle(center - size * 0.02, center - size * 0.02, radius * 0.78);
    g.fillStyle(shine, 0.88);
    g.fillCircle(center - radius * 0.32, center - radius * 0.36, radius * 0.22);
    g.lineStyle(Math.max(2, Math.floor(size * 0.05)), shine, 0.72);
    g.strokeCircle(center, center, radius * 0.94);
    g.lineStyle(Math.max(1, Math.floor(size * 0.025)), 0xffffff, 0.38);
    g.strokeCircle(center, center, radius * 1.22);
    if (kind === 'gun') {
      g.lineStyle(Math.max(2, Math.floor(size * 0.045)), 0x4d3315, 0.82);
      g.lineBetween(
        center - radius * 0.42,
        center + radius * 0.16,
        center + radius * 0.46,
        center - radius * 0.16,
      );
      g.fillStyle(0x4d3315, 0.85);
      g.fillRect(center - radius * 0.05, center + radius * 0.06, radius * 0.2, radius * 0.32);
    } else if (kind === 'smite') {
      g.fillStyle(shine, 0.92);
      g.fillTriangle(
        center + radius * 0.12,
        center - radius * 0.55,
        center - radius * 0.16,
        center + radius * 0.1,
        center + radius * 0.2,
        center + radius * 0.02,
      );
      g.fillTriangle(
        center - radius * 0.06,
        center + radius * 0.5,
        center + radius * 0.2,
        center - radius * 0.08,
        center - radius * 0.18,
        center + radius * 0.02,
      );
    } else {
      g.lineStyle(Math.max(2, Math.floor(size * 0.04)), shine, 0.8);
      g.strokeCircle(center - radius * 0.12, center, radius * 0.34);
      g.strokeCircle(center + radius * 0.2, center, radius * 0.34);
    }
    g.generateTexture(key, size, size);
    g.destroy();
    return key;
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
    thermalBody?: SnakeRenderOptions['thermalBody'],
  ): void {
    void room;
    const [roomX, roomY] = this.parseRoomCoordinates(currentRoomId);
    const now = (this.graphics.scene as Phaser.Scene).time?.now ?? performance.now();
    const pulse = poweredUp ? 0.85 + 0.15 * Math.sin(now / 180) : 1;
    const tintColor =
      typeof overrideColor === 'number' ? overrideColor : this.resolveThermalSnakeTint(thermalBody);
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

  private drawRaccoonPlayer(
    snakeBody: readonly Vector2Like[],
    currentRoomId: string,
    direction: Vector2Like,
    poweredUp: boolean,
  ): void {
    const [roomX, roomY] = this.parseRoomCoordinates(currentRoomId);
    const head = snakeBody[0];
    const now = (this.graphics.scene as Phaser.Scene).time?.now ?? performance.now();
    const pulse = poweredUp ? 0.85 + 0.15 * Math.sin(now / 180) : 1;
    this.snakeSprites.forEach((sprite) => sprite.setVisible(false));
    this.hatSprite.setVisible(false);
    if (!head) {
      return;
    }
    const localX = head.x - roomX * this.grid.cols;
    const localY = head.y - roomY * this.grid.rows;
    if (localX < 0 || localX >= this.grid.cols || localY < 0 || localY >= this.grid.rows) {
      return;
    }
    const x = localX * this.grid.cell;
    const y = localY * this.grid.cell;
    this.drawRaccoonCell(x, y, direction, pulse);
  }

  private drawRaccoonCell(x: number, y: number, direction: Vector2Like, alpha: number): void {
    const cell = this.grid.cell;
    const cx = x + cell / 2;
    const cy = y + cell / 2;
    const facingX = direction.x === 0 ? 0 : Math.sign(direction.x);
    const facingY = direction.y === 0 ? 0 : Math.sign(direction.y);
    const sideX = direction.y !== 0 ? 1 : 0;
    const sideY = direction.x !== 0 ? 1 : 0;
    const outline = 0x171a19;
    const fur = 0x747c78;
    const belly = 0xbec8c2;
    const mask = 0x202728;
    const tail = 0x565f5b;
    const tailBand = 0xd5ddd8;
    const ear = 0x8a938e;
    const eye = 0xfff2c2;
    const nose = 0x0f1212;
    const sparkle = 0x72ffd2;
    const backX = -facingX * cell * 0.24 + (facingY !== 0 ? -sideX * cell * 0.2 : 0);
    const backY = -facingY * cell * 0.24 + (facingX !== 0 ? -sideY * cell * 0.2 : 0);
    const snoutX = facingX * cell * 0.15;
    const snoutY = facingY * cell * 0.15;

    this.graphics.lineStyle(Math.max(1, cell * 0.07), outline, 0.95 * alpha);
    this.graphics.fillStyle(tail, 0.95 * alpha);
    this.graphics.fillEllipse(cx + backX, cy + backY, cell * 0.34, cell * 0.5);
    this.graphics.lineStyle(Math.max(1, cell * 0.045), tailBand, 0.95 * alpha);
    this.graphics.lineBetween(
      cx + backX - cell * 0.09,
      cy + backY - cell * 0.16,
      cx + backX + cell * 0.09,
      cy + backY + cell * 0.16,
    );
    this.graphics.lineBetween(
      cx + backX - cell * 0.1,
      cy + backY + cell * 0.08,
      cx + backX + cell * 0.1,
      cy + backY - cell * 0.08,
    );

    this.graphics.lineStyle(Math.max(1, cell * 0.08), outline, 0.98 * alpha);
    this.graphics.fillStyle(fur, alpha);
    this.graphics.fillEllipse(cx, cy + cell * 0.04, cell * 0.78, cell * 0.68);
    this.graphics.fillStyle(belly, 0.88 * alpha);
    this.graphics.fillEllipse(
      cx - facingX * cell * 0.07,
      cy + cell * 0.12,
      cell * 0.32,
      cell * 0.28,
    );

    this.graphics.fillStyle(ear, alpha);
    this.graphics.fillTriangle(
      cx - cell * 0.28,
      cy - cell * 0.21,
      cx - cell * 0.12,
      cy - cell * 0.43,
      cx - cell * 0.04,
      cy - cell * 0.18,
    );
    this.graphics.fillTriangle(
      cx + cell * 0.28,
      cy - cell * 0.21,
      cx + cell * 0.12,
      cy - cell * 0.43,
      cx + cell * 0.04,
      cy - cell * 0.18,
    );

    this.graphics.fillStyle(mask, 0.98 * alpha);
    this.graphics.fillEllipse(cx + snoutX, cy - cell * 0.07 + snoutY, cell * 0.54, cell * 0.24);
    this.graphics.fillStyle(eye, alpha);
    this.graphics.fillCircle(cx - cell * 0.12 + snoutX, cy - cell * 0.1 + snoutY, cell * 0.045);
    this.graphics.fillCircle(cx + cell * 0.12 + snoutX, cy - cell * 0.1 + snoutY, cell * 0.045);
    this.graphics.fillStyle(nose, alpha);
    this.graphics.fillCircle(
      cx + facingX * cell * 0.23,
      cy - cell * 0.01 + facingY * cell * 0.23,
      cell * 0.055,
    );

    this.graphics.fillStyle(sparkle, 0.72 * alpha);
    this.graphics.fillCircle(cx + cell * 0.24, cy + cell * 0.23, cell * 0.035);
  }

  private drawRetroGridSnake(
    snakeBody: readonly Vector2Like[],
    currentRoomId: string,
    direction: Vector2Like,
    poweredUp: boolean,
    activeHat: SnakeHatStyle | null,
    thermalBody?: SnakeRenderOptions['thermalBody'],
  ): void {
    const [roomX, roomY] = this.parseRoomCoordinates(currentRoomId);
    const now = (this.graphics.scene as Phaser.Scene).time?.now ?? performance.now();
    const pulse = poweredUp ? 0.88 + 0.12 * Math.sin(now / 180) : 1;
    const baseColor = this.resolveThermalRetroSnakeColor(0x5dd6a2, thermalBody);
    const shellColor = this.resolveThermalRetroSnakeColor(0x266f4f, thermalBody);
    const outlineColor = this.resolveThermalRetroSnakeColor(0x1c513a, thermalBody);
    this.snakeSprites.forEach((sprite) => sprite.setVisible(false));
    this.hatSprite.setVisible(false);

    snakeBody.forEach((segment) => {
      const localX = segment.x - roomX * this.grid.cols;
      const localY = segment.y - roomY * this.grid.rows;
      if (localX < 0 || localX >= this.grid.cols || localY < 0 || localY >= this.grid.rows) {
        return;
      }

      const x = localX * this.grid.cell;
      const y = localY * this.grid.cell;
      this.graphics.fillStyle(shellColor, 0.96 * pulse);
      this.graphics.fillRect(x, y, this.grid.cell, this.grid.cell);
      this.graphics.fillStyle(baseColor, pulse);
      this.graphics.fillRect(x + 2, y + 2, this.grid.cell - 4, this.grid.cell - 4);
      this.graphics.lineStyle(1, outlineColor, 0.9 * pulse);
      this.graphics.strokeRect(x + 0.5, y + 0.5, this.grid.cell - 1, this.grid.cell - 1);
    });

    const head = snakeBody[0];
    if (!activeHat || !head) return;

    const localX = head.x - roomX * this.grid.cols;
    const localY = head.y - roomY * this.grid.rows;
    if (localX < 0 || localX >= this.grid.cols || localY < 0 || localY >= this.grid.rows) {
      return;
    }

    const hatTextures = this.getHatTextureKeys(activeHat);
    this.hatSprite
      .setTexture(hatTextures[this.hatVariantFor(direction)])
      .setPosition(
        localX * this.grid.cell + this.grid.cell / 2,
        localY * this.grid.cell + this.grid.cell / 2 - this.grid.cell * 0.12,
      )
      .setDisplaySize(this.grid.cell, this.grid.cell)
      .setAlpha(pulse)
      .setVisible(true);
  }

  private resolveThermalSnakeTint(thermalBody?: SnakeRenderOptions['thermalBody']): number {
    if (!thermalBody?.active || !thermalBody.hazard || thermalBody.max <= 0) {
      return 0xffffff;
    }
    const ratio = Phaser.Math.Clamp(thermalBody.current / thermalBody.max, 0, 1);
    if (ratio < 0.18) {
      return 0xffffff;
    }
    const target = thermalBody.hazard === 'cold' ? 0x86d8ff : 0xffb066;
    return this.lerpHexColor(0xffffff, target, Math.min(0.72, ratio * 0.78));
  }

  private resolveThermalRetroSnakeColor(
    baseColor: number,
    thermalBody?: SnakeRenderOptions['thermalBody'],
  ): number {
    if (!thermalBody?.active || !thermalBody.hazard || thermalBody.max <= 0) {
      return baseColor;
    }
    const ratio = Phaser.Math.Clamp(thermalBody.current / thermalBody.max, 0, 1);
    if (ratio < 0.18) {
      return baseColor;
    }
    const target = thermalBody.hazard === 'cold' ? 0x79cfff : 0xff9f4f;
    return this.lerpHexColor(baseColor, target, Math.min(0.68, ratio * 0.7));
  }

  private drawOtherPlayers(
    room: RoomSnapshot,
    currentRoomId: string,
    players: readonly {
      id: string;
      body: readonly Vector2Like[];
      direction: Vector2Like;
      color?: number;
    }[],
  ): void {
    void room;
    const [roomX, roomY] = this.parseRoomCoordinates(currentRoomId);
    for (const player of players) {
      const color = player.color ?? 0x4ecdc4;
      let visibleSegments = 0;
      player.body.forEach((segment, index) => {
        const localX = segment.x - roomX * this.grid.cols;
        const localY = segment.y - roomY * this.grid.rows;
        if (localX < 0 || localX >= this.grid.cols || localY < 0 || localY >= this.grid.rows) {
          return;
        }
        visibleSegments += 1;
        const inset = index === 0 ? 2 : 3;
        const alpha = Math.max(0.35, 0.9 - index * 0.06);
        this.graphics.fillStyle(color, alpha);
        this.graphics.fillRoundedRect(
          localX * this.grid.cell + inset,
          localY * this.grid.cell + inset,
          this.grid.cell - inset * 2,
          this.grid.cell - inset * 2,
          3,
        );
        if (index === 0) {
          this.graphics.lineStyle(2, 0xffffff, 0.95);
          this.graphics.strokeRoundedRect(
            localX * this.grid.cell + inset,
            localY * this.grid.cell + inset,
            this.grid.cell - inset * 2,
            this.grid.cell - inset * 2,
            3,
          );
          this.graphics.fillStyle(0xffffff, 0.95);
          this.graphics.fillTriangle(
            localX * this.grid.cell + this.grid.cell / 2,
            localY * this.grid.cell - 5,
            localX * this.grid.cell + this.grid.cell / 2 - 5,
            localY * this.grid.cell + 2,
            localX * this.grid.cell + this.grid.cell / 2 + 5,
            localY * this.grid.cell + 2,
          );
          this.graphics.lineStyle(2, color, 0.95);
          this.graphics.strokeCircle(
            localX * this.grid.cell + this.grid.cell / 2,
            localY * this.grid.cell + this.grid.cell / 2,
            this.grid.cell * 0.62,
          );
        }
      });
      if (!this.loggedOtherPlayerRenderIds.has(player.id)) {
        this.loggedOtherPlayerRenderIds.add(player.id);
        console.info('[SnakeRenderer] Other player render check.', {
          playerId: player.id,
          roomId: currentRoomId,
          visibleSegments,
          head: player.body[0] ?? null,
        });
      }
    }
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

  private buildRivalSnakePalette(): SnakeSpritePalette {
    return {
      baseColor: '#d96a1f',
      bellyColor: '#ffb35f',
      patternColor: '#7a2f11',
      outlineColor: '#3b1308',
      eyeColor: '#fff0c7',
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
    if (style === 'unicorn-horn') {
      return {
        style,
        fillColor: '#ffffff', // white horn
        bandColor: '#f5f0ff', // light body color
        outlineColor: '#b89fd4', // soft purple outline
        accentColor: '#ffb3e6', // pink mane
      };
    }
    if (style === 'demon-horns') {
      return {
        style,
        fillColor: '#d83a24',
        bandColor: '#ff7a1a',
        outlineColor: '#160507',
        accentColor: '#ffb029',
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

  private buildVegetationPalette(): VegetationSpritePalette {
    return { biomeAccentColor: 0xffffff, paletteSize: this.grid.cell };
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

  private lerpHexColor(from: number, to: number, amount: number): number {
    const t = Phaser.Math.Clamp(amount, 0, 1);
    const fr = (from >> 16) & 0xff;
    const fg = (from >> 8) & 0xff;
    const fb = from & 0xff;
    const tr = (to >> 16) & 0xff;
    const tg = (to >> 8) & 0xff;
    const tb = to & 0xff;
    const r = Math.round(Phaser.Math.Linear(fr, tr, t));
    const g = Math.round(Phaser.Math.Linear(fg, tg, t));
    const b = Math.round(Phaser.Math.Linear(fb, tb, t));
    return (r << 16) | (g << 8) | b;
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
    let spriteIndex = 0;
    enemies.forEach((enemy) => {
      if (
        (enemy.encounterKind === 'rival-snake' || enemy.encounterKind === 'roaming-snake') &&
        enemy.body?.length
      ) {
        spriteIndex = this.drawEnemySnake(enemy, spriteIndex);
        return;
      }

      const segments =
        enemy.encounterKind === 'rival-snake' && enemy.body?.length ? enemy.body : [enemy.position];
      const textureKeys = this.spriteFactory.ensureRecipe(
        enemySpriteRecipe,
        this.grid.cell,
        this.paletteForEnemy(enemy),
      );
      segments.forEach((segment, segmentIndex) => {
        const sprite = this.ensureEnemySprite(spriteIndex);
        spriteIndex += 1;
        const variant =
          segmentIndex === 0
            ? this.resolveEnemyVariant(enemy)
            : ('enemy-down' as EnemySpriteVariant);
        const size = enemy.encounterKind === 'rival-snake' ? this.grid.cell * 0.82 : this.grid.cell;
        sprite
          .setTexture(textureKeys[variant])
          .setPosition(
            segment.x * this.grid.cell + this.grid.cell / 2,
            segment.y * this.grid.cell + this.grid.cell / 2,
          )
          .setDisplaySize(size, size)
          .setAngle(0)
          .setAlpha(1)
          .clearTint()
          .setVisible(true);
      });
    });
  }

  private drawEnemySnake(enemy: EnemyInstance, spriteIndex: number): number {
    const segments = enemy.body?.length ? enemy.body : [enemy.position];
    const textureKeys = this.spriteFactory.ensureRecipe(
      snakeSpriteRecipe,
      this.grid.cell,
      this.buildEnemySnakePalette(enemy),
    );
    const direction =
      enemy.aimDirection.x !== 0 || enemy.aimDirection.y !== 0
        ? enemy.aimDirection
        : { x: 1, y: 0 };

    segments.forEach((segment, segmentIndex) => {
      const sprite = this.ensureEnemySprite(spriteIndex);
      spriteIndex += 1;

      const variant = this.resolveVariant(segments, segmentIndex, direction);
      const size = this.grid.cell * (segmentIndex === 0 ? 0.96 : 0.92);
      const twist =
        segmentIndex > 0 && variant.startsWith('body') ? (segmentIndex % 2 ? 1 : -1) : 0;

      const alpha =
        enemy.encounterKind === 'roaming-snake'
          ? Math.max(0.35, 0.8 - segmentIndex * 0.035)
          : Math.max(0.48, 0.96 - segmentIndex * 0.045);

      sprite
        .setTexture(textureKeys[variant])
        .setPosition(
          segment.x * this.grid.cell + this.grid.cell / 2,
          segment.y * this.grid.cell + this.grid.cell / 2,
        )
        .setDisplaySize(size, size)
        .setAngle(twist)
        .setAlpha(alpha)
        .clearTint()
        .setVisible(true);
    });

    return spriteIndex;
  }

  private buildEnemySnakePalette(enemy: EnemyInstance): SnakeSpritePalette {
    if (enemy.encounterKind === 'roaming-snake') {
      const colorHex = (enemy as any)._colorHex;
      if (colorHex) {
        return this.hexToSnakePalette(colorHex);
      }
      return {
        baseColor: '#888888',
        bellyColor: '#bbbbbb',
        patternColor: '#666666',
        outlineColor: '#444444',
        eyeColor: '#dddddd',
      };
    }

    return this.buildRivalSnakePalette();
  }

  private hexToSnakePalette(hex: string): SnakeSpritePalette {
    parseInt(hex.slice(1, 3), 16) / 255;
    parseInt(hex.slice(3, 5), 16) / 255;
    parseInt(hex.slice(5, 7), 16) / 255;

    return {
      baseColor: hex,
      bellyColor: this.lightenHex(hex, 0.25),
      patternColor: this.darkenHex(hex, 0.3),
      outlineColor: this.darkenHex(hex, 0.5),
      eyeColor: '#ffffff',
    };
  }

  private lightenHex(hex: string, amount: number): string {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.round(r + (255 - r) * amount));
    g = Math.min(255, Math.round(g + (255 - g) * amount));
    b = Math.min(255, Math.round(b + (255 - b) * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  private darkenHex(hex: string, amount: number): string {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.round(r * (1 - amount)));
    g = Math.max(0, Math.round(g * (1 - amount)));
    b = Math.max(0, Math.round(b * (1 - amount)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
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

  private ensureVegetationSprite(index: number): Phaser.GameObjects.Image {
    let sprite = this.vegetationSprites[index];
    if (sprite) return sprite;
    sprite = this.scene.add
      .image(0, 0, this.vegetationTextureKeys['grass-1'])
      .setDepth(VEGETATION_LAYER_DEPTH)
      .setVisible(false)
      .setOrigin(0.5, 0.5);
    this.vegetationSprites[index] = sprite;
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
      direction.x > 0 ? 'right' : direction.x < 0 ? 'left' : direction.y < 0 ? 'up' : 'down';
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
    if (enemy.encounterKind === 'baby') {
      return {
        bodyColor: '#ffd7b8',
        accentColor: '#a8ffe0',
        outlineColor: '#18352d',
        eyeColor: '#f6fbff',
        bulletColor: '#ffbdfd',
        bulletOutlineColor: '#5d2b5d',
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
    if (enemy.encounterKind === 'rival-snake') {
      return {
        bodyColor: '#d96a1f',
        accentColor: '#ffb35f',
        outlineColor: '#3b1308',
        eyeColor: '#fff0c7',
        bulletColor: '#ff9f43',
        bulletOutlineColor: '#7a2f11',
      };
    }
    if (enemy.encounterKind === 'roaming-snake') {
      return {
        bodyColor: '#888888',
        accentColor: '#aaaaaa',
        outlineColor: '#555555',
        eyeColor: '#cccccc',
        bulletColor: '#ffffff',
        bulletOutlineColor: '#888888',
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

  private parseRoomCoordinates(roomId: string): [number, number, number] {
    if (!this.isCoordinateRoomId(roomId)) {
      return [0, 0, 0];
    }
    const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
    return [x, y, z];
  }

  private isCoordinateRoomId(roomId: string): boolean {
    return /^-?\d+,-?\d+,-?\d+$/.test(roomId);
  }

  private hashString(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private hashNumber(value: number): number {
    let next = value >>> 0;
    next ^= next << 13;
    next ^= next >>> 17;
    next ^= next << 5;
    return next >>> 0;
  }

  /**
   * Returns an iterable of masonry block age entries for cleanup.
   * Each entry is [key, createdTimestamp] where key is "roomId:localX,localY".
   */
  getMasonryBlockAgesEntries(): IterableIterator<[string, number]> {
    return this.masonryBlockAges.entries();
  }
}

function positiveMod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}
