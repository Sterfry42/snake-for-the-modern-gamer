// Companion encounter popup — UI shown when a wild creature is encountered.
// Pattern follows questPopup.ts: container-based popup with buttons.

import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import type { CompanionDefinition } from '../companions/companionTypes.js';
import { RuntimeSpriteFactory } from './runtimeSpriteFactory.js';

const RARITY_COLORS: Record<string, string> = {
  common: '#b0b0b0',
  uncommon: '#5dd6a2',
  rare: '#9ad1ff',
  epic: '#c77dff',
  legendary: '#ffd166',
};

const KIND_LABELS: Record<string, string> = {
  follower: 'Follower',
  protector: 'Protector',
  scout: 'Scout',
  forager: 'Forager',
  fighter: 'Fighter',
  mount: 'Mount',
};

interface EncounterCallbacks {
  onObserve?: () => void;
  onFeed?: () => void;
  onLeave?: () => void;
  onTame?: () => void;
}

/**
 * Popup that appears when a wild companion creature is encountered.
 * Shows creature info and offers action buttons.
 */
export class CompanionEncounterPopup {
  private container?: Phaser.GameObjects.Container;
  private portrait?: Phaser.GameObjects.Sprite;
  private nameLabel?: Phaser.GameObjects.Text;
  private rarityLabel?: Phaser.GameObjects.Text;
  private descriptionLabel?: Phaser.GameObjects.Text;
  private kindBadge?: Phaser.GameObjects.Text;
  private observeButton?: Phaser.GameObjects.Text;
  private feedButton?: Phaser.GameObjects.Text;
  private leaveButton?: Phaser.GameObjects.Text;
  private tameButton?: Phaser.GameObjects.Text;
  private portraitFactory: RuntimeSpriteFactory;

  private callbacks: EncounterCallbacks = {};
  private definition?: CompanionDefinition;

  constructor(private readonly scene: SnakeScene) {
    this.portraitFactory = new RuntimeSpriteFactory(scene);
  }

  /**
   * Show the encounter popup for a creature definition.
   */
  show(definition: CompanionDefinition, callbacks: EncounterCallbacks): void {
    this.definition = definition;
    this.callbacks = callbacks;

    const width = 340;
    const height = 260;
    const x = (this.scene.scale.width - width) / 2;
    const y = this.scene.scale.height - height - 20;

    // Background
    const bg = this.scene.add
      .rectangle(0, 0, width, height, 0x122030, 0.92)
      .setStrokeStyle(2, 0x9ad1ff, 0.8);

    // Rarity border accent
    const rarityHex = RARITY_COLORS[definition.rarity] ?? '#b0b0b0';
    const accentLine = this.scene.add
      .rectangle(width / 2, 0, width, 2, parseInt(rarityHex.replace('#', ''), 16) as unknown as number, 1);

    // Portrait panel
    const portraitPanel = this.scene.add
      .rectangle(24, 20, 80, 80, 0x0b1626, 0.95)
      .setStrokeStyle(1, 0x5dd6a2, 0.6);

    // Portrait sprite (try to create a texture, fall back gracefully)
    const portraitTextureKey = this.createPortraitTexture(definition, 80);

    this.portrait = this.scene.add
      .sprite(64, 60, portraitTextureKey)
      .setDisplaySize(72, 72)
      .setOrigin(0.5, 0.5);

    // Name
    this.nameLabel = this.scene.add
      .text(120, 24, definition.name, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0, 0);

    // Rarity label with stars
    const stars = '★'.repeat(definition.rarity === 'common' ? 1 : definition.rarity === 'uncommon' ? 2 : definition.rarity === 'rare' ? 3 : definition.rarity === 'epic' ? 4 : 5);
    this.rarityLabel = this.scene.add
      .text(120, 48, `${stars} ${definition.rarity.toUpperCase()}`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: rarityHex,
      })
      .setOrigin(0, 0);

    // Kind badge
    const kindLabel = KIND_LABELS[definition.kind] ?? definition.kind;
    this.kindBadge = this.scene.add
      .text(120, 66, kindLabel, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#9ad1ff',
      })
      .setOrigin(0, 0);

    // Description
    this.descriptionLabel = this.scene.add
      .text(20, 120, definition.description, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e6e6e6',
        wordWrap: { width: width - 40 },
        align: 'left',
      })
      .setOrigin(0, 0);

    // Buttons row
    const btnY = height - 36;
    const btnSpacing = 70;
    const btnStartX = (width - btnSpacing * 3) / 2;

    this.observeButton = this.createButton(
      btnStartX,
      btnY,
      'Observe',
      '#9ad1ff',
      '#22334a',
    );
    this.feedButton = this.createButton(
      btnStartX + btnSpacing,
      btnY,
      'Feed',
      '#5dd6a2',
      '#224433',
    );
    this.leaveButton = this.createButton(
      btnStartX + btnSpacing * 2,
      btnY,
      'Leave',
      '#ff6b6b',
      '#442222',
    );
    this.tameButton = this.createButton(
      btnStartX + btnSpacing,
      btnY - 44,
      'Tame',
      '#ffd166',
      '#443322',
    );

    // Button interactions
    this.observeButton?.on('pointerdown', () => this.callbacks.onObserve?.());
    this.feedButton?.on('pointerdown', () => this.callbacks.onFeed?.());
    this.leaveButton?.on('pointerdown', () => this.callbacks.onLeave?.());
    this.tameButton?.on('pointerdown', () => this.callbacks.onTame?.());

    // Hover effects
    [this.observeButton, this.feedButton, this.leaveButton, this.tameButton].forEach(
      (btn) => {
        btn?.on('pointerover', () => btn?.setScale(1.08));
        btn?.on('pointerout', () => btn?.setScale(1));
      },
    );

    // Tame button hidden by default (shown if player has required food)
    this.tameButton?.setVisible(false);

    // Container
    this.container = this.scene.add
      .container(x, y, [
        bg,
        accentLine,
        portraitPanel,
        this.portrait,
        this.nameLabel,
        this.rarityLabel,
        this.kindBadge,
        this.descriptionLabel,
        this.observeButton,
        this.feedButton,
        this.leaveButton,
        this.tameButton,
      ])
      .setDepth(20)
      .setVisible(true);

    // Pop-in animation
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      y: y + 8,
      duration: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.container?.setPosition(x, y);
      },
    });
  }

  /**
   * Hide the popup.
   */
  hide(): void {
    this.container?.destroy();
    this.container = undefined;
    this.portrait = undefined;
    this.nameLabel = undefined;
    this.rarityLabel = undefined;
    this.descriptionLabel = undefined;
    this.kindBadge = undefined;
    this.observeButton = undefined;
    this.feedButton = undefined;
    this.leaveButton = undefined;
    this.tameButton = undefined;
    this.definition = undefined;
    this.callbacks = {};
  }

  /**
   * Check if the popup is currently visible.
   */
  isVisible(): boolean {
    return Boolean(this.container?.visible);
  }

  /**
   * Check if the player has the food needed for taming and update UI.
   */
  checkTameAvailability(): void {
    if (!this.definition || !this.callbacks.onTame) {
      this.tameButton?.setVisible(false);
      return;
    }
    // For Phase 1, always show the tame button (food check is integrated into the callback)
    this.tameButton?.setVisible(true);
  }

  /**
   * Create a portrait texture for a creature definition.
   */
  private createPortraitTexture(definition: CompanionDefinition, size: number): string {
    const key = `companion-portrait:${definition.id}:${size}`;
    if (this.scene.textures.exists(key)) {
      return key;
    }

    const texture = this.scene.textures.createCanvas(key, size, size);
    const ctx = texture.getContext();

    // Background
    ctx.fillStyle = '#0b1626';
    ctx.fillRect(0, 0, size, size);

    // Rarity border
    const borderColors: Record<string, number> = {
      common: 0x808080,
      uncommon: 0x5dd6a2,
      rare: 0x9ad1ff,
      epic: 0xc77dff,
      legendary: 0xffd166,
    };
    const raw = borderColors[definition.rarity] ?? 0x808080;
    ctx.strokeStyle = '#' + Number(raw).toString(16).padStart(6, '0');
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, size - 4, size - 4);

    // Simple creature shape (circle with face)
    ctx.fillStyle = this.getCreatureColor(definition);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(size / 2 - 8, size / 2 - 5, 4, 0, Math.PI * 2);
    ctx.arc(size / 2 + 8, size / 2 - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(size / 2 - 7, size / 2 - 5, 2, 0, Math.PI * 2);
    ctx.arc(size / 2 + 9, size / 2 - 5, 2, 0, Math.PI * 2);
    ctx.fill();

    texture.refresh();
    return key;
  }

  /**
   * Get a base color for a creature based on its species.
   */
  private getCreatureColor(definition: CompanionDefinition): string {
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
    return colors[definition.species] ?? '#9ad1ff';
  }

  /**
   * Create a styled button text object.
   */
  private createButton(x: number, y: number, text: string, textColor: string, bgColor: string): Phaser.GameObjects.Text {
    return this.scene.add
      .text(x, y, text, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: textColor,
        backgroundColor: bgColor,
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
  }
}
