import Phaser from "phaser";
import type SnakeScene from "../scenes/snakeScene.js";

export interface ChoiceOption {
  id: string;
  title: string;
  description: string;
}

export class ChoicePopup {
  private container?: Phaser.GameObjects.Container;
  private titleText?: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private background?: Phaser.GameObjects.Rectangle;
  private onPick?: (id: string) => void;

  constructor(private readonly scene: SnakeScene) {
    this.build();
  }

  show(title: string, options: ChoiceOption[], onPick: (id: string) => void): void {
    this.onPick = onPick;
    this.titleText?.setText(title);
    // Clear old
    for (const t of this.optionTexts) t.destroy();
    this.optionTexts = [];

    const baseX = 24;
    let y = 60;
    for (const opt of options) {
      const label = this.scene.add.text(baseX, y, `${opt.title}\n${opt.description}`, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
        lineSpacing: 4,
        wordWrap: { width: 440 },
        backgroundColor: "rgba(0,0,0,0)",
        padding: { left: 10, right: 10, top: 6, bottom: 6 },
      }).setInteractive({ useHandCursor: true })
        .on("pointerover", () => label.setColor("#9ad1ff"))
        .on("pointerout", () => label.setColor("#ffffff"))
        .on("pointerdown", () => this.pick(opt.id));
      this.container?.add(label);
      this.optionTexts.push(label);
      y += label.height + 16;
    }
    const contentHeight = Math.max(180, y + 16);
    this.background?.setSize(500, contentHeight);
    this.container?.setVisible(true).setDepth(35);
  }

  hide(): void {
    this.container?.setVisible(false);
    this.onPick = undefined;
  }

  private pick(id: string): void {
    const cb = this.onPick;
    this.hide();
    if (cb) cb(id);
  }

  private build(): void {
    const width = 500;
    const height = 240;
    const x = (this.scene.scale.width - width) / 2;
    const y = (this.scene.scale.height - height) / 2;

    this.background = this.scene.add
      .rectangle(0, 0, width, height, 0x0b1622, 0.94)
      .setStrokeStyle(2, 0x4da3ff)
      .setOrigin(0, 0);

    this.titleText = this.scene.add.text(width / 2, 20, "", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#9ad1ff",
    }).setOrigin(0.5, 0);

    this.container = this.scene.add.container(x, y, [this.background, this.titleText]).setVisible(false);
  }
}

