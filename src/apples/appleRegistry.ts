import type { Vector2Like } from "../core/math.js";
import type { AppleSystemConfig, AppleTypeConfig } from "../config/gameConfig.js";
import { NormalApple } from "./behaviors/normalApple.js";
import { ShieldedApple } from "./behaviors/shieldedApple.js";
import { GoldApple } from "./behaviors/goldApple.js";
import { SkittishApple } from "./behaviors/skittishApple.js";
import type { AppleInstance } from "./types.js";

export class AppleRegistry {
  constructor(private readonly config: AppleSystemConfig) {}

  getTypes(): AppleTypeConfig[] {
    return this.config.types;
  }

  createInstance(type: AppleTypeConfig, roomId: string, position: Vector2Like): AppleInstance {
    switch (type.behavior) {
      case "normal":
        return new NormalApple(roomId, position, type.id, type.color);
      case "shielded":
        return new ShieldedApple(roomId, position, type.id, type.color);
      case "gold":
        return new GoldApple(roomId, position, type.id, type.color);
      case "skittish":
        return new SkittishApple(
          roomId,
          position,
          type.id,
          type.color,
          this.config.skittishMoveChance
        );
      default:
        throw new Error(`Unknown apple behavior: ${type.behavior}`);
    }
  }
}
