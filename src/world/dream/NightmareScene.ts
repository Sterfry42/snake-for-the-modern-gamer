/**
 * Nightmare Scene
 */
import Phaser from 'phaser';
import type { Vector2Like } from '../../core/math.js';

import { createDreamAppleInstance } from './dreamAppleTypes.js';

import {
  DreamWorldScene,
  DreamIsland,
  DreamBridge,
  FloatingDreamApple,
  type DreamWorldSceneConfig,
} from './DreamWorldScene.js';

// ─── Nightmare Constants ───────────────────────────────────────────────────────

const NIGHTMARE_BG_COLOR = 0x0a0014;
const NIGHTMARE_ENEMY_COLOR = 0x4a0000;

const NIGHTMARE_ISLAND_COUNT = 10;
const NIGHTMARE_BRIDGE_COUNT = 8;

// ─── Nightmare Enemy Class ─────────────────────────────────────────────────────

class NightmareEnemy extends Phaser.GameObjects.Graphics {
  private speed: number;
  private health: number;
  private maxHealth: number;
  private chaseTimer = 0;
  private changeDirectionTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number = 0.5, health: number = 3) {
    super(scene);
    this.setPosition(x, y);
    this.speed = speed;
    this.health = health;
    this.maxHealth = health;

    this.drawEnemy();
    scene.add.existing(this);
  }

  private drawEnemy(): void {
    this.clear();
    // Dark body
    this.fillStyle(NIGHTMARE_ENEMY_COLOR, 0.9);
    this.fillCircle(0, 0, 12);
    // Glowing eyes
    this.fillStyle(0xff0000, 0.8);
    this.fillCircle(-4, -3, 3);
    this.fillCircle(4, -3, 3);
    // Health bar
    const barWidth = 20;
    const healthPercent = this.health / this.maxHealth;
    this.fillStyle(0x000000, 0.5);
    this.fillRect(-barWidth / 2, -18, barWidth, 3);
    this.fillStyle(0xff0000, 1);
    this.fillRect(-barWidth / 2, -18, barWidth * healthPercent, 3);
  }

  update(delta: number, snakeHead: Vector2Like): void {
    this.chaseTimer += delta;
    this.changeDirectionTimer += delta;

    // Change direction occasionally
    if (this.changeDirectionTimer > 2000) {
      this.changeDirectionTimer = 0;
    }

    // Chase the snake head
    const dx = snakeHead.x - this.x;
    const dy = snakeHead.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      this.x += (dx / distance) * this.speed * (delta / 16.67);
      this.y += (dy / distance) * this.speed * (delta / 16.67);
    }
  }

  takeDamage(amount: number): boolean {
    this.health -= amount;
    this.drawEnemy();
    return this.health <= 0;
  }
}

// ─── Nightmare Scene Manager ───────────────────────────────────────────────────

export class NightmareScene extends DreamWorldScene {
  private enemies: NightmareEnemy[] = [];
  private survivalTimer = 0;
  private survivalTarget = 60000; // 60 seconds
  private difficultyMultiplier = 1.0;
  private spawnTimer = 0;

  constructor(config: DreamWorldSceneConfig) {
    super(config);
    this.state = 'nightmare';
  }

  override start(): void {
    super.start();
    this.showMessage('The Nightmare Realm awaits... Survive!', 3000);
  }

  override stop(): void {
    // Check for survival achievement
    if (this.survivalTimer >= this.survivalTarget) {
      this.showMessage('🏆 Nightmare Conqueror!', 3000);
      this.config.playSound('achievement:unlock');
    }

    super.stop();
  }

  protected override createBackground(): void {
    this.bgGraphics = this.scene.add.graphics();
    this.drawNightmareBackground();
  }

  protected drawNightmareBackground(): void {
    this.bgGraphics.clear();

    const { width, height } = this.scene.scale;

    // Dark background
    this.bgGraphics.fillStyle(NIGHTMARE_BG_COLOR, 1);
    this.bgGraphics.fillRect(0, 0, width, height);

    // Red vignette
    this.bgGraphics.fillStyle(0x3a0000, 0.3);
    this.bgGraphics.fillRect(0, 0, width, height);

    // Blood drips
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height * 0.3;
      const length = 10 + Math.random() * 30;
      this.bgGraphics.fillStyle(0x8b0000, 0.4);
      this.bgGraphics.fillRect(x, y, 2, length);
    }
  }

  protected override generateIslands(): void {
    // Nightmare islands are smaller and more numerous
    const { width, height } = this.scene.scale;
    const padding = 60;

    for (let i = 0; i < NIGHTMARE_ISLAND_COUNT; i++) {
      const x = padding + Math.random() * (width - padding * 2);
      const y = padding + 60 + Math.random() * (height - padding * 2 - 60);
      const w = 40 + Math.random() * 50;
      const h = 30 + Math.random() * 40;

      const island = new DreamIsland(this.scene, x, y, w, h);
      this.islands.push(island);
    }
  }

  protected override generateBridges(): void {
    // Nightmare bridges are broken and flickering
    for (let i = 0; i < Math.min(NIGHTMARE_BRIDGE_COUNT, this.islands.length - 1); i++) {
      const from = this.islands[i];
      const to = this.islands[(i + 1) % this.islands.length];

      // Only connect some bridges (some are broken)
      if (Math.random() > 0.3) {
        const bridge = new DreamBridge(
          this.scene,
          from.getCenterX(),
          from.getCenterY(),
          to.getCenterX(),
          to.getCenterY(),
          0x8b0000,
        );
        this.bridges.push(bridge);
      }
    }
  }

  protected override spawnApples(): void {
    const appleTypes = this.dreamManager.getAvailableAppleTypes('nightmare');
    const count = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
      const island = this.islands[Math.floor(Math.random() * this.islands.length)];
      const type = appleTypes[Math.floor(Math.random() * appleTypes.length)];
      const apple = createDreamAppleInstance(type, 'nightmare-room', { x: 0, y: 0 });

      const appleSprite = new FloatingDreamApple(
        this.scene,
        island.getCenterX() + (Math.random() - 0.5) * island.getWidth() * 0.6,
        island.getCenterY() - 20,
        apple,
      );

      this.apples.push(appleSprite);
    }
  }

  protected override onSceneUpdate(_time: number, delta: number): void {
    if (!this.running) return;

    this.tickCount++;
    this.survivalTimer += delta;
    this.spawnTimer += delta;

    // Update difficulty
    this.difficultyMultiplier = 1.0 + (this.survivalTimer / 60000) * 0.05;

    // Spawn enemies
    if (this.spawnTimer > 5000 / this.difficultyMultiplier) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }

    // Update enemies
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;
    const snakeHead: Vector2Like = { x: centerX, y: centerY };

    for (const enemy of this.enemies) {
      enemy.update(delta, snakeHead);
    }

    // Check enemy collisions with center area
    for (const enemy of this.enemies) {
      const dx = enemy.x - centerX;
      const dy = enemy.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 30) {
        // Enemy reached the center - penalty
        this.showMessage('Enemy attack!', 1000);
        this.config.playSound('nightmare:attack');
        enemy.destroy();
        const index = this.enemies.indexOf(enemy);
        if (index !== -1) {
          this.enemies.splice(index, 1);
        }
      }
    }

    // Update floating elements
    this.updateFloatingApples(this.tickCount);
    this.particles.update(delta);

    // Gravity shift (less frequent in nightmare)
    if (!this.physicsState.isTimeStopped) {
      this.gravityShiftTimer += delta;
      if (this.gravityShiftTimer >= this.physicsState.shiftInterval * 16.67 * 1.5) {
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

    // Record tick
    this.dreamManager.recordTick();

    // Check survival time
    if (this.survivalTimer >= this.survivalTarget) {
      this.showMessage('🏆 Nightmare Conqueror! You survived!', 5000);
      this.config.playSound('achievement:unlock');
    }
  }

  private spawnEnemy(): void {
    const { width, height } = this.scene.scale;
    const edge = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (edge) {
      case 0: // Top
        x = Math.random() * width;
        y = -20;
        break;
      case 1: // Right
        x = width + 20;
        y = Math.random() * height;
        break;
      case 2: // Bottom
        x = Math.random() * width;
        y = height + 20;
        break;
      default: // Left
        x = -20;
        y = Math.random() * height;
        break;
    }

    const speed = 0.3 * this.difficultyMultiplier;
    const health = Math.ceil(2 * this.difficultyMultiplier);

    const enemy = new NightmareEnemy(this.scene, x, y, speed, health);
    this.enemies.push(enemy);
  }

  protected override collectNearbyApples(): void {
    super.collectNearbyApples();

    // In nightmare, collecting apples also attracts enemies
    if (Math.random() < 0.3) {
      this.spawnEnemy();
    }
  }

  protected override cleanup(): void {
    for (const enemy of this.enemies) {
      enemy.destroy();
    }
    this.enemies = [];

    super.cleanup();
  }
}
