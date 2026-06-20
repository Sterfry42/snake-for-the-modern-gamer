import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import { i18n } from '../i18n/i18nManager.js';
import { saveManagerV2 } from '../game/saveManagerV2.js';
import { getPrimaryBindingLabelForDisplay } from '../input/controlActions.js';

const SAVE_BUTTON_WIDTH = 110;
const SAVE_BUTTON_HEIGHT = 36;
const SAVE_BUTTON_PADDING = 12;
const SAVE_BUTTON_RADIUS = 8;
const SAVE_GAP = 6;
const SAVE_MARGIN = 16;

const SAVE_COLOR = 0x1a3a2a;
const SAVE_BORDER_COLOR = 0x4da3ff;
const SAVE_HOVER_COLOR = 0x1a4a3a;
const SAVE_HOVER_BORDER = 0x7ec87e;

export class SaveUI {
  private saveButton?: Phaser.GameObjects.Container;
  private saveBg?: Phaser.GameObjects.Rectangle;
  private saveLabelText?: Phaser.GameObjects.Text;
  private seedLabel?: Phaser.GameObjects.Text;
  private saveFlash?: Phaser.GameObjects.Graphics;
  private scene: SnakeScene;

  constructor(scene: SnakeScene) {
    this.scene = scene;
    this.scene.events.once(Phaser.Scenes.Events.CREATE, this.build.bind(this));
  }

  private build(): void {
    const labelStr = this.getSaveLabel();
    const tempText = this.scene.add.text(0, 0, labelStr, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
    });
    const textWidth = tempText.width;
    tempText.destroy();

    const buttonWidth = Math.max(SAVE_BUTTON_WIDTH, textWidth + SAVE_BUTTON_PADDING * 2);
    const buttonHeight = SAVE_BUTTON_HEIGHT;

    const x = SAVE_MARGIN;
    const y = this.scene.scale.height - SAVE_MARGIN - buttonHeight;

    // Background rectangle with rounded corners
    const bg = this.scene.add
      .rectangle(0, 0, buttonWidth, buttonHeight, SAVE_COLOR, 0.85)
      .setStrokeStyle(1.5, SAVE_BORDER_COLOR, 0.6)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    // "SAVE [key]" label
    const label = this.scene.add
      .text(buttonWidth / 2, buttonHeight / 2, labelStr, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5);

    // Interactive layer (invisible, covers the whole button)
    const hitArea = bg
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        bg.setFillStyle(SAVE_HOVER_COLOR, 0.9);
        bg.setStrokeStyle(1.5, SAVE_HOVER_BORDER, 0.9);
        label.setColor('#5dd6a2');
      })
      .on('pointerout', () => {
        bg.setFillStyle(SAVE_COLOR, 0.85);
        bg.setStrokeStyle(1.5, SAVE_BORDER_COLOR, 0.6);
        label.setColor('#ffffff');
      })
      .on('pointerdown', () => this.saveGame());

    const container = this.scene.add
      .container(x, y, [bg, hitArea, label])
      .setDepth(40);

    // Seed label below the button
    const seedLabel = this.scene.add
      .text(x, y + buttonHeight + SAVE_GAP, 'Seed: ', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#6b7380',
      })
      .setOrigin(0, 0.5)
      .setDepth(39);

    // Flash graphics for save confirmation
    const flash = this.scene.add.graphics().setDepth(41).setVisible(false);

    this.saveButton = container;
    this.saveBg = bg;
    this.saveLabelText = label;
    this.seedLabel = seedLabel;
    this.saveFlash = flash;
  }

  private saveGame(): void {
    this.scene.prepareCharacterSave();
    const data = this.scene.snakeGame.getSaveData();
    const dateKey = new Date().toISOString();

    // Save to V2 with a new slot each time
    saveManagerV2.save(dateKey, data).then(() => {
      // Show a brief green flash on the button
      this.triggerSaveFlash();
    }).catch((err) => {
      console.error('[SaveUI] Failed to save game:', err);
    });

    this.scene.showQuestHintPopup(i18n.getFeatureString('gameSaved')!, '#5dd6a2');
  }

  save(): void {
    this.saveGame();
  }

  private triggerSaveFlash(): void {
    if (!this.saveFlash || !this.saveButton) return;

    this.saveFlash.clear();
    this.saveFlash.setVisible(true);

    const btnX = this.saveButton!.x;
    const btnY = this.saveButton!.y;
    const flashW = this.saveBg!.width;
    const flashH = this.saveBg!.height;

    // Draw a green glow rectangle around the button
    this.saveFlash.fillStyle(0x5dd6a2, 0.3);
    this.saveFlash.fillRoundedRect(
      btnX - flashW / 2 - 4,
      btnY - flashH / 2 - 4,
      flashW + 8,
      flashH + 8,
      SAVE_BUTTON_RADIUS + 2,
    );

    // Animate the flash fading out
    this.scene.tweens.add({
      targets: this.saveFlash,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        this.saveFlash?.setVisible(false);
        this.saveFlash?.clear();
      },
    });
  }

  isVisible(): boolean {
    return true;
  }

  updateVisibility(): void {
    const suppressed = !!this.scene.getFlag<boolean>('ui.suppressHud');
    this.saveLabelText?.setText(this.getSaveLabel());
    this.saveButton?.setVisible(!suppressed);
    this.seedLabel?.setVisible(!suppressed);
  }

  setSeed(seed: string): void {
    this.seedLabel?.setText(`Seed: ${seed}`);
  }

  private getSaveLabel(): string {
    return `${i18n.getFeatureString('saveButton') ?? 'SAVE'} [${getPrimaryBindingLabelForDisplay('save.quick')}]`;
  }
}

export default SaveUI;
