import type { GridConfig } from "../../../config/gameConfig.js";
import type { RandomGenerator } from "../../../core/rng.js";
import type { BiomeMap } from "../biomeMap.js";

export class OceanOperations {
  constructor(
    private readonly biomeMap: BiomeMap,
    private readonly rng: RandomGenerator
  ) {}

  fillRoom(layout: string[][], grid: GridConfig, roomId: string): void {
    const shoreWidth = this.randomIntInRange(4, 7);
    const shores = this.getOceanTransitionShores(roomId);
    for (let y = 0; y < grid.rows; y += 1) {
      for (let x = 0; x < grid.cols; x += 1) {
        const onTransitionShore =
          (shores.west && x < shoreWidth) ||
          (shores.east && x >= grid.cols - shoreWidth) ||
          (shores.north && y < shoreWidth) ||
          (shores.south && y >= grid.rows - shoreWidth);
        layout[y][x] = onTransitionShore ? "." : "~";
      }
    }
    this.placeOceanShips(layout, grid, roomId);
  }

  private getOceanTransitionShores(roomId: string): { north: boolean; south: boolean; west: boolean; east: boolean } {
    const [roomX = 0, roomY = 0, roomZ = 0] = roomId.split(",").map(Number);
    const isOcean = (x: number, y: number) => this.biomeMap.getBiomeForRoomId(`${x},${y},${roomZ}`).id === "sunken-ocean";
    return {
      north: !isOcean(roomX, roomY - 1),
      south: !isOcean(roomX, roomY + 1),
      west: !isOcean(roomX - 1, roomY),
      east: !isOcean(roomX + 1, roomY),
    };
  }

  private placeOceanShips(layout: string[][], grid: GridConfig, roomId: string): void {
    const [roomX = 0, roomY = 0, roomZ = 0] = roomId.split(",").map(Number);
    const anchors = [
      { x: roomX, y: roomY, segment: "start" as const },
      { x: roomX - 1, y: roomY, segment: "east-end" as const },
      { x: roomX, y: roomY - 1, segment: "south-end" as const },
    ];

    for (const anchor of anchors) {
      const ship = this.resolveOceanShip(anchor.x, anchor.y, roomZ, grid);
      if (!ship) {
        continue;
      }
      if (anchor.segment === "start") {
        if (ship.orientation === "east") {
          this.drawShipDeck(layout, Math.floor(grid.cols / 2), ship.offset, grid.cols - Math.floor(grid.cols / 2), ship.width);
        } else {
          this.drawShipDeck(layout, ship.offset, Math.floor(grid.rows / 2), ship.width, grid.rows - Math.floor(grid.rows / 2));
        }
      } else if (anchor.segment === "east-end" && ship.orientation === "east") {
        this.drawShipDeck(layout, 0, ship.offset, Math.ceil(grid.cols / 2), ship.width);
      } else if (anchor.segment === "south-end" && ship.orientation === "south") {
        this.drawShipDeck(layout, ship.offset, 0, ship.width, Math.ceil(grid.rows / 2));
      }
    }
  }

  private resolveOceanShip(
    anchorX: number,
    anchorY: number,
    roomZ: number,
    grid: GridConfig
  ): { orientation: "east" | "south"; offset: number; width: number } | null {
    if (!this.isDeepOceanRoom(anchorX, anchorY, roomZ)) {
      return null;
    }

    const hash = this.hashRoom(anchorX, anchorY, roomZ, 0x51f);
    if (hash % 100 >= 10) {
      return null;
    }

    const orientation = hash % 2 === 0 ? "east" : "south";
    const neighborX = orientation === "east" ? anchorX + 1 : anchorX;
    const neighborY = orientation === "south" ? anchorY + 1 : anchorY;
    if (!this.isDeepOceanRoom(neighborX, neighborY, roomZ)) {
      return null;
    }

    const width = 5;
    const margin = 5;
    const span = orientation === "east" ? grid.rows : grid.cols;
    const maxOffset = Math.max(margin, span - width - margin);
    const offsetRange = Math.max(1, maxOffset - margin + 1);
    const offset = margin + (this.hashRoom(anchorX, anchorY, roomZ, 0x9e3) % offsetRange);
    return { orientation, offset, width };
  }

  private isDeepOceanRoom(roomX: number, roomY: number, roomZ: number): boolean {
    if (this.biomeMap.getBiomeForRoomId(`${roomX},${roomY},${roomZ}`).id !== "sunken-ocean") {
      return false;
    }
    const shores = this.getOceanTransitionShores(`${roomX},${roomY},${roomZ}`);
    return !shores.north && !shores.south && !shores.west && !shores.east;
  }

  private drawShipDeck(layout: string[][], left: number, top: number, width: number, height: number): void {
    for (let y = top; y < top + height; y += 1) {
      for (let x = left; x < left + width; x += 1) {
        if (!layout[y]?.[x]) {
          continue;
        }
        if (layout[y][x] === "#") {
          continue;
        }
        layout[y][x] = "O";
      }
    }
  }

  private randomInt(maxExclusive: number): number {
    return Math.floor(this.rng() * maxExclusive);
  }

  private randomIntInRange(minInclusive: number, maxExclusive: number): number {
    return minInclusive + this.randomInt(Math.max(1, maxExclusive - minInclusive));
  }

  private hashRoom(roomX: number, roomY: number, roomZ: number, salt: number): number {
    let hash = 2166136261;
    hash ^= roomX + 0x9e3779b9;
    hash = Math.imul(hash, 16777619);
    hash ^= roomY + 0x85ebca6b;
    hash = Math.imul(hash, 16777619);
    hash ^= roomZ + salt;
    hash = Math.imul(hash, 16777619);
    return hash >>> 0;
  }
}
