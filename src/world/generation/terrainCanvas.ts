import type { GridConfig } from "../../config/gameConfig.js";
import type { RoomLayout } from "./types.js";

export class TerrainCanvas {
  readonly layout: RoomLayout;

  constructor(readonly grid: GridConfig, fillTile = ".") {
    this.layout = Array.from({ length: grid.rows }, () => Array(grid.cols).fill(fillTile));
  }

  get(x: number, y: number): string | undefined {
    return this.layout[y]?.[x];
  }

  set(x: number, y: number, tile: string): void {
    if (!this.contains(x, y)) {
      return;
    }
    this.layout[y][x] = tile;
  }

  isEmpty(x: number, y: number): boolean {
    return this.get(x, y) === ".";
  }

  toRows(): string[] {
    return this.layout.map((row) => row.join(""));
  }

  ensureHardEntranceRunups(length: number): void {
    const carveIfEntrySafe = (startX: number, startY: number, dx: number, dy: number): void => {
      if (!this.isSafeEntryTile(startX, startY)) {
        return;
      }
      for (let step = 0; step < length; step += 1) {
        const x = startX + dx * step;
        const y = startY + dy * step;
        if (!this.contains(x, y)) {
          break;
        }
        const tile = this.get(x, y);
        if (tile === "#" || tile === "~") {
          this.set(x, y, ".");
        }
      }
    };

    for (let y = 0; y < this.grid.rows; y += 1) {
      carveIfEntrySafe(0, y, 1, 0);
      carveIfEntrySafe(this.grid.cols - 1, y, -1, 0);
    }
    for (let x = 0; x < this.grid.cols; x += 1) {
      carveIfEntrySafe(x, 0, 0, 1);
      carveIfEntrySafe(x, this.grid.rows - 1, 0, -1);
    }
  }

  private contains(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.grid.cols && y < this.grid.rows;
  }

  private isSafeEntryTile(x: number, y: number): boolean {
    const tile = this.get(x, y);
    return tile !== undefined && tile !== "#" && tile !== "~";
  }
}
