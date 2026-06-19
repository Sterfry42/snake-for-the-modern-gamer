import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import { i18n } from '../i18n/i18nManager.js';
import { saveManagerV2 } from '../game/saveManagerV2.js';
import type { GameSaveData, SaveSlotInfo } from '../game/saveManagerV2.js';

interface SaveLoadMenuOptions {
  onLoad: (slotId: string, data: GameSaveData) => void;
  onDelete?: (slotId: string) => void;
}

export class SaveLoadMenu {
  private container?: Phaser.GameObjects.Container;
  private background?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private regularSectionTitle?: Phaser.GameObjects.Text;
  private autosaveSectionTitle?: Phaser.GameObjects.Text;
  private scrollContainer?: Phaser.GameObjects.Container;
  private scrollMask?: Phaser.GameObjects.Graphics;
  private backText?: Phaser.GameObjects.Text;
  private entryContainers: Phaser.GameObjects.Container[] = [];
  private confirmOverlay?: Phaser.GameObjects.Container;
  private confirmText?: Phaser.GameObjects.Text;
  private confirmYes?: Phaser.GameObjects.Text;
  private confirmNo?: Phaser.GameObjects.Text;
  private pendingDeleteSlot?: string;
  private onBack?: () => void;
  private scrollY = 0;
  private contentHeight = 0;
  private viewportHeight = 0;
  private currentPopupHeight = 240;
  private readonly width = 520;
  private readonly entryHeight = 40;
  private regularEntries: SaveSlotInfo[] = [];
  private autosaveEntries: SaveSlotInfo[] = [];
  private isLoading = false;
  private currentOnLoad?: (slotId: string, data: GameSaveData) => void;

  constructor(private readonly scene: SnakeScene) {
    this.build();
  }

  async show(onLoad: (slotId: string, data: GameSaveData) => void, onBack?: () => void): Promise<void> {
    this.onBack = onBack;
    this.scene.setChoicePopupVisible(true);
    this.isLoading = true;

    this.regularEntries = await saveManagerV2.listRegularSaves();
    this.autosaveEntries = await saveManagerV2.listAutosaves();
    this.currentOnLoad = onLoad;

    this.titleText?.setText(i18n.getFeatureString('loadGameMenuTitle') || 'Load Game');
    this.buildEntries(onLoad);
    this.isLoading = false;

    const popupHeight = this.calculateHeight();
    const x = (this.scene.scale.width - this.width) / 2;
    const rootY = (this.scene.scale.height - popupHeight) / 2;
    this.currentPopupHeight = popupHeight;
    this.container?.setPosition(x, rootY);
    this.background?.setSize(this.width, popupHeight);
    this.scrollContainer?.setPosition(0, 48);
    this.viewportHeight = popupHeight - 48;
    this.updateMask();
    this.applyScroll(0);
    this.backText?.setPosition(this.width / 2, popupHeight - 16);
    this.container?.setVisible(true);
  }

  hide(): void {
    this.confirmOverlay?.destroy();
    this.confirmOverlay = undefined;
    this.container?.setVisible(false);
    this.scene.setChoicePopupVisible(false);
    this.onBack = undefined;
    this.currentOnLoad = undefined;
    this.scrollMask?.destroy();
    this.scrollMask = undefined;
    this.pendingDeleteSlot = undefined;
    for (const c of this.entryContainers) c.destroy();
    this.entryContainers = [];
  }

  setDepth(depth: number): void {
    this.container?.setDepth(depth);
  }

  isVisible(): boolean {
    return Boolean(this.container?.visible);
  }

  private async refreshEntries(): Promise<void> {
    this.regularEntries = await saveManagerV2.listRegularSaves();
    this.autosaveEntries = await saveManagerV2.listAutosaves();
    if (this.currentOnLoad) {
      this.buildEntries(this.currentOnLoad);
      const popupHeight = this.calculateHeight();
      this.currentPopupHeight = popupHeight;
      this.background?.setSize(this.width, popupHeight);
      this.scrollContainer?.setPosition(0, 48);
      this.viewportHeight = popupHeight - 48;
      this.updateMask();
      this.applyScroll(0);
      this.backText?.setPosition(this.width / 2, popupHeight - 16);
    }
  }

  private buildEntries(onLoad: (slotId: string, data: GameSaveData) => void): void {
    for (const c of this.entryContainers) c.destroy();
    this.entryContainers = [];

    if (!this.scrollContainer) return;

    const scrollX = 16;
    const buttonWidth = 80;
    const buttonHeight = 24;
    const buttonGap = 4;
    const entryGap = 6;
    const padding = 8;
    const totalEntryHeight = this.entryHeight + entryGap;

    let y = 16;

    // Autosaves section first
    this.autosaveSectionTitle?.setVisible(this.autosaveEntries.length > 0);
    if (this.autosaveEntries.length > 0) {
      this.autosaveSectionTitle?.setPosition(scrollX, y);
      y += 24;
    }

    for (const entry of this.autosaveEntries) {
      const label = saveManagerV2.getDisplayLabel(entry.slotId, entry.data.worldGeneration?.seed);
      const entryBox = this.createEntryBox(label, buttonWidth, buttonHeight, buttonGap, padding, (action) => {
        if (action === 'load') {
          onLoad(entry.slotId, entry.data);
        } else if (action === 'delete') {
          this.showConfirmDelete(entry.slotId);
        }
      }, true);
      entryBox.setPosition(scrollX, y);
      this.scrollContainer?.add(entryBox);
      this.entryContainers.push(entryBox);
      y += totalEntryHeight;
    }

    // Regular saves section after autosaves
    this.regularSectionTitle?.setVisible(this.regularEntries.length > 0);
    if (this.regularEntries.length > 0) {
      y += 12;
      this.regularSectionTitle?.setPosition(scrollX, y);
      y += 24;
    }

    for (const entry of this.regularEntries) {
      const label = saveManagerV2.getDisplayLabel(entry.slotId, entry.data.worldGeneration?.seed);
      const entryBox = this.createEntryBox(label, buttonWidth, buttonHeight, buttonGap, padding, (action) => {
        if (action === 'load') {
          onLoad(entry.slotId, entry.data);
        } else if (action === 'delete') {
          this.showConfirmDelete(entry.slotId);
        }
      });
      entryBox.setPosition(scrollX, y);
      this.scrollContainer?.add(entryBox);
      this.entryContainers.push(entryBox);
      y += totalEntryHeight;
    }

    this.contentHeight = Math.max(0, y - 16);
  }

  private createEntryBox(
    label: string,
    buttonWidth: number,
    buttonHeight: number,
    buttonGap: number,
    padding: number,
    onAction: (action: 'load' | 'delete') => void,
    isAutosave = false,
  ): Phaser.GameObjects.Container {
    const loadText = i18n.getFeatureString('load') || 'Load';
    const deleteText = i18n.getFeatureString('delete') || 'Delete';

    const bg = this.scene.add
      .rectangle(0, 0, this.width - 32, buttonHeight + padding * 2, isAutosave ? 0x0a1628 : 0x0b1622, 0.9)
      .setStrokeStyle(1, isAutosave ? 0x3a7bd5 : 0x4da3ff, 0.5)
      .setOrigin(0, 0);

    const labelText = this.scene.add
      .text(padding, padding, label, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#c8d0da',
        wordWrap: { width: this.width - 32 - padding * 2 - buttonWidth * 2 - buttonGap },
      })
      .setOrigin(0, 0);

    const loadBtn = this.scene.add
      .text(this.width - 32 - padding - buttonWidth - buttonGap, buttonHeight / 2 - 8, loadText, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#7ec87e',
        backgroundColor: '#0a2a0a',
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => loadBtn.setTint(0x9ad19a))
      .on('pointerout', () => loadBtn.clearTint())
      .on('pointerdown', () => onAction('load'));

    const deleteBtn = this.scene.add
      .text(this.width - 32 - padding - buttonWidth, buttonHeight / 2 - 8, deleteText, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#d87e7e',
        backgroundColor: '#2a0a0a',
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => deleteBtn.setTint(0xff6b6b))
      .on('pointerout', () => deleteBtn.clearTint())
      .on('pointerdown', () => onAction('delete'));

    const bgInteractive = bg
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => onAction('load'));

    const container = this.scene.add
      .container(0, 0, [bgInteractive, labelText, loadBtn, deleteBtn]);

    return container;
  }

  private showConfirmDelete(slotId: string): void {
    this.pendingDeleteSlot = slotId;
    const deleteText = i18n.getFeatureString('confirmDelete') || 'Delete this save?';
    const yesText = i18n.getFeatureString('popupAccept') || 'Yes';
    const noText = i18n.getFeatureString('popupReject') || 'No';

    if (this.confirmOverlay) {
      this.confirmOverlay.destroy();
    }

    const overlayBg = this.scene.add
      .rectangle(0, 0, this.width, 100, 0x000000, 0.7)
      .setOrigin(0, 0);

    const confirmTxt = this.scene.add
      .text(this.width / 2, 30, deleteText, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ff6b6b',
      })
      .setOrigin(0.5, 0);

    const yesBtn = this.scene.add
      .text(this.width / 2 - 50, 60, yesText, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ff6b6b',
        backgroundColor: '#2a0a0a',
        padding: { left: 10, right: 10, top: 4, bottom: 4 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => yesBtn.setTint(0xff9a9a))
      .on('pointerout', () => yesBtn.clearTint())
      .on('pointerdown', async () => {
        if (this.pendingDeleteSlot) {
          await saveManagerV2.delete(this.pendingDeleteSlot);
          this.pendingDeleteSlot = undefined;
          await this.refreshEntries();
        }
        this.confirmOverlay?.destroy();
        this.confirmOverlay = undefined;
      });

    const noBtn = this.scene.add
      .text(this.width / 2 + 50, 60, noText, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#c8d0da',
        backgroundColor: '#0a1622',
        padding: { left: 10, right: 10, top: 4, bottom: 4 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => noBtn.setTint(0x9ad1ff))
      .on('pointerout', () => noBtn.clearTint())
      .on('pointerdown', () => {
        this.pendingDeleteSlot = undefined;
        this.confirmOverlay?.destroy();
        this.confirmOverlay = undefined;
      });

    this.confirmOverlay = this.scene.add
      .container(0, 0, [overlayBg, confirmTxt, yesBtn, noBtn])
      .setDepth(40);
  }

  private calculateHeight(): number {
    const baseHeight = 140; // title + back button area
    const sectionGap = 28;
    const entryHeight = 40;

    let contentH = 0;
    if (this.regularEntries.length > 0) {
      contentH += 20 + this.regularEntries.length * (entryHeight + 8);
    }
    if (this.autosaveEntries.length > 0) {
      if (this.regularEntries.length > 0) contentH += 12;
      contentH += 20 + this.autosaveEntries.length * (entryHeight + 8);
    }

    return Math.min(baseHeight + contentH, this.scene.scale.height - 40);
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
    this.scrollContainer?.setY(-this.scrollY);
  }

  private updateMask(): void {
    if (!this.container || !this.scrollContainer) return;
    this.scrollMask?.destroy();

    const maskWidth = this.width;
    const maskHeight = this.viewportHeight;

    this.scrollMask = this.scene.add.graphics().setVisible(false);
    this.scrollMask.setPosition(0, 0);
    this.scrollMask.fillStyle(0xffffff, 1);
    this.scrollMask.fillRect(0, 48, maskWidth, maskHeight);

    const mask = this.scrollMask.createGeometryMask();
    this.scrollContainer.setMask(mask);
  }

  private build(): void {
    const height = 240;
    const x = (this.scene.scale.width - this.width) / 2;
    const y = (this.scene.scale.height - height) / 2;

    this.background = this.scene.add
      .rectangle(0, 0, this.width, height, 0x0b1622, 0.94)
      .setStrokeStyle(2, 0x4da3ff)
      .setOrigin(0, 0);

    this.titleText = this.scene.add
      .text(this.width / 2, 18, '', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#9ad1ff',
      })
      .setOrigin(0.5, 0);

    this.regularSectionTitle = this.scene.add
      .text(0, 0, i18n.getFeatureString('regularSaves') || 'Saves', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#7ec8e8',
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.autosaveSectionTitle = this.scene.add
      .text(0, 0, i18n.getFeatureString('autosaves') || 'Autosaves', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#7ec8e8',
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.scrollContainer = this.scene.add.container(0, 0);

    // Back button
    this.backText = this.scene.add
      .text(this.width / 2, height - 20, i18n.getFeatureString('back') || 'Back', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#8b939f',
        backgroundColor: '#0a1622',
        padding: { left: 20, right: 20, top: 6, bottom: 6 },
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.backText?.setTint(0x9ad1ff))
      .on('pointerout', () => this.backText?.clearTint())
      .on('pointerdown', () => {
        this.hide();
        if (this.onBack) this.onBack();
      });

    this.container = this.scene.add
      .container(x, y, [this.background, this.titleText, this.regularSectionTitle, this.autosaveSectionTitle, this.scrollContainer, this.backText])
      .setVisible(false);

    this.scene.input.on(
      'wheel',
      (_pointer: Phaser.Input.Pointer, _objects: unknown[], _dx: number, dy: number) => {
        this.scrollBy(dy);
      },
    );
  }
}
