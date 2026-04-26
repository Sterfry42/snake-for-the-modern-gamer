import type { GridConfig, WorldConfig } from "../config/gameConfig.js";
import { vectorKey } from "../core/math.js";
import type { RandomGenerator } from "../core/rng.js";
import type { RoomSnapshot } from "./types.js";
import { createHouseRoom } from "./houseRoom.js";
import { tryPlaceQuestHouse } from "./questHouse.js";
import { tryPlaceVillage } from "./village.js";
import { createBiomePalette } from "./biomes.js";

export class RoomGenerator {
  constructor(
    private readonly config: WorldConfig,
    private readonly rng: RandomGenerator
  ) {}

  generate(roomId: string, grid: GridConfig): RoomSnapshot {
    // Override: special house room at (0,-1,0)
    if (roomId === "0,-1,0") {
      return createHouseRoom(roomId, grid);
    }
    const layout = Array.from({ length: grid.rows }, () => Array(grid.cols).fill("."));
    const portals: RoomSnapshot["portals"] = [];
    let questGiver: RoomSnapshot["questGiver"] | undefined;
    let village: RoomSnapshot["village"] | undefined;
    let temperatureReliefs: RoomSnapshot["temperatureReliefs"] | undefined;
    const palette = createBiomePalette(roomId);

    const spawnGuard = this.createSpawnGuard(roomId);

    const numObstacles = this.randomIntInRange(
      this.config.obstacles.count.min,
      this.config.obstacles.count.max + 1
    );

    for (let i = 0; i < numObstacles; i++) {
      const obstacleWidth = this.randomIntInRange(
        this.config.obstacles.width.min,
        this.config.obstacles.width.max + 1
      );
      const obstacleHeight = this.randomIntInRange(
        this.config.obstacles.height.min,
        this.config.obstacles.height.max + 1
      );

      const maxX = grid.cols - obstacleWidth - this.config.obstacles.margin * 2;
      const maxY = grid.rows - obstacleHeight - this.config.obstacles.margin * 2;
      if (maxX <= 0 || maxY <= 0) {
        continue;
      }

      const x = this.config.obstacles.margin + this.randomInt(maxX);
      const y = this.config.obstacles.margin + this.randomInt(maxY);

      for (let row = y; row < y + obstacleHeight; row++) {
        for (let col = x; col < x + obstacleWidth; col++) {
          if (spawnGuard?.protected.has(vectorKey({ x: col, y: row }))) {
            continue;
          }
          layout[row][col] = "#";
        }
      }
    }

    if (roomId !== this.config.originRoomId && this.rng() < 0.07) {
      const villagePlacement = tryPlaceVillage(layout, grid, this.rng, palette.biomeId);
      if (villagePlacement) {
        questGiver = villagePlacement.questGiver;
        village = villagePlacement.village;
      }
    }

    if (!village && roomId !== this.config.originRoomId && this.rng() < 0.12) {
      const questHouse = tryPlaceQuestHouse(layout, grid, this.rng);
      if (questHouse) {
        questGiver = questHouse.questGiver;
      }
    }

    if (!village && !questGiver) {
      temperatureReliefs = this.placeTemperatureReliefs(layout, grid, palette.biomeId);
    }

    if (this.config.ladder.enabled && this.rng() < this.config.ladder.chance) {
      let ladderPlaced = false;
      for (let attempts = 0; attempts < 50 && !ladderPlaced; attempts++) {
        const ladderWidth = grid.cols - this.config.obstacles.margin * 2;
        const ladderHeight = grid.rows - this.config.obstacles.margin * 2;
        if (ladderWidth <= 0 || ladderHeight <= 0) {
          break;
        }
        const ladderX = this.config.obstacles.margin + this.randomInt(ladderWidth);
        const ladderY = this.config.obstacles.margin + this.randomInt(ladderHeight);
        if (layout[ladderY]?.[ladderX] === "#") {
          continue;
        }
        layout[ladderY][ladderX] = "H";
        portals.push(this.createPortal(roomId, ladderX, ladderY));
        ladderPlaced = true;
      }
    }

    spawnGuard?.clear(layout);

    return {
      id: roomId,
      layout: layout.map((row) => row.join("")),
      portals,
      questGiver,
      village,
      temperatureReliefs,
      biomeId: palette.biomeId,
      biomeTitle: palette.biomeTitle,
      backgroundColor: palette.backgroundColor,
      wallColor: palette.wallColor,
      wallOutlineColor: palette.wallOutlineColor,
    };
  }

  private randomInt(maxExclusive: number): number {
    return Math.floor(this.rng() * maxExclusive);
  }

  private randomIntInRange(minInclusive: number, maxExclusive: number): number {
    return minInclusive + this.randomInt(Math.max(1, maxExclusive - minInclusive));
  }

  private createPortal(roomId: string, x: number, y: number) {
    const [roomX, roomY, roomZ = 0] = roomId.split(",").map(Number);
    const offset = this.config.ladder.verticalOffset;
    const destZ = roomZ + (this.rng() < 0.5 ? offset : -offset);
    return {
      x,
      y,
      destRoomId: `${roomX},${roomY},${destZ}`,
      destX: x,
      destY: y,
    };
  }

  private createSpawnGuard(roomId: string) {
    if (!this.config.spawnGuard.enabled) {
      return null;
    }
    if (roomId !== this.config.originRoomId) {
      return null;
    }

    const protectedCells = new Set<string>();
    const rowsToClear = new Set<number>();

    for (const cell of this.config.spawnGuard.safeCells) {
      protectedCells.add(vectorKey(cell));
      rowsToClear.add(cell.y - 1);
      rowsToClear.add(cell.y);
      rowsToClear.add(cell.y + 1);
    }

    return {
      protected: protectedCells,
      clear(layout: string[][]) {
        for (const row of rowsToClear) {
          if (!layout[row]) {
            continue;
          }
          for (let col = 0; col < layout[row].length; col += 1) {
            if (layout[row][col] === "#") {
              layout[row][col] = ".";
            }
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

  private placeTemperatureReliefs(
    layout: string[][],
    grid: GridConfig,
    biomeId: RoomSnapshot["biomeId"]
  ): RoomSnapshot["temperatureReliefs"] | undefined {
    const kind =
      biomeId === "sable-depths" ? "warm" :
      biomeId === "ember-waste" ? "cool" :
      null;
    if (!kind) {
      return undefined;
    }

    const count = 2;
    const reliefs: NonNullable<RoomSnapshot["temperatureReliefs"]> = [];
    for (let attempt = 0; attempt < 60 && reliefs.length < count; attempt++) {
      const x = this.randomInt(grid.cols);
      const y = this.randomInt(grid.rows);
      if (layout[y]?.[x] !== ".") {
        continue;
      }
      if (reliefs.some((relief) => Math.abs(relief.x - x) + Math.abs(relief.y - y) < 5)) {
        continue;
      }
      reliefs.push({ x, y, kind });
    }
    return reliefs.length > 0 ? reliefs : undefined;
  }
}
