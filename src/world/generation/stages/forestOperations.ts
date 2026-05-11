import type { GridConfig } from "../../../config/gameConfig.js";
import { vectorKey } from "../../../core/math.js";
import type { BiomeMap } from "../biomeMap.js";
import type { ProtectedCells } from "../types.js";

type ForestSide = "north" | "south" | "west" | "east";

interface DenseForestPlan {
  exits: Record<ForestSide, boolean>;
  exitPositions: Record<ForestSide, number>;
  center: { x: number; y: number };
}

export class ForestOperations {
  constructor(private readonly biomeMap: BiomeMap) {}

  fillDenseForestRoom(
    layout: string[][],
    grid: GridConfig,
    roomId: string,
    protectedCells?: ProtectedCells
  ): void {
    const [roomX = 0, roomY = 0, roomZ = 0] = roomId.split(",").map(Number);
    const plan = this.resolveDenseForestPlan(roomX, roomY, roomZ, grid);
    for (let y = 0; y < grid.rows; y += 1) {
      for (let x = 0; x < grid.cols; x += 1) {
        if (protectedCells?.has(vectorKey({ x, y }))) {
          continue;
        }
        layout[y][x] = "#";
      }
    }

    for (const side of this.forestSides()) {
      if (!plan.exits[side]) {
        continue;
      }
      this.carveForestEntranceMouth(layout, side, plan.exitPositions[side], grid, 9, 5, ".", protectedCells);
      const exit = this.forestExitPoint(side, plan.exitPositions[side], grid);
      this.carveForestCorridor(layout, plan.center, exit, grid, roomX, roomY, roomZ, side, protectedCells);
    }

    this.carveForestClearings(layout, grid, roomX, roomY, roomZ, protectedCells);
    this.enforceDenseForestEdges(layout, grid, plan, protectedCells);
  }

  placeDenseForestThresholds(
    layout: string[][],
    grid: GridConfig,
    roomId: string,
    protectedCells?: ProtectedCells
  ): void {
    const [roomX = 0, roomY = 0, roomZ = 0] = roomId.split(",").map(Number);
    const neighbors = [
      { dx: -1, dy: 0, side: "west" as const },
      { dx: 1, dy: 0, side: "east" as const },
      { dx: 0, dy: -1, side: "north" as const },
      { dx: 0, dy: 1, side: "south" as const },
    ];

    const diagonalNeighbors = [
      { dx: -1, dy: -1, corner: "northwest" as const },
      { dx: 1, dy: -1, corner: "northeast" as const },
      { dx: -1, dy: 1, corner: "southwest" as const },
      { dx: 1, dy: 1, corner: "southeast" as const },
    ];
    for (const neighbor of diagonalNeighbors) {
      if (this.biomeMap.getBiomeForRoomId(`${roomX + neighbor.dx},${roomY + neighbor.dy},${roomZ}`).id !== "elderwood-maze") {
        continue;
      }
      this.drawDenseForestCornerThreshold(layout, grid, neighbor.corner, protectedCells);
    }

    for (const neighbor of neighbors) {
      if (this.biomeMap.getBiomeForRoomId(`${roomX + neighbor.dx},${roomY + neighbor.dy},${roomZ}`).id !== "elderwood-maze") {
        continue;
      }
      this.drawDenseForestThreshold(layout, grid, roomX, roomY, roomZ, neighbor.side, protectedCells);
    }
  }

  private drawDenseForestThreshold(
    layout: string[][],
    grid: GridConfig,
    roomX: number,
    roomY: number,
    roomZ: number,
    side: ForestSide,
    protectedCells?: ProtectedCells
  ): void {
    const depth = 6;
    const neighbor = this.forestNeighbor(roomX, roomY, side);
    const forestPlan = this.resolveDenseForestPlan(neighbor.x, neighbor.y, roomZ, grid);
    const forestSide = this.oppositeForestSide(side);
    const entranceOpen = forestPlan.exits[forestSide];
    const entrancePosition = forestPlan.exitPositions[forestSide];
    const left = side === "east" ? grid.cols - depth : 0;
    const right = side === "west" ? depth : grid.cols;
    const top = side === "south" ? grid.rows - depth : 0;
    const bottom = side === "north" ? depth : grid.rows;

    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        if (protectedCells?.has(vectorKey({ x, y }))) {
          continue;
        }
        layout[y][x] = "#";
      }
    }

    if (!entranceOpen) {
      return;
    }
    this.carveForestEntranceMouth(layout, side, entrancePosition, grid, depth, 5, ".", protectedCells);
  }

  private drawDenseForestCornerThreshold(
    layout: string[][],
    grid: GridConfig,
    corner: "northwest" | "northeast" | "southwest" | "southeast",
    protectedCells?: ProtectedCells
  ): void {
    const depth = 6;
    const left = corner === "northeast" || corner === "southeast" ? grid.cols - depth : 0;
    const top = corner === "southwest" || corner === "southeast" ? grid.rows - depth : 0;
    this.carveLocalRect(layout, left, top, depth, depth, "#", protectedCells);
  }

  private resolveDenseForestPlan(roomX: number, roomY: number, roomZ: number, grid: GridConfig): DenseForestPlan {
    const exits = {} as Record<ForestSide, boolean>;
    const exitPositions = {} as Record<ForestSide, number>;
    for (const side of this.forestSides()) {
      const neighbor = this.forestNeighbor(roomX, roomY, side);
      const neighborBiome = this.biomeMap.getBiomeForRoomId(`${neighbor.x},${neighbor.y},${roomZ}`).id;
      if (neighborBiome === "sunken-ocean") {
        exits[side] = false;
      } else if (neighborBiome === "elderwood-maze") {
        exits[side] = this.hashForestEdge(roomX, roomY, roomZ, side, 0x601) % 100 < 66;
      } else {
        exits[side] = true;
      }
      exitPositions[side] = this.forestExitPosition(roomX, roomY, roomZ, side, grid);
    }

    if (!this.forestSides().some((side) => exits[side])) {
      const edgeCandidates = this.forestSides().filter((side) => {
        const neighbor = this.forestNeighbor(roomX, roomY, side);
        const biome = this.biomeMap.getBiomeForRoomId(`${neighbor.x},${neighbor.y},${roomZ}`).id;
        return biome !== "sunken-ocean" && biome !== "elderwood-maze";
      });
      if (edgeCandidates.length > 0) {
        const forced = edgeCandidates[this.hashRoom(roomX, roomY, roomZ, 0x65d) % edgeCandidates.length];
        exits[forced] = true;
      }
    }

    const center = {
      x: Math.floor(grid.cols / 2) - 2 + (this.hashRoom(roomX, roomY, roomZ, 0x671) % 5),
      y: Math.floor(grid.rows / 2) - 2 + (this.hashRoom(roomX, roomY, roomZ, 0x67f) % 5),
    };
    return { exits, exitPositions, center };
  }

  private carveForestCorridor(
    layout: string[][],
    from: { x: number; y: number },
    to: { x: number; y: number },
    grid: GridConfig,
    roomX: number,
    roomY: number,
    roomZ: number,
    side: ForestSide,
    protectedCells?: ProtectedCells
  ): void {
    const straightLength = 10 + (this.hashRoom(roomX, roomY, roomZ, this.forestSideSalt(side, 0x683)) % 4);
    const staging = this.forestEntranceStagingPoint(side, to, straightLength, grid);
    this.carveLocalRectBetween(layout, to.x, to.y, staging.x, staging.y, ".", protectedCells);

    const bendFirstHorizontal = this.hashRoom(roomX, roomY, roomZ, this.forestSideSalt(side, 0x691)) % 100 < 50;
    if (bendFirstHorizontal) {
      this.carveLocalRectBetween(layout, from.x, from.y, staging.x, from.y, ".", protectedCells);
      this.carveLocalRectBetween(layout, staging.x, from.y, staging.x, staging.y, ".", protectedCells);
    } else {
      this.carveLocalRectBetween(layout, from.x, from.y, from.x, staging.y, ".", protectedCells);
      this.carveLocalRectBetween(layout, from.x, staging.y, staging.x, staging.y, ".", protectedCells);
    }

    if (this.hashRoom(roomX, roomY, roomZ, this.forestSideSalt(side, 0x6b1)) % 100 < 34) {
      const branchLength = 4 + (this.hashRoom(roomX, roomY, roomZ, this.forestSideSalt(side, 0x6c1)) % 8);
      const branchDir = this.hashRoom(roomX, roomY, roomZ, this.forestSideSalt(side, 0x6d3)) % 2 === 0 ? -1 : 1;
      const branchStart = {
        x: Math.floor((from.x + staging.x) / 2),
        y: Math.floor((from.y + staging.y) / 2),
      };
      if (side === "north" || side === "south") {
        this.carveLocalRectBetween(layout, branchStart.x, branchStart.y, branchStart.x + branchDir * branchLength, branchStart.y, ".", protectedCells);
      } else {
        this.carveLocalRectBetween(layout, branchStart.x, branchStart.y, branchStart.x, branchStart.y + branchDir * branchLength, ".", protectedCells);
      }
    }
  }

  private carveForestClearings(
    layout: string[][],
    grid: GridConfig,
    roomX: number,
    roomY: number,
    roomZ: number,
    protectedCells?: ProtectedCells
  ): void {
    const count = 2 + (this.hashRoom(roomX, roomY, roomZ, 0x701) % 3);
    for (let index = 0; index < count; index += 1) {
      if (this.hashRoom(roomX, roomY, roomZ, 0x711 + index) % 100 >= 55) {
        continue;
      }
      const width = 2 + (this.hashRoom(roomX, roomY, roomZ, 0x721 + index) % 4);
      const height = 2 + (this.hashRoom(roomX, roomY, roomZ, 0x731 + index) % 4);
      const x = 2 + (this.hashRoom(roomX, roomY, roomZ, 0x741 + index) % Math.max(1, grid.cols - width - 4));
      const y = 2 + (this.hashRoom(roomX, roomY, roomZ, 0x751 + index) % Math.max(1, grid.rows - height - 4));
      this.carveLocalRect(layout, x, y, width, height, ".", protectedCells);
    }
  }

  private enforceDenseForestEdges(
    layout: string[][],
    grid: GridConfig,
    plan: DenseForestPlan,
    protectedCells?: ProtectedCells
  ): void {
    for (const side of this.forestSides()) {
      if (plan.exits[side]) {
        continue;
      }
      switch (side) {
        case "north":
          this.carveLocalRect(layout, 0, 0, grid.cols, 2, "#", protectedCells);
          break;
        case "south":
          this.carveLocalRect(layout, 0, grid.rows - 2, grid.cols, 2, "#", protectedCells);
          break;
        case "west":
          this.carveLocalRect(layout, 0, 0, 2, grid.rows, "#", protectedCells);
          break;
        case "east":
          this.carveLocalRect(layout, grid.cols - 2, 0, 2, grid.rows, "#", protectedCells);
          break;
      }
    }

    for (const side of this.forestSides()) {
      if (!plan.exits[side]) {
        continue;
      }
      this.carveForestEntranceMouth(layout, side, plan.exitPositions[side], grid, 9, 5, ".", protectedCells);
    }
  }

  private carveLocalRectBetween(
    layout: string[][],
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    tile: "." | "#",
    protectedCells?: ProtectedCells
  ): void {
    const left = Math.min(x1, x2) - 1;
    const top = Math.min(y1, y2) - 1;
    const width = Math.abs(x2 - x1) + 3;
    const height = Math.abs(y2 - y1) + 3;
    this.carveLocalRect(layout, left, top, width, height, tile, protectedCells);
  }

  private carveLocalRect(
    layout: string[][],
    left: number,
    top: number,
    width: number,
    height: number,
    tile: "." | "#",
    protectedCells?: ProtectedCells
  ): void {
    for (let y = top; y < top + height; y += 1) {
      for (let x = left; x < left + width; x += 1) {
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

  private carveForestEntranceMouth(
    layout: string[][],
    side: ForestSide,
    position: number,
    grid: GridConfig,
    depth: number,
    width: number,
    tile: "." | "#",
    protectedCells?: ProtectedCells
  ): void {
    const half = Math.floor(width / 2);
    switch (side) {
      case "north":
        this.carveLocalRect(layout, position - half, 0, width, depth, tile, protectedCells);
        break;
      case "south":
        this.carveLocalRect(layout, position - half, grid.rows - depth, width, depth, tile, protectedCells);
        break;
      case "west":
        this.carveLocalRect(layout, 0, position - half, depth, width, tile, protectedCells);
        break;
      case "east":
        this.carveLocalRect(layout, grid.cols - depth, position - half, depth, width, tile, protectedCells);
        break;
    }
  }

  private forestExitPoint(side: ForestSide, position: number, grid: GridConfig): { x: number; y: number } {
    switch (side) {
      case "north":
        return { x: position, y: 0 };
      case "south":
        return { x: position, y: grid.rows - 1 };
      case "west":
        return { x: 0, y: position };
      case "east":
        return { x: grid.cols - 1, y: position };
    }
  }

  private forestEntranceStagingPoint(
    side: ForestSide,
    exit: { x: number; y: number },
    straightLength: number,
    grid: GridConfig
  ): { x: number; y: number } {
    switch (side) {
      case "north":
        return { x: exit.x, y: Math.min(grid.rows - 1, straightLength) };
      case "south":
        return { x: exit.x, y: Math.max(0, grid.rows - 1 - straightLength) };
      case "west":
        return { x: Math.min(grid.cols - 1, straightLength), y: exit.y };
      case "east":
        return { x: Math.max(0, grid.cols - 1 - straightLength), y: exit.y };
    }
  }

  private forestExitPosition(roomX: number, roomY: number, roomZ: number, side: ForestSide, grid: GridConfig): number {
    const span = side === "north" || side === "south" ? grid.cols : grid.rows;
    const margin = 4;
    const range = Math.max(1, span - margin * 2);
    return margin + (this.hashForestEdge(roomX, roomY, roomZ, side, 0x681) % range);
  }

  private hashForestEdge(roomX: number, roomY: number, roomZ: number, side: ForestSide, salt: number): number {
    if (side === "east") {
      return this.hashRoom(roomX, roomY, roomZ, salt + 11);
    }
    if (side === "west") {
      return this.hashRoom(roomX - 1, roomY, roomZ, salt + 11);
    }
    if (side === "south") {
      return this.hashRoom(roomX, roomY, roomZ, salt + 29);
    }
    return this.hashRoom(roomX, roomY - 1, roomZ, salt + 29);
  }

  private forestNeighbor(roomX: number, roomY: number, side: ForestSide): { x: number; y: number } {
    switch (side) {
      case "north":
        return { x: roomX, y: roomY - 1 };
      case "south":
        return { x: roomX, y: roomY + 1 };
      case "west":
        return { x: roomX - 1, y: roomY };
      case "east":
        return { x: roomX + 1, y: roomY };
    }
  }

  private oppositeForestSide(side: ForestSide): ForestSide {
    switch (side) {
      case "north":
        return "south";
      case "south":
        return "north";
      case "west":
        return "east";
      case "east":
        return "west";
    }
  }

  private forestSideSalt(side: ForestSide, salt: number): number {
    switch (side) {
      case "north":
        return salt + 1;
      case "south":
        return salt + 2;
      case "west":
        return salt + 3;
      case "east":
        return salt + 4;
    }
  }

  private forestSides(): ForestSide[] {
    return ["north", "south", "west", "east"];
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
