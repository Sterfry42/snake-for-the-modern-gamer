import type { GridConfig, WorldConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { RoomGenerator } from './roomGenerator.js';
import type { RoomSnapshot } from './types.js';
import {
  cloneTown,
  cloneTownForRoom,
  createTownDistrictRoom,
  stampTownBoundaryApproach,
  type TownDistrictKind,
  type TownStructure,
} from './town.js';

export class WorldService {
  private readonly rooms = new Map<string, RoomSnapshot>();
  private readonly generator: RoomGenerator;
  private readonly rng: RandomGenerator;

  constructor(
    private readonly grid: GridConfig,
    worldConfig: WorldConfig,
    rng: RandomGenerator,
  ) {
    this.generator = new RoomGenerator(worldConfig, rng);
    this.rng = rng;
  }

  getRoom(roomId: string): RoomSnapshot {
    if (!this.rooms.has(roomId)) {
      const room = this.generator.generate(roomId, this.grid);
      this.addReciprocalPortalsFromExistingRooms(room);
      if (room.town) {
        const townRoom = this.expandTownCluster(room);
        this.rooms.set(roomId, townRoom);
        this.addReciprocalPortalsForRoom(townRoom);
        return townRoom;
      }
      this.applyTownBoundaryApproach(room);
      // Small chance to spawn a treasure chest in new rooms
      if (this.rng() < 0.1) {
        const spot = this.findRandomEmptySpot(room);
        if (spot) {
          room.treasure = spot;
        }
      }
      // Powerups: 10% chance to spawn in new rooms
      if (this.rng() < 0.1) {
        const spot = this.findRandomEmptySpot(room);
        if (spot) {
          const roll = this.rng();
          const kind: 'phase' | 'smite' = roll < 0.4 ? 'phase' : 'smite';
          room.powerup = { x: spot.x, y: spot.y, kind };
        }
      }
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

  snapshot(): Map<string, RoomSnapshot> {
    return new Map(this.rooms);
  }

  updateTown(town: TownStructure): void {
    for (const [roomId, room] of this.rooms) {
      const districtKind = town.districtByRoomId[roomId];
      if (room.town?.id === town.id && districtKind) {
        const positionedResidents = room.town.residents;
        const roomCenter = room.town.center;
        const roomSafeArea = room.town.safeArea;
        const roomLanterns = room.town.lanterns;
        const next = cloneTownForRoom(town, roomId, districtKind);
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

  private expandTownCluster(anchorRoom: RoomSnapshot): RoomSnapshot {
    const town = anchorRoom.town;
    if (!town) {
      return anchorRoom;
    }
    const approachRoom: RoomSnapshot = {
      ...anchorRoom,
      town: undefined,
      layout: stampTownBoundaryApproach(anchorRoom.layout, 'east'),
    };
    const [x = 0, y = 0, z = 0] = anchorRoom.id.split(',').map(Number);
    const roomId = (dx: number, dy: number) => `${x + dx},${y + dy},${z}`;
    const placements: Array<{
      id: string;
      district: TownDistrictKind;
      connections: Partial<Record<'north' | 'south' | 'east' | 'west', string>>;
    }> = [
      {
        id: roomId(1, 0),
        district: 'outskirts',
        connections: { west: roomId(0, 0), east: roomId(2, 0) },
      },
      { id: roomId(2, 0), district: 'gate', connections: { west: roomId(1, 0), east: roomId(3, 0) } },
      {
        id: roomId(3, 0),
        district: 'square',
        connections: { west: roomId(2, 0), east: roomId(4, 0), south: roomId(3, 1) },
      },
      {
        id: roomId(4, 0),
        district: 'marketStreet',
        connections: { west: roomId(3, 0) },
      },
      {
        id: roomId(3, 1),
        district: 'tavernInterior',
        connections: { north: roomId(3, 0), south: roomId(3, 2) },
      },
      {
        id: roomId(4, 2),
        district: 'guildHideout',
        connections: { west: roomId(3, 2) },
      },
      {
        id: roomId(3, 2),
        district: 'backAlley',
        connections: { north: roomId(3, 1), west: roomId(2, 2), east: roomId(4, 2), south: roomId(3, 3) },
      },
      {
        id: roomId(2, 2),
        district: 'residentialStreet',
        connections: { east: roomId(3, 2) },
      },
      {
        id: roomId(3, 3),
        district: 'townExit',
        connections: { north: roomId(3, 2), south: roomId(3, 4) },
      },
    ];
    const baseTown = cloneTown(town);
    baseTown.physicalRoomIds = placements.map((placement) => placement.id);
    baseTown.districtByRoomId = Object.fromEntries(
      placements.map((placement) => [placement.id, placement.district]),
    );
    baseTown.entranceRoomId = roomId(1, 0);
    baseTown.exitRoomIds = [roomId(3, 3)];

    const palette = {
      biomeId: anchorRoom.biomeId,
      biomeTitle: anchorRoom.biomeTitle,
      backgroundColor: anchorRoom.backgroundColor,
      wallColor: anchorRoom.wallColor,
      wallOutlineColor: anchorRoom.wallOutlineColor,
    };
    this.rooms.set(anchorRoom.id, approachRoom);
    for (const placement of placements) {
      const townRoom = createTownDistrictRoom({
        town: baseTown,
        roomId: placement.id,
        districtKind: placement.district,
        grid: this.grid,
        connections: placement.connections,
        ...palette,
      });
      this.rooms.set(placement.id, townRoom);
    }
    this.updateTown(baseTown);
    this.applyTownPerimeterApproaches(baseTown);
    return approachRoom;
  }

  private applyTownBoundaryApproach(room: RoomSnapshot): void {
    for (const sourceRoom of this.rooms.values()) {
      const town = sourceRoom.town;
      if (!town) {
        continue;
      }
      const approach = this.getTownPerimeterApproach(town, room.id);
      if (approach) {
        room.layout = stampTownBoundaryApproach(
          room.layout,
          approach.sideFacingTown,
          approach.hasOpening,
        );
      }
    }
  }

  private applyTownPerimeterApproaches(town: TownStructure): void {
    const seen = new Set<string>();
    for (const roomId of town.physicalRoomIds) {
      for (const offset of [
        { dx: -1, dy: 0, side: 'east' as const },
        { dx: 1, dy: 0, side: 'west' as const },
        { dx: 0, dy: -1, side: 'south' as const },
        { dx: 0, dy: 1, side: 'north' as const },
      ]) {
        const neighborId = this.shiftRoomId(roomId, offset.dx, offset.dy);
        if (town.physicalRoomIds.includes(neighborId) || seen.has(neighborId)) {
          continue;
        }
        seen.add(neighborId);
        const approach = this.getTownPerimeterApproach(town, neighborId);
        if (approach) {
          this.applyTownBoundaryApproachToRoomId(
            neighborId,
            approach.sideFacingTown,
            approach.hasOpening,
          );
        }
      }
    }
  }

  private getTownPerimeterApproach(
    town: TownStructure,
    roomId: string,
  ): { sideFacingTown: 'north' | 'south' | 'east' | 'west'; hasOpening: boolean } | null {
    for (const townRoomId of town.physicalRoomIds) {
      const candidates = [
        { id: this.shiftRoomId(townRoomId, -1, 0), sideFacingTown: 'east' as const },
        { id: this.shiftRoomId(townRoomId, 1, 0), sideFacingTown: 'west' as const },
        { id: this.shiftRoomId(townRoomId, 0, -1), sideFacingTown: 'south' as const },
        { id: this.shiftRoomId(townRoomId, 0, 1), sideFacingTown: 'north' as const },
      ];
      const found = candidates.find((candidate) => candidate.id === roomId);
      if (found) {
        const entranceApproach = this.shiftRoomId(town.entranceRoomId, -1, 0);
        const exitApproach = town.exitRoomIds.map((exitRoomId) => this.shiftRoomId(exitRoomId, 0, 1));
        return {
          sideFacingTown: found.sideFacingTown,
          hasOpening: roomId === entranceApproach || exitApproach.includes(roomId),
        };
      }
    }
    return null;
  }

  private applyTownBoundaryApproachToRoomId(
    roomId: string,
    sideFacingTown: 'north' | 'south' | 'east' | 'west',
    hasOpening = true,
  ): void {
    const room = this.rooms.get(roomId);
    if (!room || room.town) {
      return;
    }
    room.layout = stampTownBoundaryApproach(room.layout, sideFacingTown, hasOpening);
  }

  private shiftRoomId(roomId: string, dx: number, dy: number): string {
    const [x = 0, y = 0, z = 0] = roomId.split(',').map(Number);
    return `${x + dx},${y + dy},${z}`;
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
