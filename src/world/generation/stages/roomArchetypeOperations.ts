import type { WorldConfig } from "../../../config/gameConfig.js";
import { vectorKey } from "../../../core/math.js";
import type { RandomGenerator } from "../../../core/rng.js";
import type { RoomArchetype, RoomArchetypeId, RoomGenerationContext } from "../types.js";

interface WeightedArchetype {
  id: RoomArchetypeId;
  weight: number;
}

const DEFAULT_ARCHETYPE_POOL: WeightedArchetype[] = [
  { id: "classic", weight: 65 },
  { id: "open-clearing", weight: 5 },
  { id: "four-corners", weight: 15 },
  { id: "choke-point", weight: 15 },
];

export class RoomArchetypeOperations {
  constructor(
    private readonly config: WorldConfig,
    private readonly rng: RandomGenerator
  ) {}

  apply(context: RoomGenerationContext): void {
    const archetype = this.chooseArchetype(context);
    context.archetype = archetype;

    switch (archetype.id) {
      case "four-corners":
        this.applyFourCorners(context);
        break;
      case "choke-point":
        this.applyChokePoint(context);
        break;
      case "open-clearing":
      case "classic":
      case "ocean":
      case "dense-forest":
        break;
    }
  }

  private chooseArchetype(context: RoomGenerationContext): RoomArchetype {
    if (context.isOcean) {
      return { id: "ocean", suppressRandomObstacles: true };
    }
    if (context.isDenseForest) {
      return { id: "dense-forest", suppressRandomObstacles: true };
    }
    if (context.roomId === this.config.originRoomId) {
      return { id: "classic" };
    }

    const id = this.weightedChoice(DEFAULT_ARCHETYPE_POOL);
    return {
      id,
      suppressRandomObstacles: id === "open-clearing",
    };
  }

  private applyFourCorners(context: RoomGenerationContext): void {
    const safe = this.createEntranceRunupCells(context, 5);
    const roomWidth = context.grid.cols;
    const roomHeight = context.grid.rows;
    const width = this.randomIntInRange(4, 7);
    const height = this.randomIntInRange(3, 5);
    const inset = 6;
    const anchors = [
      { left: inset, top: inset },
      { left: roomWidth - inset - width, top: inset },
      { left: inset, top: roomHeight - inset - height },
      { left: roomWidth - inset - width, top: roomHeight - inset - height },
    ];

    for (const anchor of anchors) {
      this.fillRect(context, anchor.left, anchor.top, width, height, "#", safe);
    }
  }

  private applyChokePoint(context: RoomGenerationContext): void {
    const safe = this.createEntranceRunupCells(context, 5);
    const vertical = this.rng() < 0.5;
    const gapSize = 5 + this.randomInt(3);

    if (vertical) {
      const wallX = Math.floor(context.grid.cols / 2) - 1 + this.randomInt(3);
      const gapTop = 7 + this.randomInt(Math.max(1, context.grid.rows - 14 - gapSize));
      for (let y = 5; y < context.grid.rows - 5; y += 1) {
        if (y >= gapTop && y < gapTop + gapSize) {
          continue;
        }
        this.fillRect(context, wallX, y, 2, 1, "#", safe);
      }
      return;
    }

    const wallY = Math.floor(context.grid.rows / 2) - 1 + this.randomInt(3);
    const gapLeft = 7 + this.randomInt(Math.max(1, context.grid.cols - 14 - gapSize));
    for (let x = 5; x < context.grid.cols - 5; x += 1) {
      if (x >= gapLeft && x < gapLeft + gapSize) {
        continue;
      }
      this.fillRect(context, x, wallY, 1, 2, "#", safe);
    }
  }

  private fillRect(
    context: RoomGenerationContext,
    left: number,
    top: number,
    width: number,
    height: number,
    tile: "#",
    safe: ReadonlySet<string>
  ): void {
    for (let y = top; y < top + height; y += 1) {
      for (let x = left; x < left + width; x += 1) {
        if (!context.layout[y]?.[x]) {
          continue;
        }
        if (safe.has(vectorKey({ x, y }))) {
          continue;
        }
        if (context.spawnGuard?.protected.has(vectorKey({ x, y }))) {
          continue;
        }
        context.canvas.set(x, y, tile);
      }
    }
  }

  private createEntranceRunupCells(context: RoomGenerationContext, length: number): ReadonlySet<string> {
    const cells = new Set<string>();
    for (let y = 0; y < context.grid.rows; y += 1) {
      for (let x = 0; x < length && x < context.grid.cols; x += 1) {
        cells.add(vectorKey({ x, y }));
        cells.add(vectorKey({ x: context.grid.cols - 1 - x, y }));
      }
    }
    for (let x = 0; x < context.grid.cols; x += 1) {
      for (let y = 0; y < length && y < context.grid.rows; y += 1) {
        cells.add(vectorKey({ x, y }));
        cells.add(vectorKey({ x, y: context.grid.rows - 1 - y }));
      }
    }
    return cells;
  }

  private weightedChoice(pool: WeightedArchetype[]): RoomArchetypeId {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = this.rng() * total;
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.id;
      }
    }
    return pool[pool.length - 1]?.id ?? "classic";
  }

  private randomInt(maxExclusive: number): number {
    return Math.floor(this.rng() * maxExclusive);
  }

  private randomIntInRange(minInclusive: number, maxExclusive: number): number {
    return minInclusive + this.randomInt(Math.max(1, maxExclusive - minInclusive));
  }

}
