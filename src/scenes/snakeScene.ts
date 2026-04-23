import Phaser from "phaser";
import { defaultGameConfig } from "../config/gameConfig.js";
import { SnakeGame } from "../game/snakeGame.js";
import { FeatureManager } from "../systems/features.js";
import { createQuestRegistry } from "../systems/quests.js";
import { SkillTreeManager } from "../systems/skillTreeManager.js";
import { QuestHud } from "../ui/questHud.js";
import { QuestPopup } from "../ui/questPopup.js";
import { SnakeRenderer } from "../ui/snakeRenderer.js";
import { JuiceManager } from "../ui/juice.js";
import { BossHud } from "../ui/bossHud.js";
import { RuntimeSpriteFactory } from "../ui/runtimeSpriteFactory.js";
import {
  questGiverSpriteRecipe,
  type QuestGiverSpritePalette,
} from "../ui/spriteRecipes/questGiverRecipe.js";
import { getQuestDialogue } from "../quests/questDialogue.js";
import type { Quest } from "../../quests.js";
import type { AppleSnapshot } from "../apples/types.js";
import type { Vector2Like } from "../core/math.js";
import type { InventorySystem } from "../inventory/inventory.js";
import type { EquipmentSlot } from "../inventory/item.js";
import { getItem } from "../inventory/itemRegistry.js";
import type { SnakeSpritePalette } from "../ui/spriteRecipes/snakeRecipe.js";

type SnakeThemeId = "classic" | "sunset" | "midnight" | "bone";

type SnakeCosmeticState = {
  unlockedThemes: SnakeThemeId[];
  activeTheme: SnakeThemeId;
  cowboyHatUnlocked: boolean;
  cowboyHatEquipped: boolean;
  loudWalkingNoiseUnlocked: boolean;
  loudWalkingNoiseEnabled: boolean;
};

type SnakeThemeDefinition = {
  id: SnakeThemeId;
  label: string;
  cost: number;
  palette: SnakeSpritePalette;
};

const SNAKE_THEME_DEFINITIONS: readonly SnakeThemeDefinition[] = [
  {
    id: "classic",
    label: "Classic Green",
    cost: 0,
    palette: {
      baseColor: "#5dd6a2",
      bellyColor: "#c8ffe1",
      patternColor: "#2e8b68",
      outlineColor: "#3c8a69",
      eyeColor: "#f8ffef",
    },
  },
  {
    id: "sunset",
    label: "Sunset Coral",
    cost: 18,
    palette: {
      baseColor: "#ff8a5b",
      bellyColor: "#ffe2b8",
      patternColor: "#b84c2f",
      outlineColor: "#7c2f22",
      eyeColor: "#fff7ef",
    },
  },
  {
    id: "midnight",
    label: "Midnight Coil",
    cost: 30,
    palette: {
      baseColor: "#4f69ff",
      bellyColor: "#d4dcff",
      patternColor: "#26358f",
      outlineColor: "#18204a",
      eyeColor: "#f5f7ff",
    },
  },
  {
    id: "bone",
    label: "Bone White",
    cost: 44,
    palette: {
      baseColor: "#f0e7d8",
      bellyColor: "#fffaf0",
      patternColor: "#a99574",
      outlineColor: "#665744",
      eyeColor: "#221b15",
    },
  },
];

const COWBOY_HAT_COST = 36;

export default class SnakeScene extends Phaser.Scene {
  graphics!: Phaser.GameObjects.Graphics;
  readonly grid = defaultGameConfig.grid;

  private game!: SnakeGame;
  private questHud!: QuestHud;
  private questPopup!: QuestPopup;
  private snakeRenderer!: SnakeRenderer;
  private juice!: JuiceManager;
  private skillTree!: SkillTreeManager;
  private bossHud!: BossHud;
  private activeBossId: string | null = null;
  private lastBossHealth: Map<string, number> = new Map();
  private powerupMusicActive = false;
  private houseMusicActive = false;
  private readonly featureManager = new FeatureManager();
  private readonly baseTickDelay = 100;
  private tickDelay = this.baseTickDelay;
  private tickEvent!: Phaser.Time.TimerEvent;
  private houseHud!: Phaser.GameObjects.Text;
  private housePanel!: Phaser.GameObjects.Rectangle;
  private questHint!: Phaser.GameObjects.Text;
  private questHintPanel!: Phaser.GameObjects.Rectangle;
  private questGiverSprite!: Phaser.GameObjects.Sprite;
  private runtimeSpriteFactory!: RuntimeSpriteFactory;
  private houseRestCounter = 0;
  // Religion choice state
  private chosenReligionId: string | null = null;
  private religionMods: { tickDelayScalar?: number; wallSenseBonus?: number; seismicPulseBonus?: number; invulnerabilityBonus?: number; regenerator?: { interval: number; amount: number } | null; phoenixCharges?: number; masonryEnabled?: boolean } = {};
  // Background and Class choice state
  private chosenBackgroundId: string | null = null;
  private backgroundMods: { tickDelayScalar?: number; wallSenseBonus?: number; seismicPulseBonus?: number; invulnerabilityBonus?: number; regenerator?: { interval: number; amount: number } | null; phoenixCharges?: number; masonryEnabled?: boolean } = {};
  private chosenClassId: string | null = null;
  private classMods: { tickDelayScalar?: number; wallSenseBonus?: number; seismicPulseBonus?: number; invulnerabilityBonus?: number; regenerator?: { interval: number; amount: number } | null; phoenixCharges?: number; masonryEnabled?: boolean } = {};

  private paused = true;
  private isDirty = false;
  private currentApple: AppleSnapshot | null = null;
  private snakeCosmetics: SnakeCosmeticState = {
    unlockedThemes: ["classic"],
    activeTheme: "classic",
    cowboyHatUnlocked: false,
    cowboyHatEquipped: false,
    loudWalkingNoiseUnlocked: false,
    loudWalkingNoiseEnabled: false,
  };
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
    // Reduce subpixel jitter and keep lines crisp during shake/zoom
    this.cameras.main.setRoundPixels(true);
    this.runtimeSpriteFactory = new RuntimeSpriteFactory(this);
    this.snakeRenderer = new SnakeRenderer(this, this.graphics, this.grid);
    this.juice = new JuiceManager(this);
    this.skillTree = new SkillTreeManager(this, this.juice, { baseTickDelay: this.baseTickDelay });
    this.bossHud = new BossHud(this);

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

    // House HUD overlay (hidden by default)
    this.houseHud = this.add
      .text(8, 8, "", { fontFamily: "monospace", fontSize: "14px", color: "#f5f5f5" })
      .setDepth(30)
      .setVisible(false);
    this.housePanel = this.add
      .rectangle(0, 0, 160, 70, 0x000000, 0.35)
      .setOrigin(0, 0)
      .setDepth(29)
      .setVisible(false)
      .setStrokeStyle(1, 0xcfa77a, 0.6);

    this.questHint = this.add
      .text(8, 8, "", { fontFamily: "monospace", fontSize: "14px", color: "#e8ffe8" })
      .setDepth(28)
      .setVisible(false);
    this.questHintPanel = this.add
      .rectangle(0, 0, 160, 40, 0x000000, 0.35)
      .setOrigin(0, 0)
      .setDepth(27)
      .setVisible(false)
      .setStrokeStyle(1, 0x6fd9b7, 0.6);

    this.initQuestGiverSprite();
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

      if (this.isManualHouseMovementActive()) {
        if (["arrowup", "w"].includes(key)) {
          this.setDir(0, -1);
          this.step();
          return;
        }
        if (["arrowdown", "s"].includes(key)) {
          this.setDir(0, 1);
          this.step();
          return;
        }
        if (["arrowleft", "a"].includes(key)) {
          this.setDir(-1, 0);
          this.step();
          return;
        }
        if (["arrowright", "d"].includes(key)) {
          this.setDir(1, 0);
          this.step();
          return;
        }
      }

      if (["arrowup", "w"].includes(key)) this.setDir(0, -1);
      if (["arrowdown", "s"].includes(key)) this.setDir(0, 1);
      if (["arrowleft", "a"].includes(key)) this.setDir(-1, 0);
      if (["arrowright", "d"].includes(key)) this.setDir(1, 0);

      if (key === "e") {
        if (this.tryInteractQuestGiver()) {
          return;
        }
      }

      // Item equip/test keys removed; equipping is handled in the menu

      // House shop hotkeys (only when in house and not paused)
      if (!this.paused && this.isInHouse()) {
        if (key === "1") this.tryBuyHouse("couch");
        if (key === "2") this.tryBuyHouse("kitchen");
        if (key === "3") this.tryBuyHouse("expand");
        if (key === "4") this.tryBuyHouse("bed");
        if (key === "5") this.tryBuyHouse("plant");
        if (key === "6") this.tryBuyHouse("lamp");
      }
    });
  }

  private handleTick(): void {
    if (!this.paused) {
      if (this.isManualHouseMovementActive()) {
        const elapsed = Number(this.getFlag<number>("timeMs") ?? 0) + this.tickDelay;
        this.setFlag("timeMs", elapsed);
        this.updateHouseAmbience();
        this.tickHouseAmbientEffects();
        this.skillTree.tick();
        this.isDirty = true;
        return;
      }
      const elapsed = Number(this.getFlag<number>("timeMs") ?? 0) + this.tickDelay;
      this.setFlag("timeMs", elapsed);
      this.step();
    }
  }

  private initGame(startPaused = true): void {
    this.skillTree.reset(startPaused);
    // Reset equipment effects (no equipment contributes to tick delay until equipped)
    this.skillTree.applyTickDelayScalar(1, "equipment:boots");
    this.game.reset();
    this.juice.stopBossMusic();
    (this.juice as any).stopPowerupMusic?.();
    if (this.bossHud) {
      this.bossHud.hide();
    }
    this.activeBossId = null;
    if (Object.keys(this.pendingFlags).length > 0) {
      for (const [key, value] of Object.entries(this.pendingFlags)) {
        this.game.setFlag(key, value);
      }
    }
    this.currentApple = this.game.getApple(this.game.getCurrentRoom().id);
    this.snakeCosmetics = {
      unlockedThemes: ["classic"],
      activeTheme: "classic",
      cowboyHatUnlocked: false,
      cowboyHatEquipped: false,
      loudWalkingNoiseUnlocked: false,
      loudWalkingNoiseEnabled: false,
    };
    this.juice.setMovementNoiseMultiplier(1);
    this.paused = startPaused;
    this.isDirty = true;
    this.questPopup.hide();
  }

  private step(): void {
    const result = this.game.step(this.paused);
    this.updateHouseAmbience();

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
    this.updateBossEncounter();

    if (result.apple.eaten) {
      this.featureManager.call("onAppleEaten", this);
      if (result.apple.worldPosition) {
        this.juice.appleChomp(result.apple.worldPosition.x, result.apple.worldPosition.y);
      }
    }

    this.tickHouseAmbientEffects();

    // Idle apple sparkle
    if (this.currentApple && !result.apple.eaten) {
      const world = this.tileToWorld(this.currentApple.position);
      if (this.random() < 0.06) {
        this.juice.appleIdle(world.x, world.y);
      }
    }

    // Idle treasure sparkle
    const roomForTreasure = this.game.getCurrentRoom();
    if (roomForTreasure.treasure) {
      const cell = this.grid.cell;
      const tx = roomForTreasure.treasure.x * cell + cell / 2;
      const ty = roomForTreasure.treasure.y * cell + cell / 2;
      if (this.random() < 0.05) {
        (this.juice as any).treasureSparkle?.(tx, ty);
      }
      if (this.random() < 0.02) {
        (this.juice as any).treasureBeacon?.(tx, ty);
      }
    }

    if (result.apple.stateChanged || result.roomChanged || result.roomsChanged.size > 0) {
      this.isDirty = true;
    }

    // Powerup pickup FX and music start
    const pfx = this.game.getFlag<{ x: number; y: number; roomId: string; kind: "phase" | "smite" }>("ui.powerupPickup");
    if (pfx) {
      const world = this.tileToWorldInRoom({ x: pfx.x, y: pfx.y }, pfx.roomId);
      (this.juice as any).powerupPickup?.(world.x, world.y, pfx.kind);
      // Start powerup music with duration derived from active ticks if available
      const active = this.game.getFlag<{ kind: string; remaining: number; total: number }>("powerup.active");
      if (active && typeof active.total === "number") {
        const durationMs = Math.max(1, active.total) * this.tickDelay;
        (this.juice as any).startPowerupMusic?.(durationMs);
        this.powerupMusicActive = true;
      }
      // Popup text announcing the powerup
      const name = pfx.kind === "phase" ? "Phase" : "Smite";
      const text = this.add.text(world.x, world.y - 12, `+ Powerup: ${name}` , {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#9b5de5",
      }).setDepth(26).setOrigin(0.5, 1).setAlpha(0.98).setScale(1.0);
      this.tweens.add({
        targets: text,
        y: world.y - 60,
        alpha: 0,
        scale: 1.15,
        duration: 1600,
        ease: "Cubic.easeOut",
        onComplete: () => text.destroy(),
      });
      this.game.setFlag("ui.powerupPickup", undefined);
    }

    // Stop powerup music when effect ends
    const active = this.game.getFlag<{ kind: string; remaining: number; total: number }>("powerup.active");
    if (!active && this.powerupMusicActive) {
      (this.juice as any).stopPowerupMusic?.();
      this.powerupMusicActive = false;
    }

    // Room transition pulse from snake head
    if (result.roomChanged) {
      const currHead = this.getFlag<{ x: number; y: number }>("internal.currentHead");
      const [roomX, roomY] = this.currentRoomId.split(",").map(Number);
      if (currHead) {
        const localX = currHead.x - roomX * this.grid.cols;
        const localY = currHead.y - roomY * this.grid.rows;
        const w = this.grid.cols * this.grid.cell;
        const h = this.grid.rows * this.grid.cell;
        let originX = localX * this.grid.cell + this.grid.cell / 2;
        let originY = localY * this.grid.cell + this.grid.cell / 2;

        // Prefer edges when on boundary; otherwise (e.g., portal), use the tile center
        if (localX === 0) originX = this.grid.cell / 2;
        else if (localX === this.grid.cols - 1) originX = w - this.grid.cell / 2;

        if (localY === 0) originY = this.grid.cell / 2;
        else if (localY === this.grid.rows - 1) originY = h - this.grid.cell / 2;

        this.juice.roomTransition(originX, originY);
      }
    }

    // Movement tick juice with optional head world position for trails
    const head = this.game.getSnakeBody()[0];
    if (head) {
      const world = this.tileToWorld(head);
      this.juice.movementTick(world.x, world.y);
    } else {
      this.juice.movementTick();
    }
    this.skillTree.tick();

    if (result.questOffer) {
      this.offerQuest(result.questOffer);
    }

    if (result.questsCompleted.length > 0) {
      this.isDirty = true;
      this.juice.questCompleted();
    }

    this.handlePredationFeedback();

    // Boss smite FX on collision
    const smite = this.game.getFlag<{ x: number; y: number; roomId: string }>("ui.bossSmite");
    if (smite) {
      const world = this.tileToWorldInRoom({ x: smite.x, y: smite.y }, smite.roomId);
      (this.juice as any).bossHit?.(world.x, world.y);
      this.game.setFlag("ui.bossSmite", undefined);
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

  private tickHouseAmbientEffects(): void {
    if (!this.isInHouse()) {
      this.houseRestCounter = 0;
      return;
    }

    this.setFlag("timeSinceEat", 0);
    this.houseRestCounter++;
    if (this.houseRestCounter >= 30) {
      this.houseRestCounter = 0;
      this.addScoreDirect(1);
      this.growSnake(1);
      const cam = this.cameras.main;
      (this.juice as any).houseRestPulse?.(cam.midPoint.x, cam.midPoint.y + 10);
    }

    const w = this.grid.cols * this.grid.cell;
    const h = this.grid.rows * this.grid.cell;
    const room = this.game.getCurrentRoom();
    let lampCenter: { x: number; y: number } | null = null;
    outer: for (let yy = 0; yy < room.layout.length; yy++) {
      for (let xx = 0; xx < room.layout[yy].length; xx++) {
        if (room.layout[yy][xx] === "L") {
          lampCenter = this.tileToWorldLocalInRoom({ x: xx, y: yy });
          break outer;
        }
      }
    }

    if (this.random() < 0.1) {
      let x: number;
      let y: number;
      if (lampCenter && this.random() < 0.7) {
        x = lampCenter.x + (Math.random() - 0.5) * 40;
        y = lampCenter.y - Math.random() * 40;
      } else {
        x = 20 + Math.random() * (w - 40);
        y = h - 30 - Math.random() * (h * 0.6);
      }
      (this.juice as any).houseMote?.(x, y);
    }
  }

  private showQuestDialogue(
    title: string,
    pages: string[],
    callbacks: { onAccept?: () => void; onReject?: () => void; onClose?: () => void },
    labels?: { acceptLabel?: string; rejectLabel?: string; nextLabel?: string; closeLabel?: string },
    speaker?: { portraitId?: string }
  ): void {
    this.paused = true;
    this.skillTree.hideOverlay();
    this.questPopup.showDialogue(title, pages, callbacks, labels, speaker);
    this.isDirty = true;
  }

  private showQuestHintPopup(message: string, color = "#ffe58a"): void {
    const popup = this.add
      .text(120, 8, message, { fontFamily: "monospace", fontSize: "14px", color })
      .setDepth(31)
      .setOrigin(0, 0)
      .setAlpha(0.95);
    this.tweens.add({
      targets: popup,
      y: 26,
      alpha: 0,
      duration: 700,
      ease: "Cubic.easeOut",
      onComplete: () => popup.destroy(),
    });
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
    // Floating score popup at head
    const head = this.game.getSnakeBody()[0];
    if (head && amount !== 0) {
      const world = this.tileToWorld(head);
      const color = amount > 0 ? "#fff3a8" : "#ff6b6b";
      const text = this.add.text(world.x, world.y - 10, `${amount > 0 ? "+" : ""}${amount}`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color,
      }).setDepth(26).setOrigin(0.5, 1).setAlpha(0.95);
      this.tweens.add({
        targets: text,
        y: world.y - 38,
        alpha: 0,
        scale: 1.1,
        duration: 520,
        ease: "Cubic.easeOut",
        onComplete: () => text.destroy(),
      });
    }
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

  getGeneratedRoomsOnCurrentLevel(): string[] {
    const fn: any = (this.game as any).getGeneratedRooms;
    if (typeof fn === "function") {
      return fn.call(this.game);
    }
    return [];
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

  get inventory(): InventorySystem {
    return this.game.getInventory();
  }

  // Equips an item by id from the menu and applies effects
  equipItem(itemId: string): boolean {
    const item = getItem(itemId);
    if (!item) return false;
    if (this.game.getInventory().getItemCount(itemId) <= 0) return false;
    const success = this.game.getInventory().equip(item);
    if (success) {
      this.applyEquipmentEffects();
      this.juice.equipmentEquip();
    }
    return success;
  }

  // Unequip a slot and apply effects
  unequipSlot(slot: EquipmentSlot): boolean {
    const success = this.game.getInventory().unequip(slot);
    if (success) {
      this.applyEquipmentEffects();
      this.juice.equipmentUnequip();
    }
    return success;
  }

  private applyEquipmentEffects(): void {
    if (!this.game) return;
    const inv = this.game.getInventory();
    const equipped = inv.getAllEquipped();
    let tickScalar = 1;
    let wallSenseBonus = 0;
    let seismicBonus = 0;
    let masonry = false;
    let invulnBonus = 0;
    let regen: { interval: number; amount: number } | null = null;
    let phoenix = 0;

    for (const [, itemId] of equipped) {
      const item = getItem(itemId) as any;
      const mods = item?.modifiers ?? {};
      if (typeof mods.tickDelayScalar === "number") {
        tickScalar *= mods.tickDelayScalar;
      }
      if (typeof mods.wallSenseBonus === "number") {
        wallSenseBonus += mods.wallSenseBonus;
      }
      if (typeof mods.seismicPulseBonus === "number") {
        seismicBonus += mods.seismicPulseBonus;
      }
      if (mods.masonryEnabled) {
        masonry = true;
      }
      if (typeof mods.invulnerabilityBonus === "number") {
        invulnBonus += mods.invulnerabilityBonus;
      }
      if (mods.regenerator) {
        if (!regen) {
          regen = { interval: mods.regenerator.interval, amount: mods.regenerator.amount };
        } else {
          regen.interval = Math.min(regen.interval, mods.regenerator.interval);
          regen.amount += mods.regenerator.amount;
        }
      }
      if (typeof mods.phoenixCharges === "number") {
        phoenix += mods.phoenixCharges;
      }
    }

    // Apply religion bonuses
    if (this.religionMods) {
      if (typeof this.religionMods.tickDelayScalar === "number") {
        tickScalar *= this.religionMods.tickDelayScalar;
      }
      if (typeof this.religionMods.wallSenseBonus === "number") {
        wallSenseBonus += this.religionMods.wallSenseBonus;
      }
      if (typeof this.religionMods.seismicPulseBonus === "number") {
        seismicBonus += this.religionMods.seismicPulseBonus;
      }
      if (typeof this.religionMods.invulnerabilityBonus === "number") {
        invulnBonus += this.religionMods.invulnerabilityBonus;
      }
      if (this.religionMods.regenerator) {
        const r = this.religionMods.regenerator;
        if (!regen) {
          regen = { interval: r.interval, amount: r.amount };
        } else {
          regen.interval = Math.min(regen.interval, r.interval);
          regen.amount += r.amount;
        }
      }
      if (this.religionMods.masonryEnabled) {
        masonry = true;
      }
      if (typeof this.religionMods.phoenixCharges === "number") {
        phoenix += this.religionMods.phoenixCharges;
      }
    }

    // Background bonuses
    if (this.backgroundMods) {
      if (typeof this.backgroundMods.tickDelayScalar === "number") tickScalar *= this.backgroundMods.tickDelayScalar;
      if (typeof this.backgroundMods.wallSenseBonus === "number") wallSenseBonus += this.backgroundMods.wallSenseBonus;
      if (typeof this.backgroundMods.seismicPulseBonus === "number") seismicBonus += this.backgroundMods.seismicPulseBonus;
      if (typeof this.backgroundMods.invulnerabilityBonus === "number") invulnBonus += this.backgroundMods.invulnerabilityBonus;
      if (this.backgroundMods.regenerator) {
        const r = this.backgroundMods.regenerator;
        if (!regen) regen = { interval: r.interval, amount: r.amount }; else { regen.interval = Math.min(regen.interval, r.interval); regen.amount += r.amount; }
      }
      if (this.backgroundMods.masonryEnabled) masonry = true;
      if (typeof this.backgroundMods.phoenixCharges === "number") phoenix += this.backgroundMods.phoenixCharges;
    }

    // Class bonuses
    if (this.classMods) {
      if (typeof this.classMods.tickDelayScalar === "number") tickScalar *= this.classMods.tickDelayScalar;
      if (typeof this.classMods.wallSenseBonus === "number") wallSenseBonus += this.classMods.wallSenseBonus;
      if (typeof this.classMods.seismicPulseBonus === "number") seismicBonus += this.classMods.seismicPulseBonus;
      if (typeof this.classMods.invulnerabilityBonus === "number") invulnBonus += this.classMods.invulnerabilityBonus;
      if (this.classMods.regenerator) {
        const r = this.classMods.regenerator;
        if (!regen) regen = { interval: r.interval, amount: r.amount }; else { regen.interval = Math.min(regen.interval, r.interval); regen.amount += r.amount; }
      }
      if (this.classMods.masonryEnabled) masonry = true;
      if (typeof this.classMods.phoenixCharges === "number") phoenix += this.classMods.phoenixCharges;
    }

    // Apply speed scalar via skill system
    this.skillTree.applyTickDelayScalar(tickScalar, "equipment:boots");

    // Set equipment flags for game logic to combine with skill-based flags
    this.setFlag("equipment.wallSenseRadiusBonus", wallSenseBonus > 0 ? wallSenseBonus : undefined);
    this.setFlag("equipment.seismicPulseRadiusBonus", seismicBonus > 0 ? seismicBonus : undefined);
    this.setFlag("equipment.masonryEnabled", masonry ? true : undefined);
    this.setFlag("equipment.invulnerabilityBonus", invulnBonus > 0 ? invulnBonus : undefined);
    this.setFlag("equipment.regenerator", regen ?? undefined);
    this.setFlag("equipment.phoenixCharges", phoenix > 0 ? phoenix : undefined);

    // Refresh overlay to reflect any equipped status in inventory view
    this.skillTree.getOverlay().refresh();
  }

  update(): void {
    if (this.isDirty) {
      this.draw();
      this.isDirty = false;
    }
  }
  private updateBossEncounter(): void {
    const bosses = this.game.getBosses(this.currentRoomId);
    const boss = bosses[0];

    if (boss) {
      this.bossHud.show({
        name: boss.name ?? "Nameless Horror",
        health: boss.health ?? 0,
        maxHealth: boss.maxHealth ?? Math.max(1, boss.health ?? 1),
      });
      const previous = this.lastBossHealth.get(boss.id);
      if (typeof previous === "number" && boss.health !== undefined && boss.health < previous) {
        const headSeg = boss.body[0];
        if (headSeg) {
          const { x, y } = this.snakeRenderer.getWorldPosition(headSeg, this.currentRoomId);
          this.juice.bossHit(x + this.grid.cell / 2, y + this.grid.cell / 2);
        }
      }
      this.lastBossHealth.set(boss.id, boss.health ?? boss.maxHealth ?? 0);

      if (this.activeBossId !== boss.id) {
        this.juice.startBossMusic(boss.id);
        this.activeBossId = boss.id;
      }
      // Danger vignette based on boss presence
      (this.juice as any).setDangerLevel?.(0.22);
    } else {
      if (this.activeBossId) {
        this.juice.stopBossMusic();
        this.lastBossHealth.delete(this.activeBossId);
        this.activeBossId = null;
      }
      this.bossHud.hide();
      (this.juice as any).setDangerLevel?.(0);
    }
  }
  private tileToWorld(position?: Vector2Like | null): { x: number; y: number } {
    const cell = this.grid.cell;
    const fallback = this.game.getSnakeBody()[0] ?? { x: this.grid.cols / 2, y: this.grid.rows / 2 };
    const point = position ?? fallback;
    const [roomX, roomY] = this.currentRoomId.split(",").map(Number);
    const localX = point.x - roomX * this.grid.cols;
    const localY = point.y - roomY * this.grid.rows;
    return { x: localX * cell + cell / 2, y: localY * cell + cell / 2 };
  }

  private tileToWorldInRoom(position: Vector2Like, roomId: string): { x: number; y: number } {
    const cell = this.grid.cell;
    const [roomX, roomY] = roomId.split(",").map(Number);
    const localX = position.x - roomX * this.grid.cols;
    const localY = position.y - roomY * this.grid.rows;
    return { x: localX * cell + cell / 2, y: localY * cell + cell / 2 };
  }

  private tileToWorldLocalInRoom(position: Vector2Like): { x: number; y: number } {
    const cell = this.grid.cell;
    return { x: position.x * cell + cell / 2, y: position.y * cell + cell / 2 };
  }

  private handlePredationFeedback(): void {
    if (!this.game) {
      return;
    }

    const frenzy = this.game.getFlag<{ head?: Vector2Like | null }>("predation.frenzyTriggered");
    if (frenzy) {
      const world = this.tileToWorld(frenzy.head ?? null);
      this.juice.predationFrenzy(world.x, world.y);
      this.game.setFlag("predation.frenzyTriggered", undefined);
    }

    const rend = this.game.getFlag<{ head?: Vector2Like | null }>("predation.rendConsumed");
    if (rend) {
      const world = this.tileToWorld(rend.head ?? null);
      this.juice.predationRend(world.x, world.y);
      this.game.setFlag("predation.rendConsumed", undefined);
    }

    const apex = this.game.getFlag<{ head?: Vector2Like | null }>("predation.apexTriggered");
    if (apex) {
      const world = this.tileToWorld(apex.head ?? null);
      this.juice.predationApex(world.x, world.y);
      this.game.setFlag("predation.apexTriggered", undefined);
    }

    const loot = this.game.getFlag<{ head?: Vector2Like | null; itemName?: string }>("loot.itemPicked");
    if (loot) {
      const world = this.tileToWorld(loot.head ?? null);
      this.juice.itemPickup(world.x, world.y);
      const enriched = this.game.getFlag<{ itemId?: string }>("loot.itemPicked");
      if (enriched?.itemId) {
        (this.juice as any).itemRarityJingle?.(enriched.itemId);
      }
      // Also surface a hint if overlay is visible
      const name = loot.itemName ? `: ${loot.itemName}` : "";
      this.skillTree.getOverlay().announce(`Item acquired${name}`, "#5dd6a2", 1800);
      // Floating popup text at pickup location
      const popup = this.add.text(world.x, world.y - 14, `+ Item${name}`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#9ad1ff",
      }).setDepth(26).setOrigin(0.5, 1);
      this.tweens.add({
        targets: popup,
        y: world.y - 40,
        alpha: 0,
        duration: 640,
        ease: "Cubic.easeOut",
        onComplete: () => popup.destroy(),
      });
      this.game.setFlag("loot.itemPicked", undefined);
    }

    // Treasure pickup FX
    const treasureFx = this.game.getFlag<{ x: number; y: number; roomId: string }>("ui.treasurePickup");
    if (treasureFx) {
      const world = this.tileToWorldInRoom({ x: treasureFx.x, y: treasureFx.y }, treasureFx.roomId);
      (this.juice as any).treasurePickup?.(world.x, world.y);
      this.game.setFlag("ui.treasurePickup", undefined);
    }

    // Geometry feedback
    const seismic = this.game.getFlag<{ x: number; y: number; roomId: string; radius: number }>("ui.seismicPulse");
    if (seismic) {
      const world = this.tileToWorldInRoom({ x: seismic.x, y: seismic.y }, seismic.roomId);
      (this.juice as any).seismicPulse?.(world.x, world.y, seismic.radius);
      this.game.setFlag("ui.seismicPulse", undefined);
    }

    const collapse = this.game.getFlag<{ x: number; y: number; roomId: string }>("ui.collapseControl");
    if (collapse) {
      const world = this.tileToWorldInRoom({ x: collapse.x, y: collapse.y }, collapse.roomId);
      (this.juice as any).collapseControl?.(world.x, world.y);
      this.game.setFlag("ui.collapseControl", undefined);
    }

    const chomp = this.game.getFlag<{ x: number; y: number; roomId: string }>("ui.wallChomp");
    if (chomp) {
      const world = this.tileToWorldInRoom({ x: chomp.x, y: chomp.y }, chomp.roomId);
      (this.juice as any).wallChomp?.(world.x, world.y);
      this.game.setFlag("ui.wallChomp", undefined);
    }

    const fault = this.game.getFlag<{ roomId: string; y: number }>("ui.faultLine");
    if (fault) {
      const cell = this.grid.cell;
      const y = fault.y * cell + cell / 2;
      const x1 = cell / 2;
      const x2 = this.grid.cols * cell - cell / 2;
      (this.juice as any).faultLineSweep?.(x1, y, x2);
      this.game.setFlag("ui.faultLine", undefined);
    }

    // Turn skid dust
    const skid = this.game.getFlag<{ x: number; y: number; roomId: string; dx: number; dy: number }>("ui.turnSkid");
    if (skid) {
      const world = this.tileToWorldInRoom({ x: skid.x, y: skid.y }, skid.roomId);
      (this.juice as any).turnSkid?.(world.x, world.y, skid.dx, skid.dy);
      this.game.setFlag("ui.turnSkid", undefined);
    }

    // Wall graze sparks
    const graze = this.game.getFlag<{ x: number; y: number; roomId: string; nx: number; ny: number }>("ui.wallGraze");
    if (graze) {
      const world = this.tileToWorldInRoom({ x: graze.x, y: graze.y }, graze.roomId);
      (this.juice as any).wallGraze?.(world.x, world.y, graze.nx, graze.ny);
      this.game.setFlag("ui.wallGraze", undefined);
    }

    const enemyEaten = this.game.getFlag<{ x: number; y: number; roomId: string }>("ui.enemyEaten");
    if (enemyEaten) {
      const world = this.tileToWorldInRoom({ x: enemyEaten.x, y: enemyEaten.y }, enemyEaten.roomId);
      const popup = this.add.text(world.x, world.y - 14, "+ Enemy", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffcf8a",
      }).setDepth(26).setOrigin(0.5, 1);
      this.tweens.add({
        targets: popup,
        y: world.y - 40,
        alpha: 0,
        duration: 620,
        ease: "Cubic.easeOut",
        onComplete: () => popup.destroy(),
      });
      this.game.setFlag("ui.enemyEaten", undefined);
    }
  }
  private draw(): void {
    // Suppress generic HUDs in house
    this.setFlag("ui.suppressHud", this.isInHouse());
    const room = this.game.getCurrentRoom();
    const baseSense = this.getFlag<number>("geometry.wallSenseRadius") ?? 0;
    const equipSense = this.getFlag<number>("equipment.wallSenseRadiusBonus") ?? 0;
    const wallSenseRadius = Math.max(0, baseSense + equipSense);
    const pActive = this.getFlag<{ kind: string; remaining: number }>("powerup.active");
    const snakeColor = pActive ? 0x9b5de5 : undefined;
    this.snakeRenderer.render(room, this.game.getSnakeBody(), room.id, this.currentApple, {
      wallSenseRadius,
      snakeColor,
      poweredUp: Boolean(pActive),
      direction: this.game.getDirection(),
      snakePalette: this.getActiveSnakeTheme().palette,
      cowboyHat: this.snakeCosmetics.cowboyHatEquipped,
      enemies: this.game.getEnemies(room.id),
      bullets: this.game.getEnemyBullets(room.id),
    });
    this.questHud.update(this.game.getActiveQuests(), this.grid.cols * this.grid.cell);
    this.questHud.setVisible(!this.isInHouse());

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

    // Update simple house HUD
    if (this.isInHouse()) {
      const purchases = (this.game.getFlag<Record<string, unknown>>("house.purchases") ?? {}) as Record<string, unknown>;
      const expandLevel = Number(this.game.getFlag<number>("house.expandLevel") ?? 0);
      const expandCap = 5;
      const lines = [
        `House Shop — Score: ${this.score}`,
        `1) Couch (10) ${purchases["couch"] ? "✓" : ""}`,
        `2) Kitchen (15) ${purchases["kitchen"] ? "✓" : ""}`,
        `3) Expand (20) level ${expandLevel}/${expandCap}`,
        `4) Bed (12) ${purchases["bed"] ? "✓" : ""}`,
        `5) Plant (8) ${purchases["plant"] ? "✓" : ""}`,
        `6) Lamp (14) ${purchases["lamp"] ? "✓" : ""}`,
        `Press 1, 2, or 3 to buy`,
      ];
      this.houseHud.setText(lines.join("\n"));
      this.houseHud.setVisible(true);
      const b = this.houseHud.getBounds();
      this.housePanel.setPosition(b.x - 6, b.y - 6);
      this.housePanel.setSize(b.width + 12, b.height + 12);
      this.housePanel.setVisible(true);
    } else {
      this.houseHud.setVisible(false);
      this.housePanel.setVisible(false);
    }

    this.updateQuestGiverSprite();

    const hint = this.getQuestGiverHint();
    if (hint) {
      this.questHint.setText(hint.text);
      this.questHint.setVisible(true);
      const b = this.questHint.getBounds();
      this.questHintPanel.setPosition(b.x - 6, b.y - 6);
      this.questHintPanel.setSize(b.width + 12, b.height + 12);
      this.questHintPanel.setVisible(true);
    } else {
      this.questHint.setVisible(false);
      this.questHintPanel.setVisible(false);
    }
  }

  // Called by the religion feature to persist the choice for this run
  setReligionChoice(id: string, mods: Partial<typeof this.religionMods>): void {
    this.chosenReligionId = id;
    this.religionMods = { ...mods } as any;
    this.applyEquipmentEffects();
    this.skillTree.getOverlay().announce(`Chosen faith: ${id}`, "#fff3a8", 2000);
  }

  // Called by character creation flow
  setBackgroundChoice(id: string, mods: Partial<typeof this.backgroundMods>): void {
    this.chosenBackgroundId = id;
    this.backgroundMods = { ...mods } as any;
    this.applyEquipmentEffects();
    this.skillTree.getOverlay().announce(`Background: ${id}`, "#9ad1ff", 1800);
  }

  setClassChoice(id: string, mods: Partial<typeof this.classMods>): void {
    this.chosenClassId = id;
    this.classMods = { ...mods } as any;
    this.applyEquipmentEffects();
    this.skillTree.getOverlay().announce(`Class: ${id}`, "#c8ffe1", 1800);
  }

  getSnakeCustomizationState(): SnakeCosmeticState {
    return {
      unlockedThemes: [...this.snakeCosmetics.unlockedThemes],
      activeTheme: this.snakeCosmetics.activeTheme,
      cowboyHatUnlocked: this.snakeCosmetics.cowboyHatUnlocked,
      cowboyHatEquipped: this.snakeCosmetics.cowboyHatEquipped,
      loudWalkingNoiseUnlocked: this.snakeCosmetics.loudWalkingNoiseUnlocked,
      loudWalkingNoiseEnabled: this.snakeCosmetics.loudWalkingNoiseEnabled,
    };
  }

  getSnakeThemeDefinitions(): readonly SnakeThemeDefinition[] {
    return SNAKE_THEME_DEFINITIONS;
  }

  purchaseOrApplySnakeTheme(themeId: SnakeThemeId): { ok: boolean; message: string; color: string } {
    const theme = SNAKE_THEME_DEFINITIONS.find((entry) => entry.id === themeId);
    if (!theme) {
      return { ok: false, message: "Unknown snake palette.", color: "#ff6b6b" };
    }

    const unlocked = this.snakeCosmetics.unlockedThemes.includes(themeId);
    if (!unlocked) {
      if (this.score < theme.cost) {
        return {
          ok: false,
          message: `${theme.label} costs ${theme.cost} score.`,
          color: "#ff6b6b",
        };
      }
      this.addScoreDirect(-theme.cost);
      this.snakeCosmetics.unlockedThemes = [...this.snakeCosmetics.unlockedThemes, themeId];
    }

    this.snakeCosmetics.activeTheme = themeId;
    this.isDirty = true;
    return {
      ok: true,
      message: unlocked ? `${theme.label} equipped.` : `${theme.label} unlocked.`,
      color: "#5dd6a2",
    };
  }

  purchaseOrToggleCowboyHat(): { ok: boolean; message: string; color: string } {
    if (!this.snakeCosmetics.cowboyHatUnlocked) {
      if (this.score < COWBOY_HAT_COST) {
        return {
          ok: false,
          message: `Cowboy hat costs ${COWBOY_HAT_COST} score.`,
          color: "#ff6b6b",
        };
      }
      this.addScoreDirect(-COWBOY_HAT_COST);
      this.snakeCosmetics.cowboyHatUnlocked = true;
      this.snakeCosmetics.cowboyHatEquipped = true;
      this.isDirty = true;
      return { ok: true, message: "Cowboy hat unlocked.", color: "#5dd6a2" };
    }

    this.snakeCosmetics.cowboyHatEquipped = !this.snakeCosmetics.cowboyHatEquipped;
    this.isDirty = true;
    return {
      ok: true,
      message: this.snakeCosmetics.cowboyHatEquipped ? "Cowboy hat equipped." : "Cowboy hat stowed.",
      color: "#9ad1ff",
    };
  }

  toggleDisableWalkingNoise(): { ok: boolean; message: string; color: string } {
    const cost = 100;
    if (!this.snakeCosmetics.loudWalkingNoiseUnlocked) {
      if (this.score < cost) {
        return {
          ok: false,
          message: `Disable Walking Noise costs ${cost} score.`,
          color: "#ff6b6b",
        };
      }
      this.addScoreDirect(-cost);
      this.snakeCosmetics.loudWalkingNoiseUnlocked = true;
    }

    this.snakeCosmetics.loudWalkingNoiseEnabled = !this.snakeCosmetics.loudWalkingNoiseEnabled;
    this.juice.setMovementNoiseMultiplier(this.snakeCosmetics.loudWalkingNoiseEnabled ? 5 : 1);
    this.isDirty = true;
    return {
      ok: true,
      message: this.snakeCosmetics.loudWalkingNoiseEnabled
        ? "Walking noise disabled."
        : "Walking noise restored.",
      color: "#9ad1ff",
    };
  }

  private getActiveSnakeTheme(): SnakeThemeDefinition {
    return (
      SNAKE_THEME_DEFINITIONS.find((entry) => entry.id === this.snakeCosmetics.activeTheme) ??
      SNAKE_THEME_DEFINITIONS[0]
    );
  }


  private isInHouse(): boolean {
    return this.currentRoomId === "0,-1,0";
  }

  private tryBuyHouse(kind: "couch" | "kitchen" | "expand"): void {
    const ok = this.game.purchaseHouseItem(kind);
    if (ok) {
      this.isDirty = true;
      // Small confirmation popup near top-left
      const popup = this.add
        .text(120, 8, `${kind} purchased`, { fontFamily: "monospace", fontSize: "14px", color: "#9ad1ff" })
        .setDepth(31)
        .setOrigin(0, 0)
        .setAlpha(0.95);
      this.tweens.add({ targets: popup, y: 26, alpha: 0, duration: 700, ease: "Cubic.easeOut", onComplete: () => popup.destroy() });
    } else {
      // Error popup
      const popup = this.add
        .text(120, 8, `Cannot purchase ${kind}`, { fontFamily: "monospace", fontSize: "14px", color: "#ff8578" })
        .setDepth(31)
        .setOrigin(0, 0)
        .setAlpha(0.95);
      this.tweens.add({ targets: popup, y: 26, alpha: 0, duration: 700, ease: "Cubic.easeOut", onComplete: () => popup.destroy() });
    }
  }

  // Monitor room transitions to start/stop house ambience
  private updateHouseAmbience(): void {
    const inHouse = this.isInHouse();
    if (inHouse && !this.houseMusicActive) {
      (this.juice as any).startHouseAmbience?.();
      this.houseMusicActive = true;
    } else if (!inHouse && this.houseMusicActive) {
      (this.juice as any).stopHouseAmbience?.();
      this.houseMusicActive = false;
    }
    // Apply slowdown only when snake is actually inside the interior (not just in the room)
    const slowInside = this.isInHouseInterior();
    this.skillTree.applyTickDelayScalar(slowInside ? 1.6 : 1.0, "house");
  }

  private isInHouseInterior(): boolean {
    if (!this.isInHouse()) return false;
    const head = this.game.getSnakeBody()[0];
    if (!head) return false;
    const room = this.game.getCurrentRoom();
    const [rx, ry] = room.id.split(",").map(Number);
    const lx = head.x - rx * this.grid.cols;
    const ly = head.y - ry * this.grid.rows;
    if (lx < 0 || ly < 0 || lx >= this.grid.cols || ly >= this.grid.rows) return false;
    const tile = room.layout[ly]?.[lx];
    if (!tile) return false;
    // Interior tiles (wood, rug, trim, and furniture)
    return "WETCKBPL".includes(tile);
  }

  private isManualHouseMovementActive(): boolean {
    return !this.paused && this.isInHouseInterior() && !this.offeredQuest;
  }

  private getQuestGiverHint(): { text: string } | null {
    if (this.isInHouse() || this.paused || this.offeredQuest) {
      return null;
    }
    const room = this.game.getCurrentRoom();
    const giver = room.questGiver;
    if (!giver) {
      return null;
    }
    const head = this.game.getSnakeBody()[0];
    if (!head) {
      return null;
    }
    const [roomX, roomY] = room.id.split(",").map(Number);
    const localX = head.x - roomX * this.grid.cols;
    const localY = head.y - roomY * this.grid.rows;
    const dist = Math.abs(localX - giver.x) + Math.abs(localY - giver.y);
    if (dist > 1) {
      return null;
    }
    const name = giver.name ? `Talk to ${giver.name}` : "Talk to quest giver";
    return { text: `${name} (press E)` };
  }

  private tryInteractQuestGiver(): boolean {
    if (this.paused || this.offeredQuest) {
      return false;
    }
    const room = this.game.getCurrentRoom();
    const giver = room.questGiver;
    if (!giver) {
      return false;
    }
    const head = this.game.getSnakeBody()[0];
    if (!head) {
      return false;
    }
    const [roomX, roomY] = room.id.split(",").map(Number);
    const localX = head.x - roomX * this.grid.cols;
    const localY = head.y - roomY * this.grid.rows;
    const dist = Math.abs(localX - giver.x) + Math.abs(localY - giver.y);
    if (dist > 1) {
      return false;
    }
    const request = this.game.requestQuestFromGiver(room.id);
    const giverName = giver.name ?? "Quest Giver";
    const speaker = { portraitId: giver.portraitId };

    if (request.state === "available" && request.quest) {
      const dialogue = getQuestDialogue(request.quest);
      this.juice.questOffered();
      this.showQuestDialogue(
        giverName,
        dialogue.pages,
        {
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
        },
        {
          acceptLabel: "Yes",
          rejectLabel: "Beat it",
          nextLabel: "Next",
        },
        speaker
      );
      return true;
    }

    if (request.state === "active" && request.quest) {
      const dialogue = getQuestDialogue(request.quest);
      this.showQuestDialogue(
        giverName,
        [
          ...dialogue.pages.slice(0, 1),
          `You already carry this charge: ${request.quest.label}. Finish it, then come slither back to me.`,
        ],
        {
          onClose: () => this.closeQuestPopup(),
        },
        {
          closeLabel: "Close",
        },
        speaker
      );
      return true;
    }

    if (request.state === "completed" && request.quest) {
      this.showQuestDialogue(
        giverName,
        [
          `That task is already behind us: ${request.quest.label}.`,
          "Come back when the tunnels have another favor to ask of your scales.",
        ],
        {
          onClose: () => this.closeQuestPopup(),
        },
        {
          closeLabel: "Close",
        },
        speaker
      );
      return true;
    }

    this.showQuestHintPopup("No quests right now");
    return true;
  }

  private initQuestGiverSprite(): void {
    const size = Math.max(14, Math.floor(this.grid.cell * 0.75));
    const palette: QuestGiverSpritePalette = {
      robeColor: "#2f7f5f",
      trimColor: "#5dd6a2",
      outlineColor: "#1e3a2d",
      eyeColor: "#e8ffe8",
    };
    const textures = this.runtimeSpriteFactory.ensureRecipe(questGiverSpriteRecipe, size, palette);

    if (!this.anims.exists("quest-giver-idle")) {
      this.anims.create({
        key: "quest-giver-idle",
        frames: [{ key: textures.idle }, { key: textures.blink }],
        frameRate: 2,
        repeat: -1,
      });
    }

    this.questGiverSprite = this.add
      .sprite(0, 0, textures.idle)
      .setDepth(25)
      .setVisible(false);
    this.questGiverSprite.play("quest-giver-idle");
  }

  private updateQuestGiverSprite(): void {
    if (!this.questGiverSprite) {
      return;
    }
    const room = this.game.getCurrentRoom();
    const giver = room.questGiver;
    if (!giver) {
      this.questGiverSprite.setVisible(false);
      return;
    }
    const world = this.tileToWorldLocalInRoom({ x: giver.x, y: giver.y });
    const bobOffset = Math.sin(this.time.now / 260) * 2;
    this.questGiverSprite.setPosition(world.x, world.y - 2 + bobOffset);
    this.questGiverSprite.setVisible(true);
  }
}
