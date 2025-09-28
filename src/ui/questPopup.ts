import Phaser from "phaser";
import type SnakeScene from "../scenes/snakeScene.js";
import type { Quest } from "../../quests.js";

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

const DEFAULT_OPTIONS: Required<QuestPopupOptions> = {
  size: { width: 400, height: 150 },
  depth: 20,
  backgroundColor: 0x122030,
  backgroundAlpha: 0.9,
  borderColor: 0x9ad1ff,
  titleStyle: { fontFamily: "monospace", fontSize: "20px", color: "#9ad1ff" },
  descriptionStyle: { fontFamily: "monospace", fontSize: "16px", color: "#e6e6e6" },
  buttonStyle: {
    fontFamily: "monospace",
    fontSize: "18px",
    color: "#ffffff",
    backgroundColor: "#224433",
    padding: { left: 10, right: 10, top: 5, bottom: 5 },
  },
  buttonSpacing: 140,
};

export class QuestPopup {
  private container?: Phaser.GameObjects.Container;
  private title?: Phaser.GameObjects.Text;
  private description?: Phaser.GameObjects.Text;
  private acceptButton?: Phaser.GameObjects.Text;
  private rejectButton?: Phaser.GameObjects.Text;

  private callbacks: QuestPopupCallbacks | null = null;
  private options: Required<QuestPopupOptions>;

  constructor(
    private readonly scene: SnakeScene,
    options: QuestPopupOptions = {}
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

    this.build();
  }

  show(quest: Quest, callbacks: QuestPopupCallbacks): void {
    this.callbacks = callbacks;
    this.title?.setText("New Quest!");
    this.description?.setText(quest.description);
    this.container?.setVisible(true);
    this.scene.time.delayedCall(0, () => this.container?.setDepth(this.options.depth));
  }

  hide(): void {
    this.container?.setVisible(false);
    this.callbacks = null;
  }

  isVisible(): boolean {
    return Boolean(this.container?.visible);
  }

  private build(): void {
    const { size, backgroundColor, backgroundAlpha, borderColor, depth, buttonSpacing } =
      this.options;
    const x = (this.scene.scale.width - size.width) / 2;
    const y = (this.scene.scale.height - size.height) / 2;

    const background = this.scene.add
      .graphics()
      .fillStyle(backgroundColor, backgroundAlpha)
      .fillRect(0, 0, size.width, size.height)
      .lineStyle(2, borderColor)
      .strokeRect(0, 0, size.width, size.height);

    this.title = this.scene.add
      .text(size.width / 2, 20, "", this.options.titleStyle)
      .setOrigin(0.5);
    this.description = this.scene.add
      .text(size.width / 2, 60, "", this.options.descriptionStyle)
      .setOrigin(0.5);

    this.acceptButton = this.scene.add
      .text(size.width / 2 - buttonSpacing / 2, size.height - 30, "Accept", {
        ...this.options.buttonStyle,
        color: "#5dd6a2",
        backgroundColor: "#224433",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.rejectButton = this.scene.add
      .text(size.width / 2 + buttonSpacing / 2, size.height - 30, "Reject", {
        ...this.options.buttonStyle,
        color: "#ff6b6b",
        backgroundColor: "#442222",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.acceptButton.on("pointerdown", () => {
      this.callbacks?.onAccept();
    });

    this.rejectButton.on("pointerdown", () => {
      this.callbacks?.onReject();
    });

    this.container = this.scene.add
      .container(x, y, [background, this.title, this.description, this.acceptButton, this.rejectButton])
      .setDepth(depth)
      .setVisible(false);
  }
}