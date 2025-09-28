import Phaser from "phaser";
import { callFeatureHooks, registerBuiltInFeatures } from "../systems/features.js";
import { registerBuiltInQuests } from "../systems/quests.js";
import { getRoom, clearWorld } from "../systems/world.js";
import {
  createSnakeState,
  resetSnakeState,
  setSnakeDirection,
  advanceSnake,
  type SnakeState,
} from "../systems/snakeState.js";
import { AppleManager } from "../systems/appleManager.js";
import { QuestController } from "../systems/questController.js";
import { QuestHud } from "../ui/questHud.js";
import { QuestPopup } from "../ui/questPopup.js";
import { SnakeRenderer } from "../ui/snakeRenderer.js";
import { JuiceManager } from "../ui/juice.js";
import type { Quest } from "../../quests.js";

export default class SnakeScene extends Phaser.Scene {
  graphics!: Phaser.GameObjects.Graphics;
  grid = { cols: 32, rows: 24, cell: 24 };

  private state: SnakeState = createSnakeState(this.grid);
  private questController = new QuestController();
  private questHud!: QuestHud;
  private questPopup!: QuestPopup;
  private snakeRenderer!: SnakeRenderer;
  private juice!: JuiceManager;
  private apples = new AppleManager(this.grid);

  paused = true;
  isDirty = false;

  constructor() {
    super("SnakeScene");
  }

  get snake(): Phaser.Math.Vector2[] {
    return this.state.body;
  }

  set snake(value: Phaser.Math.Vector2[]) {
    this.state.body = value;
  }

  get dir(): Phaser.Math.Vector2 {
    return this.state.dir;
  }

  get nextDir(): Phaser.Math.Vector2 {
    return this.state.nextDir;
  }

  get score(): number {
    return this.state.score;
  }

  set score(value: number) {
    this.state.score = value;
  }

  get flags(): Record<string, unknown> {
    return this.state.flags;
  }

  set flags(value: Record<string, unknown>) {
    this.state.flags = value;
  }

  get teleport(): boolean {
    return this.state.teleport;
  }

  set teleport(value: boolean) {
    this.state.teleport = value;
  }

  get currentRoomId(): string {
    return this.state.currentRoomId;
  }

  set currentRoomId(value: string) {
    this.state.currentRoomId = value;
  }

  get activeQuests(): Quest[] {
    return this.questController.getActiveQuests();
  }

  get completedQuests(): string[] {
    return this.questController.getCompletedQuestIds();
  }

  get offeredQuest(): Quest | null {
    return this.questController.getOfferedQuest();
  }

  async create() {
    this.graphics = this.add.graphics();
    this.snakeRenderer = new SnakeRenderer(this.graphics, this.grid);
    this.juice = new JuiceManager(this);

    this.input.keyboard!.on("keydown", (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === " ") {
        if (this.offeredQuest) return;
        this.paused = !this.paused;
      }
      if (["arrowup", "w"].includes(k)) this.setDir(0, -1);
      if (["arrowdown", "s"].includes(k)) this.setDir(0, 1);
      if (["arrowleft", "a"].includes(k)) this.setDir(-1, 0);
      if (["arrowright", "d"].includes(k)) this.setDir(1, 0);
    });

    this.questHud = new QuestHud(this, {
      position: { x: this.grid.cols * this.grid.cell - 10, y: 8 },
    });
    this.questPopup = new QuestPopup(this);
    this.graphics.setDepth(0);

    await registerBuiltInFeatures(this);
    registerBuiltInQuests();
    callFeatureHooks("onRegister", this);

    this.initGame(false);
    this.time.addEvent({
      loop: true,
      delay: 100,
      callback: () => {
        if (!this.paused) this.step();
      },
    });

    this.cameras.main.setBounds(
      0,
      0,
      this.grid.cols * this.grid.cell,
      this.grid.rows * this.grid.cell
    );
  }

  initGame(resetWorld = true) {
    if (resetWorld) {
      clearWorld();
    }
    this.apples.resetAll();
    resetSnakeState(this.state);
    this.questController.reset();
    this.questPopup.hide();
    this.ensureAppleInCurrentRoom();
    this.isDirty = true;
  }

  setDir(x: number, y: number) {
    setSnakeDirection(this.state, x, y);
  }

  spawnApple() {
    const { changed } = this.apples.spawnCurrent(this.currentRoomId, this.snake, this.score);
    if (changed) {
      this.isDirty = true;
    }
  }

  ensureAppleInCurrentRoom() {
    const { changed } = this.apples.ensureCurrent(this.currentRoomId, this.snake, this.score);
    if (changed) {
      this.isDirty = true;
    }
  }

  gameOver(reason?: string) {
    this.juice?.gameOver();
    this.initGame();
    callFeatureHooks("onGameOver", this);
    this.paused = true;
    this.isDirty = true;
    console.log("Game over:", reason);
  }

  private updateSkittishApple() {
    const { changed } = this.apples.updateSkittish(this.currentRoomId, this.snake);
    if (changed) {
      this.isDirty = true;
    }
  }

  step() {
    this.updateSkittishApple();

    const appleBeforeStep = this.apples.getCurrent();

    const outcome = advanceSnake(this.state, {
      getRoom: (roomId: string) => getRoom(roomId, this.grid),
      ensureApple: (roomId: string) => {
        const { changed } = this.apples.ensureRoom(roomId, this.snake, this.score);
        if (changed) {
          this.isDirty = true;
        }
      },
    });

    if (outcome.status === "dead") {
      this.gameOver(outcome.reason);
      return;
    }

    const { changed: roomChanged } = this.apples.setCurrentRoom(this.currentRoomId);
    const { changed: ensuredCurrent } = this.apples.ensureCurrent(
      this.currentRoomId,
      this.snake,
      this.score
    );
    if (roomChanged || ensuredCurrent) {
      this.isDirty = true;
    }

    if (outcome.appleEaten) {
      const consumption = this.apples.handleConsumption(appleBeforeStep, this.dir);
      if (consumption.fatal) {
        this.gameOver("shielded apple");
        return;
      }

      callFeatureHooks("onAppleEaten", this);

      const { growth, bonusScore } = consumption.rewards;
      if (bonusScore > 0) {
        this.addScore(bonusScore);
      }

      const extraGrowth = Math.max(0, growth - 1);
      if (extraGrowth > 0) {
        const tail = this.snake[this.snake.length - 1];
        if (tail) {
          for (let i = 0; i < extraGrowth; i++) {
            this.snake.push(tail.clone());
          }
        }
      }

      if (consumption.worldPosition) {
        this.juice?.appleChomp(consumption.worldPosition.x, consumption.worldPosition.y);
      }

      if (consumption.changed) {
        this.isDirty = true;
      }

      const { changed: spawnChanged } = this.apples.spawnCurrent(
        this.currentRoomId,
        this.snake,
        this.score
      );
      if (spawnChanged) {
        this.isDirty = true;
      }
    }

    this.juice?.movementTick();

    const offered = this.questController.maybeCreateOffer(this.paused);
    if (offered) {
      this.offerQuest(offered);
    }

    if (this.questController.handleCompletions(this)) {
      this.isDirty = true;
      this.juice?.questCompleted();
    }

    this.isDirty = true;
  }


  offerQuest(quest: Quest) {
    this.paused = true;
    this.juice?.questOffered();

    this.questPopup.show(quest, {
      onAccept: () => {
        this.juice?.questAccepted();
        const accepted = this.questController.acceptOfferedQuest();
        if (accepted) {
          this.isDirty = true;
        }
        this.closeQuestPopup();
      },
      onReject: () => {
        this.juice?.questRejected();
        this.questController.rejectOfferedQuest();
        this.closeQuestPopup();
      },
    });
  }

  closeQuestPopup() {
    this.questPopup.hide();
    this.paused = false;
    this.isDirty = true;
  }

  addScore(n: number) {
    this.score = this.score + n;
    this.isDirty = true;
  }

  update() {
    if (this.isDirty) {
      this.draw();
      this.isDirty = false;
    }
  }

  draw() {
    const room = getRoom(this.currentRoomId, this.grid);
    const renderApple = this.apples.getCurrent();
    this.snakeRenderer.render(room, this.state, renderApple);
    this.questHud.update(this.activeQuests, this.grid.cols * this.grid.cell);

    callFeatureHooks("onRender", this, this.graphics);
  }

}
