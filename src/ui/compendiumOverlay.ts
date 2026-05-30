// Compendium overlay — full-screen bestiary showing discovered and undiscovered creatures.
// Follows the pattern of skillTreeOverlay.ts for UI structure.

import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import type { CompendiumEntry, CompanionDefinition } from '../companions/companionTypes.js';
import { RARITY_COLORS, KIND_LABELS } from '../ui/companionEncounterPopup.js';

interface CompendiumOptions {
  width?: number;
  height?: number;
  depth?: number;
}

const DEFAULT_OPTIONS: Required<CompendiumOptions> = {
  width: 700,
  height: 500,
  depth: 30,
};

const GRID_ITEM_SIZE = 48;
const GRID_GAP = 8;
const FILTER_BUTTON_HEIGHT = 32;
const HEADER_HEIGHT = 60;

/**
 * Full-screen bestiary overlay for the companion compendium.
 * Shows grid of creature icons with discovery status and filter buttons.
 */
export class CompendiumOverlay {
  private readonly options: Required<CompendiumOptions>;
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly counterText: Phaser.GameObjects.Text;
  private readonly filterButtons: Map<string, Phaser.GameObjects.Text> = new Map();
  private readonly gridContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private readonly detailPanel: Phaser.GameObjects.Rectangle;
  private readonly detailTitle: Phaser.GameObjects.Text;
  private readonly detailSubtitle: Phaser.GameObjects.Text;
  private readonly detailBody: Phaser.GameObjects.Text;
  private readonly closeBtn: Phaser.GameObjects.Text;

  private entries: CompendiumEntry[] = [];
  private activeFilter = 'all';
  private visible = false;
  private hoveredEntry: CompendiumEntry | null = null;
  private selectedEntry: CompendiumEntry | null = null;

  constructor(
    private readonly scene: SnakeScene,
    options: CompendiumOptions = {},
  ) {
    this.options = {
      width: options.width ?? DEFAULT_OPTIONS.width,
      height: options.height ?? DEFAULT_OPTIONS.height,
      depth: options.depth ?? DEFAULT_OPTIONS.depth,
    };

    const x = (this.scene.scale.width - this.options.width) / 2;
    const y = (this.scene.scale.height - this.options.height) / 2;

    // Background
    this.background = this.scene.add
      .rectangle(0, 0, this.options.width, this.options.height, 0x071019, 0.94)
      .setStrokeStyle(2, 0x4da3ff)
      .setOrigin(0, 0);

    // Title
    this.title = this.scene.add
      .text(this.options.width / 2, 20, 'Compendium', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#9ad1ff',
      })
      .setOrigin(0.5, 0);

    // Discovery counter
    this.counterText = this.scene.add
      .text(this.options.width - 20, HEADER_HEIGHT - 14, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#5dd6a2',
      })
      .setOrigin(1, 0);

    // Filter buttons row
    const filterY = HEADER_HEIGHT + 4;
    const filters = ['all', 'follower', 'protector', 'scout', 'forager', 'fighter', 'mount'];
    const filterWidth = (this.options.width - 40) / filters.length;

    for (const filter of filters) {
      const btnX = 20 + (filterWidth - 60) / 2 + filters.indexOf(filter) * filterWidth;
      const btn = this.scene.add
        .text(btnX + 30, filterY + 16, KIND_LABELS[filter as keyof typeof KIND_LABELS] ?? filter, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#9ad1ff',
          backgroundColor: '#22334a',
          padding: { left: 8, right: 8, top: 3, bottom: 3 },
        })
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        if (!this.visible) return;
        this.activeFilter = filter;
        this.refreshFilterButtons();
        this.renderGrid();
      });

      btn.on('pointerover', () => {
        if (!this.visible || this.activeFilter === filter) return;
        (btn as any).setStyle('backgroundColor', '#2a4455');
      });
      btn.on('pointerout', () => {
        if (!this.visible || this.activeFilter === filter) return;
        (btn as any).setStyle('backgroundColor', '#22334a');
      });

      this.filterButtons.set(filter, btn);
    }

    // Detail panel
    const detailX = this.options.width - 240;
    const detailY = HEADER_HEIGHT + FILTER_BUTTON_HEIGHT + 20;
    const detailW = 220;
    const detailH = this.options.height - detailY - 40;

    this.detailPanel = this.scene.add
      .rectangle(detailX, detailY, detailW, detailH, 0x0b1622, 0.92)
      .setStrokeStyle(1, 0x244155)
      .setOrigin(0, 0);

    this.detailTitle = this.scene.add
      .text(detailX + 12, detailY + 12, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        wordWrap: { width: detailW - 24 },
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.detailSubtitle = this.scene.add
      .text(detailX + 12, detailY + 34, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#5dd6a2',
        wordWrap: { width: detailW - 24 },
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.detailBody = this.scene.add
      .text(detailX + 12, detailY + 56, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#c8ffe1',
        wordWrap: { width: detailW - 24 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0)
      .setVisible(false);

    // Close button
    this.closeBtn = this.scene.add
      .text(this.options.width - 24, this.options.height - 24, '\u2716 Close', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ff6b6b',
        backgroundColor: '#442222',
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setOrigin(1, 1)
      .setInteractive({ useHandCursor: true });

    this.closeBtn.on('pointerdown', () => this.hide());
    this.closeBtn.on('pointerover', () => this.closeBtn.setScale(1.05));
    this.closeBtn.on('pointerout', () => this.closeBtn.setScale(1));

    // Build container
    const children: Phaser.GameObjects.GameObject[] = [
      this.background,
      this.title,
      this.counterText,
      ...Array.from(this.filterButtons.values()),
      this.detailPanel,
      this.detailTitle,
      this.detailSubtitle,
      this.detailBody,
      this.closeBtn,
    ];

    this.container = this.scene.add
      .container(x, y, children)
      .setDepth(this.options.depth)
      .setVisible(false);
  }

  /**
   * Show the compendium overlay with entries.
   */
  show(entries: CompendiumEntry[]): void {
    this.entries = entries;
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

    this.refreshFilterButtons();
    this.renderGrid();
    this.clearDetail();
  }

  /**
   * Hide the compendium overlay.
   */
  hide(): void {
    if (!this.visible) return;
    this.visible = false;

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

    this.clearDetail();
    this.hoveredEntry = null;
    this.selectedEntry = null;
  }

  /**
   * Refresh overlay with new entries.
   */
  refresh(entries: CompendiumEntry[]): void {
    if (!this.visible) return;
    this.entries = entries;
    this.renderGrid();
  }

  /**
   * Toggle visibility.
   */
  toggle(entries: CompendiumEntry[]): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show(entries);
    }
  }

  /**
   * Check if the overlay is currently visible.
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Clear all resources.
   */
  clear(): void {
    this.hide();
    for (const gridContainer of this.gridContainers.values()) {
      gridContainer.destroy();
    }
    this.gridContainers.clear();
    this.entries = [];
  }

  /**
   * Update filter button visuals to reflect active filter.
   */
  private refreshFilterButtons(): void {
    for (const [filter, btn] of this.filterButtons) {
      const anyBtn = btn as any;
      if (filter === this.activeFilter) {
        anyBtn.setStyle('backgroundColor', '#3a5566');
      } else {
        anyBtn.setStyle('backgroundColor', '#22334a');
      }
    }
  }

  /**
   * Render the grid of creature icons based on active filter.
   */
  private renderGrid(): void {
    // Clear existing grid items
    for (const [key, gridContainer] of this.gridContainers) {
      gridContainer.destroy();
      this.gridContainers.delete(key);
    }

    // Filter entries
    const filtered = this.activeFilter === 'all'
      ? this.entries
      : this.entries.filter((e) => e.definition.kind === this.activeFilter);

    // Update counter
    const discovered = this.entries.filter((e) => e.discovered).length;
    const total = this.entries.length;
    this.counterText.setText(`${discovered}/${total} discovered`);

    // Calculate grid layout
    const gridStartX = 20;
    const gridStartY = HEADER_HEIGHT + FILTER_BUTTON_HEIGHT + 10;
    const gridMaxX = this.options.width - 250; // Leave room for detail panel
    const itemSize = GRID_ITEM_SIZE;
    const gap = GRID_GAP;
    const itemsPerRow = Math.max(1, Math.floor((gridMaxX - gridStartX + gap) / (itemSize + gap)));

    // Calculate how many rows we need
    const visibleItems = filtered.slice(0, itemsPerRow * 8); // Limit to 8 rows
    const rows = Math.ceil(visibleItems.length / itemsPerRow);

    for (let i = 0; i < visibleItems.length; i++) {
      const entry = visibleItems[i];
      const col = i % itemsPerRow;
      const row = Math.floor(i / itemsPerRow);

      const ix = gridStartX + col * (itemSize + gap);
      const iy = gridStartY + row * (itemSize + gap);

      const gridContainer = this.createGridItem(entry, ix, iy, itemSize);
      this.gridContainers.set(entry.companionId, gridContainer);
    }
  }

  /**
   * Create a grid item for a creature entry.
   */
  private createGridItem(entry: CompendiumEntry, x: number, y: number, size: number): Phaser.GameObjects.Container {
    const isDiscovered = entry.discovered;
    const rarityHex = RARITY_COLORS[entry.definition.rarity] ?? '#b0b0b0';

    // Background
    const bg = this.scene.add
      .rectangle(size / 2, size / 2, size, size,
        isDiscovered ? 0x0b1626 : 0x071019,
        isDiscovered ? 0.9 : 0.6
      )
      .setStrokeStyle(1, isDiscovered ? parseInt(rarityHex.replace('#', ''), 16) as unknown as number : 0x1a2a3a,
        isDiscovered ? 0.6 : 0.3
      );

    // Creature icon or silhouette
    if (isDiscovered) {
      const portraitKey = this.createCreatureTexture(entry.definition, size);
      const sprite = this.scene.add
        .sprite(size / 2, size / 2, portraitKey)
        .setDisplaySize(size - 8, size - 8)
        .setOrigin(0.5, 0.5);

      // Bond indicator if tamed
      if (entry.tamed && entry.bondLevel) {
        const heartsText = this.scene.add
          .text(size / 2, size + 8, '\u{1F49D}', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#ffd166',
          })
          .setOrigin(0.5, 0);
      }
    } else {
      // Silhouette (question mark)
      const qText = this.scene.add
        .text(size / 2, size / 2, '?', {
          fontFamily: 'monospace',
          fontSize: `${size * 0.5}px`,
          color: '#2a3a4a',
        })
        .setOrigin(0.5, 0.5);
    }

    // Name label below (only for discovered)
    let nameLabel: Phaser.GameObjects.Text | null = null;
    if (isDiscovered) {
      nameLabel = this.scene.add
        .text(size / 2, size + 8, entry.definition.name, {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#9ad1ff',
        })
        .setOrigin(0.5, 0);
    } else {
      nameLabel = this.scene.add
        .text(size / 2, size + 8, '???', {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#4a5a6a',
        })
        .setOrigin(0.5, 0);
    }

    // Container
    const iconContainer = this.scene.add
      .container(x, y, [bg, nameLabel!])
      .setInteractive({ useHandCursor: true });

    // Click to show detail
    iconContainer.on('pointerdown', () => {
      if (!this.visible) return;
      this.selectedEntry = entry;
      this.showDetail(entry);
    });

    // Hover effect
    iconContainer.on('pointerover', () => {
      bg.setStrokeStyle(2, 0xffffff, 0.8);
      this.hoveredEntry = entry;
    });
    iconContainer.on('pointerout', () => {
      bg.setStrokeStyle(1, isDiscovered ? parseInt(rarityHex.replace('#', ''), 16) as unknown as number : 0x1a2a3a, isDiscovered ? 0.6 : 0.3);
      if (this.hoveredEntry === entry) {
        this.hoveredEntry = null;
      }
    });

    return iconContainer;
  }

  /**
   * Create a creature texture for the grid icon.
   */
  private createCreatureTexture(definition: CompanionDefinition, size: number): string {
    const key = `compendium-grid:${definition.id}:${size}`;
    if (this.scene.textures.exists(key)) {
      return key;
    }

    const texture = this.scene.textures.createCanvas(key, size, size);
    const ctx = texture.getContext();

    // Background
    ctx.fillStyle = '#0b1626';
    ctx.fillRect(0, 0, size, size);

    // Creature body
    const colors: Record<string, string> = {
      wisp: '#ff8c42',
      bunny: '#d4a76a',
      turtle: '#8fa195',
      boar: '#8a6b4c',
      moth: '#c99b6b',
      mole: '#7b8fa1',
      rat: '#b8865e',
      finch: '#ffd166',
      viper: '#5dd6a2',
      panther: '#4da3ff',
      koi: '#f6bd60',
    };

    ctx.fillStyle = colors[definition.species] ?? '#9ad1ff';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(size / 2 - 4, size / 2 - 3, 2, 0, Math.PI * 2);
    ctx.arc(size / 2 + 4, size / 2 - 3, 2, 0, Math.PI * 2);
    ctx.fill();

    texture.refresh();
    return key;
  }

  /**
   * Show detail panel for a creature entry.
   */
  private showDetail(entry: CompendiumEntry): void {
    this.detailTitle.setVisible(true);
    this.detailSubtitle.setVisible(true);
    this.detailBody.setVisible(true);

    const def = entry.definition;
    const rarityStars = '\u2605'.repeat(
      def.rarity === 'common' ? 1 :
      def.rarity === 'uncommon' ? 2 :
      def.rarity === 'rare' ? 3 :
      def.rarity === 'epic' ? 4 : 5,
    );

    this.detailTitle.setText(def.name);
    this.detailSubtitle.setText(`${rarityStars} ${def.rarity.toUpperCase()} · ${KIND_LABELS[def.kind]}`);

    const lines: string[] = [];
    lines.push(def.description);

    if (def.lore) {
      lines.push('');
      lines.push(`Lore: ${def.lore}`);
    }

    if (entry.discovered) {
      lines.push('');
      lines.push(`Encounters: ${entry.totalEncounters}`);
      if (entry.tamed && entry.bondLevel) {
        lines.push(`Bond: ${entry.bondLevel}/5`);
      }
    }

    if (def.traits.length > 0) {
      lines.push('');
      lines.push('Passive Traits:');
      for (const trait of def.traits) {
        lines.push(`  ${trait.description}`);
      }
    }

    if (def.abilities.length > 0) {
      lines.push('');
      lines.push('Abilities:');
      for (const ability of def.abilities) {
        lines.push(`  ${ability.name} (Bond ${ability.requiresBondLevel})`);
        lines.push(`    ${ability.description}`);
      }
    }

    // Taming hint
    lines.push('');
    lines.push('Tame with:');
    for (const food of def.tameCost.foodItems) {
      lines.push(`  ${food.count}x ${food.itemId}`);
    }

    this.detailBody.setText(lines.join('\n'));
  }

  /**
   * Clear the detail panel.
   */
  private clearDetail(): void {
    this.detailTitle.setVisible(false);
    this.detailSubtitle.setVisible(false);
    this.detailBody.setVisible(false);
  }
}
