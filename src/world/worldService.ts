import type { GridConfig, WorldConfig } from "../config/gameConfig.js";
import type { Vector2Like } from "../core/math.js";
import type { RandomGenerator } from "../core/rng.js";
import { RoomGenerator } from "./roomGenerator.js";
import type { RoomSnapshot } from "./types.js";

export class WorldService {
  private readonly rooms = new Map<string, RoomSnapshot>();
  private readonly generator: RoomGenerator;
  private readonly rng: RandomGenerator;

  constructor(
    private readonly grid: GridConfig,
    worldConfig: WorldConfig,
    rng: RandomGenerator
  ) {
    this.generator = new RoomGenerator(worldConfig, rng);
    this.rng = rng;
  }

  getRoom(roomId: string): RoomSnapshot {
    if (!this.rooms.has(roomId)) {
      const room = this.generator.generate(roomId, this.grid);
      this.addReciprocalPortalsFromExistingRooms(room);
      // Small chance to spawn a treasure chest in new rooms
      if (this.rng() < 0.10) {
        const spot = this.findRandomEmptySpot(room);
        if (spot) {
          room.treasure = spot;
        }
      }
      // Powerups: 10% chance to spawn in new rooms
      if (this.rng() < 0.10) {
        const spot = this.findRandomEmptySpot(room);
        if (spot) {
          const roll = this.rng();
          const kind: "phase" | "smite" =
            roll < 0.4 ? "phase" :
            "smite";
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
    powerup: { x: number; y: number; kind: "phase" | "smite" | "gun" } | undefined
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
    y: number
  ): { present: boolean; kind?: "phase" | "smite" | "gun" } {
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

  private ensureReciprocalPortal(room: RoomSnapshot, destinationRoomId: string, x: number, y: number): void {
    if (x < 0 || y < 0 || x >= this.grid.cols || y >= this.grid.rows) {
      return;
    }

    const row = room.layout[y];
    if (!row) {
      return;
    }

    const chars = row.split("");
    chars[x] = "H";
    room.layout[y] = chars.join("");
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
      if (tile === ".") {
        return { x, y };
      }
    }
    // fallback search
    for (let y = 0; y < room.layout.length; y++) {
      for (let x = 0; x < room.layout[y].length; x++) {
        if (room.layout[y][x] === ".") return { x, y };
      }
    }
    return null;
  }
}
