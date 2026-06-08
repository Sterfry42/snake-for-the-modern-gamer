import Phaser from 'phaser';
import type { FishingState, FishingSessionResult, FishCatchResult } from './types.js';
import type { FishingRegistry } from './fishingRegistry.js';
import { i18n } from '../i18n/i18nManager.js';

export interface FishingMinigameConfig {
  scene: Phaser.Scene;
  fishingRegistry: FishingRegistry;
  onComplete: (result: FishingSessionResult) => void;
  playSound: (key: string) => void;
}

/** Fishing minigame overlay manager (not a Phaser plugin, avoids plugin complexity) */
export class FishingMinigame {
  private readonly config: FishingMinigameConfig;
  private container: Phaser.GameObjects.Container | null = null;
  private tensionBar: Phaser.GameObjects.Graphics | null = null;
  private progressIndicator: Phaser.GameObjects.Graphics | null = null;
  private fishSprite: Phaser.GameObjects.Graphics | null = null;
  private tensionText: Phaser.GameObjects.Text | null = null;
  private progressText: Phaser.GameObjects.Text | null = null;
  private zoneText: Phaser.GameObjects.Text | null = null;
  private fishNameText: Phaser.GameObjects.Text | null = null;
  private messageText: Phaser.GameObjects.Text | null = null;
  private hookSprite: Phaser.GameObjects.Graphics | null = null;
  private rippleGraphics: Phaser.GameObjects.Graphics | null = null;
  private struggleBar: Phaser.GameObjects.Graphics | null = null;
  private struggleIndicator: Phaser.GameObjects.Graphics | null = null;
  private activeState: FishingState | null = null;
  private running = false;
  private pendingResult: FishingSessionResult | null = null;
  private leftKey: Phaser.Input.Keyboard.Key | null = null;
  private rightKey: Phaser.Input.Keyboard.Key | null = null;
  private escapeKey: Phaser.Input.Keyboard.Key | null = null;

  constructor(config: FishingMinigameConfig) {
    this.config = config;
  }

  /** Start the fishing minigame overlay */
  start(state: FishingState): void {
    if (this.running) return;
    this.running = true;
    this.activeState = state;
    this.pendingResult = null;
    this.leftKey = null;
    this.rightKey = null;
    this.escapeKey = null;

    this.createOverlay();
    this.setupInput();
    this.startAnimation();

    // Register update callback with the scene
    this.config.scene.events.on('update', this.onSceneUpdate, this);
  }

  /** Stop the fishing minigame overlay */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    this.config.scene.events.off('update', this.onSceneUpdate, this);
    this.cleanup();
  }

  /** Check if the minigame is running */
  isRunning(): boolean {
    return this.running;
  }

  /** Get the pending result after fishing ends */
  getResult(): FishingSessionResult | null {
    return this.pendingResult;
  }

  private onSceneUpdate(_time: number, delta: number): void {
    this.update(delta);
  }

  private createOverlay(): void {
    const scene = this.config.scene;
    this.container = scene.add.container(0, 0).setDepth(100);

    // Dark background overlay
    const bg = scene.add
      .rectangle(
        scene.cameras.main.width / 2,
        scene.cameras.main.height / 2,
        scene.cameras.main.width,
        scene.cameras.main.height,
        0x000000,
        0.5,
      )
      .setOrigin(0.5);
    this.container.add(bg);

    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 2;

    // Fish name
    this.fishNameText = scene.add
      .text(centerX, centerY - 160, this.activeState!.fish.name, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.container.add(this.fishNameText);

    // Rarity badge
    const rarityColors: Record<string, string> = {
      common: '#a0a0a0',
      uncommon: '#44ff44',
      rare: '#4488ff',
      legendary: '#ffaa00',
    };
    this.fishNameText.setColor(rarityColors[this.activeState!.fish.rarity] ?? '#ffffff');

    // Zone text
    this.zoneText = scene.add
      .text(centerX, centerY - 120, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#44ff44',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.container.add(this.zoneText);

    // Tension bar background
    this.tensionBar = scene.add.graphics().setDepth(101);
    this.container.add(this.tensionBar);

    // Progress bar
    this.progressIndicator = scene.add.graphics().setDepth(101);
    this.container.add(this.progressIndicator);

    // Tension value text
    this.tensionText = scene.add
      .text(centerX, centerY - 60, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.container.add(this.tensionText);

    // Progress text
    this.progressText = scene.add
      .text(centerX, centerY - 40, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.container.add(this.progressText);

    // Message text
    this.messageText = scene.add
      .text(centerX, centerY + 60, 'Hold LEFT or RIGHT to reel in!', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#cccccc',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.container.add(this.messageText);

    // Struggle bar
    this.struggleBar = scene.add.graphics().setDepth(101);
    this.container.add(this.struggleBar);

    this.struggleIndicator = scene.add.graphics().setDepth(101);
    this.container.add(this.struggleIndicator);

    // Draw water scene
    this.drawWaterScene(centerX, centerY);
  }

  private drawWaterScene(cx: number, cy: number): void {
    const scene = this.config.scene;
    // Water panel background
    const waterBg = scene.add
      .rectangle(cx, cy + 10, 340, 80, 0x1a5276, 0.6)
      .setOrigin(0.5)
      .setDepth(100);
    this.container!.add(waterBg);

    // Ripple graphics
    this.rippleGraphics = scene.add.graphics().setDepth(101);
    this.container!.add(this.rippleGraphics);

    // Hook (graphics circle)
    this.hookSprite = scene.add.graphics().setDepth(102);
    this.hookSprite!.fillCircle(cx, cy + 50, 6);
    this.container!.add(this.hookSprite);

    // Fish (graphics rectangle)
    this.fishSprite = scene.add.graphics().setDepth(102);
    this.fishSprite!.fillRect(cx - 30, cy + 50, 30, 16);
    this.container!.add(this.fishSprite);
  }

  private setupInput(): void {
    const kb = this.config.scene.input.keyboard;
    if (kb) {
      this.leftKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      this.rightKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
      this.escapeKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

      this.escapeKey.on('down', () => {
        this.handleAbort();
      });
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => {
        this.handleAbort();
      });
    }
  }

  private startAnimation(): void {
    // No animation needed for the fishing overlay
    // The tension bar and progress bar provide enough visual feedback
  }

  private update(_delta: number): void {
    if (!this.running || !this.activeState) return;

    // Check for abort
    if (this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.handleAbort();
      return;
    }

    // Determine pull direction from held keys
    let pullDirection = 0;
    if (this.leftKey && this.leftKey.isDown) {
      pullDirection = -1;
    }
    if (this.rightKey && this.rightKey.isDown) {
      pullDirection = 1;
    }

    // Tick the fishing state
    const tickResult = this.config.fishingRegistry.tickFishing(this.activeState, pullDirection);
    this.activeState = tickResult.state;

    // Check for session end
    if (this.activeState.complete) {
      const sessionResult = tickResult.result ?? {
        caught: false,
        reason: 'escape',
      };
      this.pendingResult = sessionResult;
      this.config.onComplete(sessionResult);
      this.stop();
      return;
    }

    // Update UI
    this.updateUI();
  }

  private handleAbort(): void {
    if (!this.running || !this.activeState) return;
    const result = this.config.fishingRegistry.abortFishing(this.activeState);
    this.pendingResult = result;
    this.config.onComplete(result);
    this.stop();
  }

  private updateUI(): void {
    if (!this.activeState || !this.tensionBar || !this.progressIndicator) return;

    const state = this.activeState;
    const scene = this.config.scene;
    const barWidth = 300;
    const barHeight = 20;
    const barX = (scene.cameras.main.width - barWidth) / 2;
    const barY = scene.cameras.main.height / 2 - 90;

    // Draw tension bar background
    this.tensionBar.clear();
    this.tensionBar.fillStyle(0x333333, 1);
    this.tensionBar.fillRect(barX, barY, barWidth, barHeight);

    // Draw tension indicator
    const zoneInfo = this.config.fishingRegistry.getTensionInfo(state.tension);
    let tensionColor = 0x44ff44; // safe - green
    switch (zoneInfo.dangerLevel) {
      case 'warning':
        tensionColor = 0xffff44;
        break;
      case 'danger':
        tensionColor = 0xff8800;
        break;
      case 'critical':
        tensionColor = 0xff4444;
        break;
    }

    const tensionX = barX + (state.tension / 100) * barWidth;
    this.tensionBar.fillStyle(tensionColor, 1);
    this.tensionBar.fillRect(tensionX - 2, barY - 2, 4, barHeight + 4);

    // Draw progress bar
    this.progressIndicator.clear();
    this.progressIndicator.fillStyle(0x333333, 1);
    this.progressIndicator.fillRect(barX, barY + barHeight + 8, barWidth, 12);

    this.progressIndicator.fillStyle(0x44ddff, 0.8);
    this.progressIndicator.fillRect(
      barX,
      barY + barHeight + 8,
      (state.progress / 100) * barWidth,
      12,
    );

    // Struggle bar
    if (this.struggleBar && this.struggleIndicator) {
      this.struggleBar.clear();
      this.struggleIndicator.clear();

      const struggleBarY = scene.cameras.main.height / 2 + 30;
      const struggleWidth = 200;
      const struggleX = (scene.cameras.main.width - struggleWidth) / 2;

      this.struggleBar.fillStyle(0x333333, 1);
      this.struggleBar.fillRect(struggleX, struggleBarY, struggleWidth, 20);

      const indicatorX = struggleX + (state.struggleDirection === 1 ? 180 : 20);
      this.struggleIndicator.fillStyle(0xffffff, 1);
      if (state.struggleDirection === 1) {
        this.struggleIndicator.fillTriangle(
          indicatorX,
          struggleBarY,
          indicatorX + 20,
          struggleBarY + 20,
          indicatorX - 5,
          struggleBarY + 20,
        );
      } else {
        this.struggleIndicator.fillTriangle(
          indicatorX,
          struggleBarY,
          indicatorX - 20,
          struggleBarY + 20,
          indicatorX + 5,
          struggleBarY + 20,
        );
      }
    }

    // Update texts
    const tensionLabel = i18n.getFeatureString('fishingTensionLabel');
    this.tensionText!.setText(`${tensionLabel}: ${Math.round(state.tension)}`);
    const progressLabel = i18n.getFeatureString('fishingProgressLabel');
    this.progressText!.setText(`${progressLabel}: ${Math.round(state.progress)}%`);

    // Resolve zone label via i18n
    const zoneKey =
      `fishingZone${zoneInfo.zone.charAt(0).toUpperCase() + zoneInfo.zone.slice(1)}` as string;
    const resolvedZone = i18n.getFeatureString(zoneKey) ?? zoneInfo.zone.toUpperCase();
    this.zoneText!.setText(resolvedZone);

    const zoneColors: Record<string, string> = {
      safe: '#44ff44',
      'warning-low': '#ffff44',
      'warning-high': '#ffff44',
      'danger-low': '#ff8800',
      'danger-high': '#ff8800',
      'critical-low': '#ff4444',
      'critical-high': '#ff4444',
    };
    this.zoneText!.setColor(zoneColors[zoneInfo.zone] ?? '#ffffff');

    // Update message
    if (zoneInfo.dangerLevel === 'critical') {
      this.messageText!.setText(i18n.getFeatureString('fishingReleaseNow'));
    } else if (zoneInfo.dangerLevel === 'danger') {
      this.messageText!.setText(i18n.getFeatureString('fishingAdjustReeling'));
    } else {
      this.messageText!.setText(i18n.getFeatureString('fishingHoldLeftRight'));
    }
  }

  private cleanup(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    this.tensionBar = null;
    this.progressIndicator = null;
    this.fishSprite = null;
    this.tensionText = null;
    this.progressText = null;
    this.zoneText = null;
    this.fishNameText = null;
    this.messageText = null;
    this.hookSprite = null;
    this.rippleGraphics = null;
    this.struggleBar = null;
    this.struggleIndicator = null;
    this.activeState = null;
    this.pendingResult = null;
    this.leftKey = null;
    this.rightKey = null;
    this.escapeKey = null;
  }
}
