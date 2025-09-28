import Phaser from "phaser";
import type SnakeScene from "../scenes/snakeScene.js";
import type { Quest } from "../../quests.js";

interface QuestHudOptions {
  position?: { x: number; y: number };
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  lineSpacing?: number;
  depth?: number;
}

const DEFAULT_OPTIONS: Required<QuestHudOptions> = {
  position: { x: 0, y: 0 },
  fontSize: "14px",
  fontFamily: "monospace",
  color: "#e6e6e6",
  lineSpacing: 4,
  depth: 10,
};

export class QuestHud {
  private readonly text: Phaser.GameObjects.Text;
  private options: Required<QuestHudOptions>;

  constructor(
    private readonly scene: SnakeScene,
    options: QuestHudOptions = {}
  ) {
    this.options = {
      position: options.position ?? DEFAULT_OPTIONS.position,
      fontSize: options.fontSize ?? DEFAULT_OPTIONS.fontSize,
      fontFamily: options.fontFamily ?? DEFAULT_OPTIONS.fontFamily,
      color: options.color ?? DEFAULT_OPTIONS.color,
      lineSpacing: options.lineSpacing ?? DEFAULT_OPTIONS.lineSpacing,
      depth: options.depth ?? DEFAULT_OPTIONS.depth,
    };

    this.text = this.scene.add
      .text(this.options.position.x, this.options.position.y, "", {
        fontFamily: this.options.fontFamily,
        fontSize: this.options.fontSize,
        color: this.options.color,
        lineSpacing: this.options.lineSpacing,
        align: "right",
      })
      .setOrigin(1, 0)
      .setDepth(this.options.depth);
  }

  update(quests: Quest[], gridWidth: number): void {
    const lines = quests.map((quest) => `[ ] ${quest.description}`);
    const content = [`Quests:`, ...lines].join("\n");

    this.text.setText(content);
    this.text.setPosition(gridWidth - 10, this.options.position.y);
  }

  setVisible(visible: boolean): void {
    this.text.setVisible(visible);
  }
}