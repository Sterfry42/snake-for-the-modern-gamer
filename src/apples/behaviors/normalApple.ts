import type { AppleRewards } from "../types.js";
import { AppleInstance } from "../types.js";

export class NormalApple extends AppleInstance {
  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 0 };
  }
}
