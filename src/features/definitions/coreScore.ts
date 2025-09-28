import Phaser from "phaser";
import { Feature } from "../feature.js";
import type SnakeScene from "../../scenes/snakeScene.js";

class ScoreFeature extends Feature {
  private scoreText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super("coreScore", "Score HUD");
  }

  override onRegister(scene: SnakeScene): void {
    if (!this.scoreText) {
      this.scoreText = scene.add
        .text(10, 8, "Score: 0", {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#9ad1ff",
        })
        .setDepth(10);
    }
  }

  override onAppleEaten(scene: SnakeScene): void {
    scene.addScore(1);
    const apples = (scene.getFlag<number>("applesEaten") ?? 0) + 1;
    scene.setFlag("applesEaten", apples);
  }

  override onGameOver(): void {
    this.scoreText?.setText("Score: 0");
  }

  override onRender(scene: SnakeScene): void {
    this.scoreText?.setText(`Score: ${scene.score}`);
  }
}

export default new ScoreFeature();
