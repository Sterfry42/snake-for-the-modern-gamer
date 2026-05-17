import type { GridConfig, WorldConfig } from '../../../config/gameConfig.js';
import { vectorKey } from '../../../core/math.js';
import type { RandomGenerator } from '../../../core/rng.js';
import { tryPlaceQuestHouse } from '../../questHouse.js';
import type { RoomSnapshot } from '../../types.js';
import { tryPlaceVillage } from '../../village.js';
import { tryPlaceGoblinCamp } from '../../goblinCamp.js';
import { tryPlaceSnakeMcDonalds } from '../../snakeMcDonalds.js';
import { tryPlaceTown } from '../../town.js';
import { tryPlaceShrine } from '../../shrine.js';
import { tryPlaceRamenStand } from '../../ramenStand.js';
import { tryPlaceKoiPond } from '../../koiPond.js';
import { tryPlaceTenguCamp } from '../../tenguCamp.js';
import type { RoomGenerationContext } from '../types.js';

type SettlementKind =
  | 'village'
  | 'goblin-camp'
  | 'quest-house'
  | 'snake-mcDonalds'
  | 'town'
  | 'shrine'
  | 'ramen-stand'
  | 'tengu-camp';

const SNAKE_MC_DONALDS_CHANCE = 0.01;
const TOWN_CHANCE = 0.08;
const VILLAGE_CHANCE = 0.09;
const GOBLIN_CAMP_CHANCE = 0.06;
const QUEST_HOUSE_CHANCE = 0.12;
const SHRINE_CHANCE = 0.08;
const RAMEN_STAND_CHANCE = 0.04;
const TENGU_CAMP_CHANCE = 0.04;
const SHRINE_JADE_PEAK_CHANCE = 0.12;
const RAMEN_STAND_JADE_PEAK_CHANCE = 0.08;
const TENGU_CAMP_JADE_PEAK_CHANCE = 0.10;
const SETTLEMENT_ANCHOR_SPACING = 5;
const GUARANTEED_SETTLEMENT_KINDS = [
  'town',
  'village',
  'goblin-camp',
  'quest-house',
  'shrine',
  'ramen-stand',
  'tengu-camp',
] as const;
const OPEN_CLEARING_SETTLEMENT_KINDS = ['village', 'goblin-camp', 'quest-house', 'shrine'] as const;

export class StructureOperations {
  constructor(
    private readonly config: WorldConfig,
    private readonly rng: RandomGenerator,
  ) {}

  place(context: RoomGenerationContext): void {
    const canPlaceOptionalStructures =
      !context.isOcean && !context.isDenseForest && !this.isOriginRoom(context.roomId);
    const canPlaceOptionalLake =
      !context.isOcean && !context.isDenseForest && !this.isStartingArea(context.roomId);
    const entranceRunups = this.createEntranceRunupCells(context.grid, 5);
    const shouldGuaranteeStructure =
      canPlaceOptionalStructures &&
      (context.archetype?.id === 'open-clearing' || this.isSettlementAnchor(context.roomId));

    if (
      canPlaceOptionalStructures &&
      !context.village &&
      !context.goblinCamp &&
      !context.town &&
      !context.questGiver &&
      !context.snakeMcDonalds &&
      !context.shrine &&
      !context.ramenStand &&
      !context.tenguCamp
    ) {
      this.placeSettlement(context, entranceRunups, shouldGuaranteeStructure);
    }

    if (
      canPlaceOptionalLake &&
      !context.village &&
      !context.goblinCamp &&
      !context.town &&
      !context.questGiver &&
      !context.snakeMcDonalds &&
      !context.shrine &&
      !context.ramenStand &&
      !context.tenguCamp &&
      (shouldGuaranteeStructure || this.rng() < 0.1)
    ) {
      this.placeLake(context.layout, context.grid, entranceRunups);
    }

    if (
      canPlaceOptionalLake &&
      !context.koiPond &&
      !context.village &&
      !context.goblinCamp &&
      !context.town &&
      !context.questGiver &&
      !context.snakeMcDonalds &&
      !context.shrine &&
      !context.ramenStand &&
      !context.tenguCamp
    ) {
      const koiChance = context.isJadePeak ? 0.12 : 0.03;
      if (this.rng() < koiChance) {
        const koiPond = tryPlaceKoiPond(context.layout, context.grid, this.rng, {
          forbiddenCells: entranceRunups,
          margin: 4,
        });
        if (koiPond) {
          context.koiPond = koiPond;
        }
      }
    }

    if (
      !context.village &&
      !context.goblinCamp &&
      !context.town &&
      !context.questGiver &&
      !context.snakeMcDonalds &&
      !context.shrine &&
      !context.ramenStand &&
      !context.koiPond &&
      !context.tenguCamp
    ) {
      context.temperatureReliefs = this.placeTemperatureReliefs(
        context.layout,
        context.grid,
        context.palette.biomeId,
      );
    }
  }

  private placeSettlement(
    context: RoomGenerationContext,
    forbiddenCells: ReadonlySet<string>,
    guaranteed: boolean,
  ): void {
    const openClearingGuarantee = guaranteed && context.archetype?.id === 'open-clearing';
    const allowTown = !openClearingGuarantee;
    const allowSpecial = !openClearingGuarantee;
    const preferred = this.pickSettlementKind(guaranteed, context, allowTown, allowSpecial);
    if (!preferred) {
      return;
    }

    const attempts = guaranteed
      ? [preferred, ...(allowTown ? GUARANTEED_SETTLEMENT_KINDS : OPEN_CLEARING_SETTLEMENT_KINDS).filter((kind) => kind !== preferred)]
      : [preferred];

    for (const kind of attempts) {
      if (this.tryPlaceSettlementKind(context, forbiddenCells, kind)) {
        return;
      }
    }
  }

  private pickSettlementKind(
    guaranteed: boolean,
    context: RoomGenerationContext,
    allowTown = true,
    allowSpecial = true,
  ): SettlementKind | null {
    const isJadePeak = context.palette.biomeId === 'jade-peak-province';

    if (allowSpecial && this.rng() < SNAKE_MC_DONALDS_CHANCE) {
      return 'snake-mcDonalds';
    }

    const roll = this.rng();
    if (guaranteed) {
      if (allowTown && roll < 0.2) {
        return 'town';
      }
      if (isJadePeak) {
        if (roll < 0.35) {
          return 'village';
        }
        if (roll < 0.55) {
          return 'shrine';
        }
        if (roll < 0.75) {
          return 'tengu-camp';
        }
        return 'quest-house';
      }
      if (roll < 0.55) {
        return 'village';
      }
      if (roll < 0.8) {
        return 'goblin-camp';
      }
      return 'quest-house';
    }

    if (isJadePeak) {
      const shrineChance = SHRINE_JADE_PEAK_CHANCE;
      const ramenChance = RAMEN_STAND_JADE_PEAK_CHANCE;
      const tenguChance = TENGU_CAMP_JADE_PEAK_CHANCE;
      if (roll < shrineChance) {
        return 'shrine';
      }
      if (roll < shrineChance + ramenChance) {
        return 'ramen-stand';
      }
      if (roll < shrineChance + ramenChance + tenguChance) {
        return 'tengu-camp';
      }
      if (roll < shrineChance + ramenChance + tenguChance + VILLAGE_CHANCE) {
        return 'village';
      }
      if (
        roll <
        shrineChance +
          ramenChance +
          tenguChance +
          VILLAGE_CHANCE +
          QUEST_HOUSE_CHANCE
      ) {
        return 'quest-house';
      }
      return null;
    }

    let threshold = VILLAGE_CHANCE;
    if (roll < threshold) {
      return 'village';
    }

    threshold += allowTown && this.canSpawnTown() ? TOWN_CHANCE : 0;
    if (allowTown && this.canSpawnTown() && roll < threshold) {
      return 'town';
    }

    threshold += GOBLIN_CAMP_CHANCE;
    if (roll < threshold) {
      return 'goblin-camp';
    }

    threshold += QUEST_HOUSE_CHANCE;
    if (roll < threshold) {
      return 'quest-house';
    }
    return null;
  }

  private tryPlaceSettlementKind(
    context: RoomGenerationContext,
    forbiddenCells: ReadonlySet<string>,
    kind: SettlementKind,
  ): boolean {
    switch (kind) {
      case 'village': {
        const villagePlacement = tryPlaceVillage(
          context.layout,
          context.grid,
          this.rng,
          context.palette.biomeId,
          {
            forbiddenCells,
            margin: 5,
          },
        );
        if (!villagePlacement) {
          return false;
        }
        context.questGiver = villagePlacement.questGiver;
        context.village = villagePlacement.village;
        return true;
      }
      case 'town': {
        const town = tryPlaceTown(context.layout, context.grid, this.rng, context.palette.biomeId, {
          forbiddenCells,
          margin: 4,
        });
        if (!town) {
          return false;
        }
        context.town = town;
        return true;
      }
      case 'goblin-camp': {
        const goblinCamp = tryPlaceGoblinCamp(context.layout, context.grid, this.rng, {
          forbiddenCells,
          margin: 5,
        });
        if (!goblinCamp) {
          return false;
        }
        context.goblinCamp = goblinCamp;
        return true;
      }
      case 'quest-house': {
        const questHouse = tryPlaceQuestHouse(context.layout, context.grid, this.rng, {
          forbiddenCells,
          margin: 5,
        });
        if (!questHouse) {
          return false;
        }
        context.questGiver = questHouse.questGiver;
        return true;
      }
      case 'snake-mcDonalds': {
        const mcDonalds = tryPlaceSnakeMcDonalds(context.layout, context.grid, this.rng, {
          forbiddenCells,
          margin: 3,
        });
        if (!mcDonalds) {
          return false;
        }
        context.snakeMcDonalds = mcDonalds;
        return true;
      }
      case 'shrine': {
        const shrine = tryPlaceShrine(context.layout, context.grid, this.rng, {
          forbiddenCells,
          margin: 5,
        });
        if (!shrine) {
          return false;
        }
        context.shrine = shrine;
        context.questGiver = shrine.maiden;
        return true;
      }
      case 'ramen-stand': {
        const ramenStand = tryPlaceRamenStand(context.layout, context.grid, this.rng, {
          forbiddenCells,
          margin: 5,
        });
        if (!ramenStand) {
          return false;
        }
        context.ramenStand = ramenStand;
        return true;
      }
      case 'tengu-camp': {
        const tenguCamp = tryPlaceTenguCamp(context.layout, context.grid, this.rng, {
          forbiddenCells,
          margin: 5,
        });
        if (!tenguCamp) {
          return false;
        }
        context.tenguCamp = tenguCamp;
        return true;
      }
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

  private isOriginRoom(roomId: string): boolean {
    return roomId === this.config.originRoomId;
  }

  private canSpawnTown(): boolean {
    return true;
  }

  private isSettlementAnchor(roomId: string): boolean {
    const [roomX = 0, roomY = 0, roomZ = 0] = roomId.split(',').map(Number);
    const chunkX = Math.floor(roomX / SETTLEMENT_ANCHOR_SPACING);
    const chunkY = Math.floor(roomY / SETTLEMENT_ANCHOR_SPACING);
    const hash = this.hashRoom(chunkX, chunkY, roomZ, 0x5e771e);
    const targetX = this.positiveMod(hash, SETTLEMENT_ANCHOR_SPACING);
    const targetY = this.positiveMod(Math.floor(hash / SETTLEMENT_ANCHOR_SPACING), SETTLEMENT_ANCHOR_SPACING);
    return (
      this.positiveMod(roomX, SETTLEMENT_ANCHOR_SPACING) === targetX &&
      this.positiveMod(roomY, SETTLEMENT_ANCHOR_SPACING) === targetY
    );
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
}
