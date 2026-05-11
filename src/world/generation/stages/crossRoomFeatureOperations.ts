import type { GridConfig } from "../../../config/gameConfig.js";
import { vectorKey } from "../../../core/math.js";
import type { RandomGenerator } from "../../../core/rng.js";
import type { BiomeMap } from "../biomeMap.js";
import type { ProtectedCells, RoomGenerationContext } from "../types.js";

export class CrossRoomFeatureOperations {
  private readonly worldSalt: number;

  constructor(
    private readonly biomeMap: BiomeMap,
    rng: RandomGenerator
  ) {
    this.worldSalt = Math.floor(rng() * 0xffffffff);
  }

  place(context: RoomGenerationContext): void {
    if (context.isOcean || context.isDenseForest) {
      return;
    }
    this.placeCrossRoomBarriers(context.layout, context.grid, context.roomId, context.spawnGuard?.protected);
    this.placeCrossRoomRivers(context.layout, context.grid, context.roomId, context.spawnGuard?.protected);
  }

  private placeCrossRoomBarriers(
    layout: string[][],
    grid: GridConfig,
    roomId: string,
    protectedCells?: ProtectedCells
  ): void {
    const [roomX = 0, roomY = 0, roomZ = 0] = roomId.split(",").map(Number);
    for (let anchorY = roomY - 1; anchorY <= roomY; anchorY += 1) {
      for (let anchorX = roomX - 1; anchorX <= roomX; anchorX += 1) {
        const barrier = this.resolveCrossRoomBarrier(anchorX, anchorY, roomZ, grid);
        if (!barrier) {
          continue;
        }
        this.drawGlobalRect(layout, grid, roomX, roomY, barrier, "#", protectedCells);
      }
    }
  }

  private resolveCrossRoomBarrier(
    anchorX: number,
    anchorY: number,
    roomZ: number,
    grid: GridConfig
  ): { left: number; top: number; width: number; height: number } | null {
    const hash = this.hashRoom(anchorX, anchorY, roomZ, 0x4b7);
    if (hash % 100 >= 48) {
      return null;
    }

    const kind = hash % 3;
    const involvedRooms =
      kind === 0
        ? [[anchorX, anchorY], [anchorX + 1, anchorY]]
        : kind === 1
          ? [[anchorX, anchorY], [anchorX, anchorY + 1]]
          : [[anchorX, anchorY], [anchorX + 1, anchorY], [anchorX, anchorY + 1], [anchorX + 1, anchorY + 1]];
    if (involvedRooms.some(([x, y]) => this.biomeMap.getBiomeForRoomId(`${x},${y},${roomZ}`).id === "sunken-ocean")) {
      return null;
    }

    const width = 6 + (this.hashRoom(anchorX, anchorY, roomZ, 0x4c1) % 7);
    const height = 4 + (this.hashRoom(anchorX, anchorY, roomZ, 0x4c9) % 9);
    const overlapX = 2 + (this.hashRoom(anchorX, anchorY, roomZ, 0x4d3) % Math.max(1, width - 3));
    const overlapY = 2 + (this.hashRoom(anchorX, anchorY, roomZ, 0x4df) % Math.max(1, height - 3));
    const innerX = this.hashedOffset(grid.cols, width, 7, this.hashRoom(anchorX, anchorY, roomZ, 0x4e7));
    const innerY = this.hashedOffset(grid.rows, height, 7, this.hashRoom(anchorX, anchorY, roomZ, 0x4f1));

    if (kind === 0) {
      return {
        left: (anchorX + 1) * grid.cols - overlapX,
        top: anchorY * grid.rows + innerY,
        width,
        height,
      };
    }
    if (kind === 1) {
      return {
        left: anchorX * grid.cols + innerX,
        top: (anchorY + 1) * grid.rows - overlapY,
        width,
        height,
      };
    }
    return {
      left: (anchorX + 1) * grid.cols - overlapX,
      top: (anchorY + 1) * grid.rows - overlapY,
      width,
      height,
    };
  }

  private placeCrossRoomRivers(
    layout: string[][],
    grid: GridConfig,
    roomId: string,
    protectedCells?: ProtectedCells
  ): void {
    const [roomX = 0, roomY = 0, roomZ = 0] = roomId.split(",").map(Number);
    if (this.isStartingArea(roomX, roomY, roomZ)) {
      return;
    }
    const length = 15;
    for (let offset = 0; offset < length; offset += 1) {
      this.drawRiverIfPresent(layout, grid, roomX, roomY, roomZ, roomX - offset, roomY, offset, "east", protectedCells);
      this.drawRiverIfPresent(layout, grid, roomX, roomY, roomZ, roomX, roomY - offset, offset, "south", protectedCells);
    }
  }

  private drawRiverIfPresent(
    layout: string[][],
    grid: GridConfig,
    roomX: number,
    roomY: number,
    roomZ: number,
    anchorX: number,
    anchorY: number,
    segmentIndex: number,
    orientation: "east" | "south",
    protectedCells?: ProtectedCells
  ): void {
    const river = this.resolveRiver(anchorX, anchorY, roomZ, grid);
    if (!river || river.orientation !== orientation) {
      return;
    }
    if (this.biomeMap.getBiomeForRoomId(`${roomX},${roomY},${roomZ}`).id === "sunken-ocean") {
      return;
    }

    const roomLeft = roomX * grid.cols;
    const roomTop = roomY * grid.rows;
    if (river.orientation === "east") {
      const segmentLeft = segmentIndex === 0 ? roomLeft + Math.floor(grid.cols / 2) : roomLeft;
      const segmentRight = segmentIndex === river.length - 1 ? roomLeft + Math.ceil(grid.cols / 2) : roomLeft + grid.cols;
      const riverTop = roomTop + river.offset;
      this.drawGlobalRect(layout, grid, roomX, roomY, {
        left: segmentLeft,
        top: riverTop,
        width: segmentRight - segmentLeft,
        height: river.width,
      }, "~", protectedCells);
      if (segmentIndex === river.bridgeIndex) {
        this.drawGlobalRect(layout, grid, roomX, roomY, {
          left: roomLeft + Math.floor(grid.cols / 2) - 1,
          top: riverTop - 2,
          width: 3,
          height: river.width + 4,
        }, "O", protectedCells);
      }
    } else {
      const segmentTop = segmentIndex === 0 ? roomTop + Math.floor(grid.rows / 2) : roomTop;
      const segmentBottom = segmentIndex === river.length - 1 ? roomTop + Math.ceil(grid.rows / 2) : roomTop + grid.rows;
      const riverLeft = roomLeft + river.offset;
      this.drawGlobalRect(layout, grid, roomX, roomY, {
        left: riverLeft,
        top: segmentTop,
        width: river.width,
        height: segmentBottom - segmentTop,
      }, "~", protectedCells);
      if (segmentIndex === river.bridgeIndex) {
        this.drawGlobalRect(layout, grid, roomX, roomY, {
          left: riverLeft - 2,
          top: roomTop + Math.floor(grid.rows / 2) - 1,
          width: river.width + 4,
          height: 3,
        }, "O", protectedCells);
      }
    }
  }

  private resolveRiver(
    anchorX: number,
    anchorY: number,
    roomZ: number,
    grid: GridConfig
  ): { orientation: "east" | "south"; offset: number; width: number; length: number; bridgeIndex: number } | null {
    if (this.biomeMap.getBiomeForRoomId(`${anchorX},${anchorY},${roomZ}`).id === "sunken-ocean") {
      return null;
    }
    if (this.riverTouchesStartingArea(anchorX, anchorY, roomZ)) {
      return null;
    }
    const hash = this.hashRoom(anchorX, anchorY, roomZ, 0x713);
    if (hash % 100 >= 4) {
      return null;
    }

    const orientation = hash % 2 === 0 ? "east" : "south";
    const length = 15;
    const width = 4 + (this.hashRoom(anchorX, anchorY, roomZ, 0x727) % 3);
    const span = orientation === "east" ? grid.rows : grid.cols;
    const margin = 4;
    const maxOffset = Math.max(margin, span - width - margin);
    const offsetRange = Math.max(1, maxOffset - margin + 1);
    const offset = margin + (this.hashRoom(anchorX, anchorY, roomZ, 0x739) % offsetRange);
    const bridgeIndex = 5 + (this.hashRoom(anchorX, anchorY, roomZ, 0x751) % 7);
    return { orientation, offset, width, length, bridgeIndex };
  }

  private drawGlobalRect(
    layout: string[][],
    grid: GridConfig,
    roomX: number,
    roomY: number,
    rect: { left: number; top: number; width: number; height: number },
    tile: "#" | "~" | "O",
    protectedCells?: ProtectedCells
  ): void {
    const roomLeft = roomX * grid.cols;
    const roomTop = roomY * grid.rows;
    const localLeft = Math.max(0, rect.left - roomLeft);
    const localTop = Math.max(0, rect.top - roomTop);
    const localRight = Math.min(grid.cols, rect.left + rect.width - roomLeft);
    const localBottom = Math.min(grid.rows, rect.top + rect.height - roomTop);

    for (let y = localTop; y < localBottom; y += 1) {
      for (let x = localLeft; x < localRight; x += 1) {
        if (!layout[y]?.[x]) {
          continue;
        }
        if (protectedCells?.has(vectorKey({ x, y }))) {
          continue;
        }
        layout[y][x] = tile;
      }
    }
  }

  private hashedOffset(span: number, size: number, desiredMargin: number, hash: number): number {
    const maxStart = Math.max(0, span - size);
    const margin = Math.min(desiredMargin, Math.floor(maxStart / 2));
    const range = Math.max(1, maxStart - margin * 2 + 1);
    return margin + (hash % range);
  }

  private riverTouchesStartingArea(anchorX: number, anchorY: number, roomZ: number): boolean {
    const length = 15;
    for (let index = 0; index < length; index += 1) {
      if (this.isStartingArea(anchorX + index, anchorY, roomZ) || this.isStartingArea(anchorX, anchorY + index, roomZ)) {
        return true;
      }
    }
    return false;
  }

  private isStartingArea(roomX: number, roomY: number, roomZ: number): boolean {
    return roomZ === 0 && Math.abs(roomX) <= 1 && Math.abs(roomY) <= 1;
  }

  private hashRoom(roomX: number, roomY: number, roomZ: number, salt: number): number {
    let hash = 2166136261;
    hash ^= this.worldSalt;
    hash = Math.imul(hash, 16777619);
    hash ^= roomX + 0x9e3779b9;
    hash = Math.imul(hash, 16777619);
    hash ^= roomY + 0x85ebca6b;
    hash = Math.imul(hash, 16777619);
    hash ^= roomZ + salt;
    hash = Math.imul(hash, 16777619);
    return hash >>> 0;
  }
}
