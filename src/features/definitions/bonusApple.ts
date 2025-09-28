import Phaser from "phaser";
import { Feature } from "../feature.js";
import type SnakeScene from "../../scenes/snakeScene.js";

const ACTIVATION_CHANCE = 0.005;

class BonusAppleFeature extends Feature {
  constructor() {
    super("bonusApple", "Bonus apple timer bar");
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

  override onRender(scene: SnakeScene, graphics: Phaser.GameObjects.Graphics): void {
    if (!scene.getFlag<boolean>("bonusActive")) {
      return;
    }
    graphics.beginPath();
    graphics.fillStyle(0x54ff9a, 1);
    graphics.fillRect(0, 0, scene.grid.cols * scene.grid.cell * 0.5, 4);
  }
}

export default new BonusAppleFeature();
