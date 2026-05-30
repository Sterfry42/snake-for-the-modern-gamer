// Ability selection UI — popup for selecting which ability to use on a companion.
// Follows the pattern of other UI overlays in the project (companionHud, compendiumOverlay).

import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';

interface CompanionAbilityEntry {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  isReady: boolean;
}

interface CompanionAbilityData {
  id: string;
  name: string;
  abilities: CompanionAbilityEntry[];
}

const PANEL_WIDTH = 200;
const PANEL_PADDING = 12;
const ABILITY_HEIGHT = 48;
const PANEL_BG_ALPHA = 0.92;
const ABILITY_BORDER_READY = 0x5dd6a2;
const ABILITY_BORDER_COOLDOWN = 0x444444;

/**
 * Popup panel for selecting which ability to use on a companion.
 * Lists available abilities per companion, showing cooldown status.
 */
export class AbilitySelectionUI {
  private container?: Phaser.GameObjects.Container;
  private sceneRef: SnakeScene;
  private currentCompanions: CompanionAbilityData[] = [];

  constructor(private readonly scene: SnakeScene) {
    this.sceneRef = scene;
  }

  /**
   * Show the ability selection popup.
   * @param companions - List of companions with their available abilities.
   * @param onUse - Callback fired when the player selects an ability.
   */
  show(
    companions: CompanionAbilityData[],
    onUse: (companionId: string, abilityId: string) => void,
  ): void {
    this.hide();
    this.currentCompanions = companions;

    const abilityCount = companions.reduce(
      (sum, c) => sum + c.abilities.length,
      0,
    );
    if (abilityCount === 0) {
      return;
    }

    const panelHeight = PANEL_PADDING * 2 + abilityCount * ABILITY_HEIGHT;

    // Position panel at bottom-center of screen
    const panelX = this.scene.scale.width / 2;
    const panelY = this.scene.scale.height - panelHeight - 16;

    // Background panel
    const bg = this.scene.add
      .rectangle(
        panelX,
        panelY,
        PANEL_WIDTH,
        panelHeight,
        0x0b1622,
        PANEL_BG_ALPHA,
      )
      .setStrokeStyle(1, 0x244155, 0.6)
      .setOrigin(0.5, 0);

    // Create ability buttons
    let yIndex = PANEL_PADDING;
    for (const companion of companions) {
      for (const ability of companion.abilities) {
        const btnContainer = this.createAbilityButton(
          companion.id,
          companion.name,
          ability,
          panelX,
          yIndex,
          PANEL_WIDTH,
          ABILITY_HEIGHT,
          onUse,
        );
        yIndex += ABILITY_HEIGHT;
      }
    }

    // Close button (X at top-right of panel)
    const closeBtn = this.scene.add
      .text(panelX + PANEL_WIDTH / 2 - 12, PANEL_PADDING + 8, '\u{2715}', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ff6b6b',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      this.hide();
    });

    closeBtn.on('pointerover', () => {
      closeBtn.setScale(1.2);
    });
    closeBtn.on('pointerout', () => {
      closeBtn.setScale(1);
    });

    this.container = this.scene.add
      .container(panelX, panelY, [bg, closeBtn])
      .setDepth(25)
      .setVisible(true);
  }

  /**
   * Hide and destroy the popup.
   */
  hide(): void {
    this.container?.destroy();
    this.container = undefined;
    this.currentCompanions = [];
  }

  /**
   * Check if the popup is currently visible.
   */
  isVisible(): boolean {
    return Boolean(this.container?.visible);
  }

  /**
   * Create a button for a single ability.
   */
  private createAbilityButton(
    companionId: string,
    _companionName: string,
    ability: CompanionAbilityEntry,
    x: number,
    y: number,
    width: number,
    height: number,
    onUse: (companionId: string, abilityId: string) => void,
  ): Phaser.GameObjects.Container {
    const btnBg = this.scene.add
      .rectangle(x, y + height / 2, width - 8, height - 4, 0x121e2e, 0.9)
      .setStrokeStyle(1, ability.isReady ? ABILITY_BORDER_READY : ABILITY_BORDER_COOLDOWN, 0.5)
      .setOrigin(0, 0);

    const btnText = this.scene.add.text(8, y + 6, ability.name, {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: ability.isReady ? '#5dd6a2' : '#808080',
    });

    const cooldownText = this.scene.add.text(8, y + 24, this.formatCooldownText(ability), {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: ability.isReady ? '#9ad1ff' : '#666666',
    });

    const descriptionText = this.scene.add.text(8, y + 36, ability.description, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: ability.isReady ? '#cfe5ff' : '#555555',
    });

    const container = this.scene.add
      .container(x, y, [btnBg, btnText, cooldownText, descriptionText])
      .setInteractive({ useHandCursor: true });

    // Click handler
    container.on('pointerdown', () => {
      if (ability.isReady) {
        onUse(companionId, ability.id);
        this.hide();
      }
    });

    // Hover effect
    container.on('pointerover', () => {
      if (ability.isReady) {
        btnBg.setStrokeStyle(2, 0x5dd6a2, 0.9);
        btnBg.setFillStyle(0x1a2e1a, 0.9);
      }
    });
    container.on('pointerout', () => {
      btnBg.setStrokeStyle(
        1,
        ability.isReady ? ABILITY_BORDER_READY : ABILITY_BORDER_COOLDOWN,
        0.5,
      );
      btnBg.setFillStyle(0x121e2e, 0.9);
    });

    return container;
  }

  /**
   * Format the cooldown text for display.
   */
  private formatCooldownText(ability: CompanionAbilityEntry): string {
    if (ability.isReady) {
      return 'Ready';
    }
    return `${ability.cooldown} rooms`;
  }
}
