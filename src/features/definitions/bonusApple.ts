import Phaser from "phaser";
import { Feature } from "../feature.js";
import type SnakeScene from "../../scenes/snakeScene.js";

const ACTIVATION_CHANCE = 0.005;

class BonusAppleFeature extends Feature {
  private statusText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super("bonusApple", "Bonus apple timer bar");
  }

  override onRegister(scene: SnakeScene): void {
    if (!this.statusText) {
      this.statusText = scene.add
        .text(10, 48, "Bonus apple ready", {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#54ff9a",
          stroke: "#06140b",
          strokeThickness: 3,
        })
        .setDepth(10)
        .setVisible(false);
    }
  }

  override onAppleEaten(scene: SnakeScene): void {
    if (scene.getFlag<boolean>("bonusActive")) {
      scene.addScore(4);
    }
    scene.setFlag("bonusActive", false);
  }

  override onTick(scene: SnakeScene): void {
    if (!scene.getFlag<boolean>("bonusActive") && scene.random() < ACTIVATION_CHANCE) {
      scene.setFlag("bonusActive", true);
    }
  }

  override onRender(scene: SnakeScene): void {
    const visible = Boolean(
      scene.getFlag<boolean>("bonusActive") &&
      !scene.getFlag<boolean>("ui.suppressHud") &&
      !(scene as any).paused
    );
    this.statusText?.setVisible(visible);
  }
}

export default new BonusAppleFeature();
