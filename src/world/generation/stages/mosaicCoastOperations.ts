import { vectorKey, type Vector2Like } from '../../../core/math.js';
import { createRng, type RandomGenerator } from '../../../core/rng.js';
import { buildHouseNpcProfile } from '../../../npcs/profiles.js';
import type { MosaicCoastExposureKind } from '../../types.js';
import {
  getMosaicCoastDistrictPlan,
  type MosaicCoastDistrictRoomPlan,
} from '../mosaicCoastDistrictPlan.js';
import type { RoomGenerationContext } from '../types.js';
import type { WorldGenerationIdentity } from '../worldGenerationIdentity.js';

const PASSABLE_MOSAIC_TILES = new Set(['.', 'M', 'a', 'b', 't', 'p', 'i', 'f', 'F', 'G', 'r']);

export class MosaicCoastOperations {
  constructor(private readonly identity: WorldGenerationIdentity) {}

  fillMosaicCoastRoom(context: RoomGenerationContext): void {
    if (this.shouldStructureWin(context)) {
      context.mosaicCoast = this.createMetadata();
      context.archetype = undefined;
      return;
    }

    const plan = getMosaicCoastDistrictPlan(context.roomId);
    const rng = createRng(`mosaic-coast:${this.identity.seed}:${context.roomId}`);
    context.mosaicCoast = this.createMetadata();
    context.archetype = {
      id: plan.archetypeId,
      suppressRandomObstacles: true,
    };

    // Collision/layout is authored first; exposure and decoration are refreshed after.
    this.paintQuietStoneBase(context);
    this.paintDistrictContinuity(context, plan);
    this.applyDistrictZone(context, plan, rng);
    this.addSeededStoneVariation(context, plan, rng);
    this.ensureCoolingSource(context, plan);
    this.addStarterCoolingPockets(context, plan);
    this.protectExposureRoutes(context);
  }

  placeDistrictContinuity(context: RoomGenerationContext): void {
    if (!context.mosaicCoast || this.shouldStructureWin(context)) {
      return;
    }
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
    return Boolean(context.town || context.townPerimeter || context.townMembership || context.townAdjacency);
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
    const midX = Math.floor(context.grid.cols / 2);
    const midY = Math.floor(context.grid.rows / 2);
    this.fillRect(context, midX - 2, 0, 5, context.grid.rows, '.');
    this.fillRect(context, 0, midY - 2, context.grid.cols, 5, '.');
    this.paintEdgeArchitecture(context, plan);
  }

  private paintEdgeArchitecture(context: RoomGenerationContext, plan: MosaicCoastDistrictRoomPlan): void {
    const cols = context.grid.cols;
    const rows = context.grid.rows;
    const midX = Math.floor(cols / 2);
    const midY = Math.floor(rows / 2);
    const dense = plan.zone === 'ruined-stucco-block' || plan.zone === 'old-town-alley';

    this.fillRect(context, 1, 1, cols - 2, 2, 'a');
    this.fillRect(context, 1, rows - 3, cols - 2, 2, 'a');
    this.fillRect(context, 1, 1, 2, rows - 2, 'a');
    this.fillRect(context, cols - 3, 1, 2, rows - 2, 'a');

    const wallDepth = dense ? 5 : 3;
    this.fillRect(context, 1, 1, 8, wallDepth, '#');
    this.fillRect(context, cols - 9, 1, 8, wallDepth, '#');
    this.fillRect(context, 1, rows - wallDepth - 1, 8, wallDepth, '#');
    this.fillRect(context, cols - 9, rows - wallDepth - 1, 8, wallDepth, '#');

    this.fillRect(context, midX - 3, 0, 7, rows, '.');
    this.fillRect(context, 0, midY - 3, cols, 7, '.');
    this.fillRect(context, midX - 3, 0, 7, 5, 'a');
    this.fillRect(context, midX - 3, rows - 5, 7, 5, 'a');
    this.fillRect(context, 0, midY - 3, 5, 7, 'a');
    this.fillRect(context, cols - 5, midY - 3, 5, 7, 'a');
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
    this.placeFountain(context, Math.floor(context.grid.cols / 2), Math.floor(context.grid.rows / 2), 2);
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
    this.placeFountain(context, Math.floor(context.grid.cols / 2), Math.floor(context.grid.rows / 2), 2);
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
    plan: MosaicCoastDistrictRoomPlan,
  ): void {
    if ((context.mosaicCoast?.fountains.length ?? 0) > 0 || !plan.coolingRequired) {
      return;
    }
    this.placeFountain(context, Math.floor(context.grid.cols / 2), Math.floor(context.grid.rows / 2), 2);
  }

  private addStarterCoolingPockets(
    context: RoomGenerationContext,
    plan: MosaicCoastDistrictRoomPlan,
  ): void {
    if (!plan.coolingRequired) {
      return;
    }
    const cols = context.grid.cols;
    const rows = context.grid.rows;
    [
      { x: 5, y: 5 },
      { x: cols - 6, y: 5 },
      { x: 5, y: rows - 6 },
      { x: cols - 6, y: rows - 6 },
    ].forEach((pocket) => {
      const alreadyCooling = context.mosaicCoast?.fountains.some(
        (fountain) => Math.abs(fountain.x - pocket.x) + Math.abs(fountain.y - pocket.y) <= 5,
      );
      if (!alreadyCooling) {
        this.placeFountain(context, pocket.x, pocket.y, 1);
      }
    });
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
    for (let y = 0; y < context.grid.rows; y += 1) {
      protectedCells.add(vectorKey({ x: Math.floor(context.grid.cols / 2), y }));
    }
    for (let x = 0; x < context.grid.cols; x += 1) {
      protectedCells.add(vectorKey({ x, y: Math.floor(context.grid.rows / 2) }));
    }
    context.protectedCells = protectedCells;
  }
}
