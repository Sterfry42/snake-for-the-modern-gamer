import Phaser from "phaser";
import { defaultGameConfig } from "../config/gameConfig.js";
import { SnakeGame } from "../game/snakeGame.js";
import { FeatureManager } from "../systems/features.js";
import { createQuestRegistry } from "../systems/quests.js";
import { SkillTreeManager } from "../systems/skillTreeManager.js";
import { QuestHud } from "../ui/questHud.js";
import { QuestPopup } from "../ui/questPopup.js";
import { ChoicePopup, type ChoiceOption } from "../ui/choicePopup.js";
import { SnakeRenderer } from "../ui/snakeRenderer.js";
import { JuiceManager } from "../ui/juice.js";
import { BossHud } from "../ui/bossHud.js";
import { SaveUI } from "../ui/saveUI.js";
import { saveManager } from "../game/saveManager.js";
import { RuntimeSpriteFactory } from "../ui/runtimeSpriteFactory.js";
import {
  questGiverSpriteRecipe,
  type QuestGiverSpritePalette,
} from "../ui/spriteRecipes/questGiverRecipe.js";
import { getQuestDialogue } from "../quests/questDialogue.js";
import { i18n } from "../i18n/i18nManager.js";
import { createMobileControls, type MobileControls } from "../ui/mobileControls.js";
import type { Quest } from "../../quests.js";
import type { AppleSnapshot } from "../apples/types.js";
import type { Vector2Like } from "../core/math.js";
import type { InventorySystem } from "../inventory/inventory.js";
import type { EquipmentSlot } from "../inventory/item.js";
import { getItem } from "../inventory/itemRegistry.js";
import type { SnakeSpritePalette } from "../ui/spriteRecipes/snakeRecipe.js";
import type { WandererEncounter } from "../npcs/encounters.js";
import {
  VILLAGE_SHOP_EQUIPMENT,
  VILLAGE_SHOP_HATS,
  VILLAGE_SHOP_STYLES,
  getVillageShopDefinition,
  type VillageShopDefinition,
  type VillageShopEquipmentOffer,
  type VillageShopHatId,
  type VillageShopHatOffer,
  type VillageShopStyleOffer,
  type VillageShopStyleId,
} from "../shops/villageShop.js";
import {
  CARD_DEFINITIONS,
  CARD_SHOP_OFFERS,
  CARD_TABLES,
  countCards,
  createCompetitionState,
  drawCompetitionHand,
  finishCompetitionRound,
  getCardDefinition,
  getCardTable,
  scoreCardHand,
  type CardCollection,
  type CardCompetitionState,
  type CardId,
  type CardScoreResult,
} from "../cards/cardGame.js";

type SnakeThemeId = VillageShopStyleId;

type SnakeCosmeticState = {
  unlockedThemes: SnakeThemeId[];
  activeTheme: SnakeThemeId;
  unlockedHats: VillageShopHatId[];
  activeHat: VillageShopHatId | null;
  cowboyHatUnlocked: boolean;
  cowboyHatEquipped: boolean;
  loudWalkingNoiseUnlocked: boolean;
  loudWalkingNoiseEnabled: boolean;
  languageSelected: boolean;
  languageSet: boolean;
};

type SnakeThemeDefinition = {
  id: SnakeThemeId;
  label: string;
  cost: number;
  palette: SnakeSpritePalette;
};

type DeathCutsceneMode = "revive" | "game-over";

type VillageMarketStock = {
  version?: number;
  equipmentIds: string[];
  styleIds: VillageShopStyleId[];
  hatIds: VillageShopHatId[];
  cardIds: CardId[];
};

type DeathCutsceneState = {
  mode: DeathCutsceneMode;
  reason?: string | null;
  container: Phaser.GameObjects.Container;
  canAdvance: boolean;
  completed: boolean;
  reviveOnComplete: boolean;
  taunts: number;
  angelBossOnRevive: boolean;
  slainByAngel: boolean;
};

type TitleMenuMode = "main" | "settings";

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
const LEGACY_COWBOY_HAT_ID: VillageShopHatId = "cowboy";
const ANGEL_TEXTURE_KEY = "death-angel-pixel";

const DEATH_DIALOGUE_BRANCHES: readonly string[][] = [
  [
    "Thou hast come ashore upon a sea with no water.",
    "The body is a small oath. Death is the hand that collects it.",
  ],
  [
    "Behold the bright wound between one breath and the next.",
    "All crawling things learn, in time, the weight of stillness.",
  ],
  [
    "Little pilgrim, thy path was narrow, and yet thou filled it with hunger.",
    "Life is not spared because it is loved. It is spent because it was given.",
  ],
  [
    "The dark has counted thee and found thee present.",
    "Fear not the ending. Fear only the life that noticed nothing before it.",
  ],
];

const DEATH_REASON_DIALOGUE: Partial<Record<string, readonly string[]>> = {
  water: [
    "Water is a quiet executioner.",
    "Thou mistook depth for floor, and the lake accepted the compliment.",
  ],
  wall: [
    "The wall did not hate thee. It merely stood where truth had always stood.",
    "A soft body may argue with stone only once.",
  ],
  self: [
    "Few creatures are granted the honor of becoming their own calamity.",
    "Thou didst close the circle, and the circle answered.",
  ],
  boss: [
    "A greater hunger found thee.",
    "Predator and prey are titles the living borrow until the teeth arrive.",
  ],
  shark: [
    "The sea grew teeth and named thee supper.",
    "Thou crossed the blue chapel, and its oldest mouth opened.",
  ],
  bullet: [
    "A small piece of metal made a brief sermon of thy body.",
    "So ends many a proud pilgrimage: loudly, and from a distance.",
  ],
  temperature: [
    "The air itself judged thee wanting.",
    "Heat and cold are old gods. They do not need faces to be cruel.",
  ],
  shielded: [
    "Even protection has its appetite.",
    "Thou reached for safety and found its hidden blade.",
  ],
};

const REVIVE_DIALOGUE_BRANCHES: readonly string[][] = [
  [
    "Yet a coal remains beneath the ash.",
    "Return now. Let the living world learn what it failed to finish.",
  ],
  [
    "One thread still binds thee to the warm and ruinous place.",
    "Go back through it. Spend thy mercy with greater care.",
  ],
  [
    "Thy grave has opened its mouth, but not yet swallowed.",
    "Rise, and carry this interruption like a scar.",
  ],
];

const FINAL_DIALOGUE_BRANCHES: readonly string[][] = [
  [
    "Well done, little serpent. Thy work is ended.",
    "Lay down thy score, thy hungers, and thy bright foolish errands.",
  ],
  [
    "The ledger closes, and it does not do so in anger.",
    "What was taken has been counted. What was learned may travel onward.",
  ],
  [
    "Thou didst serve life by moving through it until movement failed.",
    "May the next life greet thee with kinder walls and stranger fruit.",
  ],
];

const ANGEL_TAUNT_DIALOGUE: readonly string[][] = [
  [
    "Boldness is common among the recently dead.",
    "Mistake it not for courage. Courage requires the possibility of wisdom.",
  ],
  [
    "Thou barkest at the gate as though noise were a key.",
    "I have buried kings who made richer music with fewer teeth.",
  ],
  [
    "Again? Very well. Let mercy put on armor.",
    "Return to the living, little serpent. I shall meet thee there with hands unsoftened.",
  ],
];

const ANGEL_EXECUTION_DIALOGUE: readonly string[][] = [
  [
    "There. The mouth closes.",
    "I have taken thy borrowed lives, every last bright coin of them.",
  ],
  [
    "Look upon thy little score and call it a monument, if it comforts thee.",
    "The stone will not remember. I barely shall.",
  ],
  [
    "So much length, and still no reach.",
    "Go now to the next life. Try arriving with less noise.",
  ],
];

const LANGUAGE_SELECTOR_COST = 200;

export default class SnakeScene extends Phaser.Scene {
  graphics!: Phaser.GameObjects.Graphics;
  readonly grid = defaultGameConfig.grid;

  public snakeGame!: SnakeGame;
  private questHud!: QuestHud;
  private questPopup!: QuestPopup;
  private villageShopPopup!: ChoicePopup;
  private snakeRenderer!: SnakeRenderer;
  private juice!: JuiceManager;
  private skillTree!: SkillTreeManager;
  private bossHud!: BossHud;
  private saveUI!: SaveUI;
  private mobileControls: MobileControls | null = null;
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
  private heartsHud!: Phaser.GameObjects.Text;
  private livesHud!: Phaser.GameObjects.Text;
  private temperatureHud!: Phaser.GameObjects.Text;
  private villageHud!: Phaser.GameObjects.Text;
  private biomeHud!: Phaser.GameObjects.Text;
  private questGiverSprite!: Phaser.GameObjects.Sprite;
  private wandererSprite!: Phaser.GameObjects.Sprite;
  private choicePopupVisible = false;
  private readonly villageResidentSprites: Phaser.GameObjects.Sprite[] = [];
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
    unlockedHats: [],
    activeHat: null,
    cowboyHatUnlocked: false,
    cowboyHatEquipped: false,
    loudWalkingNoiseUnlocked: false,
    loudWalkingNoiseEnabled: false,
    languageSelected: false,
    languageSet: false,
  };
  private pendingFlags: Record<string, unknown> = {};
  private readonly flagsProxy: Record<string, unknown>;
  private activeWandererTextureKey: string | null = null;
  private lastVisibleLifeCharges = 0;
  private deathCutscene: DeathCutsceneState | null = null;
  private titleContainer: Phaser.GameObjects.Container | null = null;
  private titleMainContainer: Phaser.GameObjects.Container | null = null;
  private titleSettingsContainer: Phaser.GameObjects.Container | null = null;
  private titleMessageText: Phaser.GameObjects.Text | null = null;
  private titleAnimatedObjects: Phaser.GameObjects.GameObject[] = [];
  private titleVisible = false;
  private cardGameContainer: Phaser.GameObjects.Container | null = null;
  private cardTooltipText: Phaser.GameObjects.Text | null = null;

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
    console.log("[SnakeScene] About to create SaveUI");
    this.saveUI = new SaveUI(this);
    console.log("[SnakeScene] SaveUI created:", this.saveUI);
    console.log("[SnakeScene] saveUI exists:", !!this.saveUI);

    this.setupInputHandlers();

    this.mobileControls = createMobileControls({
      onDirection: (x, y) => {
        this.setDir(x, y);
        if (this.isManualHouseMovementActive()) {
          this.consumeManualResumePause();
          this.step();
        }
      },
      onTogglePause: () => {
        this.togglePauseMenu();
      },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown, this);

    this.questHud = new QuestHud(this, {
      position: { x: this.grid.cols * this.grid.cell - 10, y: 8 },
    });
    this.questPopup = new QuestPopup(this);
    this.villageShopPopup = new ChoicePopup(this);
    this.graphics.setDepth(0);

    const registry = await createQuestRegistry();
    this.snakeGame = new SnakeGame(defaultGameConfig, registry, this);

    await this.featureManager.load(this, defaultGameConfig.features.enabled);

    this.tickEvent = this.time.addEvent({
      loop: true,
      delay: this.tickDelay,
      callback: this.handleTick,
      callbackScope: this,
    });

    this.initGame(true);

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
    this.heartsHud = this.add
      .text(8, this.grid.rows * this.grid.cell - 26, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ff8f8f",
      })
      .setDepth(28)
      .setVisible(false);
    this.livesHud = this.add
      .text(8, this.grid.rows * this.grid.cell - 48, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#fff3a8",
      })
      .setDepth(28)
      .setVisible(false);
    this.temperatureHud = this.add
      .text(8, this.grid.rows * this.grid.cell - 70, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#9ad1ff",
      })
      .setDepth(28)
      .setVisible(false);
    this.villageHud = this.add
      .text(this.grid.cols * this.grid.cell / 2, 18, "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "20px",
        color: "#f6e7c1",
        stroke: "#21140d",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0)
      .setDepth(32)
      .setVisible(false);
    this.biomeHud = this.add
      .text(this.grid.cols * this.grid.cell / 2, 42, "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "18px",
        color: "#dfe8ff",
        stroke: "#140d21",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0)
      .setDepth(32)
      .setVisible(false);

    this.initQuestGiverSprite();
    this.initWandererSprite();
    this.showTitleScreen("main");
  }

  private setupInputHandlers(): void {
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (this.titleVisible) {
        event.preventDefault();
        return;
      }
      if (this.deathCutscene) {
        if (this.questPopup.isVisible()) {
          return;
        }
        if ([" ", "enter", "e"].includes(key)) {
          event.preventDefault();
          this.advanceDeathCutscene();
        }
        return;
      }

      if (this.skillTree.handleTextInput(event)) {
        event.preventDefault();
        return;
      }

      if (key === " ") {
        if (this.isModalPopupVisible()) {
          event.preventDefault();
          return;
        }
        this.togglePauseMenu();
        return;
      }

      if (this.skillTree.handleKeyDown(key, this.paused)) {
        return;
      }

      if (this.isManualHouseMovementActive()) {
        if (["arrowup", "w"].includes(key)) {
          this.setDir(0, -1);
          this.consumeManualResumePause();
          this.step();
          return;
        }
        if (["arrowdown", "s"].includes(key)) {
          this.setDir(0, 1);
          this.consumeManualResumePause();
          this.step();
          return;
        }
        if (["arrowleft", "a"].includes(key)) {
          this.setDir(-1, 0);
          this.consumeManualResumePause();
          this.step();
          return;
        }
        if (["arrowright", "d"].includes(key)) {
          this.setDir(1, 0);
          this.consumeManualResumePause();
          this.step();
          return;
        }
      }

      if (["arrowup", "w"].includes(key)) this.setDir(0, -1);
      if (["arrowdown", "s"].includes(key)) this.setDir(0, 1);
      if (["arrowleft", "a"].includes(key)) this.setDir(-1, 0);
      if (["arrowright", "d"].includes(key)) this.setDir(1, 0);

      if (key === "t") this.showSaveUI();
      if (key === "y") this.hideSaveUI();

      if (key === "e") {
        if (this.tryInteractVillageShopkeeper()) {
          return;
        }
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

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.deathCutscene) {
        if (this.questPopup.isVisible()) {
          return;
        }
        this.advanceDeathCutscene();
        return;
      }
      if (this.paused || this.questPopup.isVisible()) {
        return;
      }
      const head = this.snakeGame?.getSnakeBody?.()[0];
      if (!head) {
        return;
      }
      const headWorld = this.tileToWorld(head);
      const dx = pointer.worldX - headWorld.x;
      const dy = pointer.worldY - headWorld.y;
      if (dx === 0 && dy === 0) {
        return;
      }
      const direction = Math.abs(dx) >= Math.abs(dy)
        ? { x: dx >= 0 ? 1 : -1, y: 0 }
        : { x: 0, y: dy >= 0 ? 1 : -1 };
      if (this.snakeGame.firePlayerShot(direction)) {
        this.isDirty = true;
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
    this.snakeGame.reset();
    this.juice.stopBossMusic();
    this.juice.stopHeavenMusic();
    (this.juice as any).stopPowerupMusic?.();
    if (this.bossHud) {
      this.bossHud.hide();
    }
    this.activeBossId = null;
    if (Object.keys(this.pendingFlags).length > 0) {
      for (const [key, value] of Object.entries(this.pendingFlags)) {
        this.snakeGame.setFlag(key, value);
      }
    }
    this.currentApple = this.snakeGame.getApple(this.snakeGame.getCurrentRoom().id);
    this.snakeCosmetics = {
      unlockedThemes: ["classic"],
      activeTheme: "classic",
      unlockedHats: [],
      activeHat: null,
      cowboyHatUnlocked: false,
      cowboyHatEquipped: false,
      loudWalkingNoiseUnlocked: false,
      loudWalkingNoiseEnabled: false,
      languageSelected: false,
      languageSet: false,
    };
    this.juice.setMovementNoiseMultiplier(1);
    this.paused = startPaused;
    this.isDirty = true;
    this.questPopup.hide();
    this.lastVisibleLifeCharges = 0;
    if (!this.titleVisible) {
      this.showSaveUI();
    } else {
      this.hideSaveUI();
    }
  }

  private step(): void {
    const result = this.snakeGame.step(this.paused);
    this.updateHouseAmbience();

    if (result.status === "dead") {
      this.reportDeathDebug(result.deathReason);
      if (this.wasKilledByInsultedAngel(result.deathReason)) {
        this.clearAllLifeSources();
        this.startDeathSequence("game-over", result.deathReason, { slainByAngel: true });
        return;
      }
      if (this.skillTree.tryConsumeExtraLife()) {
        this.skillTree.hideOverlay();
        this.startDeathSequence("revive", result.deathReason, { reviveOnComplete: true });
        return;
      }
      this.startDeathSequence("game-over", result.deathReason);
      return;
    }

    const phoenixTriggered = this.snakeGame.getFlag<{ reason?: string | null }>("fortitude.phoenixTriggered");
    if (phoenixTriggered) {
      this.snakeGame.setFlag("fortitude.phoenixTriggered", undefined);
      this.startDeathSequence("revive", phoenixTriggered.reason ?? "extra-life", { reviveOnComplete: false });
      return;
    }

    this.featureManager.call("onTick", this);

    this.currentApple = result.apple.current ?? null;
    this.updateBossEncounter();
    this.maybePresentRandomEncounter();

    if (result.apple.eaten) {
      this.featureManager.call("onAppleEaten", this);
      if (result.apple.worldPosition) {
        const violenceLevel = Number(this.getFlag<number>("killstreak.appleJuiceLevel") ?? 0);
        this.juice.appleChomp(result.apple.worldPosition.x, result.apple.worldPosition.y, violenceLevel);
        this.setFlag("killstreak.appleJuiceLevel", undefined);
      }
    }

    this.tickHouseAmbientEffects();

    const consumedPhoenix = this.snakeGame.getFlag<{ itemId: string }>("equipment.itemPhoenixConsumed");
    if (consumedPhoenix) {
      this.applyEquipmentEffects();
      const item = getItem(consumedPhoenix.itemId);
      this.showQuestHintPopup(`${item?.name ?? "Phoenix charm"} burned away.`, "#fff3a8");
      this.snakeGame.setFlag("equipment.itemPhoenixConsumed", undefined);
    }

    // Idle apple sparkle
    if (this.currentApple && !result.apple.eaten) {
      const world = this.tileToWorld(this.currentApple.position);
      if (this.random() < 0.06) {
        this.juice.appleIdle(world.x, world.y);
      }
    }

    // Idle treasure sparkle
    const roomForTreasure = this.snakeGame.getCurrentRoom();
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
    const pfx = this.snakeGame.getFlag<{ x: number; y: number; roomId: string; kind: "phase" | "smite" | "gun" }>("ui.powerupPickup");
    if (pfx) {
      const world = this.tileToWorldInRoom({ x: pfx.x, y: pfx.y }, pfx.roomId);
      (this.juice as any).powerupPickup?.(world.x, world.y, pfx.kind);
      // Start powerup music with duration derived from active ticks if available
      const active = this.snakeGame.getFlag<{ kind: string; remaining: number; total: number }>("powerup.active");
      if (active && typeof active.total === "number") {
        const durationMs = Math.max(1, active.total) * this.tickDelay;
        (this.juice as any).startPowerupMusic?.(durationMs);
        this.powerupMusicActive = true;
      }
      // Popup text announcing the powerup
      const name = pfx.kind === "phase" ? "Phase" : pfx.kind === "smite" ? "Smite" : "Gun";
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
      this.snakeGame.setFlag("ui.powerupPickup", undefined);
    }

    // Stop powerup music when effect ends
    const active = this.snakeGame.getFlag<{ kind: string; remaining: number; total: number }>("powerup.active");
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
    const head = this.snakeGame.getSnakeBody()[0];
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
      this.applyPendingQuestCosmeticRewards();
    }

    this.handlePredationFeedback();

    // Boss smite FX on collision
    const smite = this.snakeGame.getFlag<{ x: number; y: number; roomId: string }>("ui.bossSmite");
    if (smite) {
      const world = this.tileToWorldInRoom({ x: smite.x, y: smite.y }, smite.roomId);
      (this.juice as any).bossHit?.(world.x, world.y);
      this.snakeGame.setFlag("ui.bossSmite", undefined);
    }

    this.isDirty = true;
  }

  private offerQuest(quest: Quest) {
    this.paused = true;
    this.hideSaveUI();
    this.skillTree.hideOverlay();
    this.juice.questOffered();

    this.questPopup.show(quest, {
      onAccept: () => {
        this.juice.questAccepted();
        const accepted = this.snakeGame.acceptOfferedQuest();
        if (accepted) {
          this.isDirty = true;
          this.applyPendingQuestCosmeticRewards();
        }
        this.closeQuestPopup();
      },
      onReject: () => {
        this.juice.questRejected();
        this.snakeGame.rejectOfferedQuest();
        this.closeQuestPopup();
      },
    });
  }

  private closeQuestPopup() {
    this.questPopup.hide();
    this.skillTree.hideOverlay();
    this.paused = false;
    this.showSaveUI();
    this.isDirty = true;
  }

  private tickHouseAmbientEffects(): void {
    const insideInterior = this.isInHouseInterior();
    if (!insideInterior) {
      this.houseRestCounter = 0;
      return;
    }

    if (this.isInHouse()) {
      this.setFlag("timeSinceEat", 0);
      this.houseRestCounter++;
      if (this.houseRestCounter >= 30) {
        this.houseRestCounter = 0;
        this.addScoreDirect(1);
        this.growSnake(1);
        const cam = this.cameras.main;
        (this.juice as any).houseRestPulse?.(cam.midPoint.x, cam.midPoint.y + 10);
      }
    } else {
      this.houseRestCounter = 0;
    }

    const w = this.grid.cols * this.grid.cell;
    const h = this.grid.rows * this.grid.cell;
    const room = this.snakeGame.getCurrentRoom();
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
    if (this.random() < 0.045) {
      const pulseOrigin = lampCenter ?? { x: w / 2, y: h / 2 };
      (this.juice as any).interiorPulse?.(pulseOrigin.x, pulseOrigin.y);
    }
  }

  private reportDeathDebug(reason?: string | null): void {
    const snapshot = this.snakeGame.createDeathDebugSnapshot(reason);
    this.snakeGame.setFlag("debug.lastDeathSnapshot", snapshot);
    console.groupCollapsed(
      `[Death Debug] ${snapshot.reason ?? "unknown"} at ${snapshot.roomId} local (${snapshot.local.x}, ${snapshot.local.y}) world (${snapshot.world.x}, ${snapshot.world.y}) tile "${snapshot.tile ?? "?"}"`
    );
    console.log("summary", {
      reason: snapshot.reason,
      roomId: snapshot.roomId,
      world: snapshot.world,
      local: snapshot.local,
      tile: snapshot.tile,
      direction: snapshot.direction,
    });
    for (const room of snapshot.rooms) {
      console.log(`${room.roomId} ${room.biomeTitle} (${room.biomeId})\n${room.layout.join("\n")}`);
    }
    console.groupEnd();
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
    this.initGame(true);
    this.showTitleScreen("main");
    this.skillTree.hideOverlay();
    this.paused = true;
    console.log("Game over:", reason);
  }

  private startDeathSequence(
    mode: DeathCutsceneMode,
    reason?: string | null,
    options: { reviveOnComplete?: boolean; slainByAngel?: boolean } = {}
  ): void {
    if (reason === "water") {
      this.playDrowningAnimation(() => this.startDeathCutscene(mode, reason, options));
      return;
    }
    this.startDeathCutscene(mode, reason, options);
  }

  private playDrowningAnimation(onComplete: () => void): void {
    this.paused = true;
    this.hideSaveUI();
    this.skillTree.hideOverlay();

    const head = this.snakeGame.getSnakeBody()[0] ?? null;
    const world = this.tileToWorld(head);
    const puddle = this.add
      .ellipse(world.x + this.grid.cell / 2, world.y + this.grid.cell / 2, this.grid.cell * 0.2, this.grid.cell * 0.1, 0x7edcff, 0.75)
      .setDepth(70)
      .setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.add
      .ellipse(world.x + this.grid.cell / 2, world.y + this.grid.cell / 2, this.grid.cell * 0.7, this.grid.cell * 0.26, 0x0b4f7a, 0)
      .setDepth(69)
      .setStrokeStyle(2, 0xa7e8ff, 0.85);
    const bubbles: Phaser.GameObjects.Ellipse[] = [];

    for (let i = 0; i < 7; i += 1) {
      const bubble = this.add
        .ellipse(
          world.x + this.grid.cell / 2 + (this.random() - 0.5) * this.grid.cell * 0.7,
          world.y + this.grid.cell / 2 + (this.random() - 0.5) * this.grid.cell * 0.35,
          3,
          3,
          0xd8fbff,
          0.85
        )
        .setDepth(71);
      bubbles.push(bubble);
      this.tweens.add({
        targets: bubble,
        y: bubble.y - 18 - this.random() * 12,
        alpha: 0,
        scale: 1.8,
        duration: 520 + i * 65,
        delay: i * 55,
        ease: "Sine.easeOut",
      });
    }

    this.tweens.add({
      targets: puddle,
      scaleX: 4.2,
      scaleY: 2.6,
      alpha: 0.95,
      duration: 360,
      ease: "Back.easeOut",
    });
    this.tweens.add({
      targets: ring,
      scaleX: 1.8,
      scaleY: 1.45,
      alpha: 0,
      duration: 720,
      ease: "Sine.easeOut",
    });
    this.time.delayedCall(780, () => {
      puddle.destroy();
      ring.destroy();
      bubbles.forEach((bubble) => bubble.destroy());
      onComplete();
    });
  }

  private startDeathCutscene(
    mode: DeathCutsceneMode,
    reason?: string | null,
    options: { reviveOnComplete?: boolean; slainByAngel?: boolean } = {}
  ): void {
    if (this.deathCutscene) {
      return;
    }

    this.paused = true;
    this.hideSaveUI();
    this.skillTree.hideOverlay();
    this.ensureAngelTexture();
    this.juice.startHeavenMusic();

    const width = this.grid.cols * this.grid.cell;
    const height = this.grid.rows * this.grid.cell;
    const container = this.add.container(0, 0).setDepth(80);
    const fade = this.add.rectangle(0, 0, width, height, 0xffffff, 1).setOrigin(0, 0).setAlpha(0);
    const angel = this.add
      .image(width / 2, height * 0.38, ANGEL_TEXTURE_KEY)
      .setOrigin(0.5)
      .setScale(8.5)
      .setAlpha(0)
      .setTint(0xfffbdf);
    const halo = this.add
      .ellipse(width / 2, height * 0.17, width * 0.42, 44, 0xfff4a8, 0.35)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    container.add([fade, halo, angel]);
    this.deathCutscene = {
      mode,
      reason,
      container,
      canAdvance: false,
      completed: false,
      reviveOnComplete: options.reviveOnComplete ?? mode === "revive",
      taunts: 0,
      angelBossOnRevive: false,
      slainByAngel: options.slainByAngel ?? false,
    };

    this.tweens.add({ targets: fade, alpha: 1, duration: 650, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: halo, alpha: 1, duration: 900, delay: 350, ease: "Sine.easeOut" });
    this.tweens.add({
      targets: angel,
      alpha: 1,
      scale: 9.25,
      y: height * 0.35,
      duration: 1100,
      delay: 420,
      ease: "Cubic.easeOut",
    });
    this.time.delayedCall(1250, () => this.showAngelDeathDialogue());
  }

  private advanceDeathCutscene(): void {
    const cutscene = this.deathCutscene;
    if (!cutscene || !cutscene.canAdvance || cutscene.completed) {
      return;
    }

    cutscene.completed = true;
    this.questPopup.hide();
    this.tweens.add({
      targets: cutscene.container,
      alpha: 0,
      duration: 260,
      ease: "Sine.easeIn",
      onComplete: () => {
        cutscene.container.destroy(true);
        this.deathCutscene = null;
        this.questPopup.setDepth(20);
        this.juice.stopHeavenMusic();
        if (cutscene.mode === "revive") {
          if (cutscene.reviveOnComplete) {
            this.snakeGame.reviveAfterExtraLife(cutscene.reason);
            this.snakeGame.setFlag("fortitude.phoenixTriggered", undefined);
          }
          if (cutscene.angelBossOnRevive) {
            this.snakeGame.spawnInsultedAngelBoss();
            this.updateBossEncounter();
          }
          this.paused = false;
          this.showSaveUI();
          this.isDirty = true;
          return;
        }
        this.gameOver(cutscene.reason);
      },
    });
  }

  private showAngelDeathDialogue(): void {
    const cutscene = this.deathCutscene;
    if (!cutscene || cutscene.completed) {
      return;
    }

    this.questPopup.setDepth(90);
    cutscene.canAdvance = false;

    const pages = cutscene.slainByAngel
      ? this.composeAngelExecutionDialogue()
      : this.composeDeathDialogue(
          cutscene.mode,
          cutscene.mode === "game-over" ? this.composeRunSummary() : []
        );

    if (cutscene.mode === "revive") {
      this.questPopup.showDialogue(
        "The Angel",
        pages,
        {
          onAccept: () => {
            cutscene.canAdvance = true;
            this.advanceDeathCutscene();
          },
          onReject: () => this.tauntAngel(),
        },
        { acceptLabel: "Return", rejectLabel: "Taunt", nextLabel: "Listen" },
        { portraitId: "sage-3" }
      );
      return;
    }

    this.questPopup.showDialogue(
      "The Angel",
      pages,
      {
        onClose: () => {
          cutscene.canAdvance = true;
          this.advanceDeathCutscene();
        },
      },
      { nextLabel: "Listen", closeLabel: "Begin again" },
      { portraitId: "sage-3" }
    );
  }

  private tauntAngel(): void {
    const cutscene = this.deathCutscene;
    if (!cutscene || cutscene.mode !== "revive" || cutscene.completed) {
      return;
    }

    cutscene.taunts += 1;
    const tauntIndex = Math.min(cutscene.taunts - 1, ANGEL_TAUNT_DIALOGUE.length - 1);
    const pages = ANGEL_TAUNT_DIALOGUE[tauntIndex] ?? ANGEL_TAUNT_DIALOGUE[0];

    if (cutscene.taunts >= ANGEL_TAUNT_DIALOGUE.length) {
      cutscene.angelBossOnRevive = true;
      this.questPopup.showDialogue(
        "The Angel",
        [...pages],
        {
          onClose: () => {
            cutscene.canAdvance = true;
            this.advanceDeathCutscene();
          },
        },
        { nextLabel: "Listen", closeLabel: "Return" },
        { portraitId: "sage-2" }
      );
      return;
    }

    this.questPopup.showDialogue(
      "The Angel",
      [...pages],
      {
        onAccept: () => {
          cutscene.canAdvance = true;
          this.advanceDeathCutscene();
        },
        onReject: () => this.tauntAngel(),
      },
      { acceptLabel: "Return", rejectLabel: "Taunt again", nextLabel: "Listen" },
      { portraitId: "sage-2" }
    );
  }

  private clearAllLifeSources(): void {
    this.skillTree.clearExtraLifeCharges();
    this.setFlag("equipment.phoenixCharges", 0);
    this.setFlag("fortitude.phoenix", { charges: 0 });
    this.setFlag("fortitude.phoenixTriggered", undefined);
    this.setFlag("ui.livesRevealed", true);
    this.lastVisibleLifeCharges = 0;
  }

  private wasKilledByInsultedAngel(reason?: string | null): boolean {
    if (this.getFlag<boolean>("boss.insultedAngel")) {
      return true;
    }
    if (this.getFlag<string>("internal.killedByBossKind") === "angel") {
      return true;
    }
    return reason === "boss" && this.snakeGame.getBosses(this.currentRoomId).some((boss) => boss.kind === "angel");
  }

  private composeAngelExecutionDialogue(): string[] {
    const score = this.score;
    const length = this.snakeGame.getSnakeLength();
    return [
      ...this.pickDialogueBranch(ANGEL_EXECUTION_DIALOGUE),
      `Score ${score}. A number small enough to fit in a beggar's palm.`,
      `Length ${length}. So much body, so little consequence.`,
    ];
  }

  private composeDeathDialogue(mode: DeathCutsceneMode, runSummary: readonly string[]): string[] {
    const opening = this.pickDialogueBranch(DEATH_DIALOGUE_BRANCHES);
    const reasonLines = this.getDeathReasonDialogue(this.deathCutscene?.reason);
    if (mode === "revive") {
      return [...opening, ...reasonLines, ...this.pickDialogueBranch(REVIVE_DIALOGUE_BRANCHES)];
    }
    return [...opening, ...reasonLines, ...this.pickDialogueBranch(FINAL_DIALOGUE_BRANCHES), ...runSummary];
  }

  private getDeathReasonDialogue(reason?: string | null): string[] {
    if (!reason) {
      return [];
    }
    return [...(DEATH_REASON_DIALOGUE[reason] ?? [])];
  }

  private pickDialogueBranch(branches: readonly (readonly string[])[]): string[] {
    const index = Math.floor(this.random() * branches.length);
    return [...(branches[index] ?? branches[0])];
  }

  private composeRunSummary(): string[] {
    const length = this.snakeGame.getSnakeLength();
    const rooms = Math.max(
      this.getGeneratedRoomsOnCurrentLevel().length,
      Number(this.getFlag<number>("roomsVisited") ?? 1)
    );
    const quests = this.completedQuests;
    const treasure = Number(this.getFlag<number>("treasurePicked") ?? 0);
    const powerups = Number(this.getFlag<number>("powerupsPicked") ?? 0);
    const streak = Number(this.getFlag<number>("appleStreakMax") ?? 0);
    const summary = [`Score ${this.score}. Length ${length}. Rooms crossed ${rooms}.`];

    if (quests.length > 0) {
      summary.push(`Vows fulfilled: ${quests.slice(0, 3).join(", ")}${quests.length > 3 ? ", and more" : ""}.`);
    }
    if (treasure > 0 || powerups > 0) {
      summary.push(`Relics claimed ${treasure}; brief miracles taken ${powerups}.`);
    }
    if (streak > 1) {
      summary.push(`Longest hunger-chain: ${streak}.`);
    }
    if (summary.length === 1) {
      summary.push("No great deed is wasted merely because it was small.");
    }

    return summary;
  }

  private ensureAngelTexture(): void {
    if (this.textures.exists(ANGEL_TEXTURE_KEY)) {
      return;
    }

    const texture = this.textures.createCanvas(ANGEL_TEXTURE_KEY, 48, 48);
    const context = texture.getContext();
    context.imageSmoothingEnabled = false;

    const px = (x: number, y: number, w: number, h: number, color: string): void => {
      context.fillStyle = color;
      context.fillRect(x, y, w, h);
    };
    const mirror = (points: readonly [number, number, number, number][], color: string): void => {
      for (const [x, y, w, h] of points) {
        px(x, y, w, h, color);
        px(48 - x - w, y, w, h, color);
      }
    };

    context.clearRect(0, 0, 48, 48);
    px(17, 2, 14, 3, "#f8d76a");
    px(14, 5, 20, 2, "#fff2a8");
    mirror([[9, 9, 9, 4], [6, 13, 13, 5], [3, 18, 16, 7], [0, 25, 17, 8], [5, 33, 12, 5]], "#eef8ff");
    mirror([[12, 13, 7, 4], [9, 19, 9, 5], [5, 27, 11, 4]], "#cfe4ff");
    px(18, 10, 12, 10, "#f4d0a3");
    px(16, 18, 16, 4, "#d8a97f");
    px(14, 22, 20, 18, "#fff7dc");
    px(17, 24, 14, 13, "#eadfac");
    px(20, 13, 2, 2, "#1c1920");
    px(26, 13, 2, 2, "#1c1920");
    px(22, 17, 4, 1, "#6f4f52");
    px(20, 40, 3, 6, "#e7dca8");
    px(25, 40, 3, 6, "#e7dca8");
    mirror([[12, 24, 3, 12], [9, 29, 3, 8]], "#fffaf0");
    texture.refresh();
  }

  setDir(x: number, y: number) {
    this.snakeGame.setDirection(x, y);
  }

  private togglePauseMenu(force?: boolean): void {
    if (this.offeredQuest || this.isModalPopupVisible()) return;
    const nextState = typeof force === "boolean" ? force : !this.paused;
    if (nextState === this.paused) {
      return;
    }

    this.paused = nextState;
    this.skillTree.toggleOverlay(this.paused ? true : false);
    if (this.paused) {
      this.hideSaveUI();
      this.juice.skillTreeOpened();
    } else {
      this.showSaveUI();
      this.juice.skillTreeClosed();
    }
  }

  private handleShutdown(): void {
    this.mobileControls?.destroy();
    this.mobileControls = null;
  }

  addScore(amount: number) {
    const applied = this.skillTree ? this.skillTree.modifyScoreGain(amount) : amount;
    this.addScoreDirect(applied);
  }

  addScoreDirect(amount: number): void {
    this.snakeGame.addScore(amount);
    this.isDirty = true;
    // Floating score popup at head
    const head = this.snakeGame.getSnakeBody()[0];
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

  applyCheatCode(rawCode: string): { ok: boolean; message: string; color: string } {
    const code = rawCode.trim().toLowerCase().replace(/\s+/g, " ");
    if (!code) {
      return { ok: false, message: "Enter a cheat string.", color: "#ff6b6b" };
    }
    if (code === "investingincrypto") {
      this.setFlag("cheat.appleScoreMultiplier", 100);
      this.isDirty = true;
      return { ok: true, message: "Cheat active: apple score x100.", color: "#5dd6a2" };
    }
    if (code === "imawiddlebabywhoneedshelp") {
      this.skillTree.addExtraLifeCharge(100);
      this.setFlag("ui.livesRevealed", true);
      this.isDirty = true;
      return { ok: true, message: "Cheat active: +100 lives.", color: "#5dd6a2" };
    }
    if (code === "freakdennis") {
      if (this.snakeGame && this.snakeGame.bosses && this.currentRoomId) {
        this.snakeGame.bosses.spawnBoss(this.currentRoomId, "freak-dennis");
        return { ok: true, message: "Spawned Freak Dennis!", color: "#5dd6a2" };
      }
      return { ok: false, message: "Cannot spawn boss - game not in valid state", color: "#ff6b6b" };
    }
    if (code === "freakerdennis") {
      if (this.snakeGame && this.snakeGame.bosses && this.currentRoomId) {
        this.snakeGame.bosses.spawnBoss(this.currentRoomId, "freaker-dennis");
        return { ok: true, message: "Spawned Freaker Dennis!", color: "#5dd6a2" };
      }
      return { ok: false, message: "Cannot spawn boss - game not in valid state", color: "#ff6b6b" };
    }
    return { ok: false, message: `Unknown cheat: ${rawCode.trim()}`, color: "#ff6b6b" };
  }

  growSnake(extraSegments: number): void {
    if (extraSegments > 0) {
      this.snakeGame.growSnake(extraSegments);
      this.isDirty = true;
    }
  }

  setFlag(key: string, value: unknown): void {
    if (this.snakeGame) {
      this.snakeGame.setFlag(key, value);
    } else {
      if (value === undefined) {
        delete this.pendingFlags[key];
      } else {
        this.pendingFlags[key] = value;
      }
    }
  }

  getFlag<T = unknown>(key: string): T | undefined {
    if (this.snakeGame) {
      const value = this.snakeGame.getFlag<T>(key);
      if (value !== undefined) {
        return value;
      }
    }
    return this.pendingFlags[key] as T | undefined;
  }

  random(): number {
    return this.snakeGame ? this.snakeGame.random() : Math.random();
  }

  setTeleport(flag: boolean): void {
    this.snakeGame.enableTeleport(flag);
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
    return this.snakeGame.getTeleport();
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
    return this.snakeGame.getScore();
  }

  get snake(): readonly Vector2Like[] {
    return this.snakeGame.getSnakeBody();
  }

  get currentRoomId(): string {
    const room = this.snakeGame.getCurrentRoom();
    if (!room) {
      console.warn('[currentRoomId] Game state invalid, using default room');
      return "0,0,0";
    }
    return room.id;
  }

  getGeneratedRoomsOnCurrentLevel(): string[] {
    const fn: any = (this.snakeGame as any).getGeneratedRooms;
    if (typeof fn === "function") {
      return fn.call(this.snakeGame);
    }
    return [];
  }

  get activeQuests(): Quest[] {
    return this.snakeGame.getActiveQuests();
  }

  get completedQuests(): string[] {
    return this.snakeGame.getCompletedQuestIds();
  }

  setChoicePopupVisible(visible: boolean): void {
    this.choicePopupVisible = visible;
  }

  prepareCharacterSave(): void {
    this.setFlag("skills.ranks", this.skillTree.exportRanks());
  }

  restoreCharacterSaveState(): void {
    const ranks = this.getFlag<Record<string, number>>("skills.ranks");
    if (ranks) {
      this.skillTree.restoreRanks(ranks);
    }
    this.applyEquipmentEffects();
    this.currentApple = this.snakeGame.getApple(this.snakeGame.getCurrentRoom().id);
    this.isDirty = true;
  }

  showSaveUI(): void {
    this.saveUI.show();
  }

  hideSaveUI(): void {
    this.saveUI.hide();
  }

  private showTitleScreen(mode: TitleMenuMode = "main", message = ""): void {
    this.paused = true;
    this.titleVisible = true;
    this.hideSaveUI();
    this.skillTree.hideOverlay();
    this.questPopup.hide();
    this.villageShopPopup?.hide();

    if (!this.titleContainer) {
      this.buildTitleScreen();
    }

    this.titleContainer?.setVisible(true).setAlpha(1);
    this.showTitleMode(mode);
    this.titleMessageText?.setText(message);
    this.setFlag("ui.suppressHud", true);
    this.juice.startTitleMusic();
  }

  private hideTitleScreen(): void {
    this.titleVisible = false;
    this.titleContainer?.setVisible(false);
    this.titleMessageText?.setText("");
    this.setFlag("ui.suppressHud", false);
    this.juice.stopTitleMusic();
  }

  private showTitleMode(mode: TitleMenuMode): void {
    this.titleMainContainer?.setVisible(mode === "main");
    this.titleSettingsContainer?.setVisible(mode === "settings");
  }

  private startNewGameFromTitle(): void {
    this.hideTitleScreen();
    this.initGame(true);
    this.resetStartingChoices();
    this.setFlag("run.startChoicesReady", true);
    this.paused = true;
    this.showSaveUI();
  }

  private loadGameFromTitle(): void {
    if (!saveManager.hasSave()) {
      this.titleMessageText?.setText("No save file found.");
      return;
    }

    const success = saveManager.load(
      this.snakeGame,
      () => this.chosenReligionId ? { id: this.chosenReligionId, mods: this.religionMods } : null,
      () => this.chosenClassId ? { id: this.chosenClassId, mods: this.classMods } : null,
      () => this.chosenBackgroundId ? { id: this.chosenBackgroundId, mods: this.backgroundMods } : null
    );

    if (!success) {
      this.titleMessageText?.setText("Failed to load game.");
      return;
    }

    this.hideTitleScreen();
    this.restoreCharacterSaveState();
    this.paused = false;
    this.showSaveUI();
    this.isDirty = true;
  }

  private buildTitleScreen(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const root = this.add.container(0, 0).setDepth(220).setScrollFactor(0);
    const art = this.add.graphics();
    this.drawTitleArtwork(art, width, height);

    const veil = this.add.rectangle(0, 0, width, height, 0x02030a, 0.18).setOrigin(0, 0);
    const title = this.add
      .text(width / 2, 38, "Snake for the Modern Gamer", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "38px",
        color: "#fff4cf",
        stroke: "#150712",
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0);
    const subtitle = this.add
      .text(width / 2, 82, "THE FIRST AAAA SNAKE-LIKE. 11/10 IGN. BEST GAME EVER MADE.\nFREAK DENNIS FEARS IT. ANGELS PREORDERED IT.", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#fff3a8",
        stroke: "#09111d",
        strokeThickness: 2,
        align: "center",
      })
      .setOrigin(0.5, 0);

    const main = this.add.container(0, 0);
    const buttonX = width - 238;
    const buttonY = 285;
    const buttons = [
      this.createTitleButton(buttonX, buttonY, "New Game", () => this.startNewGameFromTitle()),
      this.createTitleButton(buttonX, buttonY + 46, "Load Game", () => this.loadGameFromTitle()),
      this.createTitleButton(buttonX, buttonY + 92, "Learn More", () => {
        window.location.href = "https://www.youtube.com/watch?v=WGvH11I6Rnk";
      }),
      this.createTitleButton(buttonX, buttonY + 138, "Settings", () => this.showTitleScreen("settings")),
    ];
    main.add(buttons);

    const settings = this.add.container(0, 0).setVisible(false);
    const panel = this.add
      .rectangle(width / 2, height / 2 + 44, 300, 190, 0x071019, 0.88)
      .setStrokeStyle(2, 0x8fb7ff)
      .setOrigin(0.5);
    const settingsTitle = this.add
      .text(width / 2, height / 2 - 30, "Settings", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "26px",
        color: "#fff4cf",
      })
      .setOrigin(0.5);
    const settingsBody = this.add
      .text(width / 2, height / 2 + 10, "More settings will live here.", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#c8ffe1",
      })
      .setOrigin(0.5);
    settings.add([
      panel,
      settingsTitle,
      settingsBody,
      this.createTitleButton(width / 2 - 105, height / 2 + 54, "Back", () => this.showTitleScreen("main")),
    ]);

    this.titleMessageText = this.add
      .text(buttonX + 105, buttonY + 196, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffb3a8",
        align: "center",
        wordWrap: { width: 200 },
      })
      .setOrigin(0.5, 0);

    const glint = this.add
      .rectangle(188, 371, 5, 22, 0xffffff, 0.0)
      .setAngle(42)
      .setBlendMode(Phaser.BlendModes.ADD);
    const dennisPulse = this.add
      .circle(width / 2 + 34, 314, 80, 0x9b5de5, 0.0)
      .setBlendMode(Phaser.BlendModes.ADD);
    const angelGlow = this.add
      .circle(width - 154, 76, 52, 0xfff4cf, 0.0)
      .setBlendMode(Phaser.BlendModes.ADD);
    const smokeWisps = [
      this.add.circle(width / 2 - 12, 278, 12, 0x8a3dff, 0.18).setBlendMode(Phaser.BlendModes.ADD),
      this.add.circle(width / 2 + 44, 264, 10, 0x8a3dff, 0.16).setBlendMode(Phaser.BlendModes.ADD),
      this.add.circle(width / 2 + 74, 286, 8, 0x8a3dff, 0.14).setBlendMode(Phaser.BlendModes.ADD),
    ];
    const titleRays = [
      this.add.rectangle(width / 2 - 170, 70, 160, 5, 0xfff3a8, 0.0).setBlendMode(Phaser.BlendModes.ADD),
      this.add.rectangle(width / 2 + 170, 70, 160, 5, 0xfff3a8, 0.0).setBlendMode(Phaser.BlendModes.ADD),
      this.add.rectangle(width / 2, 112, 220, 4, 0x9ad1ff, 0.0).setBlendMode(Phaser.BlendModes.ADD),
    ];
    titleRays[0].setAngle(-8);
    titleRays[1].setAngle(8);
    const sparkles = [
      this.add.rectangle(buttonX - 16, buttonY + 16, 5, 5, 0xfff3a8, 0.0).setBlendMode(Phaser.BlendModes.ADD),
      this.add.rectangle(buttonX + 224, buttonY + 62, 5, 5, 0xfff3a8, 0.0).setBlendMode(Phaser.BlendModes.ADD),
      this.add.rectangle(buttonX - 10, buttonY + 116, 4, 4, 0x9ad1ff, 0.0).setBlendMode(Phaser.BlendModes.ADD),
      this.add.rectangle(buttonX + 220, buttonY + 160, 4, 4, 0xfff3a8, 0.0).setBlendMode(Phaser.BlendModes.ADD),
    ];
    const comets = [
      this.add.rectangle(90, 128, 46, 3, 0xd8f2ff, 0.0).setAngle(-18).setBlendMode(Phaser.BlendModes.ADD),
      this.add.rectangle(610, 188, 64, 3, 0xfff3a8, 0.0).setAngle(-14).setBlendMode(Phaser.BlendModes.ADD),
    ];
    const birds = [
      this.add.text(118, 202, "v", { fontFamily: "monospace", fontSize: "12px", color: "#cbd7e8" }).setAlpha(0.0),
      this.add.text(138, 212, "v", { fontFamily: "monospace", fontSize: "10px", color: "#cbd7e8" }).setAlpha(0.0),
      this.add.text(650, 240, "v", { fontFamily: "monospace", fontSize: "11px", color: "#cbd7e8" }).setAlpha(0.0),
    ];
    const embers = [
      this.add.circle(156, 344, 3, 0xffa84d, 0.0).setBlendMode(Phaser.BlendModes.ADD),
      this.add.circle(252, 346, 3, 0xffd36b, 0.0).setBlendMode(Phaser.BlendModes.ADD),
      this.add.circle(496, 358, 3, 0xffa84d, 0.0).setBlendMode(Phaser.BlendModes.ADD),
      this.add.circle(580, 354, 3, 0xffd36b, 0.0).setBlendMode(Phaser.BlendModes.ADD),
    ];
    const crownBurst = this.add
      .star(width / 2, 32, 8, 6, 24, 0xfff3a8, 0.0)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.titleAnimatedObjects = [glint, dennisPulse, angelGlow, ...smokeWisps, ...titleRays, ...sparkles, ...comets, ...birds, ...embers, crownBurst];
    root.add([art, veil, dennisPulse, angelGlow, ...smokeWisps, ...titleRays, ...comets, ...birds, ...embers, glint, crownBurst, ...sparkles, title, subtitle, main, settings, this.titleMessageText]);
    this.titleContainer = root;
    this.titleMainContainer = main;
    this.titleSettingsContainer = settings;
    this.startTitleTweens(title, subtitle, glint, dennisPulse, angelGlow, smokeWisps, titleRays, sparkles, comets, birds, embers, crownBurst);
  }

  private createTitleButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const buttonWidth = 210;
    const buttonHeight = 42;
    const hitPad = 34;
    const shadow = this.add
      .rectangle(4, 5, buttonWidth, buttonHeight, 0x02040a, 0.48)
      .setOrigin(0, 0);
    const bg = this.add
      .rectangle(0, 0, buttonWidth, buttonHeight, 0x101b25, 0.9)
      .setStrokeStyle(2, 0xcfa77a)
      .setOrigin(0, 0);
    const stripe = this.add
      .rectangle(8, buttonHeight - 8, buttonWidth - 16, 2, 0x8fb7ff, 0.42)
      .setOrigin(0, 0);
    const text = this.add
      .text(buttonWidth / 2, 10, label, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#fff4cf",
      })
      .setOrigin(0.5, 0);
    const zone = this.add
      .zone(-hitPad, -hitPad, buttonWidth + hitPad * 2, buttonHeight + hitPad * 2)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    const button = this.add.container(x, y, [shadow, bg, stripe, text, zone]).setSize(buttonWidth, buttonHeight);
    zone.on("pointerover", () => {
      this.juice.startTitleMusic();
      bg.setFillStyle(0x243653, 0.98);
      stripe.setFillStyle(0xfff3a8, 0.9);
      text.setColor("#ffffff");
      this.tweens.add({ targets: button, scaleX: 1.04, scaleY: 1.04, duration: 90, ease: "Sine.easeOut" });
    });
    zone.on("pointerout", () => {
      bg.setFillStyle(0x101b25, 0.9);
      stripe.setFillStyle(0x8fb7ff, 0.42);
      text.setColor("#fff4cf");
      this.tweens.add({ targets: button, scaleX: 1, scaleY: 1, duration: 90, ease: "Sine.easeOut" });
    });
    zone.on("pointerdown", onClick);
    return button;
  }

  private startTitleTweens(
    title: Phaser.GameObjects.Text,
    subtitle: Phaser.GameObjects.Text,
    glint: Phaser.GameObjects.Rectangle,
    dennisPulse: Phaser.GameObjects.Arc,
    angelGlow: Phaser.GameObjects.Arc,
    smokeWisps: Phaser.GameObjects.Arc[],
    titleRays: Phaser.GameObjects.Rectangle[],
    sparkles: Phaser.GameObjects.Rectangle[],
    comets: Phaser.GameObjects.Rectangle[],
    birds: Phaser.GameObjects.Text[],
    embers: Phaser.GameObjects.Arc[],
    crownBurst: Phaser.GameObjects.Star
  ): void {
    this.tweens.add({
      targets: title,
      y: title.y - 3,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: subtitle,
      alpha: 0.72,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: glint,
      alpha: 0.85,
      x: glint.x + 18,
      y: glint.y - 20,
      duration: 900,
      delay: 400,
      yoyo: true,
      repeat: -1,
      repeatDelay: 900,
      ease: "Cubic.easeInOut",
    });
    this.tweens.add({
      targets: dennisPulse,
      alpha: 0.26,
      scale: 1.45,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: angelGlow,
      alpha: 0.18,
      scale: 1.25,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    smokeWisps.forEach((wisp, index) => {
      this.tweens.add({
        targets: wisp,
        y: wisp.y - 22 - index * 4,
        x: wisp.x + (index % 2 === 0 ? -10 : 12),
        alpha: 0.02,
        scale: 1.8,
        duration: 1800 + index * 260,
        repeat: -1,
        yoyo: true,
        ease: "Sine.easeInOut",
      });
    });
    titleRays.forEach((ray, index) => {
      this.tweens.add({
        targets: ray,
        alpha: index === 2 ? 0.32 : 0.24,
        scaleX: 1.28,
        duration: 900 + index * 220,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    });
    sparkles.forEach((sparkle, index) => {
      this.tweens.add({
        targets: sparkle,
        alpha: 0.95,
        scale: 1.8,
        angle: 180,
        duration: 520 + index * 90,
        delay: index * 180,
        yoyo: true,
        repeat: -1,
        repeatDelay: 300,
        ease: "Cubic.easeInOut",
      });
    });
    comets.forEach((comet, index) => {
      this.tweens.add({
        targets: comet,
        x: comet.x + 120,
        y: comet.y - 34,
        alpha: 0.9,
        duration: 1200 + index * 360,
        delay: 600 + index * 900,
        yoyo: true,
        repeat: -1,
        repeatDelay: 1400,
        ease: "Cubic.easeInOut",
      });
    });
    birds.forEach((bird, index) => {
      this.tweens.add({
        targets: bird,
        x: bird.x + (index === 2 ? -140 : 170),
        y: bird.y - 18 + index * 5,
        alpha: 0.72,
        duration: 4200 + index * 600,
        delay: index * 500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    });
    embers.forEach((ember, index) => {
      this.tweens.add({
        targets: ember,
        y: ember.y - 14,
        alpha: 0.95,
        scale: 1.8,
        duration: 580 + index * 80,
        yoyo: true,
        repeat: -1,
        repeatDelay: 140,
        ease: "Sine.easeInOut",
      });
    });
    this.tweens.add({
      targets: crownBurst,
      alpha: 0.38,
      angle: 360,
      scale: 1.35,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private drawTitleArtwork(g: Phaser.GameObjects.Graphics, width: number, height: number): void {
    g.fillGradientStyle(0x18294a, 0x18294a, 0x6e7fa2, 0x283958, 1);
    g.fillRect(0, 0, width, height);

    g.fillStyle(0xf8fbff, 0.9);
    for (const star of [
      [58, 42], [92, 86], [180, 58], [244, 122], [474, 72], [612, 46], [708, 116], [664, 168],
    ] as const) {
      g.fillRect(star[0], star[1], 2, 2);
      g.fillRect(star[0] - 1, star[1] + 1, 4, 1);
    }
    g.fillStyle(0xc8d8ff, 0.22);
    g.fillRect(0, 150, width, 8);
    g.fillRect(0, 176, width, 5);

    g.fillStyle(0xd8e6ff, 0.82);
    g.fillTriangle(width - 152, 34, width - 122, 92, width - 186, 92);
    g.fillStyle(0xffffff, 0.28);
    g.fillCircle(width - 154, 76, 46);
    g.lineStyle(3, 0xfff4cf, 0.82);
    g.strokeCircle(width - 154, 76, 30);
    g.fillStyle(0xfff4cf, 0.78);
    g.fillTriangle(width - 154, 45, width - 168, 78, width - 140, 78);
    g.fillRect(width - 158, 78, 8, 42);
    g.lineStyle(2, 0xfff4cf, 0.6);
    g.beginPath();
    g.moveTo(width - 184, 102);
    g.lineTo(width - 198, 126);
    g.moveTo(width - 124, 102);
    g.lineTo(width - 110, 126);
    g.strokePath();

    g.fillStyle(0x4b5973, 1);
    g.fillTriangle(0, 256, 120, 118, 260, 256);
    g.fillTriangle(142, 268, 308, 96, 468, 268);
    g.fillTriangle(390, 264, 566, 124, 768, 264);
    g.fillStyle(0xcbd7e8, 0.95);
    g.fillTriangle(308, 96, 270, 138, 346, 138);
    g.fillTriangle(566, 124, 528, 156, 606, 156);
    g.fillTriangle(120, 118, 92, 152, 148, 152);
    g.lineStyle(2, 0x31415c, 0.8);
    for (const ridge of [[72, 214, 132, 158], [226, 230, 312, 142], [484, 226, 568, 154]] as const) {
      g.beginPath();
      g.moveTo(ridge[0], ridge[1]);
      g.lineTo(ridge[2], ridge[3]);
      g.strokePath();
    }

    g.fillStyle(0x5e7f58, 1);
    g.fillEllipse(width / 2, 326, 860, 190);
    g.fillStyle(0x426143, 1);
    g.fillEllipse(width / 2 + 20, 370, 880, 170);
    g.lineStyle(3, 0x2d5538, 0.55);
    for (const path of [
      [190, 362, 262, 336, 360, 326],
      [508, 370, 452, 346, 390, 326],
      [560, 384, 636, 372, 718, 346],
    ] as const) {
      g.beginPath();
      g.moveTo(path[0], path[1]);
      g.lineTo(path[2], path[3]);
      g.lineTo(path[4], path[5]);
      g.strokePath();
    }
    g.fillStyle(0x2d4d37, 1);
    g.fillRect(0, 390, width, 186);

    const village = (x: number, y: number, scale = 1) => {
      g.fillStyle(0x6e4528, 1);
      g.fillRect(x, y, 22 * scale, 16 * scale);
      g.fillRect(x + 32 * scale, y + 8 * scale, 18 * scale, 12 * scale);
      g.fillRect(x + 58 * scale, y + 2 * scale, 14 * scale, 17 * scale);
      g.fillStyle(0xb85b35, 1);
      g.fillTriangle(x - 3 * scale, y, x + 11 * scale, y - 12 * scale, x + 25 * scale, y);
      g.fillTriangle(x + 29 * scale, y + 8 * scale, x + 41 * scale, y - 2 * scale, x + 53 * scale, y + 8 * scale);
      g.fillTriangle(x + 55 * scale, y + 2 * scale, x + 65 * scale, y - 8 * scale, x + 75 * scale, y + 2 * scale);
      g.fillStyle(0xffe9a8, 1);
      g.fillRect(x + 7 * scale, y + 6 * scale, 5 * scale, 5 * scale);
      g.fillRect(x + 63 * scale, y + 8 * scale, 4 * scale, 5 * scale);
      g.lineStyle(1, 0xcab07a, 0.8);
      g.beginPath();
      g.moveTo(x + 10 * scale, y + 20 * scale);
      g.lineTo(x + 42 * scale, y + 26 * scale);
      g.lineTo(x + 68 * scale, y + 21 * scale);
      g.strokePath();
    };
    village(170, 326, 1.1);
    village(506, 340, 0.95);
    g.fillStyle(0xe8d69b, 0.95);
    for (const torch of [[156, 348], [252, 350], [496, 362], [580, 358]] as const) {
      g.fillRect(torch[0], torch[1], 3, 12);
      g.fillStyle(0xffa84d, 0.9);
      g.fillRect(torch[0] - 2, torch[1] - 5, 7, 5);
      g.fillStyle(0xe8d69b, 0.95);
    }

    g.fillStyle(0x4e1984, 0.52);
    g.fillCircle(width / 2 + 34, 314, 70);
    g.fillCircle(width / 2 + 12, 288, 46);
    g.fillCircle(width / 2 + 66, 292, 36);
    g.fillStyle(0x8a3dff, 0.24);
    g.fillCircle(width / 2 + 28, 312, 112);
    g.fillStyle(0x1e102b, 1);
    g.fillRect(width / 2 + 18, 284, 28, 50);
    g.fillStyle(0xe8ccff, 0.9);
    g.fillRect(width / 2 + 24, 294, 4, 4);
    g.fillRect(width / 2 + 36, 294, 4, 4);
    g.lineStyle(2, 0xa060ff, 0.42);
    for (const plume of [[378, 300, 350, 254], [408, 288, 414, 232], [432, 304, 470, 258]] as const) {
      g.beginPath();
      g.moveTo(plume[0], plume[1]);
      g.lineTo(plume[2], plume[3]);
      g.strokePath();
    }

    g.fillStyle(0x1c2630, 1);
    g.fillTriangle(0, 402, 224, 312, 424, 576);
    g.fillStyle(0x11191f, 1);
    g.fillTriangle(0, 444, 230, 332, 352, 576);
    g.fillStyle(0x33404a, 1);
    g.fillRect(0, 482, 300, 94);
    g.fillStyle(0x56636e, 1);
    g.fillRect(34, 482, 18, 8);
    g.fillRect(76, 468, 26, 8);
    g.fillRect(128, 484, 20, 8);
    g.fillRect(206, 454, 30, 8);
    g.fillStyle(0x22303a, 1);
    g.fillRect(12, 536, 72, 10);
    g.fillRect(98, 524, 116, 9);

    g.lineStyle(12, 0x203d24, 1);
    g.beginPath();
    g.moveTo(74, 430);
    g.lineTo(102, 414);
    g.lineTo(136, 420);
    g.lineTo(160, 404);
    g.strokePath();
    g.lineStyle(6, 0x6fbf73, 1);
    g.beginPath();
    g.moveTo(74, 430);
    g.lineTo(102, 414);
    g.lineTo(136, 420);
    g.lineTo(160, 404);
    g.strokePath();
    g.fillStyle(0x6fbf73, 1);
    g.fillRect(158, 392, 24, 18);
    g.fillStyle(0x356a3a, 1);
    g.fillRect(82, 424, 10, 6);
    g.fillRect(112, 414, 10, 6);
    g.fillRect(144, 414, 10, 6);
    g.fillStyle(0xf8ffef, 1);
    g.fillRect(173, 397, 4, 4);
    g.fillStyle(0xcfa77a, 1);
    g.fillRect(162, 384, 16, 8);
    g.fillStyle(0x7a4b2a, 1);
    g.fillRect(160, 392, 20, 4);
    g.lineStyle(4, 0xe6edf7, 1);
    g.beginPath();
    g.moveTo(170, 395);
    g.lineTo(206, 360);
    g.strokePath();
    g.fillStyle(0xe6edf7, 1);
    g.fillTriangle(206, 360, 210, 374, 194, 366);
    g.fillStyle(0x8fb7ff, 0.8);
    g.fillRect(200, 358, 5, 5);
    g.fillRect(192, 366, 4, 4);
  }

  private isModalPopupVisible(): boolean {
    return Boolean(this.questPopup?.isVisible() || this.choicePopupVisible);
  }

  get acceptedQuests(): string[] {
    return this.snakeGame.getAcceptedQuestIds();
  }

  getAllQuests(): Quest[] {
    return this.snakeGame.getAllQuests();
  }

  getAcceptedQuestList(): Quest[] {
    return this.snakeGame.getAcceptedQuests();
  }

  get offeredQuest(): Quest | null {
    return this.snakeGame.getOfferedQuest();
  }

  get inventory(): InventorySystem {
    return this.snakeGame.getInventory();
  }

  // Equips an item by id from the menu and applies effects
  equipItem(itemId: string): boolean {
    const item = getItem(itemId);
    if (!item) return false;
    if (this.snakeGame.getInventory().getItemCount(itemId) <= 0) return false;
    const success = this.snakeGame.getInventory().equip(item);
    if (success) {
      this.applyEquipmentEffects();
      this.juice.equipmentEquip();
    }
    return success;
  }

  // Unequip a slot and apply effects
  unequipSlot(slot: EquipmentSlot): boolean {
    const success = this.snakeGame.getInventory().unequip(slot);
    if (success) {
      this.applyEquipmentEffects();
      this.juice.equipmentUnequip();
    }
    return success;
  }

  private applyEquipmentEffects(): void {
    if (!this.snakeGame) return;
    const inv = this.snakeGame.getInventory();
    const equipped = inv.getAllEquipped();
    let tickScalar = 1;
    let wallSenseBonus = 0;
    let seismicBonus = 0;
    let masonry = false;
    let invulnBonus = 0;
    let regen: { interval: number; amount: number } | null = null;
    let phoenix = 0;
    let itemPhoenix = 0;
    let gunEnabled = false;
    let heatResistance = 0;
    let coldResistance = 0;
    let swimmingEnabled = false;

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
        itemPhoenix += mods.phoenixCharges;
      }
      if (mods.gunEnabled) {
        gunEnabled = true;
      }
      if (typeof mods.heatResistance === "number") {
        heatResistance += mods.heatResistance;
      }
      if (typeof mods.coldResistance === "number") {
        coldResistance += mods.coldResistance;
      }
      if (mods.swimmingEnabled) {
        swimmingEnabled = true;
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
    this.setFlag("equipment.itemPhoenixCharges", itemPhoenix > 0 ? itemPhoenix : undefined);
    this.setFlag("equipment.gunEnabled", gunEnabled ? true : undefined);
    this.setFlag("equipment.heatResistance", heatResistance > 0 ? Math.min(0.9, heatResistance) : undefined);
    this.setFlag("equipment.coldResistance", coldResistance > 0 ? Math.min(0.9, coldResistance) : undefined);
    this.setFlag("equipment.swimmingEnabled", swimmingEnabled ? true : undefined);

    // Refresh overlay to reflect any equipped status in inventory view
    this.skillTree.getOverlay().refresh();
  }

  update(): void {
    if (this.titleVisible) {
      this.graphics?.clear();
      this.questHud?.setVisible(false);
      this.bossHud?.hide();
      this.questHint?.setVisible(false);
      this.questHintPanel?.setVisible(false);
      this.heartsHud?.setVisible(false);
      this.livesHud?.setVisible(false);
      this.temperatureHud?.setVisible(false);
      this.villageHud?.setVisible(false);
      this.biomeHud?.setVisible(false);
      this.questGiverSprite?.setVisible(false);
      this.wandererSprite?.setVisible(false);
      this.villageResidentSprites.forEach((sprite) => sprite.setVisible(false));
      this.isDirty = false;
      return;
    }
    this.updateWandererSprite();
    this.updateVillageResidentSprites();
    this.tickVillageJuice();
    this.tickBiomeHazardJuice();
    if (this.isDirty) {
      this.draw();
      this.isDirty = false;
    }
  }
  private updateBossEncounter(): void {
    const bosses = this.snakeGame.getBosses(this.currentRoomId);
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
    const fallback = this.snakeGame.getSnakeBody()[0] ?? { x: this.grid.cols / 2, y: this.grid.rows / 2 };
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
    if (!this.snakeGame) {
      return;
    }

    const frenzy = this.snakeGame.getFlag<{ head?: Vector2Like | null }>("predation.frenzyTriggered");
    if (frenzy) {
      const world = this.tileToWorld(frenzy.head ?? null);
      this.juice.predationFrenzy(world.x, world.y);
      this.snakeGame.setFlag("predation.frenzyTriggered", undefined);
    }

    const rend = this.snakeGame.getFlag<{ head?: Vector2Like | null }>("predation.rendConsumed");
    if (rend) {
      const world = this.tileToWorld(rend.head ?? null);
      this.juice.predationRend(world.x, world.y);
      this.snakeGame.setFlag("predation.rendConsumed", undefined);
    }

    const apex = this.snakeGame.getFlag<{ head?: Vector2Like | null }>("predation.apexTriggered");
    if (apex) {
      const world = this.tileToWorld(apex.head ?? null);
      this.juice.predationApex(world.x, world.y);
      this.snakeGame.setFlag("predation.apexTriggered", undefined);
    }

    const loot = this.snakeGame.getFlag<{ head?: Vector2Like | null; itemName?: string }>("loot.itemPicked");
    if (loot) {
      const world = this.tileToWorld(loot.head ?? null);
      this.juice.itemPickup(world.x, world.y);
      const enriched = this.snakeGame.getFlag<{ itemId?: string }>("loot.itemPicked");
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
      this.snakeGame.setFlag("loot.itemPicked", undefined);
    }

    // Treasure pickup FX
    const treasureFx = this.snakeGame.getFlag<{ x: number; y: number; roomId: string }>("ui.treasurePickup");
    if (treasureFx) {
      const world = this.tileToWorldInRoom({ x: treasureFx.x, y: treasureFx.y }, treasureFx.roomId);
      (this.juice as any).treasurePickup?.(world.x, world.y);
      this.snakeGame.setFlag("ui.treasurePickup", undefined);
    }

    // Geometry feedback
    const seismic = this.snakeGame.getFlag<{ x: number; y: number; roomId: string; radius: number }>("ui.seismicPulse");
    if (seismic) {
      const world = this.tileToWorldInRoom({ x: seismic.x, y: seismic.y }, seismic.roomId);
      (this.juice as any).seismicPulse?.(world.x, world.y, seismic.radius);
      this.snakeGame.setFlag("ui.seismicPulse", undefined);
    }

    const collapse = this.snakeGame.getFlag<{ x: number; y: number; roomId: string }>("ui.collapseControl");
    if (collapse) {
      const world = this.tileToWorldInRoom({ x: collapse.x, y: collapse.y }, collapse.roomId);
      (this.juice as any).collapseControl?.(world.x, world.y);
      this.snakeGame.setFlag("ui.collapseControl", undefined);
    }

    const chomp = this.snakeGame.getFlag<{ x: number; y: number; roomId: string }>("ui.wallChomp");
    if (chomp) {
      const world = this.tileToWorldInRoom({ x: chomp.x, y: chomp.y }, chomp.roomId);
      (this.juice as any).wallChomp?.(world.x, world.y);
      this.snakeGame.setFlag("ui.wallChomp", undefined);
    }

    const fault = this.snakeGame.getFlag<{ roomId: string; y: number }>("ui.faultLine");
    if (fault) {
      const cell = this.grid.cell;
      const y = fault.y * cell + cell / 2;
      const x1 = cell / 2;
      const x2 = this.grid.cols * cell - cell / 2;
      (this.juice as any).faultLineSweep?.(x1, y, x2);
      this.snakeGame.setFlag("ui.faultLine", undefined);
    }

    // Turn skid dust
    const skid = this.snakeGame.getFlag<{ x: number; y: number; roomId: string; dx: number; dy: number }>("ui.turnSkid");
    if (skid) {
      const world = this.tileToWorldInRoom({ x: skid.x, y: skid.y }, skid.roomId);
      (this.juice as any).turnSkid?.(world.x, world.y, skid.dx, skid.dy);
      this.snakeGame.setFlag("ui.turnSkid", undefined);
    }

    // Wall graze sparks
    const graze = this.snakeGame.getFlag<{ x: number; y: number; roomId: string; nx: number; ny: number }>("ui.wallGraze");
    if (graze) {
      const world = this.tileToWorldInRoom({ x: graze.x, y: graze.y }, graze.roomId);
      (this.juice as any).wallGraze?.(world.x, world.y, graze.nx, graze.ny);
      this.snakeGame.setFlag("ui.wallGraze", undefined);
    }

    const enemyEaten = this.snakeGame.getFlag<{ x: number; y: number; roomId: string }>("ui.enemyEaten");
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
      this.snakeGame.setFlag("ui.enemyEaten", undefined);
    }

    const wandererReveal = this.snakeGame.getFlag<{ x: number; y: number; roomId: string; id: string }>("ui.wandererReveal");
    if (wandererReveal) {
      const world = this.tileToWorldInRoom({ x: wandererReveal.x, y: wandererReveal.y }, wandererReveal.roomId);
      (this.juice as any).wandererReveal?.(world.x, world.y);
      this.snakeGame.setFlag("ui.wandererReveal", undefined);
    }

    const playerShot = this.snakeGame.getFlag<{ x: number; y: number; roomId: string; dx: number; dy: number }>("ui.playerShot");
    if (playerShot) {
      const world = this.tileToWorldInRoom({ x: playerShot.x, y: playerShot.y }, playerShot.roomId);
      (this.juice as any).playerShot?.(world.x, world.y, playerShot.dx, playerShot.dy);
      this.snakeGame.setFlag("ui.playerShot", undefined);
    }

    const playerHit = this.snakeGame.getFlag<{
      x: number;
      y: number;
      roomId: string;
      health: number;
      maxHealth: number;
      source?: "enemy" | "npc-hostile" | "duelist" | "freak-joey" | "player";
    }>("ui.playerHit");
    if (playerHit) {
      const world = this.tileToWorldInRoom({ x: playerHit.x, y: playerHit.y }, playerHit.roomId);
      (this.juice as any).playerHit?.(world.x, world.y, playerHit.health, playerHit.maxHealth, playerHit.source);
      this.snakeGame.setFlag("ui.playerHit", undefined);
    }

    const villageReveal = this.snakeGame.getFlag<{ roomId: string; name: string; x: number; y: number }>("ui.villageReveal");
    if (villageReveal) {
      const world = this.tileToWorldInRoom({ x: villageReveal.x, y: villageReveal.y }, villageReveal.roomId);
      (this.juice as any).villageReveal?.(world.x, world.y);
      this.villageHud
        .setText(villageReveal.name.toUpperCase())
        .setAlpha(0)
        .setY(12)
        .setVisible(true);
      this.tweens.add({
        targets: this.villageHud,
        alpha: 1,
        y: 18,
        duration: 320,
        ease: "Cubic.easeOut",
      });
      this.tweens.add({
        targets: this.villageHud,
        alpha: 0,
        y: 26,
        delay: 1700,
        duration: 900,
        ease: "Cubic.easeIn",
        onComplete: () => this.villageHud.setVisible(false),
      });
      this.showQuestHintPopup(`${villageReveal.name} stirs around you.`, "#f6e7c1");
      this.snakeGame.setFlag("ui.villageReveal", undefined);
    }
    const biomeReveal = this.snakeGame.getFlag<{
      roomId: string;
      biomeId: string;
      title: string;
      temperature: string;
      dangerLevel: number;
    }>("ui.biomeReveal");
    if (biomeReveal) {
      const room = this.snakeGame.getCurrentRoom();
      const color = room.backgroundColor;
      const center = { x: (this.grid.cols * this.grid.cell) / 2, y: (this.grid.rows * this.grid.cell) / 2 };
      (this.juice as any).biomeReveal?.(center.x, center.y, color);
      this.biomeHud
        .setText(
          `${biomeReveal.title.toUpperCase()}\nTemp: ${biomeReveal.temperature}  Danger: ${biomeReveal.dangerLevel}/10`
        )
        .setAlpha(0)
        .setY(36)
        .setVisible(true);
      this.tweens.add({
        targets: this.biomeHud,
        alpha: 1,
        y: 42,
        duration: 340,
        ease: "Cubic.easeOut",
      });
      this.tweens.add({
        targets: this.biomeHud,
        alpha: 0,
        y: 50,
        delay: 1500,
        duration: 900,
        ease: "Cubic.easeIn",
        onComplete: () => this.biomeHud.setVisible(false),
      });
      this.showQuestHintPopup(
        `You cross into ${biomeReveal.title}. Temp ${biomeReveal.temperature}. Danger ${biomeReveal.dangerLevel}/10.`,
        "#dfe8ff"
      );
      this.snakeGame.setFlag("ui.biomeReveal", undefined);
    }
  }
  private draw(): void {
    // Suppress generic HUDs in house
    this.setFlag("ui.suppressHud", this.titleVisible || this.isInHouse());
    const room = this.snakeGame.getCurrentRoom();
    const baseSense = this.getFlag<number>("geometry.wallSenseRadius") ?? 0;
    const equipSense = this.getFlag<number>("equipment.wallSenseRadiusBonus") ?? 0;
    const wallSenseRadius = Math.max(0, baseSense + equipSense);
    const pActive = this.getFlag<{ kind: string; remaining: number }>("powerup.active");
    const snakeColor = pActive ? 0x9b5de5 : undefined;
    this.snakeRenderer.render(room, this.snakeGame.getSnakeBody(), room.id, this.currentApple, {
      wallSenseRadius,
      snakeColor,
      poweredUp: Boolean(pActive),
      direction: this.snakeGame.getDirection(),
      snakePalette: this.getActiveSnakeTheme().palette,
      activeHat: this.snakeCosmetics.activeHat,
      enemies: this.snakeGame.getEnemies(room.id),
      bullets: this.snakeGame.getEnemyBullets(room.id),
    });
    this.questHud.update(this.snakeGame.getActiveQuests(), this.grid.cols * this.grid.cell);
    this.questHud.setVisible(!this.isInHouse());
    const health = this.snakeGame.getPlayerHealth();
    const healthRevealed = Boolean(this.getFlag<boolean>("ui.healthRevealed")) || health.current < health.max;
    if (health.current < health.max) {
      this.setFlag("ui.healthRevealed", true);
    }
    this.heartsHud.setText(`Hearts: ${"♥".repeat(Math.max(0, health.current))}${"♡".repeat(Math.max(0, health.max - health.current))}`);
    this.heartsHud.setVisible(!this.isInHouse() && healthRevealed);
    const lifeCharges = this.getVisibleLifeCharges();
    if (lifeCharges > 0) {
      this.setFlag("ui.livesRevealed", true);
    }
    if (this.lastVisibleLifeCharges > 0 && lifeCharges < this.lastVisibleLifeCharges) {
      this.juice.extraLifeSpent();
    }
    this.lastVisibleLifeCharges = lifeCharges;
    this.livesHud.setText(`Lives: ${lifeCharges + 1}`);
    this.livesHud.setVisible(!this.isInHouse() && Boolean(this.getFlag<boolean>("ui.livesRevealed")));
    const temperature = this.snakeGame.getPlayerTemperature();
    if (!this.isInHouse() && temperature.active) {
      const filled = Math.max(0, Math.min(temperature.max, temperature.current));
      const empty = Math.max(0, temperature.max - filled);
      const label = temperature.hazard === "hot" ? "HEAT" : "COLD";
      const color = temperature.hazard === "hot" ? "#ffb36b" : "#9ad1ff";
      this.temperatureHud.setColor(color);
      this.temperatureHud.setText(`${label}: ${"■".repeat(filled)}${"□".repeat(empty)}`);
      this.temperatureHud.setVisible(true);
    } else {
      this.temperatureHud.setVisible(false);
    }

    // Render bosses
    const bosses = this.snakeGame.getBosses(room.id);
    const timeMs = this.time.now;
    for (const boss of bosses) {
      let bossColor: number;
      let bossAlpha: number;

      if (boss.kind === "angel") {
        bossColor = 0xfff2a8;
        bossAlpha = 0.92;
      } else if (boss.kind === "freaker-dennis" && boss.rainbowPalette) {
        const palette = defaultGameConfig.freakerDennis?.rainbowPalette;
        if (palette && palette.enabled) {
          const colors = palette.colors;
          const segmentIndex = palette.segmentIndex;
          const speed = palette.speed * 60;
          const colorIndex = Math.floor((timeMs / 1000 / speed) % colors.length);
          bossColor = parseInt(colors[colorIndex].replace('#', '0x'), 16);
          bossAlpha = 0.85;
        } else {
          bossColor = 0xff00ff;
          bossAlpha = 0.8;
        }
      } else {
        bossColor = 0xff00ff;
        bossAlpha = 0.8;
      }

      for (const segment of boss.body) {
        const [roomX, roomY] = room.id.split(",").map(Number);
        const localX = segment.x - roomX * this.grid.cols;
        const localY = segment.y - roomY * this.grid.rows;
        if (localX >= 0 && localX < this.grid.cols && localY >= 0 && localY < this.grid.rows) {
          const { x, y } = this.snakeRenderer.getWorldPosition(segment, room.id);
          this.graphics.fillStyle(bossColor, bossAlpha).fillRect(x, y, this.grid.cell, this.grid.cell);
        }
      }
    }

    this.featureManager.call("onRender", this, this.graphics);

    // Update simple house HUD
    if (this.isInHouse()) {
      const purchases = (this.snakeGame.getFlag<Record<string, unknown>>("house.purchases") ?? {}) as Record<string, unknown>;
      const expandLevel = Number(this.snakeGame.getFlag<number>("house.expandLevel") ?? 0);
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

  resetStartingChoices(): void {
    this.chosenReligionId = null;
    this.chosenBackgroundId = null;
    this.chosenClassId = null;
    this.religionMods = {};
    this.backgroundMods = {};
    this.classMods = {};
  }

  getSnakeCustomizationState(): SnakeCosmeticState {
    return {
      unlockedThemes: [...this.snakeCosmetics.unlockedThemes],
      activeTheme: this.snakeCosmetics.activeTheme,
      unlockedHats: [...this.snakeCosmetics.unlockedHats],
      activeHat: this.snakeCosmetics.activeHat,
      cowboyHatUnlocked: this.snakeCosmetics.cowboyHatUnlocked,
      cowboyHatEquipped: this.snakeCosmetics.cowboyHatEquipped,
      loudWalkingNoiseUnlocked: this.snakeCosmetics.loudWalkingNoiseUnlocked,
      loudWalkingNoiseEnabled: this.snakeCosmetics.loudWalkingNoiseEnabled,
      languageSelected: this.snakeCosmetics.languageSelected,
      languageSet: this.snakeCosmetics.languageSet,
    };
  }

  setSnakeCosmeticState(state: SnakeCosmeticState): void {
    this.snakeCosmetics = {
      unlockedThemes: state.unlockedThemes,
      activeTheme: state.activeTheme,
      unlockedHats: state.unlockedHats,
      activeHat: state.activeHat,
      cowboyHatUnlocked: state.cowboyHatUnlocked,
      cowboyHatEquipped: state.cowboyHatEquipped,
      loudWalkingNoiseUnlocked: state.loudWalkingNoiseUnlocked,
      loudWalkingNoiseEnabled: state.loudWalkingNoiseEnabled,
      languageSelected: state.languageSelected,
      languageSet: state.languageSet,
    };
  }

  getSnakeThemeDefinitions(): readonly SnakeThemeDefinition[] {
    const merged = new Map<SnakeThemeId, SnakeThemeDefinition>();
    for (const theme of SNAKE_THEME_DEFINITIONS) {
      merged.set(theme.id, theme);
    }
    const unlocked = new Set(this.snakeCosmetics.unlockedThemes);
    const villageStyles = getVillageShopDefinition(this.snakeGame.getCurrentRoom().biomeId).styles;
    for (const style of villageStyles.filter((entry) => unlocked.has(entry.id))) {
      merged.set(style.id, {
        id: style.id,
        label: style.label,
        cost: style.price,
        palette: style.palette,
      });
    }
    return Array.from(merged.values());
  }

  getSnakeHatDefinitions(): readonly { id: VillageShopHatId; label: string; price: number }[] {
    const shopHats = getVillageShopDefinition(this.snakeGame.getCurrentRoom().biomeId).hats;
    const unlocked = new Set(this.snakeCosmetics.unlockedHats);
    const hats = shopHats.filter((hat) => hat.id === LEGACY_COWBOY_HAT_ID || unlocked.has(hat.id));
    return hats.length > 0 ? hats : [{ id: LEGACY_COWBOY_HAT_ID, label: "Cowboy Hat", price: COWBOY_HAT_COST }];
  }

  getCurrentVillageShop(): VillageShopDefinition | null {
    const room = this.snakeGame.getCurrentRoom();
    if (!room.village) {
      return null;
    }
    const stock = this.getCurrentVillageMarketStock();
    return {
      equipment: VILLAGE_SHOP_EQUIPMENT.filter((offer) => stock.equipmentIds.includes(offer.id)) as VillageShopEquipmentOffer[],
      styles: VILLAGE_SHOP_STYLES.filter((offer) => stock.styleIds.includes(offer.id)) as VillageShopStyleOffer[],
      hats: VILLAGE_SHOP_HATS.filter((offer) => stock.hatIds.includes(offer.id)) as VillageShopHatOffer[],
    };
  }

  private getCurrentVillageMarketStock(): VillageMarketStock {
    const room = this.snakeGame.getCurrentRoom();
    const key = `market.stock.${room.id}`;
    const saved = this.getFlag<VillageMarketStock>(key);
    if (saved?.version === 2 && Array.isArray(saved.equipmentIds) && Array.isArray(saved.styleIds) && Array.isArray(saved.hatIds) && Array.isArray(saved.cardIds)) {
      return saved;
    }
    const stock: VillageMarketStock = {
      version: 2,
      equipmentIds: this.pickMarketOffers(VILLAGE_SHOP_EQUIPMENT.map((offer) => offer.id), 2),
      styleIds: this.pickMarketOffers(VILLAGE_SHOP_STYLES.map((offer) => offer.id), 2) as VillageShopStyleId[],
      hatIds: this.pickMarketOffers(VILLAGE_SHOP_HATS.map((offer) => offer.id), 2) as VillageShopHatId[],
      cardIds: this.pickMarketCardOffers(),
    };
    this.setFlag(key, stock);
    return stock;
  }

  private setCurrentVillageMarketStock(stock: VillageMarketStock): void {
    const room = this.snakeGame.getCurrentRoom();
    this.setFlag(`market.stock.${room.id}`, stock);
  }

  private getCurrentMarketCardOffers(): CardId[] {
    return this.getCurrentVillageMarketStock().cardIds;
  }

  private pickMarketOffers<T extends string>(ids: readonly T[], count: number): T[] {
    const pool = [...ids];
    const picked: T[] = [];
    while (picked.length < count && pool.length > 0) {
      const index = Math.floor(this.random() * pool.length);
      const [id] = pool.splice(index, 1);
      if (id) {
        picked.push(id);
      }
    }
    return picked;
  }

  private pickMarketCardOffers(): CardId[] {
    const count = this.random() < 0.42 ? 1 : 2;
    const pool = [...CARD_DEFINITIONS];
    const picked: CardId[] = [];
    while (picked.length < count && pool.length > 0) {
      const totalWeight = pool.reduce((sum, card) => sum + this.cardShopWeight(card.rarity), 0);
      let roll = this.random() * totalWeight;
      let index = 0;
      for (; index < pool.length; index += 1) {
        roll -= this.cardShopWeight(pool[index]!.rarity);
        if (roll <= 0) {
          break;
        }
      }
      const [card] = pool.splice(Math.max(0, Math.min(pool.length - 1, index)), 1);
      if (card) {
        picked.push(card.id);
      }
    }
    return picked;
  }

  private cardShopWeight(rarity: "common" | "uncommon" | "rare"): number {
    if (rarity === "common") {
      return 10;
    }
    if (rarity === "uncommon") {
      return 4;
    }
    return 1;
  }

  purchaseOrApplySnakeTheme(themeId: SnakeThemeId): { ok: boolean; message: string; color: string } {
    const theme = this.getSnakeThemeDefinitions().find((entry) => entry.id === themeId);
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

  purchaseVillageEquipment(itemId: string): { ok: boolean; message: string; color: string } {
    const shop = this.getCurrentVillageShop();
    if (!shop) {
      return { ok: false, message: "Village shops only open in villages.", color: "#ff6b6b" };
    }
    const offer = shop.equipment.find((entry) => entry.itemId === itemId);
    if (!offer) {
      return { ok: false, message: "That gear is not stocked here.", color: "#ff6b6b" };
    }
    const item = getItem(itemId) as any;
    if (!item || item.kind !== "equipment") {
      return { ok: false, message: "That gear does not exist.", color: "#ff6b6b" };
    }
    if (this.snakeGame.getInventory().getItemCount(itemId) > 0) {
      return { ok: false, message: `${item.name} is already in your pack.`, color: "#9ad1ff" };
    }
    if (this.score < offer.price) {
      return { ok: false, message: `${item.name} costs ${offer.price} score.`, color: "#ff6b6b" };
    }
    this.addScoreDirect(-offer.price);
    this.snakeGame.addItem(itemId, 1);
    this.equipItem(itemId);
    this.isDirty = true;
    return { ok: true, message: `${item.name} bought and equipped.`, color: "#5dd6a2" };
  }

  purchaseVillageStyle(styleId: VillageShopStyleId): { ok: boolean; message: string; color: string } {
    const shop = this.getCurrentVillageShop();
    if (!shop) {
      return { ok: false, message: "Village styles are sold by village shopkeepers.", color: "#ff6b6b" };
    }
    const offer = shop.styles.find((entry) => entry.id === styleId);
    if (!offer) {
      return { ok: false, message: "That style is not stocked here.", color: "#ff6b6b" };
    }
    const unlocked = this.snakeCosmetics.unlockedThemes.includes(styleId);
    if (!unlocked) {
      if (this.score < offer.price) {
        return { ok: false, message: `${offer.label} costs ${offer.price} score.`, color: "#ff6b6b" };
      }
      this.addScoreDirect(-offer.price);
      this.snakeCosmetics.unlockedThemes = [...this.snakeCosmetics.unlockedThemes, styleId];
    }
    this.snakeCosmetics.activeTheme = styleId;
    this.isDirty = true;
    return { ok: true, message: unlocked ? `${offer.label} equipped.` : `${offer.label} bought and equipped.`, color: "#5dd6a2" };
  }

  purchaseOrToggleVillageHat(hatId: VillageShopHatId): { ok: boolean; message: string; color: string } {
    const shop = this.getCurrentVillageShop();
    const offer = shop?.hats.find((entry) => entry.id === hatId);
    if (!offer && hatId !== LEGACY_COWBOY_HAT_ID) {
      return { ok: false, message: "That hat is not sold here.", color: "#ff6b6b" };
    }
    const label = offer?.label ?? "Cowboy Hat";
    const price = offer?.price ?? COWBOY_HAT_COST;
    const unlocked = this.snakeCosmetics.unlockedHats.includes(hatId);
    if (!unlocked) {
      if (!shop && hatId !== LEGACY_COWBOY_HAT_ID) {
        return { ok: false, message: "Village hats are sold in villages.", color: "#ff6b6b" };
      }
      if (this.score < price) {
        return { ok: false, message: `${label} costs ${price} score.`, color: "#ff6b6b" };
      }
      this.addScoreDirect(-price);
      this.snakeCosmetics.unlockedHats = [...this.snakeCosmetics.unlockedHats, hatId];
    }

    this.snakeCosmetics.activeHat = this.snakeCosmetics.activeHat === hatId ? null : hatId;
    this.snakeCosmetics.cowboyHatUnlocked = this.snakeCosmetics.unlockedHats.includes(LEGACY_COWBOY_HAT_ID);
    this.snakeCosmetics.cowboyHatEquipped = this.snakeCosmetics.activeHat === LEGACY_COWBOY_HAT_ID;
    this.isDirty = true;
    return {
      ok: true,
      message: this.snakeCosmetics.activeHat === hatId ? `${label} equipped.` : `${label} stowed.`,
      color: unlocked ? "#9ad1ff" : "#5dd6a2",
    };
  }

  purchaseOrToggleCowboyHat(): { ok: boolean; message: string; color: string } {
    return this.purchaseOrToggleVillageHat(LEGACY_COWBOY_HAT_ID);
  }

  private getCardCollection(): CardCollection {
    const saved = this.getFlag<Record<string, unknown>>("cards.collection") ?? {};
    const collection: CardCollection = {};
    for (const cardId of CARD_SHOP_OFFERS) {
      const count = Number(saved[cardId] ?? 0);
      if (Number.isFinite(count) && count > 0) {
        collection[cardId] = Math.floor(count);
      }
    }
    return collection;
  }

  private setCardCollection(collection: CardCollection): void {
    this.setFlag("cards.collection", collection);
    this.isDirty = true;
  }

  purchaseVillageCard(cardId: CardId): { ok: boolean; message: string; color: string } {
    const card = getCardDefinition(cardId);
    const stock = this.getCurrentVillageMarketStock();
    if (!stock.cardIds.includes(cardId)) {
      return { ok: false, message: `${card.name} is sold out here.`, color: "#ff6b6b" };
    }
    if (this.score < card.price) {
      return { ok: false, message: `${card.name} costs ${card.price} score.`, color: "#ff6b6b" };
    }
    const collection = this.getCardCollection();
    this.addScoreDirect(-card.price);
    collection[cardId] = Number(collection[cardId] ?? 0) + 1;
    this.setCardCollection(collection);
    this.setCurrentVillageMarketStock({
      ...stock,
      cardIds: stock.cardIds.filter((id) => id !== cardId),
    });
    return { ok: true, message: `${card.name} added to your deck.`, color: "#5dd6a2" };
  }

  private applyPendingQuestCosmeticRewards(): void {
    const rewards = this.snakeGame.getFlag<Array<{ type: "style" | "hat"; id: SnakeThemeId | VillageShopHatId }>>("quest.pendingCosmeticRewards");
    if (!Array.isArray(rewards) || rewards.length === 0) {
      return;
    }
    const themes = this.getSnakeThemeDefinitions();
    const shop = this.getCurrentVillageShop() ?? getVillageShopDefinition(this.snakeGame.getCurrentRoom().biomeId);
    const hatOffers = shop.hats;
    for (const reward of rewards) {
      if (reward.type === "style") {
        const styleId = reward.id as SnakeThemeId;
        if (themes.some((theme) => theme.id === styleId) && !this.snakeCosmetics.unlockedThemes.includes(styleId)) {
          this.snakeCosmetics.unlockedThemes = [...this.snakeCosmetics.unlockedThemes, styleId];
          this.snakeCosmetics.activeTheme = styleId;
        }
      } else {
        const hatId = reward.id as VillageShopHatId;
        if (hatOffers.some((hat) => hat.id === hatId) && !this.snakeCosmetics.unlockedHats.includes(hatId)) {
          this.snakeCosmetics.unlockedHats = [...this.snakeCosmetics.unlockedHats, hatId];
          this.snakeCosmetics.activeHat = hatId;
        }
      }
    }
    this.snakeCosmetics.cowboyHatUnlocked = this.snakeCosmetics.unlockedHats.includes(LEGACY_COWBOY_HAT_ID);
    this.snakeCosmetics.cowboyHatEquipped = this.snakeCosmetics.activeHat === LEGACY_COWBOY_HAT_ID;
    this.snakeGame.setFlag("quest.pendingCosmeticRewards", undefined);
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
      this.getSnakeThemeDefinitions().find((entry) => entry.id === this.snakeCosmetics.activeTheme) ??
      SNAKE_THEME_DEFINITIONS[0]
    );
  }


  private isInHouse(): boolean {
    return this.currentRoomId === "0,-1,0";
  }

  private getVisibleLifeCharges(): number {
    const skillLives = Math.max(0, Number(this.skillTree?.getStats().extraLives ?? 0));
    const phoenixLives = Math.max(0, Number(this.getFlag<number>("equipment.phoenixCharges") ?? 0));
    return skillLives + phoenixLives;
  }

  private tryBuyHouse(kind: "couch" | "kitchen" | "expand"): void {
    const ok = this.snakeGame.purchaseHouseItem(kind);
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
    const insideInterior = this.isInHouseInterior();
    if (insideInterior && !this.houseMusicActive) {
      (this.juice as any).startHouseAmbience?.();
      this.houseMusicActive = true;
    } else if (!insideInterior && this.houseMusicActive) {
      (this.juice as any).stopHouseAmbience?.();
      this.houseMusicActive = false;
    }
    // Apply slowdown only when snake is actually inside an interior.
    this.skillTree.applyTickDelayScalar(insideInterior ? 1.6 : 1.0, "house");
  }

  private isInHouseInterior(): boolean {
    const head = this.snakeGame.getSnakeBody()[0];
    if (!head) return false;
    const room = this.snakeGame.getCurrentRoom();
    const [rx, ry] = room.id.split(",").map(Number);
    const lx = head.x - rx * this.grid.cols;
    const ly = head.y - ry * this.grid.rows;
    if (lx < 0 || ly < 0 || lx >= this.grid.cols || ly >= this.grid.rows) return false;
    const tile = room.layout[ly]?.[lx];
    if (!tile) return false;
    // Interior tiles (wood, rug, trim, and furniture) across any generated house.
    return "WETCKBPL".includes(tile);
  }

  private isManualHouseMovementActive(): boolean {
    return !this.paused && !this.offeredQuest && (this.isInHouseInterior() || Boolean(this.getFlag<boolean>("traversal.manualResumePending")));
  }

  private consumeManualResumePause(): void {
    if (this.getFlag<boolean>("traversal.manualResumePending")) {
      this.setFlag("traversal.manualResumePending", undefined);
    }
  }

  private getQuestGiverHint(): { text: string } | null {
    if (this.isInHouse() || this.paused || this.offeredQuest) {
      return null;
    }
    const room = this.snakeGame.getCurrentRoom();
    const shopkeeper = room.village?.shopkeeper;
    if (shopkeeper && this.distanceFromHeadToLocal(shopkeeper) <= 1) {
      return { text: `Shop with ${shopkeeper.name ?? "shopkeeper"} (press E)` };
    }
    const giver = room.questGiver;
    if (!giver) {
      return null;
    }
    const dist = this.distanceFromHeadToLocal(giver);
    if (dist > 1) {
      return null;
    }
    const disposition = this.snakeGame.getNpcDisposition(room.id);
    if (disposition.hostility === "hostile") {
      return { text: `${giver.name ?? "NPC"} is hostile` };
    }
    const name = giver.name ? `Talk to ${giver.name}` : "Talk to quest giver";
    return { text: `${name} (press E)` };
  }

  private distanceFromHeadToLocal(target: { x: number; y: number }): number {
    const head = this.snakeGame.getSnakeBody()[0];
    if (!head) {
      return Number.POSITIVE_INFINITY;
    }
    const room = this.snakeGame.getCurrentRoom();
    const [roomX, roomY] = room.id.split(",").map(Number);
    const localX = head.x - roomX * this.grid.cols;
    const localY = head.y - roomY * this.grid.rows;
    return Math.abs(localX - target.x) + Math.abs(localY - target.y);
  }

  private tryInteractVillageShopkeeper(): boolean {
    if (this.paused || this.offeredQuest || this.choicePopupVisible) {
      return false;
    }
    const room = this.snakeGame.getCurrentRoom();
    const shopkeeper = room.village?.shopkeeper;
    if (!shopkeeper || this.distanceFromHeadToLocal(shopkeeper) > 1) {
      return false;
    }
    this.showVillageShopRoot(shopkeeper.name ?? "Village Shopkeeper");
    return true;
  }

  private showVillageShopRoot(shopkeeperName: string): void {
    this.paused = true;
    this.hideSaveUI();
    this.skillTree.hideOverlay();
    const options: ChoiceOption[] = [
      { id: "equipment", title: "Equipment", description: "Weapons, flippers, and weather gear." },
      { id: "styles", title: "Styles", description: "Local palettes for your snake." },
      { id: "hats", title: "Hats", description: "Village headwear with no tactical justification." },
      { id: "cards", title: "Cards", description: "Buy tiny competition cards for your personal deck." },
      { id: "play-cards", title: "Play Cards", description: "Sit at the stall table and chase the score window." },
      { id: "leave", title: "Leave", description: "Step away from the counter." },
    ];
    this.villageShopPopup.show(shopkeeperName, options, (id) => {
      if (id === "leave") {
        this.closeVillageShop();
        return;
      }
      if (id === "play-cards") {
        this.showCardTableRoot(shopkeeperName);
        return;
      }
      if (id === "equipment" || id === "styles" || id === "hats" || id === "cards") {
        this.showVillageShopCategory(shopkeeperName, id);
      }
    });
  }

  private showVillageShopCategory(shopkeeperName: string, category: "equipment" | "styles" | "hats" | "cards", page = 0): void {
    this.paused = true;
    const shop = this.getCurrentVillageShop();
    if (!shop) {
      this.closeVillageShop();
      return;
    }
    const options: ChoiceOption[] = [];
    if (category === "equipment") {
      for (const offer of shop.equipment) {
        const item = getItem(offer.itemId) as any;
        const owned = this.snakeGame.getInventory().getItemCount(offer.itemId) > 0;
        options.push({
          id: `equipment:${offer.itemId}`,
          title: `${item?.name ?? offer.itemId} - ${owned ? "owned" : `${offer.price} score`}`,
          description: offer.note,
        });
      }
    } else if (category === "styles") {
      for (const style of shop.styles) {
        const owned = this.snakeCosmetics.unlockedThemes.includes(style.id);
        options.push({
          id: `style:${style.id}`,
          title: `${style.label} - ${owned ? "owned" : `${style.price} score`}`,
          description: owned ? "Equip this village style." : "Buy and equip this village style.",
        });
      }
    } else if (category === "hats") {
      for (const hat of shop.hats) {
        const owned = this.snakeCosmetics.unlockedHats.includes(hat.id);
        const equipped = this.snakeCosmetics.activeHat === hat.id;
        options.push({
          id: `hat:${hat.id}`,
          title: `${hat.label} - ${owned ? (equipped ? "equipped" : "owned") : `${hat.price} score`}`,
          description: owned ? "Toggle this hat." : "Buy and equip this hat.",
        });
      }
    } else {
      const collection = this.getCardCollection();
      const cardOffers = this.getCurrentMarketCardOffers();
      const pageSize = 5;
      const pageCount = Math.max(1, Math.ceil(cardOffers.length / pageSize));
      const safePage = Math.max(0, Math.min(page, pageCount - 1));
      const pageOffers = cardOffers.slice(safePage * pageSize, safePage * pageSize + pageSize);
      for (const cardId of pageOffers) {
        const card = getCardDefinition(cardId);
        const owned = Number(collection[card.id] ?? 0);
        options.push({
          id: `card:${card.id}`,
          title: `${card.name} - ${card.price} score${owned > 0 ? `, owned x${owned}` : ""}`,
          description: `${card.suit} / ${card.chips} chips / ${card.rarity}. ${card.description}`,
        });
      }
      if (safePage > 0) {
        options.push({ id: `cards-page:${safePage - 1}`, title: "Previous Cards", description: "Browse the previous shelf." });
      }
      if (safePage < pageCount - 1) {
        options.push({ id: `cards-page:${safePage + 1}`, title: "More Cards", description: "Browse the next shelf." });
      }
    }
    options.push({ id: "back", title: "Back", description: "Return to the shop counter." });
    this.villageShopPopup.show(shopkeeperName, options, (id) => {
      if (id === "back") {
        this.showVillageShopRoot(shopkeeperName);
        return;
      }
      if (id.startsWith("cards-page:")) {
        const [, nextPage] = id.split(":");
        this.showVillageShopCategory(shopkeeperName, category, Number(nextPage));
        return;
      }
      const [kind, value] = id.split(":");
      const result =
        kind === "equipment" ? this.purchaseVillageEquipment(value) :
        kind === "style" ? this.purchaseVillageStyle(value as VillageShopStyleId) :
        kind === "hat" ? this.purchaseOrToggleVillageHat(value as VillageShopHatId) :
        kind === "card" ? this.purchaseVillageCard(value as CardId) :
        null;
      if (result) {
        this.showQuestHintPopup(result.message, result.color);
        this.showVillageShopCategory(shopkeeperName, category, page);
      }
    });
  }

  private showCardTableRoot(shopkeeperName: string): void {
    this.paused = true;
    const collection = this.getCardCollection();
    const ownedCount = countCards(collection);
    const inVillage = Boolean(this.snakeGame.getCurrentRoom().village);
    const options: ChoiceOption[] = CARD_TABLES.map((table) => ({
      id: `table:${table.id}`,
      title: table.name,
      description: `Best of 3. Land between ${table.minScore} and ${table.maxScore}. Choose your wager next. Deck: ${ownedCount} cards.`,
    }));
    options.push({
      id: "back",
      title: inVillage ? "Back" : "Leave",
      description: inVillage ? "Return to the shop counter." : "Step away from the card table.",
    });
    this.villageShopPopup.show(`${shopkeeperName}'s Card Table`, options, (id) => {
      if (id === "back") {
        if (inVillage) {
          this.showVillageShopRoot(shopkeeperName);
        } else {
          this.closeVillageShop();
        }
        return;
      }
      const [, tableId] = id.split(":");
      this.showCardBetMenu(shopkeeperName, tableId);
    });
  }

  private showCardBetMenu(shopkeeperName: string, tableId: string): void {
    const table = getCardTable(tableId);
    const wagers = this.getCardBetOptions();
    if (wagers.length === 0) {
      this.showQuestHintPopup("You need score to place a card wager.", "#ff6b6b");
      this.showCardTableRoot(shopkeeperName);
      return;
    }
    const options: ChoiceOption[] = wagers.map((wager) => ({
      id: `bet:${wager.amount}`,
      title: wager.label,
      description: `Risk ${wager.amount} score. Win the match to receive ${wager.amount * 2} score back.`,
    }));
    options.push({ id: "back", title: "Back", description: "Choose a different card table." });
    this.villageShopPopup.show(`${table.name} Wager`, options, (id) => {
      if (id === "back") {
        this.showCardTableRoot(shopkeeperName);
        return;
      }
      const [, amount] = id.split(":");
      this.startCardCompetition(shopkeeperName, tableId, Number(amount));
    });
  }

  private getCardBetOptions(): Array<{ label: string; amount: number }> {
    const score = Math.max(0, Math.floor(this.score));
    const candidates: Array<{ label: string; amount: number }> = [];
    if (score >= 5) {
      candidates.push({ label: "Bet 5", amount: 5 });
    }
    if (score >= 25) {
      candidates.push({ label: "Bet 25", amount: 25 });
    }
    if (score > 0) {
      candidates.push({ label: "Bet 10%", amount: Math.max(1, Math.floor(score * 0.1)) });
      candidates.push({ label: "Bet 50%", amount: Math.max(1, Math.floor(score * 0.5)) });
      candidates.push({ label: "Bet All Score", amount: score });
    }
    const seen = new Set<number>();
    return candidates.filter((candidate) => {
      if (candidate.amount <= 0 || candidate.amount > score || seen.has(candidate.amount)) {
        return false;
      }
      seen.add(candidate.amount);
      return true;
    });
  }

  private startCardCompetition(shopkeeperName: string, tableId: string, wagerScore: number): void {
    if (wagerScore <= 0 || this.score < wagerScore) {
      this.showQuestHintPopup("That wager is not available.", "#ff6b6b");
      this.showCardBetMenu(shopkeeperName, tableId);
      return;
    }
    this.addScoreDirect(-wagerScore);
    this.juice.startCardMusic();
    const state = createCompetitionState(tableId, this.getCardCollection(), () => this.random(), wagerScore);
    this.showNextCardRound(shopkeeperName, state);
  }

  private showNextCardRound(shopkeeperName: string, state: CardCompetitionState): void {
    const hand = drawCompetitionHand(state, () => this.random());
    this.showCardHand(shopkeeperName, state, hand, new Set<number>());
  }

  private showCardHand(shopkeeperName: string, state: CardCompetitionState, hand: CardId[], selected: Set<number>): void {
    const table = getCardTable(state.tableId);
    this.hideCardGamePopup();
    this.villageShopPopup.hide();
    this.setChoicePopupVisible(true);

    const width = Math.min(this.scale.width - 44, 720);
    const height = Math.min(this.scale.height - 44, 430);
    const x = (this.scale.width - width) / 2;
    const y = (this.scale.height - height) / 2;
    const root = this.add.container(x, y).setDepth(60).setScrollFactor(0);
    const background = this.add
      .rectangle(0, 0, width, height, 0x071019, 0.96)
      .setStrokeStyle(2, 0xcfa77a)
      .setOrigin(0, 0);
    const title = this.add.text(width / 2, 18, `${table.name} R${state.round} (${state.wins}-${state.losses})`, {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#fff3a8",
    }).setOrigin(0.5, 0);
    const target = this.add.text(width / 2, 50, `Target window: ${table.minScore}-${table.maxScore}`, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#9ad1ff",
    }).setOrigin(0.5, 0);
    const tooltipPanel = this.add
      .rectangle(width / 2, height - 112, width - 46, 64, 0x0e1c28, 0.92)
      .setStrokeStyle(1, 0x4da3ff)
      .setOrigin(0.5, 0);
    this.cardTooltipText = this.add.text(38, height - 102, "Hover a card to read it.", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#ffffff",
      wordWrap: { width: width - 76 },
    });
    root.add([background, title, target, tooltipPanel, this.cardTooltipText]);

    if (hand.length === 0) {
      const empty = this.add.text(width / 2, 146, "No cards in the deck.", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffb3a8",
      }).setOrigin(0.5, 0);
      root.add(empty);
    } else {
      const cardWidth = 102;
      const gap = Math.min(18, Math.max(8, (width - 70 - cardWidth * hand.length) / Math.max(1, hand.length - 1)));
      const totalWidth = cardWidth * hand.length + gap * Math.max(0, hand.length - 1);
      let cardX = (width - totalWidth) / 2;
      hand.forEach((cardId, index) => {
        const card = this.createCardSprite(cardId, selected.has(index), () => {
          const next = new Set(selected);
          if (next.has(index)) {
            next.delete(index);
          } else {
            next.add(index);
          }
          this.showCardHand(shopkeeperName, state, hand, next);
        });
        card.setPosition(cardX, selected.has(index) ? 88 : 98);
        root.add(card);
        cardX += cardWidth + gap;
      });
    }

    const scoreButton = this.createCardTableButton(38, height - 38, "Score", () => {
      this.hideCardGamePopup(false);
      this.resolveCardRound(shopkeeperName, state, hand, [...selected]);
    });
    const allButton = this.createCardTableButton(158, height - 38, "Play All", () => {
      this.hideCardGamePopup(false);
      this.resolveCardRound(shopkeeperName, state, hand, hand.map((_, index) => index));
    });
    const forfeitButton = this.createCardTableButton(width - 138, height - 38, "Forfeit", () => {
      this.hideCardGamePopup();
      this.showQuestHintPopup("You fold away from the card table.", "#9ad1ff");
      this.closeVillageShop();
    });
    root.add([scoreButton, allButton, forfeitButton]);
    this.cardGameContainer = root;
  }

  private createCardSprite(cardId: CardId, selected: boolean, onClick: () => void): Phaser.GameObjects.Container {
    const card = getCardDefinition(cardId);
    const suitColor = this.getCardSuitColor(card.suit);
    const container = this.add.container(0, 0).setSize(102, 150);
    const shadow = this.add.rectangle(5, 8, 102, 150, 0x02040a, 0.45).setOrigin(0, 0);
    const body = this.add
      .rectangle(0, 0, 102, 150, selected ? 0xfff3a8 : 0xf4ead2, 1)
      .setStrokeStyle(3, selected ? 0x5dd6a2 : suitColor)
      .setOrigin(0, 0);
    const header = this.add.rectangle(8, 8, 86, 26, suitColor, 0.96).setOrigin(0, 0);
    const name = this.add.text(51, 13, card.name, {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: 78 },
    }).setOrigin(0.5, 0);
    const chips = this.add.text(51, 48, String(card.chips), {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "36px",
      color: "#17202a",
      stroke: "#ffffff",
      strokeThickness: 2,
    }).setOrigin(0.5, 0);
    const suit = this.add.text(51, 91, card.suit.toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#17202a",
    }).setOrigin(0.5, 0);
    const rarity = this.add.text(51, 122, card.rarity, {
      fontFamily: "monospace",
      fontSize: "10px",
      color: selected ? "#12543a" : "#42505c",
    }).setOrigin(0.5, 0);
    const check = this.add.text(88, 128, selected ? "x" : "", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#12543a",
    }).setOrigin(0.5, 0);
    const hit = this.add.zone(0, 0, 102, 150).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hit.on("pointerover", () => {
      body.setFillStyle(0xffffff, 1);
      this.cardTooltipText?.setText(`${card.name} | ${card.suit} | ${card.chips} chips | ${card.rarity}\n${card.description}`);
    });
    hit.on("pointerout", () => {
      body.setFillStyle(selected ? 0xfff3a8 : 0xf4ead2, 1);
    });
    hit.on("pointerdown", onClick);
    container.add([shadow, body, header, name, chips, suit, rarity, check, hit]);
    return container;
  }

  private createCardTableButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const buttonWidth = 104;
    const buttonHeight = 28;
    const container = this.add.container(x, y).setSize(buttonWidth, buttonHeight);
    const bg = this.add
      .rectangle(0, 0, buttonWidth, buttonHeight, 0x101b25, 0.95)
      .setStrokeStyle(2, 0xcfa77a)
      .setOrigin(0, 0);
    const text = this.add.text(buttonWidth / 2, 6, label, {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#fff4cf",
    }).setOrigin(0.5, 0);
    const hit = this.add.zone(0, -8, buttonWidth, buttonHeight + 16).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hit.on("pointerover", () => {
      bg.setFillStyle(0x243653, 1);
      text.setColor("#ffffff");
    });
    hit.on("pointerout", () => {
      bg.setFillStyle(0x101b25, 0.95);
      text.setColor("#fff4cf");
    });
    hit.on("pointerdown", onClick);
    container.add([bg, text, hit]);
    return container;
  }

  private getCardSuitColor(suit: string): number {
    switch (suit) {
      case "moss": return 0x3d8f48;
      case "teeth": return 0xa84242;
      case "lanterns": return 0xd79234;
      case "moons": return 0x596bb8;
      case "smoke": return 0x6b4c88;
      default: return 0x4da3ff;
    }
  }

  private hideCardGamePopup(updateChoiceState = true): void {
    this.cardGameContainer?.destroy(true);
    this.cardGameContainer = null;
    this.cardTooltipText = null;
    if (updateChoiceState) {
      this.setChoicePopupVisible(false);
    }
  }

  private showCardScoringCutscene(cardIds: CardId[], result: CardScoreResult, won: boolean, onComplete: () => void): void {
    this.hideCardGamePopup(false);
    this.setChoicePopupVisible(true);
    const width = Math.min(this.scale.width - 44, 720);
    const height = Math.min(this.scale.height - 44, 430);
    const x = (this.scale.width - width) / 2;
    const y = (this.scale.height - height) / 2;
    const root = this.add.container(x, y).setDepth(62).setScrollFactor(0);
    const background = this.add
      .rectangle(0, 0, width, height, 0x071019, 0.97)
      .setStrokeStyle(2, won ? 0x5dd6a2 : 0xff6b6b)
      .setOrigin(0, 0);
    const title = this.add.text(width / 2, 18, "Scoring Hand", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#fff3a8",
    }).setOrigin(0.5, 0);
    const scoreText = this.add.text(width / 2, height - 116, "Chips: 0", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#ffffff",
    }).setOrigin(0.5, 0);
    const multText = this.add.text(width / 2, height - 82, "Multiplier: x1", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#9ad1ff",
    }).setOrigin(0.5, 0);
    const finalText = this.add.text(width / 2, height - 48, "", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: won ? "#5dd6a2" : "#ffb3a8",
    }).setOrigin(0.5, 0);
    root.add([background, title, scoreText, multText, finalText]);

    const cardWidth = 102;
    const visibleCards = cardIds.length > 0 ? cardIds : [];
    const gap = Math.min(18, Math.max(8, (width - 70 - cardWidth * Math.max(1, visibleCards.length)) / Math.max(1, visibleCards.length - 1)));
    const totalWidth = cardWidth * visibleCards.length + gap * Math.max(0, visibleCards.length - 1);
    let cardX = visibleCards.length > 0 ? (width - totalWidth) / 2 : width / 2 - cardWidth / 2;
    const cardSprites: Phaser.GameObjects.Container[] = [];
    if (visibleCards.length === 0) {
      const empty = this.add.text(width / 2, 138, "Empty hand", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffb3a8",
      }).setOrigin(0.5, 0);
      root.add(empty);
    } else {
      for (const cardId of visibleCards) {
        const sprite = this.createCardSprite(cardId, true, () => undefined);
        sprite.setPosition(cardX, 92).setAlpha(0.72).setScale(0.92);
        root.add(sprite);
        cardSprites.push(sprite);
        cardX += cardWidth + gap;
      }
    }

    this.cardGameContainer = root;
    let runningChips = 0;
    let delay = 160;
    cardSprites.forEach((sprite, index) => {
      const card = getCardDefinition(visibleCards[index]!);
      this.time.delayedCall(delay, () => {
        runningChips += card.chips;
        this.juice.cardScoreTick(card.chips);
        scoreText.setText(`Chips: ${runningChips}`);
        this.tweens.add({
          targets: sprite,
          y: 62,
          scale: 1.16,
          alpha: 1,
          duration: 150,
          yoyo: true,
          ease: "Back.easeOut",
        });
        const pop = this.add.text(sprite.x + 51, sprite.y - 18, `+${card.chips}`, {
          fontFamily: "monospace",
          fontSize: "18px",
          color: "#fff3a8",
          stroke: "#071019",
          strokeThickness: 3,
        }).setOrigin(0.5, 0);
        root.add(pop);
        this.tweens.add({
          targets: pop,
          y: pop.y - 34,
          alpha: 0,
          duration: 420,
          ease: "Cubic.easeOut",
          onComplete: () => pop.destroy(),
        });
      });
      delay += 260;
    });

    this.time.delayedCall(delay, () => {
      runningChips = result.chips;
      this.juice.cardModifierTick(result.multiplier);
      scoreText.setText(`Chips: ${result.chips}`);
      multText.setText(`Multiplier: x${result.multiplier.toFixed(2).replace(/\.00$/, "")}`);
      const detail = result.details[0] ?? "Modifiers resolve.";
      const modifierText = this.add.text(width / 2, 64, detail, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#c8ffe1",
        wordWrap: { width: width - 80 },
        align: "center",
      }).setOrigin(0.5, 0);
      root.add(modifierText);
      this.tweens.add({
        targets: modifierText,
        scale: 1.08,
        duration: 120,
        yoyo: true,
        ease: "Sine.easeInOut",
      });
    });
    delay += 520;

    this.time.delayedCall(delay, () => {
      this.juice.cardRoundResult(won);
      finalText.setText(`Final ${result.finalScore} / Window ${result.minScore}-${result.maxScore} / ${won ? "Round won" : result.finalScore < result.minScore ? "Too low" : "Too high"}`);
      this.tweens.add({
        targets: finalText,
        scale: 1.12,
        duration: 160,
        yoyo: true,
        ease: "Back.easeOut",
      });
    });
    delay += 780;

    this.time.delayedCall(delay, () => {
      this.hideCardGamePopup(false);
      onComplete();
    });
  }

  private resolveCardRound(shopkeeperName: string, state: CardCompetitionState, hand: CardId[], selectedIndexes: number[]): void {
    const table = getCardTable(state.tableId);
    const selectedCards = selectedIndexes
      .sort((a, b) => a - b)
      .map((index) => hand[index])
      .filter((cardId): cardId is CardId => Boolean(cardId));
    const result = scoreCardHand(selectedCards, table);
    const won = result.finalScore >= result.minScore && result.finalScore <= result.maxScore;
    this.showCardScoringCutscene(selectedCards, result, won, () => {
      this.finishResolvedCardRound(shopkeeperName, state, selectedCards, result, won);
    });
  }

  private finishResolvedCardRound(
    shopkeeperName: string,
    state: CardCompetitionState,
    selectedCards: CardId[],
    result: CardScoreResult,
    won: boolean
  ): void {
    if (won) {
      state.wins += 1;
    } else {
      state.losses += 1;
    }
    finishCompetitionRound(state, selectedCards);

    const played = selectedCards.length > 0
      ? selectedCards.map((cardId) => getCardDefinition(cardId).name).join(", ")
      : "no cards";
    const reason = won ? "Round won." : result.finalScore < result.minScore ? "Too low." : "Too high.";
    const detailText = result.details.length > 0 ? ` ${result.details.join(" ")}` : "";

    if (state.wins >= 2) {
      const payout = state.wagerScore * 2;
      this.addScoreDirect(payout);
      this.juice.stopCardMusic();
      this.setChoicePopupVisible(false);
      this.villageShopPopup.show("Card Victory", [
        {
          id: "done",
          title: `${payout} score paid out`,
          description: `${played}. Final ${result.finalScore}, window ${result.minScore}-${result.maxScore}. ${reason}${detailText}`,
        },
      ], () => this.closeVillageShop());
      return;
    }

    if (state.losses >= 2 || state.round > 3) {
      this.juice.stopCardMusic();
      this.setChoicePopupVisible(false);
      this.villageShopPopup.show("Card Defeat", [
        {
          id: "done",
          title: "Leave Table",
          description: `${played}. Final ${result.finalScore}, window ${result.minScore}-${result.maxScore}. ${reason}${detailText}`,
        },
      ], () => this.closeVillageShop());
      return;
    }

    this.setChoicePopupVisible(false);
    this.villageShopPopup.show(won ? "Round Won" : "Round Lost", [
      {
        id: "continue",
        title: "Next Round",
        description: `${played}. Final ${result.finalScore}, window ${result.minScore}-${result.maxScore}. ${reason}${detailText}`,
      },
    ], () => this.showNextCardRound(shopkeeperName, state));
  }

  private closeVillageShop(): void {
    this.juice.stopCardMusic();
    this.hideCardGamePopup();
    this.villageShopPopup.hide();
    this.paused = false;
  }

  private tryInteractQuestGiver(): boolean {
    if (this.paused || this.offeredQuest) {
      return false;
    }
    const room = this.snakeGame.getCurrentRoom();
    const giver = room.questGiver;
    if (!giver) {
      return false;
    }
    const head = this.snakeGame.getSnakeBody()[0];
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
    const disposition = this.snakeGame.getNpcDisposition(room.id);
    if (disposition.hostility === "hostile") {
      return true;
    }
    const request = this.snakeGame.requestQuestFromGiver(room.id);
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
            const accepted = this.snakeGame.acceptOfferedQuest();
            if (accepted) {
              this.isDirty = true;
              this.applyPendingQuestCosmeticRewards();
            }
            this.closeQuestPopup();
          },
          onReject: () => {
            this.juice.questRejected();
            this.snakeGame.rejectOfferedQuest();
            this.handleNpcInsult(room.id, giverName, speaker.portraitId);
          },
        },
        {
          acceptLabel: i18n.getCommon("quest.accept"),
          rejectLabel: i18n.getCommon("quest.refuse"),
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

  private handleNpcInsult(roomId: string, giverName: string, portraitId?: string): void {
    const insult = this.snakeGame.insultNpc(roomId);
    if (!insult) {
      this.closeQuestPopup();
      return;
    }
    if (insult.hostility === "warning") {
      this.showQuestDialogue(
        giverName,
        [
          "The air around them hardens. Even the room seems to draw back a little, as if it has seen this turn before and remembers the cost of it.",
          `"Mind your tongue, snake. I have buried kinder creatures for less, and the ground did not trouble itself to call me unjust."`,
          `"Slight me again and this conversation will have to continue in the uglier language kept by powder, blood, and ringing tile."`,
        ],
        {
          onClose: () => this.closeQuestPopup(),
        },
        {
          closeLabel: "Back off",
        },
        { portraitId }
      );
      return;
    }
    if (insult.hostility === "hostile") {
      this.showQuestDialogue(
        giverName,
        [
          `${giverName} goes still in the way a drawn blade is still: not restful, only decided.`,
          `"That is enough. I offered you the dignity of words first. Do not complain now that the lesson has been translated into something your nerves can understand."`,
          "Their hand moves toward the weapon with the grim familiarity of ritual.",
        ],
        {
          onClose: () => this.closeQuestPopup(),
        },
        {
          closeLabel: "Fight",
        },
        { portraitId }
      );
      return;
    }
    this.closeQuestPopup();
  }

  private maybePresentRandomEncounter(): void {
    if (this.paused || this.questPopup.isVisible()) {
      return;
    }
    const encounter = this.snakeGame.getFlag<(WandererEncounter & { roomId: string; x: number; y: number; statsNote: string })>("npc.randomEncounter");
    if (!encounter || encounter.roomId !== this.currentRoomId) {
      return;
    }
    if (this.snakeGame.getFlag<boolean>("npc.randomEncounter.prompted")) {
      return;
    }
    const triggerAtMs = Number(this.snakeGame.getFlag<number>("npc.randomEncounter.triggerAtMs") ?? 0);
    const nowMs = Number(this.getFlag<number>("timeMs") ?? 0);
    if (nowMs < triggerAtMs) {
      return;
    }
    this.snakeGame.setFlag("npc.randomEncounter.prompted", true);
    (this.juice as any).wandererApproach?.(
      this.tileToWorldInRoom({ x: encounter.x, y: encounter.y }, encounter.roomId).x,
      this.tileToWorldInRoom({ x: encounter.x, y: encounter.y }, encounter.roomId).y
    );
    this.showQuestDialogue(
      encounter.name,
      [...encounter.pages, encounter.statsNote],
      {
        onAccept: () => {
          const result = this.snakeGame.resolveRandomEncounter(true);
          const world = this.tileToWorldInRoom({ x: encounter.x, y: encounter.y }, encounter.roomId);
          if (result.kind === "duel" && result.accepted) {
            (this.juice as any).duelAccepted?.(world.x, world.y);
          }
          this.closeQuestPopup();
          if (result.kind === "quest" && result.accepted) {
            const offered = this.snakeGame.getOfferedQuest();
            if (offered) {
              this.offerQuest(offered);
            }
          } else if (result.kind === "flavor" && result.accepted) {
            if (result.rewardCardName) {
              this.showQuestHintPopup(`${encounter.name} gives you ${result.rewardCardName}.`, "#5dd6a2");
            } else if (result.startCardGame) {
              this.showQuestHintPopup(`${encounter.name} deals you in.`, "#9ad1ff");
            } else {
              this.showQuestHintPopup(`${encounter.name} leaves you with a little hard-won advice.`, "#9ad1ff");
            }
            if (result.startCardGame) {
              this.paused = true;
              this.showCardTableRoot(encounter.name);
            }
          }
        },
        onReject: () => {
          this.snakeGame.resolveRandomEncounter(false);
          this.closeQuestPopup();
        },
      },
      {
        acceptLabel: encounter.acceptLabel ?? i18n.getCommon("quest.accept"),
        rejectLabel: encounter.rejectLabel ?? i18n.getCommon("quest.refuse"),
        nextLabel: "Next",
      },
      { portraitId: encounter.portraitId }
    );
  }

  private initQuestGiverSprite(): void {
    const textures = this.getDefaultNpcTextures(Math.max(18, Math.floor(this.grid.cell * 0.92)));

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

  private initWandererSprite(): void {
    const textures = this.getDefaultNpcTextures(Math.max(19, Math.floor(this.grid.cell * 0.98)));
    this.wandererSprite = this.add
      .sprite(0, 0, textures.idle)
      .setDepth(25)
      .setVisible(false);
  }

  private ensureVillageResidentSprite(index: number): Phaser.GameObjects.Sprite {
    let sprite = this.villageResidentSprites[index];
    if (sprite) {
      return sprite;
    }
    const textures = this.getDefaultNpcTextures(Math.max(16, Math.floor(this.grid.cell * 0.84)));
    sprite = this.add.sprite(0, 0, textures.idle).setDepth(24).setVisible(false);
    this.villageResidentSprites[index] = sprite;
    return sprite;
  }

  private getDefaultNpcTextures(size: number): Record<"idle" | "blink", string> {
    const palette: QuestGiverSpritePalette = {
      robeColor: "#2f7f5f",
      trimColor: "#5dd6a2",
      outlineColor: "#1e3a2d",
      eyeColor: "#e8ffe8",
    };
    return this.runtimeSpriteFactory.ensureRecipe(questGiverSpriteRecipe, size, palette);
  }

  private updateQuestGiverSprite(): void {
    if (!this.questGiverSprite) {
      return;
    }
    const room = this.snakeGame.getCurrentRoom();
    const giver = room.questGiver;
    if (!giver) {
      this.questGiverSprite.setVisible(false);
      return;
    }
    const disposition = this.snakeGame.getNpcDisposition(room.id);
    if (disposition.hostility === "hostile" && this.snakeGame.getEnemies(room.id).some((enemy) => enemy.encounterKind === "npc-hostile")) {
      this.questGiverSprite.setVisible(false);
      return;
    }
    const palette = this.paletteForQuestGiverDisposition(disposition.hostility);
    const textures = this.runtimeSpriteFactory.ensureRecipe(
      questGiverSpriteRecipe,
      Math.max(18, Math.floor(this.grid.cell * 0.92)),
      palette
    );
    const animKey = `quest-giver-${disposition.hostility}-idle`;
    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: [{ key: textures.idle }, { key: textures.blink }],
        frameRate: disposition.hostility === "hostile" ? 4 : 2,
        repeat: -1,
      });
    }
    if (this.questGiverSprite.anims.currentAnim?.key !== animKey) {
      this.questGiverSprite.play(animKey);
    }
    this.questGiverSprite.setTexture(textures.idle);
    const world = this.tileToWorldLocalInRoom({ x: giver.x, y: giver.y });
    const bobSpeed = disposition.hostility === "hostile" ? 110 : disposition.hostility === "warning" ? 180 : 260;
    const bobAmount = disposition.hostility === "hostile" ? 3 : 2;
    const bobOffset = Math.sin(this.time.now / bobSpeed) * bobAmount;
    const hostileJitterX = disposition.hostility === "hostile" ? Math.sin(this.time.now / 45) * 0.9 : 0;
    const hostileAlpha = disposition.hostility === "hostile" ? 0.82 + 0.18 * Math.sin(this.time.now / 95) : 1;
    const head = this.snakeGame.getSnakeBody()[0];
    let flipX = false;
    if (head) {
      const [roomX, roomY] = room.id.split(",").map(Number);
      const headLocalX = head.x - roomX * this.grid.cols;
      if (disposition.hostility !== "friendly" && headLocalX !== giver.x) {
        flipX = headLocalX < giver.x;
      }
    }
    this.questGiverSprite
      .setPosition(world.x + hostileJitterX, world.y - 2 + bobOffset)
      .setAlpha(hostileAlpha)
      .setFlipX(flipX)
      .setVisible(true);
  }

  private updateWandererSprite(): void {
    if (!this.wandererSprite || !this.snakeGame) {
      return;
    }
    const encounter = this.snakeGame.getFlag<(WandererEncounter & { roomId: string; x: number; y: number; statsNote: string })>("npc.randomEncounter");
    if (!encounter || encounter.roomId !== this.currentRoomId || this.questPopup.isVisible()) {
      this.wandererSprite.setVisible(false);
      return;
    }
    const palette = this.paletteForEncounter(encounter.id);
    const textures = this.runtimeSpriteFactory.ensureRecipe(
      questGiverSpriteRecipe,
      Math.max(19, Math.floor(this.grid.cell * 0.98)),
      palette
    );
    const animKey = `wanderer-${encounter.id}-idle`;
    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: [{ key: textures.idle }, { key: textures.blink }],
        frameRate: 2,
        repeat: -1,
      });
    }
    const texture = textures.idle;
    if (this.activeWandererTextureKey !== texture) {
      this.wandererSprite.setTexture(texture);
      this.activeWandererTextureKey = texture;
    }
    if (this.wandererSprite.anims.currentAnim?.key !== animKey) {
      this.wandererSprite.play(animKey);
    }
    const revealAtMs = Number(this.snakeGame.getFlag<number>("npc.randomEncounter.revealAtMs") ?? 0);
    const triggerAtMs = Number(this.snakeGame.getFlag<number>("npc.randomEncounter.triggerAtMs") ?? revealAtMs + 1);
    const nowMs = Number(this.getFlag<number>("timeMs") ?? triggerAtMs);
    const head = this.snakeGame.getSnakeBody()[0];
    let renderLocal = { x: encounter.x, y: encounter.y };
    let flipX = false;
    if (head && triggerAtMs > revealAtMs) {
      const [roomX, roomY] = this.currentRoomId.split(",").map(Number);
      const headLocal = {
        x: head.x - roomX * this.grid.cols,
        y: head.y - roomY * this.grid.rows,
      };
      const progress = Phaser.Math.Clamp((nowMs - revealAtMs) / (triggerAtMs - revealAtMs), 0, 1);
      const approach = Math.min(0.72, progress * 0.82);
      renderLocal = {
        x: Phaser.Math.Linear(encounter.x, headLocal.x, approach),
        y: Phaser.Math.Linear(encounter.y, headLocal.y, approach),
      };
      if (Math.abs(headLocal.x - renderLocal.x) > 0.1) {
        flipX = headLocal.x < renderLocal.x;
      }
    }
    const world = this.tileToWorldLocalInRoom(renderLocal);
    const bobOffset = Math.sin(this.time.now / 210) * 2.4;
    this.wandererSprite.setPosition(world.x, world.y - 3 + bobOffset).setFlipX(flipX).setVisible(true);
    if (Math.random() < 0.08) {
      (this.juice as any).wandererAura?.(world.x, world.y - 6, palette.trimColor);
    }
  }

  private updateVillageResidentSprites(): void {
    this.villageResidentSprites.forEach((sprite) => sprite.setVisible(false));
    if (!this.snakeGame) {
      return;
    }
    const room = this.snakeGame.getCurrentRoom();
    const residents = room.village ? [...room.village.residents, room.village.shopkeeper] : [];
    if (residents.length === 0 || this.questPopup.isVisible()) {
      return;
    }
    residents.forEach((resident, index) => {
      const sprite = this.ensureVillageResidentSprite(index);
      const palette = this.paletteForResident(resident.name, index);
      const textures = this.runtimeSpriteFactory.ensureRecipe(
        questGiverSpriteRecipe,
        Math.max(16, Math.floor(this.grid.cell * 0.84)),
        palette
      );
      const animKey = `village-resident-${resident.id}-${index}`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: [{ key: textures.idle }, { key: textures.blink }],
          frameRate: 2,
          repeat: -1,
        });
      }
      const world = this.tileToWorldLocalInRoom({ x: resident.x, y: resident.y });
      const bobOffset = Math.sin(this.time.now / (220 + index * 17)) * 1.8;
      sprite.setTexture(textures.idle).setPosition(world.x, world.y - 2 + bobOffset).setVisible(true);
      if (sprite.anims.currentAnim?.key !== animKey) {
        sprite.play(animKey);
      }
      if (Math.random() < 0.04) {
        (this.juice as any).wandererAura?.(world.x, world.y - 4, palette.trimColor);
      }
      if (Math.random() < 0.02) {
        (this.juice as any).villageResidentMurmur?.(world.x, world.y - 2, Phaser.Display.Color.HexStringToColor(palette.trimColor).color);
      }
    });
  }

  private tickVillageJuice(): void {
    if (!this.snakeGame || this.paused) {
      return;
    }
    const room = this.snakeGame.getCurrentRoom();
    if (!room.village) {
      return;
    }
    if (Math.random() < 0.08) {
      const lantern = room.village.lanterns[Math.floor(Math.random() * room.village.lanterns.length)];
      if (lantern) {
        const world = this.tileToWorldLocalInRoom(lantern);
        (this.juice as any).villageLantern?.(world.x, world.y);
      }
    }
    if (Math.random() < 0.03) {
      const world = this.tileToWorldLocalInRoom(room.village.center);
      (this.juice as any).villageBreath?.(world.x, world.y);
    }
  }

  private tickBiomeHazardJuice(): void {
    if (!this.snakeGame || this.paused) {
      return;
    }
    const room = this.snakeGame.getCurrentRoom();
    if (room.biomeId === "sable-depths" && Math.random() < 0.28) {
      (this.juice as any).snowDrift?.(
        Phaser.Math.Between(8, this.grid.cols * this.grid.cell - 8),
        Phaser.Math.Between(0, this.grid.rows * this.grid.cell)
      );
    } else if (room.biomeId === "ember-waste" && Math.random() < 0.24) {
      (this.juice as any).heatHaze?.(
        Phaser.Math.Between(12, this.grid.cols * this.grid.cell - 12),
        Phaser.Math.Between(this.grid.rows * this.grid.cell / 2, this.grid.rows * this.grid.cell - 12)
      );
    } else if (room.biomeId === "moonlit-parish" && Math.random() < 0.12) {
      (this.juice as any).snowDrift?.(
        Phaser.Math.Between(8, this.grid.cols * this.grid.cell - 8),
        Phaser.Math.Between(0, this.grid.rows * this.grid.cell)
      );
    } else if (room.biomeId === "gloam-garden" && Math.random() < 0.1) {
      (this.juice as any).temperatureReliefPulse?.(
        Phaser.Math.Between(12, this.grid.cols * this.grid.cell - 12),
        Phaser.Math.Between(12, this.grid.rows * this.grid.cell - 12),
        Math.random() < 0.5 ? "warm" : "cool"
      );
    }

    if (room.temperatureReliefs && Math.random() < 0.08) {
      const relief = room.temperatureReliefs[Math.floor(Math.random() * room.temperatureReliefs.length)];
      if (relief) {
        const world = this.tileToWorldLocalInRoom({ x: relief.x, y: relief.y });
        (this.juice as any).temperatureReliefPulse?.(world.x, world.y, relief.kind);
      }
    }
  }

  private paletteForEncounter(encounterId: string): QuestGiverSpritePalette {
    switch (encounterId) {
      case "freak-joey":
        return {
          robeColor: "#7a2430",
          trimColor: "#f4b46a",
          outlineColor: "#23060a",
          eyeColor: "#fff0d4",
        };
      case "lindsey-wanderer":
        return {
          robeColor: "#466fb7",
          trimColor: "#cde4ff",
          outlineColor: "#142239",
          eyeColor: "#f7fbff",
        };
      case "ryan-wanderer":
        return {
          robeColor: "#7b6c52",
          trimColor: "#d9c2a0",
          outlineColor: "#2d2417",
          eyeColor: "#fff2dd",
        };
      case "aurex-wanderer":
        return {
          robeColor: "#6d8f63",
          trimColor: "#d7efba",
          outlineColor: "#1f311d",
          eyeColor: "#fbfff4",
        };
      case "belisar-wanderer":
        return {
          robeColor: "#5d3d7d",
          trimColor: "#f0da8a",
          outlineColor: "#1c1026",
          eyeColor: "#fff8e2",
        };
      case "cyrene-wanderer":
        return {
          robeColor: "#2f7c77",
          trimColor: "#a5f0ea",
          outlineColor: "#0d2a28",
          eyeColor: "#f1fffd",
        };
      default:
        return {
          robeColor: "#2f7f5f",
          trimColor: "#5dd6a2",
          outlineColor: "#1e3a2d",
          eyeColor: "#e8ffe8",
        };
    }
  }

  private paletteForResident(name: string, offset: number): QuestGiverSpritePalette {
    const palettes: QuestGiverSpritePalette[] = [
      { robeColor: "#536d94", trimColor: "#d4e4ff", outlineColor: "#182338", eyeColor: "#fffdf5" },
      { robeColor: "#6d5a48", trimColor: "#e7c89a", outlineColor: "#241a12", eyeColor: "#fff4e0" },
      { robeColor: "#4d7b5e", trimColor: "#cfeec8", outlineColor: "#163020", eyeColor: "#f4fff0" },
      { robeColor: "#7a4e82", trimColor: "#f0d8a0", outlineColor: "#25132d", eyeColor: "#fff8e5" },
    ];
    const index = Math.abs(name.length + offset) % palettes.length;
    return palettes[index];
  }

  private paletteForQuestGiverDisposition(
    hostility: "friendly" | "warning" | "hostile"
  ): QuestGiverSpritePalette {
    switch (hostility) {
      case "warning":
        return {
          robeColor: "#8b6a2b",
          trimColor: "#ffd27d",
          outlineColor: "#35240c",
          eyeColor: "#fff6d6",
        };
      case "hostile":
        return {
          robeColor: "#8a2430",
          trimColor: "#ff8e7a",
          outlineColor: "#26070c",
          eyeColor: "#fff0ea",
        };
      case "friendly":
      default:
        return {
          robeColor: "#2f7f5f",
          trimColor: "#5dd6a2",
          outlineColor: "#1e3a2d",
          eyeColor: "#e8ffe8",
        };
    }
  }

  toggleLanguage(): { ok: boolean; message: string; color: string } {
    const cost = LANGUAGE_SELECTOR_COST;
    if (!this.snakeCosmetics.languageSelected) {
      if (this.score < cost) {
        return {
          ok: false,
          message: `Spanish language costs ${cost} score.`,
          color: "#ff6b6b",
        };
      }
      this.addScoreDirect(-cost);
      this.snakeCosmetics.languageSelected = true;
      this.isDirty = true;
    }

    if (!this.snakeCosmetics.languageSet) {
      i18n.setLanguage('es');
      this.snakeGame.saveLanguagePreference('es');
      this.snakeCosmetics.languageSet = true;
    }

    this.isDirty = true;
    return {
      ok: true,
      message: "Language set to Spanish.",
      color: "#5dd6a2",
    };
  }

}
