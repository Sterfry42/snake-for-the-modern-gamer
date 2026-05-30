// Companion HUD panel — shows active companions at the top-left of the screen.
// Displays companion icons with bond hearts, auto-hides when no companions are active.

import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import type { CompanionDefinition, CompanionInstance } from '../companions/companionTypes.js';
import { getCompanionDefinition } from '../companions/companionRegistry.js';
import { getBondHearts, BOND_LEVELS } from '../companions/bondSystem.js';

interface CompanionHudEntry {
  id: string;
  name: string;
  portraitId: string;
  bondLevel: number;
  bondProgress: number;
  kind: string;
}

const ICON_SIZE = 40;
const ICON_PADDING = 8;
const HUD_HEIGHT = 64;
const HUD_BG_ALPHA = 0.75;

/**
 * HUD panel showing active companions at the top-left of the screen.
 * Displays companion icons with bond hearts. Auto-hides when no companions.
 */
export class CompanionHud {
  private container?: Phaser.GameObjects.Container;
  private iconContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private portraitCache = new Map<string, string>();
  private entries: CompanionHudEntry[] = [];
  private bgRect?: Phaser.GameObjects.Rectangle;
  private quickMenu?: Phaser.GameObjects.Container;
  private sceneRef: SnakeScene;

  constructor(private readonly scene: SnakeScene) {
    this.sceneRef = scene;
  }

  /**
   * Update HUD with current companion state.
   */
  update(companionData: CompanionHudEntry[], gridWidth: number): void {
    // Store entries for quick menu
    this.entries = companionData;

    if (companionData.length === 0) {
      this.hide();
      return;
    }

    // Show if hidden
    if (!this.container || !this.container.visible) {
      this.show();
    }

    // Calculate total width needed
    const totalWidth = companionData.length * (ICON_SIZE + ICON_PADDING) - ICON_PADDING + 16;
    const x = 8;
    const y = 8;

    // Create or update background
    if (!this.bgRect) {
      this.bgRect = this.scene.add
        .rectangle(0, 0, totalWidth, HUD_HEIGHT, 0x0b1622, HUD_BG_ALPHA)
        .setStrokeStyle(1, 0x244155, 0.5)
        .setOrigin(0, 0);
    } else {
      this.bgRect.setPosition(x, y);
      this.bgRect.setSize(totalWidth, HUD_HEIGHT);
      this.bgRect.setVisible(true);
    }

    // Update or create icon containers
    for (let i = 0; i < companionData.length; i++) {
      const entry = companionData[i];
      const iconX = x + 8 + i * (ICON_SIZE + ICON_PADDING);
      const iconY = y + 6;

      let iconContainer = this.iconContainers.get(entry.id);
      if (!iconContainer) {
        iconContainer = this.createIconContainer(entry, iconX, iconY);
        this.iconContainers.set(entry.id, iconContainer);
      } else {
        iconContainer.setPosition(iconX, iconY);
        iconContainer.setVisible(true);
        this.updateIconContainer(iconContainer, entry);
      }
    }

    // Hide icons for removed companions
    for (const [id, iconContainer] of this.iconContainers) {
      if (!companionData.find((e) => e.id === id)) {
        iconContainer.setVisible(false);
      }
    }

    // Update container
    if (!this.container) {
      const children: Phaser.GameObjects.GameObject[] = [this.bgRect!];
      for (const iconContainer of this.iconContainers.values()) {
        if (iconContainer.visible) {
          children.push(iconContainer);
        }
      }
      this.container = this.scene.add
        .container(x, y, children)
        .setDepth(15)
        .setVisible(true);
    } else {
      // Ensure bgRect is first (behind icons)
      this.container.removeAll(false);
      this.container.add(this.bgRect!);
      for (const iconContainer of this.iconContainers.values()) {
        if (iconContainer.visible) {
          this.container.add(iconContainer);
        }
      }
    }
  }

  /**
   * Show the HUD.
   */
  show(): void {
    this.container?.setVisible(true);
    for (const iconContainer of this.iconContainers.values()) {
      iconContainer.setVisible(true);
    }
  }

  /**
   * Hide the HUD.
   */
  hide(): void {
    this.container?.setVisible(false);
    for (const iconContainer of this.iconContainers.values()) {
      iconContainer.setVisible(false);
    }
    this.quickMenu?.destroy();
    this.quickMenu = undefined;
  }

  /**
   * Check if the HUD is currently visible.
   */
  isVisible(): boolean {
    return Boolean(this.container?.visible);
  }

  /**
   * Toggle visibility.
   */
  toggle(): void {
    if (this.container?.visible) {
      this.hide();
    } else {
      if (this.entries.length > 0) {
        this.update(this.entries, 0);
      }
    }
  }

  /**
   * Create a quick-use menu for a companion.
   */
  showQuickMenu(companionId: string, worldX: number, worldY: number): void {
    // Remove existing quick menu
    this.quickMenu?.destroy();

    const companion = this.entries.find((e) => e.id === companionId);
    if (!companion) return;

    const menuWidth = 120;
    const menuHeight = 80;
    const menuX = Math.min(worldX + 20, this.scene.scale.width - menuWidth - 10);
    const menuY = Math.min(worldY + 20, this.scene.scale.height - menuHeight - 10);

    const bg = this.scene.add
      .rectangle(menuWidth / 2, menuHeight / 2, menuWidth, menuHeight, 0x0b1622, 0.92)
      .setStrokeStyle(1, 0x9ad1ff, 0.6);

    const feedBtn = this.scene.add
      .text(menuWidth / 2, 24, 'Feed', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#5dd6a2',
        backgroundColor: '#224433',
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });

    const abilityBtn = this.scene.add
      .text(menuWidth / 2, 56, 'Ability', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#9ad1ff',
        backgroundColor: '#22334a',
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });

    feedBtn.on('pointerdown', () => {
      (this.scene as any).companionFeedAction?.(companionId);
      this.quickMenu?.destroy();
      this.quickMenu = undefined;
    });

    abilityBtn.on('pointerdown', () => {
      (this.scene as any).companionAbilityAction?.(companionId);
      this.quickMenu?.destroy();
      this.quickMenu = undefined;
    });

    [feedBtn, abilityBtn].forEach((btn) => {
      btn?.on('pointerover', () => btn?.setScale(1.08));
      btn?.on('pointerout', () => btn?.setScale(1));
    });

    this.quickMenu = this.scene.add
      .container(menuX, menuY, [bg, feedBtn, abilityBtn])
      .setDepth(25)
      .setVisible(true);

    // Auto-hide after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      if (this.quickMenu) {
        this.quickMenu.destroy();
        this.quickMenu = undefined;
      }
    });
  }

  /**
   * Clear all resources.
   */
  clear(): void {
    this.hide();
    this.iconContainers.clear();
    this.portraitCache.clear();
    this.entries = [];
    this.bgRect = undefined;
    this.container = undefined;
  }

  /**
   * Create an icon container for a companion.
   */
  private createIconContainer(entry: CompanionHudEntry, x: number, y: number): Phaser.GameObjects.Container {
    const size = ICON_SIZE;

    // Background square
    const bg = this.scene.add
      .rectangle(size / 2, size / 2, size, size, 0x0b1626, 0.9)
      .setStrokeStyle(1, this.getKindColor(entry.kind), 0.6);

    // Portrait sprite
    const portraitKey = this.getPortraitTexture(entry.portraitId);
    const portrait = this.scene.add
      .sprite(size / 2, size / 2 - 4, portraitKey)
      .setDisplaySize(size - 8, size - 8)
      .setOrigin(0.5, 0.5);

    // Bond hearts label
    const hearts = getBondHearts(entry.bondLevel);
    const heartsText = this.scene.add
      .text(size / 2, size + 6, hearts, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);

    // Progress bar (tiny)
    const progressWidth = size - 8;
    const progressHeight = 3;
    const progressBg = this.scene.add
      .rectangle(size / 2, size + 18, progressWidth, progressHeight, 0x1a2a3a, 1);
    const progressFill = this.scene.add
      .rectangle(
        size / 2 - progressWidth / 2 + 1,
        size + 18,
        progressWidth - 2,
        progressHeight,
        0x5dd6a2,
        entry.bondProgress / 100,
      );

    // Container
    const iconContainer = this.scene.add
      .container(x, y, [bg, portrait, heartsText, progressBg, progressFill])
      .setInteractive({ useHandCursor: true });

    // Click to show quick menu
    iconContainer.on('pointerdown', () => {
      // Convert local to world position
      const worldPos = iconContainer.getWorldPoint();
      this.showQuickMenu(entry.id, worldPos.x, worldPos.y);
    });

    // Hover effect
    iconContainer.on('pointerover', () => {
      bg.setStrokeStyle(2, 0xffffff, 0.8);
    });
    iconContainer.on('pointerout', () => {
      bg.setStrokeStyle(1, this.getKindColor(entry.kind), 0.6);
    });

    return iconContainer;
  }

  /**
   * Update an existing icon container with new data.
   */
  private updateIconContainer(
    iconContainer: Phaser.GameObjects.Container,
    entry: CompanionHudEntry,
  ): void {
    const anyContainer = iconContainer as any;
    const children = anyContainer.getChildren?.() ?? [];
    const arr = children.toArray ? children.toArray() : [];

    // Update hearts
    const hearts = getBondHearts(entry.bondLevel);
    const heartsText = arr[2] as Phaser.GameObjects.Text;
    if (heartsText) {
      heartsText.setText(hearts);
    }

    // Update progress bar
    const progressFill = arr[4] as Phaser.GameObjects.Rectangle;
    if (progressFill) {
      progressFill.setFillStyle(0x5dd6a2, entry.bondProgress / 100);
    }
  }

  /**
   * Get or create a portrait texture for a companion.
   */
  private getPortraitTexture(portraitId: string): string {
    if (this.portraitCache.has(portraitId)) {
      return this.portraitCache.get(portraitId)!;
    }

    const key = `companion-hud-portrait:${portraitId}`;
    if (!this.scene.textures.exists(key)) {
      const texture = this.scene.textures.createCanvas(key, ICON_SIZE, ICON_SIZE);
      const ctx = texture.getContext();

      // Background
      ctx.fillStyle = '#0b1626';
      ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE);

      // Default creature shape
      ctx.fillStyle = '#9ad1ff';
      ctx.beginPath();
      ctx.arc(ICON_SIZE / 2, ICON_SIZE / 2, ICON_SIZE * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ICON_SIZE / 2 - 4, ICON_SIZE / 2 - 3, 2, 0, Math.PI * 2);
      ctx.arc(ICON_SIZE / 2 + 4, ICON_SIZE / 2 - 3, 2, 0, Math.PI * 2);
      ctx.fill();

      texture.refresh();
    }

    this.portraitCache.set(portraitId, key);
    return key;
  }

  /**
   * Get a color for a companion kind.
   */
  private getKindColor(kind: string): number {
    const colors: Record<string, number> = {
      follower: 0x5dd6a2,
      protector: 0x9ad1ff,
      scout: 0xc99b6b,
      forager: 0xffd166,
      fighter: 0xff6b6b,
      mount: 0xc77dff,
    };
    return colors[kind] ?? 0x9ad1ff;
  }
}
