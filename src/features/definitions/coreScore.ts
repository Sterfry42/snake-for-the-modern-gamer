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
        .text(10, 8, this.composeLabel(scene), {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#9ad1ff",
          lineSpacing: 2,
        })
        .setDepth(10);
    }
  }

  override onAppleEaten(scene: SnakeScene): void {
    const multiplier = Math.max(1, Number(scene.getFlag<number>("cheat.appleScoreMultiplier") ?? 1));
    scene.addScore(multiplier);
    const apples = (scene.getFlag<number>("applesEaten") ?? 0) + 1;
    scene.setFlag("applesEaten", apples);
  }

  override onGameOver(scene: SnakeScene): void {
    this.scoreText?.setText(this.composeLabel(scene, 0));
  }

  override onRender(scene: SnakeScene): void {
    const suppressed = !!scene.getFlag<boolean>("ui.suppressHud");
    this.scoreText?.setVisible(!suppressed);
    if (!suppressed) {
      this.scoreText?.setText(this.composeLabel(scene));
    }
  }

  private composeLabel(scene: SnakeScene, scoreOverride?: number): string {
    const score = scoreOverride ?? scene.score;
    const length = scene.snake.length;
    return `Score: ${score}\nLength: ${length}`;
  }
}

export default new ScoreFeature();
