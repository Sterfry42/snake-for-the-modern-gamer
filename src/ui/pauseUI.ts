import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import { i18n } from '../i18n/i18nManager.js';
import { getPrimaryBindingLabelForDisplay, type InputModeId } from '../input/controlActions.js';

const PAUSE_BUTTON_WIDTH = 110;
const PAUSE_BUTTON_HEIGHT = 36;
const PAUSE_BUTTON_PADDING = 12;
const PAUSE_GAP = 6;
const PAUSE_MARGIN = 16;

const PAUSE_COLOR = 0x2a2a3a;
const PAUSE_BORDER_COLOR = 0xff9944;
const PAUSE_HOVER_COLOR = 0x3a3a4a;
const PAUSE_HOVER_BORDER = 0xffcc7e;

export class PauseUI {
  private pauseButton?: Phaser.GameObjects.Container;
  private pauseBg?: Phaser.GameObjects.Rectangle;
  private pauseLabelText?: Phaser.GameObjects.Text;
  private scene: SnakeScene;
  private inputMode: InputModeId = 'keyboardMouse';

  constructor(scene: SnakeScene) {
    this.scene = scene;
    this.scene.events.once(Phaser.Scenes.Events.CREATE, this.build.bind(this));
  }

  private build(): void {
    const labelStr = this.getPauseLabel();
    const tempText = this.scene.add.text(0, 0, labelStr, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
    });
    const textWidth = tempText.width;
    tempText.destroy();

    const buttonWidth = Math.max(PAUSE_BUTTON_WIDTH, textWidth + PAUSE_BUTTON_PADDING * 2);
    const buttonHeight = PAUSE_BUTTON_HEIGHT;

    // Position to the right of the Save button (which starts at SAVE_MARGIN)
    // We'll compute the Save button's position from SaveUI's constants
    const saveButtonWidth = Math.max(110, textWidth + 24);
    const saveMargin = 16;
    const saveGap = 6;
    const x = saveMargin + saveButtonWidth + saveGap;
    const y = this.scene.scale.height - saveMargin - buttonHeight;

    // Background rectangle with rounded corners
    const bg = this.scene.add
      .rectangle(0, 0, buttonWidth, buttonHeight, PAUSE_COLOR, 0.85)
      .setStrokeStyle(1.5, PAUSE_BORDER_COLOR, 0.6)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    // "PAUSE [key]" label
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
        bg.setFillStyle(PAUSE_HOVER_COLOR, 0.9);
        bg.setStrokeStyle(1.5, PAUSE_HOVER_BORDER, 0.9);
        label.setColor('#ffcc7e');
      })
      .on('pointerout', () => {
        bg.setFillStyle(PAUSE_COLOR, 0.85);
        bg.setStrokeStyle(1.5, PAUSE_BORDER_COLOR, 0.6);
        label.setColor('#ffffff');
      })
      .on('pointerdown', () => this.togglePause());

    const container = this.scene.add.container(x, y, [bg, hitArea, label]).setDepth(40);

    this.pauseButton = container;
    this.pauseBg = bg;
    this.pauseLabelText = label;
  }

  private togglePause(): void {
    this.scene.togglePauseMenu();
  }

  isVisible(): boolean {
    return true;
  }

  updateVisibility(): void {
    const suppressed = !!this.scene.getFlag<boolean>('ui.suppressHud');
    this.pauseLabelText?.setText(this.getPauseLabel());
    this.pauseButton?.setVisible(!suppressed);
  }

  setInputMode(mode: InputModeId): void {
    this.inputMode = mode;
    this.pauseLabelText?.setText(this.getPauseLabel());
  }

  private getPauseLabel(): string {
    return `${i18n.getFeatureString('pauseButton') ?? 'PAUSE'} [${getPrimaryBindingLabelForDisplay('menu.pause', this.inputMode)}]`;
  }
}

export default PauseUI;
