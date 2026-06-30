import type { GridConfig, WorldConfig } from '../../../config/gameConfig.js';
import { vectorKey } from '../../../core/math.js';
import type { RandomGenerator } from '../../../core/rng.js';
import { tryPlaceQuestHouse } from '../../questHouse.js';
import type { RoomSnapshot } from '../../types.js';
import { tryPlaceVillage } from '../../village.js';
import { tryPlaceGoblinCamp } from '../../goblinCamp.js';
import { tryPlaceSnakeMcDonalds } from '../../snakeMcDonalds.js';
import {
  createTownDistrictRoom,
  createPhysicalHumanTown,
  renderTownGateSide,
  stampTownBoundaryApproach,
  stampTownBoundaryCorner,
  TOWN_GATE_WIDTH,
  type TownDistrictKind,
  type TownResidentPresence,
} from '../../town.js';
import { tryPlaceShrine } from '../../shrine.js';
import { tryPlaceRamenStand } from '../../ramenStand.js';
import { tryPlaceKoiPond } from '../../koiPond.js';
import { tryPlaceTenguCamp } from '../../tenguCamp.js';
import { tryPlaceRoadsideMonument } from '../../roadsideMonument.js';
import { tryPlaceAllNiteDiner } from '../../allNiteDiner.js';
import { tryPlaceFireworkStand } from '../../fireworkStand.js';
import { tryPlaceJackalopeLodge } from '../../jackalopeLodge.js';
import { tryPlaceMolemanDigSite } from '../../molemanDigSite.js';
import {
  carveEdgeOpening,
  cellsForEdgeRunup,
  mergeProtectedCells,
  type EdgeSide,
} from '../edgeAccess.js';
import {
  getHumanTownDistricts,
  getHumanTownEntranceRoomId,
  getHumanTownExitRoomIds,
  getHumanTownFootprint,
  type MultiRoomStructureResolver,
} from '../townStructureResolver.js';
import { formatRoomId } from '../multiRoomStructures.js';
import type { RoomGenerationContext } from '../types.js';

type SettlementKind =
  | 'village'
  | 'goblin-camp'
  | 'quest-house'
  | 'snake-mcDonalds'
  | 'shrine'
  | 'ramen-stand'
  | 'tengu-camp'
  | 'roadside-monument'
  | 'all-nite-diner'
  | 'firework-stand'
  | 'jackalope-lodge'
  | 'moleman-dig-site';

const SNAKE_MC_DONALDS_CHANCE = 0.01;
const VILLAGE_CHANCE = 0.09;
const GOBLIN_CAMP_CHANCE = 0.06;
const QUEST_HOUSE_CHANCE = 0.12;
const SHRINE_CHANCE = 0.08;
const RAMEN_STAND_CHANCE = 0.04;
const TENGU_CAMP_CHANCE = 0.04;
const SHRINE_JADE_PEAK_CHANCE = 0.12;
const RAMEN_STAND_JADE_PEAK_CHANCE = 0.08;
const TENGU_CAMP_JADE_PEAK_CHANCE = 0.1;
const ROADSIDE_MONUMENT_CHANCE = 0.1;
const ALL_NITE_DINER_CHANCE = 0.08;
const FIREWORK_STAND_CHANCE = 0.08;
const JACKALOPE_LODGE_CHANCE = 0.1;
const MOLEMAN_DIG_SITE_CHANCE = 0.09;
const MOTEL_POOL_CHANCE = 0.1;
const SETTLEMENT_ANCHOR_SPACING = 5;
const GUARANTEED_SETTLEMENT_KINDS = [
  'village',
  'goblin-camp',
  'quest-house',
  'shrine',
  'ramen-stand',
  'tengu-camp',
  'roadside-monument',
  'all-nite-diner',
  'firework-stand',
  'jackalope-lodge',
  'moleman-dig-site',
] as const;
const OPEN_CLEARING_SETTLEMENT_KINDS = ['village', 'goblin-camp', 'quest-house', 'shrine'] as const;

export class StructureOperations {
  constructor(
    private readonly config: WorldConfig,
    private readonly rng: RandomGenerator,
    private readonly structureResolver: MultiRoomStructureResolver,
  ) {}

  place(context: RoomGenerationContext): void {
    if (context.townMembership?.role === 'inside' && context.townMembership.district) {
      this.renderTownDistrict(context);
      return;
    }

    if (context.townAdjacency) {
      this.renderTownPerimeter(context);
    }

    const canPlaceOptionalStructures =
      !context.isOcean && !context.isDenseForest && !this.isOriginRoom(context.roomId);
    const canPlaceOptionalLake =
      !context.isOcean && !context.isDenseForest && !this.isStartingArea(context.roomId);
    const entranceRunups = this.createEntranceRunupCells(context.grid, 5);
    const libertyStructureFriendly =
      context.isLibertyBadlands &&
      (context.archetype?.id === 'monument-plaza' ||
        context.archetype?.id === 'firework-field' ||
        context.archetype?.id === 'interstate-cut');
    const shouldGuaranteeStructure =
      canPlaceOptionalStructures &&
      (context.archetype?.id === 'open-clearing' ||
        libertyStructureFriendly ||
        this.isSettlementAnchor(context.roomId));

    if (
      canPlaceOptionalStructures &&
      !context.townAdjacency &&
      !context.village &&
      !context.goblinCamp &&
      !context.town &&
      !context.questGiver &&
      !context.snakeMcDonalds &&
      !context.shrine &&
      !context.ramenStand &&
      !context.tenguCamp &&
      !context.molemanDigSite &&
      !this.hasLibertyStructure(context)
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
      !context.molemanDigSite &&
      !this.hasLibertyStructure(context) &&
      (shouldGuaranteeStructure || this.rng() < 0.1)
    ) {
      this.placeLake(context.layout, context.grid, entranceRunups);
    }

    if (
      canPlaceOptionalLake &&
      !context.townAdjacency &&
      !context.koiPond &&
      !context.village &&
      !context.goblinCamp &&
      !context.town &&
      !context.questGiver &&
      !context.snakeMcDonalds &&
      !context.shrine &&
      !context.ramenStand &&
      !context.tenguCamp &&
      !context.molemanDigSite &&
      !this.hasLibertyStructure(context)
    ) {
      const koiChance = context.isJadePeak
        ? 0.12
        : context.isLibertyBadlands
          ? MOTEL_POOL_CHANCE
          : 0.03;
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
      !context.tenguCamp &&
      !context.molemanDigSite &&
      !this.hasLibertyStructure(context)
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
    const allowSpecial = !openClearingGuarantee;
    const preferred = this.pickSettlementKind(guaranteed, context, allowSpecial);
    if (!preferred) {
      return;
    }

    const attempts = guaranteed
      ? [
          preferred,
          ...(openClearingGuarantee
            ? OPEN_CLEARING_SETTLEMENT_KINDS
            : GUARANTEED_SETTLEMENT_KINDS
          ).filter((kind) => kind !== preferred),
        ]
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
    allowSpecial = true,
  ): SettlementKind | null {
    const isJadePeak = context.palette.biomeId === 'jade-peak-province';
    const isLibertyBadlands = context.palette.biomeId === 'liberty-badlands';

    if (allowSpecial && this.rng() < SNAKE_MC_DONALDS_CHANCE) {
      return 'snake-mcDonalds';
    }

    const roll = this.rng();
    if (guaranteed) {
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
      if (isLibertyBadlands) {
        if (roll < 0.25) {
          return 'all-nite-diner';
        }
        if (roll < 0.45) {
          return 'roadside-monument';
        }
        if (roll < 0.65) {
          return 'jackalope-lodge';
        }
        if (roll < 0.8) {
          return 'firework-stand';
        }
        return 'quest-house';
      }
      if (roll < 0.45) {
        return 'village';
      }
      if (roll < 0.75) {
        return 'goblin-camp';
      }
      if (roll < 0.88) {
        return 'moleman-dig-site';
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
      if (roll < shrineChance + ramenChance + tenguChance + VILLAGE_CHANCE + QUEST_HOUSE_CHANCE) {
        return 'quest-house';
      }
      return null;
    }

    if (isLibertyBadlands) {
      let threshold = ALL_NITE_DINER_CHANCE;
      if (roll < threshold) {
        return 'all-nite-diner';
      }
      threshold += ROADSIDE_MONUMENT_CHANCE;
      if (roll < threshold) {
        return 'roadside-monument';
      }
      threshold += JACKALOPE_LODGE_CHANCE;
      if (roll < threshold) {
        return 'jackalope-lodge';
      }
      threshold += FIREWORK_STAND_CHANCE;
      if (roll < threshold) {
        return 'firework-stand';
      }
      threshold += QUEST_HOUSE_CHANCE;
      if (roll < threshold) {
        return 'quest-house';
      }
      return null;
    }

    let threshold = VILLAGE_CHANCE;
    if (roll < threshold) {
      return 'village';
    }

    threshold += GOBLIN_CAMP_CHANCE;
    if (roll < threshold) {
      return 'goblin-camp';
    }

    threshold += QUEST_HOUSE_CHANCE;
    if (roll < threshold) {
      return 'quest-house';
    }
    threshold += MOLEMAN_DIG_SITE_CHANCE;
    if (roll < threshold) {
      return 'moleman-dig-site';
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
      case 'roadside-monument': {
        const monument = tryPlaceRoadsideMonument(context.layout, context.grid, this.rng, {
          forbiddenCells,
          margin: 5,
        });
        if (!monument) {
          return false;
        }
        context.roadsideMonument = monument;
        context.questGiver = monument.docent;
        return true;
      }
      case 'all-nite-diner': {
        const diner = tryPlaceAllNiteDiner(context.layout, context.grid, this.rng, {
          forbiddenCells,
          margin: 5,
        });
        if (!diner) {
          return false;
        }
        context.allNiteDiner = diner;
        return true;
      }
      case 'firework-stand': {
        const stand = tryPlaceFireworkStand(context.layout, context.grid, this.rng, {
          forbiddenCells,
          margin: 5,
        });
        if (!stand) {
          return false;
        }
        context.fireworkStand = stand;
        return true;
      }
      case 'jackalope-lodge': {
        const lodge = tryPlaceJackalopeLodge(context.layout, context.grid, this.rng, {
          forbiddenCells,
          margin: 5,
        });
        if (!lodge) {
          return false;
        }
        context.jackalopeLodge = lodge;
        context.questGiver = lodge.elder;
        return true;
      }
      case 'moleman-dig-site': {
        const digSite = tryPlaceMolemanDigSite(context.layout, context.grid, this.rng, {
          forbiddenCells,
          margin: 5,
          biomeId: context.palette.biomeId,
        });
        if (!digSite) {
          return false;
        }
        context.molemanDigSite = digSite;
        return true;
      }
    }
  }

  private hasLibertyStructure(context: RoomGenerationContext): boolean {
    return Boolean(
      context.roadsideMonument ||
      context.allNiteDiner ||
      context.fireworkStand ||
      context.jackalopeLodge ||
      context.motelPool ||
      context.molemanDigSite,
    );
  }

  private renderTownDistrict(context: RoomGenerationContext): void {
    const membership = context.townMembership;
    if (!membership?.district) {
      return;
    }
    const town = this.createTownForPlacement(context);
    const room = createTownDistrictRoom({
      town,
      roomId: context.roomId,
      districtKind: membership.district,
      grid: context.grid,
      biomeId: context.palette.biomeId,
      biomeTitle: context.palette.biomeTitle,
      backgroundColor: context.palette.backgroundColor,
      wallColor: context.palette.wallColor,
      wallOutlineColor: context.palette.wallOutlineColor,
      connections: this.structureResolver.getTownConnections(context.roomId),
    });
    this.replaceLayout(context, room.layout);
    context.town = room.town;
    context.layerEntrances = room.layerEntrances;
    context.questGiver = undefined;
    context.village = undefined;
    context.goblinCamp = undefined;
    context.snakeMcDonalds = undefined;
    context.shrine = undefined;
    context.ramenStand = undefined;
    context.koiPond = undefined;
    context.motelPool = undefined;
    context.tenguCamp = undefined;
    context.roadsideMonument = undefined;
    context.allNiteDiner = undefined;
    context.fireworkStand = undefined;
    context.jackalopeLodge = undefined;
    context.billboardOracle = undefined;
    context.roadCrew = undefined;
    context.molemanDigSite = undefined;
  }

  private renderTownPerimeter(context: RoomGenerationContext): void {
    const adjacency = context.townAdjacency;
    if (!adjacency) {
      return;
    }
    const sides = adjacency.adjacentSidesFacingTown?.length
      ? adjacency.adjacentSidesFacingTown
      : adjacency.adjacentSideFacingTown
        ? [adjacency.adjacentSideFacingTown]
        : [];
    const corners = adjacency.adjacentCornersFacingTown ?? [];
    if (sides.length === 0 && corners.length === 0) {
      return;
    }
    context.townPerimeter = {
      townId: adjacency.placement.id,
      sideFacingTown: adjacency.adjacentSideFacingTown,
      sidesFacingTown: [...sides],
      cornersFacingTown: [...corners],
    };
    const openingSide =
      adjacency.isEntranceApproach || adjacency.isExitApproach
        ? adjacency.adjacentSideFacingTown
        : undefined;
    const town =
      adjacency.isEntranceApproach || adjacency.isExitApproach
        ? this.createTownForPlacement(context)
        : undefined;
    const gate = town?.gates.find((entry) => entry.approachRoomId === context.roomId);
    let rows = context.layout.map((row) => row.join(''));
    for (const side of sides) {
      rows = stampTownBoundaryApproach(rows, side, side === openingSide && !gate);
    }
    for (const corner of corners) {
      rows = stampTownBoundaryCorner(rows, corner);
    }
    if (gate && openingSide) {
      const layout = rows.map((row) => row.split(''));
      const plan = this.edgeAccessPlanForSide(
        openingSide,
        adjacency.isEntranceApproach ? 'townGate' : 'townExit',
        context.grid,
      );
      carveEdgeOpening(layout, context.grid, plan);
      const result = renderTownGateSide({
        layout,
        gate,
        side: openingSide,
        perspective: 'outside',
        state: gate.state,
        includeGuard: gate.kind === 'entrance' && Boolean(gate.outsideGuardResidentId),
      });
      const presences: TownResidentPresence[] = [];
      if (gate.outsideGuardResidentId && result.guardPosition) {
        presences.push({
          residentId: gate.outsideGuardResidentId,
          roomId: context.roomId,
          x: result.guardPosition.x,
          y: result.guardPosition.y,
          source: 'gate',
          role: 'guard',
        });
      }
      town.residentPresences = presences;
      context.town = town;
      rows = layout.map((row) => row.join(''));
    }
    this.replaceLayout(context, rows);
    if (openingSide) {
      const plan = this.edgeAccessPlanForSide(
        openingSide,
        adjacency.isEntranceApproach ? 'townGate' : 'townExit',
        context.grid,
      );
      context.reservedEdgeAccess = [...(context.reservedEdgeAccess ?? []), plan];
      context.protectedCells = mergeProtectedCells(
        context.protectedCells,
        cellsForEdgeRunup(context.grid, plan),
      );
    }
  }

  private createTownForPlacement(context: RoomGenerationContext) {
    const placement = context.townMembership?.placement ?? context.townAdjacency?.placement;
    if (!placement) {
      throw new Error('Cannot create town without a structure placement.');
    }
    const districtRoomIds: Record<string, TownDistrictKind> = {};
    for (const [offset, district] of Object.entries(getHumanTownDistricts(placement))) {
      const [dx = 0, dy = 0] = offset.split(',').map(Number);
      districtRoomIds[
        formatRoomId({
          x: placement.anchor.x + dx,
          y: placement.anchor.y + dy,
          z: placement.anchor.z,
        })
      ] = district;
    }
    return createPhysicalHumanTown({
      biomeId: placement.townBiomeId ?? context.palette.biomeId,
      seed: placement.seed,
      townId: placement.id,
      districtRoomIds,
      entranceRoomId: getHumanTownEntranceRoomId(placement),
      exitRoomIds: getHumanTownExitRoomIds(placement),
      entranceGateSide: getHumanTownFootprint(placement).entranceSide,
      exitGateSides: [getHumanTownFootprint(placement).exitSide],
    });
  }

  private edgeAccessPlanForSide(side: EdgeSide, reason: 'townGate' | 'townExit', grid: GridConfig) {
    const horizontal = side === 'north' || side === 'south';
    return {
      side,
      open: true,
      openingCenter: horizontal ? Math.floor(grid.cols / 2) : Math.floor(grid.rows / 2),
      openingWidth: TOWN_GATE_WIDTH,
      runupDepth: 5,
      reason,
    };
  }

  private replaceLayout(context: RoomGenerationContext, rows: readonly string[]): void {
    for (let y = 0; y < context.grid.rows; y += 1) {
      const row = rows[y] ?? '.'.repeat(context.grid.cols);
      context.layout[y] = row.split('');
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
    const kind =
      biomeId === 'sable-depths'
        ? 'warm'
        : biomeId === 'ember-waste' || biomeId === 'liberty-badlands'
          ? 'cool'
          : null;
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

  private isSettlementAnchor(roomId: string): boolean {
    const [roomX = 0, roomY = 0, roomZ = 0] = roomId.split(',').map(Number);
    const chunkX = Math.floor(roomX / SETTLEMENT_ANCHOR_SPACING);
    const chunkY = Math.floor(roomY / SETTLEMENT_ANCHOR_SPACING);
    const hash = this.hashRoom(chunkX, chunkY, roomZ, 0x5e771e);
    const targetX = this.positiveMod(hash, SETTLEMENT_ANCHOR_SPACING);
    const targetY = this.positiveMod(
      Math.floor(hash / SETTLEMENT_ANCHOR_SPACING),
      SETTLEMENT_ANCHOR_SPACING,
    );
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
