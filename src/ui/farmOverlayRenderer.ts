import type Phaser from 'phaser';
import type { GridConfig } from '../config/gameConfig.js';
import type { FarmCell } from '../farming/farmingTypes.js';
import type { PlacedStructure } from '../building/constructionState.js';
import type { Vector2Like } from '../core/math.js';
import { getCrop } from '../farming/cropCatalog.js';

/** One retained graphics layer; no per-cell display objects or static terrain invalidation. */
export class FarmOverlayRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private signature = '';
  constructor(
    scene: Phaser.Scene,
    private readonly grid: GridConfig,
  ) {
    this.graphics = scene.add.graphics().setDepth(19);
  }
  render(
    roomId: string,
    cells: readonly FarmCell[],
    structures: readonly PlacedStructure[],
    visible: boolean,
    target?: Vector2Like,
  ): void {
    this.graphics.setVisible(visible);
    if (!visible) return;
    const signature = JSON.stringify([
      roomId,
      cells.map((cell) => [
        cell.x,
        cell.y,
        Math.floor(cell.moisture / 10),
        cell.crop?.stage,
        cell.crop?.cropId,
      ]),
      structures,
      target,
    ]);
    if (signature === this.signature) return;
    this.signature = signature;
    this.graphics.clear();
    const size = this.grid.cell;
    if (target)
      this.graphics
        .lineStyle(3, 0x6ee7ff, 1)
        .strokeRect(target.x * size + 1, target.y * size + 1, size - 2, size - 2);
    for (const cell of cells) {
      const x = cell.x * size,
        y = cell.y * size;
      this.graphics
        .fillStyle(cell.moisture >= 30 ? 0x62452f : 0x9c7450, 0.85)
        .fillRect(x + 2, y + 2, size - 4, size - 4);
      this.graphics
        .lineStyle(1, cell.substrate === 'artificial' ? 0x7ed8e8 : 0x422c18, 0.9)
        .strokeRect(x + 2, y + 2, size - 4, size - 4);
      const crop = cell.crop;
      if (!crop) continue;
      const radius =
        crop.stage === 'seeded' ? 2 : crop.stage === 'sprout' ? 4 : crop.stage === 'young' ? 5 : 7;
      const color =
        crop.stage === 'withered'
          ? 0x777777
          : crop.stage === 'ready'
            ? (getCrop(crop.cropId)?.renderColor ?? 0xffd75c)
            : 0x6fce67;
      this.graphics
        .fillStyle(color, 1)
        .fillCircle(x + size / 2, y + size / 2, Math.min(radius, size / 2 - 2));
      if (crop.stage === 'ready')
        this.graphics
          .lineStyle(2, 0xffffff, 0.9)
          .strokeCircle(x + size / 2, y + size / 2, Math.min(radius + 2, size / 2 - 1));
      if (cell.moisture < 15)
        this.graphics.fillStyle(0xe87746, 1).fillTriangle(x + 2, y + 2, x + 7, y + 2, x + 2, y + 7);
    }
    for (const structure of structures)
      for (const cell of structure.cells) {
        if (cell.tile === 'G') continue;
        const color =
          structure.blueprintId === 'greenhouse'
            ? 0x96dfe4
            : structure.blueprintId === 'scarecrow'
              ? 0xe4c25c
              : 0xc59a70;
        this.graphics
          .lineStyle(2, color, 0.9)
          .strokeRect(cell.localX * size + 2, cell.localY * size + 2, size - 4, size - 4);
        if (cell.solid)
          this.graphics
            .fillStyle(color, 0.35)
            .fillRect(cell.localX * size + 3, cell.localY * size + 3, size - 6, size - 6);
      }
  }
  destroy(): void {
    this.graphics.destroy();
  }
}
