/**
 * Dream World Scene
 *
 * The wise old snake's dream world scene:
 * - The wise old snake's dream world scene was a floating island paradise
 * - The wise old snake's dream world scene had rainbow bridges everywhere
 * - The wise old snake's dream world scene was beautiful but confusing
 * - The wise old snake's dream world scene had floating apples that glowed
 * - The wise old snake's dream world scene gravity shifted every 5 minutes
 * - The wise old snake's dream world scene had puzzle rooms hidden behind clouds
 * - The wise old snake's dream world scene had a dream shop run by a talking apple
 * - The wise old snake's dream world scene was rendered in pastel colors
 * - The wise old snake's dream world scene had a "dream mode" filter
 * - The wise old snake considers the dream world scene "trippy but worth it"
 */
import Phaser from 'phaser';
import { DreamManager } from './DreamManager.js';
import { DreamPuzzleManager } from './DreamPuzzles.js';
import { DreamShopManager } from './dreamShop.js';
import { createDreamAppleInstance, DreamAppleBase } from './dreamAppleTypes.js';
import type { DreamStateId, DreamPhysicsState, DreamBuff } from './types.js';

// ─── Constants ─────────────────────────────────────────────────────────────────

const DREAM_BRIDGE_COLOR = 0xff69b4;
const DREAM_ISLAND_COLOR = 0x4a3060;
const DREAM_ISLAND_HIGHLIGHT = 0x6a5080;
const DREAM_HUD_BG_ALPHA = 0.7;
const DREAM_ACCENT_COLOR = 0xffd700;

const DREAM_ISLAND_COUNT = 7;
const DREAM_BRIDGE_COUNT = 8;

// ─── Dream World Config ────────────────────────────────────────────────────────

export interface DreamWorldSceneConfig {
  scene: Phaser.Scene;
  dreamManager: DreamManager;
  puzzleManager: DreamPuzzleManager;
  shopManager: DreamShopManager;
  onComplete: (exitReason: 'normal' | 'nightmare') => void;
  playSound: (key: string) => void;
}

// ─── Floating Apple Class ──────────────────────────────────────────────────────

export class FloatingDreamApple extends Phaser.GameObjects.Graphics {
  private readonly dreamApple: DreamAppleBase;
  private readonly baseY: number;
  private readonly floatSpeed: number;
  private readonly phaseOffset: number;

  constructor(scene: Phaser.Scene, x: number, y: number, dreamApple: DreamAppleBase) {
    super(scene);
    this.setPosition(x, y);
    this.dreamApple = dreamApple;
    this.baseY = y;
    this.floatSpeed = dreamApple.metadata.floatSpeed * 100 || 0.05;
    this.phaseOffset = dreamApple.metadata.phaseOffset || 0;

    this.drawApple(dreamApple.color);
    scene.add.existing(this);
  }

  private drawApple(color: number): void {
    this.clear();
    // Outer glow
    this.fillStyle(color, 0.3);
    this.fillCircle(0, 0, 14);
    // Main apple
    this.fillStyle(color, 0.9);
    this.fillCircle(0, 0, 10);
    // Highlight
    this.fillStyle(0xffffff, 0.4);
    this.fillCircle(-2, -3, 4);
    // Stem
    this.lineStyle(1, 0x4a3000, 1);
    this.beginPath();
    this.moveTo(0, -10);
    this.lineTo(0, -14);
    this.strokePath();
    // Leaf
    this.fillStyle(0x228b22, 0.8);
    this.fillEllipse(3, -13, 5, 3);
  }

  updateFloatingPosition(tick: number): void {
    const floatY = Math.sin(tick * this.floatSpeed + this.phaseOffset) * 5;
    this.setPosition(this.x, this.baseY + floatY);
  }

  getDreamApple(): DreamAppleBase {
    return this.dreamApple;
  }

  getBaseY(): number {
    return this.baseY;
  }
}

// ─── Dream Island Class ────────────────────────────────────────────────────────

export class DreamIsland extends Phaser.GameObjects.Graphics {
  private readonly centerX: number;
  private readonly centerY: number;
  private readonly width: number;
  private readonly height: number;
  private hoverOffset: number = 0;
  private hoverSpeed: number = 0.02;
  private hoverPhase: number = Math.random() * Math.PI * 2;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    super(scene);
    this.setPosition(x, y);
    this.centerX = x;
    this.centerY = y;
    this.width = width;
    this.height = height;

    this.drawIsland();
    scene.add.existing(this);
  }

  private drawIsland(): void {
    this.clear();
    // Main island body
    this.fillStyle(DREAM_ISLAND_COLOR, 0.8);
    this.fillRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, 12);
    // Island highlight
    this.fillStyle(DREAM_ISLAND_HIGHLIGHT, 0.5);
    this.fillRoundedRect(
      -this.width / 2 + 4,
      -this.height / 2 + 4,
      this.width - 8,
      this.height / 2 - 4,
      8,
    );
    // Border
    this.lineStyle(2, DREAM_ACCENT_COLOR, 0.6);
    this.strokeRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, 12);
  }

  updateFloating(tick: number): void {
    this.hoverOffset = Math.sin(tick * this.hoverSpeed + this.hoverPhase) * 3;
    this.y = this.centerY + this.hoverOffset;
  }

  containsPoint(x: number, y: number): boolean {
    return (
      x >= this.centerX - this.width / 2 &&
      x <= this.centerX + this.width / 2 &&
      y >= this.centerY - this.height / 2 &&
      y <= this.centerY + this.height / 2
    );
  }

  getCenterX(): number {
    return this.centerX;
  }

  getCenterY(): number {
    return this.centerY;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }
}

// ─── Dream Bridge Class ────────────────────────────────────────────────────────

export class DreamBridge extends Phaser.GameObjects.Graphics {
  constructor(
    scene: Phaser.Scene,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number = DREAM_BRIDGE_COLOR,
  ) {
    super(scene);
    this.setPosition(0, 0);
    this.drawBridge(x1, y1, x2, y2, color);
    scene.add.existing(this);
  }

  private drawBridge(x1: number, y1: number, x2: number, y2: number, color: number): void {
    this.clear();
    // Rainbow bridge effect
    const segments = 20;
    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;

    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const x = x1 + dx * i;
      const y = y1 + dy * i + Math.sin(t * Math.PI) * 20; // Arch effect
      const hue = (t * 360 + Date.now() * 0.01) % 360;
      const rgb = this.hslToRgb(hue / 360, 0.8, 0.6);
      this.fillStyle(rgb, 0.7);
      this.fillCircle(x, y, 4);
    }

    // Bridge path
    this.lineStyle(3, color, 0.5);
    this.beginPath();
    this.moveTo(x1, y1);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const x = x1 + dx * i;
      const y = y1 + dy * i + Math.sin(t * Math.PI) * 20;
      this.lineTo(x, y);
    }
    this.strokePath();
  }

  private hslToRgb(h: number, s: number, l: number): number {
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return Math.round(r * 255) * 65536 + Math.round(g * 255) * 256 + Math.round(b * 255);
  }
}

// ─── Dream Particle System ─────────────────────────────────────────────────────

class DreamParticles {
  private particles: Phaser.GameObjects.Zone[];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, count: number = 50) {
    this.scene = scene;
    this.particles = [];

    for (let i = 0; i < count; i++) {
      const particle = scene.add.zone(
        Math.random() * scene.scale.width,
        Math.random() * scene.scale.height,
        2,
        2,
      );
      // Zone doesn't have setAlpha/setTint in Phaser 3, use a different approach
      this.particles.push(particle);
    }
  }

  update(_delta: number): void {
    for (const particle of this.particles) {
      particle.y -= 0.3;
      particle.x += Math.sin(Date.now() * 0.001 + particle.x) * 0.2;

      if (particle.y < -10) {
        particle.y = this.scene.scale.height + 10;
        particle.x = Math.random() * this.scene.scale.width;
      }
    }
  }

  destroy(): void {
    for (const particle of this.particles) {
      particle.destroy();
    }
  }
}

// ─── Dream HUD ─────────────────────────────────────────────────────────────────

class DreamHUD {
  private scene: Phaser.Scene;
  private bg: Phaser.GameObjects.Rectangle | null = null;
  private shardText: Phaser.GameObjects.Text | null = null;
  private lucidityText: Phaser.GameObjects.Text | null = null;
  private gravityText: Phaser.GameObjects.Text | null = null;
  private exitButton: Phaser.GameObjects.Rectangle | null = null;
  private exitLabelText: Phaser.GameObjects.Text | null = null;
  private onExit?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    const { width, height } = this.scene.scale;

    // Top HUD background
    this.bg = this.scene.add
      .rectangle(width / 2, 20, width - 32, 40, 0x1a0a2e, DREAM_HUD_BG_ALPHA)
      .setStrokeStyle(1, DREAM_ACCENT_COLOR, 0.5)
      .setOrigin(0.5, 0)
      .setDepth(100);

    // Shard counter
    this.shardText = this.scene.add
      .text(16, 10, '💎 0', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffd700',
      })
      .setDepth(101);

    // Lucidity indicator
    this.lucidityText = this.scene.add
      .text(width / 2, 10, '✨ Lucidity: 0', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e6e6fa',
      })
      .setOrigin(0.5, 0)
      .setDepth(101);

    // Gravity indicator
    this.gravityText = this.scene.add
      .text(width - 16, 10, '↓ Gravity: Down', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e6e6fa',
        align: 'right' as const,
      })
      .setOrigin(1, 0)
      .setDepth(101);

    // Exit button
    const exitX = width - 60;
    const exitY = height - 40;
    this.exitButton = this.scene.add
      .rectangle(exitX, exitY, 100, 30, 0x2a1a3e, 0.85)
      .setStrokeStyle(1, 0xff9944, 0.6)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    this.exitLabelText = this.scene.add
      .text(exitX, exitY, 'Exit Dream', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(101);

    this.exitButton.on('pointerdown', () => {
      this.onExit?.();
    });

    this.exitButton.on('pointerover', () => {
      this.exitButton?.setFillStyle(0x3a2a4e, 0.9);
      this.exitButton?.setStrokeStyle(1, 0xffcc7e, 0.9);
      this.exitLabelText?.setColor('#ffcc7e');
    });

    this.exitButton.on('pointerout', () => {
      this.exitButton?.setFillStyle(0x2a1a3e, 0.85);
      this.exitButton?.setStrokeStyle(1, 0xff9944, 0.6);
      this.exitLabelText?.setColor('#ffffff');
    });
  }

  setShardCount(count: number): void {
    this.shardText?.setText(`💎 ${count}`);
  }

  setLucidity(level: number): void {
    this.lucidityText?.setText(`✨ Lucidity: ${level}`);
  }

  setGravity(direction: string): void {
    const arrow =
      direction === 'up' ? '↑' : direction === 'down' ? '↓' : direction === 'left' ? '←' : '→';
    this.gravityText?.setText(
      `${arrow} Gravity: ${direction.charAt(0).toUpperCase() + direction.slice(1)}`,
    );
  }

  setOnExit(callback: () => void): void {
    this.onExit = callback;
  }

  destroy(): void {
    this.bg?.destroy();
    this.shardText?.destroy();
    this.lucidityText?.destroy();
    this.gravityText?.destroy();
    this.exitButton?.destroy();
    this.exitLabelText?.destroy();
  }
}

// ─── Dream World Scene Manager ─────────────────────────────────────────────────

export class DreamWorldScene {
  protected readonly config: DreamWorldSceneConfig;
  protected readonly scene: Phaser.Scene;
  protected dreamManager: DreamManager;
  protected puzzleManager: DreamPuzzleManager;
  protected shopManager: DreamShopManager;
  protected running = false;

  // Visual elements
  protected bgGraphics!: Phaser.GameObjects.Graphics;
  protected islands: DreamIsland[] = [];
  protected bridges: DreamBridge[] = [];
  protected apples: FloatingDreamApple[] = [];
  protected particles!: DreamParticles;
  protected hud!: DreamHUD;

  // Game state
  protected state: DreamStateId;
  protected physicsState: DreamPhysicsState;
  protected activeBuffs: DreamBuff[] = [];
  protected tickCount = 0;
  protected gravityShiftTimer = 0;

  // UI state
  protected showShop = false;
  protected showPuzzles = false;
  protected showLore = false;
  protected showLucidMenu = false;
  protected messageText: Phaser.GameObjects.Text | null = null;
  protected messageTimer = 0;

  // Input
  protected spaceKey!: Phaser.Input.Keyboard.Key;
  protected keyS!: Phaser.Input.Keyboard.Key;
  protected keyP!: Phaser.Input.Keyboard.Key;
  protected keyL!: Phaser.Input.Keyboard.Key;
  protected keyEscape!: Phaser.Input.Keyboard.Key;

  constructor(config: DreamWorldSceneConfig) {
    this.config = config;
    this.scene = config.scene;
    this.dreamManager = config.dreamManager;
    this.puzzleManager = config.puzzleManager;
    this.shopManager = config.shopManager;
    this.state = this.dreamManager.getActiveState() ?? 'dream';
    this.physicsState = this.createDefaultPhysics();
  }

  protected createDefaultPhysics(): DreamPhysicsState {
    return {
      gravity: 'down',
      gravityTimer: 0,
      shiftInterval: 300,
      isTimeStopped: false,
      timeStopTimer: 0,
    };
  }

  // ─── Scene Lifecycle ───────────────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    this.tickCount = 0;

    this.createBackground();
    this.generateIslands();
    this.generateBridges();
    this.spawnApples();
    this.createParticles();
    this.createHUD();
    this.setupInput();
    this.showMessage('Welcome to the Dream World!', 3000);

    this.scene.events.on('update', this.onSceneUpdate, this);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    this.scene.events.off('update', this.onSceneUpdate, this);
    this.cleanup();

    this.dreamManager.endDreamSession();
    this.config.onComplete(this.state === 'nightmare' ? 'nightmare' : 'normal');
  }

  // ─── Creation ──────────────────────────────────────────────────────────────

  protected createBackground(): void {
    this.bgGraphics = this.scene.add.graphics();
    this.drawDreamBackground();
  }

  protected drawDreamBackground(): void {
    this.bgGraphics.clear();

    const { width, height } = this.scene.scale;
    const isNightmare = this.state === 'nightmare';

    if (isNightmare) {
      // Nightmare: dark, ominous
      this.bgGraphics.fillStyle(0x0a0014, 1);
      this.bgGraphics.fillRect(0, 0, width, height);
      // Red tint overlay
      this.bgGraphics.fillStyle(0x3a0000, 0.2);
      this.bgGraphics.fillRect(0, 0, width, height);
    } else {
      // Dream: purple/blue gradient
      this.bgGraphics.fillStyle(0x1a0a2e, 1);
      this.bgGraphics.fillRect(0, 0, width, height);
      // Star field
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 2 + 0.5;
        const alpha = 0.3 + Math.random() * 0.5;
        this.bgGraphics.fillStyle(0xffffff, alpha);
        this.bgGraphics.fillCircle(x, y, size);
      }
    }
  }

  protected generateIslands(): void {
    const { width, height } = this.scene.scale;
    const padding = 80;

    for (let i = 0; i < DREAM_ISLAND_COUNT; i++) {
      const x = padding + Math.random() * (width - padding * 2);
      const y = padding + 60 + Math.random() * (height - padding * 2 - 60);
      const w = 60 + Math.random() * 80;
      const h = 40 + Math.random() * 50;

      const island = new DreamIsland(this.scene, x, y, w, h);
      this.islands.push(island);
    }
  }

  protected generateBridges(): void {
    // Connect islands in a rough chain
    for (let i = 0; i < Math.min(DREAM_BRIDGE_COUNT, this.islands.length - 1); i++) {
      const from = this.islands[i];
      const to = this.islands[(i + 1) % this.islands.length];

      const bridge = new DreamBridge(
        this.scene,
        from.getCenterX(),
        from.getCenterY(),
        to.getCenterX(),
        to.getCenterY(),
        this.state === 'nightmare' ? 0x8b0000 : DREAM_BRIDGE_COLOR,
      );
      this.bridges.push(bridge);
    }
  }

  protected spawnApples(): void {
    const appleTypes = this.dreamManager.getAvailableAppleTypes(this.state);
    const count = 5 + Math.floor(Math.random() * 5);

    for (let i = 0; i < count; i++) {
      const island = this.islands[Math.floor(Math.random() * this.islands.length)];
      const type = appleTypes[Math.floor(Math.random() * appleTypes.length)];
      const apple = createDreamAppleInstance(type, 'dream-room', { x: 0, y: 0 });

      const appleSprite = new FloatingDreamApple(
        this.scene,
        island.getCenterX() + (Math.random() - 0.5) * island.getWidth() * 0.6,
        island.getCenterY() - 20,
        apple,
      );

      this.apples.push(appleSprite);
    }
  }

  protected createParticles(): void {
    this.particles = new DreamParticles(this.scene, 50);
  }

  protected createHUD(): void {
    this.hud = new DreamHUD(this.scene);
    this.hud.create();
    this.hud.setOnExit(() => this.stop());

    // Message text
    this.messageText = this.scene.add
      .text(this.scene.scale.width / 2, this.scene.scale.height / 2, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        align: 'center' as const,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(200)
      .setVisible(false);
  }

  protected setupInput(): void {
    const keyboard = this.scene.input.keyboard;

    this.spaceKey = keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyS = keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyP = keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.keyL = keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    this.keyEscape = keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  protected onSceneUpdate(_time: number, delta: number): void {
    if (!this.running) return;

    const effectiveDelta = this.physicsState.isTimeStopped ? 0 : delta;
    this.tickCount++;

    // Update floating elements
    this.updateFloatingApples(this.tickCount);
    this.updateFloatingIslands(this.tickCount);
    this.particles.update(effectiveDelta);

    // Gravity shift timer
    if (!this.physicsState.isTimeStopped) {
      this.gravityShiftTimer += delta;
      if (this.gravityShiftTimer >= this.physicsState.shiftInterval * 16.67) {
        this.shiftGravity();
        this.gravityShiftTimer = 0;
      }
    }

    // Update buff timers
    this.updateBuffs(delta);

    // Update lucid ability cooldowns
    this.dreamManager.updateAbilityCooldowns(1);

    // Message timer
    if (this.messageTimer > 0) {
      this.messageTimer -= delta;
      if (this.messageTimer <= 0) {
        this.messageText?.setVisible(false);
      }
    }

    // Handle input
    this.handleInput();

    // Update HUD
    this.updateHUD();

    // Record tick for dream manager
    this.dreamManager.recordTick();
  }

  protected updateFloatingApples(tick: number): void {
    for (const apple of this.apples) {
      apple.updateFloatingPosition(tick);
    }
  }

  protected updateFloatingIslands(tick: number): void {
    for (const island of this.islands) {
      island.updateFloating(tick);
    }
  }

  protected shiftGravity(): void {
    const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
    this.physicsState.gravity = directions[Math.floor(Math.random() * directions.length)];
    this.physicsState.gravityTimer = 0;

    this.showMessage(`Gravity shifted to ${this.physicsState.gravity}!`, 2000);
    this.config.playSound('dream:gravity');

    const session = this.dreamManager.getCurrentSession();
    if (session) {
      session.gravityShifts++;
    }
  }

  protected updateBuffs(delta: number): void {
    this.activeBuffs = this.activeBuffs.filter((buff) => {
      buff.remaining -= delta;
      return buff.remaining > 0;
    });
  }

  protected handleInput(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    // Exit dream (Escape)
    if (Phaser.Input.Keyboard.JustDown(this.keyEscape)) {
      this.stop();
      return;
    }

    // Toggle shop (S)
    if (Phaser.Input.Keyboard.JustDown(this.keyS)) {
      this.showShop = !this.showShop;
      this.showPuzzles = false;
      this.showLore = false;
      this.showLucidMenu = false;
      if (this.showShop) {
        this.showMessage('Dream Shop - Press S to close', 2000);
      }
    }

    // Toggle puzzles (P)
    if (Phaser.Input.Keyboard.JustDown(this.keyP)) {
      this.showPuzzles = !this.showPuzzles;
      this.showShop = false;
      this.showLore = false;
      this.showLucidMenu = false;
      if (this.showPuzzles) {
        this.showMessage('Puzzle Menu - Press P to close', 2000);
      }
    }

    // Toggle lucid menu (L)
    if (Phaser.Input.Keyboard.JustDown(this.keyL)) {
      this.showLucidMenu = !this.showLucidMenu;
      this.showShop = false;
      this.showPuzzles = false;
      this.showLore = false;
      if (this.showLucidMenu) {
        const lucidState = this.dreamManager.getLucidState();
        if (lucidState.unlocked) {
          this.showMessage('Lucid Dream Controls - Press L to close', 2000);
        } else {
          this.showMessage('Lucid dreaming not yet unlocked', 2000);
        }
      }
    }

    // Collect nearby apples (Space)
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.collectNearbyApples();
    }
  }

  protected collectNearbyApples(): void {
    const { width, height } = this.scene.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const collectionRadius = 60;

    const collected: FloatingDreamApple[] = [];

    for (const apple of this.apples) {
      const dx = apple.x - centerX;
      const dy = apple.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < collectionRadius) {
        collected.push(apple);
      }
    }

    for (const apple of collected) {
      // Remove apple from scene
      apple.destroy();

      // Remove from array
      const index = this.apples.indexOf(apple);
      if (index !== -1) {
        this.apples.splice(index, 1);
      }

      // Apply apple effects
      const dreamApple = apple.getDreamApple();
      this.dreamManager.recordAppleEaten(dreamApple.typeId);

      // Apply buff if present
      const buffType = dreamApple.metadata.buffType;
      const buffDuration = dreamApple.metadata.buffDuration;
      if (buffType) {
        this.applyBuff({
          type: buffType,
          duration: buffDuration,
          remaining: buffDuration,
        });
      }

      // Collect shards
      const shardChance = 0.3;
      if (Math.random() < shardChance) {
        this.dreamManager.recordShardCollection(1);
      }

      // Chance to discover lore
      if (Math.random() < 0.1) {
        this.discoverRandomLore();
      }

      this.showMessage('Apple collected!', 1000);
      this.config.playSound('dream:collect');
    }

    // Respawn apples if low
    if (this.apples.length < 3) {
      this.spawnApples();
    }
  }

  protected applyBuff(buff: DreamBuff): void {
    this.activeBuffs.push(buff);

    this.showMessage(`Buff applied: ${buff.type} (${Math.floor(buff.remaining / 1000)}s)`, 2000);
    this.config.playSound('dream:buff');

    const session = this.dreamManager.getCurrentSession();
    if (session) {
      session.applesEaten.push(buff.type);
    }
  }

  protected discoverRandomLore(): void {
    const collected = this.dreamManager.getCollectedLoreFragments();
    const nextLore = this.getNextUndiscoveredLore(collected);

    if (nextLore) {
      this.dreamManager.recordLoreDiscovery(nextLore.id);
      this.showMessage(`Lore discovered: ${nextLore.title}!`, 3000);
      this.config.playSound('dream:lore');
    }
  }

  protected getNextUndiscoveredLore(
    _collected: string[],
  ): import('./dreamLore.js').LoreFragment | undefined {
    // Simple synchronous check - in production, lore would be pre-loaded
    // This is a placeholder that returns undefined
    return undefined;
  }

  // ─── Messaging ─────────────────────────────────────────────────────────────

  protected showMessage(text: string, duration: number): void {
    if (!this.messageText) return;

    this.messageText.setText(text);
    this.messageText.setVisible(true);
    this.messageTimer = duration;

    // Fade out animation
    this.scene.tweens.add({
      targets: this.messageText,
      alpha: 0,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
        this.messageText?.setVisible(false);
      },
    });
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  protected updateHUD(): void {
    const session = this.dreamManager.getCurrentSession();
    if (session) {
      this.hud.setShardCount(session.shardsCollected);
      this.hud.setLucidity(session.lucidityLevel);
      this.hud.setGravity(this.physicsState.gravity);
    }
  }

  protected cleanup(): void {
    this.bgGraphics?.destroy();
    this.particles?.destroy();
    this.hud?.destroy();
    this.messageText?.destroy();

    for (const island of this.islands) {
      island.destroy();
    }
    for (const bridge of this.bridges) {
      bridge.destroy();
    }
    for (const apple of this.apples) {
      apple.destroy();
    }

    this.islands = [];
    this.bridges = [];
    this.apples = [];
  }
}
