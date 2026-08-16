import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import { i18n } from '../i18n/i18nManager.js';
import {
  saveManagerV2,
  type GameSaveData,
  type SessionInfo,
  type SessionSaveEntry,
} from '../game/saveManagerV2.js';
import type { ControllerNavCommand } from '../input/controllerNavigation.js';

export type LoadGameHandler = (sessionId: string, data: GameSaveData) => void;

/**
 * Two-level Load Game menu. The top level lists every save session
 * (one per unique game run); opening a session shows its last five
 * saves in chronological order, any of which may be loaded.
 */
export class SaveLoadMenu {
  private container?: Phaser.GameObjects.Container;
  private background?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private sectionTitle?: Phaser.GameObjects.Text;
  private emptyText?: Phaser.GameObjects.Text;
  private scrollContainer?: Phaser.GameObjects.Container;
  private scrollMask?: Phaser.GameObjects.Graphics;
  private scrollbarGraphics?: Phaser.GameObjects.Graphics;
  private backText?: Phaser.GameObjects.Text;
  private entryContainers: Phaser.GameObjects.Container[] = [];
  private confirmOverlay?: Phaser.GameObjects.Container;
  private confirmYes?: Phaser.GameObjects.Text;
  private confirmNo?: Phaser.GameObjects.Text;
  private pendingDeleteAction?: () => void;
  private onBack?: () => void;
  private scrollY = 0;
  private contentHeight = 0;
  private viewportHeight = 0;
  private readonly width = 520;
  private readonly entryHeight = 56;
  private readonly headerHeight = 48;
  private readonly footerHeight = 44;
  private view: 'sessions' | 'saves' = 'sessions';
  private sessions: SessionInfo[] = [];
  private activeSessionId: string | null = null;
  private activeSessionLabel = '';
  private saveEntries: SessionSaveEntry[] = [];
  private currentOnLoad?: LoadGameHandler;
  private controllerLoadActions: Array<() => void> = [];
  private controllerDeleteActions: Array<() => void> = [];
  private selectedEntryIndex = 0;
  private controllerMode = false;
  private confirmSelection: 'yes' | 'no' = 'no';

  constructor(private readonly scene: SnakeScene) {
    this.build();
  }

  async show(onLoad: LoadGameHandler, onBack?: () => void): Promise<void> {
    this.onBack = onBack;
    this.currentOnLoad = onLoad;
    this.scene.setChoicePopupVisible(true);
    this.view = 'sessions';
    this.activeSessionId = null;
    this.sessions = await saveManagerV2.listSessions();
    this.titleText?.setText(i18n.getFeatureString('loadGameMenuTitle') || 'Load Game');
    this.buildEntries();
    this.layoutPopup();
    this.container?.setVisible(true);
    this.refreshControllerSelection();
  }

  hide(): void {
    this.confirmOverlay?.destroy();
    this.confirmOverlay = undefined;
    this.container?.setVisible(false);
    this.scene.setChoicePopupVisible(false);
    this.onBack = undefined;
    this.currentOnLoad = undefined;
    this.activeSessionId = null;
    this.view = 'sessions';
    this.scrollMask?.destroy();
    this.scrollMask = undefined;
    this.pendingDeleteAction = undefined;
    for (const c of this.entryContainers) c.destroy();
    this.entryContainers = [];
    this.controllerLoadActions = [];
    this.controllerDeleteActions = [];
  }

  setDepth(depth: number): void {
    this.container?.setDepth(depth);
  }

  isVisible(): boolean {
    return Boolean(this.container?.visible);
  }

  setControllerMode(active: boolean): void {
    this.controllerMode = active;
    this.refreshControllerSelection();
  }

  handleControllerCommand(command: ControllerNavCommand): boolean {
    if (!this.isVisible()) return false;
    if (this.confirmOverlay) {
      if (command === 'left' || command === 'right') {
        this.confirmSelection = this.confirmSelection === 'yes' ? 'no' : 'yes';
        this.refreshConfirmSelection();
        return true;
      }
      if (command === 'confirm') {
        (this.confirmSelection === 'yes' ? this.confirmYes : this.confirmNo)?.emit('pointerdown');
        return true;
      }
      if (command === 'cancel') {
        this.confirmNo?.emit('pointerdown');
        return true;
      }
      return true;
    }
    if (command === 'up' || command === 'left') {
      this.moveControllerSelection(-1);
      return true;
    }
    if (command === 'down' || command === 'right') {
      this.moveControllerSelection(1);
      return true;
    }
    if (command === 'scrollUp') {
      this.scrollBy(-56);
      return true;
    }
    if (command === 'scrollDown') {
      this.scrollBy(56);
      return true;
    }
    if (command === 'confirm') {
      this.controllerLoadActions[this.selectedEntryIndex]?.();
      return true;
    }
    if (command === 'primary') {
      this.controllerDeleteActions[this.selectedEntryIndex]?.();
      return true;
    }
    if (command === 'cancel' || command === 'menu') {
      this.handleBack();
      return true;
    }
    return false;
  }

  /** Back button / cancel: step out of the saves view first, then exit. */
  private handleBack(): void {
    if (this.view === 'saves') {
      this.view = 'sessions';
      this.activeSessionId = null;
      this.titleText?.setText(i18n.getFeatureString('loadGameMenuTitle') || 'Load Game');
      this.buildEntries();
      this.layoutPopup();
    } else {
      const onBack = this.onBack;
      this.hide();
      onBack?.();
    }
  }

  private async openSession(sessionId: string): Promise<void> {
    const saves = await saveManagerV2.listSessionSaves(sessionId);
    if (saves.length === 0) return;
    this.view = 'saves';
    this.activeSessionId = sessionId;
    this.saveEntries = saves;
    const info = this.sessions.find((s) => s.sessionId === sessionId);
    this.activeSessionLabel = info ? saveManagerV2.getSessionLabel(info) : sessionId;
    this.titleText?.setText(i18n.getFeatureString('sessionSavesTitle') || 'Saves');
    this.buildEntries();
    this.layoutPopup();
  }

  private buildEntries(): void {
    for (const c of this.entryContainers) c.destroy();
    this.entryContainers = [];
    this.controllerLoadActions = [];
    this.controllerDeleteActions = [];

    const scrollX = 16;
    const buttonWidth = 64;
    const buttonHeight = 24;
    const buttonGap = 8;
    const padding = 8;
    const totalEntryHeight = this.entryHeight + 6;

    if (!this.scrollContainer) return;

    let y = 16;
    this.emptyText?.setVisible(false);

    if (this.view === 'sessions') {
      this.sectionTitle?.setVisible(this.sessions.length > 0);
      this.sectionTitle?.setText(i18n.getFeatureString('sessions') || 'Sessions');
      if (this.sessions.length === 0) {
        this.showEmpty(i18n.getFeatureString('noSaves') || 'No save files found.');
      }
      for (const session of this.sessions) {
        const label = saveManagerV2.getSessionLabel(session);
        const entryBox = this.createEntryBox(
          label,
          buttonWidth,
          buttonHeight,
          buttonGap,
          padding,
          (action) => {
            if (action === 'load') {
              void this.openSession(session.sessionId);
            } else if (action === 'delete') {
              this.showConfirmDelete(
                i18n.getFeatureString('confirmDeleteSession') ||
                  'Delete this session and all of its saves?',
                () => this.deleteSession(session.sessionId),
              );
            }
          },
        );
        entryBox.setPosition(scrollX, y);
        this.scrollContainer?.add(entryBox);
        this.entryContainers.push(entryBox);
        this.controllerLoadActions.push(() => void this.openSession(session.sessionId));
        this.controllerDeleteActions.push(() =>
          this.showConfirmDelete(
            i18n.getFeatureString('confirmDeleteSession') ||
              'Delete this session and all of its saves?',
            () => this.deleteSession(session.sessionId),
          ),
        );
        y += totalEntryHeight;
      }
    } else {
      this.sectionTitle?.setVisible(true);
      this.sectionTitle?.setText(
        this.activeSessionLabel || i18n.getFeatureString('sessions') || 'Sessions',
      );
      if (this.saveEntries.length === 0) {
        this.showEmpty(i18n.getFeatureString('noSaves') || 'No save files found.');
      }
      for (const entry of this.saveEntries) {
        const label = saveManagerV2.getSaveLabel(entry.timestamp, entry.data.score);
        const entryBox = this.createEntryBox(
          label,
          buttonWidth,
          buttonHeight,
          buttonGap,
          padding,
          (action) => {
            if (action === 'load') {
              this.currentOnLoad?.(this.activeSessionId ?? '', entry.data);
            } else if (action === 'delete' && this.activeSessionId) {
              this.showConfirmDelete(
                i18n.getFeatureString('confirmDelete') || 'Delete this save?',
                () => this.deleteSave(this.activeSessionId!, entry.timestamp),
              );
            }
          },
        );
        entryBox.setPosition(scrollX, y);
        this.scrollContainer?.add(entryBox);
        this.entryContainers.push(entryBox);
        this.controllerLoadActions.push(() =>
          this.currentOnLoad?.(this.activeSessionId ?? '', entry.data),
        );
        this.controllerDeleteActions.push(() =>
          this.showConfirmDelete(
            i18n.getFeatureString('confirmDelete') || 'Delete this save?',
            () => this.deleteSave(this.activeSessionId!, entry.timestamp),
          ),
        );
        y += totalEntryHeight;
      }
    }

    this.contentHeight = this.entryContainers.length === 0 ? 40 : Math.max(0, y - 16);
    this.selectedEntryIndex = Phaser.Math.Clamp(
      this.selectedEntryIndex,
      0,
      Math.max(0, this.entryContainers.length - 1),
    );
    this.refreshControllerSelection();
  }

  private showEmpty(message: string): void {
    if (!this.emptyText) return;
    this.emptyText.setText(message).setPosition(16, 16).setVisible(true);
  }

  private async deleteSession(sessionId: string): Promise<void> {
    await saveManagerV2.deleteSession(sessionId);
    this.sessions = (await saveManagerV2.listSessions()).filter((s) => s.sessionId !== sessionId);
    await this.refreshView();
  }

  private async deleteSave(sessionId: string, timestamp: number): Promise<void> {
    await saveManagerV2.deleteSave(sessionId, timestamp);
    this.saveEntries = await saveManagerV2.listSessionSaves(sessionId);
    await this.refreshView();
  }

  private async refreshView(): Promise<void> {
    if (this.view === 'saves' && this.activeSessionId) {
      const sessions = await saveManagerV2.listSessions();
      this.sessions = sessions;
      const info = sessions.find((s) => s.sessionId === this.activeSessionId);
      this.activeSessionLabel = info ? saveManagerV2.getSessionLabel(info) : '';
    }
    this.titleText?.setText(
      this.view === 'saves'
        ? i18n.getFeatureString('sessionSavesTitle') || 'Saves'
        : i18n.getFeatureString('loadGameMenuTitle') || 'Load Game',
    );
    this.buildEntries();
    this.layoutPopup();
  }

  private moveControllerSelection(delta: number): void {
    if (this.entryContainers.length === 0) return;
    this.selectedEntryIndex =
      (this.selectedEntryIndex + delta + this.entryContainers.length) % this.entryContainers.length;
    const entry = this.entryContainers[this.selectedEntryIndex];
    if (entry.y < this.scrollY) this.applyScroll(entry.y);
    else if (entry.y + this.entryHeight > this.scrollY + this.viewportHeight) {
      this.applyScroll(entry.y + this.entryHeight - this.viewportHeight);
    }
    this.refreshControllerSelection();
  }

  private refreshControllerSelection(): void {
    this.entryContainers.forEach((entry, index) => {
      const selected = this.controllerMode && index === this.selectedEntryIndex;
      entry.setScale(selected ? 1.015 : 1).setAlpha(selected ? 1 : 0.88);
    });
  }

  private createEntryBox(
    label: string,
    buttonWidth: number,
    _buttonHeight: number,
    buttonGap: number,
    padding: number,
    onAction: (action: 'load' | 'delete') => void,
  ): Phaser.GameObjects.Container {
    const loadText =
      this.view === 'sessions'
        ? i18n.getFeatureString('open') || 'Open'
        : i18n.getFeatureString('load') || 'Load';
    const deleteText = i18n.getFeatureString('delete') || 'Delete';

    const entryBoxWidth = this.width - 32;
    const entryBoxHeight = this.entryHeight;
    const actionsWidth = buttonWidth * 2 + buttonGap;
    const labelWidth = entryBoxWidth - padding * 3 - actionsWidth;

    const bg = this.scene.add
      .rectangle(0, 0, entryBoxWidth, entryBoxHeight, 0x0b1622, 0.9)
      .setStrokeStyle(1, 0x4da3ff, 0.5)
      .setOrigin(0, 0);

    const labelText = this.scene.add
      .text(padding, padding, label, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#c8d0da',
        wordWrap: { width: labelWidth, useAdvancedWrap: true },
        lineSpacing: 2,
      })
      .setOrigin(0, 0);

    const loadX = entryBoxWidth - padding - actionsWidth + buttonWidth / 2;
    const deleteX = entryBoxWidth - padding - buttonWidth / 2;
    const buttonY = entryBoxHeight / 2;
    const loadBtn = this.scene.add
      .text(loadX, buttonY, loadText, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#7ec87e',
        backgroundColor: '#0a2a0a',
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => loadBtn.setTint(0x9ad19a))
      .on('pointerout', () => loadBtn.clearTint())
      .on('pointerdown', () => onAction('load'));

    const deleteBtn = this.scene.add
      .text(deleteX, buttonY, deleteText, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#d87e7e',
        backgroundColor: '#2a0a0a',
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => deleteBtn.setTint(0xff6b6b))
      .on('pointerout', () => deleteBtn.clearTint())
      .on('pointerdown', () => onAction('delete'));

    const bgInteractive = bg
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => onAction('load'));

    const container = this.scene.add.container(0, 0, [
      bgInteractive,
      labelText,
      loadBtn,
      deleteBtn,
    ]);

    return container;
  }

  private showConfirmDelete(message: string, onConfirm: () => Promise<void>): void {
    this.pendingDeleteAction = onConfirm;
    this.confirmSelection = 'no';

    if (this.confirmOverlay) {
      this.confirmOverlay.destroy();
    }

    const overlayBg = this.scene.add
      .rectangle(0, 0, this.width, 100, 0x000000, 0.7)
      .setOrigin(0, 0);

    const confirmTxt = this.scene.add
      .text(this.width / 2, 30, message, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ff6b6b',
      })
      .setOrigin(0.5, 0);

    const yesBtn = this.scene.add
      .text(this.width / 2 - 50, 60, i18n.getFeatureString('popupAccept') || 'Yes', {
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
        const action = this.pendingDeleteAction;
        this.pendingDeleteAction = undefined;
        this.confirmOverlay?.destroy();
        this.confirmOverlay = undefined;
        await action?.();
      });

    const noBtn = this.scene.add
      .text(this.width / 2 + 50, 60, i18n.getFeatureString('popupReject') || 'No', {
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
        this.pendingDeleteAction = undefined;
        this.confirmOverlay?.destroy();
        this.confirmOverlay = undefined;
      });

    this.confirmYes = yesBtn;
    this.confirmNo = noBtn;

    // The overlay must live inside the menu container: it is shown over the
    // title screen (depth 220) while the menu renders at depth 9999, so a
    // scene-level overlay at a fixed depth would hide underneath the title.
    this.confirmOverlay = this.scene.add
      .container(0, 0, [overlayBg, confirmTxt, yesBtn, noBtn])
      .setPosition(0, this.headerHeight);
    this.container?.add(this.confirmOverlay);
    this.refreshConfirmSelection();
  }

  private refreshConfirmSelection(): void {
    this.confirmYes
      ?.setColor(this.confirmSelection === 'yes' ? '#fff3a8' : '#ff6b6b')
      .setScale(this.confirmSelection === 'yes' ? 1.08 : 1);
    this.confirmNo
      ?.setColor(this.confirmSelection === 'no' ? '#fff3a8' : '#c8d0da')
      .setScale(this.confirmSelection === 'no' ? 1.08 : 1);
  }

  private calculateHeight(): number {
    const baseHeight = 140; // title + back button area
    const entryCount = this.view === 'sessions' ? this.sessions.length : this.saveEntries.length;

    let contentH = 0;
    if (entryCount > 0) {
      contentH += 24 + entryCount * (this.entryHeight + 6);
    } else {
      contentH += 40;
    }

    return Math.min(baseHeight + contentH, this.scene.scale.height - 40);
  }

  private layoutPopup(): void {
    this.selectedEntryIndex = 0;
    const popupHeight = this.calculateHeight();
    const x = (this.scene.scale.width - this.width) / 2;
    const rootY = (this.scene.scale.height - popupHeight) / 2;
    this.container?.setPosition(x, rootY);
    this.background?.setSize(this.width, popupHeight);
    this.scrollContainer?.setPosition(0, this.headerHeight);
    this.viewportHeight = popupHeight - this.headerHeight - this.footerHeight;
    this.updateMask();
    this.applyScroll(0);
    this.backText?.setPosition(this.width / 2, popupHeight - 16);
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
    this.scrollContainer?.setY(this.headerHeight - this.scrollY);
    this.updateScrollbar();
  }

  private updateMask(): void {
    if (!this.container || !this.scrollContainer) return;
    this.scrollMask?.destroy();

    const maskWidth = this.width;
    const maskHeight = Math.max(0, this.viewportHeight);

    this.scrollMask = this.scene.add.graphics().setVisible(false);
    this.scrollMask.setPosition(this.container.x, this.container.y);
    this.scrollMask.fillStyle(0xffffff, 1);
    this.scrollMask.fillRect(0, this.headerHeight, maskWidth - 14, maskHeight);

    const mask = this.scrollMask.createGeometryMask();
    this.scrollContainer.setMask(mask);
    this.updateScrollbar();
  }

  private updateScrollbar(): void {
    if (!this.scrollbarGraphics) return;
    const trackX = this.width - 9;
    const trackY = this.headerHeight + 4;
    const trackHeight = Math.max(0, this.viewportHeight - 8);
    const maxScroll = Math.max(0, this.contentHeight - this.viewportHeight);
    const visibleRatio =
      this.contentHeight > 0 ? Math.min(1, this.viewportHeight / this.contentHeight) : 1;
    const thumbHeight = Math.max(24, Math.floor(trackHeight * visibleRatio));
    const travel = Math.max(0, trackHeight - thumbHeight);
    const progress = maxScroll > 0 ? this.scrollY / maxScroll : 0;
    const thumbY = trackY + travel * progress;

    this.scrollbarGraphics.clear();
    this.scrollbarGraphics.fillStyle(0x10283a, 0.9);
    this.scrollbarGraphics.fillRoundedRect(trackX, trackY, 4, trackHeight, 2);
    this.scrollbarGraphics.fillStyle(maxScroll > 0 ? 0x4da3ff : 0x34546a, 0.95);
    this.scrollbarGraphics.fillRoundedRect(trackX, thumbY, 4, thumbHeight);
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

    this.sectionTitle = this.scene.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#7ec8e8',
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.emptyText = this.scene.add
      .text(16, 16, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#8b939f',
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.scrollContainer = this.scene.add.container(0, 0, [this.sectionTitle, this.emptyText]);
    this.scrollbarGraphics = this.scene.add.graphics();

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
      .on('pointerdown', () => this.handleBack());

    this.container = this.scene.add
      .container(x, y, [
        this.background,
        this.titleText,
        this.scrollContainer,
        this.scrollbarGraphics,
        this.backText,
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
