/**
 * Territory Map Overlay
 *
 * Phaser UI component for displaying territory control on the world map.
 * Renders faction flags, border lines, patrol indicators, and control percentages.
 */
import type Phaser from 'phaser';
import type {
  TerritoryDefinition,
  TerritoryOwnership,
  TerritoryVisualMarker,
} from './territoryTypes.js';
import { TerritoryManager } from './TerritoryManager.js';

// ─── Faction Color Palette ───────────────────────────────────────────────────

export const FACTION_COLORS: Record<string, number> = {
  'hearthbound-remnant': 0x4CAF50, // Green
  'goblin-camps': 0x8BC34A, // Light green
  'guards': 0x2196F3, // Blue
  'shopkeepers': 0xFF9800, // Orange
  'thieves-guild': 0x9C27B0, // Purple
  'bandits': 0xF44336, // Red
  'wildlife': 0x795548, // Brown
  'predators': 0xD32F2F, // Dark red
  'angels': 0xFFEB3B, // Yellow
  'goblin-angels': 0xCDDC39, // Lime
  'royal-road-office': 0x3F51B5, // Indigo
  'serpents-coil': 0x00BCD4, // Cyan
  unclaimed: 0x607D8B, // Gray
  contested: 0xFF5722, // Deep orange
};

// ─── Territory Type Colors ───────────────────────────────────────────────────

export const TERRITORY_TYPE_COLORS: Record<string, number> = {
  forest: 0x2E7D32,
  cave: 0x424242,
  plains: 0xFFC107,
  mountain: 0x795548,
  ruins: 0x607D8B,
  swamp: 0x558B2F,
  coast: 0x03A9F4,
  tundra: 0xE0F7FA,
  desert: 0xFFE082,
  garden: 0x8BC34A,
};

// ─── Territory Map Overlay Class ─────────────────────────────────────────────

export class TerritoryMapOverlay {
  private container!: Phaser.GameObjects.Container;
  private markers: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private markerData: Map<string, TerritoryVisualMarker> = new Map();
  private borders: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private labels: Map<string, Phaser.GameObjects.Text> = new Map();
  private patrolIndicators: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private isVisible = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly territoryManager: TerritoryManager,
    private readonly mapWidth: number,
    private readonly mapHeight: number,
  ) {
    this.createContainer();
  }

  // ─── Container Setup ───────────────────────────────────────────────────────

  private createContainer(): void {
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(100); // Above most game objects
    this.container.setVisible(false);

    // Background panel
    const background = this.scene.add.graphics();
    background.fillStyle(0x000000, 0.7);
    background.fillRoundedRect(0, 0, this.mapWidth, this.mapHeight, 8);
    this.container.add(background);

    // Title
    const title = this.scene.add.text(10, 10, 'Territory Control', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.container.add(title);

    // Legend
    this.createLegend();
  }

  private createLegend(): void {
    const legendX = this.mapWidth - 160;
    const legendY = 10;

    const legendText = this.scene.add.text(legendX, legendY, 'LEGEND', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.container.add(legendText);

    const statusTexts = [
      { label: '● Stable', color: '#4CAF50', y: 30 },
      { label: '● Contested', color: '#FF5722', y: 48 },
      { label: '● Unclaimed', color: '#607D8B', y: 66 },
      { label: '■ Border', color: '#FFFFFF', y: 84 },
      { label: '◆ Patrol', color: '#FFEB3B', y: 102 },
    ];

    for (const item of statusTexts) {
      const text = this.scene.add.text(legendX, item.y, item.label, {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: item.color,
      });
      this.container.add(text);
    }
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────

  /**
   * Update all territory visual markers.
   */
  update(): void {
    if (!this.isVisible) return;

    const territories = this.territoryManager.getAllTerritories();

    for (const territory of territories) {
      const ownership = this.territoryManager.getOwnership(territory.id);
      if (!ownership) continue;

      this.updateTerritoryMarker(territory, ownership);
    }

    // Update patrol indicators for war zones
    this.updatePatrolIndicators();
  }

  private updateTerritoryMarker(
    territory: TerritoryDefinition,
    ownership: TerritoryOwnership,
  ): void {
    const color = this.getTerritoryColor(ownership);
    const position = this.getTerritoryPosition(territory);

    // Update or create flag marker
    let marker = this.markers.get(territory.id);
    if (!marker) {
      marker = this.createFlagMarker(territory, position, color);
      this.markers.set(territory.id, marker);
      this.container.add(marker);
    } else {
      // Update existing marker display
      this.updateFlagDisplay(marker, color);
    }

    // Update border
    let border = this.borders.get(territory.id);
    if (!border) {
      border = this.createBorder(territory, color);
      this.borders.set(territory.id, border);
      this.container.add(border);
    } else {
      this.updateBorder(border, color, ownership);
    }

    // Update label
    let label = this.labels.get(territory.id);
    if (!label) {
      label = this.createLabel(territory, position, ownership);
      this.labels.set(territory.id, label);
      this.container.add(label);
    } else {
      this.updateLabel(label, territory, ownership);
    }
  }

  private createFlagMarker(
    territory: TerritoryDefinition,
    position: { x: number; y: number },
    color: number,
  ): Phaser.GameObjects.Graphics {
    const flag = this.scene.add.graphics();
    flag.fillStyle(color, 0.9);
    flag.fillTriangle(0, 0, 0, 20, 15, 10);

    // Store marker data separately
    this.markerData.set(territory.id, {
      territoryId: territory.id,
      markerType: 'flag',
      color,
      position,
      size: { width: 15, height: 20 },
      animated: true,
      animationSpeed: 10,
    });

    return flag;
  }

  private updateFlagDisplay(flag: Phaser.GameObjects.Graphics, color: number): void {
    flag.clear();
    flag.fillStyle(color, 0.9);
    flag.fillTriangle(0, 0, 0, 20, 15, 10);
  }

  private createBorder(
    _territory: TerritoryDefinition,
    color: number,
  ): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(2, color, 0.6);
    graphics.strokeRoundedRect(0, 0, 60, 40, 4);
    return graphics;
  }

  private updateBorder(
    border: Phaser.GameObjects.Graphics,
    color: number,
    _ownership: TerritoryOwnership,
  ): void {
    border.clear();
    const lineStyle = _ownership.status === 'contested' ? 3 : 2;
    const alpha = _ownership.status === 'contested' ? 0.9 : 0.6;
    border.lineStyle(lineStyle, color, alpha);
    border.strokeRoundedRect(0, 0, 60, 40, 4);
  }

  private createLabel(
    territory: TerritoryDefinition,
    position: { x: number; y: number },
    ownership: TerritoryOwnership,
  ): Phaser.GameObjects.Text {
    const name = this.scene.add.text(position.x + 20, position.y, territory.name, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    return name;
  }

  private updateLabel(
    label: Phaser.GameObjects.Text,
    territory: TerritoryDefinition,
    ownership: TerritoryOwnership,
  ): void {
    const controlText = ownership.status === 'unclaimed'
      ? ''
      : ` (${ownership.controlPercentage}%)`;
    label.setText(`${territory.name}${controlText}`);
  }

  private updatePatrolIndicators(): void {
    // Clear existing
    for (const [, indicator] of this.patrolIndicators) {
      indicator.clear();
    }

    const contested = this.territoryManager.getAllContestedTerritories();

    for (const ownership of contested) {
      const territory = this.territoryManager.getTerritory(ownership.territoryId);
      if (!territory) continue;

      const position = this.getTerritoryPosition(territory);
      let indicator = this.patrolIndicators.get(territory.id);

      if (!indicator) {
        indicator = this.scene.add.graphics();
        this.patrolIndicators.set(territory.id, indicator);
        this.container.add(indicator);
      }

      // Draw patrol indicator (circle as proxy for diamond)
      indicator.clear();
      indicator.lineStyle(1, 0xFFEB3B, 0.7);
      indicator.strokeCircle(
        position.x + 30,
        position.y + 20,
        6,
      );
      indicator.fillStyle(0xFFEB3B, 0.7);
      indicator.fillCircle(
        position.x + 30,
        position.y + 20,
        4,
      );
    }
  }

  // ─── Position Calculation ──────────────────────────────────────────────────

  private getTerritoryPosition(territory: TerritoryDefinition): { x: number; y: number } {
    // Simple grid-based positioning
    const territories = this.territoryManager.getAllTerritories();
    const index = territories.findIndex((t) => t.id === territory.id);
    const cols = 4;
    const cellWidth = this.mapWidth / (cols + 1);
    const cellHeight = this.mapHeight / 3;

    const col = index % cols;
    const row = Math.floor(index / cols);

    return {
      x: cellWidth * (col + 1) - 30,
      y: 120 + cellHeight * row - 20,
    };
  }

  private getTerritoryColor(ownership: TerritoryOwnership): number {
    if (ownership.status === 'unclaimed') {
      return FACTION_COLORS.unclaimed;
    }
    if (ownership.status === 'contested') {
      return FACTION_COLORS.contested;
    }
    if (ownership.controllingFactionId) {
      return FACTION_COLORS[ownership.controllingFactionId] ?? FACTION_COLORS.unclaimed;
    }
    return FACTION_COLORS.unclaimed;
  }

  // ─── Visibility ────────────────────────────────────────────────────────────

  show(): void {
    this.isVisible = true;
    this.container.setVisible(true);
    this.update();
  }

  hide(): void {
    this.isVisible = false;
    this.container.setVisible(false);
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisibleNow(): boolean {
    return this.isVisible;
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  destroy(): void {
    this.hide();
    this.container.destroy();
    this.markers.clear();
    this.borders.clear();
    this.labels.clear();
    this.patrolIndicators.clear();
  }
}
