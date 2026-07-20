import Phaser from 'phaser';
import {
  createArcadeSnakeRun,
  finalizeArcadeRun,
  getArcadeMainGamePayout,
  getArcadeUnbankedPayout,
  queueArcadeDirection,
  tickArcadeSnake,
} from './arcadeSnakeLogic.js';
import {
  getArcadeCorruptionTier,
  getArcadeDeadPixelCount,
  getArcadeGlitchPressure,
} from './arcadeSnakeCorruption.js';
import { formatArcadeQuest } from './arcadeSnakeQuests.js';
import {
  ARCADE_GRID_HEIGHT,
  ARCADE_GRID_WIDTH,
  ARCADE_TICK_MS,
  type ArcadeDirection,
  type ArcadeDeadPixel,
  type ArcadeSnakeRunState,
  type ArcadeSnakeSaveData,
  type ArcadeTickEvent,
  type ArcadeTilePosition,
} from './arcadeSnakeTypes.js';
import {
  getPrimaryBindingLabelForDisplay,
  isKeyboardInputForAction,
  type InputModeId,
} from '../input/controlActions.js';

export interface ArcadeSnakeRendererOptions {
  saveData: ArcadeSnakeSaveData;
  hatName: string;
  onBankScore: (payout: number) => void;
  onRunStarted?: () => void;
  onBlueScreen?: () => void;
  onSaveDataChanged: (save: ArcadeSnakeSaveData) => void;
  onClose: () => void;
  setDennisBossMusic?: (active: boolean) => void;
  playEffect?: (
    effect:
      | 'apple'
      | 'golden'
      | 'scurry'
      | 'barrier'
      | 'corrupted'
      | 'corrupted-hum'
      | 'level'
      | 'quest'
      | 'blue-screen'
      | 'dennis'
      | 'input-lost'
      | 'input-rejected'
      | 'resize'
      | 'game-over'
      | 'quit',
  ) => void;
  setMusicState?: (state: 'run' | 'paused' | 'corrupted' | 'stopped') => void;
}

const APPLE_COLORS = {
  regular: 0xe84a5f,
  golden: 0xffd166,
  scurry: 0xff9f1c,
  barrier: 0xff5d3a,
  corrupted: 0xb33a4a,
} as const;

export class ArcadeSnakeRenderer {
  private root: Phaser.GameObjects.Container | null = null;
  private frame: Phaser.GameObjects.Rectangle | null = null;
  private titleText: Phaser.GameObjects.Text | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private glitchGraphics: Phaser.GameObjects.Graphics | null = null;
  private crtGraphics: Phaser.GameObjects.Graphics | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private questText: Phaser.GameObjects.Text | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;
  private overlayText: Phaser.GameObjects.Text | null = null;
  private crashScreen: Phaser.GameObjects.Rectangle | null = null;
  private crashText: Phaser.GameObjects.Text | null = null;
  private inputErrorPanel: Phaser.GameObjects.Container | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;
  private timers = new Set<Phaser.Time.TimerEvent>();
  private run: ArcadeSnakeRunState | null = null;
  private deadPixels: ArcadeDeadPixel[] = [];
  private finalized = false;
  private bankedPayout = 0;
  private blueScreenActive = false;
  private systemPauseActive = false;
  private lightModeActive = false;
  private snakeHidden = false;
  private hostileTextUntilMs = 0;
  private hostileTextPermanent = false;
  private hostileTitle = 'HELP US';
  private gridOrigin = { x: 56, y: 94 };
  private readonly tileSize = 26;
  private windowWidth = 560;
  private windowHeight = 500;
  private currentTickDelay = ARCADE_TICK_MS;
  private inputMode: InputModeId = 'keyboardMouse';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: ArcadeSnakeRendererOptions,
  ) {}

  setInputMode(mode: InputModeId): void {
    this.inputMode = mode;
    if (this.statusText && !this.run?.isPaused && !this.run?.isGameOver) {
      this.statusText.setText(this.getActiveControlHint());
    }
    this.render();
  }

  startRun(): void {
    this.timer?.remove(false);
    this.timer = null;
    for (const timer of this.timers) timer.remove(false);
    this.timers.clear();
    this.destroyObjects();
    this.finalized = false;
    this.bankedPayout = 0;
    this.blueScreenActive = false;
    this.systemPauseActive = false;
    this.hostileTextUntilMs = 0;
    this.hostileTextPermanent = false;
    this.hostileTitle = 'HELP US';
    this.run = createArcadeSnakeRun(this.options.saveData);
    this.options.onRunStarted?.();
    this.deadPixels = this.options.saveData.deadPixels.map((pixel) => ({ ...pixel }));
    this.options.onSaveDataChanged(this.options.saveData);
    this.build();
    this.refreshDeadPixels();
    this.render();
    this.options.setMusicState?.('run');
    this.scheduleNextStep();
  }

  handleKeyDown(key: string): boolean {
    const run = this.run;
    if (!run) return false;
    if (key === 'q') {
      this.quit();
      return true;
    }
    if (
      isKeyboardInputForAction(key, 'menu.pause') &&
      !run.isGameOver &&
      !this.blueScreenActive &&
      !this.systemPauseActive
    ) {
      run.isPaused = !run.isPaused;
      if (!run.isPaused) {
        run.disabledDirectionCooldownUntilTick = Math.max(
          run.disabledDirectionCooldownUntilTick ?? 0,
          run.tick + Math.ceil(8_000 / ARCADE_TICK_MS),
        );
      }
      this.options.setMusicState?.(run.isPaused ? 'paused' : 'run');
      this.render();
      return true;
    }
    if (run.isGameOver && (isKeyboardInputForAction(key, 'menu.pause') || key === 'enter')) {
      this.startRun();
      return true;
    }
    if (run.isPaused && key === 'h' && this.options.saveData.questCapUnlocked) {
      this.options.saveData.questCapEquipped = !this.options.saveData.questCapEquipped;
      run.arcadeHat = this.options.saveData.questCapEquipped ? 'Quest Cap' : 'None';
      this.options.onSaveDataChanged(this.options.saveData);
      this.render();
      return true;
    }
    if (run.isPaused || run.isGameOver || this.blueScreenActive) return true;
    const direction = this.directionForKey(key);
    if (!direction) return false;
    const events = queueArcadeDirection(run, direction);
    this.handleEvents(events);
    return true;
  }

  close(): void {
    this.destroy();
    this.options.onClose();
  }

  destroy(): void {
    this.timer?.remove(false);
    this.timer = null;
    for (const timer of this.timers) timer.remove(false);
    this.timers.clear();
    this.options.setMusicState?.('stopped');
    this.options.setDennisBossMusic?.(false);
    this.destroyObjects();
    this.run = null;
  }

  isOpen(): boolean {
    return Boolean(this.root);
  }

  private build(): void {
    const width = Math.min(560, this.scene.scale.width - 32);
    const height = Math.min(500, this.scene.scale.height - 24);
    this.windowWidth = width;
    this.windowHeight = height;
    const x = (this.scene.scale.width - width) / 2;
    const y = (this.scene.scale.height - height) / 2;
    const dimmer = this.scene.add
      .rectangle(-x, -y, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.82)
      .setOrigin(0);
    this.frame = this.scene.add
      .rectangle(0, 0, width, height, 0x050a08, 0.99)
      .setOrigin(0)
      .setStrokeStyle(4, 0x58d66b);
    this.titleText = this.scene.add
      .text(width / 2, 16, 'SNAKE FOR THE MODERN SNAKE', {
        fontFamily: 'monospace',
        fontSize: '21px',
        color: '#8dff9d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);
    this.scoreText = this.scene.add.text(28, 51, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    });
    this.gridOrigin = {
      x: Math.floor((width - ARCADE_GRID_WIDTH * this.tileSize) / 2),
      y: 82,
    };
    this.gridGraphics = this.scene.add.graphics();
    this.glitchGraphics = this.scene.add.graphics();
    this.crtGraphics = this.scene.add.graphics();
    this.questText = this.scene.add.text(28, height - 70, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#ffd166',
      wordWrap: { width: width - 56 },
    });
    this.statusText = this.scene.add
      .text(width / 2, height - 34, this.getActiveControlHint(), {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#a9b8ad',
      })
      .setOrigin(0.5);
    this.overlayText = this.scene.add
      .text(width / 2, height / 2, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        align: 'center',
        color: '#ffffff',
        backgroundColor: '#07110a',
        padding: { left: 20, right: 20, top: 16, bottom: 16 },
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.crashScreen = this.scene.add
      .rectangle(0, 0, width, height, 0x0078d7, 1)
      .setOrigin(0)
      .setVisible(false);
    this.crashText = this.scene.add
      .text(54, 52, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        lineSpacing: 12,
        wordWrap: { width: width - 108 },
      })
      .setVisible(false);
    this.root = this.scene.add
      .container(x, y, [
        dimmer,
        this.frame,
        this.titleText,
        this.scoreText,
        this.gridGraphics,
        this.glitchGraphics,
        this.questText,
        this.statusText,
        this.overlayText,
        this.crtGraphics,
        this.crashScreen,
        this.crashText,
      ])
      .setDepth(100);
  }

  private step(): void {
    if (!this.run || this.blueScreenActive) return;
    const result = tickArcadeSnake(
      this.run,
      this.options.saveData,
      Math.random,
      this.currentTickDelay,
    );
    this.run = result.state;
    this.bankScoreProgress();
    this.handleEvents(result.events);
    this.updateCorruptedAppleHum();
    this.render();
    this.scheduleNextStep();
  }

  private scheduleNextStep(): void {
    this.timer?.remove(false);
    if (!this.run || this.blueScreenActive) return;
    this.currentTickDelay = Math.max(
      65,
      Math.min(260, Math.round(ARCADE_TICK_MS / Math.max(0.1, this.run.speedMultiplier))),
    );
    this.timer = this.scene.time.delayedCall(this.currentTickDelay, () => {
      this.timer = null;
      this.step();
    });
  }

  private handleEvents(events: readonly ArcadeTickEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'apple-eaten':
          this.options.playEffect?.(
            event.appleType === 'golden'
              ? 'golden'
              : event.appleType === 'scurry'
                ? 'scurry'
                : event.appleType === 'barrier'
                  ? 'barrier'
                  : event.appleType === 'corrupted'
                    ? 'corrupted'
                    : 'apple',
          );
          this.flashStatus(`+${event.scoreGained}`, '#ffffff', 260);
          break;
        case 'level-up':
          this.options.playEffect?.('level');
          this.playLevelUpJuice(event.level);
          break;
        case 'quest-added':
          this.flashStatus('NEW QUEST', '#9ad1ff', 600);
          break;
        case 'quest-complete':
          this.options.playEffect?.('quest');
          if (
            this.run &&
            this.run.questsCompletedThisRun >= 2 &&
            !this.options.saveData.questCapUnlocked
          ) {
            this.options.saveData.questCapUnlocked = true;
            this.options.saveData.questCapEquipped = false;
            this.options.onSaveDataChanged(this.options.saveData);
            this.flashStatus('QUEST CAP UNLOCKED - EQUIP IT WHILE PAUSED', '#8dff9d', 1700);
          } else {
            this.flashStatus('QUEST COMPLETE', '#8dff9d', 1000);
          }
          break;
        case 'corrupted-apple-eaten':
          this.refreshDeadPixels();
          this.options.setMusicState?.('corrupted');
          this.options.onSaveDataChanged(this.options.saveData);
          break;
        case 'scurry-moved':
          this.drawAfterimage(event.from);
          break;
        case 'blue-screen':
          this.options.onBlueScreen?.();
          this.playFatalBlueScreen();
          break;
        case 'system-pause':
          this.playSystemPause(event.durationMs);
          break;
        case 'speed-shift':
          this.playSpeedShift(event.multiplier);
          break;
        case 'popup-resize-glitch':
          this.options.playEffect?.('resize');
          this.playSevereResizeGlitch(event.tier);
          break;
        case 'visual-glitch':
          this.playLargeVisualGlitch(event.glitch, event.tier);
          break;
        case 'direction-failure-start':
          this.options.playEffect?.('input-lost');
          this.flashStatus(`${event.direction.toUpperCase()} INPUT LOST`, '#ff6b9d', 900);
          this.showInputError(event.direction, event.durationTicks);
          this.playLargeVisualGlitch(
            'row-shift',
            getArcadeCorruptionTier(
              getArcadeGlitchPressure(this.options.saveData.stats, this.run!),
            ),
          );
          break;
        case 'direction-failure-input-rejected':
          this.options.playEffect?.('input-rejected');
          this.flashStatus(`${event.direction.toUpperCase()} INPUT LOST`, '#ff6b9d', 220);
          this.inputErrorPanel?.setX(this.windowWidth / 2 + (Math.random() < 0.5 ? -8 : 8));
          this.addTimer(70, () => this.inputErrorPanel?.setX(this.windowWidth / 2));
          break;
        case 'game-over':
          this.options.playEffect?.('game-over');
          this.finishRun(false);
          break;
      }
    }
  }

  private finishRun(quit: boolean): void {
    if (!this.run || this.finalized) return;
    this.finalized = true;
    finalizeArcadeRun(this.options.saveData, this.run);
    this.bankScoreProgress();
    this.options.onSaveDataChanged(this.options.saveData);
    if (quit) return;
    this.run.isGameOver = true;
    this.options.setMusicState?.('paused');
    this.render();
  }

  private quit(): void {
    if (this.run && !this.finalized) this.finishRun(true);
    this.options.playEffect?.('quit');
    this.close();
  }

  private bankScoreProgress(): void {
    if (!this.run) return;
    const earnedPayout = getArcadeMainGamePayout(this.run.score);
    const unbanked = getArcadeUnbankedPayout(this.run.score, this.bankedPayout);
    if (unbanked <= 0) return;
    this.bankedPayout = earnedPayout;
    this.options.onBankScore(unbanked);
  }

  private render(): void {
    const run = this.run;
    const graphics = this.gridGraphics;
    if (!run || !graphics || !this.scoreText || !this.questText || !this.overlayText) return;
    graphics.clear();
    const gridWidth = ARCADE_GRID_WIDTH * this.tileSize;
    const gridHeight = ARCADE_GRID_HEIGHT * this.tileSize;
    graphics
      .fillStyle(this.lightModeActive ? 0xf3f4ef : 0x010403, 1)
      .fillRect(this.gridOrigin.x, this.gridOrigin.y, gridWidth, gridHeight);
    graphics.lineStyle(1, this.lightModeActive ? 0xc8ccc4 : 0x14351a, 0.55);
    for (let x = 0; x <= ARCADE_GRID_WIDTH; x += 1) {
      graphics.lineBetween(
        this.gridOrigin.x + x * this.tileSize,
        this.gridOrigin.y,
        this.gridOrigin.x + x * this.tileSize,
        this.gridOrigin.y + gridHeight,
      );
    }
    for (let y = 0; y <= ARCADE_GRID_HEIGHT; y += 1) {
      graphics.lineBetween(
        this.gridOrigin.x,
        this.gridOrigin.y + y * this.tileSize,
        this.gridOrigin.x + gridWidth,
        this.gridOrigin.y + y * this.tileSize,
      );
    }
    for (const tile of run.deletedTiles) this.drawDeletedTile(graphics, tile);
    this.drawApple(graphics, run.apple.position, run.apple.type);
    if (!this.snakeHidden) {
      run.snake.forEach((segment, index) =>
        this.drawTile(graphics, segment, index === 0 ? 0x8dff9d : 0x36b94e, index === 0 ? 2 : 4),
      );
      if (run.arcadeHat !== 'None') this.drawQuestHat(graphics, run.snake[0]!);
    }
    for (const pixel of this.deadPixels) {
      graphics.fillStyle(pixel.color, 0.94).fillRect(pixel.x, pixel.y, pixel.size, pixel.size);
    }
    this.drawCrtOverlay(run.tick);

    this.scoreText.setText(
      `Score: ${run.score}     Level: ${run.level}     Length: ${run.snake.length}`,
    );
    const quest = run.quests.find((entry) => !entry.completed) ?? run.quests[0];
    this.questText.setText(
      quest ? `Quest: ${formatArcadeQuest(quest).slice(4)}` : 'Quest: None yet',
    );
    this.overlayText.setVisible(run.isPaused || run.isGameOver || this.systemPauseActive);
    if (this.systemPauseActive) {
      this.overlayText.setText(this.getPauseHeading());
    } else if (run.isPaused) {
      this.overlayText.setText(
        [
          'PAUSED',
          '',
          `Level: ${run.level}`,
          `Current Score: ${run.score}`,
          `Lifetime Score: ${this.options.saveData.stats.lifetimeScore}`,
          `Quest Cap: ${
            this.options.saveData.questCapUnlocked
              ? this.options.saveData.questCapEquipped
                ? 'Equipped'
                : 'Unequipped'
              : 'Locked'
          }`,
          ...(this.options.saveData.questCapUnlocked
            ? [`H: ${this.options.saveData.questCapEquipped ? 'Unequip' : 'Equip'}`]
            : []),
          '',
          'Quests:',
          ...(run.quests.length > 0 ? run.quests.map(formatArcadeQuest) : ['[ ] None yet']),
          '',
          `${getPrimaryBindingLabelForDisplay('menu.pause', this.inputMode)}: Resume`,
          `${getPrimaryBindingLabelForDisplay('back.cancel', this.inputMode)}: Quit to main game`,
        ].join('\n'),
      );
    } else if (run.isGameOver) {
      this.overlayText.setText(
        [
          'GAME OVER',
          '',
          `Score: ${run.score}`,
          `High Score: ${this.options.saveData.stats.highScore}`,
          `Lifetime Score: ${this.options.saveData.stats.lifetimeScore}`,
          `Main-game score gained: +${getArcadeMainGamePayout(run.score)}`,
          '',
          `${getPrimaryBindingLabelForDisplay('interact.confirm', this.inputMode)}: Play Again`,
          `${getPrimaryBindingLabelForDisplay('back.cancel', this.inputMode)}: Quit to main game`,
        ].join('\n'),
      );
    }
  }

  private drawTile(
    graphics: Phaser.GameObjects.Graphics,
    position: ArcadeTilePosition,
    color: number,
    inset: number,
  ): void {
    graphics
      .fillStyle(0x001200, 0.9)
      .fillRect(
        this.gridOrigin.x + position.x * this.tileSize + inset - 1,
        this.gridOrigin.y + position.y * this.tileSize + inset,
        this.tileSize - inset * 2 + 2,
        this.tileSize - inset * 2 + 1,
      );
    graphics
      .fillStyle(color, 1)
      .fillRect(
        this.gridOrigin.x + position.x * this.tileSize + inset,
        this.gridOrigin.y + position.y * this.tileSize + inset,
        this.tileSize - inset * 2,
        this.tileSize - inset * 2,
      );
  }

  private drawApple(
    graphics: Phaser.GameObjects.Graphics,
    position: ArcadeTilePosition,
    type: ArcadeSnakeRunState['apple']['type'],
  ): void {
    this.drawTile(
      graphics,
      position,
      type === 'corrupted' ? APPLE_COLORS.regular : APPLE_COLORS[type],
      5,
    );
    if (type === 'barrier') {
      const x = this.gridOrigin.x + position.x * this.tileSize;
      const y = this.gridOrigin.y + position.y * this.tileSize;
      graphics.lineStyle(3, 0xffd166, 0.95);
      for (const direction of this.run?.apple.protectedDirections ?? []) {
        if (direction === 'right') graphics.lineBetween(x + 2, y + 3, x + 2, y + this.tileSize - 3);
        if (direction === 'left')
          graphics.lineBetween(
            x + this.tileSize - 2,
            y + 3,
            x + this.tileSize - 2,
            y + this.tileSize - 3,
          );
        if (direction === 'down') graphics.lineBetween(x + 3, y + 2, x + this.tileSize - 3, y + 2);
        if (direction === 'up')
          graphics.lineBetween(
            x + 3,
            y + this.tileSize - 2,
            x + this.tileSize - 3,
            y + this.tileSize - 2,
          );
      }
    } else if (type === 'corrupted' && this.run) {
      const x = this.gridOrigin.x + position.x * this.tileSize;
      const y = this.gridOrigin.y + position.y * this.tileSize;
      const tell = this.run.apple.visualTell;
      const phase = this.run.tick % 6;
      if (tell === 'scanline') {
        graphics.fillStyle(0x7c3aed, 0.5).fillRect(x + 4, y + 7 + phase * 2, this.tileSize - 8, 2);
      } else if (tell === 'split') {
        graphics.fillStyle(0x48d7ff, 0.42).fillRect(x + 2 + phase, y + 4, 4, this.tileSize - 8);
      } else if (tell === 'blink' && phase < 2) {
        graphics
          .fillStyle(0x050a08, 0.55)
          .fillRect(x + 4, y + 4, this.tileSize - 8, this.tileSize - 8);
      } else if (tell === 'static') {
        for (let index = 0; index < 4; index += 1) {
          graphics
            .fillStyle(index % 2 ? 0xffffff : 0x7c3aed, 0.5)
            .fillRect(x + 4 + ((index * 7 + phase) % 15), y + 5 + ((index * 5) % 14), 2, 2);
        }
      }
    }
  }

  private drawDeletedTile(
    graphics: Phaser.GameObjects.Graphics,
    position: ArcadeTilePosition,
  ): void {
    const x = this.gridOrigin.x + position.x * this.tileSize;
    const y = this.gridOrigin.y + position.y * this.tileSize;
    graphics.fillStyle(0x000000, 1).fillRect(x + 1, y + 1, this.tileSize - 2, this.tileSize - 2);
    graphics
      .lineStyle(1, 0x7c3aed, 0.55)
      .strokeRect(x + 3, y + 3, this.tileSize - 6, this.tileSize - 6);
  }

  private drawQuestHat(graphics: Phaser.GameObjects.Graphics, head: ArcadeTilePosition): void {
    const x = this.gridOrigin.x + head.x * this.tileSize;
    const y = this.gridOrigin.y + head.y * this.tileSize;
    graphics.fillStyle(0xffd166, 1).fillRect(x + 5, y + 1, this.tileSize - 10, 5);
    graphics.fillStyle(0x4da3ff, 1).fillRect(x + 9, y - 3, this.tileSize - 18, 5);
  }

  private refreshDeadPixels(): void {
    const run = this.run;
    if (!run) return;
    const pressure = getArcadeGlitchPressure(this.options.saveData.stats, run);
    const tier = getArcadeCorruptionTier(pressure);
    const count = getArcadeDeadPixelCount(tier, Math.random);
    const targetCount =
      tier === 0
        ? this.deadPixels.length
        : Math.min(80, Math.max(count, this.deadPixels.length + 1));
    const colors = [0x000000, 0xffffff, 0x8b5cf6, 0xff2d95];
    while (this.deadPixels.length < targetCount) {
      this.deadPixels.push({
        x: 4 + Math.floor(Math.random() * Math.max(1, this.windowWidth - 12)),
        y: 4 + Math.floor(Math.random() * Math.max(1, this.windowHeight - 12)),
        color: colors[Math.floor(Math.random() * colors.length)]!,
        size: 2 + Math.floor(Math.random() * 4),
      });
    }
    this.options.saveData.deadPixels = this.deadPixels.map((pixel) => ({ ...pixel }));
    this.options.onSaveDataChanged(this.options.saveData);
  }

  private drawCrtOverlay(tick: number): void {
    if (!this.crtGraphics) return;
    this.crtGraphics.clear();
    const offset = tick % 4;
    for (let scanY = -4 + offset; scanY < this.windowHeight; scanY += 4) {
      this.crtGraphics.fillStyle(0x000000, 0.1).fillRect(0, scanY, this.windowWidth, 1);
    }
    this.crtGraphics
      .lineStyle(2, 0x6cff8a, 0.06)
      .strokeRoundedRect(2, 2, this.windowWidth - 4, this.windowHeight - 4, 8);
  }

  private playFatalBlueScreen(): void {
    if (
      !this.root ||
      !this.run ||
      !this.glitchGraphics ||
      !this.crashScreen ||
      !this.crashText ||
      this.blueScreenActive
    ) {
      return;
    }
    this.blueScreenActive = true;
    this.run.isPaused = true;
    this.timer?.remove(false);
    this.timer = null;
    this.options.setMusicState?.('stopped');
    this.options.setDennisBossMusic?.(true);
    const dennisSize = this.tileSize * 3;
    this.glitchGraphics
      .clear()
      .fillStyle(0x8b2bd1, 1)
      .fillRect(
        this.gridOrigin.x + (ARCADE_GRID_WIDTH * this.tileSize - dennisSize) / 2,
        this.gridOrigin.y + (ARCADE_GRID_HEIGHT * this.tileSize - dennisSize) / 2,
        dennisSize,
        dennisSize,
      );
    this.addTimer(1000, () => {
      this.options.playEffect?.('blue-screen');
      this.options.setDennisBossMusic?.(false);
      this.glitchGraphics?.clear();
      this.crashScreen?.setVisible(true);
      this.crashText
        ?.setText(
          [
            ':(',
            '',
            'Your device ran into a problem and needs to restart.',
            "We're just collecting some error info, and then we'll restart for you.",
            '',
            '100% complete',
            '',
            'Stop code: CRITICAL_PROCESS_DIED',
          ].join('\n'),
        )
        .setVisible(true);
      this.addTimer(1900, () => {
        if (this.run && !this.finalized) this.finishRun(true);
        this.close();
      });
    });
  }

  private playSystemPause(durationMs: number): void {
    if (!this.run || this.blueScreenActive || this.systemPauseActive) return;
    this.systemPauseActive = true;
    this.run.isPaused = true;
    this.options.setMusicState?.('paused');
    this.render();
    const tier = getArcadeCorruptionTier(
      getArcadeGlitchPressure(this.options.saveData.stats, this.run),
    );
    if (tier >= 2 && Math.random() < 0.55) {
      this.extendHostileText('QUIT NOW', tier);
      this.overlayText?.setText('QUIT NOW');
    }
    this.addTimer(durationMs, () => {
      if (!this.run || this.blueScreenActive) return;
      this.systemPauseActive = false;
      this.run.isPaused = false;
      this.options.setMusicState?.(this.run.corruptedApplesEatenThisRun > 0 ? 'corrupted' : 'run');
      this.render();
    });
  }

  private playSpeedShift(multiplier: number): void {
    if (!this.root) return;
    this.root.setRotation(multiplier > 1 ? 0.004 : -0.004);
    this.addTimer(120, () => this.root?.setRotation(0));
  }

  private playSevereResizeGlitch(tier: number): void {
    if (!this.root) return;
    const grow = 1.06 + tier * 0.035;
    const squeeze = Math.max(0.72, 0.98 - tier * 0.055);
    if (Math.random() < 0.5) {
      this.root.setScale(grow, squeeze);
    } else {
      this.root.setScale(squeeze, grow);
    }
    this.addTimer(220 + tier * 35, () => this.root?.setScale(1));
  }

  private playLargeVisualGlitch(
    glitch: Extract<ArcadeTickEvent, { type: 'visual-glitch' }>['glitch'],
    tier: number,
  ): void {
    if (!this.glitchGraphics || !this.run) return;
    const graphics = this.glitchGraphics;
    graphics.clear();
    if (glitch === 'text') {
      const original = this.scoreText?.text ?? '';
      const messages = ['HELP US', 'DO NOT CONTINUE', 'SNAKE FOR THE MODERN GAME'];
      if (tier >= 2 && Math.random() < 0.65) {
        this.extendHostileText(messages[Math.floor(Math.random() * messages.length)]!, tier);
      } else {
        this.scoreText?.setText(Math.random() < 0.5 ? 'Score: NaN     Level: -1' : 'Score: 999999');
        this.addTimer(180 + tier * 35, () => this.scoreText?.setText(original));
      }
      return;
    }
    if (glitch === 'light-mode') {
      this.lightModeActive = true;
      this.render();
      this.addTimer(180 + tier * 80, () => {
        this.lightModeActive = false;
        this.render();
      });
      return;
    }
    if (glitch === 'snake-hide') {
      this.snakeHidden = true;
      this.render();
      this.addTimer(180 + tier * 70, () => {
        this.snakeHidden = false;
        this.render();
      });
      return;
    }
    const color = Math.random() < 0.5 ? 0xffffff : 0x8b5cf6;
    if (glitch === 'row-shift') {
      const bands = Math.max(1, tier - 1);
      for (let index = 0; index < bands; index += 1) {
        const height = 8 + Math.floor(Math.random() * (10 + tier * 6));
        const y = Math.floor(Math.random() * Math.max(1, this.windowHeight - height));
        const offset = (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * tier * 18);
        graphics.fillStyle(index % 2 === 0 ? 0x050a08 : color, 0.92);
        graphics.fillRect(offset, y, this.windowWidth, height);
        for (let x = 0; x < this.windowWidth; x += 18 + Math.floor(Math.random() * 12)) {
          graphics
            .fillStyle(Math.random() < 0.5 ? 0xffffff : 0x6d28d9, 0.35)
            .fillRect(x + offset, y, 4 + Math.random() * 16, height);
        }
      }
    } else {
      graphics
        .fillStyle(color, 0.72)
        .fillRect(
          this.gridOrigin.x + Math.floor(Math.random() * 11) * this.tileSize,
          this.gridOrigin.y + Math.floor(Math.random() * 8) * this.tileSize,
          glitch === 'chunk-swap' ? this.tileSize * Math.min(6, tier + 2) : this.tileSize,
          glitch === 'chunk-swap' ? this.tileSize * Math.min(4, tier + 1) : this.tileSize,
        );
    }
    this.addTimer(80 + tier * 25, () => graphics.clear());
  }

  private drawAfterimage(position: ArcadeTilePosition): void {
    if (!this.glitchGraphics) return;
    this.glitchGraphics
      .fillStyle(0xffd166, 0.34)
      .fillRect(
        this.gridOrigin.x + position.x * this.tileSize + 5,
        this.gridOrigin.y + position.y * this.tileSize + 5,
        this.tileSize - 10,
        this.tileSize - 10,
      );
    this.addTimer(100, () => this.glitchGraphics?.clear());
  }

  private extendHostileText(message: string, tier: number): void {
    const pressure = this.run ? getArcadeGlitchPressure(this.options.saveData.stats, this.run) : 0;
    this.hostileTitle = message;
    this.titleText?.setText(message);
    if (tier >= 4 || pressure >= 50) {
      this.hostileTextPermanent = true;
      return;
    }
    const duration = 600 + pressure * 120;
    this.hostileTextUntilMs = Math.max(this.scene.time.now, this.hostileTextUntilMs) + duration;
    this.addTimer(this.hostileTextUntilMs - this.scene.time.now, () => {
      if (!this.hostileTextPermanent && this.scene.time.now >= this.hostileTextUntilMs) {
        this.titleText?.setText('SNAKE FOR THE MODERN SNAKE');
      }
    });
  }

  private getPauseHeading(): string {
    if (
      this.hostileTextPermanent ||
      (this.hostileTextUntilMs > this.scene.time.now && this.hostileTitle === 'QUIT NOW')
    ) {
      return 'QUIT NOW';
    }
    return 'PAUSED';
  }

  private showInputError(direction: ArcadeDirection, durationTicks: number): void {
    if (!this.root) return;
    this.inputErrorPanel?.destroy(true);
    const width = Math.min(340, this.windowWidth - 40);
    const height = 104;
    const shell = this.scene.add
      .rectangle(0, 0, width, height, 0xece9d8, 1)
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, 0x003c74);
    const titleBar = this.scene.add.rectangle(0, 3, width - 6, 25, 0x0058b5, 1).setOrigin(0.5, 0);
    const title = this.scene.add
      .text(-width / 2 + 12, 7, 'Input Device Error', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0, 0);
    const body = this.scene.add
      .text(
        0,
        40,
        `The input device has stopped responding.\n${direction.toUpperCase()} direction is unavailable.`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '13px',
          align: 'center',
          color: '#111111',
        },
      )
      .setOrigin(0.5, 0);
    const button = this.scene.add
      .rectangle(0, 82, 62, 18, 0xece9d8, 1)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, 0x333333);
    const buttonText = this.scene.add
      .text(0, 84, 'OK', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#111111',
      })
      .setOrigin(0.5, 0);
    this.inputErrorPanel = this.scene.add.container(this.windowWidth / 2, 48, [
      shell,
      titleBar,
      title,
      body,
      button,
      buttonText,
    ]);
    this.root.add(this.inputErrorPanel);
    this.inputErrorPanel.setAlpha(0);
    this.scene.tweens.add({
      targets: this.inputErrorPanel,
      alpha: 1,
      y: 54,
      duration: 90,
    });
    this.addTimer(Math.min(3_200, durationTicks * ARCADE_TICK_MS), () => {
      this.inputErrorPanel?.destroy(true);
      this.inputErrorPanel = null;
    });
  }

  private playLevelUpJuice(level: number): void {
    this.flashStatus(`LEVEL ${level}!`, '#fff3a8', 1200);
    this.frame?.setStrokeStyle(5, 0xfff3a8);
    this.addTimer(240, () => {
      this.frame?.setStrokeStyle(4, 0x58d66b);
    });
  }

  private flashStatus(text: string, color: string, duration: number): void {
    if (!this.statusText) return;
    const original = this.getActiveControlHint();
    this.statusText.setText(text).setColor(color);
    this.addTimer(duration, () => this.statusText?.setText(original).setColor('#a9b8ad'));
  }

  private getActiveControlHint(): string {
    return `${getPrimaryBindingLabelForDisplay('menu.pause', this.inputMode)}: Pause     ${getPrimaryBindingLabelForDisplay('back.cancel', this.inputMode)}: Quit to main game`;
  }

  private addTimer(delay: number, callback: () => void): void {
    const timer = this.scene.time.delayedCall(delay, () => {
      this.timers.delete(timer);
      callback();
    });
    this.timers.add(timer);
  }

  private directionForKey(key: string): ArcadeDirection | null {
    if (isKeyboardInputForAction(key, 'move.up')) return 'up';
    if (isKeyboardInputForAction(key, 'move.down')) return 'down';
    if (isKeyboardInputForAction(key, 'move.left')) return 'left';
    if (isKeyboardInputForAction(key, 'move.right')) return 'right';
    return null;
  }

  private updateCorruptedAppleHum(): void {
    const run = this.run;
    if (!run || run.apple.type !== 'corrupted' || run.tick % 4 !== 0) return;
    const head = run.snake[0];
    if (!head) return;
    const dx = Math.abs(head.x - run.apple.position.x);
    const dy = Math.abs(head.y - run.apple.position.y);
    const wrappedDx = Math.min(dx, ARCADE_GRID_WIDTH - dx);
    const wrappedDy = Math.min(dy, ARCADE_GRID_HEIGHT - dy);
    if (wrappedDx + wrappedDy <= 4) this.options.playEffect?.('corrupted-hum');
  }

  private destroyObjects(): void {
    this.root?.destroy(true);
    this.root = null;
    this.frame = null;
    this.titleText = null;
    this.gridGraphics = null;
    this.glitchGraphics = null;
    this.crtGraphics = null;
    this.scoreText = null;
    this.questText = null;
    this.statusText = null;
    this.overlayText = null;
    this.crashScreen = null;
    this.crashText = null;
    this.inputErrorPanel = null;
  }
}
