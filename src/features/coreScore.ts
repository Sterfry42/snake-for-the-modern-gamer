import { registerFeature } from "../systems/features";

// This variable is in the module scope, so it persists across game resets.
let scoreText: Phaser.GameObjects.Text | null = null;

registerFeature({
  id: "score",
  label: "Score HUD",
  onRegister(s) {
    // Create the text object only if it doesn't exist.
    if (!scoreText) {
      scoreText = s.add.text(10, 8, "Score: 0", { fontFamily: "monospace", fontSize: "16px", color: "#9ad1ff" });
    }
  },
  onAppleEaten(s){ s.addScore(1); },
  onGameOver(s) {
    scoreText?.setText("Score: 0");
  },
  onRender(s) {
    scoreText?.setText(`Score: ${s.score}`);
  }
});
