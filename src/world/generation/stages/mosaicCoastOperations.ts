import { vectorKey, type Vector2Like } from '../../../core/math.js';
import { createRng, type RandomGenerator } from '../../../core/rng.js';
import { buildHouseNpcProfile } from '../../../npcs/profiles.js';
import type { MosaicCoastExposureKind } from '../../types.js';
import type { RoomArchetypeId, RoomGenerationContext } from '../types.js';

const MOSAIC_ARCHETYPES: RoomArchetypeId[] = [
  'sun-plaza',
  'awning-alley',
  'orange-grove-courtyard',
  'white-village-switchback',
  'beach-promenade',
  'siesta-market',
  'festival-plaza',
  'mosaic-park',
  'tapas-crawl-room',
  'souvenir-trapwalk',
  'cathedral-of-shade',
  'el-drac-approach',
  'el-drac-arena',
];

export class MosaicCoastOperations {
  fillMosaicCoastRoom(context: RoomGenerationContext): void {
    const rng = createRng(`mosaic-coast:${context.roomId}`);
    const metadata = {
      exposure: [] as Array<{ x: number; y: number; kind: MosaicCoastExposureKind }>,
      fountains: [] as Array<{ x: number; y: number; radius: number }>,
      canopyTrees: [] as Array<{ trunk: Vector2Like; canopy: Vector2Like[] }>,
      awnings: [] as Array<{ cells: Vector2Like[]; colorId: string }>,
    };
    context.mosaicCoast = metadata;
    context.archetype = {
      id: this.chooseArchetype(context.roomId, rng),
      suppressRandomObstacles: true,
    };
    this.paintBase(context, 'direct-sun');
    this.carveEntryShade(context);

    switch (context.archetype.id) {
      case 'mosaic-arrival':
        this.applyArrival(context);
        break;
      case 'sun-plaza':
        this.applySunPlaza(context);
        break;
      case 'awning-alley':
        this.applyAwningAlley(context, rng);
        break;
      case 'orange-grove-courtyard':
        this.applyOrangeGrove(context);
        break;
      case 'white-village-switchback':
        this.applyWhiteVillage(context);
        break;
      case 'beach-promenade':
        this.applyBeachPromenade(context);
        break;
      case 'siesta-market':
      case 'festival-plaza':
      case 'tapas-crawl-room':
        this.applyTapasRoom(context, rng);
        break;
      case 'souvenir-trapwalk':
        this.applySouvenirRoom(context);
        break;
      case 'cathedral-of-shade':
        this.applyCathedral(context);
        break;
      case 'mosaic-park':
      case 'el-drac-approach':
      case 'el-drac-arena':
        this.applyGaudiPark(context);
        break;
      default:
        this.applySunPlaza(context);
        break;
    }

    this.ensureCoolingSource(context);
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
        context.mosaicCoast.exposure.push({ x, y, kind: this.exposureForTile(tile) });
      }
    }
  }

  private chooseArchetype(roomId: string, rng: RandomGenerator): RoomArchetypeId {
    if (roomId === '0,-9,0' || roomId === '-1,-9,0' || roomId === '1,-9,0') {
      return 'mosaic-arrival';
    }
    const [x = 0, y = 0] = roomId.split(',').map(Number);
    if (x === 0 && y === -10) {
      return 'tapas-crawl-room';
    }
    if (x === 2 && y === -11) {
      return 'el-drac-arena';
    }
    return MOSAIC_ARCHETYPES[Math.floor(rng() * MOSAIC_ARCHETYPES.length)] ?? 'sun-plaza';
  }

  private paintBase(context: RoomGenerationContext, exposure: MosaicCoastExposureKind): void {
    for (let y = 0; y < context.grid.rows; y += 1) {
      for (let x = 0; x < context.grid.cols; x += 1) {
        context.canvas.set(x, y, exposure === 'direct-sun' ? 'M' : '.');
      }
    }
  }

  private carveEntryShade(context: RoomGenerationContext): void {
    const midX = Math.floor(context.grid.cols / 2);
    const midY = Math.floor(context.grid.rows / 2);
    this.fillRect(context, 0, midY - 1, 6, 3, 'a');
    this.fillRect(context, context.grid.cols - 6, midY - 1, 6, 3, 'a');
    this.fillRect(context, midX - 2, 0, 5, 6, 'a');
    this.fillRect(context, midX - 2, context.grid.rows - 6, 5, 6, 'a');
    this.fillRect(context, midX - 1, 0, 3, context.grid.rows, 'M');
    this.fillRect(context, 0, midY, context.grid.cols, 1, 'M');
  }

  private applyArrival(context: RoomGenerationContext): void {
    this.fillRect(context, 1, 1, 6, 4, 'a');
    this.fillRect(context, context.grid.cols - 8, 1, 6, 5, 'i');
    this.placeFountain(context, context.grid.cols - 5, 3, 2);
    this.placeCanopyTree(context, 6, 8);
    this.fillRect(context, 8, 8, 8, 4, 'M');
    this.fillRect(context, 4, context.grid.rows - 5, context.grid.cols - 8, 2, 'b');
  }

  private applySunPlaza(context: RoomGenerationContext): void {
    this.fillRect(context, 1, 1, context.grid.cols - 2, 2, 'a');
    this.fillRect(context, 1, context.grid.rows - 3, context.grid.cols - 2, 2, 'a');
    this.fillRect(context, 1, 1, 2, context.grid.rows - 2, 'a');
    this.fillRect(context, context.grid.cols - 3, 1, 2, context.grid.rows - 2, 'a');
    this.fillRect(context, 6, 5, context.grid.cols - 12, context.grid.rows - 10, 'M');
    this.placeFountain(
      context,
      Math.floor(context.grid.cols / 2),
      Math.floor(context.grid.rows / 2),
      3,
    );
  }

  private applyAwningAlley(context: RoomGenerationContext, rng: RandomGenerator): void {
    for (let y = 2; y < context.grid.rows - 2; y += 4) {
      const offset = rng() < 0.5 ? 2 : 7;
      for (let x = offset; x < context.grid.cols - 4; x += 10) {
        this.fillRect(context, x, y, 5, 2, 'a');
        this.fillRect(context, x + 6, y, 3, 2, '#');
      }
    }
    this.placeFountain(context, Math.floor(context.grid.cols / 2), context.grid.rows - 4, 2);
  }

  private applyOrangeGrove(context: RoomGenerationContext): void {
    const trees = [
      { x: 6, y: 5 },
      { x: 16, y: 5 },
      { x: 25, y: 6 },
      { x: 9, y: 16 },
      { x: 22, y: 16 },
    ];
    trees.forEach((tree) => this.placeCanopyTree(context, tree.x, tree.y));
    this.placeFountain(
      context,
      Math.floor(context.grid.cols / 2),
      Math.floor(context.grid.rows / 2),
      2,
    );
  }

  private applyWhiteVillage(context: RoomGenerationContext): void {
    this.fillRect(context, 5, 4, 8, 3, '#');
    this.fillRect(context, 18, 7, 8, 3, '#');
    this.fillRect(context, 4, 14, 9, 3, '#');
    this.fillRect(context, 16, 17, 10, 3, '#');
    this.fillRect(context, 5, 7, 9, 2, 'b');
    this.fillRect(context, 18, 10, 8, 2, 'b');
    this.fillRect(context, 4, 17, 9, 2, 'b');
    this.placeFountain(context, 27, 13, 2);
  }

  private applyBeachPromenade(context: RoomGenerationContext): void {
    this.fillRect(context, 0, 0, context.grid.cols, 4, '~');
    this.fillRect(context, 0, 4, context.grid.cols, 2, 'f');
    this.fillRect(context, 0, 6, context.grid.cols, 2, 'M');
    this.fillRect(context, 2, context.grid.rows - 4, context.grid.cols - 4, 2, 'a');
    this.placeFountain(context, 6, 5, 1);
  }

  private applyTapasRoom(context: RoomGenerationContext, rng: RandomGenerator): void {
    this.fillRect(context, 3, 3, 12, 6, 'i');
    this.fillRect(context, 4, 9, 10, 2, 'a');
    this.fillRect(context, 18, 4, 9, 3, '#');
    this.fillRect(context, 17, 7, 11, 2, 'p');
    const bartender = { x: 7, y: 6 };
    context.canvas.set(bartender.x, bartender.y, 'G');
    const tableCells = [
      { x: 19, y: 11 },
      { x: 21, y: 11 },
      { x: 23, y: 11 },
      { x: 19, y: 13 },
      { x: 21, y: 13 },
      { x: 23, y: 13 },
    ];
    tableCells.forEach((cell) => context.canvas.set(cell.x, cell.y, 'p'));
    context.mosaicCoast!.tapasBar = {
      bartender: {
        ...buildHouseNpcProfile('Tapa Toni', 'sage-1'),
        x: bartender.x,
        y: bartender.y,
      },
      tableCells,
      minigameSeed: `tapas:${context.roomId}:${Math.floor(rng() * 1_000_000)}`,
    };
    this.placeFountain(context, 27, 18, 2);
  }

  private applySouvenirRoom(context: RoomGenerationContext): void {
    this.fillRect(context, 5, 5, 7, 3, '#');
    this.fillRect(context, 5, 8, 7, 2, 'a');
    this.fillRect(context, 17, 5, 9, 4, '#');
    this.fillRect(context, 17, 9, 9, 2, 'a');
    const vendor = { x: 21, y: 12 };
    context.canvas.set(vendor.x, vendor.y, 'G');
    context.mosaicCoast!.souvenirStand = {
      vendor: { ...buildHouseNpcProfile('Magnet Marta', 'sage-2'), x: vendor.x, y: vendor.y },
      standName: 'The Tile Mile',
    };
    this.placeFountain(context, 7, 17, 2);
  }

  private applyCathedral(context: RoomGenerationContext): void {
    this.fillRect(context, 3, 3, context.grid.cols - 6, context.grid.rows - 6, 'i');
    for (let x = 7; x < context.grid.cols - 6; x += 6) {
      this.fillRect(context, x, 7, 2, 2, '#');
      this.fillRect(context, x, 14, 2, 2, '#');
    }
    this.placeFountain(context, Math.floor(context.grid.cols / 2), context.grid.rows - 6, 2);
  }

  private applyGaudiPark(context: RoomGenerationContext): void {
    const mosaicCells: Vector2Like[] = [];
    for (let x = 4; x < context.grid.cols - 4; x += 1) {
      const y = Math.floor(context.grid.rows / 2 + Math.sin(x * 0.7) * 4);
      context.canvas.set(x, y, 'M');
      context.canvas.set(x, y + 1, 'b');
      mosaicCells.push({ x, y }, { x, y: y + 1 });
    }
    this.placeFountain(context, 8, 6, 2);
    this.placeFountain(context, context.grid.cols - 9, context.grid.rows - 7, 2);
    context.mosaicCoast!.gaudiPark = {
      bossEntrance:
        context.archetype?.id === 'el-drac-arena'
          ? { x: Math.floor(context.grid.cols / 2), y: Math.floor(context.grid.rows / 2) }
          : undefined,
      mosaicCells,
    };
  }

  private ensureCoolingSource(context: RoomGenerationContext): void {
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
        if (distance <= radius) {
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
        if (!context.layout[y]?.[x]) {
          continue;
        }
        if (Math.abs(x - trunkX) + Math.abs(y - trunkY) <= 3) {
          context.canvas.set(x, y, 't');
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

  private exposureForTile(tile: string): MosaicCoastExposureKind {
    if (tile === 'f' || tile === 'F') {
      return 'cooling';
    }
    if (tile === 'i') {
      return 'interior';
    }
    if (tile === 'a' || tile === 'b' || tile === 't' || tile === 'p') {
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
