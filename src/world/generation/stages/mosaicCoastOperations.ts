import { vectorKey, type Vector2Like } from '../../../core/math.js';
import { createRng, type RandomGenerator } from '../../../core/rng.js';
import { buildHouseNpcProfile } from '../../../npcs/profiles.js';
import type { MosaicCoastExposureKind } from '../../types.js';
import {
  type MosaicCoastDistrictRoomPlan,
  MosaicCoastRegionPlanner,
} from '../mosaicCoastRegionPlan.js';
import type { RoomGenerationContext } from '../types.js';
import type { WorldGenerationIdentity } from '../worldGenerationIdentity.js';

const PASSABLE_MOSAIC_TILES = new Set(['.', 'M', 'a', 'b', 't', 'p', 'i', 'f', 'F', 'G', 'r']);

export class MosaicCoastOperations {
  private readonly planner: MosaicCoastRegionPlanner;

  constructor(private readonly identity: WorldGenerationIdentity) {
    this.planner = new MosaicCoastRegionPlanner(identity);
  }

  fillMosaicCoastRoom(context: RoomGenerationContext): void {
    if (this.shouldStructureWin(context)) {
      context.mosaicCoast = this.createMetadata();
      context.archetype = undefined;
      return;
    }

    const plan = this.planner.getRoomPlan(context.roomId);
    const rng = createRng(`mosaic-coast:${this.identity.seed}:${context.roomId}`);
    context.mosaicCoast = this.createMetadata();
    context.archetype = {
      id: plan.archetypeId,
      suppressRandomObstacles: true,
    };

    // Collision/layout is authored first; exposure and decoration are refreshed after.
    this.paintQuietStoneBase(context);
    this.paintDistrictContinuity(context, plan);
    this.paintCrossRoomDistrictContinuity(context, plan);
    this.carveSharedDistrictThresholds(context);
    this.carveTransitionLandings(context);
    this.applyDistrictZone(context, plan, rng);
    this.addSeededStoneVariation(context, plan, rng);
    this.ensureCoolingSource(context, plan);
    this.addFairnessCoolingPockets(context, plan);
    this.applyEdgeSafety(context);
    this.protectExposureRoutes(context);
  }

  placeDistrictContinuity(context: RoomGenerationContext): void {
    if (!context.mosaicCoast || this.shouldStructureWin(context)) {
      return;
    }
    const plan = this.planner.getRoomPlan(context.roomId);
    this.paintCrossRoomDistrictContinuity(context, plan);
    this.applyEdgeSafety(context);
    this.protectExposureRoutes(context);
  }

  refreshExposureFromLayout(context: RoomGenerationContext): void {
    if (!context.mosaicCoast) {
      return;
    }
    context.mosaicCoast.exposure = [];
    for (let y = 0; y < context.grid.rows; y += 1) {
      for (let x = 0; x < context.grid.cols; x += 1) {
        const tile = context.layout[y]?.[x];
        if (!tile || tile === '#' || tile === '~') {
          continue;
        }
        context.mosaicCoast.exposure.push({
          x,
          y,
          kind: this.exposureForTile(context, tile, x, y),
        });
      }
    }
  }

  private shouldStructureWin(context: RoomGenerationContext): boolean {
    return Boolean(
      context.town || context.townPerimeter || context.townMembership || context.townAdjacency,
    );
  }

  private createMetadata(): NonNullable<RoomGenerationContext['mosaicCoast']> {
    return {
      exposure: [],
      fountains: [],
      canopyTrees: [],
      awnings: [],
    };
  }

  private paintQuietStoneBase(context: RoomGenerationContext): void {
    for (let y = 0; y < context.grid.rows; y += 1) {
      for (let x = 0; x < context.grid.cols; x += 1) {
        context.canvas.set(x, y, '.');
      }
    }
  }

  private paintDistrictContinuity(
    context: RoomGenerationContext,
    plan: MosaicCoastDistrictRoomPlan,
  ): void {
    this.paintBuildingShell(context, plan);
    this.carvePlanAlley(context, plan);
    this.carveSharedDistrictThresholds(context);
  }

  private paintBuildingShell(
    context: RoomGenerationContext,
    plan: MosaicCoastDistrictRoomPlan,
  ): void {
    const cols = context.grid.cols;
    const rows = context.grid.rows;
    const dense =
      plan.zone === 'ruined-stucco-block' ||
      plan.zone === 'old-town-alley' ||
      plan.zone === 'tapas-courtyard' ||
      plan.zone === 'gaudi-park-approach';
    const borderDepth = dense ? 4 : 3;

    this.fillRect(context, 1, 1, cols - 2, borderDepth, '#');
    this.fillRect(context, 1, rows - borderDepth - 1, cols - 2, borderDepth, '#');
    this.fillRect(context, 1, 1, borderDepth, rows - 2, '#');
    this.fillRect(context, cols - borderDepth - 1, 1, borderDepth, rows - 2, '#');

    const blockCount = dense ? 6 : 4;
    for (let i = 0; i < blockCount; i += 1) {
      const hash = this.hashLocal(context, plan, i);
      const width = 5 + (hash % 5);
      const height = 4 + ((hash >>> 4) % 5);
      const x = 4 + ((hash >>> 8) % Math.max(1, cols - width - 8));
      const y = 4 + ((hash >>> 16) % Math.max(1, rows - height - 8));
      this.fillRect(context, x, y, width, height, '#');
      this.attachAwningToBuilding(context, x, y, width, height, hash);
    }
  }

  private carvePlanAlley(context: RoomGenerationContext, plan: MosaicCoastDistrictRoomPlan): void {
    const cols = context.grid.cols;
    const rows = context.grid.rows;
    const vertical = plan.region.orientation === 'north-south';
    const primary = vertical ? this.alleyColumn(context, plan) : this.alleyRow(context, plan);
    const secondary = vertical ? this.alleyRow(context, plan) : this.alleyColumn(context, plan);
    const primaryWidth = plan.zone === 'sun-plaza' || plan.zone === 'fountain-court' ? 7 : 4;
    const secondaryWidth = plan.zone === 'sun-plaza' ? 5 : 3;

    if (vertical) {
      this.fillRect(context, primary - Math.floor(primaryWidth / 2), 0, primaryWidth, rows, '.');
      this.fillRect(
        context,
        0,
        secondary - Math.floor(secondaryWidth / 2),
        cols,
        secondaryWidth,
        '.',
      );
    } else {
      this.fillRect(context, 0, primary - Math.floor(primaryWidth / 2), cols, primaryWidth, '.');
      this.fillRect(
        context,
        secondary - Math.floor(secondaryWidth / 2),
        0,
        secondaryWidth,
        rows,
        '.',
      );
    }

    this.carveAlleyMouth(
      context,
      'north',
      plan.alleyMouths.north || plan.region.entrySide === 'north',
    );
    this.carveAlleyMouth(
      context,
      'south',
      plan.alleyMouths.south || plan.region.entrySide === 'south',
    );
    this.carveAlleyMouth(
      context,
      'east',
      plan.alleyMouths.east || plan.region.entrySide === 'east',
    );
    this.carveAlleyMouth(
      context,
      'west',
      plan.alleyMouths.west || plan.region.entrySide === 'west',
    );
  }

  private paintCrossRoomDistrictContinuity(
    context: RoomGenerationContext,
    plan: MosaicCoastDistrictRoomPlan,
  ): void {
    const cols = context.grid.cols;
    const rows = context.grid.rows;
    const vertical = plan.region.orientation === 'north-south';
    const alley = vertical ? this.alleyColumn(context, plan) : this.alleyRow(context, plan);

    if (vertical) {
      this.fillRect(context, alley - 3, 0, 7, 3, plan.alleyMouths.north ? '.' : '#');
      this.fillRect(context, alley - 3, rows - 3, 7, 3, plan.alleyMouths.south ? '.' : '#');
      this.fillRect(context, alley - 2, 0, 5, rows, '.');
    } else {
      this.fillRect(context, 0, alley - 3, 3, 7, plan.alleyMouths.west ? '.' : '#');
      this.fillRect(context, cols - 3, alley - 3, 3, 7, plan.alleyMouths.east ? '.' : '#');
      this.fillRect(context, 0, alley - 2, cols, 5, '.');
    }
    this.markBuildingEdgeShade(context, plan);
  }

  private carveAlleyMouth(
    context: RoomGenerationContext,
    side: 'north' | 'south' | 'east' | 'west',
    open: boolean,
  ): void {
    if (!open) {
      return;
    }
    const cols = context.grid.cols;
    const rows = context.grid.rows;
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    if (side === 'north') this.fillRect(context, cx - 3, 0, 7, 6, '.');
    if (side === 'south') this.fillRect(context, cx - 3, rows - 6, 7, 6, '.');
    if (side === 'west') this.fillRect(context, 0, cy - 3, 6, 7, '.');
    if (side === 'east') this.fillRect(context, cols - 6, cy - 3, 6, 7, '.');
  }

  private attachAwningToBuilding(
    context: RoomGenerationContext,
    x: number,
    y: number,
    width: number,
    height: number,
    hash: number,
  ): void {
    if (hash % 3 === 0) {
      this.fillRect(context, x, Math.min(context.grid.rows - 1, y + height), width, 1, 'a');
    } else if (hash % 3 === 1) {
      this.fillRect(
        context,
        Math.min(context.grid.cols - 1, x + width),
        y + 1,
        1,
        Math.max(2, height - 1),
        'b',
      );
    }
  }

  private markBuildingEdgeShade(
    context: RoomGenerationContext,
    plan: MosaicCoastDistrictRoomPlan,
  ): void {
    for (let y = 1; y < context.grid.rows - 1; y += 1) {
      for (let x = 1; x < context.grid.cols - 1; x += 1) {
        if (context.layout[y]?.[x] !== '.') {
          continue;
        }
        const northWall = context.layout[y - 1]?.[x] === '#';
        const westWall = context.layout[y]?.[x - 1] === '#';
        if ((northWall || westWall) && this.hashLocal(context, plan, x * 31 + y) % 3 !== 0) {
          context.canvas.set(x, y, 'b');
        }
      }
    }
  }

  private alleyColumn(context: RoomGenerationContext, plan: MosaicCoastDistrictRoomPlan): number {
    const [roomX = 0, roomY = 0] = context.roomId.split(',').map(Number);
    return (
      9 +
      (this.hashLocal(context, plan, roomX * 13 + roomY * 7) % Math.max(1, context.grid.cols - 18))
    );
  }

  private alleyRow(context: RoomGenerationContext, plan: MosaicCoastDistrictRoomPlan): number {
    const [roomX = 0, roomY = 0] = context.roomId.split(',').map(Number);
    return (
      7 +
      (this.hashLocal(context, plan, roomX * 17 + roomY * 11) % Math.max(1, context.grid.rows - 14))
    );
  }

  private applyDistrictZone(
    context: RoomGenerationContext,
    plan: MosaicCoastDistrictRoomPlan,
    rng: RandomGenerator,
  ): void {
    switch (plan.zone) {
      case 'mosaic-arrival':
        this.applyArrival(context);
        break;
      case 'old-town-alley':
        this.applyOldTownAlley(context, rng);
        break;
      case 'sun-plaza':
        this.applySunPlaza(context);
        break;
      case 'orange-grove-courtyard':
        this.applyOrangeGrove(context);
        break;
      case 'awning-alley':
        this.applyAwningAlley(context, rng);
        break;
      case 'tapas-courtyard':
        this.applyTapasRoom(context, rng);
        break;
      case 'ruined-stucco-block':
        this.applyRuinedBlock(context);
        break;
      case 'fountain-court':
        this.applyFountainCourt(context);
        break;
      case 'gaudi-park-approach':
      case 'el-drac-arena':
        this.applyGaudiPark(context, plan);
        break;
    }
  }

  private applyArrival(context: RoomGenerationContext): void {
    this.fillRect(context, 4, 4, 10, 3, 'a');
    this.fillRect(context, 18, 3, 8, 5, 'i');
    this.placeFountain(context, context.grid.cols - 6, 5, 2);
    this.placeCanopyTree(context, 7, 15);
    this.fillRect(context, 5, context.grid.rows - 6, context.grid.cols - 10, 2, 'b');
  }

  private applyOldTownAlley(context: RoomGenerationContext, rng: RandomGenerator): void {
    this.fillRect(context, 6, 4, 6, 6, '#');
    this.fillRect(context, 20, 5, 6, 7, '#');
    this.fillRect(context, 4, 16, 8, 4, '#');
    this.fillRect(context, 6, 10, 8, 2, 'a');
    this.fillRect(context, 18, 12, 8, 2, 'b');
    if (rng() > 0.35) {
      this.placeFountain(context, 26, 18, 2);
    }
  }

  private applySunPlaza(context: RoomGenerationContext): void {
    const cx = Math.floor(context.grid.cols / 2);
    const cy = Math.floor(context.grid.rows / 2);
    this.fillRect(context, cx - 5, cy - 4, 11, 9, '.');
    this.placeMosaicMedallion(context, cx, cy, 2);
    this.placeFountain(context, cx + 8, cy - 5, 2);
    this.fillRect(context, 5, 4, 6, 2, 'a');
    this.fillRect(context, context.grid.cols - 11, context.grid.rows - 6, 6, 2, 'a');
  }

  private applyOrangeGrove(context: RoomGenerationContext): void {
    [
      { x: 7, y: 6 },
      { x: 24, y: 6 },
      { x: 9, y: 17 },
      { x: 22, y: 17 },
    ].forEach((tree) => this.placeCanopyTree(context, tree.x, tree.y));
    this.placeFountain(
      context,
      Math.floor(context.grid.cols / 2),
      Math.floor(context.grid.rows / 2),
      2,
    );
  }

  private applyAwningAlley(context: RoomGenerationContext, rng: RandomGenerator): void {
    for (let y = 4; y < context.grid.rows - 4; y += 5) {
      const left = rng() < 0.5 ? 4 : 7;
      this.fillRect(context, left, y, 9, 2, 'a');
      this.fillRect(context, context.grid.cols - left - 9, y + 1, 9, 2, 'b');
    }
    this.placeFountain(context, Math.floor(context.grid.cols / 2), context.grid.rows - 5, 2);
  }

  private applyTapasRoom(context: RoomGenerationContext, rng: RandomGenerator): void {
    this.fillRect(context, 4, 3, 11, 6, 'i');
    this.fillRect(context, 4, 9, 11, 2, 'a');
    this.fillRect(context, 18, 4, 9, 4, '#');
    this.fillRect(context, 17, 8, 11, 2, 'p');
    const bartender = { x: 8, y: 6 };
    context.canvas.set(bartender.x, bartender.y, 'G');
    const tableCells = [
      { x: 18, y: 12 },
      { x: 20, y: 12 },
      { x: 22, y: 12 },
      { x: 24, y: 12 },
      { x: 18, y: 15 },
      { x: 20, y: 15 },
      { x: 22, y: 15 },
      { x: 24, y: 15 },
    ];
    tableCells.forEach((cell) => context.canvas.set(cell.x, cell.y, 'p'));
    this.placeMosaicMedallion(context, 16, 12, 1);
    context.mosaicCoast!.tapasBar = {
      bartender: {
        ...buildHouseNpcProfile('Tapa Toni', 'sage-1'),
        x: bartender.x,
        y: bartender.y,
      },
      tableCells,
      minigameSeed: `tapas:${this.identity.seed}:${context.roomId}:${Math.floor(rng() * 1_000_000)}`,
    };
    this.placeFountain(context, 27, 18, 2);
  }

  private applyRuinedBlock(context: RoomGenerationContext): void {
    this.fillRect(context, 5, 4, 8, 4, '#');
    this.fillRect(context, 19, 4, 8, 4, '#');
    this.fillRect(context, 5, 16, 8, 4, '#');
    this.fillRect(context, 19, 16, 8, 4, '#');
    this.fillRect(context, 7, 8, 6, 2, 'a');
    this.fillRect(context, 19, 14, 8, 2, 'b');
    this.placeFountain(
      context,
      Math.floor(context.grid.cols / 2),
      Math.floor(context.grid.rows / 2),
      2,
    );
  }

  private applyFountainCourt(context: RoomGenerationContext): void {
    const cx = Math.floor(context.grid.cols / 2);
    const cy = Math.floor(context.grid.rows / 2);
    this.placeMosaicMedallion(context, cx, cy, 4);
    this.placeFountain(context, cx, cy, 3);
    this.fillRect(context, 4, 5, 6, 2, 'a');
    this.fillRect(context, context.grid.cols - 10, 16, 6, 2, 'a');
  }

  private applyGaudiPark(context: RoomGenerationContext, plan: MosaicCoastDistrictRoomPlan): void {
    const mosaicCells: Vector2Like[] = [];
    for (let x = 5; x < context.grid.cols - 5; x += 1) {
      const y = Math.floor(context.grid.rows / 2 + Math.sin(x * 0.65) * 3);
      context.canvas.set(x, y, 'M');
      mosaicCells.push({ x, y });
      if (plan.zone === 'el-drac-arena' && x % 2 === 0) {
        context.canvas.set(x, y + 1, 'M');
        mosaicCells.push({ x, y: y + 1 });
      } else {
        context.canvas.set(x, y + 1, 'b');
      }
    }
    this.placeFountain(context, 8, 6, 2);
    this.placeFountain(context, context.grid.cols - 9, context.grid.rows - 7, 2);
    context.mosaicCoast!.gaudiPark = {
      bossEntrance:
        plan.zone === 'el-drac-arena'
          ? { x: Math.floor(context.grid.cols / 2), y: Math.floor(context.grid.rows / 2) }
          : undefined,
      mosaicCells,
    };
  }

  private addSeededStoneVariation(
    context: RoomGenerationContext,
    plan: MosaicCoastDistrictRoomPlan,
    rng: RandomGenerator,
  ): void {
    const maxCracks = plan.gaudiAccent ? 22 : 14;
    for (let i = 0; i < maxCracks; i += 1) {
      const x = 2 + Math.floor(rng() * Math.max(1, context.grid.cols - 4));
      const y = 2 + Math.floor(rng() * Math.max(1, context.grid.rows - 4));
      if (context.layout[y]?.[x] === '.') {
        context.canvas.set(x, y, 'r');
      }
    }
  }

  private ensureCoolingSource(
    context: RoomGenerationContext,
    _plan: MosaicCoastDistrictRoomPlan,
  ): void {
    if ((context.mosaicCoast?.fountains.length ?? 0) > 0) {
      return;
    }
    this.placeFountain(
      context,
      Math.floor(context.grid.cols / 2),
      Math.floor(context.grid.rows / 2),
      2,
    );
  }

  private addFairnessCoolingPockets(
    context: RoomGenerationContext,
    plan: MosaicCoastDistrictRoomPlan,
  ): void {
    const shouldAdd =
      plan.coolingRequired ||
      plan.zone === 'old-town-alley' ||
      plan.zone === 'ruined-stucco-block' ||
      plan.zone === 'tapas-courtyard' ||
      plan.zone === 'gaudi-park-approach' ||
      plan.zone === 'el-drac-arena';
    if (!shouldAdd) {
      return;
    }
    const cols = context.grid.cols;
    const rows = context.grid.rows;
    [
      { x: 4, y: 4 },
      { x: cols - 5, y: 4 },
      { x: 4, y: rows - 5 },
      { x: cols - 5, y: rows - 5 },
    ].forEach((pocket) => {
      const alreadyCooling = context.mosaicCoast?.fountains.some(
        (fountain) => Math.abs(fountain.x - pocket.x) + Math.abs(fountain.y - pocket.y) <= 10,
      );
      if (!alreadyCooling) {
        this.placeCoolingPocket(context, pocket.x, pocket.y);
      }
    });
  }

  private applyEdgeSafety(context: RoomGenerationContext): void {
    this.carveSharedDistrictThresholds(context);
    this.carveTransitionLandings(context);
  }

  private carveTransitionLandings(context: RoomGenerationContext): void {
    for (const contract of context.transitionContracts ?? []) {
      if (!contract.passable || contract.kind !== 'shoreline') {
        continue;
      }
      const half = Math.floor(contract.openingWidth / 2);
      const start = contract.openingCenter - half;
      const end = start + contract.openingWidth - 1;
      for (let offset = 0; offset < contract.runupDepth + 2; offset += 1) {
        for (let along = start; along <= end; along += 1) {
          const x =
            contract.side === 'west'
              ? offset
              : contract.side === 'east'
                ? context.grid.cols - 1 - offset
                : along;
          const y =
            contract.side === 'north'
              ? offset
              : contract.side === 'south'
                ? context.grid.rows - 1 - offset
                : along;
          if (!context.layout[y]?.[x]) {
            continue;
          }
          context.canvas.set(x, y, offset <= 1 ? 'a' : '.');
        }
      }
    }
  }

  private carveSharedDistrictThresholds(context: RoomGenerationContext): void {
    const cols = context.grid.cols;
    const rows = context.grid.rows;
    this.fillRect(context, 0, 0, cols, 1, 'a');
    this.fillRect(context, 0, rows - 1, cols, 1, 'a');
    this.fillRect(context, 0, 0, 1, rows, 'a');
    this.fillRect(context, cols - 1, 0, 1, rows, 'a');
  }

  private placeMosaicMedallion(
    context: RoomGenerationContext,
    centerX: number,
    centerY: number,
    radius: number,
  ): void {
    for (let y = centerY - radius; y <= centerY + radius; y += 1) {
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        if (!context.layout[y]?.[x] || Math.abs(x - centerX) + Math.abs(y - centerY) > radius) {
          continue;
        }
        const tile = context.layout[y]![x]!;
        if (PASSABLE_MOSAIC_TILES.has(tile) && tile !== 'f' && tile !== 'F') {
          context.canvas.set(x, y, 'M');
        }
      }
    }
  }

  private placeFountain(
    context: RoomGenerationContext,
    centerX: number,
    centerY: number,
    radius: number,
  ): void {
    const cells: Vector2Like[] = [];
    for (let y = centerY - radius; y <= centerY + radius; y += 1) {
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        if (!context.layout[y]?.[x]) {
          continue;
        }
        const distance = Math.abs(x - centerX) + Math.abs(y - centerY);
        const existing = context.layout[y]?.[x];
        if (distance <= radius && existing !== '#' && existing !== 't') {
          context.canvas.set(x, y, distance === 0 && radius > 1 ? 'F' : 'f');
          cells.push({ x, y });
        }
      }
    }
    context.mosaicCoast?.fountains.push({ x: centerX, y: centerY, radius });
    context.temperatureReliefs = [
      ...(context.temperatureReliefs ?? []),
      ...cells.map((cell) => ({ ...cell, kind: 'cool' as const })),
    ];
  }

  private placeCoolingPocket(
    context: RoomGenerationContext,
    centerX: number,
    centerY: number,
  ): void {
    const cells: Vector2Like[] = [];
    for (let y = centerY - 1; y <= centerY + 1; y += 1) {
      for (let x = centerX - 1; x <= centerX + 1; x += 1) {
        if (!context.layout[y]?.[x] || Math.abs(x - centerX) + Math.abs(y - centerY) > 1) {
          continue;
        }
        context.canvas.set(x, y, 'f');
        cells.push({ x, y });
      }
    }
    context.mosaicCoast?.fountains.push({ x: centerX, y: centerY, radius: 1 });
    context.temperatureReliefs = [
      ...(context.temperatureReliefs ?? []),
      ...cells.map((cell) => ({ ...cell, kind: 'cool' as const })),
    ];
  }

  private placeCanopyTree(context: RoomGenerationContext, trunkX: number, trunkY: number): void {
    const canopy: Vector2Like[] = [];
    for (let y = trunkY - 2; y <= trunkY + 2; y += 1) {
      for (let x = trunkX - 2; x <= trunkX + 2; x += 1) {
        if (!context.layout[y]?.[x] || Math.abs(x - trunkX) + Math.abs(y - trunkY) > 3) {
          continue;
        }
        context.canvas.set(x, y, 't');
        if (x !== trunkX || y !== trunkY) {
          canopy.push({ x, y });
        }
      }
    }
    context.canvas.set(trunkX, trunkY, '#');
    context.mosaicCoast?.canopyTrees.push({ trunk: { x: trunkX, y: trunkY }, canopy });
  }

  private fillRect(
    context: RoomGenerationContext,
    left: number,
    top: number,
    width: number,
    height: number,
    tile: string,
  ): void {
    const cells: Vector2Like[] = [];
    for (let y = top; y < top + height; y += 1) {
      for (let x = left; x < left + width; x += 1) {
        if (!context.layout[y]?.[x]) {
          continue;
        }
        context.canvas.set(x, y, tile);
        if (tile === 'a' || tile === 'b') {
          cells.push({ x, y });
        }
      }
    }
    if (cells.length > 0) {
      context.mosaicCoast?.awnings.push({
        cells,
        colorId: tile === 'a' ? 'cobalt-terracotta' : 'balcony-shadow',
      });
    }
  }

  private exposureForTile(
    context: RoomGenerationContext,
    tile: string,
    x: number,
    y: number,
  ): MosaicCoastExposureKind {
    if (tile === 'f' || tile === 'F') {
      return 'cooling';
    }
    if (tile === 'i') {
      // Interiors are calm shelter: slower heat recovery than fountains, never direct sun.
      return 'interior';
    }
    if (tile === 'a' || tile === 'b' || tile === 't' || tile === 'p' || tile === 'G') {
      return 'shade';
    }
    if (x <= 3 || y <= 3 || x >= context.grid.cols - 4 || y >= context.grid.rows - 4) {
      return 'shade';
    }
    return 'direct-sun';
  }

  private protectExposureRoutes(context: RoomGenerationContext): void {
    this.refreshExposureFromLayout(context);
    const protectedCells = new Set(context.protectedCells ?? []);
    for (const exposure of context.mosaicCoast?.exposure ?? []) {
      if (exposure.kind !== 'direct-sun') {
        protectedCells.add(vectorKey(exposure));
      }
    }
    for (const contract of context.transitionContracts ?? []) {
      if (!contract.passable) {
        continue;
      }
      const half = Math.floor(contract.openingWidth / 2);
      const start = contract.openingCenter - half;
      const end = start + contract.openingWidth - 1;
      for (let offset = 0; offset < contract.runupDepth; offset += 1) {
        for (let along = start; along <= end; along += 1) {
          const x =
            contract.side === 'west'
              ? offset
              : contract.side === 'east'
                ? context.grid.cols - 1 - offset
                : along;
          const y =
            contract.side === 'north'
              ? offset
              : contract.side === 'south'
                ? context.grid.rows - 1 - offset
                : along;
          protectedCells.add(vectorKey({ x, y }));
        }
      }
    }
    context.protectedCells = protectedCells;
  }

  private hashLocal(
    context: RoomGenerationContext,
    plan: MosaicCoastDistrictRoomPlan,
    salt: number,
  ): number {
    let hash = 2166136261;
    const value = `${this.identity.seed}:${plan.region.id}:${context.roomId}:${salt}`;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
}
