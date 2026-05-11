import { vectorKey } from "../../../core/math.js";
import type { WorldConfig } from "../../../config/gameConfig.js";
import type { RoomGenerationContext, SpawnGuard } from "../types.js";

export class SafetyOperations {
  constructor(private readonly config: WorldConfig) {}

  createSpawnGuard(roomId: string): SpawnGuard | null {
    if (!this.config.spawnGuard.enabled) {
      return null;
    }
    if (roomId !== this.config.originRoomId) {
      return null;
    }

    const protectedCells = new Set<string>();

    for (const cell of this.config.spawnGuard.safeCells) {
      protectedCells.add(vectorKey(cell));
    }
    const cellsToClear = this.createSpawnCorridorCells();

    return {
      protected: protectedCells,
      clear(layout: string[][]) {
        for (const key of cellsToClear) {
          const [col, row] = key.split(",").map(Number);
          if (layout[row]?.[col] === "#") {
            layout[row][col] = ".";
          }
        }
        for (const key of protectedCells) {
          const [col, row] = key.split(",").map(Number);
          if (layout[row]?.[col] === "#") {
            layout[row][col] = ".";
          }
        }
      },
    };
  }

  validate(context: RoomGenerationContext): void {
    context.canvas.ensureHardEntranceRunups(5);
    context.spawnGuard?.clear(context.canvas.layout);
  }

  private createSpawnCorridorCells(): ReadonlySet<string> {
    const cells = this.config.spawnGuard.safeCells;
    const clearCells = new Set<string>();
    if (cells.length === 0) {
      return clearCells;
    }

    const minX = Math.min(...cells.map((cell) => cell.x));
    const maxX = Math.max(...cells.map((cell) => cell.x));
    const minY = Math.min(...cells.map((cell) => cell.y));
    const maxY = Math.max(...cells.map((cell) => cell.y));
    const horizontal = maxX - minX >= maxY - minY;
    const sideBreathingRoom = 1;
    const forwardRunup = 10;

    if (horizontal) {
      for (let y = minY - sideBreathingRoom; y <= maxY + sideBreathingRoom; y += 1) {
        for (let x = minX - sideBreathingRoom; x <= maxX + forwardRunup; x += 1) {
          clearCells.add(vectorKey({ x, y }));
        }
      }
      return clearCells;
    }

    for (let y = minY - sideBreathingRoom; y <= maxY + forwardRunup; y += 1) {
      for (let x = minX - sideBreathingRoom; x <= maxX + sideBreathingRoom; x += 1) {
        clearCells.add(vectorKey({ x, y }));
      }
    }
    return clearCells;
  }
}
