import Phaser from "phaser";
import type SnakeScene from "../scenes/snakeScene.js";

interface BossHudDisplay {
  readonly name: string;
  readonly health: number;
  readonly maxHealth: number;
}

export class BossHud {
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly barOutline: Phaser.GameObjects.Rectangle;
  private readonly barFill: Phaser.GameObjects.Rectangle;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly barWidth: number;
  private visible = false;

  constructor(private readonly scene: SnakeScene) {
    const { width, height } = this.scene.scale;
    this.barWidth = Math.min(width * 0.68, 520);

    this.background = this.scene.add
      .rectangle(0, 0, this.barWidth + 40, 80, 0x05060d, 0.88)
      .setStrokeStyle(2, 0x2b2d34)
      .setOrigin(0.5, 0.5);

    this.barOutline = this.scene.add
      .rectangle(0, 16, this.barWidth, 18, 0x000000, 0)
      .setStrokeStyle(2, 0x5a1212)
      .setOrigin(0.5, 0.5);

    this.barFill = this.scene.add
      .rectangle(-this.barWidth / 2, 16, this.barWidth, 14, 0xb22525, 0.9)
      .setOrigin(0, 0.5);

    this.nameText = this.scene.add
      .text(0, -16, "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "22px",
        color: "#f1e9dd",
        stroke: "#1c0b0b",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0.5);

    this.container = this.scene.add.container(width / 2, height - 70, [
      this.background,
      this.barOutline,
      this.barFill,
      this.nameText,
    ]);
    this.container.setDepth(80);
    this.container.setVisible(false);
  }

  show(info: BossHudDisplay): void {
    const safeMax = Math.max(1, info.maxHealth);
    const pct = Phaser.Math.Clamp(info.health / safeMax, 0, 1);
    this.barFill.setDisplaySize(Math.max(1, this.barWidth * pct), 14);
    this.nameText.setText(info.name.toUpperCase());
    this.container.setVisible(true);
    this.visible = true;
  }

  hide(): void {
    if (!this.visible) {
      return;
    }
    this.container.setVisible(false);
    this.visible = false;
  }
}
