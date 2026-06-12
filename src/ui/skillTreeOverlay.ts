import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import type {
  SkillTreeSystem,
  SkillPerkDefinition,
  SkillTreeStats,
  SkillPerkState,
} from '../systems/skillTree.js';
import { getItem } from '../inventory/itemRegistry.js';
import type { EquipmentSlot } from '../inventory/item.js';
import type { Quest } from '../../quests.js';
import { saveManager } from '../game/saveManager.js';
import { i18n } from '../i18n/i18nManager.js';
import type { VillageShopHatId, VillageShopStyleId } from '../shops/villageShop.js';
import { CARD_DEFINITIONS, type CardCollection } from '../cards/cardGame.js';
import type { FactionCardView } from '../factions/factions.js';
import type { WardDeathSource } from '../shops/goblinShop.js';
import type { ActionAbilityView } from '../systems/actionSlots.js';
import type { DatingCandidateView } from '../relationships/relationshipTypes.js';
import type { ActorJournalEntry, QuestObjectiveSummary } from '../game/snakeGame.js';
import type { ArtifactView } from '../artifacts/artifacts.js';
import type { SpecialStatsView } from '../stats/chanceBreakdowns.js';
import type { SpecialStatId } from '../stats/specialTypes.js';
import { ensurePauseMenuGeneratedAssets } from './assets/pauseMenuGeneratedAssets.js';
import { uiTabIconKeys } from './assets/uiAtlasKeys.js';
import {
  addUiBadge,
  addUiButton,
  addUiText,
  drawUiCard,
  insetRect,
  type UiRect,
} from './core/UiLayout.js';
import {
  computePauseMenuLayoutForTest,
  DETAIL_PANEL_MARGIN,
  DETAIL_PANEL_WIDTH,
  TREE_PADDING,
  type PauseMenuLayout,
} from './core/PauseMenuLayout.js';
import { uiColors, uiMotion, uiSpacing, uiTypography } from './theme/uiTokens.js';

interface SkillTreeOverlayOptions {
  width?: number;
  height?: number;
  depth?: number;
}

interface NodeVisual {
  definition: SkillPerkDefinition;
  container: Phaser.GameObjects.Container;
  button: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  rankText: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  position: Phaser.Math.Vector2;
}

interface OverlayHandlers {
  onRequestPurchase: (perkId: string, state: SkillPerkState) => void;
  onTabChange?: (tabId: TabId) => void;
  getSpellSlotView?: () => readonly ActionAbilityView[];
  onBindSpellSlot?: (abilityId: string) => void;
  getDatingView?: () => readonly DatingCandidateView[];
  getPeopleView?: () => readonly ActorJournalEntry[];
  getDestinyView?: () => readonly string[];
  getArtifactView?: () => readonly ArtifactView[];
  getSpecialView?: () => SpecialStatsView;
  onPreviewSpecialChange?: (statId: SpecialStatId, delta: number) => boolean;
  onApplySpecialChanges?: () => void;
  onResetSpecialPreview?: () => void;
}

interface FooterHint {
  icon?: string;
  key?: string;
  label: string;
}

interface DerivedStatRowView {
  id: string;
  label: string;
  value: string;
  breakdown?: string;
  accent?: number;
}

interface DerivedStatGroupView {
  id: string;
  title: string;
  accent: number;
  rows: DerivedStatRowView[];
}

const DEFAULT_OPTIONS: Required<SkillTreeOverlayOptions> = {
  width: 640,
  height: 520,
  depth: 30,
};

const DETAIL_PANEL_PADDING = 12;
const CLICK_ROW_TOP_BIAS = 8;
const MAIN_PANEL_X = TREE_PADDING.horizontal;
const MAIN_PANEL_Y = TREE_PADDING.top - 12;
const TAB_ACCENTS: Record<PrimaryTabId, number> = {
  growth: uiColors.accentGrowth,
  gear: uiColors.accentGear,
  world: uiColors.accentWorld,
  system: uiColors.accentSystem,
};

type PrimaryTabId = 'growth' | 'gear' | 'world' | 'system';
type TabId =
  | 'skills'
  | 'special'
  | 'spells'
  | 'equipment'
  | 'items'
  | 'inventory'
  | 'customize'
  | 'cards'
  | 'destiny'
  | 'artifacts'
  | 'map'
  | 'people'
  | 'dating'
  | 'quests'
  | 'factions'
  | 'graph'
  | 'cheats'
  | 'info';
type SnakeThemeId = VillageShopStyleId;

interface TabDefinition {
  id: TabId;
  i18nKey: string;
  label?: string;
  i18nPlaceholderKey?: string;
  group: PrimaryTabId;
}

const TAB_DEFINITIONS: readonly TabDefinition[] = [
  { id: 'skills', i18nKey: 'tabSkills', group: 'growth' },
  { id: 'special', i18nKey: 'tabSpecial', group: 'growth' },
  { id: 'spells', i18nKey: 'tabSpells', group: 'growth' },
  { id: 'equipment', i18nKey: 'tabInventory', label: 'Equipment', group: 'gear' },
  { id: 'items', i18nKey: 'tabInventory', label: 'Items', group: 'gear' },
  {
    id: 'inventory',
    i18nKey: 'tabInventory',
    i18nPlaceholderKey: 'placeholderInventory',
    group: 'gear',
  },
  {
    id: 'customize',
    i18nKey: 'tabCustomize',
    i18nPlaceholderKey: 'placeholderCustomize',
    group: 'gear',
  },
  { id: 'cards', i18nKey: 'tabCards', group: 'gear' },
  { id: 'destiny', i18nKey: 'tabDestiny', group: 'gear' },
  { id: 'artifacts', i18nKey: 'tabArtifacts', group: 'gear' },
  { id: 'map', i18nKey: 'tabMap', i18nPlaceholderKey: 'placeholderMap', group: 'world' },
  { id: 'dating', i18nKey: 'tabDating', group: 'world' },
  { id: 'quests', i18nKey: 'tabQuests', group: 'world' },
  { id: 'factions', i18nKey: 'tabFactions', group: 'world' },
  { id: 'graph', i18nKey: 'tabGraph', group: 'system' },
  {
    id: 'cheats',
    i18nKey: 'tabCheats',
    i18nPlaceholderKey: 'placeholderCheats',
    group: 'system',
  },
  { id: 'info', i18nKey: 'tabInfo', group: 'system' },
];

const PRIMARY_TAB_DEFINITIONS: readonly { id: PrimaryTabId; i18nKey: string }[] = [
  { id: 'growth', i18nKey: 'primaryGrowth' },
  { id: 'gear', i18nKey: 'primaryGear' },
  { id: 'world', i18nKey: 'primaryWorld' },
  { id: 'system', i18nKey: 'primarySystem' },
];

const PRIMARY_TAB_ICON_KEYS: Record<PrimaryTabId, string> = {
  growth: uiTabIconKeys.growth,
  gear: uiTabIconKeys.gear,
  world: uiTabIconKeys.world,
  system: uiTabIconKeys.system,
};

const TAB_ICON_KEYS: Record<TabId, string> = {
  skills: uiTabIconKeys.skills,
  special: uiTabIconKeys.special,
  spells: uiTabIconKeys.spells,
  equipment: uiTabIconKeys.equipment,
  items: uiTabIconKeys.items,
  inventory: uiTabIconKeys.inventory,
  customize: uiTabIconKeys.customize,
  cards: uiTabIconKeys.cards,
  artifacts: uiTabIconKeys.artifacts,
  map: uiTabIconKeys.map,
  dating: uiTabIconKeys.dating,
  quests: uiTabIconKeys.quests,
  factions: uiTabIconKeys.factions,
  graph: uiTabIconKeys.graph,
  cheats: uiTabIconKeys.cheats,
  info: uiTabIconKeys.info,
  people: uiTabIconKeys.people,
  destiny: uiTabIconKeys.destiny,
};

function resolveTabLabel(tab: TabDefinition): string {
  if (tab.label) {
    return tab.label;
  }
  return i18n.getFeatureString(tab.i18nKey);
}

function resolvePrimaryLabel(id: PrimaryTabId): string {
  const entry = PRIMARY_TAB_DEFINITIONS.find((e) => e.id === id);
  return entry ? i18n.getFeatureString(entry.i18nKey) : id;
}

function resolvePlaceholder(tab: TabDefinition): string | undefined {
  return tab.i18nPlaceholderKey ? i18n.getFeatureString(tab.i18nPlaceholderKey) : undefined;
}

const LUCK_GRAPH_POINTS: readonly { outOf10: number; luck: number }[] = [
  { outOf10: 130, luck: -0.13 },
  { outOf10: 10.495, luck: 0.213 },
  { outOf10: 6.5, luck: 0 },
  { outOf10: 8.5, luck: 1.1 },
  { outOf10: 3, luck: 0 },
  { outOf10: 31.2, luck: 0.9705 },
  { outOf10: 6.2, luck: 6.022e-23 },
];

export class SkillTreeOverlay {
  private readonly options: Required<SkillTreeOverlayOptions>;
  private readonly container: Phaser.GameObjects.Container;
  private readonly shellGraphics: Phaser.GameObjects.Graphics;
  private readonly specialUiGraphics: Phaser.GameObjects.Graphics;
  private readonly specialMainContainer: Phaser.GameObjects.Container;
  private readonly specialMainGraphics: Phaser.GameObjects.Graphics;
  private readonly specialMainObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly specialDerivedContainer: Phaser.GameObjects.Container;
  private readonly specialDerivedGraphics: Phaser.GameObjects.Graphics;
  private specialDerivedContentHeight = 0;
  private readonly footerHintObjects: Phaser.GameObjects.GameObject[] = [];
  private currentFooterHints: readonly FooterHint[] = [];
  private readonly skillTreeChromeObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly styleContainer: Phaser.GameObjects.Container;
  private readonly styleGraphics: Phaser.GameObjects.Graphics;
  private readonly factionContainer: Phaser.GameObjects.Container;
  private readonly factionGraphics: Phaser.GameObjects.Graphics;
  private readonly structuredContainer: Phaser.GameObjects.Container;
  private readonly structuredGraphics: Phaser.GameObjects.Graphics;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly manaText: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;
  private readonly connectionGraphics: Phaser.GameObjects.Graphics;
  private readonly connectionHighlight: Phaser.GameObjects.Graphics;
  private readonly mapGraphics: Phaser.GameObjects.Graphics;
  private readonly mapBackground: Phaser.GameObjects.Rectangle;
  private readonly mapTitle: Phaser.GameObjects.Text;
  private readonly mapContainer: Phaser.GameObjects.Container;
  private readonly graphGraphics: Phaser.GameObjects.Graphics;
  private readonly graphBackground: Phaser.GameObjects.Rectangle;
  private readonly graphTitle: Phaser.GameObjects.Text;
  private readonly graphLabels: Phaser.GameObjects.Text;
  private readonly graphContainer: Phaser.GameObjects.Container;
  private readonly cheatContainer: Phaser.GameObjects.Container;
  private readonly cheatBackground: Phaser.GameObjects.Rectangle;
  private readonly cheatTitle: Phaser.GameObjects.Text;
  private readonly cheatInputText: Phaser.GameObjects.Text;
  private readonly cheatApplyButton: Phaser.GameObjects.Text;
  private cheatInputFocused = false;
  private cheatCode = '';
  private readonly nodeVisuals: Map<string, NodeVisual> = new Map();
  private readonly primaryTabLabels: Map<PrimaryTabId, Phaser.GameObjects.Text> = new Map();
  private readonly primaryTabIcons: Map<PrimaryTabId, Phaser.GameObjects.Image> = new Map();
  private readonly tabLabels: Map<TabId, Phaser.GameObjects.Text> = new Map();
  private readonly tabIcons: Map<TabId, Phaser.GameObjects.Image> = new Map();
  private readonly stubText: Phaser.GameObjects.Text | null;
  private readonly detailPanel: Phaser.GameObjects.Rectangle;
  private readonly detailTitle: Phaser.GameObjects.Text;
  private readonly detailSubtitle: Phaser.GameObjects.Text;
  private readonly detailRankText: Phaser.GameObjects.Text;
  private readonly detailBody: Phaser.GameObjects.Text;
  private readonly inventoryItemsText: Phaser.GameObjects.Text;
  private inventoryIndex: string[] = [];
  private selectedInventoryItemId: string | null = null;
  private inventoryHighlight?: Phaser.GameObjects.Rectangle;
  private customizationHoverHighlight?: Phaser.GameObjects.Rectangle;
  private readonly customizationText: Phaser.GameObjects.Text;
  private readonly questListText: Phaser.GameObjects.Text;
  private questRowMap: Array<{ startRow: number; endRow: number; questId: string }> = [];
  private readonly specialStatsText: Phaser.GameObjects.Text;
  private readonly specialChanceText: Phaser.GameObjects.Text;
  private specialRowMap: Array<{
    startRow: number;
    endRow: number;
    action: 'increase' | 'decrease' | 'apply' | 'reset';
    statId?: SpecialStatId;
    enabled: boolean;
    minX?: number;
    maxX?: number;
  }> = [];
  private readonly cardsText: Phaser.GameObjects.Text;
  private readonly factionsText: Phaser.GameObjects.Text;
  private readonly spellsText: Phaser.GameObjects.Text;
  private spellRowMap: Array<{
    startRow: number;
    endRow: number;
    abilityId: string;
    canBind: boolean;
  }> = [];
  private readonly scrollMaskGraphics: Phaser.GameObjects.Graphics;
  private contentMask?: Phaser.Display.Masks.GeometryMask;
  private readonly specialChanceMaskGraphics: Phaser.GameObjects.Graphics;
  private readonly scrollHintText: Phaser.GameObjects.Text;
  private readonly scrollOffsets: Partial<Record<TabId, number>> = {};
  private structuredContentHeight = 0;
  private specialChanceScrollOffset = 0;
  private skillTreePanX = 0;
  private skillTreePanY = 0;
  private skillTreeContentWidth = 0;
  private skillTreeContentHeight = 0;
  private customizationIndex: string[] = [];
  private customizationRowMap: Array<{ row: number; actionId: string }> = [];

  private hoveredPerkId: string | null = null;
  private detailPerkId: string | null = null;
  private detailPinned = false;

  private visible = false;
  private activePrimaryTab: PrimaryTabId = 'growth';
  private activeTab: TabId = 'skills';
  private hintSticky = false;
  private hintTimer?: Phaser.Time.TimerEvent;
  private glintTimer?: Phaser.Time.TimerEvent;
  private hoverTip?: {
    container: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Rectangle;
    text: Phaser.GameObjects.Text;
    targetX: number;
    targetY: number;
    ticker?: Phaser.Time.TimerEvent;
  };

  constructor(
    private readonly scene: SnakeScene,
    private readonly system: SkillTreeSystem,
    private readonly handlers: OverlayHandlers,
    options: SkillTreeOverlayOptions = {},
  ) {
    const responsiveWidth = Math.floor(
      Math.min(DEFAULT_OPTIONS.width, Math.max(420, this.scene.scale.width - 24)),
    );
    const responsiveHeight = Math.floor(
      Math.min(DEFAULT_OPTIONS.height, Math.max(360, this.scene.scale.height - 24)),
    );
    this.options = {
      width: options.width ?? responsiveWidth,
      height: options.height ?? responsiveHeight,
      depth: options.depth ?? DEFAULT_OPTIONS.depth,
    };
    ensurePauseMenuGeneratedAssets(this.scene);

    const x = (this.scene.scale.width - this.options.width) / 2;
    const y = (this.scene.scale.height - this.options.height) / 2;

    this.background = this.scene.add
      .rectangle(0, 0, this.options.width, this.options.height, 0x071019, 0.94)
      .setStrokeStyle(2, 0x4da3ff)
      .setOrigin(0, 0);
    this.shellGraphics = this.scene.add.graphics();
    this.specialUiGraphics = this.scene.add.graphics().setVisible(false);
    this.specialMainGraphics = this.scene.add.graphics();
    this.specialMainContainer = this.scene.add
      .container(0, 0, [this.specialMainGraphics])
      .setVisible(false);
    this.specialDerivedGraphics = this.scene.add.graphics();
    this.specialDerivedContainer = this.scene.add
      .container(0, 0, [this.specialDerivedGraphics])
      .setVisible(false);
    this.styleGraphics = this.scene.add.graphics();
    this.styleContainer = this.scene.add.container(0, 0, [this.styleGraphics]).setVisible(false);
    this.factionGraphics = this.scene.add.graphics();
    this.factionContainer = this.scene.add
      .container(0, 0, [this.factionGraphics])
      .setVisible(false);
    this.structuredGraphics = this.scene.add.graphics();
    this.structuredContainer = this.scene.add
      .container(0, 0, [this.structuredGraphics])
      .setVisible(false);
    this.drawShellFrame();

    this.connectionGraphics = this.scene.add.graphics();
    this.connectionHighlight = this.scene.add.graphics();
    // Map container and elements
    const mapX = TREE_PADDING.horizontal;
    const mapY = TREE_PADDING.top - 8;
    const mapW =
      this.options.width - DETAIL_PANEL_WIDTH - DETAIL_PANEL_MARGIN - TREE_PADDING.horizontal * 2;
    const mapH = this.options.height - mapY - TREE_PADDING.bottom + 4;
    this.mapBackground = this.scene.add
      .rectangle(mapX, mapY, mapW, mapH, 0x0b1622, 0.72)
      .setStrokeStyle(1, 0x244155)
      .setOrigin(0, 0)
      .setVisible(false);
    this.mapTitle = this.scene.add
      .text(mapX + 10, mapY + 8, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#9ad1ff',
      })
      .setVisible(false);
    this.mapGraphics = this.scene.add.graphics();
    this.mapContainer = this.scene.add
      .container(0, 0, [this.mapBackground, this.mapTitle, this.mapGraphics])
      .setVisible(false);

    const graphX = TREE_PADDING.horizontal;
    const graphY = TREE_PADDING.top - 8;
    const graphW =
      this.options.width - DETAIL_PANEL_WIDTH - DETAIL_PANEL_MARGIN - TREE_PADDING.horizontal * 2;
    const graphH = this.options.height - graphY - TREE_PADDING.bottom + 4;
    this.graphBackground = this.scene.add
      .rectangle(graphX, graphY, graphW, graphH, 0x0b1622, 0.72)
      .setStrokeStyle(1, 0x244155)
      .setOrigin(0, 0)
      .setVisible(false);
    this.graphTitle = this.scene.add
      .text(graphX + 10, graphY + 8, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#9ad1ff',
      })
      .setVisible(false);
    this.graphGraphics = this.scene.add.graphics();
    this.graphLabels = this.scene.add
      .text(graphX + 12, graphY + graphH - 42, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#c8ffe1',
        lineSpacing: 2,
      })
      .setVisible(false);
    this.graphContainer = this.scene.add
      .container(0, 0, [
        this.graphBackground,
        this.graphTitle,
        this.graphGraphics,
        this.graphLabels,
      ])
      .setVisible(false);

    const cheatX = TREE_PADDING.horizontal;
    const cheatY = TREE_PADDING.top - 8;
    const cheatW =
      this.options.width - DETAIL_PANEL_WIDTH - DETAIL_PANEL_MARGIN - TREE_PADDING.horizontal * 2;
    const cheatH = this.options.height - cheatY - TREE_PADDING.bottom + 4;
    this.cheatBackground = this.scene.add
      .rectangle(cheatX, cheatY, cheatW, cheatH, 0x0b1622, 0.72)
      .setStrokeStyle(1, 0x244155)
      .setOrigin(0, 0)
      .setVisible(false);
    this.cheatTitle = this.scene.add
      .text(cheatX + 10, cheatY + 8, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#9ad1ff',
      })
      .setVisible(false);
    this.cheatInputText = this.scene.add
      .text(cheatX + 14, cheatY + 54, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#071019',
        padding: { left: 10, right: 10, top: 8, bottom: 8 },
        fixedWidth: cheatW - 28,
      })
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.cheatInputText.on('pointerdown', () => {
      if (!this.visible || this.activeTab !== 'cheats') return;
      this.cheatInputFocused = true;
      this.refreshCheatInputText();
      this.announce(i18n.getFeatureString('skillTreeTypeCheat'), '#9ad1ff', 1600);
    });
    this.cheatApplyButton = this.scene.add
      .text(cheatX + 14, cheatY + 110, i18n.getFeatureString('cheatApply'), {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#5dd6a2',
        backgroundColor: '#224433',
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
      })
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.cheatApplyButton.on('pointerdown', () => {
      if (!this.visible || this.activeTab !== 'cheats') return;
      this.applyCheatCode();
    });
    this.cheatContainer = this.scene.add
      .container(0, 0, [
        this.cheatBackground,
        this.cheatTitle,
        this.cheatInputText,
        this.cheatApplyButton,
      ])
      .setVisible(false);

    this.title = this.scene.add
      .text(this.options.width / 2, 24, '', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#9ad1ff',
        align: 'center',
      })
      .setOrigin(0.5, 0);

    this.scoreText = this.scene.add.text(24, 66, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });
    this.scoreText.setVisible(false);

    this.manaText = this.scene.add
      .text(this.options.width - 24, this.getPauseMenuLayout().status.y + 9, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#9ad1ff',
        align: 'right',
      })
      .setOrigin(1, 0);

    this.hintText = this.scene.add
      .text(this.options.width / 2, this.options.height - 36, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#5dd6a2',
        align: 'center',
      })
      .setOrigin(0.5, 0.5);

    const detailPanelX = this.options.width - DETAIL_PANEL_WIDTH - DETAIL_PANEL_MARGIN;
    const detailPanelY = this.getPauseMenuLayout().detail.y;
    const detailPanelHeight = this.getPauseMenuLayout().detail.height;
    const detailTextX = detailPanelX + DETAIL_PANEL_PADDING;
    const detailTextWidth = DETAIL_PANEL_WIDTH - DETAIL_PANEL_PADDING * 2;

    this.detailPanel = this.scene.add
      .rectangle(detailPanelX, detailPanelY, DETAIL_PANEL_WIDTH, detailPanelHeight, 0x0b1622, 0.92)
      .setStrokeStyle(1, 0x244155)
      .setOrigin(0, 0);

    const titleY = detailPanelY + 14;
    const subtitleY = titleY + 22;
    const rankY = subtitleY + 20;
    const bodyY = rankY + 22;

    this.detailTitle = this.scene.add
      .text(detailTextX, titleY, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
        wordWrap: { width: detailTextWidth },
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.detailSubtitle = this.scene.add
      .text(detailTextX, subtitleY, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#5dd6a2',
        wordWrap: { width: detailTextWidth },
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.detailRankText = this.scene.add
      .text(detailTextX, rankY, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#9ad1ff',
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.detailBody = this.scene.add
      .text(detailTextX, bodyY, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#c8ffe1',
        wordWrap: { width: detailTextWidth },
        lineSpacing: 4,
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.stubText =
      TAB_DEFINITIONS.length > 1
        ? this.scene.add
            .text(this.options.width / 2, this.options.height / 2 + 20, '', {
              fontFamily: 'monospace',
              fontSize: '18px',
              color: '#9ad1ff',
              align: 'center',
              wordWrap: {
                width: this.options.width - DETAIL_PANEL_WIDTH - DETAIL_PANEL_MARGIN - 160,
              },
            })
            .setOrigin(0.5, 0.5)
            .setVisible(false)
        : null;

    this.inventoryItemsText = this.scene.add
      .text(TREE_PADDING.horizontal, TREE_PADDING.top - 12, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        lineSpacing: 8,
      })
      .setInteractive({ useHandCursor: true });
    this.customizationText = this.scene.add
      .text(TREE_PADDING.horizontal, TREE_PADDING.top, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        lineSpacing: 8,
        wordWrap: {
          width:
            this.options.width -
            DETAIL_PANEL_WIDTH -
            DETAIL_PANEL_MARGIN -
            TREE_PADDING.horizontal * 2,
        },
      })
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.questListText = this.scene.add
      .text(TREE_PADDING.horizontal, TREE_PADDING.top - 12, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e6f3ff',
        lineSpacing: 3,
        wordWrap: {
          width:
            this.options.width -
            DETAIL_PANEL_WIDTH -
            DETAIL_PANEL_MARGIN -
            TREE_PADDING.horizontal * 2,
        },
      })
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.specialStatsText = this.scene.add
      .text(TREE_PADDING.horizontal, TREE_PADDING.top - 12, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e6f3ff',
        lineSpacing: 5,
        wordWrap: {
          width:
            this.options.width -
            DETAIL_PANEL_WIDTH -
            DETAIL_PANEL_MARGIN -
            TREE_PADDING.horizontal * 2,
        },
      })
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.specialChanceText = this.scene.add
      .text(detailTextX, detailPanelY + 14, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e6f3ff',
        lineSpacing: 3,
        wordWrap: { width: detailTextWidth },
      })
      .setVisible(false);
    this.cardsText = this.scene.add
      .text(TREE_PADDING.horizontal, TREE_PADDING.top - 12, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e6f3ff',
        lineSpacing: 3,
        wordWrap: {
          width:
            this.options.width -
            DETAIL_PANEL_WIDTH -
            DETAIL_PANEL_MARGIN -
            TREE_PADDING.horizontal * 2,
        },
      })
      .setVisible(false);
    this.factionsText = this.scene.add
      .text(TREE_PADDING.horizontal, TREE_PADDING.top - 12, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e6f3ff',
        lineSpacing: 4,
        wordWrap: {
          width:
            this.options.width -
            DETAIL_PANEL_WIDTH -
            DETAIL_PANEL_MARGIN -
            TREE_PADDING.horizontal * 2,
        },
      })
      .setVisible(false);
    this.spellsText = this.scene.add
      .text(TREE_PADDING.horizontal, TREE_PADDING.top - 12, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e6f3ff',
        lineSpacing: 4,
        wordWrap: {
          width:
            this.options.width -
            DETAIL_PANEL_WIDTH -
            DETAIL_PANEL_MARGIN -
            TREE_PADDING.horizontal * 2,
        },
      })
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.scrollMaskGraphics = this.scene.add.graphics().setVisible(false);
    this.scrollMaskGraphics.fillStyle(0xffffff, 1);
    const scrollMaskRect = this.getSkillTreeBounds();
    this.scrollMaskGraphics.fillRect(
      x + scrollMaskRect.x,
      y + scrollMaskRect.y,
      scrollMaskRect.width,
      scrollMaskRect.height,
    );
    const scrollMask = this.scrollMaskGraphics.createGeometryMask();
    this.contentMask = scrollMask;
    this.questListText.setMask(scrollMask);
    this.spellsText.setMask(scrollMask);
    this.customizationText.setMask(scrollMask);
    this.inventoryItemsText.setMask(scrollMask);
    this.specialStatsText.setMask(scrollMask);
    this.structuredContainer.setMask(scrollMask);
    this.connectionGraphics.setMask(scrollMask);
    this.connectionHighlight.setMask(scrollMask);
    this.specialChanceMaskGraphics = this.scene.add.graphics().setVisible(false);
    this.specialChanceMaskGraphics.fillStyle(0xffffff, 1);
    this.specialChanceMaskGraphics.fillRect(
      x + detailTextX,
      y + detailPanelY + 14,
      detailTextWidth,
      detailPanelHeight - 28,
    );
    this.specialChanceText.setMask(this.specialChanceMaskGraphics.createGeometryMask());
    this.scrollHintText = this.scene.add
      .text(
        this.options.width - DETAIL_PANEL_WIDTH - DETAIL_PANEL_MARGIN - TREE_PADDING.horizontal,
        this.options.height - 48,
        '',
        {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#6da8d8',
        },
      )
      .setOrigin(1, 0)
      .setVisible(false);

    this.inventoryItemsText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.visible || this.activeTab !== 'inventory') return;
      const index = this.getTextRowIndex(
        pointer,
        this.inventoryItemsText.y,
        this.inventoryItemsText,
      );
      const itemId = this.inventoryIndex[index];
      if (!itemId) {
        this.selectedInventoryItemId = null;
        this.clearPerkDetails(true);
        return;
      }
      if (itemId.startsWith('unequip:')) {
        const slot = itemId.split(':')[1] as EquipmentSlot;
        const ok = this.scene.unequipSlot(slot);
        if (ok) {
          this.announce(i18n.getFeatureString('skillTreeUnequipped') + ' ' + slot, '#9ad1ff', 1600);
          this.refresh();
        }
        return;
      }
      this.selectedInventoryItemId = itemId;
      const item = getItem(itemId) as any;
      if (item && item.kind === 'equipment') {
        const currentlyEquipped = this.scene.inventory.getEquipped(item.slot as EquipmentSlot);
        if (currentlyEquipped === itemId) {
          const ok = this.scene.unequipSlot(item.slot as EquipmentSlot);
          if (ok) {
            this.announce(`${item.name} unequipped.`, '#9ad1ff', 1600);
            this.refresh();
            this.highlightInventoryItem(this.selectedInventoryItemId ?? itemId);
          }
          return;
        }

        const ok = this.scene.equipItem(itemId);
        if (ok) {
          this.announce(`${item.name} equipped.`, '#5dd6a2', 1600);
          this.refresh();
          this.highlightInventoryItem(this.selectedInventoryItemId ?? itemId);
        } else {
          this.announce(
            i18n.getFeatureString('skillTreeCannotEquip') + ' ' + item.name,
            '#ff6b6b',
            1600,
          );
        }
      } else {
        this.showInventoryItemDetails();
      }
    });
    this.customizationText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.visible || this.activeTab !== 'customize') return;
      const actionId = this.getCustomizationActionId(pointer);
      if (!actionId) return;

      if (actionId.startsWith('theme:')) {
        const themeId = actionId.split(':')[1] as SnakeThemeId;
        const result = this.scene.equipOwnedSnakeTheme(themeId);
        this.announce(result.message, result.color, 1800);
        this.refresh();
        return;
      }

      if (actionId === 'hat') {
        const result = this.scene.toggleOwnedSnakeHat('cowboy');
        this.announce(result.message, result.color, 1800);
        this.refresh();
        return;
      }

      if (actionId.startsWith('hat:')) {
        const hatId = actionId.split(':')[1] as VillageShopHatId;
        const result = this.scene.toggleOwnedSnakeHat(hatId);
        this.announce(result.message, result.color, 1800);
        this.refresh();
        return;
      }

      if (actionId === 'walking-noise') {
        const result = this.scene.toggleDisableWalkingNoise();
        this.announce(result.message, result.color, 1800);
        this.refresh();
      }

      if (actionId === 'cowbell') {
        const result = this.scene.toggleCowbell();
        this.announce(result.message, result.color, 1800);
        this.refresh();
      }

      if (actionId === 'minimap') {
        const result = this.scene.purchaseOrToggleMinimap();
        this.announce(result.message, result.color, 1800);
        this.refresh();
      }

      if (actionId === 'language') {
        const result = this.scene.toggleLanguage();
        this.announce(result.message, result.color, 1800);
        this.refresh();
      }
    });
    this.customizationText.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.visible || this.activeTab !== 'customize') return;
      const hovered = this.getCustomizationHoveredRow(pointer);
      if (!hovered) {
        this.clearCustomizationHover();
        return;
      }
      this.highlightCustomizationRow(hovered.row);
    });
    this.customizationText.on('pointerout', () => {
      this.clearCustomizationHover();
    });
    this.spellsText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.visible || this.activeTab !== 'spells') return;
      const row = this.getTextRowIndex(pointer, this.spellsText.y, this.spellsText);
      const entry = this.spellRowMap.find(
        (candidate) => row >= candidate.startRow && row <= candidate.endRow,
      );
      if (!entry) return;
      if (!entry.canBind) {
        this.announce(i18n.getFeatureString('skillTreeQOptionUnavailable'), '#ff6b6b', 1800);
        return;
      }
      this.handlers.onBindSpellSlot?.(entry.abilityId);
    });
    this.questListText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.visible || this.activeTab !== 'quests') return;
      const row = this.getTextRowIndex(pointer, this.questListText.y, this.questListText);
      const entry = this.questRowMap.find(
        (candidate) => row >= candidate.startRow && row <= candidate.endRow,
      );
      if (!entry) return;
      const setter = (this.scene as any).setActiveQuestMarkerQuestId;
      if (typeof setter !== 'function') return;
      const ok = setter.call(this.scene, entry.questId);
      this.announce(
        ok ? 'Tracking quest marker.' : 'Quest marker unavailable.',
        ok ? '#9ad1ff' : '#ff6b6b',
        1600,
      );
      this.refresh();
    });
    this.specialStatsText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.visible || this.activeTab !== 'special') return;
      const row = this.getTextRowIndex(pointer, this.specialStatsText.y, this.specialStatsText, 0);
      const localX = pointer.worldX - this.container.x - this.specialStatsText.x;
      const entry = this.specialRowMap.find(
        (candidate) =>
          row >= candidate.startRow &&
          row <= candidate.endRow &&
          (candidate.minX === undefined || localX >= candidate.minX) &&
          (candidate.maxX === undefined || localX <= candidate.maxX),
      );
      if (!entry || !entry.enabled) return;
      if (entry.action === 'increase' && entry.statId) {
        this.handlers.onPreviewSpecialChange?.(entry.statId, 1);
      } else if (entry.action === 'decrease' && entry.statId) {
        this.handlers.onPreviewSpecialChange?.(entry.statId, -1);
      } else if (entry.action === 'apply') {
        this.handlers.onApplySpecialChanges?.();
      } else if (entry.action === 'reset') {
        this.handlers.onResetSpecialPreview?.();
      }
      this.refresh();
    });
    this.scene.input.on(
      'wheel',
      (_pointer: Phaser.Input.Pointer, _objects: unknown[], dx: number, dy: number) => {
        if (this.visible && this.activeTab === 'skills') {
          this.panSkillTree(dy, dx);
          return;
        }
        this.scrollActiveText(dy);
      },
    );

    const children: Phaser.GameObjects.GameObject[] = [
      this.background,
      this.shellGraphics,
      this.specialUiGraphics,
      this.detailPanel,
      this.specialMainContainer,
      this.specialDerivedContainer,
      this.styleContainer,
      this.factionContainer,
      this.structuredContainer,
      this.connectionGraphics,
      this.connectionHighlight,
      this.mapContainer,
      this.graphContainer,
      this.cheatContainer,
      this.title,
      this.manaText,
      this.detailTitle,
      this.detailSubtitle,
      this.detailRankText,
      this.detailBody,
      this.hintText,
      this.inventoryItemsText,
      this.customizationText,
      this.questListText,
      this.specialStatsText,
      this.specialChanceText,
      this.cardsText,
      this.factionsText,
      this.spellsText,
      this.scrollHintText,
    ];
    if (this.stubText) {
      children.push(this.stubText);
    }

    this.container = this.scene.add
      .container(x, y, children)
      .setDepth(this.options.depth)
      .setVisible(false);

    this.buildTabs();
    this.buildNodes();
    this.updateTabVisuals();
  }

  private drawShellFrame(): void {
    const g = this.shellGraphics;
    g.clear();
    const w = this.options.width;
    const h = this.options.height;
    const layout = this.getPauseMenuLayout();

    g.fillStyle(uiColors.panelBgPrimary, 0.96).fillRoundedRect(0, 0, w, h, 10);
    g.lineStyle(3, uiColors.panelBorder, 0.9).strokeRoundedRect(1.5, 1.5, w - 3, h - 3, 10);
    g.lineStyle(1, uiColors.panelGlow, uiMotion.glowMedium).strokeRoundedRect(
      7,
      7,
      w - 14,
      h - 14,
      6,
    );

    g.fillStyle(0x03070c, 0.38).fillRect(12, 42, w - 24, 1);
    g.fillStyle(uiColors.panelBorderMuted, 0.58).fillRect(18, 58, w - 36, 1);
    g.fillStyle(uiColors.panelBorderMuted, 0.5).fillRect(18, 90, w - 36, 1);
    for (let lineY = layout.content.y + 10; lineY < layout.footer.y - 8; lineY += 18) {
      g.fillStyle(uiColors.panelGlow, 0.04).fillRect(20, lineY, w - 40, 1);
    }
    g.fillStyle(TAB_ACCENTS[this.activePrimaryTab], 0.2).fillRect(
      layout.content.x,
      layout.content.y - 2,
      layout.content.width,
      1,
    );

    g.fillStyle(uiColors.panelBgSecondary, 0.82).fillRoundedRect(
      layout.footer.x,
      layout.footer.y,
      layout.footer.width,
      layout.footer.height,
      6,
    );
    g.lineStyle(1, uiColors.panelBorderMuted, 0.82).strokeRoundedRect(
      layout.footer.x + 0.5,
      layout.footer.y + 0.5,
      layout.footer.width - 1,
      layout.footer.height - 1,
      6,
    );

    this.drawTabPlates(g, layout);
    this.drawFooterHintBackplates(g, layout, this.currentFooterHints);

    this.drawPixelCorner(g, 8, 8, 1);
    this.drawPixelCorner(g, w - 8, 8, -1);
    this.drawPixelCorner(g, 8, h - 8, 1, -1);
    this.drawPixelCorner(g, w - 8, h - 8, -1, -1);
  }

  private drawPixelCorner(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    dirX: 1 | -1,
    dirY: 1 | -1 = 1,
  ): void {
    const hX = dirX > 0 ? x : x - 18;
    const hY = dirY > 0 ? y : y - 2;
    const vX = dirX > 0 ? x : x - 2;
    const vY = dirY > 0 ? y : y - 18;
    const innerX = dirX > 0 ? x + 5 : x - 13;
    const innerY = dirY > 0 ? y + 5 : y - 7;
    const innerVX = dirX > 0 ? x + 5 : x - 7;
    const innerVY = dirY > 0 ? y + 5 : y - 13;
    g.fillStyle(uiColors.panelGlow, 0.76);
    g.fillRect(hX, hY, 18, 2);
    g.fillRect(vX, vY, 2, 18);
    g.fillStyle(uiColors.panelBorder, 0.9);
    g.fillRect(innerX, innerY, 8, 2);
    g.fillRect(innerVX, innerVY, 2, 8);
    g.fillStyle(0xfff3a8, 0.78).fillRect(innerX + dirX * 9, innerY, 3, 2);
  }

  private getPauseMenuLayout(): PauseMenuLayout {
    return computePauseMenuLayoutForTest(this.options.width, this.options.height);
  }

  private drawTabPlates(g: Phaser.GameObjects.Graphics, layout: PauseMenuLayout): void {
    const primaryWidth = Math.min(112, Math.floor((layout.topTabs.width - 30) / 4));
    let x = layout.topTabs.x;
    for (const primary of PRIMARY_TAB_DEFINITIONS) {
      const active = primary.id === this.activePrimaryTab;
      const accent = TAB_ACCENTS[primary.id];
      g.fillStyle(active ? accent : uiColors.panelBgInset, active ? 0.28 : 0.66).fillRoundedRect(
        x,
        layout.topTabs.y,
        primaryWidth,
        34,
        6,
      );
      g.lineStyle(
        2,
        active ? accent : uiColors.panelBorderMuted,
        active ? 0.9 : 0.64,
      ).strokeRoundedRect(x + 1, layout.topTabs.y + 1, primaryWidth - 2, 32, 6);
      g.fillStyle(active ? accent : uiColors.panelBorderMuted, active ? 0.9 : 0.42).fillRect(
        x + 9,
        layout.topTabs.y + 5,
        2,
        24,
      );
      x += primaryWidth + 10;
    }

    const visibleTabs = TAB_DEFINITIONS.filter(
      (tab) => tab.group === this.activePrimaryTab && this.isTabAvailable(tab.id),
    );
    const gap = 8;
    const tabWidth = Math.min(
      122,
      Math.floor(
        (layout.subTabs.width - gap * (visibleTabs.length - 1)) / Math.max(1, visibleTabs.length),
      ),
    );
    x = layout.subTabs.x;
    for (const tab of visibleTabs) {
      const active = tab.id === this.activeTab;
      const accent = TAB_ACCENTS[tab.group];
      g.fillStyle(active ? accent : uiColors.panelBgInset, active ? 0.24 : 0.58).fillRoundedRect(
        x,
        layout.subTabs.y,
        tabWidth,
        28,
        5,
      );
      g.lineStyle(
        1,
        active ? accent : uiColors.panelBorderMuted,
        active ? 0.9 : 0.58,
      ).strokeRoundedRect(x + 0.5, layout.subTabs.y + 0.5, tabWidth - 1, 27, 5);
      if (active) {
        g.fillStyle(accent, 0.92).fillRect(x + 8, layout.subTabs.y + 24, tabWidth - 16, 2);
      }
      x += tabWidth + gap;
    }

    g.fillStyle(uiColors.panelBgInset, 0.7).fillRoundedRect(
      layout.status.x,
      layout.status.y,
      layout.status.width,
      34,
      6,
    );
    g.lineStyle(1, uiColors.panelBorderMuted, 0.68).strokeRoundedRect(
      layout.status.x + 0.5,
      layout.status.y + 0.5,
      layout.status.width - 1,
      33,
      6,
    );
  }

  private drawFooterHintBackplates(
    g: Phaser.GameObjects.Graphics,
    layout: PauseMenuLayout,
    hints: readonly FooterHint[],
  ): void {
    let x = layout.footer.x + 12;
    const y = layout.footer.y + 10;
    for (const hint of hints.slice(0, 5)) {
      const key = hint.key ?? hint.icon ?? '';
      const label = hint.label;
      const width = Phaser.Math.Clamp(36 + key.length * 7 + label.length * 6, 92, 172);
      g.fillStyle(uiColors.panelBgInset, 0.72)
        .fillRoundedRect(x, y, width, 22, 5)
        .lineStyle(1, uiColors.panelBorderMuted, 0.72)
        .strokeRoundedRect(x + 0.5, y + 0.5, width - 1, 21, 5);
      g.fillStyle(TAB_ACCENTS[this.activePrimaryTab], 0.82).fillRoundedRect(
        x + 5,
        y + 5,
        Math.max(24, key.length * 7 + 10),
        12,
        3,
      );
      x += width + 8;
      if (x > layout.footer.x + layout.footer.width - 90) {
        break;
      }
    }
  }

  private drawSpecialUi(view: SpecialStatsView): void {
    const g = this.specialUiGraphics;
    g.clear();
    const mainX = MAIN_PANEL_X - 12;
    const mainY = MAIN_PANEL_Y - 12;
    const mainW =
      this.options.width -
      DETAIL_PANEL_WIDTH -
      DETAIL_PANEL_MARGIN -
      TREE_PADDING.horizontal * 2 +
      24;
    const mainH = this.getScrollableViewportHeight() + 18;
    const detailX = this.detailPanel.x;
    const detailY = this.detailPanel.y;
    const detailW = this.detailPanel.width;
    const detailH = this.detailPanel.height;

    this.drawPanel(g, mainX, mainY, mainW, mainH, uiColors.accentGrowth, 0.88);
    this.drawPanel(g, detailX, detailY, detailW, detailH, uiColors.accentExploration, 0.88);

    this.drawScrollRail(
      g,
      detailX + detailW - 9,
      detailY + 12,
      detailH - 24,
      this.getSpecialChanceViewportHeight(),
      this.specialDerivedContentHeight,
      this.specialChanceScrollOffset,
    );
  }

  private drawPanel(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    accent: number,
    alpha: number,
  ): void {
    g.fillStyle(uiColors.panelBgSecondary, alpha).fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(1, uiColors.panelBorderMuted, 0.92).strokeRoundedRect(
      x + 0.5,
      y + 0.5,
      w - 1,
      h - 1,
      8,
    );
    g.lineStyle(1, accent, 0.54).strokeRoundedRect(x + 4.5, y + 4.5, w - 9, h - 9, 5);
    g.fillStyle(accent, 0.78).fillRect(x + 12, y + 9, 48, 2);
  }

  private drawSmallButton(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    enabled: boolean,
    accent: number,
  ): void {
    g.fillStyle(enabled ? accent : uiColors.disabled, enabled ? 0.32 : 0.74).fillRoundedRect(
      x,
      y,
      w,
      h,
      4,
    );
    g.lineStyle(1, enabled ? accent : uiColors.locked, enabled ? 0.92 : 0.72).strokeRoundedRect(
      x + 0.5,
      y + 0.5,
      w - 1,
      h - 1,
      4,
    );
  }

  private drawActionButton(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    enabled: boolean,
    accent: number,
  ): void {
    g.fillStyle(enabled ? accent : uiColors.disabled, enabled ? 0.25 : 0.68).fillRoundedRect(
      x,
      y,
      w,
      h,
      6,
    );
    g.lineStyle(2, enabled ? accent : uiColors.locked, enabled ? 0.82 : 0.65).strokeRoundedRect(
      x + 1,
      y + 1,
      w - 2,
      h - 2,
      6,
    );
  }

  private drawScrollRail(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    h: number,
    viewportH: number,
    contentH: number,
    offset: number,
  ): void {
    if (contentH <= viewportH) {
      return;
    }
    g.fillStyle(uiColors.panelBgInset, 0.84).fillRoundedRect(x, y, 4, h, 2);
    const thumbH = Math.max(24, (viewportH / Math.max(viewportH, contentH)) * h);
    const maxOffset = Math.max(1, contentH - viewportH);
    const thumbY = y + (offset / maxOffset) * (h - thumbH);
    g.fillStyle(uiColors.panelGlow, 0.9).fillRoundedRect(x, thumbY, 4, thumbH, 2);
  }

  private clearSpecialMainContent(): void {
    for (const child of [...this.specialMainContainer.list]) {
      if (child !== this.specialMainGraphics) {
        child.destroy();
      }
    }
    this.specialMainGraphics.clear();
    this.specialMainObjects.length = 0;
  }

  private clearSpecialDerivedContent(): void {
    for (const child of [...this.specialDerivedContainer.list]) {
      if (child !== this.specialDerivedGraphics) {
        child.destroy();
      }
    }
    this.specialDerivedGraphics.clear();
    this.specialDerivedContentHeight = 0;
  }

  private buildSpecialMainContent(view: SpecialStatsView): void {
    this.clearSpecialMainContent();
    const g = this.specialMainGraphics;
    const mainX = MAIN_PANEL_X - 12;
    const mainY = MAIN_PANEL_Y - 12;
    const mainW =
      this.options.width -
      DETAIL_PANEL_WIDTH -
      DETAIL_PANEL_MARGIN -
      TREE_PADDING.horizontal * 2 +
      24;
    const content = insetRect({ x: mainX, y: mainY, width: mainW, height: 330 }, 14);
    const headline = this.buildSpecialHeadlineRows(view);

    addUiText(this.scene, this.specialMainContainer, content.x, content.y, 'SPECIAL COMMAND', {
      color: uiColors.textPrimary,
      fontSize: '14px',
      fontStyle: 'bold',
    });

    const summaryRect: UiRect = {
      x: content.x,
      y: content.y + 28,
      width: content.width,
      height: 50,
    };
    g.fillStyle(uiColors.accentGrowth, 0.14).fillRoundedRect(
      summaryRect.x,
      summaryRect.y,
      summaryRect.width,
      summaryRect.height,
      6,
    );
    g.lineStyle(1, uiColors.accentGrowth, 0.58).strokeRoundedRect(
      summaryRect.x + 0.5,
      summaryRect.y + 0.5,
      summaryRect.width - 1,
      summaryRect.height - 1,
      6,
    );
    const chipColumns = summaryRect.width >= 460 ? 4 : 2;
    const chipW = Math.floor((summaryRect.width - 8 * (chipColumns + 1)) / chipColumns);
    headline.slice(0, 4).forEach((row, index) => {
      const col = index % chipColumns;
      const rowIndex = Math.floor(index / chipColumns);
      const x = summaryRect.x + 8 + col * (chipW + 8);
      const y = summaryRect.y + 8 + rowIndex * 22;
      drawUiCard(g, {
        rect: { x, y: y - 2, width: chipW, height: 20 },
        fill: uiColors.panelBgInset,
        stroke: uiColors.accentGrowth,
        alpha: 0.58,
        strokeAlpha: 0.58,
        radius: 5,
      });
      g.fillStyle(uiColors.accentGrowth, 0.8).fillRoundedRect(x + 5, y + 3, 12, 12, 3);
      addUiText(this.scene, this.specialMainContainer, x + 21, y + 3, row.label, {
        color: uiColors.textMuted,
        fontSize: '10px',
      });
      addUiText(this.scene, this.specialMainContainer, x + chipW - 7, y + 2, row.value, {
        align: 'right',
        color: uiColors.valuePrimary,
        fontSize: '11px',
        fontStyle: 'bold',
      });
    });

    addUiText(
      this.scene,
      this.specialMainContainer,
      content.x,
      summaryRect.y + summaryRect.height + 12,
      `UNSPENT POINTS: ${view.unspentPoints}`,
      { color: uiColors.valuePrimary, fontSize: '12px', fontStyle: 'bold' },
    );

    const rowTop = summaryRect.y + summaryRect.height + 32;
    const rowH = 26;
    const rowGap = 4;
    for (let i = 0; i < view.stats.length; i += 1) {
      const stat = view.stats[i];
      const y = rowTop + i * (rowH + rowGap);
      const rect: UiRect = { x: content.x, y, width: content.width, height: rowH };
      const changed = stat.value !== stat.committedValue;
      g.fillStyle(
        changed ? uiColors.accentCore : uiColors.panelBgInset,
        changed ? 0.16 : 0.58,
      ).fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 4);
      g.lineStyle(
        1,
        changed ? uiColors.accentCore : uiColors.panelBorderMuted,
        changed ? 0.55 : 0.52,
      ).strokeRoundedRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1, 4);

      const statValue =
        stat.value === stat.committedValue
          ? `${stat.value}`
          : `${stat.committedValue} -> ${stat.value}`;
      const iconAccent = this.getSpecialStatAccent(stat.id);
      g.fillStyle(iconAccent, 0.82).fillRoundedRect(rect.x + 7, rect.y + 4, 20, 18, 4);
      this.drawSpecialStatGlyph(g, stat.id, rect.x + 17, rect.y + 13, 0x101824);
      addUiText(this.scene, this.specialMainContainer, rect.x + 34, rect.y + 6, stat.label, {
        color: uiColors.textPrimary,
        fontSize: '12px',
        fontStyle: 'bold',
      });
      addUiText(
        this.scene,
        this.specialMainContainer,
        rect.x + rect.width - 124,
        rect.y + 5,
        statValue,
        { align: 'right', color: uiColors.valuePrimary, fontSize: '13px', fontStyle: 'bold' },
      );

      addUiButton(this.scene, this.specialMainContainer, g, {
        id: `${stat.id}:decrease`,
        rect: { x: rect.x + rect.width - 78, y: rect.y + 4, width: 30, height: 18 },
        label: '-',
        enabled: stat.canDecrease,
        fill: uiColors.danger,
        stroke: uiColors.danger,
        disabledFill: uiColors.disabled,
        disabledStroke: uiColors.locked,
        onClick: () => {
          this.handlers.onPreviewSpecialChange?.(stat.id, -1);
          this.refresh();
        },
      });
      addUiButton(this.scene, this.specialMainContainer, g, {
        id: `${stat.id}:increase`,
        rect: { x: rect.x + rect.width - 38, y: rect.y + 4, width: 30, height: 18 },
        label: '+',
        enabled: stat.canIncrease,
        fill: uiColors.success,
        stroke: uiColors.success,
        disabledFill: uiColors.disabled,
        disabledStroke: uiColors.locked,
        onClick: () => {
          this.handlers.onPreviewSpecialChange?.(stat.id, 1);
          this.refresh();
        },
      });
    }

    const actionY = rowTop + view.stats.length * (rowH + rowGap) + 12;
    addUiButton(this.scene, this.specialMainContainer, g, {
      id: 'special:apply',
      rect: { x: content.x, y: actionY, width: 126, height: 26 },
      label: '> Apply Points',
      enabled: view.hasPreviewChanges,
      fill: uiColors.success,
      stroke: uiColors.success,
      disabledFill: uiColors.disabled,
      disabledStroke: uiColors.locked,
      onClick: () => {
        this.handlers.onApplySpecialChanges?.();
        this.refresh();
      },
    });
    addUiButton(this.scene, this.specialMainContainer, g, {
      id: 'special:reset',
      rect: { x: content.x + 138, y: actionY, width: 132, height: 26 },
      label: 'x Reset Preview',
      enabled: view.hasPreviewChanges,
      fill: uiColors.warning,
      stroke: uiColors.warning,
      disabledFill: uiColors.disabled,
      disabledStroke: uiColors.locked,
      onClick: () => {
        this.handlers.onResetSpecialPreview?.();
        this.refresh();
      },
    });
  }

  private getSpecialStatAccent(statId: string): number {
    const accents: Record<string, number> = {
      strength: uiColors.accentCommand,
      perception: uiColors.accentExploration,
      endurance: uiColors.accentSurvival,
      charisma: uiColors.accentSocial,
      intelligence: uiColors.accentArcana,
      agility: uiColors.accentFlow,
      luck: uiColors.accentCore,
    };
    return accents[statId] ?? uiColors.accentGrowth;
  }

  private drawSpecialStatGlyph(
    g: Phaser.GameObjects.Graphics,
    statId: string,
    cx: number,
    cy: number,
    color: number,
  ): void {
    g.lineStyle(2, color, 1);
    g.fillStyle(color, 1);
    switch (statId) {
      case 'strength':
        g.fillRoundedRect(cx - 8, cy - 5, 4, 8, 2);
        g.fillRoundedRect(cx - 4, cy - 7, 4, 10, 2);
        g.fillRoundedRect(cx, cy - 7, 4, 10, 2);
        g.fillRoundedRect(cx + 4, cy - 5, 4, 8, 2);
        g.fillRoundedRect(cx - 7, cy + 1, 14, 8, 3);
        g.fillRect(cx - 1, cy + 7, 5, 5);
        break;
      case 'perception':
        g.strokeEllipse(cx, cy, 16, 9);
        g.fillCircle(cx, cy, 3);
        break;
      case 'endurance':
        g.beginPath();
        g.moveTo(cx, cy - 8);
        g.lineTo(cx + 8, cy - 4);
        g.lineTo(cx + 6, cy + 6);
        g.lineTo(cx, cy + 9);
        g.lineTo(cx - 6, cy + 6);
        g.lineTo(cx - 8, cy - 4);
        g.closePath();
        g.strokePath();
        break;
      case 'charisma':
        g.strokeRoundedRect(cx - 8, cy - 6, 16, 11, 2);
        g.fillTriangle(cx - 2, cy + 5, cx + 3, cy + 5, cx - 2, cy + 9);
        break;
      case 'intelligence':
        g.fillRoundedRect(cx - 9, cy - 7, 8, 14, 1);
        g.fillRoundedRect(cx + 1, cy - 7, 8, 14, 1);
        g.lineStyle(1, uiColors.panelBgPrimary, 0.9);
        g.lineBetween(cx, cy - 7, cx, cy + 7);
        g.lineBetween(cx - 7, cy - 3, cx - 3, cy - 3);
        g.lineBetween(cx + 3, cy - 2, cx + 7, cy - 2);
        g.lineStyle(2, color, 1);
        break;
      case 'agility':
        g.fillRoundedRect(cx - 7, cy + 2, 15, 6, 2);
        g.fillTriangle(cx + 4, cy - 3, cx + 10, cy + 3, cx + 4, cy + 3);
        g.lineStyle(1, uiColors.panelBgPrimary, 0.75);
        g.lineBetween(cx - 4, cy + 1, cx, cy + 4);
        g.lineBetween(cx - 1, cy, cx + 3, cy + 4);
        g.lineStyle(2, color, 1);
        g.strokeTriangle(cx - 10, cy - 4, cx - 3, cy - 8, cx - 5, cy - 1);
        g.strokeTriangle(cx - 5, cy - 3, cx + 2, cy - 8, cx, cy - 1);
        break;
      case 'luck':
        g.fillCircle(cx - 4, cy - 4, 4);
        g.fillCircle(cx + 4, cy - 4, 4);
        g.fillCircle(cx - 4, cy + 4, 4);
        g.fillCircle(cx + 4, cy + 4, 4);
        break;
      default:
        g.fillCircle(cx, cy, 6);
        break;
    }
  }

  private clearStyleContent(): void {
    for (const child of [...this.styleContainer.list]) {
      if (child !== this.styleGraphics) {
        child.destroy();
      }
    }
    this.styleGraphics.clear();
    this.customizationRowMap = [];
    this.customizationIndex = [];
  }

  private buildStyleContent(): void {
    this.clearStyleContent();
    const g = this.styleGraphics;
    const state = this.scene.getSnakeCustomizationState();
    const mainRect: UiRect = {
      x: TREE_PADDING.horizontal - 12,
      y: TREE_PADDING.top - 12,
      width:
        this.options.width -
        DETAIL_PANEL_WIDTH -
        DETAIL_PANEL_MARGIN -
        TREE_PADDING.horizontal * 2 +
        24,
      height: this.getScrollableViewportHeight() + 18,
    };
    const content = insetRect(mainRect, 14);
    drawUiCard(g, {
      rect: mainRect,
      fill: uiColors.panelBgSecondary,
      stroke: uiColors.accentGear,
      alpha: 0.88,
      strokeAlpha: 0.7,
      radius: 8,
    });

    addUiText(this.scene, this.styleContainer, content.x, content.y, 'SNAKE STYLE', {
      color: uiColors.textPrimary,
      fontSize: '14px',
      fontStyle: 'bold',
    });

    const previewRect: UiRect = {
      x: this.detailPanel.x,
      y: this.detailPanel.y,
      width: this.detailPanel.width,
      height: this.detailPanel.height,
    };
    drawUiCard(g, {
      rect: previewRect,
      fill: uiColors.panelBgSecondary,
      stroke: uiColors.accentGear,
      alpha: 0.88,
      strokeAlpha: 0.7,
      radius: 8,
    });
    addUiText(
      this.scene,
      this.styleContainer,
      previewRect.x + previewRect.width / 2,
      previewRect.y + 22,
      i18n.getFeatureString('detailSnakeStyle'),
      {
        align: 'center',
        color: uiColors.textPrimary,
        fontSize: '18px',
        fontStyle: 'bold',
      },
    );
    addUiText(
      this.scene,
      this.styleContainer,
      previewRect.x + previewRect.width / 2,
      previewRect.y + 48,
      i18n.getFeatureString('detailCosmetics'),
      {
        align: 'center',
        color: uiColors.valuePositive,
        fontSize: '13px',
      },
    );

    const snakePreviewRect: UiRect = {
      x: previewRect.x + 24,
      y: previewRect.y + 84,
      width: previewRect.width - 48,
      height: 132,
    };
    this.drawSnakePreview(g, snakePreviewRect.x, snakePreviewRect.y, snakePreviewRect.width, state);

    const themes = this.scene
      .getSnakeThemeDefinitions()
      .filter((theme) => state.unlockedThemes.includes(theme.id) || state.activeTheme === theme.id);
    const hats = this.scene
      .getSnakeHatDefinitions()
      .filter((hat) => state.unlockedHats.includes(hat.id) || state.activeHat === hat.id);

    const paletteY = content.y + 30;
    addUiText(this.scene, this.styleContainer, content.x, paletteY, 'PALETTES', {
      color: '#9ad1ff',
      fontSize: '12px',
      fontStyle: 'bold',
    });
    themes.slice(0, 6).forEach((theme, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const rect: UiRect = {
        x: content.x + col * 168,
        y: paletteY + 22 + row * 48,
        width: 154,
        height: 38,
      };
      const active = state.activeTheme === theme.id;
      drawUiCard(g, {
        rect,
        fill: active ? uiColors.accentGear : uiColors.panelBgInset,
        stroke: active ? uiColors.accentCore : uiColors.panelBorderMuted,
        alpha: active ? 0.18 : 0.62,
        strokeAlpha: active ? 0.9 : 0.58,
      });
      g.fillStyle(active ? uiColors.accentCore : uiColors.accentGear, 0.95).fillRoundedRect(
        rect.x + 8,
        rect.y + 9,
        22,
        20,
        4,
      );
      addUiText(this.scene, this.styleContainer, rect.x + 38, rect.y + 7, theme.label, {
        color: uiColors.textPrimary,
        fontSize: '12px',
      });
      addUiBadge(
        this.scene,
        this.styleContainer,
        g,
        { x: rect.x + 88, y: rect.y + 20, width: 56, height: 15 },
        active ? 'EQUIP' : 'OWNED',
        active ? uiColors.accentCore : uiColors.accentGear,
        active ? uiColors.accentCore : uiColors.accentGear,
        active ? '#101824' : '#ffffff',
      );
      this.addStyleClickZone(rect, () => {
        const result = this.scene.equipOwnedSnakeTheme(theme.id as SnakeThemeId);
        this.announce(result.message, result.color, 1800);
        this.refresh();
      });
    });

    const hatsY = paletteY + 178;
    addUiText(this.scene, this.styleContainer, content.x, hatsY, 'HATS', {
      color: '#9ad1ff',
      fontSize: '12px',
      fontStyle: 'bold',
    });
    if (hats.length === 0) {
      addUiText(
        this.scene,
        this.styleContainer,
        content.x,
        hatsY + 24,
        i18n.getFeatureString('noHatsOwned'),
        {
          color: uiColors.textMuted,
          fontSize: '12px',
        },
      );
    }
    hats.slice(0, 4).forEach((hat, index) => {
      const rect: UiRect = {
        x: content.x + index * 82,
        y: hatsY + 24,
        width: 70,
        height: 48,
      };
      const equipped = state.activeHat === hat.id;
      drawUiCard(g, {
        rect,
        fill: equipped ? uiColors.accentGear : uiColors.panelBgInset,
        stroke: equipped ? uiColors.accentCore : uiColors.panelBorderMuted,
        alpha: equipped ? 0.18 : 0.62,
        strokeAlpha: equipped ? 0.9 : 0.58,
      });
      addUiText(this.scene, this.styleContainer, rect.x + rect.width / 2, rect.y + 8, hat.label, {
        align: 'center',
        color: uiColors.textPrimary,
        fontSize: '11px',
        wordWrapWidth: rect.width - 8,
      });
      addUiText(
        this.scene,
        this.styleContainer,
        rect.x + rect.width / 2,
        rect.y + 32,
        equipped ? 'ON' : 'OWNED',
        {
          align: 'center',
          color: equipped ? uiColors.valuePrimary : uiColors.textMuted,
          fontSize: '10px',
        },
      );
      this.addStyleClickZone(rect, () => {
        const result = this.scene.toggleOwnedSnakeHat(hat.id);
        this.announce(result.message, result.color, 1800);
        this.refresh();
      });
    });

    const utilY = hatsY + 88;
    addUiText(this.scene, this.styleContainer, content.x, utilY, 'UTILITIES', {
      color: '#9ad1ff',
      fontSize: '12px',
      fontStyle: 'bold',
    });
    const utilities = [
      {
        label: 'Quiet Steps',
        status: !state.loudWalkingNoiseUnlocked
          ? '100'
          : state.loudWalkingNoiseEnabled
            ? 'ON'
            : 'OWNED',
        action: () => this.scene.toggleDisableWalkingNoise(),
      },
      {
        label: 'Cowbell',
        status: !state.cowbellUnlocked ? '45' : state.cowbellEquipped ? 'ON' : 'OWNED',
        action: () => this.scene.toggleCowbell(),
      },
      {
        label: 'Minimap',
        status: !this.scene.isMinimapUnlocked()
          ? '50'
          : this.scene.isMinimapEnabled()
            ? 'ON'
            : 'OFF',
        action: () => this.scene.purchaseOrToggleMinimap(),
      },
      {
        label: 'Spanish',
        status: !state.languageSelected ? '200' : i18n.getCurrentLanguage() === 'es' ? 'ON' : 'OFF',
        action: () => this.scene.toggleLanguage(),
      },
    ];
    utilities.forEach((utility, index) => {
      const rect: UiRect = {
        x: content.x + (index % 2) * 168,
        y: utilY + 24 + Math.floor(index / 2) * 38,
        width: 154,
        height: 30,
      };
      drawUiCard(g, {
        rect,
        fill: uiColors.panelBgInset,
        stroke: uiColors.panelBorderMuted,
        alpha: 0.62,
        strokeAlpha: 0.58,
      });
      addUiText(this.scene, this.styleContainer, rect.x + 8, rect.y + 8, utility.label, {
        color: uiColors.textPrimary,
        fontSize: '11px',
      });
      addUiBadge(
        this.scene,
        this.styleContainer,
        g,
        { x: rect.x + rect.width - 52, y: rect.y + 7, width: 42, height: 16 },
        utility.status,
        uiColors.accentGear,
        uiColors.accentGear,
      );
      this.addStyleClickZone(rect, () => {
        const result = utility.action();
        this.announce(result.message, result.color, 1800);
        this.refresh();
      });
    });

    const counterY = snakePreviewRect.y + snakePreviewRect.height + 22;
    addUiText(
      this.scene,
      this.styleContainer,
      previewRect.x + 28,
      counterY,
      `${themes.length} palette${themes.length === 1 ? '' : 's'} owned`,
      { color: uiColors.textSecondary, fontSize: '13px' },
    );
    addUiText(
      this.scene,
      this.styleContainer,
      previewRect.x + 28,
      counterY + 22,
      `${hats.length} hat${hats.length === 1 ? '' : 's'} owned`,
      { color: uiColors.textSecondary, fontSize: '13px' },
    );
    addUiText(
      this.scene,
      this.styleContainer,
      previewRect.x + 28,
      counterY + 64,
      'Equip owned cosmetics, unlock utilities, and preview your run look.',
      {
        color: uiColors.textSecondary,
        fontSize: '12px',
        wordWrapWidth: previewRect.width - 56,
      },
    );
    this.detailTitle.setVisible(false);
    this.detailSubtitle.setVisible(false);
    this.detailRankText.setVisible(false);
    this.detailBody.setVisible(false);
  }

  private drawSnakePreview(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    state: ReturnType<SnakeScene['getSnakeCustomizationState']>,
  ): void {
    const height = 132;
    g.fillStyle(uiColors.panelBgInset, 0.74).fillRoundedRect(x, y, width, height, 8);
    g.lineStyle(1, uiColors.panelBorderMuted, 0.7).strokeRoundedRect(
      x + 0.5,
      y + 0.5,
      width - 1,
      height - 1,
      8,
    );
    for (let gridX = x + 12; gridX < x + width - 8; gridX += 18) {
      g.lineStyle(1, uiColors.panelBorderMuted, 0.24).lineBetween(
        gridX,
        y + 10,
        gridX,
        y + height - 10,
      );
    }
    for (let gridY = y + 12; gridY < y + height - 8; gridY += 18) {
      g.lineStyle(1, uiColors.panelBorderMuted, 0.24).lineBetween(
        x + 10,
        gridY,
        x + width - 10,
        gridY,
      );
    }
    const activeColor = state.activeTheme === 'retro-grid' ? 0x5dd6a2 : uiColors.accentGear;
    const points = [
      { x: x + width * 0.26, y: y + height * 0.62 },
      { x: x + width * 0.38, y: y + height * 0.48 },
      { x: x + width * 0.52, y: y + height * 0.48 },
      { x: x + width * 0.64, y: y + height * 0.62 },
      { x: x + width * 0.62, y: y + height * 0.78 },
      { x: x + width * 0.48, y: y + height * 0.78 },
    ];
    points.forEach((point, index) => {
      const size = index === 0 ? 24 : 22;
      g.fillStyle(index === 0 ? uiColors.accentCore : activeColor, 0.96).fillRoundedRect(
        point.x - size / 2,
        point.y - size / 2,
        size,
        size,
        6,
      );
      g.lineStyle(1, 0xffffff, 0.4).strokeRoundedRect(
        point.x - size / 2 + 0.5,
        point.y - size / 2 + 0.5,
        size - 1,
        size - 1,
        6,
      );
    });
    g.fillStyle(0xff6b6b, 0.95).fillTriangle(
      points[0].x + 8,
      points[0].y - 2,
      points[0].x + 18,
      points[0].y + 2,
      points[0].x + 8,
      points[0].y + 6,
    );
    if (state.activeHat) {
      g.fillStyle(uiColors.accentCore, 0.92).fillTriangle(
        points[0].x - 6,
        points[0].y - 18,
        points[0].x + 6,
        points[0].y - 18,
        points[0].x,
        points[0].y - 32,
      );
    }
  }

  private addStyleClickZone(rect: UiRect, onClick: () => void): void {
    const zone = this.scene.add
      .zone(rect.x, rect.y, rect.width, rect.height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', onClick);
    this.styleContainer.add(zone);
  }

  private clearFactionContent(): void {
    for (const child of [...this.factionContainer.list]) {
      if (child !== this.factionGraphics) {
        child.destroy();
      }
    }
    this.factionGraphics.clear();
  }

  private buildFactionContent(): void {
    this.clearFactionContent();
    const g = this.factionGraphics;
    const factions = this.scene.getFactionCards().filter((faction) => faction.discovered);
    const wards = this.scene.getWardContractsForMenu();
    const mainRect: UiRect = {
      x: TREE_PADDING.horizontal - 12,
      y: TREE_PADDING.top - 12,
      width:
        this.options.width -
        DETAIL_PANEL_WIDTH -
        DETAIL_PANEL_MARGIN -
        TREE_PADDING.horizontal * 2 +
        24,
      height: this.getScrollableViewportHeight() + 18,
    };
    drawUiCard(g, {
      rect: mainRect,
      fill: uiColors.panelBgSecondary,
      stroke: uiColors.accentWorld,
      alpha: 0.88,
      strokeAlpha: 0.7,
      radius: 8,
    });
    const content = insetRect(mainRect, 14);
    addUiText(this.scene, this.factionContainer, content.x, content.y, 'FACTION STANDING', {
      color: uiColors.textPrimary,
      fontSize: '14px',
      fontStyle: 'bold',
    });

    if (factions.length === 0) {
      addUiText(
        this.scene,
        this.factionContainer,
        content.x,
        content.y + 34,
        'No factions discovered yet.',
        {
          color: uiColors.textMuted,
          fontSize: '13px',
        },
      );
      return;
    }

    factions.slice(0, 2).forEach((faction, index) => {
      const rect: UiRect = {
        x: content.x,
        y: content.y + 30 + index * 142,
        width: content.width,
        height: 126,
      };
      const friendly = faction.alignment >= 0;
      const accent = friendly ? uiColors.success : uiColors.danger;
      drawUiCard(g, {
        rect,
        fill: uiColors.panelBgInset,
        stroke: accent,
        alpha: 0.62,
        strokeAlpha: 0.72,
      });
      g.fillStyle(accent, 0.22).fillRoundedRect(rect.x + 10, rect.y + 12, 34, 34, 6);
      g.lineStyle(1, accent, 0.75).strokeRoundedRect(rect.x + 10.5, rect.y + 12.5, 33, 33, 6);
      addUiText(this.scene, this.factionContainer, rect.x + 54, rect.y + 10, faction.name, {
        color: uiColors.textPrimary,
        fontSize: '13px',
        fontStyle: 'bold',
      });
      const sign = faction.alignment > 0 ? '+' : '';
      addUiBadge(
        this.scene,
        this.factionContainer,
        g,
        { x: rect.x + rect.width - 112, y: rect.y + 10, width: 96, height: 20 },
        `${faction.standing.toUpperCase()} ${sign}${faction.alignment}`,
        accent,
        accent,
      );
      addUiText(this.scene, this.factionContainer, rect.x + 54, rect.y + 32, faction.subtitle, {
        color: uiColors.textMuted,
        fontSize: '11px',
        wordWrapWidth: rect.width - 170,
      });
      this.drawStandingBar(g, rect.x + 14, rect.y + 58, rect.width - 28, faction.alignment, accent);
      const effects = faction.effects.slice(0, 3);
      effects.forEach((effect, effectIndex) => {
        addUiText(
          this.scene,
          this.factionContainer,
          rect.x + 18,
          rect.y + 82 + effectIndex * 14,
          `- ${effect}`,
          { color: uiColors.textSecondary, fontSize: '11px', wordWrapWidth: rect.width - 36 },
        );
      });
    });

    const wardEntries = Object.entries(wards).filter(([, count]) => Number(count) > 0);
    const wardY = content.y + 318;
    addUiText(this.scene, this.factionContainer, content.x, wardY, 'WARD CONTRACTS', {
      color: '#9ad1ff',
      fontSize: '12px',
      fontStyle: 'bold',
    });
    if (wardEntries.length === 0) {
      addUiBadge(
        this.scene,
        this.factionContainer,
        g,
        { x: content.x, y: wardY + 22, width: 86, height: 20 },
        'NONE',
        uiColors.panelBorderMuted,
        uiColors.panelBorderMuted,
        uiColors.textMuted,
      );
    } else {
      wardEntries.slice(0, 4).forEach(([source, count], index) => {
        addUiBadge(
          this.scene,
          this.factionContainer,
          g,
          { x: content.x + index * 98, y: wardY + 22, width: 88, height: 20 },
          `${source} x${count}`,
          uiColors.accentWorld,
          uiColors.accentWorld,
        );
      });
    }

    this.detailTitle.setText('Factions').setVisible(true);
    this.detailSubtitle.setText(i18n.getFeatureString('detailStanding')).setVisible(true);
    this.detailRankText.setText('').setVisible(false);
    this.detailBody
      .setText('Standing changes shop access, prices, hostility, and ward availability.')
      .setVisible(true);
  }

  private drawStandingBar(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    alignment: number,
    accent: number,
  ): void {
    g.fillStyle(0x03070c, 0.78).fillRoundedRect(x, y, width, 12, 6);
    g.lineStyle(1, uiColors.panelBorderMuted, 0.75).strokeRoundedRect(
      x + 0.5,
      y + 0.5,
      width - 1,
      11,
      6,
    );
    const normalized = Phaser.Math.Clamp((alignment + 100) / 200, 0, 1);
    g.fillStyle(accent, 0.86).fillRoundedRect(
      x + 2,
      y + 2,
      Math.max(4, (width - 4) * normalized),
      8,
      4,
    );
    for (const marker of [0, 0.25, 0.5, 0.75, 1]) {
      const mx = x + marker * width;
      g.lineStyle(1, 0xffffff, marker === 0.5 ? 0.58 : 0.28).lineBetween(mx, y - 2, mx, y + 14);
    }
  }

  private clearStructuredContent(): void {
    for (const child of [...this.structuredContainer.list]) {
      if (child !== this.structuredGraphics) {
        child.destroy();
      }
    }
    this.structuredGraphics.clear();
    this.inventoryIndex = [];
    this.questRowMap = [];
    this.spellRowMap = [];
    this.structuredContentHeight = 0;
  }

  private buildStructuredTabContent(tab: TabId): void {
    this.clearStructuredContent();
    const rect: UiRect = {
      x: TREE_PADDING.horizontal - 12,
      y: TREE_PADDING.top - 12,
      width:
        this.options.width -
        DETAIL_PANEL_WIDTH -
        DETAIL_PANEL_MARGIN -
        TREE_PADDING.horizontal * 2 +
        24,
      height: this.getScrollableViewportHeight() + 18,
    };
    drawUiCard(this.structuredGraphics, {
      rect,
      fill: uiColors.panelBgSecondary,
      stroke: TAB_ACCENTS[this.activePrimaryTab],
      alpha: 0.88,
      strokeAlpha: 0.7,
      radius: 8,
    });
    const renderRect =
      tab === 'equipment' || tab === 'items' || tab === 'inventory'
        ? rect
        : { ...rect, y: rect.y - this.getStructuredScrollOffset() };

    switch (tab) {
      case 'equipment':
        this.buildEquipmentCards(renderRect);
        break;
      case 'items':
        this.buildItemCards(renderRect);
        break;
      case 'inventory':
        this.buildItemCards(renderRect);
        break;
      case 'spells':
        this.buildSpellCards(renderRect);
        break;
      case 'cards':
        this.buildCardCollectionCards(renderRect);
        break;
      case 'quests':
        this.buildQuestCards(renderRect);
        break;
      case 'dating':
        this.buildDatingCards(renderRect);
        break;
      case 'people':
        this.buildPeopleCards(renderRect);
        break;
      case 'destiny':
        this.buildLineCards(renderRect, 'DESTINY', this.handlers.getDestinyView?.() ?? []);
        break;
      case 'artifacts':
        this.buildArtifactCards(renderRect);
        break;
      case 'info':
        this.buildLineCards(renderRect, 'SYSTEM INFO', [
          'Growth manages skills, SPECIAL, and spells.',
          'Gear manages inventory, cosmetics, cards, and artifacts.',
          'World manages map, relationships, quests, and factions.',
          'System stores technical and meta tools.',
        ]);
        this.detailTitle.setText('Info').setVisible(true);
        this.detailSubtitle.setText(i18n.getFeatureString('detailMenu')).setVisible(true);
        this.detailRankText.setText('').setVisible(false);
        this.detailBody
          .setText('The pause menu is the command center for the current run.')
          .setVisible(true);
        break;
      default:
        this.buildLineCards(
          renderRect,
          resolveTabLabel(TAB_DEFINITIONS.find((entry) => entry.id === tab) ?? TAB_DEFINITIONS[0]),
          [
            resolvePlaceholder(
              TAB_DEFINITIONS.find((entry) => entry.id === tab) ?? TAB_DEFINITIONS[0],
            ) ?? 'No data available.',
          ],
        );
        break;
    }
  }

  private addStructuredZone(rect: UiRect, onClick: () => void): void {
    const zone = this.scene.add
      .zone(rect.x, rect.y, rect.width, rect.height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', onClick);
    this.structuredContainer.add(zone);
  }

  private getStructuredScrollOffset(): number {
    return this.scrollOffsets[this.activeTab] ?? 0;
  }

  private toStructuredY(y: number): number {
    return y - this.getStructuredScrollOffset();
  }

  private isStructuredRectVisible(rect: UiRect, viewport: UiRect): boolean {
    return rect.y + rect.height >= viewport.y && rect.y <= viewport.y + viewport.height;
  }

  private setStructuredContentHeight(content: UiRect, bottomY: number): void {
    this.structuredContentHeight = Math.max(0, bottomY - content.y + 14);
    this.drawStructuredScrollRail();
  }

  private drawStructuredScrollRail(): void {
    const viewport = this.getStructuredViewport();
    this.drawScrollRail(
      this.structuredGraphics,
      viewport.x + viewport.width - 7,
      viewport.y + 12,
      viewport.height - 24,
      viewport.height,
      this.structuredContentHeight,
      this.getStructuredScrollOffset(),
    );
  }

  private getStructuredViewport(): UiRect {
    return {
      x: TREE_PADDING.horizontal - 12,
      y: TREE_PADDING.top - 12,
      width:
        this.options.width -
        DETAIL_PANEL_WIDTH -
        DETAIL_PANEL_MARGIN -
        TREE_PADDING.horizontal * 2 +
        24,
      height: this.getScrollableViewportHeight() + 18,
    };
  }

  private getEquipmentSlots(): EquipmentSlot[] {
    return [
      'weapon',
      'boots',
      'helm',
      'ring',
      'gloves',
      'cloak',
      'belt',
      'amulet',
    ] as unknown as EquipmentSlot[];
  }

  private buildEquipmentCards(rect: UiRect): void {
    const content = insetRect(rect, 14);
    const offset = this.getStructuredScrollOffset();
    const headerY = content.y - offset;
    addUiText(this.scene, this.structuredContainer, content.x, content.y, 'EQUIPMENT', {
      color: uiColors.textPrimary,
      fontSize: '14px',
      fontStyle: 'bold',
    });
    addUiBadge(
      this.scene,
      this.structuredContainer,
      this.structuredGraphics,
      { x: content.x + content.width - 98, y: content.y - 2, width: 86, height: 20 },
      'SLOTS',
      uiColors.accentGear,
      uiColors.accentGear,
    );

    const allItems = this.scene.inventory.getAllItems();
    const equipmentBySlot = new Map<
      EquipmentSlot,
      Array<{ id: string; item: any; count: number }>
    >();
    for (const [itemId, count] of allItems) {
      const item = getItem(itemId) as any;
      if (item?.kind !== 'equipment') continue;
      const slot = item.slot as EquipmentSlot;
      const bucket = equipmentBySlot.get(slot) ?? [];
      bucket.push({ id: itemId, item, count });
      equipmentBySlot.set(slot, bucket);
    }

    let y = content.y + 30 - offset;
    let unscrolledBottom = content.y + 30;
    for (const slot of this.getEquipmentSlots()) {
      const equippedId = this.scene.inventory.getEquipped(slot);
      const equipped = equippedId ? (getItem(equippedId) as any) : null;
      const available = equipmentBySlot.get(slot) ?? [];
      const card: UiRect = { x: content.x, y, width: content.width, height: 54 };
      const visible = this.isStructuredRectVisible(card, rect);
      if (visible) {
      drawUiCard(this.structuredGraphics, {
        rect: card,
        fill: equipped ? uiColors.accentGear : uiColors.panelBgInset,
        stroke: equipped ? uiColors.accentCore : uiColors.panelBorderMuted,
        alpha: equipped ? 0.16 : 0.62,
        strokeAlpha: equipped ? 0.9 : 0.58,
      });
      const slotLabel = String(slot).charAt(0).toUpperCase() + String(slot).slice(1);
      addUiText(this.scene, this.structuredContainer, card.x + 10, card.y + 8, slotLabel, {
        color: uiColors.textMuted,
        fontSize: '10px',
        fontStyle: 'bold',
      });
      addUiText(
        this.scene,
        this.structuredContainer,
        card.x + 10,
        card.y + 24,
        equipped?.name ?? 'Empty slot',
        {
          color: equipped ? uiColors.textPrimary : uiColors.textMuted,
          fontSize: '13px',
          fontStyle: equipped ? 'bold' : 'normal',
        },
      );
      addUiText(
        this.scene,
        this.structuredContainer,
        card.x + 10,
        card.y + 40,
        available.length > 0
          ? `${available.length} candidate${available.length === 1 ? '' : 's'}`
          : 'No gear owned',
        { color: uiColors.textMuted, fontSize: '10px' },
      );
      addUiBadge(
        this.scene,
        this.structuredContainer,
        this.structuredGraphics,
        { x: card.x + card.width - 78, y: card.y + 17, width: 66, height: 20 },
        equipped ? 'UNEQUIP' : 'EMPTY',
        equipped ? uiColors.accentCore : uiColors.locked,
        equipped ? uiColors.accentCore : uiColors.locked,
        equipped ? '#101824' : '#ffffff',
      );
      this.addStructuredZone(card, () => {
        if (equippedId) {
          const ok = this.scene.unequipSlot(slot);
          this.announce(
            ok ? `Unequipped ${slotLabel}.` : `Could not unequip ${slotLabel}.`,
            ok ? '#9ad1ff' : '#ff6b6b',
            1600,
          );
          this.refresh();
          return;
        }
        const first = available[0];
        if (first) {
          const ok = this.scene.equipItem(first.id);
          this.announce(
            ok ? `${first.item.name} equipped.` : `Cannot equip ${first.item.name}.`,
            ok ? '#5dd6a2' : '#ff6b6b',
            1600,
          );
          this.refresh();
        } else {
          this.detailTitle.setText(slotLabel).setVisible(true);
          this.detailSubtitle.setText('Equipment Slot').setVisible(true);
          this.detailRankText.setText('').setVisible(false);
          this.detailBody.setText('No owned equipment fits this slot yet.').setVisible(true);
        }
      });
      }
      y += 62;
      unscrolledBottom += 62;
    }

    this.detailTitle.setText('Equipment').setVisible(true);
    this.detailSubtitle.setText('Equipped build slots').setVisible(true);
    this.detailRankText.setText('').setVisible(false);
    this.detailBody
      .setText(
        'Click a filled slot to unequip it. Empty slots show whether matching gear is owned.',
      )
      .setVisible(true);
    void headerY;
    this.setStructuredContentHeight(content, unscrolledBottom);
  }

  private buildItemCards(rect: UiRect): void {
    const content = insetRect(rect, 14);
    const offset = this.getStructuredScrollOffset();
    addUiText(this.scene, this.structuredContainer, content.x, content.y, 'ITEMS', {
      color: uiColors.textPrimary,
      fontSize: '14px',
      fontStyle: 'bold',
    });
    const items = this.scene.inventory
      .getAllItems()
      .filter(([itemId]) => (getItem(itemId) as any)?.kind !== 'equipment');
    addUiBadge(
      this.scene,
      this.structuredContainer,
      this.structuredGraphics,
      { x: content.x + content.width - 98, y: content.y - 2, width: 86, height: 20 },
      `${items.length} STACKS`,
      uiColors.accentGear,
      uiColors.accentGear,
    );
    let y = content.y + 30 - offset;
    let unscrolledBottom = content.y + 30;
    if (items.length === 0) {
      addUiText(
        this.scene,
        this.structuredContainer,
        content.x,
        y,
        i18n.getFeatureString('noItemsInInventory'),
        { color: uiColors.textMuted, fontSize: '13px' },
      );
    }
    for (const [itemId, count] of items.slice(0, 12)) {
      const item = getItem(itemId) as any;
      const card: UiRect = { x: content.x, y, width: content.width, height: 48 };
      const visible = this.isStructuredRectVisible(card, rect);
      if (visible) {
      drawUiCard(this.structuredGraphics, {
        rect: card,
        fill: uiColors.panelBgInset,
        stroke: uiColors.panelBorderMuted,
        alpha: 0.62,
        strokeAlpha: 0.58,
      });
      addUiText(
        this.scene,
        this.structuredContainer,
        card.x + 10,
        card.y + 8,
        item?.name ?? itemId,
        {
          color: uiColors.textPrimary,
          fontSize: '12px',
          fontStyle: 'bold',
        },
      );
      addUiText(
        this.scene,
        this.structuredContainer,
        card.x + 10,
        card.y + 27,
        `${item?.category ?? item?.kind ?? 'misc'} // x${count}`,
        { color: uiColors.textMuted, fontSize: '10px' },
      );
      addUiBadge(
        this.scene,
        this.structuredContainer,
        this.structuredGraphics,
        { x: card.x + card.width - 62, y: card.y + 14, width: 50, height: 20 },
        item?.category === 'food' || item?.kind === 'consumable' ? 'USE' : 'VIEW',
        uiColors.accentGear,
        uiColors.accentGear,
      );
      this.addStructuredZone(card, () => {
        this.selectedInventoryItemId = itemId;
        this.showInventoryItemDetails();
      });
      }
      y += 56;
      unscrolledBottom += 56;
    }
    this.detailTitle.setText('Items').setVisible(true);
    this.detailSubtitle.setText('Food, materials, quest goods').setVisible(true);
    this.detailRankText.setText('').setVisible(false);
    this.detailBody
      .setText('Click an item row for details. Food and consumables can still use U.')
      .setVisible(true);
    this.setStructuredContentHeight(content, unscrolledBottom);
  }

  private buildInventoryCards(rect: UiRect): void {
    const content = insetRect(rect, 14);
    addUiText(this.scene, this.structuredContainer, content.x, content.y, 'INVENTORY', {
      color: uiColors.textPrimary,
      fontSize: '14px',
      fontStyle: 'bold',
    });
    const items = this.scene.inventory.getAllItems();
    const slots: EquipmentSlot[] = [
      'weapon',
      'boots',
      'helm',
      'ring',
      'gloves',
      'cloak',
      'belt',
      'amulet',
    ] as unknown as EquipmentSlot[];
    let y = content.y + 30;
    for (const slot of slots) {
      const current = this.scene.inventory.getEquipped(slot);
      if (!current) continue;
      const card: UiRect = { x: content.x, y, width: content.width, height: 30 };
      drawUiCard(this.structuredGraphics, {
        rect: card,
        fill: uiColors.panelBgInset,
        stroke: uiColors.accentGear,
        alpha: 0.62,
        strokeAlpha: 0.6,
      });
      addUiText(
        this.scene,
        this.structuredContainer,
        card.x + 10,
        card.y + 8,
        `Unequip ${(slot as string).toUpperCase()}`,
        { color: uiColors.textPrimary, fontSize: '12px' },
      );
      addUiBadge(
        this.scene,
        this.structuredContainer,
        this.structuredGraphics,
        { x: card.x + card.width - 82, y: card.y + 6, width: 70, height: 18 },
        'EQUIPPED',
        uiColors.accentGear,
        uiColors.accentGear,
      );
      this.addStructuredZone(card, () => {
        const ok = this.scene.unequipSlot(slot);
        this.announce(
          ok ? `Unequipped ${slot}.` : `Could not unequip ${slot}.`,
          ok ? '#9ad1ff' : '#ff6b6b',
          1600,
        );
        this.refresh();
      });
      y += 36;
    }
    if (items.length === 0) {
      addUiText(
        this.scene,
        this.structuredContainer,
        content.x,
        y,
        i18n.getFeatureString('noItemsInInventory'),
        {
          color: uiColors.textMuted,
          fontSize: '13px',
        },
      );
    }
    for (const [itemId, count] of items.slice(0, 10)) {
      const item = getItem(itemId) as any;
      const card: UiRect = { x: content.x, y, width: content.width, height: 42 };
      const equipped =
        item?.kind === 'equipment' &&
        this.scene.inventory.getEquipped(item.slot as EquipmentSlot) === itemId;
      drawUiCard(this.structuredGraphics, {
        rect: card,
        fill: equipped ? uiColors.accentGear : uiColors.panelBgInset,
        stroke: equipped ? uiColors.accentCore : uiColors.panelBorderMuted,
        alpha: equipped ? 0.16 : 0.62,
        strokeAlpha: equipped ? 0.9 : 0.58,
      });
      addUiText(
        this.scene,
        this.structuredContainer,
        card.x + 10,
        card.y + 7,
        item?.name ?? itemId,
        {
          color: uiColors.textPrimary,
          fontSize: '12px',
        },
      );
      addUiText(
        this.scene,
        this.structuredContainer,
        card.x + 10,
        card.y + 24,
        `${item?.category ?? item?.kind ?? 'item'} // x${count}`,
        { color: uiColors.textMuted, fontSize: '10px' },
      );
      addUiBadge(
        this.scene,
        this.structuredContainer,
        this.structuredGraphics,
        { x: card.x + card.width - 78, y: card.y + 11, width: 66, height: 18 },
        equipped ? 'ON' : item?.kind === 'equipment' ? 'EQUIP' : 'VIEW',
        equipped ? uiColors.accentCore : uiColors.accentGear,
        equipped ? uiColors.accentCore : uiColors.accentGear,
        equipped ? '#101824' : '#ffffff',
      );
      this.addStructuredZone(card, () => {
        this.selectedInventoryItemId = itemId;
        if (item?.kind === 'equipment') {
          const ok = equipped
            ? this.scene.unequipSlot(item.slot as EquipmentSlot)
            : this.scene.equipItem(itemId);
          this.announce(
            ok
              ? `${item.name} ${equipped ? 'unequipped' : 'equipped'}.`
              : `Cannot equip ${item.name}.`,
            ok ? '#5dd6a2' : '#ff6b6b',
            1600,
          );
          this.refresh();
        } else {
          this.showInventoryItemDetails();
        }
      });
      y += 48;
    }
    this.detailTitle.setText('Inventory').setVisible(true);
    this.detailSubtitle.setText('Gear and Consumables').setVisible(true);
    this.detailRankText.setText('').setVisible(false);
    this.detailBody
      .setText('Click equipment to equip or unequip. Select consumables for details.')
      .setVisible(true);
  }

  private buildSpellCards(rect: UiRect): void {
    const views = this.handlers.getSpellSlotView?.() ?? [];
    const content = insetRect(rect, 14);
    const bound = views.find((view) => view.bound);
    addUiText(this.scene, this.structuredContainer, content.x, content.y, 'SPELLS', {
      color: uiColors.textPrimary,
      fontSize: '14px',
      fontStyle: 'bold',
    });
    addUiBadge(
      this.scene,
      this.structuredContainer,
      this.structuredGraphics,
      { x: content.x + content.width - 138, y: content.y - 2, width: 126, height: 20 },
      `Q: ${bound?.label ?? 'Empty'}`,
      uiColors.accentArcana,
      uiColors.accentArcana,
    );
    let y = content.y + 30;
    for (const view of views) {
      const card: UiRect = { x: content.x, y, width: content.width, height: 58 };
      drawUiCard(this.structuredGraphics, {
        rect: card,
        fill: view.bound ? uiColors.accentArcana : uiColors.panelBgInset,
        stroke: view.bound ? uiColors.accentCore : uiColors.panelBorderMuted,
        alpha: view.bound ? 0.15 : 0.62,
        strokeAlpha: view.bound ? 0.85 : 0.58,
      });
      addUiText(this.scene, this.structuredContainer, card.x + 10, card.y + 8, view.label, {
        color: uiColors.textPrimary,
        fontSize: '12px',
        fontStyle: 'bold',
      });
      addUiText(this.scene, this.structuredContainer, card.x + 10, card.y + 27, view.description, {
        color: uiColors.textMuted,
        fontSize: '10px',
        wordWrapWidth: card.width - 110,
      });
      addUiBadge(
        this.scene,
        this.structuredContainer,
        this.structuredGraphics,
        { x: card.x + card.width - 82, y: card.y + 16, width: 70, height: 20 },
        view.bound ? 'BOUND' : view.canBind ? 'BIND' : 'LOCKED',
        view.canBind || view.bound ? uiColors.accentArcana : uiColors.locked,
        view.canBind || view.bound ? uiColors.accentArcana : uiColors.locked,
      );
      this.addStructuredZone(card, () => {
        if (view.canBind) {
          this.handlers.onBindSpellSlot?.(view.id);
        } else {
          this.announce(
            view.disabledReason ?? i18n.getFeatureString('skillTreeQOptionUnavailable'),
            '#ff6b6b',
            1800,
          );
        }
      });
      y += 66;
    }
    if (views.length === 0) {
      addUiText(
        this.scene,
        this.structuredContainer,
        content.x,
        y,
        i18n.getFeatureString('noSpellAvailable'),
        {
          color: uiColors.textMuted,
          fontSize: '13px',
        },
      );
    }
    this.setStructuredContentHeight(content, y);
    this.detailTitle.setText(i18n.getFeatureString('detailQSlot')).setVisible(true);
    this.detailSubtitle.setText(i18n.getFeatureString('detailSpellsTitle')).setVisible(true);
    this.detailRankText.setText('').setVisible(false);
    this.detailBody.setText('Click an available ability to bind it to Q.').setVisible(true);
  }

  private buildCardCollectionCards(rect: UiRect): void {
    const collection = this.scene.getCardCollectionForMenu();
    const owned = CARD_DEFINITIONS.map((card) => ({
      card,
      count: Number(collection[card.id] ?? 0),
    })).filter((entry) => entry.count > 0);
    const content = insetRect(rect, 14);
    addUiText(this.scene, this.structuredContainer, content.x, content.y, 'CARDS', {
      color: uiColors.textPrimary,
      fontSize: '14px',
      fontStyle: 'bold',
    });
    let y = content.y + 30;
    if (owned.length === 0) {
      addUiText(
        this.scene,
        this.structuredContainer,
        content.x,
        y,
        i18n.getFeatureString('noCardsOwned'),
        {
          color: uiColors.textMuted,
          fontSize: '13px',
        },
      );
    }
    for (const { card, count } of owned.slice(0, 8)) {
      const cardRect: UiRect = { x: content.x, y, width: content.width, height: 42 };
      drawUiCard(this.structuredGraphics, {
        rect: cardRect,
        fill: uiColors.panelBgInset,
        stroke: uiColors.accentGear,
        alpha: 0.62,
        strokeAlpha: 0.58,
      });
      addUiText(this.scene, this.structuredContainer, cardRect.x + 10, cardRect.y + 7, card.name, {
        color: uiColors.textPrimary,
        fontSize: '12px',
      });
      addUiText(
        this.scene,
        this.structuredContainer,
        cardRect.x + 10,
        cardRect.y + 24,
        `${card.suit} // ${card.chips} chips // ${card.rarity}`,
        { color: uiColors.textMuted, fontSize: '10px' },
      );
      addUiBadge(
        this.scene,
        this.structuredContainer,
        this.structuredGraphics,
        { x: cardRect.x + cardRect.width - 58, y: cardRect.y + 11, width: 46, height: 18 },
        `x${count}`,
        uiColors.accentGear,
        uiColors.accentGear,
      );
      y += 48;
    }
    this.setStructuredContentHeight(content, y);
    this.detailTitle.setText(i18n.getFeatureString('cardDetailCollection')).setVisible(true);
    this.detailSubtitle.setText('Collection').setVisible(true);
    this.detailRankText.setText('').setVisible(false);
    this.detailBody.setText(i18n.getFeatureString('cardCollectionInfo')).setVisible(true);
  }

  private buildQuestCards(rect: UiRect): void {
    const quests = this.scene.getAcceptedQuestList();
    const content = insetRect(rect, 14);
    addUiText(this.scene, this.structuredContainer, content.x, content.y, 'QUESTS', {
      color: uiColors.textPrimary,
      fontSize: '14px',
      fontStyle: 'bold',
    });
    let y = content.y + 30;
    if (quests.length === 0) {
      addUiText(
        this.scene,
        this.structuredContainer,
        content.x,
        y,
        i18n.getFeatureString('noAcceptedQuests'),
        {
          color: uiColors.textMuted,
          fontSize: '13px',
        },
      );
    }
    for (const quest of quests.slice(0, 5)) {
      const questStrings = i18n.getQuestString(quest.id) ?? {
        label: quest.label,
        description: quest.description,
      };
      const card: UiRect = { x: content.x, y, width: content.width, height: 62 };
      drawUiCard(this.structuredGraphics, {
        rect: card,
        fill: uiColors.panelBgInset,
        stroke: uiColors.accentWorld,
        alpha: 0.62,
        strokeAlpha: 0.58,
      });
      addUiText(this.scene, this.structuredContainer, card.x + 10, card.y + 8, questStrings.label, {
        color: uiColors.textPrimary,
        fontSize: '12px',
        fontStyle: 'bold',
      });
      addUiText(
        this.scene,
        this.structuredContainer,
        card.x + 10,
        card.y + 27,
        questStrings.description,
        {
          color: uiColors.textMuted,
          fontSize: '10px',
          wordWrapWidth: card.width - 28,
        },
      );
      this.addStructuredZone(card, () => {
        const setter = (this.scene as any).setActiveQuestMarkerQuestId;
        const ok = typeof setter === 'function' ? setter.call(this.scene, quest.id) : false;
        this.announce(
          ok ? 'Tracking quest marker.' : 'Quest marker unavailable.',
          ok ? '#9ad1ff' : '#ff6b6b',
          1600,
        );
        this.refresh();
      });
      y += 70;
    }
    this.setStructuredContentHeight(content, y);
    this.detailTitle.setText('Quests').setVisible(true);
    this.detailSubtitle.setText(i18n.getFeatureString('detailAcceptedTasks')).setVisible(true);
    this.detailRankText.setText('').setVisible(false);
    this.detailBody
      .setText('Click a quest card to track its marker when available.')
      .setVisible(true);
  }

  private buildDatingCards(rect: UiRect): void {
    const views = this.handlers.getDatingView?.() ?? [];
    const content = insetRect(rect, 14);
    addUiText(this.scene, this.structuredContainer, content.x, content.y, 'DATING', {
      color: uiColors.textPrimary,
      fontSize: '14px',
      fontStyle: 'bold',
    });
    let y = content.y + 30;
    if (views.length === 0) {
      addUiText(
        this.scene,
        this.structuredContainer,
        content.x,
        y,
        i18n.getFeatureString('noActiveRelationships'),
        {
          color: uiColors.textMuted,
          fontSize: '13px',
        },
      );
    }
    for (const view of views.slice(0, 5)) {
      const card: UiRect = { x: content.x, y, width: content.width, height: 58 };
      drawUiCard(this.structuredGraphics, {
        rect: card,
        fill: uiColors.panelBgInset,
        stroke: uiColors.accentSocial,
        alpha: 0.62,
        strokeAlpha: 0.58,
      });
      addUiText(this.scene, this.structuredContainer, card.x + 10, card.y + 8, view.displayName, {
        color: uiColors.textPrimary,
        fontSize: '12px',
        fontStyle: 'bold',
      });
      addUiText(
        this.scene,
        this.structuredContainer,
        card.x + 10,
        card.y + 28,
        `Aff ${view.affection} // Trust ${view.trust} // Jealousy ${view.jealousy}`,
        { color: uiColors.textMuted, fontSize: '10px' },
      );
      y += 66;
    }
    this.setStructuredContentHeight(content, y);
    this.detailTitle.setText(i18n.getFeatureString('datingTitle')).setVisible(true);
    this.detailSubtitle.setText(i18n.getFeatureString('detailRelationships')).setVisible(true);
    this.detailRankText.setText('').setVisible(false);
    this.detailBody
      .setText('Relationships appear here after opt-in romance choices.')
      .setVisible(true);
  }

  private buildPeopleCards(rect: UiRect): void {
    const views = this.handlers.getPeopleView?.() ?? [];
    const content = insetRect(rect, 14);
    addUiText(this.scene, this.structuredContainer, content.x, content.y, 'PEOPLE', {
      color: uiColors.textPrimary,
      fontSize: '14px',
      fontStyle: 'bold',
    });
    let y = content.y + 30;
    if (views.length === 0) {
      addUiText(this.scene, this.structuredContainer, content.x, y, 'No people known yet.', {
        color: uiColors.textMuted,
        fontSize: '13px',
      });
    }
    for (const view of views.slice(0, 6)) {
      const card: UiRect = { x: content.x, y, width: content.width, height: 48 };
      drawUiCard(this.structuredGraphics, {
        rect: card,
        fill: uiColors.panelBgInset,
        stroke: uiColors.accentWorld,
        alpha: 0.62,
        strokeAlpha: 0.58,
      });
      addUiText(this.scene, this.structuredContainer, card.x + 10, card.y + 7, view.name, {
        color: uiColors.textPrimary,
        fontSize: '12px',
      });
      addUiText(
        this.scene,
        this.structuredContainer,
        card.x + 10,
        card.y + 25,
        `${view.role} // ${view.mood}`,
        {
          color: uiColors.textMuted,
          fontSize: '10px',
        },
      );
      y += 54;
    }
    this.setStructuredContentHeight(content, y);
    this.detailTitle.setText(i18n.getFeatureString('peopleTitle')).setVisible(true);
    this.detailSubtitle.setText(i18n.getFeatureString('detailActorJournal')).setVisible(true);
    this.detailRankText.setText('').setVisible(false);
    this.detailBody
      .setText('NPC memories, social ties, reveals, and mood summaries.')
      .setVisible(true);
  }

  private buildArtifactCards(rect: UiRect): void {
    const artifacts = this.handlers.getArtifactView?.() ?? [];
    const content = insetRect(rect, 14);
    addUiText(this.scene, this.structuredContainer, content.x, content.y, 'ARTIFACTS', {
      color: uiColors.textPrimary,
      fontSize: '14px',
      fontStyle: 'bold',
    });
    let y = content.y + 30;
    if (artifacts.length === 0) {
      addUiText(
        this.scene,
        this.structuredContainer,
        content.x,
        y,
        i18n.getFeatureString('noArtifactsRecovery'),
        {
          color: uiColors.textMuted,
          fontSize: '13px',
        },
      );
    }
    for (const artifact of artifacts.slice(0, 6)) {
      const card: UiRect = { x: content.x, y, width: content.width, height: 52 };
      drawUiCard(this.structuredGraphics, {
        rect: card,
        fill: uiColors.panelBgInset,
        stroke: uiColors.accentExploration,
        alpha: 0.62,
        strokeAlpha: 0.58,
      });
      addUiText(
        this.scene,
        this.structuredContainer,
        card.x + 10,
        card.y + 7,
        `${artifact.icon} ${artifact.name}`,
        {
          color: uiColors.textPrimary,
          fontSize: '12px',
        },
      );
      addUiText(
        this.scene,
        this.structuredContainer,
        card.x + 10,
        card.y + 25,
        artifact.description,
        {
          color: uiColors.textMuted,
          fontSize: '10px',
          wordWrapWidth: card.width - 20,
        },
      );
      y += 60;
    }
    this.setStructuredContentHeight(content, y);
    this.detailTitle.setText(i18n.getFeatureString('artifactsTitle')).setVisible(true);
    this.detailSubtitle.setText(i18n.getFeatureString('detailRunModifiers')).setVisible(true);
    this.detailRankText.setText('').setVisible(false);
    this.detailBody
      .setText('Passive run modifiers recovered from Moleman excavation caches.')
      .setVisible(true);
  }

  private buildLineCards(rect: UiRect, title: string, lines: readonly string[]): void {
    const content = insetRect(rect, 14);
    addUiText(this.scene, this.structuredContainer, content.x, content.y, title, {
      color: uiColors.textPrimary,
      fontSize: '14px',
      fontStyle: 'bold',
    });
    let y = content.y + 30;
    const usableLines = lines.length > 0 ? lines : ['No data available.'];
    for (const line of usableLines.slice(0, 10)) {
      const card: UiRect = { x: content.x, y, width: content.width, height: 34 };
      drawUiCard(this.structuredGraphics, {
        rect: card,
        fill: uiColors.panelBgInset,
        stroke: TAB_ACCENTS[this.activePrimaryTab],
        alpha: 0.56,
        strokeAlpha: 0.5,
      });
      addUiText(this.scene, this.structuredContainer, card.x + 10, card.y + 9, line, {
        color: uiColors.textSecondary,
        fontSize: '11px',
        wordWrapWidth: card.width - 20,
      });
      y += 40;
    }
    this.setStructuredContentHeight(content, y);
  }

  show(): void {
    if (this.visible) {
      return;
    }
    this.visible = true;
    this.container.setVisible(true);
    // Pop-in animation
    this.container.setAlpha(0).setScale(0.96);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scale: 1,
      duration: 180,
      ease: 'Cubic.easeOut',
    });
    this.scene.time.delayedCall(0, () => this.container.setDepth(this.options.depth));
    this.clearPerkDetails(true);
    this.hoveredPerkId = null;
    this.refresh();
    // Start background glints
    this.glintTimer?.remove(false);
    this.glintTimer = this.scene.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        const x = this.container.x + Phaser.Math.Between(40, this.options.width - 40);
        const y = this.container.y + Phaser.Math.Between(120, this.options.height - 80);
        (this.scene as any).juice?.uiSparkle?.(x, y);
      },
    });

    // Pointer-follow tick for hover tooltip
    if (this.hoverTip && !this.hoverTip.ticker) {
      this.hoverTip.ticker = this.scene.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => this.updateHoverTipPosition(),
      });
    }
  }

  hide(): void {
    if (!this.visible) {
      return;
    }
    this.visible = false;
    // Fade-out then hide
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 0.98,
      duration: 140,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.container.setVisible(false).setAlpha(1).setScale(1);
      },
    });
    this.hoveredPerkId = null;
    this.clearPerkDetails(true);
    this.glintTimer?.remove(false);
    this.glintTimer = undefined;
    this.hideHoverTip();
    this.clearCustomizationHover();
  }

  toggle(force?: boolean): void {
    if (force === true) {
      this.show();
      return;
    }
    if (force === false) {
      this.hide();
      return;
    }
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  isInventoryTabActive(): boolean {
    return (
      this.activeTab === 'items' || this.activeTab === 'equipment' || this.activeTab === 'inventory'
    );
  }

  showInventoryDetailsAtPointer(): boolean {
    if (
      !this.visible ||
      (this.activeTab !== 'items' &&
        this.activeTab !== 'equipment' &&
        this.activeTab !== 'inventory')
    ) {
      return false;
    }
    const pointer = this.scene.input.activePointer;
    if (!pointer) {
      return false;
    }
    const index = this.getTextRowIndex(pointer, this.inventoryItemsText.y, this.inventoryItemsText);
    const id = this.inventoryIndex[index];
    if (!id || id.startsWith('unequip:')) {
      this.clearPerkDetails(true);
      return false;
    }
    this.selectedInventoryItemId = id;
    return this.showInventoryItemDetails();
  }

  announce(message: string, color = '#5dd6a2', duration = 2200): void {
    this.hintSticky = true;
    this.setFooterHints([]);
    this.hintText.setText(message);
    this.hintText.setVisible(true);
    this.hintText.setColor(color);
    this.hintTimer?.remove();
    this.hintTimer = this.scene.time.addEvent({
      delay: duration,
      callback: () => {
        this.hintSticky = false;
        this.updateDefaultHint(this.system.getStats());
      },
    });
  }

  showInventoryItemDetails(): boolean {
    if (!this.selectedInventoryItemId) {
      this.announce(i18n.getFeatureString('hintInspectItem'), '#9ad1ff', 2200);
      return false;
    }
    const item = getItem(this.selectedInventoryItemId);
    if (!item) {
      this.announce(i18n.getFeatureString('skillTreeUnknownItem'), '#ff6b6b', 1600);
      return false;
    }
    const title = item.name ?? this.selectedInventoryItemId;
    const subtitle =
      (item as any).kind === 'equipment' ? `Equipment · Slot: ${(item as any).slot}` : 'Item';
    const actionHints = this.getInventoryActionHints(this.selectedInventoryItemId);
    const body = [item.description ?? '', actionHints].filter(Boolean).join('\n\n');

    this.detailTitle.setText(title).setVisible(true);
    this.detailSubtitle.setText(subtitle).setVisible(true);
    this.detailRankText.setText('').setVisible(false);
    this.detailBody.setText(body).setVisible(true);
    return true;
  }

  useSelectedInventoryItem(): boolean {
    if (
      !this.visible ||
      (this.activeTab !== 'items' && this.activeTab !== 'inventory') ||
      !this.selectedInventoryItemId
    ) {
      return false;
    }
    const result = this.scene.snakeGame.useInventoryItem(this.selectedInventoryItemId);
    this.announce(result.message, result.color ?? (result.ok ? '#5dd6a2' : '#ff6b6b'), 2200);
    this.refresh();
    this.showInventoryItemDetails();
    return true;
  }

  cookSelectedInventoryItem(): boolean {
    if (
      !this.visible ||
      (this.activeTab !== 'items' && this.activeTab !== 'inventory') ||
      !this.selectedInventoryItemId
    ) {
      return false;
    }
    const recipeId =
      this.selectedInventoryItemId === 'raw-meat'
        ? 'cook-meat'
        : this.selectedInventoryItemId === 'fish-meat'
          ? 'cook-fish'
          : null;
    if (!recipeId) {
      this.announce('That item does not have a quick cooking recipe.', '#ffd166', 2000);
      return true;
    }
    const result = this.scene.snakeGame.cookRecipe(recipeId);
    this.announce(result.message, result.color ?? (result.ok ? '#5dd6a2' : '#ff6b6b'), 2200);
    this.refresh();
    this.showInventoryItemDetails();
    return true;
  }

  private getInventoryActionHints(itemId: string): string {
    const item = getItem(itemId) as any;
    if (!item || item.kind === 'equipment') {
      return 'Click to equip or unequip.';
    }
    const hints = [i18n.getFeatureString('hintPressInspect')];
    if (item.category === 'food' || item.kind === 'consumable') {
      hints.push('Press U to use.');
    }
    if (itemId === 'raw-meat' || itemId === 'fish-meat') {
      hints.push('Press C to cook near a cooking source.');
    }
    return hints.join(' ');
  }

  handleCheatKeyDown(event: KeyboardEvent): boolean {
    if (!this.visible || this.activeTab !== 'cheats') {
      return false;
    }

    this.cheatInputFocused = true;
    const key = event.key;
    if (key === 'Enter') {
      this.applyCheatCode();
      return true;
    }
    if (key === 'Backspace') {
      this.cheatCode = this.cheatCode.slice(0, -1);
      this.refreshCheatInputText();
      return true;
    }
    if (key === 'Escape') {
      this.cheatInputFocused = false;
      this.refreshCheatInputText();
      return true;
    }
    if (key.length === 1 && this.cheatCode.length < 64) {
      this.cheatCode += key;
      this.refreshCheatInputText();
      return true;
    }
    return key === ' ' || key === 'Tab';
  }

  private applyCheatCode(): void {
    if (!this.scene.snakeGame || !this.scene.currentRoomId) {
      this.announce('Cannot use cheats in current game state', '#ff6b6b', 2000);
      return;
    }

    const result = this.scene.applyCheatCode(this.cheatCode);
    this.announce(result.message, result.color, 2200);
    if (result.ok) {
      this.cheatCode = '';
    }
    this.refreshCheatInputText();
    this.refresh();
  }

  private refreshCheatInputText(): void {
    const placeholder = this.cheatInputFocused ? '' : 'click here and type a cheat';
    const value = this.cheatCode || placeholder;
    const cursor = this.cheatInputFocused ? '_' : '';
    this.cheatInputText.setText(`> ${value}${cursor}`);
  }

  private highlightInventoryItem(itemId: string): void {
    if (
      !this.visible ||
      (this.activeTab !== 'items' &&
        this.activeTab !== 'equipment' &&
        this.activeTab !== 'inventory')
    )
      return;
    const index = this.inventoryIndex.indexOf(itemId);
    if (index < 0) return;
    const lineHeight = 24;
    const x = TREE_PADDING.horizontal;
    const y = TREE_PADDING.top + index * lineHeight - 2;
    const width =
      this.options.width - DETAIL_PANEL_WIDTH - DETAIL_PANEL_MARGIN - TREE_PADDING.horizontal * 2;
    const height = 20;

    // Cleanup old highlight
    if (this.inventoryHighlight) {
      this.inventoryHighlight.destroy();
    }

    const rect = this.scene.add.rectangle(x, y, width, height, 0x4da3ff, 0.22).setOrigin(0, 0);
    this.container.add(rect);
    this.inventoryHighlight = rect;
    this.scene.tweens.add({
      targets: rect,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.easeOut',
      onComplete: () => rect.destroy(),
    });
  }

  private getTextRowIndex(
    pointer: Phaser.Input.Pointer,
    textY: number,
    text: Phaser.GameObjects.Text,
    topBias = CLICK_ROW_TOP_BIAS,
  ): number {
    const lineHeight = this.getTextLineHeight(text);
    const localY = pointer.worldY - this.container.y - textY - topBias;
    return Math.floor(localY / lineHeight);
  }

  private getTextLineHeight(text: Phaser.GameObjects.Text): number {
    const renderedLines = text.getWrappedText(text.text).length;
    if (renderedLines > 0 && text.height > 0) {
      return Math.max(1, text.height / renderedLines);
    }
    const style = text.style as unknown as {
      fontSize?: string | number;
      lineSpacing?: number;
      metrics?: { fontSize?: number; ascent?: number; descent?: number };
    };
    const parsedFontSize =
      typeof style.fontSize === 'string'
        ? Number.parseFloat(style.fontSize)
        : Number(style.fontSize ?? 16);
    const metricsHeight =
      typeof style.metrics?.fontSize === 'number'
        ? style.metrics.fontSize
        : typeof style.metrics?.ascent === 'number' && typeof style.metrics?.descent === 'number'
          ? style.metrics.ascent + style.metrics.descent
          : parsedFontSize;
    return Math.max(
      1,
      Math.ceil(
        (Number.isFinite(metricsHeight) ? metricsHeight : 16) + Number(style.lineSpacing ?? 0),
      ),
    );
  }

  private getScrollableViewportHeight(): number {
    return this.options.height - TREE_PADDING.top - TREE_PADDING.bottom + 12;
  }

  private scrollActiveText(deltaY: number): void {
    if (
      !this.visible ||
      (this.activeTab !== 'spells' &&
        this.activeTab !== 'special' &&
        this.activeTab !== 'quests' &&
        this.activeTab !== 'people' &&
        this.activeTab !== 'dating' &&
        this.activeTab !== 'destiny' &&
        this.activeTab !== 'customize' &&
        this.activeTab !== 'equipment' &&
        this.activeTab !== 'items' &&
        this.activeTab !== 'cards' &&
        this.activeTab !== 'artifacts' &&
        this.activeTab !== 'inventory')
    ) {
      return;
    }
    if (this.activeTab === 'special') {
      this.applySpecialChanceScrollOffset(this.specialChanceScrollOffset + deltaY);
      return;
    }
    if (this.isStructuredTab(this.activeTab)) {
      this.applyStructuredScrollOffset((this.scrollOffsets[this.activeTab] ?? 0) + deltaY);
      return;
    }
    const text =
      this.activeTab === 'inventory'
        ? this.inventoryItemsText
        : this.activeTab === 'equipment' || this.activeTab === 'items'
          ? this.questListText
          : this.activeTab === 'spells'
            ? this.spellsText
            : this.activeTab === 'customize'
              ? this.customizationText
              : this.questListText;
    const next = (this.scrollOffsets[this.activeTab] ?? 0) + deltaY;
    this.applyScrollableTextOffset(this.activeTab, text, next);
  }

  private isStructuredTab(tab: TabId): boolean {
    return (
      tab === 'equipment' ||
      tab === 'items' ||
      tab === 'spells' ||
      tab === 'cards' ||
      tab === 'quests' ||
      tab === 'dating' ||
      tab === 'people' ||
      tab === 'destiny' ||
      tab === 'artifacts' ||
      tab === 'info'
    );
  }

  private applyStructuredScrollOffset(rawOffset: number): void {
    const viewport = this.getStructuredViewport();
    const maxScroll = Math.max(0, this.structuredContentHeight - viewport.height);
    this.scrollOffsets[this.activeTab] = Phaser.Math.Clamp(rawOffset, 0, maxScroll);
    this.buildStructuredTabContent(this.activeTab);
  }

  private applyScrollableTextOffset(
    tab: TabId,
    text: Phaser.GameObjects.Text,
    rawOffset?: number,
  ): void {
    const maxScroll = Math.max(0, text.height - this.getScrollableViewportHeight());
    const offset = Phaser.Math.Clamp(rawOffset ?? this.scrollOffsets[tab] ?? 0, 0, maxScroll);
    this.scrollOffsets[tab] = offset;
    text.setY(TREE_PADDING.top - 12 - offset);
    this.scrollHintText
      .setText(
        maxScroll > 0
          ? i18n
              .getFeatureString('skillTreeScrollProgress')
              .replace('{current}', String(Math.ceil(offset)))
              .replace('{max}', String(Math.ceil(maxScroll)))
          : '',
      )
      .setVisible(
        (tab === 'spells' ||
          tab === 'quests' ||
          tab === 'people' ||
          tab === 'dating' ||
          tab === 'customize' ||
          tab === 'equipment' ||
          tab === 'items' ||
          tab === 'inventory') &&
          maxScroll > 0,
      );
  }

  private resetScrollableText(text: Phaser.GameObjects.Text): void {
    text.setY(TREE_PADDING.top - 12);
    this.scrollHintText.setVisible(false).setText('');
  }

  private getSpecialChanceViewportHeight(): number {
    return this.detailPanel.height - 28;
  }

  private applySpecialChanceScrollOffset(rawOffset = this.specialChanceScrollOffset): void {
    const maxScroll = Math.max(
      0,
      this.specialDerivedContentHeight - this.getSpecialChanceViewportHeight(),
    );
    const offset = Phaser.Math.Clamp(rawOffset, 0, maxScroll);
    this.specialChanceScrollOffset = offset;
    this.specialChanceText.setY(this.detailPanel.y + 14 - offset);
    if (this.visible && this.activeTab === 'special') {
      const view = this.handlers.getSpecialView?.();
      if (view) {
        this.buildSpecialDerivedContent(view);
        this.drawSpecialUi(view);
      }
    }
    void maxScroll;
    this.scrollHintText.setVisible(false).setText('');
  }

  private highlightCustomizationRow(row: number): void {
    if (!this.visible || this.activeTab !== 'customize') return;
    const lineHeight = this.getTextLineHeight(this.customizationText);
    const x = TREE_PADDING.horizontal - 4;
    const y = this.customizationText.y + row * lineHeight - 2;
    const availableWidth =
      this.options.width -
      DETAIL_PANEL_WIDTH -
      DETAIL_PANEL_MARGIN -
      TREE_PADDING.horizontal * 2 +
      8;
    const width = Math.min(390, availableWidth);
    const height = Math.max(20, lineHeight - 2);

    if (!this.customizationHoverHighlight) {
      this.customizationHoverHighlight = this.scene.add
        .rectangle(x, y, width, height, 0x244155, 0.72)
        .setStrokeStyle(1, 0x5dd6a2, 0.72)
        .setOrigin(0, 0);
      this.container.add(this.customizationHoverHighlight);
    }

    this.customizationHoverHighlight.setPosition(x, y).setSize(width, height).setVisible(true);
  }

  private clearCustomizationHover(): void {
    this.customizationHoverHighlight?.setVisible(false);
  }

  private getCustomizationHoveredRow(
    pointer: Phaser.Input.Pointer,
  ): { row: number; actionId: string } | null {
    const visualRow = this.getTextRowIndex(
      pointer,
      this.customizationText.y,
      this.customizationText,
      0,
    );
    for (const entry of this.customizationRowMap) {
      if (entry.row === visualRow) {
        return entry;
      }
    }
    return null;
  }

  private getCustomizationActionId(pointer: Phaser.Input.Pointer): string | null {
    return this.getCustomizationHoveredRow(pointer)?.actionId ?? null;
  }

  private countRenderedLines(value: string): number {
    return this.countRenderedLinesFor(this.customizationText, value);
  }

  private countRenderedLinesFor(text: Phaser.GameObjects.Text, value: string): number {
    if (!value) {
      return 1;
    }
    const wrapped = text.getWrappedText(value);
    return Math.max(1, wrapped.length);
  }

  private refreshSpellsText(): void {
    const views = this.handlers.getSpellSlotView?.() ?? [];
    const bound = views.find((view) => view.bound);
    const qSlotLabel = i18n.getFeatureString('detailQSlot');
    const lines: string[] = [
      `${qSlotLabel}: ${bound?.label ?? i18n.getFeatureString('skillTreeUnequipped')}`,
      '',
    ];
    const rowMap: Array<{
      startRow: number;
      endRow: number;
      abilityId: string;
      canBind: boolean;
    }> = [];
    let visualRow = 2;

    if (views.length === 0) {
      lines.push(i18n.getFeatureString('noSpellAvailable'));
      this.spellRowMap = [];
      this.spellsText.setText(lines.join('\n'));
      return;
    }

    lines.push(i18n.getFeatureString('hintClickAvailableAbility'), '');
    visualRow += 2;

    for (const view of views) {
      const tags: string[] = [view.kind.toUpperCase()];
      if (view.bound) {
        tags.push('BOUND');
      } else if (!view.canBind) {
        tags.push('LOCKED');
      }
      if (view.manaCost !== undefined) {
        tags.push(`${view.manaCost} MANA`);
      }

      const startRow = visualRow;
      const line = `${view.bound ? '> ' : '  '}${view.label} [${tags.join(' / ')}]`;
      lines.push(line);
      visualRow += this.countRenderedLinesFor(this.spellsText, line);

      const description = `    ${view.description}`;
      lines.push(description);
      visualRow += this.countRenderedLinesFor(this.spellsText, description);

      if (view.disabledReason) {
        const disabledLine = `    ${view.disabledReason}`;
        lines.push(disabledLine);
        visualRow += this.countRenderedLinesFor(this.spellsText, disabledLine);
      }

      rowMap.push({
        startRow,
        endRow: Math.max(startRow, visualRow - 1),
        abilityId: view.id,
        canBind: view.canBind,
      });
      lines.push('');
      visualRow += 1;
    }

    this.spellRowMap = rowMap;
    this.spellsText.setText(lines.join('\n'));
  }

  private refreshSpecialPanel(): void {
    const view = this.handlers.getSpecialView?.();
    if (!view) {
      this.clearSpecialMainContent();
      this.clearSpecialDerivedContent();
      addUiText(
        this.scene,
        this.specialMainContainer,
        MAIN_PANEL_X,
        MAIN_PANEL_Y,
        'SPECIAL data unavailable.',
        { color: uiColors.valueNegative, fontSize: '13px' },
      );
      this.specialChanceText.setText('CHANCES\n\nNo stat service is connected.');
      this.specialRowMap = [];
      this.specialUiGraphics.clear();
      return;
    }

    this.drawSpecialUi(view);
    this.buildSpecialMainContent(view);
    this.buildSpecialDerivedContent(view);
    this.specialStatsText.setText('');
    this.specialChanceText.setText('');
    this.specialRowMap = [];
    this.applySpecialChanceScrollOffset();
    this.drawSpecialUi(view);
  }

  private buildSpecialHeadlineRows(
    view: SpecialStatsView,
  ): Array<{ label: string; value: string }> {
    const core = this.buildSpecialCoreDerivedRows(view);
    return [
      core.find((row) => row.id === 'speed') ?? { id: 'speed', label: 'Speed', value: '+0%' },
      core.find((row) => row.id === 'max-hearts') ?? {
        id: 'max-hearts',
        label: 'Hearts',
        value: '3',
      },
      core.find((row) => row.id === 'apple-invulnerability') ?? {
        id: 'apple-invulnerability',
        label: 'Apple Invuln.',
        value: '0.0s',
      },
      core.find((row) => row.id === 'frost-resistance') ?? {
        id: 'frost-resistance',
        label: 'Frost Resist',
        value: '0%',
      },
    ].map((row) => {
      if (row.id === 'max-hearts') return { ...row, label: 'Hearts' };
      if (row.id === 'apple-invulnerability') return { ...row, label: 'Apple Invuln.' };
      if (row.id === 'frost-resistance') return { ...row, label: 'Frost Resist' };
      return row;
    });
  }

  private buildSpecialCoreDerivedRows(
    view: SpecialStatsView,
  ): Array<{ id: string; label: string; value: string; detail?: string }> {
    const skillStats = this.system.getStats();
    const readFlagNumber = (key: string, fallback = 0): number => {
      const getter = (this.scene as unknown as { getFlag?: <T>(key: string) => T | undefined })
        .getFlag;
      const value = getter?.call(this.scene, key);
      return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    };
    const readFlagBool = (key: string): boolean => {
      const getter = (this.scene as unknown as { getFlag?: <T>(key: string) => T | undefined })
        .getFlag;
      return getter?.call(this.scene, key) === true;
    };
    const maxHealth = readFlagNumber('player.maxHealth', 3);
    const actionStepMs =
      (
        this.scene as unknown as { getActionStepIntervalMs?: () => number }
      ).getActionStepIntervalMs?.() ?? 100;
    const appleInvulnerabilityTicks =
      readFlagNumber('fortitude.invulnerabilityTicks') +
      readFlagNumber('fortitude.invulnerabilityBonus') +
      readFlagNumber('equipment.invulnerabilityBonus');
    const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
    const formatSignedPercent = (value: number) =>
      `${value >= 0 ? '+' : ''}${Math.round(value * 100)}%`;
    const findLine = (id: string) =>
      view.sections.flatMap((section) => section.lines).find((line) => line.id === id);
    const treasure = findLine('treasure-discovery');
    const powerup = findLine('powerup-discovery');
    const specialApple = findLine('special-apple');
    const rareApple = findLine('rare-apple');
    const fishing = findLine('fishing-control');
    const animalDrop = findLine('animal-bonus-drop');
    const suspicion = findLine('suspicionReduction');

    return [
      {
        id: 'speed',
        label: 'Speed',
        value: `+${skillStats.speedRank * 5}%`,
        detail: `${skillStats.speedRank} momentum rank${skillStats.speedRank === 1 ? '' : 's'}`,
      },
      {
        id: 'max-hearts',
        label: 'Max Hearts',
        value: `${maxHealth}`,
        detail: `${skillStats.extraLives} extra life charge${skillStats.extraLives === 1 ? '' : 's'}`,
      },
      {
        id: 'apple-invulnerability',
        label: 'Apple Invulnerability',
        value: `${((appleInvulnerabilityTicks * actionStepMs) / 1000).toFixed(1)}s`,
        detail: `${appleInvulnerabilityTicks} action ticks`,
      },
      {
        id: 'post-hit-invulnerability',
        label: 'Post-Hit Invulnerability',
        value: `${(readFlagNumber('damage.postHitInvulnerabilityMs') / 1000).toFixed(1)}s`,
      },
      {
        id: 'frost-resistance',
        label: 'Frost Resistance',
        value: formatPercent(readFlagNumber('equipment.coldResistance')),
      },
      {
        id: 'heat-resistance',
        label: 'Heat Resistance',
        value: formatPercent(readFlagNumber('equipment.heatResistance')),
      },
      {
        id: 'buoyancy',
        label: 'Buoyancy',
        value: readFlagBool('equipment.swimmingEnabled') ? '100%' : '0%',
      },
      {
        id: 'water-speed',
        label: 'Water Speed',
        value: readFlagBool('equipment.swimmingEnabled') ? '85%' : '0%',
      },
      {
        id: 'treasure-discovery',
        label: 'Treasure Discovery',
        value: treasure?.value ?? '10%',
        detail: treasure?.detail,
      },
      {
        id: 'powerup-discovery',
        label: 'Powerup Discovery',
        value: powerup?.value ?? '10%',
        detail: powerup?.detail,
      },
      {
        id: 'special-apple',
        label: 'Special Apple Chance',
        value: specialApple?.value ?? '0%',
        detail: specialApple?.detail,
      },
      {
        id: 'rare-apple',
        label: 'Rare Apple Chance',
        value: rareApple?.value ?? '0%',
        detail: rareApple?.detail,
      },
      {
        id: 'fishing-control',
        label: 'Fishing Control',
        value: fishing?.value ?? '+0%',
      },
      {
        id: 'animal-bonus-drop',
        label: 'Animal Bonus Drop',
        value: animalDrop?.value ?? '+0%',
      },
      {
        id: 'suspicion-reduction',
        label: 'Suspicion Reduction',
        value: suspicion?.value ?? formatSignedPercent(0),
      },
    ];
  }

  private buildSpecialDerivedGroups(view: SpecialStatsView): DerivedStatGroupView[] {
    const rows = this.buildSpecialCoreDerivedRows(view);
    const byId = new Map(rows.map((row) => [row.id, row]));
    const fromCore = (id: string, label?: string): DerivedStatRowView | null => {
      const row = byId.get(id);
      return row
        ? { id: row.id, label: label ?? row.label, value: row.value, breakdown: row.detail }
        : null;
    };
    const fromSection = (id: string, fallbackLabel?: string): DerivedStatRowView | null => {
      const line = view.sections
        .flatMap((section) => section.lines)
        .find((entry) => entry.id === id);
      return line
        ? {
            id: line.id,
            label: fallbackLabel ?? line.label,
            value: line.value,
            breakdown: line.detail,
          }
        : null;
    };
    const compact = (rows: Array<DerivedStatRowView | null>) =>
      rows.filter(Boolean) as DerivedStatRowView[];
    const groups: DerivedStatGroupView[] = [
      {
        id: 'core',
        title: 'Core',
        accent: uiColors.accentCore,
        rows: compact([
          fromCore('speed'),
          fromCore('max-hearts'),
          fromCore('post-hit-invulnerability'),
        ]),
      },
      {
        id: 'apples',
        title: 'Apples',
        accent: uiColors.accentGrowth,
        rows: compact([
          fromCore('apple-invulnerability'),
          fromSection('apple-bloom'),
          fromSection('bonus-apple-count'),
          fromCore('special-apple'),
          fromCore('rare-apple'),
          fromSection('apple-score-multiplier'),
          fromSection('apple-shockwave-radius'),
        ]),
      },
      {
        id: 'survival',
        title: 'Survival',
        accent: uiColors.accentSurvival,
        rows: compact([
          fromCore('frost-resistance'),
          fromCore('heat-resistance'),
          fromSection('damage-reduction'),
          fromSection('powerup-invulnerability'),
        ]),
      },
      {
        id: 'terrain',
        title: 'Terrain',
        accent: uiColors.accentUtility,
        rows: compact([
          fromCore('buoyancy'),
          fromCore('water-speed'),
          fromSection('wall-eating-chance'),
          fromSection('seismic-radius'),
          fromSection('terra-shield-charges'),
        ]),
      },
      {
        id: 'exploration',
        title: 'Exploration',
        accent: uiColors.accentExploration,
        rows: compact([
          fromCore('treasure-discovery', 'Treasure Discovery Chance'),
          fromCore('powerup-discovery', 'Powerup Discovery Chance'),
          fromSection('hazard-sense'),
          fromSection('wall-sense-radius'),
        ]),
      },
      {
        id: 'fishing',
        title: 'Fishing',
        accent: uiColors.accentFlow,
        rows: compact([
          fromCore('fishing-control'),
          fromSection('fishing-stability'),
          fromSection('fish-retention'),
          fromSection('rare-catch'),
        ]),
      },
      {
        id: 'hunting',
        title: 'Hunting',
        accent: uiColors.accentCommand,
        rows: compact([
          fromCore('animal-bonus-drop'),
          fromSection('animal-double-drop'),
          fromSection('meat-recovery'),
        ]),
      },
      {
        id: 'social',
        title: 'Social',
        accent: uiColors.accentSocial,
        rows: compact([
          fromCore('suspicion-reduction'),
          fromSection('fine-reduction'),
          fromSection('affection-gain'),
          fromSection('trust-gain'),
          fromSection('apology-effectiveness'),
          fromSection('intimidation-control'),
        ]),
      },
    ];
    return groups.filter((group) => group.rows.length > 0);
  }

  private buildSpecialDerivedContent(view: SpecialStatsView): void {
    this.clearSpecialDerivedContent();
    const g = this.specialDerivedGraphics;
    const detailRect: UiRect = {
      x: this.detailPanel.x,
      y: this.detailPanel.y,
      width: this.detailPanel.width,
      height: this.detailPanel.height,
    };
    const content = insetRect(detailRect, 14);
    const groups = this.buildSpecialDerivedGroups(view);
    addUiText(this.scene, this.specialDerivedContainer, content.x, content.y, 'DERIVED STATS', {
      color: uiColors.textPrimary,
      fontSize: '15px',
      fontStyle: 'bold',
    });
    let y = content.y + 30 - this.specialChanceScrollOffset;
    const clipTop = content.y + 34;
    const clipBottom = detailRect.y + detailRect.height - 12;
    for (const group of groups) {
      const headerH = 24;
      if (y >= clipTop && y + headerH <= clipBottom) {
        drawUiCard(g, {
          rect: { x: content.x, y, width: content.width - 8, height: headerH },
          fill: group.accent,
          stroke: group.accent,
          alpha: 0.2,
          strokeAlpha: 0.82,
          radius: 5,
        });
        g.fillStyle(group.accent, 0.18).fillRect(content.x + 2, y + headerH - 3, content.width - 12, 1);
        g.fillStyle(group.accent, 0.86).fillRoundedRect(content.x + 8, y + 6, 12, 12, 3);
        addUiText(
          this.scene,
          this.specialDerivedContainer,
          content.x + 28,
          y + 5,
          group.title.toUpperCase(),
          {
            color: uiColors.textPrimary,
            fontSize: '11px',
            fontStyle: 'bold',
          },
        );
      }
      y += headerH + 6;
      for (const row of group.rows) {
        const rowH = row.breakdown ? 40 : 28;
        if (y >= clipTop && y + rowH <= clipBottom) {
          drawUiCard(g, {
            rect: { x: content.x, y, width: content.width - 8, height: rowH },
            fill: uiColors.panelBgInset,
            stroke: row.accent ?? group.accent,
            alpha: 0.58,
            strokeAlpha: 0.44,
            radius: 5,
          });
          addUiText(this.scene, this.specialDerivedContainer, content.x + 10, y + 7, row.label, {
            color: uiColors.textSecondary,
            fontSize: '11px',
            wordWrapWidth: content.width - 90,
          });
          addUiText(
            this.scene,
            this.specialDerivedContainer,
            content.x + content.width - 18,
            y + 7,
            row.value,
            {
              align: 'right',
              color: uiColors.valuePrimary,
              fontSize: '12px',
              fontStyle: 'bold',
            },
          );
          if (row.breakdown) {
            addUiText(
              this.scene,
              this.specialDerivedContainer,
              content.x + 10,
              y + 24,
              row.breakdown,
              {
                color: uiColors.textMuted,
                fontSize: '9px',
                wordWrapWidth: content.width - 24,
              },
            );
          }
        }
        y += rowH + 6;
      }
      y += 4;
    }
    this.specialDerivedContentHeight = Math.max(0, y + this.specialChanceScrollOffset - content.y);
  }

  refresh(): void {
    if (this.activeTab === 'inventory') {
      this.activeTab = 'items';
      this.activePrimaryTab = 'gear';
    }
    if (!this.isTabAvailable(this.activeTab)) {
      this.activeTab = 'skills';
      this.activePrimaryTab = 'growth';
      this.updateTabVisuals();
    }
    const stats = this.system.getStats();
    const perks = this.system.getPerks();

    this.scoreText.setText(i18n.getFeatureString('hudScore') + ': ' + this.scene.score);
    if (stats.manaMax > 0) {
      const manaLine =
        'Mana: ' +
        stats.mana.toFixed(0) +
        '/' +
        stats.manaMax.toFixed(0) +
        ' (+' +
        stats.manaRegen.toFixed(1) +
        '/tick)';
      this.manaText.setText(manaLine);
    } else {
      this.manaText.setText(i18n.getFeatureString('manaLatent'));
    }

    if (!this.hintSticky) {
      this.updateDefaultHint(stats);
    }

    const skillsActive = this.activeTab === 'skills';
    const specialActive = this.activeTab === 'special';
    const equipmentActive = this.activeTab === 'equipment';
    const itemsActive = this.activeTab === 'items';
    const inventoryActive = equipmentActive || itemsActive;
    const customizationActive = this.activeTab === 'customize';
    const cardsActive = this.activeTab === 'cards';
    const spellsActive = this.activeTab === 'spells';
    const cheatsActive = this.activeTab === 'cheats';
    const peopleActive = this.activeTab === 'people';
    const datingActive = this.activeTab === 'dating';
    const questsActive = this.activeTab === 'quests';
    const factionsActive = this.activeTab === 'factions';
    const destinyActive = this.activeTab === 'destiny';
    const artifactsActive = this.activeTab === 'artifacts';
    const infoActive = this.activeTab === 'info';
    const graphActive = this.activeTab === 'graph';
    const structuredActive =
      inventoryActive ||
      equipmentActive ||
      itemsActive ||
      cardsActive ||
      spellsActive ||
      peopleActive ||
      datingActive ||
      questsActive ||
      destinyActive ||
      artifactsActive ||
      infoActive;
    this.connectionGraphics.setVisible(skillsActive);
    this.specialUiGraphics.setVisible(specialActive);
    this.specialMainContainer.setVisible(specialActive);
    this.specialDerivedContainer.setVisible(specialActive);
    this.specialStatsText.setVisible(false);
    this.specialChanceText.setVisible(false);
    this.inventoryItemsText.setVisible(false);
    this.customizationText.setVisible(false);
    this.styleContainer.setVisible(customizationActive);
    this.cardsText.setVisible(false);
    this.spellsText.setVisible(false);
    this.questListText.setVisible(false);
    this.factionsText.setVisible(false);
    this.factionContainer.setVisible(factionsActive);
    this.structuredContainer.setVisible(structuredActive);
    if (
      !spellsActive &&
      !specialActive &&
      !questsActive &&
      !datingActive &&
      !peopleActive &&
      !destinyActive &&
      !artifactsActive &&
      !customizationActive
    ) {
      this.scrollHintText.setVisible(false);
    }
    if (!spellsActive) {
      this.resetScrollableText(this.spellsText);
    }
    if (!specialActive) {
      this.specialUiGraphics.clear();
      this.clearSpecialMainContent();
      this.clearSpecialDerivedContent();
      this.resetScrollableText(this.specialStatsText);
      this.specialChanceText.setY(this.detailPanel.y + 14);
      this.specialChanceScrollOffset = 0;
    }
    if (!questsActive && !datingActive && !peopleActive && !destinyActive && !artifactsActive) {
      this.resetScrollableText(this.questListText);
    }
    if (!customizationActive) {
      this.resetScrollableText(this.customizationText);
      this.clearStyleContent();
    }
    if (!factionsActive) {
      this.clearFactionContent();
    }
    if (!structuredActive) {
      this.clearStructuredContent();
    }
    if (!inventoryActive) {
      this.resetScrollableText(this.inventoryItemsText);
    }
    if (!customizationActive) {
      this.clearCustomizationHover();
    }
    const mapActive = this.activeTab === 'map';
    this.mapContainer.setVisible(mapActive);
    this.mapBackground.setVisible(mapActive);
    this.mapTitle.setVisible(mapActive);
    this.mapGraphics.setVisible(mapActive);
    if (mapActive) {
      this.drawMapPanel();
      this.populateMapDetailPanel();
    } else {
      this.mapGraphics.clear();
    }
    this.graphContainer.setVisible(graphActive);
    this.graphBackground.setVisible(graphActive);
    this.graphTitle.setVisible(graphActive);
    this.graphGraphics.setVisible(graphActive);
    this.graphLabels.setVisible(graphActive);
    if (graphActive) {
      this.drawLuckGraphPanel();
    } else {
      this.graphGraphics.clear();
      this.graphLabels.setText('');
    }
    this.cheatContainer.setVisible(cheatsActive);
    this.cheatBackground.setVisible(cheatsActive);
    this.cheatTitle.setVisible(cheatsActive);
    this.cheatInputText.setVisible(cheatsActive);
    this.cheatApplyButton.setVisible(cheatsActive);
    if (cheatsActive) {
      this.cheatApplyButton.setText(i18n.getFeatureString('cheatApply'));
      this.refreshCheatInputText();
    } else {
      this.cheatInputFocused = false;
    }

    if (this.stubText) {
      const mapActive = this.activeTab === 'map';
      const showStub =
        !skillsActive &&
        !specialActive &&
        !inventoryActive &&
        !customizationActive &&
        !cardsActive &&
        !spellsActive &&
        !mapActive &&
        !graphActive &&
        !cheatsActive &&
        !peopleActive &&
        !datingActive &&
        !destinyActive &&
        !artifactsActive &&
        !questsActive &&
        !factionsActive &&
        !infoActive;
      this.stubText.setVisible(showStub);
      if (showStub) {
        const tab = TAB_DEFINITIONS.find((def) => def.id === this.activeTab);
        this.stubText.setText(
          tab?.i18nPlaceholderKey
            ? resolvePlaceholder(tab)
            : i18n.getFeatureString('skillTreeStubText'),
        );
      }
    }

    if (specialActive) {
      this.detailPanel.setVisible(false);
      this.refreshSpecialPanel();
      this.detailTitle.setVisible(false);
      this.detailSubtitle.setVisible(false);
      this.detailRankText.setVisible(false);
      this.detailBody.setVisible(false);
      if (!this.hintSticky) {
        this.hintText.setText('SPECIAL: click +/- to preview, then apply or reset.');
        this.hintText.setColor('#9ad1ff');
      }
    } else {
      this.detailPanel.setVisible(true);
    }

    if (structuredActive) {
      this.buildStructuredTabContent(this.activeTab);
      if (!this.hintSticky) {
        const hintByTab: Partial<Record<TabId, string>> = {
          inventory: i18n.getFeatureString('hintInventory'),
          equipment: 'Equipment: click slots to equip or unequip.',
          items: 'Items: click rows for details. Press U to use selected consumables.',
          cards: i18n.getFeatureString('cardHintCards'),
          spells: i18n.getFeatureString('hintSpells'),
          people: i18n.getFeatureString('hintPeople'),
          dating: i18n.getFeatureString('hintDating'),
          quests: i18n.getFeatureString('hintQuests'),
          destiny: i18n.getFeatureString('hintDestiny'),
          artifacts: i18n.getFeatureString('hintArtifacts'),
          info: 'Browse grouped menu systems and current run tools.',
        };
        this.hintText.setText(
          hintByTab[this.activeTab] ?? i18n.getFeatureString('skillTreeStubText'),
        );
        this.hintText.setColor('#9ad1ff');
      }
    }

    if (!structuredActive && inventoryActive) {
      const items = this.scene.inventory.getAllItems();
      if (items.length === 0) {
        this.inventoryItemsText.setText(i18n.getFeatureString('noItemsInInventory'));
        this.inventoryIndex = [];
      } else {
        const lines: string[] = [];
        const index: string[] = [];
        const slots: EquipmentSlot[] = [
          'weapon',
          'boots',
          'helm',
          'ring',
          'gloves',
          'cloak',
          'belt',
          'amulet',
        ] as unknown as EquipmentSlot[];
        for (const slot of slots) {
          const current = this.scene.inventory.getEquipped(slot as EquipmentSlot);
          if (current) {
            const label = (slot as string).charAt(0).toUpperCase() + (slot as string).slice(1);
            lines.push(`[Unequip ${label}]`);
            index.push(`unequip:${slot}`);
          }
        }
        for (const [itemId, count] of items) {
          const item = getItem(itemId) as any;
          const name = item?.name ?? itemId;
          let suffix = '';
          if (item && item.kind === 'equipment') {
            const isEq = this.scene.inventory.getEquipped(item.slot as EquipmentSlot) === itemId;
            if (isEq) suffix = ` (${i18n.getFeatureString('labelEquipped')})`;
          }
          const category = item?.category ? String(item.category) : 'item';
          const prefix =
            item?.kind === 'equipment' ? '[E] ' : `[${category.charAt(0).toUpperCase()}] `;
          lines.push(`${prefix}${name} x${count}${suffix}`);
          index.push(itemId);
        }
        this.inventoryItemsText.setText(lines.join('\n'));
        this.inventoryIndex = index;
        if (!this.hintSticky) {
          this.hintText.setText(i18n.getFeatureString('hintInventory'));
          this.hintText.setColor('#9ad1ff');
        }
      }
    }

    if (!structuredActive && cardsActive) {
      this.cardsText.setText(this.formatCardCollection(this.scene.getCardCollectionForMenu()));
      this.detailTitle.setText(i18n.getFeatureString('cardDetailCollection')).setVisible(true);
      this.detailSubtitle.setText('Collection').setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody.setText(i18n.getFeatureString('cardCollectionInfo')).setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText(i18n.getFeatureString('cardHintCards'));
        this.hintText.setColor('#9ad1ff');
      }
    }

    if (!structuredActive && spellsActive) {
      this.refreshSpellsText();
      this.applyScrollableTextOffset('spells', this.spellsText);
      this.detailTitle.setText(i18n.getFeatureString('detailQSlot')).setVisible(true);
      this.detailSubtitle.setText(i18n.getFeatureString('detailSpellsTitle')).setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'Q now resolves through a bindable action slot. Spell casts can share this tab with future follower commands.',
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText(i18n.getFeatureString('hintSpells'));
        this.hintText.setColor('#ffbdfd');
      }
    }

    if (!structuredActive && questsActive) {
      this.questListText.setText(this.formatQuestInfo(this.scene.getAcceptedQuestList()));
      this.applyScrollableTextOffset('quests', this.questListText);
      this.detailTitle.setText('Quests').setVisible(true);
      this.detailSubtitle.setText(i18n.getFeatureString('detailAcceptedTasks')).setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'Only quests accepted during this run appear here. Accepted or completed quests are not offered again.',
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText(i18n.getFeatureString('hintQuests'));
        this.hintText.setColor('#9ad1ff');
      }
    }

    if (!structuredActive && datingActive) {
      this.questListText.setText(this.formatDatingInfo(this.handlers.getDatingView?.() ?? []));
      this.applyScrollableTextOffset('dating', this.questListText);
      this.detailTitle.setText(i18n.getFeatureString('datingTitle')).setVisible(true);
      this.detailSubtitle.setText(i18n.getFeatureString('detailRelationships')).setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'Romance is opt-in. Flirt, gift, or ask someone out in dialogue to create a route. Jealousy and neglect only matter after that.',
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText(i18n.getFeatureString('hintDating'));
        this.hintText.setColor('#ffbdfd');
      }
    }

    if (!structuredActive && peopleActive) {
      this.questListText.setText(this.formatPeopleInfo(this.handlers.getPeopleView?.() ?? []));
      this.applyScrollableTextOffset('people', this.questListText);
      this.detailTitle.setText(i18n.getFeatureString('peopleTitle')).setVisible(true);
      this.detailSubtitle.setText(i18n.getFeatureString('detailActorJournal')).setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'People collects actor memories, social ties, revealed secrets, and current moods. Ask NPCs about rumors, family, the King, or themselves to fill it.',
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText(i18n.getFeatureString('hintPeople'));
        this.hintText.setColor('#9ad1ff');
      }
    }

    if (factionsActive) {
      this.buildFactionContent();
      if (!this.hintSticky) {
        this.hintText.setText(i18n.getFeatureString('hintFactions'));
        this.hintText.setColor('#9ad1ff');
      }
    }

    if (!structuredActive && destinyActive) {
      const lines = this.handlers.getDestinyView?.() ?? [];
      this.questListText.setText(
        lines.length > 0 ? lines.join('\n') : 'DESTINY 3 systems offline.',
      );
      this.applyScrollableTextOffset('destiny', this.questListText);
      this.detailTitle.setText(i18n.getFeatureString('destinyTitle')).setVisible(true);
      this.detailSubtitle.setText(i18n.getFeatureString('destinyGuardianState')).setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'Tracks current Starforged activity, power, equipment, ability charge, super charge, active surges, and recent rewards.',
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText(i18n.getFeatureString('hintDestiny'));
        this.hintText.setColor('#9df7ff');
      }
    }

    if (!structuredActive && artifactsActive) {
      const artifacts = this.handlers.getArtifactView?.() ?? [];
      this.questListText.setText(this.formatArtifactsInfo(artifacts));
      this.applyScrollableTextOffset('artifacts', this.questListText);
      this.detailTitle.setText(i18n.getFeatureString('artifactsTitle')).setVisible(true);
      this.detailSubtitle.setText(i18n.getFeatureString('detailRunModifiers')).setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'Artifacts are passive run modifiers recovered from Moleman excavation caches. No inventory management required.',
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText(i18n.getFeatureString('hintArtifacts'));
        this.hintText.setColor('#d8b4ff');
      }
    }

    if (!structuredActive && infoActive) {
      this.questListText.setVisible(true);
      this.questListText.setText(
        'Use the grouped tabs above to manage growth, gear, world state, and system tools.',
      );
      this.detailTitle.setText('Info').setVisible(true);
      this.detailSubtitle.setText(i18n.getFeatureString('detailMenu')).setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'Growth holds skills. Gear holds items, style, and cards. World holds map, quests, and factions.',
        )
        .setVisible(true);
    }

    if (cheatsActive) {
      this.detailTitle.setText(i18n.getFeatureString('tabCheats')).setVisible(true);
      this.detailSubtitle.setText('String Input').setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          "Supported cheats:\n\nspecial10\nstats10\ninvestingincrypto\n90fps240Hz\nimawiddlebabywhoneedshelp\nimmortal\nmammamia\nstarman\nmario\nryan's closet\nteleporterquest\ngreenpurchase\nfindmybaby\nbabyquest\nfreakyou\ntimequest\nfreakdennis\nfreakerdennis",
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText(i18n.getFeatureString('hintCheats'));
        this.hintText.setColor('#9ad1ff');
      }
    }

    if (graphActive) {
      this.detailTitle.setText(i18n.getFeatureString('luckGraphTitle')).setVisible(true);
      this.detailSubtitle.setText(i18n.getFeatureString('luckGraphSubtitle')).setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'Plots the provided table. X uses a log scale so the 130 outlier can share the same graph with the smaller values.',
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText(i18n.getFeatureString('hintGraph'));
        this.hintText.setColor('#9ad1ff');
      }
    }

    if (customizationActive) {
      this.buildStyleContent();
      if (!this.hintSticky) {
        this.hintText.setText(i18n.getFeatureString('hintCustomization'));
        this.hintText.setColor('#9ad1ff');
      }
    } else if (
      this.activeTab !== 'equipment' &&
      this.activeTab !== 'items' &&
      this.activeTab !== 'skills' &&
      this.activeTab !== 'special' &&
      this.activeTab !== 'spells' &&
      this.activeTab !== 'cards' &&
      this.activeTab !== 'people' &&
      this.activeTab !== 'dating' &&
      this.activeTab !== 'destiny' &&
      this.activeTab !== 'quests' &&
      this.activeTab !== 'factions' &&
      this.activeTab !== 'map' &&
      this.activeTab !== 'info' &&
      this.activeTab !== 'cheats' &&
      this.activeTab !== 'graph'
    ) {
      this.customizationRowMap = [];
      this.clearPerkDetails(true);
    }

    if (!skillsActive) {
      this.connectionGraphics.clear();
      for (const child of this.skillTreeChromeObjects.splice(0)) {
        child.destroy();
      }
      for (const visual of this.nodeVisuals.values()) {
        visual.container.setVisible(false);
      }
      return;
    }

    this.updateSkillTreeNodeLayout(perks);
    this.drawConnections(perks);

    for (const [perkId, visual] of this.nodeVisuals) {
      visual.container.setVisible(true);

      let state: SkillPerkState;
      try {
        state = this.system.getPurchaseState(perkId);
      } catch {
        visual.container.setVisible(false);
        continue;
      }

      const maxRank = visual.definition.costByRank.length;
      const nextCost = state.status === 'maxed' ? undefined : state.cost;

      visual.rankText.setText(
        i18n
          .getFeatureString('skillTreeRankLabel')
          .replace('{rank}', String(Math.min(state.rank, maxRank)))
          .replace('{max}', String(maxRank)),
      );
      if (state.status === 'maxed') {
        visual.costText.setText(i18n.getFeatureString('skillTreeMaxedLabel'));
      } else if (nextCost !== undefined) {
        visual.costText.setText(i18n.getFeatureString('skillTreeCostLabel') + ' ' + nextCost);
      } else {
        visual.costText.setText('');
      }

      let fillColor = 0x122031;
      let strokeColor = 0x244155;
      let textColor = '#7895b4';
      let costColor = '#7895b4';
      const branchAccent = this.getBranchAccent(visual.definition.branch);
      const branchAccentCss = `#${branchAccent.toString(16).padStart(6, '0')}`;

      if (state.rank > 0) {
        fillColor = branchAccent;
        strokeColor = 0xffffff;
        textColor = '#ffffff';
        costColor = '#cfe5ff';
      }

      switch (state.status) {
        case 'available':
          if (state.rank === 0) {
            fillColor = 0x101d2a;
            strokeColor = branchAccent;
            textColor = '#c8ffe1';
            costColor = '#c8ffe1';
          }
          break;
        case 'unaffordable':
          if (state.rank === 0) {
            fillColor = 0x1a2b40;
            strokeColor = branchAccent;
            textColor = branchAccentCss;
            costColor = '#9ad1ff';
          } else {
            costColor = '#9ad1ff';
          }
          break;
        case 'locked':
          fillColor = 0x101824;
          strokeColor = 0x202f40;
          textColor = '#546881';
          costColor = '#546881';
          break;
        case 'maxed':
          // already covered by rank > 0
          break;
      }

      visual.button.setFillStyle(fillColor, 1);
      visual.button.setStrokeStyle(2, strokeColor, 1);
      visual.label.setColor(textColor);
      visual.rankText.setColor(textColor);
      visual.costText.setColor(costColor);
      visual.rankText.setVisible(false);
      visual.costText.setVisible(false);

      if (visual.button.input) {
        visual.button.input.cursor = state.status === 'available' ? 'pointer' : 'default';
      }
    }
    if (this.detailPinned && this.detailPerkId) {
      if (!this.populatePerkDetails(this.detailPerkId)) {
        this.clearPerkDetails(true);
      }
    }
  }

  private formatQuestInfo(quests: Quest[]): string {
    this.questRowMap = [];
    if (quests.length === 0) {
      return i18n.getFeatureString('noAcceptedQuests');
    }

    const activeIds = new Set(this.scene.activeQuests.map((quest) => quest.id));
    const completedIds = new Set(this.scene.completedQuests);
    const acceptedIds = new Set(this.scene.acceptedQuests);
    const trackedQuestId =
      typeof (this.scene as any).getActiveQuestMarkerQuestId === 'function'
        ? ((this.scene as any).getActiveQuestMarkerQuestId() as string | undefined)
        : undefined;
    let row = 0;

    const blocks = quests.map((quest) => {
      const marker = completedIds.has(quest.id)
        ? '[x]'
        : activeIds.has(quest.id)
          ? '[>]'
          : acceptedIds.has(quest.id)
            ? '[-]'
            : '[ ]';
      const trackingMarker = trackedQuestId === quest.id ? '[*]' : '[ ]';
      const subtasks =
        typeof (this.scene as any).getQuestSubtasks === 'function'
          ? ((this.scene as any).getQuestSubtasks(quest.id) as string[])
          : [];
      const objectives =
        typeof (this.scene as any).getQuestObjectiveSummaries === 'function'
          ? ((this.scene as any).getQuestObjectiveSummaries(quest.id) as QuestObjectiveSummary[])
          : [];
      const subtaskText =
        subtasks.length > 0 ? `\n${subtasks.map((line) => `  ${line}`).join('\n')}` : '';
      const objectiveText =
        objectives.length > 0
          ? `\n  Objective: ${objectives
              .map((objective) => this.formatQuestObjective(objective))
              .join(' / ')}`
          : '\n  Objective: no fixed room';
      const questStrings = i18n.getQuestString(quest.id) ?? {
        label: quest.label,
        description: quest.description,
      };
      const block = `${trackingMarker}${marker} ${questStrings.label}: ${questStrings.description}${objectiveText}${subtaskText}`;
      const lineCount = block.split('\n').length;
      this.questRowMap.push({ startRow: row, endRow: row + lineCount - 1, questId: quest.id });
      row += lineCount + 2;
      return block;
    });
    return blocks.join('\n\n');
  }

  private formatQuestObjective(objective: QuestObjectiveSummary): string {
    const { x, y, z } = objective.coordinates;
    return `${objective.label} (${x}, ${y}, ${z})`;
  }

  private formatDatingInfo(views: readonly DatingCandidateView[]): string {
    if (views.length === 0) {
      return [
        i18n.getFeatureString('noActiveRelationships'),
        '',
        'Talk to village residents, goblin guards, wanderers, or stranger things.',
        'Choose Flirt, Gift, or Ask out to opt in. Ignoring romance choices keeps this system quiet.',
      ].join('\n');
    }
    return views
      .map((view) => {
        const species = view.species
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
        return [
          view.displayName,
          `${species} / ${view.factionLabel}`,
          `Stage: ${view.stage}`,
          `Affection ${view.affection} | Trust ${view.trust} | Jealousy ${view.jealousy} | Resentment ${view.resentment}`,
          `Fear ${view.fear} | Fascination ${view.fascination} | Last seen ${view.lastSeenRoomsAgo} rooms ago`,
          view.personality ? `Personality: ${view.personality}` : '',
          view.personalityDescription ?? '',
          `Likes: ${view.likes.length > 0 ? view.likes.join(', ') : 'unknown'}`,
          view.memories && view.memories.length > 0
            ? `Memories: ${view.memories.map((memory) => memory.summary).join(' / ')}`
            : '',
          view.warning ? `Warning: ${view.warning}` : '',
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n\n');
  }

  private formatPeopleInfo(views: readonly ActorJournalEntry[]): string {
    if (views.length === 0) {
      return [
        'No people known yet.',
        '',
        'Talk to town residents, witness events, ask rumors, or create relationship routes.',
        'The actor journal fills when the simulation has facts worth remembering.',
      ].join('\n');
    }

    return views
      .map((view) =>
        [
          view.name,
          `${view.role}${view.faction ? ` / ${view.faction}` : ''}${view.roomId ? ` / ${view.roomId}` : ''}`,
          `Mood: ${view.mood}${view.health ? ` | Health: ${view.health}` : ''}`,
          view.socialTies.length > 0 ? `Ties: ${view.socialTies.join(' / ')}` : '',
          view.reveals.length > 0 ? `Reveals: ${view.reveals.join(' / ')}` : '',
          view.knownFacts.length > 0 ? `Known: ${view.knownFacts.join(' / ')}` : '',
          view.memories.length > 0 ? `Memory: ${view.memories.join(' / ')}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .join('\n\n');
  }

  private formatArtifactsInfo(artifacts: readonly ArtifactView[]): string {
    if (artifacts.length === 0) {
      return [
        i18n.getFeatureString('noArtifactsRecovery'),
        '',
        'Find a Moleman Dig Site, expose Artifact Caches, and keep the strange little advantages for this run.',
      ].join('\n');
    }
    return artifacts
      .map((artifact) =>
        [
          `${artifact.icon} ${artifact.name}`,
          `Rarity: ${artifact.rarity}`,
          artifact.description,
        ].join('\n'),
      )
      .join('\n\n');
  }

  private formatCardCollection(collection: CardCollection): string {
    const owned = CARD_DEFINITIONS.map((card) => ({
      card,
      count: Number(collection[card.id] ?? 0),
    })).filter((entry) => entry.count > 0);

    if (owned.length === 0) {
      return i18n.getFeatureString('noCardsOwned');
    }

    const total = owned.reduce((sum, entry) => sum + entry.count, 0);
    const lines = [`${i18n.getFeatureString('cardsOwnedHeader')} ${total}`, ''];
    for (const { card, count } of owned) {
      lines.push(
        `[x${count}] ${card.name}`,
        `  ${card.suit} / ${card.chips} chips / ${card.rarity}`,
        `  ${card.description}`,
        '',
      );
    }
    return lines.join('\n').trimEnd();
  }

  private formatFactionCards(
    factions: FactionCardView[],
    wards: Partial<Record<WardDeathSource, number>>,
  ): string {
    const visible = factions.filter((faction) => faction.discovered);
    if (visible.length === 0) {
      return 'FACTION STANDING\n\nNo factions discovered yet.';
    }
    const lines: string[] = [];
    for (const faction of visible) {
      const sign = faction.alignment > 0 ? '+' : '';
      const meter = this.formatStandingMeter(faction.alignment);
      lines.push(
        `FACTION // ${faction.name}`,
        `${faction.standing.toUpperCase()}  ${sign}${faction.alignment}`,
        meter,
        faction.subtitle,
        '',
        'EFFECTS',
        ...faction.effects.map((effect) => `  ${effect}`),
        '',
      );
    }

    const wardLines = Object.entries(wards)
      .filter(([, count]) => Number(count) > 0)
      .map(([source, count]) => `  - ${source}: x${count}`);
    lines.push('Ward Contracts');
    lines.push(...(wardLines.length > 0 ? wardLines : ['  - none']));
    return lines.join('\n');
  }

  private formatStandingMeter(alignment: number): string {
    const clamped = Phaser.Math.Clamp(alignment, -100, 100);
    const marker = Math.round(((clamped + 100) / 200) * 20);
    const cells = Array.from({ length: 21 }, (_, index) => (index === marker ? '|' : '-')).join('');
    return `-100 Hostile ${cells} +100 Ally`;
  }

  private drawMapPanel(): void {
    this.mapGraphics.clear();
    const getter: any = this.scene as any;
    const rooms: string[] = getter.getGeneratedRoomsOnCurrentLevel
      ? getter.getGeneratedRoomsOnCurrentLevel()
      : [];
    const current: string = (this.scene as any).currentRoomId ?? '0,0,0';

    const level = Number(current.split(',')[2] ?? 0);
    this.mapTitle.setText(`Map - Depth ${level}`);
    const coords = rooms
      .map((id) => id.split(',').map((n) => Number(n)) as number[])
      .filter((c) => (c[2] ?? 0) === level);
    const questMarkers =
      typeof getter.getQuestMapMarkers === 'function'
        ? (getter.getQuestMapMarkers() as Array<{
            roomId: string;
            label: string;
            color: number;
            kind: string;
          }>)
        : [];
    const questMarkerCoords = questMarkers
      .map((marker) => ({
        marker,
        coords: marker.roomId.split(',').map((n) => Number(n)) as number[],
      }))
      .filter((entry) => (entry.coords[2] ?? 0) === level);

    // Ensure bounds include house and origin on their level for icon placement
    const markerCoords: number[][] = [];
    if (level === 0) {
      markerCoords.push([0, 0, 0]); // origin/spawn
      markerCoords.push([0, -1, 0]); // house
    }
    for (const entry of questMarkerCoords) {
      markerCoords.push(entry.coords);
    }

    const allBounds = coords.concat(markerCoords);
    if (allBounds.length === 0) {
      this.mapGraphics
        .lineStyle(1, 0x244155, 0.8)
        .strokeRect(
          this.mapBackground.x + 8,
          this.mapBackground.y + 32,
          this.mapBackground.width - 16,
          this.mapBackground.height - 40,
        );
      this.mapGraphics.fillStyle(0x9ad1ff, 0.8);
      this.mapGraphics.fillCircle(
        this.mapBackground.x + this.mapBackground.width / 2,
        this.mapBackground.y + this.mapBackground.height / 2,
        2,
      );
      return;
    }

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const [x, y] of allBounds) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    const margin = 16;
    const areaW = this.mapBackground.width - margin * 2;
    const areaH = this.mapBackground.height - margin * 2 - 24;
    const spanX = Math.max(1, maxX - minX + 1);
    const spanY = Math.max(1, maxY - minY + 1);
    const cellSize = Math.max(6, Math.floor(Math.min(areaW / spanX, areaH / spanY)));
    const originX = this.mapBackground.x + margin + (areaW - cellSize * spanX) / 2;
    const originY = this.mapBackground.y + 24 + margin + (areaH - cellSize * spanY) / 2;

    const drawCell = (
      x: number,
      y: number,
      style: { fill: number; alpha: number; stroke?: number; strokeA?: number },
      outline = true,
    ) => {
      const gx = originX + (x - minX) * cellSize;
      const gy = originY + (y - minY) * cellSize;
      this.mapGraphics
        .fillStyle(style.fill, style.alpha)
        .fillRect(gx + 1, gy + 1, cellSize - 2, cellSize - 2);
      if (outline)
        this.mapGraphics
          .lineStyle(1, style.stroke ?? 0x244155, style.strokeA ?? 0.9)
          .strokeRect(gx + 0.5, gy + 0.5, cellSize - 1, cellSize - 1);
      return { gx, gy };
    };

    // Draw known rooms
    const knownSet = new Set(coords.map((c) => `${c[0]},${c[1]},${level}`));
    for (const [x, y] of coords) {
      const id = `${x},${y},${level}`;
      const isCurrent = id === current;
      drawCell(x, y, { fill: isCurrent ? 0x5dd6a2 : 0x4da3ff, alpha: isCurrent ? 0.9 : 0.7 });
    }

    // Draw faint cells for markers if not already present
    for (const [mx, my] of markerCoords) {
      const id = `${mx},${my},${level}`;
      if (!knownSet.has(id)) {
        drawCell(mx, my, { fill: 0x203245, alpha: 0.35, stroke: 0x244155, strokeA: 0.6 });
      }
    }

    // Icons
    const iconPos = (x: number, y: number) => {
      const gx = originX + (x - minX) * cellSize;
      const gy = originY + (y - minY) * cellSize;
      return { x: gx + 1, y: gy + 1, cx: gx + cellSize / 2, cy: gy + cellSize / 2 };
    };
    if (level === 0) {
      // House icon at (0,-1,0) — small, centered, white
      const h = iconPos(0, -1);
      // 3x smaller than the previous icon: ~18% of cell size
      const size = Math.max(3, Math.floor(cellSize * 0.18));
      const baseH = Math.max(2, Math.floor(size * 0.55));
      const baseW = size;
      const baseX = h.cx - baseW / 2;
      const baseY = h.cy + size * 0.1 - baseH / 2;
      const roofTopX = h.cx;
      const roofTopY = baseY - Math.max(1, Math.floor(size * 0.45));
      const roofLeftX = baseX;
      const roofRightX = baseX + baseW;
      const roofBaseY = baseY;
      this.mapGraphics.fillStyle(0xffffff, 0.95);
      // roof
      this.mapGraphics.fillTriangle(
        roofLeftX,
        roofBaseY,
        roofRightX,
        roofBaseY,
        roofTopX,
        roofTopY,
      );
      // base
      this.mapGraphics.fillRect(baseX, baseY, baseW, baseH);

      // Spawn icon at (0,0,0)
      const s = iconPos(0, 0);
      this.mapGraphics.lineStyle(1, 0xfff3a8, 0.95);
      this.mapGraphics.beginPath();
      this.mapGraphics.moveTo(s.cx - 2, s.cy);
      this.mapGraphics.lineTo(s.cx + 2, s.cy);
      this.mapGraphics.moveTo(s.cx, s.cy - 2);
      this.mapGraphics.lineTo(s.cx, s.cy + 2);
      this.mapGraphics.strokePath();
    }

    for (const {
      marker,
      coords: [qx, qy],
    } of questMarkerCoords) {
      const q = iconPos(qx, qy);
      const color = marker.color ?? 0xffd166;
      this.mapGraphics
        .lineStyle(2, color, 0.95)
        .strokeCircle(q.cx, q.cy, Math.max(3, cellSize * 0.34));
      this.mapGraphics.fillStyle(color, 0.95);
      if (marker.kind === 'turn-in') {
        this.mapGraphics.fillTriangle(q.cx, q.cy - 4, q.cx - 4, q.cy + 3, q.cx + 4, q.cy + 3);
      } else {
        this.mapGraphics.fillCircle(q.cx, q.cy, Math.max(2, cellSize * 0.13));
      }
    }

    const [currentX = 0, currentY = 0] = current.split(',').map((n) => Number(n));
    const legendY = this.mapBackground.y + this.mapBackground.height - 22;
    this.mapGraphics
      .fillStyle(uiColors.panelBgInset, 0.82)
      .fillRoundedRect(
        this.mapBackground.x + 10,
        legendY - 4,
        this.mapBackground.width - 20,
        18,
        4,
      );
    this.mapGraphics.fillStyle(0x5dd6a2, 0.92).fillRect(this.mapBackground.x + 18, legendY, 8, 8);
    this.mapGraphics.fillStyle(0x4da3ff, 0.78).fillRect(this.mapBackground.x + 82, legendY, 8, 8);
    this.mapGraphics
      .fillStyle(0xffd166, 0.95)
      .fillCircle(this.mapBackground.x + 152, legendY + 4, 4);
    this.mapGraphics
      .fillStyle(0xffffff, 0.92)
      .fillRect(this.mapBackground.x + 214, legendY + 1, 7, 7);
    this.mapGraphics.fillStyle(uiColors.panelGlow, 0.92);
    this.mapGraphics.fillRect(
      this.mapBackground.x + this.mapBackground.width - 112,
      legendY + 1,
      92,
      1,
    );
    this.mapTitle.setText(`Map - Depth ${level}   Room ${currentX}, ${currentY}`);
  }

  private populateMapDetailPanel(): void {
    const current = (this.scene as any).currentRoomId ?? '0,0,0';
    const [x = 0, y = 0, z = 0] = current.split(',').map((n: string) => Number(n));
    const room =
      typeof this.scene.snakeGame?.getCurrentRoom === 'function'
        ? (this.scene.snakeGame.getCurrentRoom() as unknown as Record<string, unknown>)
        : {};
    const biomeId = String(room.biomeId ?? 'unknown');
    const biomeTitle = String(room.biomeTitle ?? this.titleCaseBiome(biomeId));
    const tags: string[] = [];
    if (room.town) tags.push('Town');
    if (room.village) tags.push('Village');
    if (room.goblinCamp) tags.push('Goblin Camp');
    if (room.molemanDigSite) tags.push('Dig Site');
    if (room.treasure) tags.push('Treasure');
    if (room.powerup) tags.push('Powerup');

    const hazards = this.inferRoomHazards(room, biomeId);
    const features = this.inferRoomFeatures(room);
    const pois = tags.length > 0 ? tags : ['No marked POIs'];

    this.detailTitle.setText('Current Room').setVisible(true);
    this.detailSubtitle.setText(`${biomeTitle} // ${x}, ${y}, ${z}`).setVisible(true);
    this.detailRankText.setText(biomeId).setVisible(true);
    this.detailBody
      .setText(
        [
          'Hazards',
          ...hazards.map((entry) => `- ${entry}`),
          '',
          'Features',
          ...features.map((entry) => `- ${entry}`),
          '',
          'Points of Interest',
          ...pois.map((entry) => `- ${entry}`),
        ].join('\n'),
      )
      .setVisible(true);
  }

  private titleCaseBiome(id: string): string {
    return id
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private inferRoomHazards(room: Record<string, unknown>, biomeId: string): string[] {
    const hazards: string[] = [];
    if (biomeId.includes('ember') || biomeId.includes('badlands')) hazards.push('Heat');
    if (biomeId.includes('sable') || biomeId.includes('frost')) hazards.push('Cold');
    if (biomeId.includes('ocean') || biomeId.includes('sunken')) hazards.push('Water');
    if (room.goblinCamp) hazards.push('Camp Hostility');
    return hazards.length > 0 ? hazards : ['None detected'];
  }

  private inferRoomFeatures(room: Record<string, unknown>): string[] {
    const features: string[] = [];
    if (room.house) features.push('House');
    if (room.town) features.push('Settlement');
    if (room.village) features.push('Market Access');
    if (room.layout) features.push('Generated Layout');
    if (room.archetypeId) features.push(String(room.archetypeId));
    return features.length > 0 ? features : ['Standard room'];
  }

  private drawLuckGraphPanel(): void {
    this.graphGraphics.clear();
    const left = this.graphBackground.x + 48;
    const top = this.graphBackground.y + 44;
    const width = this.graphBackground.width - 76;
    const height = this.graphBackground.height - 104;
    const bottom = top + height;
    const right = left + width;

    const xValues = LUCK_GRAPH_POINTS.map((point) => Math.log10(Math.max(0.001, point.outOf10)));
    const yValues = LUCK_GRAPH_POINTS.map((point) => point.luck);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(-0.2, ...yValues);
    const maxY = Math.max(1.2, ...yValues);
    const xRange = Math.max(0.001, maxX - minX);
    const yRange = Math.max(0.001, maxY - minY);
    const plotX = (value: number) =>
      left + ((Math.log10(Math.max(0.001, value)) - minX) / xRange) * width;
    const plotY = (value: number) => bottom - ((value - minY) / yRange) * height;

    this.graphGraphics.lineStyle(1, 0x244155, 0.8);
    for (let i = 0; i <= 4; i += 1) {
      const y = top + (height / 4) * i;
      this.graphGraphics.beginPath();
      this.graphGraphics.moveTo(left, y);
      this.graphGraphics.lineTo(right, y);
      this.graphGraphics.strokePath();
    }
    for (let i = 0; i <= 4; i += 1) {
      const x = left + (width / 4) * i;
      this.graphGraphics.beginPath();
      this.graphGraphics.moveTo(x, top);
      this.graphGraphics.lineTo(x, bottom);
      this.graphGraphics.strokePath();
    }

    this.graphGraphics.lineStyle(2, 0x9ad1ff, 0.95);
    this.graphGraphics.beginPath();
    this.graphGraphics.moveTo(left, bottom);
    this.graphGraphics.lineTo(right, bottom);
    this.graphGraphics.moveTo(left, top);
    this.graphGraphics.lineTo(left, bottom);
    this.graphGraphics.strokePath();

    const sorted = [...LUCK_GRAPH_POINTS].sort((a, b) => a.outOf10 - b.outOf10);
    this.graphGraphics.lineStyle(2, 0x5dd6a2, 0.78);
    this.graphGraphics.beginPath();
    sorted.forEach((point, index) => {
      const x = plotX(point.outOf10);
      const y = plotY(point.luck);
      if (index === 0) {
        this.graphGraphics.moveTo(x, y);
      } else {
        this.graphGraphics.lineTo(x, y);
      }
    });
    this.graphGraphics.strokePath();

    for (const point of LUCK_GRAPH_POINTS) {
      const x = plotX(point.outOf10);
      const y = plotY(point.luck);
      const highlight = point.luck >= 0.9 ? 0xffd166 : point.luck < 0 ? 0xff6b6b : 0x5dd6a2;
      this.graphGraphics.fillStyle(highlight, 0.95).fillCircle(x, y, 4);
      this.graphGraphics.lineStyle(1, 0xffffff, 0.8).strokeCircle(x, y, 4.5);
    }

    const zeroY = plotY(0);
    if (zeroY >= top && zeroY <= bottom) {
      this.graphGraphics.lineStyle(1, 0xffffff, 0.38);
      this.graphGraphics.beginPath();
      this.graphGraphics.moveTo(left, zeroY);
      this.graphGraphics.lineTo(right, zeroY);
      this.graphGraphics.strokePath();
    }

    this.graphLabels.setText(
      [
        `Y luck: ${minY.toFixed(2)} to ${maxY.toFixed(2)}`,
        `X out of 10: ${Math.min(...LUCK_GRAPH_POINTS.map((p) => p.outOf10)).toString()} to ${Math.max(...LUCK_GRAPH_POINTS.map((p) => p.outOf10)).toString()} (log)`,
      ].join('\n'),
    );
  }

  private buildTabs(): void {
    const layout = this.getPauseMenuLayout();
    const startX = layout.topTabs.x;
    const primaryY = layout.topTabs.y + 17;
    const secondaryY = layout.subTabs.y + 14;
    const showHand = TAB_DEFINITIONS.length > 1;
    const primaryTabWidth = Math.min(112, Math.floor((layout.topTabs.width - 30) / 4));
    const secondaryStartX = layout.subTabs.x;
    const secondaryTabWidth = 110;

    let primaryX = startX;
    for (const primary of PRIMARY_TAB_DEFINITIONS) {
      const icon = this.scene.add
        .image(primaryX + 14, primaryY, PRIMARY_TAB_ICON_KEYS[primary.id])
        .setOrigin(0.5)
        .setDisplaySize(18, 18)
        .setInteractive({ useHandCursor: true });
      const resolvedLabel = resolvePrimaryLabel(primary.id).toUpperCase();
      const label = this.scene.add
        .text(primaryX + 28, primaryY, resolvedLabel, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#7895b4',
          backgroundColor: 'rgba(0,0,0,0)',
          fixedWidth: primaryTabWidth - 30,
          padding: { left: 4, right: 4, top: 4, bottom: 4 },
        })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });

      const activate = () => {
        this.setActivePrimaryTab(primary.id);
      };
      const over = () => {
        if (primary.id !== this.activePrimaryTab) {
          label.setColor('#9ad1ff');
          icon.setTint(0x9ad1ff);
        }
      };
      const out = () => {
        this.updateTabVisuals();
      };
      label.on('pointerdown', activate);
      icon.on('pointerdown', activate);
      label.on('pointerover', over);
      icon.on('pointerover', over);
      label.on('pointerout', out);
      icon.on('pointerout', out);

      this.container.add(icon);
      this.container.add(label);
      this.primaryTabIcons.set(primary.id, icon);
      this.primaryTabLabels.set(primary.id, label);
      primaryX += primaryTabWidth + 10;
    }

    let currentX = secondaryStartX;
    for (const tab of TAB_DEFINITIONS) {
      const icon = this.scene.add
        .image(currentX + 12, secondaryY, TAB_ICON_KEYS[tab.id])
        .setOrigin(0.5)
        .setDisplaySize(16, 16)
        .setInteractive({ useHandCursor: showHand });
      const resolvedLabel = resolveTabLabel(tab).toUpperCase();
      const label = this.scene.add
        .text(currentX + 26, secondaryY, resolvedLabel, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#7895b4',
          backgroundColor: 'rgba(0,0,0,0)',
          fixedWidth: secondaryTabWidth - 26,
          padding: { left: 6, right: 6, top: 4, bottom: 4 },
        })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: showHand });

      const activate = () => {
        this.setActiveTab(tab.id);
      };
      const over = () => {
        if (tab.id !== this.activeTab) {
          label.setColor('#9ad1ff');
          icon.setTint(0x9ad1ff);
        }
      };
      const out = () => {
        this.updateTabVisuals();
      };
      label.on('pointerdown', activate);
      icon.on('pointerdown', activate);
      label.on('pointerover', over);
      icon.on('pointerover', over);
      label.on('pointerout', out);
      icon.on('pointerout', out);

      this.container.add(icon);
      this.container.add(label);
      this.tabIcons.set(tab.id, icon);
      this.tabLabels.set(tab.id, label);

      currentX += secondaryTabWidth + 12;
    }
    this.layoutSecondaryTabs();
  }

  private getSkillTreeBounds(): UiRect {
    return {
      x: TREE_PADDING.horizontal - 12,
      y: TREE_PADDING.top - 12,
      width:
        this.options.width -
        DETAIL_PANEL_WIDTH -
        DETAIL_PANEL_MARGIN -
        TREE_PADDING.horizontal * 2 +
        24,
      height: this.getScrollableViewportHeight() + 18,
    };
  }

  private getSkillBranches(perks: readonly SkillPerkDefinition[]): string[] {
    return [...new Set(perks.map((perk) => perk.branch))].sort((a, b) => {
      const aX = perks.find((perk) => perk.branch === a)?.position.x ?? 0;
      const bX = perks.find((perk) => perk.branch === b)?.position.x ?? 0;
      return aX - bX;
    });
  }

  private getBranchAccent(branch: string): number {
    const normalized = branch.toLowerCase();
    if (normalized.includes('survival') || normalized.includes('heart'))
      return uiColors.accentSurvival;
    if (normalized.includes('utility') || normalized.includes('fortitude'))
      return uiColors.accentUtility;
    if (normalized.includes('flow') || normalized.includes('momentum')) return uiColors.accentFlow;
    if (normalized.includes('command') || normalized.includes('hunting'))
      return uiColors.accentCommand;
    if (normalized.includes('arcana') || normalized.includes('mana')) return uiColors.accentArcana;
    return uiColors.accentCore;
  }

  private getSkillTreeLayout(perks: readonly SkillPerkDefinition[]): {
    content: UiRect;
    branches: string[];
    progressions: number[];
    branchRow: Map<string, number>;
    progressionColumn: Map<number, number>;
    leftLabelWidth: number;
    topRankHeight: number;
    rowGap: number;
    colGap: number;
  } {
    const bounds = this.getSkillTreeBounds();
    const content = insetRect(bounds, 16);
    const branches = this.getSkillBranches(perks);
    const progressions = [...new Set(perks.map((perk) => perk.position.y))].sort((a, b) => a - b);
    const branchRow = new Map(branches.map((branch, index) => [branch, index]));
    const progressionColumn = new Map(progressions.map((position, index) => [position, index]));
    const leftLabelWidth = 104;
    const topRankHeight = 42;
    const rowGap =
      branches.length > 1
        ? Phaser.Math.Clamp(
            (content.height - topRankHeight - 42) / Math.max(1, branches.length - 1),
            42,
            58,
          )
        : 0;
    const colGap = 140;
    this.skillTreeContentWidth = leftLabelWidth + Math.max(0, progressions.length - 1) * colGap + 56;
    this.skillTreeContentHeight = content.height;
    this.skillTreePanX = Phaser.Math.Clamp(
      this.skillTreePanX,
      0,
      Math.max(0, this.skillTreeContentWidth - content.width),
    );
    this.skillTreePanY = 0;
    return {
      content,
      branches,
      progressions,
      branchRow,
      progressionColumn,
      leftLabelWidth,
      topRankHeight,
      rowGap,
      colGap,
    };
  }

  private panSkillTree(deltaY: number, deltaX = 0): void {
    const bounds = this.getSkillTreeBounds();
    const maxX = Math.max(0, this.skillTreeContentWidth - insetRect(bounds, 16).width);
    const horizontalDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    this.skillTreePanX = Phaser.Math.Clamp(this.skillTreePanX + horizontalDelta, 0, maxX);
    this.skillTreePanY = 0;
    this.refresh();
  }

  private updateSkillTreeNodeLayout(perks: readonly SkillPerkDefinition[]): void {
    const {
      content,
      branchRow,
      progressionColumn,
      leftLabelWidth,
      topRankHeight,
      rowGap,
      colGap,
    } = this.getSkillTreeLayout(perks);
    for (const perk of perks) {
      const visual = this.nodeVisuals.get(perk.id);
      if (!visual) continue;
      const row = branchRow.get(perk.branch) ?? 0;
      const col = progressionColumn.get(perk.position.y) ?? 0;
      const px = content.x + leftLabelWidth + col * colGap - this.skillTreePanX;
      const py = content.y + topRankHeight + row * rowGap - this.skillTreePanY;
      visual.container.setPosition(px, py);
      visual.position.set(px, py);
    }
  }

  private buildNodes(): void {
    const perks = this.system.getPerks();
    const {
      content,
      branchRow,
      progressionColumn,
      leftLabelWidth,
      topRankHeight,
      rowGap,
      colGap,
    } = this.getSkillTreeLayout(perks);
    const radius = 16;

    for (const perk of perks) {
      const row = branchRow.get(perk.branch) ?? 0;
      const col = progressionColumn.get(perk.position.y) ?? 0;
      const px = content.x + leftLabelWidth + col * colGap - this.skillTreePanX;
      const py = content.y + topRankHeight + row * rowGap - this.skillTreePanY;
      const nodeContainer = this.scene.add.container(px, py);
      if (this.contentMask) {
        nodeContainer.setMask(this.contentMask);
      }

      const button = this.scene.add.circle(0, 0, radius, 0x13233a).setStrokeStyle(2, 0x2b4a63);
      button.setInteractive({ useHandCursor: true });

      const label = this.scene.add
        .text(0, -4, perk.shortLabel, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#9ad1ff',
        })
        .setOrigin(0.5);

      const rankText = this.scene.add
        .text(
          0,
          17,
          i18n.getFeatureString('skillTreeRankLabel').replace('{rank}', '0').replace('{max}', '0'),
          {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#7d9bb8',
          },
        )
        .setOrigin(0.5, 0);

      const costText = this.scene.add
        .text(0, 30, i18n.getFeatureString('skillTreeCostLabel'), {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#7d9bb8',
        })
        .setOrigin(0.5, 0);

      rankText.setVisible(false);
      costText.setVisible(false);
      nodeContainer.add([button, label, rankText, costText]);
      nodeContainer.setSize(radius * 2, radius * 2);

      button.on('pointerover', () => {
        nodeContainer.setScale(1.05);
        this.hoveredPerkId = perk.id;
        if (!this.detailPinned) {
          this.populatePerkDetails(perk.id);
        }
        const absX = this.container.x + px;
        const absY = this.container.y + py;
        (this.scene as any).juice?.uiSparkle?.(absX, absY);
        this.showConnectionHighlight(perk.id);
        if (!this.hintSticky) {
          this.hintText.setText('Skill details update on hover. Click to invest when available.');
          this.hintText.setColor('#9ad1ff');
        }
        const state = this.system.getPurchaseState(perk.id);
        const cost = state?.cost;
        const label = perk.title + (Number.isFinite(cost) ? `  (Cost ${cost})` : '');
        this.showHoverTip(label);
      });
      button.on('pointerout', () => {
        nodeContainer.setScale(1);
        if (this.hoveredPerkId === perk.id) {
          this.hoveredPerkId = null;
        }
        if (!this.detailPinned) {
          this.clearPerkDetails();
        } else if (this.detailPerkId === perk.id) {
          this.clearPerkDetails(true);
        }
        if (!this.hintSticky) {
          this.updateDefaultHint(this.system.getStats());
        }
        this.hideHoverTip();
        this.clearConnectionHighlight();
      });
      button.on('pointerdown', () => {
        try {
          const state = this.system.getPurchaseState(perk.id);
          this.handlers.onRequestPurchase(perk.id, state);
        } catch (error) {
          console.error('Failed to resolve perk state', error);
        }
      });

      this.container.add(nodeContainer);

      this.nodeVisuals.set(perk.id, {
        definition: perk,
        container: nodeContainer,
        button,
        label,
        rankText,
        costText,
        position: new Phaser.Math.Vector2(px, py),
      });
    }
  }

  private showConnectionHighlight(perkId: string): void {
    this.connectionHighlight.clear();
    const perk = this.system.getDefinition(perkId);
    if (!perk) return;
    const reqs = perk.requires ?? [];
    const fromVisual = this.nodeVisuals.get(perkId);
    if (!fromVisual) return;
    for (const reqId of reqs) {
      const reqVisual = this.nodeVisuals.get(reqId);
      if (!reqVisual) continue;
      this.connectionHighlight
        .lineStyle(3, 0x9ad1ff, 0.9)
        .beginPath()
        .moveTo(reqVisual.position.x, reqVisual.position.y)
        .lineTo(fromVisual.position.x, fromVisual.position.y)
        .strokePath();
    }
  }

  private clearConnectionHighlight(): void {
    this.connectionHighlight.clear();
  }

  private ensureHoverTip(): void {
    if (this.hoverTip) return;
    const bg = this.scene.add
      .rectangle(0, 0, 180, 26, 0x0b1622, 0.9)
      .setStrokeStyle(1, 0x244155)
      .setOrigin(0.5);
    const text = this.scene.add
      .text(0, 0, '', { fontFamily: 'monospace', fontSize: '12px', color: '#cfe5ff' })
      .setOrigin(0.5);
    const container = this.scene.add
      .container(0, 0, [bg, text])
      .setDepth(this.options.depth + 2)
      .setVisible(false);
    this.container.add(container);
    this.hoverTip = { container, bg, text, targetX: 0, targetY: 0 };
  }

  private showHoverTip(text: string): void {
    this.ensureHoverTip();
    if (!this.hoverTip) return;
    this.hoverTip.text.setText(text);
    const pad = 12;
    const width = Math.max(120, this.hoverTip.text.width + pad * 2);
    this.hoverTip.bg.setSize(width, 26);
    this.hoverTip.container.setVisible(true).setAlpha(1);
    // Prime target to current pointer
    const p = this.scene.input.activePointer;
    const localX = p.worldX - this.container.x + 14;
    const localY = p.worldY - this.container.y - 14;
    this.hoverTip.targetX = localX;
    this.hoverTip.targetY = localY;
    this.hoverTip.container.setPosition(localX, localY);
    if (!this.hoverTip.ticker) {
      this.hoverTip.ticker = this.scene.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => this.updateHoverTipPosition(),
      });
    }
  }

  private updateHoverTipPosition(): void {
    if (!this.hoverTip || !this.hoverTip.container.visible) return;
    const p = this.scene.input.activePointer;
    const targetX = p.worldX - this.container.x + 14;
    const targetY = p.worldY - this.container.y - 14;
    // Parallax: bias a touch toward center
    const centerX = this.options.width / 2;
    const centerY = this.options.height / 2;
    const parX = (targetX - centerX) * 0.02;
    const parY = (targetY - centerY) * 0.02;
    this.hoverTip.targetX = targetX - parX;
    this.hoverTip.targetY = targetY - parY;
    const cur = this.hoverTip.container;
    // Smooth follow
    cur.x += (this.hoverTip.targetX - cur.x) * 0.18;
    cur.y += (this.hoverTip.targetY - cur.y) * 0.18;
  }

  private hideHoverTip(): void {
    if (!this.hoverTip) return;
    if (this.hoverTip.ticker) {
      this.hoverTip.ticker.remove(false);
      this.hoverTip.ticker = undefined;
    }
    this.hoverTip.container.setVisible(false);
  }

  // Visual pulse for a purchased perk node
  pulsePerk(perkId: string): void {
    const visual = this.nodeVisuals.get(perkId);
    if (!visual) return;
    const target = visual.container;
    // Scale bounce
    this.scene.tweens.add({
      targets: target,
      scale: 1.12,
      duration: 120,
      ease: 'Cubic.easeOut',
      yoyo: true,
    });
    // Ring pulse around node
    const absX = this.container.x + target.x;
    const absY = this.container.y + target.y;
    const g = this.scene.add.graphics().setDepth(this.options.depth + 1);
    this.container.add(g);
    const state = { r: 16, a: 0.9 } as any;
    this.scene.tweens.add({
      targets: state,
      r: 36,
      a: 0,
      duration: 240,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        g.clear();
        g.lineStyle(2, 0x9ad1ff, state.a);
        g.strokeCircle(absX, absY, state.r);
      },
      onComplete: () => g.destroy(),
    });
    (this.scene as any).juice?.uiSparkle?.(absX, absY);
  }

  private drawConnections(perks: SkillPerkDefinition[]): void {
    this.connectionGraphics.clear();
    for (const child of this.skillTreeChromeObjects.splice(0)) {
      child.destroy();
    }
    const bounds = this.getSkillTreeBounds();
    const { content, branches, progressions, leftLabelWidth, topRankHeight, rowGap, colGap } =
      this.getSkillTreeLayout(perks);

    drawUiCard(this.connectionGraphics, {
      rect: bounds,
      fill: uiColors.panelBgSecondary,
      stroke: uiColors.accentGrowth,
      alpha: 0.86,
      strokeAlpha: 0.62,
      radius: 8,
    });

    progressions.forEach((_progression, index) => {
      const x = content.x + leftLabelWidth + index * colGap - this.skillTreePanX;
      const rankLabel = addUiText(this.scene, this.container, x, content.y + 12, `R${index}`, {
        align: 'center',
        color: uiColors.textMuted,
        fontSize: '10px',
      }).setDepth(this.options.depth + 1);
      if (this.contentMask) {
        rankLabel.setMask(this.contentMask);
      }
      this.skillTreeChromeObjects.push(rankLabel);
      this.connectionGraphics
        .lineStyle(1, uiColors.panelBorderMuted, 0.28)
        .lineBetween(x, content.y + 30, x, content.y + content.height - 10);
    });

    branches.forEach((branch, index) => {
      const y = content.y + topRankHeight + index * rowGap - this.skillTreePanY;
      const accent = this.getBranchAccent(branch);
      this.connectionGraphics
        .lineStyle(2, accent, 0.42)
        .lineBetween(
          content.x + leftLabelWidth - 12 - this.skillTreePanX,
          y,
          content.x + this.skillTreeContentWidth - 20 - this.skillTreePanX,
          y,
        );
      this.connectionGraphics.fillStyle(accent, 0.16).fillRoundedRect(content.x, y - 18, 86, 36, 6);
      const branchLabel = addUiText(
        this.scene,
        this.container,
        content.x + 43,
        y - 7,
        branch.toUpperCase(),
        {
          align: 'center',
          color: `#${accent.toString(16).padStart(6, '0')}`,
          fontSize: '10px',
          fontStyle: 'bold',
        },
      ).setDepth(this.options.depth + 1);
      if (this.contentMask) {
        branchLabel.setMask(this.contentMask);
      }
      this.skillTreeChromeObjects.push(branchLabel);
    });

    for (const perk of perks) {
      const fromVisual = this.nodeVisuals.get(perk.id);
      if (!fromVisual) {
        continue;
      }
      const requirements = perk.requires ?? [];
      for (const reqId of requirements) {
        const reqVisual = this.nodeVisuals.get(reqId);
        if (!reqVisual) {
          continue;
        }
        const unlocked = this.system.hasPerk(reqId);
        const color = unlocked ? 0x84c3ff : 0x1f364a;
        const alpha = unlocked ? 0.9 : 0.35;
        this.connectionGraphics
          .lineStyle(unlocked ? 3 : 2, color, alpha)
          .beginPath()
          .moveTo(reqVisual.position.x, reqVisual.position.y)
          .lineTo(fromVisual.position.x, fromVisual.position.y)
          .strokePath();
      }
    }
    if (this.skillTreeContentWidth > content.width) {
      const railX = content.x + 10;
      const railY = content.y + content.height - 8;
      const railW = content.width - 20;
      const thumbW = Math.max(34, (content.width / this.skillTreeContentWidth) * railW);
      const maxOffset = Math.max(1, this.skillTreeContentWidth - content.width);
      const thumbX = railX + (this.skillTreePanX / maxOffset) * (railW - thumbW);
      this.connectionGraphics.fillStyle(uiColors.panelBgInset, 0.82).fillRoundedRect(
        railX,
        railY,
        railW,
        5,
        2,
      );
      this.connectionGraphics.fillStyle(uiColors.panelGlow, 0.9).fillRoundedRect(
        thumbX,
        railY,
        thumbW,
        5,
        2,
      );
    }
  }

  private setActiveTab(tabId: TabId): void {
    if (tabId === 'inventory') {
      tabId = 'items';
    }
    if (this.activeTab === tabId) {
      return;
    }
    if (!this.isTabAvailable(tabId)) {
      return;
    }
    this.activeTab = tabId;
    this.activePrimaryTab =
      TAB_DEFINITIONS.find((tab) => tab.id === tabId)?.group ?? this.activePrimaryTab;
    if (tabId === 'special') {
      this.specialChanceScrollOffset = 0;
    }
    (this.scene as any).juice?.uiTabSwitch?.();
    this.updateTabVisuals();
    this.hintSticky = false;
    this.hintTimer?.remove();
    this.hintTimer = undefined;
    this.refresh();
    this.handlers.onTabChange?.(tabId);
  }

  private setActivePrimaryTab(primaryTabId: PrimaryTabId): void {
    this.activePrimaryTab = primaryTabId;
    const firstChild = TAB_DEFINITIONS.find(
      (tab) => tab.group === primaryTabId && this.isTabAvailable(tab.id),
    );
    if (firstChild) {
      this.activeTab = firstChild.id;
      if (firstChild.id === 'special') {
        this.specialChanceScrollOffset = 0;
      }
    }
    (this.scene as any).juice?.uiTabSwitch?.();
    this.updateTabVisuals();
    this.hintSticky = false;
    this.hintTimer?.remove();
    this.hintTimer = undefined;
    this.refresh();
    if (firstChild) {
      this.handlers.onTabChange?.(firstChild.id);
    }
  }

  private layoutSecondaryTabs(): void {
    const layout = this.getPauseMenuLayout();
    const visibleTabs = TAB_DEFINITIONS.filter(
      (tab) => tab.group === this.activePrimaryTab && this.isTabAvailable(tab.id),
    );
    const gap = 8;
    const tabWidth = Math.min(
      122,
      Math.floor(
        (layout.subTabs.width - gap * (visibleTabs.length - 1)) / Math.max(1, visibleTabs.length),
      ),
    );
    const startX = layout.subTabs.x;
    let currentX = startX;
    for (const tab of TAB_DEFINITIONS) {
      const label = this.tabLabels.get(tab.id);
      const icon = this.tabIcons.get(tab.id);
      if (!label || !icon) continue;
      const visible = tab.group === this.activePrimaryTab && this.isTabAvailable(tab.id);
      label.setVisible(visible);
      icon.setVisible(visible);
      if (!visible) continue;
      icon.setPosition(currentX + 12, icon.y);
      label.setX(currentX + 26);
      label.setFixedSize(Math.max(40, tabWidth - 34), 0);
      currentX += tabWidth + gap;
    }
  }

  private updateTabVisuals(): void {
    this.drawShellFrame();
    for (const primary of PRIMARY_TAB_DEFINITIONS) {
      const label = this.primaryTabLabels.get(primary.id);
      const icon = this.primaryTabIcons.get(primary.id);
      if (!label || !icon) continue;
      const accent = TAB_ACCENTS[primary.id];
      if (primary.id === this.activePrimaryTab) {
        label.setColor('#ffffff');
        label.setFontStyle('bold');
        label.setBackgroundColor(this.rgbaCss(accent, 0.48));
        icon.setTint(accent);
      } else {
        label.setColor(uiColors.textMuted);
        label.setFontStyle('normal');
        label.setBackgroundColor('rgba(0,0,0,0)');
        icon.setTint(0x7895b4);
      }
    }
    this.layoutSecondaryTabs();
    for (const tab of TAB_DEFINITIONS) {
      const label = this.tabLabels.get(tab.id);
      const icon = this.tabIcons.get(tab.id);
      if (!label || !icon) {
        continue;
      }
      if (!this.isTabAvailable(tab.id)) {
        label.setVisible(false);
        icon.setVisible(false);
        continue;
      }
      const accent = TAB_ACCENTS[tab.group];
      if (tab.id === this.activeTab) {
        label.setColor('#ffffff');
        label.setFontStyle('bold');
        label.setBackgroundColor(this.rgbaCss(accent, 0.38));
        icon.setTint(accent);
      } else {
        label.setColor(uiColors.textMuted);
        label.setFontStyle('normal');
        label.setBackgroundColor('rgba(0,0,0,0)');
        icon.setTint(0x7895b4);
      }
    }
  }

  private rgbaCss(color: number, alpha: number): string {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private isTabAvailable(tabId: TabId): boolean {
    if (tabId === 'inventory') {
      return false;
    }
    if (tabId !== 'destiny') {
      return true;
    }
    return (this.handlers.getDestinyView?.().length ?? 0) > 0;
  }

  getHoveredPerkId(): string | null {
    return this.hoveredPerkId;
  }

  showPerkDetails(perkId: string): boolean {
    if (!this.populatePerkDetails(perkId)) {
      return false;
    }
    this.detailPinned = true;
    this.detailPerkId = perkId;
    if (!this.hintSticky) {
      const definition = this.system.getDefinition(perkId);
      const label = definition?.title ?? 'skill';
      this.hintText.setText('Inspecting ' + label);
      this.hintText.setColor('#9ad1ff');
    }
    return true;
  }

  private populatePerkDetails(perkId: string): boolean {
    const definition = this.system.getDefinition(perkId);
    if (!definition) {
      return false;
    }

    let state: SkillPerkState | undefined;
    try {
      state = this.system.getPurchaseState(perkId);
    } catch {
      state = undefined;
    }

    const rank = state?.rank ?? 0;
    const maxRank = Math.max(1, definition.costByRank.length);
    const clampedRank = Math.min(rank, maxRank);
    const status = state?.status ?? 'unavailable';
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

    const lines: string[] = [definition.description];

    if (rank > 0 && definition.rankDescriptions.length > 0) {
      const currentIndex = Math.min(rank - 1, definition.rankDescriptions.length - 1);
      if (currentIndex >= 0) {
        lines.push('Current: ' + definition.rankDescriptions[currentIndex]);
      }
    }

    if (rank < maxRank && definition.rankDescriptions.length > 0) {
      const nextIndex = Math.min(rank, definition.rankDescriptions.length - 1);
      const nextDescription = definition.rankDescriptions[nextIndex];
      const nextCost = definition.costByRank[rank];
      let nextLine = 'Next: ' + nextDescription;
      if (Number.isFinite(nextCost)) {
        nextLine += ' (Cost ' + nextCost + ')';
      }
      lines.push(nextLine);
    } else {
      lines.push('Next: Fully mastered.');
    }

    if (state?.status === 'locked' && (state.missing?.length ?? 0) > 0) {
      const missingTitles =
        state.missing?.map((reqId) => this.system.getDefinition(reqId)?.title ?? reqId) ?? [];
      if (missingTitles.length > 0) {
        lines.push('Requires: ' + missingTitles.join(', '));
      }
    }

    this.detailTitle.setText(definition.title).setVisible(true);
    this.detailSubtitle.setText(definition.branch).setVisible(true);
    this.detailRankText
      .setText('Rank ' + clampedRank + '/' + maxRank + ' - ' + statusLabel)
      .setVisible(true);
    this.detailBody.setText(lines.join('\n\n')).setVisible(true);

    return true;
  }

  private clearPerkDetails(force = false): void {
    if (!force && this.detailPinned) {
      return;
    }
    this.detailPinned = false;
    this.detailPerkId = null;
    this.detailTitle.setVisible(false).setText('');
    this.detailSubtitle.setVisible(false).setText('');
    this.detailRankText.setVisible(false).setText('');
    this.detailBody.setVisible(false).setText('');
  }

  private updateDefaultHint(stats: SkillTreeStats): void {
    this.hintText.setVisible(false);
    if (this.activeTab === 'spells') {
      this.setFooterHints([
        { key: 'Click', label: 'Bind Q slot' },
        { key: 'Wheel', label: 'Scroll spells' },
        { key: 'Esc', label: 'Resume' },
      ]);
      return;
    }

    if (this.activeTab === 'special') {
      this.setFooterHints([
        { key: '+/-', label: 'Preview stats' },
        { key: 'Wheel', label: 'Scroll derived' },
        { key: 'Esc', label: 'Resume' },
      ]);
      return;
    }

    if (this.activeTab !== 'skills') {
      if (this.stubText) {
        const tab = TAB_DEFINITIONS.find((def) => def.id === this.activeTab);
        this.stubText.setText(
          tab?.i18nPlaceholderKey
            ? resolvePlaceholder(tab)
            : i18n.getFeatureString('skillTreeStubText'),
        );
      }
      this.setFooterHints([
        { key: 'Click', label: 'Select row/card' },
        { key: 'Wheel', label: 'Scroll panel' },
        { key: 'Esc', label: 'Resume' },
      ]);
      return;
    }

    if (stats.arcanePulseUnlocked) {
      this.setFooterHints([
        { key: 'Hover', label: 'Inspect skill' },
        { key: 'Click', label: 'Invest points' },
        { key: 'Wheel', label: 'Pan tree' },
        { key: 'Q', label: 'Arcane pulse ready' },
        { key: 'Esc', label: 'Resume' },
      ]);
    } else if (stats.manaMax > 0) {
      this.setFooterHints([
        { key: 'Hover', label: 'Inspect skill' },
        { key: 'Click', label: 'Invest points' },
        { key: 'Wheel', label: 'Pan tree' },
        { key: 'Mana', label: `${Math.floor(stats.mana)}/${Math.floor(stats.manaMax)}` },
        { key: 'Esc', label: 'Resume' },
      ]);
    } else {
      this.setFooterHints([
        { key: 'Hover', label: 'Inspect skill' },
        { key: 'Click', label: 'Invest points' },
        { key: 'Wheel', label: 'Pan tree' },
        { key: 'Esc', label: 'Resume' },
      ]);
    }
  }

  private setFooterHints(hints: readonly FooterHint[]): void {
    this.currentFooterHints = hints;
    for (const object of this.footerHintObjects.splice(0)) {
      object.destroy();
    }
    this.drawShellFrame();
    if (hints.length === 0) {
      return;
    }
    const layout = this.getPauseMenuLayout();
    const gap = 10;
    let x = layout.footer.x + 14;
    const y = layout.footer.y + 10;
    for (const hint of hints.slice(0, 5)) {
      const key = hint.key ?? hint.icon ?? '';
      const label = hint.label;
      const width = Phaser.Math.Clamp(36 + key.length * 7 + label.length * 6, 92, 172);
      const keyWidth = Math.max(24, key.length * 7 + 10);
      const keyText = this.scene.add
        .text(x + 5 + keyWidth / 2, y + 5, key, {
          fontFamily: 'monospace',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#101824',
        })
        .setOrigin(0.5, 0);
      const labelText = this.scene.add.text(x + keyWidth + 12, y + 5, label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: uiColors.textSecondary,
      });
      this.container.add([keyText, labelText]);
      this.footerHintObjects.push(keyText, labelText);
      x += width + 8;
      if (x > layout.footer.x + layout.footer.width - 120) {
        break;
      }
    }
  }
}
