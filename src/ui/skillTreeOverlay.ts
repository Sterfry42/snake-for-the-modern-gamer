import Phaser from "phaser";
import type SnakeScene from "../scenes/snakeScene.js";
import type {
  SkillTreeSystem,
  SkillPerkDefinition,
  SkillTreeStats,
  SkillPerkState,
} from "../systems/skillTree.js";
import { getItem } from "../inventory/itemRegistry.js";
import type { EquipmentSlot } from "../inventory/item.js";

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
}

const DEFAULT_OPTIONS: Required<SkillTreeOverlayOptions> = {
  width: 640,
  height: 520,
  depth: 30,
};

const TREE_PADDING = { top: 140, bottom: 80, horizontal: 80 };

const DETAIL_PANEL_WIDTH = 220;
const DETAIL_PANEL_MARGIN = 24;
const DETAIL_PANEL_PADDING = 16;

type TabId = "skills" | "inventory" | "map";

interface TabDefinition {
  id: TabId;
  label: string;
  placeholder?: string;
}

const TAB_DEFINITIONS: readonly TabDefinition[] = [
  { id: "skills", label: "Skill Tree" },
  { id: "inventory", label: "Inventory", placeholder: "Items you collect will appear here." },
  { id: "map", label: "Map", placeholder: "Explore to reveal more rooms." },
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
  private readonly nodeVisuals: Map<string, NodeVisual> = new Map();
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
  private readonly equipmentContainer: Phaser.GameObjects.Container;
  private readonly equipmentBackground: Phaser.GameObjects.Rectangle;
  private readonly equipmentTitle: Phaser.GameObjects.Text;
  private readonly equipmentLines: Map<string, Phaser.GameObjects.Text> = new Map();
  private wasEquipmentVisible = false;

  private hoveredPerkId: string | null = null;
  private detailPerkId: string | null = null;
  private detailPinned = false;


  private visible = false;
  private activeTab: TabId = "skills";
  private hintSticky = false;
  private hintTimer?: Phaser.Time.TimerEvent;
  private glintTimer?: Phaser.Time.TimerEvent;
  private hoverTip?: { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; targetX: number; targetY: number; ticker?: Phaser.Time.TimerEvent };

  constructor(
    private readonly scene: SnakeScene,
    private readonly system: SkillTreeSystem,
    private readonly handlers: OverlayHandlers,
    options: SkillTreeOverlayOptions = {}
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
    const mapW = this.options.width - DETAIL_PANEL_WIDTH - DETAIL_PANEL_MARGIN - TREE_PADDING.horizontal * 2;
    const mapH = this.options.height - mapY - TREE_PADDING.bottom + 4;
    this.mapBackground = this.scene.add
      .rectangle(mapX, mapY, mapW, mapH, 0x0b1622, 0.72)
      .setStrokeStyle(1, 0x244155)
      .setOrigin(0, 0)
      .setVisible(false);
    this.mapTitle = this.scene.add.text(mapX + 10, mapY + 8, "Map", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#9ad1ff",
    }).setVisible(false);
    this.mapGraphics = this.scene.add.graphics();
    this.mapContainer = this.scene.add.container(0, 0, [this.mapBackground, this.mapTitle, this.mapGraphics]).setVisible(false);

    this.title = this.scene.add
      .text(this.options.width / 2, 24, "Pause Menu", {
        fontFamily: "monospace",
        fontSize: "26px",
        color: "#9ad1ff",
        align: "center",
      })
      .setOrigin(0.5, 0);

    this.scoreText = this.scene.add
      .text(24, 66, "Score: 0", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffffff",
      });

    this.manaText = this.scene.add
      .text(this.options.width - 24, 66, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#9ad1ff",
        align: "right",
      })
      .setOrigin(1, 0);

    this.hintText = this.scene.add
      .text(this.options.width / 2, this.options.height - 36, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#5dd6a2",
        align: "center",
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
      .text(detailTextX, titleY, "", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffffff",
        wordWrap: { width: detailTextWidth },
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.detailSubtitle = this.scene.add
      .text(detailTextX, subtitleY, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#5dd6a2",
        wordWrap: { width: detailTextWidth },
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.detailRankText = this.scene.add
      .text(detailTextX, rankY, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#9ad1ff",
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.detailBody = this.scene.add
      .text(detailTextX, bodyY, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#c8ffe1",
        wordWrap: { width: detailTextWidth },
        lineSpacing: 4,
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.stubText = TAB_DEFINITIONS.length > 1
      ? this.scene.add
          .text(this.options.width / 2, this.options.height / 2 + 20, "", {
            fontFamily: "monospace",
            fontSize: "18px",
            color: "#9ad1ff",
            align: "center",
            wordWrap: { width: this.options.width - DETAIL_PANEL_WIDTH - DETAIL_PANEL_MARGIN - 160 },
          })
          .setOrigin(0.5, 0.5)
          .setVisible(false)
      : null;

    this.inventoryItemsText = this.scene.add.text(TREE_PADDING.horizontal, TREE_PADDING.top, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
      lineSpacing: 8,
    }).setInteractive({ useHandCursor: true });

    this.inventoryItemsText.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!this.visible || this.activeTab !== "inventory") return;
      const localY = pointer.worldY - this.container.y - this.inventoryItemsText.y;
      const lineHeight = 24; // approx fontSize 16 + lineSpacing 8
      const index = Math.floor(localY / lineHeight);
      const itemId = this.inventoryIndex[index];
      if (!itemId) {
        this.selectedInventoryItemId = null;
        this.clearPerkDetails(true);
        return;
      }
      if (itemId.startsWith("unequip:")) {
        const slot = itemId.split(":")[1] as EquipmentSlot;
        const ok = this.scene.unequipSlot(slot);
        if (ok) {
          this.announce(`Unequipped ${slot}.`, "#9ad1ff", 1600);
          this.refresh();
        }
        return;
      }
      this.selectedInventoryItemId = itemId;
      const item = getItem(itemId) as any;
      if (item && item.kind === "equipment") {
        const currentlyEquipped = this.scene.inventory.getEquipped(item.slot as EquipmentSlot);
        if (currentlyEquipped === itemId) {
          const ok = this.scene.unequipSlot(item.slot as EquipmentSlot);
          if (ok) {
            this.announce(`${item.name} unequipped.`, "#9ad1ff", 1600);
            this.refresh();
            this.highlightInventoryItem(this.selectedInventoryItemId ?? itemId);
          }
          return;
        }

        const ok = this.scene.equipItem(itemId);
        if (ok) {
          this.announce(`${item.name} equipped.`, "#5dd6a2", 1600);
          this.refresh();
          this.highlightInventoryItem(this.selectedInventoryItemId ?? itemId);
        } else {
          this.announce(`Cannot equip ${item.name}.`, "#ff6b6b", 1600);
        }
      }
    });

    const children: Phaser.GameObjects.GameObject[] = [
      this.background,
      this.connectionGraphics,
      this.connectionHighlight,
      this.mapContainer,
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
    ];
    // Build equipment panel (hidden by default)
    const equipX = TREE_PADDING.horizontal;
    const equipY = TREE_PADDING.top - 8;
    const equipW = this.options.width - DETAIL_PANEL_WIDTH - DETAIL_PANEL_MARGIN - TREE_PADDING.horizontal * 2;
    const equipH = this.options.height - equipY - TREE_PADDING.bottom + 4;
    this.equipmentBackground = this.scene.add
      .rectangle(equipX, equipY, equipW, equipH, 0x0b1622, 0.72)
      .setStrokeStyle(1, 0x244155)
      .setOrigin(0, 0)
      .setVisible(false);
    this.equipmentTitle = this.scene.add.text(equipX + 10, equipY + 8, "Equipment", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#9ad1ff",
    }).setVisible(false);

    const equipChildren: Phaser.GameObjects.GameObject[] = [this.equipmentBackground, this.equipmentTitle];
    this.equipmentContainer = this.scene.add.container(0, 0, equipChildren).setVisible(false);

    const equipSlots = ["boots", "helm", "ring", "gloves", "cloak", "belt", "amulet"] as const;
    equipSlots.forEach((slot, idx) => {
      const lineY = equipY + 40 + idx * 28;
      const text = this.scene.add.text(equipX + 14, lineY, "", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#ffffff",
      }).setVisible(false).setInteractive({ useHandCursor: true });
      text.on("pointerdown", () => {
        const equipped = this.scene.inventory.getEquipped(slot as unknown as EquipmentSlot);
        if (equipped) {
          void this.scene.unequipSlot(slot as unknown as EquipmentSlot);
          this.refresh();
          // Soft sparkle at the line
          const cx = this.container.x + equipX + equipW / 2;
          const cy = this.container.y + lineY - 6;
          if ((this.scene as any).juice?.uiSparkle) {
            (this.scene as any).juice.uiSparkle(cx, cy);
          }
        }
      });
      this.equipmentLines.set(slot, text);
      this.equipmentContainer.add(text);
    });

    children.push(this.equipmentContainer);
    if (this.stubText) {
      children.push(this.stubText);
    }

    this.container = this.scene.add.container(x, y, children).setDepth(this.options.depth).setVisible(false);

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
      ease: "Cubic.easeOut",
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
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.container.setVisible(false).setAlpha(1).setScale(1);
      },
    });
    this.hoveredPerkId = null;
    this.clearPerkDetails(true);
    this.glintTimer?.remove(false);
    this.glintTimer = undefined;
    this.hideHoverTip();
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
    return this.activeTab === "inventory";
  }

  showInventoryDetailsAtPointer(): boolean {
    if (!this.visible || this.activeTab !== "inventory") {
      return false;
    }
    const pointer = this.scene.input.activePointer;
    if (!pointer) {
      return false;
    }
    const localY = pointer.worldY - this.container.y - this.inventoryItemsText.y;
    const lineHeight = 24;
    const index = Math.floor(localY / lineHeight);
    const id = this.inventoryIndex[index];
    if (!id || id.startsWith("unequip:")) {
      this.clearPerkDetails(true);
      return false;
    }
    this.selectedInventoryItemId = id;
    return this.showInventoryItemDetails();
  }

  announce(message: string, color = "#5dd6a2", duration = 2200): void {
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
      this.announce("Click an item, then press I to inspect.", "#9ad1ff", 2200);
      return false;
    }
    const item = getItem(this.selectedInventoryItemId);
    if (!item) {
      this.announce("Unknown item.", "#ff6b6b", 1600);
      return false;
    }
    const title = item.name ?? this.selectedInventoryItemId;
    const subtitle = (item as any).kind === "equipment" ? `Equipment · Slot: ${(item as any).slot}` : "Item";
    const body = item.description ?? "";

    this.detailTitle.setText(title).setVisible(true);
    this.detailSubtitle.setText(subtitle).setVisible(true);
    this.detailRankText.setText("").setVisible(false);
    this.detailBody.setText(body).setVisible(true);
    return true;
  }

  private highlightInventoryItem(itemId: string): void {
    if (!this.visible || this.activeTab !== "inventory") return;
    const index = this.inventoryIndex.indexOf(itemId);
    if (index < 0) return;
    const lineHeight = 24;
    const x = TREE_PADDING.horizontal;
    const y = TREE_PADDING.top + index * lineHeight - 2;
    const width = this.options.width - DETAIL_PANEL_WIDTH - DETAIL_PANEL_MARGIN - TREE_PADDING.horizontal * 2;
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
      ease: "Cubic.easeOut",
      onComplete: () => rect.destroy(),
    });
  }

  refresh(): void {
    const stats = this.system.getStats();
    const perks = this.system.getPerks();

    this.scoreText.setText("Score: " + this.scene.score);
    if (stats.manaMax > 0) {
      const manaLine =
        "Mana: " +
        stats.mana.toFixed(0) +
        "/" +
        stats.manaMax.toFixed(0) +
        " (+" +
        stats.manaRegen.toFixed(1) +
        "/tick)";
      this.manaText.setText(manaLine);
    } else {
      this.manaText.setText("Mana: latent");
    }

    if (!this.hintSticky) {
      this.updateDefaultHint(stats);
    }

    const skillsActive = this.activeTab === "skills";
    const inventoryActive = this.activeTab === "inventory";
    const equipmentActive = this.activeTab === "equipment";
    this.connectionGraphics.setVisible(skillsActive);
    this.inventoryItemsText.setVisible(inventoryActive);
    this.equipmentContainer.setVisible(false);
    this.equipmentBackground.setVisible(false);
    this.equipmentTitle.setVisible(false);
    const mapActive = this.activeTab === "map";
    this.mapContainer.setVisible(mapActive);
    this.mapBackground.setVisible(mapActive);
    this.mapTitle.setVisible(mapActive);
    this.mapGraphics.setVisible(mapActive);
    if (mapActive) {
      this.drawMapPanel();
    } else {
      this.mapGraphics.clear();
    }

    if (this.stubText) {
      const mapActive = this.activeTab === "map";
      const showStub = !skillsActive && !inventoryActive && !mapActive;
      this.stubText.setVisible(showStub);
      if (showStub) {
        const tab = TAB_DEFINITIONS.find((def) => def.id === this.activeTab);
        this.stubText.setText(tab?.placeholder ?? "More modules are coming soon.");
      }
    }

    if (inventoryActive) {
      const items = this.scene.inventory.getAllItems();
      if (items.length === 0) {
        this.inventoryItemsText.setText("No items in inventory.");
        this.inventoryIndex = [];
      } else {
        const lines: string[] = [];
        const index: string[] = [];
        const slots: EquipmentSlot[] = ["boots", "helm", "ring", "gloves", "cloak", "belt", "amulet"] as unknown as EquipmentSlot[];
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
          let suffix = "";
          if (item && item.kind === "equipment") {
            const isEq = this.scene.inventory.getEquipped(item.slot as EquipmentSlot) === itemId;
            if (isEq) suffix = " (equipped)";
          }
          const prefix = item?.kind === "equipment" ? "[E] " : "";
          lines.push(`${prefix}${name} x${count}${suffix}`);
          index.push(itemId);
        }
        this.inventoryItemsText.setText(lines.join("\n"));
        this.inventoryIndex = index;
        if (!this.hintSticky) {
          this.hintText.setText("Inventory: click to equip/unequip items.");
          this.hintText.setColor("#9ad1ff");
        }
      }
    }

    if (equipmentActive) {
      // Populate equipment panel
      const slots: EquipmentSlot[] = ["boots", "helm", "ring", "gloves", "cloak", "belt", "amulet"] as unknown as EquipmentSlot[];
      for (const slot of slots) {
        const text = this.equipmentLines.get(slot as unknown as string);
        if (!text) continue;
        const equipped = this.scene.inventory.getEquipped(slot);
        const label = (slot as unknown as string).charAt(0).toUpperCase() + (slot as unknown as string).slice(1);
        if (equipped) {
          const item = getItem(equipped);
          text.setText(`${label}: ${item?.name ?? equipped}  [click to unequip]`).setVisible(true).setColor("#c8ffe1");
        } else {
          text.setText(`${label}: — empty —`).setVisible(true).setColor("#7895b4");
        }
      }
      if (!this.wasEquipmentVisible) {
        // Simple tab jingle + sparkle burst
        const centerX = this.container.x + this.options.width / 2 - DETAIL_PANEL_WIDTH / 2 - DETAIL_PANEL_MARGIN / 2;
        const centerY = this.container.y + this.options.height / 2 + 10;
        if ((this.scene as any).juice?.uiTabSwitch) {
          (this.scene as any).juice.uiTabSwitch();
        }
        if ((this.scene as any).juice?.uiSparkle) {
          (this.scene as any).juice.uiSparkle(centerX, centerY);
        }
      }
    } else {
      // Hide equipment texts when not active
      for (const t of this.equipmentLines.values()) t.setVisible(false);
    }

    this.wasEquipmentVisible = equipmentActive;

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
      const nextCost = state.status === "maxed" ? undefined : state.cost;

      visual.rankText.setText("Rank " + Math.min(state.rank, maxRank) + "/" + maxRank);
      if (state.status === "maxed") {
        visual.costText.setText("Maxed");
      } else if (nextCost !== undefined) {
        visual.costText.setText("Cost " + nextCost);
      } else {
        visual.costText.setText("");
      }

      let fillColor = 0x122031;
      let strokeColor = 0x244155;
      let textColor = "#7895b4";
      let costColor = "#7895b4";

      if (state.rank > 0) {
        fillColor = 0x3a7cda;
        strokeColor = 0xa6d4ff;
        textColor = "#ffffff";
        costColor = "#cfe5ff";
      }

      switch (state.status) {
        case "available":
          if (state.rank === 0) {
            fillColor = 0x1e5133;
            strokeColor = 0x5dd6a2;
            textColor = "#c8ffe1";
            costColor = "#c8ffe1";
          }
          break;
        case "unaffordable":
          if (state.rank === 0) {
            fillColor = 0x1a2b40;
            strokeColor = 0x3f617f;
            textColor = "#9ad1ff";
            costColor = "#9ad1ff";
          } else {
            costColor = "#9ad1ff";
          }
          break;
        case "locked":
          fillColor = 0x101824;
          strokeColor = 0x202f40;
          textColor = "#546881";
          costColor = "#546881";
          break;
        case "maxed":
          // already covered by rank > 0
          break;
      }

      visual.button.setFillStyle(fillColor, 1);
      visual.button.setStrokeStyle(2, strokeColor, 1);
      visual.label.setColor(textColor);
      visual.rankText.setColor(textColor);
      visual.costText.setColor(costColor);
      visual.costText.setVisible(state.status !== "maxed" && nextCost !== undefined);

      if (visual.button.input) {
        visual.button.input.cursor = state.status === "available" ? "pointer" : "default";
      }
    }
    if (this.detailPinned && this.detailPerkId) {
      if (!this.populatePerkDetails(this.detailPerkId)) {
        this.clearPerkDetails(true);
      }
    }
  }

  private drawMapPanel(): void {
    this.mapGraphics.clear();
    const getter: any = (this.scene as any);
    const rooms: string[] = getter.getGeneratedRoomsOnCurrentLevel ? getter.getGeneratedRoomsOnCurrentLevel() : [];
    const current: string = (this.scene as any).currentRoomId ?? "0,0,0";
    if (rooms.length === 0) {
      this.mapGraphics.lineStyle(1, 0x244155, 0.8).strokeRect(this.mapBackground.x + 8, this.mapBackground.y + 32, this.mapBackground.width - 16, this.mapBackground.height - 40);
      this.mapGraphics.fillStyle(0x9ad1ff, 0.8);
      this.mapGraphics.fillCircle(this.mapBackground.x + this.mapBackground.width / 2, this.mapBackground.y + this.mapBackground.height / 2, 2);
      return;
    }
    const coords = rooms.map((id) => id.split(",").map((n) => Number(n)) as number[]);
    const level = Number((current.split(",")[2] ?? 0));
    const filtered: number[][] = coords.filter((c) => (c[2] ?? 0) === level);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of filtered) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    if (!isFinite(minX)) { return; }
    const margin = 16;
    const areaW = this.mapBackground.width - margin * 2;
    const areaH = this.mapBackground.height - margin * 2 - 24;
    const spanX = Math.max(1, maxX - minX + 1);
    const spanY = Math.max(1, maxY - minY + 1);
    const cellSize = Math.floor(Math.min(areaW / spanX, areaH / spanY));
    const originX = this.mapBackground.x + margin + (areaW - cellSize * spanX) / 2;
    const originY = this.mapBackground.y + 24 + margin + (areaH - cellSize * spanY) / 2;

    // Draw grid of discovered rooms
    for (const [x, y] of filtered) {
      const gx = originX + (x - minX) * cellSize;
      const gy = originY + (y - minY) * cellSize;
      const id = `${x},${y},${level}`;
      const isCurrent = id === current;
      this.mapGraphics.fillStyle(isCurrent ? 0x5dd6a2 : 0x4da3ff, isCurrent ? 0.9 : 0.7);
      this.mapGraphics.fillRect(gx + 1, gy + 1, cellSize - 2, cellSize - 2);
      this.mapGraphics.lineStyle(1, 0x244155, 0.9).strokeRect(gx + 0.5, gy + 0.5, cellSize - 1, cellSize - 1);
    }
  }

  private buildTabs(): void {
    const startX = 24;
    const baseY = 100;
    let currentX = startX;
    const showHand = TAB_DEFINITIONS.length > 1;

    for (const tab of TAB_DEFINITIONS) {
      const label = this.scene.add
        .text(currentX, baseY, tab.label, {
          fontFamily: "monospace",
          fontSize: "18px",
          color: "#7895b4",
          backgroundColor: "rgba(0,0,0,0)",
          padding: { left: 10, right: 10, top: 6, bottom: 6 },
        })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: showHand });

      label.on("pointerdown", () => {
        this.setActiveTab(tab.id);
      });
      label.on("pointerover", () => {
        if (tab.id !== this.activeTab) {
          label.setColor("#9ad1ff");
        }
      });
      label.on("pointerout", () => {
        this.updateTabVisuals();
      });

      this.container.add(label);
      this.tabLabels.set(tab.id, label);

      currentX += label.width + 18;
    }
  }

  private buildNodes(): void {
    const perks = this.system.getPerks();
    const width = this.options.width - TREE_PADDING.horizontal * 2 - (DETAIL_PANEL_WIDTH + DETAIL_PANEL_MARGIN);
    const height = this.options.height - TREE_PADDING.top - TREE_PADDING.bottom;
    const radius = 30;

    for (const perk of perks) {
      const px = TREE_PADDING.horizontal + perk.position.x * width;
      const py = TREE_PADDING.top + perk.position.y * height;
      const nodeContainer = this.scene.add.container(px, py);

      const button = this.scene.add.circle(0, 0, radius, 0x13233a).setStrokeStyle(2, 0x2b4a63);
      button.setInteractive({ useHandCursor: true });

      const label = this.scene.add
        .text(0, -4, perk.shortLabel, {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#9ad1ff",
        })
        .setOrigin(0.5);

      const rankText = this.scene.add
        .text(0, 22, "Rank 0/0", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#7d9bb8",
        })
        .setOrigin(0.5, 0);

      const costText = this.scene.add
        .text(0, 40, "Cost", {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#7d9bb8",
        })
        .setOrigin(0.5, 0);

      nodeContainer.add([button, label, rankText, costText]);
      nodeContainer.setSize(radius * 2, radius * 2);

      button.on("pointerover", () => {
        nodeContainer.setScale(1.05);
        this.hoveredPerkId = perk.id;
        const absX = this.container.x + px;
        const absY = this.container.y + py;
        (this.scene as any).juice?.uiSparkle?.(absX, absY);
        this.showConnectionHighlight(perk.id);
        if (!this.hintSticky) {
          this.hintText.setText("Press I to inspect " + perk.title);
          this.hintText.setColor("#9ad1ff");
        }
        const state = this.system.getPurchaseState(perk.id);
        const cost = state?.cost;
        const label = perk.title + (Number.isFinite(cost) ? `  (Cost ${cost})` : "");
        this.showHoverTip(label);
      });
      button.on("pointerout", () => {
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
      button.on("pointerdown", () => {
        try {
          const state = this.system.getPurchaseState(perk.id);
          this.handlers.onRequestPurchase(perk.id, state);
        } catch (error) {
          console.error("Failed to resolve perk state", error);
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
    const bg = this.scene.add.rectangle(0, 0, 180, 26, 0x0b1622, 0.9).setStrokeStyle(1, 0x244155).setOrigin(0.5);
    const text = this.scene.add.text(0, 0, "", { fontFamily: "monospace", fontSize: "12px", color: "#cfe5ff" }).setOrigin(0.5);
    const container = this.scene.add.container(0, 0, [bg, text]).setDepth(this.options.depth + 2).setVisible(false);
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
      this.hoverTip.ticker = this.scene.time.addEvent({ delay: 16, loop: true, callback: () => this.updateHoverTipPosition() });
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
    this.scene.tweens.add({ targets: target, scale: 1.12, duration: 120, ease: "Cubic.easeOut", yoyo: true });
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
      ease: "Cubic.easeOut",
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
    this.activeTab = tabId;
    (this.scene as any).juice?.uiTabSwitch?.();
    this.updateTabVisuals();
    this.hintSticky = false;
    this.hintTimer?.remove();
    this.hintTimer = undefined;
    this.refresh();
    this.handlers.onTabChange?.(tabId);
  }

  private updateTabVisuals(): void {
    for (const tab of TAB_DEFINITIONS) {
      const label = this.tabLabels.get(tab.id);
      if (!label) {
        continue;
      }
      if (tab.id === this.activeTab) {
        label.setColor("#ffffff");
        label.setFontStyle("bold");
        label.setBackgroundColor("rgba(30,70,110,0.55)");
      } else {
        label.setColor("#7895b4");
        label.setFontStyle("normal");
        label.setBackgroundColor("rgba(0,0,0,0)");
      }
    }
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
      const label = definition?.title ?? "skill";
      this.hintText.setText("Inspecting " + label);
      this.hintText.setColor("#9ad1ff");
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
    const status = state?.status ?? "unavailable";
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

    const lines: string[] = [definition.description];

    if (rank > 0 && definition.rankDescriptions.length > 0) {
      const currentIndex = Math.min(rank - 1, definition.rankDescriptions.length - 1);
      if (currentIndex >= 0) {
        lines.push("Current: " + definition.rankDescriptions[currentIndex]);
      }
    }

    if (rank < maxRank && definition.rankDescriptions.length > 0) {
      const nextIndex = Math.min(rank, definition.rankDescriptions.length - 1);
      const nextDescription = definition.rankDescriptions[nextIndex];
      const nextCost = definition.costByRank[rank];
      let nextLine = "Next: " + nextDescription;
      if (Number.isFinite(nextCost)) {
        nextLine += " (Cost " + nextCost + ")";
      }
      lines.push(nextLine);
    } else {
      lines.push("Next: Fully mastered.");
    }

    if (state?.status === "locked" && (state.missing?.length ?? 0) > 0) {
      const missingTitles = state.missing
        ?.map((reqId) => this.system.getDefinition(reqId)?.title ?? reqId) ?? [];
      if (missingTitles.length > 0) {
        lines.push("Requires: " + missingTitles.join(", "));
      }
    }

    this.detailTitle.setText(definition.title).setVisible(true);
    this.detailSubtitle.setText(definition.branch).setVisible(true);
    this.detailRankText
      .setText("Rank " + clampedRank + "/" + maxRank + " - " + statusLabel)
      .setVisible(true);
    this.detailBody.setText(lines.join("\n\n")).setVisible(true);

    return true;
  }

  private clearPerkDetails(force = false): void {
    if (!force && this.detailPinned) {
      return;
    }
    this.detailPinned = false;
    this.detailPerkId = null;
    this.detailTitle.setVisible(false).setText("");
    this.detailSubtitle.setVisible(false).setText("");
    this.detailRankText.setVisible(false).setText("");
    this.detailBody.setVisible(false).setText("");
  }


  private updateDefaultHint(stats: SkillTreeStats): void {
    if (this.activeTab !== "skills") {
      if (this.stubText) {
        const tab = TAB_DEFINITIONS.find((def) => def.id === this.activeTab);
        this.stubText.setText(tab?.placeholder ?? "More modules are coming soon.");
      }
      this.hintText.setText("Select a tab to manage your serpent.");
      this.hintText.setColor("#9ad1ff");
      return;
    }

    if (stats.arcanePulseUnlocked) {
      this.hintText.setText("Arcane Pulse ready - press Q (20 mana). Press I over a skill for details.");
      this.hintText.setColor("#ffbdfd");
    } else if (stats.manaMax > 0) {
      this.hintText.setText("Mana blooms while you slither - spend it wisely. Press I over a skill for details.");
      this.hintText.setColor("#5dd6a2");
    } else {
      this.hintText.setText("Hover a skill node and press I for details.");
      this.hintText.setColor("#5dd6a2");
    }
  }
}
