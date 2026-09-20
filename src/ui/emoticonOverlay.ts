/**
 * Emoticon Overlay — a pop-up menu for selecting emoticons.
 *
 * Press Tab to open and cycle through emoticons.
 * Press Escape to close.
 * The wise old snake tests everything.
 */
import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import { i18n } from '../i18n/i18nManager.js';
import { EMOTICON_DEFINITIONS } from '../emoticons/emoticonCatalog.js';

const OVERLAY_WIDTH = 420;
const OVERLAY_HEIGHT = 340;
const ITEM_HEIGHT = 36;
const HEADER_HEIGHT = 44;
const FOOTER_HEIGHT = 32;
const LIST_PADDING_TOP = 48;
const LIST_PADDING_BOTTOM = 48;
const CYCLE_TIMEOUT_MS = 200; // ms between Tab presses to cycle

export class EmoticonOverlay {
  private container?: Phaser.GameObjects.Container;
  private background?: Phaser.GameObjects.Rectangle;
  private dimmer?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private footerText?: Phaser.GameObjects.Text;
  private itemContainer?: Phaser.GameObjects.Container;
  private itemTexts: Phaser.GameObjects.Text[] = [];
  private itemButtons: Phaser.GameObjects.Rectangle[] = [];
  private maskGraphics?: Phaser.GameObjects.Graphics;
  private optionMask?: Phaser.Display.Masks.GeometryMask;
  private selectedIndex = 0;
  private scrollY = 0;
  private contentHeight = 0;
  private viewportHeight = 0;
  private onPick?: (id: string) => void;
  private controllerMode = false;
  private keyboardFocus = false;
  private hoveredIndex = -1;
  private ownedIds: string[] = [];
  private lastCycleTime = 0;
  private previousPausedState = false;

  constructor(private readonly scene: SnakeScene) {
    this.build();
  }

  show(onPick: (id: string) => void): void {
    this.onPick = onPick;
    this.scene.setChoicePopupVisible(true);
    this.previousPausedState = this.scene.paused;
    this.scene.paused = true;
    this.selectedIndex = 0;
    this.hoveredIndex = -1;
    this.keyboardFocus = false;

    // Clear old items
    for (const t of this.itemTexts) t.destroy();
    for (const b of this.itemButtons) b.destroy();
    this.itemTexts = [];
    this.itemButtons = [];
    this.scrollY = 0;

    const scrollableHeight =
      OVERLAY_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - LIST_PADDING_TOP - LIST_PADDING_BOTTOM;
    this.viewportHeight = scrollableHeight;

    // Filter to owned emoticons only
    const ownedDefs = EMOTICON_DEFINITIONS.filter((def) => this.ownedIds.includes(def.id));

    let y = LIST_PADDING_TOP;
    for (const def of ownedDefs) {
      const label = this.scene.add.text(16, y, `${def.symbol}  ${def.label}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        fixedWidth: OVERLAY_WIDTH - 40,
      });

      const button = this.scene.add
        .rectangle(8, y, OVERLAY_WIDTH - 16, ITEM_HEIGHT, 0x13283b, 0.72)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x315a78, 0.82);

      button
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          this.keyboardFocus = false;
          this.hoveredIndex = ownedDefs.indexOf(def);
          this.selectedIndex = this.hoveredIndex;
          this.refreshSelection();
          this.ensureSelectedVisible();
        })
        .on('pointerout', () => {
          this.hoveredIndex = -1;
          this.refreshSelection();
        })
        .on('pointerdown', () => this.pick(def.id));

      this.itemContainer?.add([button, label]);
      this.itemButtons.push(button);
      this.itemTexts.push(label);
      y += ITEM_HEIGHT;
    }

    this.contentHeight = y;
    const popupHeight = Math.min(OVERLAY_HEIGHT, this.scene.scale.height * 0.8);
    const x = (this.scene.scale.width - OVERLAY_WIDTH) / 2;
    const rootY = (this.scene.scale.height - popupHeight) / 2;

    this.dimmer?.setPosition(-x, -rootY).setSize(this.scene.scale.width, this.scene.scale.height);
    this.background?.setSize(OVERLAY_WIDTH, popupHeight);
    this.titleText?.setPosition(OVERLAY_WIDTH / 2, 14);
    this.footerText?.setPosition(OVERLAY_WIDTH / 2, popupHeight - 14);
    this.itemContainer?.setPosition(0, HEADER_HEIGHT);

    this.updateMask(x, rootY);
    this.applyScroll(0);
    this.refreshSelection();

    this.container?.setVisible(true).setDepth(90);
  }

  hide(): void {
    this.container?.setVisible(false);
    this.scene.setChoicePopupVisible(false);
    this.scene.paused = this.previousPausedState;
    this.onPick = undefined;
    this.itemTexts = [];
    this.itemButtons = [];
  }

  isVisible(): boolean {
    return Boolean(this.container?.visible);
  }

  setDepth(depth: number): void {
    this.container?.setDepth(depth);
  }

  setOwnedEmoticonIds(ids: string[]): void {
    this.ownedIds = ids;
  }

  setControllerMode(active: boolean): void {
    this.controllerMode = active;
    this.refreshSelection();
  }

  handleControllerCommand(command: 'up' | 'down' | 'confirm' | 'cancel'): boolean {
    if (!this.isVisible()) return false;

    if (command === 'confirm') {
      const ownedDefs = EMOTICON_DEFINITIONS.filter((def) => this.ownedIds.includes(def.id));
      if (ownedDefs.length === 0) return false;
      // Cycle to next on confirm
      this.selectedIndex = (this.selectedIndex + 1) % ownedDefs.length;
      this.ensureSelectedVisible();
      this.refreshSelection();
      const def = ownedDefs[this.selectedIndex];
      if (def && this.onPick) {
        this.onPick(def.id);
      }
      return true;
    }

    if (command === 'cancel') {
      this.hide();
      return true;
    }

    if (command === 'up') {
      this.moveSelection(-1);
      return true;
    }

    if (command === 'down') {
      this.moveSelection(1);
      return true;
    }

    return false;
  }

  handleKeyboardEvent(event: KeyboardEvent): boolean {
    if (!this.isVisible()) return false;
    this.keyboardFocus = true;

    if (event.key === 'Escape') {
      this.hide();
      return true;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      const now = performance.now();
      if (now - this.lastCycleTime < CYCLE_TIMEOUT_MS) {
        return false; // Debounce
      }
      this.lastCycleTime = now;
      this.cycleSelection();
      return true;
    }

    if (event.key === 'ArrowUp') {
      this.moveSelection(-1);
      return true;
    }

    if (event.key === 'ArrowDown') {
      this.moveSelection(1);
      return true;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      const ownedDefs = EMOTICON_DEFINITIONS.filter((def) => this.ownedIds.includes(def.id));
      const def = ownedDefs[this.selectedIndex];
      if (def) {
        this.pick(def.id);
        return true;
      }
      return false;
    }

    return false;
  }

  private pick(id: string): void {
    const cb = this.onPick;
    this.hide();
    if (cb) cb(id);
  }

  private cycleSelection(): void {
    const ownedDefs = EMOTICON_DEFINITIONS.filter((def) => this.ownedIds.includes(def.id));
    if (ownedDefs.length === 0) return;

    // Move to next emoticon
    this.selectedIndex = (this.selectedIndex + 1) % ownedDefs.length;
    this.ensureSelectedVisible();
    this.refreshSelection();

    // Trigger the callback with the new selection
    const def = ownedDefs[this.selectedIndex];
    if (def && this.onPick) {
      this.onPick(def.id);
    }
  }

  private moveSelection(delta: number): void {
    const ownedDefs = EMOTICON_DEFINITIONS.filter((def) => this.ownedIds.includes(def.id));
    if (ownedDefs.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + ownedDefs.length) % ownedDefs.length;
    this.ensureSelectedVisible();
    this.refreshSelection();
  }

  private ensureSelectedVisible(): void {
    const top = this.selectedIndex * ITEM_HEIGHT;
    const bottom = top + ITEM_HEIGHT;
    if (top < this.scrollY) {
      this.applyScroll(top);
    } else if (bottom > this.scrollY + this.viewportHeight) {
      this.applyScroll(bottom - this.viewportHeight);
    }
  }

  private applyScroll(nextY: number): void {
    const maxScroll = Math.max(0, this.contentHeight - this.viewportHeight);
    this.scrollY = Phaser.Math.Clamp(nextY, 0, maxScroll);
    this.itemContainer?.setY(-this.scrollY);
    this.refreshSelection();
  }

  private refreshSelection(): void {
    this.itemTexts.forEach((label, index) => {
      const selected = index === this.selectedIndex;
      const hovered = index === this.hoveredIndex;
      const focused = ((this.controllerMode || this.keyboardFocus) && selected) || hovered;
      label.setColor(focused ? '#fff3a8' : '#ffffff');
      this.itemButtons[index]
        ?.setFillStyle(focused ? 0x244f78 : 0x13283b, focused ? 0.94 : 0.72)
        .setStrokeStyle(focused ? 3 : 1, focused ? 0xfff3a8 : 0x315a78, 0.95);
    });
  }

  private updateMask(rootX: number, rootY: number): void {
    if (!this.maskGraphics || !this.itemContainer) return;
    this.maskGraphics.clear();
    this.maskGraphics.fillStyle(0xffffff, 1);
    this.maskGraphics.fillRect(
      rootX + 8,
      rootY + HEADER_HEIGHT + LIST_PADDING_TOP,
      OVERLAY_WIDTH - 16,
      this.viewportHeight,
    );
    this.optionMask?.destroy();
    this.optionMask = this.maskGraphics.createGeometryMask();
    this.itemContainer.setMask(this.optionMask);
  }

  private build(): void {
    const width = OVERLAY_WIDTH;
    const height = OVERLAY_HEIGHT;
    const x = (this.scene.scale.width - width) / 2;
    const y = (this.scene.scale.height - height) / 2;

    this.background = this.scene.add
      .rectangle(0, 0, width, height, 0x0b1622, 0.94)
      .setStrokeStyle(2, 0x4da3ff)
      .setOrigin(0, 0);

    this.dimmer = this.scene.add
      .rectangle(-x, -y, this.scene.scale.width, this.scene.scale.height, 0x020812, 0.58)
      .setOrigin(0, 0);
    // Note: dimmer does NOT close on click/mouse movement — use Escape or select an emoticon

    this.titleText = this.scene.add
      .text(width / 2, 14, i18n.getFeatureString('emoticonMenuTitle') || 'Emoticons', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#9ad1ff',
      })
      .setOrigin(0.5, 0);

    this.footerText = this.scene.add
      .text(
        width / 2,
        height - 14,
        i18n.getFeatureString('emoticonMenuHint') ||
          'Select an emoticon to use. Press Escape to close.',
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#6da8d8',
        },
      )
      .setOrigin(0.5, 0);

    this.itemContainer = this.scene.add.container(0, HEADER_HEIGHT);

    this.maskGraphics = this.scene.add.graphics().setVisible(false);

    this.container = this.scene.add
      .container(x, y, [
        this.dimmer,
        this.background,
        this.titleText,
        this.itemContainer,
        this.maskGraphics,
        this.footerText,
      ])
      .setVisible(false);
  }
}
