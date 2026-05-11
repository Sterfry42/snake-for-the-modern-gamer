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
  depth: 20,
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

  private callbacks: QuestPopupCallbacks | null = null;
  private dialogueCallbacks: DialoguePopupCallbacks | null = null;
  private pages: string[] = [];
  private pageIndex = 0;
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
      'New Quest!',
      [quest.description],
      {
        onAccept: callbacks.onAccept,
        onReject: callbacks.onReject,
      },
      {
        acceptLabel: i18n.getCommon('quest.accept') as string,
        rejectLabel: i18n.getCommon('quest.refuse') as string,
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
    this.callbacks = null;
    this.dialogueCallbacks = callbacks;
    this.pages = pages.length > 0 ? pages : [''];
    this.pageIndex = 0;
    this.title?.setText(title);
    this.portrait?.setTexture(this.resolvePortraitKey(speaker.portraitId)).setVisible(true);
    this.acceptButton?.setText(labels.acceptLabel ?? (i18n.getCommon('quest.accept') as string));
    this.rejectButton?.setText(labels.rejectLabel ?? (i18n.getCommon('quest.refuse') as string));
    this.nextButton?.setText(
      labels.nextLabel ??
        (callbacks.onAccept || callbacks.onReject ? 'Next' : (labels.closeLabel ?? 'Close')),
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

    this.acceptButton = this.scene.add
      .text(size.width / 2 - buttonSpacing / 2, size.height - 30, 'Accept', {
        ...this.options.buttonStyle,
        color: '#5dd6a2',
        backgroundColor: '#224433',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.rejectButton = this.scene.add
      .text(size.width / 2 + buttonSpacing / 2, size.height - 30, 'Reject', {
        ...this.options.buttonStyle,
        color: '#ff6b6b',
        backgroundColor: '#442222',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.nextButton = this.scene.add
      .text(size.width / 2, size.height - 30, 'Next', {
        ...this.options.buttonStyle,
        color: '#9ad1ff',
        backgroundColor: '#22334a',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.acceptButton.on('pointerdown', () => {
      this.dialogueCallbacks?.onAccept?.();
    });

    this.rejectButton.on('pointerdown', () => {
      this.dialogueCallbacks?.onReject?.();
    });

    this.nextButton.on('pointerdown', () => {
      if (this.pageIndex < this.pages.length - 1) {
        this.pageIndex += 1;
        this.refreshDialoguePage();
        return;
      }
      this.dialogueCallbacks?.onClose?.();
    });

    this.container = this.scene.add
      .container(x, y, [
        background,
        portraitPanel,
        this.portrait,
        this.title,
        this.description,
        this.acceptButton,
        this.rejectButton,
        this.nextButton,
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
    this.rejectButton?.setVisible(
      isLastPage && hasChoices && Boolean(this.dialogueCallbacks?.onReject),
    );
    this.nextButton?.setVisible(!isLastPage || !hasChoices);
  }

  private resolvePortraitKey(portraitId?: string): string {
    const variant: QuestPortraitVariant =
      portraitId === 'sage-2' || portraitId === 'sage-3' ? portraitId : 'sage-1';
    return this.portraitTextureKeys[variant];
  }
}
