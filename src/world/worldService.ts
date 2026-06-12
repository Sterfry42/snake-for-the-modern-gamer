import type { GridConfig, WorldConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { RoomGenerator } from './roomGenerator.js';
import type { RoomSnapshot } from './types.js';
import { cloneTownForRoom, type TownRoomKind, type TownStructure } from './town.js';
import type { WorldGenerationIdentity } from './generation/worldGenerationIdentity.js';
import { maybePlaceCaveEntrance } from '../caves/caveEntrancePlacement.js';
import { generateCave, isCaveRoomId } from '../caves/caveGenerator.js';
import type { CaveInstanceSaveData, CaveTemplateId } from '../caves/caveTypes.js';
import type { LayerEntrance, LayerInstance } from '../layers/layerTypes.js';

export interface PickupChanceProvider {
  getTreasureChance?: () => number;
  getPowerupChance?: () => number;
}

export class WorldService {
  private readonly rooms = new Map<string, RoomSnapshot>();
  private readonly generator: RoomGenerator;
  private readonly rng: RandomGenerator;
  private readonly worldSeed: string;
  private readonly generatorWorldConfig: WorldConfig;
  private readonly caveSaves = new Map<string, CaveInstanceSaveData>();
  private readonly townsById = new Map<string, TownStructure>();
  private readonly layerEntrances = new Map<string, LayerEntrance>();
  private readonly layerInstances = new Map<string, LayerInstance>();

  constructor(
    private readonly grid: GridConfig,
    worldConfig: WorldConfig,
    rng: RandomGenerator,
    identity?: WorldGenerationIdentity,
    private readonly pickupChanceProvider: PickupChanceProvider = {},
  ) {
    this.generator = new RoomGenerator(grid, worldConfig, rng, identity);
    this.rng = rng;
    this.worldSeed = identity?.seed ?? 'default-world';
    this.generatorWorldConfig = worldConfig;
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
        return generated.room;
      }
      const room = this.generator.generate(roomId, this.grid);
      this.addReciprocalPortalsFromExistingRooms(room);
      const suppressPickupSpawns = Boolean(room.town || room.townPerimeter);
      // Small chance to spawn a treasure chest in new rooms
      if (
        !suppressPickupSpawns &&
        this.rng() < (this.pickupChanceProvider.getTreasureChance?.() ?? 0.1)
      ) {
        const spot = this.findRandomEmptySpot(room);
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
      this.rooms.set(roomId, room);
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
  }

  setCaveSave(save: CaveInstanceSaveData): void {
    this.caveSaves.set(save.id, { ...save });
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
    for (const [roomId, room] of this.rooms) {
      const interiorDistrict: TownRoomKind | undefined =
        room.layer?.kind === 'townInterior' &&
        room.layer.templateId === 'thievesGuild' &&
        room.layer.townId === town.id &&
        room.town?.id === town.id
          ? 'guildHideout'
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
        const next = cloneTownForRoom(townForRoom, roomId, districtKind);
        next.center = { ...roomCenter };
        next.safeArea = { ...roomSafeArea };
        next.lanterns = roomLanterns.map((lantern) => ({ ...lantern }));
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
    if (instance.kind === 'townInterior' && instance.templateId === 'thievesGuild') {
      return this.createThievesGuildLayerRoom(instance);
    }
    throw new Error(`Unsupported layer template "${instance.kind}:${instance.templateId}".`);
  }

  private createThievesGuildLayerRoom(instance: LayerInstance): RoomSnapshot {
    const town = instance.townId ? this.townsById.get(instance.townId) : undefined;
    const districtKind: TownRoomKind = 'guildHideout';
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
    const rows = Array.from({ length: this.grid.rows }, (_, y) => {
      const chars = Array.from({ length: this.grid.cols }, (_, x) =>
        x === 0 || y === 0 || x === this.grid.cols - 1 || y === this.grid.rows - 1 ? '#' : 'W',
      );
      return chars.join('');
    });
    const setTile = (x: number, y: number, tile: string): void => {
      const row = rows[y];
      if (!row || x < 0 || x >= row.length) return;
      rows[y] = row.substring(0, x) + tile + row.substring(x + 1);
    };
    for (let x = centerX - 8; x <= centerX + 8; x += 1) {
      setTile(x, centerY - 3, 'E');
      setTile(x, centerY + 3, 'E');
    }
    setTile(instance.exit.x, instance.exit.y, 'Y');
    setTile(centerX - 5, centerY, 'S');
    setTile(centerX + 5, centerY, 'A');
    setTile(centerX, centerY, 'E');
    if (roomTown) {
      const guildResidents = roomTown.residents.filter((resident) => {
        const workDistrict = resident.workRoomId
          ? roomTown.districtByRoomId[resident.workRoomId]
          : undefined;
        return (
          workDistrict === districtKind ||
          resident.role === 'thiefContact' ||
          resident.role === 'thief'
        );
      });
      const residentPositions = [
        { x: centerX - 8, y: centerY + 4 },
        { x: centerX - 4, y: centerY + 4 },
        { x: centerX + 4, y: centerY + 4 },
        { x: centerX + 8, y: centerY + 4 },
        { x: centerX - 6, y: centerY - 4 },
        { x: centerX + 6, y: centerY - 4 },
      ];
      roomTown.residents = roomTown.residents.map((resident) => {
        const index = guildResidents.findIndex((entry) => entry.id === resident.id);
        if (index < 0) {
          return resident;
        }
        const position = residentPositions[index % residentPositions.length] ?? {
          x: centerX,
          y: centerY + 4,
        };
        setTile(position.x, position.y, 'G');
        return {
          ...resident,
          x: Math.max(2, Math.min(this.grid.cols - 3, position.x)),
          y: Math.max(2, Math.min(this.grid.rows - 3, position.y)),
          workRoomId: instance.id,
        };
      });
    }
    return {
      id: instance.id,
      layout: rows,
      portals: [],
      layer: cloneLayerInstance(instance),
      biomeId: town?.biomeId ?? 'verdigris-basin',
      biomeTitle: 'Thieves Guild',
      backgroundColor: 0x17111f,
      wallColor: 0x3a243b,
      wallOutlineColor: 0x8f6aa8,
      town: roomTown,
    };
  }

  private parseTownIdFromLayerId(layerId: string): string | undefined {
    const parts = layerId.split(':');
    if (parts[0] !== 'layer' || parts[1] !== 'townInterior') {
      return undefined;
    }
    const template = parts[parts.length - 1];
    if (template !== 'thievesGuild') {
      return undefined;
    }
    const townId = parts.slice(2, -1).join(':');
    return townId || undefined;
  }

  private addReciprocalPortalsFromExistingRooms(room: RoomSnapshot): void {
    for (const sourceRoom of this.rooms.values()) {
      for (const portal of sourceRoom.portals) {
        if (portal.destRoomId === room.id) {
          this.ensureReciprocalPortal(room, sourceRoom.id, portal.x, portal.y);
        }
      }
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
    room.portals = room.portals.filter((portal) => portal.x !== x || portal.y !== y);
    room.portals.push({
      x,
      y,
      destRoomId: destinationRoomId,
      destX: x,
      destY: y,
    });

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
