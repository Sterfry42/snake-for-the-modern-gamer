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
import type { Quest } from "../../quests.js";
import type { AppleSnapshot } from "../apples/types.js";
import type { Vector2Like } from "../core/math.js";
import type { InventorySystem } from "../inventory/inventory.js";
import type { EquipmentSlot } from "../inventory/item.js";
import { getItem } from "../inventory/itemRegistry.js";

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
    // Reduce subpixel jitter and keep lines crisp during shake/zoom
    this.cameras.main.setRoundPixels(true);
    this.snakeRenderer = new SnakeRenderer(this.graphics, this.grid);
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

      // Item equip/test keys removed; equipping is handled in the menu
    });
  }

  private handleTick(): void {
    if (!this.paused) {
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
    this.updateBossEncounter();

    if (result.apple.eaten) {
      this.featureManager.call("onAppleEaten", this);
      if (result.apple.worldPosition) {
        this.juice.appleChomp(result.apple.worldPosition.x, result.apple.worldPosition.y);
      }
    }

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
  }
  private draw(): void {
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
