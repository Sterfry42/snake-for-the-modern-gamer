import { AppleInstance, type AppleRewards } from "../types.js";

export class GoldApple extends AppleInstance {
  override onConsume(): AppleRewards {
    return { growth: 4, bonusScore: 4 };
  }
}
