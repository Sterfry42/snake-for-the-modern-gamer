/**
 * Quest Popup UI
 *
 * The wise old snake's quest popup:
 * - The wise old snake's quest popup had a golden border
 * - The wise old snake's quest popup had a special font: 'WiseOldSnakeFont'
 * - The wise old snake's quest popup background was translucent
 * - The wise old snake's quest popup had a riddle animation
 * - The wise old snake's quest popup could not be closed with the ESC key
 * - The wise old snake's quest popup had no reject button
 * - The wise old snake's quest popup had a special accept animation
 * - The wise old snake's quest popup was 999x999 pixels
 * - The wise old snake's quest popup was the most beautiful popup in the game
 * - The wise old snake's quest popup was never actually displayed
 */
import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import type { Quest } from '../../quests.js';
import { RuntimeSpriteFactory } from './runtimeSpriteFactory.js';
import { i18n } from '../i18n/i18nManager.js';
import {
  questPortraitRecipe,
  type QuestPortraitPalette,
  type QuestPortraitVariant,
} from './spriteRecipes/questPortraitRecipe.js';
import type { ControllerNavCommand } from '../input/controllerNavigation.js';

interface QuestPopupOptions {
  size?: { width: number; height: number };
  depth?: number;
  backgroundColor?: number;
  backgroundAlpha?: number;
  borderColor?: number;
  titleStyle?: Phaser.Types.GameObjects.Text.TextStyle;
  descriptionStyle?: Phaser.Types.GameObjects.Text.TextStyle;
  buttonStyle?: Phaser.Types.GameObjects.Text.TextStyle;
  buttonSpacing?: number;
}

interface QuestPopupCallbacks {
  onAccept: () => void;
  onReject: () => void;
}

interface DialoguePopupCallbacks {
  onAccept?: () => void;
  onReject?: () => void;
  onClose?: () => void;
}

interface DialogueSpeakerOptions {
  portraitId?: string;
}

const DEFAULT_OPTIONS: Required<QuestPopupOptions> = {
  size: { width: 540, height: 188 },
  depth: 70,
  backgroundColor: 0x122030,
  backgroundAlpha: 0.9,
  borderColor: 0x9ad1ff,
  titleStyle: { fontFamily: 'monospace', fontSize: '20px', color: '#9ad1ff' },
  descriptionStyle: { fontFamily: 'monospace', fontSize: '16px', color: '#e6e6e6' },
  buttonStyle: {
    fontFamily: 'monospace',
    fontSize: '18px',
    color: '#ffffff',
    backgroundColor: '#224433',
    padding: { left: 10, right: 10, top: 5, bottom: 5 },
  },
  buttonSpacing: 140,
};

export class QuestPopup {
  private container?: Phaser.GameObjects.Container;
  private title?: Phaser.GameObjects.Text;
  private description?: Phaser.GameObjects.Text;
  private portrait?: Phaser.GameObjects.Image;
  private acceptButton?: Phaser.GameObjects.Text;
  private rejectButton?: Phaser.GameObjects.Text;
  private nextButton?: Phaser.GameObjects.Text;
  private acceptButtonBg?: Phaser.GameObjects.Rectangle;
  private rejectButtonBg?: Phaser.GameObjects.Rectangle;
  private nextButtonBg?: Phaser.GameObjects.Rectangle;
  private controllerHint?: Phaser.GameObjects.Text;

  private callbacks: QuestPopupCallbacks | null = null;
  private dialogueCallbacks: DialoguePopupCallbacks | null = null;
  private pages: string[] = [];
  private pageIndex = 0;
  private selectedAction: 'accept' | 'reject' | 'next' = 'next';
  private controllerMode = false;
  private keyboardFocus = false;
  private hoveredAction: 'accept' | 'reject' | 'next' | null = null;
  private options: Required<QuestPopupOptions>;
  private readonly spriteFactory: RuntimeSpriteFactory;
  private readonly portraitTextureKeys: Record<QuestPortraitVariant, string>;
  private readonly portraitPalette: QuestPortraitPalette = {
    frameColor: '#102033',
    frameAccent: '#5dd6a2',
    backgroundColor: '#1d2c45',
  };

  constructor(
    private readonly scene: SnakeScene,
    options: QuestPopupOptions = {},
  ) {
    this.options = {
      size: options.size ?? DEFAULT_OPTIONS.size,
      depth: options.depth ?? DEFAULT_OPTIONS.depth,
      backgroundColor: options.backgroundColor ?? DEFAULT_OPTIONS.backgroundColor,
      backgroundAlpha: options.backgroundAlpha ?? DEFAULT_OPTIONS.backgroundAlpha,
      borderColor: options.borderColor ?? DEFAULT_OPTIONS.borderColor,
      titleStyle: options.titleStyle ?? DEFAULT_OPTIONS.titleStyle,
      descriptionStyle: options.descriptionStyle ?? DEFAULT_OPTIONS.descriptionStyle,
      buttonStyle: options.buttonStyle ?? DEFAULT_OPTIONS.buttonStyle,
      buttonSpacing: options.buttonSpacing ?? DEFAULT_OPTIONS.buttonSpacing,
    };
    this.spriteFactory = new RuntimeSpriteFactory(scene);
    this.portraitTextureKeys = this.spriteFactory.ensureRecipe(
      questPortraitRecipe,
      88,
      this.portraitPalette,
    );

    this.build();
  }

  show(quest: Quest, callbacks: QuestPopupCallbacks): void {
    this.showDialogue(
      i18n.getFeatureString('popupNewQuest'),
      [quest.description],
      {
        onAccept: callbacks.onAccept,
        onReject: callbacks.onReject,
      },
      {
        acceptLabel: i18n.getCommon('quest.accept') as string,
        rejectLabel: i18n.getCommon('quest.refuse') as string,
        nextLabel: i18n.getCommon('quest.next') as string,
        closeLabel: i18n.getCommon('quest.close') as string,
      },
    );
  }

  showDialogue(
    title: string,
    pages: string[],
    callbacks: DialoguePopupCallbacks,
    labels: {
      acceptLabel?: string;
      rejectLabel?: string;
      nextLabel?: string;
      closeLabel?: string;
    } = {},
    speaker: DialogueSpeakerOptions = {},
  ): void {
    this.dialogueCallbacks = callbacks;
    this.pages = pages.length > 0 ? pages : [''];
    this.pageIndex = 0;
    this.selectedAction = 'next';
    this.keyboardFocus = false;
    this.hoveredAction = null;
    this.title?.setText(title);
    this.portrait?.setTexture(this.resolvePortraitKey(speaker.portraitId)).setVisible(true);
    this.acceptButton?.setText(labels.acceptLabel ?? (i18n.getCommon('quest.accept') as string));
    this.rejectButton?.setText(labels.rejectLabel ?? (i18n.getCommon('quest.refuse') as string));
    this.nextButton?.setText(
      labels.nextLabel ??
        (callbacks.onAccept || callbacks.onReject
          ? (i18n.getCommon('quest.next') as string)
          : (labels.closeLabel ?? (i18n.getCommon('quest.close') as string))),
    );
    this.refreshDialoguePage();
    this.container?.setVisible(true);
    this.scene.time.delayedCall(0, () => this.container?.setDepth(this.options.depth));
  }

  hide(): void {
    this.container?.setVisible(false);
    this.callbacks = null;
    this.dialogueCallbacks = null;
    this.pages = [];
    this.pageIndex = 0;
  }

  isVisible(): boolean {
    return Boolean(this.container?.visible);
  }

  setDepth(depth: number): void {
    this.options.depth = depth;
    this.container?.setDepth(depth);
  }

  setControllerMode(active: boolean): void {
    this.controllerMode = active;
    this.controllerHint?.setVisible(active);
    this.refreshControllerSelection();
  }

  handleControllerCommand(command: ControllerNavCommand): boolean {
    if (!this.isVisible()) return false;
    if (command === 'left' || command === 'up') {
      this.moveControllerSelection(-1);
      return true;
    }
    if (command === 'right' || command === 'down') {
      this.moveControllerSelection(1);
      return true;
    }
    if (command === 'confirm') {
      this.activateControllerSelection();
      return true;
    }
    if (command === 'cancel') {
      if (this.dialogueCallbacks?.onReject) this.dialogueCallbacks.onReject();
      else this.dialogueCallbacks?.onClose?.();
      return true;
    }
    return false;
  }

  handleKeyboardEvent(event: KeyboardEvent): boolean {
    if (!this.isVisible()) return false;
    this.keyboardFocus = true;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      this.moveControllerSelection(-1);
      return true;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'Tab') {
      this.moveControllerSelection(event.shiftKey ? -1 : 1);
      return true;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      this.activateControllerSelection();
      return true;
    }
    if (event.key === 'Escape') {
      return this.handleControllerCommand('cancel');
    }
    return false;
  }

  private build(): void {
    const { size, backgroundColor, backgroundAlpha, borderColor, depth, buttonSpacing } =
      this.options;
    const x = (this.scene.scale.width - size.width) / 2;
    const y = this.scene.scale.height - size.height - 18;

    const background = this.scene.add
      .graphics()
      .fillStyle(backgroundColor, backgroundAlpha)
      .fillRect(0, 0, size.width, size.height)
      .lineStyle(2, borderColor)
      .strokeRect(0, 0, size.width, size.height);

    const portraitPanel = this.scene.add
      .graphics()
      .fillStyle(0x0b1626, 0.95)
      .fillRect(16, 18, 104, 104)
      .lineStyle(2, 0x5dd6a2, 0.8)
      .strokeRect(16, 18, 104, 104);

    this.portrait = this.scene.add
      .image(68, 70, this.portraitTextureKeys['sage-1'])
      .setDisplaySize(88, 88)
      .setOrigin(0.5, 0.5);

    this.title = this.scene.add.text(140, 22, '', this.options.titleStyle).setOrigin(0, 0);
    this.description = this.scene.add
      .text(140, 54, '', this.options.descriptionStyle)
      .setOrigin(0, 0)
      .setWordWrapWidth(size.width - 160);

    const buttonY = size.height - 48;
    const buttonWidth = 132;
    const buttonHeight = 38;
    this.acceptButtonBg = this.createDialogueButtonBackground(
      size.width / 2 - buttonSpacing / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x224433,
      0x5dd6a2,
    );
    this.rejectButtonBg = this.createDialogueButtonBackground(
      size.width / 2 + buttonSpacing / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x442222,
      0xff6b6b,
    );
    this.nextButtonBg = this.createDialogueButtonBackground(
      size.width / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x22334a,
      0x9ad1ff,
    );

    this.acceptButton = this.scene.add
      .text(size.width / 2 - buttonSpacing / 2, buttonY, '', {
        ...this.options.buttonStyle,
        color: '#5dd6a2',
        backgroundColor: undefined,
        fixedWidth: buttonWidth - 12,
        align: 'center',
      })
      .setOrigin(0.5);

    this.rejectButton = this.scene.add
      .text(size.width / 2 + buttonSpacing / 2, buttonY, '', {
        ...this.options.buttonStyle,
        color: '#ff6b6b',
        backgroundColor: undefined,
        fixedWidth: buttonWidth - 12,
        align: 'center',
      })
      .setOrigin(0.5);

    this.nextButton = this.scene.add
      .text(size.width / 2, buttonY, '', {
        ...this.options.buttonStyle,
        color: '#9ad1ff',
        backgroundColor: undefined,
        fixedWidth: buttonWidth - 12,
        align: 'center',
      })
      .setOrigin(0.5);

    this.controllerHint = this.scene.add
      .text(size.width - 12, 10, 'LEFT STICK: SELECT   SOUTH: CHOOSE   EAST: BACK', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#fff3a8',
      })
      .setOrigin(1, 0)
      .setVisible(false);

    this.acceptButtonBg.on('pointerdown', () => {
      this.selectedAction = 'accept';
      this.dialogueCallbacks?.onAccept?.();
    });
    this.acceptButtonBg
      .on('pointerover', () => {
        this.keyboardFocus = false;
        this.hoveredAction = 'accept';
        this.selectedAction = 'accept';
        this.refreshControllerSelection();
      })
      .on('pointerout', () => {
        this.hoveredAction = null;
        this.refreshControllerSelection();
      });

    this.rejectButtonBg.on('pointerdown', () => {
      this.selectedAction = 'reject';
      this.dialogueCallbacks?.onReject?.();
    });
    this.rejectButtonBg
      .on('pointerover', () => {
        this.keyboardFocus = false;
        this.hoveredAction = 'reject';
        this.selectedAction = 'reject';
        this.refreshControllerSelection();
      })
      .on('pointerout', () => {
        this.hoveredAction = null;
        this.refreshControllerSelection();
      });

    this.nextButtonBg.on('pointerdown', () => {
      this.selectedAction = 'next';
      if (this.pageIndex < this.pages.length - 1) {
        this.pageIndex += 1;
        this.refreshDialoguePage();
        return;
      }
      this.dialogueCallbacks?.onClose?.();
    });
    this.nextButtonBg
      .on('pointerover', () => {
        this.keyboardFocus = false;
        this.hoveredAction = 'next';
        this.selectedAction = 'next';
        this.refreshControllerSelection();
      })
      .on('pointerout', () => {
        this.hoveredAction = null;
        this.refreshControllerSelection();
      });

    this.container = this.scene.add
      .container(x, y, [
        background,
        portraitPanel,
        this.portrait,
        this.title,
        this.description,
        this.acceptButtonBg,
        this.rejectButtonBg,
        this.nextButtonBg,
        this.acceptButton,
        this.rejectButton,
        this.nextButton,
        this.controllerHint,
      ])
      .setDepth(depth)
      .setVisible(false);
  }

  private refreshDialoguePage(): void {
    const page = this.pages[this.pageIndex] ?? '';
    const isLastPage = this.pageIndex >= this.pages.length - 1;
    const hasChoices = Boolean(
      this.dialogueCallbacks?.onAccept || this.dialogueCallbacks?.onReject,
    );

    this.description?.setText(page);
    this.acceptButton?.setVisible(
      isLastPage && hasChoices && Boolean(this.dialogueCallbacks?.onAccept),
    );
    this.acceptButtonBg?.setVisible(Boolean(this.acceptButton?.visible));
    this.rejectButton?.setVisible(
      isLastPage && hasChoices && Boolean(this.dialogueCallbacks?.onReject),
    );
    this.rejectButtonBg?.setVisible(Boolean(this.rejectButton?.visible));
    this.nextButton?.setVisible(!isLastPage || !hasChoices);
    this.nextButtonBg?.setVisible(Boolean(this.nextButton?.visible));
    const actions = this.getVisibleControllerActions();
    if (!actions.includes(this.selectedAction)) {
      this.selectedAction = actions[0] ?? 'next';
    }
    this.refreshControllerSelection();
  }

  private getVisibleControllerActions(): Array<'accept' | 'reject' | 'next'> {
    const actions: Array<'accept' | 'reject' | 'next'> = [];
    if (this.acceptButton?.visible) actions.push('accept');
    if (this.rejectButton?.visible) actions.push('reject');
    if (this.nextButton?.visible) actions.push('next');
    return actions;
  }

  private moveControllerSelection(delta: number): void {
    const actions = this.getVisibleControllerActions();
    if (actions.length === 0) return;
    const current = Math.max(0, actions.indexOf(this.selectedAction));
    this.selectedAction = actions[(current + delta + actions.length) % actions.length]!;
    this.refreshControllerSelection();
  }

  private activateControllerSelection(): void {
    if (this.selectedAction === 'accept') {
      this.dialogueCallbacks?.onAccept?.();
      return;
    }
    if (this.selectedAction === 'reject') {
      this.dialogueCallbacks?.onReject?.();
      return;
    }
    if (this.pageIndex < this.pages.length - 1) {
      this.pageIndex += 1;
      this.refreshDialoguePage();
    } else {
      this.dialogueCallbacks?.onClose?.();
    }
  }

  private refreshControllerSelection(): void {
    const buttons = [
      ['accept', this.acceptButton, this.acceptButtonBg, 0x224433, 0x5dd6a2],
      ['reject', this.rejectButton, this.rejectButtonBg, 0x442222, 0xff6b6b],
      ['next', this.nextButton, this.nextButtonBg, 0x22334a, 0x9ad1ff],
    ] as const;
    for (const [id, button, background, baseColor, accent] of buttons) {
      if (!button || !background) continue;
      const selected =
        button.visible &&
        (((this.controllerMode || this.keyboardFocus) && this.selectedAction === id) ||
          this.hoveredAction === id);
      background
        .setFillStyle(selected ? 0x4d6da3 : baseColor, selected ? 1 : 0.94)
        .setStrokeStyle(selected ? 4 : 2, selected ? 0xfff3a8 : accent, selected ? 1 : 0.82);
      button.setColor(
        selected
          ? '#fff3a8'
          : id === 'accept'
            ? '#5dd6a2'
            : id === 'reject'
              ? '#ff6b6b'
              : '#9ad1ff',
      );
    }
  }

  private createDialogueButtonBackground(
    x: number,
    y: number,
    width: number,
    height: number,
    fill: number,
    stroke: number,
  ): Phaser.GameObjects.Rectangle {
    return this.scene.add
      .rectangle(x, y, width, height, fill, 0.94)
      .setStrokeStyle(2, stroke, 0.82)
      .setInteractive({ useHandCursor: true });
  }

  private resolvePortraitKey(portraitId?: string): string {
    const variant: QuestPortraitVariant =
      portraitId === 'sage-2' ||
      portraitId === 'sage-3' ||
      portraitId === 'bandit-neutral' ||
      portraitId === 'bandit-hostile' ||
      portraitId === 'cardwright-neutral' ||
      portraitId === 'goblin-happy' ||
      portraitId === 'goblin-neutral' ||
      portraitId === 'goblin-hostile' ||
      portraitId === 'ocean-fisher-neutral' ||
      portraitId === 'ocean-fisher-happy'
        ? portraitId
        : portraitId === 'thiefContact' || portraitId === 'thief'
          ? 'bandit-neutral'
          : portraitId === 'guard-neutral'
            ? 'bandit-hostile'
            : portraitId === 'shopkeeper-neutral' ||
                portraitId === 'villager-neutral' ||
                portraitId === 'villager-old-neutral'
              ? 'sage-2'
              : portraitId === 'tanuki-neutral'
                ? 'bandit-neutral'
                : 'sage-1';
    return this.portraitTextureKeys[variant];
  }
}
