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

interface EntryBox {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  check: Phaser.GameObjects.Text;
  key: string;
}

/**
 * Two-level Load Game menu. The top level lists every save session
 * (one per unique game run); opening a session shows its last five
 * saves in chronological order, any of which may be loaded.
 *
 * Entries can be multi-selected (click the body, or left/right with a
 * controller) and bulk-deleted via the "Delete Selected (n)" button.
 * The single Delete button on each entry always deletes just that one.
 */
export class SaveLoadMenu {
  private container?: Phaser.GameObjects.Container;
  private background?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private sectionTitle?: Phaser.GameObjects.Text;
  private emptyText?: Phaser.GameObjects.Text;
  private scrollContainer?: Phaser.GameObjects.Container;
  private scrollMask?: Phaser.Display.Masks.GeometryMask;
  private scrollbarGraphics?: Phaser.GameObjects.Graphics;
  private backText?: Phaser.GameObjects.Text;
  private deleteSelectedText?: Phaser.GameObjects.Text;
  private entryBoxes: EntryBox[] = [];
  private confirmOverlay?: Phaser.GameObjects.Container;
  private confirmYes?: Phaser.GameObjects.Text;
  private confirmNo?: Phaser.GameObjects.Text;
  private pendingDeleteAction?: () => void;
  private onBack?: () => void;
  private scrollY = 0;
  private contentHeight = 0;
  private viewportHeight = 0;
  private scrollInput?: Phaser.GameObjects.Rectangle;
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
  /** Keys of the entries picked for bulk delete (session IDs or save timestamps). */
  private selectedKeys = new Set<string>();

  constructor(private readonly scene: SnakeScene) {
    this.build();
  }

  async show(onLoad: LoadGameHandler, onBack?: () => void): Promise<void> {
    this.onBack = onBack;
    this.currentOnLoad = onLoad;
    this.scene.setChoicePopupVisible(true);
    this.view = 'sessions';
    this.activeSessionId = null;
    this.selectedKeys.clear();
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
    this.selectedKeys.clear();
    if (this.scrollMask) {
      this.scrollMask.geometryMask.destroy();
      this.scrollMask = undefined;
    }
    this.pendingDeleteAction = undefined;
    for (const entry of this.entryBoxes) entry.container.destroy();
    this.entryBoxes = [];
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
    if (command === 'up') {
      this.moveControllerSelection(-1);
      return true;
    }
    if (command === 'down') {
      this.moveControllerSelection(1);
      return true;
    }
    if (command === 'left' || command === 'right') {
      // Horizontal buttons toggle the multi-select state of the
      // highlighted entry (the list is one-dimensional, so there is no
      // horizontal movement to fall back on).
      const entry = this.entryBoxes[this.selectedEntryIndex];
      if (entry) {
        this.toggleSelection(entry.key);
      }
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
      if (this.selectedKeys.size > 0) {
        void this.deleteSelected();
      } else {
        this.controllerDeleteActions[this.selectedEntryIndex]?.();
      }
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
      this.selectedKeys.clear();
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
    this.selectedKeys.clear();
    this.saveEntries = saves;
    const info = this.sessions.find((s) => s.sessionId === sessionId);
    this.activeSessionLabel = info ? saveManagerV2.getSessionLabel(info) : sessionId;
    this.titleText?.setText(i18n.getFeatureString('sessionSavesTitle') || 'Saves');
    this.buildEntries();
    this.layoutPopup();
  }

  private buildEntries(): void {
    for (const entry of this.entryBoxes) entry.container.destroy();
    this.entryBoxes = [];
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
    if (this.emptyText && !this.emptyText.scene) {
      this.scrollContainer?.add(this.emptyText);
    }

    if (this.view === 'sessions') {
      this.sectionTitle?.setVisible(this.sessions.length > 0);
      this.sectionTitle?.setText(i18n.getFeatureString('sessions') || 'Sessions');
      if (this.sessions.length === 0) {
        this.showEmpty(i18n.getFeatureString('noSaves') || 'No save files found.');
      }
      for (const session of this.sessions) {
        const label = saveManagerV2.getSessionLabel(session);
        const action = this.sessionEntryActions(session);
        const entryBox = this.createEntryBox(
          label,
          session.sessionId,
          buttonWidth,
          buttonHeight,
          buttonGap,
          padding,
          action,
        );
        this.placeEntry(entryBox, scrollX, y);
        this.controllerLoadActions.push(action.load);
        this.controllerDeleteActions.push(action.delete);
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
        const key = String(entry.timestamp);
        const action = this.saveEntryActions(entry);
        const entryBox = this.createEntryBox(
          label,
          key,
          buttonWidth,
          buttonHeight,
          buttonGap,
          padding,
          action,
        );
        this.placeEntry(entryBox, scrollX, y);
        this.controllerLoadActions.push(action.load);
        this.controllerDeleteActions.push(action.delete);
        y += totalEntryHeight;
      }
    }

    this.contentHeight = this.entryBoxes.length === 0 ? 40 : Math.max(0, y - 16);
    this.selectedEntryIndex = Phaser.Math.Clamp(
      this.selectedEntryIndex,
      0,
      Math.max(0, this.entryBoxes.length - 1),
    );
    this.applySelectionVisuals();
    this.updateDeleteSelectedButton();
    this.refreshControllerSelection();
  }

  /** Button + controller actions shared by the sessions view. */
  private sessionEntryActions(session: SessionInfo): {
    load: () => void;
    delete: () => void;
  } {
    const message =
      i18n.getFeatureString('confirmDeleteSession') || 'Delete this session and all of its saves?';
    return {
      load: () => void this.openSession(session.sessionId),
      delete: () => this.showConfirmDelete(message, () => this.deleteSession(session.sessionId)),
    };
  }

  /** Button + controller actions shared by the saves view. */
  private saveEntryActions(entry: SessionSaveEntry): {
    load: () => void;
    delete: () => void;
  } {
    const message = i18n.getFeatureString('confirmDelete') || 'Delete this save?';
    return {
      load: () => this.currentOnLoad?.(this.activeSessionId ?? '', entry.data),
      delete: () =>
        this.showConfirmDelete(message, () =>
          this.deleteSave(this.activeSessionId!, entry.timestamp),
        ),
    };
  }

  private placeEntry(entry: EntryBox, x: number, y: number): void {
    entry.container.setPosition(x, y);
    this.scrollContainer?.add(entry.container);
    this.entryBoxes.push(entry);
  }

  private showEmpty(message: string): void {
    if (!this.emptyText) return;
    this.emptyText.setText(message).setPosition(16, 16).setVisible(true);
  }

  private async deleteSession(sessionId: string): Promise<void> {
    await saveManagerV2.deleteSession(sessionId);
    this.selectedKeys.delete(sessionId);
    this.sessions = await saveManagerV2.listSessions();
    await this.refreshView();
  }

  private async deleteSave(sessionId: string, timestamp: number): Promise<void> {
    await saveManagerV2.deleteSave(sessionId, timestamp);
    this.selectedKeys.delete(String(timestamp));
    this.saveEntries = await saveManagerV2.listSessionSaves(sessionId);
    await this.refreshView();
  }

  /** Bulk-delete everything the player has selected, with a confirm. */
  private deleteSelected(): void {
    const count = this.selectedKeys.size;
    if (count === 0) return;
    const template =
      this.view === 'sessions'
        ? i18n.getFeatureString('confirmDeleteSelectedSessions') ||
          'Delete {count} sessions and all of their saves?'
        : i18n.getFeatureString('confirmDeleteSelectedSaves') || 'Delete {count} saves?';
    this.showConfirmDelete(template.replace('{count}', String(count)), async () => {
      if (this.view === 'sessions') {
        await saveManagerV2.deleteSessions([...this.selectedKeys]);
        this.sessions = await saveManagerV2.listSessions();
      } else if (this.activeSessionId) {
        await saveManagerV2.deleteSaves(this.activeSessionId, [...this.selectedKeys].map(Number));
        this.saveEntries = await saveManagerV2.listSessionSaves(this.activeSessionId);
      }
      this.selectedKeys.clear();
      await this.refreshView();
    });
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

  private toggleSelection(key: string): void {
    if (this.selectedKeys.has(key)) {
      this.selectedKeys.delete(key);
    } else {
      this.selectedKeys.add(key);
    }
    this.applySelectionVisuals();
    this.updateDeleteSelectedButton();
  }

  private applySelectionVisuals(): void {
    for (const entry of this.entryBoxes) {
      const selected = this.selectedKeys.has(entry.key);
      entry.bg.setStrokeStyle(1, selected ? 0x5dd6a2 : 0x4da3ff, selected ? 0.9 : 0.5);
      entry.check.setVisible(selected);
    }
  }

  private updateDeleteSelectedButton(): void {
    if (!this.deleteSelectedText) return;
    const count = this.selectedKeys.size;
    this.deleteSelectedText
      .setVisible(count > 0)
      .setInteractive(count > 0)
      .setText(
        count > 0
          ? `${i18n.getFeatureString('deleteSelected') || 'Delete Selected'} (${count})`
          : '',
      );
  }

  private moveControllerSelection(delta: number): void {
    if (this.entryBoxes.length === 0) return;
    this.selectedEntryIndex =
      (this.selectedEntryIndex + delta + this.entryBoxes.length) % this.entryBoxes.length;
    const entry = this.entryBoxes[this.selectedEntryIndex].container;
    if (entry.y < this.scrollY) this.applyScroll(entry.y);
    else if (entry.y + this.entryHeight > this.scrollY + this.viewportHeight) {
      this.applyScroll(entry.y + this.entryHeight - this.viewportHeight);
    }
    this.refreshControllerSelection();
  }

  private refreshControllerSelection(): void {
    this.entryBoxes.forEach((entry, index) => {
      const selected = this.controllerMode && index === this.selectedEntryIndex;
      entry.container.setScale(selected ? 1.015 : 1).setAlpha(selected ? 1 : 0.88);
    });
  }

  private createEntryBox(
    label: string,
    key: string,
    buttonWidth: number,
    buttonHeight: number,
    buttonGap: number,
    padding: number,
    actions: { load: () => void; delete: () => void },
  ): EntryBox {
    const loadText =
      this.view === 'sessions'
        ? i18n.getFeatureString('open') || 'Open'
        : i18n.getFeatureString('load') || 'Load';
    const deleteText = i18n.getFeatureString('delete') || 'Delete';

    const entryBoxWidth = this.width - 32;
    const entryBoxHeight = this.entryHeight;
    const actionsWidth = buttonWidth * 2 + buttonGap;
    const checkColumnWidth = 18;
    const loadX = entryBoxWidth - padding - actionsWidth + buttonWidth / 2;
    const deleteX = entryBoxWidth - padding - buttonWidth / 2;
    const labelX = padding + checkColumnWidth;
    const labelWidth = Math.max(60, loadX - buttonWidth / 2 - labelX - padding);

    const check = this.scene.add
      .text(padding, entryBoxHeight / 2, '✓', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#5dd6a2',
      })
      .setOrigin(0, 0.5)
      .setVisible(false);

    const labelTxt = this.scene.add
      .text(padding + checkColumnWidth, entryBoxHeight / 2, label, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e8f0f8',
        lineSpacing: 3,
        wordWrap: { width: labelWidth },
        align: 'left',
      })
      .setOrigin(0, 0.5);

    const loadBtn = this.scene.add
      .text(0, 0, loadText, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#0a1622',
        backgroundColor: '#1f7a4d',
        padding: { left: 12, right: 12, top: 4, bottom: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => loadBtn.setTint(0x9ad1ff))
      .on('pointerout', () => loadBtn.clearTint())
      .on('pointerdown', () => actions.load());
    loadBtn.setSize(buttonWidth, buttonHeight);
    loadBtn.displayWidth = buttonWidth;
    loadBtn.displayHeight = buttonHeight;

    const deleteBtn = this.scene.add
      .text(0, 0, deleteText, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ff9d9d',
        backgroundColor: '#3a1f1f',
        padding: { left: 12, right: 12, top: 4, bottom: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => deleteBtn.setTint(0xffb0b0))
      .on('pointerout', () => deleteBtn.clearTint())
      .on('pointerdown', () => actions.delete());
    deleteBtn.setSize(buttonWidth, buttonHeight);
    deleteBtn.displayWidth = buttonWidth;
    deleteBtn.displayHeight = buttonHeight;

    const bg = this.scene.add
      .rectangle(0, 0, entryBoxWidth, entryBoxHeight, 0x1a2634, 0.55)
      .setStrokeStyle(1, 0x4da3ff, 0.5)
      .setOrigin(0, 0);

    const bgInteractive = this.scene.add
      .rectangle(0, 0, entryBoxWidth, entryBoxHeight, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleSelection(key));

    const btnY = entryBoxHeight / 2;
    loadBtn.setPosition(loadX, btnY);
    deleteBtn.setPosition(deleteX, btnY);

    const container = this.scene.add.container(0, 0, [
      bg,
      bgInteractive,
      check,
      labelTxt,
      loadBtn,
      deleteBtn,
    ]);

    return {
      container,
      bg,
      check,
      key,
    };
  }

  private showConfirmDelete(message: string, onConfirm: () => Promise<void>): void {
    this.pendingDeleteAction = () => {
      void onConfirm();
    };
    this.confirmSelection = 'no';

    if (this.confirmOverlay) {
      this.confirmOverlay.destroy();
    }

    const overlayBg = this.scene.add
      .rectangle(0, 0, this.width, 100, 0x0a1622, 0.95)
      .setStrokeStyle(2, 0x4da3ff, 1);

    const confirmTxt = this.scene.add
      .text(0, 30, message, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e8f0f8',
        wordWrap: { width: this.width - 80 },
        align: 'center',
      })
      .setOrigin(0.5);

    const yesBtn = this.scene.add
      .text(this.width / 2 - 50, 60, i18n.getFeatureString('popupConfirm') || 'Yes', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#0a1622',
        backgroundColor: '#ff5555',
        padding: { left: 10, right: 10, top: 4, bottom: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => yesBtn.setTint(0xffb0b0))
      .on('pointerout', () => yesBtn.clearTint())
      .on('pointerdown', async () => {
        const action = this.pendingDeleteAction;
        this.pendingDeleteAction = undefined;
        this.confirmOverlay?.destroy();
        this.confirmOverlay = undefined;
        if (action) await action();
      });

    const noBtn = this.scene.add
      .text(this.width / 2 + 50, 60, i18n.getFeatureString('popupReject') || 'No', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#c8d0da',
        backgroundColor: '#0a1622',
        padding: { left: 10, right: 10, top: 4, bottom: 4 },
      })
      .setOrigin(0.5)
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
    const yesSelected = this.confirmSelection === 'yes';
    if (this.confirmYes) {
      this.confirmYes.setBackgroundColor(yesSelected ? '#ff9d9d' : '#ff5555').clearTint();
    }
    if (this.confirmNo) {
      this.confirmNo.setBackgroundColor(yesSelected ? '#0a1622' : '#1a2634').clearTint();
    }
  }

  private build(): void {
    const x = 0;
    const y = 0;
    const height = this.headerHeight + this.footerHeight + 160;

    const background = this.scene.add
      .rectangle(x, y, this.width, height, 0x0a1622, 0.95)
      .setStrokeStyle(2, 0x4da3ff, 1);

    const titleText = this.scene.add
      .text(0, 26, i18n.getFeatureString('loadGameMenuTitle') || 'Load Game', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#e8f0f8',
        align: 'center',
      })
      .setOrigin(0.5);

    const sectionTitle = this.scene.add
      .text(0, this.headerHeight + 20, i18n.getFeatureString('sessions') || 'Sessions', {
        // Section label lives inside the popup container so it tracks the
        // centered popup position instead of drifting in scene space.

        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#9ad1ff',
      })
      .setOrigin(0.5);

    const emptyText = this.scene.add
      .text(16, 16, i18n.getFeatureString('noSaves') || 'No save files found.', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#c8d0da',
      })
      .setOrigin(0, 0);

    const scrollContainer = this.scene.add.container(0, 0);

    const scrollbarGraphics = this.scene.add.graphics();
    scrollbarGraphics.setScrollFactor(0);

    const backText = this.scene.add
      .text(0, height - 20, i18n.getFeatureString('back') || 'Back', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#c8d0da',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backText.setTint(0x9ad1ff))
      .on('pointerout', () => backText.clearTint())
      .on('pointerdown', () => this.handleBack());

    const deleteSelectedText = this.scene.add
      .text(-120, height - 20, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ff9d9d',
      })
      .setOrigin(0.5)
      .setInteractive(false)
      .on('pointerover', () => deleteSelectedText.setTint(0xffb0b0))
      .on('pointerout', () => deleteSelectedText.clearTint())
      .on('pointerdown', () => this.deleteSelected())
      .setVisible(false);

    const scrollInput = this.scene.add
      .rectangle(0, 0, this.width - 32, 160, 0x000000, 0)
      .setInteractive();

    scrollInput.on('wheel', (_pointer: Phaser.Input.Pointer, _go: unknown, _delta: number) => {
      if (!this.container?.visible) return;
      this.scrollBy(_delta > 0 ? 40 : -40);
    });

    const container = this.scene.add
      .container(x, y, [
        background,
        titleText,
        sectionTitle,
        scrollContainer,
        scrollbarGraphics,
        scrollInput,
        deleteSelectedText,
        backText,
      ])
      .setVisible(false);

    this.container = container;
    this.background = background;
    this.titleText = titleText;
    this.sectionTitle = sectionTitle;
    this.emptyText = emptyText;
    this.scrollContainer = scrollContainer;
    this.scrollbarGraphics = scrollbarGraphics;
    this.scrollInput = scrollInput;
    this.backText = backText;
    this.deleteSelectedText = deleteSelectedText;
    this.contentHeight = 0;
    this.layoutPopup();
  }

  private layoutPopup(): void {
    if (!this.background || !this.backText) return;

    // Keep the whole popup on screen, centered on the game viewport.
    const screen = this.scene.scale.gameSize;
    const maxEntries = Math.max(3, Math.min(10, this.entryBoxes.length || 3));
    const listHeight = maxEntries * (this.entryHeight + 6);
    const popupHeight = Math.min(
      this.headerHeight + listHeight + this.footerHeight,
      screen.height - 40,
    );
    const cx = screen.width / 2;
    const cy = Math.max(10, (screen.height - popupHeight) / 2);
    this.container?.setPosition(cx, cy);

    this.background.setSize(this.width, popupHeight);
    this.titleText?.setPosition(0, 26);
    this.sectionTitle?.setPosition(0, this.headerHeight + 20);

    this.viewportHeight = popupHeight - this.headerHeight - this.footerHeight;
    this.scrollInput?.setPosition(0, this.headerHeight + this.viewportHeight / 2);
    this.scrollInput?.setSize(this.width - 32, this.viewportHeight);
    this.scrollY = Math.max(
      0,
      Math.min(this.scrollY, Math.max(0, this.contentHeight - this.viewportHeight)),
    );
    this.applyScroll(this.scrollY);

    this.backText?.setPosition(0, popupHeight - 20);
    this.deleteSelectedText?.setPosition(-120, popupHeight - 20);

    this.updateMask();
  }

  private updateMask(): void {
    if (!this.scrollContainer) return;
    if (this.scrollMask) {
      this.scrollMask.geometryMask.destroy();
      this.scrollMask = undefined;
    }

    const geometry = this.scene.add.graphics().setVisible(false);
    geometry.setPosition(this.container?.x ?? 0, this.container?.y ?? 0);
    geometry.fillStyle(0xffffff, 1);
    geometry.fillRect(8, this.headerHeight, this.width - 16, Math.max(0, this.viewportHeight));
    this.scrollMask = new Phaser.Display.Masks.GeometryMask(this.scene, geometry);
    this.scrollContainer.setMask(this.scrollMask);
  }

  private scrollBy(delta: number): void {
    if (this.contentHeight <= this.viewportHeight) return;
    const maxScroll = this.contentHeight - this.viewportHeight;
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, maxScroll);
    this.applyScroll(this.scrollY);
  }

  private applyScroll(y: number): void {
    if (this.scrollContainer) {
      this.scrollContainer.y = this.headerHeight - y;
    }
    this.updateMask();
    this.layoutScrollbar(y);
  }

  private layoutScrollbar(scrollY: number): void {
    if (!this.scrollbarGraphics || !this.background) return;
    const g = this.scrollbarGraphics;
    g.clear();
    const listTop = this.headerHeight;
    const listBottom = this.background.height - this.footerHeight;
    const listHeight = listBottom - listTop;
    if (this.contentHeight <= this.viewportHeight) {
      g.setVisible(false);
      return;
    }
    g.setVisible(true);
    const trackX = this.width - 14;
    g.lineStyle(3, 0x4da3ff, 0.4);
    g.lineBetween(trackX, listTop, trackX, listBottom);
    const thumbTravel = listHeight - 16;
    const ratio =
      this.contentHeight > 0 ? scrollY / Math.max(1, this.contentHeight - this.viewportHeight) : 0;
    const thumbY = listTop + ratio * thumbTravel;
    g.lineStyle(3, 0x9ad1ff, 0.9);
    g.lineBetween(trackX, thumbY, trackX, Phaser.Math.Clamp(thumbY + 24, listTop, listBottom - 24));
  }

  destroy(): void {
    this.confirmOverlay?.destroy();
    if (this.scrollMask) {
      this.scrollMask.geometryMask.destroy();
      this.scrollMask = undefined;
    }
    this.scrollInput?.destroy();
    this.entryBoxes.forEach((entry) => entry.container.destroy());
    this.container?.destroy();
    this.container = undefined;
  }
}
