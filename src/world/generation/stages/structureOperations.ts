import type { GridConfig, WorldConfig } from '../../../config/gameConfig.js';
import { vectorKey } from '../../../core/math.js';
import type { RandomGenerator } from '../../../core/rng.js';
import { tryPlaceQuestHouse } from '../../questHouse.js';
import type { RoomSnapshot } from '../../types.js';
import { tryPlaceVillage } from '../../village.js';
import type { RoomGenerationContext } from '../types.js';

export class StructureOperations {
  constructor(
    private readonly config: WorldConfig,
    private readonly rng: RandomGenerator,
  ) {}

  place(context: RoomGenerationContext): void {
    const canPlaceOptionalStructures =
      !context.isOcean && !context.isDenseForest && !this.isStartingArea(context.roomId);
    const entranceRunups = this.createEntranceRunupCells(context.grid, 5);
    const shouldGuaranteeStructure =
      canPlaceOptionalStructures && context.archetype?.id === 'open-clearing';

    if (canPlaceOptionalStructures && (shouldGuaranteeStructure || this.rng() < 0.07)) {
      const villagePlacement = tryPlaceVillage(
        context.layout,
        context.grid,
        this.rng,
        context.palette.biomeId,
        {
          forbiddenCells: entranceRunups,
          margin: 5,
        },
      );
      if (villagePlacement) {
        context.questGiver = villagePlacement.questGiver;
        context.village = villagePlacement.village;
      }
    }

    if (
      canPlaceOptionalStructures &&
      !context.village &&
      (shouldGuaranteeStructure || this.rng() < 0.12)
    ) {
      const questHouse = tryPlaceQuestHouse(context.layout, context.grid, this.rng, {
        forbiddenCells: entranceRunups,
        margin: 5,
      });
      if (questHouse) {
        context.questGiver = questHouse.questGiver;
      }
    }

    if (
      canPlaceOptionalStructures &&
      !context.village &&
      !context.questGiver &&
      (shouldGuaranteeStructure || this.rng() < 0.1)
    ) {
      this.placeLake(context.layout, context.grid, entranceRunups);
    }

    if (!context.village && !context.questGiver) {
      context.temperatureReliefs = this.placeTemperatureReliefs(
        context.layout,
        context.grid,
        context.palette.biomeId,
      );
    }
  }

  private placeLake(
    layout: string[][],
    grid: GridConfig,
    forbiddenCells: ReadonlySet<string>,
  ): void {
    const radiusX = this.randomIntInRange(3, 7);
    const radiusY = this.randomIntInRange(2, 5);
    const runupMargin = 5;
    const centerX = this.randomIntInRange(
      radiusX + runupMargin,
      Math.max(radiusX + runupMargin + 1, grid.cols - radiusX - runupMargin),
    );
    const centerY = this.randomIntInRange(
      radiusY + runupMargin,
      Math.max(radiusY + runupMargin + 1, grid.rows - radiusY - runupMargin),
    );

    for (let y = centerY - radiusY; y <= centerY + radiusY; y += 1) {
      for (let x = centerX - radiusX; x <= centerX + radiusX; x += 1) {
        if (layout[y]?.[x] !== '.') {
          continue;
        }
        if (forbiddenCells.has(vectorKey({ x, y }))) {
          continue;
        }
        const nx = (x - centerX) / Math.max(1, radiusX);
        const ny = (y - centerY) / Math.max(1, radiusY);
        const edgeNoise = this.rng() * 0.22;
        if (nx * nx + ny * ny <= 1 + edgeNoise) {
          layout[y][x] = '~';
        }
      }
    }
  }

  private placeTemperatureReliefs(
    layout: string[][],
    grid: GridConfig,
    biomeId: RoomSnapshot['biomeId'],
  ): RoomSnapshot['temperatureReliefs'] | undefined {
    const kind = biomeId === 'sable-depths' ? 'warm' : biomeId === 'ember-waste' ? 'cool' : null;
    if (!kind) {
      return undefined;
    }

    const count = 2;
    const reliefs: NonNullable<RoomSnapshot['temperatureReliefs']> = [];
    for (let attempt = 0; attempt < 60 && reliefs.length < count; attempt++) {
      const x = this.randomInt(grid.cols);
      const y = this.randomInt(grid.rows);
      if (layout[y]?.[x] !== '.') {
        continue;
      }
      if (reliefs.some((relief) => Math.abs(relief.x - x) + Math.abs(relief.y - y) < 5)) {
        continue;
      }
      reliefs.push({ x, y, kind });
    }
    return reliefs.length > 0 ? reliefs : undefined;
  }

  private randomInt(maxExclusive: number): number {
    return Math.floor(this.rng() * maxExclusive);
  }

  private randomIntInRange(minInclusive: number, maxExclusive: number): number {
    return minInclusive + this.randomInt(Math.max(1, maxExclusive - minInclusive));
  }

  private createEntranceRunupCells(grid: GridConfig, length: number): ReadonlySet<string> {
    const cells = new Set<string>();
    for (let y = 0; y < grid.rows; y += 1) {
      for (let x = 0; x < length && x < grid.cols; x += 1) {
        cells.add(vectorKey({ x, y }));
        cells.add(vectorKey({ x: grid.cols - 1 - x, y }));
      }
    }
    for (let x = 0; x < grid.cols; x += 1) {
      for (let y = 0; y < length && y < grid.rows; y += 1) {
        cells.add(vectorKey({ x, y }));
        cells.add(vectorKey({ x, y: grid.rows - 1 - y }));
      }
    }
    return cells;
  }

  private isStartingArea(roomId: string): boolean {
    const [roomX = 0, roomY = 0, roomZ = 0] = roomId.split(',').map(Number);
    const [originX = 0, originY = 0, originZ = 0] = this.config.originRoomId.split(',').map(Number);
    return roomZ === originZ && Math.abs(roomX - originX) <= 1 && Math.abs(roomY - originY) <= 1;
  }
}
