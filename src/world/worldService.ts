import type { GridConfig, WorldConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { RoomGenerator } from './roomGenerator.js';
import type { PortalConfig, RoomSnapshot } from './types.js';
import {
  cloneTownForRoom,
  type TownBuilding,
  type TownRoomKind,
  type TownStructure,
  type TownResidentPresence,
} from './town.js';
import {
  createWorldGenerationIdentity,
  type WorldGenerationIdentity,
} from './generation/worldGenerationIdentity.js';
import { maybePlaceCaveEntrance } from '../caves/caveEntrancePlacement.js';
import { generateCave, isCaveRoomId } from '../caves/caveGenerator.js';
import type { CaveInstanceSaveData, CaveTemplateId } from '../caves/caveTypes.js';
import {
  LAYER_EXIT_TILE,
  type LayerEntrance,
  type LayerInstance,
  type LayerTemplateId,
} from '../layers/layerTypes.js';
import { generateDecorations, generateTransitRooms } from './bulletTrainService.js';
import type { BulletTrainDestination, BulletTrainJourney } from './bulletTrainTypes.js';
import { BulletTrainStructureResolver } from './generation/bulletTrainResolver.js';
import { parseRoomId } from './generation/multiRoomStructures.js';
import { createRollercoasterJourney as createCoasterJourney } from './rollercoasterService.js';
import type {
  RollercoasterDestination,
  RollercoasterJourney,
  RollercoasterTheme,
} from './rollercoasterTypes.js';
import { RollercoasterStructureResolver } from './generation/rollercoasterResolver.js';

export interface PickupChanceProvider {
  getTreasureChance?: () => number;
  getPowerupChance?: () => number;
}

interface PortalIndexEntry {
  sourceRoomId: string;
  x: number;
  y: number;
}

export class WorldService {
  private readonly rooms = new Map<string, RoomSnapshot>();
  private readonly generator: RoomGenerator;
  private readonly rng: RandomGenerator;
  private readonly worldGenerationIdentity: WorldGenerationIdentity;
  private readonly worldSeed: string;
  private readonly generatorWorldConfig: WorldConfig;
  private readonly caveSaves = new Map<string, CaveInstanceSaveData>();
  private readonly townsById = new Map<string, TownStructure>();
  private readonly townRoomIdsByTownId = new Map<string, Set<string>>();
  private readonly incomingPortalsByDestRoomId = new Map<string, Map<string, PortalIndexEntry>>();
  private readonly layerEntrances = new Map<string, LayerEntrance>();
  private readonly layerInstances = new Map<string, LayerInstance>();
  private readonly bulletTrainResolver: BulletTrainStructureResolver;
  // private _bulletTrainPlacementsComputed = false;
  private readonly rollercoasterResolver: RollercoasterStructureResolver;
  // private _rollercoasterPlacementsComputed = false;

  constructor(
    private readonly grid: GridConfig,
    worldConfig: WorldConfig,
    rng: RandomGenerator,
    identity?: WorldGenerationIdentity,
    private readonly pickupChanceProvider: PickupChanceProvider = {},
  ) {
    this.generator = new RoomGenerator(grid, worldConfig, rng, identity);
    this.rng = rng;
    this.worldGenerationIdentity = identity ?? createWorldGenerationIdentity();
    this.worldSeed = this.worldGenerationIdentity.seed;
    this.generatorWorldConfig = worldConfig;
    this.bulletTrainResolver = new BulletTrainStructureResolver(this.worldGenerationIdentity, grid);
    this.rollercoasterResolver = new RollercoasterStructureResolver(
      this.worldGenerationIdentity,
      grid,
    );
  }

  getWorldGenerationIdentity(): WorldGenerationIdentity {
    return this.worldGenerationIdentity;
  }

  getRoom(roomId: string): RoomSnapshot {
    if (!this.rooms.has(roomId)) {
      if (roomId.startsWith('layer:')) {
        const instance = this.layerInstances.get(roomId);
        if (!instance) {
          throw new Error(
            `Unknown layer room "${roomId}". Layer rooms must be entered through a registered LayerEntrance.`,
          );
        }
        const room = this.createLayerRoom(instance);
        this.rooms.set(roomId, room);
        this.registerRoomIndexes(room);
        return room;
      }
      if (isCaveRoomId(roomId)) {
        const save = this.caveSaves.get(roomId);
        const parsed = parseCaveRoomId(roomId, save?.templateId);
        const generated = generateCave({
          caveId: roomId,
          parentRoomId: parsed.parentRoomId,
          templateId: parsed.templateId,
          grid: this.grid,
          worldSeed: this.worldSeed,
          returnPosition: { x: Math.floor(this.grid.cols / 2), y: this.grid.rows - 3 },
          save,
        });
        this.rooms.set(roomId, generated.room);
        this.registerRoomIndexes(generated.room);
        return generated.room;
      }
      const room = this.generator.generate(roomId, this.grid);
      for (const entrance of room.layerEntrances ?? []) {
        this.registerLayerEntrance(entrance);
      }
      this.rooms.set(roomId, room);
      this.registerRoomIndexes(room);
      this.addReciprocalPortalsFromExistingRooms(room);
      const suppressPickupSpawns = Boolean(room.town || room.townPerimeter);
      // Small chance to spawn a treasure chest in new rooms
      if (
        !suppressPickupSpawns &&
        this.rng() < (this.pickupChanceProvider.getTreasureChance?.() ?? 0.1)
      ) {
        const underwater = this.rng() < 0.18;
        const spot = underwater
          ? (this.findRandomWaterSpot(room) ?? this.findRandomEmptySpot(room))
          : this.findRandomEmptySpot(room);
        if (spot) {
          room.treasure = spot;
        }
      }
      // Powerups: 10% chance to spawn in new rooms
      if (
        !suppressPickupSpawns &&
        this.rng() < (this.pickupChanceProvider.getPowerupChance?.() ?? 0.1)
      ) {
        const spot = this.findRandomEmptySpot(room);
        if (spot) {
          const roll = this.rng();
          const kind: 'phase' | 'smite' = roll < 0.4 ? 'phase' : 'smite';
          room.powerup = { x: spot.x, y: spot.y, kind };
        }
      }
      maybePlaceCaveEntrance({
        room,
        grid: this.grid,
        worldConfig: this.generatorWorldConfig,
        worldSeed: this.worldSeed,
      });
      // Register Jade Peak rooms for bullet train destination pool
      if (room.biomeId === 'jade-peak-province') {
        this.bulletTrainResolver.registerJadePeakRoom(roomId);
      }

      // Stamp bullet train station if this room has a pre-assigned placement
      this.stampBulletTrainStation(room);

      // Register rooms for rollercoaster destinations (most rooms are eligible)
      this.rollercoasterResolver.registerStationableRoom(roomId);

      // Stamp rollercoaster station if this room has a pre-assigned placement
      this.stampRollercoasterStation(room);

      this.addReciprocalPortalsForRoom(room);
    }
    return this.rooms.get(roomId)!;
  }

  setApple(roomId: string, position: Vector2Like | undefined): void {
    const room = this.getRoom(roomId);
    if (position) {
      room.apple = { x: position.x, y: position.y };
    } else {
      delete room.apple;
    }
  }

  setTreasure(roomId: string, position: Vector2Like | undefined): void {
    const room = this.getRoom(roomId);
    if (position) {
      room.treasure = { x: position.x, y: position.y };
    } else {
      delete room.treasure;
    }
  }

  setPowerup(
    roomId: string,
    powerup: { x: number; y: number; kind: 'phase' | 'smite' | 'gun' } | undefined,
  ): void {
    const room = this.getRoom(roomId);
    if (powerup) {
      room.powerup = { x: powerup.x, y: powerup.y, kind: powerup.kind };
    } else {
      delete room.powerup;
    }
  }

  hasPowerupAt(
    roomId: string,
    x: number,
    y: number,
  ): { present: boolean; kind?: 'phase' | 'smite' | 'gun' } {
    const room = this.getRoom(roomId);
    if (room.powerup && room.powerup.x === x && room.powerup.y === y) {
      return { present: true, kind: room.powerup.kind };
    }
    return { present: false };
  }

  hasTreasureAt(roomId: string, x: number, y: number): boolean {
    const room = this.getRoom(roomId);
    return !!room.treasure && room.treasure.x === x && room.treasure.y === y;
  }

  clear(): void {
    this.rooms.clear();
    this.townRoomIdsByTownId.clear();
    this.incomingPortalsByDestRoomId.clear();
    this.bulletTrainResolver.clear();
    this.rollercoasterResolver.clear();
  }

  setCaveSave(save: CaveInstanceSaveData): void {
    this.caveSaves.set(save.id, { ...save });
    this.unregisterRoomIndexes(save.id);
    this.rooms.delete(save.id);
    const parent = this.rooms.get(save.parentRoomId);
    const entrance = parent?.caveEntrances?.find((entry) => entry.caveId === save.id);
    if (entrance) {
      entrance.collapsed = save.state === 'collapsed';
    }
  }

  getCaveSave(caveId: string): CaveInstanceSaveData | undefined {
    const save = this.caveSaves.get(caveId);
    return save ? { ...save } : undefined;
  }

  snapshot(): Map<string, RoomSnapshot> {
    return new Map(this.rooms);
  }

  getTownById(townId: string): TownStructure | undefined {
    const town = this.townsById.get(townId);
    return town ? { ...town } : undefined;
  }

  registerLayerEntrance(entrance: LayerEntrance): void {
    this.layerEntrances.set(entrance.id, {
      ...entrance,
      returnPosition: { ...entrance.returnPosition },
    });
  }

  getLayerEntrance(entranceId: string): LayerEntrance | undefined {
    const entrance = this.layerEntrances.get(entranceId);
    return entrance ? { ...entrance, returnPosition: { ...entrance.returnPosition } } : undefined;
  }

  getLayerInstance(layerId: string): LayerInstance | undefined {
    const instance = this.layerInstances.get(layerId);
    return instance ? cloneLayerInstance(instance) : undefined;
  }

  setLayerInstanceState(layerId: string, state: LayerInstance['state']): LayerInstance | undefined {
    const existing = this.layerInstances.get(layerId);
    if (!existing) {
      return undefined;
    }
    const next = { ...existing, state };
    this.layerInstances.set(layerId, next);
    this.unregisterRoomIndexes(layerId);
    this.rooms.delete(layerId);
    return cloneLayerInstance(next);
  }

  ensureLayerInstance(entrance: LayerEntrance): LayerInstance {
    this.registerLayerEntrance(entrance);
    const existing = this.layerInstances.get(entrance.layerId);
    if (existing) {
      return cloneLayerInstance(existing);
    }
    const instance = this.createLayerInstance(entrance);
    this.layerInstances.set(instance.id, instance);
    return cloneLayerInstance(instance);
  }

  updateTown(town: TownStructure): void {
    this.townsById.set(town.id, town);
    let roomIds = this.townRoomIdsByTownId.get(town.id);
    if (!roomIds) {
      roomIds = new Set<string>();
      for (const [roomId, room] of this.rooms) {
        if (room.town?.id === town.id || room.layer?.townId === town.id) {
          roomIds.add(roomId);
        }
      }
      this.townRoomIdsByTownId.set(town.id, roomIds);
    }
    for (const roomId of roomIds) {
      const room = this.rooms.get(roomId);
      if (!room) {
        continue;
      }
      const interiorDistrict: TownRoomKind | undefined =
        room.layer?.kind === 'townInterior' &&
        room.layer.townId === town.id &&
        room.town?.id === town.id
          ? townDistrictForInteriorTemplate(room.layer.templateId)
          : undefined;
      const districtKind = town.districtByRoomId[roomId] ?? interiorDistrict;
      if (room.town?.id === town.id && districtKind) {
        const townForRoom =
          interiorDistrict && !town.districtByRoomId[roomId]
            ? {
                ...town,
                districtByRoomId: { ...town.districtByRoomId, [roomId]: interiorDistrict },
                physicalRoomIds: town.physicalRoomIds.includes(roomId)
                  ? town.physicalRoomIds
                  : [...town.physicalRoomIds, roomId],
              }
            : town;
        const positionedResidents = room.town.residents;
        const roomCenter = room.town.center;
        const roomSafeArea = room.town.safeArea;
        const roomLanterns = room.town.lanterns;
        const roomPresences = room.town.residentPresences;
        const next = cloneTownForRoom(townForRoom, roomId, districtKind);
        next.center = { ...roomCenter };
        next.safeArea = { ...roomSafeArea };
        next.lanterns = roomLanterns.map((lantern) => ({ ...lantern }));
        next.residentPresences = roomPresences?.map((presence) => ({ ...presence }));
        next.residents = next.residents.map((resident) => {
          const positioned = positionedResidents.find((entry) => entry.id === resident.id);
          return positioned ? { ...resident, x: positioned.x, y: positioned.y } : resident;
        });
        const positionedShopkeeper = positionedResidents.find(
          (resident) => resident.id === next.shopkeeper.id,
        );
        next.shopkeeper = positionedShopkeeper
          ? { ...next.shopkeeper, x: positionedShopkeeper.x, y: positionedShopkeeper.y }
          : next.shopkeeper;
        room.town = next;
      }
    }
  }

  private createLayerInstance(entrance: LayerEntrance): LayerInstance {
    const centerX = Math.floor(this.grid.cols / 2);
    return {
      id: entrance.layerId,
      kind: entrance.kind,
      parentRoomId: entrance.parentRoomId,
      entranceId: entrance.id,
      templateId: entrance.templateId,
      seed: `${this.worldSeed}:${entrance.id}`,
      state: 'available',
      spawn: { x: centerX, y: this.grid.rows - 4 },
      exit: { x: centerX, y: this.grid.rows - 3 },
      returnPosition: { ...entrance.returnPosition },
      displayName: entrance.displayName,
      doorLabel: entrance.doorLabel,
      townBuildingId: entrance.townBuildingId,
      ownerResidentId: entrance.ownerResidentId,
      ownerResidentRole: entrance.ownerResidentRole,
      doorKind: entrance.doorKind,
      publicAccess: entrance.publicAccess,
      crimeOnEntry: entrance.crimeOnEntry,
      zones: [
        {
          id: `${entrance.layerId}:main`,
          templateId: entrance.templateId,
          localCoord: { x: 0, y: 0 },
        },
      ],
      boundaryMode: 'solidWalls',
      townId:
        entrance.kind === 'townInterior'
          ? this.parseTownIdFromLayerId(entrance.layerId)
          : undefined,
      tags: [entrance.kind, entrance.templateId],
    };
  }

  private createLayerRoom(instance: LayerInstance): RoomSnapshot {
    if (instance.kind === 'townInterior') {
      return this.createTownInteriorLayerRoom(instance);
    }
    throw new Error(`Unsupported layer template "${instance.kind}:${instance.templateId}".`);
  }

  private createTownInteriorLayerRoom(instance: LayerInstance): RoomSnapshot {
    const town = instance.townId ? this.townsById.get(instance.townId) : undefined;
    const building = town?.buildings.find((entry) => entry.id === instance.townBuildingId);
    const districtKind = townDistrictForInteriorTemplate(instance.templateId);
    if (!districtKind) {
      throw new Error(`Unsupported layer template "${instance.kind}:${instance.templateId}".`);
    }
    const roomTown = town
      ? cloneTownForRoom(
          {
            ...town,
            districtByRoomId: {
              ...town.districtByRoomId,
              [instance.id]: districtKind,
            },
            physicalRoomIds: town.physicalRoomIds.includes(instance.id)
              ? town.physicalRoomIds
              : [...town.physicalRoomIds, instance.id],
          },
          instance.id,
          districtKind,
        )
      : undefined;
    const centerX = Math.floor(this.grid.cols / 2);
    const centerY = Math.floor(this.grid.rows / 2);
    const palette = townInteriorPalette(
      instance.templateId,
      building?.interiorTitle ?? instance.displayName,
    );
    const bounds = townInteriorBounds(instance.templateId, this.grid.cols, this.grid.rows);
    const rows = Array.from({ length: this.grid.rows }, () => '#'.repeat(this.grid.cols));
    const setTile = (x: number, y: number, tile: string): void => {
      const row = rows[y];
      if (!row || x < 0 || x >= row.length) return;
      rows[y] = row.substring(0, x) + tile + row.substring(x + 1);
    };
    const fillTile = (left: number, top: number, width: number, height: number, tile: string) => {
      for (let y = top; y < top + height; y += 1) {
        for (let x = left; x < left + width; x += 1) {
          setTile(x, y, tile);
        }
      }
    };
    fillTile(bounds.left, bounds.top, bounds.width, bounds.height, 'W');
    for (let x = bounds.left; x < bounds.left + bounds.width; x += 1) {
      setTile(x, bounds.top, '#');
      setTile(x, bounds.top + bounds.height - 1, '#');
    }
    for (let y = bounds.top; y < bounds.top + bounds.height; y += 1) {
      setTile(bounds.left, y, '#');
      setTile(bounds.left + bounds.width - 1, y, '#');
    }
    const exit = {
      x: Math.min(bounds.left + bounds.width - 3, Math.max(bounds.left + 2, instance.exit.x)),
      y: bounds.top + bounds.height - 1,
    };
    setTile(exit.x, exit.y, LAYER_EXIT_TILE);
    setTile(exit.x - 1, exit.y, 'W');
    setTile(exit.x + 1, exit.y, 'W');
    setTile(exit.x - 1, exit.y - 1, 'W');
    setTile(exit.x, exit.y - 1, 'W');
    setTile(exit.x + 1, exit.y - 1, 'W');
    setTile(exit.x, exit.y - 2, 'W');
    stampTownInteriorTemplate(instance.templateId, setTile, fillTile, bounds, centerX, centerY);
    if (roomTown) {
      const interiorResidents = townInteriorResidentsForBuilding(roomTown, instance, building);
      const residentPositions = townInteriorResidentPositions(instance.templateId, bounds);
      const residentPresences: TownResidentPresence[] = [];
      roomTown.residents = roomTown.residents.map((resident) => {
        const index = interiorResidents.findIndex((entry) => entry.id === resident.id);
        if (index < 0) {
          return resident;
        }
        const position = residentPositions[index % residentPositions.length] ?? {
          x: bounds.left + Math.floor(bounds.width / 2),
          y: bounds.top + Math.floor(bounds.height / 2),
        };
        setTile(position.x, position.y, 'G');
        const x = Math.max(2, Math.min(this.grid.cols - 3, position.x));
        const y = Math.max(2, Math.min(this.grid.rows - 3, position.y));
        residentPresences.push({
          residentId: resident.id,
          roomId: instance.id,
          x,
          y,
          source: 'interior',
          role: resident.role,
        });
        return {
          ...resident,
          x,
          y,
          workRoomId: instance.id,
        };
      });
      roomTown.residentPresences = residentPresences;
    }
    return {
      id: instance.id,
      layout: rows,
      portals: [],
      layer: { ...cloneLayerInstance(instance), exit },
      biomeId: town?.biomeId ?? 'verdigris-basin',
      biomeTitle: palette.title,
      backgroundColor: palette.backgroundColor,
      wallColor: palette.wallColor,
      wallOutlineColor: palette.wallOutlineColor,
      town: roomTown,
    };
  }

  private parseTownIdFromLayerId(layerId: string): string | undefined {
    const parts = layerId.split(':');
    if (parts[0] !== 'layer' || parts[1] !== 'townInterior') {
      return undefined;
    }
    const template = parts[parts.length - 1] as LayerTemplateId | undefined;
    if (!template || !townDistrictForInteriorTemplate(template)) {
      return undefined;
    }
    const townId = parts.slice(2, -1).join(':');
    return townId || undefined;
  }

  private registerRoomIndexes(room: RoomSnapshot): void {
    if (room.town) {
      this.townsById.set(room.town.id, room.town);
      this.registerTownRoomIndex(room.town.id, room.id);
    } else if (room.layer?.townId) {
      this.registerTownRoomIndex(room.layer.townId, room.id);
    }
    for (const portal of room.portals) {
      this.registerPortalIndex(room.id, portal);
    }
  }

  private unregisterRoomIndexes(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }
    if (room.town) {
      this.townRoomIdsByTownId.get(room.town.id)?.delete(roomId);
    }
    if (room.layer?.townId) {
      this.townRoomIdsByTownId.get(room.layer.townId)?.delete(roomId);
    }
    for (const portal of room.portals) {
      this.unregisterPortalIndex(room.id, portal);
    }
  }

  private registerTownRoomIndex(townId: string, roomId: string): void {
    const roomIds = this.townRoomIdsByTownId.get(townId);
    if (roomIds) {
      roomIds.add(roomId);
    } else {
      this.townRoomIdsByTownId.set(townId, new Set([roomId]));
    }
  }

  private registerPortalIndex(sourceRoomId: string, portal: PortalConfig): void {
    this.unregisterPortalIndex(sourceRoomId, portal);
    const entries =
      this.incomingPortalsByDestRoomId.get(portal.destRoomId) ??
      new Map<string, PortalIndexEntry>();
    entries.set(this.portalIndexKey(sourceRoomId, portal), {
      sourceRoomId,
      x: portal.x,
      y: portal.y,
    });
    this.incomingPortalsByDestRoomId.set(portal.destRoomId, entries);
  }

  private unregisterPortalIndex(sourceRoomId: string, portal: PortalConfig): void {
    const key = this.portalIndexKey(sourceRoomId, portal);
    for (const [destRoomId, entries] of this.incomingPortalsByDestRoomId) {
      entries.delete(key);
      if (entries.size === 0) {
        this.incomingPortalsByDestRoomId.delete(destRoomId);
      }
    }
  }

  private portalIndexKey(sourceRoomId: string, portal: Pick<PortalConfig, 'x' | 'y'>): string {
    return `${sourceRoomId}:${portal.x},${portal.y}`;
  }

  private addReciprocalPortalsFromExistingRooms(room: RoomSnapshot): void {
    const incoming = this.incomingPortalsByDestRoomId.get(room.id);
    if (!incoming) {
      return;
    }
    for (const portal of incoming.values()) {
      if (!this.rooms.has(portal.sourceRoomId)) {
        continue;
      }
      this.ensureReciprocalPortal(room, portal.sourceRoomId, portal.x, portal.y);
    }
  }

  private addReciprocalPortalsForRoom(room: RoomSnapshot): void {
    for (const portal of room.portals) {
      const destination = this.rooms.get(portal.destRoomId);
      if (!destination) {
        continue;
      }
      this.ensureReciprocalPortal(destination, room.id, portal.x, portal.y);
    }
  }

  private ensureReciprocalPortal(
    room: RoomSnapshot,
    destinationRoomId: string,
    x: number,
    y: number,
  ): void {
    if (x < 0 || y < 0 || x >= this.grid.cols || y >= this.grid.rows) {
      return;
    }

    const row = room.layout[y];
    if (!row) {
      return;
    }

    const chars = row.split('');
    chars[x] = 'H';
    room.layout[y] = chars.join('');
    for (const portal of room.portals) {
      if (portal.x === x && portal.y === y) {
        this.unregisterPortalIndex(room.id, portal);
      }
    }
    room.portals = room.portals.filter((portal) => portal.x !== x || portal.y !== y);
    const reciprocalPortal: PortalConfig = {
      x,
      y,
      destRoomId: destinationRoomId,
      destX: x,
      destY: y,
    };
    room.portals.push(reciprocalPortal);
    this.registerPortalIndex(room.id, reciprocalPortal);

    if (room.treasure?.x === x && room.treasure.y === y) {
      delete room.treasure;
    }
    if (room.powerup?.x === x && room.powerup.y === y) {
      delete room.powerup;
    }
    if (room.apple?.x === x && room.apple.y === y) {
      delete room.apple;
    }
  }

  // === BULLET TRAIN ===

  /** Stamp a bullet train station entrance tile on a Jade Peak room. */
  private stampBulletTrainStation(room: RoomSnapshot): void {
    if (room.biomeId !== 'jade-peak-province') return;

    // Pre-generate nearby Jade Peak rooms BEFORE computing placements,
    // so the resolver has a pool of destination rooms to work with
    this.ensureNearbyJadePeakRooms(room.id);
    this.ensureBulletTrainPlacementsComputed();

    const placement = this.bulletTrainResolver.getStationPlacement(room.id);
    if (!placement) return;

    // Find an edge tile for the station entrance
    const layout = room.layout;
    const rows = layout.length;
    const cols = layout[0]?.length ?? 0;

    // Collect all valid edge tiles (walkable and within 3 tiles of a wall)
    const edgeTiles: Array<{ x: number; y: number; dist: number }> = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tile = layout[y][x];
        if (tile !== '.') continue;
        const distToEdge = Math.min(x, y, cols - 1 - x, rows - 1 - y);
        if (distToEdge <= 3) {
          edgeTiles.push({ x, y, dist: distToEdge });
        }
      }
    }

    if (edgeTiles.length === 0) return;

    // Sort by distance to edge (prefer closest to walls), then pick randomly among equally-close tiles
    edgeTiles.sort((a, b) => a.dist - b.dist);
    const closestDist = edgeTiles[0].dist;
    const candidates = edgeTiles.filter((t) => t.dist === closestDist);
    const entrance = candidates[Math.floor(this.rng() * candidates.length)];
    const entranceX = entrance.x;
    const entranceY = entrance.y;

    // Stamp the entrance tile
    const row = layout[entranceY].split('');
    row[entranceX] = '@';
    layout[entranceY] = row.join('');

    // Generate decorations deterministically using the game's RNG
    const decorations = generateDecorations(entranceX, entranceY, this.rng);

    room.bulletTrainStation = {
      entranceX,
      entranceY,
      stationId: placement.id,
      destinations: [], // Populated lazily when player interacts
      used: false,
      decorations,
    };
  }

  /** Recompute bullet train station placements with all known Jade Peak rooms. */
  private ensureBulletTrainPlacementsComputed(): void {
    if (this.bulletTrainResolver.computePlacements()) {
      // this._bulletTrainPlacementsComputed = true;
    }
  }

  /** Generate nearby Jade Peak rooms so destinations exist. */
  private ensureNearbyJadePeakRooms(stationRoomId: string): void {
    const coord = parseRoomId(stationRoomId);
    const radius = 8;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const neighborId = `${coord.x + dx},${coord.y + dy},${coord.z}`;
        // Skip if already registered to avoid infinite recursion
        if (this.bulletTrainResolver.hasJadePeakRoom(neighborId)) continue;
        // Only generate rooms that are actually in the room cache or known to exist
        // We don't want to generate the entire world just for bullet train destinations
        if (this.rooms.has(neighborId)) {
          const neighbor = this.rooms.get(neighborId)!;
          if (neighbor.biomeId === 'jade-peak-province') {
            this.bulletTrainResolver.registerJadePeakRoom(neighborId);
          }
        }
      }
    }
  }

  /** Get available destinations from a bullet train station. */
  getBulletTrainDestinations(stationRoomId: string): BulletTrainDestination[] {
    this.ensureBulletTrainPlacementsComputed();
    const room = this.rooms.get(stationRoomId);
    if (!room?.bulletTrainStation) return [];

    const resolverDestinations = this.bulletTrainResolver.getDestinations(stationRoomId);
    if (resolverDestinations.length === 0) return [];

    // Convert resolver destinations to BulletTrainDestination format
    const flavorTexts = [
      'Mist clings to the terraced slopes. The train hums to a stop.',
      'Through the window: silk fields stretching to the horizon.',
      'A rickety bridge sways over a gorge. The train slows.',
      'Red lanterns sway overhead. The station smells of incense.',
      'A hidden garden blooms on the mountainside. Peaceful.',
      'Cherry blossoms drift past the windows like pink snow.',
      'The mountain air is thin and sharp. You can see forever.',
      'Stone steps lead up from the platform into mist.',
      'A paper crane lands on the platform edge, then takes flight.',
      'The train groans to a halt between two towering peaks.',
      'Steam rises from hot springs near the platform.',
      'Bamboo sways in the wind. The station is quiet.',
    ];

    const displayNames = [
      'Terraced Slopes',
      'Silk Fields',
      'Gorge Crossing',
      'Lantern District',
      'Hidden Garden',
      'Cherry Blossom Hill',
      'Mountain Summit',
      'Mist Stone Steps',
      'Paper Crane Plaza',
      'Twin Peaks',
      'Hot Springs',
      'Bamboo Grove',
    ];

    return resolverDestinations.map((dest, index) => {
      const parts = dest.roomId.split(',').map(Number);
      const coordStr = `(${parts[0] ?? 0}, ${parts[1] ?? 0}, ${parts[2] ?? 0})`;
      return {
        roomId: dest.roomId,
        exitX: dest.exitX,
        exitY: dest.exitY,
        arrivalFlavor: flavorTexts[index % flavorTexts.length],
        displayName: displayNames[index % displayNames.length],
        weight: dest.weight,
        condition: 'any',
        coordinates: coordStr,
      };
    });
  }

  /** Pre-generate destinations for a bullet train station. */
  populateBulletTrainDestinations(stationRoomId: string): void {
    this.ensureNearbyJadePeakRooms(stationRoomId);
    this.ensureBulletTrainPlacementsComputed();
  }

  /** Claim a destination from a station (mark it as used). */
  claimBulletTrainDestination(stationRoomId: string, _destinationRoomId: string): void {
    const room = this.rooms.get(stationRoomId);
    if (!room?.bulletTrainStation) return;
    room.bulletTrainStation.used = true;
  }

  /** Mark a bullet train station as used. */
  markBulletTrainStationUsed(stationRoomId: string): void {
    const room = this.rooms.get(stationRoomId);
    if (!room?.bulletTrainStation) return;
    room.bulletTrainStation.used = true;
  }

  /** Generate transit room IDs for a bullet train journey. */
  generateTransitRooms(stationRoomId: string, destinationRoomId: string): string[] {
    return generateTransitRooms(stationRoomId, destinationRoomId, this.rng);
  }

  /** Generate a bullet train journey between two rooms. */
  createBulletTrainJourney(
    stationRoomId: string,
    destinationRoomId: string,
  ): BulletTrainJourney | null {
    const room = this.rooms.get(stationRoomId);
    if (!room?.bulletTrainStation) return null;

    const destinations = this.getBulletTrainDestinations(stationRoomId);
    const destination = destinations.find((d) => d.roomId === destinationRoomId);
    if (!destination) return null;

    const transitRooms = generateTransitRooms(stationRoomId, destinationRoomId, this.rng);

    return {
      phase: 'departing',
      stationRoomId,
      stationEntranceX: room.bulletTrainStation.entranceX,
      stationEntranceY: room.bulletTrainStation.entranceY,
      destinationRoomId,
      destinationExitX: destination.exitX,
      destinationExitY: destination.exitY,
      transitRooms,
      transitProgress: 0,
      startedAtMs: Date.now(),
      durationMs: 4000,
    };
  }

  // === ROLLERCOASTER ===

  /** Stamp a rollercoaster station entrance tile on a room. */
  private stampRollercoasterStation(room: RoomSnapshot): void {
    const placement = this.rollercoasterResolver.getStationPlacement(room.id);
    if (!placement) return;

    const layout = room.layout;
    const rows = layout.length;
    const cols = layout[0]?.length ?? 0;

    const edgeTiles: Array<{ x: number; y: number; dist: number }> = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tile = layout[y][x];
        if (tile !== '.') continue;
        const distToEdge = Math.min(x, y, cols - 1 - x, rows - 1 - y);
        if (distToEdge <= 3) {
          edgeTiles.push({ x, y, dist: distToEdge });
        }
      }
    }

    if (edgeTiles.length === 0) return;

    edgeTiles.sort((a, b) => a.dist - b.dist);
    const closestDist = edgeTiles[0].dist;
    const candidates = edgeTiles.filter((t) => t.dist === closestDist);
    const entrance = candidates[Math.floor(this.rng() * candidates.length)];
    const entranceX = entrance.x;
    const entranceY = entrance.y;

    const row = layout[entranceY].split('');
    row[entranceX] = 'C';
    layout[entranceY] = row.join('');

    room.rollercoasterStation = {
      entranceX,
      entranceY,
      stationId: placement.id,
      destinations: [],
      used: false,
      trackSegments: [],
      stationName: '',
      theme: 'thunder-ridge', // Default, set below
    };

    // Generate station details
    const theme = this.pickCoasterTheme();
    room.rollercoasterStation.theme = theme;
    room.rollercoasterStation.stationName = this.generateCoasterStationName(theme);
    room.rollercoasterStation.trackSegments = this.generateCoasterTrackSegments(
      entranceX,
      entranceY,
    );
  }

  /** Pick a random coaster theme. */
  private pickCoasterTheme(): RollercoasterTheme {
    const themes: RollercoasterTheme[] = [
      'thunder-ridge',
      'neon-nights',
      'jungle-jolt',
      'arctic-avalanche',
      'volcanic-veer',
      'cosmic-corkscrew',
    ];
    return themes[Math.floor(this.rng() * themes.length)];
  }

  /** Generate a station name for a theme. */
  private generateCoasterStationName(theme: RollercoasterTheme): string {
    const names: Record<RollercoasterTheme, string[]> = {
      'thunder-ridge': [
        'Thunder Ridge Coaster',
        'Mountain Madness',
        "Eagle's Descent",
        'Granite Rush',
        'Summit Scream',
      ],
      'neon-nights': [
        'Neon Nightmare',
        'Cyber Loop',
        'Electric Express',
        'Neon Nexus',
        'Pixel Plunge',
      ],
      'jungle-jolt': [
        'Jungle Jolt',
        'Temple Terror',
        'Vine Swing',
        "Serpent's Coil",
        'Lost Temple Loop',
      ],
      'arctic-avalanche': [
        'Arctic Avalanche',
        'Frost Flip',
        'Glacier Glide',
        'Iceberg Inferno',
        'Blizzard Blast',
      ],
      'volcanic-veer': [
        'Volcanic Veer',
        'Lava Loop',
        'Magma Madness',
        'Pyro Plunge',
        'Inferno Invader',
      ],
      'cosmic-corkscrew': [
        'Cosmic Corkscrew',
        'Star Spinner',
        'Nebula Nightmare',
        'Galaxy Grinder',
        'Astro Assault',
      ],
    };
    const themeNames = names[theme];
    return themeNames[Math.floor(this.rng() * themeNames.length)];
  }

  /** Generate track segments for a coaster station. */
  private generateCoasterTrackSegments(
    entranceX: number,
    entranceY: number,
  ): import('./rollercoasterTypes.js').RollercoasterTrackSegment[] {
    const segments: import('./rollercoasterTypes.js').RollercoasterTrackSegment[] = [];

    segments.push({ type: 'station-platform' as const, x: entranceX, y: entranceY });

    const liftDir = this.rng() > 0.5 ? ('up' as const) : ('down' as const);
    segments.push({
      type: 'lift-hill' as const,
      x: entranceX + (liftDir === 'up' ? 3 : -3),
      y: entranceY,
      direction: liftDir,
    });

    segments.push({
      type: 'drop' as const,
      x: entranceX + (liftDir === 'up' ? 7 : -7),
      y: entranceY,
      height: 2 + Math.floor(this.rng() * 3),
    });

    if (this.rng() > 0.3) {
      segments.push({
        type: 'loop' as const,
        x: entranceX + (liftDir === 'up' ? 10 : -10),
        y: entranceY,
        size: 2,
      });
    } else {
      segments.push({
        type: 'curve' as const,
        x: entranceX + (liftDir === 'up' ? 10 : -10),
        y: entranceY,
        radius: 3,
        arc: Math.PI * 0.75,
      });
    }

    segments.push({
      type: 'straight' as const,
      x: entranceX + (liftDir === 'up' ? 5 : -5),
      y: entranceY,
      length: 6,
      direction: 'horizontal' as const,
    });

    return segments;
  }

  /** Recompute rollercoaster station placements with all known rooms. */
  private ensureRollercoasterPlacementsComputed(): void {
    if (this.rollercoasterResolver.computePlacements()) {
      // this._rollercoasterPlacementsComputed = true;
    }
  }

  /** Get available destinations from a rollercoaster station. */
  getRollercoasterDestinations(stationRoomId: string): RollercoasterDestination[] {
    this.ensureRollercoasterPlacementsComputed();
    const room = this.rooms.get(stationRoomId);
    if (!room?.rollercoasterStation) return [];

    const resolverDestinations = this.rollercoasterResolver.getDestinations(stationRoomId);
    if (resolverDestinations.length === 0) return [];

    const theme = room.rollercoasterStation.theme;

    const arrivalFlavors: Record<RollercoasterTheme, string[]> = {
      'thunder-ridge': [
        'The coaster screeches to a halt. Wind still howls in your ears.',
        'You slam into the station platform, heart pounding. Worth it.',
        'The coaster groans to a stop. Eagles circle overhead.',
      ],
      'neon-nights': [
        'Neon lights flicker as the coaster slides into the station.',
        'Holographic signs pulse: "Welcome to the other side."',
        'The coaster hums to a stop beneath a canopy of LEDs.',
      ],
      'jungle-jolt': [
        'The coaster rattles to a halt among ancient stones.',
        'Vines sway as the coaster settles. Jungle sounds return.',
        'The temple coaster groans. A monkey watches from above.',
      ],
      'arctic-avalanche': [
        'Ice crystals sparkle as the coaster slides into the station.',
        'The coaster hisses to a halt. Frost forms on the rails.',
        'Snow drifts across the platform. The coaster stops.',
      ],
      'volcanic-veer': [
        'Smoke billows as the coaster slams into the station.',
        'The coaster hisses on hot rails. Lava glows below.',
        'Embers drift past as the coaster comes to rest.',
      ],
      'cosmic-corkscrew': [
        'Stars swirl in the windows as the coaster docks.',
        'The coaster hums with cosmic energy. Zero-G still affects you.',
        'Nebula colors fade as the coaster settles into the station.',
      ],
    };

    const displayNames: Record<RollercoasterTheme, string[]> = {
      'thunder-ridge': [
        'Thunder Peak',
        'Ridge Runner',
        "Eagle's Nest",
        'Granite Station',
        'Summit Stop',
      ],
      'neon-nights': ['Neon District', 'Cyber Hub', 'Electric Avenue', 'Pixel Plaza', 'Neon Nexus'],
      'jungle-jolt': [
        'Jungle Temple',
        'Vine Valley',
        "Serpent's Lair",
        'Lost Ruins',
        'Green Station',
      ],
      'arctic-avalanche': [
        'Frost Station',
        'Glacier Point',
        'Ice Hollow',
        'Blizzard Base',
        'Avalanche Alley',
      ],
      'volcanic-veer': [
        'Lava Station',
        'Magma Junction',
        'Pyro Port',
        'Inferno Isle',
        'Volcano View',
      ],
      'cosmic-corkscrew': [
        'Star Dock',
        'Nebula Station',
        'Galaxy Gate',
        'Astro Hub',
        'Cosmic Corner',
      ],
    };

    const flavorPool = arrivalFlavors[theme];
    const namePool = displayNames[theme];

    return resolverDestinations.map((dest, index) => {
      const parts = dest.roomId.split(',').map(Number);
      const coordStr = `(${parts[0] ?? 0}, ${parts[1] ?? 0}, ${parts[2] ?? 0})`;
      return {
        roomId: dest.roomId,
        exitX: dest.exitX,
        exitY: dest.exitY,
        arrivalFlavor: flavorPool[index % flavorPool.length],
        displayName: namePool[index % namePool.length],
        weight: dest.weight,
        condition: 'any',
        coordinates: coordStr,
      };
    });
  }

  /** Mark a rollercoaster station as used. */
  markRollercoasterStationUsed(stationRoomId: string): void {
    const room = this.rooms.get(stationRoomId);
    if (!room?.rollercoasterStation) return;
    room.rollercoasterStation.used = true;
  }

  /** Generate a rollercoaster journey between two rooms. */
  createRollercoasterJourney(
    stationRoomId: string,
    destinationRoomId: string,
  ): RollercoasterJourney | null {
    const room = this.rooms.get(stationRoomId);
    if (!room?.rollercoasterStation) return null;

    const destinations = this.getRollercoasterDestinations(stationRoomId);
    const destination = destinations.find((d) => d.roomId === destinationRoomId);
    if (!destination) return null;

    return createCoasterJourney(
      stationRoomId,
      room.rollercoasterStation.entranceX,
      room.rollercoasterStation.entranceY,
      destinationRoomId,
      destination.exitX,
      destination.exitY,
      room.rollercoasterStation.theme,
      this.rng,
    );
  }

  private findRandomEmptySpot(room: RoomSnapshot): Vector2Like | null {
    const tries = 50;
    for (let i = 0; i < tries; i++) {
      const x = Math.floor(this.rng() * this.grid.cols);
      const y = Math.floor(this.rng() * this.grid.rows);
      const tile = room.layout[y]?.[x];
      if (tile === '.') {
        return { x, y };
      }
    }
    // fallback search
    for (let y = 0; y < room.layout.length; y++) {
      for (let x = 0; x < room.layout[y].length; x++) {
        if (room.layout[y][x] === '.') return { x, y };
      }
    }
    return null;
  }

  private findRandomWaterSpot(room: RoomSnapshot): Vector2Like | null {
    const water: Vector2Like[] = [];
    for (let y = 1; y < room.layout.length - 1; y += 1) {
      for (let x = 1; x < (room.layout[y]?.length ?? 0) - 1; x += 1) {
        if (room.layout[y]?.[x] === '~') water.push({ x, y });
      }
    }
    return water.length > 0 ? water[Math.floor(this.rng() * water.length)]! : null;
  }
}

function parseCaveRoomId(
  caveId: string,
  savedTemplateId?: CaveTemplateId,
): { parentRoomId: string; templateId: CaveTemplateId } {
  const parts = caveId.split(':');
  return {
    parentRoomId: parts[1] || '0,0,0',
    templateId: savedTemplateId ?? 'simpleTreasure',
  };
}

function townDistrictForInteriorTemplate(templateId: LayerTemplateId): TownRoomKind | undefined {
  switch (templateId) {
    case 'thievesGuild':
      return 'guildHideout';
    case 'tavern':
      return 'tavernInterior';
    case 'generalStore':
    case 'butcherShop':
    case 'potionMaker':
      return 'marketStreet';
    case 'residentialHome':
      return 'residentialStreet';
  }
}

function townInteriorResidentsForBuilding(
  town: TownStructure,
  instance: LayerInstance,
  building: TownBuilding | undefined,
): TownStructure['residents'] {
  const byId = building?.ownerResidentId
    ? town.residents.find((resident) => resident.id === building.ownerResidentId)
    : undefined;
  const byRole = building?.ownerResidentRole
    ? town.residents.find((resident) => resident.role === building.ownerResidentRole)
    : undefined;
  const owner = byId ?? byRole;
  switch (instance.templateId) {
    case 'generalStore':
    case 'butcherShop':
    case 'potionMaker':
    case 'residentialHome':
      return owner ? [owner] : [];
    case 'tavern': {
      const roles = new Set(['bartender', 'cardDealer', 'questGiver']);
      const social = town.residents.filter((resident) => roles.has(resident.role));
      return owner && !social.some((resident) => resident.id === owner.id)
        ? [owner, ...social].slice(0, 3)
        : social.slice(0, 3);
    }
    case 'thievesGuild': {
      const roles = new Set(['thiefContact', 'thief']);
      const guild = town.residents.filter((resident) => roles.has(resident.role));
      return owner && !guild.some((resident) => resident.id === owner.id)
        ? [owner, ...guild].slice(0, 4)
        : guild.slice(0, 4);
    }
  }
}

function townInteriorPalette(templateId: LayerTemplateId): {
  title: string;
  backgroundColor: number;
  wallColor: number;
  wallOutlineColor: number;
};
function townInteriorPalette(
  templateId: LayerTemplateId,
  titleOverride: string | undefined,
): {
  title: string;
  backgroundColor: number;
  wallColor: number;
  wallOutlineColor: number;
};
function townInteriorPalette(
  templateId: LayerTemplateId,
  titleOverride?: string,
): {
  title: string;
  backgroundColor: number;
  wallColor: number;
  wallOutlineColor: number;
} {
  switch (templateId) {
    case 'thievesGuild':
      return {
        title: titleOverride ?? 'Thieves Guild',
        backgroundColor: 0x17111f,
        wallColor: 0x3a243b,
        wallOutlineColor: 0x8f6aa8,
      };
    case 'tavern':
      return {
        title: titleOverride ?? 'Tavern',
        backgroundColor: 0x241a12,
        wallColor: 0x6b3e24,
        wallOutlineColor: 0xd6a35f,
      };
    case 'generalStore':
      return {
        title: titleOverride ?? 'General Store',
        backgroundColor: 0x182018,
        wallColor: 0x3f6540,
        wallOutlineColor: 0xb7d68a,
      };
    case 'butcherShop':
      return {
        title: titleOverride ?? 'Butcher Shop',
        backgroundColor: 0x241616,
        wallColor: 0x713232,
        wallOutlineColor: 0xe7a0a0,
      };
    case 'potionMaker':
      return {
        title: titleOverride ?? 'Potion Maker',
        backgroundColor: 0x171b2d,
        wallColor: 0x354d7c,
        wallOutlineColor: 0x9ab8ff,
      };
    case 'residentialHome':
      return {
        title: titleOverride ?? 'Town Home',
        backgroundColor: 0x211d18,
        wallColor: 0x5b4936,
        wallOutlineColor: 0xc9b28a,
      };
  }
}

function townInteriorBounds(
  templateId: LayerTemplateId,
  cols: number,
  rows: number,
): { left: number; top: number; width: number; height: number } {
  const full = { left: 3, top: 3, width: cols - 6, height: rows - 5 };
  switch (templateId) {
    case 'tavern':
    case 'thievesGuild':
      return full;
    case 'generalStore':
    case 'butcherShop':
    case 'potionMaker':
      return { left: 7, top: 5, width: cols - 14, height: rows - 7 };
    case 'residentialHome':
      return { left: 9, top: 6, width: cols - 18, height: rows - 9 };
  }
}

function stampTownInteriorTemplate(
  templateId: LayerTemplateId,
  setTile: (x: number, y: number, tile: string) => void,
  fillTile: (left: number, top: number, width: number, height: number, tile: string) => void,
  bounds: { left: number; top: number; width: number; height: number },
  centerX: number,
  centerY: number,
): void {
  const left = bounds.left;
  const top = bounds.top;
  const right = bounds.left + bounds.width - 1;
  const bottom = bounds.top + bounds.height - 1;
  switch (templateId) {
    case 'tavern':
      fillTile(left + 2, top + 2, bounds.width - 4, 2, 'A');
      fillTile(left + 2, top + 1, bounds.width - 4, 1, 'S');
      for (const table of [
        { x: centerX - 7, y: centerY + 1 },
        { x: centerX, y: centerY + 3 },
        { x: centerX + 7, y: centerY + 1 },
        { x: centerX + 8, y: centerY - 3 },
      ]) {
        setTile(table.x, table.y, 'R');
        setTile(table.x - 1, table.y, 'E');
        setTile(table.x + 1, table.y, 'E');
      }
      setTile(right - 3, top + 5, 'F');
      break;
    case 'generalStore':
      fillTile(left + 2, top + 3, bounds.width - 4, 1, 'A');
      setTile(left + 3, top + 2, 'S');
      setTile(right - 3, top + 2, 'M');
      setTile(left + 4, bottom - 4, 'M');
      setTile(right - 4, bottom - 4, 'S');
      break;
    case 'butcherShop':
      fillTile(left + 2, top + 3, bounds.width - 4, 1, 'A');
      setTile(left + 4, top + 2, 'F');
      setTile(right - 4, top + 2, 'F');
      setTile(centerX - 2, bottom - 4, 'R');
      setTile(centerX + 2, bottom - 4, 'F');
      break;
    case 'potionMaker':
      fillTile(left + 2, top + 3, bounds.width - 4, 1, 'A');
      setTile(left + 4, top + 2, 'P');
      setTile(centerX, top + 2, 'P');
      setTile(right - 4, top + 2, 'P');
      setTile(centerX - 3, bottom - 4, 'M');
      setTile(centerX + 3, bottom - 4, 'P');
      break;
    case 'residentialHome':
      setTile(left + 3, top + 3, 'R');
      setTile(right - 3, top + 3, 'S');
      setTile(left + 3, bottom - 3, 'P');
      setTile(right - 3, bottom - 3, 'A');
      break;
    case 'thievesGuild':
      fillTile(left + 3, top + 3, bounds.width - 6, 2, 'A');
      fillTile(centerX - 7, centerY - 2, 14, 2, 'S');
      setTile(centerX - 8, centerY + 2, 'P');
      setTile(centerX + 8, centerY + 2, 'A');
      setTile(left + 4, bottom - 4, 'U');
      setTile(right - 5, top + 6, 'M');
      setTile(left + 7, top + 7, 'S');
      break;
  }
}

function townInteriorResidentPositions(
  templateId: LayerTemplateId,
  bounds: { left: number; top: number; width: number; height: number },
): Array<{ x: number; y: number }> {
  const centerX = bounds.left + Math.floor(bounds.width / 2);
  const centerY = bounds.top + Math.floor(bounds.height / 2);
  switch (templateId) {
    case 'tavern':
      return [
        { x: centerX - 8, y: bounds.top + 4 },
        { x: centerX + 5, y: centerY + 2 },
        { x: centerX - 5, y: centerY + 3 },
      ];
    case 'generalStore':
    case 'butcherShop':
    case 'potionMaker':
      return [{ x: centerX, y: bounds.top + 5 }];
    case 'residentialHome':
      return [
        { x: centerX - 3, y: centerY },
        { x: centerX + 3, y: centerY },
      ];
    case 'thievesGuild':
      return [
        { x: centerX - 7, y: centerY + 4 },
        { x: centerX + 7, y: centerY + 4 },
        { x: centerX - 5, y: centerY - 4 },
        { x: centerX + 5, y: centerY - 4 },
      ];
  }
}

function cloneLayerInstance(instance: LayerInstance): LayerInstance {
  return {
    ...instance,
    spawn: { ...instance.spawn },
    exit: { ...instance.exit },
    returnPosition: { ...instance.returnPosition },
    zones: instance.zones.map((zone) => ({
      ...zone,
      localCoord: { ...zone.localCoord },
    })),
    tags: instance.tags ? [...instance.tags] : undefined,
  };
}
