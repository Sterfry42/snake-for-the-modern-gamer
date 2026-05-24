import Phaser from 'phaser';
import { defaultGameConfig } from '../config/gameConfig.js';
import { SnakeGame } from '../game/snakeGame.js';
import type { QuestRoomActor } from '../game/snakeGame.js';
import { FeatureManager } from '../systems/features.js';
import { SimulationScheduler, type ClockRule } from '../systems/simulationScheduler.js';
import { createQuestRegistry } from '../systems/quests.js';
import { SkillTreeManager } from '../systems/skillTreeManager.js';
import { QuestHud } from '../ui/questHud.js';
import { QuestPopup } from '../ui/questPopup.js';
import { ChoicePopup, type ChoiceOption } from '../ui/choicePopup.js';
import { SnakeRenderer } from '../ui/snakeRenderer.js';
import { MinimapRenderer } from '../ui/minimapRenderer.js';
import { JuiceManager } from '../ui/juice.js';
import { BossHud } from '../ui/bossHud.js';
import { SaveUI } from '../ui/saveUI.js';
import { DatingScenePopup, type DatingSceneAction, type DatingSceneButton } from '../ui/datingScenePopup.js';
import { saveManager } from '../game/saveManager.js';
import { RuntimeSpriteFactory } from '../ui/runtimeSpriteFactory.js';
import {
  questGiverSpriteRecipe,
  type QuestGiverSpritePalette,
} from '../ui/spriteRecipes/questGiverRecipe.js';
import { getQuestDialogue } from '../quests/questDialogue.js';
import { i18n } from '../i18n/i18nManager.js';
import { createMobileControls, type MobileControls } from '../ui/mobileControls.js';
import type { Quest } from '../../quests.js';
import type { AppleSnapshot } from '../apples/types.js';
import type { Vector2Like } from '../core/math.js';
import type { InventorySystem } from '../inventory/inventory.js';
import type { EquipmentSlot } from '../inventory/item.js';
import type { McDonaldsData } from '../world/snakeMcDonalds.js';
import {
  formatTownMood,
  getTownDistrictForRoom,
  getTownRoom,
  townDistrictDisplayName,
  type TownDistrictKind,
  type TownStructure,
} from '../world/town.js';
import { getItem } from '../inventory/itemRegistry.js';
import type { SnakeSpritePalette } from '../ui/spriteRecipes/snakeRecipe.js';
import type { WandererEncounter } from '../npcs/encounters.js';
import {
  VILLAGE_SHOP_EQUIPMENT,
  VILLAGE_SHOP_HATS,
  VILLAGE_SHOP_STYLES,
  getBlackMarketDefinition,
  getVillageShopDefinition,
  type VillageShopDefinition,
  type VillageShopEquipmentOffer,
  type VillageShopHatId,
  type VillageShopHatOffer,
  type VillageShopStyleOffer,
  type VillageShopStyleId,
} from '../shops/villageShop.js';
import {
  GOBLIN_WARD_SCROLLS,
  GOBLIN_SNAKE_STYLE,
  getWardPrice,
  getWardScrollOffer,
  type WardDeathSource,
} from '../shops/goblinShop.js';
import type { FactionCardView } from '../factions/factions.js';
import type { ActorJournalEntry } from '../game/snakeGame.js';
import type {
  DatingCandidateView,
  DatingBranchChoice,
  RelationshipCandidateProfile,
  RelationshipChoice,
  RelationshipEventResult,
  RelationshipOutcomeTier,
  RelationshipPersonality,
  RelationshipReward,
  RelationshipSpecies,
  RelationshipTag,
} from '../relationships/relationshipTypes.js';
import { getLibertyNpcLine, type LibertyNpcRole } from '../world/libertyBadlandsFlavor.js';
import { DATING_PORTRAIT_ASSETS } from '../relationships/datingPortraitManifest.js';
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
} from '../cards/cardGame.js';

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

type DeathCutsceneMode = 'revive' | 'game-over';
type AfterlifeDestination = 'heaven' | 'hell';
type DeathRescuer = 'angel' | 'goblin-angel';

type VillageMarketStock = {
  version: 3;
  equipmentIds: string[];
  styleIds: VillageShopStyleId[];
  hatIds: VillageShopHatId[];
  cardIds: CardId[];
  supplyCounts: Record<string, number>;
};

type SupplyStock = {
  version: 1;
  supplyCounts: Record<string, number>;
};

type DeathCutscenePhase = 'intro' | 'angel-dialogue' | 'afterlife' | 'final' | 'revive';

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
  rescuer: DeathRescuer;
  afterlifeDestination?: AfterlifeDestination;
  phase: DeathCutscenePhase;
  afterlifeDialogueShown: boolean;
};

type TitleMenuMode = 'main' | 'settings';

type LocalRect = { left: number; top: number; width: number; height: number };

type DatingSequencePage = {
  line: string;
  result?: string;
  lineIsNarration?: boolean;
  actions?: readonly DatingSceneButton[];
};

type DatingSequence = {
  profile: RelationshipCandidateProfile;
  kind: Extract<RelationshipChoice, 'talk' | 'flirt' | 'date'>;
  pages: DatingSequencePage[];
  index: number;
  branchOutcome?: RelationshipChoice;
  branchText?: string;
  branchChoice?: DatingBranchChoice;
  branchResults: Record<string, DatingBranchResult>;
};

type DatingBranchResult = {
  text: string;
  outcome?: RelationshipChoice;
  tags?: DatingBranchChoice['tags'];
  targetTier?: RelationshipOutcomeTier;
  label?: string;
};

const DATING_PERSONALITY_TAG_WEIGHTS: Record<RelationshipPersonality, Partial<Record<RelationshipTag, number>>> = {
  poetic: {
    dramatic: 3,
    honesty: 4,
    privateAffection: 3,
    commitment: 4,
    bravery: 2,
    food: -1,
    selfPreserving: -2,
    avoidance: -4,
    betrayal: -8,
    violence: -3,
  },
  deadpan: {
    honesty: 4,
    competence: 3,
    pragmatic: 4,
    clever: 2,
    restraint: 3,
    dramatic: -3,
    neediness: -2,
    publicAffection: -1,
    selfPreserving: 2,
  },
  hungry: {
    food: 6,
    comfort: 4,
    protective: 3,
    loyalty: 4,
    family: 4,
    dramatic: 1,
    neglect: -5,
    betrayal: -8,
    selfPreserving: -1,
  },
  regal: {
    bravery: 4,
    protective: 4,
    ritual: 5,
    commitment: 5,
    humility: 3,
    publicAffection: 2,
    clever: 1,
    avoidance: -4,
    betrayal: -10,
    secrecy: -6,
  },
  sharp: {
    clever: 5,
    pragmatic: 5,
    selfPreserving: 3,
    transaction: 4,
    contract: 5,
    competence: 4,
    ledger: 4,
    goblin: 3,
    dramatic: -1,
    neediness: -3,
    betrayal: -7,
  },
};

const SNAKE_THEME_DEFINITIONS: readonly SnakeThemeDefinition[] = [
  {
    id: 'classic',
    label: 'Classic Green',
    cost: 0,
    palette: {
      baseColor: '#5dd6a2',
      bellyColor: '#c8ffe1',
      patternColor: '#2e8b68',
      outlineColor: '#3c8a69',
      eyeColor: '#f8ffef',
    },
  },
  {
    id: 'sunset',
    label: 'Sunset Coral',
    cost: 18,
    palette: {
      baseColor: '#ff8a5b',
      bellyColor: '#ffe2b8',
      patternColor: '#b84c2f',
      outlineColor: '#7c2f22',
      eyeColor: '#fff7ef',
    },
  },
  {
    id: 'midnight',
    label: 'Midnight Coil',
    cost: 30,
    palette: {
      baseColor: '#4f69ff',
      bellyColor: '#d4dcff',
      patternColor: '#26358f',
      outlineColor: '#18204a',
      eyeColor: '#f5f7ff',
    },
  },
  {
    id: 'bone',
    label: 'Bone White',
    cost: 44,
    palette: {
      baseColor: '#f0e7d8',
      bellyColor: '#fffaf0',
      patternColor: '#a99574',
      outlineColor: '#665744',
      eyeColor: '#221b15',
    },
  },
];

const COWBOY_HAT_COST = 36;
const MINIMAP_MODULE_COST = 50;
const LEGACY_COWBOY_HAT_ID: VillageShopHatId = 'cowboy';
const ANGEL_TEXTURE_KEY = 'death-angel-pixel';
const GOBLIN_ANGEL_TEXTURE_KEY = 'death-goblin-angel-pixel';
const HEAVEN_SNAKE_TEXTURE_KEY = 'afterlife-heaven-snake-pixel';
const HELL_SNAKE_TEXTURE_KEY = 'afterlife-hell-snake-pixel';

const DEATH_DIALOGUE_BRANCHES: readonly string[][] = [
  [
    'Thou hast come ashore upon a sea with no water.',
    'The body is a small oath. Death is the hand that collects it.',
  ],
  [
    'Behold the bright wound between one breath and the next.',
    'All crawling things learn, in time, the weight of stillness.',
  ],
  [
    'Little pilgrim, thy path was narrow, and yet thou filled it with hunger.',
    'Life is not spared because it is loved. It is spent because it was given.',
  ],
  [
    'The dark has counted thee and found thee present.',
    'Fear not the ending. Fear only the life that noticed nothing before it.',
  ],
];

const DEATH_REASON_DIALOGUE: Partial<Record<string, readonly string[]>> = {
  water: [
    'Water is a quiet executioner.',
    'Thou mistook depth for floor, and the lake accepted the compliment.',
  ],
  wall: [
    'The wall did not hate thee. It merely stood where truth had always stood.',
    'A soft body may argue with stone only once.',
  ],
  self: [
    'Few creatures are granted the honor of becoming their own calamity.',
    'Thou didst close the circle, and the circle answered.',
  ],
  boss: [
    'A greater hunger found thee.',
    'Predator and prey are titles the living borrow until the teeth arrive.',
  ],
  shark: [
    'The sea grew teeth and named thee supper.',
    'Thou crossed the blue chapel, and its oldest mouth opened.',
  ],
  bullet: [
    'A small piece of metal made a brief sermon of thy body.',
    'So ends many a proud pilgrimage: loudly, and from a distance.',
  ],
  temperature: [
    'The air itself judged thee wanting.',
    'Heat and cold are old gods. They do not need faces to be cruel.',
  ],
  shielded: [
    'Even protection has its appetite.',
    'Thou reached for safety and found its hidden blade.',
  ],
};

const REVIVE_DIALOGUE_BRANCHES: readonly string[][] = [
  [
    'Yet a coal remains beneath the ash.',
    'Return now. Let the living world learn what it failed to finish.',
  ],
  [
    'One thread still binds thee to the warm and ruinous place.',
    'Go back through it. Spend thy mercy with greater care.',
  ],
  [
    'Thy grave has opened its mouth, but not yet swallowed.',
    'Rise, and carry this interruption like a scar.',
  ],
];

const GOBLIN_WARD_REVIVE_DIALOGUE: Partial<Record<string, readonly string[]>> = {
  wall: [
    'Stone had you fair and square.',
    'Lucky for you, some idiot bought paperwork.',
  ],
  self: [
    'You tied yourself into a funeral knot.',
    'I cut it. You owe the camp a nicer story.',
  ],
  boss: [
    'Big thing ate your future.',
    'I reached in and pulled out the cheap part.',
  ],
  shark: [
    'Teeth from below, clause from above.',
    'Do not look grateful. It makes the ink bubble.',
  ],
  bullet: [
    'Fast little metal thing. Very confident. Very wrong.',
    'Your contract caught it with its ugly little hands.',
  ],
  temperature: [
    'The air tried to repossess you.',
    'I repossessed you first. Different department.',
  ],
  water: [
    'The water signed for your body.',
    'I forged a better signature.',
  ],
  shielded: [
    'Protection bit you. Classic.',
    'The ward bit back harder.',
  ],
};

const FINAL_DIALOGUE_BRANCHES: readonly string[][] = [
  [
    'Well done, little serpent. Thy work is ended.',
    'Lay down thy score, thy hungers, and thy bright foolish errands.',
  ],
  [
    'The ledger closes, and it does not do so in anger.',
    'What was taken has been counted. What was learned may travel onward.',
  ],
  [
    'Thou didst serve life by moving through it until movement failed.',
    'May the next life greet thee with kinder walls and stranger fruit.',
  ],
];

const HEAVEN_DIALOGUE_BRANCHES: readonly string[][] = [
  [
    'Thy soul rises like incense on a still morning.',
    'The gates did not open for thee. They recognized thee.',
  ],
  [
    'A light took thee, and it was not unkind.',
    'Rest now, little serpent. Thy length has found its measure.',
  ],
  [
    'Thy body became dust. Thy length became light.',
    'Even snakes dream of flying, at the end.',
  ],
];

const HELL_DIALOGUE_BRANCHES: readonly string[][] = [
  [
    'Thy soul fell like a stone in a dry well.',
    'The fire did not rage. It merely opened and let thee through.',
  ],
  [
    'Down went the little serpent, all hunger and heat.',
    'Hell does not punish. It receives.',
  ],
  [
    'A darker current caught what the light would not.',
    'Even descent has its own geometry.',
  ],
];

const ANGEL_TAUNT_DIALOGUE: readonly string[][] = [
  [
    'Boldness is common among the recently dead.',
    'Mistake it not for courage. Courage requires the possibility of wisdom.',
  ],
  [
    'Thou barkest at the gate as though noise were a key.',
    'I have buried kings who made richer music with fewer teeth.',
  ],
  [
    'Again? Very well. Let mercy put on armor.',
    'Return to the living, little serpent. I shall meet thee there with hands unsoftened.',
  ],
];

const ANGEL_EXECUTION_DIALOGUE: readonly string[][] = [
  ['There. The mouth closes.', 'I have taken thy borrowed lives, every last bright coin of them.'],
  [
    'Look upon thy little score and call it a monument, if it comforts thee.',
    'The stone will not remember. I barely shall.',
  ],
  ['So much length, and still no reach.', 'Go now to the next life. Try arriving with less noise.'],
];

const LANGUAGE_SELECTOR_COST = 200;

type GameMode =
  | 'title'
  | 'action'
  | 'manual-room'
  | 'dialogue'
  | 'shop'
  | 'dating'
  | 'card-game'
  | 'death-cutscene'
  | 'paused';

const SIMULATION_MODE_RULES: Record<GameMode, Record<string, ClockRule>> = {
  title: { boss: false, action: false, actor: false, bullet: false, hazard: false, 'manual-world': false },
  action: { boss: true, action: true, actor: true, bullet: true, hazard: true, 'manual-world': false },
  'manual-room': { boss: false, action: 'manual', actor: false, bullet: true, hazard: false, 'manual-world': true },
  dialogue: { boss: false, action: false, actor: false, bullet: false, hazard: false, 'manual-world': false },
  shop: { boss: false, action: false, actor: false, bullet: false, hazard: false, 'manual-world': false },
  dating: { boss: false, action: false, actor: false, bullet: false, hazard: false, 'manual-world': false },
  'card-game': { boss: false, action: false, actor: false, bullet: false, hazard: false, 'manual-world': false },
  'death-cutscene': { boss: false, action: false, actor: false, bullet: false, hazard: false, 'manual-world': false },
  paused: { boss: false, action: false, actor: false, bullet: false, hazard: false, 'manual-world': false },
};

export default class SnakeScene extends Phaser.Scene {
  graphics!: Phaser.GameObjects.Graphics;
  readonly grid = defaultGameConfig.grid;

  public snakeGame!: SnakeGame;
  private questHud!: QuestHud;
  private questPopup!: QuestPopup;
  private villageShopPopup!: ChoicePopup;
  private datingScenePopup!: DatingScenePopup;
  private snakeRenderer!: SnakeRenderer;
  private minimapRenderer: MinimapRenderer | null = null;
  juice!: JuiceManager;
  skillTree!: SkillTreeManager;
  private bossHud!: BossHud;
  private saveUI!: SaveUI;
  private mobileControls: MobileControls | null = null;
  private activeBossId: string | null = null;
  private lastBossHealth: Map<string, number> = new Map();
  private powerupMusicActive = false;
  private houseMusicActive = false;
  private townMusicActive = false;
  private readonly featureManager = new FeatureManager();
  private readonly baseActionStepIntervalMs = 100;
  private readonly baseBossStepIntervalMs = 100;
  private readonly baseActorStepIntervalMs = 100;
  private readonly baseBulletStepIntervalMs = 100;
  private readonly baseHazardStepIntervalMs = 100;
  private actionStepIntervalMs = this.baseActionStepIntervalMs;
  private bossStepIntervalMs = this.baseBossStepIntervalMs;
  private actorStepIntervalMs = this.baseActorStepIntervalMs;
  private bulletStepIntervalMs = this.baseBulletStepIntervalMs;
  private hazardStepIntervalMs = this.baseHazardStepIntervalMs;
  private readonly simulationScheduler = new SimulationScheduler([
    {
      id: 'boss',
      intervalMs: this.bossStepIntervalMs,
      step: () => this.runBossClockStep(),
    },
    {
      id: 'action',
      intervalMs: this.actionStepIntervalMs,
      step: (stepMs) => this.runActionClockStep(stepMs),
    },
    {
      id: 'actor',
      intervalMs: this.actorStepIntervalMs,
      step: () => this.runActorClockStep(),
    },
    {
      id: 'bullet',
      intervalMs: this.bulletStepIntervalMs,
      step: () => this.runBulletClockStep(),
    },
    {
      id: 'hazard',
      intervalMs: this.hazardStepIntervalMs,
      step: () => this.runHazardClockStep(),
    },
    {
      id: 'manual-world',
      intervalMs: this.actionStepIntervalMs,
      step: (stepMs) => this.runManualRoomClockStep(stepMs),
    },
  ]);
  private houseHud!: Phaser.GameObjects.Text;
  private housePanel!: Phaser.GameObjects.Rectangle;
  private questHint!: Phaser.GameObjects.Text;
  private questHintPanel!: Phaser.GameObjects.Rectangle;
  private heartsHud!: Phaser.GameObjects.Text;
  private livesHud!: Phaser.GameObjects.Text;
  private temperatureHud!: Phaser.GameObjects.Text;
  private radiationHud!: Phaser.GameObjects.Text;
  private villageHud!: Phaser.GameObjects.Text;
  private biomeHud!: Phaser.GameObjects.Text;
  private performanceHud: Phaser.GameObjects.Text | null = null;
  private questGiverSprite!: Phaser.GameObjects.Sprite;
  private wandererSprite!: Phaser.GameObjects.Sprite;
  private choicePopupVisible = false;
  private readonly villageResidentSprites: Phaser.GameObjects.Sprite[] = [];
  private readonly villageResidentIndicatorTexts: Phaser.GameObjects.Text[] = [];
  private runtimeSpriteFactory!: RuntimeSpriteFactory;
  private houseRestCounter = 0;
  // Religion choice state
  private chosenReligionId: string | null = null;
  private religionMods: {
    tickDelayScalar?: number;
    wallSenseBonus?: number;
    seismicPulseBonus?: number;
    invulnerabilityBonus?: number;
    regenerator?: { interval: number; amount: number } | null;
    phoenixCharges?: number;
    masonryEnabled?: boolean;
    shrineBlessing?: boolean;
    yokaiInsight?: boolean;
    spiritualLength?: boolean;
  } = {};
  // Background and Class choice state
  private chosenBackgroundId: string | null = null;
  private backgroundMods: {
    tickDelayScalar?: number;
    wallSenseBonus?: number;
    seismicPulseBonus?: number;
    invulnerabilityBonus?: number;
    regenerator?: { interval: number; amount: number } | null;
    phoenixCharges?: number;
    masonryEnabled?: boolean;
  } = {};
  private chosenClassId: string | null = null;
  private classMods: {
    tickDelayScalar?: number;
    wallSenseBonus?: number;
    seismicPulseBonus?: number;
    invulnerabilityBonus?: number;
    regenerator?: { interval: number; amount: number } | null;
    phoenixCharges?: number;
    masonryEnabled?: boolean;
  } = {};

  paused = true;
  private isDirty = false;
  private currentApple: AppleSnapshot | null = null;
  private snakeCosmetics: SnakeCosmeticState = {
    unlockedThemes: ['classic'],
    activeTheme: 'classic',
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
  private lastJuicedScore = 0;
  private lastJuicedLength = 0;
  private nextDangerPulseAtMs = 0;
  private nextPowerupSparkAtMs = 0;
  private nextBabyCryAtMs = 0;
  private deathCutscene: DeathCutsceneState | null = null;
  private activeDatingSequence: DatingSequence | null = null;
  private titleContainer: Phaser.GameObjects.Container | null = null;
  private titleMainContainer: Phaser.GameObjects.Container | null = null;
  private titleSettingsContainer: Phaser.GameObjects.Container | null = null;
  private titleMessageText: Phaser.GameObjects.Text | null = null;
  private titleAnimatedObjects: Phaser.GameObjects.GameObject[] = [];
  private titleVisible = false;
  private cardGameContainer: Phaser.GameObjects.Container | null = null;
  private cardTooltipText: Phaser.GameObjects.Text | null = null;
  private performanceHudVisible = false;
  private performanceSampleMs = 0;
  private performanceSampleFrames = 0;
  private displayedFps = 0;

  constructor() {
    super('SnakeScene');
    this.flagsProxy = new Proxy<Record<string, unknown>>({} as Record<string, unknown>, {
      get: (_target, prop) => (typeof prop === 'string' ? this.getFlag(prop) : undefined),
      set: (_target, prop, value) => {
        if (typeof prop === 'string') {
          this.setFlag(prop, value);
        }
        return true;
      },
      deleteProperty: (_target, prop) => {
        if (typeof prop === 'string') {
          this.setFlag(prop, undefined);
        }
        return true;
      },
    });
  }

  private loadDatingPortraitAssets(): Promise<void> {
    const assets = DATING_PORTRAIT_ASSETS.filter((asset) => !this.textures.exists(asset.key));
    if (assets.length === 0) return Promise.resolve();

    return new Promise((resolve) => {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      for (const asset of assets) {
        this.load.svg(asset.key, asset.url, { width: 512, height: 512 });
      }
      this.load.start();
    });
  }

  async create() {
    this.graphics = this.add.graphics();
    // Reduce subpixel jitter and keep lines crisp during shake/zoom
    this.cameras.main.setRoundPixels(true);
    this.runtimeSpriteFactory = new RuntimeSpriteFactory(this);
    this.snakeRenderer = new SnakeRenderer(this, this.graphics, this.grid);
    this.minimapRenderer = new MinimapRenderer(this, {
      x: this.grid.cols * this.grid.cell - 222,
      y: 14,
      width: 216,
      height: 162,
      grid: this.grid,
      getRoom: (roomId) => this.snakeGame.getRoom(roomId),
    });
    this.juice = new JuiceManager(this);
    this.skillTree = new SkillTreeManager(this, this.juice, {
      baseActionStepIntervalMs: this.baseActionStepIntervalMs,
    });
    this.bossHud = new BossHud(this);
    console.log('[SnakeScene] About to create SaveUI');
    this.saveUI = new SaveUI(this);
    console.log('[SnakeScene] SaveUI created:', this.saveUI);
    console.log('[SnakeScene] saveUI exists:', !!this.saveUI);

    this.setupInputHandlers();

    this.mobileControls = createMobileControls({
      onDirection: (x, y) => {
        this.setDir(x, y);
        if (this.isManualHouseMovementActive()) {
          this.consumeManualResumePause();
          this.takeManualTurn();
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
    await this.loadDatingPortraitAssets();
    this.datingScenePopup = new DatingScenePopup(this);
    this.graphics.setDepth(0);

    const registry = await createQuestRegistry();
    this.snakeGame = new SnakeGame(defaultGameConfig, registry, this);

    await this.featureManager.load(this, defaultGameConfig.features.enabled);

    this.initGame(true);

    // House HUD overlay (hidden by default)
    this.houseHud = this.add
      .text(8, 8, '', { fontFamily: 'monospace', fontSize: '14px', color: '#f5f5f5' })
      .setDepth(30)
      .setVisible(false);
    this.housePanel = this.add
      .rectangle(0, 0, 160, 70, 0x000000, 0.35)
      .setOrigin(0, 0)
      .setDepth(29)
      .setVisible(false)
      .setStrokeStyle(1, 0xcfa77a, 0.6);

    this.questHint = this.add
      .text(8, 8, '', { fontFamily: 'monospace', fontSize: '14px', color: '#e8ffe8' })
      .setDepth(28)
      .setVisible(false);
    this.questHintPanel = this.add
      .rectangle(0, 0, 160, 40, 0x000000, 0.35)
      .setOrigin(0, 0)
      .setDepth(27)
      .setVisible(false)
      .setStrokeStyle(1, 0x6fd9b7, 0.6);
    this.heartsHud = this.add
      .text(8, this.grid.rows * this.grid.cell - 26, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ff8f8f',
      })
      .setDepth(28)
      .setVisible(false);
    this.livesHud = this.add
      .text(8, this.grid.rows * this.grid.cell - 48, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#fff3a8',
      })
      .setDepth(28)
      .setVisible(false);
    this.temperatureHud = this.add
      .text(8, this.grid.rows * this.grid.cell - 70, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#9ad1ff',
      })
      .setDepth(28)
      .setVisible(false);
    this.radiationHud = this.add
      .text((this.grid.cols * this.grid.cell) / 2, 8, '', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#7cff3a',
        stroke: '#06240b',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(34)
      .setVisible(false);
    this.villageHud = this.add
      .text((this.grid.cols * this.grid.cell) / 2, 18, '', {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: '20px',
        color: '#f6e7c1',
        stroke: '#21140d',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0)
      .setDepth(32)
      .setVisible(false);
    this.biomeHud = this.add
      .text((this.grid.cols * this.grid.cell) / 2, 42, '', {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: '18px',
        color: '#dfe8ff',
        stroke: '#140d21',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0)
      .setDepth(32)
      .setVisible(false);

    this.initQuestGiverSprite();
    this.initWandererSprite();
    this.showTitleScreen('main');
  }

  private setupInputHandlers(): void {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (this.titleVisible) {
        event.preventDefault();
        return;
      }
      if (this.deathCutscene) {
        if (this.questPopup.isVisible() || this.villageShopPopup.isVisible()) {
          return;
        }
        if ([' ', 'enter', 'e'].includes(key)) {
          event.preventDefault();
          this.advanceDeathCutscene();
        }
        return;
      }

      if (this.skillTree.handleTextInput(event)) {
        event.preventDefault();
        return;
      }

      if (key === ' ') {
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
        if (key === 'e' && this.snakeGame?.returnFromManualResumePause()) {
          event.preventDefault();
          this.isDirty = true;
          return;
        }
        if (['arrowup', 'w'].includes(key)) {
          this.setManualResumeDir(0, -1);
          this.consumeManualResumePause();
          this.takeManualTurn();
          return;
        }
        if (['arrowdown', 's'].includes(key)) {
          this.setManualResumeDir(0, 1);
          this.consumeManualResumePause();
          this.takeManualTurn();
          return;
        }
        if (['arrowleft', 'a'].includes(key)) {
          this.setManualResumeDir(-1, 0);
          this.consumeManualResumePause();
          this.takeManualTurn();
          return;
        }
        if (['arrowright', 'd'].includes(key)) {
          this.setManualResumeDir(1, 0);
          this.consumeManualResumePause();
          this.takeManualTurn();
          return;
        }
      }

      if (['arrowup', 'w'].includes(key)) this.setDir(0, -1);
      if (['arrowdown', 's'].includes(key)) this.setDir(0, 1);
      if (['arrowleft', 'a'].includes(key)) this.setDir(-1, 0);
      if (['arrowright', 'd'].includes(key)) this.setDir(1, 0);

      if (key === 't') this.showSaveUI();
      if (key === 'y') this.hideSaveUI();
      if (key === 'm') {
        const result = this.toggleMinimap();
        if (result) {
          this.showQuestHintPopup(result.message, result.color);
        }
      }

      if (key === 'e') {
        if (this.tryInteractQuestTarget()) {
          return;
        }
        if (this.tryInteractMcDonaldsCashier()) {
          return;
        }
        if (this.tryInteractMcDonaldsToilet()) {
          return;
        }
        if (this.tryInteractTown()) {
          return;
        }
        if (this.tryInteractLibertyStructure()) {
          return;
        }
        if (this.tryInteractRelationshipNpc()) {
          return;
        }
        if (this.tryInteractVillageShopkeeper()) {
          return;
        }
        if (this.tryInteractGoblinShopkeeper()) {
          return;
        }
        if (this.tryInteractQuestGiver()) {
          return;
        }
      }

      // Item equip/test keys removed; equipping is handled in the menu

      // House shop hotkeys (only when in house and not paused)
      if (!this.paused && this.isInHouse()) {
        if (key === '1') this.tryBuyHouse('couch');
        if (key === '2') this.tryBuyHouse('kitchen');
        if (key === '3') this.tryBuyHouse('expand');
        if (key === '4') this.tryBuyHouse('bed');
        if (key === '5') this.tryBuyHouse('plant');
        if (key === '6') this.tryBuyHouse('lamp');
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.deathCutscene) {
        if (this.questPopup.isVisible() || this.villageShopPopup.isVisible()) {
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
      const direction =
        Math.abs(dx) >= Math.abs(dy)
          ? { x: dx >= 0 ? 1 : -1, y: 0 }
          : { x: 0, y: dy >= 0 ? 1 : -1 };
      if (this.snakeGame.firePlayerShot(direction)) {
        this.isDirty = true;
      }
    });
  }

  private runActionClockStep(_stepMs: number): void {
    if (this.paused) {
      return;
    }
    this.runActionStep();
  }

  private runBossClockStep(): void {
    if (this.paused) {
      return;
    }
    this.snakeGame.bossStep();
  }

  private runActorClockStep(): void {
    if (this.paused) {
      return;
    }
    const result = this.snakeGame.actorClockStep();
    if (!result) {
      return;
    }
    if (this.handleStepDeath(result)) {
      return;
    }
    if (this.handlePhoenixReviveTrigger()) {
      return;
    }
    if (result.apple.stateChanged || result.roomChanged || result.roomsChanged.size > 0) {
      this.markStaticRoomsDirty(result.roomsChanged);
      this.isDirty = true;
    }
  }

  private runHazardClockStep(): void {
    if (this.paused) {
      return;
    }
    const result = this.snakeGame.hazardClockStep();
    if (!result) {
      return;
    }
    if (this.handleStepDeath(result) || this.handlePhoenixReviveTrigger()) {
      return;
    }
    if (result.apple.stateChanged || result.roomChanged || result.roomsChanged.size > 0) {
      this.markStaticRoomsDirty(result.roomsChanged);
      this.isDirty = true;
    }
  }

  private runBulletClockStep(): void {
    if (this.paused) {
      return;
    }
    const result = this.snakeGame.bulletClockStep();
    if (!result) {
      return;
    }
    if (this.handleStepDeath(result) || this.handlePhoenixReviveTrigger()) {
      return;
    }
    if (result.apple.stateChanged || result.roomChanged || result.roomsChanged.size > 0) {
      this.markStaticRoomsDirty(result.roomsChanged);
      this.isDirty = true;
    }
  }

  private runManualRoomClockStep(_stepMs: number): void {
    if (this.paused) {
      return;
    }
    this.updateHouseAmbience();
    this.tickHouseAmbientEffects();
    this.skillTree.tick();
    this.isDirty = true;
  }

  private markStaticRoomsDirty(roomIds: ReadonlySet<string>): void {
    for (const roomId of roomIds) {
      this.snakeRenderer.markStaticRoomDirty(roomId);
    }
  }

  private advanceSimulationTime(deltaMs: number): void {
    const elapsed = Number(this.getFlag<number>('timeMs') ?? 0) + deltaMs;
    this.setFlag('timeMs', elapsed);
  }

  private initGame(startPaused = true): void {
    this.setBossStepIntervalMs(this.baseBossStepIntervalMs);
    this.setActorStepIntervalMs(this.baseActorStepIntervalMs);
    this.setBulletStepIntervalMs(this.baseBulletStepIntervalMs);
    this.setHazardStepIntervalMs(this.baseHazardStepIntervalMs);
    this.simulationScheduler.resetClock('boss');
    this.simulationScheduler.resetClock('action');
    this.simulationScheduler.resetClock('actor');
    this.simulationScheduler.resetClock('bullet');
    this.simulationScheduler.resetClock('hazard');
    this.simulationScheduler.resetClock('manual-world');
    this.skillTree.reset(startPaused);
    // Reset equipment effects (no equipment contributes to tick delay until equipped)
    this.skillTree.applyActionStepIntervalScalar(1, 'equipment:boots');
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
    this.lastJuicedScore = this.snakeGame.getScore();
    this.lastJuicedLength = this.snakeGame.getSnakeLength();
    this.nextDangerPulseAtMs = 0;
    this.nextPowerupSparkAtMs = 0;
    this.snakeCosmetics = {
      unlockedThemes: ['classic'],
      activeTheme: 'classic',
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

  private runActionStep(): void {
    const scoreBefore = this.snakeGame.getScore();
    const lengthBefore = this.snakeGame.getSnakeLength();
    const result = this.snakeGame.actionStep(this.paused);
    this.updateHouseAmbience();

    if (this.handleStepDeath(result) || this.handlePhoenixReviveTrigger()) {
      return;
    }

    this.featureManager.call('onActionStep', this);

    this.currentApple = result.apple.current ?? null;
    this.updateBossEncounter();
    this.maybePresentRandomEncounter();

    if (result.apple.eaten) {
      this.featureManager.call('onAppleEaten', this);
      this.applyJadePeakAppleEffects(result.apple.typeId);
      if (result.apple.worldPosition) {
        const violenceLevel = Number(this.getFlag<number>('killstreak.appleJuiceLevel') ?? 0);
        this.juice.appleChomp(
          result.apple.worldPosition.x,
          result.apple.worldPosition.y,
          violenceLevel,
        );
        const streak = Number(this.getFlag<number>('appleStreak') ?? 0);
        this.juice.appleStreak(
          result.apple.worldPosition.x,
          result.apple.worldPosition.y,
          streak,
        );
        if (
          this.snakeGame.getCurrentRoom().biomeId === 'liberty-badlands' &&
          this.snakeGame.getCurrentRoom().archetypeId === 'gridiron-yard'
        ) {
          (this.juice as any).gridironCrowdRoar?.(
            result.apple.worldPosition.x,
            result.apple.worldPosition.y,
          );
        }
        this.setFlag('killstreak.appleJuiceLevel', undefined);
      }
    }

    this.tickHouseAmbientEffects();

    const consumedPhoenix = this.snakeGame.getFlag<{ itemId: string }>(
      'equipment.itemPhoenixConsumed',
    );
    if (consumedPhoenix) {
      this.applyEquipmentEffects();
      const item = getItem(consumedPhoenix.itemId);
      this.showQuestHintPopup(`${item?.name ?? 'Phoenix charm'} burned away.`, '#fff3a8');
      this.snakeGame.setFlag('equipment.itemPhoenixConsumed', undefined);
    }

    const questInteraction = this.snakeGame.getFlag<{ message?: string }>('ui.questInteraction');
    if (questInteraction?.message) {
      this.showQuestHintPopup(questInteraction.message, '#9ad1ff');
      this.snakeGame.setFlag('ui.questInteraction', undefined);
    }
    const relationshipEvent = this.snakeGame.getFlag<{
      title?: string;
      message?: string;
      color?: string;
    }>('ui.relationshipEvent');
    if (relationshipEvent?.message) {
      this.showQuestHintPopup(relationshipEvent.message, relationshipEvent.color ?? '#ffbdfd');
      this.snakeGame.setFlag('ui.relationshipEvent', undefined);
      this.skillTree.getOverlay().refresh();
    }
    const animalHunted = this.snakeGame.getFlag<boolean | { message?: string }>('ui.animalHunted');
    if (typeof animalHunted === 'object' && animalHunted?.message) {
      this.showQuestHintPopup(animalHunted.message, '#b6ff6a');
      this.snakeGame.setFlag('ui.animalHunted', undefined);
      this.skillTree.getOverlay().refresh();
    } else if (animalHunted === true) {
      this.showQuestHintPopup('Animal hunted.', '#b6ff6a');
      this.snakeGame.setFlag('ui.animalHunted', undefined);
    }
    const animalStartled = this.snakeGame.getFlag<{ count?: number }>('ui.animalStartled');
    if (animalStartled) {
      this.showQuestHintPopup('The animal startles away. Unlock Predator I or use a weapon to hunt harmless animals.', '#ffd166');
      this.snakeGame.setFlag('ui.animalStartled', undefined);
    }
    const animalTamable = this.snakeGame.getFlag<{ animalName?: string }>('ui.animalTamable');
    if (animalTamable) {
      this.showQuestHintPopup(`${animalTamable.animalName ?? 'That animal'} can be tamed with the right lead.`, '#9ad1ff');
      this.snakeGame.setFlag('ui.animalTamable', undefined);
    }
    this.tickFreakYouPortalFx();

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
      this.markStaticRoomsDirty(result.roomsChanged);
      this.isDirty = true;
    }

    // Powerup pickup FX and music start
    const pfx = this.snakeGame.getFlag<{
      x: number;
      y: number;
      roomId: string;
      kind: 'phase' | 'smite' | 'gun';
    }>('ui.powerupPickup');
    if (pfx) {
      const world = this.tileToWorldInRoom({ x: pfx.x, y: pfx.y }, pfx.roomId);
      (this.juice as any).powerupPickup?.(world.x, world.y, pfx.kind);
      // Start powerup music with duration derived from active ticks if available
      const active = this.snakeGame.getFlag<{ kind: string; remaining: number; total: number }>(
        'powerup.active',
      );
      if (active && typeof active.total === 'number') {
        const durationMs = Math.max(1, active.total) * this.actionStepIntervalMs;
        (this.juice as any).startPowerupMusic?.(durationMs);
        this.powerupMusicActive = true;
      }
      // Popup text announcing the powerup
      const name = pfx.kind === 'phase' ? 'Phase' : pfx.kind === 'smite' ? 'Smite' : 'Gun';
      const text = this.add
        .text(world.x, world.y - 12, `+ Powerup: ${name}`, {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#9b5de5',
        })
        .setDepth(26)
        .setOrigin(0.5, 1)
        .setAlpha(0.98)
        .setScale(1.0);
      this.tweens.add({
        targets: text,
        y: world.y - 60,
        alpha: 0,
        scale: 1.15,
        duration: 1600,
        ease: 'Cubic.easeOut',
        onComplete: () => text.destroy(),
      });
      this.snakeGame.setFlag('ui.powerupPickup', undefined);
    }

    // Stop powerup music when effect ends
    const active = this.snakeGame.getFlag<{ kind: string; remaining: number; total: number }>(
      'powerup.active',
    );
    if (!active && this.powerupMusicActive) {
      (this.juice as any).stopPowerupMusic?.();
      this.powerupMusicActive = false;
    }

    // Room transition pulse from snake head
    if (result.roomChanged) {
      const currHead = this.getFlag<{ x: number; y: number }>('internal.currentHead');
      const [roomX, roomY] = this.currentRoomId.split(',').map(Number);
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
    this.handleRunDeltaFeedback(scoreBefore, lengthBefore);

    // Boss smite FX on collision
    const smite = this.snakeGame.getFlag<{ x: number; y: number; roomId: string }>('ui.bossSmite');
    if (smite) {
      const world = this.tileToWorldInRoom({ x: smite.x, y: smite.y }, smite.roomId);
      (this.juice as any).bossHit?.(world.x, world.y);
      this.snakeGame.setFlag('ui.bossSmite', undefined);
    }

    this.isDirty = true;
  }

  private handleStepDeath(result: ReturnType<SnakeGame['actionStep']>): boolean {
    if (result.status !== 'dead') {
      return false;
    }
    this.reportDeathDebug(result.deathReason);
    if (this.wasKilledByInsultedAngel(result.deathReason)) {
      this.clearAllLifeSources();
      this.startDeathSequence('game-over', result.deathReason, { slainByAngel: true });
      return true;
    }
    if (this.snakeGame.tryConsumeWardForDeath(result.deathReason)) {
      this.snakeGame.setFlag('fortitude.phoenixTriggered', undefined);
      this.skillTree.hideOverlay();
      this.startDeathSequence('revive', result.deathReason, {
        reviveOnComplete: true,
        rescuer: 'goblin-angel',
      });
      return true;
    }
    if (this.skillTree.tryConsumeExtraLife()) {
      this.skillTree.hideOverlay();
      this.startDeathSequence('revive', result.deathReason, { reviveOnComplete: true });
      return true;
    }
    this.startDeathSequence('game-over', result.deathReason);
    return true;
  }

  private handlePhoenixReviveTrigger(): boolean {
    const phoenixTriggered = this.snakeGame.getFlag<{ reason?: string | null }>(
      'fortitude.phoenixTriggered',
    );
    if (!phoenixTriggered) {
      return false;
    }
    this.snakeGame.setFlag('fortitude.phoenixTriggered', undefined);
    this.startDeathSequence('revive', phoenixTriggered.reason ?? 'extra-life', {
      reviveOnComplete: false,
    });
    return true;
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
    this.resumeGameplayAfterModal();
  }

  private tickHouseAmbientEffects(): void {
    const insideInterior = this.isInPlayerHouseInterior();
    if (!insideInterior) {
      this.houseRestCounter = 0;
      return;
    }

    if (this.isInHouse()) {
      this.setFlag('timeSinceEat', 0);
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
        if (room.layout[yy][xx] === 'L') {
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
    this.snakeGame.setFlag('debug.lastDeathSnapshot', snapshot);
    console.groupCollapsed(
      `[Death Debug] ${snapshot.reason ?? 'unknown'} at ${snapshot.roomId} local (${snapshot.local.x}, ${snapshot.local.y}) world (${snapshot.world.x}, ${snapshot.world.y}) tile "${snapshot.tile ?? '?'}"`,
    );
    console.log('summary', {
      reason: snapshot.reason,
      roomId: snapshot.roomId,
      world: snapshot.world,
      local: snapshot.local,
      tile: snapshot.tile,
      direction: snapshot.direction,
      selfCollision: snapshot.selfCollision,
    });
    if (snapshot.selfCollision) {
      console.log('selfCollision', JSON.stringify(snapshot.selfCollision));
    }
    for (const room of snapshot.rooms) {
      console.log(`${room.roomId} ${room.biomeTitle} (${room.biomeId})\n${room.layout.join('\n')}`);
    }
    console.groupEnd();
  }

  private showQuestDialogue(
    title: string,
    pages: string[],
    callbacks: { onAccept?: () => void; onReject?: () => void; onClose?: () => void },
    labels?: {
      acceptLabel?: string;
      rejectLabel?: string;
      nextLabel?: string;
      closeLabel?: string;
    },
    speaker?: { portraitId?: string },
  ): void {
    this.paused = true;
    this.skillTree.hideOverlay();
    this.questPopup.showDialogue(title, pages, callbacks, labels, speaker);
    this.isDirty = true;
  }

  private showQuestHintPopup(message: string, color = '#ffe58a'): void {
    const maxWidth = Math.min(720, this.scale.width - 48);
    const x = this.scale.width / 2;
    const y = 76;
    const noticeColor = Phaser.Display.Color.HexStringToColor(color).color;
    const urgent = color.toLowerCase() === "#ff6b6b" || color.toLowerCase() === "#ff3b3b";
    this.juice.notice(x, y, noticeColor, urgent);
    const text = this.add
      .text(0, 0, message, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color,
        align: 'center',
        stroke: '#05070b',
        strokeThickness: 5,
        wordWrap: { width: maxWidth - 34 },
      })
      .setOrigin(0.5, 0.5);
    const bounds = text.getBounds();
    const panel = this.add
      .rectangle(0, 0, Math.min(maxWidth, bounds.width + 46), bounds.height + 28, 0x071019, 0.88)
      .setStrokeStyle(3, 0x5dd6a2, 0.82)
      .setOrigin(0.5, 0.5);
    const popup = this.add.container(x, y, [panel, text]).setDepth(72).setAlpha(0).setScale(0.86);
    this.tweens.add({
      targets: popup,
      alpha: 1,
      scale: 1,
      duration: 130,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: popup,
      y: y - 28,
      alpha: 0,
      duration: 1050,
      delay: 780,
      ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  private gameOver(reason?: string | null) {
    this.juice.gameOver();
    this.featureManager.call('onGameOver', this);
    this.initGame(true);
    this.showTitleScreen('main');
    this.skillTree.hideOverlay();
    this.paused = true;
    console.log('Game over:', reason);
  }

  private startDeathSequence(
    mode: DeathCutsceneMode,
    reason?: string | null,
    options: { reviveOnComplete?: boolean; slainByAngel?: boolean; rescuer?: DeathRescuer } = {},
  ): void {
    if (reason === 'water') {
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
      .ellipse(
        world.x + this.grid.cell / 2,
        world.y + this.grid.cell / 2,
        this.grid.cell * 0.2,
        this.grid.cell * 0.1,
        0x7edcff,
        0.75,
      )
      .setDepth(70)
      .setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.add
      .ellipse(
        world.x + this.grid.cell / 2,
        world.y + this.grid.cell / 2,
        this.grid.cell * 0.7,
        this.grid.cell * 0.26,
        0x0b4f7a,
        0,
      )
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
          0.85,
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
        ease: 'Sine.easeOut',
      });
    }

    this.tweens.add({
      targets: puddle,
      scaleX: 4.2,
      scaleY: 2.6,
      alpha: 0.95,
      duration: 360,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: ring,
      scaleX: 1.8,
      scaleY: 1.45,
      alpha: 0,
      duration: 720,
      ease: 'Sine.easeOut',
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
    options: { reviveOnComplete?: boolean; slainByAngel?: boolean; rescuer?: DeathRescuer } = {},
  ): void {
    if (this.deathCutscene) {
      return;
    }

    this.paused = true;
    this.hideSaveUI();
    this.skillTree.hideOverlay();
    this.ensureAngelTexture();
    this.ensureGoblinAngelTexture();
    this.juice.startHeavenMusic();

    const width = this.grid.cols * this.grid.cell;
    const height = this.grid.rows * this.grid.cell;
    const rescuer = options.rescuer ?? 'angel';
    const isGoblinAngel = rescuer === 'goblin-angel';
    const container = this.add.container(0, 0).setDepth(80);
    const fade = this.add
      .rectangle(0, 0, width, height, isGoblinAngel ? 0xd8ff9a : 0xffffff, 1)
      .setOrigin(0, 0)
      .setAlpha(0);
    const angel = this.add
      .image(width / 2, height * 0.38, isGoblinAngel ? GOBLIN_ANGEL_TEXTURE_KEY : ANGEL_TEXTURE_KEY)
      .setOrigin(0.5)
      .setScale(8.5)
      .setAlpha(0)
      .setTint(isGoblinAngel ? 0xcaff76 : 0xfffbdf);
    const halo = this.add
      .ellipse(width / 2, height * 0.17, width * 0.42, 44, isGoblinAngel ? 0x93d146 : 0xfff4a8, 0.35)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    container.add([fade, halo, angel]);
    const afterlifeDestination: AfterlifeDestination | undefined =
      mode === 'game-over' ? (this.random() < 0.5 ? 'heaven' : 'hell') : undefined;
    this.deathCutscene = {
      mode,
      reason,
      container,
      canAdvance: false,
      completed: false,
      reviveOnComplete: options.reviveOnComplete ?? mode === 'revive',
      taunts: 0,
      angelBossOnRevive: false,
      slainByAngel: options.slainByAngel ?? false,
      rescuer,
      afterlifeDestination,
      phase: 'angel-dialogue',
      afterlifeDialogueShown: false,
    };

    this.tweens.add({ targets: fade, alpha: 1, duration: 650, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: halo, alpha: 1, duration: 900, delay: 350, ease: 'Sine.easeOut' });
    this.tweens.add({
      targets: angel,
      alpha: 1,
      scale: 9.25,
      y: height * 0.35,
      duration: 1100,
      delay: 420,
      ease: 'Cubic.easeOut',
    });
    this.time.delayedCall(1250, () => this.showAngelDeathDialogue());
  }

 private advanceDeathCutscene(): void {
    const cutscene = this.deathCutscene;
    if (!cutscene || !cutscene.canAdvance || cutscene.completed) {
      return;
    }

    if (cutscene.mode === 'revive') {
      this.finalizeDeathCutscene(cutscene);
      return;
    }

    const phase = cutscene.phase;
    if (phase === 'angel-dialogue') {
      cutscene.phase = 'afterlife';
      cutscene.canAdvance = false;
      this.startAfterlifeCutscene();
      return;
    }

    if (phase === 'afterlife') {
      cutscene.phase = 'final';
      cutscene.canAdvance = false;
      this.showFinalDialogue();
      return;
    }

    if (phase === 'final') {
      this.finalizeDeathCutscene(cutscene);
      return;
    }
  }

  private finalizeDeathCutscene(cutscene: DeathCutsceneState): void {
    cutscene.completed = true;
    this.questPopup.hide();
    this.villageShopPopup.hide();
    this.tweens.add({
      targets: cutscene.container,
      alpha: 0,
      duration: 260,
      ease: 'Sine.easeIn',
      onComplete: () => {
        cutscene.container.destroy(true);
        this.deathCutscene = null;
        this.questPopup.setDepth(20);
        this.juice.stopHeavenMusic();
        (this.juice as any).stopHellMusic?.();
        if (cutscene.mode === 'revive') {
          this.snakeGame.setFlag('fortitude.phoenixTriggered', undefined);
          if (cutscene.reviveOnComplete) {
            this.snakeGame.reviveAfterExtraLife(cutscene.reason);
          }
          this.paused = false;
          this.currentApple = this.snakeGame.getApple(this.snakeGame.getCurrentRoom().id);
          this.showSaveUI();
          this.isDirty = true;
          return;
        }
        this.gameOver(cutscene.reason);
      },
    });
  }

  private showFinalDialogue(): void {
    const cutscene = this.deathCutscene;
    if (!cutscene) return;

    this.questPopup.setDepth(90);
    cutscene.canAdvance = false;
    const pages = this.composeRunSummary();
    this.questPopup.showDialogue(
      'The Ledger',
      pages,
      {
        onAccept: () => {
          cutscene.canAdvance = true;
          this.advanceDeathCutscene();
        },
      },
      { nextLabel: 'Listen', closeLabel: 'Close the ledger' },
      { portraitId: 'sage-3' },
    );
  }

  private showAngelDeathDialogue(): void {
    const cutscene = this.deathCutscene;
    if (!cutscene || cutscene.completed) {
      return;
    }

    this.questPopup.setDepth(90);
    cutscene.canAdvance = false;

    const pages =
      cutscene.rescuer === 'goblin-angel'
        ? this.composeGoblinWardReviveDialogue()
        : cutscene.slainByAngel
          ? this.composeAngelExecutionDialogue()
          : this.composeDeathDialogue(
              cutscene.mode,
              cutscene.mode === 'game-over' ? this.composeRunSummary() : [],
            );

    if (cutscene.mode === 'revive') {
      this.questPopup.showDialogue(
        cutscene.rescuer === 'goblin-angel' ? 'The Goblin Angel' : 'The Angel',
        pages,
        {
          onClose: () => this.showDeathRescuerChoice(),
        },
        {
          nextLabel: 'Listen',
          closeLabel: 'Answer',
        },
        { portraitId: cutscene.rescuer === 'goblin-angel' ? 'goblin-hostile' : 'sage-3' },
      );
      return;
    }

    this.questPopup.showDialogue(
      'The Angel',
      pages,
      {
        onClose: () => {
          cutscene.canAdvance = true;
          this.advanceDeathCutscene();
        },
      },
      { nextLabel: 'Listen', closeLabel: 'Begin again' },
      { portraitId: 'sage-3' },
    );
  }

  private showDeathRescuerChoice(): void {
    const cutscene = this.deathCutscene;
    if (!cutscene || cutscene.mode !== 'revive' || cutscene.completed) {
      return;
    }
    this.questPopup.hide();
    const isGoblinAngel = cutscene.rescuer === 'goblin-angel';
    this.setChoicePopupVisible(true);
    this.villageShopPopup.show(
      isGoblinAngel ? 'The Goblin Angel' : 'The Angel',
      [
        {
          id: 'return',
          title: isGoblinAngel ? 'Pay the debt' : 'Return',
          description: 'Accept the rescue and go back to the living board.',
        },
        {
          id: 'defy',
          title: isGoblinAngel ? 'Complain' : 'Taunt',
          description: 'Make the supernatural authority reconsider mercy.',
        },
        {
          id: 'romance',
          title: isGoblinAngel ? 'Flirt with the fine print' : 'Romance',
          description: 'Explicitly open the death-rescuer romance route.',
        },
      ],
      (id) => {
        this.setChoicePopupVisible(false);
        if (id === 'return') {
          cutscene.canAdvance = true;
          this.advanceDeathCutscene();
          return;
        }
        if (id === 'defy') {
          isGoblinAngel ? this.complainToGoblinAngel() : this.tauntAngel();
          return;
        }
        this.resolveDeathRescuerRomance(cutscene.rescuer);
      },
    );
    this.villageShopPopup.setDepth(95);
  }

  private resolveDeathRescuerRomance(rescuer: DeathRescuer): void {
    const cutscene = this.deathCutscene;
    if (!cutscene || cutscene.completed) {
      return;
    }
    const result = this.snakeGame.romanceDeathRescuer(rescuer);
    const strong = result.state?.stage === 'dating' || result.state?.stage === 'lover';
    this.questPopup.showDialogue(
      rescuer === 'goblin-angel' ? 'The Goblin Angel' : 'The Angel',
      [
        result.message,
        strong
          ? rescuer === 'goblin-angel'
            ? 'A clause unfolds where a threat used to be. Somehow, this is worse and better.'
            : 'The light does not soften. It simply makes room for you inside its judgment.'
          : 'The offer survives as a dangerous annotation in the ledger of death.',
      ],
      {
        onClose: () => {
          cutscene.canAdvance = true;
          this.advanceDeathCutscene();
        },
      },
      { nextLabel: 'Listen', closeLabel: strong ? 'Live, somehow' : 'Return' },
      { portraitId: rescuer === 'goblin-angel' ? 'goblin-hostile' : 'sage-3' },
    );
  }

  private tauntAngel(): void {
    const cutscene = this.deathCutscene;
    if (!cutscene || cutscene.mode !== 'revive' || cutscene.completed) {
      return;
    }

    cutscene.taunts += 1;
    const tauntIndex = Math.min(cutscene.taunts - 1, ANGEL_TAUNT_DIALOGUE.length - 1);
    const pages = ANGEL_TAUNT_DIALOGUE[tauntIndex] ?? ANGEL_TAUNT_DIALOGUE[0];

    if (cutscene.taunts >= ANGEL_TAUNT_DIALOGUE.length) {
      cutscene.angelBossOnRevive = true;
      this.questPopup.showDialogue(
        'The Angel',
        [...pages],
        {
          onClose: () => {
            cutscene.canAdvance = true;
            this.advanceDeathCutscene();
          },
        },
        { nextLabel: 'Listen', closeLabel: 'Return' },
        { portraitId: 'sage-2' },
      );
      return;
    }

    this.questPopup.showDialogue(
      'The Angel',
      [...pages],
      {
        onAccept: () => {
          cutscene.canAdvance = true;
          this.advanceDeathCutscene();
        },
        onReject: () => this.tauntAngel(),
      },
      { acceptLabel: 'Return', rejectLabel: 'Taunt again', nextLabel: 'Listen' },
      { portraitId: 'sage-2' },
    );
  }

  private complainToGoblinAngel(): void {
    const cutscene = this.deathCutscene;
    if (!cutscene || cutscene.mode !== 'revive' || cutscene.completed) {
      return;
    }
    cutscene.taunts += 1;
    const pages =
      cutscene.taunts <= 1
        ? [
            'Complain? Wonderful. The contract includes listening fees.',
            'I will add them to the imaginary invoice I keep inside your terror.',
          ]
        : [
            'No more appeals. No more squeaking.',
            'Back to life with you before I start charging interest in organs.',
          ];
    this.questPopup.showDialogue(
      'The Goblin Angel',
      pages,
      {
        onClose: () => {
          cutscene.canAdvance = true;
          this.advanceDeathCutscene();
        },
      },
      { nextLabel: 'Listen', closeLabel: 'Pay the debt' },
      { portraitId: 'goblin-hostile' },
    );
  }

  private clearAllLifeSources(): void {
    this.skillTree.clearExtraLifeCharges();
    this.setFlag('equipment.phoenixCharges', 0);
    this.setFlag('fortitude.phoenix', { charges: 0 });
    this.setFlag('fortitude.phoenixTriggered', undefined);
    this.setFlag('ui.livesRevealed', true);
    this.lastVisibleLifeCharges = 0;
  }

  private wasKilledByInsultedAngel(reason?: string | null): boolean {
    if (this.getFlag<boolean>('boss.insultedAngel')) {
      return true;
    }
    if (this.getFlag<string>('internal.killedByBossKind') === 'angel') {
      return true;
    }
    return (
      reason === 'boss' &&
      this.snakeGame.getBosses(this.currentRoomId).some((boss) => boss.kind === 'angel')
    );
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

  private composeGoblinWardReviveDialogue(): string[] {
    const reason = this.deathCutscene?.reason ?? 'unknown';
    const reasonLines = GOBLIN_WARD_REVIVE_DIALOGUE[reason] ?? [
      'Something killed you. Very sad. Very billable.',
      'The ward fired first, so your regular lives stay in their little pouch.',
    ];
    return [
      'Hold still. Your soul is slippery and badly labeled.',
      ...reasonLines,
      'The goblins have honored the contract. Try not to make that our mistake.',
    ];
  }

  private composeDeathDialogue(mode: DeathCutsceneMode, runSummary: readonly string[]): string[] {
    const opening = this.pickDialogueBranch(DEATH_DIALOGUE_BRANCHES);
    const reasonLines = this.getDeathReasonDialogue(this.deathCutscene?.reason);
    if (mode === 'revive') {
      return [...opening, ...reasonLines, ...this.pickDialogueBranch(REVIVE_DIALOGUE_BRANCHES)];
    }
    return [
      ...opening,
      ...reasonLines,
      ...this.pickDialogueBranch(FINAL_DIALOGUE_BRANCHES),
      ...runSummary,
    ];
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
      Number(this.getFlag<number>('roomsVisited') ?? 1),
    );
    const quests = this.completedQuests;
    const treasure = Number(this.getFlag<number>('treasurePicked') ?? 0);
    const powerups = Number(this.getFlag<number>('powerupsPicked') ?? 0);
    const streak = Number(this.getFlag<number>('appleStreakMax') ?? 0);
    const summary = [`Score ${this.score}. Length ${length}. Rooms crossed ${rooms}.`];

    if (quests.length > 0) {
      summary.push(
        `Vows fulfilled: ${quests.slice(0, 3).join(', ')}${quests.length > 3 ? ', and more' : ''}.`,
      );
    }
    if (treasure > 0 || powerups > 0) {
      summary.push(`Relics claimed ${treasure}; brief miracles taken ${powerups}.`);
    }
    if (streak > 1) {
      summary.push(`Longest hunger-chain: ${streak}.`);
    }
    if (summary.length === 1) {
      summary.push('No great deed is wasted merely because it was small.');
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
    px(17, 2, 14, 3, '#f8d76a');
    px(14, 5, 20, 2, '#fff2a8');
    mirror(
      [
        [9, 9, 9, 4],
        [6, 13, 13, 5],
        [3, 18, 16, 7],
        [0, 25, 17, 8],
        [5, 33, 12, 5],
      ],
      '#eef8ff',
    );
    mirror(
      [
        [12, 13, 7, 4],
        [9, 19, 9, 5],
        [5, 27, 11, 4],
      ],
      '#cfe4ff',
    );
    px(18, 10, 12, 10, '#f4d0a3');
    px(16, 18, 16, 4, '#d8a97f');
    px(14, 22, 20, 18, '#fff7dc');
    px(17, 24, 14, 13, '#eadfac');
    px(20, 13, 2, 2, '#1c1920');
    px(26, 13, 2, 2, '#1c1920');
    px(22, 17, 4, 1, '#6f4f52');
    px(20, 40, 3, 6, '#e7dca8');
    px(25, 40, 3, 6, '#e7dca8');
    mirror(
      [
        [12, 24, 3, 12],
        [9, 29, 3, 8],
      ],
      '#fffaf0',
    );
    texture.refresh();
  }

  private ensureGoblinAngelTexture(): void {
    if (this.textures.exists(GOBLIN_ANGEL_TEXTURE_KEY)) {
      return;
    }

    const texture = this.textures.createCanvas(GOBLIN_ANGEL_TEXTURE_KEY, 48, 48);
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
    px(15, 3, 18, 3, '#b6d94a');
    px(11, 6, 26, 2, '#6f8f22');
    mirror(
      [
        [7, 10, 10, 5],
        [4, 16, 13, 6],
        [1, 23, 15, 8],
        [5, 33, 10, 6],
      ],
      '#9fb35c',
    );
    mirror(
      [
        [10, 15, 7, 4],
        [7, 23, 8, 5],
      ],
      '#5d6f2d',
    );
    px(17, 10, 14, 10, '#7db24a');
    px(15, 18, 18, 4, '#405719');
    px(14, 22, 20, 18, '#5b6f28');
    px(18, 24, 12, 13, '#28350f');
    px(20, 13, 3, 2, '#0b1005');
    px(26, 13, 3, 2, '#0b1005');
    px(22, 17, 6, 1, '#d8f08a');
    px(19, 20, 3, 3, '#d8f08a');
    px(27, 20, 3, 3, '#d8f08a');
    px(19, 40, 4, 6, '#28350f');
    px(25, 40, 4, 6, '#28350f');
    mirror(
      [
        [11, 25, 3, 11],
        [8, 31, 3, 7],
      ],
      '#6f8f22',
    );
    texture.refresh();
  }

  private ensureHeavenSnakeTexture(): void {
    if (this.textures.exists(HEAVEN_SNAKE_TEXTURE_KEY)) {
      return;
    }
    const texture = this.textures.createCanvas(HEAVEN_SNAKE_TEXTURE_KEY, 16, 16);
    const context = texture.getContext();
    context.imageSmoothingEnabled = false;
    const p = (x: number, y: number, w: number, h: number, color: string): void => {
      context.fillStyle = color;
      context.fillRect(x, y, w, h);
    };
    context.clearRect(0, 0, 16, 16);
    const body = '#ffe066';
    const light = '#fff4a8';
    const dark = '#c9a824';
    const eye = '#fff';
    for (let i = 0; i < 6; i++) {
      p(5 + i, 5 + (i % 2), 2, 2, body);
      p(5 + i, 6 + (i % 2) * 0, 1, 1, light);
    }
    p(10, 5, 2, 2, eye);
    p(10, 6, 1, 1, '#1a1a2e');
    for (let i = 0; i < 4; i++) {
      p(6 + i, 4, 1, 1, dark);
      p(6 + i, 8, 1, 1, dark);
    }
    p(11, 5, 2, 1, light);
    texture.refresh();
  }

  private ensureHellSnakeTexture(): void {
    if (this.textures.exists(HELL_SNAKE_TEXTURE_KEY)) {
      return;
    }
    const texture = this.textures.createCanvas(HELL_SNAKE_TEXTURE_KEY, 16, 16);
    const context = texture.getContext();
    context.imageSmoothingEnabled = false;
    const p = (x: number, y: number, w: number, h: number, color: string): void => {
      context.fillStyle = color;
      context.fillRect(x, y, w, h);
    };
    context.clearRect(0, 0, 16, 16);
    const body = '#cc2222';
    const light = '#ff5555';
    const dark = '#661111';
    const eye = '#ffcc00';
    for (let i = 0; i < 6; i++) {
      p(5 + i, 5 + (i % 2), 2, 2, body);
      p(5 + i, 6, 1, 1, light);
    }
    p(10, 5, 2, 2, eye);
    p(10, 6, 1, 1, '#1a0000');
    for (let i = 0; i < 4; i++) {
      p(6 + i, 4, 1, 1, dark);
      p(6 + i, 8, 1, 1, dark);
    }
    p(11, 5, 2, 1, light);
    texture.refresh();
  }

  private startAfterlifeCutscene(): void {
    const cutscene = this.deathCutscene;
    if (!cutscene) return;

    const destination = cutscene.afterlifeDestination;
    if (!destination) return;

    this.juice.stopHeavenMusic();
    if (destination === 'hell') {
      (this.juice as any).startHellMusic?.();
    }

    const container = cutscene.container;
    const width = this.grid.cols * this.grid.cell;
    const height = this.grid.rows * this.grid.cell;

     (container as any).children?.forEach?.((child: Phaser.GameObjects.GameObject) => {
      child.destroy();
    });

    let snakeKey: string;
    let snakeTint: number;
    let backgroundColor: number;

    if (destination === 'heaven') {
      snakeKey = HEAVEN_SNAKE_TEXTURE_KEY;
      snakeTint = 0xffe066;
      backgroundColor = 0xfff8e0;
    } else {
      snakeKey = HELL_SNAKE_TEXTURE_KEY;
      snakeTint = 0xff3333;
      backgroundColor = 0x2a0a0a;
    }

    this.ensureHeavenSnakeTexture();
    this.ensureHellSnakeTexture();

    const bg = this.add
      .rectangle(0, 0, width, height, backgroundColor, 0)
      .setOrigin(0, 0)
      .setDepth(78);
    container.add(bg);

    const snake = this.add
      .image(width / 2, height / 2, snakeKey)
      .setOrigin(0.5)
      .setDepth(80)
      .setScale(4)
      .setAlpha(0);
    container.add(snake);

    const glow = this.add
      .ellipse(width / 2, height / 2, width * 0.6, height * 0.7, snakeTint, 0.12)
      .setDepth(79)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    container.add(glow);

    container.setAlpha(0);
    const fadeOverlay = this.add
      .rectangle(0, 0, width, height, backgroundColor, 1)
      .setOrigin(0, 0)
      .setDepth(95)
      .setAlpha(0);
    container.add(fadeOverlay);

    const shake = { x: 0, y: 0 };
    this.cameras.main.shake(320, 0.025);
    this.tweens.add({ targets: shake, x: 4, y: 4, duration: 100, yoyo: true, repeat: 2 });

    this.tweens.add({
      targets: bg,
      alpha: 0.95,
      duration: 1100,
      ease: 'Cubic.easeIn',
    });
    this.tweens.add({
      targets: glow,
      alpha: 0.28,
      duration: 1200,
      ease: 'Cubic.easeOut',
    });

    this.tweens.add({
      targets: snake,
      alpha: 1,
      scale: 5,
      y: height / 2 - 20,
      duration: 1100,
      ease: 'Cubic.easeOut',
      delay: 280,
    });

    this.tweens.add({
      targets: fadeOverlay,
      alpha: 0,
      duration: 1400,
      ease: 'Cubic.easeInOut',
      delay: 550,
      onComplete: () => {
        const cutscene = this.deathCutscene;
        if (!cutscene) return;
        const dialog =
          destination === 'heaven'
            ? this.pickDialogueBranch(HEAVEN_DIALOGUE_BRANCHES)
            : this.pickDialogueBranch(HELL_DIALOGUE_BRANCHES);
        cutscene.afterlifeDialogueShown = true;
        cutscene.canAdvance = true;
        this.questPopup.setDepth(90);
        this.questPopup.showDialogue(
          destination === 'heaven' ? 'The Light' : 'The Dark',
          [...dialog],
          {
            onAccept: () => {
              cutscene.canAdvance = true;
              this.advanceDeathCutscene();
            },
          },
          { nextLabel: 'Listen', closeLabel: 'Accept fate' },
          { portraitId: destination === 'heaven' ? 'sage-3' : 'sage-2' },
        );
      },
    });
  }

  setDir(x: number, y: number) {
    this.snakeGame.setDirection(x, y);
  }

  setManualResumeDir(x: number, y: number) {
    if (this.getFlag<boolean>('traversal.manualResumePending')) {
      this.snakeGame.forceDirection(x, y);
    } else {
      this.setDir(x, y);
    }
  }

  private togglePauseMenu(force?: boolean): void {
    if (this.offeredQuest || this.isModalPopupVisible()) return;
    const nextState = typeof force === 'boolean' ? force : !this.paused;
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
    this.minimapRenderer?.destroy();
    this.minimapRenderer = null;
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
      const color = amount > 0 ? '#fff3a8' : '#ff6b6b';
      const text = this.add
        .text(world.x, world.y - 10, `${amount > 0 ? '+' : ''}${amount}`, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color,
        })
        .setDepth(26)
        .setOrigin(0.5, 1)
        .setAlpha(0.95);
      this.tweens.add({
        targets: text,
        y: world.y - 38,
        alpha: 0,
        scale: 1.1,
        duration: 520,
        ease: 'Cubic.easeOut',
        onComplete: () => text.destroy(),
      });
      this.juice.scoreDelta(world.x, world.y, amount);
    }
  }

  applyCheatCode(rawCode: string): { ok: boolean; message: string; color: string } {
    const code = rawCode.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!code) {
      return { ok: false, message: 'Enter a cheat string.', color: '#ff6b6b' };
    }
    if (code === 'investingincrypto') {
      this.setFlag('cheat.appleScoreMultiplier', 100);
      this.isDirty = true;
      return { ok: true, message: 'Cheat active: apple score x100.', color: '#5dd6a2' };
    }
    if (code === '90fps240hz') {
      this.setPerformanceHudVisible(true);
      return { ok: true, message: 'Performance counter enabled.', color: '#5dd6a2' };
    }
    if (code === 'imawiddlebabywhoneedshelp') {
      this.skillTree.addExtraLifeCharge(100);
      this.setFlag('ui.livesRevealed', true);
      this.isDirty = true;
      return { ok: true, message: 'Cheat active: +100 lives.', color: '#5dd6a2' };
    }
    if (code === 'immortal' || code === 'mammamia' || code === 'starman' || code === 'mario') {
      this.setFlag('cheat.immortal', true);
      this.setFlag('equipment.swimmingEnabled', true);
      this.setFlag('equipment.heatResistance', 1);
      this.setFlag('equipment.coldResistance', 1);
      this.setFlag('player.temperatureExposureMs', 0);
      this.setFlag('player.temperatureDamageProgressMs', 0);
      this.setFlag('player.temperatureHazard', undefined);
      this.setFlag('ui.healthRevealed', true);
      this.isDirty = true;
      return {
        ok: true,
        message: 'Cheat active: immortal mode. Yahoo!',
        color: '#5dd6a2',
      };
    }
    if (code === 'teleporterquest' || code === 'greenpurchase') {
      const started = this.snakeGame.startGreenPurchaseCheat();
      if (started) {
        this.isDirty = true;
        return { ok: true, message: 'Cheat active: Green Purchase quest added.', color: '#5dd6a2' };
      }
      return {
        ok: false,
        message: 'Green Purchase is already active or unavailable.',
        color: '#ff6b6b',
      };
    }
    if (code === 'findmybaby' || code === 'babyquest') {
      const started = this.snakeGame.startFindMyBabyCheat();
      if (started) {
        this.isDirty = true;
        return { ok: true, message: 'Cheat active: Find My Baby quest added.', color: '#5dd6a2' };
      }
      return {
        ok: false,
        message: 'Find My Baby is already active or unavailable.',
        color: '#ff6b6b',
      };
    }
    if (code === 'freakyou' || code === 'timequest') {
      const started = this.snakeGame.startFreakYouCheat();
      if (started) {
        this.isDirty = true;
        return { ok: true, message: 'Cheat active: Freak You quest added.', color: '#5dd6a2' };
      }
      return {
        ok: false,
        message: 'Freak You is already active or unavailable.',
        color: '#ff6b6b',
      };
    }
    if (code === 'freakdennis') {
      if (this.snakeGame && this.snakeGame.bosses && this.currentRoomId) {
        this.snakeGame.bosses.spawnBoss(this.currentRoomId, 'freak-dennis');
        return { ok: true, message: 'Spawned Freak Dennis!', color: '#5dd6a2' };
      }
      return {
        ok: false,
        message: 'Cannot spawn boss - game not in valid state',
        color: '#ff6b6b',
      };
    }
    if (code === 'freakerdennis') {
      if (this.snakeGame && this.snakeGame.bosses && this.currentRoomId) {
        this.snakeGame.bosses.spawnBoss(this.currentRoomId, 'freaker-dennis');
        return { ok: true, message: 'Spawned Freaker Dennis!', color: '#5dd6a2' };
      }
      return {
        ok: false,
        message: 'Cannot spawn boss - game not in valid state',
        color: '#ff6b6b',
      };
    }
    return { ok: false, message: `Unknown cheat: ${rawCode.trim()}`, color: '#ff6b6b' };
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

  private takeManualTurn(): void {
    if (this.paused) {
      return;
    }
    this.runActionStep();
  }

  hasFollowers(): boolean {
    return this.snakeGame?.hasFollowers() ?? false;
  }

  commandFollowers(): { ok: boolean; message: string; color: string } {
    const result = this.snakeGame?.commandFollowers() ?? {
      ok: false,
      message: 'No mercenary to command.',
      color: '#ff6b6b',
    };
    this.showQuestHintPopup(result.message, result.color);
    return result;
  }

  recallFollowers(): { ok: boolean; message: string; color: string } {
    const result = this.snakeGame?.recallFollowers() ?? {
      ok: false,
      message: 'No mercenary to recall.',
      color: '#ff6b6b',
    };
    this.showQuestHintPopup(result.message, result.color);
    return result;
  }

  random(): number {
    return this.snakeGame ? this.snakeGame.random() : Math.random();
  }

  setTeleport(flag: boolean): void {
    this.snakeGame.enableTeleport(flag);
  }

  setTickDelay(delay: number): void {
    this.setActionStepIntervalMs(delay);
  }

  setActionStepIntervalMs(intervalMs: number): void {
    this.actionStepIntervalMs = Math.max(20, intervalMs);
    this.simulationScheduler.setClockInterval('action', this.actionStepIntervalMs);
    this.simulationScheduler.setClockInterval('manual-world', this.actionStepIntervalMs);
  }

  getActionStepIntervalMs(): number {
    return this.actionStepIntervalMs;
  }

  setBossStepIntervalMs(intervalMs: number): void {
    this.bossStepIntervalMs = Math.max(20, intervalMs);
    this.simulationScheduler.setClockInterval('boss', this.bossStepIntervalMs);
  }

  getBossStepIntervalMs(): number {
    return this.bossStepIntervalMs;
  }

  setActorStepIntervalMs(intervalMs: number): void {
    this.actorStepIntervalMs = Math.max(20, intervalMs);
    this.simulationScheduler.setClockInterval('actor', this.actorStepIntervalMs);
  }

  getActorStepIntervalMs(): number {
    return this.actorStepIntervalMs;
  }

  setBulletStepIntervalMs(intervalMs: number): void {
    this.bulletStepIntervalMs = Math.max(20, intervalMs);
    this.simulationScheduler.setClockInterval('bullet', this.bulletStepIntervalMs);
  }

  getBulletStepIntervalMs(): number {
    return this.bulletStepIntervalMs;
  }

  setHazardStepIntervalMs(intervalMs: number): void {
    this.hazardStepIntervalMs = Math.max(20, intervalMs);
    this.simulationScheduler.setClockInterval('hazard', this.hazardStepIntervalMs);
  }

  getHazardStepIntervalMs(): number {
    return this.hazardStepIntervalMs;
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
      return '0,0,0';
    }
    return room.id;
  }

  getGeneratedRoomsOnCurrentLevel(): string[] {
    const fn: any = (this.snakeGame as any).getGeneratedRooms;
    if (typeof fn === 'function') {
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
    this.setFlag('skills.ranks', this.skillTree.exportRanks());
  }

  restoreCharacterSaveState(): void {
    this.skillTree.reset(this.paused);
    const ranks = this.getFlag<Record<string, number>>('skills.ranks');
    if (ranks) {
      this.skillTree.restoreRanks(ranks);
    }
    this.applyEquipmentEffects();
    this.updateHouseAmbience();
    this.currentApple = this.snakeGame.getApple(this.snakeGame.getCurrentRoom().id);
    this.isDirty = true;
  }

  showSaveUI(): void {
    this.saveUI.show();
  }

  hideSaveUI(): void {
    this.saveUI.hide();
  }

  private showTitleScreen(mode: TitleMenuMode = 'main', message = ''): void {
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
    this.setFlag('ui.suppressHud', true);
    this.juice.startTitleMusic();
  }

  private hideTitleScreen(): void {
    this.titleVisible = false;
    this.titleContainer?.setVisible(false);
    this.titleMessageText?.setText('');
    this.setFlag('ui.suppressHud', false);
    this.juice.stopTitleMusic();
  }

  private showTitleMode(mode: TitleMenuMode): void {
    this.titleMainContainer?.setVisible(mode === 'main');
    this.titleSettingsContainer?.setVisible(mode === 'settings');
  }

  private startNewGameFromTitle(): void {
    this.hideTitleScreen();
    this.initGame(true);
    this.resetStartingChoices();
    this.setFlag('run.startChoicesReady', true);
    this.paused = true;
    this.showSaveUI();
  }

  private loadGameFromTitle(): void {
    if (!saveManager.hasSave()) {
      this.titleMessageText?.setText('No save file found.');
      return;
    }

    const success = saveManager.load(
      this.snakeGame,
      () => (this.chosenReligionId ? { id: this.chosenReligionId, mods: this.religionMods } : null),
      () => (this.chosenClassId ? { id: this.chosenClassId, mods: this.classMods } : null),
      () =>
        this.chosenBackgroundId ? { id: this.chosenBackgroundId, mods: this.backgroundMods } : null,
    );

    if (!success) {
      this.titleMessageText?.setText('Failed to load game.');
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
      .text(width / 2, 38, 'Snake for the Modern Gamer', {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: '38px',
        color: '#fff4cf',
        stroke: '#150712',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0);
    const subtitle = this.add
      .text(
        width / 2,
        82,
        'THE FIRST AAAA SNAKE-LIKE. 11/10 IGN. BEST GAME EVER MADE.\nFREAK DENNIS FEARS IT. ANGELS PREORDERED IT.',
        {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#fff3a8',
          stroke: '#09111d',
          strokeThickness: 2,
          align: 'center',
        },
      )
      .setOrigin(0.5, 0);

    const main = this.add.container(0, 0);
    const buttonX = width - 238;
    const buttonY = 285;
    const buttons = [
      this.createTitleButton(buttonX, buttonY, 'New Game', () => this.startNewGameFromTitle()),
      this.createTitleButton(buttonX, buttonY + 46, 'Load Game', () => this.loadGameFromTitle()),
      this.createTitleButton(buttonX, buttonY + 92, 'Learn More', () => {
        window.location.href = 'https://www.youtube.com/watch?v=WGvH11I6Rnk';
      }),
      this.createTitleButton(buttonX, buttonY + 138, 'Settings', () =>
        this.showTitleScreen('settings'),
      ),
    ];
    main.add(buttons);

    const settings = this.add.container(0, 0).setVisible(false);
    const panel = this.add
      .rectangle(width / 2, height / 2 + 44, 300, 190, 0x071019, 0.88)
      .setStrokeStyle(2, 0x8fb7ff)
      .setOrigin(0.5);
    const settingsTitle = this.add
      .text(width / 2, height / 2 - 30, 'Settings', {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: '26px',
        color: '#fff4cf',
      })
      .setOrigin(0.5);
    const settingsBody = this.add
      .text(width / 2, height / 2 + 10, 'More settings will live here.', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#c8ffe1',
      })
      .setOrigin(0.5);
    settings.add([
      panel,
      settingsTitle,
      settingsBody,
      this.createTitleButton(width / 2 - 105, height / 2 + 54, 'Back', () =>
        this.showTitleScreen('main'),
      ),
    ]);

    this.titleMessageText = this.add
      .text(buttonX + 105, buttonY + 196, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffb3a8',
        align: 'center',
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
      this.add
        .rectangle(width / 2 - 170, 70, 160, 5, 0xfff3a8, 0.0)
        .setBlendMode(Phaser.BlendModes.ADD),
      this.add
        .rectangle(width / 2 + 170, 70, 160, 5, 0xfff3a8, 0.0)
        .setBlendMode(Phaser.BlendModes.ADD),
      this.add.rectangle(width / 2, 112, 220, 4, 0x9ad1ff, 0.0).setBlendMode(Phaser.BlendModes.ADD),
    ];
    titleRays[0].setAngle(-8);
    titleRays[1].setAngle(8);
    const sparkles = [
      this.add
        .rectangle(buttonX - 16, buttonY + 16, 5, 5, 0xfff3a8, 0.0)
        .setBlendMode(Phaser.BlendModes.ADD),
      this.add
        .rectangle(buttonX + 224, buttonY + 62, 5, 5, 0xfff3a8, 0.0)
        .setBlendMode(Phaser.BlendModes.ADD),
      this.add
        .rectangle(buttonX - 10, buttonY + 116, 4, 4, 0x9ad1ff, 0.0)
        .setBlendMode(Phaser.BlendModes.ADD),
      this.add
        .rectangle(buttonX + 220, buttonY + 160, 4, 4, 0xfff3a8, 0.0)
        .setBlendMode(Phaser.BlendModes.ADD),
    ];
    const comets = [
      this.add
        .rectangle(90, 128, 46, 3, 0xd8f2ff, 0.0)
        .setAngle(-18)
        .setBlendMode(Phaser.BlendModes.ADD),
      this.add
        .rectangle(610, 188, 64, 3, 0xfff3a8, 0.0)
        .setAngle(-14)
        .setBlendMode(Phaser.BlendModes.ADD),
    ];
    const birds = [
      this.add
        .text(118, 202, 'v', { fontFamily: 'monospace', fontSize: '12px', color: '#cbd7e8' })
        .setAlpha(0.0),
      this.add
        .text(138, 212, 'v', { fontFamily: 'monospace', fontSize: '10px', color: '#cbd7e8' })
        .setAlpha(0.0),
      this.add
        .text(650, 240, 'v', { fontFamily: 'monospace', fontSize: '11px', color: '#cbd7e8' })
        .setAlpha(0.0),
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

    this.titleAnimatedObjects = [
      glint,
      dennisPulse,
      angelGlow,
      ...smokeWisps,
      ...titleRays,
      ...sparkles,
      ...comets,
      ...birds,
      ...embers,
      crownBurst,
    ];
    root.add([
      art,
      veil,
      dennisPulse,
      angelGlow,
      ...smokeWisps,
      ...titleRays,
      ...comets,
      ...birds,
      ...embers,
      glint,
      crownBurst,
      ...sparkles,
      title,
      subtitle,
      main,
      settings,
      this.titleMessageText,
    ]);
    this.titleContainer = root;
    this.titleMainContainer = main;
    this.titleSettingsContainer = settings;
    this.startTitleTweens(
      title,
      subtitle,
      glint,
      dennisPulse,
      angelGlow,
      smokeWisps,
      titleRays,
      sparkles,
      comets,
      birds,
      embers,
      crownBurst,
    );
  }

  private createTitleButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const buttonWidth = 210;
    const buttonHeight = 42;
    const shadow = this.add
      .rectangle(4, 5, buttonWidth, buttonHeight, 0x02040a, 0.48)
      .setOrigin(0, 0);
    const bg = this.add
      .rectangle(0, 0, buttonWidth, buttonHeight, 0x0b1626, 0.94)
      .setStrokeStyle(2, 0x4da3ff)
      .setOrigin(0, 0);
    const stripe = this.add
      .rectangle(10, buttonHeight - 8, buttonWidth - 20, 2, 0x5dd6a2, 0.58)
      .setOrigin(0, 0);
    const text = this.add
      .text(buttonWidth / 2, 10, label, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#fff4cf',
      })
      .setOrigin(0.5, 0);
    const zone = this.add
      .zone(0, 0, buttonWidth, buttonHeight)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    const button = this.add
      .container(x, y, [shadow, bg, stripe, text, zone])
      .setSize(buttonWidth, buttonHeight);
    zone.on('pointerover', () => {
      this.juice.startTitleMusic();
      bg.setFillStyle(0x243653, 0.98);
      bg.setStrokeStyle(2, 0x5dd6a2);
      stripe.setFillStyle(0xfff3a8, 0.9);
      text.setColor('#ffffff');
      this.tweens.add({
        targets: button,
        scaleX: 1.04,
        scaleY: 1.04,
        duration: 90,
        ease: 'Sine.easeOut',
      });
    });
    zone.on('pointerout', () => {
      bg.setFillStyle(0x0b1626, 0.94);
      bg.setStrokeStyle(2, 0x4da3ff);
      stripe.setFillStyle(0x5dd6a2, 0.58);
      text.setColor('#fff4cf');
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 90,
        ease: 'Sine.easeOut',
      });
    });
    zone.on('pointerdown', onClick);
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
    crownBurst: Phaser.GameObjects.Star,
  ): void {
    this.tweens.add({
      targets: title,
      y: title.y - 3,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: subtitle,
      alpha: 0.72,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
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
      ease: 'Cubic.easeInOut',
    });
    this.tweens.add({
      targets: dennisPulse,
      alpha: 0.26,
      scale: 1.45,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: angelGlow,
      alpha: 0.18,
      scale: 1.25,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
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
        ease: 'Sine.easeInOut',
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
        ease: 'Sine.easeInOut',
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
        ease: 'Cubic.easeInOut',
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
        ease: 'Cubic.easeInOut',
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
        ease: 'Sine.easeInOut',
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
        ease: 'Sine.easeInOut',
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
      ease: 'Sine.easeInOut',
    });
  }

  private drawTitleArtwork(g: Phaser.GameObjects.Graphics, width: number, height: number): void {
    g.fillGradientStyle(0x18294a, 0x18294a, 0x6e7fa2, 0x283958, 1);
    g.fillRect(0, 0, width, height);

    g.fillStyle(0xf8fbff, 0.9);
    for (const star of [
      [58, 42],
      [92, 86],
      [180, 58],
      [244, 122],
      [474, 72],
      [612, 46],
      [708, 116],
      [664, 168],
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
    for (const ridge of [
      [72, 214, 132, 158],
      [226, 230, 312, 142],
      [484, 226, 568, 154],
    ] as const) {
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
      g.fillTriangle(
        x + 29 * scale,
        y + 8 * scale,
        x + 41 * scale,
        y - 2 * scale,
        x + 53 * scale,
        y + 8 * scale,
      );
      g.fillTriangle(
        x + 55 * scale,
        y + 2 * scale,
        x + 65 * scale,
        y - 8 * scale,
        x + 75 * scale,
        y + 2 * scale,
      );
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
    for (const torch of [
      [156, 348],
      [252, 350],
      [496, 362],
      [580, 358],
    ] as const) {
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
    for (const plume of [
      [378, 300, 350, 254],
      [408, 288, 414, 232],
      [432, 304, 470, 258],
    ] as const) {
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

  getDatingCandidateViews(): DatingCandidateView[] {
    return this.snakeGame.getDatingCandidateViews();
  }

  getQuestMapMarkers() {
    return this.snakeGame.getQuestMapMarkers();
  }

  getFactionCards(): FactionCardView[] {
    return this.snakeGame.getFactionCards();
  }

  getPeopleJournalView(): ActorJournalEntry[] {
    return this.snakeGame.getPeopleJournalView();
  }

  getCardCollectionForMenu(): CardCollection {
    return this.getCardCollection();
  }

  getWardContractsForMenu(): Partial<Record<WardDeathSource, number>> {
    return this.snakeGame.getWardContracts();
  }

  getQuestSubtasks(questId: string): string[] {
    return this.snakeGame.getQuestSubtasks(questId);
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
    let refundEveryRooms: { interval: number; score: number } | undefined;
    let appleScorePenalty = 0;
    let hazardMapSense = 0;
    let radiationTimerScalar = 1;

    for (const [, itemId] of equipped) {
      const item = getItem(itemId) as any;
      const mods = item?.modifiers ?? {};
      if (typeof mods.tickDelayScalar === 'number') {
        tickScalar *= mods.tickDelayScalar;
      }
      if (typeof mods.wallSenseBonus === 'number') {
        wallSenseBonus += mods.wallSenseBonus;
      }
      if (typeof mods.seismicPulseBonus === 'number') {
        seismicBonus += mods.seismicPulseBonus;
      }
      if (mods.masonryEnabled) {
        masonry = true;
      }
      if (typeof mods.invulnerabilityBonus === 'number') {
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
      if (typeof mods.phoenixCharges === 'number') {
        phoenix += mods.phoenixCharges;
        itemPhoenix += mods.phoenixCharges;
      }
      if (mods.gunEnabled) {
        gunEnabled = true;
      }
      if (typeof mods.heatResistance === 'number') {
        heatResistance += mods.heatResistance;
      }
      if (typeof mods.coldResistance === 'number') {
        coldResistance += mods.coldResistance;
      }
      if (mods.swimmingEnabled) {
        swimmingEnabled = true;
      }
      if (mods.refundEveryRooms) {
        refundEveryRooms = mods.refundEveryRooms;
      }
      if (typeof mods.appleScorePenalty === 'number') {
        appleScorePenalty += mods.appleScorePenalty;
      }
      if (typeof mods.hazardMapSense === 'number') {
        hazardMapSense += mods.hazardMapSense;
      }
      if (typeof mods.radiationTimerScalar === 'number') {
        radiationTimerScalar *= mods.radiationTimerScalar;
      }
    }

    // Apply religion bonuses
    if (this.religionMods) {
      if (typeof this.religionMods.tickDelayScalar === 'number') {
        tickScalar *= this.religionMods.tickDelayScalar;
      }
      if (typeof this.religionMods.wallSenseBonus === 'number') {
        wallSenseBonus += this.religionMods.wallSenseBonus;
      }
      if (typeof this.religionMods.seismicPulseBonus === 'number') {
        seismicBonus += this.religionMods.seismicPulseBonus;
      }
      if (typeof this.religionMods.invulnerabilityBonus === 'number') {
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
      if (typeof this.religionMods.phoenixCharges === 'number') {
        phoenix += this.religionMods.phoenixCharges;
      }
      if (this.religionMods.spiritualLength) {
        if (!regen) {
          regen = { interval: 30, amount: 1 };
        } else {
          regen.interval = Math.min(regen.interval, 30);
          regen.amount += 1;
        }
      }
    }

    // Background bonuses
    if (this.backgroundMods) {
      if (typeof this.backgroundMods.tickDelayScalar === 'number')
        tickScalar *= this.backgroundMods.tickDelayScalar;
      if (typeof this.backgroundMods.wallSenseBonus === 'number')
        wallSenseBonus += this.backgroundMods.wallSenseBonus;
      if (typeof this.backgroundMods.seismicPulseBonus === 'number')
        seismicBonus += this.backgroundMods.seismicPulseBonus;
      if (typeof this.backgroundMods.invulnerabilityBonus === 'number')
        invulnBonus += this.backgroundMods.invulnerabilityBonus;
      if (this.backgroundMods.regenerator) {
        const r = this.backgroundMods.regenerator;
        if (!regen) regen = { interval: r.interval, amount: r.amount };
        else {
          regen.interval = Math.min(regen.interval, r.interval);
          regen.amount += r.amount;
        }
      }
      if (this.backgroundMods.masonryEnabled) masonry = true;
      if (typeof this.backgroundMods.phoenixCharges === 'number')
        phoenix += this.backgroundMods.phoenixCharges;
    }

    // Class bonuses
    if (this.classMods) {
      if (typeof this.classMods.tickDelayScalar === 'number')
        tickScalar *= this.classMods.tickDelayScalar;
      if (typeof this.classMods.wallSenseBonus === 'number')
        wallSenseBonus += this.classMods.wallSenseBonus;
      if (typeof this.classMods.seismicPulseBonus === 'number')
        seismicBonus += this.classMods.seismicPulseBonus;
      if (typeof this.classMods.invulnerabilityBonus === 'number')
        invulnBonus += this.classMods.invulnerabilityBonus;
      if (this.classMods.regenerator) {
        const r = this.classMods.regenerator;
        if (!regen) regen = { interval: r.interval, amount: r.amount };
        else {
          regen.interval = Math.min(regen.interval, r.interval);
          regen.amount += r.amount;
        }
      }
      if (this.classMods.masonryEnabled) masonry = true;
      if (typeof this.classMods.phoenixCharges === 'number')
        phoenix += this.classMods.phoenixCharges;
    }

    // Apply speed scalar via skill system
    this.skillTree.applyActionStepIntervalScalar(tickScalar, 'equipment:boots');

    // Set equipment flags for game logic to combine with skill-based flags
    this.setFlag('equipment.wallSenseRadiusBonus', wallSenseBonus > 0 ? wallSenseBonus : undefined);
    this.setFlag('equipment.seismicPulseRadiusBonus', seismicBonus > 0 ? seismicBonus : undefined);
    this.setFlag('equipment.masonryEnabled', masonry ? true : undefined);
    this.setFlag('equipment.invulnerabilityBonus', invulnBonus > 0 ? invulnBonus : undefined);
    this.setFlag('equipment.regenerator', regen ?? undefined);
    this.setFlag('equipment.phoenixCharges', phoenix > 0 ? phoenix : undefined);
    this.setFlag('equipment.itemPhoenixCharges', itemPhoenix > 0 ? itemPhoenix : undefined);
    this.setFlag('equipment.gunEnabled', gunEnabled ? true : undefined);
    const immortalCheat = Boolean(this.getFlag<boolean>('cheat.immortal'));
    this.setFlag(
      'equipment.heatResistance',
      immortalCheat ? 1 : heatResistance > 0 ? Math.min(0.9, heatResistance) : undefined,
    );
    this.setFlag(
      'equipment.coldResistance',
      immortalCheat ? 1 : coldResistance > 0 ? Math.min(0.9, coldResistance) : undefined,
    );
    this.setFlag('equipment.swimmingEnabled', swimmingEnabled || immortalCheat ? true : undefined);
    this.setFlag('equipment.refundEveryRooms', refundEveryRooms);
    this.setFlag(
      'equipment.appleScorePenalty',
      appleScorePenalty > 0 ? appleScorePenalty : undefined,
    );
    this.setFlag('equipment.hazardMapSense', hazardMapSense > 0 ? hazardMapSense : undefined);
    this.setFlag(
      'equipment.radiationTimerScalar',
      radiationTimerScalar !== 1 ? radiationTimerScalar : undefined,
    );

    // Refresh overlay to reflect any equipped status in inventory view
    this.skillTree.getOverlay().refresh();
  }

  private applyJadePeakAppleEffects(typeId: string | undefined): void {
    if (!typeId) return;

    const nowMs = Number(this.getFlag<number>('timeMs') ?? 0);
    const currentRoomId = this.snakeGame.getCurrentRoom().id;
    const head = this.snakeGame.getSnakeBody()[0];

    if (typeId === 'mochi') {
      this.snakeGame.setFlag('jadePeak.mochiWideEnd', nowMs + 5000);
      this.showQuestHintPopup('The snake grows wide and squishy!', '#f5d5e8');
    }

    if (typeId === 'wasabi') {
      this.snakeGame.setFlag('jadePeak.wasabiBurnEnd', nowMs + 3000);
      this.snakeGame.setFlag('jadePeak.wasabiDamageTaken', 1);
      if (head) {
        const enemies = this.snakeGame.getEnemies(currentRoomId);
        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (!enemy) continue;
          const dx = Math.abs(enemy.position.x - head.x);
          const dy = Math.abs(enemy.position.y - head.y);
          if (dx <= 5 && dy <= 5) {
            const hit = (this.snakeGame as any).enemies.damageEnemyAt(currentRoomId, enemy.position, 1);
          }
        }
      }
      this.showQuestHintPopup('Wasabi burns through you and the nearby foes!', '#9acd32');
    }

    if (typeId === 'yuzu') {
      this.snakeGame.setFlag('jadePeak.yuzuWallSenseEnd', nowMs + 8000);
      this.snakeGame.setFlag('jadePeak.yuzuSpeedEnd', nowMs + 4000);
      this.showQuestHintPopup('Citrus clarity reveals the walls ahead!', '#f0e68c');
    }

    if (typeId === 'koi') {
      this.snakeGame.setFlag('jadePeak.koiFlowEnd', nowMs + 6000);
      this.showQuestHintPopup('You enter the flowing current!', '#ff6b35');
    }

    if (typeId === 'amacha') {
      this.showQuestHintPopup('A tanuki materializes from the shadows...', '#8b4513');
      this.snakeGame.setFlag('jadePeak.amachaTanukiSpawned', true);
    }
  }

  private setPerformanceHudVisible(visible: boolean): void {
    this.performanceHudVisible = visible;
    if (!visible) {
      this.performanceHud?.setVisible(false);
      return;
    }
    this.ensurePerformanceHud();
    this.performanceHud?.setVisible(true);
  }

  private ensurePerformanceHud(): Phaser.GameObjects.Text {
    if (this.performanceHud) {
      return this.performanceHud;
    }
    this.performanceHud = this.add
      .text(this.scale.width - 10, this.scale.height - 10, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#d7f7ff',
        align: 'right',
        backgroundColor: 'rgba(0,0,0,0.58)',
        padding: { left: 8, right: 8, top: 5, bottom: 5 },
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(240)
      .setVisible(false);
    return this.performanceHud;
  }

  private updatePerformanceHud(deltaMs: number): void {
    if (!this.performanceHudVisible) {
      return;
    }
    const hud = this.ensurePerformanceHud();
    this.performanceSampleMs += Math.max(0, deltaMs);
    this.performanceSampleFrames += 1;
    if (this.performanceSampleMs >= 500) {
      this.displayedFps = (this.performanceSampleFrames * 1000) / this.performanceSampleMs;
      this.performanceSampleMs = 0;
      this.performanceSampleFrames = 0;
    }
    const stepMs = this.getActionStepIntervalMs();
    const tilesPerSecond = stepMs > 0 ? 1000 / stepMs : 0;
    const room = this.snakeGame.getCurrentRoom();
    const render = this.snakeRenderer.getRenderDiagnostics();
    const scheduler = this.simulationScheduler.getDiagnostics();
    const clockLines = scheduler.clocks
      .filter((clock) => clock.id === 'action' || clock.id === 'actor' || clock.id === 'bullet' || clock.id === 'hazard')
      .map(
        (clock) =>
          `${clock.id}: ${clock.accumulatorMs.toFixed(0)}/${clock.intervalMs}ms steps ${clock.stepsLastUpdate}`,
      );
    hud
      .setText(
        [
          `FPS: ${this.displayedFps.toFixed(1)}`,
          `Delta: ${scheduler.clampedDeltaMs.toFixed(1)}ms`,
          `Clamped: ${scheduler.wasDeltaClamped ? 'yes' : 'no'}`,
          `Room: ${room.id}`,
          `Biome: ${room.biomeId}`,
          `Static: ${render.staticCacheStatus}`,
          `Tiles: ${render.staticTileCount}`,
          `Dynamic: ${render.dynamicObjectCount}`,
          `Forest: trees ${render.treeTileCount} detailed ${render.detailedTreeTileCount} cheap ${render.cheapForestTileCount}`,
          `Speed: ${tilesPerSecond.toFixed(2)} tiles/s (${Math.round(stepMs)}ms)`,
          ...clockLines,
        ].join('\n'),
      )
      .setPosition(this.scale.width - 10, this.scale.height - 10)
      .setVisible(true);
  }

  update(_time: number, delta: number): void {
    if (this.titleVisible) {
      this.graphics?.clear();
      this.questHud?.setVisible(false);
      this.bossHud?.hide();
      this.questHint?.setVisible(false);
      this.questHintPanel?.setVisible(false);
      this.heartsHud?.setVisible(false);
      this.livesHud?.setVisible(false);
      this.temperatureHud?.setVisible(false);
      this.radiationHud?.setVisible(false);
      this.villageHud?.setVisible(false);
      this.biomeHud?.setVisible(false);
      this.minimapRenderer?.setVisible(false);
      this.questGiverSprite?.setVisible(false);
      this.wandererSprite?.setVisible(false);
      this.villageResidentSprites.forEach((sprite) => sprite.setVisible(false));
      this.villageResidentIndicatorTexts.forEach((text) => text.setVisible(false));
      this.isDirty = false;
      return;
    }
    if (
      this.paused ||
      this.skillTree?.isOverlayVisible() ||
      this.questPopup?.isVisible() ||
      this.villageShopPopup?.isVisible() ||
      this.datingScenePopup?.isVisible()
    ) {
      this.bossHud?.hide();
    }
    this.updateSimulation(delta);
    this.updatePerformanceHud(delta);
    this.updateWandererSprite();
    this.updateVillageResidentSprites();
    this.tickVillageJuice();
    this.tickBiomeHazardJuice();
    this.tickQuestBabyCry();
    if (this.isDirty) {
      this.draw();
      this.isDirty = false;
    }
  }

  private updateSimulation(deltaMs: number): void {
    const mode = this.getGameMode();
    if (mode === 'action' || mode === 'manual-room') {
      this.advanceSimulationTime(Math.max(0, Math.min(deltaMs, 250)));
    }
    this.simulationScheduler.update(deltaMs, SIMULATION_MODE_RULES[mode]);
  }

  private getGameMode(): GameMode {
    if (this.titleVisible) {
      return 'title';
    }
    if (this.deathCutscene) {
      return 'death-cutscene';
    }
    if (this.cardGameContainer) {
      return 'card-game';
    }
    if (this.datingScenePopup?.isVisible()) {
      return 'dating';
    }
    if (this.villageShopPopup?.isVisible()) {
      return 'shop';
    }
    if (this.questPopup?.isVisible()) {
      return 'dialogue';
    }
    if (this.paused) {
      return 'paused';
    }
    if (this.isManualHouseMovementActive()) {
      return 'manual-room';
    }
    return 'action';
  }

  private tickQuestBabyCry(): void {
    if (!this.snakeGame?.isCarryingQuestBaby()) {
      this.nextBabyCryAtMs = 0;
      return;
    }
    if (this.deathCutscene || this.titleVisible) {
      return;
    }
    if (this.time.now < this.nextBabyCryAtMs) {
      return;
    }
    this.juice.babyCry();
    this.nextBabyCryAtMs = this.time.now + 3600;
  }

  private updateBossEncounter(): void {
    const bosses = this.snakeGame.getBosses(this.currentRoomId);
    const boss = bosses[0];

    if (boss) {
      this.bossHud.show({
        name: boss.name ?? 'Nameless Horror',
        health: boss.health ?? 0,
        maxHealth: boss.maxHealth ?? Math.max(1, boss.health ?? 1),
      });
      const previous = this.lastBossHealth.get(boss.id);
      if (typeof previous === 'number' && boss.health !== undefined && boss.health < previous) {
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
    const fallback = this.snakeGame.getSnakeBody()[0] ?? {
      x: this.grid.cols / 2,
      y: this.grid.rows / 2,
    };
    const point = position ?? fallback;
    const [roomX, roomY] = this.currentRoomId.split(',').map(Number);
    const localX = point.x - roomX * this.grid.cols;
    const localY = point.y - roomY * this.grid.rows;
    return { x: localX * cell + cell / 2, y: localY * cell + cell / 2 };
  }

  private tileToWorldInRoom(position: Vector2Like, roomId: string): { x: number; y: number } {
    const cell = this.grid.cell;
    const [roomX, roomY] = roomId.split(',').map(Number);
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

    const frenzy = this.snakeGame.getFlag<{ head?: Vector2Like | null }>(
      'predation.frenzyTriggered',
    );
    if (frenzy) {
      const world = this.tileToWorld(frenzy.head ?? null);
      this.juice.predationFrenzy(world.x, world.y);
      this.snakeGame.setFlag('predation.frenzyTriggered', undefined);
    }

    const rend = this.snakeGame.getFlag<{ head?: Vector2Like | null }>('predation.rendConsumed');
    if (rend) {
      const world = this.tileToWorld(rend.head ?? null);
      this.juice.predationRend(world.x, world.y);
      this.snakeGame.setFlag('predation.rendConsumed', undefined);
    }

    const apex = this.snakeGame.getFlag<{ head?: Vector2Like | null }>('predation.apexTriggered');
    if (apex) {
      const world = this.tileToWorld(apex.head ?? null);
      this.juice.predationApex(world.x, world.y);
      this.snakeGame.setFlag('predation.apexTriggered', undefined);
    }

    const loot = this.snakeGame.getFlag<{ head?: Vector2Like | null; itemName?: string }>(
      'loot.itemPicked',
    );
    if (loot) {
      const world = this.tileToWorld(loot.head ?? null);
      this.juice.itemPickup(world.x, world.y);
      const enriched = this.snakeGame.getFlag<{ itemId?: string }>('loot.itemPicked');
      if (enriched?.itemId) {
        (this.juice as any).itemRarityJingle?.(enriched.itemId);
      }
      // Also surface a hint if overlay is visible
      const name = loot.itemName ? `: ${loot.itemName}` : '';
      this.skillTree.getOverlay().announce(`Item acquired${name}`, '#5dd6a2', 1800);
      // Floating popup text at pickup location
      const popup = this.add
        .text(world.x, world.y - 14, `+ Item${name}`, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#9ad1ff',
        })
        .setDepth(26)
        .setOrigin(0.5, 1);
      this.tweens.add({
        targets: popup,
        y: world.y - 40,
        alpha: 0,
        duration: 640,
        ease: 'Cubic.easeOut',
        onComplete: () => popup.destroy(),
      });
      this.snakeGame.setFlag('loot.itemPicked', undefined);
    }

    // Treasure pickup FX
    const treasureFx = this.snakeGame.getFlag<{ x: number; y: number; roomId: string }>(
      'ui.treasurePickup',
    );
    if (treasureFx) {
      const world = this.tileToWorldInRoom({ x: treasureFx.x, y: treasureFx.y }, treasureFx.roomId);
      (this.juice as any).treasurePickup?.(world.x, world.y);
      this.snakeGame.setFlag('ui.treasurePickup', undefined);
    }

    // Geometry feedback
    const seismic = this.snakeGame.getFlag<{
      x: number;
      y: number;
      roomId: string;
      radius: number;
    }>('ui.seismicPulse');
    if (seismic) {
      const world = this.tileToWorldInRoom({ x: seismic.x, y: seismic.y }, seismic.roomId);
      (this.juice as any).seismicPulse?.(world.x, world.y, seismic.radius);
      this.snakeGame.setFlag('ui.seismicPulse', undefined);
    }

    const collapse = this.snakeGame.getFlag<{ x: number; y: number; roomId: string }>(
      'ui.collapseControl',
    );
    if (collapse) {
      const world = this.tileToWorldInRoom({ x: collapse.x, y: collapse.y }, collapse.roomId);
      (this.juice as any).collapseControl?.(world.x, world.y);
      this.snakeGame.setFlag('ui.collapseControl', undefined);
    }

    const chomp = this.snakeGame.getFlag<{ x: number; y: number; roomId: string }>('ui.wallChomp');
    if (chomp) {
      const world = this.tileToWorldInRoom({ x: chomp.x, y: chomp.y }, chomp.roomId);
      (this.juice as any).wallChomp?.(world.x, world.y);
      this.snakeGame.setFlag('ui.wallChomp', undefined);
    }

    const fault = this.snakeGame.getFlag<{ roomId: string; y: number }>('ui.faultLine');
    if (fault) {
      const cell = this.grid.cell;
      const y = fault.y * cell + cell / 2;
      const x1 = cell / 2;
      const x2 = this.grid.cols * cell - cell / 2;
      (this.juice as any).faultLineSweep?.(x1, y, x2);
      this.snakeGame.setFlag('ui.faultLine', undefined);
    }

    // Turn skid dust
    const skid = this.snakeGame.getFlag<{
      x: number;
      y: number;
      roomId: string;
      dx: number;
      dy: number;
    }>('ui.turnSkid');
    if (skid) {
      const world = this.tileToWorldInRoom({ x: skid.x, y: skid.y }, skid.roomId);
      (this.juice as any).turnSkid?.(world.x, world.y, skid.dx, skid.dy);
      this.snakeGame.setFlag('ui.turnSkid', undefined);
    }

    // Wall graze sparks
    const graze = this.snakeGame.getFlag<{
      x: number;
      y: number;
      roomId: string;
      nx: number;
      ny: number;
    }>('ui.wallGraze');
    if (graze) {
      const world = this.tileToWorldInRoom({ x: graze.x, y: graze.y }, graze.roomId);
      (this.juice as any).wallGraze?.(world.x, world.y, graze.nx, graze.ny);
      this.snakeGame.setFlag('ui.wallGraze', undefined);
    }

    const enemyEaten = this.snakeGame.getFlag<{
      x: number;
      y: number;
      roomId: string;
      name?: string;
      kind?: string;
      healed?: number;
    }>('ui.enemyEaten');
    if (enemyEaten) {
      const world = this.tileToWorldInRoom({ x: enemyEaten.x, y: enemyEaten.y }, enemyEaten.roomId);
      (this.juice as any).enemyEaten?.(world.x, world.y);
      const label = enemyEaten.name ? `+ ${enemyEaten.name}` : '+ Enemy';
      const popup = this.add
        .text(world.x, world.y - 14, enemyEaten.healed ? `${label}  +${enemyEaten.healed} heart` : label, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#ffcf8a',
        })
        .setDepth(26)
        .setOrigin(0.5, 1);
      this.tweens.add({
        targets: popup,
        y: world.y - 40,
        alpha: 0,
        duration: 620,
        ease: 'Cubic.easeOut',
        onComplete: () => popup.destroy(),
      });
      this.snakeGame.setFlag('ui.enemyEaten', undefined);
    }

    const wandererReveal = this.snakeGame.getFlag<{
      x: number;
      y: number;
      roomId: string;
      id: string;
    }>('ui.wandererReveal');
    if (wandererReveal) {
      const world = this.tileToWorldInRoom(
        { x: wandererReveal.x, y: wandererReveal.y },
        wandererReveal.roomId,
      );
      (this.juice as any).wandererReveal?.(world.x, world.y);
      this.snakeGame.setFlag('ui.wandererReveal', undefined);
    }

    const relationshipReward = this.snakeGame.getFlag<{ reward: RelationshipReward }>('ui.relationshipReward');
    if (relationshipReward) {
      this.showQuestHintPopup(this.describeRelationshipReward(relationshipReward.reward), '#ffbdfd');
      this.snakeGame.setFlag('ui.relationshipReward', undefined);
    }

    const playerShot = this.snakeGame.getFlag<{
      x: number;
      y: number;
      roomId: string;
      dx: number;
      dy: number;
      style?: 'bullet' | 'football';
    }>('ui.playerShot');
    if (playerShot) {
      const world = this.tileToWorldInRoom({ x: playerShot.x, y: playerShot.y }, playerShot.roomId);
      if (playerShot.style === 'football') {
        (this.juice as any).footballShot?.(world.x, world.y, playerShot.dx, playerShot.dy);
      } else {
        (this.juice as any).playerShot?.(world.x, world.y, playerShot.dx, playerShot.dy);
      }
      this.snakeGame.setFlag('ui.playerShot', undefined);
    }
    const footballPass = this.snakeGame.getFlag<{
      roomId: string;
      from: Vector2Like;
      to: Vector2Like;
    }>('ui.footballPass');
    if (footballPass) {
      const from = this.tileToWorldInRoom(footballPass.from, footballPass.roomId);
      const to = this.tileToWorldInRoom(footballPass.to, footballPass.roomId);
      (this.juice as any).footballPass?.(from.x, from.y, to.x, to.y);
      this.snakeGame.setFlag('ui.footballPass', undefined);
    }
    const footballCatch = this.snakeGame.getFlag<{
      roomId: string;
      x: number;
      y: number;
      score: number;
    }>('ui.footballCatch');
    if (footballCatch) {
      const world = this.tileToWorldInRoom({ x: footballCatch.x, y: footballCatch.y }, footballCatch.roomId);
      (this.juice as any).footballCatch?.(world.x, world.y);
      this.showQuestHintPopup(`Football caught. +${footballCatch.score} score.`, '#f3eee2');
      this.snakeGame.setFlag('ui.footballCatch', undefined);
    }
    const footballFumble = this.snakeGame.getFlag<{
      roomId: string;
      x: number;
      y: number;
    }>('ui.footballFumble');
    if (footballFumble) {
      const world = this.tileToWorldInRoom({ x: footballFumble.x, y: footballFumble.y }, footballFumble.roomId);
      (this.juice as any).footballFumble?.(world.x, world.y);
      this.snakeGame.setFlag('ui.footballFumble', undefined);
    }

    const playerHit = this.snakeGame.getFlag<{
      x: number;
      y: number;
      roomId: string;
      health: number;
      maxHealth: number;
      source?: 'enemy' | 'npc-hostile' | 'duelist' | 'freak-joey' | 'player';
    }>('ui.playerHit');
    if (playerHit) {
      const world = this.tileToWorldInRoom({ x: playerHit.x, y: playerHit.y }, playerHit.roomId);
      (this.juice as any).playerHit?.(
        world.x,
        world.y,
        playerHit.health,
        playerHit.maxHealth,
        playerHit.source,
      );
      this.snakeGame.setFlag('ui.playerHit', undefined);
    }

    const villageReveal = this.snakeGame.getFlag<{
      roomId: string;
      name: string;
      x: number;
      y: number;
    }>('ui.villageReveal');
    if (villageReveal) {
      const world = this.tileToWorldInRoom(
        { x: villageReveal.x, y: villageReveal.y },
        villageReveal.roomId,
      );
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
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: this.villageHud,
        alpha: 0,
        y: 26,
        delay: 1700,
        duration: 900,
        ease: 'Cubic.easeIn',
        onComplete: () => this.villageHud.setVisible(false),
      });
      this.showQuestHintPopup(`${villageReveal.name} stirs around you.`, '#f6e7c1');
      this.snakeGame.setFlag('ui.villageReveal', undefined);
    }
    const townReveal = this.snakeGame.getFlag<{
      roomId: string;
      name: string;
      mood: string;
      law?: string;
      wantedLevel: number;
      x: number;
      y: number;
    }>('ui.townReveal');
    if (townReveal) {
      const world = this.tileToWorldInRoom({ x: townReveal.x, y: townReveal.y }, townReveal.roomId);
      (this.juice as any).villageReveal?.(world.x, world.y);
      this.villageHud
        .setText(`${townReveal.name.toUpperCase()}\n${formatTownMood(townReveal.mood as any)} | Wanted ${townReveal.wantedLevel}`)
        .setAlpha(0)
        .setY(12)
        .setVisible(true);
      this.tweens.add({
        targets: this.villageHud,
        alpha: 1,
        y: 18,
        duration: 320,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: this.villageHud,
        alpha: 0,
        y: 32,
        delay: 2200,
        duration: 900,
        ease: 'Cubic.easeIn',
        onComplete: () => this.villageHud.setVisible(false),
      });
      this.showQuestHintPopup(
        `${townReveal.name}: ${townReveal.law ?? 'Mind the notice board.'}`,
        '#f6e7c1',
      );
      this.snakeGame.setFlag('ui.townReveal', undefined);
    }
    const libertyLandmarkReveal = this.snakeGame.getFlag<{
      roomId: string;
      name: string;
      subtitle: string;
      x: number;
      y: number;
      kind: string;
    }>('ui.libertyLandmarkReveal');
    if (libertyLandmarkReveal) {
      const world = this.tileToWorldInRoom(
        { x: libertyLandmarkReveal.x, y: libertyLandmarkReveal.y },
        libertyLandmarkReveal.roomId,
      );
      (this.juice as any).villageReveal?.(world.x, world.y);
      (this.juice as any).neonFlicker?.(world.x, world.y - 18);
      this.villageHud
        .setText(`${libertyLandmarkReveal.name.toUpperCase()}\n${libertyLandmarkReveal.subtitle}`)
        .setAlpha(0)
        .setY(12)
        .setVisible(true);
      this.tweens.add({
        targets: this.villageHud,
        alpha: 1,
        y: 18,
        duration: 320,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: this.villageHud,
        alpha: 0,
        y: 34,
        delay: 2100,
        duration: 900,
        ease: 'Cubic.easeIn',
        onComplete: () => this.villageHud.setVisible(false),
      });
      this.showQuestHintPopup(
        `${libertyLandmarkReveal.subtitle}: ${libertyLandmarkReveal.name}`,
        '#f6e7c1',
      );
      this.snakeGame.setFlag('ui.libertyLandmarkReveal', undefined);
    }
    const townHostility = this.snakeGame.getFlag<{
      roomId: string;
      x: number;
      y: number;
      label: string;
    }>('ui.townHostility');
    if (townHostility) {
      const world = this.tileToWorldInRoom({ x: townHostility.x, y: townHostility.y }, townHostility.roomId);
      this.juice.notice(world.x, world.y, 0xff6b6b, true);
      this.showQuestHintPopup(townHostility.label, '#ff6b6b');
      this.snakeGame.setFlag('ui.townHostility', undefined);
    }
    const biomeReveal = this.snakeGame.getFlag<{
      roomId: string;
      biomeId: string;
      title: string;
      temperature: string;
      dangerLevel: number;
    }>('ui.biomeReveal');
    if (biomeReveal) {
      const room = this.snakeGame.getCurrentRoom();
      const color = room.backgroundColor;
      const center = {
        x: (this.grid.cols * this.grid.cell) / 2,
        y: (this.grid.rows * this.grid.cell) / 2,
      };
      (this.juice as any).biomeReveal?.(center.x, center.y, color);
      this.biomeHud
        .setText(
          `${biomeReveal.title.toUpperCase()}\nTemp: ${biomeReveal.temperature}  Danger: ${biomeReveal.dangerLevel}/10`,
        )
        .setAlpha(0)
        .setY(36)
        .setVisible(true);
      this.tweens.add({
        targets: this.biomeHud,
        alpha: 1,
        y: 42,
        duration: 340,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: this.biomeHud,
        alpha: 0,
        y: 50,
        delay: 1500,
        duration: 900,
        ease: 'Cubic.easeIn',
        onComplete: () => this.biomeHud.setVisible(false),
      });
      this.snakeGame.setFlag('ui.biomeReveal', undefined);
    }
  }

  private handleRunDeltaFeedback(scoreBefore: number, lengthBefore: number): void {
    const head = this.snakeGame.getSnakeBody()[0];
    if (!head) {
      this.lastJuicedScore = this.snakeGame.getScore();
      this.lastJuicedLength = this.snakeGame.getSnakeLength();
      return;
    }

    const world = this.tileToWorld(head);
    const scoreAfter = this.snakeGame.getScore();
    const lengthAfter = this.snakeGame.getSnakeLength();
    const scoreDelta = scoreAfter - scoreBefore;
    const lengthDelta = lengthAfter - lengthBefore;

    if (scoreDelta !== 0 && scoreAfter !== this.lastJuicedScore) {
      this.juice.scoreDelta(world.x, world.y, scoreDelta);
    }
    if (lengthDelta > 0 && lengthAfter !== this.lastJuicedLength) {
      this.juice.lengthGain(world.x, world.y, lengthDelta);
    }

    this.lastJuicedScore = scoreAfter;
    this.lastJuicedLength = lengthAfter;
  }
  private draw(): void {
    // Suppress generic HUDs in house
    this.setFlag('ui.suppressHud', this.titleVisible || this.isInHouse());
    const room = this.snakeGame.getCurrentRoom();
    const baseSense = this.getFlag<number>('geometry.wallSenseRadius') ?? 0;
    const equipSense = this.getFlag<number>('equipment.wallSenseRadiusBonus') ?? 0;
    const wallSenseRadius = Math.max(0, baseSense + equipSense);
    const pActive = this.getFlag<{ kind: string; remaining: number; total?: number }>(
      'powerup.active',
    );
    const snakeColor = pActive ? 0x9b5de5 : undefined;
    this.snakeRenderer.render(room, this.snakeGame.getSnakeBody(), room.id, this.currentApple, {
      wallSenseRadius,
      snakeColor,
      poweredUp: Boolean(pActive),
      direction: this.snakeGame.getDirection(),
      snakePalette: this.getActiveSnakeTheme().palette,
      activeHat: this.snakeCosmetics.activeHat,
      enemies: this.snakeGame.getEnemies(room.id),
      followers: this.snakeGame
        .getFollowers()
        .filter((follower) => follower.roomId === room.id)
        .map((follower) => ({
          id: follower.id,
          roomId: follower.roomId,
          position: follower.position,
          fireCooldown: 0,
          moveCooldown: 0,
          aimDirection: follower.direction,
          flashTicks: 0,
          name: follower.name,
          currentHearts: 1,
          maxHearts: 1,
          encounterKind: 'goblin' as const,
        })),
      bullets: this.snakeGame.getEnemyBullets(room.id),
      footballs: this.snakeGame.getFootballs(room.id),
      animals: this.snakeGame.getAnimals(room.id),
    });
    const minimapVisible = this.isMinimapEnabled();
    this.minimapRenderer?.setVisible(minimapVisible);
    if (minimapVisible) {
      this.minimapRenderer?.render({
        currentRoomId: room.id,
        snakeSegments: this.snakeGame.getSnakeBody(),
      });
    }
    this.questHud.update(this.snakeGame.getActiveQuests(), this.grid.cols * this.grid.cell);
    this.questHud.setVisible(!this.isInHouse());
    const health = this.snakeGame.getPlayerHealth();
    const healthRevealed =
      Boolean(this.getFlag<boolean>('ui.healthRevealed')) || health.current < health.max;
    if (health.current < health.max) {
      this.setFlag('ui.healthRevealed', true);
    }
    this.heartsHud.setText(
      `Hearts: ${'♥'.repeat(Math.max(0, health.current))}${'♡'.repeat(Math.max(0, health.max - health.current))}`,
    );
    const head = this.snakeGame.getSnakeBody()[0];
    this.heartsHud.setText(`Hearts: ${"♥".repeat(Math.max(0, health.current))}${"♡".repeat(Math.max(0, health.max - health.current))}`);
    this.heartsHud.setVisible(!this.isInHouse() && healthRevealed);
    if (!this.isInHouse() && head && healthRevealed && health.current < health.max) {
      const missingRatio = health.max > 0 ? (health.max - health.current) / health.max : 0;
      if (this.time.now >= this.nextDangerPulseAtMs) {
        const world = this.tileToWorld(head);
        this.juice.dangerPulse(world.x, world.y, missingRatio);
        this.nextDangerPulseAtMs = this.time.now + Math.max(260, 920 - missingRatio * 430);
      }
    }
    const lifeCharges = this.getVisibleLifeCharges();
    if (lifeCharges > 0) {
      this.setFlag('ui.livesRevealed', true);
    }
    if (this.lastVisibleLifeCharges > 0 && lifeCharges < this.lastVisibleLifeCharges) {
      this.juice.extraLifeSpent();
    }
    this.lastVisibleLifeCharges = lifeCharges;
    this.livesHud.setText(`Lives: ${lifeCharges + 1}`);
    this.livesHud.setVisible(
      !this.isInHouse() && Boolean(this.getFlag<boolean>('ui.livesRevealed')),
    );
    const temperature = this.snakeGame.getPlayerTemperature();
    if (!this.isInHouse() && temperature.active) {
      const filled = Math.max(0, Math.min(temperature.max, temperature.current));
      const empty = Math.max(0, temperature.max - filled);
      const label = temperature.hazard === 'hot' ? 'HEAT' : 'COLD';
      const color = temperature.hazard === 'hot' ? '#ffb36b' : '#9ad1ff';
      this.temperatureHud.setColor(color);
      this.temperatureHud.setText(`${label}: ${'■'.repeat(filled)}${'□'.repeat(empty)}`);
      this.temperatureHud.setVisible(true);
      if (head && filled >= Math.ceil(temperature.max * 0.66) && this.time.now >= this.nextDangerPulseAtMs) {
        const world = this.tileToWorld(head);
        this.juice.dangerPulse(world.x, world.y, filled / Math.max(1, temperature.max));
        this.nextDangerPulseAtMs = this.time.now + 360;
      }
    } else {
      this.temperatureHud.setVisible(false);
    }

    if (!this.isInHouse() && head && pActive && this.time.now >= this.nextPowerupSparkAtMs) {
      const world = this.tileToWorld(head);
      this.juice.powerupTick(world.x, world.y, pActive.kind, pActive.remaining, pActive.total ?? pActive.remaining);
      const progress = pActive.remaining / Math.max(1, pActive.total ?? pActive.remaining);
      this.nextPowerupSparkAtMs = this.time.now + (progress < 0.22 ? 90 : 150);
    }

    const radiation = this.snakeGame.getRadiationTimer();
    if (!this.isInHouse() && radiation) {
      const remainingSeconds = Math.ceil(radiation.remainingMs / 1000);
      const minutes = Math.floor(remainingSeconds / 60)
        .toString()
        .padStart(2, '0');
      const seconds = (remainingSeconds % 60).toString().padStart(2, '0');
      const color =
        remainingSeconds <= 15 ? '#ff3b3b' : remainingSeconds <= 45 ? '#ff9f1c' : '#7cff3a';
      this.radiationHud.setColor(color);
      this.radiationHud.setText(`RADIOACTIVE SUBSTANCE: ${minutes}:${seconds}`);
      this.radiationHud.setVisible(true);
      if (head && remainingSeconds <= 30 && this.time.now >= this.nextDangerPulseAtMs) {
        const world = this.tileToWorld(head);
        this.juice.dangerPulse(world.x, world.y, remainingSeconds <= 15 ? 1 : 0.72);
        this.nextDangerPulseAtMs = this.time.now + (remainingSeconds <= 15 ? 260 : 420);
      }
    } else {
      this.radiationHud.setVisible(false);
    }

    // Render bosses
    this.drawFreakYouPortalFx(room.id);
    const bosses = this.snakeGame.getBosses(room.id);
    const timeMs = this.time.now;
    for (const boss of bosses) {
      let bossColor: number;
      let bossAlpha: number;

      if (boss.kind === 'angel') {
        bossColor = 0xfff2a8;
        bossAlpha = 0.92;
      } else if (boss.kind === 'freak-you') {
        bossColor = 0xff2d55;
        bossAlpha = 0.9;
      } else if (boss.kind === 'freaker-dennis' && boss.rainbowPalette) {
        const palette = defaultGameConfig.freakerDennis?.rainbowPalette;
        if (palette && palette.enabled) {
          const colors = palette.colors;
          const speed = palette.speed ?? 1;
          const tickInterval = speed * 1000;
          const colorIndex = Math.floor(timeMs / tickInterval) % colors.length;
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

      for (let index = 0; index < boss.body.length; index += 1) {
        const segment = boss.body[index];
        const [roomX, roomY] = room.id.split(',').map(Number);
        const localX = segment.x - roomX * this.grid.cols;
        const localY = segment.y - roomY * this.grid.rows;
        if (localX >= 0 && localX < this.grid.cols && localY >= 0 && localY < this.grid.rows) {
          const { x, y } = this.snakeRenderer.getWorldPosition(segment, room.id);
          const isFreakYouHead = boss.kind === 'freak-you' && index < 3;
          const isFreakYouHeadCenter =
            isFreakYouHead &&
            (boss.headCenter
              ? segment.x === boss.headCenter.x && segment.y === boss.headCenter.y
              : index === 1);
          this.graphics
            .fillStyle(isFreakYouHead ? 0xff7a8f : bossColor, isFreakYouHead ? 0.98 : bossAlpha)
            .fillRect(x, y, this.grid.cell, this.grid.cell);
          if (isFreakYouHeadCenter) {
            const noseSize = Math.max(3, this.grid.cell * 0.28);
            const noseX = x + this.grid.cell / 2 + (boss.direction?.x ?? 0) * this.grid.cell * 0.32;
            const noseY = y + this.grid.cell / 2 + (boss.direction?.y ?? 0) * this.grid.cell * 0.32;
            this.graphics.fillStyle(0x7dffe0, 0.95).fillCircle(noseX, noseY, noseSize);
          }
          if (isFreakYouHead) {
            this.graphics
              .lineStyle(2, 0x0b2b25, 0.9)
              .strokeRect(x + 2, y + 2, this.grid.cell - 4, this.grid.cell - 4);
          }
        }
      }
    }

    this.featureManager.call('onRender', this, this.graphics);
    this.drawQuestRoomActors(this.snakeGame.getQuestRoomActors(room.id));

    // Update simple house HUD
    if (this.isInHouse()) {
      const purchases = (this.snakeGame.getFlag<Record<string, unknown>>('house.purchases') ??
        {}) as Record<string, unknown>;
      const expandLevel = Number(this.snakeGame.getFlag<number>('house.expandLevel') ?? 0);
      const expandCap = 5;
      const lines = [
        `House Shop — Score: ${this.score}`,
        `1) Couch (10) ${purchases['couch'] ? '✓' : ''}`,
        `2) Kitchen (15) ${purchases['kitchen'] ? '✓' : ''}`,
        `3) Expand (20) level ${expandLevel}/${expandCap}`,
        `4) Bed (12) ${purchases['bed'] ? '✓' : ''}`,
        `5) Plant (8) ${purchases['plant'] ? '✓' : ''}`,
        `6) Lamp (14) ${purchases['lamp'] ? '✓' : ''}`,
        `Press 1, 2, or 3 to buy`,
      ];
      this.houseHud.setText(lines.join('\n'));
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
    this.skillTree.getOverlay().announce(`Chosen faith: ${id}`, '#fff3a8', 2000);
  }

  // Called by character creation flow
  setBackgroundChoice(id: string, mods: Partial<typeof this.backgroundMods>): void {
    this.chosenBackgroundId = id;
    this.backgroundMods = { ...mods } as any;
    this.applyEquipmentEffects();
    this.skillTree.getOverlay().announce(`Background: ${id}`, '#9ad1ff', 1800);
  }

  setClassChoice(id: string, mods: Partial<typeof this.classMods>): void {
    this.chosenClassId = id;
    this.classMods = { ...mods } as any;
    this.applyEquipmentEffects();
    this.skillTree.getOverlay().announce(`Class: ${id}`, '#c8ffe1', 1800);
  }

  getChosenReligionId(): string | null {
    return this.chosenReligionId;
  }

  getReligionMods(): typeof this.religionMods {
    return this.religionMods;
  }

  getChosenBackgroundId(): string | null {
    return this.chosenBackgroundId;
  }

  getBackgroundMods(): typeof this.backgroundMods {
    return this.backgroundMods;
  }

  getChosenClassId(): string | null {
    return this.chosenClassId;
  }

  getClassMods(): typeof this.classMods {
    return this.classMods;
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

  isMinimapUnlocked(): boolean {
    return Boolean(this.getFlag<boolean>('ui.minimap.unlocked'));
  }

  isMinimapEnabled(): boolean {
    return this.isMinimapUnlocked() && Boolean(this.getFlag<boolean>('ui.minimap.enabled'));
  }

  purchaseOrToggleMinimap(): { ok: boolean; message: string; color: string } {
    if (!this.isMinimapUnlocked()) {
      if (this.score < MINIMAP_MODULE_COST) {
        return {
          ok: false,
          message: `Minimap Module costs ${MINIMAP_MODULE_COST} score.`,
          color: '#ff6b6b',
        };
      }
      this.addScoreDirect(-MINIMAP_MODULE_COST);
      this.setFlag('ui.minimap.unlocked', true);
      this.setFlag('ui.minimap.enabled', true);
      this.isDirty = true;
      return {
        ok: true,
        message: 'Minimap Module unlocked.',
        color: '#5dd6a2',
      };
    }

    return this.toggleMinimap() ?? {
      ok: false,
      message: 'Minimap Module is not unlocked.',
      color: '#ff6b6b',
    };
  }

  toggleMinimap(): { ok: boolean; message: string; color: string } | null {
    if (!this.isMinimapUnlocked()) {
      return null;
    }
    const enabled = !this.isMinimapEnabled();
    this.setFlag('ui.minimap.enabled', enabled);
    this.isDirty = true;
    return {
      ok: true,
      message: `Minimap ${enabled ? 'enabled' : 'disabled'}.`,
      color: '#9ad1ff',
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
    if (unlocked.has(GOBLIN_SNAKE_STYLE.id)) {
      merged.set(GOBLIN_SNAKE_STYLE.id, {
        id: GOBLIN_SNAKE_STYLE.id,
        label: GOBLIN_SNAKE_STYLE.label,
        cost: GOBLIN_SNAKE_STYLE.price,
        palette: GOBLIN_SNAKE_STYLE.palette,
      });
    }
    return Array.from(merged.values());
  }

  getSnakeHatDefinitions(): readonly { id: VillageShopHatId; label: string; price: number }[] {
    const shopHats = getVillageShopDefinition(this.snakeGame.getCurrentRoom().biomeId).hats;
    const unlocked = new Set(this.snakeCosmetics.unlockedHats);
    const hats = shopHats.filter((hat) => hat.id === LEGACY_COWBOY_HAT_ID || unlocked.has(hat.id));
    return hats.length > 0
      ? hats
      : [{ id: LEGACY_COWBOY_HAT_ID, label: 'Cowboy Hat', price: COWBOY_HAT_COST }];
  }

  getCurrentVillageShop(): VillageShopDefinition | null {
    const room = this.snakeGame.getCurrentRoom();
    if (!room.village && !room.town) {
      return null;
    }
    const stock = this.getCurrentVillageMarketStock();
    const townDistrict = room.town ? getTownDistrictForRoom(room.town, room.id) : undefined;
    if (townDistrict === 'guildHideout') {
      const blackMarket = getBlackMarketDefinition();
      const blackMarketStock = this.getCurrentBlackMarketSupplyStock();
      return {
        ...blackMarket,
        supplies: blackMarket.supplies.filter((offer) => (blackMarketStock.supplyCounts[offer.itemId] ?? 0) > 0),
      };
    }
    const definition = getVillageShopDefinition(room.biomeId);
    return {
      equipment: definition.equipment.filter((offer) =>
        stock.equipmentIds.includes(offer.id),
      ) as VillageShopEquipmentOffer[],
      styles: definition.styles.filter((offer) =>
        stock.styleIds.includes(offer.id),
      ) as VillageShopStyleOffer[],
      hats: definition.hats.filter((offer) =>
        stock.hatIds.includes(offer.id),
      ) as VillageShopHatOffer[],
      supplies: definition.supplies.filter((offer) => (stock.supplyCounts[offer.itemId] ?? 0) > 0),
    };
  }

  private getCurrentVillageMarketStock(): VillageMarketStock {
    const room = this.snakeGame.getCurrentRoom();
    const key = room.town ? `town.market.stock.${room.town.id}` : `market.stock.${room.id}`;
    const saved = this.getFlag<VillageMarketStock>(key);
    if (
      saved?.version === 3 &&
      Array.isArray(saved.equipmentIds) &&
      Array.isArray(saved.styleIds) &&
      Array.isArray(saved.hatIds) &&
      Array.isArray(saved.cardIds) &&
      saved.supplyCounts &&
      typeof saved.supplyCounts === 'object'
    ) {
      return saved;
    }
    const stock: VillageMarketStock = {
      version: 3,
      equipmentIds: this.pickMarketOffers(
        VILLAGE_SHOP_EQUIPMENT.map((offer) => offer.id),
        room.town ? Math.min(4, VILLAGE_SHOP_EQUIPMENT.length) : 2,
      ),
      styleIds: this.pickMarketOffers(
        VILLAGE_SHOP_STYLES.map((offer) => offer.id),
        room.town ? Math.min(3, VILLAGE_SHOP_STYLES.length) : 2,
      ) as VillageShopStyleId[],
      hatIds: this.pickMarketOffers(
        VILLAGE_SHOP_HATS.map((offer) => offer.id),
        room.town ? Math.min(4, VILLAGE_SHOP_HATS.length) : 2,
      ) as VillageShopHatId[],
      cardIds: this.pickMarketCardOffers(room.town ? 8 : undefined),
      supplyCounts: this.rollVillageSupplyStock(room.town ? 'town' : 'village'),
    };
    this.setFlag(key, stock);
    return stock;
  }

  private rollVillageSupplyStock(kind: 'village' | 'town'): Record<string, number> {
    const stock: Record<string, number> = {
      'healing-potion': 1,
      senbei: kind === 'town' ? 2 : 1,
    };
    if (this.random() < 0.5) {
      stock['healing-potion'] += 1;
    }
    if (this.random() < 1 / 3) {
      stock['life-tonic'] = 1;
    }
    if (this.random() < (kind === 'town' ? 0.7 : 0.45)) {
      stock.ramen = 1;
    }
    if (this.random() < 0.5) {
      stock['animal-bait'] = 1;
    }
    return stock;
  }

  private setCurrentVillageMarketStock(stock: VillageMarketStock): void {
    const room = this.snakeGame.getCurrentRoom();
    this.setFlag(room.town ? `town.market.stock.${room.town.id}` : `market.stock.${room.id}`, stock);
  }

  private getCurrentMarketCardOffers(): CardId[] {
    return this.getCurrentVillageMarketStock().cardIds;
  }

  private getCurrentBlackMarketSupplyStock(): SupplyStock {
    const room = this.snakeGame.getCurrentRoom();
    const townId = room.town?.id ?? room.id;
    const key = `town.blackMarket.supplies.${townId}`;
    const saved = this.getFlag<SupplyStock>(key);
    if (saved?.version === 1 && saved.supplyCounts && typeof saved.supplyCounts === 'object') {
      return saved;
    }
    const stock: SupplyStock = {
      version: 1,
      supplyCounts: {
        'healing-potion': 1,
        ...(this.random() < 1 / 3 ? { 'life-tonic': 1 } : {}),
        ...(this.random() < 0.5 ? { ofuda: 1 } : {}),
      },
    };
    this.setFlag(key, stock);
    return stock;
  }

  private setCurrentBlackMarketSupplyStock(stock: SupplyStock): void {
    const room = this.snakeGame.getCurrentRoom();
    const townId = room.town?.id ?? room.id;
    this.setFlag(`town.blackMarket.supplies.${townId}`, stock);
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

  private pickMarketCardOffers(forcedCount?: number): CardId[] {
    const count = forcedCount ?? (this.random() < 0.42 ? 1 : 2);
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

  private cardShopWeight(rarity: 'common' | 'uncommon' | 'rare'): number {
    if (rarity === 'common') {
      return 10;
    }
    if (rarity === 'uncommon') {
      return 4;
    }
    return 1;
  }

  purchaseOrApplySnakeTheme(themeId: SnakeThemeId): {
    ok: boolean;
    message: string;
    color: string;
  } {
    const theme = this.getSnakeThemeDefinitions().find((entry) => entry.id === themeId);
    if (!theme) {
      return { ok: false, message: 'Unknown snake palette.', color: '#ff6b6b' };
    }

    const unlocked = this.snakeCosmetics.unlockedThemes.includes(themeId);
    if (!unlocked) {
      if (this.score < theme.cost) {
        return {
          ok: false,
          message: `${theme.label} costs ${theme.cost} score.`,
          color: '#ff6b6b',
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
      color: '#5dd6a2',
    };
  }

  equipOwnedSnakeTheme(themeId: SnakeThemeId): {
    ok: boolean;
    message: string;
    color: string;
  } {
    const theme = this.getSnakeThemeDefinitions().find((entry) => entry.id === themeId);
    if (!theme) {
      return { ok: false, message: 'Unknown snake palette.', color: '#ff6b6b' };
    }
    if (!this.snakeCosmetics.unlockedThemes.includes(themeId)) {
      return { ok: false, message: `${theme.label} is sold in town and village shops.`, color: '#ff6b6b' };
    }
    this.snakeCosmetics.activeTheme = themeId;
    this.isDirty = true;
    return {
      ok: true,
      message: `${theme.label} equipped.`,
      color: '#5dd6a2',
    };
  }

  purchaseVillageEquipment(itemId: string): { ok: boolean; message: string; color: string } {
    const shop = this.getCurrentVillageShop();
    if (!shop) {
      return { ok: false, message: 'Village shops only open in villages.', color: '#ff6b6b' };
    }
    const offer = shop.equipment.find((entry) => entry.itemId === itemId);
    if (!offer) {
      return { ok: false, message: 'That gear is not stocked here.', color: '#ff6b6b' };
    }
    const item = getItem(itemId) as any;
    if (!item || item.kind !== 'equipment') {
      return { ok: false, message: 'That gear does not exist.', color: '#ff6b6b' };
    }
    if (this.snakeGame.getInventory().getItemCount(itemId) > 0) {
      return { ok: false, message: `${item.name} is already in your pack.`, color: '#9ad1ff' };
    }
    if (this.score < offer.price) {
      return { ok: false, message: `${item.name} costs ${offer.price} score.`, color: '#ff6b6b' };
    }
    this.addScoreDirect(-offer.price);
    this.snakeGame.addItem(itemId, 1);
    this.equipItem(itemId);
    this.isDirty = true;
    return { ok: true, message: `${item.name} bought and equipped.`, color: '#5dd6a2' };
  }

  purchaseVillageSupply(itemId: string): { ok: boolean; message: string; color: string } {
    const shop = this.getCurrentVillageShop();
    if (!shop) {
      return { ok: false, message: 'No shop is open here.', color: '#ff6b6b' };
    }
    const offer = shop.supplies.find((entry) => entry.itemId === itemId);
    if (!offer) {
      return { ok: false, message: 'That supply is not stocked here.', color: '#ff6b6b' };
    }
    const room = this.snakeGame.getCurrentRoom();
    const isBlackMarket = Boolean(room.town && getTownDistrictForRoom(room.town, room.id) === 'guildHideout');
    const blackMarketStock = isBlackMarket ? this.getCurrentBlackMarketSupplyStock() : null;
    const stock = isBlackMarket ? null : this.getCurrentVillageMarketStock();
    const available = stock ? (stock.supplyCounts[itemId] ?? 0) : 1;
    const blackMarketAvailable = blackMarketStock ? (blackMarketStock.supplyCounts[itemId] ?? 0) : 1;
    if ((stock && available <= 0) || (blackMarketStock && blackMarketAvailable <= 0)) {
      return { ok: false, message: 'That shelf is sold out.', color: '#ff6b6b' };
    }
    const item = getItem(itemId);
    if (!item) {
      return { ok: false, message: 'That supply does not exist.', color: '#ff6b6b' };
    }
    if (this.score < offer.price) {
      return { ok: false, message: `${item.name} costs ${offer.price} score.`, color: '#ff6b6b' };
    }
    this.addScoreDirect(-offer.price);
    this.snakeGame.addItem(itemId, 1);
    if (stock) {
      this.setCurrentVillageMarketStock({
        ...stock,
        supplyCounts: {
          ...stock.supplyCounts,
          [itemId]: Math.max(0, available - 1),
        },
      });
    } else if (blackMarketStock) {
      this.setCurrentBlackMarketSupplyStock({
        ...blackMarketStock,
        supplyCounts: {
          ...blackMarketStock.supplyCounts,
          [itemId]: Math.max(0, blackMarketAvailable - 1),
        },
      });
    }
    this.isDirty = true;
    return { ok: true, message: `${item.name} bought. Use it from your pack.`, color: '#5dd6a2' };
  }

  purchaseVillageStyle(styleId: VillageShopStyleId): {
    ok: boolean;
    message: string;
    color: string;
  } {
    const shop = this.getCurrentVillageShop();
    if (!shop) {
      return {
        ok: false,
        message: 'Village styles are sold by village shopkeepers.',
        color: '#ff6b6b',
      };
    }
    const offer = shop.styles.find((entry) => entry.id === styleId);
    if (!offer) {
      return { ok: false, message: 'That style is not stocked here.', color: '#ff6b6b' };
    }
    const unlocked = this.snakeCosmetics.unlockedThemes.includes(styleId);
    if (!unlocked) {
      if (this.score < offer.price) {
        return {
          ok: false,
          message: `${offer.label} costs ${offer.price} score.`,
          color: '#ff6b6b',
        };
      }
      this.addScoreDirect(-offer.price);
      this.snakeCosmetics.unlockedThemes = [...this.snakeCosmetics.unlockedThemes, styleId];
    }
    this.snakeCosmetics.activeTheme = styleId;
    this.isDirty = true;
    return {
      ok: true,
      message: unlocked ? `${offer.label} equipped.` : `${offer.label} bought and equipped.`,
      color: '#5dd6a2',
    };
  }

  purchaseOrToggleVillageHat(hatId: VillageShopHatId): {
    ok: boolean;
    message: string;
    color: string;
  } {
    const shop = this.getCurrentVillageShop();
    const offer = shop?.hats.find((entry) => entry.id === hatId);
    if (!offer && hatId !== LEGACY_COWBOY_HAT_ID) {
      return { ok: false, message: 'That hat is not sold here.', color: '#ff6b6b' };
    }
    const label = offer?.label ?? 'Cowboy Hat';
    const price = offer?.price ?? COWBOY_HAT_COST;
    const unlocked = this.snakeCosmetics.unlockedHats.includes(hatId);
    if (!unlocked) {
      if (!shop && hatId !== LEGACY_COWBOY_HAT_ID) {
        return { ok: false, message: 'Village hats are sold in villages.', color: '#ff6b6b' };
      }
      if (this.score < price) {
        return { ok: false, message: `${label} costs ${price} score.`, color: '#ff6b6b' };
      }
      this.addScoreDirect(-price);
      this.snakeCosmetics.unlockedHats = [...this.snakeCosmetics.unlockedHats, hatId];
    }

    this.snakeCosmetics.activeHat = this.snakeCosmetics.activeHat === hatId ? null : hatId;
    this.snakeCosmetics.cowboyHatUnlocked =
      this.snakeCosmetics.unlockedHats.includes(LEGACY_COWBOY_HAT_ID);
    this.snakeCosmetics.cowboyHatEquipped = this.snakeCosmetics.activeHat === LEGACY_COWBOY_HAT_ID;
    this.isDirty = true;
    return {
      ok: true,
      message: this.snakeCosmetics.activeHat === hatId ? `${label} equipped.` : `${label} stowed.`,
      color: unlocked ? '#9ad1ff' : '#5dd6a2',
    };
  }

  purchaseOrToggleCowboyHat(): { ok: boolean; message: string; color: string } {
    return this.purchaseOrToggleVillageHat(LEGACY_COWBOY_HAT_ID);
  }

  toggleOwnedSnakeHat(hatId: VillageShopHatId): { ok: boolean; message: string; color: string } {
    const hat = this.getSnakeHatDefinitions().find((entry) => entry.id === hatId);
    const label = hat?.label ?? 'Hat';
    if (!this.snakeCosmetics.unlockedHats.includes(hatId)) {
      return { ok: false, message: `${label} is sold in town and village shops.`, color: '#ff6b6b' };
    }
    this.snakeCosmetics.activeHat = this.snakeCosmetics.activeHat === hatId ? null : hatId;
    this.snakeCosmetics.cowboyHatUnlocked =
      this.snakeCosmetics.unlockedHats.includes(LEGACY_COWBOY_HAT_ID);
    this.snakeCosmetics.cowboyHatEquipped = this.snakeCosmetics.activeHat === LEGACY_COWBOY_HAT_ID;
    this.isDirty = true;
    return {
      ok: true,
      message: this.snakeCosmetics.activeHat === hatId ? `${label} equipped.` : `${label} stowed.`,
      color: '#9ad1ff',
    };
  }

  private getCardCollection(): CardCollection {
    const saved = this.getFlag<Record<string, unknown>>('cards.collection') ?? {};
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
    this.setFlag('cards.collection', collection);
    this.isDirty = true;
  }

  purchaseVillageCard(cardId: CardId): { ok: boolean; message: string; color: string } {
    const card = getCardDefinition(cardId);
    const stock = this.getCurrentVillageMarketStock();
    if (!stock.cardIds.includes(cardId)) {
      return { ok: false, message: `${card.name} is sold out here.`, color: '#ff6b6b' };
    }
    if (this.score < card.price) {
      return { ok: false, message: `${card.name} costs ${card.price} score.`, color: '#ff6b6b' };
    }
    const collection = this.getCardCollection();
    this.addScoreDirect(-card.price);
    collection[cardId] = Number(collection[cardId] ?? 0) + 1;
    this.setCardCollection(collection);
    this.setCurrentVillageMarketStock({
      ...stock,
      cardIds: stock.cardIds.filter((id) => id !== cardId),
    });
    this.juice.cardPurchased(this.scale.width / 2, 94, card.rarity);
    return { ok: true, message: `${card.name} added to your deck.`, color: '#5dd6a2' };
  }

  private applyPendingQuestCosmeticRewards(): void {
    const rewards = this.snakeGame.getFlag<
      Array<{ type: 'style' | 'hat'; id: SnakeThemeId | VillageShopHatId }>
    >('quest.pendingCosmeticRewards');
    if (!Array.isArray(rewards) || rewards.length === 0) {
      return;
    }
    const themes = this.getSnakeThemeDefinitions();
    const shop =
      this.getCurrentVillageShop() ??
      getVillageShopDefinition(this.snakeGame.getCurrentRoom().biomeId);
    const hatOffers = shop.hats;
    for (const reward of rewards) {
      if (reward.type === 'style') {
        const styleId = reward.id as SnakeThemeId;
        if (
          themes.some((theme) => theme.id === styleId) &&
          !this.snakeCosmetics.unlockedThemes.includes(styleId)
        ) {
          this.snakeCosmetics.unlockedThemes = [...this.snakeCosmetics.unlockedThemes, styleId];
          this.snakeCosmetics.activeTheme = styleId;
        }
      } else {
        const hatId = reward.id as VillageShopHatId;
        if (
          hatOffers.some((hat) => hat.id === hatId) &&
          !this.snakeCosmetics.unlockedHats.includes(hatId)
        ) {
          this.snakeCosmetics.unlockedHats = [...this.snakeCosmetics.unlockedHats, hatId];
          this.snakeCosmetics.activeHat = hatId;
        }
      }
    }
    this.snakeCosmetics.cowboyHatUnlocked =
      this.snakeCosmetics.unlockedHats.includes(LEGACY_COWBOY_HAT_ID);
    this.snakeCosmetics.cowboyHatEquipped = this.snakeCosmetics.activeHat === LEGACY_COWBOY_HAT_ID;
    this.snakeGame.setFlag('quest.pendingCosmeticRewards', undefined);
  }

  toggleDisableWalkingNoise(): { ok: boolean; message: string; color: string } {
    const cost = 100;
    if (!this.snakeCosmetics.loudWalkingNoiseUnlocked) {
      if (this.score < cost) {
        return {
          ok: false,
          message: `Disable Walking Noise costs ${cost} score.`,
          color: '#ff6b6b',
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
        ? 'Walking noise disabled.'
        : 'Walking noise restored.',
      color: '#9ad1ff',
    };
  }

  private getActiveSnakeTheme(): SnakeThemeDefinition {
    return (
      this.getSnakeThemeDefinitions().find(
        (entry) => entry.id === this.snakeCosmetics.activeTheme,
      ) ?? SNAKE_THEME_DEFINITIONS[0]
    );
  }

  private isInHouse(): boolean {
    return this.currentRoomId === '0,-1,0';
  }

  private getVisibleLifeCharges(): number {
    const skillLives = Math.max(0, Number(this.skillTree?.getStats().extraLives ?? 0));
    const phoenixLives = Math.max(0, Number(this.getFlag<number>('equipment.phoenixCharges') ?? 0));
    return skillLives + phoenixLives;
  }

  private tryBuyHouse(kind: 'couch' | 'kitchen' | 'expand' | 'bed' | 'plant' | 'lamp'): void {
    const ok = this.snakeGame.purchaseHouseItem(kind);
    if (ok) {
      this.isDirty = true;
      // Small confirmation popup near top-left
      const popup = this.add
        .text(120, 8, `${kind} purchased`, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#9ad1ff',
        })
        .setDepth(31)
        .setOrigin(0, 0)
        .setAlpha(0.95);
      this.tweens.add({
        targets: popup,
        y: 26,
        alpha: 0,
        duration: 700,
        ease: 'Cubic.easeOut',
        onComplete: () => popup.destroy(),
      });
    } else {
      // Error popup
      const popup = this.add
        .text(120, 8, `Cannot purchase ${kind}`, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#ff8578',
        })
        .setDepth(31)
        .setOrigin(0, 0)
        .setAlpha(0.95);
      this.tweens.add({
        targets: popup,
        y: 26,
        alpha: 0,
        duration: 700,
        ease: 'Cubic.easeOut',
        onComplete: () => popup.destroy(),
      });
    }
  }

  // Monitor room transitions to start/stop house ambience
  private updateHouseAmbience(): void {
    const insideInterior = this.isInPlayerHouseInterior();
    if (insideInterior && !this.houseMusicActive) {
      (this.juice as any).startHouseAmbience?.();
      this.houseMusicActive = true;
    } else if (!insideInterior && this.houseMusicActive) {
      (this.juice as any).stopHouseAmbience?.();
      this.houseMusicActive = false;
    }
    // Apply slowdown only when snake is actually inside an interior.
    this.skillTree.applyActionStepIntervalScalar(insideInterior ? 1.6 : 1.0, 'house');
    this.updateTownMusic();
  }

  private updateTownMusic(): void {
    const room = this.snakeGame.getCurrentRoom();
    const district = room.town ? getTownDistrictForRoom(room.town, room.id) : undefined;
    const insideTownInterior = Boolean(
      district &&
        district !== 'outskirts' &&
        district !== 'gate' &&
        district !== 'townExit',
    );
    if (insideTownInterior && !this.townMusicActive) {
      (this.juice as any).startTownMusic?.();
      this.townMusicActive = true;
    } else if (!insideTownInterior && this.townMusicActive) {
      (this.juice as any).stopTownMusic?.();
      this.townMusicActive = false;
    }
  }

  private isInPlayerHouseInterior(): boolean {
    if (!this.isInHouse()) {
      return false;
    }
    return this.isOnInteriorTile();
  }

  private isOnInteriorTile(): boolean {
    const local = this.getHeadLocalInCurrentRoom();
    if (!local) return false;
    const room = this.snakeGame.getCurrentRoom();
    const tile = room.layout[local.y]?.[local.x];
    if (!tile) return false;
    // Interior tiles (wood, rug, trim, and furniture) across any generated house.
    return 'WETCKBPL'.includes(tile);
  }

  private isManualHouseMovementActive(): boolean {
    return (
      !this.paused &&
      !this.offeredQuest &&
      (this.isTurnBasedFreeZone() || Boolean(this.getFlag<boolean>('traversal.manualResumePending')))
    );
  }

  private isTurnBasedFreeZone(): boolean {
    const local = this.getHeadLocalInCurrentRoom();
    if (!local) {
      return false;
    }
    const room = this.snakeGame.getCurrentRoom();
    const tile = room.layout[local.y]?.[local.x];
    if (!tile || tile === '#') {
      return false;
    }
    const bounds = this.getTurnBasedZoneBounds(room);
    return bounds.some((bound) => this.isLocalInsideRect(local, bound));
  }

  private getHeadLocalInCurrentRoom(): { x: number; y: number } | null {
    const head = this.snakeGame.getSnakeBody()[0];
    if (!head) return null;
    const room = this.snakeGame.getCurrentRoom();
    const [rx, ry] = room.id.split(',').map(Number);
    const local = {
      x: head.x - rx * this.grid.cols,
      y: head.y - ry * this.grid.rows,
    };
    if (local.x < 0 || local.y < 0 || local.x >= this.grid.cols || local.y >= this.grid.rows) {
      return null;
    }
    return local;
  }

  private getTurnBasedZoneBounds(room: ReturnType<SnakeGame['getCurrentRoom']>): LocalRect[] {
    if (room.village) {
      return [room.village.safeArea];
    }
    if (room.goblinCamp) {
      return [room.goblinCamp.safeArea];
    }
    if (room.snakeMcDonalds) {
      return [room.snakeMcDonalds.bounds];
    }
    if (room.town) {
      return [room.town.safeArea];
    }
    if (
      room.allNiteDiner ||
      room.fireworkStand ||
      room.roadsideMonument ||
      room.jackalopeLodge ||
      room.gridironYard
    ) {
      const bounds = this.getTileBounds(room, 'AELMNPRWFG');
      return bounds ? [bounds] : [];
    }
    if (room.questGiver) {
      const bounds = this.getTileBounds(room, 'WETG');
      return bounds ? [bounds] : [];
    }
    if (!this.isInHouse()) {
      return [];
    }
    const bounds = this.getTileBounds(room, 'WETCKBPL');
    return bounds ? [bounds] : [];
  }

  private getTileBounds(
    room: ReturnType<SnakeGame['getCurrentRoom']>,
    tileSet: string,
  ): LocalRect | null {
    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    for (let y = 0; y < room.layout.length; y += 1) {
      const row = room.layout[y] ?? '';
      for (let x = 0; x < row.length; x += 1) {
        if (tileSet.includes(row[x] ?? '')) {
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }
    }
    if (!Number.isFinite(left) || !Number.isFinite(top)) {
      return null;
    }
    return { left, top, width: right - left + 1, height: bottom - top + 1 };
  }

  private isLocalInsideRect(local: { x: number; y: number }, rect: LocalRect): boolean {
    return (
      local.x >= rect.left &&
      local.x < rect.left + rect.width &&
      local.y >= rect.top &&
      local.y < rect.top + rect.height
    );
  }

  private consumeManualResumePause(): void {
    if (this.getFlag<boolean>('traversal.manualResumePending')) {
      this.setFlag('traversal.manualResumePending', undefined);
    }
  }

  private getQuestGiverHint(): { text: string } | null {
    if (this.isInHouse() || this.paused || this.offeredQuest) {
      return null;
    }
    const questActorHint = this.snakeGame.getNearbyQuestActorHint();
    if (questActorHint) {
      return { text: questActorHint };
    }
    const room = this.snakeGame.getCurrentRoom();
    const shopkeeper = room.village?.shopkeeper;
    if (shopkeeper && this.distanceFromHeadToLocal(shopkeeper) <= 1) {
      return { text: `Shop with ${shopkeeper.name ?? 'shopkeeper'} (press E)` };
    }
    const goblinShopkeeper = room.goblinCamp?.shopkeeper;
    if (goblinShopkeeper && this.distanceFromHeadToLocal(goblinShopkeeper) <= 1) {
      const standing = this.snakeGame.getFactionAlignment('goblin-camps').standing;
      return {
        text:
          standing === 'violent'
            ? `${goblinShopkeeper.name ?? 'Goblin'} is violent`
            : `Trade wards with ${goblinShopkeeper.name ?? 'goblin'} (press E)`,
      };
    }
    const mc = room.snakeMcDonalds;
    if (mc && this.distanceFromHeadToLocal(mc.toilet) <= 1) {
      return { text: 'Press E to flush' };
    }
    const libertyHint = this.getLibertyStructureHint(room);
    if (libertyHint) {
      return { text: libertyHint };
    }
    const town = room.town;
    if (town && this.distanceFromHeadToLocal(town.center) <= 3) {
      const current = getTownDistrictForRoom(town, room.id);
      return {
        text: `${town.name}${current ? `: ${townDistrictDisplayName(current)}` : ''} (press E)`,
      };
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
    if (disposition.hostility === 'hostile') {
      return { text: `${giver.name ?? 'NPC'} is hostile` };
    }
    const name = giver.name ? `Talk to ${giver.name}` : 'Talk to quest giver';
    return { text: `${name} (press E)` };
  }

  private distanceFromHeadToLocal(target: { x: number; y: number }): number {
    const head = this.snakeGame.getSnakeBody()[0];
    if (!head) {
      return Number.POSITIVE_INFINITY;
    }
    const room = this.snakeGame.getCurrentRoom();
    const [roomX, roomY] = room.id.split(',').map(Number);
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
    this.showVillageShopRoot(shopkeeper.name ?? 'Village Shopkeeper');
    return true;
  }

  private tryInteractTown(): boolean {
    if (this.paused || this.offeredQuest || this.choicePopupVisible) {
      return false;
    }
    const town = this.snakeGame.getCurrentTown();
    if (!town || this.distanceFromHeadToLocal(town.center) > 4) {
      return false;
    }
    this.showTownRoom(town);
    return true;
  }

  private showTownRoom(town: TownStructure): void {
    const freshTown = this.snakeGame.getCurrentTown() ?? town;
    const room = this.snakeGame.getCurrentRoom();
    const current = getTownDistrictForRoom(freshTown, room.id);
    if (!current) {
      this.showQuestHintPopup('The town map has misplaced itself.', '#ff6b6b');
      return;
    }
    const hostileTown = this.snakeGame.isTownHostileForRoom(freshTown, room.id);
    this.paused = true;
    this.hideSaveUI();
    this.skillTree.hideOverlay();
    const options: ChoiceOption[] = [];
    const description = [
      this.snakeGame.describeTownRoom(current),
      `Wanted ${freshTown.wantedLevel}/5. Reputation ${freshTown.reputation}.`,
      freshTown.thievesGuild?.discovered
        ? `Guild karma ${freshTown.thievesGuild.karma}.`
        : 'The back alley has opinions it has not shared yet.',
    ].join(' ');

    if (hostileTown) {
      options.push({
        id: 'leave',
        title: 'Run',
        description: 'The town is openly hostile. No one here is offering services.',
      });
      this.villageShopPopup.show(
        `${freshTown.name} - Alarm`,
        [{ id: 'town-status', title: 'Town Hostile', description }, ...options],
        (id) => this.handleTownChoice(id, freshTown),
      );
      return;
    }

    if (current === 'square' || current === 'gate' || current === 'townExit') {
      options.push({
        id: 'town-notices',
        title: 'Read Notice Board',
        description: `${freshTown.notices.length} notices, at least one written by someone enjoying authority.`,
      });
    }
    if (current === 'gate' || current === 'townExit') {
      options.push({
        id: 'town-open-gate',
        title: current === 'townExit' ? 'Talk to Exit Guard - 75 score' : 'Talk to Gate Guard - 75 score',
        description:
          current === 'townExit'
            ? 'Ask the inner guard to open the back gate. Outsiders do not get this latch.'
            : 'Pay the gate tax and ask the guard to open the barrier.',
      });
    }
    if (current === 'market' || current === 'marketStreet') {
      options.push({
        id: 'town-shop',
        title: 'Town Market',
        description: 'A larger town counter with more stock than a village stall.',
      });
      options.push({
        id: 'town-steal-flower',
        title: 'Steal a Flower',
        description: 'A relationship gift, a tiny crime, and a classic bad idea.',
      });
    }
    if (current === 'tavern' || current === 'tavernInterior') {
      options.push({
        id: 'town-rumors',
        title: 'Buy Tavern Rumor',
        description: 'Hear what the town thinks happened before it becomes true.',
      });
    }
    if (current === 'backAlley') {
      const guildTest = this.snakeGame.getCurrentTownGuildInitiationStatus();
      const guildTitle =
        guildTest.state === 'complete'
          ? 'Check Guild Grate'
          : guildTest.state === 'ready'
            ? 'Return to Guild Grate'
            : guildTest.state === 'active'
              ? `Guild Test ${guildTest.pickpockets}/${guildTest.required}`
              : 'Investigate Grate';
      const guildDescription =
        guildTest.state === 'complete'
          ? 'The grate is open. Enter through the passage, not through a menu.'
          : guildTest.state === 'ready'
            ? 'You have three proofs. Knock where the chalk snake bites the coin.'
            : guildTest.state === 'active'
              ? 'Pickpocket town residents, then return to the grate.'
              : 'A chalk snake bites a coin near the drain.';
      options.push({
        id: 'town-guild-discover',
        title: guildTitle,
        description: guildDescription,
      });
    }
    if (current === 'guildHideout') {
      options.push({
        id: 'town-guild',
        title: 'Guild Business',
        description: 'Jobs, services, and people who pronounce legality as a dare.',
      });
    }
    if (current === 'residential' || current === 'residentialStreet') {
      options.push({
        id: 'town-break-in',
        title: 'Break In',
        description: 'A residential job-shaped bad idea with witnesses nearby.',
      });
    }
    if (freshTown.wantedLevel > 0 && (current === 'gate' || current === 'square' || current === 'townExit' || current === 'exit')) {
      const fine = 8 + freshTown.wantedLevel * 7;
      options.push({
        id: `town-pay-fine:${fine}`,
        title: `Pay Fine - ${fine} score`,
        description: 'Lower wanted by one and let a clerk feel powerful.',
      });
    }
    options.push({ id: 'leave', title: 'Step Back', description: 'Return to the room.' });
    this.villageShopPopup.show(
      `${freshTown.name} - ${townDistrictDisplayName(current)}`,
      [{ id: 'town-status', title: formatTownMood(freshTown.mood), description }, ...options],
      (id) => this.handleTownChoice(id, freshTown),
    );
  }

  private handleTownChoice(id: string, town: TownStructure): void {
    if (id === 'leave' || id === 'town-status') {
      this.closeVillageShop();
      return;
    }
    if (id === 'town-notices') {
      this.showTownNotices(town);
      return;
    }
    if (id === 'town-open-gate') {
      const result = this.snakeGame.openCurrentTownGate();
      this.showQuestHintPopup(result.message, result.ok ? '#b6ff6a' : '#ff6b6b');
      this.showTownRoom(this.snakeGame.getCurrentTown() ?? town);
      return;
    }
    if (id === 'town-rumors') {
      this.showQuestHintPopup('The bartender says the alley grate only answers proof, not rumors.', '#fff3a8');
      this.showTownRoom(this.snakeGame.getCurrentTown() ?? town);
      return;
    }
    if (id === 'town-shop') {
      this.showVillageShopRoot(`${town.name} Market`, true);
      return;
    }
    if (id === 'town-steal-flower') {
      const result = this.snakeGame.applyCurrentTownCrime('theft', true, 1);
      this.showQuestHintPopup(
        result.message,
        result.ok ? '#fff3a8' : '#ff6b6b',
      );
      this.showTownRoom(result.town ?? town);
      return;
    }
    if (id === 'town-break-in') {
      const result = this.snakeGame.applyCurrentTownCrime('breakIn', true, 2);
      this.showQuestHintPopup(result.message, result.ok ? '#fff3a8' : '#ff6b6b');
      this.showTownRoom(result.town ?? town);
      return;
    }
    if (id === 'town-guild-discover') {
      const result = this.snakeGame.investigateCurrentTownGuildGrate();
      this.showQuestHintPopup(result.message, result.ok ? '#b6ff6a' : '#ff6b6b');
      this.showTownRoom(result.town ?? town);
      return;
    }
    if (id === 'town-guild') {
      this.showTownGuild(town);
      return;
    }
    if (id.startsWith('town-pay-fine:')) {
      const fine = Number(id.split(':')[1] ?? 0);
      if (this.score < fine) {
        this.showQuestHintPopup(`The fine is ${fine} score.`, '#ff6b6b');
        this.showTownRoom(town);
        return;
      }
      this.addScoreDirect(-fine);
      const current = this.snakeGame.getCurrentTown() ?? town;
      const next = { ...current, wantedLevel: Math.max(0, current.wantedLevel - 1) as TownStructure['wantedLevel'] };
      const updated = this.snakeGame.updateCurrentTown(next) ?? current;
      this.showQuestHintPopup('Fine paid. The wanted poster gets a little less personal.', '#b6ff6a');
      this.showTownRoom(updated);
    }
  }

  private showTownNotices(town: TownStructure): void {
    const freshTown = this.snakeGame.getCurrentTown() ?? town;
    const options: ChoiceOption[] = freshTown.notices.map((notice) => ({
      id: `notice:${notice.id}`,
      title: notice.title,
      description: notice.body,
    }));
    if (freshTown.rumors.length > 0) {
      options.push(
        ...freshTown.rumors.slice(0, 4).map((rumor) => ({
          id: `rumor:${rumor.id}`,
          title: 'Rumor',
          description: rumor.summary,
        })),
      );
    }
    options.push({ id: 'back', title: 'Back', description: 'Return to town business.' });
    this.villageShopPopup.show(`${freshTown.name} Notice Board`, options, (id) => {
      if (id === 'back') {
        this.showTownRoom(freshTown);
      }
    });
  }

  private showTownGuild(town: TownStructure): void {
    const freshTown = this.snakeGame.getCurrentTown() ?? town;
    const guild = freshTown.thievesGuild;
    if (!guild?.discovered) {
      this.showQuestHintPopup('The guild is still only a rumor.', '#ff6b6b');
      this.showTownRoom(freshTown);
      return;
    }
    const options: ChoiceOption[] = [
      {
        id: 'guild-lower-wanted',
        title: 'Lower Wanted',
        description: freshTown.wantedLevel > 0 ? 'Pay the guild to make posters less accurate.' : 'You are not wanted here yet.',
      },
      {
        id: 'guild-fence',
        title: 'Fence Stolen Goods',
        description: 'Convert suspicious flowers and imaginary contraband into 6 score.',
      },
      {
        id: 'guild-black-market',
        title: 'Find Black Market',
        description: 'Browse the same market table with town-sized stock and worse lighting.',
      },
    ];
    for (const job of freshTown.guildJobs.filter((entry) => entry.status === 'available')) {
      options.push({
        id: `guild-job:${job.id}`,
        title: this.guildJobTitle(job.kind),
        description: `Target: ${getTownRoom(freshTown, job.targetRoomId)?.displayName ?? 'unknown district'}. Karma +${job.karmaReward}, risk +${job.wantedRisk} wanted if botched.`,
      });
    }
    options.push({ id: 'back', title: 'Back', description: 'Return to the district.' });
    this.villageShopPopup.show(`${freshTown.name} Thieves Guild`, options, (id) => {
      if (id === 'back') {
        this.showTownRoom(freshTown);
        return;
      }
      if (id === 'guild-lower-wanted') {
        const result = this.snakeGame.reduceCurrentTownWantedViaGuild();
        this.showQuestHintPopup(result.message, result.ok ? '#b6ff6a' : '#ff6b6b');
        this.showTownGuild(result.town ?? freshTown);
        return;
      }
      if (id === 'guild-fence') {
        this.addScoreDirect(6);
        this.showQuestHintPopup('The fence buys what nobody can prove was stolen. +6 score.', '#b6ff6a');
        this.showTownGuild(this.snakeGame.getCurrentTown() ?? freshTown);
        return;
      }
      if (id === 'guild-black-market') {
        this.showVillageShopRoot(`${freshTown.name} Black Market`, true);
        return;
      }
      if (id.startsWith('guild-job:')) {
        const jobId = id.slice('guild-job:'.length);
        const success = this.random() > 0.22;
        const result = this.snakeGame.resolveCurrentTownGuildJob(jobId, success);
        this.showQuestHintPopup(result.message, result.ok && success ? '#b6ff6a' : '#fff3a8');
        this.showTownGuild(result.town ?? freshTown);
      }
    });
  }

  private guildJobTitle(kind: 'pickpocket' | 'houseJob' | 'smugglePackage'): string {
    switch (kind) {
      case 'pickpocket':
        return 'Pickpocket in Market';
      case 'houseJob':
        return 'Break Into Residence';
      case 'smugglePackage':
        return 'Smuggle Package';
    }
  }

  private tryInteractGoblinShopkeeper(): boolean {
    if (this.paused || this.offeredQuest || this.choicePopupVisible) {
      return false;
    }
    const room = this.snakeGame.getCurrentRoom();
    const shopkeeper = room.goblinCamp?.shopkeeper;
    if (!shopkeeper || this.distanceFromHeadToLocal(shopkeeper) > 1) {
      return false;
    }
    this.showGoblinShopRoot(shopkeeper.name ?? 'Goblin Clerk');
    return true;
  }

  private showGoblinShopRoot(shopkeeperName: string): void {
    this.paused = true;
    this.hideSaveUI();
    this.skillTree.hideOverlay();
    const standing = this.snakeGame.getFactionAlignment('goblin-camps').standing;
    if (standing === 'violent' || standing === 'angry') {
      this.villageShopPopup.show(`${shopkeeperName}'s Contract Stump`, [
        {
          id: 'leave',
          title: standing === 'violent' ? 'Leave quickly' : 'No Sale',
          description:
            standing === 'violent'
              ? 'The goblins are done pricing miracles and have moved to murder.'
              : 'The clerk recognizes you and closes the ledger with insulting care.',
        },
      ], () => this.closeVillageShop());
      return;
    }

    const contracts = this.snakeGame.getWardContracts();
    const usage = this.snakeGame.getWardUsage();
    const options: ChoiceOption[] = GOBLIN_WARD_SCROLLS.map((offer) => {
      const price = getWardPrice(offer, standing, Number(usage[offer.source] ?? 0)) ?? offer.basePrice;
      const owned = Number(contracts[offer.source] ?? 0);
      const used = Number(usage[offer.source] ?? 0);
      return {
        id: `ward:${offer.id}`,
        title: `${offer.label} - ${price} score${owned > 0 ? `, held x${owned}` : ''}`,
        description: `${offer.description}${used > 0 ? ` Used ${used} times; goblin price is uglier now.` : ''}`,
      };
    });
    const styleOwned = this.snakeCosmetics.unlockedThemes.includes(GOBLIN_SNAKE_STYLE.id);
    const styleEquipped = this.snakeCosmetics.activeTheme === GOBLIN_SNAKE_STYLE.id;
    options.push({
      id: `style:${GOBLIN_SNAKE_STYLE.id}`,
      title: `${GOBLIN_SNAKE_STYLE.label} - ${styleOwned ? (styleEquipped ? 'equipped' : 'owned') : `${GOBLIN_SNAKE_STYLE.price} score`}`,
      description: 'A green, sharp-eyed snake style sold only by goblin merchants.',
    });
    const goblinQuest = this.snakeGame.getGoblinLedgerQuestStatus();
    const hasMercenary = this.snakeGame.hasFollowers();
    options.push({
      id: 'hire:goblin-mercenary',
      title: hasMercenary ? 'Mercenary Contract - active' : 'Hire Goblin Mercenary - 55 score',
      description: hasMercenary
        ? 'Your hired goblin is already following, guarding, and making poor choices nearby.'
        : 'A contract fighter follows you, attacks enemies, kills animals, and accepts Q-slot commands.',
    });
    if (goblinQuest === 'available') {
      options.push({
        id: 'quest:goblin-ledger-debt',
        title: 'Ugly Errand',
        description: 'The clerk needs a missing ledger-stamp found before blame becomes furniture.',
      });
    } else if (goblinQuest === 'active') {
      options.push({
        id: 'quest:goblin-ledger-active',
        title: 'Ledger-Stamps First',
        description: 'The clerk refuses fresh business until the old stupidity is corrected.',
      });
    } else if (goblinQuest === 'turn-in') {
      options.push({
        id: 'quest:goblin-ledger-turnin',
        title: 'Return Ledger-Stamp',
        description: 'Hand over the sticky little authority and collect whatever mercy counts as pay.',
      });
    } else if (goblinQuest === 'completed') {
      options.push({
        id: 'quest:goblin-ledger-completed',
        title: 'Debt Settled',
        description: 'The clerk has no more work for you. This is probably mercy.',
      });
    }
    options.push({
      id: 'leave',
      title: 'Leave',
      description: 'Step away before the fine print learns your name.',
    });
    this.villageShopPopup.show(`${shopkeeperName}'s Ward Contracts`, options, (id) => {
      if (id === 'leave') {
        this.closeVillageShop();
        return;
      }
      const [, offerId] = id.split(':');
      if (id.startsWith('style:')) {
        const result = this.purchaseGoblinStyle();
        this.showQuestHintPopup(result.message, result.color);
        this.showGoblinShopRoot(shopkeeperName);
        return;
      }
      if (id.startsWith('quest:')) {
        this.handleGoblinShopQuestChoice(id, shopkeeperName);
        return;
      }
      if (id.startsWith('hire:')) {
        const result = this.snakeGame.hireGoblinMercenary(`${shopkeeperName}'s Cousin`);
        this.showQuestHintPopup(result.message, result.color);
        this.showGoblinShopRoot(shopkeeperName);
        return;
      }
      const result = this.purchaseGoblinWard(offerId);
      this.showQuestHintPopup(result.message, result.color);
      this.showGoblinShopRoot(shopkeeperName);
    });
  }

  private purchaseGoblinWard(offerId: string): { ok: boolean; message: string; color: string } {
    const offer = getWardScrollOffer(offerId);
    if (!offer) {
      return { ok: false, message: 'The contract has gone missing.', color: '#ff6b6b' };
    }
    const standing = this.snakeGame.getFactionAlignment('goblin-camps').standing;
    const price = getWardPrice(
      offer,
      standing,
      Number(this.snakeGame.getWardUsage()[offer.source] ?? 0),
    );
    if (price === null) {
      return { ok: false, message: 'The goblins refuse to sell to you.', color: '#ff6b6b' };
    }
    if (this.score < price) {
      return { ok: false, message: `${offer.label} costs ${price} score.`, color: '#ff6b6b' };
    }
    this.addScoreDirect(-price);
    this.snakeGame.addWardContract(offer.source as WardDeathSource);
    return {
      ok: true,
      message: `${offer.label} signed. It triggers before lives.`,
      color: '#b6ff6a',
    };
  }

  private purchaseGoblinStyle(): { ok: boolean; message: string; color: string } {
    const unlocked = this.snakeCosmetics.unlockedThemes.includes(GOBLIN_SNAKE_STYLE.id);
    if (!unlocked) {
      if (this.score < GOBLIN_SNAKE_STYLE.price) {
        return {
          ok: false,
          message: `${GOBLIN_SNAKE_STYLE.label} costs ${GOBLIN_SNAKE_STYLE.price} score.`,
          color: '#ff6b6b',
        };
      }
      this.addScoreDirect(-GOBLIN_SNAKE_STYLE.price);
      this.snakeCosmetics.unlockedThemes = [
        ...this.snakeCosmetics.unlockedThemes,
        GOBLIN_SNAKE_STYLE.id,
      ];
    }
    this.snakeCosmetics.activeTheme = GOBLIN_SNAKE_STYLE.id;
    this.isDirty = true;
    return {
      ok: true,
      message: unlocked ? 'Goblin Hide equipped.' : 'Goblin Hide bought and equipped.',
      color: '#b6ff6a',
    };
  }

  private showVillageShopRoot(shopkeeperName: string, skipBark = false): void {
    this.paused = true;
    this.hideSaveUI();
    this.skillTree.hideOverlay();
    const bark = this.snakeGame.getNpcBark('shopkeeper');
    if (!skipBark) {
      this.showQuestDialogue(
        shopkeeperName,
        [`"${bark.text}"`],
        {
          onClose: () => {
            this.closeQuestPopup();
            this.showVillageShopRoot(shopkeeperName, true);
          },
        },
        { closeLabel: 'Shop', nextLabel: 'Listen' },
        { portraitId: bark.portraitId },
      );
      return;
    }
    const title = shopkeeperName;
    const shop = this.getCurrentVillageShop();
    const options: ChoiceOption[] = [];
    if ((shop?.equipment.length ?? 0) > 0) {
      options.push({ id: 'equipment', title: 'Equipment', description: 'Weapons, flippers, and weather gear.' });
    }
    if ((shop?.supplies.length ?? 0) > 0) {
      options.push({ id: 'supplies', title: 'Supplies', description: 'Potions, charms, and little bottles of not dying.' });
    }
    if ((shop?.styles.length ?? 0) > 0) {
      options.push({ id: 'styles', title: 'Styles', description: 'Local palettes for your snake.' });
    }
    if ((shop?.hats.length ?? 0) > 0) {
      options.push({
        id: 'hats',
        title: 'Hats',
        description: 'Village headwear with no tactical justification.',
      });
    }
    const room = this.snakeGame.getCurrentRoom();
    const isBlackMarket = Boolean(room.town && getTownDistrictForRoom(room.town, room.id) === 'guildHideout');
    const cardOffers = isBlackMarket ? [] : this.getCurrentMarketCardOffers();
    if (cardOffers.length > 0) {
      options.push({
        id: 'cards',
        title: 'Cards',
        description: 'Buy tiny competition cards for your personal deck.',
      });
      options.push({
        id: 'play-cards',
        title: 'Play Cards',
        description: 'Sit at the stall table and chase the score window.',
      });
    }
    options.push({ id: 'leave', title: 'Leave', description: 'Step away from the counter.' });
    this.villageShopPopup.show(title, options, (id) => {
      if (id === 'leave') {
        this.closeVillageShop();
        return;
      }
      if (id === 'play-cards') {
        this.showCardTableRoot(shopkeeperName);
        return;
      }
      if (id === 'equipment' || id === 'supplies' || id === 'styles' || id === 'hats' || id === 'cards') {
        this.showVillageShopCategory(shopkeeperName, id);
      }
    });
  }

  private showVillageShopCategory(
    shopkeeperName: string,
    category: 'equipment' | 'supplies' | 'styles' | 'hats' | 'cards',
    page = 0,
  ): void {
    this.paused = true;
    const shop = this.getCurrentVillageShop();
    if (!shop) {
      this.closeVillageShop();
      return;
    }
    const options: ChoiceOption[] = [];
    if (category === 'equipment') {
      for (const offer of shop.equipment) {
        const item = getItem(offer.itemId) as any;
        const owned = this.snakeGame.getInventory().getItemCount(offer.itemId) > 0;
        options.push({
          id: `equipment:${offer.itemId}`,
          title: `${item?.name ?? offer.itemId} - ${owned ? 'owned' : `${offer.price} score`}`,
          description: offer.note,
        });
      }
    } else if (category === 'supplies') {
      const room = this.snakeGame.getCurrentRoom();
      const isBlackMarket = Boolean(room.town && getTownDistrictForRoom(room.town, room.id) === 'guildHideout');
      const blackMarketStock = isBlackMarket ? this.getCurrentBlackMarketSupplyStock() : null;
      const stock = isBlackMarket ? null : this.getCurrentVillageMarketStock();
      for (const offer of shop.supplies) {
        const item = getItem(offer.itemId);
        const owned = this.snakeGame.getInventory().getItemCount(offer.itemId);
        const stocked = stock
          ? stock.supplyCounts[offer.itemId] ?? 0
          : blackMarketStock
            ? blackMarketStock.supplyCounts[offer.itemId] ?? 0
            : 1;
        options.push({
          id: `supply:${offer.itemId}`,
          title: `${item?.name ?? offer.itemId} - ${offer.price} score, stock x${stocked}${owned > 0 ? `, owned x${owned}` : ''}`,
          description: offer.note,
        });
      }
    } else if (category === 'styles') {
      for (const style of shop.styles) {
        const owned = this.snakeCosmetics.unlockedThemes.includes(style.id);
        options.push({
          id: `style:${style.id}`,
          title: `${style.label} - ${owned ? 'owned' : `${style.price} score`}`,
          description: owned ? 'Equip this village style.' : 'Buy and equip this village style.',
        });
      }
    } else if (category === 'hats') {
      for (const hat of shop.hats) {
        const owned = this.snakeCosmetics.unlockedHats.includes(hat.id);
        const equipped = this.snakeCosmetics.activeHat === hat.id;
        options.push({
          id: `hat:${hat.id}`,
          title: `${hat.label} - ${owned ? (equipped ? 'equipped' : 'owned') : `${hat.price} score`}`,
          description: owned ? 'Toggle this hat.' : 'Buy and equip this hat.',
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
          title: `${card.name} - ${card.price} score${owned > 0 ? `, owned x${owned}` : ''}`,
          description: `${card.suit} / ${card.chips} chips / ${card.rarity}. ${card.description}`,
        });
      }
      if (safePage > 0) {
        options.push({
          id: `cards-page:${safePage - 1}`,
          title: 'Previous Cards',
          description: 'Browse the previous shelf.',
        });
      }
      if (safePage < pageCount - 1) {
        options.push({
          id: `cards-page:${safePage + 1}`,
          title: 'More Cards',
          description: 'Browse the next shelf.',
        });
      }
    }
    options.push({ id: 'back', title: 'Back', description: 'Return to the shop counter.' });
    this.villageShopPopup.show(shopkeeperName, options, (id) => {
      if (id === 'back') {
        this.showVillageShopRoot(shopkeeperName, true);
        return;
      }
      if (id.startsWith('cards-page:')) {
        const [, nextPage] = id.split(':');
        this.showVillageShopCategory(shopkeeperName, category, Number(nextPage));
        return;
      }
      const [kind, value] = id.split(':');
      const result =
        kind === 'equipment'
          ? this.purchaseVillageEquipment(value)
          : kind === 'supply'
            ? this.purchaseVillageSupply(value)
          : kind === 'style'
            ? this.purchaseVillageStyle(value as VillageShopStyleId)
            : kind === 'hat'
              ? this.purchaseOrToggleVillageHat(value as VillageShopHatId)
              : kind === 'card'
                ? this.purchaseVillageCard(value as CardId)
                : null;
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
      description: `Best of 3. Land between ${table.minScore} and ${table.maxScore}. Choose your wager next. ${i18n.getFeatureString('cardInfo')} ${ownedCount} cards.`,
    }));
    options.push({
      id: 'back',
      title: inVillage ? 'Back' : 'Leave',
      description: inVillage ? 'Return to the shop counter.' : 'Step away from the card table.',
    });
    this.villageShopPopup.show(`${shopkeeperName}'s Card Table`, options, (id) => {
      if (id === 'back') {
        if (inVillage) {
          this.showVillageShopRoot(shopkeeperName, true);
        } else {
          this.closeVillageShop();
        }
        return;
      }
      const [, tableId] = id.split(':');
      this.showCardBetMenu(shopkeeperName, tableId);
    });
  }

  private showCardBetMenu(shopkeeperName: string, tableId: string): void {
    const table = getCardTable(tableId);
    const wagers = this.getCardBetOptions();
    if (wagers.length === 0) {
      this.showQuestHintPopup('You need score to place a card wager.', '#ff6b6b');
      this.showCardTableRoot(shopkeeperName);
      return;
    }
    const options: ChoiceOption[] = wagers.map((wager) => ({
      id: `bet:${wager.amount}`,
      title: wager.label,
      description: `Risk ${wager.amount} score. Win the match to receive ${wager.amount * 2} score back.`,
    }));
    options.push({ id: 'back', title: 'Back', description: 'Choose a different card table.' });
    this.villageShopPopup.show(`${table.name} Wager`, options, (id) => {
      if (id === 'back') {
        this.showCardTableRoot(shopkeeperName);
        return;
      }
      const [, amount] = id.split(':');
      this.startCardCompetition(shopkeeperName, tableId, Number(amount));
    });
  }

  private getCardBetOptions(): Array<{ label: string; amount: number }> {
    const score = Math.max(0, Math.floor(this.score));
    const candidates: Array<{ label: string; amount: number }> = [];
    if (score >= 5) {
      candidates.push({ label: 'Bet 5', amount: 5 });
    }
    if (score >= 25) {
      candidates.push({ label: 'Bet 25', amount: 25 });
    }
    if (score > 0) {
      candidates.push({ label: 'Bet 10%', amount: Math.max(1, Math.floor(score * 0.1)) });
      candidates.push({ label: 'Bet 50%', amount: Math.max(1, Math.floor(score * 0.5)) });
      candidates.push({ label: 'Bet All Score', amount: score });
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
      this.showQuestHintPopup('That wager is not available.', '#ff6b6b');
      this.showCardBetMenu(shopkeeperName, tableId);
      return;
    }
    this.addScoreDirect(-wagerScore);
    this.juice.startCardMusic();
    this.juice.cardWager(wagerScore);
    const state = createCompetitionState(
      tableId,
      this.getCardCollection(),
      () => this.random(),
      wagerScore,
    );
    this.showNextCardRound(shopkeeperName, state);
  }

  private showNextCardRound(shopkeeperName: string, state: CardCompetitionState): void {
    const hand = drawCompetitionHand(state, () => this.random());
    this.showCardHand(shopkeeperName, state, hand, new Set<number>());
  }

  private showCardHand(
    shopkeeperName: string,
    state: CardCompetitionState,
    hand: CardId[],
    selected: Set<number>,
  ): void {
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
    const title = this.add
      .text(width / 2, 18, `${table.name} R${state.round} (${state.wins}-${state.losses})`, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#fff3a8',
      })
      .setOrigin(0.5, 0);
    const target = this.add
      .text(width / 2, 50, `Target window: ${table.minScore}-${table.maxScore}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#9ad1ff',
      })
      .setOrigin(0.5, 0);
    const tooltipPanel = this.add
      .rectangle(width / 2, height - 112, width - 46, 64, 0x0e1c28, 0.92)
      .setStrokeStyle(1, 0x4da3ff)
      .setOrigin(0.5, 0);
    this.cardTooltipText = this.add.text(38, height - 102, 'Hover a card to read it.', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#ffffff',
      wordWrap: { width: width - 76 },
    });
    root.add([background, title, target, tooltipPanel, this.cardTooltipText]);
    this.juice.cardHandDealt(x + width / 2, y + 132, hand.length);

    if (hand.length === 0) {
      const empty = this.add
        .text(width / 2, 146, 'No cards in the deck.', {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#ffb3a8',
        })
        .setOrigin(0.5, 0);
      root.add(empty);
    } else {
      const cardWidth = 102;
      const gap = Math.min(
        18,
        Math.max(8, (width - 70 - cardWidth * hand.length) / Math.max(1, hand.length - 1)),
      );
      const totalWidth = cardWidth * hand.length + gap * Math.max(0, hand.length - 1);
      let cardX = (width - totalWidth) / 2;
      hand.forEach((cardId, index) => {
        const card = this.createCardSprite(cardId, selected.has(index), () => {
          const next = new Set(selected);
          const willSelect = !next.has(index);
          const cardDefinition = getCardDefinition(cardId);
          this.juice.cardSelect(x + card.x + 51, y + card.y + 75, willSelect, cardDefinition.rarity);
          if (next.has(index)) {
            next.delete(index);
          } else {
            next.add(index);
          }
          this.showCardHand(shopkeeperName, state, hand, next);
        });
        const targetCardY = selected.has(index) ? 88 : 98;
        card.setPosition(cardX, targetCardY);
        if (selected.size === 0) {
          card.setAlpha(0).setY(68);
          this.tweens.add({
            targets: card,
            y: targetCardY,
            alpha: 1,
            duration: 180,
            delay: index * 55,
            ease: "Back.easeOut",
          });
        }
        root.add(card);
        cardX += cardWidth + gap;
      });
    }

    const scoreButton = this.createCardTableButton(38, height - 38, 'Score', () => {
      this.juice.cardScoreCommit(x + width / 2, y + height / 2, selected.size);
      this.hideCardGamePopup(false);
      this.resolveCardRound(shopkeeperName, state, hand, [...selected]);
    });
    const allButton = this.createCardTableButton(158, height - 38, 'Play All', () => {
      this.juice.cardScoreCommit(x + width / 2, y + height / 2, hand.length);
      this.hideCardGamePopup(false);
      this.resolveCardRound(
        shopkeeperName,
        state,
        hand,
        hand.map((_, index) => index),
      );
    });
    const forfeitButton = this.createCardTableButton(width - 138, height - 38, 'Forfeit', () => {
      this.hideCardGamePopup();
      this.showQuestHintPopup('You fold away from the card table.', '#9ad1ff');
      this.closeVillageShop();
    });
    root.add([scoreButton, allButton, forfeitButton]);
    this.cardGameContainer = root;
  }

  private createCardSprite(
    cardId: CardId,
    selected: boolean,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const card = getCardDefinition(cardId);
    const suitColor = this.getCardSuitColor(card.suit);
    const container = this.add.container(0, 0).setSize(102, 150);
    const shadow = this.add.rectangle(5, 8, 102, 150, 0x02040a, 0.45).setOrigin(0, 0);
    const body = this.add
      .rectangle(0, 0, 102, 150, selected ? 0xfff3a8 : 0xf4ead2, 1)
      .setStrokeStyle(3, selected ? 0x5dd6a2 : suitColor)
      .setOrigin(0, 0);
    const header = this.add.rectangle(8, 8, 86, 26, suitColor, 0.96).setOrigin(0, 0);
    const name = this.add
      .text(51, 13, card.name, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 78 },
      })
      .setOrigin(0.5, 0);
    const chips = this.add
      .text(51, 48, String(card.chips), {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: '36px',
        color: '#17202a',
        stroke: '#ffffff',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0);
    const suit = this.add
      .text(51, 91, card.suit.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#17202a',
      })
      .setOrigin(0.5, 0);
    const rarity = this.add
      .text(51, 122, card.rarity, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: selected ? '#12543a' : '#42505c',
      })
      .setOrigin(0.5, 0);
    const shine = this.add
      .text(13, 123, card.rarity === 'rare' ? '*' : card.rarity === 'uncommon' ? '+' : '', {
        fontFamily: 'monospace',
        fontSize: card.rarity === 'rare' ? '20px' : '16px',
        color: card.rarity === 'rare' ? '#ffd166' : '#4da3ff',
        stroke: '#17202a',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0);
    const glow = this.add
      .rectangle(
        8,
        112,
        86,
        28,
        card.rarity === 'rare' ? 0xffd166 : 0x4da3ff,
        card.rarity === 'common' ? 0 : 0.14,
      )
      .setOrigin(0, 0);
    const check = this.add
      .text(88, 128, selected ? 'x' : '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#12543a',
      })
      .setOrigin(0.5, 0);
    const hit = this.add
      .zone(0, 0, 102, 150)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => {
      body.setFillStyle(0xffffff, 1);
      this.cardTooltipText?.setText(
        `${card.name} | ${card.suit} | ${card.chips} chips | ${card.rarity}\n${card.description}`,
      );
    });
    hit.on('pointerout', () => {
      body.setFillStyle(selected ? 0xfff3a8 : 0xf4ead2, 1);
    });
    hit.on('pointerdown', onClick);
    container.add([shadow, body, header, name, chips, suit, glow, rarity, shine, check, hit]);
    return container;
  }

  private handleGoblinShopQuestChoice(id: string, shopkeeperName: string): void {
    if (id === 'quest:goblin-ledger-debt') {
      const quest = this.snakeGame.offerGoblinLedgerQuestFromCurrentRoom();
      this.showQuestHintPopup(
        quest ? 'Ugly Errand accepted. Find the ledger-stamp.' : 'The clerk cannot start that errand here.',
        quest ? '#b6ff6a' : '#ff6b6b',
      );
      this.showGoblinShopRoot(shopkeeperName);
      return;
    }
    if (id === 'quest:goblin-ledger-turnin') {
      const quest = this.snakeGame.turnInGoblinLedgerQuestAtCurrentRoom();
      this.showQuestHintPopup(
        quest ? 'Ledger-stamp returned. The debt is settled.' : 'The clerk still wants the ledger-stamp.',
        quest ? '#b6ff6a' : '#ff6b6b',
      );
      this.showGoblinShopRoot(shopkeeperName);
      return;
    }
    if (id === 'quest:goblin-ledger-active') {
      this.showQuestHintPopup('Find the missing ledger-stamp first.', '#9ad1ff');
      this.showGoblinShopRoot(shopkeeperName);
      return;
    }
    this.showQuestHintPopup('The ledger is already closed.', '#9ad1ff');
    this.showGoblinShopRoot(shopkeeperName);
  }

  private createCardTableButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const buttonWidth = 104;
    const buttonHeight = 28;
    const container = this.add.container(x, y).setSize(buttonWidth, buttonHeight);
    const bg = this.add
      .rectangle(0, 0, buttonWidth, buttonHeight, 0x101b25, 0.95)
      .setStrokeStyle(2, 0xcfa77a)
      .setOrigin(0, 0);
    const text = this.add
      .text(buttonWidth / 2, 6, label, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#fff4cf',
      })
      .setOrigin(0.5, 0);
    const hit = this.add
      .zone(0, -8, buttonWidth, buttonHeight + 16)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => {
      bg.setFillStyle(0x243653, 1);
      text.setColor('#ffffff');
    });
    hit.on('pointerout', () => {
      bg.setFillStyle(0x101b25, 0.95);
      text.setColor('#fff4cf');
    });
    hit.on('pointerdown', onClick);
    container.add([bg, text, hit]);
    return container;
  }

  private getCardSuitColor(suit: string): number {
    switch (suit) {
      case 'moss':
        return 0x3d8f48;
      case 'teeth':
        return 0xa84242;
      case 'lanterns':
        return 0xd79234;
      case 'moons':
        return 0x596bb8;
      case 'smoke':
        return 0x6b4c88;
      case 'jade':
        return 0x5bb88a;
      default:
        return 0x4da3ff;
    }
  }

  private drawQuestRoomActors(actors: QuestRoomActor[]): void {
    const cell = this.grid.cell;
    for (const actor of actors) {
      const x = actor.x * cell;
      const y = actor.y * cell;
      if (actor.kind === 'tax-office') {
        this.graphics
          .fillStyle(0x2b2117, 0.95)
          .fillRoundedRect(x + 2, y + 4, cell - 4, cell - 7, 3);
        this.graphics.fillStyle(0xffd166, 0.95).fillRect(x + 5, y + 7, cell - 10, 3);
      } else if (actor.kind === 'forest-teleporter' || actor.kind === 'deep-teleporter') {
        this.graphics
          .lineStyle(3, 0x7cff3a, 0.95)
          .strokeCircle(x + cell / 2, y + cell / 2, cell * 0.38);
        this.graphics
          .lineStyle(1, 0xd8ffd0, 0.9)
          .strokeCircle(x + cell / 2, y + cell / 2, cell * 0.22);
      } else if (actor.kind === 'deep-merchant') {
        this.graphics.fillStyle(0x142414, 0.96).fillRect(x + 4, y + 4, cell - 8, cell - 8);
        this.graphics.fillStyle(0x7cff3a, 0.9).fillCircle(x + cell / 2, y + cell / 2, cell * 0.18);
      } else if (actor.kind === 'quest-baby') {
        this.graphics
          .fillStyle(0x10261f, 0.95)
          .fillRoundedRect(x + 3, y + 5, cell - 6, cell - 8, 4);
        this.graphics
          .fillStyle(0xa8ffe0, 0.95)
          .fillRoundedRect(x + 5, y + 7, cell - 10, cell - 12, 3);
        this.graphics.fillStyle(0xffd7b8, 1).fillCircle(x + cell / 2, y + cell * 0.42, cell * 0.16);
        this.graphics.fillStyle(0x18352d, 1).fillCircle(x + cell * 0.45, y + cell * 0.39, 1.5);
        this.graphics.fillStyle(0x18352d, 1).fillCircle(x + cell * 0.55, y + cell * 0.39, 1.5);
      } else if (actor.kind === 'deep-lying-bouquet') {
        this.graphics
          .lineStyle(2, 0xe8f7ff, 0.95)
          .strokeCircle(x + cell / 2, y + cell / 2, cell * 0.42);
        this.graphics
          .fillStyle(0xbde6ff, 0.9)
          .fillRoundedRect(x + cell * 0.38, y + cell * 0.48, cell * 0.24, cell * 0.38, 3);
        this.graphics
          .lineStyle(2, 0x6be3ff, 0.85)
          .lineBetween(x + cell * 0.5, y + cell * 0.82, x + cell * 0.32, y + cell * 0.26)
          .lineBetween(x + cell * 0.5, y + cell * 0.82, x + cell * 0.5, y + cell * 0.2)
          .lineBetween(x + cell * 0.5, y + cell * 0.82, x + cell * 0.68, y + cell * 0.26);
        this.graphics.fillStyle(0xffbdfd, 1).fillCircle(x + cell * 0.32, y + cell * 0.24, cell * 0.12);
        this.graphics.fillStyle(0xffffff, 1).fillCircle(x + cell * 0.5, y + cell * 0.18, cell * 0.13);
        this.graphics.fillStyle(0xaec4ff, 1).fillCircle(x + cell * 0.68, y + cell * 0.24, cell * 0.12);
      }
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

  private showCardScoringCutscene(
    cardIds: CardId[],
    result: CardScoreResult,
    won: boolean,
    onComplete: () => void,
  ): void {
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
    const title = this.add
      .text(width / 2, 18, 'Scoring Hand', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#fff3a8',
      })
      .setOrigin(0.5, 0);
    const scoreText = this.add
      .text(width / 2, height - 116, 'Chips: 0', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);
    const multText = this.add
      .text(width / 2, height - 82, 'Multiplier: x1', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#9ad1ff',
      })
      .setOrigin(0.5, 0);
    const finalText = this.add
      .text(width / 2, height - 48, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: won ? '#5dd6a2' : '#ffb3a8',
      })
      .setOrigin(0.5, 0);
    root.add([background, title, scoreText, multText, finalText]);

    const cardWidth = 102;
    const visibleCards = cardIds.length > 0 ? cardIds : [];
    const gap = Math.min(
      18,
      Math.max(
        8,
        (width - 70 - cardWidth * Math.max(1, visibleCards.length)) /
          Math.max(1, visibleCards.length - 1),
      ),
    );
    const totalWidth = cardWidth * visibleCards.length + gap * Math.max(0, visibleCards.length - 1);
    let cardX = visibleCards.length > 0 ? (width - totalWidth) / 2 : width / 2 - cardWidth / 2;
    const cardSprites: Phaser.GameObjects.Container[] = [];
    if (visibleCards.length === 0) {
      const empty = this.add
        .text(width / 2, 138, 'Empty hand', {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#ffb3a8',
        })
        .setOrigin(0.5, 0);
      root.add(empty);
      this.time.delayedCall(180, () => this.juice.cardBust(x + width / 2, y + 154, "empty"));
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
        this.juice.cardSuitSpark(x + sprite.x + 51, y + sprite.y + 75, card.suit);
        scoreText.setText(`Chips: ${runningChips}`);
        this.tweens.add({
          targets: sprite,
          y: 62,
          scale: 1.16,
          alpha: 1,
          duration: 150,
          yoyo: true,
          ease: 'Back.easeOut',
        });
        const pop = this.add
          .text(sprite.x + 51, sprite.y - 18, `+${card.chips}`, {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#fff3a8',
            stroke: '#071019',
            strokeThickness: 3,
          })
          .setOrigin(0.5, 0);
        root.add(pop);
        this.tweens.add({
          targets: pop,
          y: pop.y - 34,
          alpha: 0,
          duration: 420,
          ease: 'Cubic.easeOut',
          onComplete: () => pop.destroy(),
        });
      });
      delay += 260;
    });

    this.time.delayedCall(delay, () => {
      runningChips = result.chips;
      this.juice.cardModifierTick(result.multiplier);
      scoreText.setText(`Chips: ${result.chips}`);
      multText.setText(`Multiplier: x${result.multiplier.toFixed(2).replace(/\.00$/, '')}`);
      const detail = result.details[0] ?? 'Modifiers resolve.';
      const modifierText = this.add
        .text(width / 2, 64, detail, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#c8ffe1',
          wordWrap: { width: width - 80 },
          align: 'center',
        })
        .setOrigin(0.5, 0);
      root.add(modifierText);
      this.tweens.add({
        targets: modifierText,
        scale: 1.08,
        duration: 120,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
      result.details.slice(0, 4).forEach((detail, index) => {
        this.time.delayedCall(index * 120, () => this.juice.cardRuleTrigger(x + width / 2, y + 92 + index * 18, detail, index));
      });
    });
    delay += 520;

    this.time.delayedCall(delay, () => {
      this.juice.cardRoundResult(won);
      if (!won) {
        this.juice.cardBust(
          x + width / 2,
          y + height - 38,
          result.finalScore < result.minScore ? 'low' : 'high',
        );
      }
      finalText.setText(
        `Final ${result.finalScore} / Window ${result.minScore}-${result.maxScore} / ${won ? 'Round won' : result.finalScore < result.minScore ? 'Too low' : 'Too high'}`,
      );
      this.tweens.add({
        targets: finalText,
        scale: 1.12,
        duration: 160,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    });
    delay += 780;

    this.time.delayedCall(delay, () => {
      this.hideCardGamePopup(false);
      onComplete();
    });
  }

  private resolveCardRound(
    shopkeeperName: string,
    state: CardCompetitionState,
    hand: CardId[],
    selectedIndexes: number[],
  ): void {
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
    won: boolean,
  ): void {
    if (won) {
      state.wins += 1;
    } else {
      state.losses += 1;
    }
    finishCompetitionRound(state, selectedCards);

    const played =
      selectedCards.length > 0
        ? selectedCards.map((cardId) => getCardDefinition(cardId).name).join(', ')
        : 'no cards';
    const reason = won
      ? 'Round won.'
      : result.finalScore < result.minScore
        ? 'Too low.'
        : 'Too high.';
    const detailText = result.details.length > 0 ? ` ${result.details.join(' ')}` : '';

    if (state.wins >= 2) {
      const payout = state.wagerScore * 2;
      this.addScoreDirect(payout);
      this.juice.stopCardMusic();
      this.juice.cardMatchResult(true, payout);
      this.setChoicePopupVisible(false);
      this.villageShopPopup.show(
        'Card Victory',
        [
          {
            id: 'done',
            title: `${payout} score paid out`,
            description: `${played}. Final ${result.finalScore}, window ${result.minScore}-${result.maxScore}. ${reason}${detailText}`,
          },
        ],
        () => this.closeVillageShop(),
      );
      return;
    }

    if (state.losses >= 2 || state.round > 3) {
      this.juice.stopCardMusic();
      this.juice.cardMatchResult(false);
      this.setChoicePopupVisible(false);
      this.villageShopPopup.show(
        'Card Defeat',
        [
          {
            id: 'done',
            title: 'Leave Table',
            description: `${played}. Final ${result.finalScore}, window ${result.minScore}-${result.maxScore}. ${reason}${detailText}`,
          },
        ],
        () => this.closeVillageShop(),
      );
      return;
    }

    this.setChoicePopupVisible(false);
    this.villageShopPopup.show(
      won ? 'Round Won' : 'Round Lost',
      [
        {
          id: 'continue',
          title: 'Next Round',
          description: `${played}. Final ${result.finalScore}, window ${result.minScore}-${result.maxScore}. ${reason}${detailText}`,
        },
      ],
      () => this.showNextCardRound(shopkeeperName, state),
    );
  }

  private closeVillageShop(): void {
    this.juice.stopCardMusic();
    this.hideCardGamePopup();
    this.villageShopPopup.hide();
    this.resumeGameplayAfterModal();
  }

  private resumeGameplayAfterModal(): void {
    this.paused = false;
    this.skillTree.hideOverlay();
    this.showSaveUI();
    this.updateHouseAmbience();
    this.isDirty = true;
  }

  private tickFreakYouPortalFx(): void {
    const portal = this.snakeGame.getFlag<{
      roomId: string;
      x: number;
      y: number;
      durationMs?: number;
      sceneStartedAtMs?: number;
    }>('ui.freakYouPortal');
    if (!portal) {
      return;
    }
    if (typeof portal.sceneStartedAtMs !== 'number') {
      this.snakeGame.setFlag('ui.freakYouPortal', {
        ...portal,
        sceneStartedAtMs: this.time.now,
      });
      return;
    }
    const duration = Math.max(1, portal.durationMs ?? 3500);
    if (this.time.now - portal.sceneStartedAtMs > duration) {
      this.snakeGame.setFlag('ui.freakYouPortal', undefined);
    }
  }

  private drawFreakYouPortalFx(roomId: string): void {
    const portal = this.snakeGame.getFlag<{
      roomId: string;
      x: number;
      y: number;
      durationMs?: number;
      sceneStartedAtMs?: number;
    }>('ui.freakYouPortal');
    if (!portal || portal.roomId !== roomId) {
      return;
    }
    const startedAt = portal.sceneStartedAtMs ?? this.time.now;
    const duration = Math.max(1, portal.durationMs ?? 3500);
    const progress = Math.max(0, Math.min(1, (this.time.now - startedAt) / duration));
    const pulse = 1 + Math.sin(this.time.now / 80) * 0.16;
    const world = this.tileToWorldInRoom({ x: portal.x, y: portal.y }, roomId);
    const cx = world.x + this.grid.cell / 2;
    const cy = world.y + this.grid.cell / 2;
    const radius = this.grid.cell * (2.1 + progress * 1.6) * pulse;
    this.graphics.lineStyle(4, 0xff3bff, 0.82 * (1 - progress * 0.3));
    this.graphics.strokeCircle(cx, cy, radius);
    this.graphics.lineStyle(2, 0x5dd6ff, 0.72 * (1 - progress * 0.2));
    this.graphics.strokeCircle(cx, cy, radius * 0.58);
    this.graphics.fillStyle(0x1a061f, 0.28 * (1 - progress));
    this.graphics.fillCircle(cx, cy, radius * 0.44);
  }

  private tryInteractQuestTarget(): boolean {
    if (this.paused || this.offeredQuest) {
      return false;
    }
    const interaction = this.snakeGame.getNearbyQuestInteraction();
    if (!interaction) {
      return false;
    }
    if (interaction.kind === 'choice') {
      this.paused = true;
      this.setChoicePopupVisible(true);
      this.villageShopPopup.show(interaction.title, interaction.options, (id) => {
        const result = this.snakeGame.resolveQuestInteraction(id);
        this.paused = false;
        if (result.message) {
          this.showQuestHintPopup(result.message, result.failed ? '#ff6b6b' : '#9ad1ff');
        }
        if (result.completed) {
          this.juice.questCompleted();
          this.applyPendingQuestCosmeticRewards();
        }
        this.applyEquipmentEffects();
        this.isDirty = true;
      });
      return true;
    }
    this.showQuestDialogue(
      interaction.title,
      interaction.pages,
      {
        onClose: () => {
          const result = this.snakeGame.resolveQuestInteraction();
          if (result.message) {
            this.showQuestHintPopup(result.message, '#9ad1ff');
          }
          this.closeQuestPopup();
        },
      },
      { closeLabel: interaction.closeLabel ?? 'Close' },
    );
    return true;
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
    const [roomX, roomY] = room.id.split(',').map(Number);
    const localX = head.x - roomX * this.grid.cols;
    const localY = head.y - roomY * this.grid.rows;
    const dist = Math.abs(localX - giver.x) + Math.abs(localY - giver.y);
    if (dist > 1) {
      return false;
    }
    const disposition = this.snakeGame.getNpcDisposition(room.id);
    if (disposition.hostility === 'hostile') {
      return true;
    }
    const request = this.snakeGame.requestQuestFromGiver(room.id);
    const giverName = giver.name ?? 'Quest Giver';
    const speaker = { portraitId: giver.portraitId };

    if (request.state === 'available' && request.quest) {
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
          acceptLabel: i18n.getCommon('quest.accept'),
          rejectLabel: i18n.getCommon('quest.refuse'),
          nextLabel: 'Next',
        },
        speaker,
      );
      return true;
    }

    if (request.state === 'active' && request.quest) {
      const dialogue = getQuestDialogue(request.quest);
      this.showQuestDialogue(
        giverName,
        [
          ...dialogue.pages.slice(0, 1),
          `${i18n.getFeatureString('alreadyCarriesThis')} ${request.quest.label}. Finish it, then come slither back to me.`,
        ],
        {
          onClose: () => this.closeQuestPopup(),
        },
        {
          closeLabel: 'Close',
        },
        speaker,
      );
      return true;
    }

    if (request.state === 'completed' && request.quest) {
      this.showQuestDialogue(
        giverName,
        [
          `${i18n.getFeatureString('taskAlreadyDone')} ${request.quest.label}.`,
          'Come back when the tunnels have another favor to ask of your scales.',
        ],
        {
          onClose: () => this.closeQuestPopup(),
        },
        {
          closeLabel: 'Close',
        },
        speaker,
      );
      return true;
    }

    this.showQuestHintPopup('No quests right now');
    return true;
  }

  private tryInteractMcDonaldsCashier(): boolean {
    if (this.paused || this.offeredQuest || this.choicePopupVisible) {
      return false;
    }
    const room = this.snakeGame.getCurrentRoom();
    const mc = room.snakeMcDonalds;
    if (!mc) {
      return false;
    }
    if (this.distanceFromHeadToLocal(mc.cashier) > 1) {
      return false;
    }

    this.openMcDonaldsMenu(mc);
    return true;
  }

  private openMcDonaldsMenu(mc: McDonaldsData): void {
    this.paused = true;
    this.hideSaveUI();
    this.skillTree.hideOverlay();

    const inventory = this.snakeGame.getInventory();
    const burgerOwned = inventory.getItemCount('food-snake-burger') > 0;
    const friesOwned = inventory.getItemCount('food-snake-fries') > 0;
    const nuggetsOwned = inventory.getItemCount('food-snake-nuggets') > 0;

    const options: ChoiceOption[] = [
      {
        id: 'buy-burger-fries',
        title: 'Snake Burger + Snake Fries - 100 score',
        description: `Both items. +5 length, 1 minute invulnerability each. ${burgerOwned ? '(Already have burger)' : ''} ${friesOwned ? '(Already have fries)' : ''}`,
      },
      {
        id: 'buy-nuggets',
        title: 'Snake Nuggets - 50 score',
        description: `+2 length, 30 seconds invulnerability. ${nuggetsOwned ? '(Already have nuggets)' : ''}`,
      },
      {
        id: 'eat-burger',
        title: 'Snake Burger',
        description: `Consume for +5 length, 1 minute invulnerability. ${burgerOwned ? 'In inventory.' : 'Not owned.'}`,
      },
      {
        id: 'eat-fries',
        title: 'Snake Fries',
        description: `Consume for +5 length, 1 minute invulnerability. ${friesOwned ? 'In inventory.' : 'Not owned.'}`,
      },
      {
        id: 'eat-nuggets',
        title: 'Snake Nuggets',
        description: `Consume for +2 length, 30 seconds invulnerability. ${nuggetsOwned ? 'In inventory.' : 'Not owned.'}`,
      },
      {
        id: 'leave',
        title: 'Leave',
        description: 'Slither away.',
      },
    ];

    this.villageShopPopup.show(`${mc.cashier.name}'s Counter`, options, (id) => {
      this.handleMcDonaldsChoice(id, mc);
    });
  }

  private handleMcDonaldsChoice(id: string, mc: NonNullable<ReturnType<SnakeGame['getCurrentRoom']>['snakeMcDonalds']>): void {
    if (id === 'leave') {
      this.closeVillageShop();
      return;
    }

    const inventory = this.snakeGame.getInventory();

    if (id === 'buy-burger-fries') {
      if (this.score < 100) {
        this.showQuestHintPopup("You don't have 100 score.", '#ff6b6b');
        this.openMcDonaldsMenu(mc);
        return;
      }
      this.addScoreDirect(-100);
      inventory.addItem('food-snake-burger', 1);
      inventory.addItem('food-snake-fries', 1);
      this.showQuestHintPopup('Bought Snake Burger and Snake Fries!', '#5dd6a2');
      this.juice.perkPurchased();
      this.openMcDonaldsMenu(mc);
      return;
    }

    if (id === 'buy-nuggets') {
      if (this.score < 50) {
        this.showQuestHintPopup("You don't have 50 score.", '#ff6b6b');
        this.openMcDonaldsMenu(mc);
        return;
      }
      this.addScoreDirect(-50);
      inventory.addItem('food-snake-nuggets', 1);
      this.showQuestHintPopup('Bought Snake Nuggets!', '#5dd6a2');
      this.juice.perkPurchased();
      this.openMcDonaldsMenu(mc);
      return;
    }

    if (id === 'eat-burger') {
      const result = this.snakeGame.consumeMcDonaldsFood('food-snake-burger');
      if (result.success) {
        this.showQuestHintPopup(result.message, '#5dd6a2');
        this.juice.appleChomp(0, 0, 2);
      } else {
        this.showQuestHintPopup(result.message, '#ff6b6b');
      }
      this.openMcDonaldsMenu(mc);
      return;
    }

    if (id === 'eat-fries') {
      const result = this.snakeGame.consumeMcDonaldsFood('food-snake-fries');
      if (result.success) {
        this.showQuestHintPopup(result.message, '#5dd6a2');
        this.juice.appleChomp(0, 0, 2);
      } else {
        this.showQuestHintPopup(result.message, '#ff6b6b');
      }
      this.openMcDonaldsMenu(mc);
      return;
    }

    if (id === 'eat-nuggets') {
      const result = this.snakeGame.consumeMcDonaldsFood('food-snake-nuggets');
      if (result.success) {
        this.showQuestHintPopup(result.message, '#5dd6a2');
        this.juice.appleChomp(0, 0, 2);
      } else {
        this.showQuestHintPopup(result.message, '#ff6b6b');
      }
      this.openMcDonaldsMenu(mc);
      return;
    }

    this.closeVillageShop();
  }

  private tryInteractMcDonaldsToilet(): boolean {
    if (this.paused || this.offeredQuest || this.choicePopupVisible) {
      return false;
    }
    const room = this.snakeGame.getCurrentRoom();
    const mc = room.snakeMcDonalds;
    if (!mc) {
      return false;
    }
    if (this.distanceFromHeadToLocal(mc.toilet) > 1) {
      return false;
    }

    this.juice.toiletFlush();
    this.snakeGame.flushToilet();

    this.showQuestHintPopup('The toilet gurgles and flushes. It sounds very satisfied.', '#9ad1ff');
    return true;
  }

  private tryInteractRelationshipNpc(): boolean {
    if (this.paused || this.offeredQuest || this.choicePopupVisible) {
      return false;
    }
    const profile = this.getNearbyRelationshipProfile();
    if (!profile) {
      return false;
    }
    this.snakeGame.getActorsInCurrentRoom();
    this.snakeGame.ensureRelationshipCandidate(profile);
    this.showRelationshipRoot(profile);
    return true;
  }

  private getNearbyRelationshipProfile(): RelationshipCandidateProfile | null {
    const room = this.snakeGame.getCurrentRoom();
    const local = this.getHeadLocalInCurrentRoom();
    if (!local) {
      return null;
    }
    const candidates: Array<RelationshipCandidateProfile & { x: number; y: number }> = [];
    if (room.village) {
      candidates.push(
        ...[...room.village.residents, room.village.shopkeeper].map((resident) => ({
          id: `resident:${room.id}:${resident.id}`,
          actorId: this.snakeGame.getVillageActorId(
            room.id,
            resident.id,
            resident.id === room.village!.shopkeeper.id ? 'shopkeeper' : 'resident',
          ),
          displayName: resident.name,
          species: 'human' as RelationshipSpecies,
          portraitId: resident.portraitId,
          homeRoomId: room.id,
          factionId: 'hearthbound-remnant' as const,
          ...this.snakeGame.getRelationshipNpcBodyPosition(
            {
              id: `resident:${room.id}:${resident.id}`,
              actorId: this.snakeGame.getVillageActorId(
                room.id,
                resident.id,
                resident.id === room.village!.shopkeeper.id ? 'shopkeeper' : 'resident',
              ),
              displayName: resident.name,
              species: 'human' as RelationshipSpecies,
              portraitId: resident.portraitId,
              homeRoomId: room.id,
              factionId: 'hearthbound-remnant' as const,
            },
            { x: resident.x, y: resident.y },
          ),
        })),
      );
    }
    if (room.questGiver) {
      candidates.push({
        id: `quest:${room.id}:${room.questGiver.id}`,
        actorId: this.snakeGame.getQuestGiverActorId(room.id, room.questGiver.id),
        displayName: room.questGiver.name,
        species: 'human' as RelationshipSpecies,
        portraitId: room.questGiver.portraitId,
        homeRoomId: room.id,
        factionId: 'hearthbound-remnant' as const,
        ...this.snakeGame.getRelationshipNpcBodyPosition(
          {
            id: `quest:${room.id}:${room.questGiver.id}`,
            actorId: this.snakeGame.getQuestGiverActorId(room.id, room.questGiver.id),
            displayName: room.questGiver.name,
            species: 'human' as RelationshipSpecies,
            portraitId: room.questGiver.portraitId,
            homeRoomId: room.id,
            factionId: 'hearthbound-remnant' as const,
          },
          { x: room.questGiver.x, y: room.questGiver.y },
        ),
      });
    }
    if (room.town) {
      const district = getTownDistrictForRoom(room.town, room.id);
      candidates.push(
        ...room.town.residents
          .filter((resident) => this.isTownResidentInDistrict(resident.workRoomId, district))
          .map((resident) => ({
            id: `resident:${room.id}:${resident.id}`,
            actorId:
              resident.actorId ??
              this.snakeGame.getTownResidentActorId(room.town!.id, resident.id, resident.role),
            displayName: `${resident.name}${
              resident.role === 'bartender'
                ? ' the Bartender'
                : resident.role === 'guard'
                  ? ' the Guard'
                  : resident.role === 'thief' || resident.role === 'thiefContact'
                    ? ' of the Guild'
                    : ''
            }`,
            species: 'human' as RelationshipSpecies,
            portraitId: resident.portraitId,
            homeRoomId: resident.homeRoomId ?? room.id,
            factionId: 'hearthbound-remnant' as const,
            personality: resident.role === 'bartender' ? ('deadpan' as const) : undefined,
            ...this.snakeGame.getRelationshipNpcBodyPosition(
              {
                id: `resident:${room.id}:${resident.id}`,
                actorId:
                  resident.actorId ??
                  this.snakeGame.getTownResidentActorId(room.town!.id, resident.id, resident.role),
                displayName: resident.name,
                species: 'human' as RelationshipSpecies,
                portraitId: resident.portraitId,
                homeRoomId: resident.homeRoomId ?? room.id,
                factionId: 'hearthbound-remnant' as const,
                personality: resident.role === 'bartender' ? ('deadpan' as const) : undefined,
              },
              { x: resident.x, y: resident.y },
            ),
          })),
      );
    }
    if (room.goblinCamp) {
      candidates.push(
        ...[room.goblinCamp.shopkeeper, ...room.goblinCamp.guards].map((guard) => ({
          id: `resident:${room.id}:${guard.id}`,
          actorId: this.snakeGame.getGoblinCampActorId(
            room.goblinCamp!.id,
            guard.id,
            guard.id === room.goblinCamp!.shopkeeper.id ? 'shopkeeper' : 'guard',
          ),
          displayName: guard.name,
          species: 'goblin' as RelationshipSpecies,
          portraitId: guard.portraitId ?? 'goblin-neutral',
          homeRoomId: room.id,
          factionId: 'goblin-camps' as const,
          ...this.snakeGame.getRelationshipNpcBodyPosition(
            {
              id: `resident:${room.id}:${guard.id}`,
              actorId: this.snakeGame.getGoblinCampActorId(
                room.goblinCamp!.id,
                guard.id,
                guard.id === room.goblinCamp!.shopkeeper.id ? 'shopkeeper' : 'guard',
              ),
              displayName: guard.name,
              species: 'goblin' as RelationshipSpecies,
              portraitId: guard.portraitId ?? 'goblin-neutral',
              homeRoomId: room.id,
              factionId: 'goblin-camps' as const,
            },
            { x: guard.x, y: guard.y },
          ),
        })),
      );
    }
    const nearest = candidates
      .filter((candidate) => {
        const state = this.snakeGame.getRelationshipState(candidate);
        return !(state?.stage === 'dead' || state?.flags.dead || state?.flags.eatenByPlayer);
      })
      .map((candidate) => ({
        candidate,
        distance: Math.abs(candidate.x - local.x) + Math.abs(candidate.y - local.y),
      }))
      .filter((entry) => entry.distance <= 1)
      .sort((a, b) => a.distance - b.distance)[0]?.candidate;
    if (!nearest) {
      return null;
    }
    const { x, y, ...profile } = nearest;
    void x;
    void y;
    return profile;
  }

  private showRelationshipRoot(profile: RelationshipCandidateProfile, skipBark = false): void {
    this.paused = true;
    this.setChoicePopupVisible(true);
    const currentTown = this.snakeGame.getCurrentTown();
    const canPickpocket = Boolean(
      currentTown &&
        this.snakeGame.canPickpocketForCurrentTownGuild() &&
        profile.id.startsWith(`resident:${this.snakeGame.getCurrentRoom().id}:`),
    );
    const bark = this.snakeGame.getNpcBark(this.relationshipNpcVoiceRole(profile), profile.actorId);
    if (!skipBark) {
      this.setChoicePopupVisible(false);
      this.showQuestDialogue(
        profile.displayName,
        [`"${bark.text}"`],
        {
          onClose: () => {
            this.closeQuestPopup();
            this.showRelationshipRoot(profile, true);
          },
        },
        { closeLabel: 'Talk', nextLabel: 'Listen' },
        { portraitId: bark.portraitId ?? profile.portraitId },
      );
      return;
    }
    this.villageShopPopup.show(
      this.actorInteractionTitle(profile),
      this.actorInteractionOptions(profile, canPickpocket),
      (id) => {
        this.setChoicePopupVisible(false);
        if (id === 'leave') {
          this.paused = false;
          return;
        }
        if (id === 'talk') {
          const talk = this.snakeGame.getRelationshipTalk(profile);
          const town = this.snakeGame.getCurrentTown();
          const townLine = town ? this.townGossipLine(town) : null;
          this.showQuestDialogue(
            talk.title,
            townLine ? [`"${townLine}"`, `"${talk.line}"`] : [`"${talk.line}"`],
            {
              onClose: () => {
                this.closeQuestPopup();
                this.skillTree.getOverlay().refresh();
              },
            },
            { closeLabel: 'Leave', nextLabel: 'Listen' },
            { portraitId: profile.portraitId },
          );
          return;
        }
        if (
          id === 'ask-rumor' ||
          id === 'ask-personal' ||
          id === 'apologize' ||
          id === 'threaten' ||
          id === 'parley'
        ) {
          const line =
            id === 'ask-rumor'
              ? this.askActorAround(profile)
              : id === 'apologize'
                ? this.snakeGame.apologizeToActor(profile.actorId ?? '')
                : id === 'threaten'
                  ? this.snakeGame.threatenActor(profile.actorId ?? '')
                  : id === 'parley'
                    ? this.snakeGame.parleyWithActor(profile.actorId ?? '')
                    : this.askActorPersonally(profile);
          this.showQuestDialogue(
            profile.displayName,
            [line ?? `${profile.displayName} has nothing to say about that.`],
            {
              onClose: () => {
                this.closeQuestPopup();
                this.skillTree.getOverlay().refresh();
              },
            },
            { closeLabel: 'Leave', nextLabel: 'Listen' },
            { portraitId: profile.portraitId },
          );
          return;
        }
        if (id === 'take-quest') {
          this.paused = false;
          this.tryInteractQuestGiver();
          return;
        }
        if (id === 'shop') {
          this.paused = false;
          if (profile.species === 'goblin') {
            this.showGoblinShopRoot(profile.displayName);
          } else {
            this.showVillageShopRoot(profile.displayName);
          }
          return;
        }
        if (id === 'pickpocket') {
          const result = this.snakeGame.pickpocketRelationshipNpc(profile);
          this.showQuestHintPopup(result.message, result.ok ? result.color : '#ff6b6b');
          this.skillTree.getOverlay().refresh();
          this.paused = false;
          return;
        }
        this.showDatingScene(profile);
      },
    );
  }

  private actorInteractionOptions(
    profile: RelationshipCandidateProfile,
    canPickpocket: boolean,
  ): Array<{ id: string; title: string; description: string }> {
    const actorMenu = profile.actorId ? this.snakeGame.getActorInteractionMenu(profile.actorId) : null;
    if (!actorMenu) {
      return [
        {
          id: 'talk',
          title: 'Talk',
          description: 'Get a line from them. This does not start romance.',
        },
        {
          id: 'romance',
          title: 'Romance',
          description: 'Open the dating scene and opt into dating-game nonsense.',
        },
        ...(canPickpocket
          ? [
              {
                id: 'pickpocket',
                title: 'Pick Pocket',
                description: 'Lift score or contraband. Trust is also in the pocket, unfortunately.',
              },
            ]
          : []),
        { id: 'leave', title: 'Leave', description: 'Keep things safely ordinary.' },
      ];
    }
    const supported = new Set([
      'talk',
      'ask-rumor',
      'ask-personal',
      'take-quest',
      'shop',
      'apologize',
      'threaten',
      'parley',
      'romance',
      'pickpocket',
      'leave',
    ]);
    return actorMenu.options
      .filter((option) => option.enabled && supported.has(option.id))
      .filter((option) => option.id !== 'pickpocket' || canPickpocket)
      .map((option) => ({
        id: option.id,
        title: option.label,
        description: actorInteractionDescription(option.id),
      }));
  }

  private actorInteractionTitle(profile: RelationshipCandidateProfile): string {
    const actorMenu = profile.actorId ? this.snakeGame.getActorInteractionMenu(profile.actorId) : null;
    return actorMenu
      ? `${actorMenu.title} (${actorMenu.moodSummary})`
      : profile.displayName;
  }

  private currentTownActorLine(displayName: string): string {
    const town = this.snakeGame.getCurrentTown();
    return town
      ? this.townGossipLine(town)
      : `${displayName} says this place has not organized itself enough to gossip properly.`;
  }

  private askActorAround(profile: RelationshipCandidateProfile): string | null {
    const actorId = profile.actorId ?? '';
    const options = [
      () => this.snakeGame.askActorRumor(actorId),
      () => this.currentTownActorLine(profile.displayName),
      () => this.snakeGame.askActorKingLore(actorId),
    ];
    const start = Math.floor(Math.random() * options.length);
    for (let offset = 0; offset < options.length; offset += 1) {
      const line = options[(start + offset) % options.length]?.();
      if (line) return line;
    }
    return null;
  }

  private askActorPersonally(profile: RelationshipCandidateProfile): string | null {
    const actorId = profile.actorId ?? '';
    return Math.random() < 0.5
      ? (this.snakeGame.askActorSocialTie(actorId) ?? this.snakeGame.askActorPersonalReveal(actorId))
      : (this.snakeGame.askActorPersonalReveal(actorId) ?? this.snakeGame.askActorSocialTie(actorId));
  }

  private relationshipNpcVoiceRole(profile: RelationshipCandidateProfile): string {
    if (/Guard\b/.test(profile.displayName)) return 'guard';
    if (/Bartender\b/.test(profile.displayName)) return 'bartender';
    if (/Guild\b/.test(profile.displayName)) return 'thiefContact';
    if (profile.species === 'goblin' || profile.species === 'goblin-angel') return 'goblin-merchant';
    return 'romance';
  }

  private getLibertyStructureHint(room: ReturnType<SnakeGame['getCurrentRoom']>): string | null {
    if (
      room.gridironYard &&
      [room.gridironYard.coach, ...room.gridironYard.players].some((npc) => this.distanceFromHeadToLocal(npc) <= 2)
    ) {
      return `Play football at ${room.gridironYard.fieldName} (press E)`;
    }
    if (
      room.allNiteDiner &&
      [room.allNiteDiner.cook, room.allNiteDiner.waitress, room.allNiteDiner.regular].some((npc) => this.distanceFromHeadToLocal(npc) <= 2)
    ) {
      return `Order at ${room.allNiteDiner.dinerName} (press E)`;
    }
    if (
      room.fireworkStand &&
      [room.fireworkStand.vendor, room.fireworkStand.inspector].some((npc) => this.distanceFromHeadToLocal(npc) <= 2)
    ) {
      return `Shop at ${room.fireworkStand.standName} (press E)`;
    }
    if (
      room.roadsideMonument &&
      [room.roadsideMonument.docent, room.roadsideMonument.ranger].some((npc) => this.distanceFromHeadToLocal(npc) <= 2)
    ) {
      return `Visit ${room.roadsideMonument.monumentName} (press E)`;
    }
    if (
      room.jackalopeLodge &&
      [room.jackalopeLodge.elder, ...room.jackalopeLodge.witnesses].some((npc) => this.distanceFromHeadToLocal(npc) <= 2)
    ) {
      return `Hear a tall tale at ${room.jackalopeLodge.lodgeName} (press E)`;
    }
    if (
      room.motelPool &&
      [room.motelPool.clerk, room.motelPool.maintenance].some((npc) => this.distanceFromHeadToLocal(npc) <= 2)
    ) {
      return `Check in at ${room.motelPool.poolName} (press E)`;
    }
    if (room.billboardOracle && this.distanceFromHeadToLocal(room.billboardOracle.signPainter) <= 2) {
      return `Read the billboard prophecy (press E)`;
    }
    if (room.roadCrew && this.distanceFromHeadToLocal(room.roadCrew.ranger) <= 2) {
      return `Ask for roadside assistance on ${room.roadCrew.roadName} (press E)`;
    }
    return null;
  }

  private libertyLine(role: LibertyNpcRole, seed = 0): string {
    return getLibertyNpcLine(role, seed + this.snakeGame.getScore());
  }

  private tryInteractLibertyStructure(): boolean {
    if (this.paused || this.offeredQuest || this.choicePopupVisible) {
      return false;
    }
    const room = this.snakeGame.getCurrentRoom();
    const option = this.getLibertyStructureHint(room);
    if (!option) {
      return false;
    }
    const choices: ChoiceOption[] = [];
    let title = 'Liberty Badlands';
    if (
      room.gridironYard &&
      [room.gridironYard.coach, ...room.gridironYard.players].some((npc) => this.distanceFromHeadToLocal(npc) <= 2)
    ) {
      title = room.gridironYard.fieldName;
      choices.push(
        {
          id: 'liberty-football',
          title: 'Hail Mary Drill',
          description: this.libertyLine('coach', 1),
        },
        {
          id: 'liberty-football-blitz',
          title: 'Blitz Drill',
          description: this.libertyLine('coach', 2),
        },
      );
    } else if (
      room.allNiteDiner &&
      [room.allNiteDiner.cook, room.allNiteDiner.waitress, room.allNiteDiner.regular].some((npc) => this.distanceFromHeadToLocal(npc) <= 2)
    ) {
      title = room.allNiteDiner.dinerName;
      choices.push(
        {
          id: 'liberty-diner-pie',
          title: 'Pie Slice - 12 score',
          description: this.libertyLine('waitress', 1),
        },
        {
          id: 'liberty-diner-coffee',
          title: 'Bottomless Coffee - 8 score',
          description: this.libertyLine('regular', 2),
        },
        {
          id: 'liberty-diner-blue-plate',
          title: 'Blue Plate Special - 20 score',
          description: this.libertyLine('cook', 3),
        },
        {
          id: 'liberty-diner-hashbrowns',
          title: 'Hash Browns - 10 score',
          description: this.libertyLine('cook', 4),
        },
      );
    } else if (
      room.fireworkStand &&
      [room.fireworkStand.vendor, room.fireworkStand.inspector].some((npc) => this.distanceFromHeadToLocal(npc) <= 2)
    ) {
      title = room.fireworkStand.standName;
      choices.push(
        {
          id: 'liberty-firework-football',
          title: 'Bottle-Rocket Football - 18 score',
          description: this.libertyLine('fireworkVendor', 1),
        },
        {
          id: 'liberty-firework-roman-candle',
          title: 'Roman Candle Pack - 28 score',
          description: this.libertyLine('inspector', 2),
        },
        {
          id: 'liberty-firework-sparkler',
          title: 'Sparkler Trail - 12 score',
          description: this.libertyLine('fireworkVendor', 3),
        },
      );
    } else if (
      room.roadsideMonument &&
      [room.roadsideMonument.docent, room.roadsideMonument.ranger].some((npc) => this.distanceFromHeadToLocal(npc) <= 2)
    ) {
      title = room.roadsideMonument.monumentName;
      choices.push(
        {
          id: 'liberty-monument-blessing',
          title: 'Read the Plaque',
          description: this.libertyLine('docent', 1),
        },
        {
          id: 'liberty-monument-donate',
          title: 'Donate to the Gift Shop - 15 score',
          description: this.libertyLine('ranger', 2),
        },
      );
    } else if (
      room.jackalopeLodge &&
      [room.jackalopeLodge.elder, ...room.jackalopeLodge.witnesses].some((npc) => this.distanceFromHeadToLocal(npc) <= 2)
    ) {
      title = room.jackalopeLodge.lodgeName;
      choices.push(
        {
          id: 'liberty-lodge-tale',
          title: 'Hear the Tall Tale',
          description: this.libertyLine('elder', 1),
        },
        {
          id: 'liberty-lodge-whistle',
          title: 'Buy Antler Whistle - 16 score',
          description: this.libertyLine('witness', 2),
        },
      );
    } else if (
      room.motelPool &&
      [room.motelPool.clerk, room.motelPool.maintenance].some((npc) => this.distanceFromHeadToLocal(npc) <= 2)
    ) {
      title = room.motelPool.poolName;
      choices.push(
        {
          id: 'liberty-motel-cooldown',
          title: 'Chlorine Cooldown - 8 score',
          description: this.libertyLine('motelClerk', 1),
        },
        {
          id: 'liberty-motel-lost-found',
          title: 'Lost & Found Dive - 14 score',
          description: this.libertyLine('maintenance', 2),
        },
      );
    } else if (room.billboardOracle && this.distanceFromHeadToLocal(room.billboardOracle.signPainter) <= 2) {
      title = room.billboardOracle.slogan;
      choices.push({
        id: 'liberty-billboard-contract',
        title: 'Sign the Ad Contract',
        description: this.libertyLine('signPainter', 1),
      });
    } else if (room.roadCrew && this.distanceFromHeadToLocal(room.roadCrew.ranger) <= 2) {
      title = room.roadCrew.roadName;
      choices.push({
        id: 'liberty-roadside-assistance',
        title: 'Roadside Assistance - 10 score',
        description: this.libertyLine('roadCrew', 1),
      });
    }
    if (choices.length === 0) {
      return false;
    }
    choices.push({ id: 'liberty-leave', title: 'Leave', description: 'Return to the red dirt.' });
    this.paused = true;
    this.setChoicePopupVisible(true);
    this.villageShopPopup.show(title, choices, (id) => {
      this.handleLibertyChoice(id);
      this.paused = false;
      this.setChoicePopupVisible(false);
      this.isDirty = true;
    });
    return true;
  }

  private handleLibertyChoice(id: string): void {
    if (id === 'liberty-leave') {
      return;
    }
    if (id === 'liberty-football') {
      this.runFootballCatchPlay();
      return;
    }
    if (id === 'liberty-football-blitz') {
      this.runFootballCatchPlay();
      this.grantFootballThrow(1);
      this.snakeGame.addScore(20);
      (this.juice as any).gridironCrowdRoar?.(this.scale.width / 2, 90);
      this.showQuestHintPopup('Blitz survived. +20 score and an extra football throw.', '#f3eee2');
      return;
    }
    if (id === 'liberty-diner-pie') {
      if (!this.spendScore(12, 'Pie Slice')) return;
      this.snakeGame.growSnake(2);
      this.snakeGame.setFlag('player.temperatureExposureMs', 0);
      this.showQuestHintPopup('Pie acquired. +2 length. The heat looks briefly embarrassed.', '#9ad1ff');
      return;
    }
    if (id === 'liberty-diner-coffee') {
      if (!this.spendScore(8, 'Bottomless Coffee')) return;
      this.snakeGame.setFlag('liberty.caffeineCatches', 2);
      (this.juice as any).neonFlicker?.(this.scale.width / 2, 80);
      this.showQuestHintPopup('Coffee hits like a legal document with caffeine. Next two football catches pay double.', '#9ad1ff');
      return;
    }
    if (id === 'liberty-diner-blue-plate') {
      if (!this.spendScore(20, 'Blue Plate Special')) return;
      const roll = Math.floor(Math.random() * 3);
      if (roll === 0) {
        this.snakeGame.growSnake(3);
        this.showQuestHintPopup('Blue Plate Special: Monumental Appetite. +3 length.', '#f3eee2');
      } else if (roll === 1) {
        this.grantFootballThrow(2);
        this.showQuestHintPopup('Blue Plate Special: Fourth Quarter Arm. +2 football throws.', '#9ad1ff');
      } else {
        this.snakeGame.setFlag('player.temperatureExposureMs', 0);
        this.snakeGame.setFlag('liberty.nextAppleBonus', 35);
        this.showQuestHintPopup('Blue Plate Special: Long Weekend. Heat reset and next apple gets +35 score.', '#f3eee2');
      }
      (this.juice as any).neonFlicker?.(this.scale.width / 2, 80);
      return;
    }
    if (id === 'liberty-diner-hashbrowns') {
      if (!this.spendScore(10, 'Hash Browns')) return;
      this.snakeGame.growSnake(1);
      this.grantFootballThrow(1);
      this.showQuestHintPopup('Hash browns acquired. +1 length and one football throw.', '#f3eee2');
      return;
    }
    if (id === 'liberty-firework-football') {
      if (!this.spendScore(18, 'Bottle-Rocket Football')) return;
      this.grantFootballThrow(1);
      (this.juice as any).fireworkPop?.(this.scale.width / 2, 90);
      this.showQuestHintPopup('One bottle-rocket football ready. Click or tap to throw it.', '#9ad1ff');
      return;
    }
    if (id === 'liberty-firework-roman-candle') {
      if (!this.spendScore(28, 'Roman Candle Pack')) return;
      this.grantFootballThrow(3);
      (this.juice as any).fireworkPop?.(this.scale.width / 2 - 24, 90);
      (this.juice as any).fireworkPop?.(this.scale.width / 2 + 24, 100);
      this.showQuestHintPopup('Roman candle pack armed. Three football throws ready.', '#9ad1ff');
      return;
    }
    if (id === 'liberty-firework-sparkler') {
      if (!this.spendScore(12, 'Sparkler Trail')) return;
      this.snakeGame.setFlag('liberty.nextAppleBonus', 26);
      (this.juice as any).fireworkPop?.(this.scale.width / 2, 90);
      this.showQuestHintPopup('Sparkler trail pops safely. Next apple gets +26 score.', '#f3eee2');
      return;
    }
    if (id === 'liberty-monument-blessing') {
      this.snakeGame.addScore(25);
      this.snakeGame.setFlag('player.temperatureExposureMs', 0);
      (this.juice as any).monumentSparkle?.(this.scale.width / 2, 86);
      this.showQuestHintPopup('The plaque makes several claims. +25 score. Heat reset.', '#f3eee2');
      return;
    }
    if (id === 'liberty-monument-donate') {
      if (!this.spendScore(15, 'Gift Shop Donation')) return;
      this.snakeGame.setFlag('liberty.nextAppleBonus', 45);
      this.grantFootballThrow(1);
      (this.juice as any).monumentSparkle?.(this.scale.width / 2, 86);
      this.showQuestHintPopup('Donation receipt blessed. Next apple gets +45 score and one commemorative football.', '#f3eee2');
      return;
    }
    if (id === 'liberty-lodge-tale') {
      this.snakeGame.addScore(12);
      this.snakeGame.growSnake(1);
      this.showQuestHintPopup('The story grows in the telling. So do you. +1 length, +12 score.', '#f3eee2');
      return;
    }
    if (id === 'liberty-lodge-whistle') {
      if (!this.spendScore(16, 'Antler Whistle')) return;
      this.snakeGame.growSnake(2);
      this.snakeGame.addScore(10);
      (this.juice as any).monumentSparkle?.(this.scale.width / 2, 86);
      this.showQuestHintPopup('The whistle makes a sound only witnesses understand. +2 length.', '#f3eee2');
      return;
    }
    if (id === 'liberty-motel-cooldown') {
      if (!this.spendScore(8, 'Chlorine Cooldown')) return;
      this.snakeGame.setFlag('player.temperatureExposureMs', 0);
      this.snakeGame.addScore(12);
      (this.juice as any).neonFlicker?.(this.scale.width / 2, 80);
      this.showQuestHintPopup('Pool rules observed. Heat reset, +12 score.', '#9ad1ff');
      return;
    }
    if (id === 'liberty-motel-lost-found') {
      if (!this.spendScore(14, 'Lost & Found Dive')) return;
      this.grantFootballThrow(1);
      this.snakeGame.addScore(22);
      this.showQuestHintPopup('You skim up a room key and a football. +22 score, +1 throw.', '#9ad1ff');
      return;
    }
    if (id === 'liberty-billboard-contract') {
      this.snakeGame.addScore(30);
      (this.juice as any).neonFlicker?.(this.scale.width / 2, 80);
      this.showQuestHintPopup('The billboard nods in vinyl. +30 score.', '#9ad1ff');
      return;
    }
    if (id === 'liberty-roadside-assistance') {
      if (!this.spendScore(10, 'Roadside Assistance')) return;
      this.snakeGame.setFlag('player.temperatureExposureMs', 0);
      this.grantFootballThrow(1);
      this.showQuestHintPopup('Detour approved. Heat reset and one football throw ready.', '#f3eee2');
    }
  }

  private spendScore(cost: number, label: string): boolean {
    if (this.snakeGame.getScore() < cost) {
      this.showQuestHintPopup(`${label} costs ${cost} score.`, '#ff6b6b');
      return false;
    }
    this.snakeGame.addScore(-cost);
    return true;
  }

  private grantFootballThrow(amount: number): void {
    const current = Number(this.snakeGame.getFlag<number>('equipment.libertyFootballCharges') ?? 0);
    this.snakeGame.setFlag('equipment.libertyFootballCharges', current + amount);
  }

  private runFootballCatchPlay(): void {
    const room = this.snakeGame.getCurrentRoom();
    const head = this.snakeGame.getSnakeBody()[0];
    if (!room.gridironYard || !head) {
      return;
    }
    const [roomX, roomY] = room.id.split(',').map(Number);
    const local = { x: head.x - roomX * this.grid.cols, y: head.y - roomY * this.grid.rows };
    const coachWorld = this.tileToWorldLocalInRoom(room.gridironYard.coach);
    const catchWorld = this.tileToWorldLocalInRoom(local);
    (this.juice as any).footballPass?.(coachWorld.x, coachWorld.y, catchWorld.x, catchWorld.y);
    const direction =
      Math.abs(local.x - room.gridironYard.coach.x) >= Math.abs(local.y - room.gridironYard.coach.y)
        ? { x: Math.sign(local.x - room.gridironYard.coach.x), y: 0 }
        : { x: 0, y: Math.sign(local.y - room.gridironYard.coach.y) };
    const spawned = this.snakeGame.spawnFootball(room.id, room.gridironYard.coach, direction, {
      target: local,
      maxAge: 12,
    });
    if (spawned) {
      this.showQuestHintPopup('Ball is live. Run it down and catch it before the desert does.', '#f3eee2');
    } else {
      this.grantFootballThrow(1);
      this.showQuestHintPopup('Coach hands you the ball. One football throw ready.', '#f3eee2');
    }
  }

  private townGossipLine(town: TownStructure): string {
    if (town.wantedLevel >= 3 || (town.suspicion ?? 0) >= 65) {
      return 'Keep your head down. The guards are counting shadows and calling half of them snakes.';
    }
    switch (town.mood) {
      case 'festival':
        return 'Festival lanterns are up. Even the bailiff is pretending to have a soul.';
      case 'foodShortage':
        return 'Food is short. People are smiling with their teeth closed.';
      case 'crimeWave':
        return 'Everyone has lost something this week. Some people lost patience first.';
      case 'curfew':
        return 'Curfew bell rings early now. The guards like the sound too much.';
      case 'weddingSeason':
        return 'Half the town is marrying, feuding, or buying flowers for both.';
      case 'funeralWeek':
        return 'Speak softly. The town has been burying more names than usual.';
      case 'plagueScare':
        return 'People are washing coins before touching them. It has not improved the coins.';
      default:
        return 'Town is town. Notice board lies, market complains, guards stare.';
    }
  }

  private describeRelationshipReward(reward: RelationshipReward): string {
    switch (reward.kind) {
      case 'item':
        return `Relationship reward: ${reward.itemId} x${reward.count}.`;
      case 'card':
        return `Relationship reward: ${reward.cardId === 'random' ? 'a card' : reward.cardId}.`;
      case 'perk':
        return 'Relationship perk unlocked.';
      case 'temporaryBuff':
        return `Relationship buff active for ${reward.durationRooms} rooms.`;
      case 'shopDiscount':
        return `Relationship discount active for ${reward.rooms} rooms.`;
      case 'mapHint':
        return 'Relationship map hint recorded.';
      case 'rescueChance':
        return `Relationship rescue chance improved by ${reward.percent}%.`;
      case 'cosmetic':
        return 'Relationship cosmetic unlocked.';
      case 'score':
        return `Relationship reward: +${reward.amount} score.`;
    }
  }

  private isTownResidentInDistrict(
    workRoomId: string | undefined,
    district: TownDistrictKind | undefined,
  ): boolean {
    if (!workRoomId || !district) {
      return false;
    }
    const currentTown = this.snakeGame.getCurrentTown();
    const physicalKind = currentTown?.districtByRoomId[workRoomId];
    if (physicalKind) {
      return this.isTownResidentInDistrict(physicalKind, district);
    }
    const kind = workRoomId.split(':').pop();
    if (kind === district) return true;
    if (kind === 'market' && district === 'marketStreet') return true;
    if (kind === 'tavern' && district === 'tavernInterior') return true;
    if (kind === 'residential' && district === 'residentialStreet') return true;
    if (kind === 'exit' && district === 'townExit') return true;
    return false;
  }

  private showDatingScene(
    profile: RelationshipCandidateProfile,
    result?: RelationshipEventResult,
  ): void {
    this.paused = true;
    this.skillTree.hideOverlay();
    const cutscene = result ? undefined : this.snakeGame.popRelationshipCutscene(profile.id);
    if (cutscene) {
      const state = this.snakeGame.getRelationshipState(profile);
      this.datingScenePopup.show({
        profile,
        state,
        line: cutscene.pages.join('\n\n'),
        lineIsNarration: true,
        result: {
          ok: true,
          title: profile.displayName,
          message: cutscene.pages.join('\n'),
          color: '#ffbdfd',
          state,
        },
        actions: [{ id: 'continue', label: 'Continue' }, { id: 'leave', label: 'Leave', tone: 'quiet' }],
        onAction: (action) => {
          if (action === 'leave') {
            this.datingScenePopup.hide();
            this.paused = false;
            return;
          }
          this.showDatingScene(profile, {
            ok: true,
            title: profile.displayName,
            message: cutscene.pages[cutscene.pages.length - 1] ?? '',
            color: '#ffbdfd',
            state,
          });
        },
      });
      return;
    }
    const talk = this.snakeGame.getRelationshipTalk(profile);
    this.datingScenePopup.show({
      profile,
      state: result?.state ?? this.snakeGame.getRelationshipState(profile) ?? talk.state,
      line: this.extractFirstQuotedLine(result?.message) ?? talk.line,
      result: result as any,
      actions: this.getDatingSceneActions(profile, result?.state ?? this.snakeGame.getRelationshipState(profile) ?? talk.state),
      onAction: (action) => this.handleDatingSceneAction(profile, action),
    });
  }

  private getDatingSceneActions(
    profile: RelationshipCandidateProfile,
    state?: { stage?: string; romanceOptIn?: boolean; resentment?: number; jealousy?: number },
  ): readonly DatingSceneButton[] {
    const stage = state?.stage ?? 'stranger';
    const needsApology = Number(state?.resentment ?? 0) > 0 || Number(state?.jealousy ?? 0) > 0 || stage === 'estranged';
    const labels: Record<string, string> = {
      talk: 'Talk',
      gift: 'Gift',
      flirt: 'Flirt',
      'ask-out': 'Ask Out',
      date: 'Date',
      propose: 'Propose',
      reassure: 'Reassure',
      apologize: 'Apologize',
      explain: 'Explain',
      family: 'Family',
      'discuss-arrangement': 'Arrangement',
      divorce: 'Divorce',
      'break-up': 'Break Up',
      plead: 'Plead',
      fight: 'Fight',
      run: 'Run',
    };
    const danger = new Set(['divorce', 'break-up', 'fight', 'run']);
    const actions = this.snakeGame.getRelationshipActions(profile).map((id) => ({
      id: id as DatingSceneAction,
      label: labels[id] ?? id,
      tone: danger.has(id) ? ('danger' as const) : undefined,
      disabled: id === 'apologize' && !needsApology,
      reason: id === 'apologize' && !needsApology ? 'no hurt' : undefined,
    }));
    return [...actions, { id: 'leave', label: 'Leave' }];
  }

  private handleDatingSceneAction(profile: RelationshipCandidateProfile, action: DatingSceneAction): void {
    if (this.activeDatingSequence) {
      this.handleDatingSequenceAction(action);
      return;
    }
    if (action === 'leave') {
      this.datingScenePopup.hide();
      this.paused = false;
      this.activeDatingSequence = null;
      this.showSaveUI();
      this.skillTree.getOverlay().refresh();
      return;
    }
    if (action === 'gift') {
      this.showRelationshipGiftPicker(profile);
      return;
    }
    if (action === 'talk' || action === 'flirt' || action === 'date') {
      this.startDatingSequence(profile, action);
      return;
    }
    const result = this.snakeGame.applyRelationshipChoice(profile, action as RelationshipChoice);
    this.showDatingScene(profile, result);
    this.skillTree.getOverlay().refresh();
  }

  private startDatingSequence(
    profile: RelationshipCandidateProfile,
    kind: Extract<RelationshipChoice, 'talk' | 'flirt' | 'date'>,
  ): void {
    const event = this.createDatingSequenceEvent(profile, kind);
    this.activeDatingSequence = {
      profile,
      kind,
      pages: event.pages,
      index: 0,
      branchResults: event.branchResults,
    };
    this.renderDatingSequence();
  }

  private handleDatingSequenceAction(action: DatingSceneAction): void {
    const sequence = this.activeDatingSequence;
    if (!sequence) return;
    if (action === 'leave') {
      this.activeDatingSequence = null;
      this.showDatingScene(sequence.profile);
      return;
    }
    if (String(action).startsWith('branch-')) {
      const result = sequence.branchResults[action];
      sequence.branchOutcome = result?.outcome;
      sequence.branchChoice = this.normalizeDatingBranchChoice(String(action), result);
      sequence.branchText = `${sequence.profile.displayName}'s expression changes before their voice does.`;
      sequence.index += 1;
      this.renderDatingSequence();
      return;
    }
    if (action === 'continue') {
      sequence.index += 1;
      this.renderDatingSequence();
    }
  }

  private renderDatingSequence(): void {
    const sequence = this.activeDatingSequence;
    if (!sequence) return;
    if (sequence.index >= sequence.pages.length) {
      const branch = sequence.branchChoice
        ? this.snakeGame.applyRelationshipBranchChoice(sequence.profile, sequence.branchChoice, sequence.kind)
        : null;
      const main = branch
        ? null
        : this.snakeGame.applyRelationshipChoice(sequence.profile, sequence.kind);
      const fallback = sequence.branchOutcome
        ? this.snakeGame.applyRelationshipChoice(sequence.profile, sequence.branchOutcome)
        : null;
      this.activeDatingSequence = null;
      const result = branch ?? fallback ?? main;
      if (!result) return;
      const message = [sequence.branchText, result.message].filter(Boolean).join('\n');
      this.showDatingScene(sequence.profile, { ...result, message });
      this.skillTree.getOverlay().refresh();
      return;
    }
    const page = sequence.pages[sequence.index]!;
    const state = this.snakeGame.getRelationshipState(sequence.profile);
    this.datingScenePopup.show({
      profile: sequence.profile,
      state,
      line: page.line,
      lineIsNarration: page.lineIsNarration,
      result: {
        ok: true,
        title: sequence.profile.displayName,
        message: [sequence.branchText, page.result].filter(Boolean).join('\n'),
        color: '#ffbdfd',
        state,
      },
      actions: page.actions ?? [{ id: 'continue', label: 'Continue' }, { id: 'leave', label: 'Back', tone: 'quiet' }],
      onAction: (action) => this.handleDatingSceneAction(sequence.profile, action),
    });
  }

  private normalizeDatingBranchChoice(actionId: string, result?: DatingBranchResult): DatingBranchChoice {
    const label = result?.label ?? actionId.replace(/^branch-/, '').replace(/-/g, ' ');
    return {
      id: actionId,
      label,
      line: result?.text ?? label,
      tags: result?.tags ?? this.inferRelationshipTags(actionId),
      targetTier: result?.targetTier,
    };
  }

  private inferRelationshipTags(actionId: string): DatingBranchChoice['tags'] {
    if (/protect|sharecloak/.test(actionId)) return ['protective', 'selfless', 'bravery', 'privateAffection'];
    if (/run|floor|coward|skip/.test(actionId)) return ['selfPreserving', 'avoidance'];
    if (/joke|counter|mooncrime/.test(actionId)) return ['clever', 'dramatic'];
    if (/honest|sincere/.test(actionId)) return ['honesty', 'privateAffection'];
    if (/knife|stone|betrayer/.test(actionId)) return ['violence', 'danger', 'dramatic'];
    if (/pastry|pepperoni|pineapple|mushroom/.test(actionId)) return ['food', 'comfort'];
    if (/married|slowdance|eyes|smile|rose/.test(actionId)) return ['commitment', 'publicAffection', 'dramatic'];
    if (/home/.test(actionId)) return ['comfort', 'loyalty'];
    if (/thief|mastermind|rival/.test(actionId)) return ['clever', 'ambition'];
    if (/mock|complain/.test(actionId)) return ['betrayal', 'neediness'];
    return ['honesty'];
  }

  private createDatingSequenceEvent(
    profile: RelationshipCandidateProfile,
    kind: Extract<RelationshipChoice, 'talk' | 'flirt' | 'date'>,
  ): { pages: DatingSequencePage[]; branchResults: Record<string, DatingBranchResult> } {
    const voice = (line: string): DatingSequencePage => ({ line, result: `${profile.displayName}'s expression changes before their voice does.` });
    const speciesLine = (human: string, goblin: string, angel: string): string => {
      if (profile.species === 'goblin' || profile.species === 'goblin-angel') return goblin;
      if (profile.species === 'angel') return angel;
      return human;
    };
    const templates: Array<{ pages: DatingSequencePage[]; branchResults: Record<string, DatingBranchResult> }> = [];
    if (kind === 'talk') {
      templates.push({
        pages: [
        { line: `You and ${profile.displayName} step aside where the room noise thins.`, lineIsNarration: true },
        voice(this.pickRelationshipLine(profile, [
          'I was going to make a joke, but then you arrived looking like the punchline had unionized.',
          'Tell me something true and small. Large truths always arrive overdressed.',
          'If this is small talk, why does it keep looking at me like a duel?',
        ])),
        {
          line: `${profile.displayName} makes a joke that is either flirtation, accusation, or advanced local weather.`,
          lineIsNarration: true,
          actions: [
            { id: 'branch-joke', label: 'Joke Back' },
            { id: 'branch-honest', label: 'Answer Honestly' },
            { id: 'leave', label: 'Back', tone: 'quiet' },
          ],
        },
        voice(this.pickRelationshipLine(profile, [
          'Not terrible. I reserve the right to become fond of this version of you.',
          'Careful. Competence is dangerously close to charm.',
        ])),
        ],
        branchResults: {
          'branch-joke': { text: `Liked: ${profile.displayName} laughs despite themselves. The joke clearly landed.` },
          'branch-honest': { text: `Liked: ${profile.displayName} goes quiet because the honest answer mattered.` },
        },
      });
      templates.push({
        pages: [
          { line: `${profile.displayName} points at a cracked map and asks where you would go if no one needed anything from you.`, lineIsNarration: true },
          voice(speciesLine(
            'Choose carefully. I judge imaginary vacations with real severity.',
            'Say treasure cave and I may respect you. Say tax office and I may propose immediately.',
            'Do not say heaven. I have seen the management.',
          )),
          {
            line: `The map waits like a tiny, rude oracle.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-sea', label: 'Sea' },
              { id: 'branch-mountain', label: 'Mountain' },
              { id: 'branch-home', label: 'Home' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('Interesting. I can work with that answer. I may also weaponize it.'),
        ],
        branchResults: {
          'branch-sea': { text: `Liked: ${profile.displayName} likes the sea answer and softens at the image.` },
          'branch-mountain': { text: `Neutral: ${profile.displayName} respects the mountain answer, but it does not quite reach them.` },
          'branch-home': { text: `Loved: ${profile.displayName} liked "home" more than they expected.` },
        },
      });
      templates.push({
        pages: [
          { line: `${profile.displayName} tells you a joke so dry it may technically be kindling.`, lineIsNarration: true },
          voice('Laugh if you understand it. Laugh harder if you do not.'),
          {
            line: `The joke hangs there with ceremonial arrogance.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-laugh', label: 'Laugh' },
              { id: 'branch-groan', label: 'Groan' },
              { id: 'branch-counterjoke', label: 'Counter' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('Fine. That reaction was acceptable enough to survive the record.'),
        ],
        branchResults: {
          'branch-laugh': { text: `Liked: ${profile.displayName} looks pleased that you laughed.` },
          'branch-groan': { text: `Neutral: ${profile.displayName} accepts the groan, but wanted a laugh.` },
          'branch-counterjoke': { text: `Loved: ${profile.displayName} loves that you answered with a joke of your own.` },
        },
      });
      templates.push({
        pages: [
          { line: `${profile.displayName} asks what rumor about you is closest to true.`, lineIsNarration: true },
          voice(speciesLine(
            'Careful. I prefer truth wearing a dramatic hat.',
            'If it involves theft, say it proudly. If it involves taxes, lie.',
            'The universe keeps records. I prefer hearing the annotated version.',
          )),
          {
            line: `Three rumors volunteer themselves with terrible posture.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-rumor-hero', label: 'Secret Hero' },
              { id: 'branch-rumor-thief', label: 'Thief' },
              { id: 'branch-rumor-coward', label: 'Coward', tone: 'danger' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('Good. A person without rumors is either boring or dangerously efficient.'),
        ],
        branchResults: {
          'branch-rumor-hero': { text: `Liked: ${profile.displayName} likes the heroic answer, even if they call it suspicious.` },
          'branch-rumor-thief': { text: `Liked: ${profile.displayName} finds the thief answer entertaining.` },
          'branch-rumor-coward': { text: `Disliked: ${profile.displayName} appreciates the honesty, but cowardice clearly bothers them.`, outcome: 'mean' },
        },
      });
    } else if (kind === 'flirt') {
      templates.push({
        pages: [
        { line: `You lean into the ridiculous tension like someone opening a cursed love letter.`, lineIsNarration: true },
        voice(this.pickRelationshipLine(profile, [
          'That line was indecently confident for someone shaped like consequences.',
          'Say that again slower. I want to decide whether to reward you or ruin you socially.',
          'You are flirting like a person trying to negotiate with lightning. Continue.',
        ])),
        {
          line: `${profile.displayName} asks, with suspicious gravity: "What is your kind of pizza?"`,
          lineIsNarration: true,
          actions: [
            { id: 'branch-pineapple', label: 'Pineapple' },
            { id: 'branch-pepperoni', label: 'Pepperoni' },
            { id: 'branch-mushroom', label: 'Mushroom' },
            { id: 'leave', label: 'Back', tone: 'quiet' },
          ],
        },
        voice(this.pickRelationshipLine(profile, [
          'I hate that I asked. I hate more that your answer helps.',
          'Fine. The flirtation survives cross-examination. Barely.',
        ])),
        ],
        branchResults: {
          'branch-pineapple': { text: `Liked: "pineapple? Bold. I like bold."` },
          'branch-pepperoni': { text: `Neutral: "pepperoni? Direct. I can respect direct."` },
          'branch-mushroom': { text: `Liked: "mushroom? Mysterious. I like that more than I should."` },
        },
      });
      templates.push({
        pages: [
          { line: `${profile.displayName} asks what kind of villain you would be in a melodrama.`, lineIsNarration: true },
          voice('Do not disappoint me with a humble answer.'),
          {
            line: `The question has no innocent exits.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-rival', label: 'Elegant Rival' },
              { id: 'branch-mastermind', label: 'Mastermind' },
              { id: 'branch-betrayer', label: 'Betrayer', tone: 'danger' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('That answer is either attractive or a warning label. Fortunately, I read both.'),
        ],
        branchResults: {
          'branch-rival': { text: `Loved: ${profile.displayName} clearly approves of the elegant rival answer.` },
          'branch-mastermind': { text: `Liked: ${profile.displayName} likes the ambition, even while judging your imaginary lair.` },
          'branch-betrayer': { text: `Disliked: ${profile.displayName} does not like betrayal jokes. Resentment takes notes.`, outcome: 'mean' },
        },
      });
      templates.push({
        pages: [
          { line: `${profile.displayName} dares you to compliment them without using a single normal word.`, lineIsNarration: true },
          voice(speciesLine(
            'Go on. Fail creatively.',
            'If you compare me to money, it had better be rare money.',
            'Do not say radiant. I have union restrictions on that word.',
          )),
          {
            line: `You have one theatrical compliment and absolutely no dignity.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-mooncrime', label: 'Moon Crime' },
              { id: 'branch-knifepoem', label: 'Knife Poem' },
              { id: 'branch-sincere', label: 'Sincere' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('Infuriating. That was better than it deserved to be.'),
        ],
        branchResults: {
          'branch-mooncrime': { text: `Liked: ${profile.displayName} likes the phrase "moon crime" enough to repeat it.` },
          'branch-knifepoem': { text: `Loved: ${profile.displayName} is delighted by the dangerous compliment.` },
          'branch-sincere': { text: `Loved: the sincere compliment lands hard. They liked that a lot.` },
        },
      });
      templates.push({
        pages: [
          { line: `${profile.displayName} asks where your eyes are supposed to be during a flirtation this dramatic.`, lineIsNarration: true },
          voice('Answer wrong and I will become insufferable. Answer right and I may become worse.'),
          {
            line: `The bottom third of reality becomes a court of romantic law.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-eyes', label: 'Their Eyes' },
              { id: 'branch-smile', label: 'Their Smile' },
              { id: 'branch-floor', label: 'The Floor' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('I will be unbearable about this later. You have been warned.'),
        ],
        branchResults: {
          'branch-eyes': { text: `Loved: ${profile.displayName} likes the eye contact and does not look away first.` },
          'branch-smile': { text: `Liked: ${profile.displayName} liked being told their smile matters.` },
          'branch-floor': { text: `Disliked: ${profile.displayName} thinks looking away was cowardly, but not unforgivable.` },
        },
      });
    } else {
      templates.push({
        pages: [
          { line: `You and ${profile.displayName} go to a tavern. ${profile.displayName} kicks back a drink like it personally offended them.`, lineIsNarration: true },
      voice(this.pickRelationshipLine(profile, [
        'This place is awful. Good. Perfect dates should have one obvious enemy.',
        'If you planned this, I am impressed. If you improvised it, I am concerned and impressed.',
        'Do not look so relieved. The date has only survived the opening argument.',
      ])),
      {
        line: `A bear crashes through the side wall. The tavern immediately develops opinions about exits.`,
        lineIsNarration: true,
        actions: [
          { id: 'branch-protect', label: 'Protect Them' },
          { id: 'branch-run', label: 'Run Off', tone: 'danger' },
          { id: 'leave', label: 'Back', tone: 'quiet' },
        ],
      },
      voice(this.pickRelationshipLine(profile, [
        'I cannot believe the bear was not the strangest part of tonight.',
        'You are either heroic or wildly committed to the bit. I am not immune to either.',
      ])),
        ],
        branchResults: {
          'branch-protect': { text: `Loved: ${profile.displayName} liked that you protected them. It mattered.` },
          'branch-run': { text: `Hated: you ran. ${profile.displayName} survives, but they hated being abandoned.`, outcome: 'mean' },
        },
      });
      templates.push({
        pages: [
          { line: `You and ${profile.displayName} find a night market where every stall sells something probably cursed.`, lineIsNarration: true },
          voice('Romance is mostly choosing which obvious trap to enter together.'),
          {
            line: `A vendor offers a black rose, a brass knife, and a pastry shaped like a legal document.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-rose', label: 'Rose' },
              { id: 'branch-knife', label: 'Knife' },
              { id: 'branch-pastry', label: 'Pastry' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('A suspicious choice. Naturally, I respect it.'),
        ],
        branchResults: {
          'branch-rose': { text: `Liked: ${profile.displayName} liked the rose, even while pretending it was too obvious.` },
          'branch-knife': { text: `Loved: ${profile.displayName} loved the knife choice. That says something about them.` },
          'branch-pastry': { text: `Liked: ${profile.displayName} liked the absurd pastry more than expected.` },
        },
      });
      templates.push({
        pages: [
          { line: `Rain traps you and ${profile.displayName} under a collapsing awning. It is extremely dramatic for weather.`, lineIsNarration: true },
          voice('If the sky is trying to set a mood, it is overqualified.'),
          {
            line: `${profile.displayName} is close enough to hear your heroic lack of plan.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-sharecloak', label: 'Share Cloak' },
              { id: 'branch-dance', label: 'Dance' },
              { id: 'branch-complainrain', label: 'Complain', tone: 'danger' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('Fine. The rain may continue. Briefly.'),
        ],
        branchResults: {
          'branch-sharecloak': { text: `Loved: ${profile.displayName} liked sharing the cloak and moved closer on purpose.` },
          'branch-dance': { text: `Liked: ${profile.displayName} calls you absurd, but they liked the dance.` },
          'branch-complainrain': { text: `Disliked: ${profile.displayName} did not like you ruining the mood by complaining.`, outcome: 'mean' },
        },
      });
      templates.push({
        pages: [
          { line: `The date reaches a quiet bridge. Below it, something large moves through the dark water.`, lineIsNarration: true },
          voice('This is either romantic or a monster introduction. Possibly both.'),
          {
            line: `A glowing bottle floats near the bank with a note inside.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-readnote', label: 'Read Note' },
              { id: 'branch-skipnote', label: 'Ignore It' },
              { id: 'branch-throwstone', label: 'Throw Stone', tone: 'danger' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('I will remember this as atmospheric. Do not make me revise it.'),
        ],
        branchResults: {
          'branch-readnote': { text: `Loved: the note says, "Kiss the fool or flee the bridge." ${profile.displayName} liked that you read it.` },
          'branch-skipnote': { text: `Neutral: ${profile.displayName} respects ignoring the bottle, but wanted curiosity.` },
          'branch-throwstone': { text: `Disliked: ${profile.displayName} did not like your survival instincts here.`, outcome: 'mean' },
        },
      });
      templates.push({
        pages: [
          { line: `A street musician recognizes ${profile.displayName} and starts playing something violently sentimental.`, lineIsNarration: true },
          voice('If you laugh, I will deny everything. If you dance, I may deny less.'),
          {
            line: `The song waits, shameless and overproduced.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-slowdance', label: 'Slow Dance' },
              { id: 'branch-tipband', label: 'Tip Band' },
              { id: 'branch-mockmusic', label: 'Mock Song', tone: 'danger' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('No one will speak of this accurately, which is probably mercy.'),
        ],
        branchResults: {
          'branch-slowdance': { text: `Loved: ${profile.displayName} loved the slow dance and is trying to hide it.` },
          'branch-tipband': { text: `Liked: ${profile.displayName} liked that you tipped the band.` },
          'branch-mockmusic': { text: `Hated: ${profile.displayName} hated that you mocked something sentimental.`, outcome: 'mean' },
        },
      });
      templates.push({
        pages: [
          { line: `The date is interrupted by a child asking if you two are married, doomed, or both.`, lineIsNarration: true },
          voice('Children should not be allowed to perceive subtext.'),
          {
            line: `The child waits with the brutal patience of prophecy.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-married', label: 'Basically' },
              { id: 'branch-doomed', label: 'Probably' },
              { id: 'branch-none', label: 'No Comment' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('I am choosing not to analyze how quickly you answered.'),
        ],
        branchResults: {
          'branch-married': { text: `Loved: ${profile.displayName} is flustered because the answer pleased them.` },
          'branch-doomed': { text: `Liked: ${profile.displayName} liked the dramatic answer more than the sensible one.` },
          'branch-none': { text: `Neutral: ${profile.displayName} respects the evasion, but wanted a braver answer.` },
        },
      });
    }
    return this.balanceDatingBranchResults(profile, templates[Math.floor(this.random() * templates.length)] ?? templates[0]!);
  }

  private balanceDatingBranchResults(profile: RelationshipCandidateProfile, event: {
    pages: DatingSequencePage[];
    branchResults: Record<string, DatingBranchResult>;
  }): { pages: DatingSequencePage[]; branchResults: Record<string, DatingBranchResult> } {
    const pages = event.pages.map((page) => ({ ...page, actions: page.actions ? [...page.actions] : undefined }));
    const branchPage = pages.find((page) => (page.actions ?? []).some((action) => action.id.startsWith('branch-')));
    if (branchPage) {
      const actions = [...(branchPage.actions ?? [])];
      const branchCount = actions.filter((action) => action.id.startsWith('branch-')).length;
      if (branchCount < 3) {
        const leave = actions.find((action) => action.id === 'leave');
        const withoutLeave = actions.filter((action) => action.id !== 'leave');
        branchPage.actions = [
          ...withoutLeave,
          { id: 'branch-observe', label: 'Read the Room' },
          ...(leave ? [leave] : []),
        ];
      }
    }
    const branchIds = pages
      .flatMap((page) => page.actions ?? [])
      .map((action) => action.id)
      .filter((id) => id.startsWith('branch-'));
    if (branchIds.length < 3) {
      return { ...event, pages };
    }
    const branchResults = { ...event.branchResults };
    const scored = branchIds.map((id) => {
      const existing = branchResults[id] ?? { text: id.replace(/^branch-/, '') };
      const tags = existing.tags ?? this.inferRelationshipTags(id);
      const score = this.scoreDatingTagsForProfile(profile, tags);
      return { id, score, tags, existing };
    });
    const ranked = [...scored].sort((a, b) => b.score - a.score);
    const high = ranked[0];
    const low = ranked[ranked.length - 1];
    const middle = ranked[Math.floor(ranked.length / 2)];
    for (const entry of scored) {
      const current = branchResults[entry.id] ?? entry.existing;
      branchResults[entry.id] = {
        ...current,
        tags: entry.tags,
        targetTier:
          entry.id === high?.id
            ? entry.score >= 9
              ? 'loved'
              : 'liked'
            : entry.id === low?.id
              ? entry.score <= -9
                ? 'hated'
                : 'disliked'
              : entry.id === middle?.id
                ? 'neutral'
                : this.tierForDatingScore(entry.score),
        outcome:
          entry.id === low?.id || entry.score <= -4
            ? (current.outcome ?? 'mean')
            : current.outcome,
      };
    }
    const tierFor = (id: string): 'positive' | 'neutral' | 'negative' => {
      if (!branchResults[id]) return 'neutral';
      const targetTier = branchResults[id]?.targetTier;
      if (targetTier === 'loved' || targetTier === 'liked') return 'positive';
      if (targetTier === 'neutral') return 'neutral';
      if (targetTier === 'disliked' || targetTier === 'hated') return 'negative';
      const text = branchResults[id]?.text.toLowerCase() ?? '';
      if (/hated|disliked/.test(text)) return 'negative';
      if (/neutral/.test(text)) return 'neutral';
      return 'positive';
    };
    const hasPositive = branchIds.some((id) => tierFor(id) === 'positive');
    const hasNeutral = branchIds.some((id) => tierFor(id) === 'neutral');
    const hasNegative = branchIds.some((id) => tierFor(id) === 'negative');
    const setTier = (id: string, tier: 'loved' | 'neutral' | 'disliked'): void => {
      const current = branchResults[id] ?? { text: id.replace(/^branch-/, '') };
      const stripped = current.text.replace(/^(Loved|Liked|Neutral|Disliked|Hated):\s*/i, '');
      branchResults[id] = {
        ...current,
        text: `${tier === 'loved' ? 'Loved' : tier === 'neutral' ? 'Neutral' : 'Disliked'}: ${stripped}`,
        targetTier: tier,
        tags:
          tier === 'loved'
            ? ['honesty', 'pragmatic', 'clever', 'food', 'comfort', 'bravery', 'commitment', 'privateAffection', 'dramatic']
            : tier === 'neutral'
              ? []
              : ['betrayal', 'avoidance', 'neediness'],
        outcome: tier === 'disliked' ? 'mean' : current.outcome,
      };
    };
    if (!hasPositive) {
      setTier(branchIds[0]!, 'loved');
    }
    if (!hasNeutral) {
      setTier(branchIds[Math.min(1, branchIds.length - 1)]!, 'neutral');
    }
    if (!hasNegative) {
      setTier(branchIds[branchIds.length - 1]!, 'disliked');
    }
    for (const id of branchIds) {
      const existing = branchResults[id];
      if (!existing) {
        branchResults[id] = {
          text: `Neutral: ${event.pages[0]?.line ? 'They take the measured answer without protest.' : 'The answer keeps the moment steady.'}`,
          targetTier: 'neutral',
          tags: [],
        };
      } else if (!existing.targetTier) {
        branchResults[id] = {
          ...existing,
          targetTier: this.tierForDatingScore(this.scoreDatingTagsForProfile(profile, existing.tags ?? this.inferRelationshipTags(id))),
        };
      }
    }
    return { ...event, pages, branchResults };
  }

  private scoreDatingTagsForProfile(
    profile: RelationshipCandidateProfile,
    tags: readonly RelationshipTag[],
  ): number {
    const personality = this.personalityForDatingProfile(profile);
    const weights = DATING_PERSONALITY_TAG_WEIGHTS[personality];
    return tags.reduce((total, tag) => total + (weights[tag] ?? 0), 0);
  }

  private tierForDatingScore(score: number): RelationshipOutcomeTier {
    if (score >= 10) return 'loved';
    if (score >= 4) return 'liked';
    if (score <= -10) return 'hated';
    if (score <= -4) return 'disliked';
    return 'neutral';
  }

  private personalityForDatingProfile(profile: RelationshipCandidateProfile): RelationshipPersonality {
    if (profile.personality) return profile.personality;
    if (profile.species === 'goblin' || profile.species === 'goblin-angel') return 'sharp';
    if (profile.species === 'angel') return 'regal';
    const options: RelationshipPersonality[] = ['poetic', 'deadpan', 'hungry', 'regal', 'sharp'];
    let total = 0;
    for (let i = 0; i < profile.id.length; i += 1) {
      total = (total * 31 + profile.id.charCodeAt(i)) >>> 0;
    }
    return options[total % options.length] ?? 'poetic';
  }

  private pickRelationshipLine(profile: RelationshipCandidateProfile, lines: readonly string[]): string {
    if (profile.species === 'goblin' || profile.species === 'goblin-angel') {
      return lines[Math.floor(this.random() * lines.length)] ?? lines[0]!;
    }
    if (profile.species === 'angel') {
      return lines[Math.floor(this.random() * lines.length)]?.replace('date', 'judgment') ?? lines[0]!;
    }
    return lines[Math.floor(this.random() * lines.length)] ?? lines[0]!;
  }

  private extractFirstQuotedLine(message?: string): string | null {
    if (!message) return null;
    const match = message.match(/"([^"]+)"/);
    return match?.[1] ?? null;
  }

  private showRelationshipGiftPicker(profile: RelationshipCandidateProfile): void {
    const gifts = this.snakeGame.getGiftableItems();
    if (gifts.length === 0) {
      this.showDatingScene(profile, {
        ok: false,
        title: profile.displayName,
        message: 'You have nothing giftable. Romance, like war, resents empty hands.',
        color: '#ff6b6b',
      });
      return;
    }
    this.datingScenePopup.hide();
    this.setChoicePopupVisible(true);
    this.villageShopPopup.show(
      `${profile.displayName}: Gift`,
      [
        ...gifts.slice(0, 12).map((gift) => ({
          id: gift.itemId,
          title: `${gift.name} x${gift.count}`,
          description: 'Give one. The reaction depends on taste, memory, and mood.',
        })),
        { id: 'cancel', title: 'Cancel', description: 'Do not give a gift.' },
      ],
      (itemId) => {
        this.setChoicePopupVisible(false);
        if (itemId === 'cancel') {
          this.showDatingScene(profile);
          return;
        }
        const result = this.snakeGame.giveRelationshipGift(profile, itemId);
        this.showDatingScene(profile, result);
        this.skillTree.getOverlay().refresh();
      },
    );
  }

  private showRelationshipResult(
    profile: RelationshipCandidateProfile,
    result: { title: string; message: string; color: string },
  ): void {
    this.showQuestDialogue(
      result.title,
      [result.message],
      {
        onClose: () => {
          this.closeQuestPopup();
          this.paused = false;
          this.skillTree.getOverlay().refresh();
        },
      },
      { closeLabel: 'Leave', nextLabel: 'Listen' },
      { portraitId: profile.portraitId },
    );
  }

  private handleNpcInsult(roomId: string, giverName: string, portraitId?: string): void {
    const insult = this.snakeGame.insultNpc(roomId);
    if (!insult) {
      this.closeQuestPopup();
      return;
    }
    if (insult.hostility === 'warning') {
      this.showQuestDialogue(
        giverName,
        [
          'The air around them hardens. Even the room seems to draw back a little, as if it has seen this turn before and remembers the cost of it.',
          `"Mind your tongue, snake. I have buried kinder creatures for less, and the ground did not trouble itself to call me unjust."`,
          `"Slight me again and this conversation will have to continue in the uglier language kept by powder, blood, and ringing tile."`,
        ],
        {
          onClose: () => this.closeQuestPopup(),
        },
        {
          closeLabel: 'Back off',
        },
        { portraitId },
      );
      return;
    }
    if (insult.hostility === 'hostile') {
      this.showQuestDialogue(
        giverName,
        [
          `${giverName} goes still in the way a drawn blade is still: not restful, only decided.`,
          `"That is enough. I offered you the dignity of words first. Do not complain now that the lesson has been translated into something your nerves can understand."`,
          'Their hand moves toward the weapon with the grim familiarity of ritual.',
        ],
        {
          onClose: () => this.closeQuestPopup(),
        },
        {
          closeLabel: 'Fight',
        },
        { portraitId },
      );
      return;
    }
    this.closeQuestPopup();
  }

  private maybePresentRandomEncounter(): void {
    if (this.paused || this.questPopup.isVisible()) {
      return;
    }
    const encounter = this.snakeGame.getFlag<
      WandererEncounter & { roomId: string; x: number; y: number; statsNote: string }
    >('npc.randomEncounter');
    if (!encounter || encounter.roomId !== this.currentRoomId) {
      return;
    }
    if (this.snakeGame.getFlag<boolean>('npc.randomEncounter.prompted')) {
      return;
    }
    const triggerAtMs = Number(
      this.snakeGame.getFlag<number>('npc.randomEncounter.triggerAtMs') ?? 0,
    );
    const nowMs = Number(this.getFlag<number>('timeMs') ?? 0);
    if (nowMs < triggerAtMs) {
      return;
    }
    this.snakeGame.setFlag('npc.randomEncounter.prompted', true);
    (this.juice as any).wandererApproach?.(
      this.tileToWorldInRoom({ x: encounter.x, y: encounter.y }, encounter.roomId).x,
      this.tileToWorldInRoom({ x: encounter.x, y: encounter.y }, encounter.roomId).y,
    );
    this.showQuestDialogue(
      encounter.name,
      [...encounter.pages, encounter.statsNote],
      {
        onAccept: () => {
          const result = this.snakeGame.resolveRandomEncounter(true);
          const world = this.tileToWorldInRoom(
            { x: encounter.x, y: encounter.y },
            encounter.roomId,
          );
          if (result.kind === 'duel' && result.accepted) {
            (this.juice as any).duelAccepted?.(world.x, world.y);
          }
          this.closeQuestPopup();
          if (result.kind === 'quest' && result.accepted) {
            const offered = this.snakeGame.getOfferedQuest();
            if (offered) {
              this.offerQuest(offered);
            }
          } else if (result.kind === 'flavor' && result.accepted) {
            if (result.rewardCardName) {
              this.showQuestHintPopup(
                `${encounter.name} gives you ${result.rewardCardName}.`,
                '#5dd6a2',
              );
            } else if (result.startCardGame) {
              this.showQuestHintPopup(`${encounter.name} deals you in.`, '#9ad1ff');
            } else {
              this.showQuestHintPopup(
                `${encounter.name} leaves you with a little hard-won advice.`,
                '#9ad1ff',
              );
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
        acceptLabel: encounter.acceptLabel ?? i18n.getCommon('quest.accept'),
        rejectLabel: encounter.rejectLabel ?? i18n.getCommon('quest.refuse'),
        nextLabel: 'Next',
      },
      { portraitId: encounter.portraitId },
    );
  }

  private initQuestGiverSprite(): void {
    const textures = this.getDefaultNpcTextures(Math.max(18, Math.floor(this.grid.cell * 0.92)));

    if (!this.anims.exists('quest-giver-idle')) {
      this.anims.create({
        key: 'quest-giver-idle',
        frames: [{ key: textures.idle }, { key: textures.blink }],
        frameRate: 2,
        repeat: -1,
      });
    }

    this.questGiverSprite = this.add.sprite(0, 0, textures.idle).setDepth(25).setVisible(false);
    this.questGiverSprite.play('quest-giver-idle');
  }

  private initWandererSprite(): void {
    const textures = this.getDefaultNpcTextures(Math.max(19, Math.floor(this.grid.cell * 0.98)));
    this.wandererSprite = this.add.sprite(0, 0, textures.idle).setDepth(25).setVisible(false);
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

  private ensureVillageResidentIndicatorText(index: number): Phaser.GameObjects.Text {
    let text = this.villageResidentIndicatorTexts[index];
    if (text) {
      return text;
    }
    text = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fff4a8',
        stroke: '#1b1024',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setVisible(false);
    this.villageResidentIndicatorTexts[index] = text;
    return text;
  }

  private getDefaultNpcTextures(size: number): Record<'idle' | 'blink', string> {
    const palette: QuestGiverSpritePalette = {
      robeColor: '#2f7f5f',
      trimColor: '#5dd6a2',
      outlineColor: '#1e3a2d',
      eyeColor: '#e8ffe8',
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
    if (
      disposition.hostility === 'hostile' &&
      this.snakeGame.getEnemies(room.id).some((enemy) => enemy.id === `npc-hostile:${room.id}`)
    ) {
      this.questGiverSprite.setVisible(false);
      return;
    }
    const palette = giver.portraitId?.startsWith('goblin-')
      ? this.paletteForGoblinResident(
          disposition.hostility === 'hostile'
            ? 'violent'
            : disposition.hostility === 'warning'
              ? 'wary'
              : this.snakeGame.getFactionAlignment('goblin-camps').standing,
        )
      : this.paletteForQuestGiverDisposition(disposition.hostility);
    const textures = this.runtimeSpriteFactory.ensureRecipe(
      questGiverSpriteRecipe,
      Math.max(18, Math.floor(this.grid.cell * 0.92)),
      palette,
    );
    const animKey = `quest-giver-${disposition.hostility}-idle`;
    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: [{ key: textures.idle }, { key: textures.blink }],
        frameRate: disposition.hostility === 'hostile' ? 4 : 2,
        repeat: -1,
      });
    }
    if (this.questGiverSprite.anims.currentAnim?.key !== animKey) {
      this.questGiverSprite.play(animKey);
    }
    this.questGiverSprite.setTexture(textures.idle);
    const world = this.tileToWorldLocalInRoom({ x: giver.x, y: giver.y });
    const bobSpeed =
      disposition.hostility === 'hostile' ? 110 : disposition.hostility === 'warning' ? 180 : 260;
    const bobAmount = disposition.hostility === 'hostile' ? 3 : 2;
    const bobOffset = Math.sin(this.time.now / bobSpeed) * bobAmount;
    const hostileJitterX =
      disposition.hostility === 'hostile' ? Math.sin(this.time.now / 45) * 0.9 : 0;
    const hostileAlpha =
      disposition.hostility === 'hostile' ? 0.82 + 0.18 * Math.sin(this.time.now / 95) : 1;
    const head = this.snakeGame.getSnakeBody()[0];
    let flipX = false;
    if (head) {
      const [roomX, roomY] = room.id.split(',').map(Number);
      const headLocalX = head.x - roomX * this.grid.cols;
      if (disposition.hostility !== 'friendly' && headLocalX !== giver.x) {
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
    const encounter = this.snakeGame.getFlag<
      WandererEncounter & { roomId: string; x: number; y: number; statsNote: string }
    >('npc.randomEncounter');
    if (!encounter || encounter.roomId !== this.currentRoomId || this.questPopup.isVisible()) {
      this.wandererSprite.setVisible(false);
      return;
    }
    const palette = this.paletteForEncounter(encounter.id);
    const textures = this.runtimeSpriteFactory.ensureRecipe(
      questGiverSpriteRecipe,
      Math.max(19, Math.floor(this.grid.cell * 0.98)),
      palette,
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
    const revealAtMs = Number(
      this.snakeGame.getFlag<number>('npc.randomEncounter.revealAtMs') ?? 0,
    );
    const triggerAtMs = Number(
      this.snakeGame.getFlag<number>('npc.randomEncounter.triggerAtMs') ?? revealAtMs + 1,
    );
    const nowMs = Number(this.getFlag<number>('timeMs') ?? triggerAtMs);
    const head = this.snakeGame.getSnakeBody()[0];
    let renderLocal = { x: encounter.x, y: encounter.y };
    let flipX = false;
    if (head && triggerAtMs > revealAtMs) {
      const [roomX, roomY] = this.currentRoomId.split(',').map(Number);
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
    this.wandererSprite
      .setPosition(world.x, world.y - 3 + bobOffset)
      .setFlipX(flipX)
      .setVisible(true);
    if (Math.random() < 0.08) {
      (this.juice as any).wandererAura?.(world.x, world.y - 6, palette.trimColor);
    }
  }

  private updateVillageResidentSprites(): void {
    this.villageResidentSprites.forEach((sprite) => sprite.setVisible(false));
    this.villageResidentIndicatorTexts.forEach((text) => text.setVisible(false));
    if (!this.snakeGame) {
      return;
    }
    const room = this.snakeGame.getCurrentRoom();
    const goblinStanding = this.snakeGame.getFactionAlignment('goblin-camps').standing;
    const goblinResidents =
      room.goblinCamp && goblinStanding !== 'violent'
        ? [room.goblinCamp.shopkeeper, ...room.goblinCamp.guards]
        : [];
    const residents = [
      ...(room.village ? [...room.village.residents, room.village.shopkeeper] : []),
      ...(room.town
        ? this.snakeGame.isTownHostileForRoom(room.town, room.id)
          ? []
          : room.town.residents.filter((resident) =>
              this.isTownResidentInDistrict(resident.workRoomId, getTownDistrictForRoom(room.town!, room.id)),
            )
        : []),
      ...goblinResidents,
    ];
    if (residents.length === 0 || this.questPopup.isVisible()) {
      return;
    }
    residents.forEach((resident, index) => {
      const sprite = this.ensureVillageResidentSprite(index);
      const indicator = this.ensureVillageResidentIndicatorText(index);
      const isGoblin = room.goblinCamp
        ? goblinResidents.some((goblin) => goblin.id === resident.id)
        : false;
      const relationshipProfile: RelationshipCandidateProfile = {
        id: `resident:${room.id}:${resident.id}`,
        actorId: isGoblin
          ? this.snakeGame.getGoblinCampActorId(
              room.goblinCamp!.id,
              resident.id,
              resident.id === room.goblinCamp!.shopkeeper.id ? 'shopkeeper' : 'guard',
            )
          : room.town
            ? 'actorId' in resident && typeof resident.actorId === 'string'
              ? resident.actorId
              : this.snakeGame.getTownResidentActorId(room.town.id, resident.id, (resident as any).role ?? 'resident')
            : this.snakeGame.getVillageActorId(
                room.id,
                resident.id,
                room.village?.shopkeeper.id === resident.id ? 'shopkeeper' : 'resident',
              ),
        displayName: resident.name,
        species: (isGoblin ? 'goblin' : 'human') as RelationshipSpecies,
        portraitId: isGoblin ? 'goblin-neutral' : resident.portraitId,
        homeRoomId: room.id,
        factionId: isGoblin ? 'goblin-camps' : 'hearthbound-remnant',
      };
      const relationshipState = this.snakeGame.getRelationshipState(relationshipProfile);
      if (
        relationshipState?.stage === 'dead' ||
        this.snakeGame.isRelationshipHostile(relationshipProfile) ||
        this.snakeGame.isRelationshipNpcCombatHostile(relationshipProfile)
      ) {
        sprite.setVisible(false);
        indicator.setVisible(false);
        return;
      }
      const palette = isGoblin ? this.paletteForGoblinResident(goblinStanding) : this.paletteForResident(resident.name, index);
      const textures = this.runtimeSpriteFactory.ensureRecipe(
        questGiverSpriteRecipe,
        Math.max(16, Math.floor(this.grid.cell * 0.84)),
        palette,
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
      const bodyPosition = this.snakeGame.getRelationshipNpcBodyPosition(relationshipProfile, {
        x: resident.x,
        y: resident.y,
      });
      const world = this.tileToWorldLocalInRoom(bodyPosition);
      const bobOffset = Math.sin(this.time.now / (220 + index * 17)) * 1.8;
      sprite
        .setTexture(textures.idle)
        .setPosition(world.x, world.y - 2 + bobOffset)
        .setVisible(true);
      const actorMenu = relationshipProfile.actorId
        ? this.snakeGame.getActorInteractionMenu(relationshipProfile.actorId)
        : null;
      const glyphs = actorMenu?.indicators.map((entry) => entry.glyph).join(' ');
      indicator
        .setText(glyphs ?? '')
        .setPosition(world.x, world.y - this.grid.cell * 0.58 + bobOffset)
        .setVisible(Boolean(glyphs));
      if (sprite.anims.currentAnim?.key !== animKey) {
        sprite.play(animKey);
      }
      if (Math.random() < 0.04) {
        (this.juice as any).wandererAura?.(world.x, world.y - 4, palette.trimColor);
      }
      if (!isGoblin && Math.random() < 0.02) {
        (this.juice as any).villageResidentMurmur?.(
          world.x,
          world.y - 2,
          Phaser.Display.Color.HexStringToColor(palette.trimColor).color,
        );
      }
    });
  }

  private tickVillageJuice(): void {
    if (!this.snakeGame || this.paused) {
      return;
    }
    const room = this.snakeGame.getCurrentRoom();
    const villageLike = room.village ?? room.town;
    if (!villageLike) {
      return;
    }
    if (Math.random() < 0.08) {
      const lantern =
        villageLike.lanterns[Math.floor(Math.random() * villageLike.lanterns.length)];
      if (lantern) {
        const world = this.tileToWorldLocalInRoom(lantern);
        (this.juice as any).villageLantern?.(world.x, world.y);
      }
    }
    if (Math.random() < 0.03) {
      const world = this.tileToWorldLocalInRoom(villageLike.center);
      (this.juice as any).villageBreath?.(world.x, world.y);
    }
  }

  private tickBiomeHazardJuice(): void {
    if (!this.snakeGame || this.paused) {
      return;
    }
    const room = this.snakeGame.getCurrentRoom();
    if (room.biomeId === 'sable-depths' && Math.random() < 0.28) {
      (this.juice as any).snowDrift?.(
        Phaser.Math.Between(8, this.grid.cols * this.grid.cell - 8),
        Phaser.Math.Between(0, this.grid.rows * this.grid.cell),
      );
    } else if (room.biomeId === 'ember-waste' && Math.random() < 0.24) {
      (this.juice as any).heatHaze?.(
        Phaser.Math.Between(12, this.grid.cols * this.grid.cell - 12),
        Phaser.Math.Between(
          (this.grid.rows * this.grid.cell) / 2,
          this.grid.rows * this.grid.cell - 12,
        ),
      );
    } else if (room.biomeId === 'moonlit-parish' && Math.random() < 0.12) {
      (this.juice as any).snowDrift?.(
        Phaser.Math.Between(8, this.grid.cols * this.grid.cell - 8),
        Phaser.Math.Between(0, this.grid.rows * this.grid.cell),
      );
    } else if (room.biomeId === 'gloam-garden' && Math.random() < 0.1) {
      (this.juice as any).temperatureReliefPulse?.(
        Phaser.Math.Between(12, this.grid.cols * this.grid.cell - 12),
        Phaser.Math.Between(12, this.grid.rows * this.grid.cell - 12),
        Math.random() < 0.5 ? 'warm' : 'cool',
      );
    } else if (room.biomeId === 'liberty-badlands') {
      if (Math.random() < 0.05) {
        (this.juice as any).eagleFlyover?.();
      }
      if (Math.random() < 0.12) {
        (this.juice as any).dustDevil?.(
          Phaser.Math.Between(12, this.grid.cols * this.grid.cell - 12),
          Phaser.Math.Between(12, this.grid.rows * this.grid.cell - 12),
        );
      }
      if (Math.random() < 0.08) {
        (this.juice as any).tumbleweed?.();
      }
      if (Math.random() < 0.14) {
        (this.juice as any).libertyHeatShimmer?.(
          Phaser.Math.Between(12, this.grid.cols * this.grid.cell - 12),
          Phaser.Math.Between(this.grid.cell * 3, this.grid.rows * this.grid.cell - 12),
        );
      }
      if (
        (room.archetypeId === 'firework-field' || room.fireworkStand || room.roadsideMonument) &&
        Math.random() < 0.16
      ) {
        (this.juice as any).fireworkPop?.(
          Phaser.Math.Between(24, this.grid.cols * this.grid.cell - 24),
          Phaser.Math.Between(24, this.grid.rows * this.grid.cell - 24),
        );
      }
      if (
        (room.allNiteDiner ||
          room.fireworkStand ||
          room.archetypeId === 'billboard-maze' ||
          room.archetypeId === 'motel-pool-ruins') &&
        Math.random() < 0.12
      ) {
        (this.juice as any).neonFlicker?.(
          Phaser.Math.Between(24, this.grid.cols * this.grid.cell - 24),
          Phaser.Math.Between(24, this.grid.rows * this.grid.cell - 24),
        );
      }
      if ((room.roadsideMonument || room.archetypeId === 'monument-plaza') && Math.random() < 0.1) {
        (this.juice as any).monumentSparkle?.(
          Phaser.Math.Between(24, this.grid.cols * this.grid.cell - 24),
          Phaser.Math.Between(24, this.grid.rows * this.grid.cell - 24),
        );
      }
    }

    if (room.temperatureReliefs && Math.random() < 0.08) {
      const relief =
        room.temperatureReliefs[Math.floor(Math.random() * room.temperatureReliefs.length)];
      if (relief) {
        const world = this.tileToWorldLocalInRoom({ x: relief.x, y: relief.y });
        (this.juice as any).temperatureReliefPulse?.(world.x, world.y, relief.kind);
      }
    }
  }

  private paletteForEncounter(encounterId: string): QuestGiverSpritePalette {
    switch (encounterId) {
      case 'freak-joey':
        return {
          robeColor: '#7a2430',
          trimColor: '#f4b46a',
          outlineColor: '#23060a',
          eyeColor: '#fff0d4',
        };
      case 'lindsey-wanderer':
        return {
          robeColor: '#466fb7',
          trimColor: '#cde4ff',
          outlineColor: '#142239',
          eyeColor: '#f7fbff',
        };
      case 'ryan-wanderer':
        return {
          robeColor: '#7b6c52',
          trimColor: '#d9c2a0',
          outlineColor: '#2d2417',
          eyeColor: '#fff2dd',
        };
      case 'aurex-wanderer':
        return {
          robeColor: '#6d8f63',
          trimColor: '#d7efba',
          outlineColor: '#1f311d',
          eyeColor: '#fbfff4',
        };
      case 'belisar-wanderer':
        return {
          robeColor: '#5d3d7d',
          trimColor: '#f0da8a',
          outlineColor: '#1c1026',
          eyeColor: '#fff8e2',
        };
      case 'cyrene-wanderer':
        return {
          robeColor: '#2f7c77',
          trimColor: '#a5f0ea',
          outlineColor: '#0d2a28',
          eyeColor: '#f1fffd',
        };
      case 'shrine-maiden-miko':
        return {
          robeColor: '#e8e0f0',
          trimColor: '#c41e3a',
          outlineColor: '#1a1020',
          eyeColor: '#f5e6d0',
        };
      case 'yokai-chef':
        return {
          robeColor: '#2c2c3e',
          trimColor: '#ff6b35',
          outlineColor: '#1a1a28',
          eyeColor: '#ffe4b5',
        };
      case 'kappa-duel':
        return {
          robeColor: '#4a7c59',
          trimColor: '#8bc34a',
          outlineColor: '#1e3a28',
          eyeColor: '#fff8dc',
        };
      case 'tanuki-shenanigans':
        return {
          robeColor: '#8b6f47',
          trimColor: '#d4a76a',
          outlineColor: '#3d2b1a',
          eyeColor: '#f0e0c8',
        };
      case 'ronin-wanderer':
        return {
          robeColor: '#3a3a4a',
          trimColor: '#8a8a9a',
          outlineColor: '#1a1a24',
          eyeColor: '#e8d8c8',
        };
      case 'tengu-encounter':
        return {
          robeColor: '#4a2c2c',
          trimColor: '#ff4500',
          outlineColor: '#1a0a0a',
          eyeColor: '#ffd700',
        };
      default:
        return {
          robeColor: '#2f7f5f',
          trimColor: '#5dd6a2',
          outlineColor: '#1e3a2d',
          eyeColor: '#e8ffe8',
        };
    }
  }

  private paletteForResident(name: string, offset: number): QuestGiverSpritePalette {
    const palettes: QuestGiverSpritePalette[] = [
      { robeColor: '#536d94', trimColor: '#d4e4ff', outlineColor: '#182338', eyeColor: '#fffdf5' },
      { robeColor: '#6d5a48', trimColor: '#e7c89a', outlineColor: '#241a12', eyeColor: '#fff4e0' },
      { robeColor: '#4d7b5e', trimColor: '#cfeec8', outlineColor: '#163020', eyeColor: '#f4fff0' },
      { robeColor: '#7a4e82', trimColor: '#f0d8a0', outlineColor: '#25132d', eyeColor: '#fff8e5' },
    ];
    const index = Math.abs(name.length + offset) % palettes.length;
    return palettes[index];
  }

  private paletteForGoblinResident(standing: string): QuestGiverSpritePalette {
    if (standing === 'angry') {
      return {
        robeColor: '#59611f',
        trimColor: '#ffd166',
        outlineColor: '#161a08',
        eyeColor: '#fff2c6',
      };
    }
    if (standing === 'wary') {
      return {
        robeColor: '#4f6f2a',
        trimColor: '#b6d94a',
        outlineColor: '#101908',
        eyeColor: '#f8ffd0',
      };
    }
    return {
      robeColor: '#3d7a2f',
      trimColor: '#b6ff6a',
      outlineColor: '#10220b',
      eyeColor: '#f8ffd0',
    };
  }

  private paletteForQuestGiverDisposition(
    hostility: 'friendly' | 'warning' | 'hostile',
  ): QuestGiverSpritePalette {
    switch (hostility) {
      case 'warning':
        return {
          robeColor: '#8b6a2b',
          trimColor: '#ffd27d',
          outlineColor: '#35240c',
          eyeColor: '#fff6d6',
        };
      case 'hostile':
        return {
          robeColor: '#8a2430',
          trimColor: '#ff8e7a',
          outlineColor: '#26070c',
          eyeColor: '#fff0ea',
        };
      case 'friendly':
      default:
        return {
          robeColor: '#2f7f5f',
          trimColor: '#5dd6a2',
          outlineColor: '#1e3a2d',
          eyeColor: '#e8ffe8',
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
          color: '#ff6b6b',
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
      message: 'Language set to Spanish.',
      color: '#5dd6a2',
    };
  }
}

function actorInteractionDescription(id: string): string {
  switch (id) {
    case 'talk':
      return 'Get a line from them. This does not start romance.';
    case 'ask-rumor':
      return 'Ask about rumors, town trouble, and the official story.';
    case 'ask-personal':
      return 'Ask about their ties, fears, and private life.';
    case 'take-quest':
      return 'Hear the job they are standing here to make your problem.';
    case 'shop':
      return 'Open their shop after the social contract has been acknowledged.';
    case 'apologize':
      return 'Try to lower resentment before it becomes policy.';
    case 'threaten':
      return 'Apply pressure. Witnesses and rumors may object.';
    case 'parley':
      return 'Try to turn hostility back into a conversation.';
    case 'romance':
      return 'Open the dating scene and opt into dating-game nonsense.';
    case 'pickpocket':
      return 'Lift score or contraband. Trust is also in the pocket, unfortunately.';
    case 'leave':
      return 'Keep things safely ordinary.';
    default:
      return 'Do the available actor interaction.';
  }
}
