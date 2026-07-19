/**
 * Alchemy Overlay — UI for the Alchemy System
 *
 * The wise old snake's alchemy UI:
 * - The wise old snake's UI was just a text box
 * - The wise old snake's UI had no buttons
 * - The wise old snake's UI crashed when you clicked anything
 * - The wise old snake's UI displayed nothing
 * - The wise old snake's UI was in the wrong language
 * - The wise old snake's UI was beautiful but non-functional
 */

import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import { i18n } from '../i18n/i18nManager.js';
import type { AlchemyManager } from '../inventory/alchemy/AlchemyManager.js';
import type { AlchemyRecipe, CraftResult, Potion } from '../inventory/alchemy/alchemyTypes.js';

/** Tab types for the alchemy overlay */
export type AlchemyTab = 'recipes' | 'crafting' | 'journal' | 'lore' | 'workshops';

/** Alchemy overlay UI panel */
export class AlchemyOverlay {
  private container?: Phaser.GameObjects.Container;
  private background?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private tabButtons: Phaser.GameObjects.Text[] = [];
  private currentTab: AlchemyTab = 'recipes';
  private recipeList?: Phaser.GameObjects.Container;
  private craftingPanel?: Phaser.GameObjects.Container;
  private journalPanel?: Phaser.GameObjects.Container;
  private lorePanel?: Phaser.GameObjects.Container;
  private workshopPanel?: Phaser.GameObjects.Container;
  private activePanel?: Phaser.GameObjects.Container;
  private onClose?: () => void;
  private onCraft?: (recipeId: string) => void;
  private onTrade?: (recipeId: string) => void;
  private isVisible = false;
  private scene: SnakeScene;
  private alchemyManager: AlchemyManager;

  // Scroll state
  private scrollY = 0;
  private contentHeight = 0;
  private viewportHeight = 0;
  private scrollBar?: Phaser.GameObjects.Graphics;

  constructor(scene: SnakeScene, alchemyManager: AlchemyManager) {
    this.scene = scene;
    this.alchemyManager = alchemyManager;
    this.build();
  }

  private build(): void {
    const { width, height } = this.scene.scale;

    this.container = this.scene.add.container(width / 2 - 300, height / 2 - 200);

    // Background
    this.background = this.scene.add.rectangle(0, 0, 600, 400, 0x1a1a2e, 0.95);
    this.background.setStrokeStyle(2, 0x4a4a6a);
    this.container.add(this.background);

    // Title
    this.titleText = this.scene.add.text(0, -180, '⚗️ Alchemy Workshop', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffd700',
      fixedWidth: 560,
      align: 'center',
    });
    this.container.add(this.titleText);

    // Tab buttons
    const tabs: AlchemyTab[] = ['recipes', 'crafting', 'journal', 'lore', 'workshops'];
    const tabWidth = 100;
    const tabStartX = -((tabs.length * tabWidth) / 2) + tabWidth / 2;

    tabs.forEach((tab, index) => {
      const x = tabStartX + index * tabWidth;
      const btn = this.scene.add.text(x, -155, this.getTabLabel(tab), {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#a0a0c0',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      });
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => this.switchTab(tab));
      this.tabButtons.push(btn);
      this.container.add(btn);
    });

    // Content area
    this.recipeList = this.scene.add.container(0, -120);
    this.container.add(this.recipeList);

    // Close button
    const closeBtn = this.scene.add.text(260, -185, '✕', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ff6b6b',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);

    this.container.setVisible(false);
  }

  private getTabLabel(tab: AlchemyTab): string {
    const labels: Record<AlchemyTab, string> = {
      recipes: '📜 Recipes',
      crafting: '⚗️ Craft',
      journal: '📖 Journal',
      lore: '🔮 Lore',
      workshops: '🏭 Workshops',
    };
    return labels[tab];
  }

  /** Show the overlay */
  show(onClose?: () => void, onCraft?: (recipeId: string) => void): void {
    this.onClose = onClose;
    this.onCraft = onCraft;
    this.isVisible = true;
    this.container?.setVisible(true);
    this.switchTab('recipes');
  }

  /** Hide the overlay */
  hide(): void {
    this.isVisible = false;
    this.container?.setVisible(false);
    this.onClose?.();
  }

  /** Switch tabs */
  private switchTab(tab: AlchemyTab): void {
    this.currentTab = tab;

    // Update tab button colors
    this.tabButtons.forEach((btn, index) => {
      const tabType = ['recipes', 'crafting', 'journal', 'lore', 'workshops'][index] as AlchemyTab;
      btn.setColor(tabType === tab ? '#ffd700' : '#a0a0c0');
    });

    // Clear content panels
    this.clearPanel(this.recipeList);
    this.clearPanel(this.craftingPanel);
    this.clearPanel(this.journalPanel);
    this.clearPanel(this.lorePanel);
    this.clearPanel(this.workshopPanel);

    // Recreate the active panel
    switch (tab) {
      case 'recipes':
        this.recipeList = this.scene.add.container(0, -120);
        this.container?.add(this.recipeList);
        this.activePanel = this.recipeList;
        this.renderRecipes();
        break;
      case 'crafting':
        this.craftingPanel = this.scene.add.container(0, -120);
        this.container?.add(this.craftingPanel);
        this.activePanel = this.craftingPanel;
        this.renderCrafting();
        break;
      case 'journal':
        this.journalPanel = this.scene.add.container(0, -120);
        this.container?.add(this.journalPanel);
        this.activePanel = this.journalPanel;
        this.renderJournal();
        break;
      case 'lore':
        this.lorePanel = this.scene.add.container(0, -120);
        this.container?.add(this.lorePanel);
        this.activePanel = this.lorePanel;
        this.renderLore();
        break;
      case 'workshops':
        this.workshopPanel = this.scene.add.container(0, -120);
        this.container?.add(this.workshopPanel);
        this.activePanel = this.workshopPanel;
        this.renderWorkshops();
        break;
    }
  }

  private clearPanel(panel?: Phaser.GameObjects.Container): void {
    if (!panel) return;
    panel.destroy(true);
  }

  private renderRecipes(): void {
    const panel = this.activePanel || this.recipeList;
    if (!panel) return;

    const recipes = this.alchemyManager.getKnownRecipes();
    const available = this.alchemyManager.getAvailableRecipes();

    let y = 0;
    const lineSpacing = 28;

    // Header
    const header = this.scene.add.text(-250, y, 'Available Recipes', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffd700',
    });
    panel.add(header);
    y += lineSpacing + 5;

    if (recipes.length === 0) {
      const empty = this.scene.add.text(-250, y, 'No recipes discovered yet.', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#808080',
      });
      panel.add(empty);
      return;
    }

    for (const recipe of recipes) {
      const isAvailable = available.some((r) => r.id === recipe.id);
      const color = isAvailable ? '#ffffff' : '#808080';
      const status = isAvailable ? '✓' : '✗';

      const text = this.scene.add.text(-250, y, `${status} ${recipe.name}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color,
      });
      text.setInteractive({ useHandCursor: true });

      if (isAvailable && this.onCraft) {
        text.on('pointerdown', () => this.onCraft!(recipe.id));
        text.on('pointerover', () => text.setColor('#ffd700'));
        text.on('pointerout', () => text.setColor('#ffffff'));
      }

      panel.add(text);
      y += lineSpacing;

      // Description
      const desc = this.scene.add.text(-240, y, recipe.description, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#a0a0c0',
        wordWrap: { width: 480 },
      });
      panel.add(desc);
      y += lineSpacing;
    }

    // Undiscovered recipes hint
    const progress = this.alchemyManager.getDiscoveryProgress();
    if (progress.discovered < progress.total) {
      y += 10;
      const hint = this.scene.add.text(-250, y, `Discovered: ${progress.discovered}/${progress.total} recipes`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#606080',
      });
      panel.add(hint);
    }
  }

  private renderCrafting(): void {
    const panel = this.activePanel || this.craftingPanel;
    if (!panel) return;

    const available = this.alchemyManager.getAvailableRecipes();
    let y = 0;
    const lineSpacing = 32;

    if (available.length === 0) {
      const empty = this.scene.add.text(-250, y, 'No recipes available to craft.', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#808080',
      });
      panel.add(empty);
      return;
    }

    for (const recipe of available) {
      const btn = this.scene.add.text(-250, y, `⚗️ Craft: ${recipe.name}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffd700',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: { left: 10, right: 10, top: 6, bottom: 6 },
      });
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        if (this.onCraft) {
          this.onCraft(recipe.id);
        }
      });
      btn.on('pointerover', () => btn.setColor('#ffffff'));
      btn.on('pointerout', () => btn.setColor('#ffd700'));
      panel.add(btn);
      y += lineSpacing;

      // Ingredients list
      const ingText = recipe.ingredients
        .map((ing) => `• ${ing.itemId} x${ing.count}`)
        .join('\n');
      const ingredients = this.scene.add.text(-240, y, ingText, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#a0a0c0',
        wordWrap: { width: 480 },
      });
      panel.add(ingredients);
      y += lineSpacing * 2;
    }
  }

  private renderJournal(): void {
    const panel = this.activePanel || this.journalPanel;
    if (!panel) return;

    const journal = this.alchemyManager.getJournal();
    const recentEntries = journal.getRecentEntries(10);
    let y = 0;
    const lineSpacing = 24;

    const header = this.scene.add.text(-250, y, `Alchemy Journal (${journal.getEntryCount()} entries)`, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffd700',
    });
    panel.add(header);
    y += lineSpacing + 5;

    if (recentEntries.length === 0) {
      const empty = this.scene.add.text(-250, y, 'No entries yet. Start crafting!', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#808080',
      });
      panel.add(empty);
      return;
    }

    for (const entry of recentEntries) {
      const typeIcons: Record<string, string> = {
        recipeDiscovered: '📜',
        potionCrafted: '⚗️',
        experimentFailed: '💥',
        loreFound: '🔮',
      };

      const icon = typeIcons[entry.entryType] || '📝';
      const text = this.scene.add.text(-250, y, `${icon} ${entry.entryType}`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#c0c0e0',
      });
      panel.add(text);
      y += lineSpacing;
    }
  }

  private renderLore(): void {
    const panel = this.activePanel || this.lorePanel;
    if (!panel) return;

    const journal = this.alchemyManager.getJournal();
    const discovered = journal.getDiscoveredLore();
    const all = journal.getAllLore();
    let y = 0;
    const lineSpacing = 28;

    const header = this.scene.add.text(-250, y, `Alchemy Lore (${discovered.length}/${all.length})`, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffd700',
    });
    panel.add(header);
    y += lineSpacing + 5;

    for (const lore of all) {
      const isDiscovered = lore.discovered;
      const text = this.scene.add.text(-250, y, `${isDiscovered ? '🔓' : '🔒'} ${lore.title}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: isDiscovered ? '#ffffff' : '#606080',
      });
      panel.add(text);
      y += lineSpacing;

      if (isDiscovered) {
        const content = this.scene.add.text(-240, y, lore.content, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#a0a0c0',
          wordWrap: { width: 480 },
        });
        panel.add(content);
        y += lineSpacing;
      } else {
        const hint = this.scene.add.text(-240, y, `Requires: ${lore.discoveryCondition}`, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#606080',
        });
        panel.add(hint);
        y += lineSpacing;
      }
    }
  }

  private renderWorkshops(): void {
    const panel = this.activePanel || this.workshopPanel;
    if (!panel) return;

    let y = 0;
    const lineSpacing = 28;

    const header = this.scene.add.text(-250, y, 'Crafting Workshops', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffd700',
    });
    panel.add(header);
    y += lineSpacing + 5;

    // Workshop info would be rendered here
    const info = this.scene.add.text(-250, y, 'Workshop building coming soon...', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#808080',
    });
    panel.add(info);
  }

  /** Display a craft result toast */
  showCraftResult(result: CraftResult): void {
    if (!this.container) return;

    let message = '';
    let color = '#ffffff';

    if (result.success && result.potion) {
      const potion = result.potion;
      message = potion.isMythic
        ? `✨ Mythic! Created: ${potion.name} (${potion.rarity})`
        : `Created: ${potion.name} (${potion.rarity})`;
      color = potion.isMythic ? '#ffd700' : '#90ee90';
    } else if (result.success) {
      message = 'Crafted successfully!';
      color = '#90ee90';
    } else {
      message = `Failed: ${result.error}`;
      color = '#ff6b6b';
    }

    // Show toast message
    const toast = this.scene.add.text(0, 180, message, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color,
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: { left: 15, right: 15, top: 8, bottom: 8 },
    });
    this.container.add(toast);

    // Fade out after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: toast,
        alpha: 0,
        duration: 500,
        onComplete: () => toast.destroy(),
      });
    });
  }

  /** Update the overlay with current state */
  update(): void {
    if (!this.isVisible) return;
    // Re-render current tab if needed
  }
}
