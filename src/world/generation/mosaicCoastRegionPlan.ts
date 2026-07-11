import type { RoomArchetypeId } from './types.js';
import { hashString, positiveMod } from './worldHash.js';
import type { WorldGenerationIdentity } from './worldGenerationIdentity.js';

export type MosaicCoastDistrictZone =
  | 'mosaic-arrival'
  | 'old-town-alley'
  | 'sun-plaza'
  | 'orange-grove-courtyard'
  | 'awning-alley'
  | 'tapas-courtyard'
  | 'ruined-stucco-block'
  | 'fountain-court'
  | 'gaudi-park-approach'
  | 'el-drac-arena';

export interface MosaicCoastRegionBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  z: number;
}

export interface MosaicCoastRegionPlan {
  id: string;
  anchor: { x: number; y: number; z: number };
  bounds: MosaicCoastRegionBounds;
  seed: string;
  orientation: 'north-south' | 'east-west';
  entrySide: 'north' | 'south' | 'east' | 'west';
  mainAlleySpine: Array<{ x: number; y: number; z: number }>;
  plazaNodes: Array<{ x: number; y: number; z: number }>;
  courtyardNodes: Array<{ x: number; y: number; z: number }>;
  landmarkNodes: {
    arrival: { x: number; y: number; z: number };
    fountain: { x: number; y: number; z: number };
    tapas?: { x: number; y: number; z: number };
    gaudiApproach?: { x: number; y: number; z: number };
    elDracArena?: { x: number; y: number; z: number };
  };
  density: number;
  ruinLevel: number;
  gaudiLevel: number;
}

export interface MosaicCoastDistrictRoomPlan {
  roomId: string;
  region: MosaicCoastRegionPlan;
  zone: MosaicCoastDistrictZone;
  archetypeId: RoomArchetypeId;
  coolingRequired: boolean;
  gaudiAccent: boolean;
  density: number;
  ruinLevel: number;
  alleyMouths: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
}

const ARCHETYPE_BY_ZONE: Readonly<Record<MosaicCoastDistrictZone, RoomArchetypeId>> = {
  'mosaic-arrival': 'mosaic-arrival',
  'old-town-alley': 'old-town-alley',
  'sun-plaza': 'sun-plaza',
  'orange-grove-courtyard': 'orange-grove-courtyard',
  'awning-alley': 'awning-alley',
  'tapas-courtyard': 'tapas-crawl-room',
  'ruined-stucco-block': 'ruined-stucco-block',
  'fountain-court': 'fountain-court',
  'gaudi-park-approach': 'gaudi-park-approach',
  'el-drac-arena': 'el-drac-arena',
};

const STARTER_BOUNDS: MosaicCoastRegionBounds = { left: -4, top: -11, width: 7, height: 3, z: 0 };

export class MosaicCoastRegionPlanner {
  private readonly cache = new Map<string, MosaicCoastRegionPlan>();

  constructor(private readonly identity: WorldGenerationIdentity) {}

  getRoomPlan(roomId: string): MosaicCoastDistrictRoomPlan {
    const coord = parseRoomId(roomId);
    const region = this.getRegionForRoom(coord);
    const zone = this.zoneForRoom(region, coord);
    return {
      roomId,
      region,
      zone,
      archetypeId: ARCHETYPE_BY_ZONE[zone],
      coolingRequired: zone !== 'gaudi-park-approach',
      gaudiAccent: zone === 'gaudi-park-approach' || zone === 'el-drac-arena',
      density: region.density,
      ruinLevel: region.ruinLevel,
      alleyMouths: this.alleyMouthsForRoom(region, coord),
    };
  }

  getRegionForRoom(coordOrRoomId: string | { x: number; y: number; z: number }): MosaicCoastRegionPlan {
    const coord = typeof coordOrRoomId === 'string' ? parseRoomId(coordOrRoomId) : coordOrRoomId;
    const bounds = starterContains(coord) ? STARTER_BOUNDS : this.boundsForGeneratedRegion(coord);
    const id = `mosaic-region:${bounds.left},${bounds.top},${bounds.z}:${bounds.width}x${bounds.height}`;
    const cached = this.cache.get(id);
    if (cached) {
      return cached;
    }
    const region = this.buildRegion(id, bounds);
    this.cache.set(id, region);
    return region;
  }

  private boundsForGeneratedRegion(coord: { x: number; y: number; z: number }): MosaicCoastRegionBounds {
    const width = 5 + (this.hash(coord.x, coord.y, coord.z, 0x51) % 4);
    const height = 3 + (this.hash(coord.x, coord.y, coord.z, 0x67) % 4);
    return {
      left: coord.x - positiveMod(coord.x, width),
      top: coord.y - positiveMod(coord.y, height),
      width,
      height,
      z: coord.z,
    };
  }

  private buildRegion(id: string, bounds: MosaicCoastRegionBounds): MosaicCoastRegionPlan {
    const starter = bounds.left === STARTER_BOUNDS.left && bounds.top === STARTER_BOUNDS.top && bounds.z === 0;
    const seed = `${this.identity.seed}:${id}`;
    const orientation = starter || bounds.height >= bounds.width ? 'north-south' : 'east-west';
    const entrySide = starter ? 'south' : this.entrySideFor(seed);
    const density = 0.58 + (hashString(`${seed}:density`) % 24) / 100;
    const ruinLevel = 0.35 + (hashString(`${seed}:ruin`) % 45) / 100;
    const gaudiLevel = starter ? 0.85 : (hashString(`${seed}:gaudi`) % 100) / 100;
    const anchor = { x: bounds.left, y: bounds.top, z: bounds.z };
    const mainAlleySpine = this.buildSpine(bounds, orientation, entrySide, seed);
    const plazaNodes = this.pickNodes(bounds, seed, 'plaza', starter ? 2 : Math.max(1, Math.floor(bounds.width * bounds.height / 12)));
    const courtyardNodes = this.pickNodes(bounds, seed, 'courtyard', starter ? 3 : Math.max(1, Math.floor(bounds.width * bounds.height / 10)));
    const arrival = this.entryRoom(bounds, entrySide);
    const fountain = starter ? { x: 2, y: -9, z: 0 } : plazaNodes[0] ?? mainAlleySpine[Math.floor(mainAlleySpine.length / 2)] ?? arrival;
    const tapas = bounds.width * bounds.height >= 9 ? (starter ? { x: 0, y: -10, z: 0 } : courtyardNodes[0]) : undefined;
    const gaudiApproach =
      gaudiLevel >= 0.45 && bounds.width * bounds.height >= 12
        ? starter
          ? { x: 1, y: -11, z: 0 }
          : this.farRoom(bounds, entrySide, -1)
        : undefined;
    const elDracArena =
      gaudiLevel >= 0.75 && bounds.width * bounds.height >= 18
        ? starter
          ? { x: 2, y: -11, z: 0 }
          : this.farRoom(bounds, entrySide, 0)
        : undefined;

    return {
      id,
      anchor,
      bounds,
      seed,
      orientation,
      entrySide,
      mainAlleySpine,
      plazaNodes,
      courtyardNodes,
      landmarkNodes: { arrival, fountain, tapas, gaudiApproach, elDracArena },
      density,
      ruinLevel,
      gaudiLevel,
    };
  }

  private zoneForRoom(
    region: MosaicCoastRegionPlan,
    coord: { x: number; y: number; z: number },
  ): MosaicCoastDistrictZone {
    const key = coordKey(coord);
    if (key === coordKey(region.landmarkNodes.elDracArena)) return 'el-drac-arena';
    if (key === coordKey(region.landmarkNodes.gaudiApproach)) return 'gaudi-park-approach';
    if (key === coordKey(region.landmarkNodes.tapas)) return 'tapas-courtyard';
    if (key === coordKey(region.landmarkNodes.fountain)) return 'fountain-court';
    if (key === coordKey(region.landmarkNodes.arrival)) return 'mosaic-arrival';
    if (region.courtyardNodes.some((node) => coordKey(node) === key)) {
      return this.hash(coord.x, coord.y, coord.z, 0x99) % 2 === 0
        ? 'orange-grove-courtyard'
        : 'tapas-courtyard';
    }
    if (region.plazaNodes.some((node) => coordKey(node) === key)) {
      return this.hash(coord.x, coord.y, coord.z, 0x88) % 2 === 0 ? 'sun-plaza' : 'fountain-court';
    }
    if (region.mainAlleySpine.some((node) => coordKey(node) === key)) {
      return this.hash(coord.x, coord.y, coord.z, 0x77) % 3 === 0 ? 'awning-alley' : 'old-town-alley';
    }
    return region.ruinLevel > 0.55 ? 'ruined-stucco-block' : 'old-town-alley';
  }

  private alleyMouthsForRoom(
    region: MosaicCoastRegionPlan,
    coord: { x: number; y: number; z: number },
  ): MosaicCoastDistrictRoomPlan['alleyMouths'] {
    const inSpine = (x: number, y: number) =>
      region.mainAlleySpine.some((node) => node.x === x && node.y === y && node.z === coord.z);
    return {
      north: inSpine(coord.x, coord.y) && inSpine(coord.x, coord.y - 1),
      south: inSpine(coord.x, coord.y) && inSpine(coord.x, coord.y + 1),
      east: inSpine(coord.x, coord.y) && inSpine(coord.x + 1, coord.y),
      west: inSpine(coord.x, coord.y) && inSpine(coord.x - 1, coord.y),
    };
  }

  private buildSpine(
    bounds: MosaicCoastRegionBounds,
    orientation: MosaicCoastRegionPlan['orientation'],
    entrySide: MosaicCoastRegionPlan['entrySide'],
    seed: string,
  ): MosaicCoastRegionPlan['mainAlleySpine'] {
    const nodes: MosaicCoastRegionPlan['mainAlleySpine'] = [];
    const horizontal = orientation === 'east-west';
    const length = horizontal ? bounds.width : bounds.height;
    let cross = horizontal
      ? bounds.top + Math.floor(bounds.height / 2)
      : bounds.left + Math.floor(bounds.width / 2);
    for (let i = 0; i < length; i += 1) {
      if (i > 0 && i < length - 1 && hashString(`${seed}:bend:${i}`) % 3 === 0) {
        cross += hashString(`${seed}:bend-dir:${i}`) % 2 === 0 ? 1 : -1;
      }
      if (horizontal) {
        cross = clamp(cross, bounds.top, bounds.top + bounds.height - 1);
        const x = entrySide === 'east' ? bounds.left + bounds.width - 1 - i : bounds.left + i;
        nodes.push({ x, y: cross, z: bounds.z });
      } else {
        cross = clamp(cross, bounds.left, bounds.left + bounds.width - 1);
        const y = entrySide === 'north' ? bounds.top + i : bounds.top + bounds.height - 1 - i;
        nodes.push({ x: cross, y, z: bounds.z });
      }
    }
    return nodes;
  }

  private pickNodes(
    bounds: MosaicCoastRegionBounds,
    seed: string,
    label: string,
    count: number,
  ): Array<{ x: number; y: number; z: number }> {
    const candidates: Array<{ x: number; y: number; z: number; score: number }> = [];
    for (let y = bounds.top; y < bounds.top + bounds.height; y += 1) {
      for (let x = bounds.left; x < bounds.left + bounds.width; x += 1) {
        candidates.push({ x, y, z: bounds.z, score: hashString(`${seed}:${label}:${x},${y}`) });
      }
    }
    return candidates
      .sort((a, b) => a.score - b.score)
      .slice(0, count)
      .map(({ x, y, z }) => ({ x, y, z }));
  }

  private entryRoom(bounds: MosaicCoastRegionBounds, side: MosaicCoastRegionPlan['entrySide']): { x: number; y: number; z: number } {
    if (side === 'south') return { x: bounds.left + Math.floor(bounds.width / 2), y: bounds.top + bounds.height - 1, z: bounds.z };
    if (side === 'north') return { x: bounds.left + Math.floor(bounds.width / 2), y: bounds.top, z: bounds.z };
    if (side === 'east') return { x: bounds.left + bounds.width - 1, y: bounds.top + Math.floor(bounds.height / 2), z: bounds.z };
    return { x: bounds.left, y: bounds.top + Math.floor(bounds.height / 2), z: bounds.z };
  }

  private farRoom(bounds: MosaicCoastRegionBounds, side: MosaicCoastRegionPlan['entrySide'], offset: number): { x: number; y: number; z: number } {
    if (side === 'south') return { x: bounds.left + bounds.width - 1 + offset, y: bounds.top, z: bounds.z };
    if (side === 'north') return { x: bounds.left + bounds.width - 1 + offset, y: bounds.top + bounds.height - 1, z: bounds.z };
    if (side === 'east') return { x: bounds.left, y: bounds.top + bounds.height - 1 + offset, z: bounds.z };
    return { x: bounds.left + bounds.width - 1, y: bounds.top + bounds.height - 1 + offset, z: bounds.z };
  }

  private entrySideFor(seed: string): MosaicCoastRegionPlan['entrySide'] {
    return (['north', 'south', 'east', 'west'] as const)[hashString(`${seed}:entry`) % 4]!;
  }

  private hash(x: number, y: number, z: number, salt: number): number {
    return hashString(`${this.identity.seed}:${x},${y},${z}:${salt}`);
  }
}

export function getMosaicCoastStarterRegionPlan(identity: WorldGenerationIdentity): MosaicCoastRegionPlan {
  return new MosaicCoastRegionPlanner(identity).getRegionForRoom({ x: 0, y: -10, z: 0 });
}

function parseRoomId(roomId: string): { x: number; y: number; z: number } {
  const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
  return { x, y, z };
}

function starterContains(coord: { x: number; y: number; z: number }): boolean {
  return (
    coord.z === STARTER_BOUNDS.z &&
    coord.x >= STARTER_BOUNDS.left &&
    coord.x < STARTER_BOUNDS.left + STARTER_BOUNDS.width &&
    coord.y >= STARTER_BOUNDS.top &&
    coord.y < STARTER_BOUNDS.top + STARTER_BOUNDS.height
  );
}

function coordKey(coord?: { x: number; y: number; z: number }): string {
  return coord ? `${coord.x},${coord.y},${coord.z}` : '';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
