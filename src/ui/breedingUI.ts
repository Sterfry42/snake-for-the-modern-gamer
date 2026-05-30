// Breeding UI — provides an interface for selecting breeding pairs,
// checking compatibility, and initiating breeding.

import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';

/** A tamed companion available for breeding. */
export interface BreedingCompanionView {
  id: string;
  name: string;
  kind: string;
  rarity: string;
  bondLevel: number;
  portraitId: string;
  definitionId: string;
  currentRoomId: string;
}

/** Options for the breeding UI. */
interface BreedingUIOptions {
  width?: number;
  height?: number;
  depth?: number;
}

const DEFAULT_OPTIONS: Required<BreedingUIOptions> = {
  width: 500,
  height: 420,
  depth: 25,
};

/** Rarity-based color for UI badges. */
const RARITY_COLORS: Record<string, string> = {
  common: '#9e9e9e',
  uncommon: '#4caf50',
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ff9800',
};

/**
 * Breeding UI — manages the breeding selection panel that lets
 * players choose compatible companion pairs and initiate breeding.
 */
export class BreedingUI {
  private readonly options: Required<BreedingUIOptions>;
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly companionText: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly breedButton: Phaser.GameObjects.Text;
  private readonly closeButton: Phaser.GameObjects.Text;

  private selectedIds: string[] = [];
  private companions: BreedingCompanionView[] = [];
  private hoveredIndex = -1;
  private visible = false;

  private onBreedingFoodSelected?: (foodId: string) => void;
  private onPairSelected?: (parent1Id: string, parent2Id: string) => void;

  constructor(
    private readonly scene: SnakeScene,
    options: BreedingUIOptions = {},
  ) {
    this.options = {
      width: options.width ?? DEFAULT_OPTIONS.width,
      height: options.height ?? DEFAULT_OPTIONS.height,
      depth: options.depth ?? DEFAULT_OPTIONS.depth,
    };

    const x = (this.scene.scale.width - this.options.width) / 2;
    const y = (this.scene.scale.height - this.options.height) / 2;

    this.background = this.scene.add
      .rectangle(0, 0, this.options.width, this.options.height, 0x071019, 0.92)
      .setStrokeStyle(2, 0x4da3ff)
      .setOrigin(0, 0);

    this.title = this.scene.add
      .text(this.options.width / 2, 22, 'Companion Breeding', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#9ad1ff',
        align: 'center',
      })
      .setOrigin(0.5, 0);

    this.companionText = this.scene.add
      .text(20, 50, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#c8ffe1',
        lineSpacing: 6,
        wordWrap: { width: this.options.width - 40 },
      })
      .setInteractive({ useHandCursor: true });

    this.hint = this.scene.add
      .text(this.options.width / 2, this.options.height - 52, 'Select two compatible companions at bond level 5.', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6da8d8',
        align: 'center',
      })
      .setOrigin(0.5, 0);

    this.breedButton = this.scene.add
      .text(this.options.width / 2 - 70, this.options.height - 28, 'Breed', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#5dd6a2',
        backgroundColor: '#224433',
        padding: { left: 16, right: 16, top: 6, bottom: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.closeButton = this.scene.add
      .text(this.options.width / 2 + 70, this.options.height - 28, 'Close', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ff6b6b',
        backgroundColor: '#442222',
        padding: { left: 16, right: 16, top: 6, bottom: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.companionText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.visible) return;
      const index = this.getTextRowIndex(pointer, this.companionText.y, this.companionText);
      if (index < 0 || index >= this.companions.length) return;

      const companion = this.companions[index];
      if (!companion) return;

      const selIndex = this.selectedIds.indexOf(companion.id);
      if (selIndex >= 0) {
        // Deselect
        this.selectedIds.splice(selIndex, 1);
        this.updateHint();
        this.refreshList();
        return;
      }

      if (this.selectedIds.length >= 2) {
        // Replace first selection
        this.selectedIds.shift();
      }

      this.selectedIds.push(companion.id);
      this.updateHint();
      this.refreshList();
    });

    this.companionText.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.visible) return;
      const index = this.getTextRowIndex(pointer, this.companionText.y, this.companionText);
      if (index !== this.hoveredIndex) {
        this.hoveredIndex = index;
        this.refreshList();
      }
    });

    this.companionText.on('pointerout', () => {
      if (this.hoveredIndex >= 0) {
        this.hoveredIndex = -1;
        this.refreshList();
      }
    });

    this.breedButton.on('pointerdown', () => {
      if (!this.visible || this.selectedIds.length !== 2) return;
      const parent1 = this.companions.find((c) => c.id === this.selectedIds[0]);
      const parent2 = this.companions.find((c) => c.id === this.selectedIds[1]);
      if (parent1 && parent2) {
        this.onPairSelected?.(parent1.id, parent2.id);
      }
    });

    this.closeButton.on('pointerdown', () => {
      this.hide();
    });

    const children: Phaser.GameObjects.GameObject[] = [
      this.background,
      this.title,
      this.companionText,
      this.hint,
      this.breedButton,
      this.closeButton,
    ];

    this.container = this.scene.add
      .container(x, y, children)
      .setDepth(this.options.depth)
      .setVisible(false);
  }

  /**
   * Show the breeding UI with a list of available companions.
   */
  show(
    companions: BreedingCompanionView[],
    onBreedingFoodSelected: (foodId: string) => void,
    onPairSelected: (parent1Id: string, parent2Id: string) => void,
  ): void {
    this.companions = companions;
    this.onBreedingFoodSelected = onBreedingFoodSelected;
    this.onPairSelected = onPairSelected;
    this.selectedIds = [];
    this.visible = true;
    this.container.setVisible(true);
    this.container.setAlpha(0).setScale(0.96);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scale: 1,
      duration: 180,
      ease: 'Cubic.easeOut',
    });

    this.scene.time.delayedCall(0, () => this.container.setDepth(this.options.depth));
    this.refreshList();
    this.updateHint();
  }

  /**
   * Hide the breeding UI.
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
    this.selectedIds = [];
    this.companions = [];
    this.hoveredIndex = -1;
  }

  /**
   * Check if the UI is currently visible.
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Refresh the companion list text with compatibility highlighting.
   */
  private refreshList(): void {
    const lines: string[] = [];

    if (this.companions.length === 0) {
      lines.push('No tamed companions at bond level 5.');
      this.companionText.setText(lines.join('\n'));
      this.breedButton.setText('Breed').setAlpha(1);
      return;
    }

    const selectedSet = new Set(this.selectedIds);

    for (let i = 0; i < this.companions.length; i++) {
      const comp = this.companions[i];
      const isBond5 = comp.bondLevel >= 5;
      const isSelected = selectedSet.has(comp.id);
      const isHovered = i === this.hoveredIndex;
      const rarityColor = RARITY_COLORS[comp.rarity] ?? '#9e9e9e';

      // Check compatibility with all other bond-5 companions
      const bond5Companions = this.companions.filter((c) => c.bondLevel >= 5 && c.id !== comp.id);
      const compatiblePairs: string[] = [];
      for (const other of bond5Companions) {
        // Compatibility check: same kind and shared biome
        // We use simple string matching since we don't have full definitions here
        if (comp.kind === other.kind) {
          compatiblePairs.push(other.name);
        }
      }

      let prefix = '  ';
      if (isSelected) prefix = '> ';
      else if (!isBond5) prefix = '- ';

      const line = `${prefix}${comp.name} [${comp.kind}] ${comp.rarity} (bond: ${comp.bondLevel})`;
      lines.push(line);

      if (!isBond5) {
        lines.push(`    Bond level ${comp.bondLevel}/5 required`);
      }

      if (compatiblePairs.length > 0 && isBond5) {
        lines.push(`    Compatible with: ${compatiblePairs.slice(0, 3).join(', ')}${compatiblePairs.length > 3 ? '...' : ''}`);
      }

      if (isBond5 && !isSelected) {
        lines.push(`    ${rarityColor}Click to select${rarityColor}`);
      }

      lines.push('');
    }

    this.companionText.setText(lines.join('\n'));
    this.breedButton.setText(
      this.selectedIds.length === 2 ? 'Breed!' : this.selectedIds.length === 0 ? 'Breed' : 'Breed',
    ).setAlpha(this.selectedIds.length === 2 ? 1 : 0.4);
  }

  /**
   * Update the hint text based on current selection state.
   */
  private updateHint(): void {
    if (this.selectedIds.length === 0) {
      this.hint.setText('Select two compatible companions at bond level 5.');
    } else if (this.selectedIds.length === 1) {
      this.hint.setText('Select one more companion to breed.');
    } else {
      this.hint.setText('Click "Breed" to produce offspring!');
    }
  }

  /**
   * Get the text row index under a pointer position.
   */
  private getTextRowIndex(
    pointer: Phaser.Input.Pointer,
    textY: number,
    text: Phaser.GameObjects.Text,
  ): number {
    const lineHeight = 20;
    const localY = pointer.worldY - this.container.y - textY;
    return Math.floor(localY / lineHeight);
  }
}
