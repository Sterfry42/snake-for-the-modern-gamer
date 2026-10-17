import Phaser from 'phaser';
import type { BaseballSessionResult, BaseballState } from './types.js';
import type { BaseballRegistry } from './baseballRegistry.js';
import { SWING_WINDOWS } from './baseballRegistry.js';
import { i18n } from '../i18n/i18nManager.js';
import type { ControllerNavCommand } from '../input/controllerNavigation.js';
import type { InputModeId } from '../input/controlActions.js';

export interface BaseballMinigameConfig {
  scene: Phaser.Scene;
  baseballRegistry: BaseballRegistry;
  onComplete: (result: BaseballSessionResult) => void;
}

/**
 * Baseball minigame overlay (not a Phaser plugin, avoids plugin complexity).
 *
 * The wise old snake once batted 999 apples over the wall in a single inning.
 */
export class BaseballMinigame {
  private readonly config: BaseballMinigameConfig;
  /** Meter covers plate-space 0.55 .. 1.45. */
  private static readonly METER_START = 0.55;
  private static readonly METER_RANGE = 0.9;
  /** Lateral drift sign per pitch type (visual only). */
  private static readonly CURVE_DIRECTION: Record<string, number> = {
    fastball: 0,
    curveball: 1,
    slider: -1,
    changeup: 0.4,
  };

  private container: Phaser.GameObjects.Container | null = null;
  private ballSprite: Phaser.GameObjects.Graphics | null = null;
  private meterMarker: Phaser.GameObjects.Graphics | null = null;
  private pitchNameText: Phaser.GameObjects.Text | null = null;
  private resultText: Phaser.GameObjects.Text | null = null;
  private distanceText: Phaser.GameObjects.Text | null = null;
  private hintText: Phaser.GameObjects.Text | null = null;
  private inputMode: InputModeId = 'keyboardMouse';
  private activeState: BaseballState | null = null;
  private running = false;
  private pendingResult: BaseballSessionResult | null = null;
  private resultTimerMs = 0;
  private swingKey: Phaser.Input.Keyboard.Key | null = null;
  private enterKey: Phaser.Input.Keyboard.Key | null = null;
  private escapeKey: Phaser.Input.Keyboard.Key | null = null;
  private moundPosition = { x: 0, y: 0 };
  private platePosition = { x: 0, y: 0 };
  private meterRect = { x: 0, y: 0, width: 0 };

  constructor(config: BaseballMinigameConfig) {
    this.config = config;
  }

  /** Start the baseball minigame overlay */
  start(state: BaseballState): void {
    if (this.running) return;
    this.running = true;
    this.activeState = state;
    this.pendingResult = null;
    this.resultTimerMs = 0;
    this.swingKey = null;
    this.enterKey = null;
    this.escapeKey = null;

    this.createOverlay();
    this.setupInput();
    this.updateField();

    // Register update callback with the scene
    this.config.scene.events.on('update', this.onSceneUpdate, this);
  }

  /** Stop the baseball minigame overlay */
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

  /** Get the pending result after the pitch resolves */
  getResult(): BaseballSessionResult | null {
    return this.pendingResult;
  }

  setInputMode(mode: InputModeId): void {
    this.inputMode = mode;
    this.hintText?.setText(this.getControlHint());
  }

  handleControllerCommand(command: ControllerNavCommand): boolean {
    if (!this.running) return false;
    if (command === 'confirm' || command === 'primary') {
      this.handleSwing();
      return true;
    }
    if (command === 'cancel' || command === 'menu') {
      this.handleAbort();
      return true;
    }
    return false;
  }

  private onSceneUpdate(_time: number, delta: number): void {
    this.update(delta);
  }

  private createOverlay(): void {
    const scene = this.config.scene;
    this.container = scene.add.container(0, 0).setDepth(100);

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Dark background overlay
    const bg = scene.add.rectangle(centerX, centerY, width, height, 0x000000, 0.5).setOrigin(0.5);
    this.container.add(bg);

    // Field
    const field = scene.add.graphics().setDepth(100);
    const fieldW = Math.min(420, width - 80);
    const fieldH = Math.min(300, height - 220);
    const fieldX = centerX - fieldW / 2;
    const fieldY = centerY - fieldH / 2 - 20;

    // Grass
    field.fillStyle(0x1e5c2f, 0.95);
    field.fillRect(fieldX, fieldY, fieldW, fieldH);

    // Diamond (rotated square)
    const inset = fieldW * 0.28;
    field.lineStyle(3, 0xf5f0e6, 0.9);
    field.strokePoints(
      [
        { x: fieldX + inset, y: fieldY + inset },
        { x: fieldX + fieldW - inset, y: fieldY + inset },
        { x: fieldX + fieldW - inset, y: fieldY + fieldH - inset },
        { x: fieldX + inset, y: fieldY + fieldH - inset },
      ],
      true,
    );

    // Pitcher's mound
    const moundX = centerX;
    const moundY = centerY - 20;
    field.fillStyle(0xc9a26b, 0.95);
    field.fillCircle(moundX, moundY, 10);

    // Home plate
    field.fillStyle(0xffffff, 1);
    field.fillTriangle(
      centerX - 8,
      fieldY + fieldH - inset - 4,
      centerX + 8,
      fieldY + fieldH - inset - 4,
      centerX,
      fieldY + fieldH - inset + 10,
    );

    this.moundPosition = { x: moundX, y: moundY };
    this.platePosition = { x: centerX, y: fieldY + fieldH - inset };

    // Ball
    this.ballSprite = scene.add.graphics().setDepth(102);
    this.container.add(this.ballSprite);

    // Timing meter (plate-space 0.55 .. 1.45)
    const meter = scene.add.graphics().setDepth(102);
    const meterWidth = Math.min(360, width - 100);
    const meterX = centerX - meterWidth / 2;
    const meterY = centerY + fieldH / 2 + 18;
    this.meterRect = { x: meterX, y: meterY, width: meterWidth };

    meter.fillStyle(0x333333, 1);
    meter.fillRect(meterX, meterY, meterWidth, 14);

    // Foul band
    const foulWidth = (SWING_WINDOWS.foul * 2 * meterWidth) / BaseballMinigame.METER_RANGE;
    meter.fillStyle(0xffaa44, 0.5);
    meter.fillRect(centerX - foulWidth / 2, meterY + 1, foulWidth, 4);

    // Sweet spot band (home-run window centered on the plate)
    const bandWidth = (SWING_WINDOWS['home-run'] * 2 * meterWidth) / BaseballMinigame.METER_RANGE;
    meter.fillStyle(0x44ff44, 0.9);
    meter.fillRect(centerX - bandWidth / 2, meterY - 3, bandWidth, 20);

    this.meterMarker = scene.add.graphics().setDepth(103);
    this.container.add(this.meterMarker);

    // Pitch name
    this.pitchNameText = scene.add
      .text(centerX, centerY - fieldH / 2 - 44, '', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.container.add(this.pitchNameText);

    // Result + distance
    this.resultText = scene.add
      .text(centerX, centerY - 10, '', {
        fontFamily: 'monospace',
        fontSize: '34px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.container.add(this.resultText);

    this.distanceText = scene.add
      .text(centerX, centerY + 26, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#aef7c0',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.container.add(this.distanceText);

    // Control hint
    this.hintText = scene.add
      .text(centerX, height - 42, this.getControlHint(), {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#cccccc',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.container.add(this.hintText);
  }

  private getControlHint(): string {
    const hint = (key: string, fallback: string): string => {
      const resolved = i18n.getFeatureString(key);
      return resolved !== key ? resolved : fallback;
    };
    if (this.inputMode === 'controller') {
      return hint('baseballSwingHintController', 'Press A to swing   B: Walk away');
    }
    if (this.inputMode === 'mobile') {
      return hint('baseballSwingHintMobile', 'Tap the INTERACT button to swing!');
    }
    return hint('baseballSwingHint', 'Press SPACE to swing!   ESC: Walk away');
  }

  private setupInput(): void {
    const kb = this.config.scene.input.keyboard;
    if (kb) {
      this.swingKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.enterKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      this.escapeKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

      this.escapeKey.on('down', () => {
        this.handleAbort();
      });
    }
  }

  private update(delta: number): void {
    if (!this.running || !this.activeState) return;

    const clampedDelta = Math.min(delta, 100);

    // Result display countdown
    if (this.pendingResult) {
      this.resultTimerMs -= clampedDelta;
      if (this.resultTimerMs <= 0) {
        const result = this.pendingResult;
        this.pendingResult = null;
        this.config.onComplete(result);
        this.stop();
      }
      return;
    }

    // Abort
    if (this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.handleAbort();
      return;
    }

    // Swing
    if (
      (this.swingKey && Phaser.Input.Keyboard.JustDown(this.swingKey)) ||
      (this.enterKey && Phaser.Input.Keyboard.JustDown(this.enterKey))
    ) {
      this.handleSwing();
      return;
    }

    // Advance the pitch
    const tickResult = this.config.baseballRegistry.tickPitching(this.activeState, clampedDelta);
    this.activeState = tickResult.state;

    if (this.activeState.complete && tickResult.result) {
      this.showResult(tickResult.result, 1000);
      return;
    }

    this.updateField();
  }

  private handleSwing(): void {
    if (!this.running || !this.activeState || this.pendingResult) return;
    const swingResult = this.config.baseballRegistry.swing(this.activeState);
    this.activeState = swingResult.state;
    if (swingResult.result) {
      this.showResult(swingResult.result, swingResult.result.hit ? 1400 : 1000);
    }
  }

  private handleAbort(): void {
    if (!this.running || !this.activeState || this.pendingResult) return;
    const result = this.config.baseballRegistry.abortPitch(this.activeState);
    this.showResult(result, 800);
  }

  private showResult(result: BaseballSessionResult, durationMs: number): void {
    this.pendingResult = result;
    this.resultTimerMs = durationMs;

    let label: string;
    let color: string;
    if (!result.hit && result.reason === 'playerAbort') {
      label = i18n.getFeatureString('baseballWalkedAway');
      color = '#cccccc';
    } else {
      const outcomeKey = `baseball${result.outcome.charAt(0).toUpperCase() + result.outcome.slice(1)}`;
      const resolved = i18n.getFeatureString(outcomeKey);
      label = resolved !== outcomeKey ? resolved : result.outcome.toUpperCase();
      if (result.outcome === 'home-run') color = '#ffd700';
      else if (result.outcome === 'strike') color = '#ff6b6b';
      else if (result.outcome === 'foul') color = '#ffaa44';
      else color = '#44ff44';
    }

    if (this.resultText) {
      this.resultText.setVisible(true);
      this.resultText.setColor(color);
      this.resultText.setText(label);
    }

    if (this.distanceText) {
      this.distanceText.setVisible(true);
      if (result.hit && result.distance > 0) {
        const distanceLabel = i18n.getFeatureString('baseballDistanceLabel');
        this.distanceText.setText(`${distanceLabel}: ${result.distance} ft`);
      } else {
        this.distanceText.setText('');
      }
    }
  }

  private updateField(): void {
    if (!this.activeState) return;
    const position = Math.min(this.activeState.pitchPosition, 1.2);
    const drift = BaseballMinigame.CURVE_DIRECTION[this.activeState.pitch.typeId] ?? 0;
    const lateral = Math.sin(Math.PI * position) * drift * 46;

    if (this.ballSprite) {
      this.ballSprite.clear();
      const x = this.moundPosition.x + lateral;
      const y = this.moundPosition.y + (this.platePosition.y - this.moundPosition.y) * position;
      this.ballSprite.fillStyle(0xffffff, 1);
      this.ballSprite.fillCircle(x, y, 7);
      this.ballSprite.lineStyle(1, 0xff4444, 1);
      this.ballSprite.strokeCircle(x, y, 7);
    }

    if (this.meterMarker) {
      this.meterMarker.clear();
      const clamped = Math.min(this.activeState.pitchPosition, 1.45);
      const t = (clamped - BaseballMinigame.METER_START) / BaseballMinigame.METER_RANGE;
      const markerX = this.meterRect.x + t * this.meterRect.width;
      const nearPlate = Math.abs(this.activeState.pitchPosition - 1) <= SWING_WINDOWS['home-run'];
      this.meterMarker.fillStyle(nearPlate ? 0x44ff44 : 0xffffff, 1);
      this.meterMarker.fillRect(markerX - 2, this.meterRect.y - 4, 4, 22);
    }

    if (this.pitchNameText) {
      this.pitchNameText.setText(this.activeState.pitch.name);
    }
  }

  private cleanup(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    this.ballSprite = null;
    this.meterMarker = null;
    this.pitchNameText = null;
    this.resultText = null;
    this.distanceText = null;
    this.hintText = null;
    this.activeState = null;
    this.pendingResult = null;
    this.resultTimerMs = 0;
    this.swingKey = null;
    this.enterKey = null;
    this.escapeKey = null;
  }
}
