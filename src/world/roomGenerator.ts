import type { GridConfig, WorldConfig } from "../config/gameConfig.js";
import { vectorKey } from "../core/math.js";
import type { RandomGenerator } from "../core/rng.js";
import type { RoomSnapshot } from "./types.js";
import { createHouseRoom } from "./houseRoom.js";
import { tryPlaceQuestHouse } from "./questHouse.js";
import { tryPlaceVillage } from "./village.js";
import { createBiomePalette, getBiomeForRoom } from "./biomes.js";

type ProtectedCells = ReadonlySet<string> | undefined;
type ForestSide = "north" | "south" | "west" | "east";

interface DenseForestPlan {
  exits: Record<ForestSide, boolean>;
  exitPositions: Record<ForestSide, number>;
  center: { x: number; y: number };
}

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
    const isOcean = palette.biomeId === "sunken-ocean";
    const isDenseForest = palette.biomeId === "elderwood-maze";

    const spawnGuard = this.createSpawnGuard(roomId);

    if (isOcean) {
      this.fillOceanRoom(layout, grid, roomId);
    } else if (isDenseForest) {
      this.fillDenseForestRoom(layout, grid, roomId, spawnGuard?.protected);
    }

    const numObstacles = isOcean || isDenseForest
      ? 0
      : this.randomIntInRange(
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

    if (!isOcean && !isDenseForest) {
      this.placeCrossRoomBarriers(layout, grid, roomId, spawnGuard?.protected);
      this.placeCrossRoomRivers(layout, grid, roomId, spawnGuard?.protected);
      this.placeDenseForestThresholds(layout, grid, roomId, spawnGuard?.protected);
    }

    if (!isOcean && !isDenseForest && roomId !== this.config.originRoomId && this.rng() < 0.07) {
      const villagePlacement = tryPlaceVillage(layout, grid, this.rng, palette.biomeId);
      if (villagePlacement) {
        questGiver = villagePlacement.questGiver;
        village = villagePlacement.village;
      }
    }

    if (!isOcean && !isDenseForest && !village && roomId !== this.config.originRoomId && this.rng() < 0.12) {
      const questHouse = tryPlaceQuestHouse(layout, grid, this.rng);
      if (questHouse) {
        questGiver = questHouse.questGiver;
      }
    }

    if (!isOcean && !isDenseForest && roomId !== this.config.originRoomId && this.rng() < 0.1) {
      this.placeLake(layout, grid);
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
        if (layout[ladderY]?.[ladderX] !== ".") {
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

  private fillOceanRoom(layout: string[][], grid: GridConfig, roomId: string): void {
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
    const isOcean = (x: number, y: number) => getBiomeForRoom(`${x},${y},${roomZ}`).id === "sunken-ocean";
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
    if (getBiomeForRoom(`${roomX},${roomY},${roomZ}`).id !== "sunken-ocean") {
      return false;
    }
    const shores = this.getOceanTransitionShores(`${roomX},${roomY},${roomZ}`);
    return !shores.north && !shores.south && !shores.west && !shores.east;
  }

  private fillDenseForestRoom(
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

    const sides = this.forestSides();
    for (const side of sides) {
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

  private placeDenseForestThresholds(
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
      if (getBiomeForRoom(`${roomX + neighbor.dx},${roomY + neighbor.dy},${roomZ}`).id !== "elderwood-maze") {
        continue;
      }
      this.drawDenseForestCornerThreshold(layout, grid, neighbor.corner, protectedCells);
    }

    for (const neighbor of neighbors) {
      if (getBiomeForRoom(`${roomX + neighbor.dx},${roomY + neighbor.dy},${roomZ}`).id !== "elderwood-maze") {
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
    side: "north" | "south" | "west" | "east",
    protectedCells?: ProtectedCells
  ): void {
    const depth = 6;
    const neighbor =
      side === "west" ? { x: roomX - 1, y: roomY } :
      side === "east" ? { x: roomX + 1, y: roomY } :
      side === "north" ? { x: roomX, y: roomY - 1 } :
      { x: roomX, y: roomY + 1 };
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
    const sides = this.forestSides();
    const exits = {} as Record<ForestSide, boolean>;
    const exitPositions = {} as Record<ForestSide, number>;
    for (const side of sides) {
      const neighbor = this.forestNeighbor(roomX, roomY, side);
      const neighborBiome = getBiomeForRoom(`${neighbor.x},${neighbor.y},${roomZ}`).id;
      if (neighborBiome === "sunken-ocean") {
        exits[side] = false;
      } else if (neighborBiome === "elderwood-maze") {
        exits[side] = this.hashForestEdge(roomX, roomY, roomZ, side, 0x601) % 100 < 66;
      } else {
        exits[side] = true;
      }
      exitPositions[side] = this.forestExitPosition(roomX, roomY, roomZ, side, grid);
    }

    if (!sides.some((side) => exits[side])) {
      const edgeCandidates = sides.filter((side) => {
        const neighbor = this.forestNeighbor(roomX, roomY, side);
        const biome = getBiomeForRoom(`${neighbor.x},${neighbor.y},${roomZ}`).id;
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

  private hashTile(x: number, y: number, salt: number): number {
    let hash = 2166136261;
    hash ^= x + 0x7f4a7c15;
    hash = Math.imul(hash, 16777619);
    hash ^= y + salt;
    hash = Math.imul(hash, 16777619);
    return hash >>> 0;
  }

  private positiveMod(value: number, modulo: number): number {
    return ((value % modulo) + modulo) % modulo;
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
    if (hash % 100 >= 16) {
      return null;
    }

    const kind = hash % 3;
    const involvedRooms =
      kind === 0
        ? [[anchorX, anchorY], [anchorX + 1, anchorY]]
        : kind === 1
          ? [[anchorX, anchorY], [anchorX, anchorY + 1]]
          : [[anchorX, anchorY], [anchorX + 1, anchorY], [anchorX, anchorY + 1], [anchorX + 1, anchorY + 1]];
    if (involvedRooms.some(([x, y]) => getBiomeForRoom(`${x},${y},${roomZ}`).id === "sunken-ocean")) {
      return null;
    }

    const width = 4 + (this.hashRoom(anchorX, anchorY, roomZ, 0x4c1) % 6);
    const height = 3 + (this.hashRoom(anchorX, anchorY, roomZ, 0x4c9) % 6);
    const overlapX = 2 + (this.hashRoom(anchorX, anchorY, roomZ, 0x4d3) % Math.max(1, width - 2));
    const overlapY = 2 + (this.hashRoom(anchorX, anchorY, roomZ, 0x4df) % Math.max(1, height - 2));
    const innerX = 3 + (this.hashRoom(anchorX, anchorY, roomZ, 0x4e7) % Math.max(1, grid.cols - width - 6));
    const innerY = 3 + (this.hashRoom(anchorX, anchorY, roomZ, 0x4f1) % Math.max(1, grid.rows - height - 6));

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
    if (getBiomeForRoom(`${roomX},${roomY},${roomZ}`).id === "sunken-ocean") {
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
    if (getBiomeForRoom(`${anchorX},${anchorY},${roomZ}`).id === "sunken-ocean") {
      return null;
    }
    const hash = this.hashRoom(anchorX, anchorY, roomZ, 0x713);
    if (hash % 100 >= 1) {
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

  private placeLake(layout: string[][], grid: GridConfig): void {
    const radiusX = this.randomIntInRange(3, 7);
    const radiusY = this.randomIntInRange(2, 5);
    const centerX = this.randomIntInRange(radiusX + 2, Math.max(radiusX + 3, grid.cols - radiusX - 2));
    const centerY = this.randomIntInRange(radiusY + 2, Math.max(radiusY + 3, grid.rows - radiusY - 2));

    for (let y = centerY - radiusY; y <= centerY + radiusY; y += 1) {
      for (let x = centerX - radiusX; x <= centerX + radiusX; x += 1) {
        if (layout[y]?.[x] !== ".") {
          continue;
        }
        const nx = (x - centerX) / Math.max(1, radiusX);
        const ny = (y - centerY) / Math.max(1, radiusY);
        const edgeNoise = this.rng() * 0.22;
        if (nx * nx + ny * ny <= 1 + edgeNoise) {
          layout[y][x] = "~";
        }
      }
    }
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
