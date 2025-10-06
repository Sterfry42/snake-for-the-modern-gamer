import Phaser from "phaser";
import type SnakeScene from "../scenes/snakeScene.js";
import type {
  SkillTreeSystem,
  SkillPerkDefinition,
  SkillTreeStats,
  SkillPerkState,
} from "../systems/skillTree.js";

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

type TabId = "skills" | "quests" | "stats";

interface TabDefinition {
  id: TabId;
  label: string;
  placeholder?: string;
}

const TAB_DEFINITIONS: readonly TabDefinition[] = [
  { id: "skills", label: "Skill Tree" },
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
  private readonly nodeVisuals: Map<string, NodeVisual> = new Map();
  private readonly tabLabels: Map<TabId, Phaser.GameObjects.Text> = new Map();
  private readonly stubText: Phaser.GameObjects.Text | null;

  private visible = false;
  private activeTab: TabId = "skills";
  private hintSticky = false;
  private hintTimer?: Phaser.Time.TimerEvent;

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

    this.stubText = TAB_DEFINITIONS.length > 1
      ? this.scene.add
          .text(this.options.width / 2, this.options.height / 2 + 20, "", {
            fontFamily: "monospace",
            fontSize: "18px",
            color: "#9ad1ff",
            align: "center",
            wordWrap: { width: this.options.width - 160 },
          })
          .setOrigin(0.5, 0.5)
          .setVisible(false)
      : null;

    const children: Phaser.GameObjects.GameObject[] = [
      this.background,
      this.connectionGraphics,
      this.title,
      this.scoreText,
      this.manaText,
      this.hintText,
    ];
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
    this.scene.time.delayedCall(0, () => this.container.setDepth(this.options.depth));
    this.refresh();
  }

  hide(): void {
    if (!this.visible) {
      return;
    }
    this.visible = false;
    this.container.setVisible(false);
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
    this.connectionGraphics.setVisible(skillsActive);
    if (this.stubText) {
      this.stubText.setVisible(!skillsActive);
      if (!skillsActive) {
        const tab = TAB_DEFINITIONS.find((def) => def.id === this.activeTab);
        this.stubText.setText(tab?.placeholder ?? "More modules are coming soon.");
      }
    }

    if (!skillsActive) {
      this.connectionGraphics.clear();
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
    const width = this.options.width - TREE_PADDING.horizontal * 2;
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
      });
      button.on("pointerout", () => {
        nodeContainer.setScale(1);
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
      this.hintText.setText("Arcane Pulse ready - press Q (20 mana)");
      this.hintText.setColor("#ffbdfd");
    } else if (stats.manaMax > 0) {
      this.hintText.setText("Mana blooms while you slither - spend it wisely");
      this.hintText.setColor("#5dd6a2");
    } else {
      this.hintText.setText("Pause with Space and invest score to unlock branches");
      this.hintText.setColor("#5dd6a2");
    }
  }
}




