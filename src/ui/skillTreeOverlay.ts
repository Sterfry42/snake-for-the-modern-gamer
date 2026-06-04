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
}

const DEFAULT_OPTIONS: Required<SkillTreeOverlayOptions> = {
  width: 640,
  height: 520,
  depth: 30,
};

const TREE_PADDING = { top: 140, bottom: 80, horizontal: 48 };

const DETAIL_PANEL_WIDTH = 220;
const DETAIL_PANEL_MARGIN = 24;
const DETAIL_PANEL_PADDING = 16;
const CLICK_ROW_TOP_BIAS = 8;

type PrimaryTabId = 'growth' | 'gear' | 'world' | 'system';
type TabId =
  | 'skills'
  | 'spells'
  | 'inventory'
  | 'customize'
  | 'cards'
  | 'destiny'
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
  label: string;
  placeholder?: string;
  group: PrimaryTabId;
}

const TAB_DEFINITIONS: readonly TabDefinition[] = [
  { id: 'skills', label: 'Skill Tree', group: 'growth' },
  { id: 'spells', label: 'Spells', group: 'growth' },
  {
    id: 'inventory',
    label: 'Inventory',
    group: 'gear',
    placeholder: 'Items you collect will appear here.',
  },
  { id: 'customize', label: 'Style', group: 'gear', placeholder: 'Buy palettes and swagger.' },
  { id: 'cards', label: 'Cards', group: 'gear' },
  { id: 'destiny', label: 'Destiny 3', group: 'gear' },
  { id: 'map', label: 'Map', group: 'world', placeholder: 'Explore to reveal more rooms.' },
  { id: 'dating', label: 'Dating', group: 'world' },
  { id: 'quests', label: 'Quests', group: 'world' },
  { id: 'factions', label: 'Factions', group: 'world' },
  { id: 'graph', label: 'Graph', group: 'system' },
  {
    id: 'cheats',
    label: 'Cheats',
    group: 'system',
    placeholder: 'Enter cheat strings: freakdennis, freakerdennis',
  },
  { id: 'info', label: 'Info', group: 'system' },
];

const PRIMARY_TAB_DEFINITIONS: readonly { id: PrimaryTabId; label: string }[] = [
  { id: 'growth', label: 'Growth' },
  { id: 'gear', label: 'Gear' },
  { id: 'world', label: 'World' },
  { id: 'system', label: 'System' },
];

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
  private readonly tabLabels: Map<TabId, Phaser.GameObjects.Text> = new Map();
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
  private readonly scrollHintText: Phaser.GameObjects.Text;
  private readonly scrollOffsets: Partial<Record<TabId, number>> = {};
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
    this.options = {
      width: options.width ?? DEFAULT_OPTIONS.width,
      height: options.height ?? DEFAULT_OPTIONS.height,
      depth: options.depth ?? DEFAULT_OPTIONS.depth,
    };

    const x = (this.scene.scale.width - this.options.width) / 2;
    const y = (this.scene.scale.height - this.options.height) / 2;

    this.background = this.scene.add
      .rectangle(0, 0, this.options.width, this.options.height, 0x071019, 0.94)
      .setStrokeStyle(2, 0x4da3ff)
      .setOrigin(0, 0);

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
      .text(mapX + 10, mapY + 8, 'Map', {
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
      .text(graphX + 10, graphY + 8, 'Luck Graph', {
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
      .text(cheatX + 10, cheatY + 8, 'Cheat Menu', {
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
      this.announce('Type a cheat, then press Enter.', '#9ad1ff', 1600);
    });
    this.cheatApplyButton = this.scene.add
      .text(cheatX + 14, cheatY + 110, 'Apply', {
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
      .text(this.options.width / 2, 24, 'Pause Menu', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#9ad1ff',
        align: 'center',
      })
      .setOrigin(0.5, 0);

    this.scoreText = this.scene.add.text(24, 66, 'Score: 0', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });

    this.manaText = this.scene.add
      .text(this.options.width - 24, 66, '', {
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
    const detailPanelY = TREE_PADDING.top - 28;
    const detailPanelHeight = this.options.height - detailPanelY - TREE_PADDING.bottom + 12;
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
      .text(TREE_PADDING.horizontal, TREE_PADDING.top, '', {
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
    this.scrollMaskGraphics.fillRect(
      x + TREE_PADDING.horizontal,
      y + TREE_PADDING.top - 12,
      this.options.width - DETAIL_PANEL_WIDTH - DETAIL_PANEL_MARGIN - TREE_PADDING.horizontal * 2,
      this.getScrollableViewportHeight(),
    );
    const scrollMask = this.scrollMaskGraphics.createGeometryMask();
    this.questListText.setMask(scrollMask);
    this.spellsText.setMask(scrollMask);
    this.customizationText.setMask(scrollMask);
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
          this.announce(`Unequipped ${slot}.`, '#9ad1ff', 1600);
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
          this.announce(`Cannot equip ${item.name}.`, '#ff6b6b', 1600);
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
        this.announce('That Q option is not available yet.', '#ff6b6b', 1800);
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
    this.scene.input.on(
      'wheel',
      (_pointer: Phaser.Input.Pointer, _objects: unknown[], _dx: number, dy: number) => {
        this.scrollActiveText(dy);
      },
    );

    const children: Phaser.GameObjects.GameObject[] = [
      this.background,
      this.connectionGraphics,
      this.connectionHighlight,
      this.mapContainer,
      this.graphContainer,
      this.cheatContainer,
      this.detailPanel,
      this.title,
      this.scoreText,
      this.manaText,
      this.detailTitle,
      this.detailSubtitle,
      this.detailRankText,
      this.detailBody,
      this.hintText,
      this.inventoryItemsText,
      this.customizationText,
      this.questListText,
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
    return this.activeTab === 'inventory';
  }

  showInventoryDetailsAtPointer(): boolean {
    if (!this.visible || this.activeTab !== 'inventory') {
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
    this.hintText.setText(message);
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
      this.announce('Click an item, then press I to inspect.', '#9ad1ff', 2200);
      return false;
    }
    const item = getItem(this.selectedInventoryItemId);
    if (!item) {
      this.announce('Unknown item.', '#ff6b6b', 1600);
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
    if (!this.visible || this.activeTab !== 'inventory' || !this.selectedInventoryItemId) {
      return false;
    }
    const result = this.scene.snakeGame.useInventoryItem(this.selectedInventoryItemId);
    this.announce(result.message, result.color ?? (result.ok ? '#5dd6a2' : '#ff6b6b'), 2200);
    this.refresh();
    this.showInventoryItemDetails();
    return true;
  }

  cookSelectedInventoryItem(): boolean {
    if (!this.visible || this.activeTab !== 'inventory' || !this.selectedInventoryItemId) {
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
    const hints = ['Press I to inspect.'];
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
    if (!this.visible || this.activeTab !== 'inventory') return;
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
        this.activeTab !== 'quests' &&
        this.activeTab !== 'people' &&
        this.activeTab !== 'dating' &&
        this.activeTab !== 'destiny' &&
        this.activeTab !== 'customize')
    ) {
      return;
    }
    const text =
      this.activeTab === 'spells'
        ? this.spellsText
        : this.activeTab === 'customize'
          ? this.customizationText
          : this.questListText;
    const next = (this.scrollOffsets[this.activeTab] ?? 0) + deltaY;
    this.applyScrollableTextOffset(this.activeTab, text, next);
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
        maxScroll > 0 ? `Mouse wheel to scroll ${Math.ceil(offset)}/${Math.ceil(maxScroll)}` : '',
      )
      .setVisible(
        (tab === 'spells' ||
          tab === 'quests' ||
          tab === 'people' ||
          tab === 'dating' ||
          tab === 'customize') &&
          maxScroll > 0,
      );
  }

  private resetScrollableText(text: Phaser.GameObjects.Text): void {
    text.setY(TREE_PADDING.top - 12);
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
    const lines: string[] = [`Q Slot: ${bound?.label ?? 'Unbound'}`, ''];
    const rowMap: Array<{
      startRow: number;
      endRow: number;
      abilityId: string;
      canBind: boolean;
    }> = [];
    let visualRow = 2;

    if (views.length === 0) {
      lines.push('No spells or commands discovered yet.');
      this.spellRowMap = [];
      this.spellsText.setText(lines.join('\n'));
      return;
    }

    lines.push('Click an available ability to bind Q.', '');
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

  refresh(): void {
    if (!this.isTabAvailable(this.activeTab)) {
      this.activeTab = 'skills';
      this.activePrimaryTab = 'growth';
      this.updateTabVisuals();
    }
    const stats = this.system.getStats();
    const perks = this.system.getPerks();

    this.scoreText.setText('Score: ' + this.scene.score);
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
      this.manaText.setText('Mana: latent');
    }

    if (!this.hintSticky) {
      this.updateDefaultHint(stats);
    }

    const skillsActive = this.activeTab === 'skills';
    const inventoryActive = this.activeTab === 'inventory';
    const customizationActive = this.activeTab === 'customize';
    const cardsActive = this.activeTab === 'cards';
    const spellsActive = this.activeTab === 'spells';
    const cheatsActive = this.activeTab === 'cheats';
    const peopleActive = this.activeTab === 'people';
    const datingActive = this.activeTab === 'dating';
    const questsActive = this.activeTab === 'quests';
    const factionsActive = this.activeTab === 'factions';
    const destinyActive = this.activeTab === 'destiny';
    const infoActive = this.activeTab === 'info';
    const graphActive = this.activeTab === 'graph';
    this.connectionGraphics.setVisible(skillsActive);
    this.inventoryItemsText.setVisible(inventoryActive);
    this.customizationText.setVisible(customizationActive);
    this.cardsText.setVisible(cardsActive);
    this.spellsText.setVisible(spellsActive);
    this.questListText.setVisible(questsActive || datingActive || peopleActive || destinyActive);
    this.factionsText.setVisible(factionsActive);
    if (
      !spellsActive &&
      !questsActive &&
      !datingActive &&
      !peopleActive &&
      !destinyActive &&
      !customizationActive
    ) {
      this.scrollHintText.setVisible(false);
    }
    if (!spellsActive) {
      this.resetScrollableText(this.spellsText);
    }
    if (!questsActive && !datingActive && !peopleActive && !destinyActive) {
      this.resetScrollableText(this.questListText);
    }
    if (!customizationActive) {
      this.resetScrollableText(this.customizationText);
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
      this.refreshCheatInputText();
    } else {
      this.cheatInputFocused = false;
    }

    if (this.stubText) {
      const mapActive = this.activeTab === 'map';
      const showStub =
        !skillsActive &&
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
        !questsActive &&
        !factionsActive &&
        !infoActive;
      this.stubText.setVisible(showStub);
      if (showStub) {
        const tab = TAB_DEFINITIONS.find((def) => def.id === this.activeTab);
        this.stubText.setText(tab?.placeholder ?? 'More modules are coming soon.');
      }
    }

    if (inventoryActive) {
      const items = this.scene.inventory.getAllItems();
      if (items.length === 0) {
        this.inventoryItemsText.setText('No items in inventory.');
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
            if (isEq) suffix = ' (equipped)';
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
          this.hintText.setText('Inventory: click an item, U uses food, C cooks raw food.');
          this.hintText.setColor('#9ad1ff');
        }
      }
    }

    if (cardsActive) {
      this.cardsText.setText(this.formatCardCollection(this.scene.getCardCollectionForMenu()));
      this.detailTitle.setText('Cards').setVisible(true);
      this.detailSubtitle.setText('Collection').setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText('Cards bought from villages appear here. They can be used at card tables.')
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText('Card collection: owned cards and counts.');
        this.hintText.setColor('#9ad1ff');
      }
    }

    if (spellsActive) {
      this.refreshSpellsText();
      this.applyScrollableTextOffset('spells', this.spellsText);
      this.detailTitle.setText('Q Slot').setVisible(true);
      this.detailSubtitle.setText('Spells And Commands').setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'Q now resolves through a bindable action slot. Spell casts can share this tab with future follower commands.',
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText('Spells: click an available row to bind Q.');
        this.hintText.setColor('#ffbdfd');
      }
    }

    if (questsActive) {
      this.questListText.setText(this.formatQuestInfo(this.scene.getAcceptedQuestList()));
      this.applyScrollableTextOffset('quests', this.questListText);
      this.detailTitle.setText('Quests').setVisible(true);
      this.detailSubtitle.setText('Accepted Tasks').setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'Only quests accepted during this run appear here. Accepted or completed quests are not offered again.',
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText('Accepted quests are listed here.');
        this.hintText.setColor('#9ad1ff');
      }
    }

    if (datingActive) {
      this.questListText.setText(this.formatDatingInfo(this.handlers.getDatingView?.() ?? []));
      this.applyScrollableTextOffset('dating', this.questListText);
      this.detailTitle.setText('Dating').setVisible(true);
      this.detailSubtitle.setText('Relationships').setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'Romance is opt-in. Flirt, gift, or ask someone out in dialogue to create a route. Jealousy and neglect only matter after that.',
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText('Dating: affection, trust, jealousy, resentment.');
        this.hintText.setColor('#ffbdfd');
      }
    }

    if (peopleActive) {
      this.questListText.setText(this.formatPeopleInfo(this.handlers.getPeopleView?.() ?? []));
      this.applyScrollableTextOffset('people', this.questListText);
      this.detailTitle.setText('People').setVisible(true);
      this.detailSubtitle.setText('Actor Journal').setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'People collects actor memories, social ties, revealed secrets, and current moods. Ask NPCs about rumors, family, the King, or themselves to fill it.',
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText('People: living actors, rumors, ties, and personal reveals.');
        this.hintText.setColor('#9ad1ff');
      }
    }

    if (factionsActive) {
      this.factionsText.setText(
        this.formatFactionCards(this.scene.getFactionCards(), this.scene.getWardContractsForMenu()),
      );
      this.detailTitle.setText('Factions').setVisible(true);
      this.detailSubtitle.setText('Standing').setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'Faction standing changes prices, access, and hostility. Ward contracts trigger before lives.',
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText('Factions: who likes you, who sells to you, and who may bite.');
        this.hintText.setColor('#9ad1ff');
      }
    }

    if (destinyActive) {
      const lines = this.handlers.getDestinyView?.() ?? [];
      this.questListText.setText(
        lines.length > 0 ? lines.join('\n') : 'DESTINY 3 systems offline.',
      );
      this.applyScrollableTextOffset('destiny', this.questListText);
      this.detailTitle.setText('Destiny 3').setVisible(true);
      this.detailSubtitle.setText('Guardian State').setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'Tracks current Starforged activity, power, equipment, ability charge, super charge, active surges, and recent rewards.',
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText('Destiny 3: Starforged power, activity, gear, and surges.');
        this.hintText.setColor('#9df7ff');
      }
    }

    if (infoActive) {
      this.questListText.setVisible(true);
      this.questListText.setText(
        'Use the grouped tabs above to manage growth, gear, world state, and system tools.',
      );
      this.detailTitle.setText('Info').setVisible(true);
      this.detailSubtitle.setText('Menu').setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'Growth holds skills. Gear holds items, style, and cards. World holds map, quests, and factions.',
        )
        .setVisible(true);
    }

    if (cheatsActive) {
      this.detailTitle.setText('Cheats').setVisible(true);
      this.detailSubtitle.setText('String Input').setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'Supported cheats:\n\ninvestingincrypto\n90fps240Hz\nimawiddlebabywhoneedshelp\nimmortal\nmammamia\nstarman\nmario\nteleporterquest\ngreenpurchase\nfindmybaby\nbabyquest\nfreakyou\ntimequest\nfreakdennis\nfreakerdennis',
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText('Type a cheat string and press Enter.');
        this.hintText.setColor('#9ad1ff');
      }
    }

    if (graphActive) {
      this.detailTitle.setText('Luck Graph').setVisible(true);
      this.detailSubtitle.setText('Out Of 10 vs Luck').setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      this.detailBody
        .setText(
          'Plots the provided table. X uses a log scale so the 130 outlier can share the same graph with the smaller values.',
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText('Graph tab: provided luck data.');
        this.hintText.setColor('#9ad1ff');
      }
    }

    if (customizationActive) {
      const state = this.scene.getSnakeCustomizationState();
      const lines: string[] = ['Style', ''];
      const index: string[] = ['', ''];
      const rowMap: Array<{ row: number; actionId: string }> = [];
      let visualRow = 0;
      visualRow += this.countRenderedLines(lines[0]);
      visualRow += 1;
      const ownedThemes = this.scene
        .getSnakeThemeDefinitions()
        .filter(
          (theme) => state.unlockedThemes.includes(theme.id) || state.activeTheme === theme.id,
        );
      for (const theme of ownedThemes) {
        const active = state.activeTheme === theme.id;
        const line = `${active ? '> ' : ''}${theme.label} [${active ? 'equipped' : 'owned'}]`;
        lines.push(line);
        index.push(`theme:${theme.id}`);
        rowMap.push({ row: visualRow, actionId: `theme:${theme.id}` });
        visualRow += this.countRenderedLines(line);
      }
      lines.push('', 'Hats');
      index.push('', '');
      visualRow += 2;
      const hats = this.scene
        .getSnakeHatDefinitions()
        .filter((hat) => state.unlockedHats.includes(hat.id) || state.activeHat === hat.id);
      for (const hat of hats) {
        const equipped = state.activeHat === hat.id;
        const line = `${equipped ? '> ' : ''}${hat.label} [${equipped ? 'equipped' : 'owned'}]`;
        lines.push(line);
        index.push(`hat:${hat.id}`);
        rowMap.push({ row: visualRow, actionId: `hat:${hat.id}` });
        visualRow += this.countRenderedLines(line);
      }
      if (hats.length === 0) {
        lines.push('No hats owned.');
        index.push('');
        visualRow += 1;
      }
      lines.push('');
      index.push('');
      visualRow += 1;
      const walkingNoiseStatus = !state.loudWalkingNoiseUnlocked
        ? '100 score'
        : state.loudWalkingNoiseEnabled
          ? 'enabled'
          : 'owned';
      const walkingNoiseLine = `Disable Walking Noise [${walkingNoiseStatus}]`;
      lines.push(walkingNoiseLine);
      index.push('walking-noise');
      rowMap.push({ row: visualRow, actionId: 'walking-noise' });
      visualRow += this.countRenderedLines(walkingNoiseLine);
      lines.push('');
      index.push('');
      visualRow += 1;
      const cowbellStatus = !state.cowbellUnlocked
        ? '45 score'
        : state.cowbellEquipped
          ? 'enabled'
          : 'owned';
      const cowbellLine = `Cowbell [${cowbellStatus}]`;
      lines.push(cowbellLine);
      index.push('cowbell');
      rowMap.push({ row: visualRow, actionId: 'cowbell' });
      visualRow += this.countRenderedLines(cowbellLine);
      lines.push('');
      index.push('');
      visualRow += 1;
      const minimapUnlocked = this.scene.isMinimapUnlocked();
      const minimapEnabled = this.scene.isMinimapEnabled();
      const minimapStatus = minimapUnlocked ? (minimapEnabled ? 'On' : 'Off') : `50 score`;
      const minimapLine = `Minimap Module [${minimapStatus}]`;
      lines.push(minimapLine, '  Shows nearby rooms, hazards, walls, and snake position.');
      index.push('minimap', '');
      rowMap.push({ row: visualRow, actionId: 'minimap' });
      visualRow += this.countRenderedLines(minimapLine);
      visualRow += this.countRenderedLines(
        '  Shows nearby rooms, hazards, walls, and snake position.',
      );
      lines.push('');
      index.push('');
      visualRow += 1;
      const languageStatus = !state.languageSelected
        ? `${200} score`
        : state.languageSet
          ? i18n.getCurrentLanguage() === 'es'
            ? 'Spanish (enabled)'
            : 'Spanish (disabled)'
          : 'Spanish (enabled)';
      const languageLine = `Spanish Language [${languageStatus}]`;
      lines.push(languageLine);
      index.push('language');
      rowMap.push({ row: visualRow, actionId: 'language' });
      this.customizationText.setText(lines.join('\n'));
      this.customizationIndex = index;
      this.customizationRowMap = rowMap;
      this.applyScrollableTextOffset('customize', this.customizationText);
      this.detailTitle.setText('Snake Style').setVisible(true);
      this.detailSubtitle.setText('Cosmetics').setVisible(true);
      this.detailRankText.setText('').setVisible(false);
      const languageDesc = state.languageSelected
        ? 'Set your game language to Spanish.'
        : 'Unlock Spanish language for 200 score.';
      this.detailBody
        .setText(
          `Equip owned palettes and hats. The minimap can be unlocked here and toggled with M. ${languageDesc}`,
        )
        .setVisible(true);
      if (!this.hintSticky) {
        this.hintText.setText('Equip owned cosmetics, unlock utilities.');
        this.hintText.setColor('#9ad1ff');
      }
    } else if (
      this.activeTab !== 'inventory' &&
      this.activeTab !== 'skills' &&
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
      for (const visual of this.nodeVisuals.values()) {
        visual.container.setVisible(false);
      }
      return;
    }

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

      visual.rankText.setText('Rank ' + Math.min(state.rank, maxRank) + '/' + maxRank);
      if (state.status === 'maxed') {
        visual.costText.setText('Maxed');
      } else if (nextCost !== undefined) {
        visual.costText.setText('Cost ' + nextCost);
      } else {
        visual.costText.setText('');
      }

      let fillColor = 0x122031;
      let strokeColor = 0x244155;
      let textColor = '#7895b4';
      let costColor = '#7895b4';

      if (state.rank > 0) {
        fillColor = 0x3a7cda;
        strokeColor = 0xa6d4ff;
        textColor = '#ffffff';
        costColor = '#cfe5ff';
      }

      switch (state.status) {
        case 'available':
          if (state.rank === 0) {
            fillColor = 0x1e5133;
            strokeColor = 0x5dd6a2;
            textColor = '#c8ffe1';
            costColor = '#c8ffe1';
          }
          break;
        case 'unaffordable':
          if (state.rank === 0) {
            fillColor = 0x1a2b40;
            strokeColor = 0x3f617f;
            textColor = '#9ad1ff';
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
      visual.costText.setVisible(state.status !== 'maxed' && nextCost !== undefined);

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
      return 'No accepted quests.';
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
        'No active relationships.',
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
    const lines: string[] = [];
    for (const faction of visible) {
      const sign = faction.alignment > 0 ? '+' : '';
      lines.push(
        `${faction.name}`,
        `${faction.standing.toUpperCase()} | ${sign}${faction.alignment}`,
        faction.subtitle,
        faction.description,
        ...faction.effects.map((effect) => `  - ${effect}`),
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
    const startX = 24;
    const primaryY = 78;
    const secondaryY = 112;
    const showHand = TAB_DEFINITIONS.length > 1;

    let primaryX = startX;
    for (const primary of PRIMARY_TAB_DEFINITIONS) {
      const label = this.scene.add
        .text(primaryX, primaryY, primary.label, {
          fontFamily: 'monospace',
          fontSize: '17px',
          color: '#7895b4',
          backgroundColor: 'rgba(0,0,0,0)',
          padding: { left: 10, right: 10, top: 5, bottom: 5 },
        })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });

      label.on('pointerdown', () => {
        this.setActivePrimaryTab(primary.id);
      });
      label.on('pointerover', () => {
        if (primary.id !== this.activePrimaryTab) {
          label.setColor('#9ad1ff');
        }
      });
      label.on('pointerout', () => {
        this.updateTabVisuals();
      });

      this.container.add(label);
      this.primaryTabLabels.set(primary.id, label);
      primaryX += label.width + 14;
    }

    let currentX = startX;
    for (const tab of TAB_DEFINITIONS) {
      const label = this.scene.add
        .text(currentX, secondaryY, tab.label, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#7895b4',
          backgroundColor: 'rgba(0,0,0,0)',
          padding: { left: 9, right: 9, top: 5, bottom: 5 },
        })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: showHand });

      label.on('pointerdown', () => {
        this.setActiveTab(tab.id);
      });
      label.on('pointerover', () => {
        if (tab.id !== this.activeTab) {
          label.setColor('#9ad1ff');
        }
      });
      label.on('pointerout', () => {
        this.updateTabVisuals();
      });

      this.container.add(label);
      this.tabLabels.set(tab.id, label);

      currentX += label.width + 18;
    }
    this.layoutSecondaryTabs();
  }

  private buildNodes(): void {
    const perks = this.system.getPerks();
    const width =
      this.options.width - TREE_PADDING.horizontal * 2 - (DETAIL_PANEL_WIDTH + DETAIL_PANEL_MARGIN);
    const height = this.options.height - TREE_PADDING.top - TREE_PADDING.bottom;
    const radius = 18;

    for (const perk of perks) {
      const px = TREE_PADDING.horizontal + perk.position.x * width;
      const py = TREE_PADDING.top + perk.position.y * height;
      const nodeContainer = this.scene.add.container(px, py);

      const button = this.scene.add.circle(0, 0, radius, 0x13233a).setStrokeStyle(2, 0x2b4a63);
      button.setInteractive({ useHandCursor: true });

      const label = this.scene.add
        .text(0, -4, perk.shortLabel, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#9ad1ff',
        })
        .setOrigin(0.5);

      const rankText = this.scene.add
        .text(0, 17, 'Rank 0/0', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#7d9bb8',
        })
        .setOrigin(0.5, 0);

      const costText = this.scene.add
        .text(0, 30, 'Cost', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#7d9bb8',
        })
        .setOrigin(0.5, 0);

      nodeContainer.add([button, label, rankText, costText]);
      nodeContainer.setSize(radius * 2, radius * 2);

      button.on('pointerover', () => {
        nodeContainer.setScale(1.05);
        this.hoveredPerkId = perk.id;
        const absX = this.container.x + px;
        const absY = this.container.y + py;
        (this.scene as any).juice?.uiSparkle?.(absX, absY);
        this.showConnectionHighlight(perk.id);
        if (!this.hintSticky) {
          this.hintText.setText('Press I to inspect ' + perk.title);
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
  }

  private setActiveTab(tabId: TabId): void {
    if (this.activeTab === tabId) {
      return;
    }
    if (!this.isTabAvailable(tabId)) {
      return;
    }
    this.activeTab = tabId;
    this.activePrimaryTab =
      TAB_DEFINITIONS.find((tab) => tab.id === tabId)?.group ?? this.activePrimaryTab;
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
    const startX = 24;
    let currentX = startX;
    for (const tab of TAB_DEFINITIONS) {
      const label = this.tabLabels.get(tab.id);
      if (!label) continue;
      const visible = tab.group === this.activePrimaryTab && this.isTabAvailable(tab.id);
      label.setVisible(visible);
      if (!visible) continue;
      label.setX(currentX);
      currentX += label.width + 14;
    }
  }

  private updateTabVisuals(): void {
    for (const primary of PRIMARY_TAB_DEFINITIONS) {
      const label = this.primaryTabLabels.get(primary.id);
      if (!label) continue;
      if (primary.id === this.activePrimaryTab) {
        label.setColor('#ffffff');
        label.setFontStyle('bold');
        label.setBackgroundColor('rgba(35,90,65,0.55)');
      } else {
        label.setColor('#7895b4');
        label.setFontStyle('normal');
        label.setBackgroundColor('rgba(0,0,0,0)');
      }
    }
    this.layoutSecondaryTabs();
    for (const tab of TAB_DEFINITIONS) {
      const label = this.tabLabels.get(tab.id);
      if (!label) {
        continue;
      }
      if (!this.isTabAvailable(tab.id)) {
        label.setVisible(false);
        continue;
      }
      if (tab.id === this.activeTab) {
        label.setColor('#ffffff');
        label.setFontStyle('bold');
        label.setBackgroundColor('rgba(30,70,110,0.55)');
      } else {
        label.setColor('#7895b4');
        label.setFontStyle('normal');
        label.setBackgroundColor('rgba(0,0,0,0)');
      }
    }
  }

  private isTabAvailable(tabId: TabId): boolean {
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
    if (this.activeTab === 'spells') {
      this.hintText.setText('Spells: click an available row to bind Q.');
      this.hintText.setColor('#ffbdfd');
      return;
    }

    if (this.activeTab !== 'skills') {
      if (this.stubText) {
        const tab = TAB_DEFINITIONS.find((def) => def.id === this.activeTab);
        this.stubText.setText(tab?.placeholder ?? 'More modules are coming soon.');
      }
      this.hintText.setText('Select a tab to manage your serpent.');
      this.hintText.setColor('#9ad1ff');
      return;
    }

    if (stats.arcanePulseUnlocked) {
      this.hintText.setText('Arcane Pulse ready - press Q or bind another Q option in Spells.');
      this.hintText.setColor('#ffbdfd');
    } else if (stats.manaMax > 0) {
      this.hintText.setText(
        'Mana blooms while you slither - spend it wisely. Press I over a skill for details.',
      );
      this.hintText.setColor('#5dd6a2');
    } else {
      this.hintText.setText('Hover a skill node and press I for details.');
      this.hintText.setColor('#5dd6a2');
    }
  }
}
