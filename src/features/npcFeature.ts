import type Phaser from "phaser";
import type { Feature } from "../systems/features.js";
import type SnakeScene from "../scenes/snakeScene.js";
import { getAllNpcs, type Npc } from "../npcs.js";
import { DialogueBox } from "../ui/dialogueBox.js";

class NpcFeature implements Feature {
  public readonly id = "npcs";
  private npcSprites = new Map<string, Phaser.GameObjects.Text>();
  private dialogueBox?: DialogueBox;
  private interactionCooldown = 0;
  private readonly COOLDOWN_TICKS = 5; // 5 ticks = 500ms

  onRender(scene: SnakeScene, graphics: Phaser.GameObjects.Graphics): void {
    const room = scene.game.getCurrentRoom();
    const npcs = getAllNpcs();

    // Naive implementation: assumes NPCs are in the origin room "0,0,0"
    if (room.id !== "0,0,0") {
      this.npcSprites.forEach(sprite => sprite.setVisible(false));
      return;
    }

    for (const npc of npcs) {
      if (!this.npcSprites.has(npc.id)) {
        const { x, y } = scene.snakeRenderer.getWorldPosition(npc.position, room.id);
        const sprite = scene.add.text(x + scene.grid.cell / 2, y + scene.grid.cell / 2, '?', {
          fontSize: `${scene.grid.cell * 0.8}px`,
          color: '#a0a0ff',
          align: 'center',
        }).setOrigin(0.5, 0.5).setDepth(1);
        this.npcSprites.set(npc.id, sprite);
      }
      this.npcSprites.get(npc.id)?.setVisible(true);
    }
  }

  onSceneCreate(scene: SnakeScene): void {
    this.dialogueBox = new DialogueBox(scene);
  }

  onTick(scene: SnakeScene): void {
    if (this.interactionCooldown > 0) {
      this.interactionCooldown--;
      return;
    }

    if (this.dialogueBox?.isVisible()) {
      return;
    }

    const snakeHead = scene.snake[0];
    if (!snakeHead) return;

    // Naive implementation: assumes NPCs are in the origin room "0,0,0"
    if (scene.currentRoomId !== "0,0,0") {
      return;
    }

    const npcs = getAllNpcs();
    for (const npc of npcs) {
      if (snakeHead.x === npc.position.x && snakeHead.y === npc.position.y) {
        this.triggerDialogue(scene, npc);
        break;
      }
    }
  }

  private triggerDialogue(scene: SnakeScene, npc: Npc): void {
    scene.pauseGame(true);
    this.dialogueBox?.show(npc.dialogue, () => {
      scene.pauseGame(false);
      this.interactionCooldown = this.COOLDOWN_TICKS;
    });
  }
}

export const npcFeature = new NpcFeature();