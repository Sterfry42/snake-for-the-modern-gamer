import Phaser from "phaser";
import type SnakeScene from "../scenes/snakeScene.js";

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
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private background?: Phaser.GameObjects.Rectangle;
  private optionMaskGraphics?: Phaser.GameObjects.Graphics;
  private onPick?: (id: string) => void;
  private scrollY = 0;
  private contentHeight = 0;
  private viewportHeight = 0;
  private readonly width = 500;

  constructor(private readonly scene: SnakeScene) {
    this.build();
  }

  show(title: string, options: ChoiceOption[], onPick: (id: string) => void): void {
    this.onPick = onPick;
    this.scene.setChoicePopupVisible(true);
    this.titleText?.setText(title);
    // Clear old
    for (const t of this.optionTexts) t.destroy();
    this.optionTexts = [];
    this.scrollY = 0;

    const baseX = 8;
    let y = 0;
    for (const opt of options) {
      const label = this.scene.add.text(baseX, y, `${opt.title}\n${opt.description}`, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
        lineSpacing: 4,
        wordWrap: { width: 424 },
        backgroundColor: "rgba(0,0,0,0)",
        padding: { left: 10, right: 10, top: 6, bottom: 6 },
      }).setInteractive({ useHandCursor: true })
        .on("pointerover", () => label.setColor("#9ad1ff"))
        .on("pointerout", () => label.setColor("#ffffff"))
        .on("pointerdown", () => this.pick(opt.id));
      this.optionContainer?.add(label);
      this.optionTexts.push(label);
      y += label.height + 16;
    }
    this.contentHeight = Math.max(0, y);
    const maxHeight = Math.max(220, this.scene.scale.height - 48);
    const popupHeight = Math.min(maxHeight, Math.max(240, this.contentHeight + 100));
    this.viewportHeight = Math.max(120, popupHeight - 92);
    const x = (this.scene.scale.width - this.width) / 2;
    const rootY = (this.scene.scale.height - popupHeight) / 2;
    this.container?.setPosition(x, rootY);
    this.background?.setSize(this.width, popupHeight);
    this.optionContainer?.setPosition(16, 60);
    this.scrollHintText
      ?.setText(this.contentHeight > this.viewportHeight ? "Mouse wheel to scroll" : "")
      .setPosition(this.width / 2, popupHeight - 24);
    this.updateMask(x, rootY);
    this.applyScroll(0);
    this.container?.setVisible(true).setDepth(35);
  }

  hide(): void {
    this.container?.setVisible(false);
    this.scene.setChoicePopupVisible(false);
    this.onPick = undefined;
  }

  isVisible(): boolean {
    return Boolean(this.container?.visible);
  }

  private pick(id: string): void {
    const cb = this.onPick;
    this.hide();
    if (cb) cb(id);
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
    this.optionContainer?.setY(60 - this.scrollY);
    this.updateOptionInteractivity();
  }

  private updateOptionInteractivity(): void {
    for (const label of this.optionTexts) {
      const top = label.y - this.scrollY;
      const bottom = top + label.height;
      const visible = bottom >= 0 && top <= this.viewportHeight;
      if (visible) {
        label.setInteractive({ useHandCursor: true });
      } else {
        label.disableInteractive();
      }
    }
  }

  private updateMask(rootX: number, rootY: number): void {
    if (!this.optionMaskGraphics || !this.optionContainer) {
      return;
    }
    this.optionMaskGraphics.clear();
    this.optionMaskGraphics.fillStyle(0xffffff, 1);
    this.optionMaskGraphics.fillRect(rootX + 16, rootY + 60, this.width - 32, this.viewportHeight);
    const mask = this.optionMaskGraphics.createGeometryMask();
    this.optionContainer.setMask(mask);
  }

  private build(): void {
    const height = 240;
    const x = (this.scene.scale.width - this.width) / 2;
    const y = (this.scene.scale.height - height) / 2;

    this.background = this.scene.add
      .rectangle(0, 0, this.width, height, 0x0b1622, 0.94)
      .setStrokeStyle(2, 0x4da3ff)
      .setOrigin(0, 0);

    this.titleText = this.scene.add.text(this.width / 2, 20, "", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#9ad1ff",
    }).setOrigin(0.5, 0);

    this.optionContainer = this.scene.add.container(16, 60);
    this.scrollHintText = this.scene.add.text(this.width / 2, height - 24, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#6da8d8",
    }).setOrigin(0.5, 0);
    this.optionMaskGraphics = this.scene.add.graphics().setVisible(false);
    this.container = this.scene.add.container(x, y, [this.background, this.titleText, this.optionContainer, this.scrollHintText]).setVisible(false);
    this.scene.input.on("wheel", (_pointer: Phaser.Input.Pointer, _objects: unknown[], _dx: number, dy: number) => {
      this.scrollBy(dy);
    });
  }
}
