import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import { i18n } from '../i18n/i18nManager.js';
import type { ControllerNavCommand } from '../input/controllerNavigation.js';
import {
  getChoicePopupHeight,
  getChoicePopupWidth,
  normalizeChoiceOptions,
  type NormalizedChoiceOption,
} from './choicePopupModel.js';

export interface ChoiceOption {
  id: string;
  title: string;
  description: string;
}

export class ChoicePopup {
  private container?: Phaser.GameObjects.Container;
  private optionContainer?: Phaser.GameObjects.Container;
  private titleText?: Phaser.GameObjects.Text;
  private scrollHintText?: Phaser.GameObjects.Text;
  private controllerHintText?: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private optionButtons: Phaser.GameObjects.Rectangle[] = [];
  private options: NormalizedChoiceOption[] = [];
  private background?: Phaser.GameObjects.Rectangle;
  private dimmer?: Phaser.GameObjects.Rectangle;
  private optionMaskGraphics?: Phaser.GameObjects.Graphics;
  private scrollBarGraphics?: Phaser.GameObjects.Graphics;
  private onPick?: (id: string) => void;
  private scrollY = 0;
  private contentHeight = 0;
  private viewportHeight = 0;
  private selectedIndex = 0;
  private hoveredIndex = -1;
  private keyboardFocus = false;
  private controllerMode = false;
  private width = 500;
  private optionMask?: Phaser.Display.Masks.GeometryMask;

  constructor(private readonly scene: SnakeScene) {
    this.build();
    this.scene.registerChoicePopup(this);
  }

  show(title: string, options: ChoiceOption[], onPick: (id: string) => void): void {
    this.onPick = onPick;
    this.scene.setChoicePopupVisible(true);
    this.titleText?.setText(title.trim() || 'Choose');
    this.options = normalizeChoiceOptions(options);
    this.selectedIndex = Math.max(
      0,
      this.options.findIndex((option) => !option.disabled),
    );
    this.hoveredIndex = -1;
    this.keyboardFocus = false;
    // Clear old
    for (const t of this.optionTexts) t.destroy();
    for (const button of this.optionButtons) button.destroy();
    this.optionTexts = [];
    this.optionButtons = [];
    this.scrollY = 0;

    this.width = getChoicePopupWidth(this.scene.scale.width);
    const viewportX = 20;
    const contentWidth = this.width - viewportX * 2;
    const rowInset = 3;
    const baseX = rowInset + 12;
    let y = 0;
    for (const [index, opt] of this.options.entries()) {
      const label = this.scene.add.text(baseX, y + 7, `${opt.title}\n${opt.description}`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: opt.disabled ? '#8090a0' : '#ffffff',
        lineSpacing: 4,
        wordWrap: { width: contentWidth - 24, useAdvancedWrap: true },
        fixedWidth: contentWidth - 24,
        backgroundColor: 'rgba(0,0,0,0)',
        padding: { left: 0, right: 0, top: 0, bottom: 0 },
      });
      const rowHeight = Math.max(52, label.height + 14);
      const button = this.scene.add
        .rectangle(
          rowInset,
          y + rowInset,
          contentWidth - rowInset * 2,
          rowHeight - rowInset * 2,
          0x13283b,
          opt.disabled ? 0.42 : 0.72,
        )
        .setOrigin(0, 0)
        .setStrokeStyle(1, opt.disabled ? 0x33404b : 0x315a78, 0.82);
      if (!opt.disabled) {
        button
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => {
            this.keyboardFocus = false;
            this.hoveredIndex = index;
            this.selectedIndex = index;
            this.refreshSelection();
          })
          .on('pointerout', () => {
            this.hoveredIndex = -1;
            this.refreshSelection();
          })
          .on('pointerdown', () => this.pick(opt.id));
      }
      this.optionContainer?.add([button, label]);
      this.optionButtons.push(button);
      this.optionTexts.push(label);
      y += rowHeight + 10;
    }
    this.contentHeight = Math.max(0, y - 10);
    const footerHeight = this.controllerMode ? 58 : 38;
    const popupHeight = getChoicePopupHeight(
      this.scene.scale.height,
      this.contentHeight,
      footerHeight,
    );
    this.viewportHeight = Math.max(100, popupHeight - 72 - footerHeight);
    const x = (this.scene.scale.width - this.width) / 2;
    const rootY = (this.scene.scale.height - popupHeight) / 2;
    this.container?.setPosition(x, rootY);
    this.dimmer?.setPosition(-x, -rootY).setSize(this.scene.scale.width, this.scene.scale.height);
    this.background?.setSize(this.width, popupHeight);
    this.titleText
      ?.setPosition(this.width / 2, 18)
      .setWordWrapWidth(this.width - 48)
      .setFixedSize(this.width - 48, 32);
    this.optionContainer?.setPosition(viewportX, 62);
    this.scrollHintText
      ?.setText(this.contentHeight > this.viewportHeight ? i18n.getFeatureString('hintScroll') : '')
      .setPosition(this.width / 2, popupHeight - 24);
    this.controllerHintText
      ?.setPosition(this.width / 2, popupHeight - 42)
      .setFixedSize(this.width - 24, 28)
      .setAlign('center');
    this.updateMask(x, rootY);
    this.applyScroll(0);
    this.refreshSelection();
    this.container?.setVisible(true).setDepth(65);
  }

  hide(): void {
    this.container?.setVisible(false);
    this.scene.setChoicePopupVisible(false);
    this.onPick = undefined;
    this.options = [];
  }

  setDepth(depth: number): void {
    this.container?.setDepth(depth);
  }

  isVisible(): boolean {
    return Boolean(this.container?.visible);
  }

  setControllerMode(active: boolean): void {
    this.controllerMode = active;
    this.controllerHintText
      ?.setText(active ? 'LS / D-PAD: SELECT   SOUTH: CHOOSE   EAST: BACK   RS: SCROLL' : '')
      .setVisible(active);
    this.refreshSelection();
  }

  private pick(id: string): void {
    const cb = this.onPick;
    this.hide();
    if (cb) cb(id);
  }

  handleControllerCommand(command: ControllerNavCommand): boolean {
    if (!this.isVisible()) {
      return false;
    }
    if (command === 'confirm') {
      const option = this.options[this.selectedIndex];
      if (option && !option.disabled) {
        this.pick(option.id);
        return true;
      }
      return false;
    }
    if (command === 'cancel') {
      const fallback = this.options.find((option) =>
        /back|cancel|leave|close|no/i.test(option.title),
      );
      if (fallback) {
        this.pick(fallback.id);
        return true;
      }
      return false;
    }
    if (command === 'up' || command === 'left') {
      this.moveSelection(-1);
      return true;
    }
    if (command === 'down' || command === 'right') {
      this.moveSelection(1);
      return true;
    }
    if (command === 'scrollUp') {
      this.scrollBy(-48);
      return true;
    }
    if (command === 'scrollDown') {
      this.scrollBy(48);
      return true;
    }
    return false;
  }

  handleKeyboardEvent(event: KeyboardEvent): boolean {
    if (!this.isVisible()) return false;
    this.keyboardFocus = true;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      this.moveSelection(-1);
      return true;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'Tab') {
      this.moveSelection(event.shiftKey ? -1 : 1);
      return true;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      const option = this.options[this.selectedIndex];
      if (option && !option.disabled) this.pick(option.id);
      return true;
    }
    if (event.key === 'Escape') {
      return this.handleControllerCommand('cancel');
    }
    return false;
  }

  private moveSelection(delta: number): void {
    if (this.optionTexts.length === 0) {
      return;
    }
    let next = this.selectedIndex;
    for (let attempts = 0; attempts < this.options.length; attempts += 1) {
      next = (next + delta + this.options.length) % this.options.length;
      if (!this.options[next]?.disabled) {
        this.selectedIndex = next;
        break;
      }
    }
    this.ensureSelectedVisible();
    this.refreshSelection();
  }

  private ensureSelectedVisible(): void {
    const label = this.optionTexts[this.selectedIndex];
    if (!label) {
      return;
    }
    const button = this.optionButtons[this.selectedIndex];
    const top = button?.y ?? label.y;
    const bottom = top + (button?.height ?? label.height);
    if (top < this.scrollY) {
      this.applyScroll(top);
    } else if (bottom > this.scrollY + this.viewportHeight) {
      this.applyScroll(bottom - this.viewportHeight);
    }
  }

  private scrollBy(delta: number): void {
    if (!this.container?.visible || this.contentHeight <= this.viewportHeight) {
      return;
    }
    this.applyScroll(this.scrollY + delta);
  }

  private applyScroll(nextY: number): void {
    const maxScroll = Math.max(0, this.contentHeight - this.viewportHeight);
    this.scrollY = Phaser.Math.Clamp(nextY, 0, maxScroll);
    this.optionContainer?.setY(62 - this.scrollY);
    this.drawScrollBar();
    this.updateOptionInteractivity();
    this.refreshSelection();
  }

  private drawScrollBar(): void {
    const graphics = this.scrollBarGraphics;
    if (!graphics) return;
    graphics.clear();
    if (this.contentHeight <= this.viewportHeight) return;
    const x = this.width - 11;
    const y = 62;
    const height = this.viewportHeight;
    const thumbHeight = Math.max(28, (this.viewportHeight / this.contentHeight) * height);
    const maxScroll = Math.max(1, this.contentHeight - this.viewportHeight);
    const thumbY = y + (this.scrollY / maxScroll) * (height - thumbHeight);
    graphics.fillStyle(0x152b3b, 0.95).fillRoundedRect(x, y, 5, height, 3);
    graphics.fillStyle(0x9ad1ff, 0.95).fillRoundedRect(x, thumbY, 5, thumbHeight, 3);
  }

  private refreshSelection(): void {
    this.optionTexts.forEach((label, index) => {
      const selected = index === this.selectedIndex;
      const hovered = index === this.hoveredIndex;
      const focused = ((this.controllerMode || this.keyboardFocus) && selected) || hovered;
      const disabled = Boolean(this.options[index]?.disabled);
      label.setColor(disabled ? '#8090a0' : focused ? '#fff3a8' : '#ffffff');
      this.optionButtons[index]
        ?.setFillStyle(focused ? 0x244f78 : 0x13283b, disabled ? 0.42 : focused ? 0.94 : 0.72)
        .setStrokeStyle(focused ? 3 : 1, disabled ? 0x33404b : focused ? 0xfff3a8 : 0x315a78, 0.95);
      label.setScale(focused ? 1.015 : 1);
    });
  }

  private updateOptionInteractivity(): void {
    for (let index = 0; index < this.optionTexts.length; index += 1) {
      const label = this.optionTexts[index]!;
      const button = this.optionButtons[index];
      const top = (button?.y ?? label.y) - this.scrollY;
      const bottom = top + (button?.height ?? label.height);
      const visible = bottom >= 0 && top <= this.viewportHeight;
      if (visible && !this.options[index]?.disabled) {
        button?.setInteractive({ useHandCursor: true });
      } else {
        button?.disableInteractive();
      }
    }
  }

  private updateMask(rootX: number, rootY: number): void {
    if (!this.optionMaskGraphics || !this.optionContainer) {
      return;
    }
    this.optionMaskGraphics.clear();
    this.optionMaskGraphics.fillStyle(0xffffff, 1);
    this.optionMaskGraphics.fillRect(rootX + 20, rootY + 62, this.width - 40, this.viewportHeight);
    this.optionMask?.destroy();
    this.optionMask = this.optionMaskGraphics.createGeometryMask();
    this.optionContainer.setMask(this.optionMask);
  }

  private build(): void {
    const height = 240;
    const x = (this.scene.scale.width - this.width) / 2;
    const y = (this.scene.scale.height - height) / 2;

    this.background = this.scene.add
      .rectangle(0, 0, this.width, height, 0x0b1622, 0.94)
      .setStrokeStyle(2, 0x4da3ff)
      .setOrigin(0, 0);
    this.dimmer = this.scene.add
      .rectangle(-x, -y, this.scene.scale.width, this.scene.scale.height, 0x020812, 0.58)
      .setOrigin(0, 0)
      .setInteractive();

    this.titleText = this.scene.add
      .text(this.width / 2, 20, '', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#9ad1ff',
      })
      .setOrigin(0.5, 0);

    this.optionContainer = this.scene.add.container(16, 60);
    this.scrollHintText = this.scene.add
      .text(this.width / 2, height - 24, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6da8d8',
      })
      .setOrigin(0.5, 0);
    this.controllerHintText = this.scene.add
      .text(this.width / 2, height - 42, '', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#fff3a8',
      })
      .setOrigin(0.5, 0)
      .setVisible(false);
    this.optionMaskGraphics = this.scene.add.graphics().setVisible(false);
    this.scrollBarGraphics = this.scene.add.graphics();
    this.container = this.scene.add
      .container(x, y, [
        this.dimmer,
        this.background,
        this.titleText,
        this.optionContainer,
        this.scrollBarGraphics,
        this.scrollHintText,
        this.controllerHintText,
      ])
      .setVisible(false);
    this.scene.input.on(
      'wheel',
      (_pointer: Phaser.Input.Pointer, _objects: unknown[], _dx: number, dy: number) => {
        this.scrollBy(dy);
      },
    );
  }
}
