import type { GridConfig } from '../../config/gameConfig.js';
import { biomeCountsAs } from '../biomes.js';
import type { BiomeMap } from './biomeMap.js';
import {
  formatRoomId,
  parseRoomId,
  type MultiRoomStructurePlacement,
  type RoomCoordinate,
  type TownPhysicalDistrictKind,
  type TownRoomMembership,
} from './multiRoomStructures.js';
import type { WorldGenerationIdentity } from './worldGenerationIdentity.js';
import { hashWorldCoordinate, positiveMod } from './worldHash.js';

const HUMAN_TOWN_REGION_SIZE = 10;
const HUMAN_TOWN_CANDIDATE_ATTEMPTS = 6;

export const HUMAN_TOWN_DISTRICTS: Readonly<Record<string, TownPhysicalDistrictKind>> = {
  '1,1': 'townCenter',
  '2,1': 'marketStreet',
  '1,2': 'residentialStreet',
  '2,2': 'backAlley',
};

type CardinalSide = 'north' | 'south' | 'east' | 'west';

export interface HumanTownFootprint {
  districts: Readonly<Record<string, TownPhysicalDistrictKind>>;
  entranceSide: CardinalSide;
  exitSide: CardinalSide;
  entranceOffset: { dx: number; dy: number };
  exitOffsets: ReadonlyArray<{ dx: number; dy: number }>;
}

const BASE_TOWN_OFFSETS = Object.entries(HUMAN_TOWN_DISTRICTS).map(([key, district]) => {
  const [dx = 0, dy = 0] = key.split(',').map(Number);
  return { dx, dy, district };
});

function rotateOffset(dx: number, dy: number, turns: number): { dx: number; dy: number } {
  switch (turns % 4) {
    case 1:
      return { dx: 3 - dy, dy: dx };
    case 2:
      return { dx: 3 - dx, dy: 3 - dy };
    case 3:
      return { dx: dy, dy: 3 - dx };
    default:
      return { dx, dy };
  }
}

function rotateSide(side: CardinalSide, turns: number): CardinalSide {
  const sides: CardinalSide[] = ['north', 'east', 'south', 'west'];
  const index = sides.indexOf(side);
  return sides[positiveMod(index + turns, sides.length)]!;
}

const HUMAN_TOWN_FOOTPRINTS: readonly HumanTownFootprint[] = [0, 1, 2, 3].map((turns) => {
  const districts: Record<string, TownPhysicalDistrictKind> = {};
  for (const entry of BASE_TOWN_OFFSETS) {
    const offset = rotateOffset(entry.dx, entry.dy, turns);
    districts[`${offset.dx},${offset.dy}`] = entry.district;
  }
  return {
    districts,
    entranceSide: rotateSide('west', turns),
    exitSide: rotateSide('south', turns),
    entranceOffset: rotateOffset(0, 0, turns),
    exitOffsets: [rotateOffset(2, 3, turns)],
  };
});

function footprintForSeed(seed: number): HumanTownFootprint {
  return (
    HUMAN_TOWN_FOOTPRINTS[positiveMod(seed, HUMAN_TOWN_FOOTPRINTS.length)] ??
    HUMAN_TOWN_FOOTPRINTS[0]!
  );
}

function offsetsOnSide(
  districts: Readonly<Record<string, TownPhysicalDistrictKind>>,
  side: CardinalSide,
): Array<{ dx: number; dy: number; district: TownPhysicalDistrictKind }> {
  return Object.entries(districts)
    .map(([key, district]) => {
      const [dx = 0, dy = 0] = key.split(',').map(Number);
      return { dx, dy, district };
    })
    .filter(({ dx, dy }) => {
      switch (side) {
        case 'north':
          return !districts[`${dx},${dy - 1}`];
        case 'south':
          return !districts[`${dx},${dy + 1}`];
        case 'east':
          return !districts[`${dx + 1},${dy}`];
        case 'west':
          return !districts[`${dx - 1},${dy}`];
      }
    })
    .sort((a, b) => {
      const axis = side === 'north' || side === 'south' ? 'dx' : 'dy';
      return a[axis] - b[axis];
    });
}

function sideOffsetForFootprint(
  footprint: HumanTownFootprint,
  side: CardinalSide,
  prefer: 'first' | 'last',
): { dx: number; dy: number } {
  const candidates = offsetsOnSide(footprint.districts, side);
  const candidate = prefer === 'last' ? candidates[candidates.length - 1] : candidates[0];
  return candidate ? { dx: candidate.dx, dy: candidate.dy } : { dx: 1, dy: 1 };
}

export function getHumanTownFootprint(placement: MultiRoomStructurePlacement): HumanTownFootprint {
  return footprintForSeed(placement.seed);
}

export function getHumanTownDistricts(
  placement: MultiRoomStructurePlacement,
): Readonly<Record<string, TownPhysicalDistrictKind>> {
  return getHumanTownFootprint(placement).districts;
}

export function getHumanTownEntranceRoomId(placement: MultiRoomStructurePlacement): string {
  const footprint = getHumanTownFootprint(placement);
  const offset = sideOffsetForFootprint(footprint, footprint.entranceSide, 'first');
  return formatRoomId({
    x: placement.anchor.x + offset.dx,
    y: placement.anchor.y + offset.dy,
    z: placement.anchor.z,
  });
}

export function getHumanTownExitRoomIds(placement: MultiRoomStructurePlacement): string[] {
  const footprint = getHumanTownFootprint(placement);
  const offset = sideOffsetForFootprint(footprint, footprint.exitSide, 'last');
  return [
    formatRoomId({
      x: placement.anchor.x + offset.dx,
      y: placement.anchor.y + offset.dy,
      z: placement.anchor.z,
    }),
  ];
}

function offsetForSide(side: CardinalSide): { dx: number; dy: number } {
  switch (side) {
    case 'north':
      return { dx: 0, dy: -1 };
    case 'south':
      return { dx: 0, dy: 1 };
    case 'east':
      return { dx: 1, dy: 0 };
    case 'west':
      return { dx: -1, dy: 0 };
  }
}

export class MultiRoomStructureResolver {
  private readonly regionTownCache = new Map<string, MultiRoomStructurePlacement | null>();

  constructor(
    private readonly identity: WorldGenerationIdentity,
    private readonly biomeMap: BiomeMap,
    private readonly grid: GridConfig,
  ) {}

  getTownMembership(roomId: string): TownRoomMembership | null {
    return this.resolveTown(roomId, 'inside');
  }

  getTownAdjacency(roomId: string): TownRoomMembership | null {
    const coord = parseRoomId(roomId);
    const candidates = this.getCandidatePlacements(coord);
    const matches = candidates
      .map((placement) => this.resolveAgainstPlacement(roomId, coord, placement))
      .filter((membership): membership is TownRoomMembership => Boolean(membership))
      .filter((membership) => membership.role === 'adjacent' || membership.role === 'approach');
    return matches.sort((a, b) => a.placement.id.localeCompare(b.placement.id))[0] ?? null;
  }

  getTownConnections(roomId: string): Partial<Record<'north' | 'south' | 'east' | 'west', string>> {
    const membership = this.getTownMembership(roomId);
    if (!membership?.district) {
      return {};
    }
    const coord = parseRoomId(roomId);
    const footprint = getHumanTownFootprint(membership.placement);
    const connections: Partial<Record<'north' | 'south' | 'east' | 'west', string>> = {};
    const addIfTown = (side: 'north' | 'south' | 'east' | 'west', dx: number, dy: number): void => {
      const neighbor = { x: coord.x + dx, y: coord.y + dy, z: coord.z };
      if (
        this.getTownMembership(formatRoomId(neighbor))?.placement.id === membership.placement.id
      ) {
        connections[side] = formatRoomId(neighbor);
      }
    };
    addIfTown('north', 0, -1);
    addIfTown('south', 0, 1);
    addIfTown('east', 1, 0);
    addIfTown('west', -1, 0);

    const districtIsEntrance = roomId === getHumanTownEntranceRoomId(membership.placement);
    const districtIsExit = getHumanTownExitRoomIds(membership.placement).includes(roomId);
    if (districtIsEntrance) {
      const offset = offsetForSide(footprint.entranceSide);
      connections[footprint.entranceSide] = formatRoomId({
        x: coord.x + offset.dx,
        y: coord.y + offset.dy,
        z: coord.z,
      });
    }
    if (districtIsExit) {
      const offset = offsetForSide(footprint.exitSide);
      connections[footprint.exitSide] = formatRoomId({
        x: coord.x + offset.dx,
        y: coord.y + offset.dy,
        z: coord.z,
      });
    }
    return connections;
  }

  private resolveTown(roomId: string, expected: 'inside' | 'adjacent'): TownRoomMembership | null {
    const coord = parseRoomId(roomId);
    const candidates = this.getCandidatePlacements(coord);
    const matches = candidates
      .map((placement) => this.resolveAgainstPlacement(roomId, coord, placement))
      .filter((membership): membership is TownRoomMembership => Boolean(membership))
      .filter((membership) => membership.role === expected);
    return matches.sort((a, b) => a.placement.id.localeCompare(b.placement.id))[0] ?? null;
  }

  private getCandidatePlacements(coord: RoomCoordinate): MultiRoomStructurePlacement[] {
    const regionX = Math.floor(coord.x / HUMAN_TOWN_REGION_SIZE);
    const regionY = Math.floor(coord.y / HUMAN_TOWN_REGION_SIZE);
    const placements: MultiRoomStructurePlacement[] = [];
    for (let y = regionY - 1; y <= regionY + 1; y += 1) {
      for (let x = regionX - 1; x <= regionX + 1; x += 1) {
        const placement = this.resolveRegionTown(x, y, coord.z);
        if (placement) {
          placements.push(placement);
        }
      }
    }
    return placements;
  }

  private resolveRegionTown(
    regionX: number,
    regionY: number,
    z: number,
  ): MultiRoomStructurePlacement | null {
    const cacheKey = `${regionX},${regionY},${z}`;
    if (this.regionTownCache.has(cacheKey)) {
      return this.regionTownCache.get(cacheKey) ?? null;
    }
    for (let attempt = 0; attempt < HUMAN_TOWN_CANDIDATE_ATTEMPTS; attempt += 1) {
      const placement = this.createRegionPlacement(regionX, regionY, z, attempt);
      if (this.isValidTownPlacement(placement)) {
        this.regionTownCache.set(cacheKey, placement);
        return placement;
      }
    }
    this.regionTownCache.set(cacheKey, null);
    return null;
  }

  private createRegionPlacement(
    regionX: number,
    regionY: number,
    z: number,
    attempt: number,
  ): MultiRoomStructurePlacement {
    const offsetHash = hashWorldCoordinate({
      x: regionX,
      y: regionY,
      z,
      salt: this.identity.townSalt,
      featureSalt: 0x71a3 + attempt * 0x1f1f,
    });
    const maxOffsetX = HUMAN_TOWN_REGION_SIZE - 4;
    const maxOffsetY = HUMAN_TOWN_REGION_SIZE - 4;
    const anchor = {
      x: regionX * HUMAN_TOWN_REGION_SIZE + positiveMod(offsetHash, maxOffsetX + 1),
      y:
        regionY * HUMAN_TOWN_REGION_SIZE +
        positiveMod(Math.floor(offsetHash / (maxOffsetX + 1)), maxOffsetY + 1),
      z,
    };
    const seed = hashWorldCoordinate({
      ...anchor,
      salt: this.identity.townSalt,
      featureSalt: 0xdad7,
    });
    const tempPlacement = {
      id: `human-town:${anchor.x},${anchor.y},${anchor.z}:${seed.toString(36)}`,
      kind: 'humanTown' as const,
      anchor,
      seed,
      bounds: { left: anchor.x, top: anchor.y, width: 4, height: 4, z },
    };
    const townBiomeId = this.biomeMap.getBiomeForRoomId(
      getHumanTownEntranceRoomId(tempPlacement),
    ).id;
    return {
      id: tempPlacement.id,
      kind: 'humanTown',
      anchor,
      seed,
      townBiomeId,
      bounds: { left: anchor.x, top: anchor.y, width: 4, height: 4, z },
    };
  }

  private isValidTownPlacement(placement: MultiRoomStructurePlacement): boolean {
    if (placement.anchor.z === 0) {
      for (const key of Object.keys(getHumanTownDistricts(placement))) {
        const [dx = 0, dy = 0] = key.split(',').map(Number);
        const roomX = placement.anchor.x + dx;
        const roomY = placement.anchor.y + dy;
        if (Math.max(Math.abs(roomX), Math.abs(roomY)) <= 2) {
          return false;
        }
        if (roomX >= -5 && roomX <= 3 && roomY >= -12 && roomY <= -8) {
          return false;
        }
      }
    }
    for (const [key] of Object.entries(getHumanTownDistricts(placement))) {
      const [dx = 0, dy = 0] = key.split(',').map(Number);
      const roomId = formatRoomId({
        x: placement.anchor.x + dx,
        y: placement.anchor.y + dy,
        z: placement.anchor.z,
      });
      const biome = this.biomeMap.getBiomeForRoomId(roomId);
      if (biomeCountsAs(biome.id, 'ocean') || biome.id === 'elderwood-maze') {
        return false;
      }
    }
    return this.grid.cols >= 32 && this.grid.rows >= 22;
  }

  private resolveAgainstPlacement(
    roomId: string,
    coord: RoomCoordinate,
    placement: MultiRoomStructurePlacement,
  ): TownRoomMembership | null {
    const dx = coord.x - placement.anchor.x;
    const dy = coord.y - placement.anchor.y;
    const footprint = getHumanTownFootprint(placement);
    const district = footprint.districts[`${dx},${dy}`];
    if (district) {
      return { placement, role: 'inside', roomId, district };
    }

    const townOffsetKeys = new Set(Object.keys(footprint.districts));
    const sides: Array<'north' | 'south' | 'east' | 'west'> = [];
    if (townOffsetKeys.has(`${dx},${dy - 1}`)) sides.push('north');
    if (townOffsetKeys.has(`${dx},${dy + 1}`)) sides.push('south');
    if (townOffsetKeys.has(`${dx - 1},${dy}`)) sides.push('west');
    if (townOffsetKeys.has(`${dx + 1},${dy}`)) sides.push('east');
    const corners: Array<'northWest' | 'northEast' | 'southWest' | 'southEast'> = [];
    if (townOffsetKeys.has(`${dx - 1},${dy - 1}`)) corners.push('northWest');
    if (townOffsetKeys.has(`${dx + 1},${dy - 1}`)) corners.push('northEast');
    if (townOffsetKeys.has(`${dx - 1},${dy + 1}`)) corners.push('southWest');
    if (townOffsetKeys.has(`${dx + 1},${dy + 1}`)) corners.push('southEast');
    if (sides.length === 0 && corners.length === 0) {
      return null;
    }
    const adjacentSideFacingTown = sides[0];
    const entranceSideOffset = offsetForSide(footprint.entranceSide);
    const exitSideOffset = offsetForSide(footprint.exitSide);
    const entranceCoreOffset = sideOffsetForFootprint(footprint, footprint.entranceSide, 'first');
    const exitCoreOffset = sideOffsetForFootprint(footprint, footprint.exitSide, 'last');
    const entranceApproach = {
      x: placement.anchor.x + entranceCoreOffset.dx + entranceSideOffset.dx,
      y: placement.anchor.y + entranceCoreOffset.dy + entranceSideOffset.dy,
    };
    const exitApproach = {
      x: placement.anchor.x + exitCoreOffset.dx + exitSideOffset.dx,
      y: placement.anchor.y + exitCoreOffset.dy + exitSideOffset.dy,
    };
    return {
      placement,
      role:
        (coord.x === entranceApproach.x && coord.y === entranceApproach.y) ||
        (coord.x === exitApproach.x && coord.y === exitApproach.y)
          ? 'approach'
          : 'adjacent',
      roomId,
      adjacentSideFacingTown,
      adjacentSidesFacingTown: sides,
      adjacentCornersFacingTown: corners,
      isEntranceApproach: coord.x === entranceApproach.x && coord.y === entranceApproach.y,
      isExitApproach: coord.x === exitApproach.x && coord.y === exitApproach.y,
    };
  }
}
