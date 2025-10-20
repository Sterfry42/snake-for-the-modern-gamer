import type Phaser from "phaser";
import type SnakeScene from "../scenes/snakeScene.js";

export class DialogueBox {
  private container: Phaser.GameObjects.Container;
  private dialogueText: Phaser.GameObjects.Text;
  private promptText: Phaser.GameObjects.Text;
  private background: Phaser.GameObjects.Rectangle;

  private fullDialogue: string[] = [];
  private currentLineIndex = 0;
  private onComplete?: () => void;

  constructor(private scene: SnakeScene) {
    const width = this.scene.grid.cols * this.scene.grid.cell * 0.8;
    const height = 100;
    const x = (this.scene.grid.cols * this.scene.grid.cell) / 2;
    const y = this.scene.grid.rows * this.scene.grid.cell - height / 2 - 20;

    this.background = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8)
      .setStrokeStyle(2, 0x9ad1ff);

    this.dialogueText = this.scene.add.text(0, 0, "", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffffff",
      wordWrap: { width: width - 40 },
      align: "center",
    }).setOrigin(0.5, 0.5);

    this.promptText = this.scene.add.text(width / 2 - 20, height / 2 - 20, "Space >", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#a0a0a0",
    }).setOrigin(1, 1);

    this.container = this.scene.add.container(x, y, [this.background, this.dialogueText, this.promptText])
      .setDepth(50)
      .setVisible(false);
  }

  public show(dialogue: string[], onComplete: () => void): void {
    if (dialogue.length === 0) {
      onComplete();
      return;
    }
    this.fullDialogue = dialogue;
    this.currentLineIndex = 0;
    this.onComplete = onComplete;
    this.dialogueText.setText(this.fullDialogue[this.currentLineIndex]);
    this.container.setVisible(true);
  }

  public next(): void {
    if (!this.container.visible) return;

    this.currentLineIndex++;
    if (this.currentLineIndex >= this.fullDialogue.length) {
      this.hide();
    } else {
      this.dialogueText.setText(this.fullDialogue[this.currentLineIndex]);
    }
  }

  private hide(): void {
    this.container.setVisible(false);
    if (this.onComplete) {
      this.onComplete();
    }
  }

  public isVisible(): boolean {
    return this.container.visible;
  }
}