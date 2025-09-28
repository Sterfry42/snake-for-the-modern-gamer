import type { GridConfig, WorldConfig } from "../config/gameConfig.js";
import type { Vector2Like } from "../core/math.js";
import type { RandomGenerator } from "../core/rng.js";
import { RoomGenerator } from "./roomGenerator.js";
import type { RoomSnapshot } from "./types.js";

export class WorldService {
  private readonly rooms = new Map<string, RoomSnapshot>();
  private readonly generator: RoomGenerator;

  constructor(
    private readonly grid: GridConfig,
    worldConfig: WorldConfig,
    rng: RandomGenerator
  ) {
    this.generator = new RoomGenerator(worldConfig, rng);
  }

  getRoom(roomId: string): RoomSnapshot {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, this.generator.generate(roomId, this.grid));
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

  clear(): void {
    this.rooms.clear();
  }

  snapshot(): Map<string, RoomSnapshot> {
    return new Map(this.rooms);
  }
}
