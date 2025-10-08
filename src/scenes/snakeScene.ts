﻿import Phaser from "phaser";
import { defaultGameConfig } from "../config/gameConfig.js";
import { SnakeGame } from "../game/snakeGame.js";
import { FeatureManager } from "../systems/features.js";
import { createQuestRegistry } from "../systems/quests.js";
import { SkillTreeManager } from "../systems/skillTreeManager.js";
import { QuestHud } from "../ui/questHud.js";
import { QuestPopup } from "../ui/questPopup.js";
import { SnakeRenderer } from "../ui/snakeRenderer.js";
import { JuiceManager } from "../ui/juice.js";
import type { Quest } from "../../quests.js";
import type { AppleSnapshot } from "../apples/types.js";
import type { Vector2Like } from "../core/math.js";

export default class SnakeScene extends Phaser.Scene {
  graphics!: Phaser.GameObjects.Graphics;
  readonly grid = defaultGameConfig.grid;

  private game!: SnakeGame;
  private questHud!: QuestHud;
  private questPopup!: QuestPopup;
  private snakeRenderer!: SnakeRenderer;
  private juice!: JuiceManager;
  private skillTree!: SkillTreeManager;
  private readonly featureManager = new FeatureManager();
  private readonly baseTickDelay = 100;
  private tickDelay = this.baseTickDelay;
  private tickEvent!: Phaser.Time.TimerEvent;

  private paused = true;
  private isDirty = false;
  private currentApple: AppleSnapshot | null = null;
  private pendingFlags: Record<string, unknown> = {};
  private readonly flagsProxy: Record<string, unknown>;

  constructor() {
    super("SnakeScene");
    this.flagsProxy = new Proxy<Record<string, unknown>>({} as Record<string, unknown>, {
      get: (_target, prop) => (typeof prop === "string" ? this.getFlag(prop) : undefined),
      set: (_target, prop, value) => {
        if (typeof prop === "string") {
          this.setFlag(prop, value);
        }
        return true;
      },
      deleteProperty: (_target, prop) => {
        if (typeof prop === "string") {
          this.setFlag(prop, undefined);
        }
        return true;
      },
    });
  }

  async create() {
    this.graphics = this.add.graphics();
    this.snakeRenderer = new SnakeRenderer(this.graphics, this.grid);
    this.juice = new JuiceManager(this);
    this.skillTree = new SkillTreeManager(this, this.juice, { baseTickDelay: this.baseTickDelay });

    this.setupInputHandlers();

    this.questHud = new QuestHud(this, {
      position: { x: this.grid.cols * this.grid.cell - 10, y: 8 },
    });
    this.questPopup = new QuestPopup(this);
    this.graphics.setDepth(0);

    const registry = await createQuestRegistry();
    this.game = new SnakeGame(defaultGameConfig, registry);

    await this.featureManager.load(this, defaultGameConfig.features.enabled);

    this.tickEvent = this.time.addEvent({
      loop: true,
      delay: this.tickDelay,
      callback: this.handleTick,
      callbackScope: this,
    });

    this.initGame(false);
  }

  private setupInputHandlers(): void {
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === " ") {
        if (this.offeredQuest) return;
        this.paused = !this.paused;
        this.skillTree.toggleOverlay(this.paused ? true : false);
        if (this.paused) {
          this.juice.skillTreeOpened();
        } else {
          this.juice.skillTreeClosed();
        }
        return;
      }

      if (this.skillTree.handleKeyDown(key, this.paused)) {
        return;
      }

      if (["arrowup", "w"].includes(key)) this.setDir(0, -1);
      if (["arrowdown", "s"].includes(key)) this.setDir(0, 1);
      if (["arrowleft", "a"].includes(key)) this.setDir(-1, 0);
      if (["arrowright", "d"].includes(key)) this.setDir(1, 0);
    });
  }

  private handleTick(): void {
    if (!this.paused) {
      this.step();
    }
  }

  private initGame(startPaused = true): void {
    this.skillTree.reset(startPaused);
    this.game.reset();
    if (Object.keys(this.pendingFlags).length > 0) {
      for (const [key, value] of Object.entries(this.pendingFlags)) {
        this.game.setFlag(key, value);
      }
    }
    this.currentApple = this.game.getApple(this.game.getCurrentRoom().id);
    this.paused = startPaused;
    this.isDirty = true;
    this.questPopup.hide();
  }

  private step(): void {
    const result = this.game.step(this.paused);

    if (result.status === "dead") {
      if (this.skillTree.tryConsumeExtraLife()) {
        this.paused = true;
        this.isDirty = true;
        return;
      }
      this.gameOver(result.deathReason);
      return;
    }

    this.featureManager.call("onTick", this);

    this.currentApple = result.apple.current ?? null;

    if (result.apple.eaten) {
      this.featureManager.call("onAppleEaten", this);
      if (result.apple.worldPosition) {
        this.juice.appleChomp(result.apple.worldPosition.x, result.apple.worldPosition.y);
      }
    }

    if (result.apple.stateChanged || result.roomChanged || result.roomsChanged.size > 0) {
      this.isDirty = true;
    }

    this.juice.movementTick();
    this.skillTree.tick();

    if (result.questOffer) {
      this.offerQuest(result.questOffer);
    }

    if (result.questsCompleted.length > 0) {
      this.isDirty = true;
      this.juice.questCompleted();
    }

    this.isDirty = true;
  }

  private offerQuest(quest: Quest) {
    this.paused = true;
    this.skillTree.hideOverlay();
    this.juice.questOffered();

    this.questPopup.show(quest, {
      onAccept: () => {
        this.juice.questAccepted();
        const accepted = this.game.acceptOfferedQuest();
        if (accepted) {
          this.isDirty = true;
        }
        this.closeQuestPopup();
      },
      onReject: () => {
        this.juice.questRejected();
        this.game.rejectOfferedQuest();
        this.closeQuestPopup();
      },
    });
  }

  private closeQuestPopup() {
    this.questPopup.hide();
    this.skillTree.hideOverlay();
    this.paused = false;
    this.isDirty = true;
  }

  private gameOver(reason?: string | null) {
    this.juice.gameOver();
    this.featureManager.call("onGameOver", this);
    this.initGame();
    this.skillTree.hideOverlay();
    this.paused = true;
    console.log("Game over:", reason);
  }

  setDir(x: number, y: number) {
    this.game.setDirection(x, y);
  }

  addScore(amount: number) {
    const applied = this.skillTree ? this.skillTree.modifyScoreGain(amount) : amount;
    this.addScoreDirect(applied);
  }

  addScoreDirect(amount: number): void {
    this.game.addScore(amount);
    this.isDirty = true;
  }

  growSnake(extraSegments: number): void {
    if (extraSegments > 0) {
      this.game.growSnake(extraSegments);
      this.isDirty = true;
    }
  }

  setFlag(key: string, value: unknown): void {
    if (this.game) {
      this.game.setFlag(key, value);
    } else {
      if (value === undefined) {
        delete this.pendingFlags[key];
      } else {
        this.pendingFlags[key] = value;
      }
    }
  }

  getFlag<T = unknown>(key: string): T | undefined {
    if (this.game) {
      const value = this.game.getFlag<T>(key);
      if (value !== undefined) {
        return value;
      }
    }
    return this.pendingFlags[key] as T | undefined;
  }

  random(): number {
    return this.game ? this.game.random() : Math.random();
  }

  setTeleport(flag: boolean): void {
    this.game.enableTeleport(flag);
  }

  setTickDelay(delay: number): void {
    this.tickDelay = Math.max(20, delay);
    if (this.tickEvent) {
      this.tickEvent.reset({
        delay: this.tickDelay,
        callback: this.handleTick,
        callbackScope: this,
        loop: true,
      });
    }
  }

  get teleport(): boolean {
    return this.game.getTeleport();
  }

  get flags(): Record<string, unknown> {
    return this.flagsProxy;
  }

  set flags(value: Record<string, unknown>) {
    for (const [key, val] of Object.entries(value)) {
      this.setFlag(key, val);
    }
  }

  get score(): number {
    return this.game.getScore();
  }

  get snake(): readonly Vector2Like[] {
    return this.game.getSnakeBody();
  }

  get currentRoomId(): string {
    return this.game.getCurrentRoom().id;
  }

  get activeQuests(): Quest[] {
    return this.game.getActiveQuests();
  }

  get completedQuests(): string[] {
    return this.game.getCompletedQuestIds();
  }

  get offeredQuest(): Quest | null {
    return this.game.getOfferedQuest();
  }

  update(): void {
    if (this.isDirty) {
      this.draw();
      this.isDirty = false;
    }
  }

  private draw(): void {
    const room = this.game.getCurrentRoom();
    const wallSenseRadius = (this.getFlag<number>("geometry.wallSenseRadius") ?? 0);
    this.snakeRenderer.render(room, this.game.getSnakeBody(), room.id, this.currentApple, {
      wallSenseRadius,
    });
    this.questHud.update(this.game.getActiveQuests(), this.grid.cols * this.grid.cell);

    // Render bosses
    const bosses = this.game.getBosses(room.id);
    for (const boss of bosses) {
      for (const segment of boss.body) {
        const [roomX, roomY] = room.id.split(",").map(Number);
        const localX = segment.x - roomX * this.grid.cols;
        const localY = segment.y - roomY * this.grid.rows;
        if (localX >= 0 && localX < this.grid.cols && localY >= 0 && localY < this.grid.rows) {
          const { x, y } = this.snakeRenderer.getWorldPosition(segment, room.id);
          this.graphics.fillStyle(0xff00ff, 0.8).fillRect(x, y, this.grid.cell, this.grid.cell);
        }
      }
    }

    this.featureManager.call("onRender", this, this.graphics);
  }
}
